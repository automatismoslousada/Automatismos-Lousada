'use client'

import { useEffect, useMemo, useState } from 'react'
import { Door3D } from '@/components/door-3d'
import {
  CatalogCategory,
  CatalogItem,
  Client,
  DoorConfig,
  Order,
  OrderStatus,
  StockCategory,
  StockOrder,
  StockProduct,
  StockProductUnit,
} from '@/lib/types'
import {
  generateOrderPDF,
  generateQuotePDF,
  generateStockOrderPDF,
  getOrderPDFBase64,
  getQuotePDFBase64,
  getStockOrderPDFBase64,
} from '@/lib/pdf-generator'
import {
  applyPriceOverrides,
  calculateQuote,
  calculateMultiDoorQuote,
  isQuoteEdited,
  IVA_RATE,
  PRICE_EDITED_NOTE,
  type PricingInput,
} from '@/lib/pricing'
import { finalOpeningDimensions } from '@/lib/production'
import {
  ArrowRight,
  Boxes,
  Check,
  ChevronLeft,
  ChevronRight,
  Contact,
  DoorClosed,
  Download,
  Euro,
  Eye,
  FileDown,
  Gauge,
  Info,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  Menu,
  Minus,
  Package,
  Plus,
  RotateCcw,
  Ruler,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  UserRound,
  X,
} from 'lucide-react'
import { User, UserRole } from '@/lib/types'

const diagramUrl = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-9HUUPqJnSoSP88WhgNivTwVv2EQLSb.png'
const doorBadgeUrl = 'https://i.imgur.com/YZGkZR2.png'

function doorConfigToPricingInput(d: DoorConfig): PricingInput {
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

// Cores RAL
const ralColors = [
  ['RAL 1000', 'Verde bege', '#cdbd88'],
  ['RAL 1001', 'Bege', '#d0b084'],
  ['RAL 1002', 'Amarelo areia', '#d2aa6d'],
  ['RAL 1003', 'Amarelo sinal', '#f9a800'],
  ['RAL 1004', 'Amarelo ouro', '#e49e00'],
  ['RAL 1013', 'Branco pérola', '#e9e5ce'],
  ['RAL 1015', 'Marfim claro', '#eadebd'],
  ['RAL 1021', 'Amarelo colza', '#f6b600'],
  ['RAL 1023', 'Amarelo trânsito', '#f7b500'],
  ['RAL 2004', 'Laranja puro', '#e25304'],
  ['RAL 3000', 'Vermelho fogo', '#a52019'],
  ['RAL 3002', 'Vermelho carmim', '#a2231d'],
  ['RAL 3011', 'Vermelho castanho', '#781f19'],
  ['RAL 3020', 'Vermelho trânsito', '#c1121c'],
  ['RAL 4003', 'Violeta urze', '#c4618c'],
  ['RAL 4005', 'Azul lilás', '#316ab0'],
  ['RAL 5002', 'Azul ultramarino', '#00387b'],
  ['RAL 5005', 'Azul sinal', '#005387'],
  ['RAL 5010', 'Azul genciana', '#004f7c'],
  ['RAL 5015', 'Azul céu', '#2874b2'],
  ['RAL 5017', 'Azul trânsito', '#063971'],
  ['RAL 6001', 'Verde esmeralda', '#366735'],
  ['RAL 6005', 'Verde musgo', '#114232'],
  ['RAL 6011', 'Verde reseda', '#6c7c59'],
  ['RAL 6018', 'Verde amarelado', '#57a639'],
  ['RAL 6024', 'Verde trânsito', '#008351'],
  ['RAL 7000', 'Cinzento esquilo', '#78858b'],
  ['RAL 7011', 'Cinzento ferro', '#51585c'],
  ['RAL 7012', 'Cinzento basalto', '#575d5e'],
  ['RAL 7015', 'Cinzento ardósia', '#51565c'],
  ['RAL 7016', 'Cinzento antracite', '#383e42'],
  ['RAL 7021', 'Cinzento preto', '#2f3234'],
  ['RAL 7022', 'Cinzento sombra', '#4b4d46'],
  ['RAL 7024', 'Cinzento grafite', '#474a51'],
  ['RAL 7035', 'Cinzento claro', '#c5c7c4'],
  ['RAL 7037', 'Cinzento poeira', '#7a7b7a'],
  ['RAL 7038', 'Cinzento ágata', '#b4b8b0'],
  ['RAL 7040', 'Cinzento janela', '#9da3a6'],
  ['RAL 7042', 'Cinzento trânsito A', '#8f9695'],
  ['RAL 8011', 'Castanho noz', '#5b3a29'],
  ['RAL 8014', 'Castanho sépia', '#49392d'],
  ['RAL 8017', 'Castanho chocolate', '#45322e'],
  ['RAL 9001', 'Branco creme', '#e9e5d6'],
  ['RAL 9002', 'Branco cinzento', '#d7d5cb'],
  ['RAL 9003', 'Branco sinal', '#f4f4f4'],
  ['RAL 9005', 'Preto intenso', '#0a0a0a'],
  ['RAL 9006', 'Alumínio branco', '#a5a8a6'],
  ['RAL 9007', 'Alumínio cinzento', '#8f8f8c'],
  ['RAL 9010', 'Branco puro', '#f1f0ea'],
  ['RAL 9016', 'Branco trânsito', '#f7f7f7'],
  ['RAL 9022', 'Cinzento claro pérola', '#9c9c9c'],
].map(([code, name, value]) => ({ code, name, value }))

const ralByCode = Object.fromEntries(ralColors.map((color) => [color.code, color]))

// Tabela completa RAL Classic (~200 cores), usada só para o campo "Outro RAL" —
// permite mostrar uma cor aproximada real mesmo para códigos fora da paleta de amostras acima.
const ralClassicFull = [
  ['RAL 1000', 'Verde bege', '#CDBA88'],
  ['RAL 1001', 'Bege', '#D0B084'],
  ['RAL 1002', 'Amarelo areia', '#D2AA6D'],
  ['RAL 1003', 'Amarelo sinal', '#F9A800'],
  ['RAL 1004', 'Amarelo ouro', '#E49E00'],
  ['RAL 1005', 'Amarelo mel', '#CB8E00'],
  ['RAL 1006', 'Amarelo milho', '#E29000'],
  ['RAL 1007', 'Amarelo narciso', '#E88C00'],
  ['RAL 1011', 'Bege castanho', '#AF804F'],
  ['RAL 1012', 'Amarelo limão', '#DDAF27'],
  ['RAL 1013', 'Branco ostra', '#E3D9C6'],
  ['RAL 1014', 'Marfim', '#DDC49A'],
  ['RAL 1015', 'Marfim claro', '#E6D2B5'],
  ['RAL 1016', 'Amarelo enxofre', '#F1DD38'],
  ['RAL 1017', 'Amarelo açafrão', '#F6A950'],
  ['RAL 1018', 'Amarelo zinco', '#FACA30'],
  ['RAL 1019', 'Bege cinzento', '#A48F7A'],
  ['RAL 1020', 'Amarelo oliva', '#A08F65'],
  ['RAL 1021', 'Amarelo colza', '#F6B600'],
  ['RAL 1023', 'Amarelo trânsito', '#F7B500'],
  ['RAL 1024', 'Amarelo ocre', '#BA8F4C'],
  ['RAL 1026', 'Amarelo luminoso', '#FFFF00'],
  ['RAL 1027', 'Caril', '#A77F0E'],
  ['RAL 1028', 'Amarelo melão', '#FF9B00'],
  ['RAL 1032', 'Amarelo giesta', '#E2A300'],
  ['RAL 1033', 'Amarelo dália', '#F99A1C'],
  ['RAL 1034', 'Amarelo pastel', '#EB9C52'],
  ['RAL 1035', 'Bege pérola', '#908370'],
  ['RAL 1036', 'Ouro pérola', '#80643F'],
  ['RAL 1037', 'Amarelo solar', '#F09200'],
  ['RAL 2000', 'Laranja amarelado', '#DD7907'],
  ['RAL 2001', 'Laranja avermelhado', '#BE4E20'],
  ['RAL 2002', 'Vermelhão', '#C63927'],
  ['RAL 2003', 'Laranja pastel', '#FA842B'],
  ['RAL 2004', 'Laranja puro', '#E75B12'],
  ['RAL 2005', 'Laranja luminoso', '#FF2300'],
  ['RAL 2007', 'Laranja brilhante luminoso', '#FFA421'],
  ['RAL 2008', 'Vermelho-laranja brilhante', '#F3752C'],
  ['RAL 2009', 'Laranja trânsito', '#E15501'],
  ['RAL 2010', 'Laranja sinal', '#D4652F'],
  ['RAL 2011', 'Laranja profundo', '#EC7C25'],
  ['RAL 2012', 'Laranja salmão', '#DB6A50'],
  ['RAL 2013', 'Laranja pérola', '#954527'],
  ['RAL 2017', 'Laranja RAL', '#FA4402'],
  ['RAL 3000', 'Vermelho fogo', '#AB2524'],
  ['RAL 3001', 'Vermelho sinal', '#A02128'],
  ['RAL 3002', 'Vermelho carmim', '#A1232B'],
  ['RAL 3003', 'Vermelho rubi', '#8D1D2C'],
  ['RAL 3004', 'Vermelho púrpura', '#701F29'],
  ['RAL 3005', 'Vermelho vinho', '#5E2028'],
  ['RAL 3007', 'Vermelho preto', '#402225'],
  ['RAL 3009', 'Vermelho óxido', '#703731'],
  ['RAL 3011', 'Vermelho castanho', '#7E292C'],
  ['RAL 3012', 'Vermelho bege', '#CB8D73'],
  ['RAL 3013', 'Vermelho tomate', '#9C322E'],
  ['RAL 3014', 'Rosa antigo', '#D47479'],
  ['RAL 3015', 'Rosa claro', '#E1A6AD'],
  ['RAL 3016', 'Vermelho coral', '#AC4034'],
  ['RAL 3017', 'Rosa', '#D3545F'],
  ['RAL 3018', 'Vermelho morango', '#D14152'],
  ['RAL 3020', 'Vermelho trânsito', '#C1121C'],
  ['RAL 3022', 'Rosa salmão', '#D56D56'],
  ['RAL 3024', 'Vermelho luminoso', '#F70000'],
  ['RAL 3026', 'Vermelho brilhante luminoso', '#FF0000'],
  ['RAL 3027', 'Vermelho framboesa', '#B42041'],
  ['RAL 3028', 'Vermelho puro', '#E72512'],
  ['RAL 3031', 'Vermelho oriente', '#AC323B'],
  ['RAL 3032', 'Vermelho rubi pérola', '#711521'],
  ['RAL 3033', 'Rosa pérola', '#B24C43'],
  ['RAL 4001', 'Lilás avermelhado', '#8A5A83'],
  ['RAL 4002', 'Violeta avermelhado', '#933D50'],
  ['RAL 4003', 'Violeta urze', '#D15B8F'],
  ['RAL 4004', 'Violeta bordô', '#691639'],
  ['RAL 4005', 'Azul lilás', '#83639D'],
  ['RAL 4006', 'Púrpura trânsito', '#992572'],
  ['RAL 4007', 'Violeta púrpura', '#4A203B'],
  ['RAL 4008', 'Violeta sinal', '#904684'],
  ['RAL 4009', 'Violeta pastel', '#A38995'],
  ['RAL 4010', 'Telemagenta', '#C63678'],
  ['RAL 4011', 'Violeta pérola', '#8773A1'],
  ['RAL 4012', 'Amora pérola', '#6B6880'],
  ['RAL 5000', 'Azul violeta', '#384C70'],
  ['RAL 5001', 'Azul esverdeado', '#1F4764'],
  ['RAL 5002', 'Azul ultramarino', '#2B2C7C'],
  ['RAL 5003', 'Azul safira', '#2A3756'],
  ['RAL 5004', 'Azul preto', '#1D1F2A'],
  ['RAL 5005', 'Azul sinal', '#154889'],
  ['RAL 5007', 'Azul brilhante', '#41678D'],
  ['RAL 5008', 'Azul cinzento', '#313C48'],
  ['RAL 5009', 'Azul azurita', '#2E5978'],
  ['RAL 5010', 'Azul genciana', '#13447C'],
  ['RAL 5011', 'Azul aço', '#232C3F'],
  ['RAL 5012', 'Azul claro', '#3481B8'],
  ['RAL 5013', 'Azul cobalto', '#232D53'],
  ['RAL 5014', 'Azul pombo', '#6C7C98'],
  ['RAL 5015', 'Azul céu', '#2874B2'],
  ['RAL 5017', 'Azul trânsito', '#0E518D'],
  ['RAL 5018', 'Azul turquesa', '#21888F'],
  ['RAL 5019', 'Azul capri', '#1A5784'],
  ['RAL 5020', 'Azul oceano', '#0B4151'],
  ['RAL 5021', 'Azul água', '#07737A'],
  ['RAL 5022', 'Azul noite', '#2F2A5A'],
  ['RAL 5023', 'Azul distante', '#4D668E'],
  ['RAL 5024', 'Azul pastel', '#6A93B0'],
  ['RAL 5025', 'Azul genciana pérola', '#296478'],
  ['RAL 5026', 'Azul noite pérola', '#102C54'],
  ['RAL 6000', 'Verde pátina', '#327662'],
  ['RAL 6001', 'Verde esmeralda', '#28713E'],
  ['RAL 6002', 'Verde folha', '#276235'],
  ['RAL 6003', 'Verde oliva', '#4B573E'],
  ['RAL 6004', 'Verde azulado', '#0E4243'],
  ['RAL 6005', 'Verde musgo', '#0F4336'],
  ['RAL 6006', 'Oliva cinzento', '#40433B'],
  ['RAL 6007', 'Verde garrafa', '#283424'],
  ['RAL 6008', 'Verde castanho', '#35382E'],
  ['RAL 6009', 'Verde abeto', '#26392F'],
  ['RAL 6010', 'Verde relva', '#3E753B'],
  ['RAL 6011', 'Verde reseda', '#68825B'],
  ['RAL 6012', 'Verde preto', '#31403D'],
  ['RAL 6013', 'Verde junco', '#797C5A'],
  ['RAL 6014', 'Oliva amarelado', '#444337'],
  ['RAL 6015', 'Oliva preto', '#3D403A'],
  ['RAL 6016', 'Verde turquesa', '#026A52'],
  ['RAL 6017', 'Verde maio', '#468641'],
  ['RAL 6018', 'Verde amarelado', '#48A43F'],
  ['RAL 6019', 'Verde pastel', '#B7D9B1'],
  ['RAL 6020', 'Verde crómio', '#354733'],
  ['RAL 6021', 'Verde pálido', '#86A47C'],
  ['RAL 6022', 'Castanho oliva', '#3E3C32'],
  ['RAL 6024', 'Verde trânsito', '#008754'],
  ['RAL 6025', 'Verde feto', '#53753C'],
  ['RAL 6026', 'Verde opala', '#005D52'],
  ['RAL 6027', 'Verde claro', '#81C0BB'],
  ['RAL 6028', 'Verde pinheiro', '#2D5546'],
  ['RAL 6029', 'Verde menta', '#007243'],
  ['RAL 6032', 'Verde sinal', '#0F8558'],
  ['RAL 6033', 'Turquesa menta', '#478A84'],
  ['RAL 6034', 'Turquesa pastel', '#7FB0B2'],
  ['RAL 6035', 'Verde pérola', '#1B542C'],
  ['RAL 6036', 'Verde opala pérola', '#005D4C'],
  ['RAL 6037', 'Verde puro', '#25E712'],
  ['RAL 6038', 'Verde luminoso', '#00F700'],
  ['RAL 7000', 'Cinzento esquilo', '#7E8B92'],
  ['RAL 7001', 'Cinzento prata', '#8F999F'],
  ['RAL 7002', 'Cinzento oliva', '#817F68'],
  ['RAL 7003', 'Cinzento musgo', '#7A7B6D'],
  ['RAL 7004', 'Cinzento sinal', '#9EA0A1'],
  ['RAL 7005', 'Cinzento rato', '#6B716F'],
  ['RAL 7006', 'Cinzento bege', '#756F61'],
  ['RAL 7008', 'Cinzento cáqui', '#746643'],
  ['RAL 7009', 'Cinzento esverdeado', '#5B6259'],
  ['RAL 7010', 'Cinzento lona', '#575D57'],
  ['RAL 7011', 'Cinzento ferro', '#555D61'],
  ['RAL 7012', 'Cinzento basalto', '#596163'],
  ['RAL 7013', 'Cinzento castanho', '#555548'],
  ['RAL 7015', 'Cinzento ardósia', '#51565C'],
  ['RAL 7016', 'Cinzento antracite', '#373F43'],
  ['RAL 7021', 'Cinzento preto', '#2E3234'],
  ['RAL 7022', 'Cinzento sombra', '#4B4D46'],
  ['RAL 7023', 'Cinzento betão', '#818479'],
  ['RAL 7024', 'Cinzento grafite', '#474A50'],
  ['RAL 7026', 'Cinzento granito', '#374447'],
  ['RAL 7030', 'Cinzento pedra', '#939388'],
  ['RAL 7031', 'Cinzento azulado', '#5D6970'],
  ['RAL 7032', 'Cinzento seixo', '#B9B9A8'],
  ['RAL 7033', 'Cinzento cimento', '#818979'],
  ['RAL 7034', 'Cinzento amarelado', '#939176'],
  ['RAL 7035', 'Cinzento claro', '#CBD0CC'],
  ['RAL 7036', 'Cinzento platina', '#9A9697'],
  ['RAL 7037', 'Cinzento poeira', '#7C7F7E'],
  ['RAL 7038', 'Cinzento ágata', '#B4B8B0'],
  ['RAL 7039', 'Cinzento quartzo', '#6B695F'],
  ['RAL 7040', 'Cinzento janela', '#9DA3A6'],
  ['RAL 7042', 'Cinzento trânsito A', '#8F9695'],
  ['RAL 7043', 'Cinzento trânsito B', '#4E5451'],
  ['RAL 7044', 'Cinzento seda', '#BDBDB2'],
  ['RAL 7045', 'Telegrey 1', '#91969A'],
  ['RAL 7046', 'Telegrey 2', '#82898E'],
  ['RAL 7047', 'Telegrey 4', '#CFD0CF'],
  ['RAL 7048', 'Cinzento rato pérola', '#888175'],
  ['RAL 8000', 'Castanho verde', '#887142'],
  ['RAL 8001', 'Castanho ocre', '#9C6B30'],
  ['RAL 8002', 'Castanho sinal', '#7B5141'],
  ['RAL 8003', 'Castanho argila', '#80542F'],
  ['RAL 8004', 'Castanho cobre', '#8F4E35'],
  ['RAL 8007', 'Castanho fulvo', '#6F4A2F'],
  ['RAL 8008', 'Castanho oliva', '#6F4F28'],
  ['RAL 8011', 'Castanho noz', '#5A3A29'],
  ['RAL 8012', 'Castanho vermelho', '#673831'],
  ['RAL 8014', 'Castanho sépia', '#49392D'],
  ['RAL 8015', 'Castanho maroon', '#633A34'],
  ['RAL 8016', 'Castanho mogno', '#4C2F26'],
  ['RAL 8017', 'Castanho chocolate', '#44322D'],
  ['RAL 8019', 'Castanho cinzento', '#3F3A3A'],
  ['RAL 8022', 'Castanho preto', '#211F20'],
  ['RAL 8023', 'Castanho laranja', '#A65E2F'],
  ['RAL 8024', 'Castanho bege', '#79553C'],
  ['RAL 8025', 'Castanho pálido', '#755C49'],
  ['RAL 8028', 'Castanho terra', '#4E3B2B'],
  ['RAL 8029', 'Cobre pérola', '#773C27'],
  ['RAL 9001', 'Branco creme', '#EFEBDC'],
  ['RAL 9002', 'Branco cinzento', '#DDDED4'],
  ['RAL 9003', 'Branco sinal', '#F4F8F4'],
  ['RAL 9004', 'Preto sinal', '#2E3032'],
  ['RAL 9005', 'Preto intenso', '#0A0A0D'],
  ['RAL 9006', 'Alumínio branco', '#A5A8A6'],
  ['RAL 9007', 'Alumínio cinzento', '#8F8F8C'],
  ['RAL 9010', 'Branco puro', '#F7F9EF'],
  ['RAL 9011', 'Preto grafite', '#1C1C1C'],
  ['RAL 9012', 'Branco sala limpa', '#FFFDE6'],
  ['RAL 9016', 'Branco trânsito', '#F7FBF5'],
  ['RAL 9017', 'Preto trânsito', '#2A2D2F'],
  ['RAL 9018', 'Branco papiro', '#CFD3CD'],
  ['RAL 9022', 'Cinzento claro pérola', '#858583'],
  ['RAL 9023', 'Cinzento escuro pérola', '#7E8182'],
].map(([code, name, value]) => ({ code, name, value }))

const ralClassicByCode = Object.fromEntries(ralClassicFull.map((color) => [color.code, color]))

// 2 TIPOS DE PAINEL DE PORTA
const modelOptions = [
  { value: 'smooth', label: 'PAINEL TOTAL LISO (Sem relevos)' },
  { value: 'ribbed', label: 'PAINEL CANELADO (Com ranhuras horizontais)' },
]

// As restantes listas de opções (cores, tubos, padieiras, portas de serviço, extras,
// montagens, automatismos e calhas) já não estão fixas aqui — vêm do catálogo editável em
// /api/catalog (ver painel "Catálogo", admin) e são derivadas dentro do Configurator a partir
// do estado `catalog` (hook useCatalog, mais abaixo).

// Carrega o catálogo de opções do configurador (usado tanto no Configurator para montar os
// menus, como no painel "Catálogo" para o CRUD). `refetch` é exposto para o painel de admin
// poder atualizar a lista localmente a seguir a criar/editar/eliminar um item.
function useCatalog() {
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)

  const refetch = async () => {
    try {
      const res = await fetch('/api/catalog')
      const data = await res.json()
      if (data.success) setCatalog(data.items)
    } catch (err) {
      console.error('Erro ao carregar catálogo', err)
    } finally {
      setCatalogLoading(false)
    }
  }

  useEffect(() => {
    refetch()
  }, [])

  return { catalog, catalogLoading, refetchCatalog: refetch }
}

function sortedCatalog(catalog: CatalogItem[], category: CatalogCategory): CatalogItem[] {
  return catalog
    .filter((item) => item.category === category && item.active)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="size-10 overflow-hidden rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-black/5">
        <img src="/icon.png" alt="Automatismos Lousada" className="size-full object-contain" />
      </div>
      {!compact && (
        <div className="leading-none">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#16a34a]">Automatismos</p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.24em] text-[#ef1c2d]">Lousada</p>
        </div>
      )}
      <span className="mx-1 h-9 w-px bg-[#e0e8e3]" />
      <img src={doorBadgeUrl} alt="IDEALDOOR" className="h-11 w-auto object-contain" />
    </div>
  )
}

type EmailTarget = { order: Order; kind: 'encomenda' | 'orcamento' } | null

