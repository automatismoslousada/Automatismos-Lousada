import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { CatalogItem, DoorConfig, Order, StockOrder } from './types'
import { applyPriceOverrides, calculateMultiDoorQuote, formatExtra, IVA_RATE, PRICE_EDITED_NOTE, PricingInput } from './pricing'
import {
  FERRAGEM_EXTRA_NAMES,
  accessoriesBox,
  calhaLValue,
  curvaValue,
  effectiveLeftShadeMm,
  effectivePaddingMm,
  effectiveRightShadeMm,
  ferragemExtras,
  ferragemLabel,
  finalOpeningDimensions,
  hasExtrasEAdicionais,
  modelLabels,
  panelBreakdown,
  serviceDoorText,
  varaoValue,
} from './production'

const LOGO_URL = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-mmBQUrCpo1V3dLippuG4OaIQvVOWxt.jpg'
// Mesmo emblema aplicado ao painel do portão no configurador 3D — mantido aqui para o desenho ficar fiel ao 3D.
const DOOR_BADGE_URL = 'https://i.imgur.com/YZGkZR2.png'
const DOOR_BADGE_ASPECT = 3146 / 1312

// Obras com mais do que uma porta (order.doors): cada desenho/tabela técnica é gerado a partir de
// um "pseudo-pedido" que junta os dados partilhados da obra (cliente, referência...) aos campos
// específicos dessa porta — assim as funções de desenho só precisam de conhecer "Order".
function doorsToRender(order: Order): Order[] {
  if (!order.doors || order.doors.length <= 1) return [order]
  return order.doors.map((d) => ({ ...order, ...d }))
}

// Descrição da porta pedonal de serviço para a Ficha Técnica — tem de refletir o tipo
// escolhido no configurador (normal / normal com soleira / IDEALDOOR), não um texto genérico.
function serviceDoorTypeDescription(type: string | undefined): string {
  switch (type) {
    case 'normal':
      return 'Porta de serviço normal — recortada no painel'
    case 'normal-soleira':
      return 'Porta de serviço normal com soleira rebaixada — recortada no painel'
    case 'idealdoor':
      return 'Porta de serviço IDEALDOOR — recortada no painel'
    default:
      // Outros tipos de catálogo (ex. "Porta Anexa") não têm modelação 3D nem descrição fixa —
      // o código do catálogo já é o nome a mostrar.
      return type || 'Recortada no painel'
  }
}

function doorToPricingInput(d: DoorConfig | Order): PricingInput {
  return {
    width: d.width,
    height: d.height,
    model: d.model,
    colorCode: d.colorCode,
    tubeLeft: d.tubeLeft,
    tubeLengthLeft: d.tubeLengthLeft,
    tubeRight: d.tubeRight,
    tubeLengthRight: d.tubeLengthRight,
    header: d.header,
    headerLength: d.headerLength,
    headerWidth: d.headerWidth,
    paddingMm: d.paddingMm,
    serviceDoorType: d.serviceDoorType,
    serviceDoorPanicBar: d.serviceDoorPanicBar,
    serviceDoorAirSpring: d.serviceDoorAirSpring,
    extras: d.extras,
    montagens: d.montagens,
    windows: d.windows,
    windowsQuantity: d.windowsQuantity,
    visorMaterial: d.visorMaterial,
    rubberSeal: d.rubberSeal,
    automation: d.automation,
    automationExtras: d.automationExtras,
    rail: d.rail,
    remotesQuantity: d.remotesQuantity,
  }
}

function hexToRgb(hex: string): [number, number, number] {
  let c = hex.replace('#', '')
  if (c.length === 3) {
    c = c.split('').map((x) => x + x).join('')
  }
  const num = parseInt(c, 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

// As imagens de marca (logótipo/emblema) vêm de ficheiros fonte com muito mais resolução do que o
// necessário para o tamanho a que aparecem no PDF (algumas milhares de pixels de largura, para
// caber em poucos mm). O jsPDF descomprime-as para bitmap ao incorporar, por isso sem reduzir a
// resolução aqui o PDF final incha para vários MB — o que já chegou a ultrapassar o limite de
// tamanho de pedido do servidor (413) ao enviar por email. maxDimension cobre com folga até à
// maior utilização destas imagens no documento (~28mm de largura, mesmo a 300dpi de impressão).
async function fetchImageAsDataUrl(url: string, maxDimension = 500): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    const rawDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Falha ao ler imagem'))
      reader.readAsDataURL(blob)
    })

    return await new Promise<string>((resolve) => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height))
        if (scale >= 1) {
          resolve(rawDataUrl)
          return
        }
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(img.width * scale))
        canvas.height = Math.max(1, Math.round(img.height * scale))
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(rawDataUrl)
          return
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = () => resolve(rawDataUrl)
      img.src = rawDataUrl
    })
  } catch {
    return null
  }
}

// Vai buscar o catálogo de preços (/api/catalog) para calcular a tabela de preços do Orçamento
// — corre no browser, por isso não pode importar lib/catalog.ts (acesso direto à base de dados).
async function fetchCatalog(): Promise<CatalogItem[]> {
  try {
    const res = await fetch('/api/catalog')
    if (!res.ok) return []
    const data = await res.json()
    return data.success ? data.items : []
  } catch {
    return []
  }
}

// Logótipo Automatismos Lousada + emblema IDEALDOOR lado a lado, como no cabeçalho da aplicação.
// scale > 1 amplia o logótipo e o emblema (usado na Ficha de Produção, para preencher melhor a
// página) sem alterar o tamanho normal partilhado pelos outros PDFs. Devolve a altura ocupada
// pelo cabeçalho, para quem chama posicionar o que vem a seguir sem sobrepor.
function drawHeaderBranding(
  doc: jsPDF,
  logoDataUrl: string | null,
  doorBadgeDataUrl: string | null,
  scale = 1
): number {
  const logoX = 14
  const logoY = 5
  const logoW = 28 * scale
  const logoH = logoW / (1536 / 1049)

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'JPEG', logoX, logoY, logoW, logoH)
    } catch {
      // Se a imagem falhar a incorporar, o cabeçalho fica só com REF/Data
    }
  }

  if (doorBadgeDataUrl) {
    try {
      const dividerX = logoX + logoW + 5
      doc.setDrawColor(210, 216, 212)
      doc.setLineWidth(0.3)
      doc.line(dividerX, logoY + 1, dividerX, logoY + logoH - 1)

      const badgeH = 9 * scale
      const badgeW = badgeH * DOOR_BADGE_ASPECT
      const badgeX = dividerX + 5
      const badgeY = logoY + logoH / 2 - badgeH / 2
      doc.addImage(doorBadgeDataUrl, 'PNG', badgeX, badgeY, badgeW, badgeH)
    } catch {
      // Se o emblema falhar a incorporar, o cabeçalho fica só com o logótipo principal
    }
  }

  return logoY + logoH
}

// Corta o texto com "…" se não couber em maxWidth — usado para as linhas do bloco Cliente/Obra
// não passarem por baixo da foto do cliente.
function fitTextWidth(doc: jsPDF, text: string, maxWidth: number): string {
  if (maxWidth <= 0 || doc.getTextWidth(text) <= maxWidth) return text
  let truncated = text
  while (truncated.length > 1 && doc.getTextWidth(`${truncated}…`) > maxWidth) {
    truncated = truncated.slice(0, -1)
  }
  return `${truncated}…`
}

// Recorta a imagem (data URI já em formato JPEG, gerada pelo upload de foto de perfil) num
// quadrado com cantos arredondados, com uma borda fina — usada para as fotos do cliente e do
// comercial no PDF. cx/cy são o centro e r é metade do lado do quadrado.
function drawSquareImage(doc: jsPDF, dataUrl: string, cx: number, cy: number, r: number): void {
  try {
    doc.saveGraphicsState()
    doc.roundedRect(cx - r, cy - r, r * 2, r * 2, 0.8, 0.8, null)
    doc.clip()
    doc.discardPath()
    doc.addImage(dataUrl, 'JPEG', cx - r, cy - r, r * 2, r * 2)
    doc.restoreGraphicsState()
    doc.setDrawColor(220, 229, 223)
    doc.setLineWidth(0.25)
    doc.roundedRect(cx - r, cy - r, r * 2, r * 2, 0.8, 0.8, 'S')
  } catch {
    // Se a foto falhar a incorporar, fica só sem o quadrado — não interrompe o resto do PDF
  }
}

// Campos mínimos de que drawClientInfoBox precisa — tanto Order (portas) como StockOrder
// (Outros Artigos) satisfazem esta forma, para o mesmo bloco servir os dois tipos de documento.
interface ClientInfoSource {
  client: string
  clientAddress?: string
  clientPhone?: string
  clientTaxId?: string
  clientAvatarUrl?: string
  commercialName?: string
  commercialAvatarUrl?: string
}

// Bloco "Cliente / Obra" — partilhado entre a Ficha Técnica de Fabrico, o Orçamento comercial e o
// Pedido de Artigos. A 3ª linha varia consoante o documento, por isso é passada pelo chamador.
// Mostra a foto da conta do cliente (se o pedido tiver sido feito a partir de uma conta ligada) e
// o comercial responsável por essa conta, com a respetiva foto.
function drawClientInfoBox(
  doc: jsPDF,
  order: ClientInfoSource,
  startY: number,
  thirdRow: { label: string; value: string }
): number {
  const pageWidth = doc.internal.pageSize.getWidth()
  const hasCommercial = !!order.commercialName
  const boxH = hasCommercial ? 27 : 21

  doc.setFillColor(248, 250, 248)
  doc.roundedRect(14, startY, pageWidth - 28, boxH, 2, 2, 'F')
  doc.setDrawColor(220, 229, 223)
  doc.roundedRect(14, startY, pageWidth - 28, boxH, 2, 2, 'S')

  // A foto do cliente fica num quadrado no canto superior direito — quando presente, o texto
  // das duas primeiras linhas é limitado para não passar por baixo dela.
  const photoR = 8
  const photoCx = pageWidth - 14 - 10
  const photoCy = startY + 11
  const textMaxX = order.clientAvatarUrl ? photoCx - photoR - 2 : pageWidth - 14 - 4
  const textMaxWidth = textMaxX - 68

  doc.setTextColor(21, 33, 38)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.text('CLIENTE / OBRA:', 18, startY + 5.5)
  doc.setFont('helvetica', 'normal')
  doc.text(fitTextWidth(doc, order.client || 'Não especificado', textMaxWidth), 68, startY + 5.5)

  doc.setFont('helvetica', 'bold')
  doc.text('LOCALIDADE / CONTACTO:', 18, startY + 11)
  doc.setFont('helvetica', 'normal')
  doc.text(
    fitTextWidth(
      doc,
      `${order.clientAddress || 'Portugal'} ${order.clientPhone ? `· Tel: ${order.clientPhone}` : ''}${
        order.clientTaxId ? ` · NIF: ${order.clientTaxId}` : ''
      }`,
      textMaxWidth
    ),
    68,
    startY + 11
  )

  doc.setFont('helvetica', 'bold')
  doc.text(`${thirdRow.label}:`, 18, startY + 16.5)
  doc.setFont('helvetica', 'normal')
  doc.text(thirdRow.value, 68, startY + 16.5)

  if (hasCommercial) {
    doc.setFont('helvetica', 'bold')
    doc.text('COMERCIAL RESPONSÁVEL:', 18, startY + 22)
    doc.setFont('helvetica', 'normal')
    const nameX = order.commercialAvatarUrl ? 68 + 8 : 68
    doc.text(order.commercialName || '', nameX, startY + 22)
    if (order.commercialAvatarUrl) {
      drawSquareImage(doc, order.commercialAvatarUrl, 68 + 3, startY + 20.8, 3)
    }
  }

  if (order.clientAvatarUrl) {
    drawSquareImage(doc, order.clientAvatarUrl, photoCx, photoCy, photoR)
  }

  return startY + boxH + 5
}

