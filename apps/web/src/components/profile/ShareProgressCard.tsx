import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Copy, Check, Flame, Target, Clock, Download, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useFocusTotals } from '@/hooks/useFocusTotals';
import { useAchievements } from '@/hooks/useAchievements';
import { toPng } from 'html-to-image';

interface ShareProgressCardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareProgressCard({ open, onOpenChange }: ShareProgressCardProps) {
  const { firstName } = useUserPreferences();
  const { week, focusStreak } = useFocusTotals();
  const { allAchievements } = useAchievements();
  const [copied, setCopied] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Get display name with proper fallback chain
  const displayName = firstName || 'Rivly User';

  // Get top unlocked achievement
  const topAchievement = allAchievements
    .filter(a => a.isUnlocked)
    .sort((a, b) => {
      const tierOrder = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
      return tierOrder[a.tier as keyof typeof tierOrder] - tierOrder[b.tier as keyof typeof tierOrder];
    })[0];

  const statsData = {
    name: displayName,
    weekFocus: week.formatted,
    weekSessions: week.sessions,
    streak: focusStreak,
    topBadge: topAchievement?.name || null,
    topBadgeIcon: topAchievement?.icon || null,
  };

  // Proper pluralization helper
  const pluralize = (count: number, singular: string, plural: string) => 
    count === 1 ? singular : plural;

  const generateSummaryText = () => {
    let text = `🌿 My Rivly Week\n\n`;
    text += `⏱ ${statsData.weekFocus} focused\n`;
    text += `🎯 ${statsData.weekSessions} ${pluralize(statsData.weekSessions, 'session', 'sessions')}\n`;
    text += `🔥 ${statsData.streak} day streak\n`;
    if (statsData.topBadge) {
      text += `🏆 ${statsData.topBadge}\n`;
    }
    text += `\n— ${statsData.name} on Rivly`;
    return text;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateSummaryText());
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleShareCard = async () => {
    if (!cardRef.current) return;
    
    setIsGeneratingImage(true);
    
    try {
      // Get computed background color from CSS variable
      const computedStyle = getComputedStyle(document.documentElement);
      const bgColor = computedStyle.getPropertyValue('--background').trim();
      // Convert HSL to hex for html-to-image (it needs a solid color)
      const backgroundColor = bgColor ? `hsl(${bgColor})` : '#f8fafc';
      
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor,
      });
      
      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'rivly-week.png', { type: 'image/png' });
      
      // Check if Web Share API with files is supported
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'My Rivly Week',
          text: generateSummaryText(),
        });
        toast.success('Shared successfully!');
      } else {
        // Fallback: download the image
        const link = document.createElement('a');
        link.download = 'rivly-week.png';
        link.href = dataUrl;
        link.click();
        toast.success('Image downloaded! Share it on your favorite platform.');
      }
    } catch (error) {
      // User cancelled share or error occurred
      if ((error as Error).name !== 'AbortError') {
        console.error('Share failed:', error);
        toast.error('Failed to share. Try copying the text instead.');
      }
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-3xl">
        <SheetHeader className="text-left pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Share Your Week
          </SheetTitle>
        </SheetHeader>

        <SheetBody className="pb-8 overflow-y-auto">
          {/* Preview Card - This is the element we'll capture */}
          <div
            ref={cardRef}
            className="relative p-6 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-secondary/30 border border-primary/20 mb-6"
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-xl font-bold text-primary-foreground">
                {statsData.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{statsData.name}</h3>
                <p className="text-xs text-muted-foreground">Rivly Week Summary</p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-background/60 rounded-xl p-3 text-center">
                <Clock className="w-5 h-5 text-primary mx-auto mb-1" />
                <div className="text-lg font-bold text-foreground">{statsData.weekFocus}</div>
                <div className="text-xs text-muted-foreground">Focus Time</div>
              </div>
              <div className="bg-background/60 rounded-xl p-3 text-center">
                <Target className="w-5 h-5 text-primary mx-auto mb-1" />
                <div className="text-lg font-bold text-foreground">{statsData.weekSessions}</div>
                <div className="text-xs text-muted-foreground">{pluralize(statsData.weekSessions, 'Session', 'Sessions')}</div>
              </div>
            </div>

            {/* Streak + Badge */}
            <div className="flex items-center justify-between bg-background/60 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                <span className="font-semibold text-foreground">{statsData.streak} day streak</span>
              </div>
              {statsData.topBadge && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xl">{statsData.topBadgeIcon}</span>
                  <span className="text-sm text-muted-foreground">{statsData.topBadge}</span>
                </div>
              )}
            </div>

            {/* Rivly branding */}
            <div className="absolute bottom-2 right-3 text-[10px] text-muted-foreground/50">
              rivly
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Share Card Button */}
            <Button
              onClick={handleShareCard}
              className="w-full h-12 rounded-xl bg-primary"
              disabled={isGeneratingImage}
            >
              {isGeneratingImage ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full"
                />
              ) : (
                <span className="flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  Share Card
                </span>
              )}
            </Button>

            {/* Copy Text Button */}
            <Button
              onClick={handleCopy}
              variant="outline"
              className="w-full h-12 rounded-xl"
              disabled={copied}
            >
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.span
                    key="copied"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Copied!
                  </motion.span>
                ) : (
                  <motion.span
                    key="copy"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Text Summary
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground mt-4">
            Share your progress on social media or with friends
          </p>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
