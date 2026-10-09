import { X } from 'lucide-react'

export default function Modal({ open, title, children, onClose }) {
  if (!open) return null
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm" onMouseDown={onClose}><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><div className="mb-5 flex items-center justify-between"><h2 className="font-display text-xl font-bold text-ink">{title}</h2><button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-ink" onClick={onClose} aria-label="Close"><X size={20} /></button></div>{children}</div></div>
}
