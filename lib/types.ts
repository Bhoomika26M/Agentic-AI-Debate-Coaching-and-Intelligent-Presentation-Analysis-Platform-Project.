export type UserRole = 'learner' | 'coach' | 'educator' | 'admin';

export type ExperienceLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Elite';

export type DebateFormat = 
  | 'one-on-one'
  | 'parliamentary'
  | 'oxford'
  | 'policy'
  | 'public-forum'
  | 'ai-simulation';

export type SpeechType = 
  | 'Constructive (Affirmative)'
  | 'Constructive (Negative)'
  | 'Cross-Examination / POI'
  | 'Rebuttal (Affirmative)'
  | 'Rebuttal (Negative)'
  | 'Summary & Final Focus';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: UserRole;
  experienceLevel: ExperienceLevel;
  preferredTopics: string[];
  presentationDomains: string[];
  learningGoals: string[];
  coachingPreferences: {
    feedbackStrictness: 'Gentle' | 'Balanced' | 'Rigorous' | 'Debate Coach Master';
    focusAreas: string[];
    aiPersona: 'Socratic Scholar' | 'Policy Specialist' | 'Oxford Orator' | 'Sharp Critic';
  };
  metrics: {
    debatesCompleted: number;
    winRate: number;
    avgScore: number;
    presentationsAnalyzed: number;
    fallaciesIdentified: number;
  };
}

export type FallacyType = 
  | 'Ad Hominem'
  | 'Straw Man'
  | 'False Dilemma'
  | 'Slippery Slope'
  | 'Appeal to Authority'
  | 'Circular Reasoning'
  | 'Hasty Generalization'
  | 'Red Herring';

export interface FallacyMatch {
  id: string;
  type: FallacyType;
  quote: string;
  explanation: string;
  correctionSuggestion: string;
  severity: 'Low' | 'Medium' | 'High';
}

export type CounterargumentType = 
  | 'Logical Rebuttals'
  | 'Evidence-Based Rebuttals'
  | 'Ethical Counterarguments'
  | 'Practical Counterarguments'
  | 'Policy Counterarguments';

export interface CounterargumentOption {
  id: string;
  type: CounterargumentType;
  title: string;
  content: string;
  challengeQuestion: string;
  strategyTip: string;
}

export interface WeightedDebateScore {
  argumentQuality: number; // 30%
  evidenceUsage: number;   // 20%
  logicalConsistency: number; // 20%
  rebuttalEffectiveness: number; // 15%
  communicationSkills: number;  // 15%
  totalScore: number; // Weighted 0-100
  speakerPoints: number; // 70-80 scale
  verdict: 'Affirmative Win' | 'Negative Win' | 'Draw';
  breakdownNotes: {
    strengths: string[];
    weaknesses: string[];
    keyTurnarounds: string[];
  };
}

export interface DebateTurn {
  id: string;
  speaker: 'User' | 'AI Opponent' | 'Moderator' | 'Coach';
  speakerName: string;
  role: 'Affirmative' | 'Negative' | 'Judge';
  speechType: SpeechType;
  content: string;
  timestamp: string;
  fallacies?: FallacyMatch[];
  metrics?: {
    wpm: number;
    clarityScore: number;
    persuasiveness: number;
  };
}

export interface DebateSession {
  id: string;
  topic: string;
  format: DebateFormat;
  userPosition: 'Affirmative' | 'Negative';
  aiModelId: string;
  aiPersona: string;
  status: 'Setup' | 'In-Progress' | 'Completed';
  createdAt: string;
  turns: DebateTurn[];
  scorecard?: WeightedDebateScore;
}

export interface PresentationMetrics {
  speechPaceWPM: number;
  fillerWordCount: number;
  fillerWordsFound: Record<string, number>;
  confidenceScore: number; // 0-100
  clarityScore: number;    // 0-100
  audienceEngagementScore: number; // 0-100
  ethosPathosLogos: {
    ethos: number; // Credibility
    pathos: number; // Emotion
    logos: number; // Logic
  };
  fallaciesDetected: FallacyMatch[];
  keyFeedback: string[];
  improvementSuggestions: string[];
}

export interface AIModelDefinition {
  id: string;
  name: string;
  provider: 'Google' | 'OpenAI' | 'Anthropic' | 'DeepSeek' | 'Meta' | 'Local Smart Simulator';
  description: string;
  badge: string;
  isSimulator?: boolean;
  capabilities: string[];
  recommendedFor: string;
}
