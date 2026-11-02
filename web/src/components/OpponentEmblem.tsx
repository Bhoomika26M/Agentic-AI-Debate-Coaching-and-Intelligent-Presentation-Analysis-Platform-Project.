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
      <path d="M32 10 V27 M32 27 L16 46 M32 27 L48 46 M16 46 H48" {...common} strokeWidth={3} />
      <circle cx={32} cy={12} r={5} fill="currentColor" stroke="none" />
      <circle cx={16} cy={48} r={5} fill="currentColor" stroke="none" />
      <circle cx={48} cy={48} r={5} fill="currentColor" stroke="none" />
      <circle cx={32} cy={27} r={5} fill="var(--paper-light)" stroke="currentColor" strokeWidth={3} />
    </g>
  );
}

function SkepticMark() {
  return (
    <g>
      <path d="M22 15 C22 9 27 6 33 6 C40 6 45 11 45 17 C45 23 41 26 35 30 C31 33 30 36 30 40" {...common} strokeWidth={4} />
      <circle cx={30} cy={51} r={3.5} fill="currentColor" stroke="none" />
      <path d="M45 39 L55 49 M48 36 L58 46" {...common} strokeWidth={3} />
    </g>
  );
}

function DiplomatMark() {
  return (
    <g>
      <path d="M8 14 H39 C43 14 46 17 46 21 V34 C46 38 43 41 39 41 H25 L15 49 V41 H15 C11 41 8 38 8 34 Z" {...common} strokeWidth={3} />
      <path d="M26 27 H55 C58 27 60 29 60 32 V44 C60 47 58 49 55 49 H49 L43 56 V49" {...common} strokeWidth={3} />
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
