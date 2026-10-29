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
  "Should schools ban phones during lessons?",
  "Should the voting age be lowered to sixteen?",
  "Should AI be allowed to grade student essays?",
  "Should the government cap rent increases?",
  "Should school days start later for teenagers?",
  "Is remote work better for junior employees?",
  "Should the city fund free bus travel for students?",
  "Should university education be free at the point of use?",
  "Should companies be allowed to use AI in hiring?",
  "Should schools teach financial literacy as a compulsory subject?",
  "Should social media platforms be liable for harmful content?",
  "Should we tax meat to fight climate change?",
  "Is space exploration worth the money?",
  "Should voting be compulsory?",
  "Should museums return looted artefacts?",
  "Should teenagers need parental consent to use social media?",
  "Is a universal basic income a good idea?",
  "Should cities make public transport free for everyone?",
  "Should athletes be allowed to compete after doping bans?",
  "Should schools replace exams with coursework?",
];
