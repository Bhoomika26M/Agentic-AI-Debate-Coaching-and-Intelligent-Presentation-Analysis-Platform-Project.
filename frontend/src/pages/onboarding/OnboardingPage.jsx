import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ChevronRight, Sparkles, BookOpen, Mic, Target, Compass } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

const STEPS = [
  { id: 1, title: 'Experience Level', icon: Compass },
  { id: 2, title: 'Topics of Interest', icon: BookOpen },
  { id: 3, title: 'Presentation Domains', icon: Mic },
  { id: 4, title: 'Learning Goals', icon: Target },
  { id: 5, title: 'Coaching Style', icon: Sparkles },
];

const TOPIC_OPTIONS = [
  'Technology & Law',
  'Economics & Society',
  'Bioethics',
  'Digital Policy',
  'Energy & Climate',
  'Education Policy',
  'Space & Philosophy',
  'Finance & Privacy',
  'Workplace & Culture',
  'Global Governance',
];

const DOMAIN_OPTIONS = [
  'Competitive Debating',
  'Keynote Speeches',
  'Executive Briefings',
  'Academic Presentations',
  'Persuasive Pitches',
  'Impromptu Speaking',
  'Parliamentary Deliberation',
  'Courtroom Forensics',
];

const COACHING_STYLES = [
  { name: 'Socratic & Rigorous', desc: 'Questions your assumptions to test logical consistency.' },
  { name: 'Analytical & Direct', desc: 'Precise, data-driven feedback on structure and Toulmin warrants.' },
  { name: 'Constructive & Formative', desc: 'Step-by-step encouragement emphasizing incremental growth.' },
  { name: 'High-Impact & Fast-Paced', desc: 'High pressure simulations mimicking tournament finals.' },
];

