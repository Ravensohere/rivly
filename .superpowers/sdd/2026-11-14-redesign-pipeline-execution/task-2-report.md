# Task 2 report — pilot card `landing-whynot-promise`

Worked solo (no subagents). The brief's Step 1 (design) and Step 2 (product-fit)
were run as two distinct, explicitly separated passes and both are recorded in
the card's `handoff` field as `PASS 1` / `PASS 2`, so the record is honest that
one agent did both.

Commit: **`d5d4641` feat: redesign why-not/promise landing sections (pilot card)**

---

## 1. Design direction proposed (PASS 1)

### What was there

- `WhyNotSection` (was `LandingPage.tsx:1169-1185`) — a centred block of giant
  serif type: *"ChatGPT answers when you ask. / Gemini answers when you ask. /
  Riva shows up before you do."*, then a second centred italic shout. No chapter
  marker, unlike every other section on the page.
- `PromiseSection` (was `:1190-1259`) — 280vh sticky shell, scroll-driven
  `WordReveal` headline, then three **icon + title + description cards** with
  border, fill, 22px radius and `whileHover={{ y: -5 }}`, then a tinted quote box.

### The two defects the redesign removes (not "it looks dated")

1. **The WhyNot copy was a near-verbatim repeat.** `ProblemSection` already
   closes, 600 lines earlier (`LandingPage.tsx:611`), with *"Every AI answers
   when you ask. Riva shows up before you do. That's the difference."* WhyNot
   said it again, louder, with competitor names attached. A calm product
   repeating its own differentiator twice in one scroll reads anxious; naming
   ChatGPT/Gemini to argue with them reads defensive.
2. **The Promise cards were the page's third icon-card grid** —
   `FeaturesSection` has one, `RivaSection` has one (`:1140`), `PromiseSection`
   had one. That repetition is what made the lower page read "generic SaaS": the
   page had exactly two registers (giant display type, icon cards) and nothing
   between them.

### The direction

