export default function Button({ children, variant = 'primary', className = '', loading = false, type = 'button', ...props }) {
  const styles = {
    primary: 'bg-ink text-white hover:bg-[#173f5f] shadow-sm',
    secondary: 'bg-white text-ink ring-1 ring-slate-200 hover:bg-slate-50',
    coral: 'bg-coral text-white hover:bg-[#d85d40]',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-ink',
    danger: 'bg-red-50 text-red-700 hover:bg-red-100',
  }
  return <button type={type} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mint/25 disabled:cursor-not-allowed disabled:opacity-60 ${styles[variant]} ${className}`} disabled={loading || props.disabled} aria-busy={loading || undefined} {...props}>{loading ? 'Working...' : children}</button>
}
