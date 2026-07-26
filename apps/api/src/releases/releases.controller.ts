import {
  Controller, Get, Post, Param, Query, Body, BadRequestException,
} from '@nestjs/common';
import { ReleasesService } from './releases.service';
import { TenantService } from '../tenant/tenant.service';

@Controller('releases')
export class ReleasesController {
  constructor(
    private readonly releasesService: ReleasesService,
    private readonly tenantService: TenantService,
  ) {}

  @Get()
  async findAll(@Query('tenant') tenantSlug: string) {
    if (!tenantSlug) throw new BadRequestException('tenant query param required');
    const ctx = await this.tenantService.resolve(tenantSlug);
    return this.releasesService.findAll(ctx.tenantId);
  }

  @Post(':id/rollback')
  async rollback(
    @Param('id') releaseId: string,
    @Query('tenant') tenantSlug: string,
    @Body() body: { reason?: string },
  ) {
    if (!tenantSlug) throw new BadRequestException('tenant query param required');
    const ctx = await this.tenantService.resolve(tenantSlug);
    return this.releasesService.rollback(releaseId, ctx.tenantId, ctx.slug, body.reason);
  }
}
