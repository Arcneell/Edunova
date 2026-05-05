export function DashPanel({ title, meta, children, footer }) {
  return (
    <div className="dash-panel">
      <div className="dash-panel__head">
        <h2 className="dash-panel__title">{title}</h2>
        {meta != null ? <span className="dash-panel__meta">{meta}</span> : null}
      </div>
      <div className="dash-panel__scroll">{children}</div>
      {footer ? <footer className="dash-pager">{footer}</footer> : null}
    </div>
  )
}
