export type OrderStatus = 'Pendente' | 'Em análise' | 'Produção' | 'Concluído' | 'Cancelado'
export type OrderKind = 'encomenda' | 'orcamento'

export interface Order {
  id: string
  referenceNumber: string
  kind: OrderKind
  client: string
  clientEmail?: string
  clientPhone?: string
  clientAddress?: string
  clientTaxId?: string
  // Medidas em metros e mm
  width: number
  height: number
  padding: number
  leftShade: number
  rightShade: number
  widthMm: number
  heightMm: number
  paddingMm: number
  leftShadeMm: number
  rightShadeMm: number
  area: number // m²
  // Painel & Acabamento (3 tipos: 'smooth' | 'ribbed' | 'cassette')
  model: 'smooth' | 'ribbed' | 'cassette' | string
  colorCode: string
  colorName: string
  colorHex: string
  // Falsas (Ombreira e Padieira em UNIDADES)
  tube: string
  tubeUnits: number // Quantidade de unidades (ex: 2 un)
  tubeLength: string // Comprimento/medida (ex: '2.5')
  // Ombreiras falsas — esquerda e direita independentes (medidas em mm)
  tubeLeft?: string
  tubeLengthLeft?: string
  tubeWidthLeft?: string
  tubeRight?: string
  tubeLengthRight?: string
  tubeWidthRight?: string
  header: string
  headerUnits: number // Quantidade de unidades (ex: 1 un)
  headerLength: string // Comprimento/medida (ex: '3.0')
  headerWidth?: string // Largura, só relevante em "fixo em painel" (mm)
  // Automatismo e Ferragens
  automation: string
  automationExtras: { name: string; quantity: number }[] // Extras do motor (ex: baterias, fotocélulas), editáveis no Catálogo
  rail: string
  remotesQuantity: number // Comandos
  // Opcionais
  serviceDoor: boolean
  serviceDoorPosition: 'left' | 'center' | 'right'
  serviceDoorType: 'none' | 'normal' | 'normal-soleira' | 'idealdoor' | string
  serviceDoorPanicBar: boolean
  serviceDoorAirSpring: boolean
  windows: boolean
  windowsQuantity: number // Quantidade de visores
  windowsPanel: number // Preservado por compatibilidade com encomendas antigas — usar windowsPanels
  windowsPanels: number[] // Painéis (a partir do topo) onde ficam os visores — pode ser mais do que um
  visorMaterial?: 'vidro' | 'acrilico'
  rubberSeal: boolean
  // Extras adicionais selecionados, com quantidade (e painéis, para as grelhas de ventilação).
  // unit 'm' = a quantidade são metros escritos diretamente (ex: tubos); sem unit, é nº de
  // unidades — ou nº de painéis, no caso do Omega (ver PER_PANEL_METER_EXTRAS em lib/pricing.ts).
  extras: { name: string; quantity: number; unit?: 'm'; panel?: number; panels?: number[] }[]
  montagens: string[] // Serviços de montagem/instalação selecionados
  // Campos exclusivos da fábrica (perfil "fabrica", ver /producao) — undefined = a fábrica ainda
  // não definiu um valor explícito; a UI sugere widthMm + 30 como largura de corte sem persistir
  // nada até ser confirmado. Em obras com várias portas, cada porta tem o seu próprio valor (ver
  // DoorConfig) — estes campos "soltos" refletem sempre a porta 1, tal como os restantes.
  productionSpring?: string
  productionSpringTurns?: number
  productionTambor?: string
  productionCutWidthMm?: number
  // true = a fábrica já marcou esta porta como fabricada (diferente do estado "Produção" da
  // encomenda em si, que é só "entrou na fila de fabrico").
  productionFabricada: boolean
  // Obras com mais do que uma porta: cada porta é configurada individualmente (medidas, cor,
  // acessórios, motor...), todas sob a mesma encomenda/orçamento (mesmo cliente, referência e PDF).
  // Os campos "soltos" acima (width, model, serviceDoorType, etc.) continuam a refletir a 1ª porta,
  // para compatibilidade com o resto do código que ainda só conhece "uma porta por encomenda".
  doors?: DoorConfig[]
  // Metadados comerciais
  estimatedPrice: number
  // Linhas do Resumo de Preços cujo valor foi substituído manualmente pelo utilizador (em vez do
  // preço de catálogo calculado) — undefined/[] = nenhum preço foi editado. "label" tem de
  // corresponder exatamente ao PricingItem.label gerado por calculateMultiDoorQuote (ver
  // lib/pricing.ts#applyPriceOverrides), para a substituição apanhar a linha certa.
  priceOverrides?: { label: string; lineTotal: number }[]
  // Subtotal (sem IVA) substituído manualmente — tem precedência sobre a soma das linhas (mesmo
  // sobre priceOverrides individuais), para quando o preço final acordado não é a soma de nenhuma
  // combinação de linhas. undefined = o subtotal continua a ser calculado normalmente.
  priceTotalOverride?: number
  // Taxa de IVA substituída manualmente (fração, ex: 0.06 = 6%) — undefined = usa a taxa legal
  // por omissão (IVA_RATE, 23%, ver lib/pricing.ts).
  priceIvaRateOverride?: number
  status: OrderStatus
  notes?: string
  createdBy: string
  createdByUserId?: string
  // Foto da conta que criou a encomenda/orçamento e do comercial a ela associado — usadas no PDF.
  clientAvatarUrl?: string
  commercialName?: string
  commercialAvatarUrl?: string
  createdAt: string
  updatedAt: string
}

