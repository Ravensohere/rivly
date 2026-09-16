import { describe, it, expect, vi, afterEach } from 'vitest';
import { groqChat } from './groq';
import { AI_MODELS } from '../../config/constants';

type Call = { model: string; max_tokens: number; reasoning_effort?: string };

/** Mock the Groq endpoint, replying with a queue of scripted responses. */
function mockGroq(responses: Array<{ status?: number; content?: string; finish?: string }>) {
  const calls: Call[] = [];
  let i = 0;
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init: any) => {
    const body = JSON.parse(init.body);
    calls.push({
      model: body.model,
      max_tokens: body.max_tokens,
      reasoning_effort: body.reasoning_effort,
    });
    const r = responses[Math.min(i++, responses.length - 1)];
    if (r.status && r.status >= 400) {
      return { ok: false, status: r.status, text: async () => 'boom' } as any;
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: r.content ?? 'hi' }, finish_reason: r.finish ?? 'stop' }],
      }),
    } as any;
  }));
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

describe('groqChat reasoning budget', () => {
  // Regression: gpt-oss spends reasoning tokens before emitting content, and
  // they count against max_tokens. Without an explicit effort, a 120-token
  // briefing came back as an empty string with finish_reason "length".
  it("defaults to reasoning_effort 'low' so small budgets still produce content", async () => {
    const calls = mockGroq([{ content: 'good morning' }]);
    await groqChat('k', [{ role: 'user', content: 'hi' }], { max_tokens: 120 });
    expect(calls[0].reasoning_effort).toBe('low');
  });

  it('lets a caller opt into deeper reasoning', async () => {
    const calls = mockGroq([{ content: '{}' }]);
    await groqChat('k', [{ role: 'user', content: 'hi' }], { reasoningEffort: 'medium' });
    expect(calls[0].reasoning_effort).toBe('medium');
  });

  it('retries with a larger budget when reasoning consumed everything', async () => {
    const calls = mockGroq([
      { content: '', finish: 'length' },
      { content: 'recovered' },
    ]);
    const out = await groqChat('k', [{ role: 'user', content: 'hi' }], { max_tokens: 60 });
    expect(out).toBe('recovered');
    expect(calls[1].max_tokens).toBeGreaterThanOrEqual(800);
  });

  it('does not retry the budget forever', async () => {
    const calls = mockGroq([{ content: '', finish: 'length' }]);
    const out = await groqChat('k', [{ role: 'user', content: 'hi' }], { max_tokens: 60 });
    expect(out).toBe('');
    expect(calls).toHaveLength(2);
  });
});

describe('groqChat model degradation', () => {
  // Regression: the degrade target used to be AI_CONFIG.groq.model, which IS
  // the fast tier, so `model !== AI_CONFIG.groq.model` was false for a
  // fast-tier failure and it threw with no fallback attempted.
  it('falls back to another model when the fast tier is decommissioned', async () => {
    const calls = mockGroq([{ status: 404 }, { content: 'from fallback' }]);
    const out = await groqChat('k', [{ role: 'user', content: 'hi' }], { model: AI_MODELS.fast });
    expect(out).toBe('from fallback');
    expect(calls[0].model).toBe(AI_MODELS.fast);
    expect(calls[1].model).toBe(AI_MODELS.quality);
  });

  it('falls back from the quality tier too', async () => {
    const calls = mockGroq([{ status: 429 }, { content: 'ok' }]);
    await groqChat('k', [{ role: 'user', content: 'hi' }], { model: AI_MODELS.quality });
    expect(calls[1].model).toBe(AI_MODELS.fast);
  });

  it('gives up instead of looping once every model has been tried', async () => {
    const calls = mockGroq([{ status: 404 }]);
    await expect(
      groqChat('k', [{ role: 'user', content: 'hi' }], { model: AI_MODELS.fast })
    ).rejects.toThrow(/Groq API Error \(404\)/);
    expect(calls).toHaveLength(2);
  });

  it('does not degrade on a non-retryable status', async () => {
    const calls = mockGroq([{ status: 401 }]);
    await expect(groqChat('k', [{ role: 'user', content: 'hi' }])).rejects.toThrow(/401/);
    expect(calls).toHaveLength(1);
  });
});
