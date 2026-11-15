/**
 * LandingPage.manifesto.test.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Card: landing-manifesto (redesign pipeline, Task 4).
 *
 * Two blocks on purpose, same discipline as LandingPage.problem.test.tsx:
 *  - "baseline contract" — what must be true before AND after the redesign
 *    (the #manifesto id the chapter observer keys on, its position between
 *    #why and #contrast, and the manifesto sentence itself verbatim). These
 *    pass against the pre-redesign code; they guard the regression this
 *    pipeline exists to prevent — content silently disappearing.
 *  - "redesign" — the honest-evidence changes. RED before the build step,
 *    GREEN after.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

// Smooth-scroll wrapper drives real rAF/ResizeObserver work that jsdom has no
// business running; it is not what this test covers.
vi.mock('@studio-freight/react-lenis', () => ({
  ReactLenis: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useLenis: () => null,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ({ user: null }),
  useAuth: () => ({ user: null }),
}));

import LandingPage from '../LandingPage';

beforeAll(() => {
  window.matchMedia = window.matchMedia || ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }) as unknown as MediaQueryList);

  // jsdom implements no Web Animations API; framer-motion drives motion values
  // through element.animate().
  if (!Element.prototype.animate) {
    Element.prototype.animate = () => ({
      cancel() {}, play() {}, pause() {}, finish() {}, reverse() {},
      commitStyles() {}, updatePlaybackRate() {}, persist() {},
      addEventListener() {}, removeEventListener() {},
      finished: Promise.resolve(), ready: Promise.resolve(),
      currentTime: 0, startTime: 0, playbackRate: 1,
      playState: 'finished', effect: null, timeline: null,
      onfinish: null, oncancel: null, onremove: null,
    }) as unknown as Animation;
  }

  // jsdom ships neither observer; LandingPage's chapter tracking needs one.
  (globalThis as any).IntersectionObserver ??= class {
    observe() {} unobserve() {} disconnect() {} takeRecords() { return []; }
    root = null; rootMargin = ''; thresholds = [];
  };
  (globalThis as any).ResizeObserver ??= class {
    observe() {} unobserve() {} disconnect() {}
  };
});

function renderLanding() {
  return render(
    <HelmetProvider>
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    </HelmetProvider>
  );
}

const MANIFESTO_SENTENCE =
  'Productivity was never meant to cost you your peace. ' +
  'Your best work lives in the space between effort and ease — ' +
  'not in the relentless push for more. Rivly gives you that space back.';

/**
 * WordReveal wraps every word in its own <span> with a margin instead of a
 * space, so textContent concatenates ("Productivitywasnever..."). Rebuild the
 * sentence from the spans so word order is actually asserted, not just presence.
 */
function manifestoSentence(manifesto: Element): string {
  const reveal = [...manifesto.querySelectorAll('.rv-display')]
    .find(el => /Productivity/.test(el.textContent || ''));
  if (!reveal) return '';
  return [...reveal.children].map(c => c.textContent?.trim() ?? '').join(' ').trim();
}

