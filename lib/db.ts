import { alias } from 'drizzle-orm/pg-core'
import { and, desc, eq, inArray, or, sql } from 'drizzle-orm'
import { db } from './neon'
import { orders as ordersTable, users as usersTable } from './schema'
import { DoorConfig, Order, OrderKind, OrderStatus } from './types'
import { applyPriceOverrides, calculateMultiDoorQuote, PricingInput } from './pricing'
import { getAllCatalogItems } from './catalog'

// Alias da tabela de utilizadores usado duas vezes na mesma query: uma para a conta que criou
// a encomenda (cliente) e outra para o comercial a ela associado (users.commercial_id).
const creatorUsers = alias(usersTable, 'creator_user')
const commercialUsers = alias(usersTable, 'commercial_user')

type OrderExtras = {
  clientAvatarUrl?: string | null
  commercialName?: string | null
  commercialAvatarUrl?: string | null
}

function toOrder(row: typeof ordersTable.$inferSelect, extras?: OrderExtras): Order {
  return {
    id: row.id,
    referenceNumber: row.referenceNumber,
    kind: (row.kind as OrderKind) ?? 'encomenda',
    client: row.client,
    clientEmail: row.clientEmail ?? '',
    clientPhone: row.clientPhone ?? '',
    clientAddress: row.clientAddress ?? '',
    clientTaxId: row.clientTaxId ?? '',
    width: row.width,
    height: row.height,
    padding: row.padding,
    leftShade: row.leftShade,
    rightShade: row.rightShade,
    widthMm: row.widthMm,
    heightMm: row.heightMm,
    paddingMm: row.paddingMm,
    leftShadeMm: row.leftShadeMm,
    rightShadeMm: row.rightShadeMm,
    area: row.area,
    model: row.model,
    colorCode: row.colorCode,
    colorName: row.colorName,
    colorHex: row.colorHex,
    tube: row.tube,
    tubeUnits: row.tubeUnits,
    tubeLength: row.tubeLength ?? '',
    tubeLeft: row.tubeLeft ?? 'Nenhum',
    tubeLengthLeft: row.tubeLengthLeft ?? '',
    tubeWidthLeft: row.tubeWidthLeft ?? '',
    tubeRight: row.tubeRight ?? 'Nenhum',
    tubeLengthRight: row.tubeLengthRight ?? '',
    tubeWidthRight: row.tubeWidthRight ?? '',
    header: row.header,
    headerUnits: row.headerUnits,
    headerLength: row.headerLength ?? '',
    headerWidth: row.headerWidth ?? '',
    automation: row.automation,
    automationExtras: (row.automationExtras as { name: string; quantity: number }[]) ?? [],
    rail: row.rail,
    remotesQuantity: row.remotesQuantity,
    serviceDoor: row.serviceDoor,
    serviceDoorPosition: (row.serviceDoorPosition as 'left' | 'center' | 'right') ?? 'center',
    serviceDoorType: row.serviceDoorType ?? 'none',
    serviceDoorPanicBar: row.serviceDoorPanicBar ?? false,
    serviceDoorAirSpring: row.serviceDoorAirSpring ?? false,
    windows: row.windows,
    windowsQuantity: row.windowsQuantity,
    windowsPanel: row.windowsPanel ?? 1,
    windowsPanels: (row.windowsPanels as number[]) ?? [row.windowsPanel ?? 1],
    visorMaterial: (row.visorMaterial as 'vidro' | 'acrilico' | undefined) ?? undefined,
    rubberSeal: row.rubberSeal,
    extras: (row.extras as { name: string; quantity: number }[]) ?? [],
    montagens: (row.montagens as string[]) ?? [],
    productionSpring: row.productionSpring ?? undefined,
    productionSpringTurns: row.productionSpringTurns ?? undefined,
    productionTambor: row.productionTambor ?? undefined,
    productionCutWidthMm: row.productionCutWidthMm ?? undefined,
    productionFabricada: row.productionFabricada,
    doors: (row.doors as Order['doors']) ?? [],
    estimatedPrice: row.estimatedPrice,
    priceOverrides: (row.priceOverrides as Order['priceOverrides']) ?? undefined,
    priceTotalOverride: row.priceTotalOverride ?? undefined,
    priceIvaRateOverride: row.priceIvaRateOverride ?? undefined,
    status: row.status as OrderStatus,
    notes: row.notes ?? '',
    createdBy: row.createdBy ?? '',
    createdByUserId: row.createdByUserId ?? undefined,
    clientAvatarUrl: extras?.clientAvatarUrl ?? undefined,
    commercialName: extras?.commercialName ?? undefined,
    commercialAvatarUrl: extras?.commercialAvatarUrl ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function toPricingInput(door: Partial<Order> | DoorConfig): PricingInput {
  return {
    width: door.width || 3.0,
    height: door.height || 2.25,
    model: door.model || 'smooth',
    colorCode: door.colorCode || '',
    tubeLeft: door.tubeLeft,
    tubeLengthLeft: door.tubeLengthLeft,
    tubeRight: door.tubeRight,
    tubeLengthRight: door.tubeLengthRight,
    header: door.header || 'Nenhum',
    headerLength: door.headerLength,
    headerWidth: door.headerWidth,
    paddingMm: door.paddingMm,
    serviceDoorType: door.serviceDoorType,
    serviceDoorPanicBar: door.serviceDoorPanicBar || false,
    serviceDoorAirSpring: door.serviceDoorAirSpring || false,
    extras: door.extras || [],
    montagens: door.montagens || [],
    windows: door.windows || false,
    windowsQuantity: door.windowsQuantity,
    visorMaterial: door.visorMaterial,
    rubberSeal: door.rubberSeal || false,
    automation: door.automation || 'Nenhum',
    automationExtras: door.automationExtras || [],
    rail: door.rail || 'Nenhum',
    remotesQuantity: door.remotesQuantity,
  }
}

// Reconstrói a "porta 1" a partir dos campos soltos de Order — usado para encomendas antigas
// cujo doors[] ainda está vazio (criadas antes de existir suporte a várias portas por encomenda).
function doorConfigFromOrder(order: Order): DoorConfig {
  return {
    width: order.width,
    height: order.height,
    padding: order.padding,
    leftShade: order.leftShade,
    rightShade: order.rightShade,
    widthMm: order.widthMm,
    heightMm: order.heightMm,
    paddingMm: order.paddingMm,
    leftShadeMm: order.leftShadeMm,
    rightShadeMm: order.rightShadeMm,
    area: order.area,
    model: order.model,
    colorCode: order.colorCode,
    colorName: order.colorName,
    colorHex: order.colorHex,
    tube: order.tube,
    tubeUnits: order.tubeUnits,
    tubeLength: order.tubeLength,
    tubeLeft: order.tubeLeft,
    tubeLengthLeft: order.tubeLengthLeft,
    tubeWidthLeft: order.tubeWidthLeft,
    tubeRight: order.tubeRight,
    tubeLengthRight: order.tubeLengthRight,
    tubeWidthRight: order.tubeWidthRight,
    header: order.header,
    headerUnits: order.headerUnits,
    headerLength: order.headerLength,
    headerWidth: order.headerWidth,
    automation: order.automation,
    automationExtras: order.automationExtras,
    rail: order.rail,
    remotesQuantity: order.remotesQuantity,
    serviceDoor: order.serviceDoor,
    serviceDoorPosition: order.serviceDoorPosition,
    serviceDoorType: order.serviceDoorType,
    serviceDoorPanicBar: order.serviceDoorPanicBar,
    serviceDoorAirSpring: order.serviceDoorAirSpring,
    windows: order.windows,
    windowsQuantity: order.windowsQuantity,
    windowsPanel: order.windowsPanel,
    windowsPanels: order.windowsPanels,
    visorMaterial: order.visorMaterial,
    rubberSeal: order.rubberSeal,
    extras: order.extras,
    montagens: order.montagens,
    productionSpring: order.productionSpring,
    productionSpringTurns: order.productionSpringTurns,
    productionTambor: order.productionTambor,
    productionCutWidthMm: order.productionCutWidthMm,
    productionFabricada: order.productionFabricada,
  }
}

// Baseado na tabela de preços oficial (ver lib/pricing.ts) — usada tanto para a estimativa
// guardada em cada encomenda como para o Orçamento detalhado gerado em PDF. Obras com mais do
// que uma porta (order.doors) somam o preço de cada porta configurada individualmente.
export async function calculateEstimatedPrice(order: Partial<Order>): Promise<number> {
  const catalog = await getAllCatalogItems({ activeOnly: true })
  const doorInputs =
    order.doors && order.doors.length > 1 ? order.doors.map(toPricingInput) : [toPricingInput(order)]
  const quote = calculateMultiDoorQuote(doorInputs, catalog)
  const { total } = applyPriceOverrides(quote, order.priceOverrides, order.priceTotalOverride)
  return Math.round(total)
}

export async function getAllOrders(filter?: {
  status?: string
  kind?: string
  search?: string
  userId?: string
}): Promise<Order[]> {
  const conditions = []

  if (filter?.status && filter.status !== 'Todos') {
    // Permite uma lista separada por vírgulas (ex: "Produção,Concluído") para /producao poder
    // mostrar as duas situações na mesma consulta — eq() continua a ser usado quando só há um
    // valor, para não mudar a query nos sítios que só pedem um estado.
    const statuses = filter.status
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean) as OrderStatus[]
    conditions.push(statuses.length > 1 ? inArray(ordersTable.status, statuses) : eq(ordersTable.status, statuses[0]))
  }

  if (filter?.kind && filter.kind !== 'Todos') {
    conditions.push(eq(ordersTable.kind, filter.kind))
  }

  if (filter?.userId) {
    conditions.push(eq(ordersTable.createdByUserId, filter.userId))
  }

  if (filter?.search) {
    const q = `%${filter.search.toLowerCase()}%`
    conditions.push(
      or(
        sql`lower(${ordersTable.id}) like ${q}`,
        sql`lower(${ordersTable.client}) like ${q}`,
        sql`lower(${ordersTable.colorCode}) like ${q}`,
        sql`lower(${ordersTable.model}) like ${q}`
      )
    )
  }

  const rows = await db
    .select({
      order: ordersTable,
      clientAvatarUrl: creatorUsers.avatarUrl,
      commercialName: commercialUsers.name,
      commercialAvatarUrl: commercialUsers.avatarUrl,
    })
    .from(ordersTable)
    .leftJoin(creatorUsers, eq(ordersTable.createdByUserId, creatorUsers.id))
    .leftJoin(commercialUsers, eq(creatorUsers.commercialId, commercialUsers.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(ordersTable.createdAt))

  return rows.map((row) => toOrder(row.order, row))
}

export async function getOrderById(id: string): Promise<Order | null> {
  const rows = await db
    .select({
      order: ordersTable,
      clientAvatarUrl: creatorUsers.avatarUrl,
      commercialName: commercialUsers.name,
      commercialAvatarUrl: commercialUsers.avatarUrl,
    })
    .from(ordersTable)
    .leftJoin(creatorUsers, eq(ordersTable.createdByUserId, creatorUsers.id))
    .leftJoin(commercialUsers, eq(creatorUsers.commercialId, commercialUsers.id))
    .where(or(eq(ordersTable.id, id), eq(ordersTable.referenceNumber, id)))
    .limit(1)

  return rows[0] ? toOrder(rows[0].order, rows[0]) : null
}

export async function createOrder(
  data: Omit<Order, 'id' | 'referenceNumber' | 'createdAt' | 'updatedAt' | 'estimatedPrice'> & {
    createdByUserId?: string
  }
): Promise<Order> {
  const seqResult = await db.execute<{ nextval: string }>(sql`select nextval('orders_seq') as nextval`)
  const seq = Number(seqResult.rows[0].nextval)
  const year = new Date().getFullYear()
  // Prefixo diferente consoante o tipo — para a referência de um orçamento nunca poder coincidir
  // com a de uma encomenda, mesmo que o número de sequência calhe a ser o mesmo.
  const prefix = data.kind === 'orcamento' ? 'ORC' : 'ENC'
  const id = `${prefix}-${year}-${String(seq).padStart(4, '0')}`

  const estimatedPrice = await calculateEstimatedPrice(data)

  const { createdByUserId, ...orderFields } = data

  const [row] = await db
    .insert(ordersTable)
    .values({
      ...orderFields,
      id,
      referenceNumber: id,
      tubeUnits: data.tubeUnits ?? 2,
      headerUnits: data.headerUnits ?? 1,
      estimatedPrice,
      createdByUserId: createdByUserId ?? null,
    })
    .returning()

  // Volta a ler com o JOIN à conta que criou a encomenda e ao comercial associado — para a
  // encomenda devolvida aqui (ex: logo após o cliente clicar em "Registar Encomenda") já vir com
  // a foto do cliente/comercial, tal como acontece quando a lista de encomendas é consultada depois.
  return (await getOrderById(row.id)) ?? toOrder(row)
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Order | null> {
  const [row] = await db
    .update(ordersTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(ordersTable.id, id))
    .returning()

  return row ? await getOrderById(row.id) : null
}

// Atualização exclusiva do perfil "fabrica" (ver app/producao) — só toca productionSpring /
// productionCutWidthMm / productionFabricada de cada porta, por índice alinhado com order.doors,
// e opcionalmente as Anotações (order.notes — campo já existente, partilhado pela encomenda
// inteira, não por porta). Nunca mexe em preço/cliente/medidas. Cada entrada de doorUpdates pode
// vir vazia ({}) para deixar essa porta inalterada; omitir uma chave mantém o valor atual dessa
// porta, null limpa-o (não aplicável a productionFabricada, que é sempre um boolean explícito
// quando presente). Exceção à regra de "nunca mexe em estado": quando todas as portas ficam
// marcadas como fabricadas o estado passa automaticamente a "Concluído" (visível em Gestão de
// Encomendas), e volta a "Produção" se deixar de estar tudo fabricado — assim a fábrica nunca
// precisa de pedir a um admin para fechar a encomenda à mão.
export async function updateOrderProductionFields(
  id: string,
  doorUpdates: Array<{
    productionSpring?: string | null
    productionSpringTurns?: number | null
    productionTambor?: string | null
    productionCutWidthMm?: number | null
    productionFabricada?: boolean
  }>,
  notes?: string | null
): Promise<Order | null> {
  const existing = await getOrderById(id)
  if (!existing) return null

  const baseDoors: DoorConfig[] =
    existing.doors && existing.doors.length > 0 ? existing.doors : [doorConfigFromOrder(existing)]

  if (doorUpdates.length !== baseDoors.length) {
    throw new Error('Número de portas no pedido não corresponde à encomenda')
  }

  const updatedDoors = baseDoors.map((door, i) => {
    const u = doorUpdates[i] || {}
    return {
      ...door,
      ...('productionSpring' in u ? { productionSpring: u.productionSpring ?? undefined } : {}),
      ...('productionSpringTurns' in u ? { productionSpringTurns: u.productionSpringTurns ?? undefined } : {}),
      ...('productionTambor' in u ? { productionTambor: u.productionTambor ?? undefined } : {}),
      ...('productionCutWidthMm' in u ? { productionCutWidthMm: u.productionCutWidthMm ?? undefined } : {}),
      ...('productionFabricada' in u ? { productionFabricada: !!u.productionFabricada } : {}),
    }
  })

  const allFabricada = updatedDoors.length > 0 && updatedDoors.every((d) => d.productionFabricada)
  let status: OrderStatus | undefined
  if (allFabricada) {
    status = 'Concluído'
  } else if (existing.status === 'Concluído') {
    status = 'Produção'
  }

  const [row] = await db
    .update(ordersTable)
    .set({
      doors: updatedDoors,
      // Os campos "soltos" espelham sempre a porta 1, tal como o resto do código já faz.
      productionSpring: updatedDoors[0]?.productionSpring ?? null,
      productionSpringTurns: updatedDoors[0]?.productionSpringTurns ?? null,
      productionTambor: updatedDoors[0]?.productionTambor ?? null,
      productionCutWidthMm: updatedDoors[0]?.productionCutWidthMm ?? null,
      productionFabricada: updatedDoors[0]?.productionFabricada ?? false,
      ...(notes !== undefined ? { notes: notes || null } : {}),
      ...(status ? { status } : {}),
      updatedAt: new Date(),
    })
    .where(eq(ordersTable.id, id))
    .returning()

  return row ? await getOrderById(row.id) : null
}

export async function deleteOrder(id: string): Promise<boolean> {
  const deleted = await db.delete(ordersTable).where(eq(ordersTable.id, id)).returning({ id: ordersTable.id })
  return deleted.length > 0
}

export async function getOrderStats() {
  const rows = await db.select().from(ordersTable)
  const total = rows.length
  const emAnalise = rows.filter((o) => o.status === 'Em análise' || o.status === 'Pendente').length
  const producao = rows.filter((o) => o.status === 'Produção').length
  const concluido = rows.filter((o) => o.status === 'Concluído').length
  const valorTotal = rows.reduce((acc, curr) => acc + (curr.estimatedPrice || 0), 0)

  return {
    total,
    emAnalise,
    producao,
    concluido,
    valorTotal,
  }
}
