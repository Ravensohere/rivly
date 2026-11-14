## Task 2: Prove the pipeline on one pilot card (`landing-whynot-promise`)

**Files:**
- Modify: `apps/web/src/pages/LandingPage.tsx:1169-1263` (`WhyNotSection`, `PromiseSection` — the "metrics after why section, feature cards" the user named directly)
- Modify: `docs/superpowers/cards/landing-whynot-promise.md` (state transitions)
- Test: `apps/web/src/pages/__tests__/LandingPage.whynot-promise.test.tsx` (new)

**Interfaces:**
- Consumes: card schema from Task 1 (`docs/superpowers/cards/landing-whynot-promise.md`)
- Produces: the first worked example of the design direction — later cards' design-step prompts are shown this card's before/after as the consistency reference (per Review Focus item 5).

- [ ] **Step 1: Move the card to `running`, dispatch the design step**

Update `landing-whynot-promise.md` `state: running`, `owner: <agent id>`. Dispatch a fresh agent: read current `WhyNotSection`/`PromiseSection` JSX and copy, pick 2-3 concretely-named reference sites whose pattern fits a calm/focus-oriented product (not generic SaaS), and write a specific proposed direction (layout, copy tone, what changes vs. stays) into the card's `handoff` field. No code changes in this step.

- [ ] **Step 2: Dispatch the product-fit step**

Fresh agent reads the design proposal plus the spec's goals/anti-goals plus `grep`s for other files importing `WhyNotSection`/`PromiseSection` (expect none — they're local to `LandingPage.tsx`, confirm this). Returns keep/change/cut feedback into the card, or approves as-is.

- [ ] **Step 3: Write the failing test**

```tsx
// apps/web/src/pages/__tests__/LandingPage.whynot-promise.test.tsx
import { render, screen } from '@testing-library/react';
import LandingPage from '../LandingPage';

test('promise section cards render after the why-not section', () => {
  render(<LandingPage />);
  const whyNot = screen.getByText(/[Ww]hy not/i); // exact copy TBD by design step
  expect(whyNot).toBeInTheDocument();
});
```
(Exact assertion text gets filled in once Step 1's copy is known — this step's job is to lock in "the section renders with findable text," not the literal words.)

- [ ] **Step 4: Run test to verify it fails or passes against current code**

Run: `cd "apps/web" && npx vitest run src/pages/__tests__/LandingPage.whynot-promise.test.tsx`
Expected: passes against *current* unmodified code (establishes baseline before the build step changes anything).

- [ ] **Step 5: Implement the approved design in `LandingPage.tsx`**

Apply the Step 2-approved direction to `WhyNotSection`/`PromiseSection`. Keep the same exported function names and `onChapter` prop contract (`WhyNotSection()` takes no props per current code — confirm this doesn't change, since `LandingLayoutPage` calls it positionally in the section list at line ~1394).

- [ ] **Step 6: Run test to verify it still passes**

Run: `cd "apps/web" && npx vitest run src/pages/__tests__/LandingPage.whynot-promise.test.tsx`
Expected: PASS (update the test's text assertion first if the design step changed the copy, per Step 3's note).

- [ ] **Step 7: Build and interaction check**

Run: `cd "apps/web" && npm run build`
Expected: build succeeds.
Then serve `dist` locally and manually confirm (via browser tooling available) that scrolling to the why-not/promise section actually shows the redesigned cards — not just that the page loads.

- [ ] **Step 8: Update card state to `review`, then `merged`; commit**

```bash
git add apps/web/src/pages/LandingPage.tsx apps/web/src/pages/__tests__/LandingPage.whynot-promise.test.tsx docs/superpowers/cards/landing-whynot-promise.md
git commit -m "feat: redesign why-not/promise landing sections (pilot card)"
```

---

