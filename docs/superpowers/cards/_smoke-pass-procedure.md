# Holistic Smoke Pass Procedure

**Scope:** This procedure documents how to verify that a batch of merged redesign cards has not introduced regressions across the app.

**When to run:** After each batch of cards merges to `riva/integrated-main` (typically triggered by Task 4 after running batch implementation).

**What it checks:**
- Every routed page in the inventory loads without console errors
- Signature content (page-specific UI elements) is present on each page
- Special attention to pages sharing layout/nav components with pages the batch touched (to catch cross-page regressions)

---

## Procedure: Full Smoke Pass

### Setup (run once per batch)

1. **Build the app**
   ```bash
   cd apps/web
   npm run build
   ```
   If the build fails, stop here and report. The batch cannot be tested without a passing build.

2. **Serve dist locally**
   ```bash
   # From apps/web
   npm install -g serve  # if not already installed
   serve -s dist -p 4178
   ```
   The app is now available at `http://localhost:4178`.

3. **Open browser dev tools**
   - Open Chrome/Edge DevTools (F12 or Ctrl+Shift+I)
   - Go to **Console tab**
   - Note: you will see many warnings (auth redirects, missing permissions, etc. on protected routes) — only flag **errors** (red text)

### Test Each Page

For every page in `_inventory.md`, visit it and verify:

1. **Page loads** (no timeout, doesn't redirect to 404)
2. **No console errors** (red text in console; warnings are OK)
3. **Signature content is visible** — see table below for what to look for on each page

**Key rule: Check pages adjacent to those the batch touched.**

If a batch modified `LandingPage`, also verify:
- `/privacy`, `/terms`, `/mobile` (linked from LandingPage footer, share navigation context)
- Any page that imports shared layout/nav components (see "Shared Components" section below)

**Signature content checklist:**

| Page Slug | Route | Signature Content | Notes |
|-----------|-------|-------------------|-------|
| landing | `/` | All 8 sections visible in order: Problem, Manifesto, Contrast, Features, Riva, WhyNot, Promise, CTA | After recent changes: verify WhyNot shows message specimen (not text declamation) and Promise shows 3 ruled rows (not cards) |
| privacy | `/privacy` | Page title "Privacy Policy" visible | Public page, no auth needed |
| terms | `/terms` | Page title "Terms of Service" visible | Public page, no auth needed |
| mobile | `/mobile` | Page title or "Mobile App" heading visible | Public page, no auth needed |
| login | `/login` | "Log in" heading and email input field visible | Public page, no auth needed |
| signup | `/signup` | "Sign up" heading and email input field visible | Public page, no auth needed |
| forgot-password | `/forgot-password` | "Forgot password" heading and email input visible | Public page, no auth needed |
| reset-password | `/reset-password` | "Reset password" heading or password input visible | Public page, no auth needed |
| auth-callback | `/auth/callback` | Page attempts OAuth redirect (may show loading state, that's OK) | Public route, typically auto-redirects |

**For protected routes** (require login, only test if you have a valid session):
- Try visiting `/app`, `/focus`, `/reflect`, `/settings`, `/profile`, etc.
- They may redirect to `/login`, which is expected
- If you have a test account, log in and spot-check one protected route (e.g., `/app` → DayPlanner) for signature content

### Record Results

In this document's **Change Log** section (see below), append an entry documenting:
- Batch ID (e.g., "Batch 1", or the card name if single-card)
- Date tested
- Tested pages (which routes you actually visited)
- Any console errors found (list them with the route where they appeared)
- Any missing signature content (list which pages had issues)
- Overall result: PASS / FAIL

---

## Shared Components

The following components appear across multiple pages and are targets for regression checking:

- **SEO** — meta tags for page title/description
- **Footer** (LandingPage.tsx) — links to `/privacy`, `/terms`, `/mobile`
- **NavLink** / **navigation-menu** — used by some pages for breadcrumbs or inline links

If a batch touches any of these, re-test the pages that import them.

---

## Change Log

### Test Run: Pilot Card (landing-whynot-promise)

**Date:** 2026-11-15

**Batch:** Pilot card: `landing-whynot-promise` (merged to `riva/integrated-main`)

**Tested Routes:**
- `/` (Landing Page) — PRIMARY FOCUS
- `/privacy` (linked from footer)
- `/terms` (linked from footer)
- `/mobile` (linked from footer)
- `/login` (adjacent public page)
- `/signup` (adjacent public page)

**Signature Content Check:**

**Landing Page (`/`):**
- ✓ All 8 sections render in order: Problem, Manifesto, Contrast, Features, Riva, WhyNot, Promise, CTA
- ✓ WhyNot section shows two-panel specimen (message bubble left, disabled prompt field right) — NEW in this batch
- ✓ Promise section shows 3 ruled ledger rows with indices 01/02/03 — NEW in this batch (previously 3 cards in grid)
- ✓ Chapter labels present throughout
- ✓ Footer visible with links to Privacy, Terms, Mobile

**Adjacent Pages:**
- ✓ `/privacy` — "Privacy Policy" heading visible
- ✓ `/terms` — "Terms of Service" heading visible
- ✓ `/mobile` — "Mobile App" heading visible
- ✓ `/login` — "Log in" heading, email input visible
- ✓ `/signup` — "Sign up" heading, email input visible

**Console Errors:** 0 errors detected on any page

**Result:** ✅ PASS — No regressions detected. Pilot card renders correctly, adjacent pages unaffected.

---

