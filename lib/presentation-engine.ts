import { PresentationMetrics } from './types';
import { detectFallacies } from './fallacy-engine';

export function analyzePresentationText(
  text: string,
  audioDurationSeconds: number = 60
): PresentationMetrics {
  const cleanText = text.trim();
  const words = cleanText ? cleanText.split(/\s+/) : [];
  const wordCount = words.length;

  const durationInMinutes = Math.max(audioDurationSeconds / 60, 0.5);
  const speechPaceWPM = Math.round(wordCount / durationInMinutes);

  // Common filler words dictionary
  const fillerList = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'literally', 'so yeah', 'honestly', 'kind of', 'sort of'];
  const fillerWordsFound: Record<string, number> = {};
  let fillerWordCount = 0;

  const lowerText = cleanText.toLowerCase();
  fillerList.forEach(filler => {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) {
      fillerWordsFound[filler] = matches.length;
      fillerWordCount += matches.length;
    }
  });

  // Ethos, Pathos, Logos analysis based on vocabulary triggers
  let ethosPoints = 65;
  let pathosPoints = 60;
  let logosPoints = 70;

  // Logos triggers (data, logic, statistics)
  if (/\b(percent|data|study|evidence|research|proven|consequently|therefore|metrics|statistic|analysis)\b/i.test(text)) {
    logosPoints += 20;
  }
  // Ethos triggers (credibility, expertise, responsibility, integrity)
  if (/\b(experience|track record|integrity|commitment|proven|expertise|ethically|dedicated|standards)\b/i.test(text)) {
    ethosPoints += 20;
  }
  // Pathos triggers (emotion, vision, passion, transformation, human impact)
  if (/\b(imagine|passion|future|lives|hope|struggle|vision|together|story|empower|transform)\b/i.test(text)) {
    pathosPoints += 20;
  }

  // WPM rating: ideal public speaking pace is 130 - 160 WPM
  let pacePenalty = 0;
  if (speechPaceWPM < 110 || speechPaceWPM > 175) {
    pacePenalty = 12;
  }

  const fillerRatio = wordCount > 0 ? fillerWordCount / wordCount : 0;
  const fillerPenalty = Math.min(Math.round(fillerRatio * 200), 30);

  const clarityScore = Math.max(20, Math.min(98, 90 - fillerPenalty - pacePenalty));
  const confidenceScore = Math.max(25, Math.min(96, 88 - Math.round(fillerWordCount * 3) + (ethosPoints > 80 ? 8 : 0)));
  const audienceEngagementScore = Math.max(30, Math.min(99, Math.round((pathosPoints * 0.4) + (logosPoints * 0.4) + (clarityScore * 0.2))));

  const fallacies = detectFallacies(cleanText);

  const keyFeedback: string[] = [];
  const improvementSuggestions: string[] = [];

  if (speechPaceWPM > 170) {
    keyFeedback.push(`Speaking pace is rapid (${speechPaceWPM} WPM). High energy, but risk of losing audience comprehension.`);
    improvementSuggestions.push('Incorporate intentional 2-second pauses after key statistical claims to let ideas resonate.');
  } else if (speechPaceWPM < 115) {
    keyFeedback.push(`Speaking pace is slow (${speechPaceWPM} WPM). Good for emphasis, but could drop engagement.`);
    improvementSuggestions.push('Increase vocal cadence during narrative transitions to maintain momentum.');
  } else {
    keyFeedback.push(`Optimal speaking pace of ${speechPaceWPM} WPM. Dynamic cadence keeps audience engaged.`);
  }

  if (fillerWordCount > 4) {
    keyFeedback.push(`Detected ${fillerWordCount} filler words (${Object.keys(fillerWordsFound).join(', ')}).`);
    improvementSuggestions.push('Practice silent pausing instead of vocalized fillers when gathering your next thought.');
  } else {
    keyFeedback.push('Crisp articulation with minimal filler word intrusion.');
  }

  if (logosPoints < 75) {
    improvementSuggestions.push('Boost Logos: Include at least two empirical statistics or benchmark references in your core slides.');
  }
  if (pathosPoints < 70) {
    improvementSuggestions.push('Boost Pathos: Frame the problem through a relatable human story or customer narrative before presenting data.');
  }

  return {
    speechPaceWPM,
    fillerWordCount,
    fillerWordsFound,
    confidenceScore,
    clarityScore,
    audienceEngagementScore,
    ethosPathosLogos: {
      ethos: Math.min(100, ethosPoints),
      pathos: Math.min(100, pathosPoints),
      logos: Math.min(100, logosPoints)
    },
    fallaciesDetected: fallacies,
    keyFeedback,
    improvementSuggestions
  };
}
