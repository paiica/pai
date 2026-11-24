import { SetMetadata } from "@nestjs/common";
import { InstitutionRole } from "@prisma/client";

export const INSTITUTION_ROLES_KEY = "institutionRoles";
export const InstitutionRoles = (...roles: InstitutionRole[]) => SetMetadata(INSTITUTION_ROLES_KEY, roles);