// Desenho técnico vetorial da porta (alçado frontal com cotas) — partilhado entre a Ficha
// Técnica de Fabrico e o Orçamento comercial, para os dois documentos ficarem fiéis ao 3D.
// Devolve o Y seguinte, logo depois da caixa do desenho.
function drawDoorDiagram(doc: jsPDF, order: Order, startY: number, doorBadgeDataUrl: string | null): number {
  const finalDims = finalOpeningDimensions(order)
  const pageWidth = doc.internal.pageSize.getWidth()
  const drawBoxX = 14
  const drawBoxY = startY
  const drawBoxW = pageWidth - 28
  const drawBoxH = 62

  // Fundo da área de desenho
  doc.setFillColor(245, 248, 246)
  doc.roundedRect(drawBoxX, drawBoxY, drawBoxW, drawBoxH, 2, 2, 'F')
  doc.setDrawColor(215, 226, 219)
  doc.roundedRect(drawBoxX, drawBoxY, drawBoxW, drawBoxH, 2, 2, 'S')

  // Cabeçalho do desenho
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(22, 163, 74)
  doc.text('ESQUEMA TÉCNICO DO PORTÃO · ALÇADO FRONTAL COM COTAS (MM)', drawBoxX + 4, drawBoxY + 5)

  // Escala para caber a porta no retângulo
  const maxDw = 92
  const maxDh = 34
  const doorRatio = order.width / order.height
  let dW = maxDw
  let dH = dW / doorRatio
  if (dH > maxDh) {
    dH = maxDh
    dW = dH * doorRatio
  }

  const doorCenterX = drawBoxX + drawBoxW / 2
  const doorX = doorCenterX - dW / 2
  const doorY = drawBoxY + 16 + (maxDh - dH) / 2

  // Parede envolvente de fundo (alvenaria)
  doc.setFillColor(224, 230, 226)
  doc.rect(doorX - 12, doorY - 7, dW + 24, dH + 10, 'F')

  // Cor do portão convertida do hex para RGB
  const rgb = hexToRgb(order.colorHex || '#383e42')
  doc.setFillColor(rgb[0], rgb[1], rgb[2])
  doc.rect(doorX, doorY, dW, dH, 'F')

  // Contorno da porta
  doc.setDrawColor(20, 25, 28)
  doc.setLineWidth(0.4)
  doc.rect(doorX, doorY, dW, dH, 'S')

  // Divisão dos painéis horizontais (mesma fórmula do configurador 3D)
  const panelCount = Math.max(3, Math.round(order.height / 0.55))
  const panelH = dH / panelCount

  // Banda da porta pedonal: sempre nos últimos 4 painéis a partir do chão, igual ao 3D
  const serviceDoorPanels = Math.min(4, panelCount)
  const reachesFloor = order.serviceDoorType === 'normal-soleira' || order.serviceDoorType === 'idealdoor'
  const pW = Math.min(dW * 0.28, (dW * 0.95) / Math.max(order.width, 0.1))
  const pMargin = dW * 0.025
  const pX =
    order.serviceDoorPosition === 'left'
      ? doorX + pMargin
      : order.serviceDoorPosition === 'right'
      ? doorX + dW - pW - pMargin
      : doorX + (dW - pW) / 2
  const bandBottomOffset = reachesFloor ? 0 : panelH * 0.25
  const bandTopOffset = serviceDoorPanels * panelH - panelH * 0.5
  const pH = bandTopOffset - bandBottomOffset
  const pY = doorY + dH - bandTopOffset

  doc.setDrawColor(15, 20, 22)
  doc.setLineWidth(0.3)
  for (let i = 1; i < panelCount; i++) {
    const py = doorY + i * panelH
    doc.line(doorX, py, doorX + dW, py)

    // Se for canelado, desenhar ranhuras sutis
    if (order.model === 'ribbed') {
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.15)
      doc.line(doorX + 1, py - panelH * 0.5, doorX + dW - 1, py - panelH * 0.5)
      doc.setDrawColor(15, 20, 22)
      doc.setLineWidth(0.3)
    }
  }

  // Se for Almofadado (Cassette), desenhar as almofadas em cada painel
  if (order.model === 'cassette') {
    const cassCols = Math.max(2, Math.round(order.width / 0.65))
    const cColW = dW / cassCols
    const cBoxW = cColW * 0.74
    const cBoxH = panelH * 0.56
    doc.setDrawColor(20, 25, 28)
    doc.setLineWidth(0.2)
    for (let pIdx = 0; pIdx < panelCount; pIdx++) {
      const pMidY = doorY + (pIdx + 0.5) * panelH
      for (let c = 0; c < cassCols; c++) {
        const cX = doorX + (c + 0.5) * cColW - cBoxW / 2
        const cY = pMidY - cBoxH / 2
        doc.rect(cX, cY, cBoxW, cBoxH, 'S')
      }
    }
  }

  // Visores nos painéis escolhidos pelo cliente (pode ser mais do que um) — ao lado da porta
  // pedonal quando partilham o mesmo painel. Repete o mesmo desenho por cada painel selecionado.
  if (order.windows) {
    const windowCount = Math.min(4, Math.max(1, order.windowsQuantity || 2))
    const selectedPanels =
      order.windowsPanels && order.windowsPanels.length > 0 ? order.windowsPanels : [order.windowsPanel || 1]

    for (const panelNum of selectedPanels) {
      const targetRow = Math.min(Math.max(panelNum, 1), panelCount) - 1
      const isDoorPanel = order.serviceDoor && targetRow >= panelCount - serviceDoorPanels

      let windowXs: number[]
      let winW = Math.min(dW * 0.18, (dW / (windowCount + 1)) * 0.55)

      if (!isDoorPanel) {
        const spacing = dW / (windowCount + 1)
        windowXs = Array.from({ length: windowCount }, (_, idx) => doorX + (idx + 1) * spacing)
      } else {
        const margin = dW * 0.025
        const doorLeftPx = pX - margin
        const doorRightPx = pX + pW + margin
        const leftW = Math.max(0, doorLeftPx - doorX)
        const rightW = Math.max(0, doorX + dW - doorRightPx)
        const leftCount = leftW <= 0 ? 0 : rightW <= 0 ? windowCount : Math.ceil(windowCount / 2)
        const rightCount = windowCount - leftCount
        const xs: number[] = []
        for (let k = 0; k < leftCount; k++) xs.push(doorX + ((k + 1) / (leftCount + 1)) * leftW)
        for (let k = 0; k < rightCount; k++) xs.push(doorRightPx + ((k + 1) / (rightCount + 1)) * rightW)
        windowXs = xs
        const zoneW = Math.min(leftCount > 0 ? leftW / leftCount : Infinity, rightCount > 0 ? rightW / rightCount : Infinity)
        winW = Math.max(3, Math.min(winW, zoneW * 0.72))
      }

      const winH = Math.min(panelH * 0.58, 9)
      const rowTopY = doorY + targetRow * panelH
      const winY = rowTopY + (panelH - winH) / 2

      for (const winCx of windowXs) {
        const winX = winCx - winW / 2
        // Moldura preta
        doc.setFillColor(25, 25, 25)
        doc.rect(winX - 0.5, winY - 0.5, winW + 1, winH + 1, 'F')
        // Vidro azul claro
        doc.setFillColor(180, 225, 240)
        doc.rect(winX, winY, winW, winH, 'F')
        doc.setDrawColor(100, 160, 190)
        doc.setLineWidth(0.15)
        doc.rect(winX, winY, winW, winH, 'S')
      }
    }
  }

  // Porta de serviço pedonal (se ativa) — na cor do portão, com moldura, posição e faixa de painéis iguais ao 3D
  if (order.serviceDoor) {
    doc.setFillColor(232, 232, 230)
    doc.rect(pX - 0.7, pY - 0.7, pW + 1.4, pH + 1.4, 'F')

    doc.setFillColor(rgb[0], rgb[1], rgb[2])
    doc.rect(pX, pY, pW, pH, 'F')
    doc.setDrawColor(15, 20, 22)
    doc.setLineWidth(0.3)
    doc.rect(pX, pY, pW, pH, 'S')

    // Puxador
    doc.setFillColor(225, 225, 225)
    doc.rect(pX + pW - 2.3, pY + pH * 0.46, 1, 4, 'F')
  }

  // Ombreiras Falsas / Fixo em Painel — esquerda e direita independentes (se ativas)
  const tubeLeft = order.tubeLeft && order.tubeLeft !== 'Nenhum' ? order.tubeLeft : undefined
  const tubeRight = order.tubeRight && order.tubeRight !== 'Nenhum' ? order.tubeRight : undefined
  if (tubeLeft) {
    doc.setFillColor(tubeLeft.includes('painel') ? rgb[0] : 180, tubeLeft.includes('painel') ? rgb[1] : 190, tubeLeft.includes('painel') ? rgb[2] : 195)
    doc.rect(doorX - 4.5, doorY, 4, dH, 'F')
  }
  if (tubeRight) {
    doc.setFillColor(tubeRight.includes('painel') ? rgb[0] : 180, tubeRight.includes('painel') ? rgb[1] : 190, tubeRight.includes('painel') ? rgb[2] : 195)
    doc.rect(doorX + dW + 0.5, doorY, 4, dH, 'F')
  }

  // Padieira Falsa / Fixo em Painel Superior (se ativo)
  if (order.header !== 'Nenhum') {
    doc.setFillColor(order.header.includes('painel') ? rgb[0] : 180, order.header.includes('painel') ? rgb[1] : 190, order.header.includes('painel') ? rgb[2] : 195)
    doc.rect(doorX, doorY - 4.5, dW, 4, 'F')
  }

  // Barra inferior de alumínio (clara em portas brancas, escura nas restantes — igual ao acabamento exterior do 3D)
  const isWhiteDoor = rgb[0] > 225 && rgb[1] > 225 && rgb[2] > 225
  const barH = Math.max(1.1, dH * 0.045)
  if (isWhiteDoor) {
    doc.setFillColor(230, 230, 225)
  } else {
    doc.setFillColor(8, 9, 10)
  }
  doc.rect(doorX - 1, doorY + dH - barH, dW + 2, barH, 'F')

  // Borrachas laterais pretas, de alto a baixo
  doc.setFillColor(8, 9, 10)
  doc.rect(doorX - 0.6, doorY - 0.5, 0.9, dH + 1, 'F')
  doc.rect(doorX + dW - 0.3, doorY - 0.5, 0.9, dH + 1, 'F')

  // Emblema no canto inferior — no lado oposto à porta pedonal quando esta fica à direita, igual ao 3D
  if (doorBadgeDataUrl) {
    const badgeW = Math.min(dW * 0.16, 13)
    const badgeH = badgeW / DOOR_BADGE_ASPECT
    const badgeOnLeft = order.serviceDoor && order.serviceDoorPosition === 'right'
    const badgeX = badgeOnLeft ? doorX + 1.5 : doorX + dW - badgeW - 1.5
    const badgeY = doorY + dH - barH - badgeH - 1
    try {
      doc.addImage(doorBadgeDataUrl, 'PNG', badgeX, badgeY, badgeW, badgeH)
    } catch {
      // Ignora se a imagem não puder ser incorporada
    }
  }

  // --- Linhas de Cotas Técnicas com Setas ---
  doc.setDrawColor(37, 99, 235) // Azul técnico
  doc.setLineWidth(0.25)
  doc.setTextColor(37, 99, 235)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')

  // Cota Inferior: LARGURA DA PORTA
  const dimY = doorY + dH + 3.5
  doc.line(doorX, dimY, doorX + dW, dimY)
  doc.line(doorX, dimY - 1.5, doorX, dimY + 1.5)
  doc.line(doorX + dW, dimY - 1.5, doorX + dW, dimY + 1.5)
  doc.text(`L: ${finalDims.widthMm} mm`, doorCenterX, dimY + 3.2, { align: 'center' })

  // Cota Lateral: ALTURA DA PORTA
  const dimX = doorX + dW + (tubeRight ? 7 : 4)
  doc.line(dimX, doorY, dimX, doorY + dH)
  doc.line(dimX - 1.5, doorY, dimX + 1.5, doorY)
  doc.line(dimX - 1.5, doorY + dH, dimX + 1.5, doorY + dH)
  doc.text(`H: ${finalDims.heightMm} mm`, dimX + 1.5, doorY + dH / 2 + 1)

  // Cota Superior: PADIEIRA
  doc.setDrawColor(220, 38, 38) // Vermelho
  doc.setTextColor(220, 38, 38)
  const padY = doorY - 5.5
  doc.line(doorCenterX - 8, padY, doorCenterX + 8, padY)
  doc.text(`Padieira: ${effectivePaddingMm(order)} mm`, doorCenterX, padY - 1.5, { align: 'center' })

  // Cotas de Ombreiras
  const ombY = doorY + dH / 2
  doc.text(`E: ${effectiveLeftShadeMm(order)}`, doorX - (tubeLeft ? 6 : 2), ombY, { align: 'right' })
  doc.text(`D: ${effectiveRightShadeMm(order)}`, dimX + 16, ombY)

  // Legenda de Cor no Desenho
  const modelLabels: Record<string, string> = {
    smooth: 'Total Liso',
    ribbed: 'Canelado',
    cassette: 'Almofadado (Cassette)',
  }
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(80, 90, 85)
  doc.text(
    `Cor RAL: ${order.colorCode} (${order.colorName}) · Modelo: ${modelLabels[order.model] || order.model}`,
    drawBoxX + 4,
    drawBoxY + drawBoxH - 2
  )

  return drawBoxY + drawBoxH + 4
}

