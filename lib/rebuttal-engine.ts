import { CounterargumentOption, CounterargumentType } from './types';

export function generateCounterarguments(argumentText: string, topic?: string): CounterargumentOption[] {
  const cleanArg = argumentText.trim() || 'The opponent claims that rapid adoption of top-down policies will solve systemic issues.';
  const subject = topic?.trim() || 'this proposal';
  const excerpt = cleanArg.length > 180 ? `${cleanArg.slice(0, 180)}...` : cleanArg;

  return [
    {
      id: 'ca-logical-' + Math.random().toString(36).substr(2, 6),
      type: 'Logical Rebuttals',
      title: 'Structural Premise Challenge',
      content: `The claim "${excerpt}" assumes that its desired outcome follows directly from the proposal. For ${subject}, identify the missing causal step and explain why the same result would not follow from a less restrictive alternative.`,
      challengeQuestion: 'What independent mechanism connects the proposed action to the claimed outcome?',
      strategyTip: 'Focus on exposing the logical gap between intent and structural outcomes.'
    },
    {
      id: 'ca-evidence-' + Math.random().toString(36).substr(2, 6),
      type: 'Evidence-Based Rebuttals',
      title: 'Empirical Data & Precedent Counter',
      content: `The assertion needs a measurable baseline. Ask which population, time period, and outcome would validate "${excerpt}", then compare it with credible cases rather than relying on an anecdote or an unsupported percentage.`,
      challengeQuestion: 'Which independent source and success metric would verify this claim?',
      strategyTip: 'Cite concrete percentages and historical precedents to dismantle hypothetical assertions.'
    },
    {
      id: 'ca-ethical-' + Math.random().toString(36).substr(2, 6),
      type: 'Ethical Counterarguments',
      title: 'Equity & Stakeholder Rights Impact',
      content: `Even if "${excerpt}" improves one aggregate outcome, it may distribute costs unevenly. Require the proposal to explain who bears the transition cost, what consent or safeguards exist, and how vulnerable groups are protected.`,
      challengeQuestion: 'Who bears the cost of this proposal, and what safeguard protects them?',
      strategyTip: 'Elevate the debate to fundamental principles of equity, autonomy, and moral duty.'
    },
    {
      id: 'ca-practical-' + Math.random().toString(36).substr(2, 6),
      type: 'Practical Counterarguments',
      title: 'Feasibility & Resource Bottlenecks',
      content: `The claim does not establish that implementation is feasible. Stress-test "${excerpt}" against staffing, budget, infrastructure, timeline, and failure recovery requirements before accepting its promised result.`,
      challengeQuestion: 'What is the rollout and contingency plan if the first implementation phase fails?',
      strategyTip: 'Dismantle idealized plans by pointing out logistics, capital requirements, and rollout delays.'
    },
    {
      id: 'ca-policy-' + Math.random().toString(36).substr(2, 6),
      type: 'Policy Counterarguments',
      title: 'Alternative Regulatory Architecture',
      content: `Offer a testable alternative to "${excerpt}": a phased pilot with explicit guardrails, review points, and an exit condition. This preserves the intended benefit while limiting irreversible downside.`,
      challengeQuestion: 'Why choose an irreversible intervention over a measurable pilot with an exit condition?',
      strategyTip: 'Always offer a cleaner, safer, lower-cost policy alternative rather than just saying no.'
    }
  ];
}
