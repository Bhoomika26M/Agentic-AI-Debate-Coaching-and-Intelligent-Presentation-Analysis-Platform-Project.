import { ArgumentAnalysis, CoachingPlan, PresentationMetrics, WeightedDebateScore } from './types';

export function generateCoachingPlan(
  debateScore?: WeightedDebateScore,
  presentation?: PresentationMetrics,
  argument?: ArgumentAnalysis
): CoachingPlan {
  const scores = [
    ['argument construction', debateScore?.argumentQuality ?? argument?.scores.overall ?? 0],
    ['evidence use', debateScore?.evidenceUsage ?? argument?.scores.evidenceStrength ?? 0],
    ['logical consistency', debateScore?.logicalConsistency ?? argument?.scores.logicalConsistency ?? 0],
    ['rebuttal effectiveness', debateScore?.rebuttalEffectiveness ?? 0],
    ['presentation clarity', presentation?.clarityScore ?? 0],
    ['audience engagement', presentation?.audienceEngagementScore ?? 0]
  ] as const;
  const prioritySkills = scores
    .filter(([, score]) => score > 0 && score < 75)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([skill]) => skill);
  const priorities = prioritySkills.length ? prioritySkills : ['evidence use', 'rebuttal effectiveness'];
  return {
    summary: `Focus your next practice block on ${priorities.join(', ')}.`,
    prioritySkills: priorities,
    recommendations: [
      ...(priorities.includes('evidence use') ? ['Build each claim around one source, metric, or concrete comparison.'] : []),
      ...(priorities.includes('logical consistency') ? ['Map premises to the conclusion and test every causal link.'] : []),
      ...(priorities.includes('rebuttal effectiveness') ? ['Answer the opponent’s strongest point before extending your own case.'] : []),
      ...(priorities.includes('presentation clarity') ? ['Use shorter sentences and deliberate pauses at transitions.'] : []),
      ...(priorities.includes('audience engagement') ? ['Open with a human impact example before introducing technical detail.'] : [])
    ],
    exercises: [
      { title: 'Claim-Evidence-Impact drill', objective: 'Write three claims with one verifiable support and one consequence each.', minutes: 10 },
      { title: 'Rapid rebuttal drill', objective: 'Answer five opposing claims in 20 seconds using concede, challenge, conclude.', minutes: 12 },
      { title: 'Recorded delivery review', objective: 'Record one minute and remove filler words and unclear transitions.', minutes: 8 }
    ],
    nextMilestone: `Raise ${priorities[0]} above 75 in your next two practice sessions.`
  };
}
