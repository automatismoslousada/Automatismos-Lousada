import { NextRequest, NextResponse } from 'next/server'
import { getAllOrders, createOrder, getOrderStats } from '@/lib/db'
import { getSession } from '@/lib/session'
import { hasOrdersAccess } from '@/lib/users'
import { DoorConfig } from '@/lib/types'

// Campos específicos de uma porta (medidas, cor, acessórios, motor...) — partilhados entre os
// campos "soltos" da encomenda (sempre = porta 1, para compatibilidade com código que só conhece
// uma porta) e cada entrada de body.doors, numa obra com mais do que uma porta.
function sanitizeDoorFields(raw: any): DoorConfig {
  const width = Number(raw?.width)
  const height = Number(raw?.height)
  const padding = Number(raw?.padding ?? 0.2)
  const leftShade = Number(raw?.leftShade ?? 0.1)
  const rightShade = Number(raw?.rightShade ?? 0.1)
  return {
    width,
    height,
    padding,
    leftShade,
    rightShade,
    widthMm: Math.round(width * 1000),
    heightMm: Math.round(height * 1000),
    paddingMm: Math.round(padding * 1000),
    leftShadeMm: Math.round(leftShade * 1000),
    rightShadeMm: Math.round(rightShade * 1000),
    area: Number((width * height).toFixed(2)),
    model: raw?.model || 'smooth',
    // Os 3 campos de cor caem para o mesmo par por omissão em bloco — nunca misturar um código
    // real com um nome/hex de outra cor (ou um texto de estado como "a carregar").
    ...(raw?.colorCode
      ? { colorCode: raw.colorCode, colorName: raw?.colorName || 'Cinzento antracite', colorHex: raw?.colorHex || '#383e42' }
      : { colorCode: 'RAL 7016', colorName: 'Cinzento antracite', colorHex: '#383e42' }),
    tube: raw?.tube || 'Nenhum',
    tubeUnits: Number(raw?.tubeUnits ?? 2),
    tubeLength: raw?.tubeLength || '',
    tubeLeft: raw?.tubeLeft || 'Nenhum',
    tubeLengthLeft: raw?.tubeLengthLeft || '',
    tubeWidthLeft: raw?.tubeWidthLeft || '',
    tubeRight: raw?.tubeRight || 'Nenhum',
    tubeLengthRight: raw?.tubeLengthRight || '',
    tubeWidthRight: raw?.tubeWidthRight || '',
    header: raw?.header || 'Nenhum',
    headerUnits: Number(raw?.headerUnits ?? 1),
    headerLength: raw?.headerLength || '',
    headerWidth: raw?.headerWidth || '',
    automation: raw?.automation || 'Nenhum',
    automationExtras: Array.isArray(raw?.automationExtras)
      ? raw.automationExtras
          .filter((e: any) => e && typeof e.name === 'string')
          .map((e: any) => ({ name: e.name, quantity: Math.max(1, Number(e.quantity) || 1) }))
      : [],
    rail: raw?.rail || 'Nenhum',
    remotesQuantity: Number(raw?.remotesQuantity || 2),
    serviceDoor: Boolean(raw?.serviceDoor),
    serviceDoorPosition: (['left', 'center', 'right'].includes(raw?.serviceDoorPosition)
      ? raw.serviceDoorPosition
      : 'center') as 'left' | 'center' | 'right',
    serviceDoorType: (['none', 'normal', 'normal-soleira', 'idealdoor'].includes(raw?.serviceDoorType)
      ? raw.serviceDoorType
      : 'none') as string,
    serviceDoorPanicBar: Boolean(raw?.serviceDoorPanicBar),
    serviceDoorAirSpring: Boolean(raw?.serviceDoorAirSpring),
    windows: Boolean(raw?.windows),
    windowsQuantity: Number(raw?.windowsQuantity || 2),
    windowsPanel: Math.max(1, Number(raw?.windowsPanel) || 1),
    windowsPanels: Array.isArray(raw?.windowsPanels) && raw.windowsPanels.length > 0
      ? raw.windowsPanels.map((n: any) => Math.max(1, Math.round(Number(n)) || 1))
      : [Math.max(1, Number(raw?.windowsPanel) || 1)],
    visorMaterial: (raw?.visorMaterial === 'acrilico' ? 'acrilico' : 'vidro') as 'vidro' | 'acrilico',
    rubberSeal: Boolean(raw?.rubberSeal),
    extras: Array.isArray(raw?.extras)
      ? raw.extras
          .filter((e: any) => e && typeof e.name === 'string')
          .map((e: any) => ({
            name: e.name,
            ...(e.unit === 'm'
              ? { unit: 'm' as const, quantity: Math.max(0.1, Math.round((Number(e.quantity) || 1) * 100) / 100) }
              : { quantity: Math.max(1, Number(e.quantity) || 1) }),
            ...(Number.isFinite(Number(e.panel)) && Number(e.panel) > 0
              ? { panel: Math.max(1, Math.round(Number(e.panel))) }
              : {}),
            ...(Array.isArray(e.panels) && e.panels.length > 0
              ? { panels: e.panels.map((n: any) => Math.max(1, Math.round(Number(n)) || 1)) }
              : {}),
          }))
      : [],
    montagens: Array.isArray(raw?.montagens) ? raw.montagens.filter((m: any) => typeof m === 'string') : [],
    productionFabricada: false,
  }
}

