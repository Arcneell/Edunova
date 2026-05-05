/**
 * Fond et tracé de parcours en SVG pour la carte (viewBox 160×90 = même repère que les % 16∶9).
 */
export default function CourseMapBoardSvg({ pathPoints }) {
  const poly =
    pathPoints?.length >= 2
      ? pathPoints.map((p) => `${(160 * p.x) / 100},${(90 * p.y) / 100}`).join(' ')
      : ''

  return (
    <svg
      className="course-map__svg"
      viewBox="0 0 160 90"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="mapBgGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0a1533" />
          <stop offset="45%" stopColor="#121e4a" />
          <stop offset="100%" stopColor="#152b5e" />
        </linearGradient>
        <linearGradient id="mapGlowPurple" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#1b17ff" stopOpacity="0.35" />
          <stop offset="50%" stopColor="#7242d0" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#ff007a" stopOpacity="0.18" />
        </linearGradient>
        <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1b17ff" />
          <stop offset="55%" stopColor="#7242d0" />
          <stop offset="100%" stopColor="#ff007a" />
        </linearGradient>
        <filter id="mapBlur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
      <rect width="160" height="90" fill="url(#mapBgGrad)" />
      <ellipse cx="118" cy="22" rx="56" ry="36" fill="url(#mapGlowPurple)" filter="url(#mapBlur)" opacity="0.9" />
      <ellipse cx="28" cy="72" rx="44" ry="38" fill="#1b17ff" opacity="0.12" />
      <path
        d="M -5 82 Q 52 74 92 62 T 168 52"
        fill="none"
        stroke="#7242d0"
        strokeWidth="0.35"
        strokeOpacity="0.25"
      />
      <path
        d="M -5 18 Q 48 32 112 58 T 168 70"
        fill="none"
        stroke="#1b17ff"
        strokeWidth="0.35"
        strokeOpacity="0.2"
      />
      {poly ? (
        <polyline
          className="course-map__route"
          points={poly}
          fill="none"
          stroke="url(#routeGrad)"
          strokeWidth="1.35"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="3.5 2.5"
          opacity="0.65"
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
    </svg>
  )
}
