import { Injectable, BadRequestException } from '@nestjs/common';
import { createLlmProvider } from '@opencodeapp/llm';
import { SettingsService } from '../settings/settings.service';

const MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

@Injectable()
export class VoiceService {
  constructor(private readonly settingsService: SettingsService) {}

  async transcribe(tenantId: string, audioBuffer: Buffer, mimeType: string): Promise<string> {
    if (audioBuffer.length > MAX_AUDIO_SIZE_BYTES) {
      throw new BadRequestException(`Audio file too large (max ${MAX_AUDIO_SIZE_BYTES / 1024 / 1024}MB)`);
    }

    const settings = await this.settingsService.getLlmSettings(tenantId);
    const apiKey = settings.hasApiKey
      ? await this.settingsService.getDecryptedApiKey(tenantId)
      : undefined;

    const provider = createLlmProvider({
      provider: settings.provider as 'mock' | 'openai',
      model: settings.model,
      apiKey: apiKey ?? undefined,
    });

    if (!provider.transcribeAudio) {
      return 'Voice transcription not supported by the current provider';
    }

    return provider.transcribeAudio(audioBuffer, mimeType);
  }
}
