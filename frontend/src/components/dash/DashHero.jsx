export function DashHero({ eyebrow, title, children }) {
  return (
    <header className="dash-hero">
      <div className="dash-hero__inner">
        {eyebrow ? <span className="dash-hero__eyebrow">{eyebrow}</span> : null}
        <h1 className="dash-hero__title">{title}</h1>
        {children ? <div className="dash-hero__lead">{children}</div> : null}
      </div>
      <div className="dash-hero__accent" aria-hidden />
    </header>
  )
}
