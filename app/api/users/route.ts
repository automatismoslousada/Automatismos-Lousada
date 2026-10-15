import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createUser, getAllUsers } from '@/lib/users'

export async function GET(request: NextRequest) {
  const session = getSession(request)
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Acesso restrito a administradores' }, { status: 403 })
  }

  try {
    const users = await getAllUsers()
    return NextResponse.json({ success: true, users })
  } catch (error: any) {
    console.error('API Users GET Error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao carregar utilizadores' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = getSession(request)
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Acesso restrito a administradores' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { name, email, password, role, company, ordersAccess, avatarUrl, commercialId } = body

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Nome, email e palavra-passe são obrigatórios' },
        { status: 400 }
      )
    }
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'A palavra-passe deve ter pelo menos 8 caracteres' },
        { status: 400 }
      )
    }
    if (!['admin', 'operador', 'comercial', 'fabrica'].includes(role)) {
      return NextResponse.json({ success: false, error: 'Perfil inválido' }, { status: 400 })
    }
    if (avatarUrl && (typeof avatarUrl !== 'string' || !avatarUrl.startsWith('data:image/') || avatarUrl.length > 1_500_000)) {
      return NextResponse.json({ success: false, error: 'Fotografia de perfil inválida' }, { status: 400 })
    }

    const user = await createUser({
      name,
      email,
      password,
      role,
      company,
      ordersAccess: role === 'admin' ? true : Boolean(ordersAccess ?? true),
      avatarUrl: avatarUrl || undefined,
      commercialId: typeof commercialId === 'string' && commercialId ? commercialId : undefined,
    })
    return NextResponse.json({ success: true, user }, { status: 201 })
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json({ success: false, error: 'Já existe um utilizador com esse email' }, { status: 409 })
    }
    console.error('API Users POST Error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao criar utilizador' }, { status: 500 })
  }
}
