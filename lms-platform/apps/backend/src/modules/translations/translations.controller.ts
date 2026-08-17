import { BadRequestException, Body, Controller, Patch, Post, Param, Query, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { TranslationsService, EntityType } from "./translations.service";

const VALID_ENTITY_TYPES: EntityType[] = ["page", "blog_post", "nav_item", "page_block", "certification", "course"];

@ApiTags("Translations")
@Controller("translations")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.admin, Role.super_admin)
export class TranslationsController {
  constructor(private service: TranslationsService) {}

  // Manual "Re-translate" button in an admin content editor's language tab —
  // always overwrites that one entity/locale, regardless of whether a
  // translation already exists. Distinct from the automatic on-save hook,
  // which only fires for locales that don't yet have content and is never
  // awaited by the save request.
  @Post(":entityType/:entityId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Re-translate one entity into one locale (admin)" })
  retranslate(
    @Param("entityType") entityType: string,
    @Param("entityId") entityId: string,
    @Query("locale") locale: string,
  ) {
    if (!VALID_ENTITY_TYPES.includes(entityType as EntityType)) {
      throw new BadRequestException(`Unknown entity type: ${entityType}`);
    }
    return this.service.retranslateEntity(entityType as EntityType, entityId, locale);
  }

  // Manual save from a content editor's language tab — the admin edited the
  // translated fields directly, no AI call involved.
  @Patch(":entityType/:entityId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Manually save one entity's translated fields for one locale (admin)" })
  update(
    @Param("entityType") entityType: string,
    @Param("entityId") entityId: string,
    @Query("locale") locale: string,
    @Body() body: { fields: Record<string, any> },
  ) {
    if (!VALID_ENTITY_TYPES.includes(entityType as EntityType)) {
      throw new BadRequestException(`Unknown entity type: ${entityType}`);
    }
    return this.service.setEntityTranslation(entityType as EntityType, entityId, locale, body.fields ?? {});
  }
}
