import {
  estimateTaskDuration,
  getAvailableSlots,
  buildEnergyAwarePlan,
  TimeSlot
} from '../PlanningEngine';
import { Task, TimeBlock } from '@/types';

/**
 * getAvailableSlots only reads the time fields, but TimeBlock requires more.
 * This fills the rest so the fixtures stay valid as the type evolves.
 */
function makeBlock(block: Pick<TimeBlock, 'id' | 'startTime' | 'endTime' | 'color'>): TimeBlock {
  return {
    dateKey: '2026-01-01',
    title: `Block ${block.id}`,
    status: 'planned',
    tasks: [],
    ...block,
  };
}

describe('PlanningEngine', () => {
  describe('estimateTaskDuration', () => {
    it('returns 15 for <= 3 words', () => {
      expect(estimateTaskDuration('Buy milk')).toBe(15);
    });

    it('returns 30 for <= 6 words', () => {
      expect(estimateTaskDuration('Write the project summary')).toBe(30);
    });

    it('returns 60 for > 6 words', () => {
      expect(estimateTaskDuration('Prepare the complete Q4 financial analysis presentation')).toBe(60);
    });
  });

  describe('getAvailableSlots', () => {
    beforeAll(() => {
      jest.useFakeTimers();
      // Mock system time to 8:00 AM local time
      jest.setSystemTime(new Date(new Date().setHours(8, 0, 0, 0)));
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('finds slots between blocks, auto-inserts lunch, excludes past time', () => {
      const blocks: TimeBlock[] = [
        makeBlock({ id: '1', startTime: '09:00', endTime: '10:00', color: 'blue' }),
        makeBlock({ id: '2', startTime: '11:00', endTime: '12:00', color: 'green' })
      ];

      const slots = getAvailableSlots(blocks, true);
      
      // Expected:
      // Current time is 8am (480 mins)
      // 8am - 9am (480 - 540)
      // 10am - 11am (600 - 660)
      // 12pm - 1pm (720 - 780), then 1pm (780) is lunch (60 mins), so 2pm (840) to EOD
      
      expect(slots).toEqual([
        { startMin: 480, endMin: 540, durationMin: 60 },
        { startMin: 600, endMin: 660, durationMin: 60 },
        { startMin: 720, endMin: 780, durationMin: 60 },
        { startMin: 840, endMin: 1439, durationMin: 599 }
      ]);
    });

    it('does NOT insert lunch twice if overlapping block exists at 1pm', () => {
      const blocks: TimeBlock[] = [
        makeBlock({ id: '1', startTime: '12:30', endTime: '13:30', color: 'blue' }) // Overlaps 13:00-14:00 lunch
      ];

      const slots = getAvailableSlots(blocks, true);
      
      // Expected:
      // cursor at 480
      // 480 - 750 (12:30)
      // 810 (13:30) - 1439 (EOD)
      // No lunch split because block overlaps 13:00-14:00
      
      expect(slots).toEqual([
        { startMin: 480, endMin: 750, durationMin: 270 },
        { startMin: 810, endMin: 1439, durationMin: 629 }
      ]);
    });
  });

  describe('buildEnergyAwarePlan', () => {
    it('schedules tasks based on length heuristics, avoids after 7pm if possible', () => {
      const tasks: Task[] = [
        { id: '1', title: 'Prepare the complete Q4 financial analysis presentation', status: 'todo', tag: 'work', dateKey: '' }, // 60m
        { id: '2', title: 'Write the project summary', status: 'todo', tag: 'work', dateKey: '' }, // 30m
        { id: '3', title: 'Buy milk', status: 'todo', tag: 'personal', dateKey: '' } // 15m
      ];
      
      const slots: TimeSlot[] = [
        { startMin: 540, endMin: 600, durationMin: 60 }, // 9am - 10am
        { startMin: 840, endMin: 900, durationMin: 60 }  // 2pm - 3pm
      ];
      
      const plan = buildEnergyAwarePlan(tasks, slots, 2);
      
      expect(plan.length).toBe(3);
      
      // T1 (60 min) takes first 60min slot -> 540 (9am)
      expect(plan[0].task.id).toBe('1');
      expect(plan[0].startMin).toBe(540);
      expect(plan[0].durationMin).toBe(60);
      
      // T2 (30 min) takes first 30min+ slot -> 840 (2pm)
      expect(plan[1].task.id).toBe('2');
      expect(plan[1].startMin).toBe(840);
      
      // T3 (15 min) takes remaining in 2pm slot -> 870 (2:30pm)
      expect(plan[2].task.id).toBe('3');
      expect(plan[2].startMin).toBe(870);
    });

    it('reverses order when energyLevel = 1 (light tasks first)', () => {
      const tasks: Task[] = [
        { id: 'hard', title: 'Prepare the complete Q4 financial analysis presentation', status: 'todo', tag: 'work', dateKey: '' }, // 60
        { id: 'easy', title: 'Buy milk', status: 'todo', tag: 'personal', dateKey: '' } // 15
      ];
      
      const slots: TimeSlot[] = [
        { startMin: 540, endMin: 600, durationMin: 60 },
      ];
      
      const plan = buildEnergyAwarePlan(tasks, slots, 1);
      
      // With energyLevel=1, easy goes first. So easy at 540, hard goes after.
      expect(plan[0].task.id).toBe('easy');
      expect(plan[0].startMin).toBe(540);
      
      // Hard is scheduled at 555 (540 + 15)
      expect(plan[1].task.id).toBe('hard');
      expect(plan[1].startMin).toBe(555);
    });
  });
});
