import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { InstitutionRole } from "@prisma/client";
import { PrismaService } from "../../modules/prisma/prisma.service";
import { INSTITUTION_ROLES_KEY } from "../decorators/institution-roles.decorator";

// Gates every institution-scoped endpoint (`:institutionId` route param) on
// a FRESH, per-request DB lookup of this user's InstitutionMembership row —
// institutionId is never trusted just because it's a URL param that
// resolved to something. A user can hold different roles at different
// institutions (see InstitutionMembership's schema comment), so unlike
// OrganizationAdminGuard (a single boolean off the JWT-decoded user) this
// has to re-check per resource, every time.
@Injectable()
export class InstitutionRoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<InstitutionRole[]>(INSTITUTION_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) ?? [];

    const request = context.switchToHttp().getRequest();
    const { user, params } = request;
    const institutionId = params?.institutionId;

    if (!user) throw new ForbiddenException("Access denied");
    if (!institutionId) throw new ForbiddenException("Missing institution context");

    const membership = await this.prisma.institutionMembership.findUnique({
      where: { user_id_institution_id: { user_id: user.id, institution_id: institutionId } },
    });

    if (!membership || membership.status !== "active") {
      throw new ForbiddenException("You don't have active access to this institution");
    }
    if (requiredRoles.length > 0 && !requiredRoles.includes(membership.role)) {
      throw new ForbiddenException(`Access denied. Required institution role: ${requiredRoles.join(" or ")}`);
    }

    request.institutionMembership = membership;
    return true;
  }
}
