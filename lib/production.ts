// Regras de negócio da Ficha de Produção — partilhadas entre a página /producao (app/producao/page.tsx)
// e a geração do PDF (lib/pdf-generator.ts), para os dois nunca poderem mostrar valores diferentes
// para o mesmo campo calculado.
import { DoorConfig } from './types'

export const modelLabels: Record<string, string> = {
  smooth: 'Painel Total Liso',
  ribbed: 'Painel Canelado',
  cassette: 'Painel Almofadado (Cassette)',
}

// Versão curta para a etiqueta de rolo (62 mm), onde partilha a linha com a cor.
export const modelShortLabels: Record<string, string> = {
  smooth: 'Painel Total Liso',
  ribbed: 'Painel Canelado',
  cassette: 'Painel Cassette',
}

// Padieira final: a "Padieira disponível" de "Medidas de Vão" mais a Padieira falsa escolhida em
// "Estrutura de Remate" (o que a falsa tira à altura do vão passa a ser padieira — ex: 100 + 200
// = 300). Sem padieira falsa é a Padieira disponível tal qual. É este valor que entra no tipo de
// ferragem, na Calha L, nos anilhões e no comprimento dos cabos de aço.
export function effectivePaddingMm(door: DoorConfig): number {
  return door.paddingMm + finalOpeningDimensions(door).topDeductMm
}

// Ombreira Esquerda/Direita final: a Ombreira de "Medidas de Vão" mais a Ombreira falsa desse
// lado — mesmo raciocínio de effectivePaddingMm, para os lados da porta.
export function effectiveLeftShadeMm(door: DoorConfig): number {
  return door.leftShadeMm + finalOpeningDimensions(door).leftDeductMm
}
export function effectiveRightShadeMm(door: DoorConfig): number {
  return door.rightShadeMm + finalOpeningDimensions(door).rightDeductMm
}

// Tipo de ferragem: "Dupla" até 290mm de padieira, "Normal" a partir de 300mm.
export function ferragemLabel(door: DoorConfig): string {
  return effectivePaddingMm(door) <= 290 ? 'Dupla' : 'Normal'
}

// Varão = Largura Final + 300mm de folga nas pontas.
export function varaoValue(door: DoorConfig): number {
  return finalOpeningDimensions(door).widthMm + 300
}

// Calha L = Altura Final (depois de descontar a Padieira falsa) + padieira efetiva. Com ferragem
// Dupla (padieira até 290mm), a padieira usada no cálculo fica sempre limitada a 200mm (200 a
// 290mm contam sempre como 200 para a Calha L); com ferragem Normal usa-se o valor exato.
export function calhaLValue(door: DoorConfig): number {
  const padding = effectivePaddingMm(door)
  const paddingForCalc = ferragemLabel(door) === 'Dupla' ? Math.min(padding, 200) : padding
  return finalOpeningDimensions(door).heightMm + paddingForCalc
}

// Formação de painéis: decompõe a altura da porta em painéis de 610mm e 500mm (+ 50mm fixos por
// porta), escolhendo a combinação com o menor corte de excedente possível (nunca abaixo da altura
// pretendida — só é válida uma combinação cujo total, depois de cortado o excedente, dê a altura
// exata).
export type PanelBreakdown = { p610: number; p500: number; cutMm: number }

export function panelBreakdown(heightMm: number): PanelBreakdown {
  const maxP610 = Math.ceil(heightMm / 610) + 2
  const maxP500 = Math.ceil(heightMm / 500) + 2
  let best: PanelBreakdown | null = null
  for (let p610 = 0; p610 <= maxP610; p610++) {
    for (let p500 = 0; p500 <= maxP500; p500++) {
      const raw = p610 * 610 + p500 * 500 + 50
      if (raw < heightMm) continue
      const cutMm = raw - heightMm
      if (!best || cutMm < best.cutMm || (cutMm === best.cutMm && p610 + p500 < best.p610 + best.p500)) {
        best = { p610, p500, cutMm }
      }
    }
  }
  return best ?? { p610: 0, p500: 0, cutMm: 0 }
}

// Nº total de painéis da porta — reaproveita a Formação de Painéis já calculada, para a Caixa de
// Acessórios nunca pedir este valor outra vez ao utilizador. Usa a Altura Final (depois de
// descontar a Padieira falsa), não a Altura do vão — é a essa altura que os painéis são cortados.
export function panelCount(door: DoorConfig): number {
  const { p610, p500 } = panelBreakdown(finalOpeningDimensions(door).heightMm)
  return p610 + p500
}

export type AccessoryLine = { label: string; qty: number; unit?: 'mm' }

