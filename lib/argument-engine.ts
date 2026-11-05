import { ArgumentAnalysis } from './types';
import { detectFallacies } from './fallacy-engine';

const evidencePattern = /\b(data|study|studies|research|survey|percent|according to|evidence|trial|report|statistics?|benchmark)\b[^.!?]*/gi;
const claimPattern = /(?:^|[.!?])\s*([^.!?]{12,160})/g;

export function analyzeArgument(text: string, topic?: string): ArgumentAnalysis {
  const cleanText = text.trim();
  const sentences = cleanText.match(claimPattern)?.map(sentence => sentence.trim().replace(/^[.!?]\s*/, '')) || [];
  const claims = sentences.length > 0 ? sentences.slice(0, 5) : (cleanText ? [cleanText] : []);
  const evidence = cleanText.match(evidencePattern)?.map(item => item.trim()).slice(0, 5) || [];
  const fallacies = detectFallacies(cleanText);
  const hasStructure = /\b(because|therefore|however|first|second|finally|impact|so that)\b/i.test(cleanText);
  const hasTopic = topic ? cleanText.toLowerCase().includes(topic.toLowerCase().slice(0, 20)) : true;
  const lengthScore = cleanText.length >= 80 ? 15 : cleanText.length >= 30 ? 9 : 4;
  const scores = {
    clarity: Math.min(98, 45 + lengthScore + (claims.length > 1 ? 18 : 0) - fallacies.length * 3),
    relevance: Math.min(98, 55 + (hasTopic ? 20 : 5) + (hasStructure ? 10 : 0)),
    evidenceStrength: Math.min(98, evidence.length ? 55 + evidence.length * 10 : 35),
    logicalConsistency: Math.max(20, Math.min(98, 78 + (hasStructure ? 8 : 0) - fallacies.length * 12)),
    persuasiveness: Math.max(20, Math.min(98, 50 + lengthScore + (evidence.length ? 12 : 0) + (hasStructure ? 8 : 0) - fallacies.length * 6))
  };
  const overall = Math.round(
    scores.clarity * 0.2 +
    scores.relevance * 0.15 +
    scores.evidenceStrength * 0.25 +
    scores.logicalConsistency * 0.2 +
    scores.persuasiveness * 0.2
  );
  const coachingAdvice = [
    ...(evidence.length ? [] : ['Add a verifiable statistic, study, or concrete example to support the central claim.']),
    ...(hasStructure ? [] : ['Use a claim-evidence-impact structure so the reasoning is easier to follow.']),
    ...(fallacies.length ? ['Rewrite the flagged sentences and answer the strongest opposing interpretation directly.'] : []),
    ...(claims.length < 2 ? ['Separate the main claim from its supporting reasons and expected impact.'] : [])
  ];

  return {
    claim: claims[0] || 'No claim detected',
    claims,
    evidence,
    strengths: [
      ...(claims.length > 1 ? ['Presents more than one connected proposition.'] : []),
      ...(hasStructure ? ['Uses signposting or causal connectors.'] : []),
      ...(evidence.length ? ['Includes evidence-oriented language.'] : [])
    ],
    weaknesses: [
      ...(evidence.length ? [] : ['Evidence is not specific enough to verify.']),
      ...(fallacies.length ? [`Contains ${fallacies.length} detected reasoning issue${fallacies.length === 1 ? '' : 's'}.`] : []),
      ...(hasTopic ? [] : ['The argument does not clearly connect to the stated topic.'])
    ],
    scores: { ...scores, overall },
    fallacies,
    coachingAdvice
  };
}
