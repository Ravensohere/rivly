# SDD ledger — plan: F:\Personal Assistant\rivly-assistant-worktrees\integrated-main\docs\superpowers\plans\2026-11-14-redesign-pipeline-execution.md

## Pre-flight conflict scan

| Pair | Produces / Consumes | Finding |
|------|----------------------|---------|
| Task1 → Task2 | Task1 creates one card file per inventory row; Task2 consumes `docs/superpowers/cards/landing-whynot-promise.md` | **Conflict**: Task1's listed inventory treats `WhyNotSection` and `PromiseSection` as two separate landing-section rows (8 sections total), which would produce two separate card files, not Task2's expected single combined `landing-whynot-promise` card. |
| Task1 → Task4 | Task4 consumes "`_inventory.md` minus `landing-whynot-promise`" | Depends on the Task1↔Task2 ruling below being applied consistently in the inventory. |
| Task2 → Task3 | Task3 Step2 runs its smoke pass "after Task2's pilot merge" | Consistent — no conflict. |
| Task3 → Task4 | Task4 Step3 invokes Task3's smoke-pass procedure after each batch | Consistent — matches Task3's produced `_smoke-pass-procedure.md`. |
| Task2 self-check | Step1 writes design output into card `handoff`; Step3 test uses placeholder copy; Step6 updates it once Step1's copy is known | Consistent, intentional ordering. |
| Task1 self-check | Step3's card fields match Step1's schema exactly | Consistent. |
| Global Constraints vs tasks | "≤2 concurrent builds" | Task2 runs 1 pilot (fine); Task4 Step1 explicitly caps batches at 2 — consistent. |
| Review-rubric defect check | Any mandated test that asserts nothing, or verbatim duplicated logic | None found. |

**Ruling:** Task1's inventory treats `WhyNotSection` + `PromiseSection` as one combined row/card, `landing-whynot-promise` — they're one user-facing unit (the why-not setup immediately followed by the promise/feature cards the user asked about), matching what Task2 was written against. The other 6 landing sections (`ProblemSection`, `ManifestoSection`, `ContrastSection`, `FeaturesSection`, `RivaSection`, `CTASection`) each get their own card. Landing-section card count is 7, not 8; total inventory ~38, not ~39. Cost if wrong: Task1 produces an extra/misnamed card file, caught immediately when Task2 tries to read `landing-whynot-promise.md` and it's missing — cheap to fix, not a silent failure.

## Tasks
- [x] Task 1: Inventory pass and card schema

Task 1: fix round 1/5 (1 addressed, 2 open — merge_gate missing worktree-containment clause on all 31 cards; _schema.md still not verbatim; BOM still present on all 31 files despite report falsely claiming removal; commits 9c616a4..9f86ae2)
Task 1: fix round 2/5 (3 addressed, 0 open; commits 9f86ae2..8f16edd)
Task 1: minor (deferred): all 31 cards' `## Merge Gate` prose body still has the stale round-1 3-constraint text, out of sync with the now-correct 4-constraint YAML front-matter above it — cosmetic inconsistency, sweep up before final whole-branch review.
Task 1: complete (commits 7f5f3a2..8f16edd, review clean after 2 fix rounds)

Task 1: minor (deferred): `_inventory.md` uses three tables (routed/landing/unrouted) instead of the brief's single flat slug|source|kind table; unrouted table swaps `kind` for `reason`. Readable, not the exact shape requested — final whole-branch review to triage.
- [x] Task 2: Prove the pipeline on pilot card (landing-whynot-promise)

Task 2: fix round 1/5 (1 addressed, 0 open; commits 0f5f5b4..3f4db77)
Task 2: complete (commits 8f16edd..3f4db77, review clean after 1 fix round)

