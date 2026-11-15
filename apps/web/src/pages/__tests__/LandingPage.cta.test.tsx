/**
 * LandingPage.cta.test.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Card: landing-cta (redesign pipeline, Task 4) — the page's final section.
 *
 * Two blocks on purpose, same discipline as LandingPage.riva.test.tsx:
 *  - "baseline contract" — what must be true before AND after the redesign
 *    (the #cta id the chapter observer keys on at index 7, its position after
 *    #promise, the 4-line headline, the subcopy paragraph, and the
 *    signed-out "Join the Waitlist" CTA with its real href). These pass
 *    against the pre-redesign code; they guard the regression this pipeline
 *    exists to prevent — content or wiring silently disappearing.
 *  - "redesign" — the chapter label's font-size straggler (8.5px vs. the 9px
 *    this pipeline's five already-merged sections converged on) and the
 *    measured AA contrast failure shared by the chapter label and the
 *    subcopy paragraph (T.muted on T.bg = 4.38:1, under the 4.5:1 floor).
 *    RED before the build step, GREEN after.
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

const CHAPTER_LABEL = 'Chapter 07 · Your story begins';
const SUBCOPY = 'Join thousands of calm achievers. No card required.';

// Exact-match on purpose: querySelectorAll includes every ancestor wrapper
// too, and an ancestor's textContent is the concatenation of all its
// descendants' text — a substring/regex .find() would match an outer wrapper
// instead of the actual label leaf. Exact equality after trim only matches
// the leaf that renders nothing else.
function findByExactText(root: Element, selector: string, text: string): HTMLElement | undefined {
  return [...root.querySelectorAll(selector)]
    .find(el => el.textContent?.trim() === text) as HTMLElement | undefined;
}

describe('LandingPage — CTA section', () => {
  describe('baseline contract (true before and after the redesign)', () => {
    it('keeps the #cta section and its chapter-07 marker', () => {
      const { container } = renderLanding();

      // 'cta' is key 7 in the IntersectionObserver chapter map; losing the
      // id silently breaks chapter tracking for the last section of the page.
      const cta = container.querySelector('#cta');
      expect(cta).toBeInTheDocument();
      expect(cta!.textContent).toMatch(/Chapter 07/i);
    });

    it('renders the cta section after the promise section', () => {
      const { container } = renderLanding();

      const promise = container.querySelector('#promise')!;
      const cta = container.querySelector('#cta')!;
      // Node.DOCUMENT_POSITION_FOLLOWING === 4
      expect(promise.compareDocumentPosition(cta) & 4).toBe(4);
    });

    it('renders the 4-line headline verbatim', () => {
      const { container } = renderLanding();
      const cta = container.querySelector('#cta')!;

      expect(cta.textContent).toContain('Find your');
      expect(cta.textContent).toContain('flow.');
      expect(cta.textContent).toContain('Drop your');
      expect(cta.textContent).toContain('burnout.');
    });

    it('renders the subcopy paragraph verbatim', () => {
      const { container } = renderLanding();
      const cta = container.querySelector('#cta')!;

      expect(cta.textContent).toContain(SUBCOPY);
    });

    it('renders the signed-out waitlist CTA with its real href', () => {
      const { container } = renderLanding();
      const cta = container.querySelector('#cta')!;

      const link = [...cta.querySelectorAll('a')]
        .find(a => a.textContent?.includes('Join the Waitlist')) as HTMLAnchorElement | undefined;
      expect(link).toBeTruthy();
      expect(link!.getAttribute('href')).toBe('https://ravenso.in/#/');
    });
  });

  describe('redesign', () => {
    it('fixes the chapter label font size (8.5px -> 9px, matching Problem/Manifesto/Contrast/Features/Riva)', () => {
      const { container } = renderLanding();
      const cta = container.querySelector('#cta')!;

      const label = findByExactText(cta, 'div', CHAPTER_LABEL);
      expect(label).toBeTruthy();
      expect(label!.style.fontSize).toBe('9px');
    });

    it('fixes the chapter label contrast (T.muted on T.bg measured 4.38:1, fails AA)', () => {
      const { container } = renderLanding();
      const cta = container.querySelector('#cta')!;

      const label = findByExactText(cta, 'div', CHAPTER_LABEL);
      expect(label).toBeTruthy();
      // Source sets hsl(230, 10%, 42%); jsdom normalizes inline style colors
      // to rgb() (confirmed by the unmodified T.muted rendering as
      // "rgb(110, 114, 135)" in the RED run) — rgb(96, 100, 118) is that same
      // hsl value's rgb conversion. On T.bg = 5.42:1 (independently computed
      // via sRGB-relative-luminance), replacing T.muted's 4.38:1 fail.
      expect(label!.style.color).toBe('rgb(96, 100, 118)');
    });

    it('fixes the subcopy paragraph contrast (T.muted on T.bg measured 4.38:1, fails AA)', () => {
      const { container } = renderLanding();
      const cta = container.querySelector('#cta')!;

      const subcopy = findByExactText(cta, 'p', SUBCOPY);
      expect(subcopy).toBeTruthy();
      // Same fix and rgb() normalization as the chapter label above.
      expect(subcopy!.style.color).toBe('rgb(96, 100, 118)');
    });
  });
});
