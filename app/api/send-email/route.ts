import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { sendPdfEmail } from '@/lib/mailer'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  const session = getSession(request)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Sessão inválida ou expirada' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { to, kind, orderId, client, pdfDataUri, fileName } = body

    if (!to || typeof to !== 'string' || !EMAIL_RE.test(to)) {
      return NextResponse.json({ success: false, error: 'Indique um email válido' }, { status: 400 })
    }
    if (!pdfDataUri || typeof pdfDataUri !== 'string' || !fileName || !orderId) {
      return NextResponse.json({ success: false, error: 'Dados em falta para enviar o email' }, { status: 400 })
    }

    const label = kind === 'orcamento' ? 'Orçamento' : 'Encomenda'
    const subject = `${label} ${orderId}${client ? ` — ${client}` : ''}`
    const text = `Segue em anexo ${label.toLowerCase()} com a referência ${orderId}${
      client ? ` para ${client}` : ''
    }.\n\nAutomatismos Lousada`

    await sendPdfEmail({ to, subject, text, pdfDataUri, fileName, profile: kind === 'orcamento' ? 'orcamento' : 'encomenda' })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('API Send Email Error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Erro ao enviar email' }, { status: 500 })
  }
}
