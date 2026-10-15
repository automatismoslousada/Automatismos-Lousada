import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { changeOwnPassword } from '@/lib/users'

// Troca de password pelo próprio utilizador autenticado — usado tanto na troca obrigatória do
// primeiro login como numa eventual troca voluntária a partir das definições da conta.
export async function POST(request: NextRequest) {
  const session = getSession(request)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Sessão inválida ou expirada' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Indique a password atual e a nova password' },
        { status: 400 }
      )
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'A nova password deve ter pelo menos 8 caracteres' },
        { status: 400 }
      )
    }

    const result = await changeOwnPassword(session.sub, currentPassword, newPassword)
    if (!result.ok) {
      if (result.reason === 'invalid_current') {
        return NextResponse.json({ success: false, error: 'Password atual incorreta' }, { status: 400 })
      }
      return NextResponse.json({ success: false, error: 'Utilizador não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ success: true, user: result.user })
  } catch (error: any) {
    console.error('API Change Password Error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao trocar a password' }, { status: 500 })
  }
}
