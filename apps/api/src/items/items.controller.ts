import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { ItemsService, CreateItemDto, UpdateItemDto } from "./items.service";

@ApiTags("items")
@Controller("items")
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  private resolveTenant(tenant?: string): string {
    if (!tenant) throw new BadRequestException('Query param "tenant" is required');
    return tenant;
  }

  @Get()
  @ApiOperation({ summary: "List items for a tenant" })
  @ApiQuery({ name: "tenant", required: true, description: "Tenant slug" })
  findAll(@Query("tenant") tenant?: string) {
    return this.itemsService.findAll(this.resolveTenant(tenant));
  }

  @Get(":id")
  @ApiOperation({ summary: "Get an item by ID" })
  @ApiQuery({ name: "tenant", required: true })
  findOne(@Param("id") id: string, @Query("tenant") tenant?: string) {
    return this.itemsService.findOne(this.resolveTenant(tenant), id);
  }

  @Post()
  @ApiOperation({ summary: "Create an item" })
  @ApiQuery({ name: "tenant", required: true })
  create(@Body() dto: CreateItemDto, @Query("tenant") tenant?: string) {
    return this.itemsService.create(this.resolveTenant(tenant), dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update an item" })
  @ApiQuery({ name: "tenant", required: true })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateItemDto,
    @Query("tenant") tenant?: string
  ) {
    return this.itemsService.update(this.resolveTenant(tenant), id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete an item" })
  @ApiQuery({ name: "tenant", required: true })
  remove(@Param("id") id: string, @Query("tenant") tenant?: string) {
    return this.itemsService.remove(this.resolveTenant(tenant), id);
  }
}
