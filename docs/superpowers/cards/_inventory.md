# Redesign Pipeline Inventory

## Routed Pages (24 pages → 24 cards)

| Slug | Source File | Kind |
|------|-------------|------|
| alarm-ringing | `apps/web/src/pages/AlarmRingingPage.tsx` | page |
| auth-callback | `apps/web/src/pages/AuthCallbackPage.tsx` | page |
| calendar-callback | `apps/web/src/pages/CalendarCallbackPage.tsx` | page |
| day-planner | `apps/web/src/pages/DayPlanner.tsx` | page |
| desktop-control | `apps/web/src/pages/DesktopControlPage.tsx` | page |
| focus | `apps/web/src/pages/FocusPage.tsx` | page |
| forgot-password | `apps/web/src/pages/ForgotPasswordPage.tsx` | page |
| insights | `apps/web/src/pages/InsightsPage.tsx` | page |
| landing | `apps/web/src/pages/LandingPage.tsx` | page |
| landscape | `apps/web/src/pages/LandscapePage.tsx` | page |
| learn | `apps/web/src/pages/LearnPage.tsx` | page |
| login | `apps/web/src/pages/LoginPage.tsx` | page |
| mobile-app | `apps/web/src/pages/MobileAppPage.tsx` | page |
| not-found | `apps/web/src/pages/NotFound.tsx` | page |
| onboarding | `apps/web/src/pages/OnboardingPage.tsx` | page |
| privacy-policy | `apps/web/src/pages/PrivacyPolicyPage.tsx` | page |
| profile | `apps/web/src/pages/ProfilePage.tsx` | page |
| reflect-and-journal | `apps/web/src/pages/ReflectAndJournalPage.tsx` | page |
| reset-password | `apps/web/src/pages/ResetPasswordPage.tsx` | page |
| settings | `apps/web/src/pages/SettingsPage.tsx` | page |
| signup | `apps/web/src/pages/SignupPage.tsx` | page |
| sleep | `apps/web/src/pages/SleepPage.tsx` | page |
| study-together | `apps/web/src/pages/StudyTogetherPage.tsx` | page |
| terms-of-service | `apps/web/src/pages/TermsOfServicePage.tsx` | page |

## Landing Page Sections (8 sections → 7 cards, with WhyNotSection + PromiseSection combined)

| Slug | Source File | Kind |
|------|-------------|------|
| landing-problem | `apps/web/src/pages/LandingPage.tsx` | landing-section |
| landing-manifesto | `apps/web/src/pages/LandingPage.tsx` | landing-section |
| landing-contrast | `apps/web/src/pages/LandingPage.tsx` | landing-section |
| landing-features | `apps/web/src/pages/LandingPage.tsx` | landing-section |
| landing-riva | `apps/web/src/pages/LandingPage.tsx` | landing-section |
| landing-whynot-promise | `apps/web/src/pages/LandingPage.tsx` | landing-section |
| landing-cta | `apps/web/src/pages/LandingPage.tsx` | landing-section |

## Unrouted Pages (dead code, no cards)

| Slug | Source File | Reason |
|------|-------------|--------|
| admin-dashboard | `apps/web/src/pages/AdminDashboard.tsx` | Not referenced in AnimatedRoutes.tsx |
| analytics-dashboard | `apps/web/src/pages/AnalyticsDashboard.tsx` | Not referenced in AnimatedRoutes.tsx |
| index | `apps/web/src/pages/Index.tsx` | Not referenced in AnimatedRoutes.tsx |
| journal | `apps/web/src/pages/JournalPage.tsx` | Redundant; ReflectAndJournalPage handles both /journal and /reflect routes |
| pricing | `apps/web/src/pages/PricingPage.tsx` | Not referenced in AnimatedRoutes.tsx |
| reflection | `apps/web/src/pages/ReflectionPage.tsx` | Redundant; ReflectAndJournalPage handles both routes |
| waitlist-screen | `apps/web/src/pages/WaitlistScreen.tsx` | Not referenced in AnimatedRoutes.tsx |

## Count Verification

- Routed page files: 24
- Landing section cards (with WhyNotSection + PromiseSection combined as 1): 7
- **Total cards expected: 31**
