export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmCompletionOptions {
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface LlmProvider {
  complete(options: LlmCompletionOptions): Promise<string>;
  transcribeAudio?(audioBuffer: Buffer, mimeType: string): Promise<string>;
}

export interface LlmConfig {
  provider: 'mock' | 'openai';
  model: string;
  apiKey?: string;
}
