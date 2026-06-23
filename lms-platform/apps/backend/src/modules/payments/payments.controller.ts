import {
  Controller, Get, Post, Body, Req, UseGuards,
  RawBodyRequest, Headers, HttpCode, HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Request } from "express";
import { PaymentsService } from "./payments.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { SkipThrottle } from "@nestjs/throttler";

@ApiTags("Payments")
@Controller("payments")
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("checkout")
  @ApiOperation({ summary: "Checkout for certification (via application flow)" })
  createCheckout(
    @CurrentUser("id") userId: string,
    @Body("certification_slug") certificationSlug: string,
    @Body("application_id") applicationId?: string,
  ) {
    return this.paymentsService.createCheckoutSession(userId, certificationSlug, applicationId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("course-checkout")
  @ApiOperation({ summary: "Buy a prep course (direct enrollment after payment)" })
  courseCheckout(
    @CurrentUser("id") userId: string,
    @Body("course_id") courseId: string,
    @Body("promo_code") promoCode?: string,
  ) {
    return this.paymentsService.createCourseCheckoutSession(userId, courseId, promoCode);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("certification-checkout")
  @ApiOperation({ summary: "Enroll in a certification directly (no application form)" })
  certificationCheckout(
    @CurrentUser("id") userId: string,
    @Body("certification_slug") certSlug: string,
    @Body("promo_code") promoCode?: string,
  ) {
    return this.paymentsService.createCertificationCheckoutSession(userId, certSlug, promoCode);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get("my")
  @ApiOperation({ summary: "Get my payment history" })
  getMyPayments(@CurrentUser("id") userId: string) {
    return this.paymentsService.getMyPayments(userId);
  }

  @Public()
  @SkipThrottle()
  @Post("webhook")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Stripe webhook endpoint (internal)" })
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("stripe-signature") signature: string,
  ) {
    return this.paymentsService.handleWebhook(req.rawBody!, signature);
  }
}
