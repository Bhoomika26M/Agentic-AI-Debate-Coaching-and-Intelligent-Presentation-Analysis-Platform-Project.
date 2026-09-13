export default function PlaceholderPage({ eyebrow, title, description, action }) {
  return (
    <section className="page-stack">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="lede">{description}</p>
      {action && <button className="button" type="button">{action}</button>}
    </section>
  )
}
