import { createOpenAiClient } from './openai-client';

export interface OpenAiModelInfo {
  id: string;
  created: number;
  ownedBy: string;
}

const EXCLUDE_SUBSTRINGS = [
  'whisper',
  'tts',
  'dall-e',
  'dalle',
  'embedding',
  'moderation',
  'realtime',
  'audio',
  'transcribe',
  'tts-',
  'image',
  'search',
  'babbage',
  'davinci',
  'ada',
  'curie',
  'computer-use',
  'sora',
];

const INCLUDE_PREFIXES = [
  'gpt-5',
  'gpt-4',
  'gpt-3.5-turbo',
  'o1',
  'o3',
  'o4',
  'chatgpt-',
  'codex',
];

/** Prefer canonical aliases first, then other chat/coding models. */
const PRIORITY_IDS = [
  'gpt-4.1',
  'gpt-4o',
  'gpt-4.1-mini',
  'gpt-4o-mini',
  'gpt-4.1-nano',
  'gpt-5',
  'gpt-5-mini',
  'o3',
  'o3-mini',
  'o4-mini',
  'o1',
  'o1-mini',
  'o1-pro',
  'gpt-4-turbo',
  'chatgpt-4o-latest',
];

function isDatedSnapshot(id: string): boolean {
  return /-\d{4}-\d{2}-\d{2}(?:$|-)/.test(id);
}

export function isOpenAiCodingModel(id: string): boolean {
  const lower = id.toLowerCase();

  if (lower.startsWith('ft:')) return false;
  if (isDatedSnapshot(lower)) return false;
  if (EXCLUDE_SUBSTRINGS.some((part) => lower.includes(part))) return false;

  return INCLUDE_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

function compareCodingModels(a: OpenAiModelInfo, b: OpenAiModelInfo): number {
  const ai = PRIORITY_IDS.indexOf(a.id);
  const bi = PRIORITY_IDS.indexOf(b.id);
  if (ai !== -1 || bi !== -1) {
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  }
  return a.id.localeCompare(b.id);
}

/**
 * Fetches models via the official OpenAI SDK and returns coding/chat-capable ones.
 */
export async function listOpenAiCodingModels(
  apiKey: string,
  baseUrl = 'https://api.openai.com/v1',
): Promise<OpenAiModelInfo[]> {
  const client = createOpenAiClient(apiKey, baseUrl);

  try {
    const page = await client.models.list();
    return page.data
      .filter((model) => isOpenAiCodingModel(model.id))
      .map((model) => ({
        id: model.id,
        created: model.created,
        ownedBy: model.owned_by,
      }))
      .sort(compareCodingModels);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`OpenAI models API error: ${message}`);
  }
}
