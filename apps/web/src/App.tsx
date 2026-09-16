import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { BottomNav } from "@/components/navigation/BottomNav";
import { FloatingFocusTimer } from "@/components/navigation/FloatingFocusTimer";
import { RivaMic } from "@/components/riva/RivaMic";
import { RivaCommandBar } from "@/components/riva/RivaCommandBar";
import { AnimatedRoutes } from "@/components/layout/AnimatedRoutes";
import { RhythmOrbProvider } from "@/contexts/RhythmOrbContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { RivaProvider } from "@/contexts/RivaContext";
import { TimerCompletionProvider } from "@/contexts/TimerCompletionContext";
import { EventsLedgerProvider } from "@/contexts/EventsLedgerContext";
import { FocusTimerProvider } from "@/contexts/FocusTimerContext";
import { CollectiblesProvider, useCollectiblesContext } from "@/contexts/CollectiblesContext";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { App as CapApp } from '@capacitor/app';
import { supabase } from "@/integrations/supabase/client";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

const WaitlistScreen = lazy(() => import("@/pages/WaitlistScreen").then(m => ({ default: m.WaitlistScreen })));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const AnalyticsDashboard = lazy(() => import('@/pages/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard })));
import { getWaitlistStatus, WaitlistStatus } from "@/services/waitlistService";

import { WinddownProvider } from "@/contexts/WinddownContext";
import { CollectibleCelebration } from "@/components/collectibles/CollectibleCelebration";
import { WelcomeModal } from "@/components/onboarding/WelcomeModal";
import { SpotlightTutorial } from "@/components/onboarding/SpotlightTutorial";
import { ProfileOnboarding } from "@/components/onboarding/ProfileOnboarding";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useVisualViewportKeyboardInset } from "@/hooks/useVisualViewportKeyboardInset";
import { useMorningBridgeNudge } from "@/hooks/useMorningBridgeNudge";
import { useMorningRitual } from "@/hooks/useMorningRitual";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { useAuthContext } from "@/contexts/AuthContext";

// Component to handle collectible celebrations at app level
function CollectibleCelebrationHandler() {
  const { currentCelebration, dismissCelebration } = useCollectiblesContext();
  
  return (
    <CollectibleCelebration
      collectible={currentCelebration}
      onDismiss={dismissCelebration}
    />
  );
}

const queryClient = new QueryClient();

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Rivly — your AI life companion',
  '/app': 'Your day',
  '/focus': 'Focus',
  '/learn': 'Learn',
  '/sleep': 'Sleep',
  '/insights': 'Insights',
  '/settings': 'Settings',
  '/landscape': 'Your landscape',
};

