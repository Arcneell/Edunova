export function StatusPill({ variant = 'muted', children }) {
  return <span className={`dash-pill dash-pill--${variant}`}>{children}</span>
}