// Caixa de Acessórios: quantidade de cada peça a preparar, a partir da largura da porta, do nº de
// painéis (ver panelCount) e do tipo de ferragem (Normal/Dupla, ver ferragemLabel).
export function accessoriesBox(door: DoorConfig): AccessoryLine[] {
  const finalDims = finalOpeningDimensions(door)
  const n = panelCount(door)
  const dupla = ferragemLabel(door) === 'Dupla'
  const pertences = dupla ? (n - 1) * 2 : n * 2
  const dobradicas = Math.ceil(finalDims.widthMm / 1500) * (n - 1)
  const tirantes = Math.floor(finalDims.widthMm / 2000) * 2
  // Padieira (efetiva) abaixo de 200mm leva 6 anilhões em vez dos 2 habituais.
  const anilhoes = effectivePaddingMm(door) < 200 ? 6 : 2
  // Comprimento do par de cabos de aço: Altura Final + padieira efetiva + 1000mm de folga.
  const parCabosAco = finalDims.heightMm + effectivePaddingMm(door) + 1000
  return [
    { label: 'Rodízios', qty: n * 2 + 2 },
    { label: 'Cavaletes', qty: (n - 1) * 2 },
    { label: 'Cavaletes Superiores', qty: 2 },
    { label: 'Pertences', qty: pertences },
    { label: 'Dobradiças', qty: dobradicas },
    { label: 'Par de Cabos de Aço', qty: parCabosAco, unit: 'mm' },
    { label: 'Suporte de Cabo', qty: 1 },
    { label: 'Kits de Fixação', qty: 2 },
    { label: 'União', qty: 1 },
    { label: 'Anilhões', qty: anilhoes },
    { label: 'Fecho', qty: 1 },
    { label: 'Tirantes', qty: tirantes },
    { label: 'Puxador', qty: 1 },
  ]
}

export const FERRAGEM_EXTRA_NAMES = ['Ferragem elevada', 'Ferragem inclinada']

// Nº de curvas do varão, por escalão de altura da porta — tabela fixa indicada pelo cliente.
// Com "Ferragem elevada" selecionada a curva é sempre 0, independente da altura.
const CURVA_HEIGHT_STEPS: [number, number][] = [
  [2200, 1],
  [2400, 2],
  [2600, 3],
  [2800, 4],
  [3000, 5],
  [3500, 6],
  [4500, 7],
  [5500, 8],
]
export function curvaValue(door: DoorConfig): number {
  const hasElevada = (door.extras || []).some((e) => e.name === 'Ferragem elevada')
  if (hasElevada) return 0
  const step = CURVA_HEIGHT_STEPS.find(([maxHeight]) => finalOpeningDimensions(door).heightMm <= maxHeight)
  // Acima de 5500mm (fora da tabela) usa o escalão mais alto em vez de deixar por definir.
  return step ? step[1] : CURVA_HEIGHT_STEPS[CURVA_HEIGHT_STEPS.length - 1][1]
}

// Porta pedonal de serviço para a produção: qual o tipo, de que lado e com que opções — em vez de
// só "Sim". Tipos de catálogo sem nome fixo aqui (ex. "Porta Anexa") aparecem pelo próprio código.
const SERVICE_DOOR_TYPE_LABELS: Record<string, string> = {
  normal: 'Normal (recortada no painel)',
  'normal-soleira': 'Normal com soleira rebaixada',
  idealdoor: 'IDEALDOOR',
}
const SERVICE_DOOR_POSITION_LABELS: Record<string, string> = { left: 'esquerda', center: 'centro', right: 'direita' }
export function serviceDoorText(door: DoorConfig): string {
  const type = SERVICE_DOOR_TYPE_LABELS[door.serviceDoorType] || door.serviceDoorType || 'Sim'
  const parts = [type]
  if (door.serviceDoorPosition) parts.push(`posição: ${SERVICE_DOOR_POSITION_LABELS[door.serviceDoorPosition] || door.serviceDoorPosition}`)
  if (door.serviceDoorPanicBar) parts.push('barra antipânico')
  if (door.serviceDoorAirSpring) parts.push('mola aérea')
  return parts.join(' · ')
}

// Extras relacionados com o tipo de ferragem — mostrados no cartão/secção Ferragens, não na lista
// genérica de Extras e Adicionais.
export function ferragemExtras(door: DoorConfig): string[] {
  return (door.extras || [])
    .filter((e) => FERRAGEM_EXTRA_NAMES.includes(e.name))
    .map((e) => (e.quantity > 1 ? `${e.name} ×${e.quantity}` : e.name))
}

// Largura (mm) do perfil de um tubo, lida do próprio código do catálogo (ex: "Tubo 50×30 de
// ferro lacado" → 50) — é o que um tubo ocupa do vão, seja Ombreira ou Padieira falsa; os campos
// que o configurador mostra para tubos são o comprimento a encomendar, nunca o desconto.
function tubeProfileWidthMm(code: string): number {
  const match = code.match(/(\d+(?:[.,]\d+)?)\s*[×xX]/)
  return match ? parseFloat(match[1].replace(',', '.')) : 0
}

