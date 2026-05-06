/**
 * Géométrie de la carte parcours — repère 0–100 % sur viewBox 320×180.
 * Tout est dérivé du code (sentier, biomes, étoiles), aucun asset.
 */

export const MAP_VIEWBOX = { width: 320, height: 180 }

/**
 * Sentier traversant 3 biomes (bas-gauche → haut-droite).
 * Le tracé est volontairement sinueux pour donner de la respiration au paysage.
 */
export const ROUTE_SPINE_PERCENT = [
  { x: 8, y: 88 },
  { x: 17, y: 82 },
  { x: 26, y: 86 },
  { x: 36, y: 74 },
  { x: 44, y: 64 },
  { x: 50, y: 56 },
  { x: 58, y: 60 },
  { x: 66, y: 48 },
  { x: 74, y: 38 },
  { x: 82, y: 26 },
  { x: 90, y: 14 },
]

/**
 * Biomes : tronçons colorés du parcours. `range` est la plage `t ∈ [0, 1]`
 * du sentier (abscisse curviligne). Sert à teinter les nœuds & le fond.
 */
export const BIOMES = [
  {
    id: 'plaines',
    label: 'Plaines',
    range: [0, 0.34],
    center: { x: 22, y: 80 },
    rx: 30,
    ry: 22,
    accent: '#16a34a',
    accentSoft: 'rgba(22, 163, 74, 0.18)',
  },
  {
    id: 'foret',
    label: 'Forêt',
    range: [0.34, 0.68],
    center: { x: 54, y: 54 },
    rx: 32,
    ry: 26,
    accent: '#7242d0',
    accentSoft: 'rgba(114, 66, 208, 0.20)',
  },
  {
    id: 'citadelle',
    label: 'Citadelle',
    range: [0.68, 1],
    center: { x: 86, y: 22 },
    rx: 26,
    ry: 22,
    accent: '#ff007a',
    accentSoft: 'rgba(255, 0, 122, 0.20)',
  },
]

function dist(a, b) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return Math.hypot(dx, dy)
}

function interpolate(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  }
}

/** Point sur la polyligne à abscisse curviligne normalisée t ∈ [0, 1]. */
export function pointOnSpine(spine, t) {
  if (!spine?.length) return { x: 50, y: 50 }
  if (spine.length === 1) return { ...spine[0] }
  const clamped = Math.max(0, Math.min(1, t))
  const segments = []
  let total = 0
  for (let i = 0; i < spine.length - 1; i++) {
    const len = dist(spine[i], spine[i + 1])
    segments.push({ from: spine[i], to: spine[i + 1], len })
    total += len
  }
  if (total === 0) return { ...spine[spine.length - 1] }
  let remaining = clamped * total
  for (const seg of segments) {
    if (remaining <= seg.len || seg === segments[segments.length - 1]) {
      const r = seg.len === 0 ? 0 : Math.min(1, remaining / seg.len)
      return interpolate(seg.from, seg.to, r)
    }
    remaining -= seg.len
  }
  return { ...spine[spine.length - 1] }
}

function nodeT(index, total) {
  if (total <= 1) return 0.5
  return index / (total - 1)
}

/** Style CSS d'un point en pourcentage du plateau. */
export function percentToCssPosition(p) {
  return { left: `${p.x}%`, top: `${p.y}%` }
}

/** Positions des étapes le long du sentier. */
export function layoutNodePercents(count) {
  const n = Math.max(0, count)
  const out = []
  for (let i = 0; i < n; i++) {
    out.push(pointOnSpine(ROUTE_SPINE_PERCENT, nodeT(i, n)))
  }
  return out
}

function checkpointActiveIndex(checkpoints) {
  if (!checkpoints.length) return -1
  const allDone = checkpoints.every((c) => c.status === 'completed')
  if (allDone) return checkpoints.length - 1
  const u = checkpoints.findIndex((c) => c.status === 'unlocked')
  if (u >= 0) return u
  return 0
}

/** Renvoie le biome correspondant à une abscisse curviligne t ∈ [0, 1]. */
export function biomeForT(t) {
  for (const b of BIOMES) {
    if (t >= b.range[0] && t <= b.range[1]) return b
  }
  return BIOMES[BIOMES.length - 1]
}

/**
 * Construit la mise en page complète : nœuds (avec biome + niveau), sentier,
 * index actif, compte de complétions.
 */
export function buildCourseMapLayout(checkpoints) {
  const list = [...(checkpoints ?? [])].sort(
    (a, b) => Number(a.map_order) - Number(b.map_order) || Number(a.course_id) - Number(b.course_id),
  )
  const total = list.length
  const percents = layoutNodePercents(total)
  const nodes = list.map((checkpoint, index) => {
    const t = nodeT(index, total)
    const biome = biomeForT(t)
    return {
      id: `course-${checkpoint.course_id}`,
      kind: 'course',
      checkpoint,
      status: checkpoint.status,
      level: index + 1,
      isFinal: index === total - 1,
      percent: percents[index],
      style: percentToCssPosition(percents[index]),
      biome,
      t,
    }
  })
  const activeIndex = checkpointActiveIndex(list)
  const completedCount = list.filter((c) => c.status === 'completed').length
  return {
    nodes,
    routePercents: percents,
    activeIndex,
    completedCount,
    totalCount: total,
  }
}

/** Tracé « complété » : du début jusqu'au nœud actif inclus. */
export function routePointsUpTo(routePercents, activeIndex) {
  if (!routePercents.length || activeIndex < 0) return []
  const end = Math.min(activeIndex, routePercents.length - 1)
  return routePercents.slice(0, end + 1)
}

/** Sentier brut, polyligne droite. */
export function percentsToPathD(points) {
  if (!points?.length) return ''
  const { width: w, height: h } = MAP_VIEWBOX
  const xy = points.map((p) => [(w * p.x) / 100, (h * p.y) / 100])
  let d = `M ${xy[0][0]} ${xy[0][1]}`
  for (let i = 1; i < xy.length; i++) {
    d += ` L ${xy[i][0]} ${xy[i][1]}`
  }
  return d
}

/** Sentier lissé (Catmull-Rom → Bézier cubique). */
export function percentsToSmoothPathD(points) {
  if (!points?.length) return ''
  const { width: w, height: h } = MAP_VIEWBOX
  const P = points.map((p) => [(w * p.x) / 100, (h * p.y) / 100])
  if (P.length === 1) return `M ${P[0][0]} ${P[0][1]}`
  if (P.length === 2) return percentsToPathD(points)

  let d = `M ${P[0][0]} ${P[0][1]}`
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)]
    const p1 = P[i]
    const p2 = P[i + 1]
    const p3 = P[Math.min(P.length - 1, i + 2)]
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2[0]} ${p2[1]}`
  }
  return d
}
