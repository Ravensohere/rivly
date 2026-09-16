// Morning Bridge Settings Section - For Sleep page
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sunrise, 
  Plus, 
  X, 
  Clock,
  Droplets, 
  Wind, 
  Sun, 
  Book, 
  Pen, 
  ListTodo, 
  Footprints,
  Heart,
  Sparkles,
} from 'lucide-react';
import { SleepCard, SleepCardHeader } from './SleepCard';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  MorningBridgeSettings, 
  MorningBridgeAction,
  MorningBridgeIcon,
  SUGGESTED_ACTIONS, 
  MAX_ACTIONS,
} from '@/types/morningBridge';

interface MorningBridgeSettingsSectionProps {
  settings: MorningBridgeSettings;
  onToggleEnabled: (enabled: boolean) => void;
  onSetWakeTime: (time: string) => void;
  onAddAction: (action: MorningBridgeAction) => boolean;
  onRemoveAction: (actionId: string) => void;
}

const ICON_MAP: Record<MorningBridgeIcon, React.ReactNode> = {
  droplet: <Droplets className="w-4 h-4" />,
  stretch: <Heart className="w-4 h-4" />,
  sun: <Sun className="w-4 h-4" />,
  wind: <Wind className="w-4 h-4" />,
  book: <Book className="w-4 h-4" />,
  pen: <Pen className="w-4 h-4" />,
  list: <ListTodo className="w-4 h-4" />,
  footprints: <Footprints className="w-4 h-4" />,
  heart: <Heart className="w-4 h-4" />,
  coffee: <Sparkles className="w-4 h-4" />,
  sparkles: <Sparkles className="w-4 h-4" />,
};

export function MorningBridgeSettingsSection({
  settings,
  onToggleEnabled,
  onSetWakeTime,
  onAddAction,
  onRemoveAction,
}: MorningBridgeSettingsSectionProps) {
  const [customText, setCustomText] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleAddSuggested = (action: MorningBridgeAction) => {
    // Check if already added
    if (settings.actions.some(a => a.title === action.title)) return;
    onAddAction({ ...action, id: crypto.randomUUID() });
  };

  const handleAddCustom = () => {
    if (!customText.trim()) return;
    const success = onAddAction({
      id: crypto.randomUUID(),
      title: customText.trim(),
      iconKey: 'sparkles',
      isCustom: true,
    });
    if (success) {
      setCustomText('');
      setShowCustomInput(false);
    }
  };

  const canAddMore = settings.actions.length < MAX_ACTIONS;
  const availableSuggestions = SUGGESTED_ACTIONS.filter(
    sug => !settings.actions.some(a => a.title === sug.title)
  );

  return (
    <SleepCard delay={0.5}>
      <SleepCardHeader 
        icon={<Sunrise className="w-5 h-5" />}
        title="Morning Bridge"
        subtitle="A gentle start to your day"
      />
      
      {/* Enable toggle */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-muted-foreground text-sm">
          Show one gentle next step when you wake up
        </p>
        <Switch
          checked={settings.enabled}
          onCheckedChange={onToggleEnabled}
        />
      </div>
      
      <AnimatePresence>
        {settings.enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-visible space-y-4"
          >
            {/* Wake time */}
            <div className="p-4 rounded-2xl bg-secondary border border-border/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Wake time</span>
                </div>
                <input
                  type="time"
                  value={settings.wakeTime}
                  onChange={(e) => onSetWakeTime(e.target.value)}
                  className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Morning Bridge shows within 3 hours of this time
              </p>
            </div>
            
            {/* Current actions */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Your morning actions ({settings.actions.length}/{MAX_ACTIONS})
              </p>
              
              {settings.actions.map((action, index) => (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40"
                >
                  <div className="w-8 h-8 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    {ICON_MAP[action.iconKey] || <Sparkles className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug truncate">{action.title}</p>
                    {action.subtitle && (
                      <p className="text-xs text-muted-foreground leading-snug mt-0.5 break-words line-clamp-2">{action.subtitle}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemoveAction(action.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </motion.div>
              ))}
              
              {settings.actions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Add up to {MAX_ACTIONS} morning actions below
                </p>
              )}
            </div>
            
            {/* Suggested actions chips */}
            {canAddMore && availableSuggestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Suggestions
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableSuggestions.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => handleAddSuggested(action)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 border border-border/40 text-sm transition-colors"
                    >
                      {ICON_MAP[action.iconKey]}
                      <span>{action.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Custom action input */}
            {canAddMore && (
              <div className="space-y-2">
                {showCustomInput ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Custom action..."
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
                      className="flex-1"
                      autoFocus
                    />
                    <Button onClick={handleAddCustom} size="sm">
                      Add
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setShowCustomInput(false);
                        setCustomText('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCustomInput(true)}
                    className="w-full gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add custom action
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </SleepCard>
  );
}