async function buildOrderPDF(order: Order): Promise<{ doc: jsPDF; fileName: string }> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // 1. Cabeçalho Superior (nome e logótipo, sem faixa colorida)
  const [logoDataUrl, doorBadgeDataUrl, catalog] = await Promise.all([
    fetchImageAsDataUrl(LOGO_URL),
    fetchImageAsDataUrl(DOOR_BADGE_URL),
    fetchCatalog(),
  ])
  drawHeaderBranding(doc, logoDataUrl, doorBadgeDataUrl)

  // Badge da Referência
  doc.setTextColor(20, 24, 22)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(`REF: ${order.id}`, pageWidth - 14, 10, { align: 'right' })
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 68, 64)
  doc.text(`Data: ${new Date(order.createdAt).toLocaleDateString('pt-PT')}`, pageWidth - 14, 16, { align: 'right' })

  // Linha divisória preta a fechar o cabeçalho
  doc.setDrawColor(20, 24, 22)
  doc.setLineWidth(0.6)
  doc.line(0, 27, pageWidth, 27)

  // 2. Título do Documento
  let currentY = 35
  doc.setTextColor(21, 33, 38)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('FICHA TÉCNICA DE FABRICO', 14, currentY)

  // Linha divisória
  currentY += 3.5
  doc.setDrawColor(226, 233, 228)
  doc.setLineWidth(0.4)
  doc.line(14, currentY, pageWidth - 14, currentY)

  // Obras com mais do que uma porta: cada porta tem o seu próprio desenho + tabela de componentes,
  // em páginas separadas; o resto do documento (cliente, observações, assinaturas) é partilhado.
  const doorsList = doorsToRender(order)

  // 3. Bloco Resumo do Cliente
  currentY += 5
  currentY = drawClientInfoBox(doc, order, currentY, {
    label: doorsList.length > 1 ? 'OBRA' : 'SUPERFÍCIE DO VÃO',
    value:
      doorsList.length > 1
        ? `${doorsList.length} portas nesta obra`
        : `${order.area.toFixed(2)} m² (${order.widthMm} × ${order.heightMm} mm) · Padieira: ${order.paddingMm} mm`,
  })

  const modelLabels: Record<string, string> = {
    smooth: 'Total Liso',
    ribbed: 'Canelado',
    cassette: 'Almofadado (Cassette)',
  }

  doorsList.forEach((door, idx) => {
    if (idx > 0) {
      doc.addPage()
      drawHeaderBranding(doc, logoDataUrl, doorBadgeDataUrl)
      doc.setTextColor(20, 24, 22)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text(`REF: ${order.id}`, pageWidth - 14, 10, { align: 'right' })
      doc.setDrawColor(20, 24, 22)
      doc.setLineWidth(0.6)
      doc.line(0, 27, pageWidth, 27)
      currentY = 35
    }

    if (doorsList.length > 1) {
      doc.setTextColor(21, 33, 38)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text(`PORTA ${idx + 1} DE ${doorsList.length}`, 14, currentY)
      currentY += 5
    }

    // 4. Desenho técnico vetorial da porta (alçado frontal com cotas)
    currentY = drawDoorDiagram(doc, door, currentY, doorBadgeDataUrl)

    // =========================================================================
    // 5. TABELA TÉCNICA QUANTIFICADA (EM UNIDADES PARA OMBREIRAS E PADIEIRAS)
    // =========================================================================
    const finalDims = finalOpeningDimensions(door)
    const tableData = [
      // 1. Portão Seccionado
      [
        'Portão Seccionado',
        '1',
        'un',
        `Painel 40mm PUR, ${modelLabels[door.model] || door.model}, ${door.colorCode} (${finalDims.widthMm} × ${finalDims.heightMm} mm · ${((finalDims.widthMm * finalDims.heightMm) / 1e6).toFixed(2)} m²)`,
      ],
      // 2. Motorização e Calha
      [
        'Automatismo / Motor',
        door.automation !== 'Nenhum' ? '1' : '0',
        'un',
        door.automation !== 'Nenhum' ? door.automation : 'Portão com acionamento manual',
      ],
      [
        'Calha de Tração do Motor',
        door.rail !== 'Nenhum' ? '1' : '0',
        'un',
        door.rail !== 'Nenhum' ? door.rail : 'Não aplicável',
      ],
      [
        'Comandos / Emissores',
        door.automation !== 'Nenhum' && door.automation !== 'Garibalde' ? `${door.remotesQuantity || 2}` : '0',
        'un',
        door.automation !== 'Nenhum' && door.automation !== 'Garibalde'
          ? 'Emissores rolling code multifrequência de alta segurança'
          : 'Não aplicável',
      ],
      // 3. Ombreira Falsa Esquerda
      [
        'Ombreira Falsa Esquerda',
        door.tubeLeft && door.tubeLeft !== 'Nenhum' ? '1' : '0',
        'un',
        door.tubeLeft && door.tubeLeft !== 'Nenhum'
          ? `${door.tubeLeft}${
              !door.tubeLeft.toLowerCase().includes('tubo') && door.tubeWidthLeft
                ? ` (Largura ${door.tubeWidthLeft} mm × Altura ${door.tubeLengthLeft || '-'} mm)`
                : door.tubeLengthLeft
                ? ` (Altura ${door.tubeLengthLeft} mm)`
                : ''
            }`
          : 'Fixação direta à alvenaria',
      ],
      // 3b. Ombreira Falsa Direita
      [
        'Ombreira Falsa Direita',
        door.tubeRight && door.tubeRight !== 'Nenhum' ? '1' : '0',
        'un',
        door.tubeRight && door.tubeRight !== 'Nenhum'
          ? `${door.tubeRight}${
              !door.tubeRight.toLowerCase().includes('tubo') && door.tubeWidthRight
                ? ` (Largura ${door.tubeWidthRight} mm × Altura ${door.tubeLengthRight || '-'} mm)`
                : door.tubeLengthRight
                ? ` (Altura ${door.tubeLengthRight} mm)`
                : ''
            }`
          : 'Fixação direta à alvenaria',
      ],
      // 4. Padieira Falsa em UNIDADES
      [
        'Padieira Falsa',
        door.header !== 'Nenhum' ? `${door.headerUnits || 1}` : '0',
        'un',
        door.header !== 'Nenhum'
          ? `${door.header} (${door.headerUnits || 1} un${
              !door.header.toLowerCase().includes('tubo') && door.headerWidth ? ` · Largura ${door.headerWidth} mm` : ''
            }${door.headerLength ? ` × Altura ${door.headerLength} mm` : ''})`
          : 'Padieira existente suficiente',
      ],
      // 5. Acessórios
      [
        'Porta Pedonal de Serviço',
        door.serviceDoor ? '1' : '0',
        'un',
        door.serviceDoor
          ? `${serviceDoorTypeDescription(door.serviceDoorType)}${
              door.serviceDoorPanicBar ? ' · Barra antipânico' : ''
            }${door.serviceDoorAirSpring ? ' · Mola aérea' : ''}`
          : 'Sem porta de serviço',
      ],
      [
        'Visores Panorâmicos',
        door.windows ? `${door.windowsQuantity || 2}` : '0',
        'un',
        door.windows
          ? `Visores retangulares com ${door.visorMaterial === 'acrilico' ? 'acrílico' : 'vidro duplo'} resistente`
          : 'Sem visores',
      ],
      [
        'Vedante Perimetral EPDM',
        door.rubberSeal ? '1' : '0',
        'kit',
        door.rubberSeal ? 'Vedante inferior e lateral de borracha resistente a intempéries' : 'Vedante de série',
      ],
    ].filter((row) => row[1] !== '0') // itens não incluídos (qtd 0) não aparecem, para não confundir

    if (door.extras && door.extras.length > 0) {
      // Extras em metros contam como 1 artigo (os metros aparecem na especificação).
      const extrasQty = door.extras.reduce((sum, e) => sum + (e.unit === 'm' ? 1 : e.quantity || 1), 0)
      tableData.push([
        'Extras Adicionais',
        `${extrasQty}`,
        'un',
        door.extras.map(formatExtra).join(' · '),
      ])
    }

    if (door.automationExtras && door.automationExtras.length > 0) {
      const automationExtrasQty = door.automationExtras.reduce((sum, e) => sum + (e.quantity || 1), 0)
      tableData.push([
        'Extras do Motor',
        `${automationExtrasQty}`,
        'un',
        door.automationExtras.map((e) => (e.quantity > 1 ? `${e.name} ×${e.quantity}` : e.name)).join(' · '),
      ])
    }

    if (door.montagens && door.montagens.length > 0) {
      tableData.push(['Montagens', `${door.montagens.length}`, 'un', door.montagens.join(' · ')])
    }

    // Medidas do vão tal como medidas, sem descontos — "Portão Seccionado" já mostra as medidas
    // finais. Só aparece quando há de facto algum desconto, senão repetia os mesmos valores.
    if (finalDims.leftDeductMm > 0 || finalDims.rightDeductMm > 0 || finalDims.topDeductMm > 0) {
      tableData.push(['Medidas de Vão', '1', 'un', `${door.widthMm} × ${door.heightMm} mm`])
    }

    autoTable(doc, {
      startY: currentY,
      head: [['Componente / Artigo', 'Qtd', 'Un', 'Especificação Técnica Detalhada']],
      body: tableData as any,
      theme: 'grid',
      headStyles: {
        fillColor: [28, 41, 46],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        halign: 'left',
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [30, 41, 46],
        cellPadding: 1.6,
      },
      columnStyles: {
        0: { cellWidth: 42, fontStyle: 'bold' },
        1: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
        2: { cellWidth: 9, halign: 'center', textColor: [100, 110, 115] },
        3: { cellWidth: 'auto' },
      },
      margin: { left: 14, right: 14 },
    })

    currentY = (doc as any).lastAutoTable.finalY + 3.5
  })

  // 6. Resumo de Preços — mesmo na Ficha Técnica (Encomenda), não só no Orçamento comercial: o
  // preço de cada artigo (mesma tabela do Orçamento) e depois os totais.
  {
    const quote = applyPriceOverrides(
      calculateMultiDoorQuote(doorsToRender(order).map(doorToPricingInput), catalog),
      order.priceOverrides,
      order.priceTotalOverride,
      order.priceIvaRateOverride
    )
    if (currentY > pageHeight - 60) {
      doc.addPage()
      currentY = 20
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(21, 33, 38)
    doc.text('RESUMO DE PREÇOS', 14, currentY + 4)
    currentY += 6
    const money = (v: number | null) => (v == null ? 'Sob consulta' : `${v.toFixed(2)} €`)
    autoTable(doc, {
      startY: currentY,
      head: [['Artigo', 'Especificação', 'Qtd', 'Preço Unit.', 'Total']],
      body: quote.items.map((item) => [
        item.label,
        item.edited ? `${item.description} · Preço editado manualmente` : item.description,
        `${item.qty % 1 === 0 ? item.qty : item.qty.toFixed(2)} ${item.unit}`,
        money(item.unitPrice),
        money(item.lineTotal),
      ]) as any,
      theme: 'grid',
      headStyles: { fillColor: [28, 41, 46], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5, halign: 'left' },
      bodyStyles: { fontSize: 7, textColor: [30, 41, 46], cellPadding: 1.6 },
      columnStyles: {
        0: { cellWidth: 38, fontStyle: 'bold' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 24, halign: 'right' },
        4: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: 14, right: 14 },
    })
    currentY = (doc as any).lastAutoTable.finalY + 4
    if (currentY > pageHeight - 40) {
      doc.addPage()
      currentY = 20
    }

    const ivaRateOrder = quote.ivaRate
    const ivaAmountOrder = quote.ivaAmount
    const totalWithIvaOrder = quote.totalWithIva
    const priceBoxH = 20
    doc.setFillColor(233, 247, 238)
    doc.roundedRect(pageWidth - 14 - 70, currentY, 70, priceBoxH, 2, 2, 'F')
    doc.setDrawColor(22, 163, 74)
    doc.roundedRect(pageWidth - 14 - 70, currentY, 70, priceBoxH, 2, 2, 'S')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(60, 75, 68)
    doc.text('Subtotal (sem IVA)', pageWidth - 14 - 66, currentY + 5)
    doc.text(`${quote.total.toFixed(2)} €`, pageWidth - 18, currentY + 5, { align: 'right' })
    doc.text(`IVA (${Math.round(ivaRateOrder * 100)}%)`, pageWidth - 14 - 66, currentY + 9.5)
    doc.text(`${ivaAmountOrder.toFixed(2)} €`, pageWidth - 18, currentY + 9.5, { align: 'right' })

    doc.setDrawColor(190, 220, 200)
    doc.setLineWidth(0.2)
    doc.line(pageWidth - 14 - 66, currentY + 12, pageWidth - 18, currentY + 12)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(21, 33, 38)
    doc.text('TOTAL (com IVA)', pageWidth - 14 - 66, currentY + 17)
    doc.setFontSize(12)
    doc.setTextColor(22, 163, 74)
    doc.text(`${totalWithIvaOrder.toFixed(2)} €`, pageWidth - 18, currentY + 17.3, { align: 'right' })

    currentY += priceBoxH + 4

    if (
      (order.priceOverrides && order.priceOverrides.length > 0) ||
      order.priceTotalOverride != null ||
      order.priceIvaRateOverride != null
    ) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.setTextColor(180, 83, 9)
      doc.text(`Nota: ${PRICE_EDITED_NOTE}`, 14, currentY)
      currentY += 5
    }
  }

  // 7. Observações / Anotações da Encomenda (se existirem) — depois da(s) tabela(s)
  let afterTableY = currentY

  if (order.notes && order.notes.trim()) {
    const notesLines = doc.splitTextToSize(order.notes.trim(), pageWidth - 28 - 8)
    const notesBoxH = 9 + notesLines.length * 3.6

    doc.setFillColor(255, 251, 235)
    doc.roundedRect(14, afterTableY, pageWidth - 28, notesBoxH, 2, 2, 'F')
    doc.setDrawColor(245, 220, 150)
    doc.roundedRect(14, afterTableY, pageWidth - 28, notesBoxH, 2, 2, 'S')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(146, 100, 6)
    doc.text('OBSERVAÇÕES:', 18, afterTableY + 5)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(90, 70, 20)
    doc.setFontSize(7.5)
    doc.text(notesLines, 18, afterTableY + 9.5)

    afterTableY += notesBoxH + 4
  }

  // 7. Termos, Garantias e Assinaturas
  const finalY = afterTableY

  // Assinaturas
  const signY = finalY + 4
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(90, 100, 95)

  doc.line(18, signY + 7, 78, signY + 7)
  doc.text('Pela Automatismos Lousada, Lda', 18, signY + 10.5)

  doc.line(pageWidth - 78, signY + 7, pageWidth - 18, signY + 7)
  doc.text('Aceitação do Cliente / Adjudicação', pageWidth - 78, signY + 10.5)

  // Rodapé Oficial — em todas as páginas, numa obra com mais do que uma porta
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setFontSize(6.5)
    doc.setTextColor(140, 150, 145)
    doc.text(
      `Documento emitido eletronicamente pela Automatismos Lousada · ${new Date().toLocaleString('pt-PT')} · Documento Válido para Produção${
        totalPages > 1 ? ` · Página ${p}/${totalPages}` : ''
      }`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    )
  }

  const safeClientName = (order.client || 'Cliente').replace(/[^a-zA-Z0-9_-]/g, '_')
  const fileName = `FichaTecnica_${order.id}_${safeClientName}.pdf`
  return { doc, fileName }
}

