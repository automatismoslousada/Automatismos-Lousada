import { NextRequest, NextResponse } from 'next/server'
import { getSession, SESSION_COOKIE } from '@/lib/session'
import { getUserById, updateUser } from '@/lib/users'

export async function GET(request: NextRequest) {
  const session = getSession(request)
  if (!session) {
    return NextResponse.json({ success: false, user: null }, { status: 401 })
  }

  const user = await getUserById(session.sub)
  if (!user || (user.role !== 'admin' && !user.ordersAccess)) {
    const response = NextResponse.json(
      { success: false, user: null, error: user ? 'O seu acesso está desativado.' : undefined },
      { status: 401 }
    )
    response.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 })
    return response
  }

  return NextResponse.json({ success: true, user })
}

// Atualização da própria conta (foto de perfil) — ao contrário do PATCH /api/users/[id], que é
// só para admin editar qualquer conta, este é para qualquer utilizador autenticado editar a sua.
export async function PATCH(request: NextRequest) {
  const session = getSession(request)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Sessão inválida ou expirada' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const updates: { avatarUrl?: string | null } = {}

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

    const user = await updateUser(session.sub, updates)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Utilizador não encontrado' }, { status: 404 })
    }
    return NextResponse.json({ success: true, user })
  } catch (error: any) {
    console.error('API Auth Me PATCH Error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao atualizar a conta' }, { status: 500 })
  }
}
