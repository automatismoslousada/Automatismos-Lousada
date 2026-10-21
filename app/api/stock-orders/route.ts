import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { hasOrdersAccess } from '@/lib/users'
import { createStockOrder, getAllStockOrders, getProductsByIds } from '@/lib/stockOrders'

// Pedidos de "Outros Artigos" — tal como as encomendas de portas: admin vê todos (para gerir em
// "Gestão de Encomendas"), cada comercial/cliente só vê os que ele próprio criou.
export async function GET(request: NextRequest) {
  const session = getSession(request)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Sessão inválida ou expirada' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const orders =
      session.role === 'admin'
        ? await getAllStockOrders({ status })
        : await getAllStockOrders({ status, userId: session.sub })
    return NextResponse.json({ success: true, stockOrders: orders })
  } catch (error: any) {
    console.error('API Stock Orders GET Error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao carregar os pedidos de artigos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = getSession(request)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Sessão inválida ou expirada' }, { status: 401 })
  }
  if (!(await hasOrdersAccess(session.sub))) {
    return NextResponse.json(
      { success: false, error: 'O seu acesso está desativado. Contacte o administrador.' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    if (!body.client || typeof body.client !== 'string' || !body.client.trim()) {
      return NextResponse.json({ success: false, error: 'Indique o nome do cliente' }, { status: 400 })
    }
    const rawItems = Array.isArray(body.items) ? body.items : []
    if (rawItems.length === 0) {
      return NextResponse.json({ success: false, error: 'O pedido não tem artigos' }, { status: 400 })
    }

    // Nunca confiar no preço enviado pelo browser — vai sempre buscar o preço atual de cada
    // produto à base de dados, para o total não poder ser manipulado no pedido.
    const productIds = rawItems.map((i: any) => i.productId).filter((id: any) => typeof id === 'string')
    const products = await getProductsByIds(productIds)

    const items = rawItems
      .map((i: any) => {
        const product = typeof i.productId === 'string' ? products.get(i.productId) : undefined
        if (!product) return null
        // quantity é sempre nº de peças inteiro, para 'un', 'm' e 'm2'. Para 'm'/'m2', meters/
        // squareMeters é o comprimento/área de cada peça (ex: 2 tubos de 2m => quantity=2,
        // meters=2; 3 placas de 1.5m² => quantity=3, squareMeters=1.5) — permite casas decimais.
        const rawQuantity = Number(i.quantity) || 1
        const quantity = Math.max(1, Math.round(rawQuantity))
        // Artigos ao m² e ao metro linear ('ml'): largura × altura de cada peça em mm. No m² a
        // área sai daqui; no 'ml' o preço é por metro da largura (a altura só segue para a
        // produção). Pedidos antigos (só com squareMeters/meters) continuam a ser aceites.
        const takesDims = product.unit === 'm2' || product.unit === 'ml'
        const widthMm = takesDims && Number(i.widthMm) >= 1 ? Math.round(Number(i.widthMm)) : undefined
        const heightMm = takesDims && Number(i.heightMm) >= 1 ? Math.round(Number(i.heightMm)) : undefined
        const meters =
          product.unit === 'ml' && widthMm && heightMm
            ? widthMm / 1000
            : product.unit === 'm' || product.unit === 'ml'
            ? Math.max(0.1, Math.round((Number(i.meters) || 1) * 100) / 100)
            : undefined
        const squareMeters =
          product.unit !== 'm2'
            ? undefined
            : widthMm && heightMm
            ? Math.round((widthMm * heightMm) / 100) / 10000
            : Math.max(0.1, Math.round((Number(i.squareMeters) || 1) * 100) / 100)
        return {
          productId: i.productId,
          productName: product.name,
          unit: product.unit,
          unitPrice: product.price,
          quantity,
          meters,
          squareMeters,
          widthMm: takesDims && heightMm ? widthMm : undefined,
          heightMm: takesDims && widthMm ? heightMm : undefined,
        }
      })
      .filter(
        (
          i: any
        ): i is {
          productId: string
          productName: string
          unit: 'un' | 'm' | 'm2' | 'ml'
          unitPrice: number | null
          quantity: number
          meters?: number
          squareMeters?: number
          widthMm?: number
          heightMm?: number
        } => i !== null
      )

    if (items.length === 0) {
      return NextResponse.json({ success: false, error: 'Nenhum dos artigos indicados existe no stock' }, { status: 400 })
    }

    const order = await createStockOrder({
      client: body.client.trim(),
      clientEmail: body.clientEmail || '',
      clientPhone: body.clientPhone || '',
      clientAddress: body.clientAddress || '',
      clientTaxId: body.clientTaxId || '',
      notes: body.notes || '',
      items,
      createdBy: session.name,
      createdByUserId: session.sub,
    })
    return NextResponse.json({ success: true, stockOrder: order }, { status: 201 })
  } catch (error: any) {
    console.error('API Stock Orders POST Error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao criar o pedido de artigos' }, { status: 500 })
  }
}
