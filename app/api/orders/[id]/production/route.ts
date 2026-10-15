import { NextRequest, NextResponse } from 'next/server'
import { updateOrderProductionFields } from '@/lib/db'
import { getSession } from '@/lib/session'

// Atualização dos campos exclusivos da fábrica (mola / voltas da mola / tambor / largura de
// corte / fabricada), por porta, e das Anotações (order.notes — campo já existente, partilhado
// pela encomenda inteira) — usada pela página /producao. Whitelist estrito: só estes campos podem
// mudar aqui, nunca preço, estado, cliente ou medidas (isso continua a passar por
// PATCH /api/orders/[id] ou pelo admin normal). Mola, voltas da mola e tambor são exclusivos do
// admin — o perfil fábrica pode enviá-los no corpo do pedido sem erro, mas são sempre ignorados aqui.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(request)
  if (!session || (session.role !== 'admin' && session.role !== 'fabrica')) {
    return NextResponse.json({ success: false, error: 'Acesso restrito' }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await request.json()

    if (!Array.isArray(body.doors)) {
      return NextResponse.json({ success: false, error: 'Campo "doors" é obrigatório' }, { status: 400 })
    }

    const doorUpdates = body.doors.map((d: any) => {
      const u: {
        productionSpring?: string | null
        productionSpringTurns?: number | null
        productionTambor?: string | null
        productionCutWidthMm?: number | null
        productionFabricada?: boolean
      } = {}
      // Mola / voltas da mola / tambor só podem ser definidas por um admin — um pedido de um
      // perfil "fabrica" que as inclua simplesmente não as aplica, sem rejeitar o resto do pedido.
      if (session.role === 'admin') {
        if ('productionSpring' in d) {
          u.productionSpring = d.productionSpring ? String(d.productionSpring).trim() : null
        }
        if ('productionSpringTurns' in d) {
          const n = Number(d.productionSpringTurns)
          u.productionSpringTurns = Number.isFinite(n) && n > 0 ? n : null
        }
        if ('productionTambor' in d) {
          u.productionTambor = d.productionTambor ? String(d.productionTambor).trim() : null
        }
      }
      if ('productionCutWidthMm' in d) {
        const n = Number(d.productionCutWidthMm)
        u.productionCutWidthMm = Number.isFinite(n) && n > 0 ? Math.round(n) : null
      }
      if ('productionFabricada' in d) {
        u.productionFabricada = !!d.productionFabricada
      }
      return u
    })

    const notes = 'notes' in body ? (body.notes ? String(body.notes).trim() : null) : undefined
    const updated = await updateOrderProductionFields(id, doorUpdates, notes)
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Encomenda não encontrada' }, { status: 404 })
    }

    return NextResponse.json({ success: true, order: updated })
  } catch (error: any) {
    console.error('API Order Production PATCH Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao atualizar dados de produção' },
      { status: 400 }
    )
  }
}
