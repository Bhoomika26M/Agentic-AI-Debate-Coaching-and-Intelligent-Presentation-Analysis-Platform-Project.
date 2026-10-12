export type PersonaKey = "strategist" | "skeptic" | "diplomat";
export type DifficultyKey = "warm-up" | "challenge" | "cross-examination";

export type OpponentPersona = {
  key: PersonaKey;
  name: string;
  title: string;
  line: string;
  color: "mint" | "coral" | "violet";
  style: string;
};

export const personas: OpponentPersona[] = [
  {
    key: "strategist",
    name: "The Strategist",
    title: "Reads the room",
    line: "Looks past the headline to the consequences underneath.",
    color: "mint",
    style: "LONG GAME",
  },
  {
    key: "skeptic",
    name: "The Skeptic",
    title: "Follows the proof",
    line: "Finds the assumption hiding between your points.",
    color: "coral",
    style: "EVIDENCE FIRST",
  },
  {
    key: "diplomat",
    name: "The Diplomat",
    title: "Sees every side",
    line: "Tests your case against the people it affects.",
    color: "violet",
    style: "WIDER LENS",
  },
];

export function personaFor(key: PersonaKey): OpponentPersona {
  return personas.find((person) => person.key === key) ?? personas[1];
}

export const difficultyOptions: { value: DifficultyKey; label: string; detail: string }[] = [
  { value: "warm-up", label: "Warm-up", detail: "Gentle pressure, patient replies" },
  { value: "challenge", label: "Challenge", detail: "Balanced pressure, real pushback" },
  { value: "cross-examination", label: "Cross-examination", detail: "Hardest questions, no easy exits" },
];

export function difficultyFor(value: DifficultyKey) {
  return difficultyOptions.find((option) => option.value === value) ?? difficultyOptions[1];
}

export const starterTopics = [
  "Should social platforms verify every user?",
  "Do grades measure what matters?",
  "Should cities ban cars from their centres?",
  "Is a four-day work week better for everyone?",
];