export async function generateOrderPDF(order: Order) {
  const { doc, fileName } = await buildOrderPDF(order)
  doc.save(fileName)
}

// Devolve o PDF já gerado como data URI (sem acionar o download no browser) — usado para
// anexar o mesmo documento a um email.
export async function getOrderPDFBase64(order: Order): Promise<{ dataUri: string; fileName: string }> {
  const { doc, fileName } = await buildOrderPDF(order)
  return { dataUri: doc.output('datauristring'), fileName }
}

// =========================================================================
// FICHA DE PRODUÇÃO — uso exclusivo da fábrica (ver app/producao). Layout próprio em caixas
// simples (sem desenho técnico nem preços), espelhando exatamente a mesma informação já mostrada
// no ecrã /producao — a regra de negócio de cada campo calculado (Ferragem, Tubo...) vive em
// lib/production.ts, partilhada com a UI, para nunca haver divergência entre o que a fábrica vê
// no ecrã e o que sai no papel.
// =========================================================================

type FieldLine = { label: string; value: string }

// Mede se o valor cabe ao lado da etiqueta, na largura da coluna — se não couber, o valor passa
// a aparecer por baixo da etiqueta (eventualmente em várias linhas, via splitTextToSize), nunca
// cortado com "…": o texto tem sempre de aparecer todo.
// Tamanhos pensados para a folha impressa ser lida à distância na fábrica (os colaboradores
// queixavam-se de letra pequena com 9,5pt).
const FIELD_LINE_H = 5.6
const FIELD_FONT_SIZE = 12.5

