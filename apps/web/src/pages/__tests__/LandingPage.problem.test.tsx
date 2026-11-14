/**
 * LandingPage.problem.test.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Card: landing-problem (redesign pipeline, Task 4).
 *
 * Two blocks on purpose, same discipline as LandingPage.whynot-promise.test.tsx:
 *  - "baseline contract" — what must be true before AND after the redesign
 *    (the #why id the chapter observer keys on, the three display lines, the
 *    two real figures, the 2am copy, the differentiator sentence). These pass
 *    against the pre-redesign code; they guard the regression this pipeline
 *    exists to prevent — content silently disappearing.
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

describe('LandingPage — problem section', () => {
  describe('baseline contract (true before and after the redesign)', () => {
    it('keeps the #why section and its chapter marker', () => {
      const { container } = renderLanding();

      // 'why' is key 1 in the IntersectionObserver chapter map; the navbar and
      // footer anchor to it. Losing the id silently breaks chapter tracking.
      const why = container.querySelector('#why');
      expect(why).toBeInTheDocument();
      expect(why!.textContent).toMatch(/Chapter 01 · The Problem/i);
    });

    it('renders the problem section before the why-not interlude', () => {
      const { container } = renderLanding();

      const why = container.querySelector('#why')!;
      const whyNot = container.querySelector('#why-not')!;
      // Node.DOCUMENT_POSITION_FOLLOWING === 4
      expect(why.compareDocumentPosition(whyNot) & 4).toBe(4);
    });

    it('keeps the three-line display statement verbatim', () => {
      const { container } = renderLanding();

      const why = container.querySelector('#why')!;
      expect(why.textContent).toContain("You're not lazy.");
      expect(why.textContent).toContain("You're not undisciplined.");
      expect(why.textContent).toContain("You're running on empty.");
    });

    it('keeps both real figures and the 2am copy', () => {
      const { container } = renderLanding();

      const why = container.querySelector('#why')!;
      expect(why.textContent).toContain('77%');
      expect(why.textContent).toMatch(/burnout/i);
      expect(why.textContent).toContain('1 in 3');
      expect(why.textContent).toMatch(/nobody to talk to/i);
      expect(why.textContent).toMatch(/2am/);
    });

    it('keeps the differentiator sentence, now the only one on the page', () => {
      const { container } = renderLanding();

      // The pilot card (landing-whynot-promise) cut the duplicate out of
      // WhyNotSection, so this closing line is the page's sole statement of it.
      const why = container.querySelector('#why')!;
      expect(why.textContent).toMatch(/Riva shows up before you do/i);
      expect(why.textContent).toMatch(/We made something different/i);
    });
  });

  describe('redesign', () => {
    it('marks the unmeasured claim as no data instead of typesetting it as a zero', () => {
      const { container } = renderLanding();
      const why = container.querySelector('#why')!;

      expect(why.textContent).toMatch(/no data/i);
      // Cut: a sales line wearing the numeral style of the two real figures.
      expect(why.textContent).not.toMatch(/AI companions/i);
    });

    it('pins the no-data cell so a fake numeral cannot quietly come back', () => {
      const { container } = renderLanding();
      const why = container.querySelector('#why')!;

      // The em dash is the table convention for "not measured". Swapping it for
      // a digit would re-make the defect this card removed.
      const dash = [...why.querySelectorAll('.rv-display')]
        .find(el => el.textContent?.trim() === '—');
      expect(dash).toBeTruthy();
      // Announced by its visible "no data" label, not by the glyph.
      expect(dash!.getAttribute('aria-hidden')).toBe('true');
    });

    it('says the figures are unverified without claiming provenance it cannot back', () => {
      const { container } = renderLanding();
      const why = container.querySelector('#why')!;

      expect(why.textContent).toMatch(/primary sources not verified by us/i);
      // Must not assert the figures came from identifiable published surveys —
      // the 1-in-3 figure could not actually be sourced.
      expect(why.textContent).not.toMatch(/published .*surveys/i);
    });

    it('keeps the disclosure readable rather than dimming it to decoration', () => {
      const { container } = renderLanding();
      const why = container.querySelector('#why')!;

      const note = [...why.querySelectorAll('.rv-mono')]
        .find(el => /primary sources not verified/i.test(el.textContent || '')) as HTMLElement;
      expect(note).toBeTruthy();
      // An honesty disclosure that fails the AA contrast floor defeats itself.
      // T.muted on T.bg is only 4.40:1; this is the same hue four lightness
      // points down, which measures 5.04:1. Dimming it again would undo that.
      expect(note.style.opacity).not.toBe('0.6');
      expect(note.style.fontSize).toBe('11px');
      // jsdom normalises hsl() to rgb(); this is hsl(230, 10%, 44%).
      expect(note.style.color).toBe('rgb(101, 105, 123)');
    });

    it('keeps the coda intact and left-aligned under a hairline', () => {
      const { container } = renderLanding();
      const why = container.querySelector('#why')!;

      // Assert the positive too: centring is gone AND the coda still exists, so
      // deleting it outright cannot pass this test.
      expect(why.querySelectorAll('[style*="text-align: center"]')).toHaveLength(0);

      const coda = [...why.querySelectorAll('p.rv-display')]
        .find(p => /Riva shows up before you do/i.test(p.textContent || ''))!;
      expect(coda).toBeTruthy();
      const frame = coda.parentElement as HTMLElement;
      expect(frame.style.borderTop).toMatch(/1px solid/);
      expect(frame.style.maxWidth).toBe('720px');
    });
  });
});
