import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { AgentService, RunAgentDto } from "./agent.service";

@ApiTags("agent")
@Controller("agent")
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  private resolveTenant(tenant?: string): string {
    if (!tenant) throw new BadRequestException('Query param "tenant" is required');
    return tenant;
  }

  @Post("run")
  @ApiOperation({ summary: "Run the coding agent for a tenant" })
  @ApiQuery({ name: "tenant", required: true })
  run(@Body() dto: RunAgentDto, @Query("tenant") tenant?: string) {
    return this.agentService.run(this.resolveTenant(tenant), dto.prompt);
  }

  @Get("requests")
  @ApiOperation({ summary: "List agent change requests for a tenant" })
  @ApiQuery({ name: "tenant", required: true })
  getRequests(@Query("tenant") tenant?: string) {
    return this.agentService.getRequests(this.resolveTenant(tenant));
  }

  @Get("releases")
  @ApiOperation({ summary: "List agent releases for a tenant" })
  @ApiQuery({ name: "tenant", required: true })
  getReleases(@Query("tenant") tenant?: string) {
    return this.agentService.getReleases(this.resolveTenant(tenant));
  }
}
