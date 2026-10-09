export default function Select({ label, options, error, ...props }) {
  return <label className="block space-y-2"><span className="text-sm font-bold text-ink">{label}</span><select className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-mint focus:ring-4 focus:ring-mint/10 ${error ? 'border-red-300' : 'border-slate-200'}`} {...props}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>{error && <span className="block text-xs font-semibold text-red-600">{error}</span>}</label>
}
