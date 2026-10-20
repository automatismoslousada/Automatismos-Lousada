import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createStockProduct, getAllStockProducts } from '@/lib/stock'

// Produtos de "Outros Artigos" — qualquer utilizador autenticado pode consultar (comerciais e
// clientes só veem os ativos, é só para comprar); admin vê e gere tudo.
export async function GET(request: NextRequest) {
  const session = getSession(request)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Sessão inválida ou expirada' }, { status: 401 })
  }

  try {
    const all = await getAllStockProducts()
    const products = session.role === 'admin' ? all : all.filter((p) => p.active)
    return NextResponse.json({ success: true, products })
  } catch (error: any) {
    console.error('API Stock Products GET Error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao carregar os produtos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = getSession(request)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Sessão inválida ou expirada' }, { status: 401 })
  }
  if (session.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Acesso restrito a administradores' }, { status: 403 })
  }

  try {
    const body = await request.json()
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ success: false, error: 'Indique o nome do produto' }, { status: 400 })
    }
    if (!body.categoryId || typeof body.categoryId !== 'string') {
      return NextResponse.json({ success: false, error: 'Indique a categoria do produto' }, { status: 400 })
    }

    const product = await createStockProduct({
      categoryId: body.categoryId,
      name: body.name.trim(),
      description: body.description || '',
      price: body.price === '' || body.price == null ? null : Number(body.price),
      unit: body.unit === 'm' || body.unit === 'm2' ? body.unit : 'un',
      photoUrl: body.photoUrl || '',
      fileUrl: body.fileUrl || '',
      fileName: body.fileName || '',
      sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : 0,
      active: body.active ?? true,
    })
    return NextResponse.json({ success: true, product }, { status: 201 })
  } catch (error: any) {
    console.error('API Stock Products POST Error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao guardar o produto' }, { status: 500 })
  }
}
