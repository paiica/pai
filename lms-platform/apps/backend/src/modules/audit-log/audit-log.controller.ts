import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { AuditLogService } from "./audit-log.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

@ApiTags("Audit Log")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.admin, Role.super_admin)
@Controller("admin/audit-log")
export class AuditLogController {
  constructor(private service: AuditLogService) {}

  @Get()
  @ApiOperation({ summary: "Admin: browse the audit log, optionally filtered by entity/action" })
  list(@Query() query: { entityType?: string; entityId?: string; action?: string; page?: string; limit?: string }) {
    return this.service.adminList(query);
  }
}