// Modal partilhado para enviar a Ficha Técnica ou o Orçamento por email — usado tanto no
// configurador (modal de sucesso) como em Gestão de Encomendas (tabela e detalhe).
function SendEmailModal({ target, onClose }: { target: EmailTarget; onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (target) {
      setEmail(target.order.clientEmail || '')
      setError('')
      setSent(false)
    }
  }, [target])

  if (!target) return null
  const { order, kind } = target
  const label = kind === 'orcamento' ? 'Orçamento' : 'Ficha Técnica (Encomenda)'

  const handleSend = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Indique um email válido.')
      return
    }
    setSending(true)
    setError('')
    try {
      const { dataUri, fileName } =
        kind === 'orcamento' ? await getQuotePDFBase64(order) : await getOrderPDFBase64(order)
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          kind,
          orderId: order.id,
          client: order.client,
          pdfDataUri: dataUri,
          fileName,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSent(true)
      } else {
        setError(data.error || 'Erro ao enviar o email.')
      }
    } catch (err) {
      console.error(err)
      setError('Erro ao gerar ou enviar o PDF.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {sent ? (
          <>
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-[#e9f7ee] text-[#16a34a]">
              <Check className="size-7" />
            </div>
            <h3 className="text-center text-base font-bold text-[#152126]">Email enviado!</h3>
            <p className="mt-1 text-center text-xs text-[#738079]">
              {label} {order.id} enviada para <b>{email}</b>.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 flex h-10 w-full items-center justify-center rounded-xl bg-[#16a34a] text-xs font-bold text-white hover:bg-[#12883d]"
            >
              Fechar
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-[#e9f7ee] text-[#16a34a]">
              <Mail className="size-6" />
            </div>
            <h3 className="text-center text-base font-bold text-[#152126]">Enviar por Email</h3>
            <p className="mt-1 text-center text-xs text-[#738079]">
              {label} {order.id} {order.client ? `· ${order.client}` : ''}
            </p>
            <label className="mt-4 flex flex-col gap-1.5 text-xs font-bold text-[#2d3a33]">
              Email de destino
              <input
                type="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@exemplo.pt"
                className="h-10 rounded-lg border border-[#dce5df] px-3 text-sm font-normal outline-none focus:border-[#16a34a]"
              />
            </label>
            {error && <p className="mt-2 text-xs font-semibold text-red-500">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-gray-300 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={sending}
                onClick={handleSend}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#16a34a] py-2.5 text-xs font-bold text-white hover:bg-[#12883d] disabled:opacity-70"
              >
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                {sending ? 'A enviar...' : 'Enviar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Navegação entre as 5 páginas principais (Configurador, Gestão de Encomendas, Carteira de
// Clientes, Outros Artigos, Definições) — um único conjunto de callbacks passado a todas, para a
// barra de navegação poder ser sempre a mesma em qualquer página, em vez de cada uma ter a sua
// própria versão (o que a deixava a "mudar" ao navegar, incluindo desaparecer de todo nalgumas).
type NavCallbacks = {
  onEncomenda: () => void
  onOrcamento: () => void
  onOrders: () => void
  onClients: () => void
  onStock: () => void
  onUsers: () => void
  onCatalog: () => void
  onAnalytics: () => void
  onSettings: () => void
  onLogout: () => void
}

type NavActive = 'encomenda' | 'orcamento' | 'orders' | 'clients' | 'stock' | 'users' | 'catalog' | 'analytics' | 'settings'

function TopNav({ user, active, nav }: { user: User; active: NavActive; nav: NavCallbacks }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  // Comercial e Cliente (operador) também acedem a "Gestão de Encomendas" — só não veem lá preços,
  // estado editável nem eliminar (ver Admin/canManage); é lá que consultam o histórico próprio.
  const canAccessOrders = user.role === 'admin' || user.role === 'comercial' || user.role === 'operador'
  const isAdmin = user.role === 'admin'
  const canSeeClients = user.role !== 'operador'

  const items: { key: NavActive; label: string; onClick: () => void; show: boolean }[] = [
    { key: 'encomenda', label: '📦 Nova Encomenda', onClick: nav.onEncomenda, show: true },
    { key: 'orcamento', label: '💶 Pedir Orçamento', onClick: nav.onOrcamento, show: true },
    { key: 'orders', label: '📋 Gestão de Encomendas', onClick: nav.onOrders, show: canAccessOrders },
    { key: 'clients', label: '👛 Carteira de Clientes', onClick: nav.onClients, show: canSeeClients },
    { key: 'stock', label: '🧰 Outros Artigos', onClick: nav.onStock, show: true },
    { key: 'users', label: '👥 Utilizadores', onClick: nav.onUsers, show: isAdmin },
    { key: 'catalog', label: '🎨 Catálogo', onClick: nav.onCatalog, show: isAdmin },
    { key: 'analytics', label: '📊 Análises', onClick: nav.onAnalytics, show: isAdmin },
  ]
  const visibleItems = items.filter((i) => i.show)

  return (
    <>
      <header className="flex h-[72px] items-center justify-between border-b border-[#e2e9e4] bg-white px-5 sm:px-8">
        <div className="flex items-center gap-8">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden text-[#152126]"
            aria-label="Abrir menu"
          >
            <Menu className="size-5" />
          </button>
          <Logo />
          <nav className="hidden items-center gap-1 lg:flex">
            {visibleItems.map((item) => (
              <button
                key={item.key}
                onClick={item.onClick}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                  active === item.key ? 'bg-[#e9f7ee] text-[#16a34a]' : 'text-[#6d7973] hover:bg-[#f3f6f4]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {user.avatarUrl && (
            <img
              src={user.avatarUrl}
              alt=""
              className="hidden size-9 rounded-full object-cover ring-1 ring-black/5 sm:block"
            />
          )}
          <span className="hidden text-right sm:block">
            <b className="block text-sm">{user.name}</b>
            <small className="text-xs text-[#8a958f]">{ROLE_LABELS[user.role]} · {user.company}</small>
          </span>
          <button
            onClick={nav.onSettings}
            className={`flex size-9 items-center justify-center rounded-full transition ${
              active === 'settings' ? 'bg-[#e9f7ee] text-[#16a34a]' : 'text-gray-500 hover:bg-gray-100'
            }`}
            aria-label="Definições"
            title="Definições"
          >
            <Settings2 className="size-4" />
          </button>
          <button
            onClick={nav.onLogout}
            className="flex size-9 items-center justify-center rounded-full bg-[#e9f7ee] text-[#16a34a] transition hover:bg-[#d8f0df]"
            aria-label="Sair"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      {/* Menu mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <aside
            className="h-full w-72 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <Logo compact />
              <button onClick={() => setMobileOpen(false)} aria-label="Fechar menu">
                <X className="size-5 text-gray-500" />
              </button>
            </div>
            <div className="mt-8 flex flex-col gap-2">
              {visibleItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => {
                    setMobileOpen(false)
                    item.onClick()
                  }}
                  className={`rounded-xl p-3 text-left text-sm font-bold transition ${
                    active === item.key ? 'bg-[#e9f7ee] text-[#16a34a]' : 'text-[#51605a] hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </aside>
        </div>
      )}
    </>
  )
}

function Configurator({
  user,
  nav,
  initialMode,
}: {
  user: User
  nav: NavCallbacks
  initialMode?: 'encomenda' | 'orcamento'
}) {
  // Usado fora da barra de navegação (TopNav já trata do resto) — no botão "Ver Encomendas na BD"
  // e no modal de sucesso depois de registar uma encomenda/orçamento.
  const canAccessOrders = user.role === 'admin' || user.role === 'comercial' || user.role === 'operador'
  const { catalog } = useCatalog()
  // 'encomenda' = fluxo normal de produção (ficha técnica, sem preços) · 'orcamento' = mesma
  // configuração mas com resumo de preços em tempo real e PDF de orçamento (com preços)
  const [formMode, setFormMode] = useState<'encomenda' | 'orcamento'>(initialMode ?? 'encomenda')
  // Medidas em metros
  const [width, setWidth] = useState(3.0) // 3000 mm
  const [height, setHeight] = useState(2.25) // 2250 mm
  // Texto em edição dos campos de largura/altura — permite apagar tudo e deixar em branco
  // enquanto o utilizador escreve um novo valor, sem saltar logo para um valor por omissão.
  const [widthDraft, setWidthDraft] = useState<string | null>(null)
  const [heightDraft, setHeightDraft] = useState<string | null>(null)
  const [paddingDraft, setPaddingDraft] = useState<string | null>(null)
  const [leftShadeDraft, setLeftShadeDraft] = useState<string | null>(null)
  const [rightShadeDraft, setRightShadeDraft] = useState<string | null>(null)
  const [padding, setPadding] = useState(0.2) // 200 mm
  const [leftShade, setLeftShade] = useState(0.1) // 100 mm
  const [rightShade, setRightShade] = useState(0.1) // 100 mm

  // Listas de opções derivadas do catálogo editável (ver painel "Catálogo", admin).
  const smoothColors = useMemo(
    () => sortedCatalog(catalog, 'smooth_color').map((c) => ({ code: c.code, name: c.name, value: c.hex || '#cccccc' })),
    [catalog]
  )
  const ribbedColors = useMemo(
    () => sortedCatalog(catalog, 'ribbed_color').map((c) => ({ code: c.code, name: c.name, value: c.hex || '#cccccc' })),
    [catalog]
  )
  const tubeCodes = useMemo(() => sortedCatalog(catalog, 'tube').map((c) => c.code), [catalog])
  const tubeOptions = useMemo(() => ['Nenhum', ...tubeCodes], [tubeCodes])
  const headerOptions = useMemo(
    () => ['Nenhum', ...tubeCodes, ...sortedCatalog(catalog, 'header_panel').map((c) => c.code)],
    [catalog, tubeCodes]
  )
  const extrasOptions = useMemo(() => sortedCatalog(catalog, 'extra').map((c) => c.code), [catalog])
  const extrasWithQuantity = useMemo(
    () =>
      sortedCatalog(catalog, 'extra')
        .filter((c) => c.unit === 'm' || c.code === 'Grelhas de ventilação')
        .map((c) => c.code),
    [catalog]
  )
  const montagensOptions = useMemo(() => sortedCatalog(catalog, 'montagem').map((c) => c.code), [catalog])
  const automationExtraOptions = useMemo(() => sortedCatalog(catalog, 'automation_extra').map((c) => c.code), [catalog])
  const serviceDoorTypes = useMemo(
    () => [
      { value: 'none', label: 'Sem porta pedonal' },
      ...sortedCatalog(catalog, 'service_door').map((c) => ({ value: c.code, label: c.name })),
    ],
    [catalog]
  )
  const automationOptions = useMemo(
    () => ['Nenhum', ...sortedCatalog(catalog, 'automation').map((c) => c.code)],
    [catalog]
  )
  const railOptions = useMemo(() => ['Nenhum', ...sortedCatalog(catalog, 'rail').map((c) => c.code)], [catalog])

  // Modelo (2 tipos: smooth, ribbed)
  const [model, setModel] = useState('smooth')
  const availableColors = model === 'smooth' ? smoothColors : ribbedColors
  const [color, setColor] = useState<{ code: string; name: string; value: string }>({
    code: '',
    name: 'A carregar…',
    value: '#d9dede',
  })
  // Só define a cor por omissão depois do catálogo carregar (até lá a lista vem vazia).
  useEffect(() => {
    if (!color.code && smoothColors[0]) setColor(smoothColors[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [smoothColors])
  const [customRal, setCustomRal] = useState('')

  const applyCustomRal = () => {
    const raw = customRal.trim()
    if (!raw) return
    const digits = raw.toUpperCase().replace(/^RAL\s*/, '').trim()
    const code = `RAL ${digits}`
    const known = ralByCode[code] ?? ralClassicByCode[code]
    setColor(known ?? { code, name: 'Cor personalizada — amostra a confirmar', value: color.value })
    setCustomRal('')
  }

  const [view, setView] = useState<'front' | 'angle'>('front')
  const [showInterior, setShowInterior] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  // 3 tipos de porta pedonal: 'none' | 'normal' | 'normal-soleira' | 'idealdoor'
  const [serviceDoorType, setServiceDoorType] = useState('none')
  const serviceDoor = serviceDoorType !== 'none'
  const [serviceDoorPosition, setServiceDoorPosition] = useState<'left' | 'center' | 'right'>('center')
  const [serviceDoorPanicBar, setServiceDoorPanicBar] = useState(false)
  const [serviceDoorAirSpring, setServiceDoorAirSpring] = useState(false)
  const [windows, setWindows] = useState(false)
  const [windowsQuantity, setWindowsQuantity] = useState(2)
  const [windowsPanels, setWindowsPanels] = useState<number[]>([1])
  const [visorMaterial, setVisorMaterial] = useState<'vidro' | 'acrilico'>('vidro')
  const [rubberSeal, setRubberSeal] = useState(false)
  const [extras, setExtras] = useState<{ name: string; quantity: number; panel?: number; panels?: number[] }[]>([])
  const [montagens, setMontagens] = useState<string[]>([])
  const [automation, setAutomation] = useState('Nenhum')
  const [automationExtras, setAutomationExtras] = useState<{ name: string; quantity: number }[]>([])
  const [rail, setRail] = useState('Nenhum')
  const [remotesQuantity, setRemotesQuantity] = useState(2)

  // Ombreira Falsa — esquerda e direita independentes (medidas em mm)
  const [tubeLeft, setTubeLeft] = useState('Nenhum')
  const [tubeLengthLeft, setTubeLengthLeft] = useState('2500')
  const [tubeWidthLeft, setTubeWidthLeft] = useState('200')
  const [tubeRight, setTubeRight] = useState('Nenhum')
  const [tubeLengthRight, setTubeLengthRight] = useState('2500')
  const [tubeWidthRight, setTubeWidthRight] = useState('200')

  // Padieira Falsa (medidas em mm)
  const [header, setHeader] = useState('Nenhum')
  const [headerUnits] = useState(1) // sempre 1 unidade (topo) — já não é editável
  const [headerLength, setHeaderLength] = useState('200') // altura da padieira falsa em painel
  const [headerWidth, setHeaderWidth] = useState('3000') // largura da padieira falsa em painel (acompanha a largura da porta)

  const [client, setClient] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientAddress, setClientAddress] = useState('')
  const [clientTaxId, setClientTaxId] = useState('')
  const [notes, setNotes] = useState('')
  // Preços de linhas do Resumo editados manualmente, por label do item (ver lib/pricing.ts) — em
  // vez do preço de catálogo calculado. Guarda o texto tal como foi escrito (incluindo vazio),
  // para o campo poder ficar completamente apagado em vez de voltar sempre ao preço de catálogo —
  // só uma entrada numérica válida conta como override efetivo (ver displayedQuote). Ausência de
  // chave = campo nunca tocado, mostra o preço de catálogo.
  const [priceOverridesDraft, setPriceOverridesDraft] = useState<Record<string, string>>({})
  // Subtotal (sem IVA) editado manualmente — substitui a soma das linhas acima, mesmo que também
  // haja linhas editadas individualmente. null = campo nunca tocado (mostra o valor calculado);
  // '' = tocado mas apagado (fica em branco, sem override efetivo até haver um número válido).
  const [priceTotalOverrideDraft, setPriceTotalOverrideDraft] = useState<string | null>(null)
  // Taxa de IVA editada manualmente, em percentagem tal como escrita (ex: "6"). null = usa a taxa
  // legal (23%); mesma lógica de "tocado vs. com valor válido" que priceTotalOverrideDraft.
  const [priceIvaRateOverrideDraft, setPriceIvaRateOverrideDraft] = useState<string | null>(null)

  // Carteira de clientes — só comerciais e admin têm uma, para escolher um cliente já conhecido
  // em vez de escrever os dados à mão sempre que registam uma encomenda/orçamento.
  const hasClientPortfolio = user.role === 'comercial' || user.role === 'admin'
  const [portfolioClients, setPortfolioClients] = useState<Client[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [savingClient, setSavingClient] = useState(false)
  const [clientSearch, setClientSearch] = useState('')
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false)

  useEffect(() => {
    if (!hasClientPortfolio) return
    fetch('/api/clients')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setPortfolioClients(data.clients)
      })
      .catch((err) => console.error('Erro ao carregar carteira de clientes:', err))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePickPortfolioClient = (id: string) => {
    setSelectedClientId(id)
    const picked = portfolioClients.find((c) => c.id === id)
    if (!picked) return
    setClient(picked.name)
    setClientEmail(picked.email || '')
    setClientPhone(picked.phone || '')
    setClientAddress(picked.address || '')
    setClientTaxId(picked.taxId || '')
    setClientSearch(picked.name)
    setClientDropdownOpen(false)
  }

  const handleClearPortfolioSelection = () => {
    setSelectedClientId('')
    setClientSearch('')
  }

  const filteredPortfolioClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase()
    if (!q) return portfolioClients
    return portfolioClients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.ownerName || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q)
    )
  }, [portfolioClients, clientSearch])

  const matchesSavedClient = portfolioClients.some((c) => c.name.trim().toLowerCase() === client.trim().toLowerCase())

  const handleSaveClientToPortfolio = async () => {
    if (!client.trim()) return
    setSavingClient(true)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: client,
          email: clientEmail,
          phone: clientPhone,
          address: clientAddress,
          taxId: clientTaxId,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setPortfolioClients((prev) => [data.client, ...prev])
        setSelectedClientId(data.client.id)
      } else {
        alert(data.error || 'Erro ao guardar cliente na carteira.')
      }
    } catch (err) {
      console.error(err)
      alert('Falha de conexão com a base de dados.')
    } finally {
      setSavingClient(false)
    }
  }

  const [saving, setSaving] = useState(false)
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null)
  const [showDiagramModal, setShowDiagramModal] = useState(false)
  const [emailTarget, setEmailTarget] = useState<EmailTarget>(null)

  const area = useMemo(() => (width * height).toFixed(2).replace('.', ','), [width, height])
  const panelCount = useMemo(() => Math.max(3, Math.round(height / 0.55)), [height])

  // Obras com mais do que uma porta — o cliente indica quantas portas são necessárias e depois
  // configura-as uma a uma; os campos "soltos" acima (width, model, serviceDoorType, etc.)
  // representam sempre a porta atualmente aberta (currentDoorIndex). As restantes portas ficam
  // guardadas em doorConfigs enquanto não estão a ser editadas.
  const [doorCount, setDoorCount] = useState(1)
  const [currentDoorIndex, setCurrentDoorIndex] = useState(0)
  const [doorConfigs, setDoorConfigs] = useState<DoorConfig[]>([])

  const defaultDoorConfig = (): DoorConfig => {
    // Se o catálogo de cores ainda não tiver carregado quando esta porta é criada, usa o mesmo
    // valor por omissão que o servidor aplicaria (ver sanitizeDoorFields em app/api/orders/route.ts)
    // em vez de um texto de "a carregar", para nunca gravar um par código/nome inconsistente.
    const c = smoothColors[0] ?? { code: 'RAL 7016', name: 'Cinzento antracite', value: '#383e42' }
    return {
      width: 3.0,
      height: 2.25,
      padding: 0.2,
      leftShade: 0.1,
      rightShade: 0.1,
      widthMm: 3000,
      heightMm: 2250,
      paddingMm: 200,
      leftShadeMm: 100,
      rightShadeMm: 100,
      area: Number((3.0 * 2.25).toFixed(2)),
      model: 'smooth',
      colorCode: c.code,
      colorName: c.name,
      colorHex: c.value,
      tube: 'Nenhum',
      tubeUnits: 2,
      tubeLength: '',
      tubeLeft: 'Nenhum',
      tubeLengthLeft: '2500',
      tubeWidthLeft: '200',
      tubeRight: 'Nenhum',
      tubeLengthRight: '2500',
      tubeWidthRight: '200',
      header: 'Nenhum',
      headerUnits: 1,
      headerLength: '200',
      headerWidth: '3000',
      automation: 'Nenhum',
      automationExtras: [],
      rail: 'Nenhum',
      remotesQuantity: 2,
      serviceDoor: false,
      serviceDoorPosition: 'center',
      serviceDoorType: 'none',
      serviceDoorPanicBar: false,
      serviceDoorAirSpring: false,
      windows: false,
      windowsQuantity: 2,
      windowsPanel: 1,
      windowsPanels: [1],
      visorMaterial: 'vidro',
      rubberSeal: false,
      extras: [],
      montagens: [],
      productionFabricada: false,
    }
  }

  // Snapshot da porta atualmente aberta, a partir dos campos "soltos" do estado.
  const buildDoorConfigFromState = (): DoorConfig => ({
    width,
    height,
    padding,
    leftShade,
    rightShade,
    widthMm: Math.round(width * 1000),
    heightMm: Math.round(height * 1000),
    paddingMm: Math.round(padding * 1000),
    leftShadeMm: Math.round(leftShade * 1000),
    rightShadeMm: Math.round(rightShade * 1000),
    area: Number((width * height).toFixed(2)),
    model,
    colorCode: color.code,
    colorName: color.name,
    colorHex: color.value,
    tube: 'Nenhum',
    tubeUnits: 2,
    tubeLength: '',
    tubeLeft,
    tubeLengthLeft,
    tubeWidthLeft,
    tubeRight,
    tubeLengthRight,
    tubeWidthRight,
    header,
    headerUnits,
    headerLength,
    headerWidth,
    automation,
    automationExtras,
    rail,
    remotesQuantity,
    serviceDoor,
    serviceDoorPosition,
    serviceDoorType,
    serviceDoorPanicBar,
    serviceDoorAirSpring,
    windows,
    windowsQuantity,
    windowsPanel: windowsPanels[0] || 1,
    windowsPanels,
    visorMaterial,
    rubberSeal,
    extras,
    montagens,
    productionFabricada: false,
  })

  // Repõe os campos "soltos" do estado com os valores de uma porta guardada — usado ao navegar
  // entre portas.
  const loadDoorConfigIntoState = (d: DoorConfig) => {
    setWidth(d.width)
    setWidthDraft(null)
    setHeight(d.height)
    setHeightDraft(null)
    setPadding(d.padding)
    setPaddingDraft(null)
    setLeftShade(d.leftShade)
    setLeftShadeDraft(null)
    setRightShade(d.rightShade)
    setRightShadeDraft(null)
    setModel(d.model)
    setColor({ code: d.colorCode, name: d.colorName, value: d.colorHex })
    setCustomRal('')
    setServiceDoorType(d.serviceDoorType)
    setServiceDoorPosition(d.serviceDoorPosition)
    setServiceDoorPanicBar(d.serviceDoorPanicBar)
    setServiceDoorAirSpring(d.serviceDoorAirSpring)
    setWindows(d.windows)
    setWindowsQuantity(d.windowsQuantity)
    setWindowsPanels(d.windowsPanels && d.windowsPanels.length > 0 ? d.windowsPanels : [d.windowsPanel || 1])
    setVisorMaterial(d.visorMaterial || 'vidro')
    setRubberSeal(d.rubberSeal)
    setExtras(d.extras)
    setMontagens(d.montagens)
    setAutomation(d.automation)
    setAutomationExtras(d.automationExtras || [])
    setRail(d.rail)
    setRemotesQuantity(d.remotesQuantity)
    setTubeLeft(d.tubeLeft || 'Nenhum')
    setTubeLengthLeft(d.tubeLengthLeft || '2500')
    setTubeWidthLeft(d.tubeWidthLeft || '200')
    setTubeRight(d.tubeRight || 'Nenhum')
    setTubeLengthRight(d.tubeLengthRight || '2500')
    setTubeWidthRight(d.tubeWidthRight || '200')
    setHeader(d.header)
    setHeaderLength(d.headerLength || '200')
    setHeaderWidth(d.headerWidth || '3000')
  }

  // Array completo de portas da obra, com a porta atualmente aberta sempre atualizada — usado
  // para o preço em tempo real e para o payload final ao guardar.
  const buildEffectiveDoors = (): DoorConfig[] => {
    const arr = [...doorConfigs]
    while (arr.length < doorCount) arr.push(defaultDoorConfig())
    arr.length = doorCount
    arr[currentDoorIndex] = buildDoorConfigFromState()
    return arr
  }

  const goToDoor = (newIndex: number) => {
    const clamped = Math.max(0, Math.min(doorCount - 1, newIndex))
    if (clamped === currentDoorIndex) return
    const next = [...doorConfigs]
    next[currentDoorIndex] = buildDoorConfigFromState()
    setDoorConfigs(next)
    loadDoorConfigIntoState(next[clamped] ?? defaultDoorConfig())
    setCurrentDoorIndex(clamped)
  }

  const changeDoorCount = (newCount: number) => {
    const n = Math.max(1, Math.min(20, Math.round(newCount)))
    if (n === doorCount) return
    const base = [...doorConfigs]
    base[currentDoorIndex] = buildDoorConfigFromState()
    while (base.length < n) base.push(defaultDoorConfig())
    base.length = n
    setDoorConfigs(base)
    setDoorCount(n)
    if (currentDoorIndex > n - 1) {
      const newIndex = n - 1
      loadDoorConfigIntoState(base[newIndex])
      setCurrentDoorIndex(newIndex)
    }
  }

  // Resumo de preços em tempo real — soma todas as portas da obra (só calculado quando se está
  // no modo "Pedir Orçamento")
  const liveQuote = useMemo(
    () => calculateMultiDoorQuote(buildEffectiveDoors().map(doorConfigToPricingInput), catalog),
    [
      doorConfigs,
      doorCount,
      currentDoorIndex,
      width,
      height,
      model,
      color.code,
      tubeLeft,
      tubeLengthLeft,
      tubeRight,
      tubeLengthRight,
      header,
      headerLength,
      headerWidth,
      padding,
      serviceDoorType,
      serviceDoorPanicBar,
      serviceDoorAirSpring,
      extras,
      montagens,
      windows,
      windowsQuantity,
      visorMaterial,
      rubberSeal,
      automation,
      automationExtras,
      rail,
      remotesQuantity,
      catalog,
    ]
  )

  // liveQuote com os preços manualmente editados sobrepostos — é este que a UI mostra, nunca o
  // liveQuote "cru" diretamente, para o Resumo de Preços refletir sempre o que vai ser gravado.
  // Só entradas que sejam um número válido contam como override efetivo — um campo tocado mas
  // deixado em branco não altera o cálculo (mas também não volta a preencher-se sozinho).
  const displayedQuote = useMemo(() => {
    const overrides = Object.entries(priceOverridesDraft)
      .filter(([, raw]) => raw.trim() !== '' && Number.isFinite(Number(raw)))
      .map(([label, raw]) => ({ label, lineTotal: Number(raw) }))
    const totalOverride =
      priceTotalOverrideDraft != null && priceTotalOverrideDraft.trim() !== '' && Number.isFinite(Number(priceTotalOverrideDraft))
        ? Number(priceTotalOverrideDraft)
        : null
    const ivaRateOverride =
      priceIvaRateOverrideDraft != null &&
      priceIvaRateOverrideDraft.trim() !== '' &&
      Number.isFinite(Number(priceIvaRateOverrideDraft)) &&
      Number(priceIvaRateOverrideDraft) >= 0
        ? Number(priceIvaRateOverrideDraft) / 100
        : null
    return applyPriceOverrides(liveQuote, overrides, totalOverride, ivaRateOverride)
  }, [liveQuote, priceOverridesDraft, priceTotalOverrideDraft, priceIvaRateOverrideDraft])

  // Guarda sempre o texto tal como foi escrito, incluindo vazio — nunca repõe o preço de catálogo
  // sozinho, para o campo poder ficar mesmo em branco enquanto o utilizador edita.
  const handlePriceOverrideChange = (label: string, rawValue: string) => {
    setPriceOverridesDraft((prev) => ({ ...prev, [label]: rawValue }))
  }

  const clearPriceOverride = (label: string) => {
    setPriceOverridesDraft((prev) => {
      const { [label]: _removed, ...rest } = prev
      return rest
    })
  }

  const handleTotalOverrideChange = (rawValue: string) => {
    setPriceTotalOverrideDraft(rawValue)
  }

  // O input mostra a taxa em percentagem (ex: 23) tal como escrita.
  const handleIvaRateOverrideChange = (rawPercentValue: string) => {
    setPriceIvaRateOverrideDraft(rawPercentValue)
  }

  const toggleExtra = (item: string) => {
    setExtras((prev) =>
      prev.some((e) => e.name === item) ? prev.filter((e) => e.name !== item) : [...prev, { name: item, quantity: 1 }]
    )
  }

  const setExtraQuantity = (item: string, quantity: number) => {
    setExtras((prev) => prev.map((e) => (e.name === item ? { ...e, quantity: Math.max(1, quantity) } : e)))
  }

  // Alterna um painel dentro/fora da lista de painéis de um extra (visores ou grelhas podem
  // ficar em mais do que um painel ao mesmo tempo).
  const toggleExtraPanel = (item: string, panel: number) => {
    setExtras((prev) =>
      prev.map((e) => {
        if (e.name !== item) return e
        const current = e.panels && e.panels.length > 0 ? e.panels : e.panel ? [e.panel] : [1]
        const next = current.includes(panel) ? current.filter((p) => p !== panel) : [...current, panel]
        return { ...e, panels: next.length > 0 ? next : [1] }
      })
    )
  }

  const grelhasPanels = (() => {
    const e = extras.find((e) => e.name === 'Grelhas de ventilação')
    if (!e) return [1]
    return e.panels && e.panels.length > 0 ? e.panels : e.panel ? [e.panel] : [1]
  })()

  const toggleWindowsPanel = (panel: number) => {
    setWindowsPanels((prev) => {
      const next = prev.includes(panel) ? prev.filter((p) => p !== panel) : [...prev, panel]
      return next.length > 0 ? next : [1]
    })
  }

  const toggleAutomationExtra = (item: string) => {
    setAutomationExtras((prev) =>
      prev.some((e) => e.name === item) ? prev.filter((e) => e.name !== item) : [...prev, { name: item, quantity: 1 }]
    )
  }

  const setAutomationExtraQuantity = (item: string, quantity: number) => {
    setAutomationExtras((prev) => prev.map((e) => (e.name === item ? { ...e, quantity: Math.max(1, quantity) } : e)))
  }

  const toggleMontagem = (item: string) => {
    setMontagens((prev) => (prev.includes(item) ? prev.filter((m) => m !== item) : [...prev, item]))
  }

  useEffect(() => {
    if (windowsPanels.some((p) => p > panelCount)) {
      setWindowsPanels((prev) => {
        const clamped = prev.map((p) => Math.min(p, panelCount))
        return Array.from(new Set(clamped))
      })
    }
  }, [panelCount, windowsPanels])

  useEffect(() => {
    if (grelhasPanels.some((p) => p > panelCount)) {
      setExtras((prev) =>
        prev.map((e) =>
          e.name === 'Grelhas de ventilação'
            ? { ...e, panels: Array.from(new Set(grelhasPanels.map((p) => Math.min(p, panelCount)))) }
            : e
        )
      )
    }
  }, [panelCount, grelhasPanels])

  // Qtd de comandos/emissores já não é editável — fica sempre no valor por omissão ao escolher um motor.
  useEffect(() => {
    if (automation !== 'Nenhum' && automation !== 'Garibalde' && remotesQuantity !== 2) setRemotesQuantity(2)
  }, [automation, remotesQuantity])

  // Repõe todo o formulário (cliente, obra e todas as portas) nos valores por omissão — chamado
  // depois de registar uma encomenda/orçamento com sucesso, para o próximo pedido começar do zero.
  const resetConfiguratorForm = () => {
    setClient('')
    setClientEmail('')
    setClientPhone('')
    setClientAddress('')
    setClientTaxId('')
    setNotes('')
    setSelectedClientId('')
    setClientSearch('')
    setDoorConfigs([])
    setDoorCount(1)
    setCurrentDoorIndex(0)
    setPriceOverridesDraft({})
    setPriceTotalOverrideDraft(null)
    setPriceIvaRateOverrideDraft(null)
    loadDoorConfigIntoState(defaultDoorConfig())
  }

  const handleMeasureEdit = (
    type: 'width' | 'height' | 'padding' | 'leftShade' | 'rightShade',
    value: number
  ) => {
    if (!Number.isFinite(value) || value < 0) return
    // Padieira e ombreiras podem ser 0 (sem folga); largura/altura da porta têm de ser positivas
    const isClearanceType = type === 'padding' || type === 'leftShade' || type === 'rightShade'
    if (!isClearanceType && value <= 0) return
    const valInMeters = value > 10 ? value / 1000 : value
    if (type === 'width') setWidth(valInMeters)
    if (type === 'height') setHeight(valInMeters)
    if (type === 'padding') setPadding(valInMeters)
    if (type === 'leftShade') setLeftShade(valInMeters)
    if (type === 'rightShade') setRightShade(valInMeters)
  }

  // Guardar Encomenda na Base de Dados via API
  const handleSaveOrder = async () => {
    if (!client.trim()) {
      alert('Por favor introduza o nome do cliente ou referência da obra.')
      return
    }

    // Obra com uma ou mais portas: os campos "soltos" do pedido (width, model, extras, etc.)
    // refletem sempre a 1ª porta, para compatibilidade com o resto do sistema; "doors" leva a
    // lista completa, com a porta atualmente aberta sincronizada primeiro.
    const doorsToValidate = buildEffectiveDoors()
    // Ombreira a 0 mm significa que a porta encosta diretamente à estrutura — nesse caso é
    // obrigatório indicar uma Ombreira falsa (Estrutura de Remate) do lado correspondente,
    // senão a obra fica sem remate nenhum nesse lado.
    const invalidDoor = doorsToValidate.find(
      (d) =>
        (d.leftShade === 0 && (!d.tubeLeft || d.tubeLeft === 'Nenhum')) ||
        (d.rightShade === 0 && (!d.tubeRight || d.tubeRight === 'Nenhum'))
    )
    if (invalidDoor) {
      const doorLabel = doorsToValidate.length > 1 ? `Porta ${doorsToValidate.indexOf(invalidDoor) + 1}: ` : ''
      alert(
        `${doorLabel}Quando a Ombreira Esquerda ou Direita está a 0 mm, tem de escolher a Ombreira falsa correspondente em "Estrutura de Remate".`
      )
      return
    }

    setSaving(true)
    try {
      const finalDoors = doorsToValidate
      // Só vão os overrides cujo label ainda existe no orçamento final e que têm um valor
      // numérico válido — um campo tocado mas deixado em branco não é guardado como override.
      const finalQuote = calculateMultiDoorQuote(finalDoors.map(doorConfigToPricingInput), catalog)
      const priceOverrides = Object.entries(priceOverridesDraft)
        .filter(
          ([label, raw]) =>
            finalQuote.items.some((item) => item.label === label) && raw.trim() !== '' && Number.isFinite(Number(raw))
        )
        .map(([label, raw]) => ({ label, lineTotal: Number(raw) }))
      const priceTotalOverride =
        priceTotalOverrideDraft != null && priceTotalOverrideDraft.trim() !== '' && Number.isFinite(Number(priceTotalOverrideDraft))
          ? Number(priceTotalOverrideDraft)
          : null
      const priceIvaRateOverride =
        priceIvaRateOverrideDraft != null &&
        priceIvaRateOverrideDraft.trim() !== '' &&
        Number.isFinite(Number(priceIvaRateOverrideDraft)) &&
        Number(priceIvaRateOverrideDraft) >= 0
          ? Number(priceIvaRateOverrideDraft) / 100
          : null
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client,
          clientEmail,
          clientPhone,
          clientAddress,
          clientTaxId,
          ...finalDoors[0],
          doors: finalDoors,
          notes,
          kind: formMode,
          priceOverrides,
          priceTotalOverride,
          priceIvaRateOverride,
        }),
      })

      const data = await response.json()
      if (data.success && data.order) {
        setCreatedOrder(data.order)
        notifyOwner(data.order, formMode)
        resetConfiguratorForm()
      } else {
        alert(data.error || 'Erro ao guardar na base de dados.')
      }
    } catch (err) {
      console.error(err)
      alert('Falha de conexão com a base de dados.')
    } finally {
      setSaving(false)
    }
  }

  // Avisa automaticamente o dono da empresa (por email, com o PDF em anexo) sempre que um
  // cliente regista uma encomenda ou pede um orçamento. Corre em segundo plano — se o SMTP
  // não estiver configurado ou falhar, não interrompe nem assusta quem acabou de submeter,
  // já que a encomenda em si já ficou guardada com sucesso.
  const notifyOwner = async (order: Order, kind: 'encomenda' | 'orcamento') => {
    try {
      const { dataUri, fileName } = kind === 'orcamento' ? await getQuotePDFBase64(order) : await getOrderPDFBase64(order)
      await fetch('/api/notify-owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, orderId: order.id, client: order.client, pdfDataUri: dataUri, fileName }),
      })
    } catch (err) {
      console.error('Erro ao notificar o dono por email:', err)
    }
  }

  return (
    <div className="min-h-screen bg-[#f3f6f4] text-[#152126]">
      <TopNav
        user={user}
        active={formMode}
        nav={{
          ...nav,
          onEncomenda: () => {
            if (formMode !== 'encomenda') resetConfiguratorForm()
            setFormMode('encomenda')
          },
          onOrcamento: () => {
            if (formMode !== 'orcamento') resetConfiguratorForm()
            setFormMode('orcamento')
          },
        }}
      />

      {/* Conteúdo principal */}
      <main className="mx-auto max-w-[1440px] p-5 sm:p-8">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-[#16a34a]">
              {formMode === 'orcamento' ? 'Pedido de Orçamento' : 'Configurador Industrial de Portões Seccionados'}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl text-[#152126]">
              Configure. <span className="text-[#16a34a]">Apresente.</span> Venda.
            </h1>
            <p className="mt-1 text-sm text-[#738079]">
              {formMode === 'orcamento'
                ? 'Configure o portão e veja o preço de cada artigo em tempo real, com emissão de orçamento em PDF.'
                : 'Visualização 3D limpa em tempo real com emissão de ficha técnica oficial e desenho vetorial cotado.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {canAccessOrders && (
              <button
                onClick={nav.onOrders}
                className="flex items-center gap-2 rounded-xl border border-[#d2ddd6] bg-white px-4 py-2.5 text-xs font-bold text-[#2d3a33] shadow-sm hover:border-[#16a34a] transition"
              >
                <Package className="size-4 text-[#16a34a]" /> Ver Encomendas na BD
              </button>
            )}
            <div className="flex items-center gap-2 rounded-xl border border-[#e0e8e3] bg-white px-3.5 py-2 text-xs text-[#738079] shadow-sm">
              <Gauge className="size-4 text-[#16a34a]" /> Área útil:{' '}
              <b className="text-[#152126] font-bold">{area} m²</b>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {/* 3D em cima, centrado */}
           <section className="mx-auto flex w-full max-w-4xl min-w-0 flex-col rounded-2xl p-3 sm:p-5">
            <DoorPreview
              width={width}
              height={height}
              padding={padding}
              leftShade={leftShade}
              rightShade={rightShade}
              color={color.value}
              model={model}
              view={view}
              showInterior={showInterior}
              isOpen={isOpen}
              serviceDoor={serviceDoor}
              serviceDoorType={serviceDoorType}
              serviceDoorPosition={serviceDoorPosition}
              serviceDoorPanicBar={serviceDoorPanicBar}
              serviceDoorAirSpring={serviceDoorAirSpring}
              windows={windows}
              windowsQuantity={windowsQuantity}
              windowsPanels={windowsPanels}
              grelhasPanels={grelhasPanels}
              visorMaterial={visorMaterial}
              automation={automation}
              rail={rail}
              tubeLeft={tubeLeft}
              tubeRight={tubeRight}
              tubeLengthLeft={tubeLengthLeft}
              tubeLengthRight={tubeLengthRight}
              header={header}
              headerLength={headerLength}
              extras={extras}
              onMeasureEdit={handleMeasureEdit}
            />
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setView('front')}
                className={`rounded-lg border px-4 py-2 text-xs font-bold transition ${
                  view === 'front'
                    ? 'border-[#e0e8e3] bg-white text-[#152126] shadow-sm'
                    : 'border-[#d2ddd6] bg-[#eef2ef] text-[#4b5750] hover:bg-[#e2e9e4]'
                }`}
              >
                Frontal
              </button>
              <button
                type="button"
                onClick={() => setView('angle')}
                className={`rounded-lg border px-4 py-2 text-xs font-bold transition ${
                  view === 'angle'
                    ? 'border-[#e0e8e3] bg-white text-[#152126] shadow-sm'
                    : 'border-[#d2ddd6] bg-[#eef2ef] text-[#4b5750] hover:bg-[#e2e9e4]'
                }`}
              >
                Perspetiva
              </button>
              <button
                type="button"
                onClick={() => setShowInterior((v) => !v)}
                className={`rounded-lg border px-4 py-2 text-xs font-bold transition ${
                  showInterior
                    ? 'border-[#e0e8e3] bg-white text-[#152126] shadow-sm'
                    : 'border-[#d2ddd6] bg-[#eef2ef] text-[#4b5750] hover:bg-[#e2e9e4]'
                }`}
              >
                {showInterior ? 'Ver exterior' : 'Ver interior'}
              </button>
            </div>
          </section>

          {/* Formulário de configuração, por baixo */}
          <aside className="mx-auto w-full max-w-4xl min-w-0 rounded-2xl border border-[#e0e8e3] bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-[#152126]">
                  <Settings2 className="size-5 text-[#16a34a]" /> Configurar portão
                </h2>
                <p className="mt-0.5 text-xs text-[#86918b]">
                  Introduza as cotas e opções para gerar o orçamento oficial.
                </p>
              </div>
              <span className="rounded-lg bg-[#e9f7ee] p-2 text-[#16a34a]">
                <Sparkles className="size-4" />
              </span>
            </div>

            <div className="flex flex-col gap-5">
              {/* 1. Cliente */}
              <div className="grid gap-2">
                {hasClientPortfolio && portfolioClients.length > 0 && (
                  <div className="flex flex-col gap-1 text-xs font-bold text-[#2d3a33]">
                    <span className="flex items-center justify-between">
                      👛 Cliente da carteira
                      {selectedClientId && (
                        <button
                          type="button"
                          onClick={handleClearPortfolioSelection}
                          className="text-[10px] font-bold text-gray-400 hover:text-red-500"
                        >
                          Limpar seleção
                        </button>
                      )}
                    </span>
                    <div className="relative">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" />
                        <input
                          value={clientSearch}
                          onChange={(e) => {
                            setClientSearch(e.target.value)
                            setSelectedClientId('')
                            setClientDropdownOpen(true)
                          }}
                          onFocus={() => setClientDropdownOpen(true)}
                          onBlur={() => setTimeout(() => setClientDropdownOpen(false), 150)}
                          placeholder="Pesquisar cliente na carteira..."
                          className="h-10 w-full rounded-lg border border-[#dce5df] bg-white pl-8 pr-3 text-sm font-normal outline-none transition focus:border-[#16a34a]"
                        />
                      </div>
                      {clientDropdownOpen && (
                        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-[#dce5df] bg-white shadow-lg">
                          {filteredPortfolioClients.length === 0 ? (
                            <p className="px-3 py-2 text-xs font-normal text-gray-400">Nenhum cliente encontrado</p>
                          ) : (
                            filteredPortfolioClients.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => handlePickPortfolioClient(c.id)}
                                className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-[#f3f6f4]"
                              >
                                <span className="text-xs font-bold text-[#2d3a33]">{c.name}</span>
                                {(user.role === 'admin' && c.ownerName) || c.email ? (
                                  <span className="text-[10px] font-normal text-gray-400">
                                    {user.role === 'admin' && c.ownerName ? c.ownerName : ''}
                                    {user.role === 'admin' && c.ownerName && c.email ? ' · ' : ''}
                                    {c.email || ''}
                                  </span>
                                ) : null}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <label className="flex flex-col gap-1 text-xs font-bold text-[#2d3a33]">
                  <span className="flex items-center justify-between gap-2">
                    Cliente / Obra *
                    {hasClientPortfolio && client.trim() && !matchesSavedClient && (
                      <button
                        type="button"
                        onClick={handleSaveClientToPortfolio}
                        disabled={savingClient}
                        className="flex items-center gap-1 text-[10px] font-bold text-[#16a34a] hover:underline disabled:opacity-60"
                      >
                        {savingClient ? <Loader2 className="size-3 animate-spin" /> : <UserPlus className="size-3" />}
                        Guardar na carteira
                      </button>
                    )}
                  </span>
                  <input
                    value={client}
                    onChange={(e) => {
                      setClient(e.target.value)
                      setSelectedClientId('')
                    }}
                    placeholder="Ex: Manuel Silva ou Moradia Lote 5"
                    className="h-10 rounded-lg border border-[#dce5df] px-3 text-sm font-normal outline-none transition focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/10"
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="Telefone / Telemóvel"
                    className="h-8 rounded-lg border border-[#e0e8e3] px-2.5 text-xs outline-none focus:border-[#16a34a]"
                  />
                  <input
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    placeholder="Local da Obra / Morada"
                    className="h-8 rounded-lg border border-[#e0e8e3] px-2.5 text-xs outline-none focus:border-[#16a34a]"
                  />
                  <input
                    value={clientTaxId}
                    onChange={(e) => setClientTaxId(e.target.value)}
                    placeholder="Contribuinte (NIF)"
                    className="h-8 col-span-2 rounded-lg border border-[#e0e8e3] px-2.5 text-xs outline-none focus:border-[#16a34a]"
                  />
                </div>
              </div>

              {/* 1.5 Número de portas da obra */}
              <div className="flex flex-col gap-2 rounded-xl border border-[#dce5df] bg-[#f8faf8] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#2d3a33]">Quantas portas são necessárias nesta obra?</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Diminuir número de portas"
                      onClick={() => changeDoorCount(doorCount - 1)}
                      disabled={doorCount <= 1}
                      className="flex size-7 items-center justify-center rounded border bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-bold text-[#152126]">{doorCount}</span>
                    <button
                      type="button"
                      aria-label="Aumentar número de portas"
                      onClick={() => changeDoorCount(doorCount + 1)}
                      className="flex size-7 items-center justify-center rounded border bg-white text-gray-600 hover:bg-gray-100"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                </div>
                {doorCount > 1 && (
                  <>
                    <div className="flex items-center justify-between rounded-lg border border-[#dce5df] bg-white px-2.5 py-2">
                      <button
                        type="button"
                        onClick={() => goToDoor(currentDoorIndex - 1)}
                        disabled={currentDoorIndex === 0}
                        className="flex items-center gap-1 text-xs font-bold text-[#16a34a] disabled:opacity-30 disabled:text-gray-400"
                      >
                        <ChevronLeft className="size-4" /> Anterior
                      </button>
                      <span className="flex items-center gap-1.5 text-xs font-bold text-[#2d3a33]">
                        <DoorClosed className="size-3.5 text-[#16a34a]" /> A configurar Porta {currentDoorIndex + 1} de {doorCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => goToDoor(currentDoorIndex + 1)}
                        disabled={currentDoorIndex === doorCount - 1}
                        className="flex items-center gap-1 text-xs font-bold text-[#16a34a] disabled:opacity-30 disabled:text-gray-400"
                      >
                        Seguinte <ChevronRight className="size-4" />
                      </button>
                    </div>
                    <p className="pl-1 text-[10px] text-[#6d7973]">
                      Configure cada porta separadamente (medidas, cor, acessórios...). O cliente, a morada e as anotações são
                      partilhados por toda a obra.
                    </p>
                  </>
                )}
              </div>

              {/* 2. Modelo do Painel */}
              <label className="flex flex-col gap-1.5 text-xs font-bold text-[#2d3a33]">
                Modelo do painel
                <select
                  value={model}
                  onChange={(e) => {
                    const nextModel = e.target.value
                    setModel(nextModel)
                    const nextList = nextModel === 'smooth' ? smoothColors : ribbedColors
                    if (nextList[0]) setColor(nextList[0])
                  }}
                  className="h-10 rounded-lg border border-[#dce5df] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#16a34a]"
                >
                  {modelOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              {/* 3. Paleta de Cores */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-[#2d3a33]">Cor / acabamento · RAL</span>
                {/* Preview da cor selecionada */}
                <div className="flex items-center gap-3 rounded-xl border border-[#e0e8e3] bg-[#f8faf8] p-2.5">
                  <span
                    className="size-9 rounded-lg flex-shrink-0 shadow-sm border border-black/10"
                    style={{ backgroundColor: color.value }}
                  />
                  <div className="leading-none">
                    <p className="text-[11px] font-bold text-[#152126]">{color.code}</p>
                    <p className="mt-0.5 text-[10px] text-[#6d7973]">{color.name}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableColors.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      title={`${item.code} · ${item.name}`}
                      aria-label={`${item.code} · ${item.name}`}
                      onClick={() => setColor(item)}
                      className={`size-7 rounded-full border-2 transition ${
                        color.code === item.code
                          ? 'border-[#16a34a] ring-2 ring-[#16a34a]/30 scale-110'
                          : 'border-white shadow-sm hover:scale-105'
                      }`}
                      style={{ backgroundColor: item.value }}
                    />
                  ))}
                </div>
                {/* RAL personalizado — cliente escreve o código que quiser */}
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="text"
                    value={customRal}
                    onChange={(e) => setCustomRal(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && applyCustomRal()}
                    placeholder="Outro RAL (ex: 5010)"
                    className="h-9 flex-1 rounded-lg border border-[#dce5df] bg-white px-2.5 text-xs font-normal outline-none transition focus:border-[#16a34a]"
                  />
                  <button
                    type="button"
                    onClick={applyCustomRal}
                    className="h-9 shrink-0 rounded-lg bg-[#16a34a] px-3 text-xs font-bold text-white transition hover:bg-[#12883d]"
                  >
                    Aplicar
                  </button>
                </div>
                {!ralByCode[color.code] && !ralClassicByCode[color.code] && color.name.includes('personalizada') && (
                  <p className="text-[10px] text-[#b45309] pl-1">
                    RAL fora da paleta padrão — a pré-visualização 3D não reflete a cor exata; amostra a confirmar com a produção.
                  </p>
                )}
              </div>

              {/* 4. MEDIDAS DO VÃO & PORTÃO */}
              <div className="rounded-xl border border-[#d9e5dd] bg-[#f8faf8] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                <div className="mb-3 flex items-center justify-between border-b border-[#e5ece7] pb-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#16a34a]">
                    <Ruler className="size-4" /> Medidas
                  </span>
                  <span className="rounded bg-[#e9f7ee] px-2 py-0.5 text-[10px] font-bold text-[#16a34a]">
                    Milímetros (mm)
                  </span>
                </div>

                <p className="mb-3 text-xs font-bold text-red-600">MEDIDAS DE VÃO</p>

                <div className="grid grid-cols-2 gap-3">
                  {/* Largura da Porta */}
                  <label className="flex flex-col gap-1 text-[11px] font-bold text-[#35433d]">
                    Largura da porta (L)
                    <div className="relative">
                      <input
                        type="number"
                        step="10"
                        value={widthDraft ?? Math.round(width * 1000)}
                        onChange={(e) => {
                          const raw = e.target.value
                          setWidthDraft(raw)
                          if (raw !== '') {
                            const val = parseFloat(raw)
                            if (!isNaN(val) && val >= 0) setWidth(val / 1000)
                          }
                        }}
                        onBlur={() => setWidthDraft(null)}
                        className="h-10 w-full rounded-lg border border-[#d2ddd6] bg-white px-2.5 pr-8 text-xs font-bold text-[#152126] outline-none transition focus:border-[#16a34a]"
                      />
                      <span className="pointer-events-none absolute right-2.5 top-2.5 text-[10px] font-bold text-[#8e9c94]">
                        mm
                      </span>
                    </div>
                  </label>

                  {/* Altura da Porta */}
                  <label className="flex flex-col gap-1 text-[11px] font-bold text-[#35433d]">
                    Altura da porta (H)
                    <div className="relative">
                      <input
                        type="number"
                        step="10"
                        value={heightDraft ?? Math.round(height * 1000)}
                        onChange={(e) => {
                          const raw = e.target.value
                          setHeightDraft(raw)
                          if (raw !== '') {
                            const val = parseFloat(raw)
                            if (!isNaN(val) && val >= 0) setHeight(val / 1000)
                          }
                        }}
                        onBlur={() => setHeightDraft(null)}
                        className="h-10 w-full rounded-lg border border-[#d2ddd6] bg-white px-2.5 pr-8 text-xs font-bold text-[#152126] outline-none transition focus:border-[#16a34a]"
                      />
                      <span className="pointer-events-none absolute right-2.5 top-2.5 text-[10px] font-bold text-[#8e9c94]">
                        mm
                      </span>
                    </div>
                  </label>

                  {/* Padieira */}
                  <label className="col-span-2 flex flex-col gap-1 text-[11px] font-bold text-[#35433d]">
                    Padieira disponível (espaço livre superior)
                    <div className="relative">
                      <input
                        type="number"
                        step="10"
                        value={paddingDraft ?? Math.round(padding * 1000)}
                        onChange={(e) => {
                          const raw = e.target.value
                          setPaddingDraft(raw)
                          if (raw !== '') {
                            const val = parseFloat(raw)
                            if (!isNaN(val) && val >= 0) setPadding(val / 1000)
                          }
                        }}
                        onBlur={() => setPaddingDraft(null)}
                        className="h-10 w-full rounded-lg border border-[#d2ddd6] bg-white px-2.5 pr-8 text-xs font-bold text-[#152126] outline-none transition focus:border-[#16a34a]"
                      />
                      <span className="pointer-events-none absolute right-2.5 top-2.5 text-[10px] font-bold text-[#8e9c94]">
                        mm
                      </span>
                    </div>
                  </label>

                  {/* Ombreira Esquerda */}
                  <label className="flex flex-col gap-1 text-[11px] font-bold text-[#35433d]">
                    Ombreira Esquerda (E)
                    <div className="relative">
                      <input
                        type="number"
                        step="10"
                        value={leftShadeDraft ?? Math.round(leftShade * 1000)}
                        onChange={(e) => {
                          const raw = e.target.value
                          setLeftShadeDraft(raw)
                          if (raw !== '') {
                            const val = parseFloat(raw)
                            if (!isNaN(val) && val >= 0) setLeftShade(val / 1000)
                          }
                        }}
                        onBlur={() => setLeftShadeDraft(null)}
                        className="h-10 w-full rounded-lg border border-[#d2ddd6] bg-white px-2.5 pr-8 text-xs font-bold text-[#152126] outline-none transition focus:border-[#16a34a]"
                      />
                      <span className="pointer-events-none absolute right-2.5 top-2.5 text-[10px] font-bold text-[#8e9c94]">
                        mm
                      </span>
                    </div>
                  </label>

                  {/* Ombreira Direita */}
                  <label className="flex flex-col gap-1 text-[11px] font-bold text-[#35433d]">
                    Ombreira Direita (D)
                    <div className="relative">
                      <input
                        type="number"
                        step="10"
                        value={rightShadeDraft ?? Math.round(rightShade * 1000)}
                        onChange={(e) => {
                          const raw = e.target.value
                          setRightShadeDraft(raw)
                          if (raw !== '') {
                            const val = parseFloat(raw)
                            if (!isNaN(val) && val >= 0) setRightShade(val / 1000)
                          }
                        }}
                        onBlur={() => setRightShadeDraft(null)}
                        className="h-10 w-full rounded-lg border border-[#d2ddd6] bg-white px-2.5 pr-8 text-xs font-bold text-[#152126] outline-none transition focus:border-[#16a34a]"
                      />
                      <span className="pointer-events-none absolute right-2.5 top-2.5 text-[10px] font-bold text-[#8e9c94]">
                        mm
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* 4b. MEDIDAS FINAIS (calculado — desconta Ombreiras/Padieira falsas da Estrutura de Remate) */}
              <div className="rounded-xl border border-[#d9e5dd] bg-[#f8faf8] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                <div className="mb-3 flex items-center justify-between border-b border-[#e5ece7] pb-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#16a34a]">
                    <Ruler className="size-4" /> Medidas Finais
                  </span>
                  <span className="rounded bg-[#e9f7ee] px-2 py-0.5 text-[10px] font-bold text-[#16a34a]">
                    Milímetros (mm)
                  </span>
                </div>
                <p className="mb-3 text-[10px] text-[#6d7973]">
                  Calculado automaticamente: vão menos as Ombreiras falsas e a Padieira falsa escolhidas em
                  &quot;Estrutura de Remate&quot; mais abaixo. Não editável.
                </p>
                {(() => {
                  const finalOpening = finalOpeningDimensions(buildDoorConfigFromState())
                  return (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1 text-[11px] font-bold text-[#35433d]">
                        Largura Final
                        <div className="relative">
                          <div className="flex h-10 w-full items-center rounded-lg border border-[#d2ddd6] bg-gray-100 px-2.5 pr-8 text-xs font-bold text-[#152126]">
                            {finalOpening.widthMm}
                          </div>
                          <span className="pointer-events-none absolute right-2.5 top-2.5 text-[10px] font-bold text-[#8e9c94]">
                            mm
                          </span>
                        </div>
                        {(finalOpening.leftDeductMm > 0 || finalOpening.rightDeductMm > 0) && (
                          <span className="text-[10px] font-normal text-[#8e9c94]">
                            {finalOpening.leftDeductMm > 0 ? `-${finalOpening.leftDeductMm} mm E` : ''}
                            {finalOpening.leftDeductMm > 0 && finalOpening.rightDeductMm > 0 ? ' · ' : ''}
                            {finalOpening.rightDeductMm > 0 ? `-${finalOpening.rightDeductMm} mm D` : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 text-[11px] font-bold text-[#35433d]">
                        Altura Final
                        <div className="relative">
                          <div className="flex h-10 w-full items-center rounded-lg border border-[#d2ddd6] bg-gray-100 px-2.5 pr-8 text-xs font-bold text-[#152126]">
                            {finalOpening.heightMm}
                          </div>
                          <span className="pointer-events-none absolute right-2.5 top-2.5 text-[10px] font-bold text-[#8e9c94]">
                            mm
                          </span>
                        </div>
                        {finalOpening.topDeductMm > 0 && (
                          <span className="text-[10px] font-normal text-[#8e9c94]">
                            -{finalOpening.topDeductMm} mm Padieira falsa
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* 5. FALSAS MEDIDAS / ESTRUTURA */}
              <div className="flex flex-col gap-3 rounded-xl border border-[#e0e8e3] p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#63726a]">
                  Estrutura de Remate
                </p>

                {/* Ombreira falsa Esquerda */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#2d3a33]">Ombreira falsa esquerda</label>
                  <select
                    value={tubeLeft}
                    onChange={(e) => setTubeLeft(e.target.value)}
                    style={tubeLeft !== 'Nenhum' ? { borderColor: color.value, boxShadow: `0 0 0 2px ${color.value}33` } : undefined}
                    className="h-10 rounded-lg border border-[#dce5df] bg-white px-3 text-xs font-normal outline-none transition"
                  >
                    {tubeOptions.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                  {tubeLeft !== 'Nenhum' && !tubeLeft.toLowerCase().includes('tubo') && (
                    <div className="flex items-center gap-2 bg-[#f8faf8] p-2.5 rounded-lg border border-[#e5ede8]">
                      <span className="text-[10px] font-bold text-gray-600 whitespace-nowrap">Largura:</span>
                      <div className="relative flex-1">
                        <input
                          value={tubeWidthLeft}
                          onChange={(e) => setTubeWidthLeft(e.target.value)}
                          placeholder="ex: 200"
                          type="number"
                          min="0"
                          step="10"
                          className="h-7 w-full rounded border border-[#dce5df] bg-white px-2 pr-8 text-xs outline-none focus:border-[#16a34a]"
                        />
                        <span className="pointer-events-none absolute right-2 top-1 text-[10px] font-bold text-[#8e9c94]">mm</span>
                      </div>
                    </div>
                  )}
                  {tubeLeft !== 'Nenhum' && (
                    <div className="flex items-center gap-2 bg-[#f8faf8] p-2.5 rounded-lg border border-[#e5ede8]">
                      <span className="text-[10px] font-bold text-gray-600 whitespace-nowrap">Altura:</span>
                      <div className="relative flex-1">
                        <input
                          value={tubeLengthLeft}
                          onChange={(e) => setTubeLengthLeft(e.target.value)}
                          placeholder="ex: 2500"
                          type="number"
                          min="0"
                          step="10"
                          className="h-7 w-full rounded border border-[#dce5df] bg-white px-2 pr-8 text-xs outline-none focus:border-[#16a34a]"
                        />
                        <span className="pointer-events-none absolute right-2 top-1 text-[10px] font-bold text-[#8e9c94]">mm</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Ombreira falsa Direita */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#2d3a33]">Ombreira falsa direita</label>
                  <select
                    value={tubeRight}
                    onChange={(e) => setTubeRight(e.target.value)}
                    style={tubeRight !== 'Nenhum' ? { borderColor: color.value, boxShadow: `0 0 0 2px ${color.value}33` } : undefined}
                    className="h-10 rounded-lg border border-[#dce5df] bg-white px-3 text-xs font-normal outline-none transition"
                  >
                    {tubeOptions.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                  {tubeRight !== 'Nenhum' && !tubeRight.toLowerCase().includes('tubo') && (
                    <div className="flex items-center gap-2 bg-[#f8faf8] p-2.5 rounded-lg border border-[#e5ede8]">
                      <span className="text-[10px] font-bold text-gray-600 whitespace-nowrap">Largura:</span>
                      <div className="relative flex-1">
                        <input
                          value={tubeWidthRight}
                          onChange={(e) => setTubeWidthRight(e.target.value)}
                          placeholder="ex: 200"
                          type="number"
                          min="0"
                          step="10"
                          className="h-7 w-full rounded border border-[#dce5df] bg-white px-2 pr-8 text-xs outline-none focus:border-[#16a34a]"
                        />
                        <span className="pointer-events-none absolute right-2 top-1 text-[10px] font-bold text-[#8e9c94]">mm</span>
                      </div>
                    </div>
                  )}
                  {tubeRight !== 'Nenhum' && (
                    <div className="flex items-center gap-2 bg-[#f8faf8] p-2.5 rounded-lg border border-[#e5ede8]">
                      <span className="text-[10px] font-bold text-gray-600 whitespace-nowrap">Altura:</span>
                      <div className="relative flex-1">
                        <input
                          value={tubeLengthRight}
                          onChange={(e) => setTubeLengthRight(e.target.value)}
                          placeholder="ex: 2500"
                          type="number"
                          min="0"
                          step="10"
                          className="h-7 w-full rounded border border-[#dce5df] bg-white px-2 pr-8 text-xs outline-none focus:border-[#16a34a]"
                        />
                        <span className="pointer-events-none absolute right-2 top-1 text-[10px] font-bold text-[#8e9c94]">mm</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Padieira falsa */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#2d3a33]">Padieira falsa</label>
                    {header !== 'Nenhum' && (
                      <span className="flex items-center gap-1.5 rounded-full border border-[#e0e8e3] bg-white px-2 py-0.5 text-[10px] font-bold text-[#35433d] shadow-sm">
                        <span
                          className="size-3 rounded-full border border-black/10 flex-shrink-0"
                          style={{ backgroundColor: color.value }}
                        />
                        {color.code}
                      </span>
                    )}
                  </div>
                  <select
                    value={header}
                    onChange={(e) => setHeader(e.target.value)}
                    style={
                      header !== 'Nenhum'
                        ? { borderColor: color.value, boxShadow: `0 0 0 2px ${color.value}33` }
                        : undefined
                    }
                    className="h-10 rounded-lg border border-[#dce5df] bg-white px-3 text-xs font-normal outline-none transition"
                  >
                    <option value="Nenhum">Nenhum</option>
                    <optgroup label="Opções de Ombreira (Tubos & Fixo em Painel)">
                      {tubeOptions
                        .filter((t) => t !== 'Nenhum')
                        .map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Painéis e Grelhas Tradicionais">
                      {headerOptions
                        .filter((h) => !tubeOptions.includes(h) && h !== 'Nenhum')
                        .map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                    </optgroup>
                  </select>

                  {/* Configuração de Medida para Padieira Falsa */}
                  {header !== 'Nenhum' && (
                    <div
                      className={`mt-1 grid gap-2 bg-[#f8faf8] p-2.5 rounded-lg border border-[#e5ede8] ${
                        header.toLowerCase().includes('tubo') ? 'grid-cols-1' : 'grid-cols-2'
                      }`}
                    >
                      {!header.toLowerCase().includes('tubo') && (
                        <div>
                          <span className="text-[10px] font-bold text-gray-600 block mb-1">
                            Largura:
                          </span>
                          <div className="relative">
                            <input
                              value={headerWidth}
                              onChange={(e) => setHeaderWidth(e.target.value)}
                              placeholder="ex: 200"
                              type="number"
                              min="0"
                              step="10"
                              className="h-7 w-full rounded border border-[#dce5df] bg-white px-2 pr-8 text-xs outline-none focus:border-[#16a34a]"
                            />
                            <span className="pointer-events-none absolute right-2 top-1 text-[10px] font-bold text-[#8e9c94]">
                              mm
                            </span>
                          </div>
                        </div>
                      )}

                      <div>
                        <span className="text-[10px] font-bold text-gray-600 block mb-1">
                          Altura:
                        </span>
                        <div className="relative">
                          <input
                            value={headerLength}
                            onChange={(e) => setHeaderLength(e.target.value)}
                            placeholder="ex: 3000"
                            type="number"
                            min="0"
                            step="10"
                            className="h-7 w-full rounded border border-[#dce5df] bg-white px-2 pr-8 text-xs outline-none focus:border-[#16a34a]"
                          />
                          <span className="pointer-events-none absolute right-2 top-1 text-[10px] font-bold text-[#8e9c94]">
                            mm
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 6. Porta Pedonal de Serviço */}
              <div className="flex flex-col gap-2 rounded-xl border border-[#e0e8e3] p-3.5">
                {/* Porta Pedonal de Serviço - 3 tipos */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#2d3a33]">Porta pedonal de serviço</label>
                  <select
                    value={serviceDoorType}
                    onChange={(e) => setServiceDoorType(e.target.value)}
                    className="h-10 rounded-lg border border-[#dce5df] bg-white px-3 text-xs font-normal outline-none transition focus:border-[#16a34a]"
                  >
                    {serviceDoorTypes.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {serviceDoorType === 'normal' && (
                    <p className="text-[10px] text-[#6d7973] pl-1">Porta recortada no painel do portão, com moldura perimetral em aço e puxador inox.</p>
                  )}
                  {serviceDoorType === 'normal-soleira' && (
                    <p className="text-[10px] text-[#6d7973] pl-1">Igual à porta normal, mas com soleira rebaixada ao nível do pavimento, sem degrau.</p>
                  )}
                  {serviceDoorType === 'idealdoor' && (
                    <p className="text-[10px] text-[#6d7973] pl-1">Porta pedonal IDEALDOOR: perfil de marca com friso distintivo e acabamento premium.</p>
                  )}
                  {serviceDoor && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-gray-600">Posição na porta:</span>
                      <div className="flex items-center gap-1">
                        {(['left', 'center', 'right'] as const).map((pos) => (
                          <button
                            key={pos}
                            type="button"
                            onClick={() => setServiceDoorPosition(pos)}
                            className={`rounded px-2.5 py-1 text-xs font-bold transition ${
                              serviceDoorPosition === pos
                                ? 'bg-[#16a34a] text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {pos === 'left' ? 'Esquerda' : pos === 'center' ? 'Centro' : 'Direita'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {serviceDoor && (
                    <div className="flex flex-col gap-1.5 pt-1">
                      <label className="flex items-center justify-between text-xs cursor-pointer">
                        <span className="text-gray-600">Barra antipânico</span>
                        <input
                          type="checkbox"
                          checked={serviceDoorPanicBar}
                          onChange={(e) => setServiceDoorPanicBar(e.target.checked)}
                          className="accent-[#16a34a]"
                        />
                      </label>
                      <label className="flex items-center justify-between text-xs cursor-pointer">
                        <span className="text-gray-600">Mola aérea</span>
                        <input
                          type="checkbox"
                          checked={serviceDoorAirSpring}
                          onChange={(e) => setServiceDoorAirSpring(e.target.checked)}
                          className="accent-[#16a34a]"
                        />
                      </label>
                    </div>
                  )}
                </div>

              </div>

              {/* 7. Extras Adicionais (multi-seleção) */}
              <div className="flex flex-col gap-3 rounded-xl border border-[#e0e8e3] p-3.5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#63726a]">
                    Extras Adicionais
                  </p>
                  {extras.length > 0 && (
                    <span className="rounded bg-[#e9f7ee] px-2 py-0.5 text-[10px] font-bold text-[#16a34a]">
                      {extras.length} selecionado{extras.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {/* Visores panorâmicos — tem estado próprio (não vem do catálogo de extras), mas
                      visualmente fica junto dos restantes extras, como pedido. */}
                  <div
                    className={`flex flex-col gap-1.5 rounded-lg border px-2.5 py-2 text-xs transition sm:col-span-2 ${
                      windows ? 'border-[#16a34a]/50 bg-[#f8faf8]' : 'border-[#e0e8e3] hover:border-[#16a34a]/50'
                    }`}
                  >
                    <label className="flex cursor-pointer items-center gap-2 text-[#2d3a33]">
                      <input
                        type="checkbox"
                        checked={windows}
                        onChange={(e) => setWindows(e.target.checked)}
                        className="accent-[#16a34a]"
                      />
                      Visores panorâmicos
                    </label>
                    {windows && (
                      <div className="flex flex-col gap-2 border-t border-gray-100 pt-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Painel dos visores (pode escolher vários):</span>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: panelCount }, (_, i) => i + 1).map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => toggleWindowsPanel(num)}
                                title={num === 1 ? '1º painel (superior)' : num === panelCount ? `${num}º painel (inferior)` : `${num}º painel`}
                                className={`size-6 rounded text-xs font-bold transition ${
                                  windowsPanels.includes(num)
                                    ? 'bg-[#16a34a] text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {num}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Qtd de visores:</span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4].map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => setWindowsQuantity(num)}
                                className={`size-6 rounded text-xs font-bold transition ${
                                  windowsQuantity === num
                                    ? 'bg-[#16a34a] text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {num}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Material:</span>
                          <div className="flex items-center gap-1">
                            {(['vidro', 'acrilico'] as const).map((mat) => (
                              <button
                                key={mat}
                                type="button"
                                onClick={() => setVisorMaterial(mat)}
                                className={`rounded px-2.5 py-1 text-xs font-bold transition ${
                                  visorMaterial === mat
                                    ? 'bg-[#16a34a] text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {mat === 'vidro' ? 'Vidro duplo' : 'Acrílico'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  {extrasOptions.map((item) => {
                    const selected = extras.find((e) => e.name === item)
                    return (
                      <div
                        key={item}
                        className={`flex flex-col gap-1.5 rounded-lg border px-2.5 py-2 text-xs transition ${
                          selected ? 'border-[#16a34a]/50 bg-[#f8faf8]' : 'border-[#e0e8e3] hover:border-[#16a34a]/50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <label className="flex flex-1 cursor-pointer items-center gap-2 text-[#2d3a33]">
                            <input
                              type="checkbox"
                              checked={!!selected}
                              onChange={() => toggleExtra(item)}
                              className="accent-[#16a34a]"
                            />
                            {item}
                          </label>
                          {selected && extrasWithQuantity.includes(item) && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setExtraQuantity(item, selected.quantity - 1)}
                                className="flex size-5 items-center justify-center rounded border bg-white text-gray-600 hover:bg-gray-100"
                              >
                                <Minus className="size-3" />
                              </button>
                              <span className="w-5 text-center text-xs font-bold text-[#16a34a]">
                                {selected.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => setExtraQuantity(item, selected.quantity + 1)}
                                className="flex size-5 items-center justify-center rounded border bg-white text-gray-600 hover:bg-gray-100"
                              >
                                <Plus className="size-3" />
                              </button>
                            </div>
                          )}
                        </div>
                        {selected && item === 'Grelhas de ventilação' && (
                          <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-1.5">
                            <span className="text-gray-600">Painel das grelhas (pode escolher vários):</span>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: panelCount }, (_, i) => i + 1).map((num) => {
                                const selectedPanels =
                                  selected.panels && selected.panels.length > 0
                                    ? selected.panels
                                    : selected.panel
                                    ? [selected.panel]
                                    : [1]
                                return (
                                  <button
                                    key={num}
                                    type="button"
                                    onClick={() => toggleExtraPanel('Grelhas de ventilação', num)}
                                    title={num === 1 ? '1º painel (superior)' : num === panelCount ? `${num}º painel (inferior)` : `${num}º painel`}
                                    className={`size-6 rounded text-xs font-bold transition ${
                                      selectedPanels.includes(num)
                                        ? 'bg-[#16a34a] text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                  >
                                    {num}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 7b. Montagens (multi-seleção) */}
              <div className="flex flex-col gap-3 rounded-xl border border-[#e0e8e3] p-3.5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#63726a]">
                    Montagens
                  </p>
                  {montagens.length > 0 && (
                    <span className="rounded bg-[#e9f7ee] px-2 py-0.5 text-[10px] font-bold text-[#16a34a]">
                      {montagens.length} selecionada{montagens.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {montagensOptions.map((item) => {
                    const selected = montagens.includes(item)
                    return (
                      <label
                        key={item}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition ${
                          selected ? 'border-[#16a34a]/50 bg-[#f8faf8]' : 'border-[#e0e8e3] hover:border-[#16a34a]/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleMontagem(item)}
                          className="accent-[#16a34a]"
                        />
                        <span className="text-[#2d3a33]">{item}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* 8. Automatismo, Calha & Comandos */}
              <div className="flex flex-col gap-3 rounded-xl border border-[#e0e8e3] p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#63726a]">
                  Sistema de Motorização & Controlo
                </p>

                <label className="flex flex-col gap-1.5 text-xs font-bold text-[#2d3a33]">
                  Automatismo / Motor
                  <select
                    value={automation}
                    onChange={(e) => setAutomation(e.target.value)}
                    className="h-10 rounded-lg border border-[#dce5df] bg-white px-3 text-xs font-normal outline-none transition focus:border-[#16a34a]"
                  >
                    {automationOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Calha do Motor */}
                <label className="flex flex-col gap-1.5 text-xs font-bold text-[#2d3a33]">
                  Calha do motor de teto
                  <select
                    value={rail}
                    onChange={(e) => setRail(e.target.value)}
                    className="h-10 rounded-lg border border-[#dce5df] bg-white px-3 text-xs font-normal outline-none transition focus:border-[#16a34a]"
                  >
                    {railOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Comandos / Emissores — fixo em 2 por motor, sem opção de alterar; o Garibalde não usa comandos/emissores da forma habitual */}
                {automation !== 'Nenhum' && automation !== 'Garibalde' && (
                  <div className="flex items-center justify-between rounded-lg bg-[#f8faf8] p-2.5 border border-[#e5ede8]">
                    <span className="text-xs font-bold text-[#2d3a33]">Qtd Comandos / Emissores:</span>
                    <span className="text-xs font-bold text-[#16a34a]">{remotesQuantity}</span>
                  </div>
                )}

                {/* Extras do Motor — lista vem do catálogo (categoria "Extras de Automatismo"), editável pelo admin */}
                {automation !== 'Nenhum' && automationExtraOptions.length > 0 && (
                  <div className="flex flex-col gap-2 rounded-lg bg-[#f8faf8] p-2.5 border border-[#e5ede8]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#2d3a33]">Extras do Motor</span>
                      {automationExtras.length > 0 && (
                        <span className="rounded bg-[#e9f7ee] px-2 py-0.5 text-[10px] font-bold text-[#16a34a]">
                          {automationExtras.length} selecionado{automationExtras.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                      {automationExtraOptions.map((item) => {
                        const selected = automationExtras.find((e) => e.name === item)
                        return (
                          <div
                            key={item}
                            className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-xs transition ${
                              selected ? 'border-[#16a34a]/50 bg-white' : 'border-[#e0e8e3] bg-white hover:border-[#16a34a]/50'
                            }`}
                          >
                            <label className="flex flex-1 cursor-pointer items-center gap-2 text-[#2d3a33]">
                              <input
                                type="checkbox"
                                checked={!!selected}
                                onChange={() => toggleAutomationExtra(item)}
                                className="accent-[#16a34a]"
                              />
                              {item}
                            </label>
                            {selected && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setAutomationExtraQuantity(item, selected.quantity - 1)}
                                  className="flex size-5 items-center justify-center rounded border bg-white text-gray-600 hover:bg-gray-100"
                                >
                                  <Minus className="size-3" />
                                </button>
                                <span className="w-5 text-center text-xs font-bold text-[#16a34a]">
                                  {selected.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setAutomationExtraQuantity(item, selected.quantity + 1)}
                                  className="flex size-5 items-center justify-center rounded border bg-white text-gray-600 hover:bg-gray-100"
                                >
                                  <Plus className="size-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Resumo de Preços — visível em ambos os modos, Encomenda e Orçamento. Cada linha
                  pode ser editada manualmente (em vez do preço de catálogo calculado); qualquer
                  linha editada fica marcada e aparece uma nota junto ao total. */}
              <div className="flex flex-col gap-2 rounded-xl border border-[#16a34a]/30 bg-[#f8faf8] p-3.5">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#16a34a]">
                    <Euro className="size-3.5" /> Resumo de Preços
                  </p>
                  <div className="flex flex-col divide-y divide-[#e5ede8]">
                    {displayedQuote.items.map((item, idx) => (
                      <div key={`${item.label}-${idx}`} className="flex items-center justify-between gap-2 py-1.5 text-xs">
                        <div className="min-w-0">
                          <p className="truncate font-bold text-[#2d3a33]">{item.label}</p>
                          <p className="truncate text-[10px] text-[#8a958f]">{item.description}</p>
                          {item.edited && (
                            <p className="text-[9px] font-semibold text-amber-600">Preço editado manualmente</p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <div className="flex items-center gap-0.5 rounded-md border border-[#dce5df] bg-white px-1.5 py-1 focus-within:border-[#16a34a]">
                            <input
                              type="number"
                              step="0.01"
                              value={priceOverridesDraft[item.label] ?? item.lineTotal ?? ''}
                              onChange={(e) => handlePriceOverrideChange(item.label, e.target.value)}
                              placeholder="Sob consulta"
                              className="w-16 bg-transparent text-right text-xs font-bold text-[#152126] outline-none"
                            />
                            <span className="text-[10px] text-[#8a958f]">€</span>
                          </div>
                          {item.label in priceOverridesDraft && (
                            <button
                              type="button"
                              onClick={() => clearPriceOverride(item.label)}
                              title="Repor preço de catálogo"
                              className="text-[#8a958f] hover:text-[#16a34a]"
                            >
                              <RotateCcw className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-1 flex flex-col gap-1 rounded-lg bg-white px-3 py-2.5 border border-[#dce5df]">
                    <div className="flex items-center justify-between text-[11px] text-[#6d7973]">
                      <span>Subtotal (sem IVA){displayedQuote.totalEdited && <span className="ml-1 font-semibold text-amber-600">· editado</span>}</span>
                      <div className="flex items-center gap-1">
                        <div className="flex items-center gap-0.5 rounded-md border border-[#dce5df] bg-white px-1.5 py-0.5 focus-within:border-[#16a34a]">
                          <input
                            type="number"
                            step="0.01"
                            value={priceTotalOverrideDraft ?? displayedQuote.total}
                            onChange={(e) => handleTotalOverrideChange(e.target.value)}
                            className="w-20 bg-transparent text-right text-[11px] font-semibold text-[#152126] outline-none"
                          />
                          <span className="text-[10px] text-[#8a958f]">€</span>
                        </div>
                        {priceTotalOverrideDraft != null && (
                          <button
                            type="button"
                            onClick={() => setPriceTotalOverrideDraft(null)}
                            title="Repor subtotal calculado"
                            className="text-[#8a958f] hover:text-[#16a34a]"
                          >
                            <RotateCcw className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#6d7973]">
                      <span>IVA{displayedQuote.ivaRateEdited && <span className="ml-1 font-semibold text-amber-600">· editado</span>}</span>
                      <div className="flex items-center gap-1">
                        <div className="flex items-center gap-0.5 rounded-md border border-[#dce5df] bg-white px-1.5 py-0.5 focus-within:border-[#16a34a]">
                          <input
                            type="number"
                            step="0.1"
                            value={priceIvaRateOverrideDraft ?? String(Math.round(displayedQuote.ivaRate * 10000) / 100)}
                            onChange={(e) => handleIvaRateOverrideChange(e.target.value)}
                            className="w-10 bg-transparent text-right text-[11px] font-semibold text-[#152126] outline-none"
                          />
                          <span className="text-[10px] text-[#8a958f]">%</span>
                        </div>
                        <span className="w-16 shrink-0 text-right font-semibold">{displayedQuote.ivaAmount.toFixed(2)} €</span>
                        {priceIvaRateOverrideDraft != null && (
                          <button
                            type="button"
                            onClick={() => setPriceIvaRateOverrideDraft(null)}
                            title="Repor taxa de IVA legal"
                            className="text-[#8a958f] hover:text-[#16a34a]"
                          >
                            <RotateCcw className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-1 flex items-center justify-between border-t border-[#e5ede8] pt-1.5">
                      <span className="text-xs font-bold text-[#2d3a33]">TOTAL (com IVA)</span>
                      <span className="text-base font-bold text-[#16a34a]">{displayedQuote.totalWithIva.toFixed(2)} €</span>
                    </div>
                  </div>
                  {isQuoteEdited(displayedQuote) && (
                    <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[10px] font-semibold text-amber-700">
                      ⚠ {PRICE_EDITED_NOTE}
                    </p>
                  )}
                  {displayedQuote.hasUnpriced && (
                    <p className="text-[10px] font-semibold text-amber-600">
                      Alguns itens não têm preço de catálogo definido ("Sob consulta") e não entram no total.
                    </p>
                  )}
              </div>

              {/* 9. Anotações */}
              <label className="flex flex-col gap-1.5 text-xs font-bold text-[#2d3a33]">
                Anotações
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observações sobre a encomenda, prazos, acesso à obra, etc."
                  rows={3}
                  className="resize-none rounded-lg border border-[#dce5df] bg-white px-3 py-2 text-xs font-normal text-[#152126] outline-none transition focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/10"
                />
              </label>

              {/* Botão de Guardar na BD */}
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveOrder}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#16a34a] font-bold text-white transition hover:bg-[#12883d] shadow-sm disabled:opacity-70"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> A registar na Base de Dados...
                  </>
                ) : formMode === 'orcamento' ? (
                  <>
                    Pedir Orçamento <ArrowRight className="size-4" />
                  </>
                ) : (
                  <>
                    Registar Encomenda <ArrowRight className="size-4" />
                  </>
                )}
              </button>

              {/* Botão para ver esquema técnico de medidas */}
              <button
                type="button"
                onClick={() => setShowDiagramModal(true)}
                className="flex items-center justify-center gap-2 text-xs font-semibold text-[#748078] hover:text-[#16a34a] transition"
              >
                <Info className="size-4" /> Ver esquema técnico de medidas
              </button>
            </div>
          </aside>
        </div>
      </main>

      {/* Modal de Sucesso com Download Imediato de PDF e Desenho */}
      {createdOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setCreatedOrder(null)}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setCreatedOrder(null)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Fechar"
            >
              <X className="size-5" />
            </button>
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-[#e9f7ee] text-[#16a34a]">
              <Check className="size-8" />
            </div>
            <h3 className="text-center text-xl font-bold text-[#152126]">
              {formMode === 'orcamento' ? 'Orçamento Pronto!' : 'Encomenda Registada!'}
            </h3>
            <p className="mt-1 text-center text-xs text-[#738079]">
              Referência gerada:{' '}
              <b className="text-[#16a34a] font-mono text-sm">{createdOrder.id}</b>
            </p>
            {createdOrder.doors && createdOrder.doors.length > 1 && (
              <p className="mt-1 text-center text-xs font-bold text-[#16a34a]">
                🚪 Obra com {createdOrder.doors.length} portas — todas incluídas no mesmo PDF
              </p>
            )}

            <div className="my-5 rounded-xl border border-gray-200 bg-[#f8faf8] p-4 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <span className="text-gray-500">Cliente:</span>
                  <p className="font-bold">{createdOrder.client}</p>
                </div>
                <div>
                  <span className="text-gray-500">Modelo:</span>
                  <p className="font-bold text-[#16a34a]">
                    {createdOrder.model === 'smooth'
                      ? 'Painel Total Liso'
                      : createdOrder.model === 'cassette'
                      ? 'Painel Almofadado (Cassette)'
                      : 'Painel Canelado'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Medidas Vão:</span>
                  <p className="font-bold">
                    {createdOrder.widthMm} × {createdOrder.heightMm} mm ({createdOrder.area} m²)
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Falsas:</span>
                  <p className="font-bold">
                    {[createdOrder.tubeLeft !== 'Nenhum' ? 'Omb E' : '', createdOrder.tubeRight !== 'Nenhum' ? 'Omb D' : ''].filter(Boolean).join(' + ') || 'Sem omb'} · Pad: {createdOrder.headerUnits || 1} un
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Acabamento:</span>
                  <p className="font-bold">{createdOrder.colorCode}</p>
                </div>
                <div>
                  <span className="text-gray-500">Estado:</span>
                  <p className="font-bold text-[#16a34a]">{createdOrder.status}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={() =>
                  formMode === 'orcamento' ? generateQuotePDF(createdOrder) : generateOrderPDF(createdOrder)
                }
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#16a34a] py-3 text-xs font-bold text-white shadow-sm hover:bg-[#12883d] transition"
              >
                <Download className="size-4" />
                {formMode === 'orcamento' ? 'Descarregar Orçamento (PDF)' : 'Descarregar PDF'}
              </button>
              <button
                type="button"
                onClick={() => setEmailTarget({ order: createdOrder, kind: formMode })}
                className="flex items-center justify-center gap-2 rounded-xl border border-[#16a34a]/40 bg-[#e9f7ee] px-4 py-3 text-xs font-bold text-[#16a34a] hover:bg-[#d8f0df] transition"
                title="Enviar por Email"
              >
                <Mail className="size-4" />
              </button>
              {canAccessOrders && (
                <button
                  type="button"
                  onClick={() => {
                    setCreatedOrder(null)
                    nav.onOrders()
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
                >
                  <Package className="size-4" /> Ver em Encomendas
                </button>
              )}
            </div>
            <p className="mt-4 text-center text-xs font-semibold text-[#16a34a]">
              Obrigado por fazer parte da Automatismos Lousada
            </p>
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => setCreatedOrder(null)}
                className="text-xs text-gray-500 hover:text-gray-800"
              >
                Continuar a configurar
              </button>
            </div>
          </div>
        </div>
      )}

      <SendEmailModal target={emailTarget} onClose={() => setEmailTarget(null)} />

      {/* Modal de Esquema de Medidas */}
      {showDiagramModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowDiagramModal(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-3xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Ruler className="size-5 text-[#16a34a]" />
                <h3 className="text-lg font-bold">Esquema Técnico de Medidas</h3>
              </div>
              <button
                onClick={() => setShowDiagramModal(false)}
                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50 p-2">
              <img
                src={diagramUrl}
                alt="Esquema técnico de medidas da porta seccionada"
                className="mx-auto max-h-[60vh] object-contain"
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-xs text-gray-600 sm:grid-cols-3">
              <div className="rounded-lg bg-gray-50 p-2 border">
                <span className="font-bold text-gray-800">Largura útil:</span> {Math.round(width * 1000)} mm
              </div>
              <div className="rounded-lg bg-gray-50 p-2 border">
                <span className="font-bold text-gray-800">Altura útil:</span> {Math.round(height * 1000)} mm
              </div>
              <div className="rounded-lg bg-gray-50 p-2 border">
                <span className="font-bold text-gray-800">Padieira mínima:</span> {Math.round(padding * 1000)} mm
              </div>
              <div className="rounded-lg bg-gray-50 p-2 border">
                <span className="font-bold text-gray-800">Ombreira Esquerda:</span> {Math.round(leftShade * 1000)} mm
              </div>
              <div className="rounded-lg bg-gray-50 p-2 border">
                <span className="font-bold text-gray-800">Ombreira Direita:</span> {Math.round(rightShade * 1000)} mm
              </div>
              <div className="rounded-lg bg-gray-50 p-2 border">
                <span className="font-bold text-gray-800">Área total:</span> {area} m²
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DoorPreview({
  width,
  height,
  padding,
  leftShade,
  rightShade,
  color,
  model,
  view,
  showInterior,
  isOpen,
  serviceDoor,
  serviceDoorType,
  serviceDoorPosition,
  serviceDoorPanicBar,
  serviceDoorAirSpring,
  windows,
  windowsQuantity,
  windowsPanels,
  grelhasPanels,
  visorMaterial,
  automation,
  rail,
  tubeLeft,
  tubeRight,
  tubeLengthLeft,
  tubeLengthRight,
  header,
  headerLength,
  extras,
  onMeasureEdit,
}: {
  width: number
  height: number
  padding: number
  leftShade: number
  rightShade: number
  color: string
  model: string
  view: 'front' | 'angle'
  showInterior: boolean
  isOpen: boolean
  serviceDoor: boolean
  serviceDoorType: string
  serviceDoorPosition: 'left' | 'center' | 'right'
  serviceDoorPanicBar: boolean
  serviceDoorAirSpring: boolean
  windows: boolean
  windowsQuantity: number
  windowsPanels: number[]
  grelhasPanels: number[]
  visorMaterial: 'vidro' | 'acrilico'
  automation: string
  rail: string
  tubeLeft: string
  tubeRight: string
  tubeLengthLeft?: string
  tubeLengthRight?: string
  header: string
  headerLength: string
  extras: { name: string; quantity: number; panel?: number; panels?: number[] }[]
  onMeasureEdit: (type: 'width' | 'height' | 'padding' | 'leftShade' | 'rightShade', value: number) => void
}) {
  return (
    <div className="relative h-[490px] w-full">
      <Door3D
        width={width}
        height={height}
        padding={padding}
        leftShade={leftShade}
        rightShade={rightShade}
        color={color}
        model={model}
        view={view}
        showInterior={showInterior}
        isOpen={isOpen}
        serviceDoor={serviceDoor}
        serviceDoorType={serviceDoorType}
        serviceDoorPosition={serviceDoorPosition}
        serviceDoorPanicBar={serviceDoorPanicBar}
        serviceDoorAirSpring={serviceDoorAirSpring}
        windows={windows}
        windowsQuantity={windowsQuantity}
        windowsPanels={windowsPanels}
        grelhasPanels={grelhasPanels}
        visorMaterial={visorMaterial}
        automation={automation}
        rail={rail}
        tubeLeft={tubeLeft}
        tubeRight={tubeRight}
        tubeLengthLeft={tubeLengthLeft}
        tubeLengthRight={tubeLengthRight}
        header={header}
        headerLength={headerLength}
        extras={extras}
        onMeasureEdit={onMeasureEdit}
      />

      {/* Em telemóvel, as cotas ficam só no Menu (formulário) para não sobrecarregar o 3D */}
      <div className="hidden sm:block">
        {/* Largura da porta (Overlay Inferior Azul) */}
        <div className="pointer-events-auto absolute bottom-7 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-xl border-2 border-blue-500 bg-white px-3 py-1 shadow-xl">
          <span className="text-[10px] font-black uppercase text-blue-700">Largura da porta</span>
          <input
            aria-label="Largura da porta no modelo 3D"
            type="number"
            step="10"
            value={Math.round(width * 1000)}
            onChange={(e) => onMeasureEdit('width', Number(e.target.value) / 1000)}
            className="w-16 border-0 text-center text-sm font-bold text-gray-900 outline-none"
          />
          <span className="text-xs font-bold text-gray-600">mm</span>
        </div>

        {/* Altura da porta (Overlay Lateral Esquerdo Azul) */}
        <div className="pointer-events-auto absolute left-4 top-[68%] flex -translate-y-1/2 -rotate-90 items-center gap-2 rounded-xl border-2 border-blue-500 bg-white px-3 py-1 shadow-xl">
          <span className="text-[10px] font-black uppercase text-blue-700">Altura</span>
          <input
            aria-label="Altura da porta no modelo 3D"
            type="number"
            step="10"
            value={Math.round(height * 1000)}
            onChange={(e) => onMeasureEdit('height', Number(e.target.value) / 1000)}
            className="w-14 border-0 text-center text-sm font-bold text-gray-900 outline-none"
          />
          <span className="text-xs font-bold text-gray-600">mm</span>
        </div>

        {/* Padieira (Overlay Superior Vermelho) */}
        <div className="pointer-events-auto absolute left-1/2 top-6 flex -translate-x-1/2 items-center gap-2 rounded-xl border-2 border-red-500 bg-white px-3 py-1 shadow-xl">
          <span className="text-[10px] font-black uppercase text-red-700">Padieira</span>
          <input
            aria-label="Padieira"
            type="number"
            step="10"
            value={Math.round(padding * 1000)}
            onChange={(e) => onMeasureEdit('padding', Number(e.target.value) / 1000)}
            className="w-14 border-0 text-center text-sm font-bold text-gray-900 outline-none"
          />
          <span className="text-xs font-bold text-gray-600">mm</span>
        </div>

        {/* Ombreira Esquerda (Overlay Lateral Esquerdo Vermelho) */}
        <div className="pointer-events-auto absolute left-2 top-[42%] flex -translate-y-1/2 items-center gap-1 rounded-xl border-2 border-red-500 bg-white px-2 py-1 shadow-xl">
          <span className="whitespace-nowrap text-[9px] font-black uppercase text-red-700">Ombreira E</span>
          <input
            aria-label="Ombreira esquerda"
            type="number"
            step="10"
            value={Math.round(leftShade * 1000)}
            onChange={(e) => onMeasureEdit('leftShade', Number(e.target.value) / 1000)}
            className="w-12 border-0 text-center text-xs font-bold text-gray-900 outline-none"
          />
        </div>

        {/* Ombreira Direita (Overlay Lateral Direito Vermelho) */}
        <div className="pointer-events-auto absolute right-2 top-[42%] flex -translate-y-1/2 items-center gap-1 rounded-xl border-2 border-red-500 bg-white px-2 py-1 shadow-xl">
          <span className="whitespace-nowrap text-[9px] font-black uppercase text-red-700">Ombreira D</span>
          <input
            aria-label="Ombreira direita"
            type="number"
            step="10"
            value={Math.round(rightShade * 1000)}
            onChange={(e) => onMeasureEdit('rightShade', Number(e.target.value) / 1000)}
            className="w-12 border-0 text-center text-xs font-bold text-gray-900 outline-none"
          />
        </div>
      </div>
    </div>
  )
}

function Login({ onLogin }: { onLogin: (user: User) => void }) {
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
    <main className="min-h-screen bg-[#f5f7f6] px-5 py-6 text-[#152126] sm:px-10 sm:py-8">
      <header className="mx-auto flex max-w-7xl items-center justify-between">
        <Logo />
        <span className="rounded-full border border-[#dbe4de] bg-white px-3 py-1.5 text-xs font-medium text-[#6a7771]">
          Portal Corporativo Industrial
        </span>
      </header>
      <section className="mx-auto grid min-h-[calc(100vh-120px)] max-w-7xl items-center gap-12 py-14 lg:grid-cols-[1.05fr_.95fr]">
        <div className="max-w-xl">
          <p className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-[#16a34a]">
            <span className="size-2 rounded-full bg-[#16a34a]" /> Plataforma de Fabrico e Orçamentação
          </p>
          <h1 className="text-5xl font-semibold tracking-[-0.05em] text-[#152126] sm:text-7xl">
            A porta certa
            <br />
            <span className="text-[#16a34a]">começa aqui.</span>
          </h1>
          <p className="mt-7 max-w-md text-lg leading-8 text-[#63706b]">
            Configure portões seccionados em 3D em tempo real, sincronize encomendas com a base de dados central e descarregue fichas técnicas executivas em PDF com desenho técnico.
          </p>
          <div className="mt-10 flex flex-wrap gap-3 text-sm font-medium text-[#51605a]">
            <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 ring-1 ring-[#dce5df]">
              <ShieldCheck className="size-4 text-[#16a34a]" /> Gestão em Base de Dados
            </span>
            <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 ring-1 ring-[#dce5df]">
              <FileDown className="size-4 text-[#16a34a]" /> Ficha Técnica & Desenho no PDF
            </span>
            <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 ring-1 ring-[#dce5df]">
              <Boxes className="size-4 text-[#16a34a]" /> 3 Modelos de Porta
            </span>
          </div>
        </div>
        <div className="mx-auto w-full max-w-md rounded-3xl bg-white p-8 shadow-[0_24px_80px_-30px_rgba(22,50,39,.3)] ring-1 ring-[#e0e8e3] sm:p-10">
          <div className="mb-8">
            <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-[#e9f7ee] text-[#16a34a]">
              <UserRound className="size-6" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">Configurador</h2>
            <p className="mt-2 text-sm text-[#76827d]">Introduza as credenciais para gerir orçamentos e produção.</p>
          </div>
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-2 text-sm font-semibold">
              Email corporativo
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
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{error}</p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="mt-1 flex h-12 items-center justify-center gap-2 rounded-xl bg-[#16a34a] font-bold text-white transition hover:bg-[#12883d] shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  Entrar no Sistema <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}

// Ecrã obrigatório no primeiro login (ou depois de um admin redefinir a password de outra conta)
// — bloqueia o resto da app até a password ser trocada.
function ForcePasswordChange({ user, onChanged }: { user: User; onChanged: (user: User) => void }) {
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

function SettingsPage({
  user,
  onUserUpdate,
  nav,
}: {
  user: User
  onUserUpdate: (user: User) => void
  nav: NavCallbacks
}) {
  return (
    <div className="min-h-screen bg-[#f3f6f4] text-[#152126]">
      <TopNav user={user} active="settings" nav={nav} />
      <main className="mx-auto max-w-xl px-5 py-8 sm:px-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-[#152126]">
          <Settings2 className="size-6 text-[#16a34a]" /> Definições
        </h1>
        <p className="mt-1 text-sm text-[#6d7973]">Foto de perfil e password da tua conta.</p>
        <SettingsPanel user={user} onUserUpdate={onUserUpdate} />
      </main>
    </div>
  )
}

function SettingsPanel({ user, onUserUpdate }: { user: User; onUserUpdate: (user: User) => void }) {
  // Foto de perfil
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '')
  const [avatarError, setAvatarError] = useState('')
  const [savingAvatar, setSavingAvatar] = useState(false)
  const [avatarSaved, setAvatarSaved] = useState(false)

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setAvatarError('')
    setAvatarSaved(false)
    resizeImageToAvatarDataUrl(file, setAvatarUrl, setAvatarError)
  }

  const handleSaveAvatar = async () => {
    setSavingAvatar(true)
    setAvatarError('')
    setAvatarSaved(false)
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: avatarUrl || null }),
      })
      const data = await res.json()
      if (data.success) {
        onUserUpdate(data.user)
        setAvatarSaved(true)
      } else {
        setAvatarError(data.error || 'Erro ao guardar a foto')
      }
    } catch (err) {
      console.error(err)
      setAvatarError('Erro ao ligar à base de dados.')
    } finally {
      setSavingAvatar(false)
    }
  }

  // Troca de password
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSaved(false)
    if (newPassword.length < 8) {
      setPasswordError('A nova password deve ter pelo menos 8 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('As duas passwords novas não coincidem')
      return
    }
    setSavingPassword(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (data.success) {
        onUserUpdate(data.user)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setPasswordSaved(true)
      } else {
        setPasswordError(data.error || 'Erro ao trocar a password')
      }
    } catch (err) {
      console.error(err)
      setPasswordError('Erro ao ligar à base de dados.')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-xl border border-[#e0e8e3] bg-white p-5">
        <h2 className="text-sm font-bold text-[#152126]">Foto de perfil</h2>
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="size-16 rounded-full object-cover ring-1 ring-black/5" />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-full bg-[#e9f7ee] text-[#16a34a]">
              <UserRound className="size-7" />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-[#dce5df] bg-white px-3 py-2 text-xs font-bold text-[#2d3a33] hover:bg-gray-50">
              Escolher foto
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
            {avatarUrl && (
              <button
                type="button"
                onClick={() => {
                  setAvatarUrl('')
                  setAvatarSaved(false)
                }}
                className="text-left text-[11px] text-gray-500 hover:text-red-600"
              >
                Remover foto
              </button>
            )}
          </div>
        </div>
        {avatarError && <p className="text-xs font-semibold text-red-600">{avatarError}</p>}
        {avatarSaved && <p className="text-xs font-semibold text-[#16a34a]">Foto guardada com sucesso.</p>}
        <button
          type="button"
          onClick={handleSaveAvatar}
          disabled={savingAvatar || avatarUrl === (user.avatarUrl || '')}
          className="flex w-fit items-center justify-center gap-2 rounded-lg bg-[#16a34a] px-4 py-2 text-xs font-bold text-white hover:bg-[#12883d] disabled:opacity-50"
        >
          {savingAvatar ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Guardar foto
        </button>
      </div>

      <form
        onSubmit={handleChangePassword}
        className="flex flex-col gap-3 rounded-xl border border-[#e0e8e3] bg-white p-5"
      >
        <h2 className="text-sm font-bold text-[#152126]">Trocar password</h2>
        <input
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          type="password"
          autoComplete="current-password"
          placeholder="Password atual"
          className="h-10 rounded-lg border border-[#dce5df] px-3 text-sm outline-none focus:border-[#16a34a]"
        />
        <input
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          type="password"
          autoComplete="new-password"
          placeholder="Nova password (mínimo 8 caracteres)"
          className="h-10 rounded-lg border border-[#dce5df] px-3 text-sm outline-none focus:border-[#16a34a]"
        />
        <input
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          type="password"
          autoComplete="new-password"
          placeholder="Confirmar nova password"
          className="h-10 rounded-lg border border-[#dce5df] px-3 text-sm outline-none focus:border-[#16a34a]"
        />
        {passwordError && <p className="text-xs font-semibold text-red-600">{passwordError}</p>}
        {passwordSaved && <p className="text-xs font-semibold text-[#16a34a]">Password trocada com sucesso.</p>}
        <button
          type="submit"
          disabled={savingPassword}
          className="flex w-fit items-center justify-center gap-2 rounded-lg bg-[#16a34a] px-4 py-2 text-xs font-bold text-white hover:bg-[#12883d] disabled:opacity-50"
        >
          {savingPassword ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Trocar password
        </button>
      </form>
    </div>
  )
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  operador: 'Cliente',
  comercial: 'Comercial',
  fabrica: 'Fábrica',
}

// Redimensiona uma imagem carregada pelo utilizador para um quadrado 256×256 (foto de perfil).
function resizeImageToAvatarDataUrl(
  file: File,
  onDone: (dataUrl: string) => void,
  onError: (message: string) => void
) {
  if (!file.type.startsWith('image/')) {
    onError('Escolha um ficheiro de imagem.')
    return
  }
  const img = new Image()
  const reader = new FileReader()
  reader.onload = () => {
    img.onload = () => {
      const size = 256
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const scale = Math.max(size / img.width, size / img.height)
      const dw = img.width * scale
      const dh = img.height * scale
      ctx.drawImage(img, (size - dw) / 2, (size - dh) / 2, dw, dh)
      onDone(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => onError('Não foi possível ler a imagem.')
    img.src = reader.result as string
  }
  reader.onerror = () => onError('Não foi possível ler a imagem.')
  reader.readAsDataURL(file)
}

// Redimensiona uma imagem carregada pelo utilizador mantendo a proporção original (sem recortar
// em quadrado) — usada para fotos de produtos/categorias do stock, que podem não ser quadradas.
function resizeImageToDataUrl(
  file: File,
  maxDimension: number,
  onDone: (dataUrl: string) => void,
  onError: (message: string) => void
) {
  if (!file.type.startsWith('image/')) {
    onError('Escolha um ficheiro de imagem.')
    return
  }
  const img = new Image()
  const reader = new FileReader()
  reader.onload = () => {
    img.onload = () => {
      const scale = Math.min(1, maxDimension / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.width * scale))
      canvas.height = Math.max(1, Math.round(img.height * scale))
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      onDone(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => onError('Não foi possível ler a imagem.')
    img.src = reader.result as string
  }
  reader.onerror = () => onError('Não foi possível ler a imagem.')
  reader.readAsDataURL(file)
}

// Lê um PDF (ficha técnica de um produto) como data URL, sem redimensionar — só limita o tamanho
// para não sobrecarregar a base de dados (guardado como TEXT, tal como as fotos).
// Nota: o site corre em funções serverless da Vercel, que rejeitam pedidos acima de ~4.5MB no
// total — e o base64 aumenta o tamanho do ficheiro original em ~33%. Por isso o limite real tem
// de ficar bem abaixo dos 4.5MB para sobrar margem aos outros campos do pedido (nome, foto, etc).
const MAX_PRODUCT_FILE_BYTES = 3 * 1024 * 1024
function readFileAsDataUrl(
  file: File,
  onDone: (dataUrl: string, fileName: string) => void,
  onError: (message: string) => void
) {
  if (file.type !== 'application/pdf') {
    onError('Escolha um ficheiro PDF.')
    return
  }
  if (file.size > MAX_PRODUCT_FILE_BYTES) {
    onError('O ficheiro é demasiado grande (máx. 3MB — limite da hospedagem).')
    return
  }
  const reader = new FileReader()
  reader.onload = () => onDone(reader.result as string, file.name)
  reader.onerror = () => onError('Não foi possível ler o ficheiro.')
  reader.readAsDataURL(file)
}

function UsersPanel() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'operador' as UserRole,
    ordersAccess: true,
    avatarUrl: '',
    commercialId: '',
  })
  const [avatarError, setAvatarError] = useState('')

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setAvatarError('')
    resizeImageToAvatarDataUrl(
      file,
      (dataUrl) => setNewUser((p) => ({ ...p, avatarUrl: dataUrl })),
      setAvatarError
    )
  }
  const [passwordTarget, setPasswordTarget] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  const [settingsTarget, setSettingsTarget] = useState<User | null>(null)
  const [settingsAvatarUrl, setSettingsAvatarUrl] = useState('')
  const [settingsCommercialId, setSettingsCommercialId] = useState('')
  const [settingsAvatarError, setSettingsAvatarError] = useState('')
  const [settingsError, setSettingsError] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)

  const handleOpenSettings = (u: User) => {
    setSettingsTarget(u)
    setSettingsAvatarUrl(u.avatarUrl || '')
    setSettingsCommercialId(u.commercialId || '')
    setSettingsAvatarError('')
    setSettingsError('')
  }

  const handleSettingsAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setSettingsAvatarError('')
    resizeImageToAvatarDataUrl(file, setSettingsAvatarUrl, setSettingsAvatarError)
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!settingsTarget) return
    setSavingSettings(true)
    setSettingsError('')
    try {
      const body: { avatarUrl: string | null; commercialId?: string | null } = {
        avatarUrl: settingsAvatarUrl || null,
      }
      if (settingsTarget.role === 'operador') {
        body.commercialId = settingsCommercialId || null
      }
      const res = await fetch(`/api/users/${settingsTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.success) {
        setUsers((prev) => prev.map((u) => (u.id === settingsTarget.id ? data.user : u)))
        setSettingsTarget(null)
      } else {
        setSettingsError(data.error || 'Erro ao guardar definições')
      }
    } catch (err) {
      console.error(err)
      setSettingsError('Erro ao ligar à base de dados.')
    } finally {
      setSavingSettings(false)
    }
  }

  const [ordersTarget, setOrdersTarget] = useState<User | null>(null)
  const [userOrders, setUserOrders] = useState<Order[]>([])
  const [userOrdersLoading, setUserOrdersLoading] = useState(false)
  const [userOrdersError, setUserOrdersError] = useState('')
  const [userOrdersSearch, setUserOrdersSearch] = useState('')

  const [clientsTarget, setClientsTarget] = useState<User | null>(null)
  const [userClients, setUserClients] = useState<Client[]>([])
  const [userClientsLoading, setUserClientsLoading] = useState(false)
  const [userClientsError, setUserClientsError] = useState('')
  const [userClientsSearch, setUserClientsSearch] = useState('')

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/users')
      const data = await res.json()
      if (data.success) {
        setUsers(data.users)
      } else {
        setError(data.error || 'Erro ao carregar utilizadores')
      }
    } catch (err) {
      console.error(err)
      setError('Erro ao ligar à base de dados.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      })
      const data = await res.json()
      if (data.success) {
        setUsers((prev) => [data.user, ...prev])
        setNewUser({
          name: '',
          email: '',
          password: '',
          role: 'operador',
          ordersAccess: true,
          avatarUrl: '',
          commercialId: '',
        })
        setAvatarError('')
        setShowForm(false)
      } else {
        setError(data.error || 'Erro ao criar utilizador')
      }
    } catch (err) {
      console.error(err)
      setError('Erro ao ligar à base de dados.')
    } finally {
      setCreating(false)
    }
  }

  const handleRoleChange = async (id: string, role: UserRole) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      const data = await res.json()
      if (data.success) {
        setUsers((prev) => prev.map((u) => (u.id === id ? data.user : u)))
      } else {
        alert(data.error || 'Erro ao atualizar perfil')
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao atualizar perfil.')
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordTarget) return
    setSavingPassword(true)
    setPasswordError('')
    try {
      const res = await fetch(`/api/users/${passwordTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      })
      const data = await res.json()
      if (data.success) {
        setPasswordTarget(null)
        setNewPassword('')
      } else {
        setPasswordError(data.error || 'Erro ao alterar palavra-passe')
      }
    } catch (err) {
      console.error(err)
      setPasswordError('Erro ao ligar à base de dados.')
    } finally {
      setSavingPassword(false)
    }
  }

  const handleOrdersAccessChange = async (id: string, ordersAccess: boolean) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ordersAccess }),
      })
      const data = await res.json()
      if (data.success) {
        setUsers((prev) => prev.map((u) => (u.id === id ? data.user : u)))
      } else {
        alert(data.error || 'Erro ao atualizar acesso')
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao atualizar acesso.')
    }
  }

  const handleViewOrders = async (u: User) => {
    setOrdersTarget(u)
    setUserOrdersSearch('')
    setUserOrdersError('')
    setUserOrdersLoading(true)
    try {
      const res = await fetch(`/api/orders?userId=${u.id}`)
      const data = await res.json()
      if (data.success) {
        setUserOrders(data.orders)
      } else {
        setUserOrdersError(data.error || 'Erro ao carregar encomendas')
      }
    } catch (err) {
      console.error(err)
      setUserOrdersError('Erro ao ligar à base de dados.')
    } finally {
      setUserOrdersLoading(false)
    }
  }

  const filteredUserOrders = userOrders.filter((o) =>
    o.client.toLowerCase().includes(userOrdersSearch.trim().toLowerCase())
  )

  const handleViewClients = async (u: User) => {
    setClientsTarget(u)
    setUserClientsSearch('')
    setUserClientsError('')
    setUserClientsLoading(true)
    try {
      // GET /api/clients devolve tudo ao admin (com ownerId de cada cliente) — filtra-se aqui
      // para a carteira deste utilizador em concreto, sem precisar de um endpoint à parte.
      const res = await fetch('/api/clients')
      const data = await res.json()
      if (data.success) {
        setUserClients((data.clients as Client[]).filter((c) => c.ownerId === u.id))
      } else {
        setUserClientsError(data.error || 'Erro ao carregar carteira de clientes')
      }
    } catch (err) {
      console.error(err)
      setUserClientsError('Erro ao ligar à base de dados.')
    } finally {
      setUserClientsLoading(false)
    }
  }

  const filteredUserClients = userClients.filter((c) =>
    c.name.toLowerCase().includes(userClientsSearch.trim().toLowerCase())
  )

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem a certeza que deseja eliminar o utilizador "${name}"?`)) return
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setUsers((prev) => prev.filter((u) => u.id !== id))
      } else {
        alert(data.error || 'Erro ao eliminar utilizador')
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao eliminar utilizador.')
    }
  }

  return (
    <main className="mx-auto max-w-[1400px] p-5 sm:p-8">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-[#16a34a]">
            Sistema de Gestão Industrial
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl text-[#152126]">Utilizadores</h1>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 rounded-xl bg-[#16a34a] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#12883d] transition"
        >
          <UserPlus className="size-4" /> Novo Utilizador
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">{error}</p>
      )}

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 grid gap-4 rounded-2xl border border-[#e0e8e3] bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4"
        >
          <label className="flex flex-col gap-1.5 text-xs font-bold text-[#56655e]">
            Nome
            <input
              required
              value={newUser.name}
              onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))}
              className="h-10 rounded-lg border border-[#dce5df] px-3 text-sm outline-none focus:border-[#16a34a]"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-bold text-[#56655e]">
            Email
            <input
              required
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
              className="h-10 rounded-lg border border-[#dce5df] px-3 text-sm outline-none focus:border-[#16a34a]"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-bold text-[#56655e]">
            Palavra-passe
            <input
              required
              type="password"
              minLength={8}
              value={newUser.password}
              onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
              className="h-10 rounded-lg border border-[#dce5df] px-3 text-sm outline-none focus:border-[#16a34a]"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-bold text-[#56655e]">
            Fotografia de perfil
            <span className="flex h-10 items-center gap-2.5 rounded-lg border border-[#dce5df] px-2">
              {newUser.avatarUrl ? (
                <img src={newUser.avatarUrl} alt="" className="size-7 rounded-full object-cover" />
              ) : (
                <UserRound className="size-5 text-[#87918c]" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="flex-1 text-xs text-[#526058] file:mr-2 file:rounded file:border-0 file:bg-[#eef3f0] file:px-2 file:py-1 file:text-[10px] file:font-bold file:text-[#35433d]"
              />
              {newUser.avatarUrl && (
                <button
                  type="button"
                  onClick={() => setNewUser((p) => ({ ...p, avatarUrl: '' }))}
                  className="text-[10px] font-bold text-red-500 hover:underline"
                >
                  Remover
                </button>
              )}
            </span>
            {avatarError && <span className="text-[10px] font-semibold text-red-500">{avatarError}</span>}
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-bold text-[#56655e]">
            Perfil
            <select
              value={newUser.role}
              onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value as UserRole }))}
              className="h-10 rounded-lg border border-[#dce5df] px-3 text-sm outline-none focus:border-[#16a34a]"
            >
              <option value="operador">Cliente</option>
              <option value="comercial">Comercial</option>
              <option value="admin">Administrador</option>
              <option value="fabrica">Fábrica</option>
            </select>
          </label>
          {newUser.role === 'operador' && (
            <label className="flex flex-col gap-1.5 text-xs font-bold text-[#56655e]">
              Comercial responsável
              <span className="flex h-10 items-center gap-2 rounded-lg border border-[#dce5df] px-2">
                {(() => {
                  const selectedCommercial = users.find((u) => u.id === newUser.commercialId)
                  return selectedCommercial?.avatarUrl ? (
                    <img src={selectedCommercial.avatarUrl} alt="" className="size-6 rounded-full object-cover" />
                  ) : (
                    <UserRound className="size-5 text-[#87918c]" />
                  )
                })()}
                <select
                  value={newUser.commercialId}
                  onChange={(e) => setNewUser((p) => ({ ...p, commercialId: e.target.value }))}
                  className="h-full flex-1 bg-transparent text-xs font-normal outline-none"
                >
                  <option value="">Nenhum</option>
                  {users
                    .filter((u) => u.role === 'comercial')
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                </select>
              </span>
            </label>
          )}
          <label className="flex flex-col justify-end gap-1.5 text-xs font-bold text-[#56655e]">
            Painel de Orçamentos
            <span className="flex h-10 items-center gap-2 rounded-lg border border-[#dce5df] px-3">
              <input
                type="checkbox"
                checked={newUser.ordersAccess}
                disabled={newUser.role === 'admin'}
                onChange={(e) => setNewUser((p) => ({ ...p, ordersAccess: e.target.checked }))}
                className="size-4 accent-[#16a34a]"
              />
              <span className="text-xs font-semibold text-[#526058]">
                {newUser.role === 'admin' ? 'Sempre ativo' : 'Tem acesso'}
              </span>
            </span>
          </label>
          <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
            <button
              type="submit"
              disabled={creating}
              className="flex items-center gap-2 rounded-lg bg-[#16a34a] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#12883d] disabled:opacity-60"
            >
              {creating ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Criar utilizador
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-[#e0e8e3] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[#fafcfb] text-xs text-[#87918c] border-b border-[#edf1ee]">
              <tr>
                <th className="px-5 py-4 font-bold">Nome</th>
                <th className="px-5 py-4 font-bold">Email</th>
                <th className="px-5 py-4 font-bold">Perfil</th>
                <th className="px-5 py-4 font-bold">Comercial</th>
                <th className="px-5 py-4 font-bold text-center">Painel de Orçamentos</th>
                <th className="px-5 py-4 font-bold">Desde</th>
                <th className="px-5 py-4 font-bold text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1ee]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-gray-400">
                    <Loader2 className="mx-auto mb-2 size-6 animate-spin text-[#16a34a]" />
                    A carregar utilizadores...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-gray-500">
                    Nenhum utilizador encontrado.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#fbfcfb] transition">
                    <td className="px-5 py-4">
                      <p className="flex items-center gap-2 font-bold text-[#152126] text-xs">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt="" className="size-5 rounded-full object-cover" />
                        ) : (
                          <UserRound className="size-3.5 text-[#87918c]" />
                        )}
                        {u.name}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-xs text-[#526058]">{u.email}</td>
                    <td className="px-5 py-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                        className="rounded-md border border-[#dce5df] bg-white px-2 py-1.5 text-xs font-semibold outline-none focus:border-[#16a34a]"
                      >
                        <option value="operador">Cliente</option>
                        <option value="comercial">Comercial</option>
                        <option value="admin">Administrador</option>
                        <option value="fabrica">Fábrica</option>
                      </select>
                    </td>
                    <td className="px-5 py-4 text-xs text-[#526058]">
                      {u.role === 'operador' ? (
                        (() => {
                          const commercial = users.find((c) => c.id === u.commercialId)
                          return commercial ? (
                            <span className="flex items-center gap-1.5">
                              {commercial.avatarUrl ? (
                                <img src={commercial.avatarUrl} alt="" className="size-5 rounded-full object-cover" />
                              ) : (
                                <UserRound className="size-3.5 text-[#87918c]" />
                              )}
                              {commercial.name}
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-400">Sem comercial</span>
                          )
                        })()
                      ) : (
                        <span className="text-[11px] text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {u.role === 'admin' ? (
                        <span className="text-[11px] font-semibold text-[#87918c]">Sempre ativo</span>
                      ) : (
                        <button
                          onClick={() => handleOrdersAccessChange(u.id, !u.ordersAccess)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                            u.ordersAccess ? 'bg-[#16a34a]' : 'bg-gray-300'
                          }`}
                          title={
                            u.ordersAccess
                              ? 'Clique para desativar o acesso à plataforma'
                              : 'Clique para reativar o acesso à plataforma'
                          }
                        >
                          <span
                            className={`inline-block size-4 transform rounded-full bg-white transition ${
                              u.ordersAccess ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-[#86928b]">
                      {new Date(u.createdAt).toLocaleDateString('pt-PT')}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenSettings(u)}
                          className="rounded-lg border border-[#dce5df] p-2 text-[#526058] hover:bg-[#f3f6f4] transition"
                          title="Definições (foto de perfil, comercial)"
                        >
                          <Settings2 className="size-3.5" />
                        </button>
                        <button
                          onClick={() => handleViewOrders(u)}
                          className="rounded-lg border border-[#dce5df] p-2 text-[#526058] hover:bg-[#f3f6f4] transition"
                          title="Ver encomendas registadas"
                        >
                          <Package className="size-3.5" />
                        </button>
                        {(u.role === 'comercial' || u.role === 'admin') && (
                          <button
                            onClick={() => handleViewClients(u)}
                            className="rounded-lg border border-[#dce5df] p-2 text-[#526058] hover:bg-[#f3f6f4] transition"
                            title="Ver carteira de clientes"
                          >
                            <Contact className="size-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setPasswordTarget(u)
                            setNewPassword('')
                            setPasswordError('')
                          }}
                          className="rounded-lg border border-[#dce5df] p-2 text-[#526058] hover:bg-[#f3f6f4] transition"
                          title="Alterar palavra-passe"
                        >
                          <KeyRound className="size-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(u.id, u.name)}
                          className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50 transition"
                          title="Eliminar utilizador"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {passwordTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPasswordTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[#e9f7ee] text-[#16a34a]">
                <KeyRound className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#152126]">Alterar palavra-passe</h3>
                <p className="text-xs text-[#87918c]">{passwordTarget.name} · {passwordTarget.email}</p>
              </div>
            </div>
            <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-xs font-bold text-[#56655e]">
                Nova palavra-passe
                <input
                  autoFocus
                  required
                  type="password"
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="h-11 rounded-lg border border-[#dce5df] px-3 text-sm outline-none focus:border-[#16a34a]"
                />
              </label>
              {passwordError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{passwordError}</p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPasswordTarget(null)}
                  className="rounded-xl border border-gray-300 px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="flex items-center gap-2 rounded-xl bg-[#16a34a] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#12883d] disabled:opacity-60"
                >
                  {savingPassword ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {settingsTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setSettingsTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[#e9f7ee] text-[#16a34a]">
                <Settings2 className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#152126]">Definições do utilizador</h3>
                <p className="text-xs text-[#87918c]">{settingsTarget.name} · {settingsTarget.email}</p>
              </div>
            </div>
            <form onSubmit={handleSaveSettings} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-xs font-bold text-[#56655e]">
                Fotografia de perfil
                <span className="flex h-10 items-center gap-2.5 rounded-lg border border-[#dce5df] px-2">
                  {settingsAvatarUrl ? (
                    <img src={settingsAvatarUrl} alt="" className="size-7 rounded-full object-cover" />
                  ) : (
                    <UserRound className="size-5 text-[#87918c]" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSettingsAvatarChange}
                    className="flex-1 text-xs text-[#526058] file:mr-2 file:rounded file:border-0 file:bg-[#eef3f0] file:px-2 file:py-1 file:text-[10px] file:font-bold file:text-[#35433d]"
                  />
                  {settingsAvatarUrl && (
                    <button
                      type="button"
                      onClick={() => setSettingsAvatarUrl('')}
                      className="text-[10px] font-bold text-red-500 hover:underline"
                    >
                      Remover
                    </button>
                  )}
                </span>
                {settingsAvatarError && (
                  <span className="text-[10px] font-semibold text-red-500">{settingsAvatarError}</span>
                )}
              </label>
              {settingsTarget.role === 'operador' && (
                <label className="flex flex-col gap-1.5 text-xs font-bold text-[#56655e]">
                  Comercial responsável
                  <span className="flex h-10 items-center gap-2 rounded-lg border border-[#dce5df] px-2">
                    {(() => {
                      const selectedCommercial = users.find((u) => u.id === settingsCommercialId)
                      return selectedCommercial?.avatarUrl ? (
                        <img src={selectedCommercial.avatarUrl} alt="" className="size-6 rounded-full object-cover" />
                      ) : (
                        <UserRound className="size-5 text-[#87918c]" />
                      )
                    })()}
                    <select
                      value={settingsCommercialId}
                      onChange={(e) => setSettingsCommercialId(e.target.value)}
                      className="h-full flex-1 bg-transparent text-xs font-normal outline-none"
                    >
                      <option value="">Nenhum</option>
                      {users
                        .filter((u) => u.role === 'comercial')
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                    </select>
                  </span>
                </label>
              )}
              {settingsError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{settingsError}</p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSettingsTarget(null)}
                  className="rounded-xl border border-gray-300 px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="flex items-center gap-2 rounded-xl bg-[#16a34a] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#12883d] disabled:opacity-60"
                >
                  {savingSettings ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {ordersTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOrdersTarget(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-[#e9f7ee] text-[#16a34a]">
                  <Package className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#152126]">Encomendas de {ordersTarget.name}</h3>
                  <p className="text-xs text-[#87918c]">{ordersTarget.email}</p>
                </div>
              </div>
              <button onClick={() => setOrdersTarget(null)} aria-label="Fechar">
                <X className="size-5 text-gray-500" />
              </button>
            </div>

            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-gray-400" />
              <input
                value={userOrdersSearch}
                onChange={(e) => setUserOrdersSearch(e.target.value)}
                placeholder="Pesquisar pelo nome do cliente..."
                className="h-9 w-full rounded-lg border border-[#dce5df] bg-white pl-9 pr-3 text-xs outline-none focus:border-[#16a34a]"
              />
            </div>

            <div className="overflow-y-auto rounded-xl border border-[#e0e8e3]">
              {userOrdersLoading ? (
                <p className="py-10 text-center text-xs text-gray-400">
                  <Loader2 className="mx-auto mb-2 size-6 animate-spin text-[#16a34a]" />
                  A carregar encomendas...
                </p>
              ) : userOrdersError ? (
                <p className="py-10 text-center text-xs text-red-600">{userOrdersError}</p>
              ) : filteredUserOrders.length === 0 ? (
                <p className="py-10 text-center text-xs text-gray-500">
                  {userOrders.length === 0
                    ? 'Este utilizador ainda não registou nenhuma encomenda.'
                    : 'Nenhuma encomenda corresponde à pesquisa.'}
                </p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#fafcfb] text-xs text-[#87918c] border-b border-[#edf1ee]">
                    <tr>
                      <th className="px-4 py-3 font-bold">Referência</th>
                      <th className="px-4 py-3 font-bold">Cliente / Obra</th>
                      <th className="px-4 py-3 font-bold">Data</th>
                      <th className="px-4 py-3 font-bold">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf1ee]">
                    {filteredUserOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-[#fbfcfb] transition">
                        <td className="px-4 py-3 text-xs font-bold text-[#152126]">{o.referenceNumber}</td>
                        <td className="px-4 py-3 text-xs text-[#526058]">{o.client}</td>
                        <td className="px-4 py-3 text-xs text-[#86928b]">
                          {new Date(o.createdAt).toLocaleDateString('pt-PT')}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold ${
                              o.status === 'Concluído'
                                ? 'bg-[#e9f7ee] text-[#168443] border-emerald-300'
                                : o.status === 'Produção'
                                ? 'bg-[#fff6df] text-[#a06d00] border-amber-300'
                                : o.status === 'Cancelado'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-[#edf3ff] text-[#3664aa] border-blue-300'
                            }`}
                          >
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {clientsTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setClientsTarget(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-[#e9f7ee] text-[#16a34a]">
                  <Contact className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#152126]">Carteira de {clientsTarget.name}</h3>
                  <p className="text-xs text-[#87918c]">{clientsTarget.email}</p>
                </div>
              </div>
              <button onClick={() => setClientsTarget(null)} aria-label="Fechar">
                <X className="size-5 text-gray-500" />
              </button>
            </div>

            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-gray-400" />
              <input
                value={userClientsSearch}
                onChange={(e) => setUserClientsSearch(e.target.value)}
                placeholder="Pesquisar pelo nome do cliente..."
                className="h-9 w-full rounded-lg border border-[#dce5df] bg-white pl-9 pr-3 text-xs outline-none focus:border-[#16a34a]"
              />
            </div>

            <div className="overflow-y-auto rounded-xl border border-[#e0e8e3]">
              {userClientsLoading ? (
                <p className="py-10 text-center text-xs text-gray-400">
                  <Loader2 className="mx-auto mb-2 size-6 animate-spin text-[#16a34a]" />
                  A carregar carteira de clientes...
                </p>
              ) : userClientsError ? (
                <p className="py-10 text-center text-xs text-red-600">{userClientsError}</p>
              ) : filteredUserClients.length === 0 ? (
                <p className="py-10 text-center text-xs text-gray-500">
                  {userClients.length === 0
                    ? 'Este utilizador ainda não tem clientes na carteira.'
                    : 'Nenhum cliente corresponde à pesquisa.'}
                </p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#fafcfb] text-xs text-[#87918c] border-b border-[#edf1ee]">
                    <tr>
                      <th className="px-4 py-3 font-bold">Nome</th>
                      <th className="px-4 py-3 font-bold">Contacto</th>
                      <th className="px-4 py-3 font-bold">NIF</th>
                      <th className="px-4 py-3 font-bold">Desde</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf1ee]">
                    {filteredUserClients.map((c) => (
                      <tr key={c.id} className="hover:bg-[#fbfcfb] transition">
                        <td className="px-4 py-3 text-xs font-bold text-[#152126]">{c.name}</td>
                        <td className="px-4 py-3 text-xs text-[#526058]">{c.email || c.phone || '—'}</td>
                        <td className="px-4 py-3 text-xs text-[#86928b]">{c.taxId || '—'}</td>
                        <td className="px-4 py-3 text-xs text-[#86928b]">
                          {new Date(c.createdAt).toLocaleDateString('pt-PT')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function ClientsPage({ user, nav }: { user: User; nav: NavCallbacks }) {
  return (
    <div className="min-h-screen bg-[#f3f6f4] text-[#152126]">
      <TopNav user={user} active="clients" nav={nav} />
      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-[#152126]">
          <Contact className="size-6 text-[#16a34a]" /> Carteira de Clientes
        </h1>
        <p className="mt-1 text-sm text-[#6d7973]">
          {user.role === 'admin'
            ? 'Clientes de todos os comerciais — cada cartão mostra a quem pertence.'
            : 'Os seus clientes — escolha-os diretamente ao registar uma encomenda ou orçamento.'}
        </p>
        <ClientsPanel user={user} />
      </main>
    </div>
  )
}

function ClientsPanel({ user }: { user: User }) {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', taxId: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('')

  const fetchClients = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/clients')
      const data = await res.json()
      if (data.success) setClients(data.clients)
      else setError(data.error || 'Erro ao carregar clientes')
    } catch (err) {
      console.error(err)
      setError('Erro ao ligar à base de dados.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [])

  const openNew = () => {
    setEditingClient(null)
    setForm({ name: '', email: '', phone: '', address: '', taxId: '', notes: '' })
    setFormError('')
    setShowForm(true)
  }

  const openEdit = (c: Client) => {
    setEditingClient(c)
    setForm({
      name: c.name,
      email: c.email || '',
      phone: c.phone || '',
      address: c.address || '',
      taxId: c.taxId || '',
      notes: c.notes || '',
    })
    setFormError('')
    setShowForm(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setFormError('Indique o nome do cliente')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const res = editingClient
        ? await fetch(`/api/clients/${editingClient.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          })
        : await fetch('/api/clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          })
      const data = await res.json()
      if (data.success) {
        if (editingClient) {
          setClients((prev) => prev.map((c) => (c.id === editingClient.id ? data.client : c)))
        } else {
          setClients((prev) => [data.client, ...prev])
        }
        setShowForm(false)
      } else {
        setFormError(data.error || 'Erro ao guardar cliente')
      }
    } catch (err) {
      console.error(err)
      setFormError('Erro ao ligar à base de dados.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (c: Client) => {
    if (!confirm(`Remover "${c.name}" da carteira?`)) return
    try {
      const res = await fetch(`/api/clients/${c.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) setClients((prev) => prev.filter((x) => x.id !== c.id))
    } catch (err) {
      console.error(err)
    }
  }

  const owners = Array.from(new Set(clients.map((c) => c.ownerName).filter((n): n is string => !!n))).sort()

  const filtered = clients.filter((c) => {
    if (ownerFilter && c.ownerName !== ownerFilter) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.ownerName || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar cliente..."
              className="h-10 w-full rounded-lg border border-[#dce5df] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#16a34a]"
            />
          </div>
          {user.role === 'admin' && owners.length > 1 && (
            <select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              className="h-10 max-w-[220px] rounded-lg border border-[#dce5df] bg-white px-3 text-sm outline-none focus:border-[#16a34a]"
            >
              <option value="">Todos os comerciais</option>
              {owners.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          )}
        </div>
        <button
          type="button"
          onClick={openNew}
          className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[#16a34a] px-4 text-sm font-bold text-white hover:bg-[#12883d]"
        >
          <UserPlus className="size-4" /> Novo Cliente
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-6 animate-spin text-[#16a34a]" />
        </div>
      ) : error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{error}</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#dce5df] bg-white p-8 text-center text-sm text-[#87918c]">
          {clients.length === 0 ? 'Ainda não tem clientes na carteira.' : 'Nenhum cliente encontrado.'}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((c) => (
            <div key={c.id} className="flex flex-col gap-2 rounded-xl border border-[#e0e8e3] bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-[#152126]">{c.name}</p>
                  {user.role === 'admin' && c.ownerName && (
                    <span className="mt-0.5 inline-block rounded bg-[#e9f7ee] px-1.5 py-0.5 text-[10px] font-bold text-[#16a34a]">
                      {c.ownerName}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(c)}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  >
                    <Settings2 className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(c)}
                    className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-0.5 text-xs text-[#6d7973]">
                {c.email && <span>{c.email}</span>}
                {c.phone && <span>Tel: {c.phone}</span>}
                {c.address && <span>{c.address}</span>}
                {c.taxId && <span>NIF: {c.taxId}</span>}
              </div>
              {c.notes && <p className="mt-1 text-xs text-[#8a958f]">{c.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowForm(false)}
        >
          <form
            onSubmit={handleSave}
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-md flex-col gap-3 rounded-2xl bg-white p-6 shadow-xl"
          >
            <h3 className="text-lg font-bold text-[#152126]">{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h3>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Nome / Empresa *"
              className="h-10 rounded-lg border border-[#dce5df] px-3 text-sm outline-none focus:border-[#16a34a]"
              autoFocus
            />
            <input
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="Email"
              type="email"
              className="h-10 rounded-lg border border-[#dce5df] px-3 text-sm outline-none focus:border-[#16a34a]"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="Telefone"
                className="h-10 rounded-lg border border-[#dce5df] px-3 text-sm outline-none focus:border-[#16a34a]"
              />
              <input
                value={form.taxId}
                onChange={(e) => setForm((p) => ({ ...p, taxId: e.target.value }))}
                placeholder="NIF"
                className="h-10 rounded-lg border border-[#dce5df] px-3 text-sm outline-none focus:border-[#16a34a]"
              />
            </div>
            <input
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              placeholder="Morada"
              className="h-10 rounded-lg border border-[#dce5df] px-3 text-sm outline-none focus:border-[#16a34a]"
            />
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Notas (opcional)"
              rows={2}
              className="resize-none rounded-lg border border-[#dce5df] px-3 py-2 text-sm outline-none focus:border-[#16a34a]"
            />
            {formError && <p className="text-xs font-semibold text-red-600">{formError}</p>}
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 rounded-lg border border-gray-300 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#16a34a] py-2.5 text-xs font-bold text-white hover:bg-[#12883d] disabled:opacity-60"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                {editingClient ? 'Guardar' : 'Adicionar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function StockPage({ user, nav }: { user: User; nav: NavCallbacks }) {
  return (
    <div className="min-h-screen bg-[#f3f6f4] text-[#152126]">
      <TopNav user={user} active="stock" nav={nav} />
      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-[#152126]">
          <Boxes className="size-6 text-[#16a34a]" /> Outros Artigos
        </h1>
        <p className="mt-1 text-sm text-[#6d7973]">
          {user.role === 'admin'
            ? 'Catálogo de produtos avulso fora do configurador de portões — podes gerir categorias e produtos.'
            : 'Catálogo de produtos avulso fora do configurador de portões.'}
        </p>
        <StockPanel user={user} />
      </main>
    </div>
  )
}

function StockPanel({ user }: { user: User }) {
  const isAdmin = user.role === 'admin'
  const [categories, setCategories] = useState<StockCategory[]>([])
  const [products, setProducts] = useState<StockProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [activeCategoryId, setActiveCategoryId] = useState('')
  const [viewingPhoto, setViewingPhoto] = useState<{ url: string; name: string } | null>(null)

  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<StockCategory | null>(null)
  const [categoryForm, setCategoryForm] = useState({ name: '', photoUrl: '', parentId: '' })
  const [savingCategory, setSavingCategory] = useState(false)
  const [categoryPhotoError, setCategoryPhotoError] = useState('')

  const [showProductForm, setShowProductForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<StockProduct | null>(null)
  const [productForm, setProductForm] = useState({
    categoryId: '',
    name: '',
    description: '',
    price: '',
    unit: 'un' as StockProductUnit,
    photoUrl: '',
    fileUrl: '',
    fileName: '',
    active: true,
  })
  const [savingProduct, setSavingProduct] = useState(false)
  const [formError, setFormError] = useState('')
  const [productPhotoError, setProductPhotoError] = useState('')
  const [productFileError, setProductFileError] = useState('')

  const handleCategoryPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setCategoryPhotoError('')
    resizeImageToDataUrl(file, 300, (dataUrl) => setCategoryForm((p) => ({ ...p, photoUrl: dataUrl })), setCategoryPhotoError)
  }

  const handleProductPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setProductPhotoError('')
    resizeImageToDataUrl(file, 500, (dataUrl) => setProductForm((p) => ({ ...p, photoUrl: dataUrl })), setProductPhotoError)
  }

  const handleProductFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setProductFileError('')
    readFileAsDataUrl(
      file,
      (dataUrl, fileName) => setProductForm((p) => ({ ...p, fileUrl: dataUrl, fileName })),
      setProductFileError
    )
  }

  // Carrinho de compras — só para comercial/cliente; o admin não compra, só gere o catálogo.
  const [cart, setCart] = useState<Record<string, number>>({})
  // Só para artigos ao metro: comprimento de cada peça (ex: 2 tubos de 2m => cart[id]=2, cartMeters[id]=2).
  const [cartMeters, setCartMeters] = useState<Record<string, number>>({})
  // Só para artigos ao m²: área de cada peça (ex: 3 placas de 1.5m² => cart[id]=3, cartSquareMeters[id]=1.5).
  const [cartSquareMeters, setCartSquareMeters] = useState<Record<string, number>>({})
  const [showCheckout, setShowCheckout] = useState(false)
  const [portfolioClients, setPortfolioClients] = useState<Client[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false)
  const [checkoutForm, setCheckoutForm] = useState({
    client: user.role === 'operador' ? user.name : '',
    clientEmail: user.role === 'operador' ? user.email : '',
    clientPhone: '',
    clientAddress: '',
    clientTaxId: '',
    notes: '',
  })
  const [placingOrder, setPlacingOrder] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [createdStockOrder, setCreatedStockOrder] = useState<StockOrder | null>(null)

  useEffect(() => {
    if (user.role !== 'comercial') return
    fetch('/api/clients')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setPortfolioClients(data.clients)
      })
      .catch((err) => console.error('Erro ao carregar carteira de clientes:', err))
  }, [user.role])

  const addToCart = (productId: string) => {
    const product = products.find((p) => p.id === productId)
    setCart((prev) => ({ ...prev, [productId]: (prev[productId] || 0) + 1 }))
    if (product?.unit === 'm') {
      setCartMeters((prev) => (productId in prev ? prev : { ...prev, [productId]: 1 }))
    }
    if (product?.unit === 'm2') {
      setCartSquareMeters((prev) => (productId in prev ? prev : { ...prev, [productId]: 1 }))
    }
  }
  const setCartQty = (productId: string, qty: number) => {
    setCart((prev) => {
      if (qty <= 0) {
        const next = { ...prev }
        delete next[productId]
        return next
      }
      return { ...prev, [productId]: qty }
    })
    if (qty <= 0) {
      setCartMeters((prev) => {
        if (!(productId in prev)) return prev
        const next = { ...prev }
        delete next[productId]
        return next
      })
      setCartSquareMeters((prev) => {
        if (!(productId in prev)) return prev
        const next = { ...prev }
        delete next[productId]
        return next
      })
    }
  }
  const setCartMetersValue = (productId: string, meters: number) =>
    setCartMeters((prev) => ({ ...prev, [productId]: meters }))
  const setCartSquareMetersValue = (productId: string, squareMeters: number) =>
    setCartSquareMeters((prev) => ({ ...prev, [productId]: squareMeters }))
  const cartEntries = Object.entries(cart)
    .map(([productId, quantity]) => ({
      product: products.find((p) => p.id === productId),
      quantity,
      meters: cartMeters[productId] ?? 1,
      squareMeters: cartSquareMeters[productId] ?? 1,
    }))
    .filter(
      (e): e is { product: StockProduct; quantity: number; meters: number; squareMeters: number } => !!e.product
    )
  const cartCount = cartEntries.reduce((sum, e) => sum + e.quantity, 0)
  const cartMultiplier = (e: (typeof cartEntries)[number]) =>
    e.product.unit === 'm' ? e.meters : e.product.unit === 'm2' ? e.squareMeters : 1
  const cartTotal = cartEntries.reduce((sum, e) => sum + (e.product.price ?? 0) * e.quantity * cartMultiplier(e), 0)

  const handlePickPortfolioClient = (id: string) => {
    setSelectedClientId(id)
    const picked = portfolioClients.find((c) => c.id === id)
    if (!picked) return
    setCheckoutForm((p) => ({
      ...p,
      client: picked.name,
      clientEmail: picked.email || '',
      clientPhone: picked.phone || '',
      clientAddress: picked.address || '',
      clientTaxId: picked.taxId || '',
    }))
    setClientSearch(picked.name)
    setClientDropdownOpen(false)
  }

  const filteredPortfolioClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase()
    if (!q) return portfolioClients
    return portfolioClients.filter((c) => c.name.toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q))
  }, [portfolioClients, clientSearch])

  // Mesmo mecanismo de notificação por email usado nas encomendas/orçamentos do configurador de
  // portões (ver notifyOwner em Home) — "Outros Artigos" é outro tipo de encomenda, por isso usa
  // o mesmo destino OWNER_EMAIL_ENCOMENDA/OWNER_EMAIL. Corre em segundo plano, sem bloquear nem
  // assustar quem acabou de submeter o pedido.
  const notifyOwnerStock = async (stockOrder: StockOrder) => {
    try {
      const { dataUri, fileName } = await getStockOrderPDFBase64(stockOrder)
      await fetch('/api/notify-owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'encomenda',
          orderId: stockOrder.id,
          client: stockOrder.client,
          pdfDataUri: dataUri,
          fileName,
        }),
      })
    } catch (err) {
      console.error('Erro ao notificar o dono por email:', err)
    }
  }

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!checkoutForm.client.trim()) {
      setCheckoutError('Indique o nome do cliente')
      return
    }
    setPlacingOrder(true)
    setCheckoutError('')
    try {
      const res = await fetch('/api/stock-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...checkoutForm,
          items: cartEntries.map((e) => ({
            productId: e.product.id,
            quantity: e.quantity,
            meters: e.product.unit === 'm' ? e.meters : undefined,
            squareMeters: e.product.unit === 'm2' ? e.squareMeters : undefined,
          })),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setCreatedStockOrder(data.stockOrder)
        setCart({})
        setShowCheckout(false)
        notifyOwnerStock(data.stockOrder)
      } else {
        setCheckoutError(data.error || 'Erro ao submeter o pedido')
      }
    } catch (err) {
      console.error(err)
      setCheckoutError('Erro ao ligar à base de dados.')
    } finally {
      setPlacingOrder(false)
    }
  }

  const fetchAll = async () => {
    try {
      setLoading(true)
      const [catRes, prodRes] = await Promise.all([fetch('/api/stock/categories'), fetch('/api/stock/products')])
      const catData = await catRes.json()
      const prodData = await prodRes.json()
      if (catData.success) setCategories(catData.categories)
      else setError(catData.error || 'Erro ao carregar categorias')
      if (prodData.success) setProducts(prodData.products)
      else setError(prodData.error || 'Erro ao carregar produtos')
    } catch (err) {
      console.error(err)
      setError('Erro ao ligar à base de dados.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const openNewCategory = (parentId?: string) => {
    setEditingCategory(null)
    setCategoryForm({ name: '', photoUrl: '', parentId: parentId || '' })
    setCategoryPhotoError('')
    setShowCategoryForm(true)
  }

  const openEditCategory = (c: StockCategory) => {
    setEditingCategory(c)
    setCategoryForm({ name: c.name, photoUrl: c.photoUrl || '', parentId: c.parentId || '' })
    setCategoryPhotoError('')
    setShowCategoryForm(true)
  }

  // Só uma camada de subcategorias — uma categoria só pode ser "principal" se ela própria não
  // tiver pai, e nunca pode ser pai de si mesma ao editar.
  const parentCategoryOptions = categories.filter((c) => !c.parentId && c.id !== editingCategory?.id)

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!categoryForm.name.trim()) return
    setSavingCategory(true)
    try {
      const body = { name: categoryForm.name.trim(), photoUrl: categoryForm.photoUrl, parentId: categoryForm.parentId || null }
      const res = editingCategory
        ? await fetch(`/api/stock/categories/${editingCategory.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        : await fetch('/api/stock/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...body, sortOrder: categories.length }),
          })
      const data = await res.json()
      if (data.success) {
        if (editingCategory) {
          setCategories((prev) => prev.map((c) => (c.id === editingCategory.id ? data.category : c)))
        } else {
          setCategories((prev) => [...prev, data.category])
        }
        setShowCategoryForm(false)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSavingCategory(false)
    }
  }

  const handleDeleteCategory = async (c: StockCategory) => {
    if (!confirm(`Eliminar a categoria "${c.name}"? Os produtos dentro dela também serão eliminados.`)) return
    try {
      const res = await fetch(`/api/stock/categories/${c.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setCategories((prev) => prev.filter((x) => x.id !== c.id))
        setProducts((prev) => prev.filter((p) => p.categoryId !== c.id))
        if (activeCategoryId === c.id) setActiveCategoryId('')
      }
    } catch (err) {
      console.error(err)
    }
  }

  const openNewProduct = () => {
    setEditingProduct(null)
    setProductForm({
      categoryId: activeCategoryId || categories[0]?.id || '',
      name: '',
      description: '',
      price: '',
      unit: 'un',
      photoUrl: '',
      fileUrl: '',
      fileName: '',
      active: true,
    })
    setFormError('')
    setProductPhotoError('')
    setProductFileError('')
    setShowProductForm(true)
  }

  const openEditProduct = (p: StockProduct) => {
    setEditingProduct(p)
    setProductForm({
      categoryId: p.categoryId,
      name: p.name,
      description: p.description || '',
      price: p.price != null ? String(p.price) : '',
      unit: p.unit || 'un',
      photoUrl: p.photoUrl || '',
      fileUrl: p.fileUrl || '',
      fileName: p.fileName || '',
      active: p.active,
    })
    setFormError('')
    setProductPhotoError('')
    setProductFileError('')
    setShowProductForm(true)
  }

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productForm.name.trim()) {
      setFormError('Indique o nome do produto')
      return
    }
    if (!productForm.categoryId) {
      setFormError('Escolha uma categoria')
      return
    }
    setSavingProduct(true)
    setFormError('')
    try {
      const body = {
        categoryId: productForm.categoryId,
        name: productForm.name.trim(),
        description: productForm.description,
        price: productForm.price.trim() === '' ? null : Number(productForm.price),
        unit: productForm.unit,
        photoUrl: productForm.photoUrl,
        fileUrl: productForm.fileUrl,
        fileName: productForm.fileName,
        active: productForm.active,
      }
      const res = editingProduct
        ? await fetch(`/api/stock/products/${editingProduct.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        : await fetch('/api/stock/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
      const data = await res.json()
      if (data.success) {
        if (editingProduct) {
          setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? data.product : p)))
        } else {
          setProducts((prev) => [...prev, data.product])
        }
        setShowProductForm(false)
      } else {
        setFormError(data.error || 'Erro ao guardar produto')
      }
    } catch (err) {
      console.error(err)
      setFormError('Erro ao ligar à base de dados.')
    } finally {
      setSavingProduct(false)
    }
  }

  const handleDeleteProduct = async (p: StockProduct) => {
    if (!confirm(`Eliminar "${p.name}"?`)) return
    try {
      const res = await fetch(`/api/stock/products/${p.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) setProducts((prev) => prev.filter((x) => x.id !== p.id))
    } catch (err) {
      console.error(err)
    }
  }

  const money = (v?: number) => (v == null ? 'Sob consulta' : `${v.toFixed(2)} € + IVA`)

  const topLevelCategories = categories.filter((c) => !c.parentId)
  const subcategoriesOf = (parentId: string) => categories.filter((c) => c.parentId === parentId)
  // A categoria ativa pode ser principal ou subcategoria — selecionar uma principal mostra também
  // os produtos das suas subcategorias, não só os atribuídos diretamente a ela.
  const activeCategoryIds = activeCategoryId
    ? [activeCategoryId, ...subcategoriesOf(activeCategoryId).map((c) => c.id)]
    : []

  // Sem categoria escolhida nem pesquisa, não mostra produto nenhum — só as categorias, para o
  // ecrã não abrir já cheio de centenas de artigos por organizar.
  const filteredProducts = products
    .filter((p) => {
      if (!activeCategoryId && !search.trim()) return false
      if (activeCategoryId && !activeCategoryIds.includes(p.categoryId)) return false
      if (!search.trim()) return true
      return p.name.toLowerCase().includes(search.toLowerCase())
    })
    // Ordem "natural" — agrupa pelo prefixo (ex: todos os "PULL..." seguidos, todos os "LIFT..."
    // seguidos) e ordena os números dentro de cada grupo (60, 80, 100...) em vez de comparar como texto.
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar produto..."
            className="h-10 w-full rounded-lg border border-[#dce5df] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#16a34a]"
          />
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => openNewCategory()}
              className="flex h-10 items-center justify-center gap-2 rounded-lg border border-[#dce5df] bg-white px-4 text-sm font-bold text-[#2d3a33] hover:bg-gray-50"
            >
              <Plus className="size-4" /> Categoria
            </button>
            <button
              type="button"
              onClick={openNewProduct}
              disabled={categories.length === 0}
              className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[#16a34a] px-4 text-sm font-bold text-white hover:bg-[#12883d] disabled:opacity-50"
            >
              <Plus className="size-4" /> Novo Produto
            </button>
          </div>
        )}
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2.5">
          {topLevelCategories.map((cat) => (
            <div key={cat.id} className="group relative">
              <button
                onClick={() => setActiveCategoryId(cat.id === activeCategoryId ? '' : cat.id)}
                className={`flex items-center gap-3 rounded-xl border-2 py-2 pl-2 pr-5 text-sm font-bold transition ${
                  activeCategoryId === cat.id
                    ? 'border-[#16a34a] bg-[#e9f7ee] text-[#16a34a]'
                    : 'border-[#e0e8e3] bg-white text-[#56655e] hover:border-[#16a34a]/50'
                }`}
              >
                {cat.photoUrl ? (
                  <img src={cat.photoUrl} alt="" className="h-12 w-16 rounded-lg bg-white object-contain" />
                ) : (
                  <div className="flex h-12 w-16 items-center justify-center rounded-lg bg-[#f4f7f5] text-gray-300">
                    <Boxes className="size-6" />
                  </div>
                )}
                {cat.name}
              </button>
              {isAdmin && (
                <div className="absolute -right-2 -top-2 hidden items-center gap-1 group-hover:flex">
                  <button
                    type="button"
                    onClick={() => openNewCategory(cat.id)}
                    title="Nova subcategoria"
                    className="flex size-5 items-center justify-center rounded-full bg-[#16a34a] text-white"
                  >
                    <Plus className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditCategory(cat)}
                    title="Editar categoria"
                    className="flex size-5 items-center justify-center rounded-full bg-gray-500 text-white"
                  >
                    <Settings2 className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat)}
                    title="Eliminar categoria"
                    className="flex size-5 items-center justify-center rounded-full bg-red-500 text-white"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {(() => {
        const activeCat = categories.find((c) => c.id === activeCategoryId)
        // Se a subcategoria ativa estiver selecionada, mostra as suas "irmãs" (mesma categoria
        // principal), para dar para navegar entre subcategorias sem ter de voltar à principal.
        const parentForSubRow = activeCat?.parentId || activeCategoryId
        const subRow = parentForSubRow ? subcategoriesOf(parentForSubRow) : []
        if (subRow.length === 0) return null
        return (
      <div className="flex flex-wrap items-center gap-2 pl-2">
          <span className="text-xs font-semibold text-[#8a958f]">Subcategorias:</span>
          {subRow.map((sub) => (
            <div key={sub.id} className="group relative">
              <button
                onClick={() => setActiveCategoryId(sub.id === activeCategoryId ? (activeCat?.id || '') : sub.id)}
                className={`flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-xs font-bold transition ${
                  activeCategoryId === sub.id
                    ? 'bg-[#16a34a] text-white'
                    : 'bg-[#f4f7f5] text-[#56655e] border border-[#e0e8e3] hover:border-[#16a34a]/50'
                } ${sub.photoUrl ? '' : 'pl-4'}`}
              >
                {sub.photoUrl && <img src={sub.photoUrl} alt="" className="size-8 rounded-full object-cover ring-1 ring-black/5" />}
                {sub.name}
              </button>
              {isAdmin && (
                <div className="absolute -right-1.5 -top-1.5 hidden items-center gap-0.5 group-hover:flex">
                  <button
                    type="button"
                    onClick={() => openEditCategory(sub)}
                    title="Editar subcategoria"
                    className="flex size-4 items-center justify-center rounded-full bg-gray-500 text-white"
                  >
                    <Settings2 className="size-2.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(sub)}
                    title="Eliminar subcategoria"
                    className="flex size-4 items-center justify-center rounded-full bg-red-500 text-white"
                  >
                    <X className="size-2.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
      </div>
        )
      })()}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-6 animate-spin text-[#16a34a]" />
        </div>
      ) : error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{error}</p>
      ) : filteredProducts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#dce5df] bg-white p-8 text-center text-sm text-[#87918c]">
          {categories.length === 0
            ? isAdmin
              ? 'Cria a primeira categoria para começares a adicionar produtos.'
              : 'Ainda não há artigos no stock.'
            : !activeCategoryId && !search.trim()
              ? 'Escolhe uma categoria acima para ver os produtos.'
              : 'Nenhum produto encontrado.'}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((p) => (
            <div key={p.id} className="flex flex-col gap-2 rounded-xl border border-[#e0e8e3] bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  {p.photoUrl ? (
                    <button
                      type="button"
                      onClick={() => setViewingPhoto({ url: p.photoUrl!, name: p.name })}
                      className="shrink-0"
                    >
                      <img
                        src={p.photoUrl}
                        alt={p.name}
                        className="size-16 cursor-zoom-in rounded-lg object-cover ring-1 ring-black/5 transition hover:opacity-80"
                      />
                    </button>
                  ) : (
                    <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-[#f4f7f5] text-gray-300">
                      <Boxes className="size-6" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-[#152126]">{p.name}</p>
                    <span className="mt-0.5 inline-block rounded bg-[#f4f7f5] px-1.5 py-0.5 text-[10px] font-bold text-[#56655e]">
                      {p.categoryName || '—'}
                    </span>
                    {isAdmin && !p.active && (
                      <span className="ml-1 inline-block rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
                        Inativo
                      </span>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditProduct(p)}
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    >
                      <Settings2 className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(p)}
                      className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                )}
              </div>
              {p.description && <p className="text-xs text-[#8a958f]">{p.description}</p>}
              {p.fileUrl && (
                <a
                  href={p.fileUrl}
                  download={p.fileName || `${p.name}.pdf`}
                  className="flex w-fit items-center gap-1 text-xs font-bold text-[#16a34a] hover:underline"
                >
                  <FileDown className="size-3.5" /> Ficha técnica (PDF)
                </a>
              )}
              <div className="mt-auto flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-[#16a34a]">
                  {money(p.price)}
                  {p.price != null && p.unit === 'm' && <span className="text-xs font-semibold">/m</span>}
                  {p.price != null && p.unit === 'm2' && <span className="text-xs font-semibold">/m²</span>}
                </p>
                {!isAdmin && p.price != null && (
                  cart[p.id] ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCartQty(p.id, (cart[p.id] || 0) - 1)}
                        className="flex size-6 items-center justify-center rounded border bg-white text-gray-600 hover:bg-gray-100"
                      >
                        <Minus className="size-3" />
                      </button>
                      <span className="w-5 text-center text-xs font-bold text-[#16a34a]">{cart[p.id]}</span>
                      <button
                        type="button"
                        onClick={() => addToCart(p.id)}
                        className="flex size-6 items-center justify-center rounded border bg-white text-gray-600 hover:bg-gray-100"
                      >
                        <Plus className="size-3" />
                      </button>
                      {p.unit === 'm' && (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            value={cartMeters[p.id] ?? 1}
                            onChange={(e) => setCartMetersValue(p.id, Math.max(0.1, Number(e.target.value) || 0))}
                            className="h-7 w-14 rounded border border-[#dce5df] px-1.5 text-right text-xs font-bold text-[#16a34a] outline-none focus:border-[#16a34a]"
                          />
                          <span className="text-[10px] font-bold text-[#8a958f]">m/un</span>
                        </div>
                      )}
                      {p.unit === 'm2' && (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            value={cartSquareMeters[p.id] ?? 1}
                            onChange={(e) => setCartSquareMetersValue(p.id, Math.max(0.1, Number(e.target.value) || 0))}
                            className="h-7 w-14 rounded border border-[#dce5df] px-1.5 text-right text-xs font-bold text-[#16a34a] outline-none focus:border-[#16a34a]"
                          />
                          <span className="text-[10px] font-bold text-[#8a958f]">m²/un</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => addToCart(p.id)}
                      className="flex items-center gap-1 rounded-lg bg-[#16a34a] px-2.5 py-1.5 text-xs font-bold text-white hover:bg-[#12883d]"
                    >
                      <Plus className="size-3" /> Comprar
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e0e8e3] bg-white p-3 shadow-[0_-8px_24px_-8px_rgba(0,0,0,.12)]">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <p className="text-sm font-bold text-[#152126]">
              🛒 {cartCount} artigo{cartCount > 1 ? 's' : ''} ·{' '}
              <span className="text-[#16a34a]">{cartTotal.toFixed(2)} €</span>
            </p>
            <button
              type="button"
              onClick={() => setShowCheckout(true)}
              className="rounded-xl bg-[#16a34a] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#12883d]"
            >
              Finalizar Pedido
            </button>
          </div>
        </div>
      )}

      {showCategoryForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowCategoryForm(false)}
        >
          <form
            onSubmit={handleSaveCategory}
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-sm flex-col gap-3 rounded-2xl bg-white p-6 shadow-xl"
          >
            <h3 className="text-lg font-bold text-[#152126]">{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</h3>
            <input
              value={categoryForm.name}
              onChange={(e) => setCategoryForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Nome da categoria *"
              className="h-10 rounded-lg border border-[#dce5df] px-3 text-sm outline-none focus:border-[#16a34a]"
              autoFocus
            />
            {parentCategoryOptions.length > 0 && (
              <select
                value={categoryForm.parentId}
                onChange={(e) => setCategoryForm((p) => ({ ...p, parentId: e.target.value }))}
                className="h-10 rounded-lg border border-[#dce5df] px-3 text-sm outline-none focus:border-[#16a34a]"
              >
                <option value="">— Categoria principal (sem subcategoria) —</option>
                {parentCategoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    Subcategoria de: {c.name}
                  </option>
                ))}
              </select>
            )}
            <div className="flex items-center gap-3">
              {categoryForm.photoUrl ? (
                <img src={categoryForm.photoUrl} alt="" className="size-12 rounded-full object-cover ring-1 ring-black/5" />
              ) : (
                <div className="flex size-12 items-center justify-center rounded-full bg-[#f4f7f5] text-gray-400">
                  <Boxes className="size-5" />
                </div>
              )}
              <div className="flex flex-col gap-1">
                <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-[#dce5df] bg-white px-3 py-1.5 text-xs font-bold text-[#2d3a33] hover:bg-gray-50">
                  Escolher logótipo
                  <input type="file" accept="image/*" className="hidden" onChange={handleCategoryPhotoChange} />
                </label>
                {categoryForm.photoUrl && (
                  <button
                    type="button"
                    onClick={() => setCategoryForm((p) => ({ ...p, photoUrl: '' }))}
                    className="text-left text-[11px] text-gray-500 hover:text-red-600"
                  >
                    Remover
                  </button>
                )}
              </div>
            </div>
            {categoryPhotoError && <p className="text-xs font-semibold text-red-600">{categoryPhotoError}</p>}
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={() => setShowCategoryForm(false)}
                className="flex-1 rounded-lg border border-gray-300 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingCategory}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#16a34a] py-2.5 text-xs font-bold text-white hover:bg-[#12883d] disabled:opacity-60"
              >
                {savingCategory ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                {editingCategory ? 'Guardar' : 'Adicionar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showProductForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowProductForm(false)}
        >
          <form
            onSubmit={handleSaveProduct}
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-md flex-col gap-3 rounded-2xl bg-white p-6 shadow-xl"
          >
            <h3 className="text-lg font-bold text-[#152126]">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h3>
            <select
              value={productForm.categoryId}
              onChange={(e) => setProductForm((p) => ({ ...p, categoryId: e.target.value }))}
              className="h-10 rounded-lg border border-[#dce5df] px-3 text-sm outline-none focus:border-[#16a34a]"
            >
              <option value="">Escolhe a categoria</option>
              {topLevelCategories.map((c) => (
                <optgroup key={c.id} label={c.name}>
                  <option value={c.id}>{c.name}</option>
                  {subcategoriesOf(c.id).map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      ↳ {sub.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <input
              value={productForm.name}
              onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Nome do produto *"
              className="h-10 rounded-lg border border-[#dce5df] px-3 text-sm outline-none focus:border-[#16a34a]"
              autoFocus
            />
            <textarea
              value={productForm.description}
              onChange={(e) => setProductForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Descrição (opcional)"
              rows={2}
              className="resize-none rounded-lg border border-[#dce5df] px-3 py-2 text-sm outline-none focus:border-[#16a34a]"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                value={productForm.price}
                onChange={(e) => setProductForm((p) => ({ ...p, price: e.target.value }))}
                placeholder={`Preço €${productForm.unit === 'm' ? '/m' : productForm.unit === 'm2' ? '/m²' : ''} (vazio = sob consulta)`}
                type="number"
                step="0.01"
                className="h-10 rounded-lg border border-[#dce5df] px-3 text-sm outline-none focus:border-[#16a34a]"
              />
              <select
                value={productForm.unit}
                onChange={(e) => setProductForm((p) => ({ ...p, unit: e.target.value as StockProductUnit }))}
                className="h-10 rounded-lg border border-[#dce5df] px-3 text-sm outline-none focus:border-[#16a34a]"
              >
                <option value="un">Vendido à unidade</option>
                <option value="m">Vendido ao metro</option>
                <option value="m2">Vendido ao m²</option>
              </select>
            </div>
            <label className="flex items-center gap-2 rounded-lg border border-[#dce5df] px-3 text-sm">
              <input
                type="checkbox"
                checked={productForm.active}
                onChange={(e) => setProductForm((p) => ({ ...p, active: e.target.checked }))}
              />
              Ativo (visível para comerciais)
            </label>
            <div className="flex items-center gap-3">
              {productForm.photoUrl ? (
                <img src={productForm.photoUrl} alt="" className="size-14 rounded-lg object-cover ring-1 ring-black/5" />
              ) : (
                <div className="flex size-14 items-center justify-center rounded-lg bg-[#f4f7f5] text-gray-400">
                  <Boxes className="size-5" />
                </div>
              )}
              <div className="flex flex-col gap-1">
                <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-[#dce5df] bg-white px-3 py-1.5 text-xs font-bold text-[#2d3a33] hover:bg-gray-50">
                  Escolher foto
                  <input type="file" accept="image/*" className="hidden" onChange={handleProductPhotoChange} />
                </label>
                {productForm.photoUrl && (
                  <button
                    type="button"
                    onClick={() => setProductForm((p) => ({ ...p, photoUrl: '' }))}
                    className="text-left text-[11px] text-gray-500 hover:text-red-600"
                  >
                    Remover
                  </button>
                )}
              </div>
            </div>
            {productPhotoError && <p className="text-xs font-semibold text-red-600">{productPhotoError}</p>}
            <div className="flex items-center gap-3">
              <div className="flex size-14 items-center justify-center rounded-lg bg-[#f4f7f5] text-gray-400">
                <FileDown className="size-5" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-[#dce5df] bg-white px-3 py-1.5 text-xs font-bold text-[#2d3a33] hover:bg-gray-50">
                  {productForm.fileName ? 'Trocar ficha técnica (PDF)' : 'Anexar ficha técnica (PDF)'}
                  <input type="file" accept="application/pdf" className="hidden" onChange={handleProductFileChange} />
                </label>
                {productForm.fileName && (
                  <div className="flex items-center gap-2">
                    <span className="max-w-[220px] truncate text-[11px] text-gray-600">{productForm.fileName}</span>
                    <button
                      type="button"
                      onClick={() => setProductForm((p) => ({ ...p, fileUrl: '', fileName: '' }))}
                      className="text-left text-[11px] text-gray-500 hover:text-red-600"
                    >
                      Remover
                    </button>
                  </div>
                )}
              </div>
            </div>
            {productFileError && <p className="text-xs font-semibold text-red-600">{productFileError}</p>}
            {formError && <p className="text-xs font-semibold text-red-600">{formError}</p>}
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={() => setShowProductForm(false)}
                className="flex-1 rounded-lg border border-gray-300 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingProduct}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#16a34a] py-2.5 text-xs font-bold text-white hover:bg-[#12883d] disabled:opacity-60"
              >
                {savingProduct ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                {editingProduct ? 'Guardar' : 'Adicionar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showCheckout && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowCheckout(false)}
        >
          <form
            onSubmit={handlePlaceOrder}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <h3 className="text-lg font-bold text-[#152126]">Finalizar Pedido</h3>

            <div className="flex flex-col divide-y divide-[#f0f3f1] rounded-lg border border-[#e0e8e3]">
              {cartEntries.map((e) => (
                <div key={e.product.id} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                  <span className="font-bold text-[#152126]">
                    {e.product.unit === 'm'
                      ? `${e.quantity} × ${e.meters} m`
                      : e.product.unit === 'm2'
                      ? `${e.quantity} × ${e.squareMeters} m²`
                      : `${e.quantity}×`}{' '}
                    {e.product.name}
                  </span>
                  <span className="text-[#16a34a]">
                    {((e.product.price ?? 0) * e.quantity * cartMultiplier(e)).toFixed(2)} €
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between px-3 py-2 text-xs font-bold">
                <span>Total (sem IVA)</span>
                <span className="text-[#16a34a]">{cartTotal.toFixed(2)} €</span>
              </div>
            </div>

            {user.role === 'comercial' ? (
              <div className="relative flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#2d3a33]">Cliente (carteira)</label>
                <input
                  value={clientSearch || checkoutForm.client}
                  onChange={(e) => {
                    setClientSearch(e.target.value)
                    setCheckoutForm((p) => ({ ...p, client: e.target.value }))
                    setSelectedClientId('')
                    setClientDropdownOpen(true)
                  }}
                  onFocus={() => setClientDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setClientDropdownOpen(false), 150)}
                  placeholder="Pesquisar cliente na carteira..."
                  className="h-10 rounded-lg border border-[#dce5df] px-3 text-sm outline-none focus:border-[#16a34a]"
                />
                {clientDropdownOpen && filteredPortfolioClients.length > 0 && (
                  <div className="absolute top-full z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-[#dce5df] bg-white shadow-lg">
                    {filteredPortfolioClients.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handlePickPortfolioClient(c.id)}
                        className={`block w-full px-3 py-2 text-left text-xs hover:bg-gray-50 ${
                          selectedClientId === c.id ? 'bg-[#e9f7ee] font-bold text-[#16a34a]' : ''
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <input
                value={checkoutForm.client}
                onChange={(e) => setCheckoutForm((p) => ({ ...p, client: e.target.value }))}
                placeholder="Nome / Empresa *"
                className="h-10 rounded-lg border border-[#dce5df] px-3 text-sm outline-none focus:border-[#16a34a]"
              />
            )}
            <div className="grid grid-cols-2 gap-2">
              <input
                value={checkoutForm.clientPhone}
                onChange={(e) => setCheckoutForm((p) => ({ ...p, clientPhone: e.target.value }))}
                placeholder="Telefone"
                className="h-10 rounded-lg border border-[#dce5df] px-3 text-sm outline-none focus:border-[#16a34a]"
              />
              <input
                value={checkoutForm.clientTaxId}
                onChange={(e) => setCheckoutForm((p) => ({ ...p, clientTaxId: e.target.value }))}
                placeholder="NIF"
                className="h-10 rounded-lg border border-[#dce5df] px-3 text-sm outline-none focus:border-[#16a34a]"
              />
            </div>
            <input
              value={checkoutForm.clientAddress}
              onChange={(e) => setCheckoutForm((p) => ({ ...p, clientAddress: e.target.value }))}
              placeholder="Morada de entrega"
              className="h-10 rounded-lg border border-[#dce5df] px-3 text-sm outline-none focus:border-[#16a34a]"
            />
            <textarea
              value={checkoutForm.notes}
              onChange={(e) => setCheckoutForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Notas (opcional)"
              rows={2}
              className="resize-none rounded-lg border border-[#dce5df] px-3 py-2 text-sm outline-none focus:border-[#16a34a]"
            />
            {checkoutError && <p className="text-xs font-semibold text-red-600">{checkoutError}</p>}
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={() => setShowCheckout(false)}
                className="flex-1 rounded-lg border border-gray-300 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={placingOrder}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#16a34a] py-2.5 text-xs font-bold text-white hover:bg-[#12883d] disabled:opacity-60"
              >
                {placingOrder ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                Confirmar Pedido
              </button>
            </div>
          </form>
        </div>
      )}

      {createdStockOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-[#e9f7ee] text-[#16a34a]">
              <Check className="size-8" />
            </div>
            <h3 className="text-lg font-bold text-[#152126]">Pedido Registado!</h3>
            <p className="mt-1 text-xs text-[#738079]">
              Referência: <b className="font-mono text-[#16a34a]">{createdStockOrder.id}</b>
            </p>
            <p className="mt-2 text-sm font-bold text-[#16a34a]">
              {(createdStockOrder.totalPrice * (1 + IVA_RATE)).toFixed(2)} € <span className="text-xs font-normal text-[#8a958f]">(com IVA)</span>
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => generateStockOrderPDF(createdStockOrder)}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#16a34a] py-3 text-xs font-bold text-white hover:bg-[#12883d]"
              >
                <Download className="size-4" /> Descarregar PDF
              </button>
              <button
                type="button"
                onClick={() => setCreatedStockOrder(null)}
                className="text-xs text-gray-500 hover:text-gray-800"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setViewingPhoto(null)}
        >
          <button
            type="button"
            onClick={() => setViewingPhoto(null)}
            className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="size-5" />
          </button>
          <img
            src={viewingPhoto.url}
            alt={viewingPhoto.name}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  )
}

const CATALOG_CATEGORIES: { value: CatalogCategory; label: string }[] = [
  { value: 'ribbed_color', label: 'Cores · Painel Canelado' },
  { value: 'smooth_color', label: 'Cores · Painel Total Liso' },
  { value: 'tube', label: 'Tubos (Ombreira / Padieira)' },
  { value: 'header_panel', label: 'Padieira em Painel' },
  { value: 'service_door', label: 'Portas de Serviço' },
  { value: 'extra', label: 'Extras' },
  { value: 'visor', label: 'Visores' },
  { value: 'montagem', label: 'Montagens' },
  { value: 'automation', label: 'Automatismos / Motores' },
  { value: 'automation_extra', label: 'Extras de Automatismo' },
  { value: 'rail', label: 'Calhas' },
  { value: 'misc', label: 'Outros' },
]

const CATALOG_DEFAULT_UNIT: Record<CatalogCategory, CatalogItem['unit']> = {
  ribbed_color: 'm2',
  smooth_color: 'm2',
  tube: 'm',
  header_panel: 'm',
  service_door: 'un',
  extra: 'un',
  visor: 'un',
  montagem: 'un',
  automation: 'un',
  automation_extra: 'un',
  rail: 'un',
  misc: 'un',
}

type CatalogForm = {
  code: string
  name: string
  hex: string
  unit: CatalogItem['unit']
  price: string
  priceAlt: string
  note: string
  sortOrder: string
  active: boolean
}

const EMPTY_CATALOG_FORM: CatalogForm = {
  code: '',
  name: '',
  hex: '#383e42',
  unit: 'un',
  price: '',
  priceAlt: '',
  note: '',
  sortOrder: '0',
  active: true,
}

// Análises — rankings simples calculados a partir dos dados já disponíveis (encomendas,
// utilizadores, carteiras de clientes), sem agregação no servidor: quem registou mais
// encomendas/orçamentos/clientes, e quais clientes têm mais encomendas no total.
function AnalyticsPanel() {
  const [orders, setOrders] = useState<Order[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const [ordersRes, usersRes, clientsRes] = await Promise.all([
          fetch('/api/orders'),
          fetch('/api/users'),
          fetch('/api/clients'),
        ])
        const [ordersData, usersData, clientsData] = await Promise.all([
          ordersRes.json(),
          usersRes.json(),
          clientsRes.json(),
        ])
        if (!ordersData.success || !usersData.success) {
          setError(ordersData.error || usersData.error || 'Erro ao carregar dados de análise.')
          return
        }
        setOrders(ordersData.orders)
        setUsers(usersData.users)
        if (clientsData.success) setClients(clientsData.clients)
      } catch (err) {
        console.error(err)
        setError('Erro ao ligar à base de dados.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Período aplicado aos rankings (Comerciais / Clientes) — "sempre" soma tudo, "este ano" e
  // "este mês" restringem às encomendas/orçamentos criados nesse período.
  const [period, setPeriod] = useState<'all' | 'year' | 'month'>('all')

  const periodOrders = useMemo(() => {
    if (period === 'all') return orders
    const now = new Date()
    return orders.filter((o) => {
      const d = new Date(o.createdAt)
      if (period === 'year') return d.getFullYear() === now.getFullYear()
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    })
  }, [orders, period])

  const userStats = useMemo(() => {
    return users
      .map((u) => {
        const userOrders = periodOrders.filter((o) => o.createdByUserId === u.id)
        const encomendas = userOrders.filter((o) => o.kind === 'encomenda').length
        const orcamentos = userOrders.filter((o) => o.kind === 'orcamento').length
        const clientesCount = clients.filter((c) => c.ownerId === u.id).length
        return { user: u, encomendas, orcamentos, clientesCount, total: encomendas + orcamentos }
      })
      .filter((s) => s.total > 0 || s.clientesCount > 0)
      .sort((a, b) => b.total - a.total)
  }, [users, periodOrders, clients])

  const buildClientRanking = (orders: Order[], kind: 'encomenda' | 'orcamento') => {
    const counts = new Map<string, number>()
    for (const o of orders) {
      if (o.kind !== kind) continue
      const name = (o.client || '').trim()
      if (!name) continue
      counts.set(name, (counts.get(name) || 0) + 1)
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }

  const clientRankingEncomendas = useMemo(
    () => buildClientRanking(periodOrders, 'encomenda'),
    [periodOrders]
  )
  const clientRankingOrcamentos = useMemo(
    () => buildClientRanking(periodOrders, 'orcamento'),
    [periodOrders]
  )

  // Ranking à parte por clientes na carteira — não é afetado pelo filtro de período, porque um
  // cliente não deixa de estar na carteira só por não ter encomendas neste mês/ano.
  const topClientOwners = useMemo(() => {
    return users
      .map((u) => ({ user: u, clientesCount: clients.filter((c) => c.ownerId === u.id).length }))
      .filter((s) => s.clientesCount > 0)
      .sort((a, b) => b.clientesCount - a.clientesCount)
      .slice(0, 5)
  }, [users, clients])

  const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ]

  // Registo mensal (últimos 12 meses com atividade) e anual — independente do filtro de período
  // acima, para se ver sempre a evolução completa ao longo do tempo.
  const monthlyBreakdown = useMemo(() => {
    const map = new Map<string, { encomendas: number; orcamentos: number }>()
    for (const o of orders) {
      const d = new Date(o.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const entry = map.get(key) || { encomendas: 0, orcamentos: 0 }
      if (o.kind === 'orcamento') entry.orcamentos++
      else entry.encomendas++
      map.set(key, entry)
    }
    return Array.from(map.entries())
      .map(([key, v]) => {
        const [year, month] = key.split('-')
        return { key, label: `${MONTH_NAMES[Number(month) - 1]} ${year}`, ...v, total: v.encomendas + v.orcamentos }
      })
      .sort((a, b) => b.key.localeCompare(a.key))
      .slice(0, 12)
  }, [orders])

  const yearlyBreakdown = useMemo(() => {
    const map = new Map<string, { encomendas: number; orcamentos: number }>()
    for (const o of orders) {
      const key = String(new Date(o.createdAt).getFullYear())
      const entry = map.get(key) || { encomendas: 0, orcamentos: 0 }
      if (o.kind === 'orcamento') entry.orcamentos++
      else entry.encomendas++
      map.set(key, entry)
    }
    return Array.from(map.entries())
      .map(([key, v]) => ({ key, ...v, total: v.encomendas + v.orcamentos }))
      .sort((a, b) => b.key.localeCompare(a.key))
  }, [orders])

  const medal = (idx: number) => (idx === 0 ? '🥇 ' : idx === 1 ? '🥈 ' : idx === 2 ? '🥉 ' : `${idx + 1}. `)

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-[#16a34a]" />
      </div>
    )
  }
  if (error) {
    return <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{error}</p>
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-5 py-8 sm:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#16a34a]">Sistema de Gestão Industrial</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl text-[#152126]">Análises</h1>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-[#dce5df] bg-white p-1">
          {([
            ['all', 'Sempre'],
            ['year', 'Este ano'],
            ['month', 'Este mês'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setPeriod(value)}
              className={`rounded px-3 py-1.5 text-xs font-bold transition ${
                period === value ? 'bg-[#16a34a] text-white' : 'text-[#6d7973] hover:bg-[#f3f6f4]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[#e0e8e3] bg-white p-5">
        <h2 className="mb-1 text-base font-bold text-[#152126]">🏆 Comerciais</h2>
        <p className="mb-4 text-xs text-[#6d7973]">
          Quem registou mais encomendas, orçamentos e clientes na carteira
          {period === 'year' ? ' (este ano)' : period === 'month' ? ' (este mês)' : ''}.
        </p>
        {userStats.length === 0 ? (
          <p className="text-sm text-[#87918c]">Ainda não há dados suficientes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#e5ece7] text-[10px] uppercase tracking-wider text-[#87918c]">
                  <th className="pb-2 pr-3">Nome</th>
                  <th className="pb-2 pr-3">Perfil</th>
                  <th className="pb-2 pr-3 text-right">Encomendas</th>
                  <th className="pb-2 pr-3 text-right">Orçamentos</th>
                  <th className="pb-2 text-right">Clientes na carteira</th>
                </tr>
              </thead>
              <tbody>
                {userStats.map((s, idx) => (
                  <tr key={s.user.id} className="border-b border-[#f0f3f1] last:border-0">
                    <td className="py-2 pr-3 font-bold text-[#152126]">
                      {s.total > 0 ? medal(idx) : ''}
                      {s.user.name}
                    </td>
                    <td className="py-2 pr-3 text-[#6d7973]">{ROLE_LABELS[s.user.role]}</td>
                    <td className="py-2 pr-3 text-right font-bold text-[#16a34a]">{s.encomendas}</td>
                    <td className="py-2 pr-3 text-right font-bold text-[#2563eb]">{s.orcamentos}</td>
                    <td className="py-2 text-right font-bold text-[#152126]">{s.clientesCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[#e0e8e3] bg-white p-5">
        <h2 className="mb-1 text-base font-bold text-[#152126]">👤 Clientes com mais encomendas</h2>
        <p className="mb-4 text-xs text-[#6d7973]">
          Os clientes que mais vezes aparecem em encomendas registadas (top 10)
          {period === 'year' ? ' (este ano)' : period === 'month' ? ' (este mês)' : ''}.
        </p>
        {clientRankingEncomendas.length === 0 ? (
          <p className="text-sm text-[#87918c]">Ainda não há encomendas registadas.</p>
        ) : (
          <div className="flex flex-col divide-y divide-[#f0f3f1]">
            {clientRankingEncomendas.map((c, idx) => (
              <div key={c.name} className="flex items-center justify-between py-2 text-xs">
                <span className="font-bold text-[#152126]">
                  {medal(idx)}
                  {c.name}
                </span>
                <span className="rounded bg-[#e9f7ee] px-2 py-0.5 font-bold text-[#16a34a]">
                  {c.count} encomenda{c.count > 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[#e0e8e3] bg-white p-5">
        <h2 className="mb-1 text-base font-bold text-[#152126]">💶 Clientes com mais orçamentos</h2>
        <p className="mb-4 text-xs text-[#6d7973]">
          Os clientes que mais vezes aparecem em orçamentos registados (top 10)
          {period === 'year' ? ' (este ano)' : period === 'month' ? ' (este mês)' : ''}.
        </p>
        {clientRankingOrcamentos.length === 0 ? (
          <p className="text-sm text-[#87918c]">Ainda não há orçamentos registados.</p>
        ) : (
          <div className="flex flex-col divide-y divide-[#f0f3f1]">
            {clientRankingOrcamentos.map((c, idx) => (
              <div key={c.name} className="flex items-center justify-between py-2 text-xs">
                <span className="font-bold text-[#152126]">
                  {medal(idx)}
                  {c.name}
                </span>
                <span className="rounded bg-[#edf3ff] px-2 py-0.5 font-bold text-[#2563eb]">
                  {c.count} orçamento{c.count > 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[#e0e8e3] bg-white p-5">
        <h2 className="mb-1 text-base font-bold text-[#152126]">👛 Mais Clientes na Carteira</h2>
        <p className="mb-4 text-xs text-[#6d7973]">Quem tem mais clientes adicionados à carteira (não depende do período acima).</p>
        {topClientOwners.length === 0 ? (
          <p className="text-sm text-[#87918c]">Ainda não há clientes em nenhuma carteira.</p>
        ) : (
          <div className="flex flex-col divide-y divide-[#f0f3f1]">
            {topClientOwners.map((s, idx) => (
              <div key={s.user.id} className="flex items-center justify-between py-2 text-xs">
                <span className="font-bold text-[#152126]">
                  {medal(idx)}
                  {s.user.name}
                  <span className="ml-1.5 font-normal text-[#87918c]">{ROLE_LABELS[s.user.role]}</span>
                </span>
                <span className="rounded bg-[#e9f7ee] px-2 py-0.5 font-bold text-[#16a34a]">
                  {s.clientesCount} cliente{s.clientesCount > 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[#e0e8e3] bg-white p-5">
        <h2 className="mb-1 text-base font-bold text-[#152126]">📅 Registo Mensal</h2>
        <p className="mb-4 text-xs text-[#6d7973]">Encomendas e orçamentos registados por mês (últimos 12 meses com atividade).</p>
        {monthlyBreakdown.length === 0 ? (
          <p className="text-sm text-[#87918c]">Ainda não há encomendas registadas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#e5ece7] text-[10px] uppercase tracking-wider text-[#87918c]">
                  <th className="pb-2 pr-3">Mês</th>
                  <th className="pb-2 pr-3 text-right">Encomendas</th>
                  <th className="pb-2 pr-3 text-right">Orçamentos</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {monthlyBreakdown.map((m) => (
                  <tr key={m.key} className="border-b border-[#f0f3f1] last:border-0">
                    <td className="py-2 pr-3 font-bold text-[#152126]">{m.label}</td>
                    <td className="py-2 pr-3 text-right font-bold text-[#16a34a]">{m.encomendas}</td>
                    <td className="py-2 pr-3 text-right font-bold text-[#2563eb]">{m.orcamentos}</td>
                    <td className="py-2 text-right font-bold text-[#152126]">{m.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[#e0e8e3] bg-white p-5">
        <h2 className="mb-1 text-base font-bold text-[#152126]">📅 Registo Anual</h2>
        <p className="mb-4 text-xs text-[#6d7973]">Encomendas e orçamentos registados por ano.</p>
        {yearlyBreakdown.length === 0 ? (
          <p className="text-sm text-[#87918c]">Ainda não há encomendas registadas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#e5ece7] text-[10px] uppercase tracking-wider text-[#87918c]">
                  <th className="pb-2 pr-3">Ano</th>
                  <th className="pb-2 pr-3 text-right">Encomendas</th>
                  <th className="pb-2 pr-3 text-right">Orçamentos</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {yearlyBreakdown.map((y) => (
                  <tr key={y.key} className="border-b border-[#f0f3f1] last:border-0">
                    <td className="py-2 pr-3 font-bold text-[#152126]">{y.key}</td>
                    <td className="py-2 pr-3 text-right font-bold text-[#16a34a]">{y.encomendas}</td>
                    <td className="py-2 pr-3 text-right font-bold text-[#2563eb]">{y.orcamentos}</td>
                    <td className="py-2 text-right font-bold text-[#152126]">{y.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}

function CatalogPanel() {
  const { catalog, catalogLoading, refetchCatalog } = useCatalog()
  const [activeCategory, setActiveCategory] = useState<CatalogCategory>('ribbed_color')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null)
  const [form, setForm] = useState<CatalogForm>(EMPTY_CATALOG_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isColorCategory = activeCategory === 'ribbed_color' || activeCategory === 'smooth_color'
  const isHeaderPanel = activeCategory === 'header_panel'

  const itemsInCategory = useMemo(
    () =>
      catalog
        .filter((item) => item.category === activeCategory)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [catalog, activeCategory]
  )

  const openCreate = () => {
    setEditingItem(null)
    setForm({
      ...EMPTY_CATALOG_FORM,
      unit: CATALOG_DEFAULT_UNIT[activeCategory],
      sortOrder: String(itemsInCategory.length),
    })
    setError('')
    setShowForm(true)
  }

  const openEdit = (item: CatalogItem) => {
    setEditingItem(item)
    setForm({
      code: item.code,
      name: item.name,
      hex: item.hex || '#383e42',
      unit: item.unit,
      price: item.price != null ? String(item.price) : '',
      priceAlt: item.priceAlt != null ? String(item.priceAlt) : '',
      note: item.note || '',
      sortOrder: String(item.sortOrder),
      active: item.active,
    })
    setError('')
    setShowForm(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const body = {
        category: activeCategory,
        code: form.code,
        name: form.name,
        hex: isColorCategory ? form.hex : undefined,
        unit: form.unit,
        price: form.price.trim() === '' ? null : Number(form.price),
        priceAlt: isHeaderPanel && form.priceAlt.trim() !== '' ? Number(form.priceAlt) : null,
        note: form.note.trim() || undefined,
        sortOrder: Number(form.sortOrder) || 0,
        active: form.active,
      }
      const res = await fetch(editingItem ? `/api/catalog/${editingItem.id}` : '/api/catalog', {
        method: editingItem ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.success) {
        await refetchCatalog()
        setShowForm(false)
      } else {
        setError(data.error || 'Erro ao guardar item do catálogo')
      }
    } catch (err) {
      console.error(err)
      setError('Erro ao ligar à base de dados.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item: CatalogItem) => {
    if (!confirm(`Tem a certeza que deseja eliminar "${item.name}"?`)) return
    try {
      const res = await fetch(`/api/catalog/${item.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        await refetchCatalog()
      } else {
        alert(data.error || 'Erro ao eliminar item')
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao eliminar item.')
    }
  }

  const handleToggleActive = async (item: CatalogItem) => {
    try {
      const res = await fetch(`/api/catalog/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !item.active }),
      })
      const data = await res.json()
      if (data.success) await refetchCatalog()
    } catch (err) {
      console.error(err)
    }
  }

  const money = (v?: number) => (v == null ? 'Sob consulta' : `${v.toFixed(2)} €`)

  return (
    <main className="mx-auto max-w-[1400px] p-5 sm:p-8">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-[#16a34a]">
            Sistema de Gestão Industrial
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl text-[#152126]">Catálogo</h1>
          <p className="mt-1 text-sm text-[#738079]">
            Cores, tubos, portas, extras, motores e tudo o resto do configurador — adiciona, edita ou remove
            opções e preços sem precisar de alterar código.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-[#16a34a] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#12883d] transition"
        >
          <Plus className="size-4" /> Novo Item
        </button>
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5">
        {CATALOG_CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
              activeCategory === cat.value
                ? 'bg-[#16a34a] text-white'
                : 'bg-white text-[#56655e] border border-[#e0e8e3] hover:border-[#16a34a]/50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {error && !showForm && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">{error}</p>
      )}

      {showForm && (
        <form
          onSubmit={handleSave}
          className="mb-6 grid gap-4 rounded-2xl border border-[#e0e8e3] bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4"
        >
          <div className="lg:col-span-4">
            <p className="text-sm font-bold text-[#152126]">
              {editingItem ? 'Editar item' : 'Novo item'} · {CATALOG_CATEGORIES.find((c) => c.value === activeCategory)?.label}
            </p>
          </div>
          <label className="flex flex-col gap-1.5 text-xs font-bold text-[#56655e]">
            Código (valor guardado nas encomendas)
            <input
              required
              value={form.code}
              onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
              placeholder="ex: RAL 5010"
              className="h-10 rounded-lg border border-[#dce5df] px-3 text-sm outline-none focus:border-[#16a34a]"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-bold text-[#56655e]">
            Nome a mostrar
            <input
              required
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="ex: Azul genciana"
              className="h-10 rounded-lg border border-[#dce5df] px-3 text-sm outline-none focus:border-[#16a34a]"
            />
          </label>
          {isColorCategory && (
            <label className="flex flex-col gap-1.5 text-xs font-bold text-[#56655e]">
              Cor (amostra)
              <span className="flex h-10 items-center gap-2 rounded-lg border border-[#dce5df] px-2">
                <input
                  type="color"
                  value={form.hex}
                  onChange={(e) => setForm((p) => ({ ...p, hex: e.target.value }))}
                  className="size-7 cursor-pointer rounded border-0 bg-transparent p-0"
                />
                <input
                  value={form.hex}
                  onChange={(e) => setForm((p) => ({ ...p, hex: e.target.value }))}
                  className="h-full flex-1 bg-transparent text-xs font-normal outline-none"
                />
              </span>
            </label>
          )}
          <label className="flex flex-col gap-1.5 text-xs font-bold text-[#56655e]">
            Unidade
            <select
              value={form.unit}
              onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value as CatalogItem['unit'] }))}
              className="h-10 rounded-lg border border-[#dce5df] px-3 text-sm outline-none focus:border-[#16a34a]"
            >
              <option value="un">Unidade</option>
              <option value="m">Metro linear</option>
              <option value="m2">Metro quadrado</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-bold text-[#56655e]">
            {isHeaderPanel ? 'Preço até 25cm de altura (€)' : 'Preço (€)'}
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
              placeholder="vazio = sob consulta"
              className="h-10 rounded-lg border border-[#dce5df] px-3 text-sm outline-none focus:border-[#16a34a]"
            />
          </label>
          {isHeaderPanel && (
            <label className="flex flex-col gap-1.5 text-xs font-bold text-[#56655e]">
              Preço acima de 25cm de altura (€)
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.priceAlt}
                onChange={(e) => setForm((p) => ({ ...p, priceAlt: e.target.value }))}
                placeholder="vazio = usa o preço até 25cm"
                className="h-10 rounded-lg border border-[#dce5df] px-3 text-sm outline-none focus:border-[#16a34a]"
              />
            </label>
          )}
          <label className="flex flex-col gap-1.5 text-xs font-bold text-[#56655e]">
            Nota (opcional)
            <input
              value={form.note}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
              placeholder="ex: até 30 km de distância"
              className="h-10 rounded-lg border border-[#dce5df] px-3 text-sm outline-none focus:border-[#16a34a]"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-bold text-[#56655e]">
            Ordem
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm((p) => ({ ...p, sortOrder: e.target.value }))}
              className="h-10 rounded-lg border border-[#dce5df] px-3 text-sm outline-none focus:border-[#16a34a]"
            />
          </label>
          <label className="flex items-center gap-2 self-end text-xs font-bold text-[#56655e]">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
              className="accent-[#16a34a]"
            />
            Visível no configurador
          </label>

          {error && (
            <p className="lg:col-span-4 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{error}</p>
          )}

          <div className="flex gap-2 lg:col-span-4">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-gray-300 px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-[#16a34a] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#12883d] disabled:opacity-60"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              {editingItem ? 'Guardar alterações' : 'Criar item'}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-[#e0e8e3] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[#fafcfb] text-xs text-[#87918c] border-b border-[#edf1ee]">
              <tr>
                {isColorCategory && <th className="px-5 py-4 font-bold">Cor</th>}
                <th className="px-5 py-4 font-bold">Código</th>
                <th className="px-5 py-4 font-bold">Nome</th>
                <th className="px-5 py-4 font-bold">Preço</th>
                {isHeaderPanel && <th className="px-5 py-4 font-bold">Preço +25cm</th>}
                <th className="px-5 py-4 font-bold">Unidade</th>
                <th className="px-5 py-4 font-bold text-center">Visível</th>
                <th className="px-5 py-4 font-bold text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f4f2]">
              {catalogLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-gray-500">
                    <Loader2 className="mx-auto mb-2 size-6 animate-spin text-[#16a34a]" />
                    A carregar catálogo...
                  </td>
                </tr>
              ) : itemsInCategory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-gray-500">
                    Sem itens nesta categoria ainda.
                  </td>
                </tr>
              ) : (
                itemsInCategory.map((item) => (
                  <tr key={item.id} className={`hover:bg-[#fbfcfb] transition ${!item.active ? 'opacity-50' : ''}`}>
                    {isColorCategory && (
                      <td className="px-5 py-4">
                        <span
                          className="block size-6 rounded-full border border-black/10 shadow-sm"
                          style={{ backgroundColor: item.hex || '#cccccc' }}
                        />
                      </td>
                    )}
                    <td className="px-5 py-4 text-xs font-bold text-[#152126]">{item.code}</td>
                    <td className="px-5 py-4 text-xs text-[#526058]">{item.name}</td>
                    <td className="px-5 py-4 text-xs font-semibold text-[#152126]">{money(item.price)}</td>
                    {isHeaderPanel && (
                      <td className="px-5 py-4 text-xs font-semibold text-[#152126]">{money(item.priceAlt)}</td>
                    )}
                    <td className="px-5 py-4 text-xs text-[#86928b]">{item.unit}</td>
                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => handleToggleActive(item)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                          item.active ? 'bg-[#16a34a]' : 'bg-gray-300'
                        }`}
                        title={item.active ? 'Clique para ocultar do configurador' : 'Clique para voltar a mostrar'}
                      >
                        <span
                          className={`inline-block size-4 transform rounded-full bg-white transition ${
                            item.active ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEdit(item)}
                          className="rounded-lg border border-[#dce5df] p-2 text-[#526058] hover:bg-[#f3f6f4] transition"
                          title="Editar"
                        >
                          <Settings2 className="size-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50 transition"
                          title="Eliminar"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}

function Admin({
  user,
  initialView,
  nav,
}: {
  user: User
  initialView?: 'orders' | 'users' | 'catalog' | 'analytics'
  nav: NavCallbacks
}) {
  // Comercial e Cliente (operador) chegam a este painel só para ver as suas próprias
  // encomendas/orçamentos (ver GET /api/orders e /api/stock-orders) — sem acesso às métricas
  // globais, preços, estado ou eliminação, que continuam exclusivos do admin.
  const canManage = user.role === 'admin'
  const [view, setView] = useState<'orders' | 'users' | 'catalog' | 'analytics'>(initialView ?? 'orders')
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState({ total: 0, emAnalise: 0, producao: 0, concluido: 0, valorTotal: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [kindFilter, setKindFilter] = useState<'Todos' | 'encomenda' | 'orcamento'>('Todos')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [emailTarget, setEmailTarget] = useState<EmailTarget>(null)

  // Pedidos de "Outros Artigos" — aparecem como linhas extra na mesma tabela de "Gestão de
  // Encomendas", distinguidos pelo tipo "🧰 Artigos".
  const [stockOrders, setStockOrders] = useState<StockOrder[]>([])
  const [selectedStockOrder, setSelectedStockOrder] = useState<StockOrder | null>(null)
  const [updatingStockId, setUpdatingStockId] = useState<string | null>(null)

  const fetchStockOrders = async () => {
    try {
      const res = await fetch('/api/stock-orders')
      const data = await res.json()
      if (data.success) setStockOrders(data.stockOrders)
    } catch (err) {
      console.error('Erro ao buscar pedidos de artigos:', err)
    }
  }

  useEffect(() => {
    fetchStockOrders()
  }, [])

  const handleStockStatusChange = async (id: string, newStatus: OrderStatus) => {
    setUpdatingStockId(id)
    try {
      const res = await fetch(`/api/stock-orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (data.success) {
        setStockOrders((prev) => prev.map((o) => (o.id === id ? data.stockOrder : o)))
        if (selectedStockOrder?.id === id) setSelectedStockOrder(data.stockOrder)
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao atualizar estado na base de dados.')
    } finally {
      setUpdatingStockId(null)
    }
  }

  const handleDeleteStockOrder = async (id: string) => {
    if (!confirm(`Tem a certeza que deseja eliminar o pedido ${id} da base de dados?`)) return
    try {
      const res = await fetch(`/api/stock-orders/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setStockOrders((prev) => prev.filter((o) => o.id !== id))
        if (selectedStockOrder?.id === id) setSelectedStockOrder(null)
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao eliminar pedido.')
    }
  }

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'Todos') params.set('status', statusFilter)
      if (kindFilter !== 'Todos') params.set('kind', kindFilter)
      if (search.trim()) params.set('search', search.trim())

      const res = await fetch(`/api/orders?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setOrders(data.orders)
        if (data.stats) setStats(data.stats)
      }
    } catch (err) {
      console.error('Erro ao buscar encomendas:', err)
    } finally {
      setLoading(false)
    }
  }

  // Atualiza sozinho a cada 30s (mesmo intervalo do /producao) — para quando a fábrica marca uma
  // porta como fabricada (e a encomenda passa a "Concluído" automaticamente), este painel não
  // ficar preso ao estado antigo até alguém mudar o filtro ou recarregar a página à mão.
  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 30_000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, kindFilter])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchOrders()
  }

  const handleStatusChange = async (id: string, newStatus: OrderStatus) => {
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (data.success) {
        setOrders((prev) => prev.map((o) => (o.id === id ? data.order : o)))
        if (selectedOrder?.id === id) {
          setSelectedOrder(data.order)
        }
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao atualizar estado na base de dados.')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDeleteOrder = async (id: string) => {
    if (!confirm(`Tem a certeza que deseja eliminar a encomenda ${id} da base de dados?`)) {
      return
    }
    try {
      const res = await fetch(`/api/orders/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setOrders((prev) => prev.filter((o) => o.id !== id))
        if (selectedOrder?.id === id) setSelectedOrder(null)
        fetchOrders()
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao eliminar encomenda.')
    }
  }

  return (
    <div className="min-h-screen bg-[#f3f6f4] text-[#152126]">
      <TopNav
        user={user}
        active={view}
        nav={{
          ...nav,
          onOrders: () => setView('orders'),
          onUsers: () => setView('users'),
          onCatalog: () => setView('catalog'),
          onAnalytics: () => setView('analytics'),
        }}
      />

      {view === 'users' && user.role === 'admin' && <UsersPanel />}
      {view === 'catalog' && user.role === 'admin' && <CatalogPanel />}
      {view === 'analytics' && user.role === 'admin' && <AnalyticsPanel />}

      {view === 'orders' && (
      <>
      <main className="mx-auto max-w-[1400px] p-5 sm:p-8">
        {/* Título e Ação */}
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-[#16a34a]">
              Sistema de Gestão Industrial
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl text-[#152126]">
              Registo de Encomendas & Orçamentos
            </h1>
            <p className="mt-1 text-sm text-[#738079]">
              Base de dados ativa com ficha técnica detalhada, desenho cotado e exportação oficial em PDF.
            </p>
          </div>
          <button
            onClick={nav.onEncomenda}
            className="flex items-center gap-2 rounded-xl bg-[#16a34a] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#12883d] transition"
          >
            <Plus className="size-4" /> Criar Novo Orçamento
          </button>
        </div>

        {/* Painel de Métricas em Tempo Real — totais globais, só para admin */}
        {canManage && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-[#e0e8e3] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-[#87918c]">Total de Encomendas na BD</p>
            <p className="mt-2 text-3xl font-bold text-[#152126]">{stats.total}</p>
            <p className="mt-1 text-[11px] font-semibold text-[#16a34a]">Registos ativos</p>
          </div>
          <div className="rounded-2xl border border-[#e0e8e3] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-[#87918c]">Em Validação / Análise</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">{stats.emAnalise}</p>
            <p className="mt-1 text-[11px] text-[#87918c]">A aguardar aprovação</p>
          </div>
          <div className="rounded-2xl border border-[#e0e8e3] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-[#87918c]">Em Fabrico / Produção</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">{stats.producao}</p>
            <p className="mt-1 text-[11px] text-[#87918c]">Em corte e montagem</p>
          </div>
          <div className="rounded-2xl border border-[#e0e8e3] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-[#87918c]">Concluídas</p>
            <p className="mt-2 text-3xl font-bold text-[#16a34a]">{stats.concluido}</p>
            <p className="mt-1 text-[11px] font-semibold text-[#87918c]">Prontas / entregues</p>
          </div>
        </div>
        )}

        {/* Tabela de Encomendas com Filtros */}
        <div className="overflow-hidden rounded-2xl border border-[#e0e8e3] bg-white shadow-sm">
          {/* Barra de Filtros e Pesquisa */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#edf1ee] p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-[#f4f7f5] p-1 text-xs font-bold text-[#56655e]">
                {(
                  [
                    { value: 'Todos', label: '📑 Todos' },
                    { value: 'encomenda', label: '📦 Encomendas' },
                    { value: 'orcamento', label: '💶 Orçamentos' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setKindFilter(opt.value)}
                    className={`rounded-lg px-3 py-1.5 transition ${
                      kindFilter === opt.value ? 'bg-white text-[#16a34a] shadow-sm' : 'hover:text-[#152126]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-[#f4f7f5] p-1 text-xs font-bold text-[#56655e]">
                {['Todos', 'Em análise', 'Produção', 'Concluído'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-lg px-3 py-1.5 transition ${
                      statusFilter === status
                        ? 'bg-white text-[#16a34a] shadow-sm'
                        : 'hover:text-[#152126]'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Pesquisar por cliente, ref ou RAL..."
                  className="h-9 w-64 rounded-lg border border-[#dce5df] bg-white pl-9 pr-3 text-xs outline-none focus:border-[#16a34a]"
                />
              </div>
              <button
                type="submit"
                className="h-9 rounded-lg bg-[#16a34a] px-3 text-xs font-bold text-white hover:bg-[#12883d] transition"
              >
                Filtrar
              </button>
            </form>
          </div>

          {/* Tabela de Dados */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-[#fafcfb] text-xs text-[#87918c] border-b border-[#edf1ee]">
                <tr>
                  <th className="px-5 py-4 font-bold">Referência</th>
                  <th className="px-5 py-4 font-bold">Tipo</th>
                  <th className="px-5 py-4 font-bold">Cliente / Obra</th>
                  <th className="px-5 py-4 font-bold">Medidas Vão (L × H)</th>
                  <th className="px-5 py-4 font-bold">Modelo & RAL</th>
                  <th className="px-5 py-4 font-bold">Estrutura (Unidades)</th>
                  <th className="px-5 py-4 font-bold">Calha / Motor</th>
                  <th className="px-5 py-4 font-bold">Estado na BD</th>
                  <th className="px-5 py-4 font-bold text-center">Ficha & PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf1ee]">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-xs text-gray-400">
                      <Loader2 className="mx-auto mb-2 size-6 animate-spin text-[#16a34a]" />
                      A carregar dados da base de dados...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-xs text-gray-500">
                      Nenhuma encomenda encontrada com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="hover:bg-[#fbfcfb] transition">
                      {/* ID / Referência */}
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs font-bold text-[#16a34a] bg-[#e9f7ee] px-2.5 py-1 rounded-md">
                          {order.id}
                        </span>
                      </td>

                      {/* Tipo: Encomenda ou Orçamento */}
                      <td className="px-5 py-4">
                        {order.kind === 'orcamento' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#edf3ff] px-2.5 py-1 text-[11px] font-bold text-[#3664aa]">
                            💶 Orçamento
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#f4f7f5] px-2.5 py-1 text-[11px] font-bold text-[#56655e]">
                            📦 Encomenda
                          </span>
                        )}
                      </td>

                      {/* Cliente */}
                      <td className="px-5 py-4">
                        <p className="font-bold text-[#152126] text-xs">{order.client}</p>
                        {order.clientAddress && (
                          <p className="text-[11px] text-[#7f8c85]">{order.clientAddress}</p>
                        )}
                        {order.createdBy && (
                          <p className="text-[11px] text-[#9aa6a0]">Criado por: {order.createdBy}</p>
                        )}
                      </td>

                      {/* Medidas */}
                      <td className="px-5 py-4">
                        <p className="font-semibold text-xs text-[#2a3630]">
                          {order.widthMm} × {order.heightMm} mm
                        </p>
                        <p className="text-[10px] text-[#86928b]">
                          {order.area} m² · Padieira: {order.paddingMm} mm
                        </p>
                      </td>

                      {/* Modelo e Cor RAL */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="size-3.5 rounded-full border border-black/20 shadow-xs"
                            style={{ backgroundColor: order.colorHex }}
                          />
                          <div>
                            <p className="text-xs font-semibold text-[#152126]">{order.colorCode}</p>
                            <p className="text-[10px] text-[#86928b] font-medium">
                              {order.model === 'smooth'
                                ? 'Total Liso'
                                : order.model === 'cassette'
                                ? 'Almofadado'
                                : 'Canelado'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Estrutura de Falsas em Unidades */}
                      <td className="px-5 py-4 text-xs text-[#526058]">
                        {(order.tubeLeft !== 'Nenhum' || order.tubeRight !== 'Nenhum') ? (
                          <p className="font-semibold text-[#16a34a]">
                            {order.tubeLeft !== 'Nenhum' && <span>Omb E · </span>}
                            {order.tubeRight !== 'Nenhum' && <span>Omb D</span>}
                          </p>
                        ) : null}
                        {order.header !== 'Nenhum' ? (
                          <p className="text-[11px] text-gray-600">
                            Pad: {order.headerUnits || 1} un
                          </p>
                        ) : null}
                        {order.tubeLeft === 'Nenhum' && order.tubeRight === 'Nenhum' && order.header === 'Nenhum' ? (
                          <span className="text-[11px] text-gray-400">Sem falsas</span>
                        ) : null}
                      </td>

                      {/* Motor & Calha */}
                      <td className="px-5 py-4 text-xs text-[#526058]">
                        <p className="truncate max-w-[180px]" title={order.rail !== 'Nenhum' ? order.rail : order.automation}>
                          {order.rail !== 'Nenhum' ? order.rail : order.automation !== 'Nenhum' ? order.automation : 'Manual'}
                        </p>
                      </td>

                      {/* Estado — só o admin pode mudar; comercial/cliente só veem */}
                      <td className="px-5 py-4">
                        {canManage ? (
                        <select
                          disabled={updatingId === order.id}
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                          className={`rounded-lg border px-2.5 py-1 text-xs font-bold outline-none cursor-pointer transition ${
                            order.status === 'Concluído'
                              ? 'bg-[#e9f7ee] text-[#168443] border-emerald-300'
                              : order.status === 'Produção'
                              ? 'bg-[#fff6df] text-[#a06d00] border-amber-300'
                              : order.status === 'Cancelado'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-[#edf3ff] text-[#3664aa] border-blue-300'
                          }`}
                        >
                          <option value="Em análise">Em análise</option>
                          <option value="Produção">Produção</option>
                          <option value="Concluído">Concluído</option>
                          <option value="Cancelado">Cancelado</option>
                        </select>
                        ) : (
                        <span
                          className={`inline-block rounded-lg border px-2.5 py-1 text-xs font-bold ${
                            order.status === 'Concluído'
                              ? 'bg-[#e9f7ee] text-[#168443] border-emerald-300'
                              : order.status === 'Produção'
                              ? 'bg-[#fff6df] text-[#a06d00] border-amber-300'
                              : order.status === 'Cancelado'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-[#edf3ff] text-[#3664aa] border-blue-300'
                          }`}
                        >
                          {order.status}
                        </span>
                        )}
                      </td>

                      {/* Botões de Ação com Desenho no PDF */}
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Botão Download PDF com Desenho */}
                          <button
                            type="button"
                            onClick={() => generateOrderPDF(order)}
                            title="Descarregar Ficha Técnica (PDF com Desenho Técnico)"
                            className="flex size-8 items-center justify-center rounded-lg bg-[#16a34a] text-white hover:bg-[#12883d] transition shadow-xs"
                          >
                            <Download className="size-4" />
                          </button>

                          {/* Botão Download Orçamento com Preços — só admin */}
                          {canManage && (
                          <button
                            type="button"
                            onClick={() => generateQuotePDF(order)}
                            title="Descarregar Orçamento (PDF com Preços)"
                            className="flex size-8 items-center justify-center rounded-lg border border-[#16a34a]/40 bg-[#e9f7ee] text-[#16a34a] hover:bg-[#d8f0df] transition shadow-xs"
                          >
                            <Euro className="size-4" />
                          </button>
                          )}

                          {/* Botão Enviar por Email */}
                          <button
                            type="button"
                            onClick={() => setEmailTarget({ order, kind: 'encomenda' })}
                            title="Enviar Ficha Técnica por Email"
                            className="flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 transition"
                          >
                            <Mail className="size-4" />
                          </button>

                          {/* Botão Ver Detalhes */}
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            title="Ver Ficha Técnica Completa"
                            className="flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 transition"
                          >
                            <Eye className="size-4" />
                          </button>

                          {/* Botão Eliminar — só admin */}
                          {canManage && (
                          <button
                            type="button"
                            onClick={() => handleDeleteOrder(order.id)}
                            title="Eliminar da BD"
                            className="flex size-8 items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
                {stockOrders
                  .filter((o) => (statusFilter === 'Todos' ? true : o.status === statusFilter))
                  .filter((o) => (search.trim() ? o.client.toLowerCase().includes(search.trim().toLowerCase()) || o.id.toLowerCase().includes(search.trim().toLowerCase()) : true))
                  .map((stockOrder) => (
                    <tr key={stockOrder.id} className="hover:bg-[#fbfcfb] transition">
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs font-bold text-[#16a34a] bg-[#e9f7ee] px-2.5 py-1 rounded-md">
                          {stockOrder.id}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#fdf2e9] px-2.5 py-1 text-[11px] font-bold text-[#b5651d]">
                          🧰 Artigos
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-[#152126] text-xs">{stockOrder.client}</p>
                        {stockOrder.clientAddress && (
                          <p className="text-[11px] text-[#7f8c85]">{stockOrder.clientAddress}</p>
                        )}
                        {stockOrder.createdBy && (
                          <p className="text-[11px] text-[#9aa6a0]">Criado por: {stockOrder.createdBy}</p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-[#526058]" colSpan={4}>
                        {stockOrder.items.length} artigo{stockOrder.items.length > 1 ? 's' : ''}
                        {canManage && (
                          <>
                            {' '}
                            · <span className="font-semibold text-[#16a34a]">{stockOrder.totalPrice.toFixed(2)} €</span> sem IVA
                          </>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {canManage ? (
                        <select
                          disabled={updatingStockId === stockOrder.id}
                          value={stockOrder.status}
                          onChange={(e) => handleStockStatusChange(stockOrder.id, e.target.value as OrderStatus)}
                          className={`rounded-lg border px-2.5 py-1 text-xs font-bold outline-none cursor-pointer transition ${
                            stockOrder.status === 'Concluído'
                              ? 'bg-[#e9f7ee] text-[#168443] border-emerald-300'
                              : stockOrder.status === 'Produção'
                              ? 'bg-[#fff6df] text-[#a06d00] border-amber-300'
                              : stockOrder.status === 'Cancelado'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-[#edf3ff] text-[#3664aa] border-blue-300'
                          }`}
                        >
                          <option value="Em análise">Em análise</option>
                          <option value="Produção">Produção</option>
                          <option value="Concluído">Concluído</option>
                          <option value="Cancelado">Cancelado</option>
                        </select>
                        ) : (
                        <span
                          className={`inline-block rounded-lg border px-2.5 py-1 text-xs font-bold ${
                            stockOrder.status === 'Concluído'
                              ? 'bg-[#e9f7ee] text-[#168443] border-emerald-300'
                              : stockOrder.status === 'Produção'
                              ? 'bg-[#fff6df] text-[#a06d00] border-amber-300'
                              : stockOrder.status === 'Cancelado'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-[#edf3ff] text-[#3664aa] border-blue-300'
                          }`}
                        >
                          {stockOrder.status}
                        </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => generateStockOrderPDF(stockOrder)}
                            title="Descarregar PDF do Pedido"
                            className="flex size-8 items-center justify-center rounded-lg bg-[#16a34a] text-white hover:bg-[#12883d] transition shadow-xs"
                          >
                            <Download className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedStockOrder(stockOrder)}
                            title="Ver Detalhes do Pedido"
                            className="flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 transition"
                          >
                            <Eye className="size-4" />
                          </button>
                          {canManage && (
                          <button
                            type="button"
                            onClick={() => handleDeleteStockOrder(stockOrder.id)}
                            title="Eliminar da BD"
                            className="flex size-8 items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal de Detalhes da Encomenda com Ficha Completa */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-[#16a34a] bg-[#e9f7ee] px-2.5 py-1 rounded">
                  {selectedOrder.id}
                </span>
                <span className="ml-2 text-xs font-bold text-[#56655e]">
                  {selectedOrder.kind === 'orcamento' ? '💶 Orçamento' : '📦 Encomenda'}
                </span>
                {selectedOrder.doors && selectedOrder.doors.length > 1 && (
                  <span className="ml-2 text-xs font-bold text-[#16a34a] bg-[#e9f7ee] px-2 py-0.5 rounded">
                    🚪 Obra com {selectedOrder.doors.length} portas
                  </span>
                )}
                <h3 className="mt-1 text-lg font-bold text-gray-900">
                  Ficha Técnica: {selectedOrder.client}
                </h3>
                {selectedOrder.doors && selectedOrder.doors.length > 1 && (
                  <p className="mt-0.5 text-[10px] text-[#86918b]">
                    Resumo abaixo mostra a Porta 1 de {selectedOrder.doors.length} — descarregue o PDF para ver todas as portas em detalhe.
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="my-5 grid gap-4 text-xs sm:grid-cols-2">
              <div className="rounded-xl border border-gray-200 p-3 bg-gray-50">
                <p className="font-bold text-[#16a34a] mb-2 uppercase tracking-wide">
                  Medidas
                </p>
                <p className="text-gray-700">
                  <b>Largura livre:</b> {selectedOrder.widthMm} mm
                </p>
                <p className="text-gray-700">
                  <b>Altura livre:</b> {selectedOrder.heightMm} mm
                </p>
                <p className="text-gray-700">
                  <b>Padieira disponível:</b> {selectedOrder.paddingMm} mm
                </p>
                <p className="text-gray-700">
                  <b>Ombreira Esquerda:</b> {selectedOrder.leftShadeMm} mm
                </p>
                <p className="text-gray-700">
                  <b>Ombreira Direita:</b> {selectedOrder.rightShadeMm} mm
                </p>
                <p className="text-gray-700 font-bold mt-1">
                  <b>Área total:</b> {selectedOrder.area} m²
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 p-3 bg-gray-50">
                <p className="font-bold text-[#16a34a] mb-2 uppercase tracking-wide">
                  Painel & Acabamento
                </p>
                <p className="text-gray-700">
                  <b>Modelo:</b>{' '}
                  {selectedOrder.model === 'smooth'
                    ? 'Painel Total Liso'
                    : selectedOrder.model === 'cassette'
                    ? 'Painel Almofadado (Cassette)'
                    : 'Painel Canelado'}
                </p>
                <p className="text-gray-700">
                  <b>Cor / Acabamento:</b> {selectedOrder.colorCode} ({selectedOrder.colorName})
                </p>
                <p className="text-gray-700 mt-2 font-bold text-[#16a34a] uppercase tracking-wide">
                  Estrutura de Remate em Unidades
                </p>
                <p className="text-gray-700">
                  <b>Ombreira Esquerda:</b>{' '}
                  {selectedOrder.tubeLeft !== 'Nenhum'
                    ? `${selectedOrder.tubeLeft}${selectedOrder.tubeLengthLeft ? ` × ${selectedOrder.tubeLengthLeft} m` : ''}`
                    : 'Nenhuma'}
                </p>
                <p className="text-gray-700">
                  <b>Ombreira Direita:</b>{' '}
                  {selectedOrder.tubeRight !== 'Nenhum'
                    ? `${selectedOrder.tubeRight}${selectedOrder.tubeLengthRight ? ` × ${selectedOrder.tubeLengthRight} m` : ''}`
                    : 'Nenhuma'}
                </p>
                <p className="text-gray-700">
                  <b>Padieira Falsa:</b> {selectedOrder.header}{' '}
                  {selectedOrder.header !== 'Nenhum'
                    ? `(${selectedOrder.headerUnits || 1} un${selectedOrder.headerLength ? ` × ${selectedOrder.headerLength} mm` : ''})`
                    : ''}
                </p>
              </div>

              <div className="col-span-full rounded-xl border border-gray-200 p-3 bg-gray-50">
                <p className="font-bold text-[#16a34a] mb-2 uppercase tracking-wide">
                  Motorização, Calha & Acessórios
                </p>
                <div className="grid grid-cols-2 gap-2 text-gray-700">
                  <p>
                    <b>Automatismo:</b> {selectedOrder.automation}
                  </p>
                  <p>
                    <b>Calha do Motor:</b> {selectedOrder.rail}
                  </p>
                  <p>
                    <b>Qtd Comandos:</b> {selectedOrder.remotesQuantity || 2} emissores
                  </p>
                  {selectedOrder.automationExtras && selectedOrder.automationExtras.length > 0 && (
                    <p className="col-span-2">
                      <b>Extras do Motor:</b>{' '}
                      {selectedOrder.automationExtras
                        .map((e) => (e.quantity > 1 ? `${e.name} (×${e.quantity})` : e.name))
                        .join(', ')}
                    </p>
                  )}
                  <p>
                    <b>Porta de Serviço:</b> {selectedOrder.serviceDoor ? 'Sim (integrada)' : 'Não'}
                  </p>
                  <p>
                    <b>Visores:</b>{' '}
                    {selectedOrder.windows
                      ? `Sim (${selectedOrder.windowsQuantity || 2} visores · ${
                          selectedOrder.visorMaterial === 'acrilico' ? 'Acrílico' : 'Vidro duplo'
                        })`
                      : 'Não'}
                  </p>
                  <p>
                    <b>Vedante Borracha:</b> {selectedOrder.rubberSeal ? 'Sim' : 'Não'}
                  </p>
                  <p className="col-span-2">
                    <b>Extras Adicionais:</b>{' '}
                    {selectedOrder.extras && selectedOrder.extras.length > 0
                      ? selectedOrder.extras
                          .map((e) => (e.quantity > 1 ? `${e.name} (×${e.quantity})` : e.name))
                          .join(', ')
                      : 'Nenhum'}
                  </p>
                  <p className="col-span-2">
                    <b>Montagens:</b>{' '}
                    {selectedOrder.montagens && selectedOrder.montagens.length > 0
                      ? selectedOrder.montagens.join(', ')
                      : 'Nenhuma'}
                  </p>
                  {canManage && (
                  <p className="col-span-2 flex items-center justify-between rounded-lg bg-[#e9f7ee] px-3 py-2">
                    <b className="text-[#16a34a]">Preço Estimado:</b>
                    <span className="text-right text-[#16a34a]">
                      <b className="text-sm">
                        {(selectedOrder.estimatedPrice * (1 + (selectedOrder.priceIvaRateOverride ?? IVA_RATE))).toFixed(2)} €
                      </b>{' '}
                      <span className="text-[10px] font-semibold">
                        (com IVA {Math.round((selectedOrder.priceIvaRateOverride ?? IVA_RATE) * 100)}% ·{' '}
                        {selectedOrder.estimatedPrice.toFixed(2)} € sem IVA)
                      </span>
                    </span>
                  </p>
                  )}
                  {canManage &&
                    (selectedOrder.priceTotalOverride != null ||
                    selectedOrder.priceIvaRateOverride != null ||
                    (selectedOrder.priceOverrides && selectedOrder.priceOverrides.length > 0)) && (
                    <p className="col-span-2 rounded-lg bg-amber-50 px-3 py-1.5 text-[10px] font-semibold text-amber-700">
                      ⚠ {PRICE_EDITED_NOTE}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="rounded-xl border border-gray-300 px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                Fechar
              </button>
              {canManage && (
              <button
                type="button"
                onClick={() => setEmailTarget({ order: selectedOrder, kind: 'orcamento' })}
                className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                title="Enviar Orçamento por Email"
              >
                <Mail className="size-4" /> Enviar Orçamento
              </button>
              )}
              <button
                type="button"
                onClick={() => setEmailTarget({ order: selectedOrder, kind: 'encomenda' })}
                className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                title="Enviar Ficha Técnica por Email"
              >
                <Mail className="size-4" /> Enviar Ficha Técnica
              </button>
              {canManage && (
              <button
                type="button"
                onClick={() => generateQuotePDF(selectedOrder)}
                className="flex items-center justify-center gap-2 rounded-xl border border-[#16a34a]/40 bg-[#e9f7ee] px-5 py-2.5 text-xs font-bold text-[#16a34a] shadow-sm hover:bg-[#d8f0df]"
              >
                <Euro className="size-4" /> Descarregar Orçamento (PDF)
              </button>
              )}
              <button
                type="button"
                onClick={() => generateOrderPDF(selectedOrder)}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#16a34a] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#12883d]"
              >
                <Download className="size-4" /> Descarregar PDF com Desenho da Porta
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedStockOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedStockOrder(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#152126]">🧰 Pedido de Artigos</h3>
                <p className="font-mono text-xs font-bold text-[#16a34a]">{selectedStockOrder.id}</p>
              </div>
              <button onClick={() => setSelectedStockOrder(null)} className="text-gray-400 hover:text-gray-700">
                <X className="size-5" />
              </button>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg bg-[#f8faf8] p-3 text-xs">
              <p className="col-span-2">
                <b>Cliente:</b> {selectedStockOrder.client}
              </p>
              {selectedStockOrder.clientPhone && (
                <p>
                  <b>Tel:</b> {selectedStockOrder.clientPhone}
                </p>
              )}
              {selectedStockOrder.clientTaxId && (
                <p>
                  <b>NIF:</b> {selectedStockOrder.clientTaxId}
                </p>
              )}
              {selectedStockOrder.clientAddress && (
                <p className="col-span-2">
                  <b>Morada:</b> {selectedStockOrder.clientAddress}
                </p>
              )}
              <p className="col-span-2">
                <b>Criado por:</b> {selectedStockOrder.createdBy}
                {selectedStockOrder.commercialName ? ` · Comercial: ${selectedStockOrder.commercialName}` : ''}
              </p>
              {selectedStockOrder.notes && (
                <p className="col-span-2">
                  <b>Notas:</b> {selectedStockOrder.notes}
                </p>
              )}
            </div>
            <div className="mb-4 flex flex-col divide-y divide-[#f0f3f1] rounded-lg border border-[#e0e8e3]">
              {selectedStockOrder.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                  <span className="font-bold text-[#152126]">
                    {item.unit === 'm'
                      ? item.meters != null
                        ? `${item.quantity} × ${item.meters} m`
                        : `${item.quantity} m`
                      : item.unit === 'm2'
                      ? item.squareMeters != null
                        ? `${item.quantity} × ${item.squareMeters} m²`
                        : `${item.quantity} m²`
                      : `${item.quantity}×`}{' '}
                    {item.productName}
                  </span>
                  {canManage && (
                  <span className="text-[#16a34a]">
                    {item.lineTotal != null ? `${item.lineTotal.toFixed(2)} €` : 'Sob consulta'}
                  </span>
                  )}
                </div>
              ))}
              {canManage && (
              <div className="flex items-center justify-between px-3 py-2 text-xs font-bold">
                <span>Total (sem IVA)</span>
                <span className="text-[#16a34a]">{selectedStockOrder.totalPrice.toFixed(2)} €</span>
              </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedStockOrder(null)}
                className="flex-1 rounded-lg border border-gray-300 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => generateStockOrderPDF(selectedStockOrder)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#16a34a] py-2.5 text-xs font-bold text-white hover:bg-[#12883d]"
              >
                <Download className="size-4" /> Descarregar PDF
              </button>
            </div>
          </div>
        </div>
      )}

      <SendEmailModal target={emailTarget} onClose={() => setEmailTarget(null)} />
      </>
      )}
    </div>
  )
}

// Uma única página "ativa" de cada vez — substitui o antigo conjunto de booleans
// (admin/showClients/showStock/showSettings), que não garantia exclusividade mútua e obrigava
// cada página a montar a sua própria barra de navegação (daí a barra "mudar" ou desaparecer ao
// trocar de separador). Agora todas as páginas recebem o mesmo NavCallbacks e renderizam a mesma
// <TopNav>, pelo que fica sempre igual, em qualquer página.
type AppPage = 'configurator' | 'admin' | 'clients' | 'stock' | 'settings'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [page, setPage] = useState<AppPage>('configurator')
  const [adminView, setAdminView] = useState<'orders' | 'users' | 'catalog' | 'analytics'>('orders')
  const [configuratorMode, setConfiguratorMode] = useState<'encomenda' | 'orcamento'>('encomenda')

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
    setPage('configurator')
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7f6]">
        <Loader2 className="size-6 animate-spin text-[#16a34a]" />
      </div>
    )
  }

  if (!user) return <Login onLogin={(loggedInUser) => setUser(loggedInUser)} />
  if (user.mustChangePassword) {
    return <ForcePasswordChange user={user} onChanged={(updatedUser) => setUser(updatedUser)} />
  }
  if (user.role === 'fabrica') {
    // A app de produção (Electron) aponta sempre para /producao — isto é só uma rede de
    // segurança para quem acede a "/" diretamente com uma conta de fábrica.
    if (typeof window !== 'undefined') window.location.replace('/producao')
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7f6]">
        <Loader2 className="size-6 animate-spin text-[#16a34a]" />
      </div>
    )
  }

  const nav: NavCallbacks = {
    onEncomenda: () => {
      setConfiguratorMode('encomenda')
      setPage('configurator')
    },
    onOrcamento: () => {
      setConfiguratorMode('orcamento')
      setPage('configurator')
    },
    onOrders: () => {
      setAdminView('orders')
      setPage('admin')
    },
    onClients: () => setPage('clients'),
    onStock: () => setPage('stock'),
    onUsers: () => {
      setAdminView('users')
      setPage('admin')
    },
    onCatalog: () => {
      setAdminView('catalog')
      setPage('admin')
    },
    onAnalytics: () => {
      setAdminView('analytics')
      setPage('admin')
    },
    onSettings: () => setPage('settings'),
    onLogout: handleLogout,
  }

  if (page === 'clients') return <ClientsPage user={user} nav={nav} />
  if (page === 'stock') return <StockPage user={user} nav={nav} />
  if (page === 'settings') {
    return <SettingsPage user={user} onUserUpdate={(updatedUser) => setUser(updatedUser)} nav={nav} />
  }
  if (page === 'admin') return <Admin user={user} initialView={adminView} nav={nav} />
  return <Configurator key={configuratorMode} user={user} initialMode={configuratorMode} nav={nav} />
}
