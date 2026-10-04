export function EmptyCueArt({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 96 72" className="cue-art" role="img" aria-label={label}>
      <rect x={8} y={6} width={80} height={60} fill="#fffaf0" stroke="#c8bda8" strokeWidth={1.5} />
      <rect x={8} y={6} width={26} height={8} fill="#ee4937" />
      <line x1={16} y1={28} x2={80} y2={28} stroke="#c8bda8" strokeWidth={1.5} />
      <line x1={16} y1={38} x2={64} y2={38} stroke="#c8bda8" strokeWidth={1.5} />
      <line x1={16} y1={48} x2={72} y2={48} stroke="#c8bda8" strokeWidth={1.5} />
      <line x1={16} y1={58} x2={24} y2={58} stroke="#d4b457" strokeWidth={2.5} />
    </svg>
  );
}

export function MicCueArt({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 96 72" className="cue-art" role="img" aria-label={label}>
      <rect x={38} y={8} width={20} height={30} rx={10} fill="none" stroke="currentColor" strokeWidth={2} />
      <path d="M28 32 Q28 52 48 52 Q68 52 68 32" fill="none" stroke="currentColor" strokeWidth={2} />
      <line x1={48} y1={52} x2={48} y2={62} stroke="currentColor" strokeWidth={2} />
      <line x1={38} y1={62} x2={58} y2={62} stroke="currentColor" strokeWidth={2} />
      <g stroke="#ee4937" strokeWidth={2.5} strokeLinecap="round">
        <line x1={14} y1={30} x2={14} y2={42} />
        <line x1={22} y1={26} x2={22} y2={46} />
        <line x1={74} y1={26} x2={74} y2={46} />
        <line x1={82} y1={30} x2={82} y2={42} />
      </g>
    </svg>
  );
}