function layoutField(
  doc: jsPDF,
  f: FieldLine,
  colWidth: number,
  scale = 1
): { label: string; lines: string[]; wrapped: boolean } {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(FIELD_FONT_SIZE * scale)
  const labelW = doc.getTextWidth(`${f.label}: `)
  doc.setFont('helvetica', 'normal')
  if (doc.getTextWidth(f.value) <= colWidth - labelW - 2) {
    return { label: f.label, lines: [f.value], wrapped: false }
  }
  const lines = doc.splitTextToSize(f.value, colWidth - 2) as string[]
  return { label: f.label, lines, wrapped: true }
}

function fieldHeight(field: { lines: string[]; wrapped: boolean }, scale = 1): number {
  const lineH = FIELD_LINE_H * scale
  return field.wrapped ? lineH + field.lines.length * lineH : lineH
}

function drawInlineFields(doc: jsPDF, fields: FieldLine[], x: number, y: number, colWidth: number, scale = 1): void {
  const lineH = FIELD_LINE_H * scale
  fields.forEach((f, i) => {
    const fx = x + i * colWidth
    const field = layoutField(doc, f, colWidth, scale)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(FIELD_FONT_SIZE * scale)
    doc.setTextColor(21, 33, 38)
    doc.text(`${field.label}:`, fx, y)
    const labelW = doc.getTextWidth(`${field.label}: `)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 68, 64)
    if (!field.wrapped) {
      doc.text(field.lines[0], fx + labelW, y)
    } else {
      doc.text(field.lines, fx, y + lineH)
    }
  })
}

// Caixa de cabeçalho com só o Cliente e a Data — as medidas da porta ficam no cartão
// Painel e Acabamento, tal como no painel de detalhe em /producao.
function drawProductionHeaderBox(doc: jsPDF, door: Order, startY: number): number {
  const pageWidth = doc.internal.pageSize.getWidth()
  const boxX = 14
  const boxWidth = pageWidth - 28
  const boxH = 19

  doc.setFillColor(248, 250, 248)
  doc.roundedRect(boxX, startY, boxWidth, boxH, 2, 2, 'F')
  doc.setDrawColor(220, 229, 223)
  doc.roundedRect(boxX, startY, boxWidth, boxH, 2, 2, 'S')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(21, 33, 38)
  doc.text('CLIENTE:', boxX + 4, startY + 8)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(17)
  doc.text(fitTextWidth(doc, door.client || 'Não especificado', boxWidth - 40), boxX + 30, startY + 8.5)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(21, 33, 38)
  doc.text('Data:', boxX + 4, startY + 15)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 68, 64)
  doc.text(new Date(door.createdAt).toLocaleDateString('pt-PT'), boxX + 19, startY + 15)

  return startY + boxH + 4
}

function fitsInline(doc: jsPDF, f: FieldLine, width: number, scale = 1): boolean {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(FIELD_FONT_SIZE * scale)
  const labelW = doc.getTextWidth(`${f.label}: `)
  doc.setFont('helvetica', 'normal')
  return doc.getTextWidth(f.value) <= width - labelW - 2
}

type SectionRow = { fields: FieldLine[]; width: number }
type SectionLayout = { rows: SectionRow[]; rowHeights: number[]; boxH: number; titleH: number }

// Calcula a disposição (linhas, alturas, altura total da caixa) de uma secção para um dado scale
// — sem desenhar nada. Usada duas vezes: primeiro a "seco" (scale 1) em buildProductionSheetPDF
// para saber quanto espaço todas as secções de uma porta precisariam, depois a sério pelo próprio
// drawSectionBox, já com o scale final escolhido para caber tudo numa só página (ver
// pickProductionSheetScale).
function layoutSectionBox(doc: jsPDF, fields: FieldLine[], columns: number, hasSignature: boolean, scale: number): SectionLayout {
  const pageWidth = doc.internal.pageSize.getWidth()
  const boxWidth = pageWidth - 28
  const colWidth = (boxWidth - 8) / columns
  const fullWidth = boxWidth - 8
  const baseRowH = 8.6 * scale
  const titleH = 11.5 * scale
  const signatureRowH = hasSignature ? baseRowH + 1 * scale : 0

  const rows: SectionRow[] = []
  let gridBuf: FieldLine[] = []
  const flushGrid = () => {
    if (gridBuf.length > 0) {
      rows.push({ fields: gridBuf, width: colWidth })
      gridBuf = []
    }
  }
  fields.forEach((f) => {
    if (fitsInline(doc, f, colWidth, scale)) {
      gridBuf.push(f)
      if (gridBuf.length === columns) flushGrid()
    } else {
      flushGrid()
      rows.push({ fields: [f], width: fullWidth })
    }
  })
  flushGrid()

  const rowHeights = rows.map((row) => {
    const heights = row.fields.map((f) => fieldHeight(layoutField(doc, f, row.width, scale), scale))
    return Math.max(baseRowH, ...heights) + 1 * scale
  })
  const boxH = titleH + rowHeights.reduce((a, b) => a + b, 0) + signatureRowH + 2 * scale
  return { rows, rowHeights, boxH, titleH }
}

// Caixa genérica com título + pares etiqueta/valor em grelha — usada para as secções Painel,
// Ferragens e Extras e Adicionais. Devolve startY inalterado se não houver campos (secção omitida).
// Um campo que não caiba ao lado da etiqueta na largura normal da coluna fica sozinho na sua
// própria linha, usando a largura toda da caixa, em vez de partilhar a linha com outro campo
// — os campos seguintes continuam normalmente a grelha a partir da linha seguinte. O scale (ver
// pickProductionSheetScale) encolhe fonte/alturas proporcionalmente para a folha caber sempre
// numa só página, mesmo numa porta com muitos extras.
function drawSectionBox(
  doc: jsPDF,
  title: string,
  fields: FieldLine[],
  startY: number,
  columns = 2,
  signatureLabel?: string,
  scale = 1
): number {
  if (fields.length === 0 && !signatureLabel) return startY
  const pageWidth = doc.internal.pageSize.getWidth()
  const boxX = 14
  const boxWidth = pageWidth - 28
  const { rows, rowHeights, boxH, titleH } = layoutSectionBox(doc, fields, columns, !!signatureLabel, scale)
  const y = startY

  doc.setFillColor(248, 250, 248)
  doc.roundedRect(boxX, y, boxWidth, boxH, 2, 2, 'F')
  doc.setDrawColor(220, 229, 223)
  doc.roundedRect(boxX, y, boxWidth, boxH, 2, 2, 'S')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13.5 * scale)
  doc.setTextColor(22, 163, 74)
  doc.text(title.toUpperCase(), boxX + 4, y + titleH * 0.68)

  let rowY = y + titleH
  rows.forEach((row, i) => {
    row.fields.forEach((f, col) => {
      drawInlineFields(doc, [f], boxX + 4 + col * row.width, rowY + 5.3 * scale, row.width, scale)
    })
    rowY += rowHeights[i]
  })

  if (signatureLabel) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(FIELD_FONT_SIZE * scale)
    doc.setTextColor(21, 33, 38)
    doc.text(`${signatureLabel}:`, boxX + 4, rowY + 5.3 * scale)
    const labelW = doc.getTextWidth(`${signatureLabel}: `)
    const lineStart = boxX + 4 + labelW
    const lineEnd = Math.max(lineStart + 20, boxX + boxWidth / 2)
    doc.setDrawColor(150, 160, 155)
    doc.setLineWidth(0.3)
    doc.line(lineStart, rowY + 5.3 * scale, lineEnd, rowY + 5.3 * scale)
  }

  return y + boxH + 4 * scale
}

// Nº de Porta — mesmo número da referência da encomenda (sem o prefixo ENC-/ORC-/AL-), com
// sufixo "-N" numa obra com mais do que uma porta, para cada folha impressa ficar distinguível.
function doorNumberLabel(order: Order, index: number, total: number): string {
  const match = order.id.match(/(\d+)$/)
  const base = match ? match[1] : order.id
  return total > 1 ? `${base}-${index + 1}` : base
}

const DOOR_NUMBER_BOX_W = 62
const DOOR_NUMBER_BOX_H = 23

function drawDoorNumberBox(doc: jsPDF, label: string): void {
  const pageWidth = doc.internal.pageSize.getWidth()
  const boxW = DOOR_NUMBER_BOX_W
  const boxH = DOOR_NUMBER_BOX_H
  const x = pageWidth - 14 - boxW
  const y = 7

  doc.setDrawColor(20, 24, 22)
  doc.setLineWidth(0.5)
  doc.roundedRect(x, y, boxW, boxH, 2, 2, 'S')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(90, 100, 95)
  doc.text('Nº DE PORTA', x + boxW / 2, y + 7.5, { align: 'center' })
  doc.setFontSize(23)
  doc.setTextColor(21, 33, 38)
  doc.text(label, x + boxW / 2, y + 18.5, { align: 'center' })
}

function buildExtrasEAdicionaisFields(door: Order): FieldLine[] {
  const fields: FieldLine[] = []
  if (door.tubeLeft && door.tubeLeft !== 'Nenhum') {
    fields.push({
      label: 'Ombreira Esquerda',
      value: `${door.tubeLeft}${door.tubeLengthLeft ? ` × ${door.tubeLengthLeft} mm` : ''}`,
    })
  }
  if (door.tubeRight && door.tubeRight !== 'Nenhum') {
    fields.push({
      label: 'Ombreira Direita',
      value: `${door.tubeRight}${door.tubeLengthRight ? ` × ${door.tubeLengthRight} mm` : ''}`,
    })
  }
  if (door.header !== 'Nenhum') {
    fields.push({
      label: 'Padieira Falsa',
      value: `${door.header} (${door.headerUnits || 1} un${door.headerLength ? ` × ${door.headerLength} mm` : ''})`,
    })
  }
  if (door.automation !== 'Nenhum') fields.push({ label: 'Automatismo', value: door.automation })
  if (door.rail !== 'Nenhum') fields.push({ label: 'Calha', value: door.rail })
  if (door.remotesQuantity > 2) fields.push({ label: 'Comandos', value: String(door.remotesQuantity) })
  if (door.serviceDoor) fields.push({ label: 'Porta de Serviço', value: serviceDoorText(door) })
  if (door.windows) {
    const panelsTxt =
      door.windowsPanels && door.windowsPanels.length > 0
        ? ` — Painel${door.windowsPanels.length > 1 ? 'éis' : ''} ${door.windowsPanels.join(', ')}`
        : ''
    fields.push({ label: 'Visores', value: `${door.windowsQuantity || 2}${panelsTxt}` })
  }
  if (door.rubberSeal) fields.push({ label: 'Vedante', value: 'Sim' })
  if (door.automationExtras && door.automationExtras.length > 0) {
    fields.push({
      label: 'Extras do Motor',
      value: door.automationExtras.map((e) => (e.quantity > 1 ? `${e.name} ×${e.quantity}` : e.name)).join(', '),
    })
  }
  const otherExtras = (door.extras || []).filter((e) => !FERRAGEM_EXTRA_NAMES.includes(e.name))
  if (otherExtras.length > 0) {
    fields.push({
      label: 'Extras',
      value: otherExtras.map(formatExtra).join(', '),
    })
  }
  if (door.montagens && door.montagens.length > 0) fields.push({ label: 'Montagens', value: door.montagens.join(', ') })
  return fields
}

