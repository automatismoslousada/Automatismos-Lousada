// Motor de preços (sem IVA) para o Orçamento comercial.
// Os preços e as próprias opções (cores, tubos, portas, extras, motores...) vêm do catálogo
// editável em /api/catalog (painel "Catálogo", só admin) — ver lib/catalog.ts. Itens sem preço
// de catálogo definido ficam marcados como "sob consulta" e não entram no total.
import { CatalogItem } from './types'

export interface PricingInput {
  width: number // metros
  height: number // metros
  model: string
  colorCode: string
  tubeLeft?: string
  tubeLengthLeft?: string // mm
  tubeRight?: string
  tubeLengthRight?: string // mm
  header: string
  headerLength?: string // mm
  headerWidth?: string // mm — só relevante para padieiras "em painel" (as de tubo não têm largura própria)
  paddingMm?: number // altura da padieira disponível, usada para as padieiras em painel (canelado/liso)
  serviceDoorType?: string
  serviceDoorPanicBar?: boolean
  serviceDoorAirSpring?: boolean
  extras: { name: string; quantity: number }[]
  montagens?: string[]
  windows: boolean
  windowsQuantity?: number
  visorMaterial?: 'vidro' | 'acrilico'
  rubberSeal: boolean
  automation: string
  automationExtras?: { name: string; quantity: number }[]
  rail: string
  remotesQuantity?: number
}

export interface PricingItem {
  label: string
  description: string
  qty: number
  unit: string
  unitPrice: number | null // null = sob consulta (sem preço definido)
  lineTotal: number | null
  // true = este valor não é o preço de catálogo calculado, foi substituído manualmente (ver
  // applyPriceOverrides) — a UI/PDF mostram uma nota a dizer que o preço foi editado.
  edited?: boolean
}

export interface PriceOverride {
  label: string
  lineTotal: number
}

export interface PricingResult {
  items: PricingItem[]
  total: number // subtotal, sem IVA
  hasUnpriced: boolean
  ivaRate: number
  ivaAmount: number
  totalWithIva: number
  // true = o subtotal não é a soma das linhas, foi substituído manualmente (ver
  // applyPriceOverrides) — tem precedência sobre qualquer edição de linha para o cálculo final.
  totalEdited?: boolean
  // true = a taxa de IVA não é a taxa legal por omissão (ver IVA_RATE), foi substituída
  // manualmente (ver applyPriceOverrides).
  ivaRateEdited?: boolean
}

export const IVA_RATE = 0.23

// Nota única usada em todos os sítios onde um preço (ou a taxa de IVA) deste resumo foi editado
// manualmente, para o texto nunca divergir entre a UI, o painel de admin e os PDFs.
export const PRICE_EDITED_NOTE = 'um ou mais valores deste resumo (preço e/ou IVA) foram editados manualmente.'

export function isQuoteEdited(quote: Pick<PricingResult, 'items' | 'totalEdited' | 'ivaRateEdited'>): boolean {
  return Boolean(quote.totalEdited || quote.ivaRateEdited || quote.items.some((item) => item.edited))
}

// Faturação mínima do painel — mesmo em portas pequenas, a área cobrada nunca é inferior a isto.
const MIN_PANEL_BILLABLE_AREA = 5.5

// Aplicado quando a cor escolhida (via "Outro RAL") não existe no catálogo — não é um item de
// catálogo, é a política para cores fora da lista habitual.
const SMOOTH_CUSTOM_PAINT_SURCHARGE = 25 // €/m²
const RIBBED_CUSTOM_FALLBACK_PRICE = 65
const SMOOTH_CUSTOM_FALLBACK_PRICE = 75

function mmToMeters(mm?: string): number {
  const n = parseFloat(mm || '')
  return Number.isFinite(n) && n > 0 ? n / 1000 : 0
}

function findItem(catalog: CatalogItem[], category: string, code: string): CatalogItem | undefined {
  return catalog.find((item) => item.category === category && item.code === code && item.active)
}

function panelPrice(catalog: CatalogItem[], model: string, colorCode: string): { unitPrice: number; note?: string } {
  if (model === 'ribbed') {
    const found = findItem(catalog, 'ribbed_color', colorCode)
    if (found?.price != null) return { unitPrice: found.price }
    return { unitPrice: RIBBED_CUSTOM_FALLBACK_PRICE, note: 'cor personalizada — preço estimado, a confirmar' }
  }
  // smooth (e cassette, sem tabela própria, usa o liso como referência)
  const found = findItem(catalog, 'smooth_color', colorCode)
  if (found?.price != null) return { unitPrice: found.price }
  return {
    unitPrice: SMOOTH_CUSTOM_FALLBACK_PRICE + SMOOTH_CUSTOM_PAINT_SURCHARGE,
    note: `cor personalizada — inclui acréscimo de pintura especial (+${SMOOTH_CUSTOM_PAINT_SURCHARGE}€/m²)`,
  }
}

