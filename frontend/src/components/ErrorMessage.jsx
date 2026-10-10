import { AlertCircle } from 'lucide-react'

export default function ErrorMessage({ message = 'Unable to load this content.', onRetry }) {
  return <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"><AlertCircle size={18} className="mt-0.5 shrink-0" /><div className="flex-1"><p className="font-bold">{message}</p>{onRetry && <button type="button" className="mt-2 font-bold underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400" onClick={onRetry}>Try again</button>}</div></div>
}