function AppContent() {
  // Wire up global keyboard inset detection
  useVisualViewportKeyboardInset();
  
  // Morning Bridge wake window nudge (shows toast once per day when in wake window)
  useMorningBridgeNudge();

  const navigate = useNavigate();
  const location = useLocation();

  // Handle Capacitor Deep Links (for Google Auth redirect back to app)
  useEffect(() => {
    CapApp.addListener('appUrlOpen', async (data: { url: string }) => {
      console.log('App opened with URL:', data.url);
      
      const url = new URL(data.url);
      
      // Handle OS Intents / Shortcuts: com.rivly.app://voice-command
      if (data.url.includes('voice-command')) {
          console.log('[App] Voice shortcut detected, triggering Riva Mic');
          // Dispatch a global event that components (like RivaMic) can listen for
          window.dispatchEvent(new Event('trigger-riva-mic'));
          return;
      }

      // Example URL: com.rivly.in://auth/callback#access_token=...
      const host = url.host; // 'auth'
      const path = url.pathname; // '/callback'
      
      if (host === 'auth' && path === '/callback') {
        const hash = url.hash;
        
        // Extract the access token from the hash to manually set the session
        // This ensures the app logs in immediately even if the callback page takes time
        if (hash) {
          const params = new URLSearchParams(hash.replace('#', '?'));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
          }
        }
        
        navigate(`/auth/callback${hash}`);
      }

    });

    return () => {
      CapApp.removeAllListeners();
    };
  }, [navigate]);


  const {
    shouldShowOnboarding,
    hasCompletedOnboarding,
    completeOnboarding,
    triggerAddTaskNudge,
  } = useOnboarding();

  const { hasCompletedProfileSetup, markProfileSetupComplete, setProfile } = useUserPreferences();
  const { user } = useAuthContext();
  const { doneToday: morningRitualDoneToday } = useMorningRitual();

  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const isAppRoute = location.pathname !== '/' && !location.pathname.startsWith('/admin') && location.pathname !== '/terms' && location.pathname !== '/privacy';
  const showMorningRitual = Boolean(user && hasCompletedOnboarding && !morningRitualDoneToday && isAppRoute);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [waitlistStatus, setWaitlistStatus] = useState<WaitlistStatus | null>(null);
  const [isWaitlistChecking, setIsWaitlistChecking] = useState(false);

  // Sync Supabase user with local profile setup
  useEffect(() => {
    if (user && !hasCompletedProfileSetup) {
      setProfile(user.user_metadata.full_name || user.email?.split('@')[0] || 'User', user.email || '', 'google');
      markProfileSetupComplete();
      setShowProfileSetup(false);
    }
  }, [user, hasCompletedProfileSetup, markProfileSetupComplete, setProfile]);

  // Check waitlist status
  useEffect(() => {
    const checkWaitlist = async () => {
      if (user?.email) {
        setIsWaitlistChecking(true);
        try {
          const status = await getWaitlistStatus(user.email);
          setWaitlistStatus(status);
        } catch (error) {
          console.error("Failed to check waitlist status", error);
        } finally {
          setIsWaitlistChecking(false);
        }
      } else {
        setWaitlistStatus(null);
      }
    };
    
    checkWaitlist();
  }, [user]);

  // App initialization loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Determine what to show on first launch
  useEffect(() => {
    if (isLoading || isWaitlistChecking) return;

    // IMPORTANT: Only show profile setup or onboarding if a user is authenticated
    // This allows unauthenticated users (like Google bot) to see the Landing Page clearly
    if (!user) {
      setShowProfileSetup(false);
      setShowWelcome(false);
      setShowTutorial(false);
      return;
    }
    
    // If pending on waitlist, don't show onboarding
    if (waitlistStatus === 'pending') {
      return;
    }

    // If profile not set up, show profile onboarding first
    // Note: We skip this if user is present because the sync effect handles profile creation
    if (!user && !hasCompletedProfileSetup) {
      setShowProfileSetup(true);
      return;
    }

    // If onboarding is completed, never render/show onboarding UI.
    if (hasCompletedOnboarding) {
      setShowWelcome(false);
      setShowTutorial(false);
      return;
    }

    // Show tutorial for new users or when replayed
    if (shouldShowOnboarding && hasCompletedProfileSetup) {
      const timer = setTimeout(() => setShowWelcome(true), 300);
      return () => clearTimeout(timer);
    }
  }, [shouldShowOnboarding, hasCompletedOnboarding, hasCompletedProfileSetup, isLoading, user, waitlistStatus, isWaitlistChecking]);

  const handleProfileComplete = () => {
    markProfileSetupComplete();
    setShowProfileSetup(false);
    // After profile setup, show app tour
    setTimeout(() => setShowWelcome(true), 300);
  };

  const handleStartTutorial = () => {
    setShowWelcome(false);
    setTimeout(() => setShowTutorial(true), 200);
  };

  const handleSkipOnboarding = () => {
    completeOnboarding();
    setShowWelcome(false);
    setShowTutorial(false);
    setTimeout(() => triggerAddTaskNudge(), 600);
  };

  const handleTutorialComplete = () => {
    completeOnboarding();
    setShowTutorial(false);
    setTimeout(() => triggerAddTaskNudge(), 600);
  };

  if (isLoading || (user && isWaitlistChecking)) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
           key="loading"
           exit={{ opacity: 0 }}
           transition={{ duration: 0.4 }}
        >
          <LoadingScreen />
        </motion.div>
      </AnimatePresence>
    );
  }

  // Waitlist Gate - Only allow approved users or admins
  const ADMIN_EMAILS = ['gnvenkatapathiraju@gmail.com', 'ravenso.here@gmail.com'];
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);

  // Block access if:
  // 1. User is logged in AND
  // 2. User is not an admin AND
  // 3. User is not on the approved list (pending, rejected, or deleted from waitlist) AND
  // 4. Not trying to access admin pages
  if (user && waitlistStatus !== 'approved' && !isAdmin && !location.pathname.startsWith('/admin')) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <WaitlistScreen />
      </Suspense>
    );
  }

  return (
    <ErrorBoundary>
      <EventsLedgerProvider>
        <RhythmOrbProvider>
          <TimerCompletionProvider>
            <FocusTimerProvider>
              <RivaProvider>
                <CollectiblesProvider>
                  <WinddownProvider>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key="app"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4 }}
                        className={location.pathname === '/' ? "w-full min-h-screen p-0 m-0 overflow-visible relative" : "app-shell"}
                      >
                        <a href="#main" className="skip-link">Skip to content</a>
                        <main id="main">
                          {/* Every route needs exactly one h1 for screen-reader navigation.
                              Pages render their own visual headings; this names the route. */}
                          <h1 className="sr-only">{ROUTE_TITLES[location.pathname] ?? 'Rivly'}</h1>
                          <Routes location={location} key={location.pathname}>
                            <Route path="/admin" element={<Suspense fallback={<LoadingScreen />}><AnalyticsDashboard /></Suspense>} />
                            <Route path="/admin/waitlist" element={<Suspense fallback={<LoadingScreen />}><AdminDashboard /></Suspense>} />
                            <Route path="/*" element={<AnimatedRoutes />} />
                          </Routes>
                        </main>

                        {user && location.pathname !== '/' && !location.pathname.startsWith('/admin') && <FloatingFocusTimer />}
                        {user && location.pathname !== '/' && !location.pathname.startsWith('/admin') && <RivaMic />}
                        {user && location.pathname !== '/' && !location.pathname.startsWith('/admin') && <RivaCommandBar />}
                        {user && location.pathname !== '/' && !location.pathname.startsWith('/admin') && <BottomNav />}
                      </motion.div>
                    </AnimatePresence>
                  
                  <CollectibleCelebrationHandler />

                  <ProfileOnboarding
                    open={showProfileSetup}
                    onComplete={handleProfileComplete}
                  />

                  {hasCompletedProfileSetup && !hasCompletedOnboarding && (
                    <WelcomeModal
                      open={showWelcome}
                      onStartTutorial={handleStartTutorial}
                      onSkip={handleSkipOnboarding}
                    />
                  )}

                  {hasCompletedProfileSetup && !hasCompletedOnboarding && (
                    <SpotlightTutorial
                      open={showTutorial}
                      onComplete={handleTutorialComplete}
                    />
                  )}


                </WinddownProvider>
              </CollectiblesProvider>
            </RivaProvider>
          </FocusTimerProvider>
        </TimerCompletionProvider>
      </RhythmOrbProvider>
    </EventsLedgerProvider>
  </ErrorBoundary>
  );
}

const App = () => (
  <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <AppContent />
            </BrowserRouter>
          </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </GoogleOAuthProvider>
);

export default App;