function tubeItem(
  catalog: CatalogItem[],
  label: string,
  type: string | undefined,
  lengthMm: string | undefined
): PricingItem | null {
  if (!type || type === 'Nenhum') return null
  const lengthM = mmToMeters(lengthMm) || 2.5
  const unitPrice = findItem(catalog, 'tube', type)?.price ?? null
  return {
    label,
    description: `${type} (${(lengthM * 1000).toFixed(0)} mm)`,
    qty: Number(lengthM.toFixed(2)),
    unit: 'm',
    unitPrice,
    lineTotal: unitPrice != null ? Number((unitPrice * lengthM).toFixed(2)) : null,
  }
}

export function calculateQuote(input: PricingInput, catalog: CatalogItem[]): PricingResult {
  const items: PricingItem[] = []
  const area = Number((input.width * input.height).toFixed(2))
  const billedArea = Math.max(area, MIN_PANEL_BILLABLE_AREA)

  // 1. Portão Seccionado (painel + cor)
  const panel = panelPrice(catalog, input.model, input.colorCode)
  items.push({
    label: 'Portão Seccionado',
    description: `${input.model === 'ribbed' ? 'Painel Canelado' : 'Painel Total Liso'} · ${input.colorCode}${
      panel.note ? ` (${panel.note})` : ''
    } · ${input.width.toFixed(2)} × ${input.height.toFixed(2)} m${
      billedArea > area ? ` · faturação mínima ${MIN_PANEL_BILLABLE_AREA} m²` : ''
    }`,
    qty: billedArea,
    unit: 'm²',
    unitPrice: panel.unitPrice,
    lineTotal: Number((panel.unitPrice * billedArea).toFixed(2)),
  })

  // 2. Ombreiras falsas (esquerda / direita) e padieira falsa
  const tubeLeftItem = tubeItem(catalog, 'Ombreira Falsa Esquerda', input.tubeLeft, input.tubeLengthLeft)
  if (tubeLeftItem) items.push(tubeLeftItem)
  const tubeRightItem = tubeItem(catalog, 'Ombreira Falsa Direita', input.tubeRight, input.tubeLengthRight)
  if (tubeRightItem) items.push(tubeRightItem)

  const headerPanel = findItem(catalog, 'header_panel', input.header)
  if (headerPanel) {
    // O preço de catálogo ("X €/metro linear") é por metro de LARGURA da padieira. O escalão
    // "até/mais de 25cm" é decidido pela Altura da própria padieira (headerLength) — não pela
    // Padieira disponível (paddingMm), que é só a folga existente acima da porta.
    const lengthM = mmToMeters(input.headerLength) || 2.5
    const widthM = mmToMeters(input.headerWidth) || 0.2
    const headerHeightMm = Math.round(lengthM * 1000)
    const isUpTo25cm = headerHeightMm <= 250
    const unitPrice = (isUpTo25cm ? headerPanel.price : headerPanel.priceAlt ?? headerPanel.price) ?? null
    items.push({
      label: 'Padieira Falsa',
      description: `${input.header} · altura ${isUpTo25cm ? 'até 25 cm' : 'superior a 25 cm'} (${headerHeightMm} mm) · ${(
        widthM * 1000
      ).toFixed(0)} × ${headerHeightMm} mm`,
      qty: Number(widthM.toFixed(2)),
      unit: 'm',
      unitPrice,
      lineTotal: unitPrice != null ? Number((unitPrice * widthM).toFixed(2)) : null,
    })
  } else {
    const headerItem = tubeItem(catalog, 'Padieira Falsa', input.header, input.headerLength)
    if (headerItem) items.push(headerItem)
  }

  // 3. Porta de serviço pedonal
  if (input.serviceDoorType && input.serviceDoorType !== 'none') {
    const unitPrice = findItem(catalog, 'service_door', input.serviceDoorType)?.price ?? null
    items.push({
      label: 'Porta Pedonal de Serviço',
      description:
        input.serviceDoorType === 'normal'
          ? 'Porta de serviço normal'
          : input.serviceDoorType === 'normal-soleira'
          ? 'Porta de serviço normal com soleira rebaixada'
          : 'Porta de serviço IDEALDOOR',
      qty: 1,
      unit: 'un',
      unitPrice,
      lineTotal: unitPrice,
    })

    if (input.serviceDoorPanicBar) {
      const panicBarPrice = findItem(catalog, 'misc', 'panic_bar')?.price ?? null
      items.push({
        label: 'Barra Antipânico',
        description: 'Barra antipânico na porta pedonal de serviço',
        qty: 1,
        unit: 'un',
        unitPrice: panicBarPrice,
        lineTotal: panicBarPrice,
      })
    }

    if (input.serviceDoorAirSpring) {
      const airSpringPrice = findItem(catalog, 'misc', 'air_spring')?.price ?? null
      items.push({
        label: 'Mola Aérea',
        description: 'Mola aérea na porta pedonal de serviço',
        qty: 1,
        unit: 'un',
        unitPrice: airSpringPrice,
        lineTotal: airSpringPrice,
      })
    }
  }

  // 4. Visores panorâmicos
  if (input.windows) {
    const qty = Math.max(1, input.windowsQuantity || 2)
    const unitPrice = findItem(catalog, 'visor', input.visorMaterial || 'vidro')?.price ?? null
    items.push({
      label: 'Visores Panorâmicos',
      description: `Visor em ${input.visorMaterial === 'acrilico' ? 'acrílico' : 'vidro'}`,
      qty,
      unit: 'un',
      unitPrice,
      lineTotal: unitPrice != null ? Number((unitPrice * qty).toFixed(2)) : null,
    })
  }

  // 5. Vedante perimetral
  if (input.rubberSeal) {
    const unitPrice = findItem(catalog, 'misc', 'rubber_seal')?.price ?? null
    items.push({
      label: 'Vedante Perimetral EPDM',
      description: 'Vedante inferior e lateral de borracha',
      qty: 1,
      unit: 'kit',
      unitPrice,
      lineTotal: unitPrice,
    })
  }

  // 6. Extras adicionais
  for (const extra of input.extras || []) {
    const found = findItem(catalog, 'extra', extra.name)
    if (found?.unit === 'm') {
      const unitPrice = found.price ?? null
      const meters = Number((extra.quantity * input.width).toFixed(2))
      items.push({
        label: extra.name,
        description: `${extra.quantity} painel${extra.quantity > 1 ? 'éis' : ''} × ${input.width.toFixed(2)} m`,
        qty: meters,
        unit: 'm',
        unitPrice,
        lineTotal: unitPrice != null ? Number((unitPrice * meters).toFixed(2)) : null,
      })
      continue
    }
    const unitPrice = found?.price ?? null
    items.push({
      label: extra.name,
      description: extra.quantity > 1 ? `${extra.quantity} unidades` : 'Unidade',
      qty: extra.quantity,
      unit: 'un',
      unitPrice,
      lineTotal: unitPrice != null ? Number((unitPrice * extra.quantity).toFixed(2)) : null,
    })
  }

  // 7. Montagens (instalação)
  for (const montagem of input.montagens || []) {
    const found = findItem(catalog, 'montagem', montagem)
    items.push({
      label: montagem,
      description: found?.note || 'Serviço de instalação',
      qty: 1,
      unit: 'un',
      unitPrice: found?.price ?? null,
      lineTotal: found?.price ?? null,
    })
  }

  // 8. Automatismo, calha e comandos
  if (input.automation && input.automation !== 'Nenhum') {
    const unitPrice = findItem(catalog, 'automation', input.automation)?.price ?? null
    items.push({
      label: 'Automatismo / Motor',
      description: input.automation,
      qty: 1,
      unit: 'un',
      unitPrice,
      lineTotal: unitPrice,
    })

    for (const extra of input.automationExtras || []) {
      const found = findItem(catalog, 'automation_extra', extra.name)
      const unitPrice = found?.price ?? null
      items.push({
        label: extra.name,
        description: extra.quantity > 1 ? `${extra.quantity} unidades` : 'Extra do motor',
        qty: extra.quantity,
        unit: 'un',
        unitPrice,
        lineTotal: unitPrice != null ? Number((unitPrice * extra.quantity).toFixed(2)) : null,
      })
    }
  }
  if (input.rail && input.rail !== 'Nenhum') {
    const unitPrice = findItem(catalog, 'rail', input.rail)?.price ?? null
    items.push({
      label: 'Calha de Tração do Motor',
      description: input.rail,
      qty: 1,
      unit: 'un',
      unitPrice,
      lineTotal: unitPrice,
    })
  }
  if (input.automation && input.automation !== 'Nenhum' && input.automation !== 'Garibalde' && (input.remotesQuantity || 2) > 2) {
    const extraRemotes = (input.remotesQuantity || 2) - 2
    const unitPrice = findItem(catalog, 'misc', 'extra_remote')?.price ?? null
    items.push({
      label: 'Comandos / Emissores adicionais',
      description: `${extraRemotes} comando${extraRemotes > 1 ? 's' : ''} além dos 2 incluídos`,
      qty: extraRemotes,
      unit: 'un',
      unitPrice,
      lineTotal: unitPrice != null ? extraRemotes * unitPrice : null,
    })
  }

  const total = Number(
    items.reduce((sum, item) => sum + (item.lineTotal ?? 0), 0).toFixed(2)
  )
  const hasUnpriced = items.some((item) => item.unitPrice == null)
  const ivaAmount = Number((total * IVA_RATE).toFixed(2))
  const totalWithIva = Number((total + ivaAmount).toFixed(2))

  return { items, total, hasUnpriced, ivaRate: IVA_RATE, ivaAmount, totalWithIva }
}

