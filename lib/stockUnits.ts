// Unidades de venda dos "Outros Artigos" — texto partilhado pelo carrinho, pelo detalhe do pedido
// e pelo PDF, para os três nunca mostrarem a mesma linha de maneira diferente.
import { StockProductUnit } from './types'

// 'ml' = metro linear com largura × altura (ex: bandeiras/padieiras): o preço é por metro da
// largura; a altura só segue para a produção.
export const STOCK_UNIT_OPTIONS: { value: StockProductUnit; label: string }[] = [
  { value: 'un', label: 'Vendido à unidade' },
  { value: 'm', label: 'Vendido ao metro' },
  { value: 'ml', label: 'Vendido ao metro linear (largura × altura)' },
  { value: 'm2', label: 'Vendido ao m²' },
]

export function stockUnitSuffix(unit?: StockProductUnit): string {
  return unit === 'm' || unit === 'ml' ? '/m' : unit === 'm2' ? '/m²' : ''
}

// Unidades em que se escreve largura × altura (mm) de cada peça no carrinho.
export function stockUnitTakesDims(unit?: StockProductUnit): boolean {
  return unit === 'm2' || unit === 'ml'
}

const n = (v: number) => v.toLocaleString('pt-PT', { maximumFractionDigits: 3 })

export function formatStockQty(item: {
  unit?: StockProductUnit
  quantity: number
  meters?: number
  squareMeters?: number
  widthMm?: number
  heightMm?: number
}): string {
  const q = item.quantity
  const dims = item.widthMm && item.heightMm ? `${item.widthMm}×${item.heightMm} mm` : ''
  switch (item.unit) {
    case 'm':
      return item.meters != null ? `${q} × ${n(item.meters)} m` : `${q} m`
    // Com largura × altura mostra-se só a medida — os metros/m² cobrados já se veem no preço.
    case 'ml':
      if (dims) return `${q} × ${dims}`
      return item.meters != null ? `${q} × ${n(item.meters)} m` : `${q} m`
    case 'm2':
      if (dims) return `${q} × ${dims}`
      return item.squareMeters != null ? `${q} × ${n(item.squareMeters)} m²` : `${q} m²`
    default:
      return `${q} un`
  }
}
