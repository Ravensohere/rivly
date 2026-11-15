/**
 * LandingPage.contrast.test.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Card: landing-contrast (redesign pipeline, Task 4).
 *
 * Two blocks on purpose, same discipline as LandingPage.manifesto.test.tsx:
 *  - "baseline contract" — what must be true before AND after the redesign
 *    (the #contrast id the chapter observer keys on, its position between
 *    #manifesto and #features, the sticky 300vh scroll track, and the first
 *    bad/good story pair verbatim). These pass against the pre-redesign code;
 *    they guard the regression this pipeline exists to prevent — content or
 *    wiring silently disappearing.
 *  - "redesign" — the two measured AA contrast failures found in this
 *    section's two chapter labels. RED before the build step, GREEN after.
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

// STORY[0] — without a real scroll, `active` stays at its initial state (0),
// so this is the one bad/good pair guaranteed to render in jsdom.
const FIRST_BAD = 'Rush through everything';
const FIRST_GOOD = 'Focus on one thing at a time';

// Exact-match on purpose: querySelectorAll('div') includes every ancestor
// wrapper div too, and an ancestor's textContent is the concatenation of all
// its descendants' text — a substring/regex .find() would match the *outer*
// #contrast div itself (document order lists ancestors before descendants)
// instead of the actual label leaf. Exact equality after trim only matches
// the leaf that renders nothing else.
function findByExactText(root: Element, selector: string, text: string): HTMLElement | undefined {
  return [...root.querySelectorAll(selector)]
    .find(el => el.textContent?.trim() === text) as HTMLElement | undefined;
}

describe('LandingPage — contrast section', () => {
  describe('baseline contract (true before and after the redesign)', () => {
    it('keeps the #contrast section and its chapter-03 marker', () => {
      const { container } = renderLanding();

      // 'contrast' is key 3 in the IntersectionObserver chapter map; losing
      // the id silently breaks chapter tracking for the whole lower page.
      const contrast = container.querySelector('#contrast');
      expect(contrast).toBeInTheDocument();
      expect(contrast!.textContent).toMatch(/Chapter 03/i);
      expect(contrast!.textContent).toMatch(/the default world/i);
    });

    it('renders the contrast section between the manifesto and the features section', () => {
      const { container } = renderLanding();

      const manifesto = container.querySelector('#manifesto')!;
      const contrast = container.querySelector('#contrast')!;
      const features = container.querySelector('#features')!;
      // Node.DOCUMENT_POSITION_FOLLOWING === 4
      expect(manifesto.compareDocumentPosition(contrast) & 4).toBe(4);
      expect(contrast.compareDocumentPosition(features) & 4).toBe(4);
    });

    it('keeps the sticky 300vh scroll track the left/right reveal depends on', () => {
      const { container } = renderLanding();

      const contrast = container.querySelector('#contrast') as HTMLElement;
      expect(contrast.style.height).toBe('300vh');
      const panel = contrast.firstElementChild as HTMLElement;
      expect(panel.style.position).toBe('sticky');
    });

    it('renders the first bad/good story pair verbatim, on opposite panels', () => {
      const { container } = renderLanding();
      const contrast = container.querySelector('#contrast')!;

      expect(contrast.textContent).toMatch(new RegExp(FIRST_BAD));
      expect(contrast.textContent).toMatch(new RegExp(FIRST_GOOD));
      // The "bad" copy must come before the "good" copy in document order —
      // that ordering is the whole point of the left/right split.
      expect(contrast.textContent!.indexOf(FIRST_BAD)).toBeLessThan(
        contrast.textContent!.indexOf(FIRST_GOOD)
      );
    });

    it('keeps the Rivly-rhythm label on the right panel', () => {
      const { container } = renderLanding();
      const contrast = container.querySelector('#contrast')!;
      expect(contrast.textContent).toMatch(/the rivly rhythm/i);
    });
  });

  describe('redesign', () => {
    it('fixes the left chapter label contrast (T.muted on T.cream measured 4.05:1, fails AA)', () => {
      const { container } = renderLanding();
      const contrast = container.querySelector('#contrast')!;

      const label = findByExactText(contrast, 'div', 'Chapter 03 · The default world');
      expect(label).toBeTruthy();
      // hsl(230, 10%, 40%) on T.cream = 5.38:1 (independently computed via
      // sRGB-relative-luminance, not T.muted's 4.05:1). jsdom normalises
      // hsl() to rgb().
      expect(label!.style.color).toBe('rgb(92, 95, 112)');
      expect(label!.style.fontSize).toBe('9px');
    });

    it('fixes the right chapter label contrast (T.indigoXL on T.indigo measured 2.12:1, fails AA hard)', () => {
      const { container } = renderLanding();
      const contrast = container.querySelector('#contrast')!;

      const label = findByExactText(contrast, 'div', 'The Rivly rhythm');
      expect(label).toBeTruthy();
      // #FAFAF7 (the same off-white already used for this panel's headline
      // text) on T.indigo = 4.67:1, clearing AA. T.indigoXL was 2.12:1.
      expect(label!.style.color).toBe('rgb(250, 250, 247)');
      expect(label!.style.fontSize).toBe('9px');
    });
  });
});
