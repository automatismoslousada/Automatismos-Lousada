'use client'

import { useEffect, useRef, useState } from 'react'
import { DoorConfig, Order, User } from '@/lib/types'
import { buildOrderLabelsPDF, buildProductionSheetPDF, generateProductionSheetPDF } from '@/lib/pdf-generator'
import {
  FERRAGEM_EXTRA_NAMES,
  accessoriesBox,
  calhaLValue,
  curvaValue,
  ferragemExtras,
  ferragemLabel,
  finalOpeningDimensions,
  hasExtrasEAdicionais,
  modelLabels,
  panelBreakdown,
  varaoValue,
} from '@/lib/production'
import {
  ArrowRight,
  Boxes,
  Check,
  FileDown,
  KeyRound,
  Loader2,
  LogOut,
  Printer,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react'

// Página dedicada à fábrica (perfil "fabrica", mas também acessível a "admin") — é esta a URL
// para onde a app Electron (electron-app/) aponta a sua janela. Propositadamente independente de
// app/page.tsx (não importa nada de lá): extrair Login/ForcePasswordChange de um ficheiro com
// 7700+ linhas seria mais arriscado do que duplicar os ~100 linhas essenciais aqui, com as mesmas
// convenções visuais (verde #16a34a, cartões rounded-2xl).

function ProducaoLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="size-10 overflow-hidden rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-black/5">
        <img src="/icon.png" alt="Automatismos Lousada" className="size-full object-contain" />
      </div>
      <div className="leading-none">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#16a34a]">Automatismos Lousada</p>
        <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.24em] text-[#56655e]">Produção</p>
      </div>
    </div>
  )
}