// Espaço mínimo reservado no fundo da página para o conteúdo nunca sobrepor o rodapé oficial.
const PAGE_BOTTOM_MARGIN = 16
// Nunca encolhe o texto abaixo disto (≈11pt) — se mesmo assim não couber, a folha continua numa
// segunda página em vez de ficar ilegível.
const MIN_PRODUCTION_SCALE = 0.9

function notesBoxLayout(doc: jsPDF, notes: string, pageWidth: number, scale: number): { lines: string[]; boxH: number } {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12.5 * scale)
  const lines = doc.splitTextToSize(notes, pageWidth - 28 - 8) as string[]
  const boxH = 14 * scale + lines.length * 5.8 * scale
  return { lines, boxH }
}

// Mede quanto espaço todas as secções de uma porta precisariam ao tamanho normal (scale 1) e,
// se não couberem no espaço restante da página, devolve um scale menor para a Folha de Produção
// caber sempre numa única página — nunca em duas — encolhendo fonte/alturas proporcionalmente em
// vez de cortar ou sobrepor conteúdo (ver drawSectionBox e notesBoxLayout).
function pickProductionSheetScale(
  doc: jsPDF,
  opts: {
    pageHeight: number
    startY: number
    painelFields: FieldLine[]
    accessoriesFields: FieldLine[]
    ferragensFields: FieldLine[]
    extrasFields: FieldLine[]
    notesText: string
  }
): number {
  const pageWidth = doc.internal.pageSize.getWidth()
  const naturalNeeded =
    layoutSectionBox(doc, opts.painelFields, 3, true, 1).boxH +
    4 +
    layoutSectionBox(doc, opts.accessoriesFields, 3, true, 1).boxH +
    4 +
    layoutSectionBox(doc, opts.ferragensFields, 2, true, 1).boxH +
    4 +
    (opts.extrasFields.length > 0 ? layoutSectionBox(doc, opts.extrasFields, 2, false, 1).boxH + 4 : 0) +
    (opts.notesText ? notesBoxLayout(doc, opts.notesText, pageWidth, 1).boxH + 4 : 0)

  const available = opts.pageHeight - PAGE_BOTTOM_MARGIN - opts.startY
  if (naturalNeeded <= available) return 1
  return Math.max(MIN_PRODUCTION_SCALE, available / naturalNeeded)
}

export async function buildProductionSheetPDF(order: Order): Promise<{ doc: jsPDF; fileName: string }> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const [logoDataUrl, doorBadgeDataUrl] = await Promise.all([
    fetchImageAsDataUrl(LOGO_URL),
    fetchImageAsDataUrl(DOOR_BADGE_URL),
  ])

  const doorsList = doorsToRender(order)

  doorsList.forEach((door, idx) => {
    if (idx > 0) doc.addPage()

    // Logótipo um pouco maior do que nos outros PDFs, mas sem roubar o espaço de que o texto
    // (agora em letra grande) precisa.
    const headerBottom = drawHeaderBranding(doc, logoDataUrl, doorBadgeDataUrl, 1.1)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(90, 100, 95)
    doc.text(new Date().toLocaleString('pt-PT'), pageWidth - 14 - DOOR_NUMBER_BOX_W - 4, 7, { align: 'right' })
    const doorLabel = doorNumberLabel(order, idx, doorsList.length)
    drawDoorNumberBox(doc, doorLabel)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.setTextColor(21, 33, 38)
    // O título fica sempre abaixo da caixa do Nº de Porta, mesmo com o logótipo mais pequeno.
    const titleTop = Math.max(headerBottom, 7 + DOOR_NUMBER_BOX_H)
    doc.text('FOLHA DE PRODUÇÃO', pageWidth / 2, titleTop + 7, { align: 'center' })

    const dividerY = titleTop + 11
    doc.setDrawColor(20, 24, 22)
    doc.setLineWidth(0.6)
    doc.line(0, dividerY, pageWidth, dividerY)

    let currentY = dividerY + 5
    currentY = drawProductionHeaderBox(doc, door, currentY)

    const finalDims = finalOpeningDimensions(door)
    const panels = panelBreakdown(finalDims.heightMm)
    const painelFields: FieldLine[] = [
      { label: 'Largura', value: `${finalDims.widthMm} mm` },
      { label: 'Altura', value: `${finalDims.heightMm} mm` },
      { label: 'Padieira', value: `${effectivePaddingMm(door)} mm` },
      { label: 'Largura de Corte', value: `${door.productionCutWidthMm ?? finalDims.widthMm + 30} mm` },
      { label: 'Painel', value: modelLabels[door.model] || door.model },
      { label: 'Cor', value: door.colorCode },
      { label: 'Painéis 610mm', value: String(panels.p610) },
      { label: 'Painéis 500mm', value: String(panels.p500) },
      { label: 'Corte do excedente', value: `${panels.cutMm} mm` },
    ]

    const accessoriesFields: FieldLine[] = accessoriesBox(door).map((a) => ({
      label: a.label,
      value: `${a.qty}${a.unit === 'mm' ? ' mm' : ''}`,
    }))

    const ferragensFields: FieldLine[] = [{ label: 'Ferragem', value: ferragemLabel(door) }]
    const fExtras = ferragemExtras(door)
    if (fExtras.length > 0) ferragensFields.push({ label: 'Extras', value: fExtras.join(', ') })
    ferragensFields.push({ label: 'Calha L', value: `${calhaLValue(door)} mm` })
    ferragensFields.push({ label: 'Curva', value: String(curvaValue(door)) })
    ferragensFields.push({ label: 'Varão', value: `${varaoValue(door)} mm` })
    ferragensFields.push({ label: 'Mola', value: door.productionSpring || '—' })
    ferragensFields.push({
      label: 'Voltas da Mola',
      value: door.productionSpringTurns != null ? String(door.productionSpringTurns) : '—',
    })
    ferragensFields.push({ label: 'Tambor', value: door.productionTambor || '—' })

    const extrasFields = hasExtrasEAdicionais(door) ? buildExtrasEAdicionaisFields(door) : []
    const notesText = order.notes && order.notes.trim() ? order.notes.trim() : ''

    // Encolhe fonte/alturas o suficiente para tudo caber numa só página — nunca passa para uma
    // segunda página, mesmo numa porta com muitos extras/ombreiras (ver pickProductionSheetScale).
    const scale = pickProductionSheetScale(doc, {
      pageHeight,
      startY: currentY,
      painelFields,
      accessoriesFields,
      ferragensFields,
      extrasFields,
      notesText,
    })

    // Só numa porta com muitíssimo conteúdo: passa a secção seguinte para uma página nova (com o
    // Nº de Porta e o cliente) em vez de a cortar no fundo da folha.
    const ensureSpace = (needed: number) => {
      if (currentY + needed <= pageHeight - PAGE_BOTTOM_MARGIN) return
      doc.addPage()
      drawDoorNumberBox(doc, doorLabel)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.setTextColor(21, 33, 38)
      doc.text('FOLHA DE PRODUÇÃO (continuação)', 14, 16)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(12)
      doc.text(fitTextWidth(doc, order.client || '', pageWidth - 28 - DOOR_NUMBER_BOX_W - 8), 14, 24)
      currentY = 7 + DOOR_NUMBER_BOX_H + 8
    }
    const section = (title: string, fields: FieldLine[], columns: number, signature?: string) => {
      if (fields.length === 0 && !signature) return
      ensureSpace(layoutSectionBox(doc, fields, columns, !!signature, scale).boxH)
      currentY = drawSectionBox(doc, title, fields, currentY, columns, signature, scale)
    }

    section('Painel e Acabamento', painelFields, 3, 'Assinatura Colaborador 1')
    section('Caixa de Acessórios', accessoriesFields, 3, 'Assinatura Colaborador 2')
    section('Ferragens', ferragensFields, 2, 'Assinatura Colaborador 3')
    section('Extras e Adicionais', extrasFields, 2)

    if (notesText) {
      const { lines: notesLines, boxH: notesBoxH } = notesBoxLayout(doc, notesText, pageWidth, scale)
      ensureSpace(notesBoxH)

      doc.setFillColor(255, 251, 235)
      doc.roundedRect(14, currentY, pageWidth - 28, notesBoxH, 2, 2, 'F')
      doc.setDrawColor(245, 220, 150)
      doc.roundedRect(14, currentY, pageWidth - 28, notesBoxH, 2, 2, 'S')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12 * scale)
      doc.setTextColor(146, 100, 6)
      doc.text('OBSERVAÇÕES:', 18, currentY + 7 * scale)

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(90, 70, 20)
      doc.setFontSize(12.5 * scale)
      doc.text(notesLines, 18, currentY + 13.5 * scale)

      currentY += notesBoxH + 4 * scale
    }
  })

  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setFontSize(7.5)
    doc.setTextColor(140, 150, 145)
    doc.text(
      `Documento emitido eletronicamente pela Automatismos Lousada · ${new Date().toLocaleString('pt-PT')} · Ficha de Produção${
        totalPages > 1 ? ` · Página ${p}/${totalPages}` : ''
      }`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    )
  }

  const safeClientName = (order.client || 'Cliente').replace(/[^a-zA-Z0-9_-]/g, '_')
  const fileName = `FichaProducao_${order.id}_${safeClientName}.pdf`
  return { doc, fileName }
}

export async function generateProductionSheetPDF(order: Order) {
  const { doc, fileName } = await buildProductionSheetPDF(order)
  doc.save(fileName)
}

export async function getProductionSheetPDFBase64(order: Order): Promise<{ dataUri: string; fileName: string }> {
  const { doc, fileName } = await buildProductionSheetPDF(order)
  return { dataUri: doc.output('datauristring'), fileName }
}

