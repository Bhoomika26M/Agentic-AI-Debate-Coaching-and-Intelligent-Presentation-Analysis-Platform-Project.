export default function EmptyState({ icon: Icon, title, description, action }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center">{Icon && <Icon className="mx-auto mb-4 text-mint" size={28} />}<h3 className="font-display text-lg font-bold text-ink">{title}</h3><p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{description}</p>{action && <div className="mt-5">{action}</div>}</div>
}
