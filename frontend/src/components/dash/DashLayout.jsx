export function DashLayout({ children }) {
  return (
    <div className="dash-scope page">
      <div className="dash-scope__glow" aria-hidden />
      {children}
    </div>
  )
}