export const OnboardingPage = () => {
  const { user, updateUserProfile } = useAuth();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [level, setLevel] = useState('BEGINNER');
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [selectedDomains, setSelectedDomains] = useState([]);
  const [learningGoalText, setLearningGoalText] = useState('');
  const [coachingStyle, setCoachingStyle] = useState('Constructive & Formative');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleTopic = (topic) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const toggleDomain = (domain) => {
    setSelectedDomains((prev) =>
      prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain]
    );
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      const res = await apiClient.patch('/profile', {
        experience_level: level,
        preferred_topics: selectedTopics,
        presentation_domains: selectedDomains,
        learning_goals: learningGoalText,
        coaching_style: coachingStyle,
      });

      // Also create an initial learning goal entry if specified
      if (learningGoalText.trim()) {
        try {
          await apiClient.post('/goals', {
            title: learningGoalText.trim(),
            progress: 10,
          });
        } catch (e) {
          // ignore goal creation error
        }
      }

      updateUserProfile({ ...user, profile: res.data });
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to save profile during onboarding:', err);
      navigate('/dashboard');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-arena-bg-dark text-arena-parchment flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-arena-amber/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl w-full mx-auto z-10">
        {/* Header & Stepper */}
        <div className="text-center mb-8">
          <span className="text-xs uppercase tracking-widest font-semibold text-arena-amber inline-block mb-2">
            Chamber Initiation
          </span>
          <h1 className="text-3xl font-serif font-bold text-white mb-2">
            Customize your Forensic Journey
          </h1>
          <p className="text-sm text-arena-muted">
            Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].title}
          </p>

          {/* Progress bar */}
          <div className="w-full bg-arena-bg-card h-2 rounded-full mt-6 overflow-hidden border border-white/5">
            <div
              className="bg-gradient-to-r from-arena-amber to-arena-prop h-full transition-all duration-300"
              style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Wizard Card */}
        <Card className="backdrop-blur-md bg-arena-bg-card/90 border-white/10 shadow-2xl p-8">
          <AnimatePresence mode="wait">
            {/* Step 1: Experience Level */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-serif font-bold text-white">Select your debating experience:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  {[
                    { id: 'BEGINNER', label: 'Beginner', desc: 'New to formal debate and structured rhetoric.' },
                    { id: 'INTERMEDIATE', label: 'Intermediate', desc: 'Familiar with parliamentary formats and refutations.' },
                    { id: 'ADVANCED', label: 'Advanced', desc: 'Seasoned tournament competitor or keynote speaker.' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setLevel(item.id)}
                      className={`p-4 rounded-xl text-left border transition-all ${
                        level === item.id
                          ? 'border-arena-amber bg-arena-amber/15 shadow-spotlight'
                          : 'border-white/10 bg-arena-bg-elevated hover:bg-white/5'
                      }`}
                    >
                      <div className="font-semibold text-white text-sm mb-1">{item.label}</div>
                      <div className="text-xs text-arena-muted leading-relaxed">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 2: Topics of Interest */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-serif font-bold text-white">What motions fascinate you?</h3>
                <p className="text-xs text-arena-muted">Pick topics you'd love to deliberate in the chamber.</p>
                <div className="flex flex-wrap gap-2 pt-2">
                  {TOPIC_OPTIONS.map((topic) => {
                    const isSelected = selectedTopics.includes(topic);
                    return (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => toggleTopic(topic)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                          isSelected
                            ? 'bg-arena-prop/20 text-arena-prop-glow border-arena-prop/50 shadow-prop-glow'
                            : 'bg-arena-bg-elevated border-white/10 text-arena-muted hover:text-white'
                        }`}
                      >
                        {topic}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Step 3: Presentation Domains */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-serif font-bold text-white">Select your primary speaking domains:</h3>
                <div className="flex flex-wrap gap-2 pt-2">
                  {DOMAIN_OPTIONS.map((domain) => {
                    const isSelected = selectedDomains.includes(domain);
                    return (
                      <button
                        key={domain}
                        type="button"
                        onClick={() => toggleDomain(domain)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                          isSelected
                            ? 'bg-arena-amber/20 text-arena-amber border-arena-amber/50 shadow-spotlight'
                            : 'bg-arena-bg-elevated border-white/10 text-arena-muted hover:text-white'
                        }`}
                      >
                        {domain}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Step 4: Learning Goals */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-serif font-bold text-white">Define your primary objective:</h3>
                <textarea
                  rows={4}
                  value={learningGoalText}
                  onChange={(e) => setLearningGoalText(e.target.value)}
                  placeholder="e.g. Master rapid refutation of Straw Man fallacies, control vocal pacing under pressure, and prepare for regional British Parliamentary debate tournaments."
                  className="w-full bg-arena-bg-elevated border border-white/10 rounded-xl p-3 text-sm text-arena-parchment placeholder-arena-muted/50 focus:outline-none focus:border-arena-amber transition"
                />
              </motion.div>
            )}

            {/* Step 5: Coaching Style */}
            {currentStep === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-serif font-bold text-white">Preferred Feedback & Coaching Style:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {COACHING_STYLES.map((style) => (
                    <button
                      key={style.name}
                      type="button"
                      onClick={() => setCoachingStyle(style.name)}
                      className={`p-4 rounded-xl text-left border transition-all ${
                        coachingStyle === style.name
                          ? 'border-arena-amber bg-arena-amber/15 shadow-spotlight'
                          : 'border-white/10 bg-arena-bg-elevated hover:bg-white/5'
                      }`}
                    >
                      <div className="font-semibold text-white text-sm mb-1">{style.name}</div>
                      <div className="text-xs text-arena-muted leading-relaxed">{style.desc}</div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stepper Buttons */}
          <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setCurrentStep((prev) => prev - 1)}
              >
                Back
              </Button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="text-xs text-arena-muted hover:text-white"
              >
                Skip for now
              </button>
            )}

            {currentStep < STEPS.length ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setCurrentStep((prev) => prev + 1)}
              >
                Next Step
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleFinish}
                isLoading={isSubmitting}
              >
                Enter Chamber
                <CheckCircle2 className="w-4 h-4 ml-1.5" />
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
