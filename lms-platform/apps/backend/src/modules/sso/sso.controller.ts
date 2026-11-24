import { Controller, Get, Put, Body, Param, Query, Redirect, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { InstitutionRole } from "@prisma/client";
import { SsoService } from "./sso.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { InstitutionRoleGuard } from "../../common/guards/institution-role.guard";
import { InstitutionRoles } from "../../common/decorators/institution-roles.decorator";
import { Public } from "../../common/decorators/public.decorator";

@ApiTags("SSO")
@Controller("sso")
export class SsoController {
  constructor(private service: SsoService) {}

  // ── Institution admin (academia app) ────────────────────────────────────────

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @Get("institutions/:institutionId/config")
  @ApiOperation({ summary: "Institution admin: current OIDC SSO config (client_secret never returned)" })
  getConfig(@Param("institutionId") institutionId: string) {
    return this.service.getConfig(institutionId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @Put("institutions/:institutionId/config")
  @ApiOperation({ summary: "Institution admin: connect/update this institution's OIDC identity provider" })
  upsertConfig(
    @Param("institutionId") institutionId: string,
    @Body() dto: { provider?: string; issuer_url: string; client_id: string; client_secret?: string; is_enabled?: boolean },
  ) {
    return this.service.upsertConfig(institutionId, dto);
  }

  // ── Public: login-page lookup + OIDC flow ───────────────────────────────────

  @Public()
  @Get("lookup")
  @ApiOperation({ summary: "Public: does this institution code have SSO enabled? (for the login page)" })
  lookup(@Query("code") code: string) {
    return this.service.getPublicSsoInfo(code ?? "");
  }

  @Public()
  @Get(":institutionId/start")
  @Redirect()
  @ApiOperation({ summary: "Public: redirect the browser to the institution's identity provider" })
  async start(@Param("institutionId") institutionId: string) {
    const url = await this.service.buildAuthorizationUrl(institutionId);
    return { url, statusCode: 302 };
  }

  @Public()
  @Get("callback")
  @Redirect()
  @ApiOperation({ summary: "Public: OIDC provider redirects here after login" })
  async callback(@Query() query: Record<string, string>) {
    const url = await this.service.handleCallback(query);
    return { url, statusCode: 302 };
  }
}
