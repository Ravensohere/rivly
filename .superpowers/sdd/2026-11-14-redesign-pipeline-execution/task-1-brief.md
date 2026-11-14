## Task 1: Inventory pass and card schema

**Files:**
- Create: `docs/superpowers/cards/_schema.md`
- Create: `docs/superpowers/cards/_inventory.md`
- Create: `docs/superpowers/cards/<slug>.md` — one per inventory entry (count determined by this task; expect ~39: 31 files under `apps/web/src/pages/*.tsx` plus 8 `LandingPage.tsx` section functions: `ProblemSection`, `ManifestoSection`, `ContrastSection`, `FeaturesSection`, `RivaSection`, `WhyNotSection`, `PromiseSection`, `CTASection`)

**Interfaces:**
- Produces: `docs/superpowers/cards/<slug>.md` files, each with front-matter fields `id`, `title`, `owner`, `state`, `branch`, `acceptance` (list), `merge_gate` (string), `handoff` (string|null) — Task 2+ read and update these fields by `id`.

- [ ] **Step 1: Write the card schema file**

`docs/superpowers/cards/_schema.md` — copy the JSON card schema from the `team-agent-orchestration` skill verbatim as the template, with a one-line note that `state` moves backlog→ready→running→review→merged (no `blocked`/`archived` expected in normal flow, but valid if a card hits one).

- [ ] **Step 2: Build and cross-check the inventory**

List every file matching `apps/web/src/pages/*.tsx` (Glob). Separately list every top-level `function ...Section(...)` in `apps/web/src/pages/LandingPage.tsx` (Grep `^function \w+Section`). Cross-check the page list against `apps/web/src/components/layout/AnimatedRoutes.tsx` (or wherever the router lives) — every page file must have a matching route; any that doesn't gets a note in `_inventory.md` instead of a card (it's dead code, out of scope for a redesign card). Write the final list to `_inventory.md` as a flat table: slug, source file, kind (`page`|`landing-section`).

- [ ] **Step 3: Generate one card file per inventory row**

For each row in `_inventory.md`, create `docs/superpowers/cards/<slug>.md` using the Task 1 Step 1 schema: `owner: "unassigned"`, `state: "backlog"`, `branch: "riva/integrated-main"`, `acceptance: ["vite build passes", "npm test passes", "primary interaction verified", "no shared-component regression in holistic smoke pass"]`, `merge_gate` copied from this plan's Global Constraints, `handoff: null`.

- [ ] **Step 4: Verify count**

Run: count of files in `docs/superpowers/cards/` matching `*.md` minus the 2 (`_schema.md`, `_inventory.md`) equals the number of rows in `_inventory.md`'s table.
Expected: equal.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/cards/
git commit -m "chore: add redesign pipeline card schema and inventory"
```

---

