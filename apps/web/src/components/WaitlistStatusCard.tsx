import { AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface WaitlistStatusCardProps {
  status: 'not_found' | 'pending' | 'approved' | 'rejected';
  message: string;
  email?: string;
}

export function WaitlistStatusCard({ status, message, email }: WaitlistStatusCardProps) {
  const navigate = useNavigate();

  const getStatusConfig = () => {
    switch (status) {
      case 'not_found':
        return {
          icon: AlertCircle,
          iconColor: 'text-orange-500',
          bgColor: 'bg-orange-50 dark:bg-orange-950',
          borderColor: 'border-orange-200 dark:border-orange-800',
          title: 'Join the Waitlist',
          action: (
            <Button 
              onClick={() => navigate('/')} 
              className="mt-4"
            >
              Join Waitlist
            </Button>
          )
        };
      case 'pending':
        return {
          icon: Clock,
          iconColor: 'text-blue-500',
          bgColor: 'bg-blue-50 dark:bg-blue-950',
          borderColor: 'border-blue-200 dark:border-blue-800',
          title: 'Application Pending',
          action: (
            <div className="mt-4 text-sm text-muted-foreground">
              We'll notify you at <strong>{email}</strong> once you're approved
            </div>
          )
        };
      case 'approved':
        return {
          icon: CheckCircle,
          iconColor: 'text-green-500',
          bgColor: 'bg-green-50 dark:bg-green-950',
          borderColor: 'border-green-200 dark:border-green-800',
          title: 'Welcome!',
          action: null // User will be logged in automatically
        };
      case 'rejected':
        return {
          icon: XCircle,
          iconColor: 'text-red-500',
          bgColor: 'bg-red-50 dark:bg-red-950',
          borderColor: 'border-red-200 dark:border-red-800',
          title: 'Application Not Approved',
          action: (
            <Button 
              onClick={() => navigate('/')} 
              variant="outline"
              className="mt-4"
            >
              Return to Home
            </Button>
          )
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <Card className={`max-w-md w-full ${config.bgColor} border-2 ${config.borderColor}`}>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-background flex items-center justify-center">
            <Icon className={`w-8 h-8 ${config.iconColor}`} />
          </div>
          <CardTitle className="text-2xl">{config.title}</CardTitle>
          <CardDescription className="text-base mt-2">
            {message}
          </CardDescription>
        </CardHeader>
        {config.action && (
          <CardContent className="text-center">
            {config.action}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
