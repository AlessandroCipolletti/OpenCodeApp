import type { LlmProvider, LlmConfig } from './types';
import { MockLlmProvider } from './providers/mock';
import { OpenAiLlmProvider } from './providers/openai';

export function createLlmProvider(config: LlmConfig): LlmProvider {
  switch (config.provider) {
    case 'openai':
      if (!config.apiKey) {
        throw new Error('OpenAI provider requires an API key');
      }
      return new OpenAiLlmProvider(config.apiKey, config.model);
    case 'mock':
    default:
      return new MockLlmProvider();
  }
}