describe('LandingPage — manifesto section', () => {
  describe('baseline contract (true before and after the redesign)', () => {
    it('keeps the #manifesto section and its chapter-02 marker', () => {
      const { container } = renderLanding();

      // 'manifesto' is key 2 in the IntersectionObserver chapter map; losing
      // the id silently breaks chapter tracking for the whole lower page.
      const manifesto = container.querySelector('#manifesto');
      expect(manifesto).toBeInTheDocument();
      // Order-agnostic on purpose: the marker is reordered by this card, but
      // both halves must survive either way.
      expect(manifesto!.textContent).toMatch(/Chapter 02/i);
      expect(manifesto!.textContent).toMatch(/manifesto/i);
    });

    it('renders the manifesto between the problem section and the contrast section', () => {
      const { container } = renderLanding();

      const why = container.querySelector('#why')!;
      const manifesto = container.querySelector('#manifesto')!;
      const contrast = container.querySelector('#contrast')!;
      // Node.DOCUMENT_POSITION_FOLLOWING === 4
      expect(why.compareDocumentPosition(manifesto) & 4).toBe(4);
      expect(manifesto.compareDocumentPosition(contrast) & 4).toBe(4);
    });

    it('keeps the manifesto statement verbatim, word for word', () => {
      const { container } = renderLanding();

      const manifesto = container.querySelector('#manifesto')!;
      expect(manifestoSentence(manifesto)).toBe(MANIFESTO_SENTENCE);
    });

    it('keeps the sticky 300vh scroll track the reveal choreography depends on', () => {
      const { container } = renderLanding();

      // The word reveal, the background tint and the signature reveal are all
      // keyed to scroll progress across this track. Collapsing it would leave
      // the section rendering but no longer animating.
      const manifesto = container.querySelector('#manifesto') as HTMLElement;
      expect(manifesto.style.height).toBe('300vh');
      const panel = manifesto.firstElementChild as HTMLElement;
      expect(panel.style.position).toBe('sticky');
    });
  });

  describe('redesign', () => {
    it('drops the fabricated efficacy figure and says what register the section is in', () => {
      const { container } = renderLanding();
      const manifesto = container.querySelector('#manifesto')!;

      // Assert the positive first: the honest replacement is actually present,
      // so deleting the whole block cannot pass this test.
      expect(manifesto.textContent).toMatch(/not a metric/i);
      expect(manifesto.textContent).toMatch(/not a promise about your results/i);

      // '73% lower task anxiety' had exactly one hit in the whole repo — no
      // study, no n, no source. A measured mental-health outcome claim.
      expect(manifesto.textContent).not.toMatch(/73\s*%/);
      expect(manifesto.textContent).not.toMatch(/task anxiety/i);
    });

    it('drops the no-streaks claim that the shipped product contradicts', () => {
      const { container } = renderLanding();
      const manifesto = container.querySelector('#manifesto')!;

      // rivaLanguage.ts ships `streakEnded`, useAchievements.ts ships
      // streak_3/7/14/30, useRhythmScore.ts ships a 0-100 score. '0 streaks to
      // break' was not merely unsourced, it was false.
      expect(manifesto.textContent).not.toMatch(/streaks to break/i);
      // ...and the replacement must not re-assert a product fact of its own.
      expect(manifesto.textContent).not.toMatch(/no score to chase/i);
    });

    it('signs the manifesto in the vacated reveal slot, on a hairline', () => {
      const { container } = renderLanding();
      const manifesto = container.querySelector('#manifesto')!;

      const sign = [...manifesto.querySelectorAll('p')]
        .find(p => /The Rivly team/i.test(p.textContent || '')) as HTMLElement;
      expect(sign).toBeTruthy();

      // The slot stays occupied: scroll progress 0.45-0.60 still reveals
      // something, so the last 40% of the 300vh track is not dead scroll.
      const frame = sign.parentElement as HTMLElement;
      expect(frame.style.borderTop).toMatch(/1px solid/);
      expect(frame.style.maxWidth).toBeTruthy();
    });

    it('keeps the disclosure legible rather than dimming it to decoration', () => {
      const { container } = renderLanding();
      const manifesto = container.querySelector('#manifesto')!;

      const note = [...manifesto.querySelectorAll('.rv-mono')]
        .find(el => /not a metric/i.test(el.textContent || '')) as HTMLElement;
      expect(note).toBeTruthy();
      // Measured against this section's *tinted* ground, not bare T.bg: the
      // sticky panel animates rgba(237,237,252,a) to a=0.55 over the track, so
      // T.muted is only 4.23:1 here and hsl(230,10%,44%) is 4.84:1. The old
      // 8.5px labels failed; this clears AA at the worst case.
      expect(note.style.fontSize).toBe('11px');
      // jsdom normalises hsl() to rgb(); this is hsl(230, 10%, 44%).
      expect(note.style.color).toBe('rgb(101, 105, 123)');
    });

    it('takes the page off its last badge chips', () => {
      const { container } = renderLanding();
      const manifesto = container.querySelector('#manifesto')!;

      // The pilot and landing-problem moved the rest of the page onto hairline
      // rules; these three borderRadius-99 T.surface pills were the last of the
      // generic-SaaS chip vocabulary left, inside the page's quietest beat.
      expect(manifesto.querySelectorAll('[style*="border-radius: 99px"]')).toHaveLength(0);
      expect(manifesto.querySelectorAll('[style*="hsl(38, 30%, 98%)"]')).toHaveLength(0);
    });

    it('orders the chapter marker like every other chapter on the page', () => {
      const { container } = renderLanding();
      const manifesto = container.querySelector('#manifesto')!;

      // Problem: 'Chapter 01 · The Problem'. Contrast: 'Chapter 03 · The
      // default world'. This was the only one reversed.
      expect(manifesto.textContent).toMatch(/Chapter 02 · Our Manifesto/);
    });
  });
});
