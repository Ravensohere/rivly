import { motion } from 'framer-motion';
import { Mic } from 'lucide-react';

export function MorningVoicePrompt() {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-primary/5 rounded-xl p-3 mb-4 mx-5 border border-primary/10 flex items-center gap-3 backdrop-blur-sm shadow-sm"
    >
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Mic className="w-4 h-4 text-primary" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">Track your rhythm</p>
        <p className="text-xs text-muted-foreground leading-tight">
          Tap the orb and say things like <span className="italic text-primary">"I feel great"</span> or <span className="italic text-primary">"I slept well"</span>
        </p>
      </div>
    </motion.div>
  );
}
