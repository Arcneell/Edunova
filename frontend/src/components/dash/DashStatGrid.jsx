export function DashStatGrid({ children, 'aria-label': ariaLabel = 'Indicateurs' }) {
  return (
    <section className="dash-stat-grid" aria-label={ariaLabel}>
      {children}
    </section>
  )
}
