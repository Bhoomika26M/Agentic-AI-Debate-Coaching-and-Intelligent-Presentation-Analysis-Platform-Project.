import { DebateTurn, WeightedDebateScore } from './types';
import { detectFallacies } from './fallacy-engine';

export function evaluateDebateSession(turns: DebateTurn[], userPosition: 'Affirmative' | 'Negative'): WeightedDebateScore {
  const userTurns = turns.filter(t => t.speaker === 'User');
  const userText = userTurns.map(t => t.content).join(' ');

  let argumentQuality = userTurns.length ? 62 : 0;
  let evidenceUsage = userTurns.length ? 58 : 0;
  let logicalConsistency = userTurns.length ? 64 : 0;
  let rebuttalEffectiveness = userTurns.length > 1 ? 60 : 40;
  let communicationSkills = userTurns.length ? 68 : 0;

  if (userText.length > 300) {
    argumentQuality += 6;
    evidenceUsage += 8;
  }
  if (userText.toLowerCase().includes('data') || userText.toLowerCase().includes('study') || userText.toLowerCase().includes('percent')) {
    evidenceUsage += 7;
  }
  if (userText.toLowerCase().includes('however') || userText.toLowerCase().includes('opponent claims') || userText.toLowerCase().includes('refutation')) {
    rebuttalEffectiveness += 9;
  }
  const fallacyCount = userTurns.reduce((count, turn) => count + detectFallacies(turn.content).length, 0);
  logicalConsistency -= fallacyCount * 8;
  argumentQuality -= fallacyCount * 4;
  communicationSkills += userTurns.length >= 2 ? 5 : 0;

  // Keep the rubric bounded while allowing an empty session to score zero.
  argumentQuality = Math.min(98, Math.max(0, argumentQuality));
  evidenceUsage = Math.min(98, Math.max(0, evidenceUsage));
  logicalConsistency = Math.min(98, Math.max(0, logicalConsistency));
  rebuttalEffectiveness = Math.min(98, Math.max(0, rebuttalEffectiveness));
  communicationSkills = Math.min(98, Math.max(0, communicationSkills));

  // Compute weighted sum according to PDF criteria
  const weightedSum = (
    (argumentQuality * 0.30) +
    (evidenceUsage * 0.20) +
    (logicalConsistency * 0.20) +
    (rebuttalEffectiveness * 0.15) +
    (communicationSkills * 0.15)
  );

  const totalScore = Math.round(weightedSum);
  const speakerPoints = Number((70 + (totalScore / 100) * 10).toFixed(1)); // 70-80 scale

  let verdict: 'Affirmative Win' | 'Negative Win' | 'Draw' = 'Affirmative Win';
  if (totalScore < 75) {
    verdict = userPosition === 'Affirmative' ? 'Negative Win' : 'Affirmative Win';
  } else if (totalScore >= 75 && totalScore <= 78) {
    verdict = 'Draw';
  } else {
    verdict = userPosition === 'Affirmative' ? 'Affirmative Win' : 'Negative Win';
  }

  return {
    argumentQuality,
    evidenceUsage,
    logicalConsistency,
    rebuttalEffectiveness,
    communicationSkills,
    totalScore,
    speakerPoints,
    verdict,
    breakdownNotes: {
      strengths: [
        ...(argumentQuality >= 70 ? ['Clear central thesis with a structured line of reasoning.'] : []),
        ...(evidenceUsage >= 70 ? ['Uses evidence markers and concrete support for key claims.'] : []),
        ...(rebuttalEffectiveness >= 70 ? ['Addresses opposing claims with explicit rebuttal language.'] : [])
      ],
      weaknesses: [
        ...(evidenceUsage < 70 ? ['Add verifiable evidence, benchmarks, or an explicit comparison.'] : []),
        ...(logicalConsistency < 70 ? ['Connect each premise to the conclusion and avoid unsupported causal leaps.'] : []),
        ...(rebuttalEffectiveness < 70 ? ['Answer the opponent claim directly before introducing a new point.'] : [])
      ],
      keyTurnarounds: [
        ...(rebuttalEffectiveness >= 70 ? ['A direct rebuttal pivot exposed a weakness in the opposing case.'] : ['No decisive turnaround was detected yet; use the next turn to answer the strongest opposing claim.'])
      ]
    }
  };
}
