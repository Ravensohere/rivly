import { computeReschedule, getOverdueTasks } from '../SmartReschedule';
import { Task } from '@/types';
import * as dateUtils from '@/lib/dateUtils';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Fix Vitest/Jest Global Mapping
const jest = vi;

// Mock dateUtils
vi.mock('@/lib/dateUtils', () => ({
  getLocalDateKey: vi.fn(),
  getDateKeyOffset: vi.fn()
}));

describe('SmartReschedule', () => {
  beforeEach(() => {
    // Assert today is March 9th, 2026 exactly.
    vi.mocked(dateUtils.getLocalDateKey).mockReturnValue('2026-03-09');
    
    // Simplistic mock to visualize the mathematical day shift happening under the hood
    vi.mocked(dateUtils.getDateKeyOffset).mockImplementation((offset: number) => {
      return `OFFSET_${offset}`;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getOverdueTasks', () => {
    it('returns only tasks marked "todo" from before today', () => {
      const tasks: Task[] = [
        { id: '1', title: 'A', status: 'todo', tag: 'work', dateKey: '2026-03-08' }, // Yesterday (overdue)
        { id: '2', title: 'B', status: 'completed', tag: 'work', dateKey: '2026-03-07' }, // Completed (ignore)
        { id: '3', title: 'C', status: 'todo', tag: 'work', dateKey: '2026-03-09' }, // Today (ignore)
        { id: '4', title: 'D', status: 'todo', tag: 'work', dateKey: '2026-03-10' }, // Future (ignore)
      ] as any;

      const overdue = getOverdueTasks(tasks);
      expect(overdue.length).toBe(1);
      expect(overdue[0].id).toBe('1');
    });
  });

  describe('computeReschedule', () => {
    it('schedules based on severity: 3 days -> Today [0], 2 days -> Tmrw [1], 1 day -> DayAfter [2]', () => {
      const tasks: Task[] = [
        { id: 'overdue-3-days', title: 'A', tag: 'work', status: 'todo', dateKey: '2026-03-06' }, // 3 days ago
        { id: 'overdue-1-day', title: 'B', tag: 'work', status: 'todo', dateKey: '2026-03-08' }, // 1 day ago
        { id: 'overdue-2-days', title: 'C', tag: 'work', status: 'todo', dateKey: '2026-03-07' }  // 2 days ago
      ] as any;

      const res = computeReschedule(tasks);
      
      // Look up expected results by ID to verify it ignored original array sequence
      const highlyOverdue = res.find(r => r.taskId === 'overdue-3-days');
      const medOverdue = res.find(r => r.taskId === 'overdue-2-days');
      const lightlyOverdue = res.find(r => r.taskId === 'overdue-1-day');

      expect(highlyOverdue?.newDateKey).toBe('OFFSET_0'); // Assign to Today
      expect(medOverdue?.newDateKey).toBe('OFFSET_1'); // Assign to Tomorrow
      expect(lightlyOverdue?.newDateKey).toBe('OFFSET_2'); // Assign to Day After
    });

    it('sorts identically severe tasks by tag priority (Work -> Personal)', () => {
      // Both are exactly 2 days overdue (2026-03-07)
      const tasks: Task[] = [
        { id: 'personal-task', title: 'P', tag: 'personal', status: 'todo', dateKey: '2026-03-07' },
        { id: 'work-task', title: 'W', tag: 'work', status: 'todo', dateKey: '2026-03-07' },
      ] as any;

      const res = computeReschedule(tasks);
      
      // Since they are same severity, they both get OFFSET_1 because daysOverdue === 2.
      // But we can verify `computeReschedule` processes them in correct order.
      // Result array will list 'work-task' at 0, 'personal-task' at 1
      expect(res[0].taskId).toBe('work-task');
      expect(res[1].taskId).toBe('personal-task');
      
      expect(res[0].newDateKey).toBe('OFFSET_1');
      expect(res[1].newDateKey).toBe('OFFSET_1');
    });
  });
});
