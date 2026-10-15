import { alias } from 'drizzle-orm/pg-core'
import { and, desc, eq, inArray, or, sql } from 'drizzle-orm'
import { db } from './neon'
import { stockOrderItems, stockOrders as stockOrdersTable, stockProducts, users as usersTable } from './schema'
import { OrderStatus, StockOrder, StockOrderItem, StockProductUnit } from './types'

// Mesmos aliases/padrão usado em lib/db.ts para as encomendas de portas — uma junção para a
// conta que criou o pedido (cliente) e outra para o comercial a ela associado.
const creatorUsers = alias(usersTable, 'stock_creator_user')
const commercialUsers = alias(usersTable, 'stock_commercial_user')

type StockOrderExtras = {
  clientAvatarUrl?: string | null
  commercialName?: string | null
  commercialAvatarUrl?: string | null
}

function toStockOrder(
  row: typeof stockOrdersTable.$inferSelect,
  items: StockOrderItem[],
  extras?: StockOrderExtras
): StockOrder {
  return {
    id: row.id,
    referenceNumber: row.referenceNumber,
    client: row.client,
    clientEmail: row.clientEmail ?? undefined,
    clientPhone: row.clientPhone ?? undefined,
    clientAddress: row.clientAddress ?? undefined,
    clientTaxId: row.clientTaxId ?? undefined,
    notes: row.notes ?? undefined,
    items,
    totalPrice: row.totalPrice,
    status: row.status as OrderStatus,
    createdBy: row.createdBy ?? '',
    createdByUserId: row.createdByUserId ?? undefined,
    clientAvatarUrl: extras?.clientAvatarUrl ?? undefined,
    commercialName: extras?.commercialName ?? undefined,
    commercialAvatarUrl: extras?.commercialAvatarUrl ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

async function getItemsByOrderIds(orderIds: string[]): Promise<Map<string, StockOrderItem[]>> {
  const map = new Map<string, StockOrderItem[]>()
  if (orderIds.length === 0) return map
  const rows = await db.select().from(stockOrderItems).where(inArray(stockOrderItems.stockOrderId, orderIds))
  for (const row of rows) {
    const item: StockOrderItem = {
      id: row.id,
      productId: row.productId ?? undefined,
      productName: row.productName,
      unit: (row.unit as StockProductUnit) || undefined,
      unitPrice: row.unitPrice != null ? Number(row.unitPrice) : undefined,
      quantity: Number(row.quantity),
      meters: row.meters != null ? Number(row.meters) : undefined,
      squareMeters: row.squareMeters != null ? Number(row.squareMeters) : undefined,
      lineTotal: row.lineTotal != null ? Number(row.lineTotal) : undefined,
    }
    const list = map.get(row.stockOrderId) ?? []
    list.push(item)
    map.set(row.stockOrderId, list)
  }
  return map
}

export async function getAllStockOrders(filter?: { status?: string; userId?: string }): Promise<StockOrder[]> {
  const conditions = []
  if (filter?.status && filter.status !== 'Todos') {
    conditions.push(eq(stockOrdersTable.status, filter.status as OrderStatus))
  }
  if (filter?.userId) {
    conditions.push(eq(stockOrdersTable.createdByUserId, filter.userId))
  }

  const rows = await db
    .select({
      order: stockOrdersTable,
      clientAvatarUrl: creatorUsers.avatarUrl,
      commercialName: commercialUsers.name,
      commercialAvatarUrl: commercialUsers.avatarUrl,
    })
    .from(stockOrdersTable)
    .leftJoin(creatorUsers, eq(stockOrdersTable.createdByUserId, creatorUsers.id))
    .leftJoin(commercialUsers, eq(creatorUsers.commercialId, commercialUsers.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(stockOrdersTable.createdAt))

  const itemsByOrder = await getItemsByOrderIds(rows.map((r) => r.order.id))
  return rows.map((row) => toStockOrder(row.order, itemsByOrder.get(row.order.id) ?? [], row))
}

export async function getStockOrderById(id: string): Promise<StockOrder | null> {
  const rows = await db
    .select({
      order: stockOrdersTable,
      clientAvatarUrl: creatorUsers.avatarUrl,
      commercialName: commercialUsers.name,
      commercialAvatarUrl: commercialUsers.avatarUrl,
    })
    .from(stockOrdersTable)
    .leftJoin(creatorUsers, eq(stockOrdersTable.createdByUserId, creatorUsers.id))
    .leftJoin(commercialUsers, eq(creatorUsers.commercialId, commercialUsers.id))
    .where(or(eq(stockOrdersTable.id, id), eq(stockOrdersTable.referenceNumber, id)))
    .limit(1)

  const row = rows[0]
  if (!row) return null
  const itemsByOrder = await getItemsByOrderIds([row.order.id])
  return toStockOrder(row.order, itemsByOrder.get(row.order.id) ?? [], row)
}

export async function createStockOrder(data: {
  client: string
  clientEmail?: string
  clientPhone?: string
  clientAddress?: string
  clientTaxId?: string
  notes?: string
  items: {
    productId?: string
    productName: string
    unit?: StockProductUnit
    unitPrice?: number | null
    quantity: number
    meters?: number
    squareMeters?: number
  }[]
  createdBy: string
  createdByUserId?: string
}): Promise<StockOrder> {
  // Preços "sob consulta" (unitPrice null) não entram no total, tal como no resumo de preços
  // do configurador de portas. Para artigos ao metro/m², o total é preço/m(²) × peças ×
  // metro(s)/m² por peça (ex: 2 tubos de 2m, ou 3 placas de 1.5m²); sem meters/squareMeters
  // (artigos 'un') equivale a multiplicar por 1.
  const itemsWithTotals = data.items.map((item) => ({
    ...item,
    lineTotal:
      item.unitPrice != null
        ? Number((item.unitPrice * item.quantity * (item.meters ?? item.squareMeters ?? 1)).toFixed(2))
        : null,
  }))
  const totalPrice = Number(itemsWithTotals.reduce((sum, i) => sum + (i.lineTotal ?? 0), 0).toFixed(2))

  const seqResult = await db.execute<{ nextval: string }>(sql`select nextval('orders_seq') as nextval`)
  const seq = Number(seqResult.rows[0].nextval)
  const year = new Date().getFullYear()
  const id = `ART-${year}-${String(seq).padStart(4, '0')}`

  const [row] = await db
    .insert(stockOrdersTable)
    .values({
      id,
      referenceNumber: id,
      client: data.client,
      clientEmail: data.clientEmail || null,
      clientPhone: data.clientPhone || null,
      clientAddress: data.clientAddress || null,
      clientTaxId: data.clientTaxId || null,
      notes: data.notes || null,
      totalPrice,
      createdBy: data.createdBy,
      createdByUserId: data.createdByUserId ?? null,
    })
    .returning()

  if (itemsWithTotals.length > 0) {
    await db.insert(stockOrderItems).values(
      itemsWithTotals.map((item) => ({
        stockOrderId: row.id,
        productId: item.productId || null,
        productName: item.productName,
        unit: item.unit || null,
        unitPrice: item.unitPrice ?? null,
        quantity: item.quantity,
        meters: item.meters ?? null,
        squareMeters: item.squareMeters ?? null,
        lineTotal: item.lineTotal,
      }))
    )
  }

  return (await getStockOrderById(row.id)) ?? toStockOrder(row, [])
}

export async function updateStockOrderStatus(id: string, status: OrderStatus): Promise<StockOrder | null> {
  const [row] = await db
    .update(stockOrdersTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(stockOrdersTable.id, id))
    .returning()
  return row ? await getStockOrderById(row.id) : null
}

export async function deleteStockOrder(id: string): Promise<boolean> {
  const deleted = await db.delete(stockOrdersTable).where(eq(stockOrdersTable.id, id)).returning({ id: stockOrdersTable.id })
  return deleted.length > 0
}

// Usado para validar/obter o preço mais recente de cada produto no momento da compra — nunca se
// confia no preço vindo do cliente, para não ser possível manipular o total no pedido.
export async function getProductsByIds(
  ids: string[]
): Promise<Map<string, { name: string; price: number | null; unit: StockProductUnit }>> {
  const map = new Map<string, { name: string; price: number | null; unit: StockProductUnit }>()
  if (ids.length === 0) return map
  const rows = await db
    .select({
      id: stockProducts.id,
      name: stockProducts.name,
      price: stockProducts.price,
      unit: stockProducts.unit,
      active: stockProducts.active,
    })
    .from(stockProducts)
    .where(inArray(stockProducts.id, ids))
  for (const row of rows) {
    map.set(row.id, {
      name: row.name,
      price: row.price != null ? Number(row.price) : null,
      unit: (row.unit as StockProductUnit) || 'un',
    })
  }
  return map
}
