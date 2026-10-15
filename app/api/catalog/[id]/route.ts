import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { deleteCatalogItem, updateCatalogItem } from '@/lib/catalog'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(request)
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Acesso restrito a administradores' }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const updates: Parameters<typeof updateCatalogItem>[1] = {}

    if (typeof body.code === 'string' && body.code.trim()) updates.code = body.code
    if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name
    if ('hex' in body) updates.hex = typeof body.hex === 'string' && body.hex ? body.hex : null
    if (body.unit) {
      if (!['un', 'm', 'm2'].includes(body.unit)) {
        return NextResponse.json({ success: false, error: 'Unidade inválida' }, { status: 400 })
      }
      updates.unit = body.unit
    }
    if ('price' in body) updates.price = typeof body.price === 'number' ? body.price : null
    if ('priceAlt' in body) updates.priceAlt = typeof body.priceAlt === 'number' ? body.priceAlt : null
    if ('note' in body) updates.note = typeof body.note === 'string' && body.note ? body.note : null
    if (typeof body.sortOrder === 'number') updates.sortOrder = body.sortOrder
    if (typeof body.active === 'boolean') updates.active = body.active

    const item = await updateCatalogItem(id, updates)
    if (!item) {
      return NextResponse.json({ success: false, error: 'Item não encontrado' }, { status: 404 })
    }
    return NextResponse.json({ success: true, item })
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json({ success: false, error: 'Já existe um item com esse código nesta categoria' }, { status: 409 })
    }
    console.error('API Catalog PATCH Error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao atualizar item do catálogo' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(request)
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Acesso restrito a administradores' }, { status: 403 })
  }

  try {
    const { id } = await params
    const ok = await deleteCatalogItem(id)
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Item não encontrado' }, { status: 404 })
    }
    return NextResponse.json({ success: true, message: 'Item eliminado' })
  } catch (error: any) {
    console.error('API Catalog DELETE Error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao eliminar item do catálogo' }, { status: 500 })
  }
}
