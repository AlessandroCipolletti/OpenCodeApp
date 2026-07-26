import OpenAI from 'openai';
import { toFile } from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type { LlmProvider, LlmCompletionOptions, LlmMessage } from '../types';
import { createOpenAiClient, isReasoningStyleModel } from './openai-client';

function toChatMessages(
  messages: LlmMessage[],
  model: string,
): ChatCompletionMessageParam[] {
  const useDeveloperRole = isReasoningStyleModel(model);

  return messages.map((message) => {
    if (message.role === 'system' && useDeveloperRole) {
      return { role: 'developer', content: message.content };
    }
    return { role: message.role, content: message.content };
  });
}

export class OpenAiLlmProvider implements LlmProvider {
  private readonly client: OpenAI;

  constructor(
    private readonly apiKey: string,
    private readonly model: string = 'gpt-4o',
    baseUrl: string = 'https://api.openai.com/v1',
  ) {
    this.client = createOpenAiClient(apiKey, baseUrl);
  }

  async complete(options: LlmCompletionOptions): Promise<string> {
    // max_tokens is deprecated; max_completion_tokens works across chat + reasoning models.
    const params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
      model: this.model,
      messages: toChatMessages(options.messages, this.model),
      max_completion_tokens: options.maxTokens ?? 4096,
    };

    if (!isReasoningStyleModel(this.model)) {
      params.temperature = options.temperature ?? 0.2;
    }

    try {
      const completion = await this.client.chat.completions.create(params);
      return completion.choices[0]?.message?.content ?? '';
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`OpenAI API error: ${message}`);
    }
  }

  async transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
    try {
      const file = await toFile(audioBuffer, 'audio.webm', { type: mimeType });
      const transcription = await this.client.audio.transcriptions.create({
        file,
        model: 'whisper-1',
      });
      return transcription.text;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`OpenAI Whisper error: ${message}`);
    }
  }
}
