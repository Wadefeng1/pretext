type Family = 'dune' | 'meander' | 'shoal' | 'gust'

type Candidate = {
  id: number
  family: Family
  title: string
}

type CardLayout = {
  x: number
  y: number
  width: number
  height: number
}

const candidates: Candidate[] = [
  { id: 11, family: 'dune', title: 'Slip' },
  { id: 19, family: 'meander', title: 'Bloom' },
  { id: 23, family: 'shoal', title: 'Notch' },
  { id: 31, family: 'gust', title: 'Drift' },
  { id: 37, family: 'dune', title: 'Shelf' },
  { id: 43, family: 'meander', title: 'Knot' },
  { id: 47, family: 'shoal', title: 'Fold' },
  { id: 53, family: 'gust', title: 'Wake' },
  { id: 59, family: 'dune', title: 'Basin' },
  { id: 61, family: 'meander', title: 'Veil' },
  { id: 67, family: 'shoal', title: 'Hollow' },
  { id: 71, family: 'gust', title: 'Sweep' },
]

const domCache = {
  app: document.getElementById('app') as HTMLDivElement,
  stage: document.getElementById('stage') as HTMLDivElement,
  status: document.getElementById('status') as HTMLDivElement,
  cards: [] as Array<{
    card: HTMLDivElement
    svg: HTMLDivElement
    family: HTMLSpanElement
    title: HTMLSpanElement
    metaLeft: HTMLSpanElement
    metaRight: HTMLSpanElement
  }>,
}

let scheduledRender = false

function scheduleRender(): void {
  if (scheduledRender) return
  scheduledRender = true
  requestAnimationFrame(function renderBlobField() {
    scheduledRender = false
    render()
  })
}

window.addEventListener('resize', () => scheduleRender())

function hash(n: number): number {
  n = Math.imul((n >>> 16) ^ n, 0x21f0aaad)
  n = Math.imul((n >>> 15) ^ n, 0x735a2d97)
  return (((n >>> 15) ^ n) >>> 0) / 0x100000000
}

function hash2(a: number, b: number): number {
  return hash((a + Math.imul(b, 0x9e3779b9)) | 0)
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function ensureCard(index: number) {
  let entry = domCache.cards[index]
  if (entry !== undefined) return entry

  const card = document.createElement('div')
  card.className = 'card'

  const label = document.createElement('div')
  label.className = 'card-label'
  const family = document.createElement('span')
  family.className = 'card-family'
  const title = document.createElement('span')
  title.className = 'card-title'
  label.append(family, title)

  const svg = document.createElement('div')
  svg.className = 'card-svg'

  const meta = document.createElement('div')
  meta.className = 'card-meta'
  const metaLeft = document.createElement('span')
  const metaRight = document.createElement('span')
  meta.append(metaLeft, metaRight)

  card.append(label, svg, meta)
  domCache.stage.appendChild(card)

  entry = { card, svg, family, title, metaLeft, metaRight }
  domCache.cards[index] = entry
  return entry
}

function computeCardLayouts(stageWidth: number): { layouts: CardLayout[], stageHeight: number, cols: number } {
  const cols =
    stageWidth >= 1280 ? 4
    : stageWidth >= 920 ? 3
    : stageWidth >= 620 ? 2
    : 1

  const gap = cols === 1 ? 18 : 22
  const outer = cols === 1 ? 18 : 24
  const cardWidth = Math.floor((stageWidth - outer * 2 - gap * (cols - 1)) / cols)
  const cardHeight = Math.round(cardWidth * 0.88)
  const layouts: CardLayout[] = []

  for (let i = 0; i < candidates.length; i++) {
    const row = Math.floor(i / cols)
    const col = i % cols
    layouts.push({
      x: outer + col * (cardWidth + gap),
      y: outer + row * (cardHeight + gap),
      width: cardWidth,
      height: cardHeight,
    })
  }

  const rows = Math.ceil(candidates.length / cols)
  return {
    layouts,
    stageHeight: outer * 2 + rows * cardHeight + Math.max(0, rows - 1) * gap + 76,
    cols,
  }
}

function familyLabel(family: Family): string {
  switch (family) {
    case 'dune': return 'dune'
    case 'meander': return 'meander'
    case 'shoal': return 'shoal'
    case 'gust': return 'gust'
  }
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t)
}

