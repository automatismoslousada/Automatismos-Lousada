// Regras de negócio da Ficha de Produção — partilhadas entre a página /producao (app/producao/page.tsx)
// e a geração do PDF (lib/pdf-generator.ts), para os dois nunca poderem mostrar valores diferentes
// para o mesmo campo calculado.
import { DoorConfig } from './types'

export const modelLabels: Record<string, string> = {
  smooth: 'Painel Total Liso',
  ribbed: 'Painel Canelado',
  cassette: 'Painel Almofadado (Cassette)',
}

// Tipo de ferragem: "Dupla" até 290mm de padieira, "Normal" a partir de 300mm.
export function ferragemLabel(door: DoorConfig): string {
  return door.paddingMm <= 290 ? 'Dupla' : 'Normal'
}

// Calha L = altura da porta + padieira. Com ferragem Dupla (padieira até 290mm), a padieira usada
// no cálculo fica sempre limitada a 200mm (200 a 290mm contam sempre como 200 para a Calha L);
// com ferragem Normal usa-se o valor exato da padieira.
export function calhaLValue(door: DoorConfig): number {
  const paddingForCalc = ferragemLabel(door) === 'Dupla' ? Math.min(door.paddingMm, 200) : door.paddingMm
  return door.heightMm + paddingForCalc
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
// Acessórios nunca pedir este valor outra vez ao utilizador.
export function panelCount(door: DoorConfig): number {
  const { p610, p500 } = panelBreakdown(door.heightMm)
  return p610 + p500
}

export type AccessoryLine = { label: string; qty: number; unit?: 'mm' }

// Caixa de Acessórios: quantidade de cada peça a preparar, a partir da largura da porta, do nº de
// painéis (ver panelCount) e do tipo de ferragem (Normal/Dupla, ver ferragemLabel).
export function accessoriesBox(door: DoorConfig): AccessoryLine[] {
  const n = panelCount(door)
  const dupla = ferragemLabel(door) === 'Dupla'
  const pertences = dupla ? (n - 1) * 2 : n * 2
  const dobradicas = Math.ceil(door.widthMm / 1000) * (n - 1)
  const tirantes = Math.floor(door.widthMm / 2000) * 2
  // Padieira abaixo de 200mm leva 6 anilhões em vez dos 2 habituais.
  const anilhoes = door.paddingMm < 200 ? 6 : 2
  // Comprimento do par de cabos de aço: altura da porta + padieira + 1000mm de folga.
  const parCabosAco = door.heightMm + door.paddingMm + 1000
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
  const step = CURVA_HEIGHT_STEPS.find(([maxHeight]) => door.heightMm <= maxHeight)
  // Acima de 5500mm (fora da tabela) usa o escalão mais alto em vez de deixar por definir.
  return step ? step[1] : CURVA_HEIGHT_STEPS[CURVA_HEIGHT_STEPS.length - 1][1]
}

// Extras relacionados com o tipo de ferragem — mostrados no cartão/secção Ferragens, não na lista
// genérica de Extras e Adicionais.
export function ferragemExtras(door: DoorConfig): string[] {
  return (door.extras || [])
    .filter((e) => FERRAGEM_EXTRA_NAMES.includes(e.name))
    .map((e) => (e.quantity > 1 ? `${e.name} ×${e.quantity}` : e.name))
}

// Largura (mm) do perfil de um tubo, lida do próprio código do catálogo (ex: "Tubo 50×30 de
// ferro lacado" → 50) — só é preciso para Ombreira falsa do tipo Tubo, que não tem campo de
// Largura editável no configurador (ao contrário do tipo "Fixo em Painel", ver app/page.tsx).
function tubeProfileWidthMm(code: string): number {
  const match = code.match(/(\d+(?:[.,]\d+)?)\s*[×xX]/)
  return match ? parseFloat(match[1].replace(',', '.')) : 0
}

// Largura (mm) que uma ombreira falsa ocupa do vão, do lado esquerdo/direito: tipo Tubo lê a
// largura do próprio nome do item (ver tubeProfileWidthMm); qualquer outro tipo (ex: "Fixo em
// Painel") usa o campo Largura preenchido no configurador.
function falseJambWidthMm(type: string | undefined, widthMm: string | undefined): number {
  if (!type || type === 'Nenhum') return 0
  if (type.toLowerCase().includes('tubo')) return tubeProfileWidthMm(type)
  const n = parseFloat(widthMm || '')
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
// Ficha de Produção, para nunca mostrarem valores diferentes. A Altura da padieira falsa
// (headerLength) é sempre preenchida pelo utilizador, mesmo para tubos (só a Largura fica
// escondida nesse caso — ver app/page.tsx), por isso não precisa do mesmo tratamento da ombreira.
export function finalOpeningDimensions(door: DoorConfig): FinalOpeningDimensions {
  const leftDeductMm = falseJambWidthMm(door.tubeLeft, door.tubeWidthLeft)
  const rightDeductMm = falseJambWidthMm(door.tubeRight, door.tubeWidthRight)
  const topDeductMm =
    door.header && door.header !== 'Nenhum' ? Math.max(0, parseFloat(door.headerLength || '') || 0) : 0
  return {
    widthMm: Math.max(0, Math.round(door.widthMm - leftDeductMm - rightDeductMm)),
    heightMm: Math.max(0, Math.round(door.heightMm - topDeductMm)),
    leftDeductMm,
    rightDeductMm,
    topDeductMm,
  }
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