// Configuração completa de uma porta dentro de uma obra com várias portas — mesmos campos
// específicos de porta que existem "soltos" em Order, isolados aqui para poder haver mais do que
// um por encomenda. Ver Order.doors.
export type DoorConfig = Pick<
  Order,
  | 'width'
  | 'height'
  | 'padding'
  | 'leftShade'
  | 'rightShade'
  | 'widthMm'
  | 'heightMm'
  | 'paddingMm'
  | 'leftShadeMm'
  | 'rightShadeMm'
  | 'area'
  | 'model'
  | 'colorCode'
  | 'colorName'
  | 'colorHex'
  | 'tube'
  | 'tubeUnits'
  | 'tubeLength'
  | 'tubeLeft'
  | 'tubeLengthLeft'
  | 'tubeWidthLeft'
  | 'tubeRight'
  | 'tubeLengthRight'
  | 'tubeWidthRight'
  | 'header'
  | 'headerUnits'
  | 'headerLength'
  | 'headerWidth'
  | 'automation'
  | 'automationExtras'
  | 'rail'
  | 'remotesQuantity'
  | 'serviceDoor'
  | 'serviceDoorPosition'
  | 'serviceDoorType'
  | 'serviceDoorPanicBar'
  | 'serviceDoorAirSpring'
  | 'windows'
  | 'windowsQuantity'
  | 'windowsPanel'
  | 'windowsPanels'
  | 'visorMaterial'
  | 'rubberSeal'
  | 'extras'
  | 'montagens'
  | 'productionSpring'
  | 'productionSpringTurns'
  | 'productionTambor'
  | 'productionCutWidthMm'
  | 'productionFabricada'
>

// Um cliente na carteira de um comercial (ou admin) — usado para pré-preencher o Cliente/Obra
// ao registar uma encomenda/orçamento, em vez de escrever os dados à mão todas as vezes.
export interface Client {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  taxId?: string
  notes?: string
  ownerId: string
  ownerName?: string // só preenchido quando um admin lista as carteiras de todos os comerciais
  createdAt: string
  updatedAt: string
}

export type UserRole = 'admin' | 'operador' | 'comercial' | 'fabrica'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  company: string
  ordersAccess: boolean
  avatarUrl?: string
  commercialId?: string // só relevante para role "operador" (Cliente) — comercial responsável
  mustChangePassword: boolean
  createdAt: string
  updatedAt: string
}

