export function DashPanel({ title, meta, actions, children, footer }) {
  return (
    <div className="dash-panel">
      <div className="dash-panel__head">
        <div className="dash-panel__head-text">
          <h2 className="dash-panel__title">{title}</h2>
          {meta != null ? <span className="dash-panel__meta">{meta}</span> : null}
        </div>
        {actions != null ? <div className="dash-panel__head-actions">{actions}</div> : null}
      </div>
      <div className="dash-panel__scroll">{children}</div>
      {footer ? <footer className="dash-pager">{footer}</footer> : null}
    </div>
  )
}