// Obras com mais do que uma porta — soma o orçamento de cada porta configurada individualmente,
// prefixando cada linha com "Porta N" para se perceber a que porta pertence cada item.
export function calculateMultiDoorQuote(doors: PricingInput[], catalog: CatalogItem[]): PricingResult {
  if (doors.length <= 1) {
    return calculateQuote(doors[0], catalog)
  }

  const items: PricingItem[] = []
  doors.forEach((doorInput, idx) => {
    const { items: doorItems } = calculateQuote(doorInput, catalog)
    doorItems.forEach((item) => items.push({ ...item, label: `Porta ${idx + 1} — ${item.label}` }))
  })

  const total = Number(items.reduce((sum, item) => sum + (item.lineTotal ?? 0), 0).toFixed(2))
  const hasUnpriced = items.some((item) => item.unitPrice == null)
  const ivaAmount = Number((total * IVA_RATE).toFixed(2))
  const totalWithIva = Number((total + ivaAmount).toFixed(2))

  return { items, total, hasUnpriced, ivaRate: IVA_RATE, ivaAmount, totalWithIva }
}

// Substitui o lineTotal de cada linha do Resumo de Preços pelo valor que o utilizador editou
// manualmente (ver Order.priceOverrides), marcando-as com "edited" e recalculando o
// subtotal/IVA/total a partir dos valores finais — usado tanto na UI do configurador como na
// geração dos PDFs, para nunca haver divergência entre o preço mostrado e o preço guardado.
// totalOverride (Order.priceTotalOverride) substitui o subtotal diretamente — tem sempre a
// palavra final sobre a soma das linhas, mesmo que algumas linhas também tenham sido editadas.
// ivaRateOverride (Order.priceIvaRateOverride) substitui a taxa de IVA legal (IVA_RATE) usada
// para calcular o valor de IVA e o total com IVA.
export function applyPriceOverrides(
  quote: PricingResult,
  overrides?: PriceOverride[] | null,
  totalOverride?: number | null,
  ivaRateOverride?: number | null
): PricingResult {
  const hasItemOverrides = !!overrides && overrides.length > 0
  const hasTotalOverride = totalOverride != null && Number.isFinite(totalOverride)
  const hasIvaRateOverride = ivaRateOverride != null && Number.isFinite(ivaRateOverride) && ivaRateOverride >= 0
  if (!hasItemOverrides && !hasTotalOverride && !hasIvaRateOverride) return quote

  const overrideMap = new Map((overrides ?? []).map((o) => [o.label, o.lineTotal]))
  const items = quote.items.map((item) =>
    overrideMap.has(item.label) ? { ...item, lineTotal: overrideMap.get(item.label)!, edited: true } : item
  )

  const computedTotal = Number(items.reduce((sum, item) => sum + (item.lineTotal ?? 0), 0).toFixed(2))
  const total = hasTotalOverride ? Number(totalOverride!.toFixed(2)) : computedTotal
  const hasUnpriced = items.some((item) => item.unitPrice == null && !item.edited)
  const ivaRate = hasIvaRateOverride ? ivaRateOverride! : quote.ivaRate
  const ivaAmount = Number((total * ivaRate).toFixed(2))
  const totalWithIva = Number((total + ivaAmount).toFixed(2))

  return {
    ...quote,
    items,
    total,
    hasUnpriced,
    ivaRate,
    ivaAmount,
    totalWithIva,
    totalEdited: hasTotalOverride,
    ivaRateEdited: hasIvaRateOverride,
  }
}