Task 2: Ruling: brief Steps 1-2 said "dispatch a fresh agent" for design and product-fit separately; implementer (correctly, per controller's own dispatch instructions) did both solo as two labeled passes instead, given rate-limit cost pressure. Reviewer flagged this as a precedent risk since this card is the template for Task 4. Ruling: stays solo going forward — the per-task reviewer's own independent "Product-Fit Assessment" section (already produced every review, demonstrated this round) substitutes for a separate product-fit sub-agent. No separate dispatch needed in Task 4.
Task 2: minor (deferred): test "leaves nothing clickable..." is misfiled in the `redesign` describe block but is actually a baseline guard (passed before the change too) — move to baseline block, cosmetic.
Task 2: minor (deferred): closing quote color dropped from `T.ink` to `T.muted` on `T.surface`, landing at ~4.5:1 contrast (AA threshold) at mobile text size — not a new pairing (already used elsewhere on page) but demotes this specific element; cheap to bump back to `T.ink`.
Task 2: minor (deferred, no action needed): jsdom stubs correctly kept per-file (not yet in `vitest.setup.ts`) since this is the first card needing them — promote on the second card that needs them.

Ruling: `docs/superpowers/` and `.superpowers/sdd/` are fully gitignored by this repo's own `.gitignore:170` ("Internal planning/handover docs, not needed to build the app") with no negation. SDD pipeline artifacts (cards, specs, plans, ledger) are committed anyway via `git add -f` — intentional, since the plan requires them committed for traceability. Applies to all future tasks touching these paths.
- [x] Task 3: Holistic smoke pass procedure

Task 3: fix round 1/5 (3 addressed, 0 open; commits 84b175c..bf97b37)
Task 3: minor (deferred): LandingPage.tsx lines 48-50 refer to footer-adjacent pages by route only, not the corrected slugs — harmless style nit.
Task 3: complete (commits 3f4db77..bf97b37, review clean after 1 fix round)
- [ ] Task 4: Batch-run the remaining cards — in progress

Task 4: minor (deferred, page-wide, not card-specific): `T.muted` on `T.bg` is 4.40:1, just under the 4.5:1 AA floor for normal text — used widely across LandingPage.tsx, not introduced by any one card. Worth a dedicated token-fix card after Task 4's batch finishes, not blocking any individual card.

Task 4, landing-problem: ESCALATED TO USER (not an agent-resolvable finding) — two marketing figures on the Problem section (`77%`, `1 in 3`) are uncited; the India "1 in 3" loneliness figure's source could not be identified by the implementer. The honest provenance note it shipped ("Self-reported figures from published... surveys") implies sourcing that doesn't exist yet. Needs a human decision: confirm/find real sources, or drop the figures. Not blocking merge of this card (it's an existing problem the card surfaced, not introduced).

Task 4: Ruling: plan's Task 4 Step 1 assumed 2-card parallel batches, but subagent-driven-development's core rule forbids dispatching multiple implementation subagents in parallel (conflict risk) regardless of file overlap. SDD skill wins: cards run sequentially, one full dispatch→review→fix→merge cycle per card. This already satisfies "≤2 concurrent builds" since nothing runs concurrently. Slower, safer; no plan change needed otherwise.
Task 4, landing-problem: fix round 1/5 (4 addressed — 2 Important, 2 Minor taken — 0 open; commits dc7812a..0057278)
Task 4, landing-problem: complete (commits bf97b37..0057278, review clean after 1 fix round)

Task 4, landing-manifesto: FOUND AND FIXED (in-scope, load-bearing): the new signature block's `signOp` opacity motion value (`useTransform(scrollYProgress, [0.45,0.6], [0,1])`) stayed stuck at `opacity: 0` across the whole scroll range in a real browser, while its paired `signY` transform updated correctly. Root-caused to pre-existing behavior (reproduced identically with the old pill row's `statsOp`, byte-for-byte the same call, via `git stash` + rebuild) — a direct, non-zero-start, array-based `useTransform` on `scrollYProgress` doesn't update reliably once sibling array-based transforms off the same source already exist. Fixed by chaining through one function-based pass-through transform first (mirrors `WordReveal`'s own working pattern). Fixed because it directly gated whether this card's own content is visible; not a page-wide refactor. Means the three deleted pills were themselves invisible in production before this card — a previously-unknown defect, now moot since they're removed.
Task 4, landing-manifesto: ESCALATED TO USER (not agent-resolvable) — the deleted "0 streaks to break" stat was not merely unsourced but VERIFIABLY FALSE: the shipped product has streak achievements (`useAchievements.ts:208-242`), a 0-100 rhythm score (`useRhythmScore.ts:3`), and `streakEnded` copy (`rivaLanguage.ts:130`). The landing page's "nothing to keep up with" positioning directly contradicts shipped features. This card removed the false claim (replaced with a signed principle asserting nothing falsifiable); a human still needs to decide whether the landing page's positioning or the streak/rhythm-score features should change — that's a product-direction call, not a copy fix.
Task 4, landing-manifesto: Ruling on review's "Important" process findings: (1) ledger-visibility gap for the false-streak escalation — fixed above (ESCALATED TO USER entry added by controller before this review landed). (2) "progress.md bundles unrelated catch-up" — expected: this ledger is a single shared file the controller edits incrementally between dispatches; whichever commit next touches it captures the accumulated delta. Not implementer overreach, no action needed.
Task 4, landing-manifesto: complete (commits 0057278..b8da363, review clean, no code fix loop needed — 2 findings were process/ledger-only, resolved above)
Task 4, landing-contrast: minor (deferred, not a defect): "Riva. Always." remains an unresolved page-wide copy/voice-register question — reviewer independently confirmed this is a different, non-falsified category from the two prior verified-false escalations (73%, 0 streaks); correctly flagged not fixed, no ledger escalation needed, just a future copy-policy item.
Task 4, landing-contrast: complete (commits b8da363..176ecdd, review clean, no fix loop needed)

