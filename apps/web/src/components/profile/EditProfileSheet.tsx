import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, MapPin, Clock, Target, CheckCircle2, X, Save } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUserPreferences, UserPreferences } from '@/hooks/useUserPreferences';
import { toast } from 'sonner';

interface EditProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProfileSheet({ open, onOpenChange }: EditProfileSheetProps) {
  const { 
    firstName, 
    tagline, 
    timezone, 
    wakeTime, 
    dailyFocusGoal, 
    dailyTaskGoal,
    updatePreferences 
  } = useUserPreferences();

  const [formData, setFormData] = useState({
    firstName: firstName || '',
    tagline: tagline || '',
    timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    wakeTime: wakeTime || '07:00',
    dailyFocusGoal: dailyFocusGoal || 60,
    dailyTaskGoal: dailyTaskGoal || 5,
  });

  // Sync form when prefs change or sheet opens
  useEffect(() => {
    if (open) {
      setFormData({
        firstName: firstName || '',
        tagline: tagline || '',
        timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        wakeTime: wakeTime || '07:00',
        dailyFocusGoal: dailyFocusGoal || 60,
        dailyTaskGoal: dailyTaskGoal || 5,
      });
    }
  }, [open, firstName, tagline, timezone, wakeTime, dailyFocusGoal, dailyTaskGoal]);

  const handleSave = () => {
    updatePreferences({
      firstName: formData.firstName || null,
      tagline: formData.tagline || null,
      timezone: formData.timezone,
      wakeTime: formData.wakeTime,
      dailyFocusGoal: formData.dailyFocusGoal,
      dailyTaskGoal: formData.dailyTaskGoal,
      hasCompletedProfileSetup: true,
    });
    toast.success('Profile updated');
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="text-left pb-2">
          <SheetTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Edit Profile
          </SheetTitle>
        </SheetHeader>

        <SheetBody className="space-y-5 pb-24">
          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-sm font-medium text-foreground">
              Display Name
            </Label>
            <Input
              id="firstName"
              placeholder="Your name"
              value={formData.firstName}
              onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
              className="h-12 rounded-xl bg-secondary/50 border-border/40"
            />
          </div>

          {/* Tagline */}
          <div className="space-y-2">
            <Label htmlFor="tagline" className="text-sm font-medium text-foreground">
              Tagline <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="tagline"
              placeholder="Focused creator, deep worker..."
              value={formData.tagline}
              onChange={(e) => setFormData(prev => ({ ...prev, tagline: e.target.value.slice(0, 50) }))}
              maxLength={50}
              className="h-12 rounded-xl bg-secondary/50 border-border/40"
            />
            <p className="text-xs text-muted-foreground">{formData.tagline.length}/50</p>
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <Label htmlFor="timezone" className="text-sm font-medium text-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              Timezone
            </Label>
            <Input
              id="timezone"
              value={formData.timezone}
              onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
              placeholder="e.g., America/New_York"
              className="h-12 rounded-xl bg-secondary/50 border-border/40"
            />
            <p className="text-xs text-muted-foreground">
              Current: {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </p>
          </div>

          {/* Wake Time */}
          <div className="space-y-2">
            <Label htmlFor="wakeTime" className="text-sm font-medium text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Wake Time <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="wakeTime"
              type="time"
              value={formData.wakeTime}
              onChange={(e) => setFormData(prev => ({ ...prev, wakeTime: e.target.value }))}
              className="h-12 rounded-xl bg-secondary/50 border-border/40"
            />
          </div>

          {/* Daily Goals */}
          <div className="space-y-4 pt-2">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Daily Goals
            </h4>

            <div className="grid grid-cols-2 gap-3">
              {/* Focus Goal */}
              <div className="space-y-2">
                <Label htmlFor="focusGoal" className="text-xs text-muted-foreground">
                  Focus (minutes/day)
                </Label>
                <Input
                  id="focusGoal"
                  type="number"
                  min={15}
                  max={480}
                  step={15}
                  value={formData.dailyFocusGoal}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    dailyFocusGoal: Math.max(15, Math.min(480, parseInt(e.target.value) || 60))
                  }))}
                  className="h-11 rounded-xl bg-secondary/50 border-border/40"
                />
              </div>

              {/* Task Goal */}
              <div className="space-y-2">
                <Label htmlFor="taskGoal" className="text-xs text-muted-foreground">
                  Tasks (tasks/day)
                </Label>
                <Input
                  id="taskGoal"
                  type="number"
                  min={1}
                  max={20}
                  value={formData.dailyTaskGoal}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    dailyTaskGoal: Math.max(1, Math.min(20, parseInt(e.target.value) || 5))
                  }))}
                  className="h-11 rounded-xl bg-secondary/50 border-border/40"
                />
              </div>
            </div>
          </div>
        </SheetBody>

        <SheetFooter className="flex-row gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-12 rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 h-12 rounded-xl bg-primary"
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
