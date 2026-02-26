import type {
  LLMProvider,
  CompletionRequest,
  CompletionResponse,
  ChatMessage,
} from "./types";

interface OpenAIMessage {
  role: string;
  content: string;
}

interface OpenAIChoice {
  message: OpenAIMessage;
}

interface OpenAIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface OpenAIResponse {
  choices: OpenAIChoice[];
  model: string;
  usage: OpenAIUsage;
}

export class OpenAIProvider implements LLMProvider {
  readonly name = "openai";

  constructor(
    private readonly apiKey: string,
    private readonly defaultModel = "gpt-4o"
  ) {}

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const model = request.model ?? this.defaultModel;

    const body = JSON.stringify({
      model,
      messages: request.messages as OpenAIMessage[],
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.2,
    });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenAI API error ${response.status}: ${errorText}`
      );
    }

    const data = (await response.json()) as OpenAIResponse;
    const choice = data.choices[0];

    if (!choice) {
      throw new Error("OpenAI returned no choices.");
    }

    return {
      content: choice.message.content,
      model: data.model,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
    };
  }
}
