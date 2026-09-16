
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthContext } from "@/contexts/AuthContext";
import { Hourglass, XCircle, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { getWaitlistStatus, WaitlistStatus } from "@/services/waitlistService";

export function WaitlistScreen() {
  const { signOut, user } = useAuthContext();
  const [status, setStatus] = useState<WaitlistStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const handleSignOut = async () => {
    console.log("Signing out forcefully...");
    try {
      // 1. Attempt normal sign out (React state update)
      await signOut();
      
      // 2. Nuclear option: Clear ALL storage to kill any persisted session
      localStorage.clear();
      sessionStorage.clear();
      
      // 3. Hard reload to landing page
      window.location.href = '/';
    } catch (e) {
      console.error('Sign out failed', e);
      // Fallback: Just clear and reload
      localStorage.clear();
      window.location.href = '/';
    }
  };

  const fetchStatus = async () => {
    if (user?.email) {
      setLoading(true);
      setError(null);
      try {
        // Add timestamp to prevent caching
        const userStatus = await getWaitlistStatus(user.email);
        console.log('WaitlistScreen fetchStatus:', userStatus);
        
        setStatus(userStatus);
        
        if (userStatus === 'approved') {
           window.location.reload();
        }
      } catch (err: any) {
        console.error('WaitlistScreen error:', err);
        setStatus(null); 
        setError(err.message || 'Failed to check status');
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStatus();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8">
            <p className="text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Rejected status
  if (status === 'rejected') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto bg-red-100 dark:bg-red-900/20 rounded-full p-3 mb-4 w-fit">
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl font-bold">Access Not Granted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              Unfortunately, we're unable to grant access to {user?.email} at this time.
            </p>
            <p className="text-muted-foreground mb-8 text-sm">
              If you believe this is an error, please contact our support team.
            </p>
            
            <Button variant="outline" onClick={handleSignOut} className="w-full">
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Deleted or not found in waitlist
  if (status === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto bg-yellow-100 dark:bg-yellow-900/20 rounded-full p-3 mb-4 w-fit">
              <AlertCircle className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <CardTitle className="text-2xl font-bold">Not on Waitlist</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              The account {user?.email} is not registered on our waitlist.
            </p>
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/10 rounded-md text-sm text-red-600 dark:text-red-400">
                <p className="font-semibold">Error checking status:</p>
                <p>{error}</p>
                <p className="text-xs mt-1 opacity-70">
                  URL: {import.meta.env.VITE_WORKER_URL || 'DEFAULT'}
                </p>
              </div>
            )}
            <p className="text-muted-foreground mb-8 text-sm">
              Please sign up for the waitlist to request access.
            </p>
            
            <Button variant="outline" onClick={fetchStatus} className="w-full mb-2">
              Check Again
            </Button>
            
            <Button variant="ghost" onClick={handleSignOut} className="w-full">
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pending status (default)
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="mx-auto bg-muted rounded-full p-3 mb-4 w-fit">
            <Hourglass className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <CardTitle className="text-2xl font-bold">You're on the list!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6">
            Thanks for your interest, {user?.email}! We're rolling out access gradually to ensure the best experience.
          </p>
          <p className="text-muted-foreground mb-8 font-medium">
            We'll email you within 24 hours with your access link.
          </p>
          
            <Button variant="outline" onClick={handleSignOut} className="w-full">
              Sign Out
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
