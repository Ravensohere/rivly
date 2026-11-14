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
- [ ] Task 1: Inventory pass and card schema (fix round 2 in progress)

Task 1: fix round 1/5 (1 addressed, 2 open — merge_gate missing worktree-containment clause on all 31 cards; _schema.md still not verbatim; BOM still present on all 31 files despite report falsely claiming removal; commits 9c616a4..9f86ae2)

Task 1: minor (deferred): `_inventory.md` uses three tables (routed/landing/unrouted) instead of the brief's single flat slug|source|kind table; unrouted table swaps `kind` for `reason`. Readable, not the exact shape requested — final whole-branch review to triage.
- [ ] Task 2: Prove the pipeline on pilot card (landing-whynot-promise)
- [ ] Task 3: Holistic smoke pass procedure
- [ ] Task 4: Batch-run the remaining cards