function ProducaoLogin({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (data.success) {
        onLogin(data.user)
      } else {
        setError(data.error || 'Credenciais inválidas')
      }
    } catch (err) {
      console.error(err)
      setError('Erro ao ligar à base de dados. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7f6] px-5 py-10 text-[#152126]">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-[0_24px_80px_-30px_rgba(22,50,39,.3)] ring-1 ring-[#e0e8e3] sm:p-10">
        <div className="mb-8">
          <ProducaoLogo />
          <h2 className="mt-6 text-2xl font-semibold tracking-tight">Ficha de Produção</h2>
          <p className="mt-2 text-sm text-[#76827d]">Acesso reservado à fábrica.</p>
        </div>
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2 text-sm font-semibold">
            Email
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              autoComplete="username"
              placeholder="nome@empresa.pt"
              className="h-12 rounded-xl border border-[#dce5df] bg-[#fbfcfb] px-4 font-normal outline-none transition focus:border-[#16a34a] focus:ring-4 focus:ring-[#16a34a]/10"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold">
            Palavra-passe
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="h-12 rounded-xl border border-[#dce5df] bg-[#fbfcfb] px-4 font-normal outline-none transition focus:border-[#16a34a] focus:ring-4 focus:ring-[#16a34a]/10"
            />
          </label>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="mt-1 flex h-12 items-center justify-center gap-2 rounded-xl bg-[#16a34a] font-bold text-white transition hover:bg-[#12883d] shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                Entrar <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  )
}

function ProducaoForcePasswordChange({ user, onChanged }: { user: User; onChanged: (user: User) => void }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (newPassword.length < 8) {
      setError('A nova password deve ter pelo menos 8 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('As duas passwords novas não coincidem')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (data.success) {
        onChanged(data.user)
      } else {
        setError(data.error || 'Erro ao trocar a password')
      }
    } catch (err) {
      console.error(err)
      setError('Erro ao ligar à base de dados. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7f6] px-5 py-10 text-[#152126]">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-[0_24px_80px_-30px_rgba(22,50,39,.3)] ring-1 ring-[#e0e8e3] sm:p-10">
        <div className="mb-6">
          <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-[#e9f7ee] text-[#16a34a]">
            <KeyRound className="size-6" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Troca a tua password</h2>
          <p className="mt-2 text-sm text-[#76827d]">
            Olá, {user.name.split(' ')[0]} — por segurança, tens de definir uma password nova antes de continuar.
          </p>
        </div>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2 text-sm font-semibold">
            Password atual
            <input
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              type="password"
              required
              autoComplete="current-password"
              className="h-12 rounded-xl border border-[#dce5df] bg-[#fbfcfb] px-4 font-normal outline-none transition focus:border-[#16a34a] focus:ring-4 focus:ring-[#16a34a]/10"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold">
            Nova password
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              type="password"
              required
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              className="h-12 rounded-xl border border-[#dce5df] bg-[#fbfcfb] px-4 font-normal outline-none transition focus:border-[#16a34a] focus:ring-4 focus:ring-[#16a34a]/10"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold">
            Confirmar nova password
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type="password"
              required
              autoComplete="new-password"
              className="h-12 rounded-xl border border-[#dce5df] bg-[#fbfcfb] px-4 font-normal outline-none transition focus:border-[#16a34a] focus:ring-4 focus:ring-[#16a34a]/10"
            />
          </label>
          {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 flex h-12 items-center justify-center gap-2 rounded-xl bg-[#16a34a] text-sm font-bold text-white shadow-sm transition hover:bg-[#12883d] disabled:opacity-60"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Trocar password e continuar
          </button>
        </form>
      </div>
    </main>
  )
}

// Lê os campos de porta de Order ou DoorConfig de forma uniforme — order.doors[] quando a obra
// tem mais do que uma porta, senão os campos "soltos" da própria Order (porta única).
function doorsOf(order: Order): DoorConfig[] {
  return order.doors && order.doors.length > 0 ? order.doors : [order]
}

function DoorSummary({
  door,
  draft,
  onUpdateDraft,
  isAdmin,
}: {
  door: DoorConfig
  draft: DoorFieldDraft
  onUpdateDraft: (patch: Partial<DoorFieldDraft>) => void
  isAdmin: boolean
}) {
  const finalDims = finalOpeningDimensions(door)
  return (
    <div className="flex flex-col gap-3 text-xs">
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
        <p className="mb-2 font-bold uppercase tracking-wide text-[#16a34a]">Painel e Acabamento</p>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-gray-700">
          <p>
            <b>Largura:</b> {finalDims.widthMm} mm
          </p>
          <p>
            <b>Altura:</b> {finalDims.heightMm} mm
          </p>
          <p>
            <b>Ombreira Esquerda:</b>{' '}
            {door.tubeLeft && door.tubeLeft !== 'Nenhum'
              ? `${door.tubeLeft}${finalDims.leftDeductMm > 0 ? ` · -${finalDims.leftDeductMm} mm` : ''}`
              : `${door.leftShadeMm} mm`}
          </p>
          <p>
            <b>Ombreira Direita:</b>{' '}
            {door.tubeRight && door.tubeRight !== 'Nenhum'
              ? `${door.tubeRight}${finalDims.rightDeductMm > 0 ? ` · -${finalDims.rightDeductMm} mm` : ''}`
              : `${door.rightShadeMm} mm`}
          </p>
          <p>
            <b>Padieira:</b>{' '}
            {door.header !== 'Nenhum'
              ? `${door.header}${finalDims.topDeductMm > 0 ? ` · -${finalDims.topDeductMm} mm` : ''}`
              : `${door.paddingMm} mm`}
          </p>
          <p>
            <b>Largura de Corte:</b> {door.productionCutWidthMm ?? finalDims.widthMm + 30} mm
          </p>
          <p>
            <b>Painel:</b> {modelLabels[door.model] || door.model}
          </p>
          <p>
            <b>Cor:</b> {door.colorCode}
          </p>
          {(() => {
            const { p610, p500, cutMm } = panelBreakdown(finalDims.heightMm)
            return (
              <>
                <p>
                  <b>Painéis 610mm:</b> {p610}
                </p>
                <p>
                  <b>Painéis 500mm:</b> {p500}
                </p>
                <p>
                  <b>Corte do excedente:</b> {cutMm} mm
                </p>
              </>
            )
          })()}
        </div>
      </div>
      <AccessoriesBoxCard door={door} />
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
        <p className="mb-2 font-bold uppercase tracking-wide text-[#16a34a]">Ferragens</p>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-gray-700">
          <p>
            <b>Ferragem:</b> {ferragemLabel(door)}
          </p>
          {ferragemExtras(door).length > 0 && (
            <p>
              <b>Extras:</b> {ferragemExtras(door).join(', ')}
            </p>
          )}
          <p>
            <b>Calha L:</b> {calhaLValue(door)} mm
          </p>
          <p>
            <b>Curva:</b> {curvaValue(door)}
          </p>
          <p>
            <b>Varão:</b> {varaoValue(door)} mm
          </p>
          {!isAdmin && (
            <>
              <p>
                <b>Mola:</b> {draft.productionSpring || '—'}
              </p>
              <p>
                <b>Voltas da Mola:</b> {draft.productionSpringTurns || '—'}
              </p>
              <p>
                <b>Tambor:</b> {draft.productionTambor || '—'}
              </p>
            </>
          )}
        </div>
        {isAdmin && (
          <div className="mt-3 flex flex-wrap gap-3 border-t border-gray-200 pt-3">
            <label className="flex flex-1 min-w-[160px] flex-col gap-1.5 text-xs font-bold text-gray-700">
              Mola
              <input
                value={draft.productionSpring}
                onChange={(e) => onUpdateDraft({ productionSpring: e.target.value })}
                placeholder="Especificação da mola"
                className="h-10 rounded-lg border border-[#dce5df] bg-white px-3 text-sm font-normal text-gray-900 outline-none transition focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/10"
              />
            </label>
            <label className="flex w-32 flex-col gap-1.5 text-xs font-bold text-gray-700">
              Voltas da Mola
              <input
                type="number"
                step="0.5"
                value={draft.productionSpringTurns}
                onChange={(e) => onUpdateDraft({ productionSpringTurns: e.target.value })}
                placeholder="Ex: 8.5"
                className="h-10 rounded-lg border border-[#dce5df] bg-white px-3 text-sm font-normal text-gray-900 outline-none transition focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/10"
              />
            </label>
            <label className="flex flex-1 min-w-[160px] flex-col gap-1.5 text-xs font-bold text-gray-700">
              Tambor
              <input
                value={draft.productionTambor}
                onChange={(e) => onUpdateDraft({ productionTambor: e.target.value })}
                placeholder="Especificação do tambor"
                className="h-10 rounded-lg border border-[#dce5df] bg-white px-3 text-sm font-normal text-gray-900 outline-none transition focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/10"
              />
            </label>
          </div>
        )}
      </div>
      {hasExtrasEAdicionais(door) && (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
        <p className="mb-2 font-bold uppercase tracking-wide text-[#16a34a]">Extras e Adicionais</p>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-gray-700">
          {door.tubeLeft && door.tubeLeft !== 'Nenhum' && (
            <p>
              <b>Ombreira Esquerda:</b> {door.tubeLeft}
              {door.tubeLengthLeft ? ` × ${door.tubeLengthLeft} mm` : ''}
            </p>
          )}
          {door.tubeRight && door.tubeRight !== 'Nenhum' && (
            <p>
              <b>Ombreira Direita:</b> {door.tubeRight}
              {door.tubeLengthRight ? ` × ${door.tubeLengthRight} mm` : ''}
            </p>
          )}
          {door.header !== 'Nenhum' && (
            <p>
              <b>Padieira Falsa:</b> {door.header} ({door.headerUnits || 1} un
              {door.headerLength ? ` × ${door.headerLength} mm` : ''})
            </p>
          )}
          {door.automation !== 'Nenhum' && (
            <p>
              <b>Automatismo:</b> {door.automation}
            </p>
          )}
          {door.rail !== 'Nenhum' && (
            <p>
              <b>Calha:</b> {door.rail}
            </p>
          )}
          {door.remotesQuantity > 2 && (
            <p>
              <b>Comandos:</b> {door.remotesQuantity}
            </p>
          )}
          {door.serviceDoor && (
            <p>
              <b>Porta de Serviço:</b> Sim
            </p>
          )}
          {door.windows && (
            <p>
              <b>Visores:</b> {door.windowsQuantity || 2}
              {door.windowsPanels && door.windowsPanels.length > 0 && (
                <> — Painel{door.windowsPanels.length > 1 ? 'éis' : ''} {door.windowsPanels.join(', ')}</>
              )}
            </p>
          )}
          {door.rubberSeal && (
            <p>
              <b>Vedante:</b> Sim
            </p>
          )}
          {door.automationExtras && door.automationExtras.length > 0 && (
            <p>
              <b>Extras do Motor:</b>{' '}
              {door.automationExtras.map((e) => (e.quantity > 1 ? `${e.name} ×${e.quantity}` : e.name)).join(', ')}
            </p>
          )}
          {door.extras && door.extras.filter((e) => !FERRAGEM_EXTRA_NAMES.includes(e.name)).length > 0 && (
            <p>
              <b>Extras:</b>{' '}
              {door.extras
                .filter((e) => !FERRAGEM_EXTRA_NAMES.includes(e.name))
                .map((e) => (e.quantity > 1 ? `${e.name} ×${e.quantity}` : e.name))
                .join(', ')}
            </p>
          )}
          {door.montagens && door.montagens.length > 0 && (
            <p>
              <b>Montagens:</b> {door.montagens.join(', ')}
            </p>
          )}
        </div>
      </div>
      )}
    </div>
  )
}

function AccessoriesBoxCard({ door }: { door: DoorConfig }) {
  const accessories = accessoriesBox(door)

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
      <p className="mb-2 font-bold uppercase tracking-wide text-[#16a34a]">Caixa de Acessórios</p>
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-gray-700">
        {accessories.map((a) => (
          <p key={a.label}>
            <b>{a.label}:</b> {a.qty}
            {a.unit === 'mm' ? ' mm' : ''}
          </p>
        ))}
      </div>
    </div>
  )
}

type DoorFieldDraft = {
  productionSpring: string
  productionSpringTurns: string
  productionTambor: string
  productionCutWidthMm: string
  productionFabricada: boolean
}

function OrderDetailPanel({
  order,
  user,
  onClose,
  onSaved,
  onDeleted,
}: {
  order: Order
  user: User
  onClose: () => void
  onSaved: (updated: Order) => void
  onDeleted: () => void
}) {
  const isAdmin = user.role === 'admin'
  const doors = doorsOf(order)
  const [drafts, setDrafts] = useState<DoorFieldDraft[]>(() =>
    doors.map((d) => ({
      productionSpring: d.productionSpring || '',
      productionSpringTurns: d.productionSpringTurns != null ? String(d.productionSpringTurns) : '',
      productionTambor: d.productionTambor || '',
      productionCutWidthMm: d.productionCutWidthMm != null ? String(d.productionCutWidthMm) : '',
      productionFabricada: d.productionFabricada,
    }))
  )
  const [notesDraft, setNotesDraft] = useState(order.notes || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [printingPdf, setPrintingPdf] = useState(false)
  const [printingLabels, setPrintingLabels] = useState(false)

  const updateDraft = (index: number, patch: Partial<DoorFieldDraft>) =>
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)))

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/orders/${order.id}/production`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doors: drafts.map((d) => ({
            productionSpring: d.productionSpring,
            productionSpringTurns: d.productionSpringTurns === '' ? null : Number(d.productionSpringTurns),
            productionTambor: d.productionTambor,
            productionCutWidthMm: d.productionCutWidthMm === '' ? null : Number(d.productionCutWidthMm),
            productionFabricada: d.productionFabricada,
          })),
          notes: notesDraft,
        }),
      })
      const data = await res.json()
      if (data.success) {
        onSaved(data.order)
      } else {
        setError(data.error || 'Erro ao guardar')
      }
    } catch (err) {
      console.error(err)
      setError('Erro ao ligar à base de dados.')
    } finally {
      setSaving(false)
    }
  }

  // A Ficha de Produção usa sempre o que está no ecrã (mesmo sem guardar ainda), para o
  // utilizador poder pré-visualizar antes de confirmar.
  const buildOrderForPdf = (): Order => {
    const mergedDoors = doors.map((d, i) => ({
      ...d,
      productionSpring: drafts[i].productionSpring || undefined,
      productionSpringTurns: drafts[i].productionSpringTurns === '' ? undefined : Number(drafts[i].productionSpringTurns),
      productionTambor: drafts[i].productionTambor || undefined,
      productionCutWidthMm: drafts[i].productionCutWidthMm === '' ? undefined : Number(drafts[i].productionCutWidthMm),
    }))
    return {
      ...order,
      ...mergedDoors[0],
      doors: order.doors && order.doors.length > 0 ? mergedDoors : order.doors,
      notes: notesDraft,
    }
  }

  const handleGeneratePdf = async () => {
    setGeneratingPdf(true)
    try {
      await generateProductionSheetPDF(buildOrderForPdf())
    } catch (err) {
      console.error(err)
      setError('Erro ao gerar o PDF.')
    } finally {
      setGeneratingPdf(false)
    }
  }

  // Abre o diálogo de impressão nativo (seleção de impressora e nº de cópias) através de um
  // iframe escondido a carregar o PDF — em vez de descarregar o ficheiro, como "Gerar Ficha de
  // Produção" faz. Partilhado entre a Ficha de Produção e as etiquetas de porta.
  const printPdfDoc = (doc: Awaited<ReturnType<typeof buildProductionSheetPDF>>['doc']) => {
    const blobUrl = doc.output('bloburl').toString()
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.src = blobUrl
    iframe.onload = () => {
      const cleanup = () => {
        window.URL.revokeObjectURL(blobUrl)
        iframe.remove()
      }
      iframe.contentWindow?.addEventListener('afterprint', cleanup, { once: true })
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      // Rede de segurança caso o browser não dispare "afterprint" (ex: diálogo cancelado).
      setTimeout(cleanup, 60000)
    }
    document.body.appendChild(iframe)
  }

  const handlePrintPdf = async () => {
    setPrintingPdf(true)
    try {
      const { doc } = await buildProductionSheetPDF(buildOrderForPdf())
      printPdfDoc(doc)
    } catch (err) {
      console.error(err)
      setError('Erro ao preparar a impressão.')
    } finally {
      setPrintingPdf(false)
    }
  }

  // 1 etiqueta (Nº, cliente, medidas, cor) por porta da encomenda, para a impressora de etiquetas
  // de rolo contínuo (ver buildOrderLabelsPDF) — mesmo diálogo nativo de impressão, onde o
  // utilizador pode pedir mais cópias se precisar.
  const handlePrintLabels = async () => {
    setPrintingLabels(true)
    try {
      const { doc } = await buildOrderLabelsPDF(order)
      printPdfDoc(doc)
    } catch (err) {
      console.error(err)
      setError('Erro ao preparar as etiquetas.')
    } finally {
      setPrintingLabels(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 p-5">
          <div>
            <span className="rounded bg-[#e9f7ee] px-2.5 py-1 font-mono text-xs font-bold text-[#16a34a]">
              {order.id}
            </span>
            <h3 className="mt-1 text-lg font-bold text-gray-900">{order.client}</h3>
            {doors.length > 1 && <p className="mt-0.5 text-[11px] text-[#86918b]">Obra com {doors.length} portas</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          <div className="flex flex-col gap-5">
            {doors.map((door, i) => (
              <div key={i} className="rounded-2xl border border-[#e0e8e3] p-4">
                <div className="mb-3 flex items-center justify-between">
                  {doors.length > 1 ? (
                    <p className="text-sm font-bold text-[#152126]">Porta {i + 1} de {doors.length}</p>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    onClick={() => updateDraft(i, { productionFabricada: !drafts[i].productionFabricada })}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                      drafts[i].productionFabricada
                        ? 'bg-[#e9f7ee] text-[#16a34a] hover:bg-[#d9f0e3]'
                        : 'bg-amber-50 text-amber-700 ring-1 ring-amber-300 hover:bg-amber-100'
                    }`}
                  >
                    {drafts[i].productionFabricada ? '✓ Fabricada' : 'Em Produção'}
                  </button>
                </div>
                <DoorSummary
                  door={door}
                  draft={drafts[i]}
                  onUpdateDraft={(patch) => updateDraft(i, patch)}
                  isAdmin={isAdmin}
                />
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
            <label className="flex flex-col gap-1.5 text-xs font-bold text-amber-900">
              Anotações
              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                placeholder="Observações da encomenda..."
                rows={2}
                className="w-full resize-none rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-normal text-gray-900 outline-none focus:border-amber-500"
              />
            </label>
          </div>

          {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{error}</p>}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          {isAdmin ? (
            <button
              type="button"
              onClick={onDeleted}
              className="flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50"
            >
              <Trash2 className="size-4" />
              Eliminar
            </button>
          ) : (
            <span />
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handlePrintPdf}
            disabled={printingPdf}
            className="flex items-center justify-center gap-2 rounded-xl border border-[#dce5df] px-4 py-2.5 text-xs font-bold text-[#2d3a33] hover:bg-gray-50 disabled:opacity-60"
          >
            {printingPdf ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
            Imprimir
          </button>
          <button
            type="button"
            onClick={handlePrintLabels}
            disabled={printingLabels}
            className="flex items-center justify-center gap-2 rounded-xl border border-[#dce5df] px-4 py-2.5 text-xs font-bold text-[#2d3a33] hover:bg-gray-50 disabled:opacity-60"
          >
            {printingLabels ? <Loader2 className="size-4 animate-spin" /> : <Tag className="size-4" />}
            Imprimir Etiqueta{doors.length > 1 ? 's' : ''}
          </button>
          <button
            type="button"
            onClick={handleGeneratePdf}
            disabled={generatingPdf}
            className="flex items-center justify-center gap-2 rounded-xl border border-[#dce5df] px-4 py-2.5 text-xs font-bold text-[#2d3a33] hover:bg-gray-50 disabled:opacity-60"
          >
            {generatingPdf ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
            Gerar Ficha de Produção
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#16a34a] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#12883d] disabled:opacity-60"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Guardar
          </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProducaoBoard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const seenIds = useRef<Set<string>>(new Set())
  const [hasNew, setHasNew] = useState(false)
  const [search, setSearch] = useState('')

  const fetchOrders = async (isFirstLoad: boolean) => {
    try {
      const res = await fetch('/api/orders?status=Produção,Concluído&kind=encomenda')
      const data = await res.json()
      if (data.success) {
        if (!isFirstLoad) {
          const newOnes = (data.orders as Order[]).some((o) => !seenIds.current.has(o.id))
          if (newOnes) setHasNew(true)
        }
        seenIds.current = new Set((data.orders as Order[]).map((o) => o.id))
        setOrders(data.orders)
        setError('')
      } else {
        setError(data.error || 'Erro ao carregar encomendas')
      }
    } catch (err) {
      console.error(err)
      setError('Erro ao ligar à base de dados.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders(true)
    const interval = setInterval(() => fetchOrders(false), 30_000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedOrder = orders.find((o) => o.id === selectedId) || null

  // Procura por nº de encomenda ou nome do cliente — ignora maiúsculas/minúsculas e acentos, para
  // "fechelite" encontrar "FECHELITE" e "jose" encontrar "José".
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
  const searchTerm = normalize(search.trim())
  const filteredOrders = searchTerm
    ? orders.filter((o) => normalize(o.id).includes(searchTerm) || normalize(o.client).includes(searchTerm))
    : orders

  // Quando todas as portas ficam fabricadas, o servidor passa o estado da encomenda para
  // "Concluído" (ver updateOrderProductionFields) — continua visível nesta página (ver fetchOrders,
  // que já pede "Produção,Concluído"), só muda a etiqueta da linha para "Finalizado". Se voltar a
  // ficar incompleta, o servidor repõe "Produção" sozinho e a etiqueta acompanha.
  const applyOrderUpdate = (updated: Order) => {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
  }

  // Só admin pode eliminar (a API já reforça isto do lado do servidor — ver DELETE /api/orders/[id]).
  const handleDeleteOrder = async (id: string) => {
    if (!confirm(`Tem a certeza que deseja eliminar a encomenda ${id} da base de dados?`)) {
      return
    }
    try {
      const res = await fetch(`/api/orders/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setOrders((prev) => prev.filter((o) => o.id !== id))
        if (selectedId === id) setSelectedId(null)
      } else {
        alert(data.error || 'Erro ao eliminar encomenda.')
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao eliminar encomenda.')
    }
  }

  // Alterna Em Produção/Fabricada diretamente na linha, sem abrir o painel de detalhe — envia o
  // estado atual de todas as portas da encomenda, só com a porta clicada invertida.
  const toggleFabricada = async (order: Order, doorIndex: number) => {
    const doors = doorsOf(order)
    const body = {
      doors: doors.map((d, i) => ({
        productionFabricada: i === doorIndex ? !d.productionFabricada : d.productionFabricada,
      })),
    }
    try {
      const res = await fetch(`/api/orders/${order.id}/production`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.success) {
        applyOrderUpdate(data.order)
      }
    } catch (err) {
      console.error('Erro ao atualizar estado de fabrico:', err)
    }
  }

  return (
    <div className="min-h-screen bg-[#f3f6f4] text-[#152126]">
      <header className="flex h-[72px] items-center justify-between border-b border-[#e2e9e4] bg-white px-5 sm:px-8">
        <ProducaoLogo />
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              setHasNew(false)
              fetchOrders(false)
            }}
            className="flex items-center gap-1.5 rounded-lg border border-[#dce5df] px-3 py-1.5 text-xs font-bold text-[#2d3a33] hover:bg-gray-50"
          >
            <RefreshCw className="size-3.5" /> Atualizar
          </button>
          <div className="text-right leading-tight">
            <p className="text-sm font-bold text-[#152126]">{user.name}</p>
            <p className="text-xs text-[#8a958f]">Fábrica</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            title="Sair"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#152126]">Encomendas em Produção</h1>
            <p className="mt-1 text-xs text-[#8a958f]">
              Atualiza automaticamente a cada 30 segundos — uma linha por porta.
              {hasNew && <span className="ml-2 font-bold text-[#16a34a]">● Há encomendas novas</span>}
            </p>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a958f]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Procurar por nº ou cliente..."
              className="h-9 w-64 rounded-lg border border-[#dce5df] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#16a34a]"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-6 animate-spin text-[#16a34a]" />
          </div>
        ) : error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{error}</p>
        ) : orders.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#dce5df] bg-white p-10 text-center text-sm text-[#87918c]">
            Sem encomendas em Produção neste momento.
          </p>
        ) : filteredOrders.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#dce5df] bg-white p-10 text-center text-sm text-[#87918c]">
            Nenhuma encomenda encontrada para &quot;{search.trim()}&quot;.
          </p>
        ) : (
          <div className="overflow-auto rounded-2xl border border-[#e0e8e3] bg-white shadow-sm">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#e0e8e3] bg-[#f8faf9] text-[11px] font-bold uppercase tracking-wide text-[#6d7973]">
                  <th className="px-4 py-3">Nº</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Largura</th>
                  <th className="px-4 py-3">Altura</th>
                  <th className="px-4 py-3">Padieira</th>
                  <th className="px-4 py-3">Cor</th>
                  <th className="px-4 py-3">m²</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Data</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.flatMap((order) => {
                  const doors = doorsOf(order)
                  return doors.map((door, i) => {
                    const finalDims = finalOpeningDimensions(door)
                    return (
                    <tr
                      key={`${order.id}-${i}`}
                      onClick={() => setSelectedId(order.id)}
                      className="cursor-pointer border-b border-[#eef2ef] transition last:border-0 hover:bg-[#f4f9f6]"
                    >
                      <td className="px-4 py-3 font-mono text-xs font-bold text-[#16a34a]">
                        <span className="inline-flex items-center gap-1.5">
                          {order.id}
                          {!door.productionSpring && (
                            <span title="Mola por definir" className="inline-flex shrink-0">
                              <TriangleAlert className="size-3.5 text-red-600" aria-label="Mola por definir" />
                            </span>
                          )}
                        </span>
                        {doors.length > 1 && <span className="ml-1 text-[#8a958f]">· {i + 1}/{doors.length}</span>}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#152126]">{order.client}</td>
                      <td className="px-4 py-3 text-[#2d3a33]">{finalDims.widthMm} mm</td>
                      <td className="px-4 py-3 text-[#2d3a33]">{finalDims.heightMm} mm</td>
                      <td className="px-4 py-3 text-[#2d3a33]">{finalDims.topDeductMm} mm</td>
                      <td className="px-4 py-3 text-[#2d3a33]">{door.colorCode}</td>
                      <td className="px-4 py-3 text-[#2d3a33]">{door.area.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFabricada(order, i)
                          }}
                          className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                            order.status === 'Concluído'
                              ? 'bg-[#eaf1fb] text-[#2563eb] hover:bg-[#dbe8fa]'
                              : door.productionFabricada
                              ? 'bg-[#e9f7ee] text-[#16a34a] hover:bg-[#d9f0e3]'
                              : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                          }`}
                        >
                          {order.status === 'Concluído'
                            ? '✓ Finalizado'
                            : door.productionFabricada
                            ? '✓ Fabricada'
                            : 'Em Produção'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-[#8a958f]">
                        {new Date(order.createdAt).toLocaleDateString('pt-PT')}
                      </td>
                    </tr>
                    )
                  })
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {selectedOrder && (
        <OrderDetailPanel
          order={selectedOrder}
          user={user}
          onClose={() => setSelectedId(null)}
          onSaved={applyOrderUpdate}
          onDeleted={() => handleDeleteOrder(selectedOrder.id)}
        />
      )}
    </div>
  )
}

export default function ProducaoPage() {
  const [user, setUser] = useState<User | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setUser(data.user)
      })
      .catch(() => {})
      .finally(() => setCheckingSession(false))
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (err) {
      console.error(err)
    }
    setUser(null)
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7f6]">
        <Loader2 className="size-6 animate-spin text-[#16a34a]" />
      </div>
    )
  }

  if (!user) return <ProducaoLogin onLogin={(loggedInUser) => setUser(loggedInUser)} />
  if (user.mustChangePassword) {
    return <ProducaoForcePasswordChange user={user} onChanged={(updatedUser) => setUser(updatedUser)} />
  }
  if (user.role !== 'admin' && user.role !== 'fabrica') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f5f7f6] text-center">
        <Boxes className="size-10 text-gray-300" />
        <p className="text-sm font-semibold text-[#56655e]">Acesso restrito à fábrica.</p>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg border border-[#dce5df] px-4 py-2 text-xs font-bold text-[#2d3a33] hover:bg-gray-50"
        >
          Sair
        </button>
      </div>
    )
  }

  return <ProducaoBoard user={user} onLogout={handleLogout} />
}
