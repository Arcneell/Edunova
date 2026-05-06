import { useId, useMemo } from 'react'
import {
  BIOMES,
  MAP_VIEWBOX,
  ROUTE_SPINE_PERCENT,
  percentsToSmoothPathD,
} from '../map/courseMapGeometry.js'
import { usePrefersDarkScheme } from '../hooks/usePrefersDarkScheme.js'

const PALETTE_LIGHT = {
  skyTop: '#dbeafe',
  skyMid: '#e0e7ff',
  skyBottom: '#fdf2f8',
  mountainFar: 'rgba(99, 102, 241, 0.18)',
  mountainNear: 'rgba(79, 70, 229, 0.28)',
  star: 'rgba(99, 102, 241, 0.55)',
  trackShadow: 'rgba(15, 23, 42, 0.18)',
  trackBase: '#cbd5e1',
  trackInner: '#f8fafc',
  trackTick: 'rgba(15, 23, 42, 0.18)',
  progress0: '#1b17ff',
  progress1: '#7242d0',
  progress2: '#ff007a',
  frame: 'rgba(114, 66, 208, 0.32)',
  biomeStroke: 'rgba(15, 23, 42, 0.08)',
  iconStroke: 'rgba(15, 23, 42, 0.55)',
  flag: '#ff007a',
  flagPole: '#0f172a',
}

const PALETTE_DARK = {
  skyTop: '#0b1023',
  skyMid: '#1c1238',
  skyBottom: '#3a0a2c',
  mountainFar: 'rgba(99, 102, 241, 0.22)',
  mountainNear: 'rgba(167, 139, 250, 0.28)',
  star: 'rgba(226, 232, 240, 0.78)',
  trackShadow: 'rgba(0, 0, 0, 0.55)',
  trackBase: '#475569',
  trackInner: '#94a3b8',
  trackTick: 'rgba(248, 250, 252, 0.35)',
  progress0: '#8a84ff',
  progress1: '#a07aee',
  progress2: '#ff4da6',
  frame: 'rgba(167, 139, 250, 0.42)',
  biomeStroke: 'rgba(248, 250, 252, 0.06)',
  iconStroke: 'rgba(226, 232, 240, 0.85)',
  flag: '#ff4da6',
  flagPole: '#f8fafc',
}

const STAR_COUNT = 60

function biomeIcon(biomeId) {
  // Petites icônes vectorielles, dessinées dans une boîte 12×12 centrée.
  switch (biomeId) {
    case 'plaines':
      return (
        <g>
          <path d="M -5 4 Q -2 -1 1 1 Q 4 -3 6 1" fill="none" strokeWidth="0.7" />
          <path d="M -2 4 L -2 1" strokeWidth="0.5" />
          <path d="M 3 4 L 3 0" strokeWidth="0.5" />
        </g>
      )
    case 'foret':
      return (
        <g>
          <path d="M 0 -5 L 4 1 L 2 1 L 5 5 L -5 5 L -2 1 L -4 1 Z" strokeWidth="0.6" />
        </g>
      )
    case 'citadelle':
      return (
        <g>
          <path
            d="M -5 5 L -5 -1 L -3 -1 L -3 -3 L -1 -3 L -1 -1 L 1 -1 L 1 -3 L 3 -3 L 3 -1 L 5 -1 L 5 5 Z"
            strokeWidth="0.6"
          />
          <path d="M 0 -3 L 0 -6" strokeWidth="0.5" />
          <path d="M 0 -6 L 3 -5 L 0 -4 Z" strokeWidth="0.5" />
        </g>
      )
    default:
      return null
  }
}

/**
 * Plateau immersif : ciel, montagnes lointaines, biomes colorés, sentier
 * sinueux à 3 couches, ticks réguliers et drapeau de fin.
 */