// Medida (mm) que uma ombreira/padieira falsa ocupa do vão: tipo Tubo lê a largura do próprio
// nome do item (ver tubeProfileWidthMm); qualquer outro tipo (ex: "Fixo em Painel") usa o campo
// preenchido no configurador — Largura da ombreira, Altura da padieira.
function falseTrimDeductMm(type: string | undefined, fieldMm: string | undefined): number {
  if (!type || type === 'Nenhum') return 0
  if (type.toLowerCase().includes('tubo')) return tubeProfileWidthMm(type)
  const n = parseFloat(fieldMm || '')
  return Number.isFinite(n) && n > 0 ? n : 0
}

export type FinalOpeningDimensions = {
  widthMm: number
  heightMm: number
  leftDeductMm: number
  rightDeductMm: number
  topDeductMm: number
}

// Medidas finais do vão (mm), depois de descontar as Ombreiras falsas (laterais) e a Padieira
// falsa (topo) escolhidas em "Estrutura de Remate" — partilhado entre o Configurador, o PDF e a
// Ficha de Produção, para nunca mostrarem valores diferentes. Os campos de "Medidas de Vão"
// (Ombreira Esquerda/Direita, Padieira disponível) não entram neste desconto — só o que é
// escolhido em "Estrutura de Remate" reduz o vão. Numa padieira falsa de tubo, headerLength é a
// Largura do tubo (comprimento a encomendar, ex: 2545 mm) — o desconto é o perfil (75×40 → 75).
export function finalOpeningDimensions(door: DoorConfig): FinalOpeningDimensions {
  const leftDeductMm = falseTrimDeductMm(door.tubeLeft, door.tubeWidthLeft)
  const rightDeductMm = falseTrimDeductMm(door.tubeRight, door.tubeWidthRight)
  const topDeductMm = falseTrimDeductMm(door.header, door.headerLength)
  return {
    widthMm: Math.max(0, Math.round(door.widthMm - leftDeductMm - rightDeductMm)),
    heightMm: Math.max(0, Math.round(door.heightMm - topDeductMm)),
    leftDeductMm,
    rightDeductMm,
    topDeductMm,
  }
}

// Texto de uma Ombreira/Padieira falsa com as medidas a produzir — partilhado pela Folha de
// Produção, pela página /producao, pela Ficha Técnica e pelo detalhe da encomenda. Num tubo a
// largura do perfil já vem no nome (ex: "Tubo 75×40"), por isso só se mostra o comprimento:
// a Altura numa ombreira, a Largura numa padieira (ver finalOpeningDimensions).
function trimMeasures(widthMm?: string, heightMm?: string): string {
  const w = widthMm?.trim()
  const h = heightMm?.trim()
  if (w && h) return `Largura ${w} × Altura ${h} mm`
  if (w) return `Largura ${w} mm`
  if (h) return `Altura ${h} mm`
  return ''
}

export function falseJambText(type: string | undefined, widthMm?: string, heightMm?: string): string {
  if (!type || type === 'Nenhum') return ''
  const m = trimMeasures(type.toLowerCase().includes('tubo') ? undefined : widthMm, heightMm)
  return m ? `${type} (${m})` : type
}

export function falseHeaderText(door: Pick<DoorConfig, 'header' | 'headerUnits' | 'headerLength' | 'headerWidth'>): string {
  if (!door.header || door.header === 'Nenhum') return ''
  const m = door.header.toLowerCase().includes('tubo')
    ? trimMeasures(door.headerLength, undefined)
    : trimMeasures(door.headerWidth, door.headerLength)
  const parts = [(door.headerUnits || 1) > 1 ? `${door.headerUnits} un` : '', m].filter(Boolean)
  return parts.length ? `${door.header} (${parts.join(' · ')})` : door.header
}

// Mesmas condições usadas para decidir o que aparece dentro do cartão/secção Extras e Adicionais
// — para não aparecer vazio quando nenhum destes campos tem valor.
export function hasExtrasEAdicionais(door: DoorConfig): boolean {
  return Boolean(
    (door.tubeLeft && door.tubeLeft !== 'Nenhum') ||
      (door.tubeRight && door.tubeRight !== 'Nenhum') ||
      door.header !== 'Nenhum' ||
      door.automation !== 'Nenhum' ||
      door.rail !== 'Nenhum' ||
      door.remotesQuantity > 2 ||
      door.serviceDoor ||
      door.windows ||
      door.rubberSeal ||
      (door.automationExtras && door.automationExtras.length > 0) ||
      (door.extras && door.extras.filter((e) => !FERRAGEM_EXTRA_NAMES.includes(e.name)).length > 0) ||
      (door.montagens && door.montagens.length > 0)
  )
}
