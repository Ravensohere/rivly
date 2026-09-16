import { motion } from 'framer-motion';
import { 
  Sun, Moon, Monitor, Volume2, Bell, Shield, Info, 
  User, RotateCcw, Trash2, ChevronRight, ChevronDown,
  Heart, ExternalLink, Play, Calendar, LogOut,
  Mail, Check, Move, Brain, Settings
} from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useFocusTimer } from '@/contexts/FocusTimerContext';
import { PageTransition } from '@/components/ui/PageTransition';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTheme, ThemeMode } from '@/hooks/useTheme';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useReflection } from '@/hooks/useReflection';
import { useParkedThoughts } from '@/hooks/useParkedThoughts';
// AudioUrlsSection removed — internal dev panel not shown to users
import { GoogleCalendarSection } from '@/components/settings/GoogleCalendarSection';
import { GoogleAccountSection } from '@/components/settings/GoogleAccountSection';
import { InboxRadarSection } from '@/components/settings/InboxRadarSection';
import { WheelTimePicker, TimePickerTrigger } from '@/components/ui/WheelTimePicker';
import { SOUND_OPTIONS, TIMER_OPTIONS } from '@/types/sleep';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';


interface SettingsSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  delay?: number;
}

function SettingsSection({ title, icon, children, delay = 0 }: SettingsSectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="bg-card rounded-2xl border border-border/40 overflow-hidden"
      style={{ boxShadow: 'var(--shadow-soft)' }}
    >
      <div className="flex items-center gap-3 px-4 py-3 bg-secondary/50 border-b border-border/30">
        <div className="text-primary">{icon}</div>
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>
      <div className="divide-y divide-border/30">{children}</div>
    </motion.section>
  );
}

interface SettingsRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

function SettingsRow({ label, description, children }: SettingsRowProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <div className="flex-1">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="ml-4">{children}</div>
    </div>
  );
}

import { useAuthContext } from '@/contexts/AuthContext';
import { getAvailableLanguages, RivaLanguage } from '@/lib/rivaLanguage';

// ... (other imports remain)

