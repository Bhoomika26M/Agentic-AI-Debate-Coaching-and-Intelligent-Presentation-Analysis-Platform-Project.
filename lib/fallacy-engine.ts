import { FallacyMatch, FallacyType } from './types';

export const FALLACY_DEFINITIONS: Record<FallacyType, { description: string; example: string; fixAdvice: string }> = {
  'Ad Hominem': {
    description: 'Attacking the person or character of the opponent rather than addressing their argument or evidence.',
    example: '"We cannot trust his economic plan because he has never run a major corporation."',
    fixAdvice: 'Refocus strictly on the data, logic, and policy metrics rather than personal traits or background.'
  },
  'Straw Man': {
    description: 'Misrepresenting or oversimplifying an opponent argument to make it easier to attack.',
    example: '"They want to increase healthcare funding, which means they want complete state control of your life."',
    fixAdvice: 'Restate the opponent position accurately before offering counterarguments to maintain intellectual integrity.'
  },
  'False Dilemma': {
    description: 'Presenting only two extreme options when more viable intermediate options exist.',
    example: '"Either we completely BAN AI tools, or human intelligence will become obsolete in 5 years."',
    fixAdvice: 'Acknowledge nuanced middle grounds, hybrid solutions, and phased adoption frameworks.'
  },
  'Slippery Slope': {
    description: 'Asserting without proof that a relatively small first step will inevitably lead to extreme negative consequences.',
    example: '"If we permit remote work 1 day a week, productivity will crash and the company will fail."',
    fixAdvice: 'Demonstrate clear causal mechanisms and empirical thresholds rather than assuming chain reactions.'
  },
  'Appeal to Authority': {
    description: 'Relying solely on the statement of a figure or celebrity without presenting independent evidence or expertise in the domain.',
    example: '"A famous actor said this economic policy will fail, so it must be true."',
    fixAdvice: 'Cite domain-expert consensus, peer-reviewed data, or empirical statistics rather than authority alone.'
  },
  'Circular Reasoning': {
    description: 'An argument where the conclusion is already assumed in the premise (begging the question).',
    example: '"This policy is the most effective because it works better than any other option."',
    fixAdvice: 'Provide external benchmarks and measurable outcomes rather than restating the claim.'
  },
  'Hasty Generalization': {
    description: 'Drawing a broad conclusion from a very small or unrepresentative sample size.',
    example: '"Two startups failed using this methodology, proving that agile frameworks don\'t work."',
    fixAdvice: 'Use statistically significant sample sizes and recognize outliers versus systematic trends.'
  },
  'Red Herring': {
    description: 'Introducing an irrelevant topic to divert attention away from the main issue being debated.',
    example: '"Why debate climate policy when our city taxes are too high anyway?"',
    fixAdvice: 'Stay grounded in the core motion topic and pivot back to the primary impact metrics.'
  }
};

export function detectFallacies(text: string): FallacyMatch[] {
  const cleanText = text.trim();
  if (!cleanText) return [];

  const matches: FallacyMatch[] = [];
  const lowerText = cleanText.toLowerCase();
  const quote = cleanText.length > 100 ? `${cleanText.slice(0, 100)}...` : cleanText;
  const addMatch = (type: FallacyType, explanation: string, severity: FallacyMatch['severity']) => {
    matches.push({
      id: `fallacy-${type.toLowerCase().replace(/[^a-z]+/g, '-')}-${matches.length + 1}`,
      type,
      quote,
      explanation,
      correctionSuggestion: FALLACY_DEFINITIONS[type].fixAdvice,
      severity
    });
  };

  if (/\b(you are just|clueless|ignorant|incompetent|idiot|stupid)\b/i.test(cleanText)) {
    addMatch('Ad Hominem', 'Attacks the opponent rather than addressing the evidence or reasoning.', 'High');
  }

  if (/\b(either .+ or .+|only two choices|the only options are|if we don't .+ then)\b/i.test(cleanText)) {
    addMatch('False Dilemma', 'Frames the issue as a binary choice while ignoring intermediate options.', 'Medium');
  }

  if (/\b(inevitably|will lead to (total|complete)|first step to disaster|before you know it|then everything will)\b/i.test(cleanText)) {
    addMatch('Slippery Slope', 'Assumes a catastrophic chain reaction without proving each causal step.', 'Medium');
  }

  if (/\b(everyone knows|obviously true because|because it is effective|it works because it works)\b/i.test(cleanText)) {
    addMatch('Circular Reasoning', 'Uses the conclusion as its own supporting premise instead of external evidence.', 'Low');
  }

  if (/\b(they want to|so you are saying|their plan means|supporting .+ means)\b/i.test(cleanText)) {
    addMatch('Straw Man', 'Recasts an opponent position into a simpler, more extreme claim.', 'Medium');
  }
  if (/\b(expert says|famous .+ says|authority on everything|because .+ said so)\b/i.test(cleanText)) {
    addMatch('Appeal to Authority', 'Treats an authority’s statement as sufficient proof without relevant evidence.', 'Low');
  }
  if (/\b(two examples|one case|everyone|all .+ are|none of them)\b/i.test(cleanText) && !/\bdata|study|sample\b/i.test(lowerText)) {
    addMatch('Hasty Generalization', 'Makes a broad claim from an explicitly small or unsupported sample.', 'Medium');
  }
  if (/\b(anyway|that reminds me|the real issue is|what about .+ instead)\b/i.test(cleanText)) {
    addMatch('Red Herring', 'Introduces an unrelated issue that diverts attention from the motion.', 'Low');
  }

  return matches;
}
