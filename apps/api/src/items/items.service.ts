import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@opencodeapp/db";

export interface CreateItemDto {
  name: string;
  description?: string;
}

export interface UpdateItemDto {
  name?: string;
  description?: string;
}

@Injectable()
export class ItemsService {
  async findAll(tenantId: string) {
    return prisma.item.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(tenantId: string, id: string) {
    const item = await prisma.item.findFirst({ where: { id, tenantId } });
    if (!item) throw new NotFoundException(`Item ${id} not found`);
    return item;
  }

  async create(tenantId: string, dto: CreateItemDto) {
    return prisma.item.create({ data: { ...dto, tenantId } });
  }

  async update(tenantId: string, id: string, dto: UpdateItemDto) {
    await this.findOne(tenantId, id);
    return prisma.item.update({ where: { id }, data: dto });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return prisma.item.delete({ where: { id } });
  }
}
