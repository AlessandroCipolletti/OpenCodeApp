import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@opencodeapp/db';

export interface Item {
  id: string;
  title: string;
  description: string;
  tenantId: string;
  createdAt: string;
}

@Injectable()
export class ItemsService {
  async findAll(tenantId: string): Promise<Item[]> {
    const rows = await prisma.$queryRaw<Item[]>`
      SELECT id::text, title, description, tenant_id as "tenantId", created_at::text as "createdAt"
      FROM items
      WHERE tenant_id = ${tenantId}
      ORDER BY created_at DESC
    `;
    return rows;
  }

  async findOne(id: string, tenantId: string): Promise<Item> {
    const rows = await prisma.$queryRaw<Item[]>`
      SELECT id::text, title, description, tenant_id as "tenantId", created_at::text as "createdAt"
      FROM items
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}
    `;
    if (!rows.length) throw new NotFoundException('Item not found');
    return rows[0];
  }

  async create(tenantId: string, title: string, description: string): Promise<Item> {
    const rows = await prisma.$queryRaw<Item[]>`
      INSERT INTO items (title, description, tenant_id)
      VALUES (${title}, ${description}, ${tenantId})
      RETURNING id::text, title, description, tenant_id as "tenantId", created_at::text as "createdAt"
    `;
    return rows[0];
  }

  async update(id: string, tenantId: string, title?: string, description?: string): Promise<Item> {
    const rows = await prisma.$queryRaw<Item[]>`
      UPDATE items
      SET
        title = COALESCE(${title ?? null}, title),
        description = COALESCE(${description ?? null}, description)
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}
      RETURNING id::text, title, description, tenant_id as "tenantId", created_at::text as "createdAt"
    `;
    if (!rows.length) throw new NotFoundException('Item not found');
    return rows[0];
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await prisma.$executeRaw`
      DELETE FROM items WHERE id = ${id}::uuid AND tenant_id = ${tenantId}
    `;
  }
}