function flowPoint(
  candidate: Candidate,
  t: number,
  sizeX: number,
  sizeY: number,
  viewportWidth: number,
  viewportHeight: number,
): { x: number, y: number, halfWidth: number } {
  const seed = candidate.id
  const phase = hash2(seed, 31) * Math.PI * 2
  const aspect = viewportWidth / Math.max(1, viewportHeight)
  const viewportWarp = Math.sin(viewportWidth * 0.0017 + seed * 0.03) * 0.5 + Math.cos(viewportHeight * 0.0011 - seed * 0.04) * 0.5
  const startX = sizeX * (0.18 + hash2(seed, 71) * 0.08)
  const endX = sizeX * (0.78 + hash2(seed, 73) * 0.06)
  const startY = sizeY * (0.26 + hash2(seed, 79) * 0.12)
  const endY = sizeY * (0.76 - hash2(seed, 83) * 0.12)
  const u = smoothstep(t)
  const swell = smoothstep(clamp((t - 0.1) / 0.9, 0, 1))

  let bendX = 0
  let bendY = 0
  let thin = 0
  let thick = 0
  let bulge = 0

  switch (candidate.family) {
    case 'dune':
      bendX = Math.sin(t * Math.PI * 1.2 + phase) * sizeX * (0.13 + 0.02 * viewportWarp)
      bendY = Math.sin(t * Math.PI * 0.9 + phase * 0.5) * sizeY * 0.05
      thin = sizeY * 0.06
      thick = sizeY * (0.18 + 0.02 * Math.sin(aspect + seed * 0.02))
      bulge = Math.exp(-Math.pow((t - 0.7) / 0.22, 2)) * sizeY * 0.035
      break
    case 'meander':
      bendX =
        Math.sin(t * Math.PI * 1.5 + phase) * sizeX * 0.11 +
        Math.sin(t * Math.PI * 2.5 + phase * 0.6) * sizeX * 0.04
      bendY = Math.cos(t * Math.PI * 1.2 + phase * 0.4) * sizeY * 0.08
      thin = sizeY * 0.05
      thick = sizeY * 0.16
      bulge = Math.exp(-Math.pow((t - 0.62) / 0.28, 2)) * sizeY * 0.045
      break
    case 'shoal':
      bendX = Math.sin(t * Math.PI * 1.1 + phase) * sizeX * 0.09
      bendY = Math.cos(t * Math.PI * 1.9 + phase * 0.5) * sizeY * 0.06
      thin = sizeY * 0.04
      thick = sizeY * 0.15
      bulge =
        Math.exp(-Math.pow((t - 0.48) / 0.18, 2)) * sizeY * 0.05 +
        Math.exp(-Math.pow((t - 0.76) / 0.14, 2)) * sizeY * 0.02
      break
    case 'gust':
      bendX =
        Math.sin(t * Math.PI * 1.3 + phase) * sizeX * 0.12 +
        Math.cos(t * Math.PI * 2.1 + phase * 0.8) * sizeX * 0.03
      bendY = Math.sin(t * Math.PI * 0.8 + phase * 0.3) * sizeY * 0.07
      thin = sizeY * 0.035
      thick = sizeY * 0.14
      bulge = Math.exp(-Math.pow((t - 0.82) / 0.2, 2)) * sizeY * 0.055
      break
  }

  return {
    x: startX + (endX - startX) * u + bendX,
    y: startY + (endY - startY) * u + bendY,
    halfWidth: thin + (thick - thin) * swell + bulge,
  }
}

function buildBlobSvg(
  candidate: Candidate,
  width: number,
  height: number,
  viewportWidth: number,
  viewportHeight: number,
): string {
  const left: string[] = []
  const right: string[] = []
  const steps = 36

  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const point = flowPoint(candidate, t, width, height, viewportWidth, viewportHeight)
    const prev = flowPoint(candidate, Math.max(0, t - 0.015), width, height, viewportWidth, viewportHeight)
    const next = flowPoint(candidate, Math.min(1, t + 0.015), width, height, viewportWidth, viewportHeight)
    const dx = next.x - prev.x
    const dy = next.y - prev.y
    const length = Math.hypot(dx, dy) || 1
    const nx = -dy / length
    const ny = dx / length

    left.push(`${(point.x + nx * point.halfWidth).toFixed(2)},${(point.y + ny * point.halfWidth).toFixed(2)}`)
    right.push(`${(point.x - nx * point.halfWidth).toFixed(2)},${(point.y - ny * point.halfWidth).toFixed(2)}`)
  }

  const polygon = left.concat(right.reverse()).join(' ')

  return `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <polygon points="${polygon}" fill="#050505" />
    </svg>
  `
}

function render(): void {
  const viewportWidth = document.documentElement.clientWidth
  const viewportHeight = document.documentElement.clientHeight
  const stageWidth = domCache.app.getBoundingClientRect().width
  const { layouts, stageHeight, cols } = computeCardLayouts(stageWidth)

  domCache.stage.style.height = `${stageHeight}px`

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i]!
    const layout = layouts[i]!
    const card = ensureCard(i)
    const artWidth = layout.width - 24
    const artHeight = layout.height - 74

    card.card.style.left = `${layout.x}px`
    card.card.style.top = `${layout.y}px`
    card.card.style.width = `${layout.width}px`
    card.card.style.height = `${layout.height}px`

    card.family.textContent = familyLabel(candidate.family)
    card.title.textContent = candidate.title
    card.metaLeft.textContent = `seed ${candidate.id}`
    card.metaRight.textContent = `${artWidth}×${artHeight}`
    card.svg.innerHTML = buildBlobSvg(candidate, artWidth, artHeight, viewportWidth, viewportHeight)
    card.svg.style.left = '12px'
    card.svg.style.top = '18px'
    card.svg.style.right = '12px'
    card.svg.style.bottom = '38px'
  }

  domCache.status.textContent =
    `12 candidates • ${cols} columns • viewport ${viewportWidth}×${viewportHeight} • every vertex is a pure function of viewport size, family, and seed`
}

scheduleRender()
