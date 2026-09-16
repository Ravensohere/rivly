// Morning Bridge Card - Redesigned for Day page with clickable actions
import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Sunrise, 
  ChevronRight, 
  Droplets, 
  Wind, 
  Sun, 
  Book, 
  Pen, 
  ListTodo, 
  Footprints,
  Heart,
  Coffee,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { MorningBridgeAction, MorningBridgeIcon } from '@/types/morningBridge';
import { MorningBridgeActionSheet } from './MorningBridgeActionSheet';
import { useEventsLedgerContext } from '@/contexts/EventsLedgerContext';
import { getLocalDateKey } from '@/lib/dateUtils';

interface MorningBridgeDisplayCardProps {
  nextAction: MorningBridgeAction | null;
  allDone: boolean;
  onMarkDone: (actionId: string) => void;
  onSkip: (actionId: string) => void;
}

const ICON_MAP: Record<MorningBridgeIcon, React.ReactNode> = {
  droplet: <Droplets className="w-5 h-5" />,
  stretch: <Heart className="w-5 h-5" />,
  sun: <Sun className="w-5 h-5" />,
  wind: <Wind className="w-5 h-5" />,
  book: <Book className="w-5 h-5" />,
  pen: <Pen className="w-5 h-5" />,
  list: <ListTodo className="w-5 h-5" />,
  footprints: <Footprints className="w-5 h-5" />,
  heart: <Heart className="w-5 h-5" />,
  coffee: <Coffee className="w-5 h-5" />,
  sparkles: <Sparkles className="w-5 h-5" />,
};

export function MorningBridgeDisplayCard({
  nextAction,
  allDone,
  onMarkDone,
  onSkip,
}: MorningBridgeDisplayCardProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { recordSleepRating } = useEventsLedgerContext();
  const today = getLocalDateKey(new Date());

  const handleDone = () => {
    if (!nextAction) return;
    onMarkDone(nextAction.id);
    // Log event to ledger
    console.log('[MorningBridge] Action done:', nextAction.title);
  };

  const handleSkip = () => {
    if (!nextAction) return;
    onSkip(nextAction.id);
    console.log('[MorningBridge] Action skipped:', nextAction.title);
  };

  if (allDone) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-2xl bg-card border border-border/40"
        style={{ boxShadow: 'var(--shadow-soft)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center text-success">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-foreground font-medium">Morning routine complete! ✨</p>
            <p className="text-muted-foreground text-sm">You're ready for your day</p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!nextAction) return null;

  return (
    <>
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => setSheetOpen(true)}
        className="w-full text-left rounded-2xl bg-secondary/60 hover:bg-secondary border border-border/30 active:scale-[0.98] transition-all"
        style={{ padding: '0.85rem 1rem' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            {ICON_MAP[nextAction.iconKey] || <Sparkles className="w-4 h-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-foreground text-[15px] font-semibold leading-tight truncate">
              {nextAction.title}
            </p>
            {nextAction.subtitle && (
              <p className="text-muted-foreground text-[13px] truncate mt-0.5">
                {nextAction.subtitle}
              </p>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </div>
      </motion.button>

      <MorningBridgeActionSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        action={nextAction}
        onDone={handleDone}
        onSkip={handleSkip}
      />
    </>
  );
}
