import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";

// Gates every /org/* endpoint on the caller actually being an org admin
// (an OrganizationAdmin row attached to their User — see JwtStrategy).
// Distinct from role-based guards: org-admin isn't a Role enum value,
// it's a capability any ordinary `role: student` User can be granted.
@Injectable()
export class OrganizationAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (!user?.organization_id) {
      throw new ForbiddenException("This account isn't linked to an organization.");
    }
    return true;
  }
}
