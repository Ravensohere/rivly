import { parseNaturalTask } from '../naturalLanguageTask';

describe('parseNaturalTask', () => {
  // Using March 6, 2026 as base date, which is a Friday
  const BASE_DATE = new Date('2026-03-06T00:00:00');

  describe('Date parsing', () => {
    it('parses "tomorrow" correctly', () => {
      const result = parseNaturalTask('Call mom tomorrow', BASE_DATE);
      expect(result.dateKey).toBe('2026-03-07');
      expect(result.title).toBe('Call mom');
    });

    it('parses Hindi "kal" correctly', () => {
      const result = parseNaturalTask('Submit report kal', BASE_DATE);
      expect(result.dateKey).toBe('2026-03-07');
      expect(result.title).toBe('Submit report');
    });

    it('parses explicit dates like "26 march"', () => {
      const result = parseNaturalTask('Meeting on 26 march', BASE_DATE);
      expect(result.dateKey).toBe('2026-03-26');
      expect(result.title).toBe('Meeting');
    });

    it('parses "next monday"', () => {
      const result = parseNaturalTask('Review PR next monday', BASE_DATE);
      // Next Monday from Friday March 6 is March 9
      expect(result.dateKey).toBe('2026-03-09');
      expect(result.title).toBe('Review PR');
    });
  });

  describe('Time parsing', () => {
    it('parses explicit am/pm time', () => {
      const result = parseNaturalTask('Call at 5pm', BASE_DATE);
      expect(result.time).toBe('17:00');
      expect(result.title).toBe('Call');
    });

    it('parses military-style / HH:mm time', () => {
      const result = parseNaturalTask('Standup at 10:30', BASE_DATE);
      expect(result.time).toBe('10:30');
      expect(result.title).toBe('Standup');
    });

    it('parses conversational keywords like "morning"', () => {
      const result = parseNaturalTask('Study in the morning', BASE_DATE);
      expect(result.time).toBe('09:00');
      expect(result.title).toBe('Study');
    });

    it('parses Hindi time keywords like "shaam ko"', () => {
      const result = parseNaturalTask('shaam ko gym', BASE_DATE);
      expect(result.time).toBe('18:00');
      expect(result.title).toBe('gym');
    });
  });

  describe('Tag parsing', () => {
    it('extracts hashtags leaving a clean title', () => {
      const result = parseNaturalTask('Buy milk #personal', BASE_DATE);
      expect(result.tag).toBe('personal');
      expect(result.title).toBe('Buy milk');
    });

    it('extracts tags and priorities simultaneously', () => {
      const result = parseNaturalTask('Submit report #work p1', BASE_DATE);
      expect(result.tag).toBe('work');
      expect(result.priority).toBe(1);
      expect(result.title).toBe('Submit report');
    });
  });

  describe('Priority parsing', () => {
    it('extracts conversational "urgent"', () => {
      const result = parseNaturalTask('Fix bug urgent', BASE_DATE);
      expect(result.priority).toBe(1);
      expect(result.title).toBe('Fix bug');
    });

    it('extracts explicit p-codes like "p3"', () => {
      const result = parseNaturalTask('Clean room p3', BASE_DATE);
      expect(result.priority).toBe(3);
      expect(result.title).toBe('Clean room');
    });

    it('extracts exclamation marks', () => {
      const result = parseNaturalTask('Reply emails !!', BASE_DATE);
      expect(result.priority).toBe(2);
      expect(result.title).toBe('Reply emails');
    });
  });

  describe('Multi-line input', () => {
    it('splits lines intelligently and parses each as a subtask', () => {
      const input = "Call mom\nBuy milk\nSubmit report";
      const result = parseNaturalTask(input, BASE_DATE);
      
      expect(result.isMultiLine).toBe(true);
      expect(result.tasks).toBeDefined();
      expect(result.tasks?.length).toBe(3);
      if (result.tasks) {
        expect(result.tasks[0].title).toBe('Call mom');
        expect(result.tasks[1].title).toBe('Buy milk');
        expect(result.tasks[2].title).toBe('Submit report');
      }
    });
  });
});
