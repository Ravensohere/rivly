import { describe, expect, it } from 'vitest';
import { firstNameOf, getGreeting, getGreetingWithName, getTimeOfDay } from '../greeting';

const at = (hour: number) => new Date(2026, 8, 8, hour, 0, 0);

describe('getTimeOfDay', () => {
  it('covers each boundary', () => {
    expect(getTimeOfDay(at(4))).toBe('night');
    expect(getTimeOfDay(at(5))).toBe('morning');
    expect(getTimeOfDay(at(11))).toBe('morning');
    expect(getTimeOfDay(at(12))).toBe('afternoon');
    expect(getTimeOfDay(at(16))).toBe('afternoon');
    expect(getTimeOfDay(at(17))).toBe('evening');
    expect(getTimeOfDay(at(20))).toBe('evening');
    expect(getTimeOfDay(at(21))).toBe('night');
    expect(getTimeOfDay(at(23))).toBe('night');
  });
});

describe('getGreetingWithName', () => {
  it('uses the first name only, with a comma', () => {
    expect(getGreetingWithName('Ravi Sovesh', at(18))).toBe('Good evening, Ravi');
  });

  it('drops the comma when there is no name', () => {
    expect(getGreetingWithName('', at(18))).toBe('Good evening');
    expect(getGreetingWithName(null, at(9))).toBe('Good morning');
  });

  it('agrees with the bare greeting at 21:00 — the bug this file exists to prevent', () => {
    expect(getGreeting(at(21))).toBe('Good night');
    expect(getGreetingWithName('Ravi', at(21))).toBe('Good night, Ravi');
  });
});

describe('firstNameOf', () => {
  it('trims and takes the first token', () => {
    expect(firstNameOf('  Ravi   Sovesh ')).toBe('Ravi');
    expect(firstNameOf('Ravi')).toBe('Ravi');
    expect(firstNameOf(undefined)).toBe('');
  });
});
