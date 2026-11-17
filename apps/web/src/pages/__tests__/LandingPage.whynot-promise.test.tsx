/**
 * LandingPage.whynot-promise.test.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Card: landing-whynot-promise (redesign pipeline, Task 2).
 *
 * Two blocks on purpose:
 *  - "baseline contract" — what must be true before AND after the redesign
 *    (section order, the kept copy, the three promise items, the closing
 *    quote). Passes against the pre-redesign code; guards the regression the
 *    pipeline exists to prevent (content silently disappearing).
 *  - "redesign" — the new WhyNot specimen content. RED before the build step,
 *    GREEN after.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
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

// Exact-match on purpose: querySelectorAll includes every ancestor wrapper
// too, and an ancestor's textContent is the concatenation of all its
// descendants' text — a substring/regex .find() would match an outer wrapper
// instead of the actual label leaf. Exact equality after trim only matches
// the leaf that renders nothing else. Same helper as LandingPage.cta.test.tsx.
function findByExactText(root: Element, selector: string, text: string): HTMLElement | undefined {
  return [...root.querySelectorAll(selector)]
    .find(el => el.textContent?.trim() === text) as HTMLElement | undefined;
}

describe('LandingPage — why-not / promise sections', () => {
  describe('baseline contract (true before and after the redesign)', () => {
    it('renders the why-not section before the promise section', () => {
      const { container } = renderLanding();

      const whyNot = container.querySelector('#why-not');
      const promise = container.querySelector('#promise');

      expect(whyNot).toBeInTheDocument();
      expect(promise).toBeInTheDocument();
      // Node.DOCUMENT_POSITION_FOLLOWING === 4: promise comes after why-not.
      expect(whyNot!.compareDocumentPosition(promise!) & 4).toBe(4);
    });

    it('keeps the relationship-difference line inside the why-not section', () => {
      const { container } = renderLanding();

      const whyNot = container.querySelector('#why-not');
      expect(whyNot!.textContent).toMatch(/relationship difference/i);
    });

    it('renders all three promise items and the closing quote', () => {
      const { container } = renderLanding();

      const promise = container.querySelector('#promise')!;
      expect(promise.textContent).toContain('Space to focus');
      expect(promise.textContent).toContain('Space to rest');
      expect(promise.textContent).toContain('Space to reflect');
      expect(promise.textContent).toMatch(/Both count/);

      // The headline is split per word by WordReveal, so assert the chapter
      // marker instead of the headline string.
      expect(screen.getByText(/Chapter 06 · Our Promise/i)).toBeInTheDocument();
    });
  });

  describe('redesign', () => {
    it('shows the prompt-vs-message specimen instead of a competitor slogan', () => {
      const { container } = renderLanding();
      const whyNot = container.querySelector('#why-not')!;

      // The argument is made by the artifact: a dead prompt field on one side,
      // a message that already arrived on the other.
      expect(whyNot.textContent).toContain('Every other assistant');
      expect(whyNot.textContent).toMatch(/waits for you to type/i);
      expect(whyNot.textContent).toMatch(/she messaged first/i);
      expect(whyNot.textContent).toMatch(/check-in this morning/i);

      // Cut: naming rivals, and the line already said 600 lines earlier.
      expect(whyNot.textContent).not.toMatch(/ChatGPT|Gemini/);
    });

    it('leaves nothing clickable or focusable in the dead prompt specimen', () => {
      const { container } = renderLanding();
      const whyNot = container.querySelector('#why-not')!;

      expect(whyNot.querySelectorAll('input, button, a, [tabindex]')).toHaveLength(0);
    });

    it('renders the promise items as an indexed ledger, not hover-lift cards', () => {
      const { container } = renderLanding();
      const promise = container.querySelector('#promise')!;

      expect(promise.textContent).toContain('01');
      expect(promise.textContent).toContain('02');
      expect(promise.textContent).toContain('03');

      // Nothing on a section about rest should flag itself as interactive.
      expect(promise.querySelectorAll('[data-h="true"]')).toHaveLength(0);
    });
  });

  // Final whole-branch review found this card (the pipeline's pilot) had
  // merged before the AA contrast defect was discovered elsewhere and was
  // never revisited — unlike every other LandingPage.*.test.tsx file, this
  // one had zero contrast assertions. Added here, following the same
  // fix-and-assert pattern as LandingPage.cta.test.tsx.
  describe('contrast fix (final review)', () => {
    it('fixes the "Interlude" chapter label font size (8.5px -> 9px, matching the other sections) and contrast', () => {
      const { container } = renderLanding();
      const whyNot = container.querySelector('#why-not')!;

      const label = findByExactText(whyNot, 'div', 'Interlude · The difference');
      expect(label).toBeTruthy();
      expect(label!.style.fontSize).toBe('9px');
      // T.muted on T.bg measured 4.39:1, fails AA; hsl(230,10%,42%) (rendered
      // by jsdom as this rgb() value) measures 5.42:1 — same fix as landing-cta.
      expect(label!.style.color).toBe('rgb(96, 100, 118)');
    });

    it('fixes the "Every other assistant" label font size (8.5px -> 9px) and contrast', () => {
      const { container } = renderLanding();
      const whyNot = container.querySelector('#why-not')!;

      const label = findByExactText(whyNot, 'div', 'Every other assistant');
      expect(label).toBeTruthy();
      expect(label!.style.fontSize).toBe('9px');
      expect(label!.style.color).toBe('rgb(96, 100, 118)');
    });

    it('fixes the "waits for you to type" caption by dropping the opacity modifier and swapping to the AA-passing color', () => {
      const { container } = renderLanding();
      const whyNot = container.querySelector('#why-not')!;

      const caption = findByExactText(whyNot, 'div', 'waits for you to type');
      expect(caption).toBeTruthy();
      // T.muted at opacity 0.6 on T.bg measured ~2.22:1, fails AA hard. Just
      // dropping the opacity still only reaches 4.39:1 (also fails), so the
      // color is swapped to hsl(230,10%,42%) too — that combination measures
      // 5.42:1 and passes.
      expect(caption!.style.opacity).toBe('');
      expect(caption!.style.color).toBe('rgb(96, 100, 118)');
    });

    it('leaves the intentionally low-contrast mock input specimen untouched', () => {
      const { container } = renderLanding();
      const whyNot = container.querySelector('#why-not')!;

      const mockInput = findByExactText(whyNot, 'span', 'Ask me anything…');
      expect(mockInput).toBeTruthy();
      expect(mockInput!.style.opacity).toBe('0.45');
    });
  });
});
