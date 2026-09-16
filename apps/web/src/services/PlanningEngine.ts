/**
 * Smart Planning Engine: generates 3 daily plan options based on check-in metrics.
 * Plans are suggested based on: mood, energy, sleep quality, and intent
 */

import type { Task, TimeBlock } from '@/types';

export type PlanKind = 'full' | 'steady' | 'focus';

export interface PlanOption {
  id: PlanKind;
  label: string;
  description: string;
  taskIds: string[];
  blockIds: string[];
}

export interface CheckInData {
  mood?: number;
  energy?: number;
  sleepQuality?: number;
  intent?: string;
}

export interface PlanningInput {
  dateKey: string;
  tasks: Task[];
  blocks: TimeBlock[];
  checkIn?: CheckInData;
}

function orderTasksForPlan(tasks: Task[], blocks: TimeBlock[]): string[] {
  const byBlockOrder: string[] = [];
  const byTime = blocks
    .slice()
    .sort(
      (a, b) =>
        timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    );
  for (const b of byTime) {
    for (const tid of b.tasks) {
      if (tid && !byBlockOrder.includes(tid)) byBlockOrder.push(tid);
    }
  }
  const rest = tasks
    .filter((t) => !byBlockOrder.includes(t.id))
    .map((t) => t.id);
  return [...byBlockOrder, ...rest];
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * Returns all three plan options for the day.
 * Also suggests the best plan based on check-in data.
 */
export function getPlanOptions(input: PlanningInput): PlanOption[] {
  const { tasks, blocks, checkIn } = input;
  const todoTasks = tasks.filter((t) => t.status === 'todo');
  const blockIds = blocks.map((b) => b.id);
  const tasksInBlocks = new Set(blocks.flatMap((b) => b.tasks).filter(Boolean));
  const orderedTaskIds = orderTasksForPlan(todoTasks, blocks);

  const balancedTaskIds = [...orderedTaskIds];
  const lightCount = Math.max(1, Math.ceil(orderedTaskIds.length * 0.7));
  const lightTaskIds = orderedTaskIds.slice(0, lightCount);

  const survivalTaskIds = orderedTaskIds.filter((id) => tasksInBlocks.has(id));
  const rest = orderedTaskIds.filter((id) => !tasksInBlocks.has(id)).slice(0, 5);
  const survivalSet = new Set([...survivalTaskIds, ...rest]);
  const survivalOrdered = orderedTaskIds.filter((id) => survivalSet.has(id));

  const options: PlanOption[] = [
    {
      id: 'full',
      label: 'Full Day',
      description: 'Complete your full task list with breaks.',
      taskIds: balancedTaskIds,
      blockIds,
    },
    {
      id: 'steady',
      label: 'Steady',
      description: 'A comfortable pace — about 70% of your list.',
      taskIds: lightTaskIds,
      blockIds,
    },
    {
      id: 'focus',
      label: 'Focus',
      description: 'Prioritize essential tasks only.',
      taskIds: survivalOrdered,
      blockIds,
    },
  ];

  return options;
}

/**
 * Suggests the best plan kind based on check-in data
 * Uses mood, energy, sleep quality, and intent to determine the plan
 */
export function suggestPlanKind(checkIn?: CheckInData): PlanKind {
  if (!checkIn) return 'full';
  
  const { sleepQuality, energy, mood, intent } = checkIn;
  
  // Check explicit intent first - this is the user's stated goal for the day
  if (intent === 'calm') return 'steady';
  if (intent === 'productive' || intent === 'focused') return 'full';
  if (intent === 'light') return 'steady';
  if (intent === 'brave') return 'focus';
  
  // Calculate overall energy score (0-15 scale)
  // mood: 1-5, energy: 1-3 (mapped to 1-5), sleepQuality: 1-3 (mapped to 1-5)
  const energyScore = (mood || 3) + (energy || 3) + (sleepQuality || 3);
  
  // High energy (10-15): Full day
  if (energyScore >= 10) return 'full';
  
  // Medium energy (6-9): Steady pace
  if (energyScore >= 6) return 'steady';
  
  // Low energy (below 6): Focus on essentials only
  return 'focus';
}

/**
 * 1. Estimate Task Duration
 */
export function estimateTaskDuration(title: string): number {
  const words = title.trim().split(/\s+/).length;
  if (words <= 3) return 15;
  if (words <= 6) return 30;
  return 60;
}

export interface TimeSlot {
  startMin: number;
  endMin: number;
  durationMin: number;
}

/**
 * 2. Get Available Slots between blocks, accounting for current time and lunch
 */
export function getAvailableSlots(blocks: TimeBlock[], startFromNow = true): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const nowH = new Date().getHours();
  const nowM = new Date().getMinutes();
  const currentMinOffset = startFromNow ? nowH * 60 + nowM : 0;
  
  // End of day
  const EOD = 24 * 60 - 1; 

  const sortedBlocks = [...blocks]
    .map(b => {
      const start = timeToMinutes(b.startTime);
      const end = timeToMinutes(b.endTime);
      return { start, end };
    })
    .sort((a, b) => a.start - b.start);

  let cursor = currentMinOffset;

  for (const block of sortedBlocks) {
    if (cursor < block.start) {
      slots.push({
        startMin: cursor,
        endMin: block.start,
        durationMin: block.start - cursor
      });
    }
    cursor = Math.max(cursor, block.end);
  }

  if (cursor < EOD) {
    slots.push({
      startMin: cursor,
      endMin: EOD,
      durationMin: EOD - cursor
    });
  }

  // Inject Lunch if applicable (13:00 - 14:00) -> 780 to 840
  const LUNCH_START = 13 * 60;
  const LUNCH_END = 14 * 60;
  
  const hasBlockDuringLunch = sortedBlocks.some(b => 
    (b.start < LUNCH_END && b.end > LUNCH_START)
  );
  
  if (!hasBlockDuringLunch && currentMinOffset < LUNCH_START) {
      // Split slots that overlap with lunch
      const mappedWithLunch: TimeSlot[] = [];
      slots.forEach(slot => {
         if (slot.startMin < LUNCH_START && slot.endMin > LUNCH_END) {
             // Split perfectly around lunch
             mappedWithLunch.push({
                 startMin: slot.startMin,
                 endMin: LUNCH_START,
                 durationMin: LUNCH_START - slot.startMin
             });
             mappedWithLunch.push({
                 startMin: LUNCH_END,
                 endMin: slot.endMin,
                 durationMin: slot.endMin - LUNCH_END
             });
         } else if (slot.startMin < LUNCH_START && slot.endMin > LUNCH_START && slot.endMin <= LUNCH_END) {
             // Truncate end at lunch start
             mappedWithLunch.push({
                 startMin: slot.startMin,
                 endMin: LUNCH_START,
                 durationMin: LUNCH_START - slot.startMin
             });
         } else if (slot.startMin >= LUNCH_START && slot.startMin < LUNCH_END && slot.endMin > LUNCH_END) {
             // Delay start to post-lunch
             mappedWithLunch.push({
                 startMin: LUNCH_END,
                 endMin: slot.endMin,
                 durationMin: slot.endMin - LUNCH_END
             });
         } else if (slot.startMin >= LUNCH_START && slot.endMin <= LUNCH_END) {
             // Slot is completely swallowed by lunch - drop it
         } else {
             // Safe slot
             mappedWithLunch.push(slot);
         }
      });
      return mappedWithLunch.sort((a,b) => a.startMin - b.startMin);
  }

  return slots;
}

