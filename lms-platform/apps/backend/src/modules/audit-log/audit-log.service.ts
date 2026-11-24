import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

// The AuditLog model has existed in the schema since early in this
// project's life but was never actually written to anywhere — this is the
// first real usage. Scoped to Academic Cloud (institution) lifecycle events
// for now (spec: institution created, professor invited/removed, course
// created/approved/rejected, student joined, subscription/package
// changes) — extending it to the rest of the platform's admin actions is
// separate future work, not part of this pass.
@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async log(opts: {
    userId?: string | null;
    action: string;
    entityType?: string;
    entityId?: string;
    oldValue?: unknown;
    newValue?: unknown;
  }) {
    await this.prisma.auditLog.create({
      data: {
        user_id: opts.userId ?? null,
        action: opts.action,
        entity_type: opts.entityType ?? null,
        entity_id: opts.entityId ?? null,
        old_value: opts.oldValue == null ? undefined : (opts.oldValue as any),
        new_value: opts.newValue == null ? undefined : (opts.newValue as any),
      },
    }).catch(() => { /* never let logging break the calling action */ });
  }

  async adminList(query: { entityType?: string; entityId?: string; action?: string; page?: string; limit?: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Number(query.limit) || 30);
    const where = {
      ...(query.entityType ? { entity_type: query.entityType } : {}),
      ...(query.entityId ? { entity_id: query.entityId } : {}),
      ...(query.action ? { action: { contains: query.action } } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { email: true, profile: { select: { first_name: true, last_name: true } } } } },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total, page, limit };
  }
}