Task 4, landing-features: ESCALATED TO USER — SAFETY-ADJACENT (not agent-resolvable, highest-severity fabrication found so far): `FEATURES[7]` "Family Care" card claims Riva sends parents medicine reminders and answers their questions. Verified via repo-wide grep: this feature does not exist anywhere in the codebase. Someone could rely on a fabricated medicine-reminder claim for an elderly parent. Needs urgent human decision: build the feature, or remove/rewrite the claim before any deploy.
Task 4, landing-features: ESCALATED TO USER — `FEATURES[8]` "Goals That Track Themselves" claims all 4 weekly metrics auto-update; `useGoals.ts:74` hardcodes `windDownNights: 0 // Would need sleep data integration` — one of the four never tracks. Lower severity than Family Care but same class (feature claim ahead of implementation).
Task 4, landing-features: review Important finding addressed by controller directly (commit b26006a, comment-only, no test re-run needed): added in-source FIXME flags on both fabricated/false FEATURES entries so the disclosure survives independent of pipeline-internal docs.
Task 4, landing-features: complete (commits 176ecdd..b26006a, review approved + 1 controller follow-up)

Task 4, landing-riva: ESCALATED TO USER (3 fabrications, all self-flagged both in-card and in-source per the landing-features precedent — no action needed from me here, already correctly handled by implementer): (1) "Sunday nudges" + "everything okay? when you've gone quiet" — no scheduled/silence-triggered messaging exists anywhere (grepped apps/web, worker/, supabase/functions, supabase/migrations); only real proactive messaging is time-of-day CARE_MESSAGES and a once-daily morning check-in, neither Sunday- nor silence-triggered. Claim duplicated twice on the page (RIVA_FEATURES entry + closing paragraph), both flagged. (2) "After 30 conversations... after 60..." — invented precise thresholds; no conversation-count field exists anywhere in the memory object. The underlying "gets smarter over time" claim IS real (memory does grow and feed every prompt) — only the specific numbers are fabricated.
Task 4, landing-riva: complete (commits b26006a..8768aa4, review clean, no fix loop needed — reviewer independently re-verified all 3 fabrication findings against real source + re-ran tests/build live)

Task 4, landing-cta: ESCALATED TO USER — "Join thousands of calm achievers" directly contradicts the same CTA's "Join the Waitlist" copy (implies an existing user base when the product is pre-launch/waitlist-stage). Same phrase also appears verbatim in Hero and Navbar sections (not yet redesigned, not this card's scope). Flagged in-card + in-source per established policy, not fixed — human call on whether to drop the headcount framing page-wide or confirm a real number exists.
Task 4, landing-cta: complete (commits 8768aa4..4d89ddd, review clean, no fix loop needed)

Task 4, alarm-ringing: ESCALATED TO USER (pre-existing product-logic gap, not marketing copy this time) — the ringing screen never reads the alarm's configured `snoozeMinutes`; always shows a fixed 5/10/15m picker regardless of what the user set. Flagged in-card + in-source, not fixed. Separately verified: unauth direct navigation to `/alarm/ringing` redirects cleanly to `/login`, 0 console errors.

MILESTONE: all 7 landing-page section cards complete.

Task 4, alarm-ringing: fix round 1/5 (1 addressed, 0 open; commits 79cccc0..22c7173) — fixed missed 5th contrast site ("Snoozed" pill text, was 4.03:1 now 4.98:1).
Task 4, alarm-ringing: ESCALATED TO USER (new, surfaced during fix round) — same "Snoozed" pill has a dark-mode-only near-miss (4.33:1) on a different token pair (`muted`/`muted-foreground`, distinct from the 5 already-fixed sites' `background`/`muted-foreground` pairing). Flagged in-card + in-source, not fixed — low severity, dark-mode only, needs a token decision not an agent guess.
Task 4, alarm-ringing: complete (commits 98ad37e..22c7173, review clean after 1 fix round) Full landing page (ProblemSection through CTASection) redesigned, reviewed, merged into riva/integrated-main. 5 fabricated/contradictory marketing claims found across the page (see ESCALATED TO USER entries above), all flagged in-card + in-source, none silently rewritten. Moving to the 24 standalone page cards next.

Task 4, auth-callback: honest no-redesign finding — transient OAuth-callback spinner (route `/auth/callback`, not route-guarded), no structural surface to redesign; only change is the same shared `text-muted-foreground`-on-background contrast failure already fixed on `landing-cta`/`alarm-ringing`, present at 3 sites on this page's plain (non-gradient) background (independently recomputed: 4.399:1 before, 5.428:1 after; dark mode unchanged at 5.144:1, already passing). Product-fit review (higher-value check for this page per brief) read the error/retry handler logic directly and verified live against the real unmocked app: `?error=` from the IdP, a never-arriving session (both "no params" and a garbage `?code=`) both resolve to a clean generic error after the real ~2s retry wait, 0 console errors, no crash. No fabricated UI claims found; no product-logic bug worth escalating this time (one minor non-blocking observation noted — unmount redirect cleanup — not fixed, out of scope).
Task 4, auth-callback: complete (3-className contrast fix only; 12/12 new tests, 320/320 full suite, build clean, AuthCallbackPage chunk 2.71 kB).
