import { NextRequest, NextResponse } from 'next/server'
import { verifyCredentials } from '@/lib/users'
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email e palavra-passe são obrigatórios' }, { status: 400 })
    }

    const result = await verifyCredentials(email, password)
    if (!result.ok) {
      if (result.reason === 'disabled') {
        return NextResponse.json(
          { success: false, error: 'O seu acesso está desativado. Contacte o administrador.' },
          { status: 403 }
        )
      }
      return NextResponse.json({ success: false, error: 'Credenciais inválidas' }, { status: 401 })
    }

    const user = result.user
    const token = createSessionToken(user)
    const response = NextResponse.json({ success: true, user })
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    })
    return response
  } catch (error: any) {
    console.error('API Auth Login Error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao autenticar' }, { status: 500 })
  }
}
