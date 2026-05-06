export function StatCard({ variant = 'blue', label, value }) {
  return (
    <article className={`dash-stat dash-stat--${variant}`}>
      <span className="dash-stat__label">{label}</span>
      <strong className="dash-stat__value">{value}</strong>
    </article>
  )
}
