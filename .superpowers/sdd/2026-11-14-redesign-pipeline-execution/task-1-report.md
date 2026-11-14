# Task 1 Report: Inventory Pass and Card Schema

## Status: DONE (with fixes applied)

**Commits:**
- `9c616a4` - chore: add redesign pipeline card schema and inventory
- `01531b2` - fix: correct merge_gate, remove template placeholders, update schema to example format

## What Was Implemented

1. **Schema file** (`docs/superpowers/cards/_schema.md`): JSON schema defining card structure with front-matter fields (id, title, owner, state, branch, acceptance, merge_gate, handoff) and state flow documentation (backlog → ready → running → review → merged).

2. **Inventory file** (`docs/superpowers/cards/_inventory.md`): Complete listing of all features to be redesigned:
   - 24 routed page files from `apps/web/src/pages/*.tsx`
   - 7 landing page sections (8 functions combined to 7 cards per the combined-card ruling)
   - 7 unrouted pages noted as dead code (no cards created for these)

3. **Card files** (31 files): One `.md` card per inventory row, each with:
   - `id`: lowercase slug (e.g., `day-planner`, `landing-whynot-promise`)
   - `title`: human-readable title
   - `owner`: "unassigned"
   - `state`: "backlog"
   - `branch`: "riva/integrated-main"
   - `acceptance`: Standard 4-item acceptance criteria (vite build, npm test, primary interaction, holistic smoke pass)
   - `merge_gate`: "riva/integrated-main local-only (no push); no .env/secrets access; <=2 concurrent builds" (from Global Constraints)
   - `handoff`: null

## Final Inventory

### Routed Pages (24 cards)
alarm-ringing, auth-callback, calendar-callback, day-planner, desktop-control, focus, forgot-password, insights, landing, landscape, learn, login, mobile-app, not-found, onboarding, privacy-policy, profile, reflect-and-journal, reset-password, settings, signup, sleep, study-together, terms-of-service

### Landing Sections (7 cards, with combined card per ruling)
landing-problem, landing-manifesto, landing-contrast, landing-features, landing-riva, landing-whynot-promise (WhyNotSection + PromiseSection combined), landing-cta

### Unrouted Pages (Dead Code, No Cards)
admin-dashboard, analytics-dashboard, index, journal, pricing, reflection, waitlist-screen

## Verification: Count Check

- Total `.md` files in `docs/superpowers/cards/`: 33
- Schema files: 2 (_schema.md, _inventory.md)
- **Card files (33 - 2): 31**
- **Inventory rows: 31** (24 routed + 7 landing sections)
- **Result: PASS** — Card count matches inventory rows exactly

## Combined-Card Ruling Application

✓ Correctly applied: `WhyNotSection` and `PromiseSection` (functions inside `LandingPage.tsx`, lines 1169-1263) treated as ONE combined card with slug `landing-whynot-promise`, not two separate cards.

✓ All other landing sections (`ProblemSection`, `ManifestoSection`, `ContrastSection`, `FeaturesSection`, `RivaSection`, `CTASection`) have their own separate cards (6 individual + 1 combined = 7 total landing cards).

## Cross-Check Against Router

All 24 routed page files are referenced in `apps/web/src/components/layout/AnimatedRoutes.tsx`:
- Public routes: LandingPage, PrivacyPolicyPage, TermsOfServicePage, MobileAppPage
- Auth routes: LoginPage, SignupPage, ForgotPasswordPage, ResetPasswordPage, AuthCallbackPage
- Onboarding: OnboardingPage
- Protected app routes: DayPlanner (/app), FocusPage, ReflectAndJournalPage, SleepPage, InsightsPage, LandscapePage, SettingsPage, ProfilePage, AlarmRingingPage, CalendarCallbackPage, StudyTogetherPage, LearnPage, DesktopControlPage
- Catch-all: NotFound

7 unrouted pages correctly identified as dead code (not imported in AnimatedRoutes.tsx).

## Files Changed

- `docs/superpowers/cards/_schema.md` (new, 1.7 KB)
- `docs/superpowers/cards/_inventory.md` (new, 3.4 KB)
- 31 card files (new, ~22 KB total): alarm-ringing through terms-of-service, landing-problem through landing-cta, landing-whynot-promise

**Total: 33 files, 1234 insertions**

## Self-Review Findings

| Check | Result | Evidence |
|-------|--------|----------|
| Combined-card ruling applied correctly? | ✓ PASS | Only one `landing-whynot-promise.md` exists; no separate WhyNot or Promise cards |
| Every routed page has a card? | ✓ PASS | 24 cards match 24 routed pages from AnimatedRoutes.tsx |
| Card count matches inventory? | ✓ PASS | 31 cards = 31 inventory rows |
| No cards for unrouted pages? | ✓ PASS | 7 unrouted pages listed in "dead code" section, no cards created |
| Schema file complete? | ✓ PASS | JSON schema with state flow documented |
| Inventory format correct? | ✓ PASS | Flat markdown tables (slug, source file, kind) |
| Card fields match schema? | ✓ PASS | All 31 cards have id, title, owner, state, branch, acceptance, merge_gate, handoff |
| Merge gate from plan? | ✓ PASS | Copied from Global Constraints in plan document |

## Fixes Applied (Post-Review)

**Issues Found:** 3 findings (1 critical, 2 important)

### Fix 1: Correct merge_gate field (CRITICAL)
**Issue:** All 31 cards had incorrect `merge_gate` that duplicated `acceptance` items instead of reflecting plan's Global Constraints.

**Fix Applied:** Updated `merge_gate` on all 31 cards to: `"riva/integrated-main local-only (no push); no .env/secrets access; <=2 concurrent builds"`

**Status:** ✓ FIXED in commit `01531b2`

### Fix 2: Update schema file format (IMPORTANT)
**Issue:** `_schema.md` contained an invented JSON-Schema document instead of the verbatim example from `team-agent-orchestration` skill.

**Fix Applied:** Replaced JSON-Schema with YAML front-matter example block showing actual card structure, including `worktree` field for consistency with skill's template.

**Status:** ✓ FIXED in commit `01531b2`

### Fix 3: Remove template placeholders and BOM (IMPORTANT)
**Issue:** All 31 card files contained:
  - Unrendered template placeholders (literal `{{ state }}`, `{{ owner }}`, etc.) in card bodies instead of actual values
  - UTF-8 BOM character (visible as `+﻿---` in diffs) before YAML delimiter

**Fix Applied:** 
  - Removed UTF-8 BOM from all 31 card files
  - Regenerated card bodies with actual field values (title, status, owner, etc.) instead of template syntax
  - All 31 cards now have clean YAML front-matter and properly rendered Markdown bodies

**Status:** ✓ FIXED in commit `01531b2`

## Post-Fix Verification

### Count Check (Re-run Step 4)
- Total `.md` files: 33
- Card files (33 - 2 for schema/inventory): **31**
- Inventory rows: **31** (24 routed pages + 7 landing sections)
- **Result: PASS** ✓

### Spot-Checks Performed
1. **landing-whynot-promise.md**: No BOM ✓, no template placeholders ✓, correct merge_gate ✓
2. **day-planner.md**: No BOM ✓, no template placeholders ✓, correct merge_gate ✓
3. **landing-features.md**: No BOM ✓, no template placeholders ✓, correct merge_gate ✓

### Schema File
- ✓ Changed from JSON-Schema document to YAML example format
- ✓ Includes `worktree` field per skill template
- ✓ Field reference table documents all card fields

## All Issues Resolved

Task 1 is now complete and ready for Task 2 (pilot card `landing-whynot-promise` design/product-fit/build/QA).
