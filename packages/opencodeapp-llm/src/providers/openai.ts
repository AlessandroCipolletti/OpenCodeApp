import type { LlmProvider, LlmCompletionOptions, LlmMessage } from '../types';

export class OpenAiLlmProvider implements LlmProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string = 'gpt-4o',
    private readonly baseUrl: string = 'https://api.openai.com/v1',
  ) {}

  async complete(options: LlmCompletionOptions): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: options.messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 4096,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${error}`);
    }

    const data = await response.json() as {
      choices: { message: { content: string } }[];
    };
    return data.choices[0]?.message?.content ?? '';
  }

  async transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
    const formData = new FormData();
    const blob = new Blob([Uint8Array.from(audioBuffer)], { type: mimeType });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-1');

    const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI Whisper error ${response.status}: ${error}`);
    }

    const data = await response.json() as { text: string };
    return data.text;
  }
}
