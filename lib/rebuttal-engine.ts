import { CounterargumentOption, CounterargumentType } from './types';

export function generateCounterarguments(argumentText: string, topic?: string): CounterargumentOption[] {
  const cleanArg = argumentText.trim() || 'The opponent claims that rapid adoption of top-down policies will solve systemic issues.';

  return [
    {
      id: 'ca-logical-' + Math.random().toString(36).substr(2, 6),
      type: 'Logical Rebuttals',
      title: 'Structural Premise Challenge',
      content: `The claim assumes a direct linear relationship between policy enforcement and compliance. However, this commits a correlation vs. causation fallacy. Deconstructing the logic shows that without addressing underlying incentives, top-down enforcement produces perverse workarounds rather than genuine alignment.`,
      challengeQuestion: 'What independent mechanism guarantees compliance when regional incentives contradict central directives?',
      strategyTip: 'Focus on exposing the logical gap between intent and structural outcomes.'
    },
    {
      id: 'ca-evidence-' + Math.random().toString(36).substr(2, 6),
      type: 'Evidence-Based Rebuttals',
      title: 'Empirical Data & Precedent Counter',
      content: `Comparative case studies demonstrate the contrary. In similar historical implementations (e.g., European regulatory shifts in 2018), initial efficiency gains were erased by 34% increased compliance friction within 18 months. The empirical consensus highlights that decentralized adaptation outperforms rigid mandates.`,
      challengeQuestion: 'Can you provide a single peer-reviewed case study where this framework succeeded without overwhelming administrative overhead?',
      strategyTip: 'Cite concrete percentages and historical precedents to dismantle hypothetical assertions.'
    },
    {
      id: 'ca-ethical-' + Math.random().toString(36).substr(2, 6),
      type: 'Ethical Counterarguments',
      title: 'Equity & Stakeholder Rights Impact',
      content: `From an ethical standpoint, prioritizing rapid implementation disproportionately burdens under-resourced stakeholders who lack immediate transition buffers. A just framework must prioritize procedural fairness and stakeholder consent over mere speed of execution.`,
      challengeQuestion: 'How does your model protect vulnerable demographic groups who absorb the highest transition costs?',
      strategyTip: 'Elevate the debate to fundamental principles of equity, autonomy, and moral duty.'
    },
    {
      id: 'ca-practical-' + Math.random().toString(36).substr(2, 6),
      type: 'Practical Counterarguments',
      title: 'Feasibility & Resource Bottlenecks',
      content: `While theoretically appealing, the operational realities present severe execution bottlenecks: key infrastructure is unready, trained personnel are scarce, and maintenance costs scale exponentially rather than linearly. Execution failure risks triggering systemic gridlock.`,
      challengeQuestion: 'What is your operational risk contingency plan when initial budget estimates double during Phase 1 deployment?',
      strategyTip: 'Dismantle idealized plans by pointing out logistics, capital requirements, and rollout delays.'
    },
    {
      id: 'ca-policy-' + Math.random().toString(36).substr(2, 6),
      type: 'Policy Counterarguments',
      title: 'Alternative Regulatory Architecture',
      content: `Rather than adopting a high-risk blanket mandate, a far superior policy alternative is a sandbox incentive framework. This allows high-performing entities to innovate rapidly while maintaining safeguards for baseline risk protection.`,
      challengeQuestion: 'Why adopt a rigid, irreversible blanket policy when a phased incentive-based sandbox achieves 80% of the benefit at 20% of the risk?',
      strategyTip: 'Always offer a cleaner, safer, lower-cost policy alternative rather than just saying no.'
    }
  ];
}
