import { parseLlmStructuredOutput } from './chatbot.service';

describe('parseLlmStructuredOutput', () => {
  it('parses valid direct JSON with answer, remember, and sources', () => {
    const raw = JSON.stringify({
      answer: 'Konnn là lập trình viên chính của bot.',
      remember: [{ key: 'konnn', value: 'Lập trình viên chính của bot' }],
      sources: ['guild_memory'],
    });

    const res = parseLlmStructuredOutput(raw);
    expect(res.answer).toBe('Konnn là lập trình viên chính của bot.');
    expect(res.remember).toEqual([
      { key: 'konnn', value: 'Lập trình viên chính của bot' },
    ]);
    expect(res.sources).toEqual(['guild_memory']);
  });

  it('parses JSON wrapped in markdown code blocks', () => {
    const raw =
      'Dưới đây là câu trả lời:\n```json\n' +
      JSON.stringify({
        answer: 'Hôm nay trời đẹp.',
        remember: [],
        sources: [],
      }) +
      '\n```';

    const res = parseLlmStructuredOutput(raw);
    expect(res.answer).toBe('Hôm nay trời đẹp.');
    expect(res.remember).toEqual([]);
  });

  it('falls back to raw text if JSON is malformed or not an object', () => {
    const plain = 'Xin chào, mình có thể giúp gì cho bạn?';
    const res = parseLlmStructuredOutput(plain);
    expect(res.answer).toBe(plain);
    expect(res.remember).toBeUndefined();
  });

  it('handles null/empty text gracefully', () => {
    const res = parseLlmStructuredOutput(null);
    expect(res.answer).toBe('Mình chưa có câu trả lời phù hợp.');
  });
});
