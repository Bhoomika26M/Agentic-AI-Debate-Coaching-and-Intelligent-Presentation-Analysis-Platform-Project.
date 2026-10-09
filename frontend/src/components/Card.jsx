export default function Card({ children, className = '', ...props }) {
  return <section className={`premium-card rounded-2xl border border-slate-200/80 bg-white/95 p-5 backdrop-blur-sm ${className}`} {...props}>{children}</section>
}
