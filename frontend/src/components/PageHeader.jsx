export default function PageHeader({ eyebrow, title, description, action }) {
  return <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow mb-3 text-[10px] font-extrabold uppercase text-coral">{eyebrow}</p><h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h1>{description && <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>}</div>{action}</div>
}
