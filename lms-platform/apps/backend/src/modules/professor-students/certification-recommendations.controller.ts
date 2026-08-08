import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { CertificationRecommendationsService } from "./certification-recommendations.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("My Certification Recommendations")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("me/certification-recommendations")
export class CertificationRecommendationsController {
  constructor(private service: CertificationRecommendationsService) {}

  @Get()
  @ApiOperation({ summary: "List certifications professors have recommended to me" })
  listMine(@CurrentUser("id") studentId: string) {
    return this.service.listMine(studentId);
  }
}
