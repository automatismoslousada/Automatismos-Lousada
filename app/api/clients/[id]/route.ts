import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { deleteClient, getClientById, updateClient } from '@/lib/clients'

// Edição/remoção de um cliente da carteira — só o comercial dono desse cliente, ou um admin
// (que gere qualquer carteira), podem alterar ou apagar.
async function authorize(request: NextRequest, id: string) {
  const session = getSession(request)
  if (!session) {
    return { error: NextResponse.json({ success: false, error: 'Sessão inválida ou expirada' }, { status: 401 }) }
  }
  if (session.role !== 'admin' && session.role !== 'comercial') {
    return {
      error: NextResponse.json({ success: false, error: 'Acesso restrito a comerciais e administradores' }, { status: 403 }),
    }
  }
  const client = await getClientById(id)
  if (!client) {
    return { error: NextResponse.json({ success: false, error: 'Cliente não encontrado' }, { status: 404 }) }
  }
  if (session.role !== 'admin' && client.ownerId !== session.sub) {
    return { error: NextResponse.json({ success: false, error: 'Este cliente não pertence à sua carteira' }, { status: 403 }) }
  }
  return { session, client }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await authorize(request, id)
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const updated = await updateClient(id, {
      name: typeof body.name === 'string' ? body.name.trim() : undefined,
      email: body.email,
      phone: body.phone,
      address: body.address,
      taxId: body.taxId,
      notes: body.notes,
    })
    return NextResponse.json({ success: true, client: updated })
  } catch (error: any) {
    console.error('API Client PATCH Error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao atualizar o cliente' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await authorize(request, id)
  if (auth.error) return auth.error

  try {
    const deleted = await deleteClient(id)
    return NextResponse.json({ success: deleted })
  } catch (error: any) {
    console.error('API Client DELETE Error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao remover o cliente' }, { status: 500 })
  }
}
