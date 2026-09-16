// Alarm Editor Sheet - Bottom sheet with full scrolling

import { useState } from 'react';
import { Vibrate } from 'lucide-react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetBody,
  SheetFooter,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WheelTimePicker, TimePickerTrigger } from '@/components/ui/WheelTimePicker';
import { Alarm, AlarmType, AlarmRepeat, GENTLE_SOUNDS, REGULAR_SOUNDS, DAYS_OF_WEEK } from '@/types/sleep';

interface AlarmEditorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alarm?: Alarm;
  onSave: (alarm: Omit<Alarm, 'id'>) => void;
}

const ALARM_TYPES: { id: AlarmType; label: string }[] = [
  { id: 'gentle', label: 'Gentle' },
  { id: 'regular', label: 'Regular' },
  { id: 'focus', label: 'Focus' },
];

const REPEAT_OPTIONS: { id: AlarmRepeat; label: string }[] = [
  { id: 'once', label: 'One-time' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekdays', label: 'Weekdays' },
  { id: 'custom', label: 'Custom' },
];

export function AlarmEditorSheet({ open, onOpenChange, alarm, onSave }: AlarmEditorSheetProps) {
  const [form, setForm] = useState({
    time: alarm?.time || '07:00',
    label: alarm?.label || '',
    type: alarm?.type || 'gentle' as AlarmType,
    repeat: alarm?.repeat || 'once' as AlarmRepeat,
    customDays: alarm?.customDays || [1, 2, 3, 4, 5],
    sound: alarm?.sound || 'morning-breeze',
    fadeInSeconds: alarm?.fadeInSeconds || 60,
    snoozeMinutes: alarm?.snoozeMinutes || 10,
    enabled: alarm?.enabled ?? true,
    vibration: alarm?.vibration ?? true,
  });
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // Reset form when alarm changes
  useState(() => {
    if (alarm) {
      setForm({
        time: alarm.time,
        label: alarm.label || '',
        type: alarm.type,
        repeat: alarm.repeat,
        customDays: alarm.customDays || [1, 2, 3, 4, 5],
        sound: alarm.sound,
        fadeInSeconds: alarm.fadeInSeconds,
        snoozeMinutes: alarm.snoozeMinutes,
        enabled: alarm.enabled,
        vibration: alarm.vibration ?? true,
      });
    }
  });
  
  const sounds = form.type === 'gentle' ? GENTLE_SOUNDS : REGULAR_SOUNDS;
  
  const handleSave = () => {
    onSave(form);
    onOpenChange(false);
  };
  
  const toggleCustomDay = (dayId: number) => {
    setForm(f => ({
      ...f,
      customDays: f.customDays.includes(dayId)
        ? f.customDays.filter(d => d !== dayId)
        : [...f.customDays, dayId].sort((a, b) => a - b),
    }));
  };
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="bg-card border-border"
      >
        <SheetHeader>
          <SheetTitle className="text-foreground">
            {alarm ? 'Edit Alarm' : 'New Alarm'}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Edit the details of your alarm.
          </SheetDescription>
        </SheetHeader>
        
        <SheetBody>
          <div className="space-y-5 py-2">
            {/* Time */}
            <div className="space-y-2">
              <Label className="text-foreground">Time</Label>
              <TimePickerTrigger
                value={form.time}
                onClick={() => setShowTimePicker(true)}
                className="w-full h-14 text-2xl justify-center"
              />
              <WheelTimePicker
                open={showTimePicker}
                onOpenChange={setShowTimePicker}
                value={form.time}
                onChange={(value) => setForm(f => ({ ...f, time: value }))}
                title="Alarm Time"
              />
            </div>
            
            {/* Label */}
            <div className="space-y-2">
              <Label className="text-foreground">Label (optional)</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm(f => ({ ...f, label: e.target.value }))}
                placeholder="Morning routine..."
                className="bg-secondary border-border"
              />
            </div>
            
            {/* Alarm Type */}
            <div className="space-y-2">
              <Label className="text-foreground">Type</Label>
              <div className="flex gap-2">
                {ALARM_TYPES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setForm(f => ({ ...f, type: t.id }))}
                    className={`
                      flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 border
                      ${form.type === t.id 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-secondary text-muted-foreground border-border hover:bg-secondary/80'}
                    `}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Repeat */}
            <div className="space-y-2">
              <Label className="text-foreground">Repeat</Label>
              <div className="flex gap-2 flex-wrap">
                {REPEAT_OPTIONS.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setForm(f => ({ ...f, repeat: r.id }))}
                    className={`
                      flex-1 min-w-[70px] py-2.5 rounded-xl text-sm font-medium transition-all duration-300 border
                      ${form.repeat === r.id 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-secondary text-muted-foreground border-border hover:bg-secondary/80'}
                    `}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Custom Days */}
            {form.repeat === 'custom' && (
              <div className="space-y-2">
                <Label className="text-foreground">Days</Label>
                <div className="flex gap-1.5">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day.id}
                      onClick={() => toggleCustomDay(day.id)}
                      className={`
                        flex-1 h-10 rounded-full text-sm font-medium transition-all duration-300
                        ${form.customDays.includes(day.id)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-muted-foreground border border-border hover:bg-secondary/80'}
                      `}
                    >
                      {day.short}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Sound */}
            <div className="space-y-2">
              <Label className="text-foreground">Sound</Label>
              <Select value={form.sound} onValueChange={(v) => setForm(f => ({ ...f, sound: v }))}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-[200]">
                  {sounds.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Fade In (gentle only) */}
            {form.type === 'gentle' && (
              <div className="space-y-2">
                <Label className="text-foreground">Fade in</Label>
                <div className="flex gap-2">
                  {[30, 60, 120].map((sec) => (
                    <button
                      key={sec}
                      onClick={() => setForm(f => ({ ...f, fadeInSeconds: sec }))}
                      className={`
                        flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-300 border
                        ${form.fadeInSeconds === sec 
                          ? 'bg-primary text-primary-foreground border-primary' 
                          : 'bg-secondary text-muted-foreground border-border hover:bg-secondary/80'}
                      `}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Snooze */}
            <div className="space-y-2">
              <Label className="text-foreground">Snooze</Label>
              <div className="flex gap-2">
                {[5, 10, 15].map((min) => (
                  <button
                    key={min}
                    onClick={() => setForm(f => ({ ...f, snoozeMinutes: min }))}
                    className={`
                      flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-300 border
                      ${form.snoozeMinutes === min 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-secondary text-muted-foreground border-border hover:bg-secondary/80'}
                    `}
                  >
                    {min} min
                  </button>
                ))}
              </div>
            </div>
            
            {/* Vibration Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-secondary border border-border">
              <div className="flex items-center gap-3">
                <Vibrate className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-foreground font-medium text-sm">Vibration</p>
                  <p className="text-muted-foreground text-xs">Vibrate when alarm rings</p>
                </div>
              </div>
              <Switch
                checked={form.vibration}
                onCheckedChange={(checked) => setForm(f => ({ ...f, vibration: checked }))}
              />
            </div>
          </div>
        </SheetBody>
        
        <SheetFooter>
          <Button onClick={handleSave} className="w-full">
            Save Alarm
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