// Categorias do catálogo editável de opções do configurador (painel "Catálogo", só admin).
export type CatalogCategory =
  | 'ribbed_color'
  | 'smooth_color'
  | 'tube'
  | 'header_panel'
  | 'service_door'
  | 'extra'
  | 'visor'
  | 'montagem'
  | 'automation'
  | 'automation_extra'
  | 'rail'
  | 'misc'

export interface CatalogItem {
  id: string
  category: CatalogCategory
  code: string // valor guardado nas encomendas (código RAL, nome do tubo/motor/extra, etc.)
  name: string
  hex?: string // só para categorias de cor
  unit: 'un' | 'm' | 'm2'
  price?: number // undefined = sob consulta
  priceAlt?: number // só 'header_panel': preço para padieira com altura superior a 25cm
  note?: string
  sortOrder: number
  active: boolean
  createdAt: string
  updatedAt: string
}

// Stock de "Outros Artigos" — catálogo simples (sem contagem de unidades) de produtos avulso
// fora do configurador de portões. Só o admin gere; os comerciais apenas consultam.
export interface StockCategory {
  id: string
  name: string
  photoUrl?: string
  parentId?: string // subcategoria quando preenchido (uma só camada); undefined = categoria principal
  sortOrder: number
  createdAt: string
}

// 'ml' = metro linear com largura × altura (ex: bandeiras/padieiras) — ver lib/stockUnits.ts.
export type StockProductUnit = 'un' | 'm' | 'm2' | 'ml'

export interface StockProduct {
  id: string
  categoryId: string
  categoryName?: string
  name: string
  description?: string
  price?: number // undefined = sob consulta
  // 'un' = vendido à unidade (quantidade inteira), 'm' = vendido ao metro, 'm2' = vendido ao
  // metro quadrado — 'm'/'m2' levam sempre quantidade (nº de peças) e medida (comprimento/área
  // de cada peça) ao mesmo tempo; price acima é interpretado como €/m ou €/m² consoante o caso.
  unit: StockProductUnit
  photoUrl?: string
  fileUrl?: string // ficha técnica (PDF) para download
  fileName?: string
  sortOrder: number
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface StockOrderItem {
  id: string
  productId?: string
  productName: string
  // Cópia do unit do produto no momento da compra — undefined em encomendas antigas, tratado
  // como 'un'.
  unit?: StockProductUnit
  unitPrice?: number
  // Nº de peças (ex: 2 tubos). Para artigos 'un' é a quantidade normal; para 'm'/'m2' é o nº de
  // peças, não o total de metros/m² — ver meters/squareMeters.
  quantity: number
  // Só para artigos 'm': comprimento de cada peça (ex: 2 tubos de 2m => quantity=2, meters=2,
  // total 4m). undefined em artigos 'un'/'m2' e em encomendas antigas (quantity já era o total de metros).
  meters?: number
  // Só para artigos 'm2': área de cada peça (ex: 3 placas de 1.5m² => quantity=3,
  // squareMeters=1.5, total 4.5m²). undefined em artigos 'un'/'m'.
  squareMeters?: number
  // Só para artigos 'm2' (a partir desta versão): largura × altura de cada peça em mm, de onde
  // sai squareMeters. undefined em encomendas antigas, que só guardavam a área.
  widthMm?: number
  heightMm?: number
  lineTotal?: number
}

// Um pedido de "Outros Artigos" — comprado pelo Cliente (role operador) ou por um comercial em
// seu nome. Aparece junto das encomendas de portas em "Gestão de Encomendas", distinguido pelo tipo.
export interface StockOrder {
  id: string
  referenceNumber: string
  client: string
  clientEmail?: string
  clientPhone?: string
  clientAddress?: string
  clientTaxId?: string
  notes?: string
  items: StockOrderItem[]
  totalPrice: number
  status: OrderStatus
  createdBy: string
  createdByUserId?: string
  clientAvatarUrl?: string
  commercialName?: string
  commercialAvatarUrl?: string
  createdAt: string
  updatedAt: string
}
