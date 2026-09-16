import { processOfflineCommand } from '../riva-offline';
import * as dateUtils from '@/lib/dateUtils';
import * as PlanningEngine from '@/services/PlanningEngine';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock dependencies for predictable tests
vi.mock('@/lib/dateUtils', () => ({
  getLocalDateKey: vi.fn(() => '2026-03-09'),
}));

vi.mock('@/services/PlanningEngine', () => ({
  getPlanOptions: vi.fn(),
}));

describe('processOfflineCommand', () => {
  let mockTasks: any[];
  let mockAddTask: any;

  beforeEach(() => {
    mockAddTask = vi.fn();
    mockTasks = [
      { id: 't1', title: 'Buy milk', status: 'todo', dateKey: '2026-03-09' },
      { id: 't2', title: 'Call dad', status: 'todo', dateKey: '2026-03-09' },
      { id: 't3', title: 'Pay bills', status: 'todo', dateKey: '2026-03-09' },
      { id: 't4', title: 'Read book', status: 'todo', dateKey: '2026-03-09' },
      { id: 't5', title: 'Done task', status: 'done', dateKey: '2026-03-09' },
    ];
    vi.clearAllMocks();
  });

  describe('Command: Add Task', () => {
    it('should extract the title, call addTask, and return a success message', () => {
      const response = processOfflineCommand('add task walk the dog', mockTasks, mockAddTask);

      expect(mockAddTask).toHaveBeenCalledWith({
        title: 'Walk dog',
        status: 'todo',
        dateKey: '2026-03-09',
        tag: 'other',
      });

      expect(response).toEqual({
        message: 'Got it! Task added.',
        action: 'online_response',
        data: { taskTitle: 'Walk dog' },
      });
    });

    it('should handle complex names properly (capitalization)', () => {
      const response = processOfflineCommand('add task prepare the Q3 presentation', mockTasks, mockAddTask);
      expect(response?.message).toBe('Got it! Task added.');
      expect(mockAddTask.mock.calls[0][0].title).toBe('Prepare Q3 presentation');
    });
  });

  describe('Command: Plan My Day', () => {
    it('should generate a summary with the first 3 items when there are many tasks', () => {
      // Mock PlanningEngine to return our 4 pending tasks
      vi.mocked(PlanningEngine.getPlanOptions).mockReturnValueOnce([{
        taskIds: ['t1', 't2', 't3', 't4']
      }] as any);

      const response = processOfflineCommand('plan my day', mockTasks, mockAddTask);
      
      expect(response).toEqual({
        message: 'Here is your plan. You have 4 tasks: Buy milk, Call dad, Pay bills, and more.',
        action: 'online_response',
        data: {}
      });
    });

    it('should format correctly without "and more" for 3 or fewer tasks', () => {
      vi.mocked(PlanningEngine.getPlanOptions).mockReturnValueOnce([{
        taskIds: ['t1', 't2']
      }] as any);

      const response = processOfflineCommand('schedule my day', mockTasks, mockAddTask);
      
      expect(response).toEqual({
        message: 'Here is your plan. You have 2 tasks: Buy milk, Call dad.',
        action: 'online_response',
        data: {}
      });
    });

    it('should handle empty task lists', () => {
      vi.mocked(PlanningEngine.getPlanOptions).mockReturnValueOnce([{ taskIds: [] }] as any);

      const response = processOfflineCommand('plan my day', mockTasks, mockAddTask);
      expect(response?.message).toBe('You have no tasks to plan for today.');
    });
  });

  describe('Command: Next Task', () => {
    it('should find the very first incomplete task for today', () => {
      const response = processOfflineCommand('what is my next task', mockTasks, mockAddTask);
      
      expect(response).toEqual({
        message: 'Your next task is: Buy milk',
        action: 'online_response',
      });
    });

    it('should find the next task correctly even if earlier ones are completed', () => {
      // Complete the first two tasks
      mockTasks[0].status = 'done';
      mockTasks[1].status = 'done';
      
      const response = processOfflineCommand('next task', mockTasks, mockAddTask);
      
      expect(response).toEqual({
        message: 'Your next task is: Pay bills',
        action: 'online_response',
      });
    });

    it('should return a fallback message if all tasks are done or array is empty', () => {
      const emptyTasks = mockTasks.filter(t => t.status === 'done'); // Only 'Done task' remains
      const response = processOfflineCommand('what is my next task', emptyTasks, mockAddTask);
      
      expect(response).toEqual({
         message: 'You have no incomplete tasks for today.',
         action: 'online_response'
      });
    });
  });
});