// =========================================================================
// ETIQUETAS DE PORTA — para imprimir numa impressora de etiquetas de rolo contínuo (Brother
// QL-800 do utilizador), uma etiqueta por porta da encomenda. Usa só os 4 campos pedidos: nº de
// referência, cliente, medidas e cor.
//
// O tamanho é fixo em 62 x 28.9mm, horizontal — exatamente o "Formato do papel" (Largura +
// Comprimento) já configurado nas Propriedades de Impressão da Brother QL-800 do utilizador. A
// impressora corta sempre a este comprimento fixo, nunca ao tamanho do documento enviado: uma
// etiqueta mais alta do que isto saía cortada (ou rodada 90º pelo spooler a tentar encaixá-la),
// por isso a etiqueta tem de nascer exatamente a este tamanho em vez de crescer com o conteúdo.
// =========================================================================
const LABEL_WIDTH_MM = 62
const LABEL_HEIGHT_MM = 28.9
const LABEL_BRAND_FONT_SIZE = 7
const LABEL_PORTA_LABEL_FONT_SIZE = 7
const LABEL_PORTA_NUMBER_FONT_SIZE = 15
const LABEL_SIZE_FONT_SIZE = 12
const LABEL_CLIENT_FONT_SIZE = 8
const LABEL_COLOR_FONT_SIZE = 7

export async function buildOrderLabelsPDF(order: Order, copiesPerDoor = 1): Promise<{ doc: jsPDF }> {
  const doorsList = doorsToRender(order)
  const padX = 3
  const maxTextW = LABEL_WIDTH_MM - padX * 2
  const centerX = LABEL_WIDTH_MM / 2
  const clientName = order.client || 'Cliente'

  const doc = new jsPDF({ unit: 'mm', format: [LABEL_WIDTH_MM, LABEL_HEIGHT_MM], orientation: 'landscape' })

  // Estilo pedido pelo utilizador, inspirado na etiqueta física já usada na fábrica: marca
  // IDEALDOOR no topo, "N.º Porta:" com o número em destaque, medidas em números simples e o
  // cliente/cor por baixo — tudo centrado horizontalmente na etiqueta.
  const brandY = 5
  const portaY = 12
  const sizeY = 18.5
  const clientY = 24
  const colorY = 28

  let first = true
  doorsList.forEach((door, doorIndex) => {
    const label = doorNumberLabel(order, doorIndex, doorsList.length)
    for (let i = 0; i < copiesPerDoor; i++) {
      if (!first) doc.addPage()
      first = false

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(LABEL_BRAND_FONT_SIZE)
      doc.setTextColor(21, 33, 38)
      doc.text('IDEALDOOR®', padX, brandY, { charSpace: 0.3 })

      // "N.º Porta: 20461" mistura dois tamanhos de letra numa só linha — para centrar o bloco
      // todo, mede a largura de cada parte primeiro e desenha a partir de um x de arranque comum.
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(LABEL_PORTA_LABEL_FONT_SIZE)
      const portaLabelW = doc.getTextWidth('N.º Porta: ')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(LABEL_PORTA_NUMBER_FONT_SIZE)
      const portaNumberW = doc.getTextWidth(label)
      const portaStartX = centerX - (portaLabelW + portaNumberW) / 2

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(LABEL_PORTA_LABEL_FONT_SIZE)
      doc.setTextColor(60, 68, 64)
      doc.text('N.º Porta:', portaStartX, portaY)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(LABEL_PORTA_NUMBER_FONT_SIZE)
      doc.setTextColor(21, 33, 38)
      doc.text(label, portaStartX + portaLabelW, portaY)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(LABEL_SIZE_FONT_SIZE)
      doc.setTextColor(21, 33, 38)
      const labelDims = finalOpeningDimensions(door)
      doc.text(`${labelDims.widthMm} x ${labelDims.heightMm}`, centerX, sizeY, { align: 'center' })

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(LABEL_CLIENT_FONT_SIZE)
      doc.setTextColor(45, 58, 51)
      doc.text(fitTextWidth(doc, clientName.toUpperCase(), maxTextW), centerX, clientY, { align: 'center' })

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(LABEL_COLOR_FONT_SIZE)
      doc.setTextColor(45, 58, 51)
      doc.text(fitTextWidth(doc, door.colorCode || '—', maxTextW), centerX, colorY, { align: 'center' })
    }
  })

  return { doc }
}

// =========================================================================
// ORÇAMENTO COMERCIAL — documento para o cliente, com preço de cada artigo
// e total, com base na tabela de preços em lib/pricing.ts
// =========================================================================
async function buildQuotePDF(order: Order): Promise<{ doc: jsPDF; fileName: string }> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const [logoDataUrl, doorBadgeDataUrl, catalog] = await Promise.all([
    fetchImageAsDataUrl(LOGO_URL),
    fetchImageAsDataUrl(DOOR_BADGE_URL),
    fetchCatalog(),
  ])
  drawHeaderBranding(doc, logoDataUrl, doorBadgeDataUrl)

  doc.setTextColor(20, 24, 22)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(`ORÇAMENTO: ${order.id}`, pageWidth - 14, 10, { align: 'right' })
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 68, 64)
  doc.text(`Data: ${new Date(order.createdAt).toLocaleDateString('pt-PT')}`, pageWidth - 14, 16, { align: 'right' })

  doc.setDrawColor(20, 24, 22)
  doc.setLineWidth(0.6)
  doc.line(0, 27, pageWidth, 27)

  let currentY = 35
  doc.setTextColor(21, 33, 38)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('ORÇAMENTO', 14, currentY)

  doc.setFillColor(37, 99, 235)
  doc.roundedRect(pageWidth - 46, currentY - 5.5, 32, 6.5, 1.5, 1.5, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.text(`IVA ${Math.round((order.priceIvaRateOverride ?? IVA_RATE) * 100)}% INCL.`, pageWidth - 30, currentY - 1.2, {
    align: 'center',
  })

  currentY += 3.5
  doc.setDrawColor(226, 233, 228)
  doc.setLineWidth(0.4)
  doc.line(14, currentY, pageWidth - 14, currentY)

  // Bloco Resumo do Cliente
  const quoteModelLabels: Record<string, string> = {
    smooth: 'Painel Total Liso',
    ribbed: 'Painel Canelado',
    cassette: 'Painel Almofadado (Cassette)',
  }
  const doorsList = doorsToRender(order)
  currentY += 5
  currentY = drawClientInfoBox(doc, order, currentY, {
    label: 'PORTÃO SECCIONADO',
    value:
      doorsList.length > 1
        ? `${doorsList.length} portas nesta obra`
        : `${quoteModelLabels[order.model] || order.model} · ${order.colorCode} · ${order.widthMm} × ${order.heightMm} mm (${order.area.toFixed(2)} m²)`,
  })

  // Desenho técnico vetorial de cada porta — mesmo desenho usado na Ficha Técnica. Numa obra com
  // mais do que uma porta, cada uma fica na sua própria página.
  doorsList.forEach((door, idx) => {
    if (idx > 0) {
      doc.addPage()
      drawHeaderBranding(doc, logoDataUrl, doorBadgeDataUrl)
      doc.setTextColor(20, 24, 22)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text(`ORÇAMENTO: ${order.id}`, pageWidth - 14, 10, { align: 'right' })
      doc.setDrawColor(20, 24, 22)
      doc.setLineWidth(0.6)
      doc.line(0, 27, pageWidth, 27)
      currentY = 35
    }
    if (doorsList.length > 1) {
      doc.setTextColor(21, 33, 38)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text(
        `PORTA ${idx + 1} DE ${doorsList.length} — ${quoteModelLabels[door.model] || door.model} · ${door.colorCode} · ${door.widthMm} × ${door.heightMm} mm`,
        14,
        currentY
      )
      currentY += 5
    }
    currentY = drawDoorDiagram(doc, door, currentY, doorBadgeDataUrl)
  })

  // Tabela de Preços — soma todas as portas da obra, cada linha identificada por "Porta N"
  if (doorsList.length > 1) {
    doc.addPage()
    drawHeaderBranding(doc, logoDataUrl, doorBadgeDataUrl)
    doc.setTextColor(20, 24, 22)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(`ORÇAMENTO: ${order.id}`, pageWidth - 14, 10, { align: 'right' })
    doc.setDrawColor(20, 24, 22)
    doc.setLineWidth(0.6)
    doc.line(0, 27, pageWidth, 27)
    currentY = 35
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(21, 33, 38)
    doc.text('RESUMO DE PREÇOS — TODAS AS PORTAS', 14, currentY)
    currentY += 6
  }

  const quote = applyPriceOverrides(
    calculateMultiDoorQuote(doorsList.map(doorToPricingInput), catalog),
    order.priceOverrides,
    order.priceTotalOverride,
    order.priceIvaRateOverride
  )

  const money = (v: number | null) => (v == null ? 'Sob consulta' : `${v.toFixed(2)} €`)
  const tableData = quote.items.map((item) => [
    item.label,
    item.edited ? `${item.description} · Preço editado manualmente` : item.description,
    `${item.qty % 1 === 0 ? item.qty : item.qty.toFixed(2)} ${item.unit}`,
    money(item.unitPrice),
    money(item.lineTotal),
  ])

  autoTable(doc, {
    startY: currentY,
    head: [['Artigo', 'Especificação', 'Qtd', 'Preço Unit.', 'Total']],
    body: tableData as any,
    theme: 'grid',
    headStyles: {
      fillColor: [28, 41, 46],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 46],
      cellPadding: 1.6,
    },
    columnStyles: {
      0: { cellWidth: 38, fontStyle: 'bold' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 24, halign: 'right' },
      4: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  })

  let afterTableY = (doc as any).lastAutoTable.finalY + 4

  // Totais — subtotal, IVA e total com IVA
  const totalsBoxH = 20
  doc.setFillColor(233, 247, 238)
  doc.roundedRect(pageWidth - 14 - 70, afterTableY, 70, totalsBoxH, 2, 2, 'F')
  doc.setDrawColor(22, 163, 74)
  doc.roundedRect(pageWidth - 14 - 70, afterTableY, 70, totalsBoxH, 2, 2, 'S')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(60, 75, 68)
  doc.text('Subtotal (sem IVA)', pageWidth - 14 - 66, afterTableY + 5)
  doc.text(`${quote.total.toFixed(2)} €`, pageWidth - 18, afterTableY + 5, { align: 'right' })
  doc.text(`IVA (${Math.round(quote.ivaRate * 100)}%)`, pageWidth - 14 - 66, afterTableY + 9.5)
  doc.text(`${quote.ivaAmount.toFixed(2)} €`, pageWidth - 18, afterTableY + 9.5, { align: 'right' })

  doc.setDrawColor(190, 220, 200)
  doc.setLineWidth(0.2)
  doc.line(pageWidth - 14 - 66, afterTableY + 12, pageWidth - 18, afterTableY + 12)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(21, 33, 38)
  doc.text('TOTAL (com IVA)', pageWidth - 14 - 66, afterTableY + 17)
  doc.setFontSize(12)
  doc.setTextColor(22, 163, 74)
  doc.text(`${quote.totalWithIva.toFixed(2)} €`, pageWidth - 18, afterTableY + 17.3, { align: 'right' })

  afterTableY += totalsBoxH + 4

  if (quote.hasUnpriced) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(180, 83, 9)
    doc.text(
      'Nota: itens marcados "Sob consulta" não têm preço de catálogo definido e não estão incluídos no total acima.',
      14,
      afterTableY
    )
    afterTableY += 5
  }

  if (
    (order.priceOverrides && order.priceOverrides.length > 0) ||
    order.priceTotalOverride != null ||
    order.priceIvaRateOverride != null
  ) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(180, 83, 9)
    doc.text(`Nota: ${PRICE_EDITED_NOTE}`, 14, afterTableY)
    afterTableY += 5
  }

  // Observações
  if (order.notes && order.notes.trim()) {
    const notesLines = doc.splitTextToSize(order.notes.trim(), pageWidth - 28 - 8)
    const notesBoxH = 9 + notesLines.length * 3.6

    doc.setFillColor(255, 251, 235)
    doc.roundedRect(14, afterTableY, pageWidth - 28, notesBoxH, 2, 2, 'F')
    doc.setDrawColor(245, 220, 150)
    doc.roundedRect(14, afterTableY, pageWidth - 28, notesBoxH, 2, 2, 'S')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(146, 100, 6)
    doc.text('OBSERVAÇÕES:', 18, afterTableY + 5)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(90, 70, 20)
    doc.setFontSize(7.5)
    doc.text(notesLines, 18, afterTableY + 9.5)

    afterTableY += notesBoxH + 4
  }

  // Validade e condições
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(90, 100, 95)
  doc.text(
    `Orçamento válido por 30 dias. Valores sujeitos a confirmação após visita técnica ao local. Total inclui IVA à taxa de ${Math.round(
      quote.ivaRate * 100
    )}%.`,
    14,
    afterTableY + 4
  )

  const signY = afterTableY + 10
  doc.line(18, signY + 7, 78, signY + 7)
  doc.text('Pela Automatismos Lousada, Lda', 18, signY + 10.5)

  doc.line(pageWidth - 78, signY + 7, pageWidth - 18, signY + 7)
  doc.text('Aceitação do Cliente / Adjudicação', pageWidth - 78, signY + 10.5)

  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setFontSize(6.5)
    doc.setTextColor(140, 150, 145)
    doc.text(
      `Documento emitido eletronicamente pela Automatismos Lousada · ${new Date().toLocaleString('pt-PT')}${
        totalPages > 1 ? ` · Página ${p}/${totalPages}` : ''
      }`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    )
  }

  const safeClientName = (order.client || 'Cliente').replace(/[^a-zA-Z0-9_-]/g, '_')
  const fileName = `Orcamento_${order.id}_${safeClientName}.pdf`
  return { doc, fileName }
}

