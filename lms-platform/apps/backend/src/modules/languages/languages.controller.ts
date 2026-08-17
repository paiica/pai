import { Body, Controller, Get, Param, Patch, Post, UseGuards, HttpCode, HttpStatus, Logger } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { LanguagesService } from "./languages.service";
import { TranslationsService } from "../translations/translations.service";

@ApiTags("Languages")
@Controller("languages")
export class LanguagesController {
  private readonly logger = new Logger(LanguagesController.name);

  constructor(
    private languagesService: LanguagesService,
    private translationsService: TranslationsService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "List enabled languages (no auth required)" })
  getEnabled() {
    return this.languagesService.getEnabled();
  }

  @Get("all")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "List every added language, enabled or disabled (admin)" })
  getAll() {
    return this.languagesService.getAll();
  }

  @Get("available")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Curated languages not yet added (admin)" })
  getAvailable() {
    return this.languagesService.getAvailableToAdd();
  }

  // Adding a language triggers the first-time bulk translation of every
  // existing Page/BlogPost/NavItem/PageBlock/Certification/Course into it —
  // not awaited here, since translating the full catalog (dozens of courses,
  // certifications, pages) can take several minutes. The response confirms
  // the language was added; the admin UI shows a "translating in the
  // background" notice and the content fills in as each row completes.
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Add and enable a language, triggering first-time bulk translation (admin)" })
  async add(@Body() body: { code: string }) {
    const language = await this.languagesService.add(body.code);
    this.translationsService.translateAllContentInto(body.code).catch((err) =>
      this.logger.error(`Bulk translate into ${body.code} failed: ${err?.message ?? err}`)
    );
    return language;
  }

  // Declared before ":code" so "reorder" isn't swallowed as a language code param.
  @Patch("reorder")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Set display order for all added languages (admin)" })
  reorder(@Body() body: { codes: string[] }) {
    return this.languagesService.reorder(body.codes);
  }

  @Patch(":code")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Enable/disable an already-added language (admin)" })
  setEnabled(@Param("code") code: string, @Body() body: { enabled: boolean }) {
    return this.languagesService.setEnabled(code, body.enabled);
  }
}
