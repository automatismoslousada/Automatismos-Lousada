import { NextRequest, NextResponse } from 'next/server'
import { revokeInactiveClients } from '@/lib/users'

// Corrido diariamente pelo Vercel Cron (ver vercel.json) — desativa contas Cliente (role
// "operador") sem nenhuma encomenda/orçamento há mais de 30 dias. O Vercel assina o pedido com
// "Authorization: Bearer $CRON_SECRET" quando essa variável de ambiente está definida; sem
// CRON_SECRET configurado, o endpoint recusa qualquer pedido em produção, para nunca ficar aberto
// por engano.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ success: false, error: 'CRON_SECRET não está configurado' }, { status: 500 })
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const revoked = await revokeInactiveClients()
    return NextResponse.json({ success: true, revokedCount: revoked.length, revoked })
  } catch (error: any) {
    console.error('Cron revoke-inactive-clients Error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao desativar contas inativas' }, { status: 500 })
  }
}