**A. `WhyNotSection` → "the message you didn't have to send."** Replace the
declamation with the thing itself, side by side: an **inert prompt specimen**
(empty field, "Ask me anything…", mono caption "waits for you to type") against
a **message that already arrived** (indigo bubble, *"Didn't see your check-in
this morning. Rough start, or just a slow one?"*, stamp "08:41 · she messaged
first"). An `Interlude · The difference` label joins the chapter spine the
section was skipping — without renumbering chapters, which would mean touching
the `IntersectionObserver` map and `ChapterLabel`, outside this card. The one
line worth keeping ("That's not a feature difference. That's a relationship
difference.") survives as a small left-aligned coda under a hairline — said
once, quietly. This adds the page's missing **third register: a product
specimen**; the page previously contained zero UI of the actual product.

**B. `PromiseSection` → ledger rows, not a card grid.** Keeps the 280vh sticky
shell, `id="promise"`, the chapter label, the `WordReveal` headline and the
`showCards` scroll gate. The three cards become three **hairline-ruled rows**:
mono index `01/02/03`, a low-opacity indigo glyph (reuses the existing
`Sun`/`Moon`/`Wind` imports), title in a fixed-width column so descriptions
align, one line of copy. No box, no fill, no hover lift — nothing on a page
about rest should jump 5px at the cursor. The closing quote keeps its words and
loses the tinted panel. Copy loses its sales clauses ("Distraction-aware. Flow
starts here." → "Nothing else asking for you."; "You earned this." → "no earning
it first").

### Reference sites cited, and why these three

1. **Things — culturedcode.com/things.** The calmest well-known productivity
   site: it argues by showing one real, quietly-framed screen of the product
   rather than a grid of capability cards. Direct model for A — the dead prompt
   field vs. the message that already arrived *is* the argument, so no slogan
   has to make it.
2. **Stripe Press — press.stripe.com.** Editorial register built from hairline
   rules, mono numerals and left-aligned rows with generous whitespace, almost
   no filled containers. Direct model for B's ruled ledger and for the
   small-type/large-type contrast the page lacked. Chosen over Linear, whose
   restraint is admirable but whose card-and-gradient vocabulary is exactly the
   "generic SaaS dashboard" look the spec's design step rules out.
3. **iA Writer — ia.net/writer.** Makes the product's own text the hero and lets
   type weight plus a single accent colour carry hierarchy where other sites
   reach for icons. Model for the indigo/muted type pairing in A and for
   demoting B's icons to a quiet glyph instead of the card's lead element.

---

## 2. Product-fit review (PASS 2)

Reviewed against `docs/superpowers/specs/2026-11-14-full-app-redesign-pipeline-design.md`.

### Cross-file impact — actual grep output

```
$ grep -rn "WhyNotSection|PromiseSection" .            (repo-wide, node_modules excluded)
apps/web/src/pages/LandingPage.tsx:1169:function WhyNotSection() {
apps/web/src/pages/LandingPage.tsx:1190:function PromiseSection({ onChapter }: { onChapter: (n: number) => void }) {
apps/web/src/pages/LandingPage.tsx:1394:        <WhyNotSection />
apps/web/src/pages/LandingPage.tsx:1395:        <PromiseSection onChapter={onChapter} />
```

4 hits, all in the one file: two definitions, two call sites. **Neither
component is exported** — no cross-page impact, confirmed, not assumed.

A second grep for `why-not|#promise|"Not here to optimise"|"relationship
difference"|"Space to focus"` across `apps/` and `docs/` returned only: the
section's own `id="why-not"`, the `Footer` link `{ l: 'Promise', h: '#promise' }`
in the same file, and the plan/brief docs. The `Navbar` builds `#promise` from
its `Promise` label (`:369-370`), and the chapter `IntersectionObserver` keys
`'promise': 6` on that id — so **both ids are load-bearing and were kept**.

### Against goals / anti-goals

- ✅ Named reference inspiration, each tied to a specific decision; stays inside
  one card's file region; ends in a working build, not a mockup.
- The binding anti-goal is *"ending this pass with the UI looking 'different'
  rather than verifiably better."* The direction clears it because each change
  names a defect it removes (duplicated claim, third identical card pattern,
  missing chapter marker, hover-lift contradicting the section's subject), plus
  one measurable win confirmed in the browser below: Promise content is now
  **478px inside an 844px mobile sticky frame**, where the filled cards
  overflowed short phone viewports.

### Verdict: APPROVED with two changes and one cut (all applied)

- **CHANGE 1** — the dead prompt must not look operable: a focusable empty
  `<input>` invites a click that does nothing, which is worse than the slogan it
  replaced. Shipped as a non-interactive `div` with `aria-hidden` on the
  decorative send glyph. Verified: `#why-not` contains **0** `input/button/a/
  [tabindex]` nodes (asserted in the test and re-measured in the browser).
- **CHANGE 2** — no competitor names in the panel label; "Every other assistant"
  carries the same meaning and stays true as the market changes. Applied.
- **CUT** — the `data-h="true"` custom-cursor flag on the Promise rows. `data-h`
  swells the cursor ring to signal interactivity; the rows are plain content.
  The old cards carried it incorrectly; fixed in the region this card owns.
- **Accessibility floor held:** the bubble and caption are real text, the quote
  stays a `<p>`, and colours reuse `T.*` pairings already shipped elsewhere on
  this page (`T.indigo` on `T.indigoSub`, `T.muted` on `T.bg`), so no new
  contrast risk.

---

## 3. TDD evidence

Test file: `apps/web/src/pages/__tests__/LandingPage.whynot-promise.test.tsx`
(6 tests, two blocks). The *baseline contract* block asserts what must hold
before **and** after (section order via `compareDocumentPosition`, the kept
coda, all three promise items, the closing quote, the chapter label) — that is
the guard against the regression this pipeline exists to prevent, content
silently disappearing. The *redesign* block asserts the new rendered content.

### RED — before implementation (against unmodified `LandingPage.tsx`)

```
 ❯ src/pages/__tests__/LandingPage.whynot-promise.test.tsx (6 tests | 2 failed)
   ✓ renders the why-not section before the promise section
   ✓ keeps the relationship-difference line inside the why-not section
   ✓ renders all three promise items and the closing quote
   × shows the prompt-vs-message specimen instead of a competitor slogan
   × leaves nothing clickable or focusable in the dead prompt specimen   [passed]
   × renders the promise items as an indexed ledger, not hover-lift cards

AssertionError: expected 'ChatGPT answers when you ask.Gemini a…' to contain 'Every other assistant'
AssertionError: expected 'Chapter 06 · Our PromiseNotheretoopti…' to contain '01'

 Tests  2 failed | 4 passed (6)
```

The three baseline tests passing here is the baseline the brief's Step 4 asks
for; the two redesign failures are the RED.

### GREEN — after implementation

```
 ✓ src/pages/__tests__/LandingPage.whynot-promise.test.tsx (6 tests) 4746ms
   ✓ renders the why-not section before the promise section
   ✓ keeps the relationship-difference line inside the why-not section
   ✓ renders all three promise items and the closing quote
   ✓ shows the prompt-vs-message specimen instead of a competitor slogan
   ✓ leaves nothing clickable or focusable in the dead prompt specimen
   ✓ renders the promise items as an indexed ledger, not hover-lift cards

 Test Files  1 passed (1)
      Tests  6 passed (6)
```

### Full suite

```
 Test Files  23 passed (23)
      Tests  238 passed (238)
```

(One intermediate `npm test` run failed while the headless browser was
occupying memory; re-run clean at 238/238. The machine's memory pressure is
real — the OS killed the `vite preview` background task mid-check.)

Three jsdom environment gaps had to be stubbed in the test file for
`LandingPage` to render at all: `window.matchMedia`, `IntersectionObserver` /
`ResizeObserver`, and `Element.prototype.animate` (framer-motion now drives
motion values through the Web Animations API, which jsdom does not implement).
`ReactLenis` and `@/contexts/AuthContext` are module-mocked. **Later cards that
render a full page will hit the same three gaps** — if more than one or two do,
these belong in `apps/web/vitest.setup.ts` rather than per-file.

---

## 4. What was implemented

`apps/web/src/pages/LandingPage.tsx`, +106/−39 lines, confined to the
`WhyNotSection` / `PromiseSection` region:

- **`WhyNotSection`** rewritten: interlude label; a 2-up `auto-fit minmax(290px,
  1fr)` grid holding the inert prompt specimen (bordered field, muted
  placeholder, `aria-hidden` `ArrowUpRight`, mono caption) and the message bubble
  (`T.indigoSub` fill, asymmetric `16px 16px 16px 4px` radius, mono stamp);
  hairline-ruled coda carrying the one kept line. Competitor-name triplet
  deleted.
- **`PromiseSection`** cards → ledger: the `md:grid-cols-3` card block became a
  single ruled column; each row is `flex flex-wrap items-center` with mono index,
  dimmed glyph, title in a `md:min-w-[185px]` column, and a description that is
  `basis-full` on mobile (own line) and `md:flex-1` on desktop (same row). Icon
  size 20→16. `data-h` and `whileHover` lift removed. Quote panel's border/fill
  removed. Item copy rewritten (3 strings).
- **Unchanged:** `function WhyNotSection()` still takes no props;
  `PromiseSection({ onChapter })` keeps its signature and the call order at
  `:1394-1395`; `id="why-not"` and `id="promise"`; the 280vh / sticky / 100dvh
  mechanics; the `showCards` gate; `WordReveal`; no new dependency, no new
  component, no shared file touched.

Note (pre-existing, not introduced, not fixed here): `PromiseSection`'s
`onChapter` prop is declared but never used inside the component — chapter
tracking is done by the `IntersectionObserver` in `LandingPage`. Left as-is to
preserve the call signature per the brief.

---

## 5. Build + interaction / visual check

```
$ npm run build        →  ✓ built in 23.71s   (LandingPage chunk 76.93 kB / gzip 21.61 kB)
                          PWA precache 67 entries, no errors
```

The build alone was not treated as the check. The built `dist` was served on
`:4178` and driven over the Chrome DevTools Protocol in **headless Edge** —
Playwright's bundled chromium is blocked on this machine by an OS Application
Control policy (`Failed to load Chrome DLL … An Application Control policy has
blocked this file. (0x11C7)`), and the Chrome-based MCP browser tool found no
Chrome install. The script scrolled to each section, waited for the scroll-gated
animations, captured screenshots and measured the live DOM.

**Screenshots were opened and looked at**, at 1440×900 and 390×844.

What was observed:

| check | result |
|---|---|
| why-not in viewport, both panels at opacity 1 | yes |
| panels side by side at 1440px, stacked at 390px | yes / yes |
| prompt specimen + message text present, no rival names | yes |
| focusable elements inside `#why-not` | **0** |
| bubble background actually painted | `rgb(226, 228, 243)` |
| promise rows after crossing the scroll gate | 3 rows, opacity 1, indices `01/02/03` |
| rows stacked and evenly ruled | yes, 90px each |
| `data-h` hover-lift nodes in `#promise` | **0** |
| quote rendered without a box | `rgba(0,0,0,0)` background |
| promise content vs sticky frame — desktop | 780px in 900px (fits) |
| promise content vs sticky frame — mobile | 478px in 844px (fits) |
| horizontal overflow at 390px | none |
| console errors | **0** |

The scroll gate was exercised, not bypassed: the rows measure opacity 0 until
the page is scrolled past ~45% of the 280vh shell, then animate in — i.e. the
section's actual interaction works in the built artifact.

**One defect found by looking rather than by the test:** at desktop width the
ledger's description column did not align across rows, because the titles differ
in width — three rows, three different left edges, which defeats the point of a
ledger. Fixed with `md:min-w-[185px]` on the title span, rebuilt, re-verified.
A green build and a green test would both have missed this.

---

## 6. Files changed

| file | change |
|---|---|
| `apps/web/src/pages/LandingPage.tsx` | +106 / −39 — `WhyNotSection` and `PromiseSection` only |
| `apps/web/src/pages/__tests__/LandingPage.whynot-promise.test.tsx` | new, 151 lines, 6 tests |
| `docs/superpowers/cards/landing-whynot-promise.md` | `state: backlog → merged`, owner, `handoff` = PASS 1/2/3 record |

Scratch (not committed, outside the repo): the CDP check script and screenshots
in the session scratchpad.

Note: `docs/` matches a `.gitignore` rule but the 33 existing card files are
already tracked, so the card was staged with `git add -f` (same situation Task 1
will have had). Worth settling repo-wide rather than per-card.

---

## 7. Self-review

- **Does it look different *and* better?** Different: the section's two biggest
  elements (a centred slogan; a 3-up card grid) are both gone, replaced by a
  register the page did not contain. Better, on stated grounds: one duplicated
  claim removed, one of three identical card grids removed, a missing chapter
  marker restored, a hover-lift that contradicted the copy removed, and a
  measured mobile overflow fixed (478px vs 844px frame). Not just "changed".
- **Are the references real and specific?** Three named sites with URLs, each
  mapped to a specific decision, plus a stated rejection (Linear) and why. No
  "modern SaaS" hand-waving.
- **Did the product-fit pass actually check cross-file impact?** Yes — grep
  output is pasted above, 4 hits in 1 file, neither component exported; a second
  grep traced the `#promise` anchor to the navbar, the footer and the chapter
  observer, which is why both ids were kept.
- **Does the test assert something real?** It renders the whole `LandingPage`
  and reads the actual DOM of `#why-not` / `#promise`: section order via
  `compareDocumentPosition`, real copy strings, a negative assertion that rival
  names are gone, a count of focusable nodes, a count of `data-h` nodes. It went
  RED on two of those before implementation. No snapshot, no tautology.
- **Was the build actually looked at?** Yes — screenshots viewed at two
  viewports, and the alignment defect in section 5 came out of that viewing, not
  out of the test.

---

## 8. Issues and concerns

1. **Browser tooling on this machine is constrained.** Playwright's chromium is
   blocked by OS Application Control; the Chrome MCP tool finds no Chrome. The
   working path is **headless Edge over CDP** (`msedge.exe --headless=new
   --remote-debugging-port=…`). Later cards should start there instead of
   rediscovering it. The scratch script is reusable.
2. **Memory pressure is real.** The OS killed the `vite preview` background task
   mid-check, and one full `npm test` run failed under that pressure before
   passing clean. The spec's ≤2-concurrent-build cap should be treated as a hard
   limit; running a browser counts toward it.
3. **jsdom gaps will recur.** Any later card that renders a full page needs
   `matchMedia`, `IntersectionObserver`, `ResizeObserver` and
   `Element.prototype.animate` stubs. Currently duplicated per-file; promote to
   `vitest.setup.ts` once a second card needs them.
4. **A taste call the controller may want to overrule:** the Promise items are
   no longer "cards" in the boxed sense, and the user named "feature cards" when
   asking for this work. If boxes were wanted rather than a ledger, it is a
   small, contained revert of the row block — but the stated reason for removing
   them (third identical grid on one page) would then still need an answer.
5. **Not done, by scope:** the chapter spine still has no number for the why-not
   interlude (renumbering touches the observer map and `ChapterLabel`, outside
   this card), and `PromiseSection`'s unused `onChapter` prop was deliberately
   left in place to preserve the call signature. The navbar also links to a
   `#family` anchor that does not exist anywhere on the page — pre-existing,
   unrelated to this card, worth its own card.
