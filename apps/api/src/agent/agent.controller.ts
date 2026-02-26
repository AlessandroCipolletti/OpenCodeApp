import {
  Controller, Post, Body, Query, BadRequestException,
} from '@nestjs/common';
import { AgentService } from './agent.service';
import { TenantService } from '../tenant/tenant.service';

@Controller('agent')
export class AgentController {
  constructor(
    private readonly agentService: AgentService,
    private readonly tenantService: TenantService,
  ) {}

  @Post('run')
  async run(
    @Query('tenant') tenantSlug: string,
    @Body() body: { prompt: string },
  ) {
    if (!tenantSlug) throw new BadRequestException('tenant query param required');
    if (!body.prompt) throw new BadRequestException('prompt is required');
    const ctx = await this.tenantService.resolve(tenantSlug);
    return this.agentService.run(ctx.tenantId, ctx.slug, body.prompt);
  }
}
