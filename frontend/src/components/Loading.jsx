export default function Loading({ label = 'Loading...', fullScreen = false }) {
  return <div className={`flex items-center justify-center gap-3 text-sm font-semibold text-slate-500 ${fullScreen ? 'min-h-screen' : 'py-12'}`}><span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-mint" />{label}</div>
}
