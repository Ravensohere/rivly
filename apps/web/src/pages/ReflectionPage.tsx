import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { PageTransition, staggerContainer, staggerItem } from '@/components/ui/PageTransition';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DayStateIcon } from '@/components/reflection/DayStateIcon';
import { useReflection, EmotionalScore, DailyWin, REFLECTION_QUESTIONS } from '@/hooks/useReflection';
import { formatDate } from '@/hooks/useLocalStorage';

const emotionOptions: { value: EmotionalScore; label: string }[] = [
  { value: 'hard', label: 'Hard day' },
  { value: 'okay', label: 'Okay day' },
  { value: 'good', label: 'Good day' },
];

const winOptions: { value: DailyWin; label: string }[] = [
  { value: 'completed', label: 'Completed tasks' },
  { value: 'showedUp', label: 'Showed up' },
  { value: 'selfCare', label: 'Took care of myself' },
  { value: 'learned', label: 'Learned something' },
];

export default function ReflectionPage() {
  const { getReflectionForDate, saveReflection, getTodaysQuestion, hasReflectedToday } = useReflection();
  
  const today = formatDate(new Date());
  const existingReflection = getReflectionForDate(today);
  const todaysQuestion = getTodaysQuestion();

  const [text, setText] = useState(existingReflection?.text || '');
  const [emotionalScore, setEmotionalScore] = useState<EmotionalScore | null>(
    existingReflection ? (existingReflection.emotionalScore === 1 ? 'hard' : existingReflection.emotionalScore === 2 ? 'okay' : 'good') : null
  );
  const [dailyWin, setDailyWin] = useState<DailyWin | null>(existingReflection?.dailyWin as DailyWin || null);
  const [saved, setSaved] = useState(false);

  // Auto-save
  useEffect(() => {
    if (text || emotionalScore || dailyWin) {
      const scoreValue = emotionalScore === 'hard' ? 1 : emotionalScore === 'okay' ? 2 : emotionalScore === 'good' ? 3 : 2;
      saveReflection({
        date: today,
        questionId: todaysQuestion.id,
        text,
        emotionalScore: scoreValue,
        dailyWin,
      });
    }
  }, [text, emotionalScore, dailyWin]);

  const handleComplete = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const isComplete = text.trim() && emotionalScore && dailyWin;

  return (
    <PageTransition className="p-6 pb-28">
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="enter"
        className="max-w-md mx-auto space-y-8"
      >
        {/* Header */}
        <motion.div variants={staggerItem} className="text-center pt-4">
          <motion.div
            className="inline-flex items-center gap-2 mb-4"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Sparkles className="w-4 h-4 text-primary/60" />
          </motion.div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Close Your Day
          </h1>
          <p className="text-sm text-muted-foreground">
            A moment to reflect and let go
          </p>
        </motion.div>

        {/* Daily Question */}
        <motion.div variants={staggerItem} className="space-y-4">
          <p className="text-lg text-foreground font-medium">
            {todaysQuestion.text}
          </p>
          <Textarea
            placeholder="Take your time..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[120px] resize-none rounded-2xl card-glass border-border/30 focus:border-primary/50 transition-all duration-300"
          />
        </motion.div>

        {/* Emotional Score */}
        <motion.div variants={staggerItem} className="space-y-4">
          <p className="text-sm text-muted-foreground">How was your day?</p>
          <div className="flex justify-center gap-4">
            {emotionOptions.map((option, index) => (
              <motion.button
                key={option.value}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.1 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setEmotionalScore(option.value)}
                className={`relative flex flex-col items-center gap-3 p-5 rounded-3xl transition-all duration-300 ${
                  emotionalScore === option.value
                    ? 'bg-primary text-primary-foreground shadow-glow'
                    : 'card-glass hover:shadow-medium'
                }`}
              >
                {emotionalScore === option.value && (
                  <motion.div
                    layoutId="emotion-indicator"
                    className="absolute inset-0 bg-primary rounded-3xl"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">
                  <DayStateIcon 
                    state={option.value} 
                    isSelected={emotionalScore === option.value}
                  />
                </span>
                <span className="relative text-xs font-medium z-10">{option.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Daily Win */}
        <motion.div variants={staggerItem} className="space-y-4">
          <p className="text-sm text-muted-foreground">What counts as a win today?</p>
          <div className="flex flex-wrap gap-2">
            {winOptions.map((option, index) => (
              <motion.button
                key={option.value}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + index * 0.05 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setDailyWin(option.value)}
                className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  dailyWin === option.value
                    ? 'bg-primary text-primary-foreground shadow-glow'
                    : 'card-glass hover:shadow-medium'
                }`}
              >
                {option.label}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Complete Button */}
        <motion.div variants={staggerItem}>
          <Button
            onClick={handleComplete}
            disabled={!isComplete}
            className="w-full h-14 rounded-2xl text-lg font-medium shadow-elevated hover:shadow-glow transition-all duration-300"
          >
            {saved ? (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center"
              >
                <Check className="w-5 h-5 mr-2" />
                Day closed
              </motion.div>
            ) : (
              'Close my day'
            )}
          </Button>
        </motion.div>

        {saved && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-sm text-muted-foreground"
          >
            Rest well. Tomorrow is a fresh start.
          </motion.p>
        )}
      </motion.div>
    </PageTransition>
  );
}