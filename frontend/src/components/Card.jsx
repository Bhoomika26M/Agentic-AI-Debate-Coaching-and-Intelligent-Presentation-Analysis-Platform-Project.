export default function Card({ children, className = '', ...props }) {
  return <section className={`premium-card rounded-3xl border border-white/90 bg-white/95 p-5 backdrop-blur-sm sm:p-6 ${className}`} {...props}>{children}</section>
}
