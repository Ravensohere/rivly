import { render, fireEvent } from '@testing-library/react';
import { it, expect, vi } from 'vitest';
import { RivaAvatar } from '../RivaAvatar';

it('exports RivaAvatar and renders the idle state without crashing', () => {
  const { container } = render(<RivaAvatar state="idle" size={80} />);
  expect(container.querySelector('[role="button"]')).toBeTruthy();
});

it('renders narrower eyes for focused mood than idle', () => {
  // index 0 is the pill wrapper (also has border-radius); index 1/2 are the two eyes.
  const { container: focusedContainer } = render(<RivaAvatar state="focused" size={100} />);
  const { container: idleContainer } = render(<RivaAvatar state="idle" size={100} />);
  const focusedEye = focusedContainer.querySelectorAll('[style*="border-radius"]')[1] as HTMLElement;
  const idleEye = idleContainer.querySelectorAll('[style*="border-radius"]')[1] as HTMLElement;
  expect(focusedEye).toBeTruthy();
  expect(parseFloat(focusedEye.style.width)).toBeCloseTo(parseFloat(idleEye.style.width) * 0.85, 2);
});

it('applies moodColor as the glow color when provided and no voice state is active', () => {
  const { container } = render(<RivaAvatar state="settled" moodColor="hsl(200 80% 65%)" size={100} />);
  const eye = container.querySelectorAll('[style*="border-radius"]')[1] as HTMLElement;
  // moodColor applied: background is the mood color (not the default white eyeColor), and the
  // box-shadow is valid, non-empty CSS (regression guard: appending a hex alpha suffix to a
  // non-hex color string like hsl(...) produces invalid CSS that browsers/jsdom silently drop).
  expect(eye.style.background).not.toBe('rgb(255, 255, 255)');
  expect(eye.style.boxShadow).not.toBe('');
});

it('does not use moodColor glow during an active voice state', () => {
  const { container } = render(<RivaAvatar state="listening" moodColor="hsl(200 80% 65%)" eyeColor="#ffffff" size={100} />);
  const eye = container.querySelectorAll('[style*="border-radius"]')[1] as HTMLElement;
  expect(eye.style.background).toBe('rgb(255, 255, 255)');
});

it('starts a tap reaction on press and calls onPress', () => {
  const onPress = vi.fn();
  const { container } = render(<RivaAvatar state="idle" size={80} onPress={onPress} />);
  const root = container.querySelector('[role="button"]') as HTMLElement;
  fireEvent.click(root);
  expect(onPress).toHaveBeenCalledTimes(1);
});
