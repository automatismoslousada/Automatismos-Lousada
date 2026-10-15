import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { OrderStatus } from '@/lib/types'
import { deleteStockOrder, getStockOrderById, updateStockOrderStatus } from '@/lib/stockOrders'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(request)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Sessão inválida ou expirada' }, { status: 401 })
  }

  try {
    const { id } = await params
    const order = await getStockOrderById(id)
    if (!order) {
      return NextResponse.json({ success: false, error: 'Pedido não encontrado' }, { status: 404 })
    }
    if (session.role !== 'admin' && order.createdByUserId !== session.sub) {
      return NextResponse.json({ success: false, error: 'Este pedido não lhe pertence' }, { status: 403 })
    }
    return NextResponse.json({ success: true, stockOrder: order })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Erro ao consultar o pedido' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(request)
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Acesso restrito a administradores' }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    if (!body.status) {
      return NextResponse.json({ success: false, error: 'Status é obrigatório' }, { status: 400 })
    }
    const updated = await updateStockOrderStatus(id, body.status as OrderStatus)
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Pedido não encontrado' }, { status: 404 })
    }
    return NextResponse.json({ success: true, stockOrder: updated })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Erro ao atualizar o pedido' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(request)
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Acesso restrito a administradores' }, { status: 403 })
  }

  try {
    const { id } = await params
    const ok = await deleteStockOrder(id)
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Pedido não encontrado' }, { status: 404 })
    }
    return NextResponse.json({ success: true, message: 'Pedido eliminado' })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Erro ao eliminar o pedido' }, { status: 500 })
  }
}
