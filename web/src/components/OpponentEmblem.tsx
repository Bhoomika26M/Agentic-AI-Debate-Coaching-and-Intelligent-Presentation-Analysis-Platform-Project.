type PersonaKey = "strategist" | "skeptic" | "diplomat";

const common = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function StrategistMark() {
  return (
    <g>
      <path d="M32 8 L52 32 L32 56 L12 32 Z" {...common} />
      <path d="M20 42 L32 26 L44 42" {...common} />
      <path d="M32 26 V16" {...common} />
      <path d="M18 50 H46" {...common} opacity={0.55} />
      <circle cx={32} cy={26} r={2.8} fill="currentColor" stroke="none" />
    </g>
  );
}

function SkepticMark() {
  return (
    <g>
      <circle cx={25} cy={25} r={13.5} {...common} />
      <path d="M19.5 25.5 L23.8 29.8 L31.5 20.5" {...common} strokeWidth={2.6} />
      <path d="M35 35 L50 50" {...common} strokeWidth={2.6} />
      <path d="M48 10 V17 M44.5 13.5 H51.5" {...common} />
      <path d="M10 46 H17" {...common} opacity={0.55} />
    </g>
  );
}

function DiplomatMark() {
  return (
    <g>
      <path d="M12 15 H52" {...common} />
      <path d="M32 15 V51" {...common} opacity={0.55} />
      <path d="M12 23 C18 35 25 40 32 36" {...common} />
      <path d="M52 23 C46 35 39 40 32 36" {...common} />
      <path d="M23 51 H41" {...common} />
      <circle cx={32} cy={36} r={2.8} fill="currentColor" stroke="none" />
    </g>
  );
}

export function OpponentEmblem({ persona, label }: { persona: PersonaKey; label: string }) {
  return (
    <svg viewBox="0 0 64 64" className="emblem-mark" role="img" aria-label={label}>
      {persona === "strategist" ? <StrategistMark /> : persona === "skeptic" ? <SkepticMark /> : <DiplomatMark />}
    </svg>
  );
}
