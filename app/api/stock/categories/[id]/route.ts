import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { deleteStockCategory, updateStockCategory } from '@/lib/stock'

// Edição/remoção de categoria de "Outros Artigos" — só admin.
function authorize(request: NextRequest) {
  const session = getSession(request)
  if (!session) {
    return { error: NextResponse.json({ success: false, error: 'Sessão inválida ou expirada' }, { status: 401 }) }
  }
  if (session.role !== 'admin') {
    return { error: NextResponse.json({ success: false, error: 'Acesso restrito a administradores' }, { status: 403 }) }
  }
  return { session }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = authorize(request)
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const updated = await updateStockCategory(id, {
      name: typeof body.name === 'string' ? body.name.trim() : undefined,
      photoUrl: body.photoUrl,
      parentId: 'parentId' in body ? (body.parentId || null) : undefined,
      sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : undefined,
    })
    return NextResponse.json({ success: true, category: updated })
  } catch (error: any) {
    console.error('API Stock Category PATCH Error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao atualizar a categoria' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = authorize(request)
  if (auth.error) return auth.error

  try {
    const deleted = await deleteStockCategory(id)
    return NextResponse.json({ success: deleted })
  } catch (error: any) {
    console.error('API Stock Category DELETE Error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao remover a categoria' }, { status: 500 })
  }
}
