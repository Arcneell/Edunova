export function BrandBadge({ variant = 'purple', children }) {
  return <span className={`dash-badge dash-badge--${variant}`}>{children}</span>
}
