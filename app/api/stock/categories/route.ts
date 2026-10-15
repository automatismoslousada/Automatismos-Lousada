import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createStockCategory, getAllStockCategories } from '@/lib/stock'

// Categorias de "Outros Artigos" — qualquer utilizador autenticado pode consultar (admin gere,
// comerciais e clientes compram); só admin pode criar/editar/apagar categorias.
export async function GET(request: NextRequest) {
  const session = getSession(request)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Sessão inválida ou expirada' }, { status: 401 })
  }

  try {
    const categories = await getAllStockCategories()
    return NextResponse.json({ success: true, categories })
  } catch (error: any) {
    console.error('API Stock Categories GET Error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao carregar as categorias' }, { status: 500 })
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
      return NextResponse.json({ success: false, error: 'Indique o nome da categoria' }, { status: 400 })
    }

    const category = await createStockCategory({
      name: body.name.trim(),
      photoUrl: body.photoUrl || '',
      parentId: typeof body.parentId === 'string' && body.parentId ? body.parentId : null,
      sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : 0,
    })
    return NextResponse.json({ success: true, category }, { status: 201 })
  } catch (error: any) {
    console.error('API Stock Categories POST Error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao guardar a categoria' }, { status: 500 })
  }
}
