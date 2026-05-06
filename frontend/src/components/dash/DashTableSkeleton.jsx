export function DashTableSkeleton({ rows = 4 }) {
  return (
    <div className="dash-skeleton" aria-busy="true" aria-label="Chargement">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="dash-skeleton__row" />
      ))}
    </div>
  )
}
