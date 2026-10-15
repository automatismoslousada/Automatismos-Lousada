'use client'

import { Canvas, useThree } from '@react-three/fiber'
import { PerspectiveCamera, OrbitControls, Environment, ContactShadows } from '@react-three/drei'
import { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'

const LOGO_URL = 'https://i.imgur.com/YZGkZR2.png'

// Deteta cores de porta muito claras (RALs "Branco ...") para trocar os alumínios pretos por brancos
function isWhiteDoorColor(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return false
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return (r * 299 + g * 587 + b * 114) / 1000 > 210
}

export interface DoorProps {
  width: number
  height: number
  padding?: number
  leftShade?: number
  rightShade?: number
  color: string
  model: string // 'smooth' | 'ribbed'
  view?: 'front' | 'angle'
  showInterior?: boolean
  isOpen: boolean
  serviceDoor: boolean
  serviceDoorType?: string // 'none' | 'normal' | 'normal-soleira' | 'idealdoor'
  serviceDoorPosition?: 'left' | 'center' | 'right'
  serviceDoorPanicBar?: boolean
  serviceDoorAirSpring?: boolean
  windows: boolean
  windowsQuantity?: number
  windowsPanels?: number[]
  grelhasPanels?: number[]
  visorMaterial?: 'vidro' | 'acrilico'
  automation: string
  rail: string
  tubeLeft: string
  tubeRight: string
  tubeLengthLeft?: string
  tubeLengthRight?: string
  header: string
  headerLength: string
  extras?: { name: string; quantity: number }[]
  onMeasureEdit: (type: 'width' | 'height' | 'padding' | 'leftShade' | 'rightShade', value: number) => void
}

function DoorModel({
  width,
  height,
  color,
  model,
  isOpen,
  serviceDoor,
  serviceDoorType = 'normal',
  serviceDoorPosition = 'center',
  serviceDoorPanicBar = false,
  serviceDoorAirSpring = false,
  windows,
  windowsQuantity = 2,
  windowsPanels = [1],
  grelhasPanels = [1],
  visorMaterial = 'vidro',
  showInterior = false,
  tubeLeft,
  tubeRight,
  header,
  extras = [],
  padding = 0.2,
}: DoorProps) {
  const groupRef = useRef<THREE.Group>(null)

  // Alumínios de cima/baixo do exterior acompanham portas brancas (em vez de ficarem sempre pretos)
  const extBarColor = isWhiteDoorColor(color) ? '#f2f1ec' : '#040506'
  const extBarMetalness = isWhiteDoorColor(color) ? 0.35 : 0.75

  // Placa com o logótipo da Automatismos Lousada, no canto inferior direito da porta
  const [logoTexture, setLogoTexture] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    let cancelled = false
    new THREE.TextureLoader().load(LOGO_URL, (tex) => {
      if (cancelled) return
      tex.colorSpace = THREE.SRGBColorSpace
      setLogoTexture(tex)
    })
    return () => {
      cancelled = true
    }
  }, [])
  const logoAspect =
    logoTexture?.image?.width && logoTexture?.image?.height ? logoTexture.image.width / logoTexture.image.height : 1

  const panelCount = Math.max(3, Math.round(height / 0.55))
  const panelHeight = height / panelCount

  // Visores/grelhas ficam demasiado perto do topo do painel superior, colados à padieira — desce-os um pouco
  const topAccessoryY = -panelHeight * 0.16

  // Posição horizontal da porta pedonal — eixo X aparece espelhado na vista exterior (câmara do lado oposto),
  // por isso "direita"/"esquerda" são invertidos aqui para corresponderem ao que se vê no ecrã
  const serviceDoorX =
    serviceDoorPosition === 'left' ? width * 0.28 : serviceDoorPosition === 'right' ? -width * 0.28 : 0

  // Só os tipos com modelação 3D dedicada abrem recorte/hardware no modelo — outros tipos de
  // catálogo (ex. "Porta Anexa", adicionados livremente pelo admin) continuam selecionáveis no
  // configurador e nas encomendas/PDF, mas não têm representação 3D, para não aparecer um recorte
  // "vazio" sem o acabamento correspondente.
  const serviceDoor3D = serviceDoor && ['normal', 'normal-soleira', 'idealdoor'].includes(serviceDoorType)

  const hasOmega = extras.some((e) => e.name === 'Omega')
  const hasOmegaLacada = extras.some((e) => e.name === 'Omega lacada')
  const omegaQuantity = extras.find((e) => e.name === 'Omega')?.quantity || extras.find((e) => e.name === 'Omega lacada')?.quantity || 1
  const hasGrelhas = extras.some((e) => e.name === 'Grelhas de ventilação')
  const grelhasQuantity = extras.find((e) => e.name === 'Grelhas de ventilação')?.quantity || 1
  const hasDesbloqueador = extras.some((e) => e.name === 'Desbloqueador externo')
  const hasFerragemElevada = extras.some((e) => e.name === 'Ferragem elevada')
  const hasFerragemInclinada = extras.some((e) => e.name === 'Ferragem inclinada')

  // Dimensões do recorte da porta pedonal — partilhadas pelos lados exterior e interior,
  // para que o corte apareça exatamente no mesmo sítio dos dois lados. Fica sempre contida
  // nos 4 últimos painéis a contar de baixo, seja qual for o tamanho do portão.
  const serviceDoorReachesFloor = serviceDoorType === 'normal-soleira' || serviceDoorType === 'idealdoor'
  const serviceDoorW = Math.min(width * 0.28, 0.95)
  const serviceDoorPanels = Math.min(4, panelCount)
  const serviceDoorBandBottom = serviceDoorReachesFloor ? -height / 2 : -height / 2 + panelHeight * 0.25
  const serviceDoorBandTop = -height / 2 + serviceDoorPanels * panelHeight - panelHeight * 0.5
  const serviceDoorH = serviceDoorBandTop - serviceDoorBandBottom
  const serviceDoorCenterY = (serviceDoorBandTop + serviceDoorBandBottom) / 2

  // Material do vidro dos visores — varia com o material escolhido
  const glassColor = visorMaterial === 'acrilico' ? '#b9dde8' : '#cdeefc'
  const glassRoughness = visorMaterial === 'acrilico' ? 0.35 : 0.05
  const glassOpacity = visorMaterial === 'acrilico' ? 0.92 : 0.78
  const glassMetalness = visorMaterial === 'acrilico' ? 0 : 0.05

  // Linhas de junta a atravessar a porta pedonal, alinhadas com as mesmas fronteiras de painel do portão principal
  const serviceDoorJointYs = serviceDoor3D
    ? Array.from({ length: serviceDoorPanels - 1 }, (_, k) => {
        const i = panelCount - serviceDoorPanels + 1 + k
        return height / 2 - i * panelHeight
      }).filter((y) => y > serviceDoorBandBottom + panelHeight * 0.1 && y < serviceDoorBandTop - panelHeight * 0.1)
    : []
  const renderServiceDoorJoints = (z: number, key: string) =>
    serviceDoorJointYs.map((y, idx) => (
      <mesh key={`${key}-${idx}`} position={[0, y, z]}>
        <boxGeometry args={[serviceDoorW * 0.96, 0.006, 0.004]} />
        <meshStandardMaterial color="#141a1d" roughness={0.9} />
      </mesh>
    ))

  // Nervuras do painel canelado sobre a porta pedonal — mesma grelha (em Y) das nervuras do
  // portão principal, para o painel da porta de serviço ficar com o mesmo acabamento quando o
  // modelo escolhido for "Painel Canelado", em vez de ficar liso.
  const serviceDoorRibSpacing = panelHeight / 8
  const serviceDoorRibs =
    serviceDoor3D && model === 'ribbed'
      ? Array.from({ length: serviceDoorPanels }, (_, k) => {
          const i = panelCount - serviceDoorPanels + k
          return Array.from({ length: 7 }, (_, ri) => ({
            y: height / 2 - i * panelHeight - serviceDoorRibSpacing * (ri + 1),
            ribH: serviceDoorRibSpacing * 0.52,
          }))
        })
          .flat()
          .filter(({ y }) => y > serviceDoorBandBottom + 0.01 && y < serviceDoorBandTop - 0.01)
      : []
  const renderServiceDoorRibs = (side: 'ext' | 'int', key: string) =>
    serviceDoorRibs.map(({ y, ribH }, idx) => {
      // O painel da porta de serviço está centrado em z=±0.01 com 0.016 de espessura, por isso a
      // face exterior fica em ±0.018 — as nervuras têm de sobressair para lá dessa face (não ficar
      // dentro do volume do painel), tal como acontece nas nervuras do portão principal.
      const baseZ = side === 'ext' ? 0.02 : -0.02
      const shadowZ = side === 'ext' ? 0.018 : -0.018
      const ribColor = side === 'ext' ? color : '#f5f5f2'
      return (
        <group key={`${key}-${idx}`}>
          <mesh position={[0, y, baseZ]}>
            <boxGeometry args={[serviceDoorW * 0.98, ribH, 0.006]} />
            <meshStandardMaterial color={ribColor} metalness={0.32} roughness={0.32} />
          </mesh>
          <mesh position={[0, y - ribH * 0.56, shadowZ]}>
            <boxGeometry args={[serviceDoorW * 0.98, serviceDoorRibSpacing * 0.06, 0.002]} />
            <meshStandardMaterial color="#060809" roughness={0.98} />
          </mesh>
        </group>
      )
    })

  return (
    <group ref={groupRef}>
      {/* Aro / Remate perimetral do vão em perfil de alumínio escuro — só do lado exterior, senão tapa o interior */}
      {showInterior && (
        <mesh position={[0, 0, -0.015]}>
          <boxGeometry args={[width + 0.04, height + 0.03, 0.04]} />
          <meshStandardMaterial color="#1a2226" roughness={0.7} />
        </mesh>
      )}

      {/* Painéis da Porta Seccionada */}
      {Array.from({ length: panelCount }).map((_, i) => {
        const closedY = height / 2 - (i + 0.5) * panelHeight
        const openY = height / 2 + height * 0.65 + i * 0.04
        const panelY = isOpen ? openY : closedY
        const panelZ = isOpen ? -i * 0.1 - 0.2 : 0
        const isWindowsPanel = windowsPanels.some((n) => i === Math.min(Math.max(n, 1), panelCount) - 1)
        const isGrelhasPanel = grelhasPanels.some((n) => i === Math.min(Math.max(n, 1), panelCount) - 1)

        // Quando há porta pedonal neste painel, os acessórios (visores e grelhas) têm de
        // ficar dos lados dela, não por cima — partilham a mesma lógica de distribuição.
        const isDoorPanel = serviceDoor3D && i >= panelCount - serviceDoorPanels
        const computeAccessoryLayout = (quantity: number) => {
          let xs: number[]
          let w = Math.min(0.55, width * 0.2)
          if (!isDoorPanel) {
            const spacing = width / (quantity + 1)
            xs = Array.from({ length: quantity }, (_, idx) => -width / 2 + (idx + 1) * spacing)
          } else {
            const margin = 0.07
            const doorLeft = serviceDoorX - serviceDoorW / 2 - margin
            const doorRight = serviceDoorX + serviceDoorW / 2 + margin
            const leftW = Math.max(0, doorLeft + width / 2)
            const rightW = Math.max(0, width / 2 - doorRight)
            // A porta pedonal empurra os acessórios todos para o lado oposto — só reparte
            // dos dois lados quando a porta está centrada e não sobra espaço de um só lado.
            // Nota: o eixo X é invertido de propósito em serviceDoorX para a porta pedonal
            // aparecer do lado certo no ecrã (câmara exterior do lado oposto) — por isso
            // "esquerda" corresponde à zona leftW (mundo) e "direita" à zona rightW (mundo).
            let leftCount: number
            if (serviceDoorPosition === 'left') {
              leftCount = leftW <= 0 ? Math.floor(quantity / 2) : quantity
            } else if (serviceDoorPosition === 'right') {
              leftCount = rightW <= 0 ? Math.ceil(quantity / 2) : 0
            } else {
              leftCount = leftW <= 0 ? 0 : rightW <= 0 ? quantity : Math.ceil(quantity / 2)
            }
            const rightCount = quantity - leftCount
            const result: number[] = []
            for (let k = 0; k < leftCount; k++) result.push(-width / 2 + ((k + 1) / (leftCount + 1)) * leftW)
            for (let k = 0; k < rightCount; k++) result.push(doorRight + ((k + 1) / (rightCount + 1)) * rightW)
            xs = result
            const zoneW = Math.min(leftCount > 0 ? leftW / leftCount : Infinity, rightCount > 0 ? rightW / rightCount : Infinity)
            w = Math.max(0.12, Math.min(w, zoneW * 0.72))
          }
          return { xs, w }
        }

        const windowCount = Math.min(4, Math.max(1, windowsQuantity))
        const { xs: windowXs, w: windowW } = computeAccessoryLayout(windowCount)

        const grelhasCount = Math.min(4, Math.max(1, grelhasQuantity))
        const { xs: grelhasXs, w: grelhasW } = computeAccessoryLayout(grelhasCount)

        return (
          <group
            key={i}
            position={[0, panelY, panelZ]}
            rotation={[isOpen ? -Math.PI / 2 : 0, 0, 0]}
          >
            {/* Painel Principal — cor à escolha no exterior, sempre branco no interior */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[width * 0.992, panelHeight * 0.985, 0.042]} />
              <meshStandardMaterial
                color={showInterior ? '#f5f5f2' : color}
                metalness={model === 'smooth' ? 0.22 : 0.3}
                roughness={model === 'smooth' ? 0.42 : 0.55}
              />
            </mesh>

            {/* OMEGA — 1 barra por painel, apenas nos primeiros N painéis (do topo) conforme quantidade.
                Afastada das pontas do painel para não ficar colada aos remates laterais. */}
            {(hasOmega || hasOmegaLacada) && i < omegaQuantity && (
              <mesh position={[0, 0, 0.023]}>
                <boxGeometry args={[width * 0.93, panelHeight * 0.16, 0.012]} />
                <meshStandardMaterial
                  color={hasOmegaLacada ? color : '#9aa3a8'}
                  metalness={hasOmegaLacada ? 0.2 : 0.75}
                  roughness={hasOmegaLacada ? 0.5 : 0.3}
                />
              </mesh>
            )}

            {/* Linha de Junta Escura entre painéis */}
            <mesh position={[0, -panelHeight * 0.495, 0.022]}>
              <boxGeometry args={[width * 0.99, 0.006, 0.004]} />
              <meshStandardMaterial color="#141a1d" roughness={0.9} />
            </mesh>

            {/* MODELO: PAINEL CANELADO — nervuras finas e uniformes estilo micro-canelado industrial */}
            {model === 'ribbed' && (() => {
              const ribCount = 7
              const spacing = panelHeight / (ribCount + 1)
              return (
                <>
                  {Array.from({ length: ribCount }).map((_, ri) => {
                    const ribY = panelHeight / 2 - spacing * (ri + 1)
                    const ribH = spacing * 0.52
                    return (
                      <group key={`rib-${ri}`}>
                        {/* Nervura exterior — cor da porta */}
                        <mesh position={[0, ribY, -0.024]}>
                          <boxGeometry args={[width * 0.999, ribH, 0.007]} />
                          <meshStandardMaterial color={color} metalness={0.32} roughness={0.32} />
                        </mesh>
                        {/* Sombra inferior da nervura — exterior */}
                        <mesh position={[0, ribY - ribH * 0.56, -0.022]}>
                          <boxGeometry args={[width * 0.999, spacing * 0.06, 0.002]} />
                          <meshStandardMaterial color="#060809" roughness={0.98} />
                        </mesh>
                        {/* Nervura interior — sempre branca */}
                        <mesh position={[0, ribY, 0.024]}>
                          <boxGeometry args={[width * 0.999, ribH, 0.007]} />
                          <meshStandardMaterial color="#f5f5f2" metalness={0.32} roughness={0.32} />
                        </mesh>
                        {/* Sombra inferior da nervura — interior */}
                        <mesh position={[0, ribY - ribH * 0.56, 0.022]}>
                          <boxGeometry args={[width * 0.999, spacing * 0.06, 0.002]} />
                          <meshStandardMaterial color="#060809" roughness={0.98} />
                        </mesh>
                      </group>
                    )
                  })}
                </>
              )
            })()}

            {/* VISORES PANORÂMICOS (painel escolhido pelo cliente) */}
            {windows && isWindowsPanel && (
              <group position={[0, topAccessoryY, 0.024]}>
                {Array.from({ length: Math.min(4, Math.max(1, windowsQuantity)) }).map(
                  (_, winIndex) => {
                    const winX = windowXs[winIndex] ?? 0
                    const winW = windowW
                    const winH = Math.min(0.24, panelHeight * 0.58)

                    return (
                      <group key={`win-${winIndex}`} position={[winX, 0, 0]}>
                        {/* Moldura exterior preta */}
                        <mesh>
                          <boxGeometry args={[winW, winH, 0.01]} />
                          <meshStandardMaterial color="#171e21" roughness={0.5} />
                        </mesh>
                        {/* Vidro duplo translúcido — lado exterior */}
                        <mesh position={[0, 0, 0.006]}>
                          <boxGeometry args={[winW * 0.88, winH * 0.82, 0.004]} />
                          <meshStandardMaterial
                            color={glassColor}
                            metalness={glassMetalness}
                            roughness={glassRoughness}
                            transparent
                            opacity={glassOpacity}
                          />
                        </mesh>
                      </group>
                    )
                  }
                )}
              </group>
            )}

            {/* VISORES PANORÂMICOS — lado interior (vidro é passante, visível dos dois lados) */}
            {windows && isWindowsPanel && (
              <group position={[0, topAccessoryY, -0.024]}>
                {Array.from({ length: Math.min(4, Math.max(1, windowsQuantity)) }).map(
                  (_, winIndex) => {
                    const winX = windowXs[winIndex] ?? 0
                    const winW = windowW
                    const winH = Math.min(0.24, panelHeight * 0.58)

                    return (
                      <group key={`win-int-${winIndex}`} position={[winX, 0, 0]}>
                        <mesh>
                          <boxGeometry args={[winW, winH, 0.01]} />
                          <meshStandardMaterial color="#171e21" roughness={0.5} />
                        </mesh>
                        <mesh position={[0, 0, -0.006]}>
                          <boxGeometry args={[winW * 0.88, winH * 0.82, 0.004]} />
                          <meshStandardMaterial
                            color={glassColor}
                            metalness={glassMetalness}
                            roughness={glassRoughness}
                            transparent
                            opacity={glassOpacity}
                          />
                        </mesh>
                      </group>
                    )
                  }
                )}
              </group>
            )}

            {/* GRELHAS DE VENTILAÇÃO (painel escolhido pelo cliente) — mesmo padrão dos visores,
                incluindo o desvio em torno da porta pedonal quando partilham o mesmo painel */}
            {hasGrelhas && isGrelhasPanel && (
              <group position={[0, topAccessoryY, 0.024]}>
                {Array.from({ length: grelhasCount }).map(
                  (_, grIndex) => {
                    const grX = grelhasXs[grIndex] ?? 0
                    const grW = grelhasW
                    const grH = Math.min(0.24, panelHeight * 0.58)

                    return (
                      <group key={`grelha-${grIndex}`} position={[grX, 0, 0]}>
                        {/* Moldura exterior escura */}
                        <mesh>
                          <boxGeometry args={[grW, grH, 0.01]} />
                          <meshStandardMaterial color="#171e21" roughness={0.5} />
                        </mesh>
                        {/* Lamelas da grelha */}
                        {Array.from({ length: 5 }).map((_, slat) => (
                          <mesh
                            key={`slat-${slat}`}
                            position={[0, grH * 0.36 - slat * ((grH * 0.85) / 4), 0.007]}
                          >
                            <boxGeometry args={[grW * 0.86, grH * 0.09, 0.006]} />
                            <meshStandardMaterial color="#3a444a" metalness={0.55} roughness={0.4} />
                          </mesh>
                        ))}
                      </group>
                    )
                  }
                )}
              </group>
            )}

            {/* GRELHAS DE VENTILAÇÃO — lado interior (o furo de ventilação é passante) */}
            {hasGrelhas && isGrelhasPanel && (
              <group position={[0, topAccessoryY, -0.024]}>
                {Array.from({ length: grelhasCount }).map(
                  (_, grIndex) => {
                    const grX = grelhasXs[grIndex] ?? 0
                    const grW = grelhasW
                    const grH = Math.min(0.24, panelHeight * 0.58)

                    return (
                      <group key={`grelha-int-${grIndex}`} position={[grX, 0, 0]}>
                        <mesh>
                          <boxGeometry args={[grW, grH, 0.01]} />
                          <meshStandardMaterial color="#171e21" roughness={0.5} />
                        </mesh>
                        {Array.from({ length: 5 }).map((_, slat) => (
                          <mesh
                            key={`slat-int-${slat}`}
                            position={[0, grH * 0.36 - slat * ((grH * 0.85) / 4), -0.007]}
                          >
                            <boxGeometry args={[grW * 0.86, grH * 0.09, 0.006]} />
                            <meshStandardMaterial color="#3a444a" metalness={0.55} roughness={0.4} />
                          </mesh>
                        ))}
                      </group>
                    )
                  }
                )}
              </group>
            )}
          </group>
        )
      })}

      {/* PORTA DE SERVIÇO PEDONAL INTEGRADA — 6 tipos */}
      {serviceDoor3D && (
        <group position={[serviceDoorX, 0, 0]}>
          {/* Porta pedonal — lado exterior: painel + puxador/fechadura, visível a partir da vista exterior */}
          <group position={[0, 0, -0.032]} scale={[1, 1, -1]}>
            {/* ─── TIPO 1: NORMAL — recortada no painel com moldura em aço ─── */}
            {serviceDoorType === 'normal' && (
              <>
                {/* Moldura perimetral em alumínio — atrás do painel, só a aparecer como rebordo */}
                <mesh position={[0, serviceDoorCenterY, 0]}>
                  <boxGeometry args={[serviceDoorW + 0.022, serviceDoorH + 0.022, 0.005]} />
                  <meshStandardMaterial color="#3a454b" metalness={0.8} roughness={0.3} />
                </mesh>
                {/* Painel preenchido na cor do portão */}
                <mesh position={[0, serviceDoorCenterY, 0.01]}>
                  <boxGeometry args={[serviceDoorW, serviceDoorH, 0.016]} />
                  <meshStandardMaterial color={color} metalness={0.25} roughness={0.5} />
                </mesh>
                {/* Nervuras do painel canelado — só quando esse for o modelo escolhido */}
                {renderServiceDoorRibs('ext', 'sd-rib-normal')}
                {/* Puxador em inox */}
                <mesh position={[serviceDoorW * 0.38, serviceDoorCenterY, 0.022]}>
                  <boxGeometry args={[0.016, 0.12, 0.026]} />
                  <meshStandardMaterial color="#d4dde0" metalness={0.95} roughness={0.15} />
                </mesh>
                {/* Fechadura de cilindro */}
                <mesh position={[serviceDoorW * 0.38, serviceDoorCenterY - 0.06, 0.018]}>
                  <boxGeometry args={[0.012, 0.024, 0.012]} />
                  <meshStandardMaterial color="#c0b080" metalness={0.9} roughness={0.2} />
                </mesh>
                {/* Linhas de junta — continuam as fronteiras dos painéis do portão sobre a porta pedonal */}
                {renderServiceDoorJoints(0.019, 'sd-joint-normal')}
              </>
            )}

            {/* ─── TIPO 1b: NORMAL COM SOLEIRA REBAIXADA — estende até ao pavimento, sem degrau ─── */}
            {serviceDoorType === 'normal-soleira' && (
              <>
                <mesh position={[0, serviceDoorCenterY, 0]}>
                  <boxGeometry args={[serviceDoorW + 0.022, serviceDoorH + 0.022, 0.005]} />
                  <meshStandardMaterial color="#3a454b" metalness={0.8} roughness={0.3} />
                </mesh>
                <mesh position={[0, serviceDoorCenterY, 0.01]}>
                  <boxGeometry args={[serviceDoorW, serviceDoorH, 0.016]} />
                  <meshStandardMaterial color={color} metalness={0.25} roughness={0.5} />
                </mesh>
                {/* Nervuras do painel canelado — só quando esse for o modelo escolhido */}
                {renderServiceDoorRibs('ext', 'sd-rib-soleira')}
                {/* Soleira rebaixada — friso fino encostado ao pavimento */}
                <mesh position={[0, serviceDoorCenterY - serviceDoorH / 2, 0.014]}>
                  <boxGeometry args={[serviceDoorW + 0.03, 0.012, 0.008]} />
                  <meshStandardMaterial color="#c8d0d3" metalness={0.7} roughness={0.3} />
                </mesh>
                <mesh position={[serviceDoorW * 0.38, serviceDoorCenterY, 0.022]}>
                  <boxGeometry args={[0.016, 0.12, 0.026]} />
                  <meshStandardMaterial color="#d4dde0" metalness={0.95} roughness={0.15} />
                </mesh>
                {/* Linhas de junta — continuam as fronteiras dos painéis do portão sobre a porta pedonal */}
                {renderServiceDoorJoints(0.019, 'sd-joint-soleira')}
              </>
            )}

            {/* ─── TIPO 1c: IDEALDOOR — perfil de marca com friso distintivo ─── */}
            {serviceDoorType === 'idealdoor' && (
              <>
                {/* Perfil de marca — atrás do painel, só a aparecer como rebordo */}
                <mesh position={[0, serviceDoorCenterY, -0.025]}>
                  <boxGeometry args={[serviceDoorW + 0.008, serviceDoorH + 0.008, 0.003]} />
                  <meshStandardMaterial color="#505d63" metalness={0.85} roughness={0.2} />
                </mesh>
                <mesh position={[0, serviceDoorCenterY, 0]}>
                  <boxGeometry args={[serviceDoorW, serviceDoorH, 0.044]} />
                  <meshStandardMaterial color={color} metalness={0.28} roughness={0.45} />
                </mesh>
                {/* Friso distintivo IDEALDOOR perto do topo */}
                <mesh position={[0, serviceDoorCenterY + serviceDoorH * 0.32, 0.026]}>
                  <boxGeometry args={[serviceDoorW * 0.9, 0.014, 0.004]} />
                  <meshStandardMaterial color="#e9edee" metalness={0.6} roughness={0.25} />
                </mesh>
                <mesh position={[serviceDoorW * 0.4, serviceDoorCenterY, 0.026]}>
                  <boxGeometry args={[0.02, 0.09, 0.008]} />
                  <meshStandardMaterial color="#c8d5d9" metalness={0.95} roughness={0.1} />
                </mesh>
                {/* Soleira rebaixada — friso fino encostado ao pavimento, igual à porta normal com soleira */}
                <mesh position={[0, serviceDoorCenterY - serviceDoorH / 2, 0.026]}>
                  <boxGeometry args={[serviceDoorW + 0.03, 0.012, 0.008]} />
                  <meshStandardMaterial color="#c8d0d3" metalness={0.7} roughness={0.3} />
                </mesh>
                {/* Linhas de junta — continuam as fronteiras dos painéis do portão sobre a porta pedonal */}
                {renderServiceDoorJoints(0.0235, 'sd-joint-ideal')}
              </>
            )}
          </group>

          {/* Porta pedonal — lado interior: painel + barra antipânico, visível a partir da vista interior — mesma posição/dimensão do lado exterior; sempre branco no interior, tal como o portão principal */}
          <group position={[0, 0, 0.032]} scale={[1, 1, -1]}>
            {/* Moldura perimetral — atrás do painel, só a aparecer como rebordo */}
            <mesh position={[0, serviceDoorCenterY, 0]}>
              <boxGeometry args={[serviceDoorW + 0.022, serviceDoorH + 0.022, 0.005]} />
              <meshStandardMaterial color="#3a454b" metalness={0.8} roughness={0.3} />
            </mesh>
            <mesh position={[0, serviceDoorCenterY, -0.01]}>
              <boxGeometry args={[serviceDoorW, serviceDoorH, 0.016]} />
              <meshStandardMaterial color="#f5f5f2" metalness={0.25} roughness={0.5} />
            </mesh>
            {/* Nervuras do painel canelado — só quando esse for o modelo escolhido; a IDEALDOOR tem acabamento de marca próprio, não leva nervuras genéricas */}
            {serviceDoorType !== 'idealdoor' && renderServiceDoorRibs('int', 'sd-rib-int')}
            {/* Linhas de junta — continuam as fronteiras dos painéis do portão sobre a porta pedonal */}
            {renderServiceDoorJoints(-0.019, 'sd-joint-int')}
            {/* Barra antipânico — opcional */}
            {serviceDoorPanicBar && (
              <mesh position={[0, serviceDoorCenterY - 0.02, -0.02]}>
                <boxGeometry args={[serviceDoorW * 0.7, 0.05, 0.02]} />
                <meshStandardMaterial color="#8b959a" metalness={0.6} roughness={0.35} />
              </mesh>
            )}
          </group>

          {/* MOLA AÉREA — fecho automático montado no topo da porta pedonal, lado interior */}
          {serviceDoorAirSpring && (
            <group position={[0, serviceDoorCenterY + serviceDoorH / 2 + 0.025, 0.032]} scale={[1, 1, -1]}>
              {/* Corpo da mola */}
              <mesh position={[-serviceDoorW * 0.12, 0, -0.03]}>
                <boxGeometry args={[serviceDoorW * 0.44, 0.045, 0.05]} />
                <meshStandardMaterial color="#6b7378" metalness={0.6} roughness={0.4} />
              </mesh>
              {/* Braço articulado até à folha da porta */}
              <mesh position={[serviceDoorW * 0.16, -0.04, -0.025]} rotation={[0, 0, -0.55]}>
                <boxGeometry args={[0.2, 0.018, 0.018]} />
                <meshStandardMaterial color="#4a5257" metalness={0.7} roughness={0.35} />
              </mesh>
            </group>
          )}
        </group>
      )}

      {/* Remate inferior em alumínio preto — visível dos dois lados, igual no interior e no exterior; ultrapassa a largura para fechar bem nos cantos com as laterais */}
      <mesh position={[0, -height / 2 + 0.0175, 0.012]}>
        <boxGeometry args={[width + 0.03, 0.075, 0.05]} />
        <meshStandardMaterial color="#040506" metalness={0.75} roughness={0.3} />
      </mesh>

      {/* Borrachas de vedação laterais — finas, de baixo a cima, de ponta a ponta (ultrapassam a altura para fechar bem nos cantos); face exterior (z=-0.04) à frente da barra do exterior (z=-0.038) para sobrepor o alumínio nos cantos em vez de ficar por baixo */}
      <mesh position={[-width / 2 + 0.01, 0, -0.01]}>
        <boxGeometry args={[0.02, height + 0.03, 0.06]} />
        <meshStandardMaterial color="#040506" metalness={0.75} roughness={0.3} />
      </mesh>
      <mesh position={[width / 2 - 0.01, 0, -0.01]}>
        <boxGeometry args={[0.02, height + 0.03, 0.06]} />
        <meshStandardMaterial color="#040506" metalness={0.75} roughness={0.3} />
      </mesh>

      {/* OMBREIRA FALSA ESQUERDA */}
      {tubeLeft !== 'Nenhum' && !showInterior && (
        <group position={[-width * (tubeLeft.toLowerCase().includes('painel') ? 0.51 : 0.5), 0, -0.04]}>
          {tubeLeft.toLowerCase().includes('painel') ? (
            <group position={[0, 0, 0.005]}>
              <mesh>
                <boxGeometry args={[0.14, height, 0.05]} />
                <meshStandardMaterial color={color} roughness={0.5} metalness={0.2} />
              </mesh>
              <mesh position={[0, 0, 0.027]}>
                <boxGeometry args={[0.146, height + 0.01, 0.004]} />
                <meshStandardMaterial color="#b0bac0" metalness={0.8} roughness={0.25} />
              </mesh>
            </group>
          ) : (() => {
            const isLacado = tubeLeft.toLowerCase().includes('lacado')
            const isAlum = tubeLeft.toLowerCase().includes('alum')
            const isGalv = tubeLeft.toLowerCase().includes('galvanizado')
            const tubeColor = isLacado ? color : isAlum ? '#c5cfd4' : isGalv ? '#8e9ca2' : '#3a444a'
            return (
              <mesh>
                <boxGeometry args={[0.10, height * 1.02, 0.10]} />
                <meshStandardMaterial color={tubeColor} metalness={isLacado ? 0.2 : isAlum ? 0.75 : 0.5} roughness={0.35} />
              </mesh>
            )
          })()}
        </group>
      )}

      {/* OMBREIRA FALSA DIREITA */}
      {tubeRight !== 'Nenhum' && !showInterior && (
        <group position={[width * (tubeRight.toLowerCase().includes('painel') ? 0.51 : 0.5), 0, -0.04]}>
          {tubeRight.toLowerCase().includes('painel') ? (
            <group position={[0, 0, 0.005]}>
              <mesh>
                <boxGeometry args={[0.14, height, 0.05]} />
                <meshStandardMaterial color={color} roughness={0.5} metalness={0.2} />
              </mesh>
              <mesh position={[0, 0, 0.027]}>
                <boxGeometry args={[0.146, height + 0.01, 0.004]} />
                <meshStandardMaterial color="#b0bac0" metalness={0.8} roughness={0.25} />
              </mesh>
            </group>
          ) : (() => {
            const isLacado = tubeRight.toLowerCase().includes('lacado')
            const isAlum = tubeRight.toLowerCase().includes('alum')
            const isGalv = tubeRight.toLowerCase().includes('galvanizado')
            const tubeColor = isLacado ? color : isAlum ? '#c5cfd4' : isGalv ? '#8e9ca2' : '#3a444a'
            return (
              <mesh>
                <boxGeometry args={[0.10, height * 1.02, 0.10]} />
                <meshStandardMaterial color={tubeColor} metalness={isLacado ? 0.2 : isAlum ? 0.75 : 0.5} roughness={0.35} />
              </mesh>
            )
          })()}
        </group>
      )}

      {/* PADIEIRA FALSA — dentro do vão, no topo da abertura, ao mesmo nível das ombreiras */}
      {header !== 'Nenhum' && !showInterior && (
        <group position={[0, height / 2 - 0.07, -0.04]}>
          {header.toLowerCase().includes('painel') ? (
            <group>
              <mesh>
                <boxGeometry args={[width * 0.99, 0.14, 0.05]} />
                <meshStandardMaterial color={color} roughness={0.5} metalness={0.2} />
              </mesh>
              <mesh position={[0, 0, 0.027]}>
                <boxGeometry args={[width + 0.01, 0.145, 0.004]} />
                <meshStandardMaterial color="#b0bac0" metalness={0.8} roughness={0.25} />
              </mesh>
            </group>
          ) : header.toLowerCase().includes('tubo') ? (
            (() => {
              const isLacado = header.toLowerCase().includes('lacado')
              const isAlum = header.toLowerCase().includes('alum')
              const isGalv = header.toLowerCase().includes('galvanizado')
              const hColor = isLacado ? color : isAlum ? '#c5cfd4' : isGalv ? '#8e9ca2' : '#3a444a'
              return (
                <mesh>
                  <boxGeometry args={[width * 0.99, 0.10, 0.10]} />
                  <meshStandardMaterial color={hColor} metalness={isLacado ? 0.2 : 0.65} roughness={0.35} />
                </mesh>
              )
            })()
          ) : (
            <mesh>
              <boxGeometry args={[width * 0.99, 0.14, 0.05]} />
              <meshStandardMaterial color="#1e2528" metalness={0.4} roughness={0.8} />
            </mesh>
          )}
        </group>
      )}

      {/* DESBLOQUEADOR EXTERNO — botão redondo em metal cinza, no primeiro painel a contar de cima, acima da linha de visores/grelhas para não sobrepor e afastado da padieira */}
      {hasDesbloqueador && (
        <group position={[0, height / 2 - panelHeight * 0.36, -0.026]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.014, 28]} />
            <meshStandardMaterial color="#9aa3a8" metalness={0.85} roughness={0.25} />
          </mesh>
        </group>
      )}

      {/* BARRA DO EXTERIOR — em baixo e em cima, na largura toda da porta, só do lado exterior (plano virado para -z, invisível do interior por backface culling); o remate fino da linha 442 continua a servir para o interior. Acompanha a cor da porta quando é branca. */}
      <mesh position={[0, -height / 2 + 0.005, -0.038]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[width + 0.03, 0.13]} />
        <meshStandardMaterial color={extBarColor} metalness={extBarMetalness} roughness={0.3} />
      </mesh>
      <mesh position={[0, height / 2 - 0.02, -0.038]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[width + 0.03, 0.13]} />
        <meshStandardMaterial color={extBarColor} metalness={extBarMetalness} roughness={0.3} />
      </mesh>

      {/* PLACA COM LOGÓTIPO — pequena, sobre a barra preta do exterior, no canto direito */}
      {logoTexture &&
        (() => {
          const logoW = 0.12
          const logoH = logoW / logoAspect
          const logoOnScreenLeft = serviceDoor3D && serviceDoorPosition === 'right'
          const logoX = logoOnScreenLeft ? width / 2 - logoW / 2 - 0.06 : -width / 2 + logoW / 2 + 0.06
          return (
            <mesh position={[logoX, -height / 2 + 0.025, -0.04]} rotation={[0, Math.PI, 0]}>
              <planeGeometry args={[logoW, logoH]} />
              <meshBasicMaterial map={logoTexture} transparent />
            </mesh>
          )
        })()}

      {/* MOLA DE TORÇÃO — veio horizontal ao longo da padieira com espiral, elemento fixo do lado
          interior. Do lado exterior só aparece exposta quando não há padieira nenhuma (real ou
          falsa) a tapá-la — com Padieira disponível ou Padieira falsa, fica escondida atrás dela,
          tal como na instalação real; a vista interior continua sempre a mostrar o mecanismo. */}
      {(showInterior || (padding <= 0 && header === 'Nenhum')) && (
      <group position={[0, height / 2 + 0.15, 0.15]}>
        {/* Veio horizontal */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.018, 0.018, width * 0.9, 16]} />
          <meshStandardMaterial color="#8b929a" metalness={0.75} roughness={0.3} />
        </mesh>
        {/* Duas espirais mais pequenas, uma de cada lado do veio */}
        {([-1, 1] as const).map((side) =>
          Array.from({ length: 14 }).map((_, i) => (
            <mesh
              key={`coil-${side}-${i}`}
              position={[side * (width * 0.12 + i * ((width * 0.14) / 13)), 0, 0]}
              rotation={[0, Math.PI / 2, 0]}
            >
              <torusGeometry args={[0.04, 0.011, 8, 16]} />
              <meshStandardMaterial color="#1c1f21" metalness={0.4} roughness={0.55} />
            </mesh>
          ))
        )}
        {/* Suportes de fixação nas pontas do veio */}
        {([-1, 1] as const).map((side) => (
          <mesh key={`bracket-${side}`} position={[side * width * 0.42, -0.02, 0]}>
            <boxGeometry args={[0.03, 0.08, 0.05]} />
            <meshStandardMaterial color="#3a3f42" metalness={0.5} roughness={0.5} />
          </mesh>
        ))}
      </group>
      )}

      {/* FERRAGEM ELEVADA / INCLINADA — carris de tração montados acima do vão, do lado interior (tal
          como o Omega). Têm de acompanhar sempre o topo real da padieira, não uma distância fixa ao
          topo da porta — senão, com padieiras altas, ficam a flutuar a meio da parede em vez de lá em cima. */}
      {(hasFerragemElevada || hasFerragemInclinada) && (() => {
        const wallPad = Math.max(0.18, padding)
        const padieiraTopY = height / 2 + wallPad * 1.3
        return (
          <group
            position={[0, padieiraTopY - (hasFerragemElevada ? 0.08 : 0.16), 0.05]}
            rotation={[hasFerragemInclinada ? -0.12 : 0, 0, 0]}
          >
            {([-1, 1] as number[]).map((side) => (
              <mesh key={`rail-${side}`} position={[side * (width / 2 - 0.12), 0, 0.55]}>
                <boxGeometry args={[0.05, 0.05, 1.1]} />
                <meshStandardMaterial color="#5a646a" metalness={0.7} roughness={0.35} />
              </mesh>
            ))}
          </group>
        )
      })()}
    </group>
  )
}

