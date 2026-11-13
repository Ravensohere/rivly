import { render, fireEvent, act } from '@testing-library/react';
import { it, expect, vi, beforeEach } from 'vitest';
import { DayPlannerAvatar } from '../DayPlannerAvatar';

const rivaState = {
  isListening: false,
  isProcessing: false,
  startListening: vi.fn(),
  stopListening: vi.fn(),
  setIsCommandBarOpen: vi.fn(),
};

const orbState = {
  currentState: 'neutral' as 'neutral' | 'focused' | 'overwhelmed' | 'settled',
  dayColors: [] as string[],
  getTooltipMessage: () => 'Tooltip',
  isTransitioning: false,
};

vi.mock('@/hooks/useRiva', () => ({
  useRiva: () => rivaState,
}));

vi.mock('@/contexts/RhythmOrbContext', () => ({
  useRhythmOrbContext: () => orbState,
}));

beforeEach(() => {
  rivaState.isListening = false;
  rivaState.isProcessing = false;
  rivaState.startListening = vi.fn();
  rivaState.stopListening = vi.fn();
  rivaState.setIsCommandBarOpen = vi.fn();
  orbState.currentState = 'neutral';
  orbState.dayColors = [];
  vi.useRealTimers();
});

it('opens the command bar on a quick tap (under 500ms)', () => {
  const { container } = render(<DayPlannerAvatar size="md" />);
  const el = container.querySelector('[role="button"]') as HTMLElement;
  fireEvent.pointerDown(el);
  fireEvent.pointerUp(el);
  expect(rivaState.setIsCommandBarOpen).toHaveBeenCalledWith(true);
  expect(rivaState.startListening).not.toHaveBeenCalled();
});

it('starts listening on a hold past 500ms, not on a quick tap', () => {
  vi.useFakeTimers();
  const { container } = render(<DayPlannerAvatar size="md" />);
  const el = container.querySelector('[role="button"]') as HTMLElement;
  fireEvent.pointerDown(el);
  act(() => {
    vi.advanceTimersByTime(600);
  });
  fireEvent.pointerUp(el);
  expect(rivaState.startListening).toHaveBeenCalledTimes(1);
  expect(rivaState.setIsCommandBarOpen).not.toHaveBeenCalled();
  vi.useRealTimers();
});

it('shows the voice state immediately even if a mood trigger fires mid-listen', () => {
  rivaState.isListening = true;
  orbState.currentState = 'focused';
  const { container } = render(<DayPlannerAvatar size="md" />);
  // RivaAvatar's "listening" state renders wide eyes (wide=true); mood 'focused' would not.
  // We assert via the avatar root being present and no crash — the precise state prop is an
  // implementation detail of RivaAvatar verified in its own test; here we assert the wrapper
  // actually derives 'listening' by checking isListening wins over currentState='focused'
  // using RivaAvatar's eye width contract: a focused-mood eye is narrower than a listening one.
  const eye = container.querySelectorAll('[style*="border-radius"]')[1] as HTMLElement;
  expect(eye).toBeTruthy();
  // listening -> wide=true -> eyeHeight = size*0.48 (tall); focused mood would instead apply
  // a narrower width. Confirm width reflects the *non*-mood (listening) branch: full eyeWidth.
  const expectedListeningWidth = 160 * 0.62 * 0.16; // size='md' -> 160px, pill height*0.16
  expect(parseFloat(eye.style.width)).toBeCloseTo(expectedListeningWidth, 2);
});

it('passes dayColors as moodColor when present', () => {
  orbState.dayColors = ['200 80% 65%'];
  const { container } = render(<DayPlannerAvatar size="md" />);
  const eye = container.querySelectorAll('[style*="border-radius"]')[1] as HTMLElement;
  expect(eye.style.background).not.toBe('rgb(255, 255, 255)');
});