export async function GET(request: NextRequest) {
  const session = getSession(request)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Sessão inválida ou expirada' }, { status: 401 })
  }
  // admin/fabrica veem tudo; comercial/operador (Cliente) só as encomendas/orçamentos que eles
  // próprios criaram — o userId do pedido é ignorado para estes perfis e forçado para a própria
  // conta, para nunca ser possível consultar as de outra pessoa a pedir um userId diferente.
  const isPrivileged = session.role === 'admin' || session.role === 'fabrica'
  const isOwnOnly = session.role === 'comercial' || session.role === 'operador'
  if (!isPrivileged && !isOwnOnly) {
    return NextResponse.json({ success: false, error: 'Acesso restrito' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const kind = searchParams.get('kind') || undefined
    const search = searchParams.get('search') || undefined
    const userId = isPrivileged ? searchParams.get('userId') || undefined : session.sub

    const orders = await getAllOrders({ status, kind, search, userId })
    const stats = isPrivileged ? await getOrderStats() : undefined

    return NextResponse.json({ success: true, orders, stats })
  } catch (error: any) {
    console.error('API Orders GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao carregar encomendas' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const session = getSession(request)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Sessão inválida ou expirada' }, { status: 401 })
  }
  if (session.role === 'fabrica') {
    return NextResponse.json(
      { success: false, error: 'Perfil de fábrica não pode criar encomendas' },
      { status: 403 }
    )
  }
  if (!(await hasOrdersAccess(session.sub))) {
    return NextResponse.json(
      { success: false, error: 'O seu acesso está desativado. Contacte o administrador.' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()

    if (!body.client || !body.width || !body.height) {
      return NextResponse.json(
        { success: false, error: 'Campos obrigatórios em falta (cliente, largura, altura)' },
        { status: 400 }
      )
    }

    const doorFields = sanitizeDoorFields(body)
    const doors =
      Array.isArray(body.doors) && body.doors.length > 0 ? body.doors.map(sanitizeDoorFields) : [doorFields]

    const orderData = {
      kind: (body.kind === 'orcamento' ? 'orcamento' : 'encomenda') as 'encomenda' | 'orcamento',
      client: body.client,
      clientEmail: body.clientEmail || '',
      clientPhone: body.clientPhone || '',
      clientAddress: body.clientAddress || '',
      clientTaxId: body.clientTaxId || '',
      // Os campos "soltos" refletem sempre a 1ª porta — "doors" guarda a obra completa.
      ...doorFields,
      doors,
      // Uma encomenda nova já entra diretamente em Produção (visível em /producao), sem precisar
      // de um admin a mudar o estado manualmente — um orçamento continua em Em análise, já que
      // ainda não é um trabalho confirmado para fabricar.
      status: (body.status as any) || (body.kind === 'orcamento' ? 'Em análise' : 'Produção'),
      notes: body.notes || '',
      createdBy: body.createdBy || session.name,
      createdByUserId: session.sub,
      // Linhas do Resumo de Preços editadas manualmente pelo utilizador — whitelist estrito dos
      // dois campos, para nada mais do corpo do pedido poder passar para a coluna.
      priceOverrides: Array.isArray(body.priceOverrides)
        ? body.priceOverrides
            .filter((o: any) => o && typeof o.label === 'string' && Number.isFinite(Number(o.lineTotal)))
            .map((o: any) => ({ label: o.label, lineTotal: Number(o.lineTotal) }))
        : undefined,
      // Subtotal (sem IVA) substituído manualmente — tem precedência sobre priceOverrides.
      priceTotalOverride:
        body.priceTotalOverride != null && Number.isFinite(Number(body.priceTotalOverride))
          ? Number(body.priceTotalOverride)
          : undefined,
      // Taxa de IVA substituída manualmente (fração 0–1) — clamp para nunca gravar algo fora do
      // intervalo válido, mesmo que o corpo do pedido venha adulterado.
      priceIvaRateOverride:
        body.priceIvaRateOverride != null &&
        Number.isFinite(Number(body.priceIvaRateOverride)) &&
        Number(body.priceIvaRateOverride) >= 0 &&
        Number(body.priceIvaRateOverride) <= 1
          ? Number(body.priceIvaRateOverride)
          : undefined,
    }

    const newOrder = await createOrder(orderData)
    return NextResponse.json({ success: true, order: newOrder }, { status: 201 })
  } catch (error: any) {
    console.error('API Orders POST Error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao criar encomenda na base de dados' },
      { status: 500 }
    )
  }
}
