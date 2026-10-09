import { AIModelDefinition, DebateTurn, FallacyMatch, CounterargumentOption, WeightedDebateScore, PresentationMetrics } from './types';

export const AI_MODELS: AIModelDefinition[] = [
  {
    id: 'smart-simulator',
    name: 'VerbalArena Smart Simulator (Built-in)',
    provider: 'Local Smart Simulator',
    description: 'Instant multi-agent engine designed for zero-latency testing, debate scoring, and offline practice without API keys.',
    badge: 'Offline / Instant',
    isSimulator: true,
    capabilities: ['Real-time POI', 'Fast Evaluation', 'Zero Dependency'],
    recommendedFor: 'Instant offline practice & local demo'
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Google Gemini 2.0 Flash',
    provider: 'Google',
    description: 'High-speed multimodal reasoning model specializing in speech prosody analysis, fast counter-arguments, and structural breakdowns.',
    badge: 'Fast & Multimodal',
    capabilities: ['Speech Analysis', 'Structured Rubrics', 'Fast Turnaround'],
    recommendedFor: 'Presentation analysis & fast debate rounds'
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Google Gemini 1.5 Pro',
    provider: 'Google',
    description: 'Long-context reasoning model ideal for complex Policy debates and multi-document presentation evaluations.',
    badge: '1M Context',
    capabilities: ['Policy Analysis', 'Evidence Deep-Dive', 'Multi-document Cross-Exam'],
    recommendedFor: 'Policy debates & document-heavy presentations'
  },
  {
    id: 'gpt-4o',
    name: 'OpenAI GPT-4o',
    provider: 'OpenAI',
    description: 'Flagship conversational intelligence with high rhetorical agility, sharp cross-examinations, and intuitive coaching advice.',
    badge: 'Persuasive Orator',
    capabilities: ['Strategic Rebuttal', 'Cross-Examination', 'Ethos/Pathos Balance'],
    recommendedFor: '1v1 Oxford & Parliamentary Debates'
  },
  {
    id: 'claude-3.5-sonnet',
    name: 'Anthropic Claude 3.5 Sonnet',
    provider: 'Anthropic',
    description: 'Superior argument structure analysis, subtle logical fallacy detection, and highly articulate counter-framing.',
    badge: 'Argument Analyst',
    capabilities: ['Fallacy Spotting', 'Socratic Questions', 'Sophisticated Style'],
    recommendedFor: 'Fallacy detection & nuanced coaching'
  },
  {
    id: 'deepseek-r1',
    name: 'DeepSeek R1 Reasoning',
    provider: 'DeepSeek',
    description: 'Deep chain-of-thought reasoning engine that scrutinizes premise validity, unstated assumptions, and causal links.',
    badge: 'Deep Logic',
    capabilities: ['Reasoning Chain Verification', 'Premise Audit', 'Strict Scoring'],
    recommendedFor: 'Logical consistency & premise validation'
  },
  {
    id: 'llama-3.3-70b',
    name: 'Meta Llama 3.3 70B',
    provider: 'Meta',
    description: 'Open weights flagship model tuned for rapid debate turns, structured rebuttal trees, and unbiased scoring.',
    badge: 'Open Agent',
    capabilities: ['Debate Trees', 'Unbiased Judging', 'Fast Inference'],
    recommendedFor: 'Open-source simulation & customized benchmarking'
  }
];

export function getApiKey(modelProvider: string): string {
  if (typeof window === 'undefined') return '';
  const keysJson = localStorage.getItem('verbal_arena_api_keys');
  if (!keysJson) return '';
  try {
    const keys = JSON.parse(keysJson);
    return keys[modelProvider.toLowerCase()] || '';
  } catch (e) {
    return '';
  }
}

export function saveApiKey(provider: string, key: string) {
  if (typeof window === 'undefined') return;
  const keysJson = localStorage.getItem('verbal_arena_api_keys') || '{}';
  try {
    const keys = JSON.parse(keysJson);
    keys[provider.toLowerCase()] = key;
    localStorage.setItem('verbal_arena_api_keys', JSON.stringify(keys));
  } catch (e) {
    console.error('Failed to save API key', e);
  }
}

export async function generateSimulatedDebateResponse(
  topic: string,
  userPosition: 'Affirmative' | 'Negative',
  history: DebateTurn[],
  modelId: string
): Promise<string> {
  const aiPosition = userPosition === 'Affirmative' ? 'Negative' : 'Affirmative';
  const modelName = AI_MODELS.find(m => m.id === modelId)?.name || 'AI Opponent';

  const affirmativeTemplates = [
    `As the Affirmative, I contend that "${topic}" is fundamentally necessary for modern societal progress. First, empirical data demonstrates that current paradigms suffer from key structural inefficiencies. Second, failing to adopt this approach creates escalating long-term costs. While my opponent may raise concerns regarding implementation friction, the net-benefit ratio overwhelmingly favors decisive action.`,
    `Standing in strong support of the motion, we must address the root causes rather than temporary symptoms. Implementing this policy provides three clear benefits: (1) elevated systemic stability, (2) equitable resource distribution, and (3) a future-proof foundation. The Opposition's stance relies on status-quo bias, which history shows is untenable in times of structural shift.`,
    `Let us examine the core contention of this debate. The affirmative case rests on a simple moral and practical imperative: when the cost of inaction exceeds the risk of reform, change is obligatory. We have shown that current mechanisms fail to deliver consistency. Our proposal introduces targeted oversight and measurable key metrics.`
  ];

  const negativeTemplates = [
    `Responded firmly on behalf of the Opposition, we must reject the motion on "${topic}". My opponent's case relies on an over-optimistic projection that ignores practical constraints. First, the capital and operational overhead far outweighs the claimed returns. Second, this policy risks unintended consequences that would worsen the very problem it seeks to resolve. We advocate for targeted, incremental solutions instead.`,
    `The Affirmative has presented a compelling narrative, but narrative is not evidence. Upon closer inspection, their arguments commit a classic Straw Man by mischaracterizing the current status quo. Furthermore, they fail to demonstrate solvency—how exactly will their proposed framework overcome existing regulatory and economic bottlenecks? We urge a vote for the Negative.`,
    `In refutation to the Affirmative, we must question their primary assumptions. They assume that immediate intervention yields linear improvements. However, economic and historical precedents show that top-down mandates often trigger market distortion. The Opposition offers a far more robust alternative focused on decentralized adaptation.`
  ];

  const templates = aiPosition === 'Affirmative' ? affirmativeTemplates : negativeTemplates;
  const response = templates[Math.floor(Math.random() * templates.length)];
  
  return `[${modelName} - ${aiPosition}]: ${response}`;
}