export interface PlannedTask {
  task: Task;
  startMin: number;
  durationMin: number;
}

/**
 * 3. Energy-Aware Mapping
 */
export function buildEnergyAwarePlan(tasks: Task[], slots: TimeSlot[], energyLevel: 1 | 2 | 3): PlannedTask[] {
  const planned: PlannedTask[] = [];
  
  // Helper to categorize tasks based on urgency/complexity
  // Simple heuristic: long duration = hard, short = easy
  let sortedTasks = [...tasks].sort((a, b) => estimateTaskDuration(b.title) - estimateTaskDuration(a.title));
  
  if (energyLevel === 1) {
      // Light Mode: Do easy tasks first
      sortedTasks.reverse();
  } else if (energyLevel === 2) {
      // Balanced: Mix? Let's just do normal descending
  } else {
      // High Energy: Hardest tasks first
  }

  let currentSlots = [...slots].map(s => ({ ...s })); // Deep copy mutable slots
  
  for (const task of sortedTasks) {
    const duration = estimateTaskDuration(task.title);
    
    let targetSlotIndex = -1;
    
    // Find best slot matching Energy Rules
    for (let i = 0; i < currentSlots.length; i++) {
        const s = currentSlots[i];
        if (s.startMin + duration <= 1140 && s.durationMin >= duration) {
            targetSlotIndex = i;
            break; // Found earliest fit
        }
    }
    
    // If no slot fits within the active day, fallback to ANY slot that fits
    if (targetSlotIndex === -1) {
        for (let i = 0; i < currentSlots.length; i++) {
            if (currentSlots[i].durationMin >= duration) {
               targetSlotIndex = i;
               break;
            }
        }
    }

    if (targetSlotIndex !== -1) {
        const slot = currentSlots[targetSlotIndex];
        
        planned.push({
            task,
            startMin: slot.startMin,
            durationMin: duration
        });
        
        slot.startMin += duration;
        slot.durationMin -= duration;
    } else if (currentSlots.length > 0) {
        // Ultimate fallback: if it doesn't fit ANY slot, just put it in the LARGEST slot available
        // even if it overflows (truncated display is better than missing task in this heuristic)
        let largestSlotIdx = 0;
        for (let i = 1; i < currentSlots.length; i++) {
            if (currentSlots[i].durationMin > currentSlots[largestSlotIdx].durationMin) {
                largestSlotIdx = i;
            }
        }
        
        const slot = currentSlots[largestSlotIdx];
        if (slot.durationMin > 0) {
            planned.push({
                task,
                startMin: slot.startMin,
                durationMin: Math.min(duration, slot.durationMin)
            });
            slot.startMin += duration; // effectively use it up
            slot.durationMin = 0;
        }
    }
  }

  return planned.sort((a,b) => a.startMin - b.startMin);
}

