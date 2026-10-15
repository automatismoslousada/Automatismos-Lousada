import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createClient, getAllClientsWithOwner, getClientsByOwner } from '@/lib/clients'

// Carteira de clientes — só comerciais e admin têm acesso. Cada comercial só vê/gere a sua
// própria carteira; o admin vê (e pode gerir) as carteiras de todos, com o nome do dono de cada
// cliente, para ter uma visão geral — mas também tem a sua própria carteira, como qualquer comercial.
export async function GET(request: NextRequest) {
  const session = getSession(request)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Sessão inválida ou expirada' }, { status: 401 })
  }
  if (session.role !== 'admin' && session.role !== 'comercial') {
    return NextResponse.json({ success: false, error: 'Acesso restrito a comerciais e administradores' }, { status: 403 })
  }

  try {
    const clients = session.role === 'admin' ? await getAllClientsWithOwner() : await getClientsByOwner(session.sub)
    return NextResponse.json({ success: true, clients })
  } catch (error: any) {
    console.error('API Clients GET Error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao carregar a carteira de clientes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = getSession(request)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Sessão inválida ou expirada' }, { status: 401 })
  }
  if (session.role !== 'admin' && session.role !== 'comercial') {
    return NextResponse.json({ success: false, error: 'Acesso restrito a comerciais e administradores' }, { status: 403 })
  }

  try {
    const body = await request.json()
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ success: false, error: 'Indique o nome do cliente' }, { status: 400 })
    }

    const client = await createClient({
      name: body.name.trim(),
      email: body.email || '',
      phone: body.phone || '',
      address: body.address || '',
      taxId: body.taxId || '',
      notes: body.notes || '',
      ownerId: session.sub,
    })
    return NextResponse.json({ success: true, client }, { status: 201 })
  } catch (error: any) {
    console.error('API Clients POST Error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao guardar o cliente' }, { status: 500 })
  }
}
