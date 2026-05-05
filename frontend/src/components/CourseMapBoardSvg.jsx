import { useId, useMemo } from 'react'

/**
 * Fond et tracé de parcours en SVG (viewBox 160×90 = même repère que les % 16∶9).
 */
export default function CourseMapBoardSvg({ pathPoints }) {
  const rawId = useId()
  const uid = useMemo(() => rawId.replace(/[^a-zA-Z0-9]/g, ''), [rawId])
  const mapBgGrad = `mapBgGrad-${uid}`
  const mapGlowPurple = `mapGlowPurple-${uid}`
  const routeGrad = `routeGrad-${uid}`
  const routeGlow = `routeGlow-${uid}`

  const poly =
    pathPoints?.length >= 2
      ? pathPoints.map((p) => `${(160 * p.x) / 100},${(90 * p.y) / 100}`).join(' ')
      : ''

  return (
    <svg
      className="course-map__svg"
      viewBox="0 0 160 90"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={mapBgGrad} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#060b18" />
          <stop offset="38%" stopColor="#121e42" />
          <stop offset="100%" stopColor="#1e3a6e" />
        </linearGradient>
        <radialGradient id={mapGlowPurple} cx="75%" cy="22%" r="62%">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.45" />
          <stop offset="45%" stopColor="#4f46e5" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={routeGrad} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="42%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#f472b6" />
        </linearGradient>
        <filter id={routeGlow} x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="1.35" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width="160" height="90" fill={`url(#${mapBgGrad})`} rx="4" ry="4" />
      <rect width="160" height="90" fill={`url(#${mapGlowPurple})`} opacity="1" />

      {/* Grille RPG légère */}
      <g opacity="0.12" stroke="#94a3b8" strokeWidth="0.12" fill="none">
        {Array.from({ length: 17 }, (_, i) => (
          <line key={`v-${i}`} x1={i * 10} y1={0} x2={i * 10} y2={90} />
        ))}
        {Array.from({ length: 10 }, (_, i) => (
          <line key={`h-${i}`} x1={0} y1={i * 10} x2={160} y2={i * 10} />
        ))}
      </g>

      <path
        d="M -4 84 Q 48 76 94 62 T 166 48"
        fill="none"
        stroke="#6366f1"
        strokeWidth="0.45"
        strokeOpacity="0.35"
      />
      <path
        d="M -4 14 Q 44 34 108 54 T 166 74"
        fill="none"
        stroke="#0ea5e9"
        strokeWidth="0.4"
        strokeOpacity="0.28"
      />

      {poly ? (
        <>
          <polyline
            points={poly}
            fill="none"
            stroke="#0f172a"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.55"
            vectorEffect="non-scaling-stroke"
          />
          <polyline
            className="course-map__route"
            points={poly}
            fill="none"
            stroke={`url(#${routeGrad})`}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4 3.2"
            opacity="0.92"
            vectorEffect="non-scaling-stroke"
            filter={`url(#${routeGlow})`}
          />
        </>
      ) : null}

      {/* Vignette lisibilité */}
      <rect width="160" height="90" fill="none" stroke="#020617" strokeWidth="2.2" rx="4" ry="4" opacity="0.65" />
    </svg>
  )
}
