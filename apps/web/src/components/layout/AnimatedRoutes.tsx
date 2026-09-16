import { lazy, Suspense } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useAuthContext } from '@/contexts/AuthContext';
import { useOnboarding } from '@/hooks/useOnboarding';

const DayPlanner = lazy(() => import('@/pages/DayPlanner'));
const FocusPage = lazy(() => import('@/pages/FocusPage'));
const ReflectAndJournalPage = lazy(() => import('@/pages/ReflectAndJournalPage'));
const SleepPage = lazy(() => import('@/pages/SleepPage'));
const InsightsPage = lazy(() => import('@/pages/InsightsPage'));
const LandscapePage = lazy(() => import('@/pages/LandscapePage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const AlarmRingingPage = lazy(() => import('@/pages/AlarmRingingPage'));
const AuthCallbackPage = lazy(() => import('@/pages/AuthCallbackPage'));
const CalendarCallbackPage = lazy(() => import('@/pages/CalendarCallbackPage'));
const PrivacyPolicyPage = lazy(() => import('@/pages/PrivacyPolicyPage'));
const TermsOfServicePage = lazy(() => import('@/pages/TermsOfServicePage'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const StudyTogetherPage = lazy(() => import('@/pages/StudyTogetherPage'));
const LearnPage = lazy(() => import('@/pages/LearnPage'));
const OnboardingPage = lazy(() => import('@/pages/OnboardingPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));
const SignupPage = lazy(() => import('@/pages/SignupPage'));
const MobileAppPage = lazy(() => import('@/pages/MobileAppPage'));
const LandingPage = lazy(() => import('@/pages/LandingPage'));

export function AnimatedRoutes() {
  const location = useLocation();
  const { user, loading, isGuest } = useAuthContext();
  const { shouldShowOnboarding } = useOnboarding();

  if (loading) return null;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Suspense fallback={<LoadingScreen />}>
        <Routes location={location} key={location.pathname}>
          {/* Public Routes */}
          <Route
            path="/"
            element={
              (user && !isGuest && !location.search.includes('noredirect=true'))
                ? <Navigate to="/app" replace />
                : <LandingPage />
            }
          />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
          <Route path="/mobile" element={<MobileAppPage />} />

          {/* Auth Routes - Redirect to /app if logged in (but allow guests to access) */}
          <Route path="/login" element={!user || isGuest ? <LoginPage /> : <Navigate to="/app" replace />} />
          <Route path="/signup" element={!user || isGuest ? <SignupPage /> : <Navigate to="/app" replace />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          {/* Public on purpose: the recovery link signs the user in before
              they set a new password, so a !user guard would bounce them
              straight to /app and strand the flow. */}
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          {/* Onboarding - Show for new users who haven't completed */}
          <Route
            path="/onboarding"
            element={
              user && shouldShowOnboarding
                ? <OnboardingPage />
                : <Navigate to="/app" replace />
            }
          />

          {/* Protected Routes - Redirect to /login if not logged in */}
          <Route
            path="/app"
            element={
              user
                ? shouldShowOnboarding
                  ? <Navigate to="/onboarding" replace />
                  : <DayPlanner />
                : <Navigate to="/login" replace />
            }
          />
          <Route path="/focus" element={user ? <FocusPage /> : <Navigate to="/login" replace />} />
          <Route path="/reflect" element={user ? <ReflectAndJournalPage /> : <Navigate to="/login" replace />} />
          <Route path="/journal" element={user ? <ReflectAndJournalPage /> : <Navigate to="/login" replace />} />
          <Route path="/sleep" element={user ? <SleepPage /> : <Navigate to="/login" replace />} />
          <Route path="/insights" element={user ? <InsightsPage /> : <Navigate to="/login" replace />} />
          <Route path="/landscape" element={user ? <LandscapePage /> : <Navigate to="/login" replace />} />
          <Route path="/settings" element={user ? <SettingsPage /> : <Navigate to="/login" replace />} />
          <Route path="/profile" element={user ? <ProfilePage /> : <Navigate to="/login" replace />} />
          <Route path="/alarm/ringing" element={user ? <AlarmRingingPage /> : <Navigate to="/login" replace />} />
          <Route path="/calendar/callback" element={user ? <CalendarCallbackPage /> : <Navigate to="/login" replace />} />
          <Route path="/study" element={user ? <StudyTogetherPage /> : <Navigate to="/login" replace />} />
          <Route path="/learn" element={user ? <LearnPage /> : <Navigate to="/login" replace />} />

          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}
