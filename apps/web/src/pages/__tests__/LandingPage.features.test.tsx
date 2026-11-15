/**
 * LandingPage.features.test.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Card: landing-features (redesign pipeline, Task 4).
 *
 * Two blocks on purpose, same discipline as LandingPage.contrast.test.tsx:
 *  - "baseline contract" — what must be true before AND after the redesign
 *    (the #features id the chapter observer keys on at index 4, its position
 *    between #contrast and #riva-ai, the sticky scroll-driven carousel
 *    structure, the #family deep-link anchor, and the first FEATURES entry's
 *    content verbatim — active stays at its initial index 0 in jsdom since
 *    there is no real scroll). These pass against the pre-redesign code; they
 *    guard the regression this pipeline exists to prevent — content or
 *    wiring silently disappearing.
 *  - "redesign" — the two font-size inconsistencies (8.5px vs. the 9px this
 *    pipeline's three already-merged sections converged on) and the one
 *    measured AA contrast failure (the active feature's tag badge: T.indigo
 *    on T.indigoSub) found in this section. RED before the build step, GREEN
 *    after.
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

// FEATURES[0] — without a real scroll, `active` stays at its initial state
// (0), so this is the one entry guaranteed to render in jsdom.
const FIRST_TAG = 'Core Experience';
const FIRST_TITLE = 'Living Landscape';
const FIRST_BODY_FRAGMENT = 'Plant Focus Seeds, watch them bloom.';
const CHAPTER_LABEL = 'Features · Chapter 04';

// Exact-match on purpose: querySelectorAll includes every ancestor wrapper
// too, and an ancestor's textContent is the concatenation of all its
// descendants' text — a substring/regex .find() would match an outer wrapper
// instead of the actual label leaf. Exact equality after trim only matches
// the leaf that renders nothing else.
function findByExactText(root: Element, selector: string, text: string): HTMLElement | undefined {
  return [...root.querySelectorAll(selector)]
    .find(el => el.textContent?.trim() === text) as HTMLElement | undefined;
}

describe('LandingPage — features section', () => {
  describe('baseline contract (true before and after the redesign)', () => {
    it('keeps the #features section and its chapter-04 marker', () => {
      const { container } = renderLanding();

      // 'features' is key 4 in the IntersectionObserver chapter map; losing
      // the id silently breaks chapter tracking for the whole lower page.
      const features = container.querySelector('#features');
      expect(features).toBeInTheDocument();
      expect(features!.textContent).toMatch(/Chapter 04/i);
    });

    it('renders the features section between the contrast and riva-ai sections', () => {
      const { container } = renderLanding();

      const contrast = container.querySelector('#contrast')!;
      const features = container.querySelector('#features')!;
      const riva = container.querySelector('#riva-ai')!;
      // Node.DOCUMENT_POSITION_FOLLOWING === 4
      expect(contrast.compareDocumentPosition(features) & 4).toBe(4);
      expect(features.compareDocumentPosition(riva) & 4).toBe(4);
    });

    it('keeps the #family deep-link anchor inside the features section', () => {
      const { container } = renderLanding();
      const features = container.querySelector('#features')!;
      const family = features.querySelector('#family');
      expect(family).toBeInTheDocument();
    });

    it('keeps the sticky scroll-driven carousel structure', () => {
      const { container } = renderLanding();

      const features = container.querySelector('#features') as HTMLElement;
      // 9 FEATURES entries at 80vh each.
      expect(features.style.height).toBe('720vh');
      const sticky = features.children[1] as HTMLElement;
      expect(sticky.style.position).toBe('sticky');
      expect(sticky.style.height).toBe('100dvh');
    });

    it('renders the first FEATURES entry (tag, title, body) verbatim', () => {
      const { container } = renderLanding();
      const features = container.querySelector('#features')!;

      expect(features.textContent).toMatch(new RegExp(FIRST_TAG));
      expect(features.textContent).toMatch(new RegExp(FIRST_TITLE));
      expect(features.textContent).toContain(FIRST_BODY_FRAGMENT);
    });

    it('renders all 9 feature index numbers in the tab row', () => {
      const { container } = renderLanding();
      const features = container.querySelector('#features')!;
      for (const n of ['01', '02', '03', '04', '05', '06', '07', '08', '09']) {
        expect(features.textContent).toContain(n);
      }
    });

    it('drives the progress bar width from the active index', () => {
      const { container } = renderLanding();
      const features = container.querySelector('#features')!;

      // Same expression FeaturesSection uses: ((active + 1) / FEATURES.length) * 100 + '%',
      // active = 0 initially, FEATURES.length = 9.
      const expectedPct = ((0 + 1) / 9) * 100 + '%';
      const progressTrack = features.querySelector('[style*="height: 2px"]') as HTMLElement | null;
      expect(progressTrack).toBeTruthy();
      const bar = progressTrack!.firstElementChild as HTMLElement;
      expect(bar.style.width).toBe(expectedPct);
    });
  });

  describe('redesign', () => {
    it('fixes the chapter label font size (8.5px -> 9px, matching Problem/Manifesto/Contrast)', () => {
      const { container } = renderLanding();
      const features = container.querySelector('#features')!;

      const label = findByExactText(features, 'span', CHAPTER_LABEL);
      expect(label).toBeTruthy();
      expect(label!.style.fontSize).toBe('9px');
    });

    it('fixes the active tag badge font size and contrast (T.indigo on T.indigoSub measured 3.86:1, fails AA)', () => {
      const { container } = renderLanding();
      const features = container.querySelector('#features')!;

      const badge = findByExactText(features, 'span', FIRST_TAG);
      expect(badge).toBeTruthy();
      expect(badge!.style.fontSize).toBe('9px');
      // hsl(235, 45%, 44%) on T.indigoSub = 6.37:1 (independently computed via
      // sRGB-relative-luminance), replacing T.indigo's 3.86:1. jsdom
      // normalises hsl() to rgb().
      expect(badge!.style.color).toBe('rgb(62, 70, 163)');
    });
  });
});
