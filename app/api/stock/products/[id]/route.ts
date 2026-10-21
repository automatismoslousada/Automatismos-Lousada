import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { deleteStockProduct, updateStockProduct } from '@/lib/stock'

// Edição/remoção de produto de "Outros Artigos" — só admin.
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
    const updated = await updateStockProduct(id, {
      categoryId: typeof body.categoryId === 'string' ? body.categoryId : undefined,
      name: typeof body.name === 'string' ? body.name.trim() : undefined,
      description: body.description,
      price: body.price === undefined ? undefined : body.price === '' || body.price == null ? null : Number(body.price),
      unit: body.unit === 'un' || body.unit === 'm' || body.unit === 'm2' || body.unit === 'ml' ? body.unit : undefined,
      photoUrl: body.photoUrl,
      fileUrl: body.fileUrl,
      fileName: body.fileName,
      sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : undefined,
      active: typeof body.active === 'boolean' ? body.active : undefined,
    })
    return NextResponse.json({ success: true, product: updated })
  } catch (error: any) {
    console.error('API Stock Product PATCH Error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao atualizar o produto' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = authorize(request)
  if (auth.error) return auth.error

  try {
    const deleted = await deleteStockProduct(id)
    return NextResponse.json({ success: deleted })
  } catch (error: any) {
    console.error('API Stock Product DELETE Error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao remover o produto' }, { status: 500 })
  }
}
