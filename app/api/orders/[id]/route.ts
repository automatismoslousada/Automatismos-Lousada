import { NextRequest, NextResponse } from 'next/server'
import { getOrderById, updateOrderStatus, deleteOrder } from '@/lib/db'
import { OrderStatus } from '@/lib/types'
import { getSession } from '@/lib/session'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getSession(request)
  if (!session || (session.role !== 'admin' && session.role !== 'fabrica')) {
    return NextResponse.json({ success: false, error: 'Acesso restrito a administradores' }, { status: 403 })
  }

  try {
    const { id } = await params
    const order = await getOrderById(id)
    if (!order) {
      return NextResponse.json({ success: false, error: 'Encomenda não encontrada' }, { status: 404 })
    }
    return NextResponse.json({ success: true, order })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Erro ao consultar encomenda' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getSession(request)
  if (!session || (session.role !== 'admin' && session.role !== 'fabrica')) {
    return NextResponse.json({ success: false, error: 'Acesso restrito a administradores' }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await request.json()

    if (!body.status) {
      return NextResponse.json({ success: false, error: 'Status é obrigatório' }, { status: 400 })
    }

    const updated = await updateOrderStatus(id, body.status as OrderStatus)
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Encomenda não encontrada' }, { status: 404 })
    }

    return NextResponse.json({ success: true, order: updated })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Erro ao atualizar encomenda' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getSession(request)
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Acesso restrito a administradores' }, { status: 403 })
  }

  try {
    const { id } = await params
    const ok = await deleteOrder(id)
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Encomenda não encontrada' }, { status: 404 })
    }
    return NextResponse.json({ success: true, message: 'Encomenda eliminada' })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Erro ao eliminar encomenda' }, { status: 500 })
  }
}