function Scene(props: DoorProps) {
  const { width, height, padding = 0.2, leftShade = 0.2, rightShade = 0.2, view = 'front', showInterior = false } = props
  const controlsRef = useRef<any>(null)
  const [facingInterior, setFacingInterior] = useState(showInterior)

  useEffect(() => {
    setFacingInterior(showInterior)
  }, [showInterior])

  // Deteta em tempo real de que lado a câmara está (não só quando se clica no botão),
  // para arrastar/rodar manualmente também revelar o interior corretamente.
  const handleControlsChange = () => {
    if (controlsRef.current) {
      setFacingInterior(controlsRef.current.object.position.z > 0)
    }
  }

  const wallPad = Math.max(0.18, padding)
  const wallLeft = Math.max(0.18, leftShade)
  const wallRight = Math.max(0.18, rightShade)

  // Extensão vertical real da cena: do pavimento até ao topo da padieira. Serve de base ao
  // enquadramento da câmara em vez de um valor simétrico à volta do centro da porta — a padieira
  // só acrescenta espaço por CIMA da porta, sem equivalente por baixo (o chão fica rente à base),
  // por isso o alvo da câmara tem de subir com a padieira para a porta não ficar "encostada" ao
  // topo da vista, com espaço vazio a mais por baixo e a parecer cortada.
  const floorY = -height / 2 - 0.02
  const contentTopY = height / 2 + wallPad * 1.3
  const contentCenterY = (contentTopY + floorY) / 2

  // A câmara e os controlos remontam de raiz sempre que view/showInterior mudam (via key),
  // para nunca haver estado interno antigo do OrbitControls a lutar contra a posição pedida.
  // A distância tem em conta o aspect ratio real do canvas: em ecrãs estreitos (telemóvel,
  // onde a caixa 3D é mais alta que larga) o FOV horizontal é menor, por isso é preciso
  // afastar mais a câmara para a porta continuar a caber toda à vista (sem cortar as laterais).
  const { size } = useThree()
  const aspect = size.width / Math.max(1, size.height)
  const fov = 35
  const vFovRad = (fov * Math.PI) / 180
  const visibleW = width + 2 * Math.max(wallLeft, wallRight) * 1.6
  const visibleH = contentTopY - floorY
  const distForHeight = visibleH / 2 / Math.tan(vFovRad / 2)
  const hFovRad = 2 * Math.atan(Math.tan(vFovRad / 2) * aspect)
  const distForWidth = visibleW / 2 / Math.tan(hFovRad / 2)
  const fitRadius = Math.max(distForHeight, distForWidth) * 1.12
  const radius = Math.max(fitRadius, Math.max(width, height) * 1.3)
  const camX = view === 'front' ? 0 : width * 0.32
  const camZ = showInterior ? radius : -radius
  const camY = contentCenterY + (view === 'front' ? 0 : height * 0.35)
  const sceneKey = `${view}-${showInterior}`

  // Trava a órbita para nunca deixar a câmara descer abaixo do nível do pavimento
  // (senão dava para "ver por baixo" do chão). O alvo está em y=contentCenterY, o chão em floorY;
  // usa-se a distância máxima possível (pior caso do zoom) para a trava ser válida a qualquer zoom.
  const maxOrbitDistance = Math.max(width * 3.4, radius * 1.3)
  const maxPolarAngle = Math.acos(
    Math.max(-0.999, Math.min(0.999, (floorY - contentCenterY) / maxOrbitDistance))
  )

  // Paredes laterais — o topo mantém a mesma extensão de sempre acima da padieira,
  // mas a base é travada exatamente no nível do pavimento (floorY), nunca abaixo dele
  const wallTopY = height / 2 + wallPad * 1.1
  const wallBottomY = floorY
  const wallHeight = wallTopY - wallBottomY
  const wallCenterY = (wallTopY + wallBottomY) / 2

  return (
    <>
      <PerspectiveCamera
        key={`cam-${sceneKey}`}
        makeDefault
        position={[showInterior ? -camX : camX, camY, camZ]}
        fov={fov}
      />
      <OrbitControls
        key={`ctrl-${sceneKey}`}
        ref={controlsRef}
        autoRotate={false}
        enableZoom
        enablePan={false}
        onChange={handleControlsChange}
        target={[0, contentCenterY, 0]}
        maxDistance={maxOrbitDistance}
        minDistance={width * 0.75}
        maxPolarAngle={maxPolarAngle}
      />

      <Environment preset="studio" />

      {/* Iluminação de Estúdio Arquitetónico */}
      <ambientLight intensity={0.7} />
      <directionalLight
        castShadow
        position={[width * 0.8, height * 1.4, width * 1.5]}
        intensity={2.0}
        color="#fffdf5"
      />
      <directionalLight
        position={[-width * 0.9, height * 0.6, width * 0.8]}
        intensity={0.75}
        color="#dff0ff"
      />
      <pointLight position={[0, height * 0.4, width * 0.9]} intensity={0.3} color="#ffffff" />
      {/* Luz de preenchimento pelo lado de trás, para a vista de interior não ficar escura */}
      <directionalLight position={[0, height * 0.5, -width * 1.1]} intensity={1.3} color="#f3f5f7" />

      {/* Paredes — o topo estende-se acima da padieira, mas a base pára exatamente no pavimento
          (nunca abaixo dele, senão fica visível "a espreitar" por baixo do chão em ângulos baixos).
          Só aparecem quando a medida correspondente (ombreira/padieira) é maior que 0 — a 0 não
          há parede a representar, por isso desaparece em vez de mostrar uma faixa mínima. */}
      {leftShade > 0 && (
        <mesh position={[-width / 2 - wallLeft * 0.8, wallCenterY, -0.06]} receiveShadow>
          <boxGeometry args={[wallLeft * 1.6, wallHeight, 0.12]} />
          <meshStandardMaterial color="#8e9a9f" roughness={0.85} />
        </mesh>
      )}

      {/* Parede Direita */}
      {rightShade > 0 && (
        <mesh position={[width / 2 + wallRight * 0.8, wallCenterY, -0.06]} receiveShadow>
          <boxGeometry args={[wallRight * 1.6, wallHeight, 0.12]} />
          <meshStandardMaterial color="#8e9a9f" roughness={0.85} />
        </mesh>
      )}

      {/* Padieira Superior */}
      {padding > 0 && (
        <mesh position={[0, height / 2 + wallPad * 0.65, -0.06]} receiveShadow>
          <boxGeometry args={[width + 0.04, wallPad * 1.3, 0.12]} />
          <meshStandardMaterial color="#97a3a8" roughness={0.85} />
        </mesh>
      )}

      {/* Pavimento da Garagem */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -height / 2 - 0.02, 0.2]} receiveShadow>
        <planeGeometry args={[width * 3.2, 2.5]} />
        <meshStandardMaterial color="#404c54" roughness={0.8} />
      </mesh>

      {/* Modelo do Portão Seccionado */}
      <DoorModel {...props} showInterior={facingInterior} />

      <ContactShadows
        position={[0, -height / 2 - 0.018, 0.08]}
        opacity={0.5}
        scale={width * 2.1}
        blur={2.2}
        far={height * 1.2}
      />
    </>
  )
}

export function Door3D(props: DoorProps) {
  return (
        <div className="relative h-full w-full overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_50%_25%,#53636b_0%,#263339_48%,#141d21_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,.16),0_24px_60px_rgba(13,27,32,.28)]">
      <Canvas
        shadows
        camera={{
          position: [0, 0, Math.max(props.width, props.height) * 1.45],
          fov: 36,
          near: 0.01,
          far: 100,
        }}
      >
        <Scene {...props} />
      </Canvas>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div className="absolute bottom-4 rounded-full bg-black/40 px-3 py-1.5 text-center text-[10px] text-white/80 backdrop-blur-md">
          Arraste para rodar · scroll para aproximar
        </div>
      </div>

      <div className="pointer-events-none absolute left-5 top-5 flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/85 backdrop-blur-md">
        <span className="size-2 rounded-full bg-[#16a34a] animate-pulse" />
        Renderização 3D · Tempo Real
      </div>
    </div>
  )
}
