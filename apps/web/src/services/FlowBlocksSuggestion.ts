/**
 * Flow Blocks: suggest deep work blocks based on energy level and free slots.
 */

import type { TimeBlock } from '@/types';
import { getLocalDateKey } from '@/lib/dateUtils';

export interface FlowBlockSuggestion {
  title: string;
  startTime: string; // "HH:mm"
  endTime: string;
  durationMinutes: number;
  reason: string;
}

/**
 * Suggest 1–2 deep work blocks for the day.
 * - If energy is high (7+), suggest a 90-min block in the first free slot.
 * - If energy is mid (4–6), suggest a 60-min block.
 * - If energy is low (1–3), suggest a 30-min block or skip.
 */
export function suggestFlowBlocks(
  dateKey: string,
  existingBlocks: TimeBlock[],
  energyLevel: number = 5
): FlowBlockSuggestion[] {
  const suggestions: FlowBlockSuggestion[] = [];
  const isToday = dateKey === getLocalDateKey();

  // Default slot: morning 9–10:30 or 10–11:30 if no blocks
  const morningStart = 9 * 60; // 09:00
  const morningEnd = 12 * 60;  // 12:00

  let duration = 60;
  if (energyLevel >= 7) duration = 90;
  else if (energyLevel <= 3) duration = 30;

  const blockedMinutes = new Set<number>();
  existingBlocks.forEach((b) => {
    const [sh, sm] = b.startTime.split(':').map(Number);
    const [eh, em] = b.endTime.split(':').map(Number);
    const startM = sh * 60 + sm;
    const endM = eh * 60 + em;
    for (let m = startM; m < endM; m++) blockedMinutes.add(m);
  });

  // Find first free slot in morning window
  for (let startM = morningStart; startM < morningEnd - duration; startM += 30) {
    let free = true;
    for (let m = startM; m < startM + duration; m++) {
      if (blockedMinutes.has(m)) {
        free = false;
        break;
      }
    }
    if (free) {
      const sh = Math.floor(startM / 60);
      const sm = startM % 60;
      const eh = Math.floor((startM + duration) / 60);
      const em = (startM + duration) % 60;
      const startTime = `${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}`;
      const endTime = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
      suggestions.push({
        title: 'Deep work',
        startTime,
        endTime,
        durationMinutes: duration,
        reason: energyLevel >= 7
          ? 'Your energy is high — good time for a long focus block.'
          : energyLevel <= 3
          ? 'Keep it short and gentle.'
          : 'A solid block to get into flow.',
      });
      break; // One suggestion only for now
    }
  }

  return suggestions;
}