export default function SettingsPage() {
  const navigate = useNavigate();
  const { signOut, user, profile, isGuest, updateProfile: updateAuthProfile } = useAuthContext(); 
  const { themeMode, setTheme } = useTheme();
  const {
    firstName: localFirstName, email: localEmail, authProvider, calendarConnected, calendarLastSync,
    defaultSleepSound, defaultSleepTimer, defaultAutoFade,
    dailyReminderEnabled, dailyReminderTime, windDownReminderEnabled,
    windDownReminderTime, gentleWakeEnabled, updatePreferences, setFirstName: setLocalFirstName,
    connectCalendar, disconnectCalendar, logout: logoutLocal, resetOnboarding: resetUserPrefs,
    rivaLanguage,
  } = useUserPreferences();

  const { resetTutorialOnly, resetOnboarding } = useOnboarding();
  const { clearAllEntries: clearReflections } = useReflection();
  const { clearAllThoughts } = useParkedThoughts();
  const { resetTimerPosition, timerPosition } = useFocusTimer();
  
  const isDefaultPosition = timerPosition.x === 0 && timerPosition.y === 0;
  
  // Derived display values
  const displayName = (!isGuest && user) 
    ? (profile?.name || user.user_metadata?.full_name || localFirstName) 
    : (localFirstName || 'Guest');
    
  const displayEmail = (!isGuest && user) 
    ? user.email 
    : (localEmail || 'guest@rivly.app');

  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(displayName || '');
  const [showDailyTimePicker, setShowDailyTimePicker] = useState(false);
  const [showWindDownTimePicker, setShowWindDownTimePicker] = useState(false);
  const [onlineAiEnabled, setOnlineAiEnabled] = useLocalStorage('rivly_online_ai_enabled', false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Update temp name when display name changes (e.g. after profile load)
  useEffect(() => {
    if (!editingName) {
      setTempName(displayName || '');
    }
  }, [displayName, editingName]);

  const themeOptions: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun className="w-4 h-4" /> },
    { value: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4" /> },
    { value: 'system', label: 'System', icon: <Monitor className="w-4 h-4" /> },
  ];

  const handleSaveName = async () => {
    if (!isGuest && user) {
      await updateAuthProfile({ name: tempName });
    }
    setLocalFirstName(tempName || null);
    setEditingName(false);
    toast.success('Name updated');
  };

  const handleReplayTutorial = () => {
    resetTutorialOnly();
    toast.success('Tutorial will start now');
    // Reload to ensure the App.tsx detects the onboarding state change
    setTimeout(() => window.location.href = '/app', 500);
  };

  const handleResetOnboardingFull = () => {
    if (confirm('This will reset your profile and show the welcome screen again. Continue?')) {
      resetOnboarding();
      resetUserPrefs();
      toast.success('Onboarding reset. Reloading...');
      setTimeout(() => window.location.reload(), 250);
    }
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out?')) {
      try {
        await signOut();
        logoutLocal();
        // Force a hard reload to clear all React state and go to landing page
        window.location.href = '/';
      } catch (err) {
        toast.error('Failed to log out properly');
      }
    }
  };

  return (
    <PageTransition className="pb-32">
      <div className="max-w-lg mx-auto px-4 pt-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Customize your experience</p>
        </motion.div>

        <div className="space-y-5">
          {/* Profile */}
          <SettingsSection title="Profile" icon={<User className="w-5 h-5" />} delay={0.05}>
            <SettingsRow label="Name" description="Used for greetings">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <Input id="profile-name" name="profile-name" type="text" value={tempName} onChange={(e) => setTempName(e.target.value)} className="w-32 text-sm" autoFocus />
                  <Button size="sm" onClick={handleSaveName}>Save</Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => { setTempName(displayName || ''); setEditingName(true); }} className="text-muted-foreground">
                  {displayName || 'Add name'}<ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </SettingsRow>
            <SettingsRow label="Email" description={(!isGuest && user) ? 'Via Google' : 'Local profile'}>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {displayEmail ? <><Mail className="w-4 h-4" /><span className="max-w-[120px] truncate">{displayEmail}</span></> : <span>Not set</span>}
              </div>
            </SettingsRow>
            {(displayName || displayEmail) && (
              <SettingsRow label="Logout" description="Sign out"><Button variant="outline" size="sm" onClick={handleLogout}><LogOut className="w-4 h-4 mr-2" />Logout</Button></SettingsRow>
            )}
          </SettingsSection>

          {/* Account */}
          <SettingsSection title="Account" icon={<Mail className="w-5 h-5" />} delay={0.08}>
            <div className="p-4">
              <GoogleAccountSection />
            </div>
          </SettingsSection>

          {/* Calendar - Uses real Google OAuth integration */}
          <SettingsSection title="Calendar" icon={<Calendar className="w-5 h-5" />} delay={0.1}>
            <div className="p-4">
              <GoogleCalendarSection />
            </div>
          </SettingsSection>

          {/* Inbox Radar */}
          <SettingsSection title="Inbox" icon={<Mail className="w-5 h-5" />} delay={0.14}>
            <InboxRadarSection />
          </SettingsSection>

          {/* Appearance */}
          <SettingsSection title="Appearance" icon={<Sun className="w-5 h-5" />} delay={0.18}>
            <div className="px-4 py-3.5">
              <span className="text-sm font-medium text-foreground block mb-3">Theme</span>
              <div className="flex gap-2">
                {themeOptions.map((option) => (
                  <motion.button key={option.value} onClick={() => setTheme(option.value)} whileTap={{ scale: 0.95 }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${themeMode === option.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                    {option.icon}{option.label}
                  </motion.button>
                ))}
              </div>
            </div>
            <SettingsRow label="Focus Timer Position" description="Reset draggable timer to center">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => { resetTimerPosition(); toast.success('Timer position reset'); }}
                disabled={isDefaultPosition}
              >
                <Move className="w-4 h-4 mr-2" />Reset
              </Button>
            </SettingsRow>
          </SettingsSection>

          {/* Sound & Sleep */}
          <SettingsSection title="Sound & Sleep" icon={<Volume2 className="w-5 h-5" />} delay={0.23}>
            <SettingsRow label="Default Sound"><select id="default-sleep-sound" name="default-sleep-sound" value={defaultSleepSound || ''} onChange={(e) => updatePreferences({ defaultSleepSound: e.target.value || null })} className="text-sm bg-secondary text-foreground rounded-lg px-3 py-1.5 border border-border/30"><option value="">None</option>{SOUND_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></SettingsRow>
            <SettingsRow label="Default Timer"><select id="default-sleep-timer" name="default-sleep-timer" value={defaultSleepTimer || ''} onChange={(e) => updatePreferences({ defaultSleepTimer: e.target.value ? Number(e.target.value) : null })} className="text-sm bg-secondary text-foreground rounded-lg px-3 py-1.5 border border-border/30">{TIMER_OPTIONS.map((o) => <option key={o.label} value={o.value || ''}>{o.label}</option>)}</select></SettingsRow>
            <SettingsRow label="Auto-fade"><Switch checked={defaultAutoFade} onCheckedChange={(c) => updatePreferences({ defaultAutoFade: c })} /></SettingsRow>
          </SettingsSection>

          {/* Intelligence */}
          <SettingsSection title="Voice & Assistant" icon={<Brain className="w-5 h-5" />} delay={0.25}>
             <SettingsRow
                label="Language"
                description="Choose Riva's speaking language"
            >
              <div className="flex gap-1.5">
                {getAvailableLanguages().map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => updatePreferences({ rivaLanguage: lang.id })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      rivaLanguage === lang.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>
            </SettingsRow>
             <SettingsRow
                label="Voice Persona"
                description="Choose your AI companion's voice"
            >
              <div className="flex flex-col items-end gap-1">
                <select
                    id="voice-persona"
                    name="voice-persona"
                    value={
                        // @ts-ignore - voiceId added to prefs
                        (useUserPreferences() as any).voiceId || 'meera'
                    }
                    onChange={(e) => updatePreferences({
                        // @ts-ignore
                        voiceId: e.target.value
                    })}
                    className="text-sm bg-secondary text-foreground rounded-lg px-3 py-1.5 border border-border/30"
                >
                    <option value="meera">Meera (Female)</option>
                    <option value="arvind">Arvind (Male)</option>
                    <option value="ishita">Ishita (Energetic)</option>
                </select>
                <span className="text-xs text-muted-foreground/60">Voice uses credits</span>
              </div>
            </SettingsRow>
             <SettingsRow
                label="AI Companion (optional)"
                description="Your data stays private. You can use Rivly without AI."
            >
                <Switch
                    checked={onlineAiEnabled}
                    onCheckedChange={setOnlineAiEnabled}
                />
            </SettingsRow>
          </SettingsSection>

          {/* Advanced section intentionally removed from user-facing UI */}

          {/* Notifications */}
          <SettingsSection title="Notifications" icon={<Bell className="w-5 h-5" />} delay={0.28}>
            <SettingsRow label="Daily Reminder"><Switch checked={dailyReminderEnabled} onCheckedChange={(c) => updatePreferences({ dailyReminderEnabled: c })} /></SettingsRow>
            {dailyReminderEnabled && <SettingsRow label="Time"><TimePickerTrigger value={dailyReminderTime} onClick={() => setShowDailyTimePicker(true)} /><WheelTimePicker open={showDailyTimePicker} onOpenChange={setShowDailyTimePicker} value={dailyReminderTime} onChange={(v) => updatePreferences({ dailyReminderTime: v })} title="Reminder" /></SettingsRow>}
            <SettingsRow label="Wind Down"><Switch checked={windDownReminderEnabled} onCheckedChange={(c) => updatePreferences({ windDownReminderEnabled: c })} /></SettingsRow>
            {windDownReminderEnabled && <SettingsRow label="Time"><TimePickerTrigger value={windDownReminderTime} onClick={() => setShowWindDownTimePicker(true)} /><WheelTimePicker open={showWindDownTimePicker} onOpenChange={setShowWindDownTimePicker} value={windDownReminderTime} onChange={(v) => updatePreferences({ windDownReminderTime: v })} title="Wind Down" /></SettingsRow>}
            <SettingsRow label="Gentle Wake"><Switch checked={gentleWakeEnabled} onCheckedChange={(c) => updatePreferences({ gentleWakeEnabled: c })} /></SettingsRow>
          </SettingsSection>

          {/* Tutorial */}
          <SettingsSection title="Tutorial" icon={<Play className="w-5 h-5" />} delay={0.33}>
            <SettingsRow label="Replay Tutorial"><Button variant="outline" size="sm" onClick={handleReplayTutorial}><Play className="w-4 h-4 mr-2" />Replay</Button></SettingsRow>
            <SettingsRow label="Reset Onboarding"><Button variant="outline" size="sm" onClick={handleResetOnboardingFull}><RotateCcw className="w-4 h-4 mr-2" />Reset</Button></SettingsRow>
          </SettingsSection>

          {/* Privacy */}
          <SettingsSection title="Privacy" icon={<Shield className="w-5 h-5" />} delay={0.38}>
            <SettingsRow label="Clear Reflections">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => { 
                  if(confirm('Clear all reflections? This cannot be undone.')) { 
                    // Direct access to ensure it works
                    window.localStorage.removeItem('dailyRhythm_reflections');
                    // Also try setting to empty array just in case
                    window.localStorage.setItem('dailyRhythm_reflections', '[]');
                    toast.success('Cleared. Reloading...');
                    setTimeout(() => window.location.reload(), 500);
                  }
                }} 
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />Clear
              </Button>
            </SettingsRow>
            <SettingsRow label="Clear Thoughts">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={async () => { 
                  if(confirm('Clear all thoughts? This cannot be undone.')) { 
                    try {
                      await clearAllThoughts();
                      toast.success('All thoughts cleared');
                    } catch (e) {
                      // Fallback handled in hook, but good to have safety
                      toast.error('Failed to clear thoughts');
                    }
                  }
                }} 
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />Clear
              </Button>
            </SettingsRow>
          </SettingsSection>

          {/* Legal */}
          <SettingsSection title="Legal" icon={<Shield className="w-5 h-5" />} delay={0.48}>
            <SettingsRow label="Privacy Policy" description="How we handle your data">
              <Button variant="ghost" size="sm" onClick={() => navigate('/privacy')} className="text-muted-foreground">
                View<ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </SettingsRow>
            <SettingsRow label="Terms of Service" description="Rules for using Rivly">
              <Button variant="ghost" size="sm" onClick={() => navigate('/terms')} className="text-muted-foreground">
                View<ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </SettingsRow>
          </SettingsSection>

          {/* About */}
          <SettingsSection title="About" icon={<Info className="w-5 h-5" />} delay={0.53}>
            <div className="px-4 py-4 text-center">
              <motion.div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-3" animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 3, repeat: Infinity }}><Heart className="w-8 h-8 text-primary" /></motion.div>
              <h4 className="font-semibold text-foreground">Rivly</h4>
              <p className="text-xs text-muted-foreground mb-4">Version 1.0.0</p>
            </div>
          </SettingsSection>
        </div>
      </div>
    </PageTransition>
  );
}
