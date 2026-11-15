/**
 * LandingPage.wrapper.test.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Card: landing (redesign pipeline, Task 4) — the PAGE-LEVEL wrapper.
 *
 * Distinct from the 7 already-merged section-content test files
 * (LandingPage.problem/manifesto/contrast/features/riva/whynot-promise/cta
 * .test.tsx), which each own one `*Section` function's content. This file
 * covers everything in LandingPage.tsx OUTSIDE those 7 functions: the SEO
 * tags, the root `LandingPage` component's section assembly/order, the
 * chapter-navigation (IntersectionObserver) wiring, and the top-level
 * Navbar/Hero/Footer chrome.
 *
 * Two blocks, same discipline as every other card in this pipeline:
 *  - "baseline contract" — true before AND after this card's changes: the
 *    page renders all 7 sections (plus Hero) in the right order, the SEO
 *    title/description are present, the chapter-observer wires up all 8
 *    section ids, and the Navbar/Footer render with their real links.
 *  - "redesign" — the concrete defects this card fixes: a measured AA
 *    contrast failure shared by three page-level-chrome sites that reuse
 *    the exact T.muted-on-T.bg / T.indigo-on-T.indigoSub pairs the 7
 *    section cards already found and fixed inside their own scope (Hero's
 *    eyebrow pill, subcopy, and scroll cue; Navbar's nav links and "Log in"
 *    link, light and dark variants); and the Footer's copyright line, which
 *    fails much harder because it additionally dims an already-marginal
 *    color with opacity. RED before the fix, GREEN after.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, waitFor } from '@testing-library/react';
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

let observedIds: string[] = [];

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
  // Captures the ids actually passed to .observe() so the baseline test below
  // can assert the chapter-map wiring without reimplementing it.
  (globalThis as any).IntersectionObserver ??= class {
    observe(el: Element) { observedIds.push(el.id); }
    unobserve() {} disconnect() {} takeRecords() { return []; }
    root = null; rootMargin = ''; thresholds = [];
  };
  (globalThis as any).ResizeObserver ??= class {
    observe() {} unobserve() {} disconnect() {}
  };
});

function renderLanding() {
  observedIds = [];
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
// the leaf that renders nothing else.
function findByExactText(root: Element, selector: string, text: string): HTMLElement | undefined {
  return [...root.querySelectorAll(selector)]
    .find(el => el.textContent?.trim() === text) as HTMLElement | undefined;
}

describe('LandingPage — page-level wrapper', () => {
  describe('baseline contract (true before and after this card)', () => {
    it('renders all 8 chapter sections in document order', () => {
      const { container } = renderLanding();
      const ids = ['hero', 'why', 'manifesto', 'contrast', 'features', 'riva-ai', 'promise', 'cta'];
      const els = ids.map(id => container.querySelector(`#${id}`));
      els.forEach((el, i) => expect(el, `#${ids[i]} missing`).toBeInTheDocument());

      for (let i = 1; i < els.length; i++) {
        // Node.DOCUMENT_POSITION_FOLLOWING === 4
        expect(els[i - 1]!.compareDocumentPosition(els[i]!) & 4).toBe(4);
      }
    });

    it('renders the Footer after the final #cta section', () => {
      const { container } = renderLanding();
      const cta = container.querySelector('#cta')!;
      const footer = container.querySelector('footer')!;
      expect(footer).toBeInTheDocument();
      expect(cta.compareDocumentPosition(footer) & 4).toBe(4);
      expect(footer.textContent).toContain('Rivly');
      expect(footer.textContent).toContain('© 2026 Rivly');
    });

    it('renders the Navbar brand link pointing home', () => {
      const { container } = renderLanding();
      const brand = [...container.querySelectorAll('a')]
        .find(a => a.textContent?.trim() === 'Rivly');
      expect(brand).toBeTruthy();
      expect(brand!.getAttribute('href')).toBe('/');
    });

    it('sets the SEO title and description via Helmet', async () => {
      renderLanding();
      // react-helmet-async v2 commits to document.head/title off a microtask,
      // not synchronously within React's render — wait for it rather than
      // assume RTL's render() already flushed it.
      await waitFor(() => expect(document.title).toContain('Rivly'));
      expect(document.title).toContain('Riva');
      const metaDesc = document.querySelector('meta[name="description"]');
      expect(metaDesc?.getAttribute('content')).toMatch(/Riva knows your goals/i);
    });

    it('wires the IntersectionObserver chapter tracker to all 8 section ids', () => {
      renderLanding();
      expect(observedIds).toEqual(
        expect.arrayContaining(['hero', 'why', 'manifesto', 'contrast', 'features', 'riva-ai', 'promise', 'cta'])
      );
    });
  });

  describe('redesign', () => {
    it('fixes the Hero eyebrow pill contrast (T.indigo on T.indigoSub measured 3.86:1, fails AA)', () => {
      const { container } = renderLanding();
      const hero = container.querySelector('#hero')!;
      const pill = findByExactText(hero, 'span', 'YOUR AI LIFE COMPANION · RIVLY');
      expect(pill).toBeTruthy();
      // Same fix FeaturesSection already applied to the identical pairing:
      // hsl(235, 45%, 44%) on T.indigoSub = 6.37:1. jsdom normalises hsl() to
      // rgb(62, 70, 163) (confirmed by LandingPage.features.test.tsx).
      expect(pill!.style.color).toBe('rgb(62, 70, 163)');
    });

    it('fixes the Hero subcopy contrast (T.muted on T.bg measured 4.38:1, fails AA)', () => {
      const { container } = renderLanding();
      const hero = container.querySelector('#hero')!;
      const subcopy = [...hero.querySelectorAll('p')]
        .find(p => p.textContent?.includes('The only AI that knows you'));
      expect(subcopy).toBeTruthy();
      // hsl(230, 10%, 42%) on T.bg = 5.42:1 -> rgb(96, 100, 118) (same fix as
      // landing-cta's chapter label/subcopy).
      expect(subcopy!.style.color).toBe('rgb(96, 100, 118)');
    });

    it('fixes the Hero scroll-cue label contrast (T.muted on T.bg measured 4.38:1, fails AA)', () => {
      const { container } = renderLanding();
      const hero = container.querySelector('#hero')!;
      const cue = findByExactText(hero, 'span', 'Scroll');
      expect(cue).toBeTruthy();
      expect(cue!.style.color).toBe('rgb(96, 100, 118)');
    });

    it('fixes the Navbar light-mode nav links contrast (T.muted on T.bg measured 4.38:1, fails AA)', () => {
      const { container } = renderLanding();
      const nav = container.querySelector('nav')!;
      const link = [...nav.querySelectorAll('a')].find(a => a.textContent?.trim() === 'Features');
      expect(link).toBeTruthy();
      expect(link!.style.color).toBe('rgb(96, 100, 118)');
    });

    it('fixes the Navbar light-mode "Log in" link contrast (T.muted on T.bg measured 4.38:1, fails AA)', () => {
      const { container } = renderLanding();
      const nav = container.querySelector('nav')!;
      const login = [...nav.querySelectorAll('a')].find(a => a.textContent?.trim() === 'Log in');
      expect(login).toBeTruthy();
      expect(login!.style.color).toBe('rgb(96, 100, 118)');
    });

    it('fixes the Footer copyright line contrast (T.muted at opacity 0.35 on T.surface measured ~1.56:1, fails AA hard)', () => {
      const { container } = renderLanding();
      const copyright = findByExactText(container, 'span', '© 2026 Rivly');
      expect(copyright).toBeTruthy();
      // Un-dimmed T.muted on T.surface measures 4.56:1 and passes — the
      // opacity dimming (not the color itself) was the defect, so the fix
      // is to drop it, matching the sibling footer links' styling (no
      // opacity set at all).
      expect(copyright!.style.opacity).toBe('');
      expect(copyright!.style.color).toBe('rgb(110, 114, 135)');
    });
  });
});
