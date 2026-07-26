import {
  Controller, Get, Post, Delete, Body, Query, BadRequestException,
} from '@nestjs/common';
import { SettingsService, UpsertLlmSettingsDto } from './settings.service';
import { TenantService } from '../tenant/tenant.service';

@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly tenantService: TenantService,
  ) {}

  @Get('llm')
  async getLlm(@Query('tenant') tenantSlug: string) {
    if (!tenantSlug) throw new BadRequestException('tenant query param required');
    const ctx = await this.tenantService.resolve(tenantSlug);
    return this.settingsService.getLlmSettings(ctx.tenantId);
  }

  @Post('llm')
  async upsertLlm(
    @Query('tenant') tenantSlug: string,
    @Body() body: UpsertLlmSettingsDto,
  ) {
    if (!tenantSlug) throw new BadRequestException('tenant query param required');
    const ctx = await this.tenantService.resolve(tenantSlug);
    return this.settingsService.upsertLlmSettings(ctx.tenantId, body);
  }

  @Delete('llm')
  async deleteLlm(@Query('tenant') tenantSlug: string) {
    if (!tenantSlug) throw new BadRequestException('tenant query param required');
    const ctx = await this.tenantService.resolve(tenantSlug);
    await this.settingsService.deleteLlmSettings(ctx.tenantId);
    return { success: true };
  }
}
