import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@opencodeapp/db';
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const ENC_KEY = createHash('sha256')
  .update(process.env.API_SECRET ?? 'default-insecure-secret')
  .digest();

function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', ENC_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(encryptedText: string): string {
  const colonIdx = encryptedText.indexOf(':');
  if (colonIdx === -1) throw new Error('Invalid encrypted format');
  const ivHex = encryptedText.slice(0, colonIdx);
  const dataHex = encryptedText.slice(colonIdx + 1);
  const iv = Buffer.from(ivHex, 'hex');
  const data = Buffer.from(dataHex, 'hex');
  const decipher = createDecipheriv('aes-256-cbc', ENC_KEY, iv);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

export interface LlmSettingsDto {
  provider: string;
  model: string;
  hasApiKey: boolean;
}

export interface UpsertLlmSettingsDto {
  provider: string;
  model: string;
  apiKey?: string;
}

@Injectable()
export class SettingsService {
  async getLlmSettings(tenantId: string): Promise<LlmSettingsDto> {
    const settings = await prisma.llmSettings.findUnique({ where: { tenantId } });
    if (!settings) {
      return { provider: 'mock', model: 'mock', hasApiKey: false };
    }
    return {
      provider: settings.provider,
      model: settings.model,
      hasApiKey: !!settings.apiKeyEnc,
    };
  }

  async upsertLlmSettings(
    tenantId: string,
    dto: UpsertLlmSettingsDto,
  ): Promise<LlmSettingsDto> {
    const data: Record<string, unknown> = {
      provider: dto.provider,
      model: dto.model,
    };

    if (dto.apiKey) {
      data['apiKeyEnc'] = encrypt(dto.apiKey);
      data['apiKeyHash'] = createHash('sha256').update(dto.apiKey).digest('hex');
    }

    await prisma.llmSettings.upsert({
      where: { tenantId },
      create: { tenantId, ...data },
      update: data,
    });

    return this.getLlmSettings(tenantId);
  }

  async deleteLlmSettings(tenantId: string): Promise<void> {
    const existing = await prisma.llmSettings.findUnique({ where: { tenantId } });
    if (!existing) throw new NotFoundException('LLM settings not found');
    await prisma.llmSettings.update({
      where: { tenantId },
      data: { apiKeyEnc: null, apiKeyHash: null },
    });
  }

  async getDecryptedApiKey(tenantId: string): Promise<string | null> {
    const settings = await prisma.llmSettings.findUnique({ where: { tenantId } });
    if (!settings?.apiKeyEnc) return null;
    return decrypt(settings.apiKeyEnc);
  }
}
