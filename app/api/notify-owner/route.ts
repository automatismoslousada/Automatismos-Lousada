import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { sendPdfEmail } from '@/lib/mailer'

// Notifica automaticamente o dono da empresa sempre que um cliente regista uma nova encomenda ou
// pede um orçamento — distinto do envio manual em /api/send-email, que serve para a equipa
// reenviar a ficha técnica a um email à escolha (ex: o cliente). Encomendas e orçamentos podem ir
// para destinatários diferentes: OWNER_EMAIL_ENCOMENDA / OWNER_EMAIL_ORCAMENTO, com OWNER_EMAIL
// como destino comum de reserva caso só um deles esteja definido.
export async function POST(request: NextRequest) {
  const session = getSession(request)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Sessão inválida ou expirada' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { kind, orderId, client, pdfDataUri, fileName } = body

    if (!pdfDataUri || typeof pdfDataUri !== 'string' || !fileName || !orderId) {
      return NextResponse.json({ success: false, error: 'Dados em falta para notificar o dono' }, { status: 400 })
    }

    const isQuote = kind === 'orcamento'
    const ownerEmail = isQuote
      ? process.env.OWNER_EMAIL_ORCAMENTO || process.env.OWNER_EMAIL
      : process.env.OWNER_EMAIL_ENCOMENDA || process.env.OWNER_EMAIL

    if (!ownerEmail) {
      // Não configurado — não é um erro do pedido em si, apenas não há ninguém a notificar.
      return NextResponse.json(
        { success: false, error: `${isQuote ? 'OWNER_EMAIL_ORCAMENTO' : 'OWNER_EMAIL_ENCOMENDA'} (ou OWNER_EMAIL) não está configurado` },
        { status: 200 }
      )
    }

    const label = isQuote ? 'Novo Orçamento' : 'Nova Encomenda'
    const subject = `${label}${client ? ` - ${client}` : ''}`
    const text = `Foi ${isQuote ? 'pedido um novo orçamento' : 'registada uma nova encomenda'} na plataforma${
      client ? ` para ${client}` : ''
    }.\n\nFicha técnica em anexo.\n\nAutomatismos Lousada`

    await sendPdfEmail({ to: ownerEmail, subject, text, pdfDataUri, fileName, profile: isQuote ? 'orcamento' : 'encomenda' })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('API Notify Owner Error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Erro ao notificar o dono' }, { status: 500 })
  }
}
