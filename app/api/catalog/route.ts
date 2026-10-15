import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createCatalogItem, getAllCatalogItems } from '@/lib/catalog'
import { CatalogCategory } from '@/lib/types'

const VALID_CATEGORIES: CatalogCategory[] = [
  'ribbed_color',
  'smooth_color',
  'tube',
  'header_panel',
  'service_door',
  'extra',
  'visor',
  'montagem',
  'automation',
  'automation_extra',
  'rail',
  'misc',
]

export async function GET(request: NextRequest) {
  const session = getSession(request)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const category = request.nextUrl.searchParams.get('category') || undefined
    const items = await getAllCatalogItems({ category })
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    console.error('API Catalog GET Error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao carregar catálogo' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = getSession(request)
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Acesso restrito a administradores' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { category, code, name, hex, unit, price, priceAlt, note, sortOrder } = body

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ success: false, error: 'Categoria inválida' }, { status: 400 })
    }
    if (typeof code !== 'string' || !code.trim() || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Código e nome são obrigatórios' }, { status: 400 })
    }
    if (!['un', 'm', 'm2'].includes(unit)) {
      return NextResponse.json({ success: false, error: 'Unidade inválida' }, { status: 400 })
    }

    const item = await createCatalogItem({
      category,
      code,
      name,
      hex: typeof hex === 'string' && hex ? hex : undefined,
      unit,
      price: typeof price === 'number' ? price : null,
      priceAlt: typeof priceAlt === 'number' ? priceAlt : null,
      note: typeof note === 'string' && note ? note : undefined,
      sortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
    })
    return NextResponse.json({ success: true, item }, { status: 201 })
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json({ success: false, error: 'Já existe um item com esse código nesta categoria' }, { status: 409 })
    }
    console.error('API Catalog POST Error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao criar item do catálogo' }, { status: 500 })
  }
}
