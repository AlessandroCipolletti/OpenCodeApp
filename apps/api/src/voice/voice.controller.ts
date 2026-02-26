import {
  Controller, Post, Query, BadRequestException,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VoiceService } from './voice.service';
import { TenantService } from '../tenant/tenant.service';

@Controller('voice')
export class VoiceController {
  constructor(
    private readonly voiceService: VoiceService,
    private readonly tenantService: TenantService,
  ) {}

  @Post('transcribe')
  @UseInterceptors(FileInterceptor('audio'))
  async transcribe(
    @Query('tenant') tenantSlug: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!tenantSlug) throw new BadRequestException('tenant query param required');
    if (!file) throw new BadRequestException('audio file required');

    const ctx = await this.tenantService.resolve(tenantSlug);
    const text = await this.voiceService.transcribe(ctx.tenantId, file.buffer, file.mimetype);
    return { text };
  }
}
