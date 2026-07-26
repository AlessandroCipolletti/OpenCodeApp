import OpenAI from 'openai';

export function createOpenAiClient(
  apiKey: string,
  baseURL = 'https://api.openai.com/v1',
): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL,
  });
}

/**
 * Reasoning-style models reject sampling knobs (temperature/top_p/etc.)
 * and require max_completion_tokens instead of deprecated max_tokens.
 *
 * Chat-tuned variants (e.g. gpt-5-chat-latest, chatgpt-*) still support sampling.
 * See: https://platform.openai.com/docs/guides/reasoning
 */
export function isReasoningStyleModel(model: string): boolean {
  const m = model.toLowerCase();
  if (m.includes('chat')) return false;

  return (
    m.startsWith('o1') ||
    m.startsWith('o3') ||
    m.startsWith('o4') ||
    m.startsWith('gpt-5') ||
    m.startsWith('codex')
  );
}
