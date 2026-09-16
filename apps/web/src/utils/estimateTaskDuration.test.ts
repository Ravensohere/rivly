import { estimateTaskDuration } from './estimateTaskDuration';

describe('estimateTaskDuration', () => {
  it('returns 15 for tasks with 3 or fewer words', () => {
    expect(estimateTaskDuration('Call mom')).toBe(15);
    expect(estimateTaskDuration('Buy more milk')).toBe(15);
    expect(estimateTaskDuration('Read')).toBe(15);
  });

  it('returns 30 for tasks with 4 to 6 words', () => {
    expect(estimateTaskDuration('Write the report introduction')).toBe(30);
    expect(estimateTaskDuration('Send email to the team')).toBe(30);
    expect(estimateTaskDuration('Finish the new mockups')).toBe(30);
  });

  it('returns 60 for tasks with more than 6 words', () => {
    expect(estimateTaskDuration('Complete the full quarterly financial analysis report')).toBe(60);
    expect(estimateTaskDuration('Brainstorm and document all new marketing ideas')).toBe(60);
    expect(estimateTaskDuration('Research and write a summary of the new feature')).toBe(60);
  });
});
