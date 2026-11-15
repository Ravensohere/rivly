/**
 * LandingPage.riva.test.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Card: landing-riva (redesign pipeline, Task 4).
 *
 * Two blocks on purpose, same discipline as LandingPage.features.test.tsx:
 *  - "baseline contract" — what must be true before AND after the redesign
 *    (the #riva-ai id the chapter observer keys on at index 5, its position
 *    between #features and #why-not, the header/orb/display-headline
 *    structure, all 6 RIVA_FEATURES titles verbatim, and the closing quote
 *    text). These pass against the pre-redesign code; they guard the
 *    regression this pipeline exists to prevent — content or wiring silently
 *    disappearing.
 *  - "redesign" — the two font-size inconsistencies (8.5px / 8px vs. the 9px
 *    this pipeline's four already-merged sections converged on) and the two
 *    measured AA contrast failures (the RIVA_FEATURES desc text on
 *    T.nightSub, and the quote attribution's T.indigoXL-at-opacity-0.5 on the
 *    quote panel background) found in this section. RED before the build
 *    step, GREEN after.
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

const CHAPTER_LABEL = 'Chapter 05 · Your Rhythm Guide';
const QUOTE_ATTRIBUTION = '— Riva, your rhythm guide';
const RIVA_FEATURE_TITLES = [
  'Morning Briefing',
  'Rhythm Orb',
  'Voice Commands',
  'Focus Intelligence',
  'She Reaches Out',
  'Grows With You',
];
const FIRST_FEATURE_DESC = 'Personalized audio after check-in. Riva analyzes your mood, energy, sleep, and intention — then speaks to you in a natural voice.';

// Exact-match on purpose: querySelectorAll includes every ancestor wrapper
// too, and an ancestor's textContent is the concatenation of all its
// descendants' text — a substring/regex .find() would match an outer wrapper
// instead of the actual label leaf. Exact equality after trim only matches
// the leaf that renders nothing else.
function findByExactText(root: Element, selector: string, text: string): HTMLElement | undefined {
  return [...root.querySelectorAll(selector)]
    .find(el => el.textContent?.trim() === text) as HTMLElement | undefined;
}

describe('LandingPage — riva section', () => {
  describe('baseline contract (true before and after the redesign)', () => {
    it('keeps the #riva-ai section and its chapter-05 marker', () => {
      const { container } = renderLanding();

      // 'riva-ai' is key 5 in the IntersectionObserver chapter map; losing
      // the id silently breaks chapter tracking for the rest of the page.
      const riva = container.querySelector('#riva-ai');
      expect(riva).toBeInTheDocument();
      expect(riva!.textContent).toMatch(/Chapter 05/i);
    });

    it('renders the riva section between the features and why-not sections', () => {
      const { container } = renderLanding();

      const features = container.querySelector('#features')!;
      const riva = container.querySelector('#riva-ai')!;
      const whyNot = container.querySelector('#why-not')!;
      // Node.DOCUMENT_POSITION_FOLLOWING === 4
      expect(features.compareDocumentPosition(riva) & 4).toBe(4);
      expect(riva.compareDocumentPosition(whyNot) & 4).toBe(4);
    });

    it('renders the hero headline and companion paragraph', () => {
      const { container } = renderLanding();
      const riva = container.querySelector('#riva-ai')!;

      expect(riva.textContent).toContain('Meet Riva.');
      expect(riva.textContent).toContain('Your AI life companion.');
      expect(riva.textContent).toContain("She's the companion who remembers what you told her last Tuesday");
    });

    it('renders all 6 RIVA_FEATURES titles verbatim', () => {
      const { container } = renderLanding();
      const riva = container.querySelector('#riva-ai')!;

      for (const title of RIVA_FEATURE_TITLES) {
        expect(riva.textContent).toContain(title);
      }
    });

    it('renders the first RIVA_FEATURES entry body verbatim', () => {
      const { container } = renderLanding();
      const riva = container.querySelector('#riva-ai')!;

      expect(riva.textContent).toContain(FIRST_FEATURE_DESC);
    });

    it('renders the closing pull-quote and its attribution', () => {
      const { container } = renderLanding();
      const riva = container.querySelector('#riva-ai')!;

      expect(riva.textContent).toContain('Your rhythm is steady.');
      expect(riva.textContent).toContain('Trust your intuition today.');
      expect(riva.textContent).toContain(QUOTE_ATTRIBUTION);
    });
  });

  describe('redesign', () => {
    it('fixes the chapter label font size (8.5px -> 9px, matching Problem/Manifesto/Contrast/Features)', () => {
      const { container } = renderLanding();
      const riva = container.querySelector('#riva-ai')!;

      const label = findByExactText(riva, 'div', CHAPTER_LABEL);
      expect(label).toBeTruthy();
      expect(label!.style.fontSize).toBe('9px');
    });

    it('fixes the feature-grid desc contrast (rgba(255,255,255,.38) on T.nightSub measured 3.56:1, fails AA)', () => {
      const { container } = renderLanding();
      const riva = container.querySelector('#riva-ai')!;

      const desc = findByExactText(riva, 'div', FIRST_FEATURE_DESC);
      expect(desc).toBeTruthy();
      // rgba(255,255,255,0.5) on T.nightSub = 5.18:1 (independently computed
      // via sRGB-relative-luminance), replacing the 0.38-alpha 3.56:1 fail.
      expect(desc!.style.color).toBe('rgba(255, 255, 255, 0.5)');
    });

    it('fixes the quote attribution font size and contrast (T.indigoXL @ opacity .5 on the quote panel measured 2.89:1, fails AA)', () => {
      const { container } = renderLanding();
      const riva = container.querySelector('#riva-ai')!;

      const attribution = findByExactText(riva, 'div', QUOTE_ATTRIBUTION);
      expect(attribution).toBeTruthy();
      expect(attribution!.style.fontSize).toBe('9px');
      // T.indigoXL @ opacity 0.75 on the quote panel background = 4.91:1
      // (independently computed), replacing opacity 0.5's 2.89:1 fail.
      expect(attribution!.style.opacity).toBe('0.75');
    });
  });
});