export default function CourseMapBoardSvg({ fullRoute = [], completedRoute = [] }) {
  const c = usePrefersDarkScheme() ? PALETTE_DARK : PALETTE_LIGHT
  const rawId = useId()
  const uid = useMemo(() => rawId.replace(/[^a-zA-Z0-9]/g, ''), [rawId])
  const gradSky = `mapSky-${uid}`
  const gradProg = `mapProg-${uid}`
  const glowProg = `mapGlow-${uid}`

  const fullD = useMemo(() => percentsToSmoothPathD(fullRoute), [fullRoute])
  const doneD = useMemo(() => percentsToSmoothPathD(completedRoute), [completedRoute])

  const { width: W, height: H } = MAP_VIEWBOX

  const stars = useMemo(() => {
    const out = []
    for (let i = 0; i < STAR_COUNT; i++) {
      const x = ((i * 71 + 17) % (W - 10)) + 5
      const y = ((i * 53 + 11) % (H * 0.55)) + 4
      const r = 0.28 + (i % 5) * 0.16
      const o = 0.25 + (i % 4) * 0.18
      out.push({ x, y, r, o })
    }
    return out
  }, [W, H])

  const lastSpine = ROUTE_SPINE_PERCENT[ROUTE_SPINE_PERCENT.length - 1]
  const flag = {
    x: (W * lastSpine.x) / 100,
    y: (H * lastSpine.y) / 100,
  }

  return (
    <svg
      className="course-map__svg"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradSky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.skyTop} />
          <stop offset="55%" stopColor={c.skyMid} />
          <stop offset="100%" stopColor={c.skyBottom} />
        </linearGradient>
        <linearGradient id={gradProg} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor={c.progress0} />
          <stop offset="50%" stopColor={c.progress1} />
          <stop offset="100%" stopColor={c.progress2} />
        </linearGradient>
        <filter id={glowProg} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Ciel */}
      <rect width={W} height={H} fill={`url(#${gradSky})`} />

      {/* Étoiles (haut du ciel) */}
      <g>
        {stars.map((s, i) => (
          <circle key={`st-${i}`} cx={s.x} cy={s.y} r={s.r} fill={c.star} opacity={s.o} />
        ))}
      </g>

      {/* Montagnes lointaines */}
      <g>
        <path
          d={`M 0 ${H * 0.62} L 30 ${H * 0.5} L 60 ${H * 0.58} L 95 ${H * 0.42} L 130 ${H * 0.55} L 170 ${H * 0.46} L 210 ${H * 0.6} L 255 ${H * 0.48} L 295 ${H * 0.58} L ${W} ${H * 0.5} L ${W} ${H} L 0 ${H} Z`}
          fill={c.mountainFar}
        />
        <path
          d={`M 0 ${H * 0.78} L 40 ${H * 0.68} L 80 ${H * 0.74} L 120 ${H * 0.62} L 160 ${H * 0.7} L 200 ${H * 0.64} L 240 ${H * 0.72} L 280 ${H * 0.66} L ${W} ${H * 0.74} L ${W} ${H} L 0 ${H} Z`}
          fill={c.mountainNear}
        />
      </g>

      {/* Biomes : halos colorés + icône au centre */}
      <g>
        {BIOMES.map((b) => {
          const cx = (W * b.center.x) / 100
          const cy = (H * b.center.y) / 100
          const rx = (W * b.rx) / 100
          const ry = (H * b.ry) / 100
          return (
            <g key={b.id}>
              <ellipse
                cx={cx}
                cy={cy}
                rx={rx}
                ry={ry}
                fill={b.accentSoft}
                stroke={c.biomeStroke}
                strokeWidth="0.4"
              />
              <ellipse
                cx={cx}
                cy={cy + ry * 0.55}
                rx={rx * 0.62}
                ry={ry * 0.18}
                fill={b.accentSoft}
                opacity="0.55"
              />
              <g
                transform={`translate(${cx} ${cy - ry * 0.25}) scale(1.4)`}
                fill={b.accent}
                stroke={c.iconStroke}
                opacity="0.85"
              >
                {biomeIcon(b.id)}
              </g>
            </g>
          )
        })}
      </g>

      {/* Sentier complet : ombre + base + liseré clair */}
      {fullRoute.length >= 2 && fullD ? (
        <g>
          <path
            d={fullD}
            fill="none"
            stroke={c.trackShadow}
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.55"
          />
          <path
            d={fullD}
            fill="none"
            stroke={c.trackBase}
            strokeWidth="4.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={fullD}
            fill="none"
            stroke={c.trackInner}
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />
          <path
            d={fullD}
            fill="none"
            stroke={c.trackTick}
            strokeWidth="3.6"
            strokeLinecap="butt"
            strokeDasharray="0.6 4.4"
            opacity="0.55"
          />
        </g>
      ) : null}

      {/* Progression : tracé en couleur de marque, avec halo */}
      {completedRoute.length >= 2 && doneD ? (
        <g filter={`url(#${glowProg})`}>
          <path
            d={doneD}
            fill="none"
            stroke={`url(#${gradProg})`}
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      ) : null}

      {/* Drapeau d'arrivée */}
      <g>
        <line
          x1={flag.x}
          y1={flag.y}
          x2={flag.x}
          y2={flag.y - 9}
          stroke={c.flagPole}
          strokeWidth="0.7"
          strokeLinecap="round"
        />
        <path
          d={`M ${flag.x} ${flag.y - 9} L ${flag.x + 6} ${flag.y - 7.5} L ${flag.x} ${flag.y - 6} Z`}
          fill={c.flag}
        />
        <circle cx={flag.x} cy={flag.y} r="1.1" fill={c.flagPole} />
      </g>

      {/* Cadre */}
      <rect
        width={W}
        height={H}
        rx="6"
        ry="6"
        fill="none"
        stroke={c.frame}
        strokeWidth="1.4"
      />
    </svg>
  )
}
