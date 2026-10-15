import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { deleteUser, updateUser } from '@/lib/users'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(request)
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Acesso restrito a administradores' }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const updates: {
      name?: string
      role?: any
      company?: string
      password?: string
      ordersAccess?: boolean
      commercialId?: string | null
      avatarUrl?: string | null
    } = {}

    if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim()
    if (typeof body.company === 'string') updates.company = body.company
    if (typeof body.ordersAccess === 'boolean') updates.ordersAccess = body.ordersAccess
    if (body.role) {
      if (!['admin', 'operador', 'comercial', 'fabrica'].includes(body.role)) {
        return NextResponse.json({ success: false, error: 'Perfil inválido' }, { status: 400 })
      }
      updates.role = body.role
    }
    if (body.password) {
      if (typeof body.password !== 'string' || body.password.length < 8) {
        return NextResponse.json(
          { success: false, error: 'A palavra-passe deve ter pelo menos 8 caracteres' },
          { status: 400 }
        )
      }
      updates.password = body.password
    }
    if ('commercialId' in body) {
      updates.commercialId = typeof body.commercialId === 'string' && body.commercialId ? body.commercialId : null
    }
    if ('avatarUrl' in body) {
      if (body.avatarUrl) {
        if (
          typeof body.avatarUrl !== 'string' ||
          !body.avatarUrl.startsWith('data:image/') ||
          body.avatarUrl.length > 1_500_000
        ) {
          return NextResponse.json({ success: false, error: 'Fotografia de perfil inválida' }, { status: 400 })
        }
        updates.avatarUrl = body.avatarUrl
      } else {
        updates.avatarUrl = null
      }
    }

    if (session.sub === id && updates.role && updates.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Não pode remover o seu próprio acesso de administrador' },
        { status: 400 }
      )
    }

    const user = await updateUser(id, updates)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Utilizador não encontrado' }, { status: 404 })
    }
    return NextResponse.json({ success: true, user })
  } catch (error: any) {
    console.error('API Users PATCH Error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao atualizar utilizador' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(request)
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Acesso restrito a administradores' }, { status: 403 })
  }

  const { id } = await params
  if (session.sub === id) {
    return NextResponse.json({ success: false, error: 'Não pode eliminar a sua própria conta' }, { status: 400 })
  }

  try {
    const ok = await deleteUser(id)
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Utilizador não encontrado' }, { status: 404 })
    }
    return NextResponse.json({ success: true, message: 'Utilizador eliminado' })
  } catch (error: any) {
    console.error('API Users DELETE Error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao eliminar utilizador' }, { status: 500 })
  }
}
