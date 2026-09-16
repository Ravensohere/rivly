/**
 * Smart Reschedule: one-click rebalance of overdue tasks by priority.
 * Spreads overdue todo tasks across the next few days (today + next 4) by tag priority.
 */

import type { Task } from '@/types';
import { getLocalDateKey, getDateKeyOffset } from '@/lib/dateUtils';

const TAG_ORDER: Record<string, number> = {
  work: 0,
  study: 1,
  health: 2,
  personal: 3,
  other: 4,
};

export interface RescheduleItem {
  taskId: string;
  title: string;
  tag: string;
  oldDateKey: string;
  newDateKey: string;
}

/**
 * Get overdue todo tasks (dateKey < today).
 */
export function getOverdueTasks(tasks: Task[]): Task[] {
  const today = getLocalDateKey();
  return tasks.filter(
    (t) => t.status === 'todo' && t.dateKey < today
  );
}

/**
 * Compute a balanced reschedule prioritizing highly overdue items earlier.
 */
export function computeReschedule(overdueTasks: Task[]): RescheduleItem[] {
  if (overdueTasks.length === 0) return [];

  const todayStr = getLocalDateKey();
  const todayDate = new Date(`${todayStr}T00:00:00`);

  // Calculate days overdue properly
  const getDaysOverdue = (taskDateKey: string) => {
    const taskDate = new Date(`${taskDateKey}T00:00:00`);
    const diffTime = Math.abs(todayDate.getTime() - taskDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const sorted = [...overdueTasks].sort((a, b) => {
    // Primary sort: Days Overdue (Descending)
    const overdueA = getDaysOverdue(a.dateKey);
    const overdueB = getDaysOverdue(b.dateKey);
    if (overdueA !== overdueB) return overdueB - overdueA;
    
    // Secondary sort: Tag priority
    return (TAG_ORDER[a.tag] ?? 5) - (TAG_ORDER[b.tag] ?? 5);
  });

  const result: RescheduleItem[] = [];
  
  sorted.forEach((task) => {
    const daysOverdue = getDaysOverdue(task.dateKey);
    let dayOffset = 0;
    
    // Urgency mapping table
    if (daysOverdue >= 3) {
        dayOffset = 0; // Today
    } else if (daysOverdue === 2) {
        dayOffset = 1; // Tomorrow
    } else {
        dayOffset = 2; // Day After
    }

    const newDateKey = getDateKeyOffset(dayOffset);
    
    result.push({
      taskId: task.id,
      title: task.title,
      tag: task.tag,
      oldDateKey: task.dateKey,
      newDateKey,
    });
  });
  
  return result;
}
