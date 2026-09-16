// Alarms Card - Mobile Exclusive View
import { AlarmClock, Bell, Mail } from 'lucide-react';
import { SleepCard, SleepCardHeader } from './SleepCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isNativeAlarmAvailable } from '@/services/NativeAlarmBridge';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export function AlarmsCard() {
  const navigate = useNavigate();
  const isNative = isNativeAlarmAvailable();
  const [email, setEmail] = useState('');
  const [notified, setNotified] = useState(false);
  
  const handleNotify = () => {
    if (email && email.includes('@')) {
      // Store email for future notification
      localStorage.setItem('rivly_alarm_notification_email', email);
      setNotified(true);
      toast.success("We'll notify you when alarms are available on web!");
    }
  };
  
  if (!isNative) {
    return (
      <SleepCard delay={0.3}>
        <SleepCardHeader 
          icon={<AlarmClock className="w-5 h-5" />}
          title="Alarms"
          subtitle="Wake up with your rhythm"
        />
        <div className="py-4 px-2">
          {notified ? (
            <div className="flex flex-col items-center text-center py-4 space-y-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Bell className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">You're on the list!</p>
              <p className="text-xs text-muted-foreground">
                We'll email you when alarms come to web.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Alarms work best in the mobile app.
              </p>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="text-sm"
                />
                <Button 
                  size="sm"
                  onClick={handleNotify}
                  disabled={!email || !email.includes('@')}
                >
                  <Mail className="w-4 h-4 mr-1" />
                  Notify
                </Button>
              </div>
              <Button 
                variant="link" 
                className="w-full text-xs text-muted-foreground"
                onClick={() => navigate('/mobile')}
              >
                Get the mobile app instead →
              </Button>
            </div>
          )}
        </div>
      </SleepCard>
    );
  }

  // Fallback for native (rarely used here, but kept for completeness)
  return (
    <SleepCard delay={0.3}>
      <SleepCardHeader 
        icon={<AlarmClock className="w-5 h-5" />}
        title="Alarms"
        subtitle="Wake up gently"
      />
      <div className="py-8 text-center text-muted-foreground text-sm">
        Native alarms are active on your device.
      </div>
    </SleepCard>
  );
}