export async function generateQuotePDF(order: Order) {
  const { doc, fileName } = await buildQuotePDF(order)
  doc.save(fileName)
}

// =========================================================================
// PEDIDO DE OUTROS ARTIGOS — igual em espírito à Ficha Técnica/Orçamento, mas sem desenho
// técnico (não há porta nenhuma envolvida): só o cabeçalho, o cliente e a tabela de artigos.
// =========================================================================
async function buildStockOrderPDF(order: StockOrder): Promise<{ doc: jsPDF; fileName: string }> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const [logoDataUrl, doorBadgeDataUrl] = await Promise.all([
    fetchImageAsDataUrl(LOGO_URL),
    fetchImageAsDataUrl(DOOR_BADGE_URL),
  ])
  drawHeaderBranding(doc, logoDataUrl, doorBadgeDataUrl)

  doc.setTextColor(20, 24, 22)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(`REF: ${order.id}`, pageWidth - 14, 10, { align: 'right' })
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 68, 64)
  doc.text(`Data: ${new Date(order.createdAt).toLocaleDateString('pt-PT')}`, pageWidth - 14, 16, { align: 'right' })

  doc.setDrawColor(20, 24, 22)
  doc.setLineWidth(0.6)
  doc.line(0, 27, pageWidth, 27)

  let currentY = 35
  doc.setTextColor(21, 33, 38)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('PEDIDO DE ARTIGOS', 14, currentY)

  currentY += 3.5
  doc.setDrawColor(226, 233, 228)
  doc.setLineWidth(0.4)
  doc.line(14, currentY, pageWidth - 14, currentY)

  currentY += 5
  currentY = drawClientInfoBox(doc, order, currentY, {
    label: 'ARTIGOS',
    value: `${order.items.length} artigo${order.items.length > 1 ? 's' : ''} neste pedido`,
  })

  const money = (v?: number) => (v == null ? 'Sob consulta' : `${v.toFixed(2)} €`)
  const tableData = order.items.map((item) => {
    const qty =
      item.unit === 'm'
        ? item.meters != null
          ? `${item.quantity} × ${item.meters} m`
          : `${item.quantity} m`
        : item.unit === 'm2'
        ? item.squareMeters != null
          ? item.widthMm && item.heightMm
            ? `${item.quantity} × ${item.widthMm}×${item.heightMm} mm (${item.squareMeters.toLocaleString('pt-PT', { maximumFractionDigits: 3 })} m²)`
            : `${item.quantity} × ${item.squareMeters} m²`
          : `${item.quantity} m²`
        : `${item.quantity} un`
    const unitSuffix = item.unitPrice != null ? (item.unit === 'm' ? '/m' : item.unit === 'm2' ? '/m²' : '') : ''
    return [item.productName, qty, `${money(item.unitPrice)}${unitSuffix}`, money(item.lineTotal)]
  })

  autoTable(doc, {
    startY: currentY,
    head: [['Artigo', 'Qtd', 'Preço Unit.', 'Total']],
    body: tableData as any,
    theme: 'grid',
    headStyles: {
      fillColor: [28, 41, 46],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'left',
    },
    bodyStyles: { fontSize: 7.5, textColor: [30, 41, 46], cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 'auto', fontStyle: 'bold' },
      1: { cellWidth: 18, halign: 'center' },
      2: { cellWidth: 28, halign: 'right' },
      3: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  })

  let afterTableY = (doc as any).lastAutoTable.finalY + 4
  const hasUnpriced = order.items.some((i) => i.unitPrice == null)
  const ivaAmount = order.totalPrice * IVA_RATE
  const totalWithIva = order.totalPrice + ivaAmount

  const totalsBoxH = 20
  doc.setFillColor(233, 247, 238)
  doc.roundedRect(pageWidth - 14 - 70, afterTableY, 70, totalsBoxH, 2, 2, 'F')
  doc.setDrawColor(22, 163, 74)
  doc.roundedRect(pageWidth - 14 - 70, afterTableY, 70, totalsBoxH, 2, 2, 'S')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(60, 75, 68)
  doc.text('Subtotal (sem IVA)', pageWidth - 14 - 66, afterTableY + 5)
  doc.text(`${order.totalPrice.toFixed(2)} €`, pageWidth - 18, afterTableY + 5, { align: 'right' })
  doc.text(`IVA (${Math.round(IVA_RATE * 100)}%)`, pageWidth - 14 - 66, afterTableY + 9.5)
  doc.text(`${ivaAmount.toFixed(2)} €`, pageWidth - 18, afterTableY + 9.5, { align: 'right' })

  doc.setDrawColor(190, 220, 200)
  doc.setLineWidth(0.2)
  doc.line(pageWidth - 14 - 66, afterTableY + 12, pageWidth - 18, afterTableY + 12)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(21, 33, 38)
  doc.text('TOTAL (com IVA)', pageWidth - 14 - 66, afterTableY + 17)
  doc.setFontSize(12)
  doc.setTextColor(22, 163, 74)
  doc.text(`${totalWithIva.toFixed(2)} €`, pageWidth - 18, afterTableY + 17.3, { align: 'right' })

  afterTableY += totalsBoxH + 4

  if (hasUnpriced) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(180, 83, 9)
    doc.text(
      'Nota: artigos marcados "Sob consulta" não têm preço de catálogo definido e não estão incluídos no total acima.',
      14,
      afterTableY
    )
    afterTableY += 5
  }

  if (order.notes && order.notes.trim()) {
    const notesLines = doc.splitTextToSize(order.notes.trim(), pageWidth - 28 - 8)
    const notesBoxH = 9 + notesLines.length * 3.6

    doc.setFillColor(255, 251, 235)
    doc.roundedRect(14, afterTableY, pageWidth - 28, notesBoxH, 2, 2, 'F')
    doc.setDrawColor(245, 220, 150)
    doc.roundedRect(14, afterTableY, pageWidth - 28, notesBoxH, 2, 2, 'S')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(146, 100, 6)
    doc.text('OBSERVAÇÕES:', 18, afterTableY + 5)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(90, 70, 20)
    doc.setFontSize(7.5)
    doc.text(notesLines, 18, afterTableY + 9.5)

    afterTableY += notesBoxH + 4
  }

  const signY = afterTableY + 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(90, 100, 95)
  doc.line(18, signY + 7, 78, signY + 7)
  doc.text('Pela Automatismos Lousada, Lda', 18, signY + 10.5)

  doc.line(pageWidth - 78, signY + 7, pageWidth - 18, signY + 7)
  doc.text('Aceitação do Cliente / Adjudicação', pageWidth - 78, signY + 10.5)

  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setFontSize(6.5)
    doc.setTextColor(140, 150, 145)
    doc.text(
      `Documento emitido eletronicamente pela Automatismos Lousada · ${new Date().toLocaleString('pt-PT')}${
        totalPages > 1 ? ` · Página ${p}/${totalPages}` : ''
      }`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    )
  }

  const safeClientName = (order.client || 'Cliente').replace(/[^a-zA-Z0-9_-]/g, '_')
  const fileName = `PedidoArtigos_${order.id}_${safeClientName}.pdf`
  return { doc, fileName }
}

export async function generateStockOrderPDF(order: StockOrder) {
  const { doc, fileName } = await buildStockOrderPDF(order)
  doc.save(fileName)
}

export async function getStockOrderPDFBase64(order: StockOrder): Promise<{ dataUri: string; fileName: string }> {
  const { doc, fileName } = await buildStockOrderPDF(order)
  return { dataUri: doc.output('datauristring'), fileName }
}

// Devolve o PDF já gerado como data URI (sem acionar o download no browser) — usado para
// anexar o mesmo documento a um email.
export async function getQuotePDFBase64(order: Order): Promise<{ dataUri: string; fileName: string }> {
  const { doc, fileName } = await buildQuotePDF(order)
  return { dataUri: doc.output('datauristring'), fileName }
}
