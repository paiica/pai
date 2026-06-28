import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { AffiliateService } from "./affiliate.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Admin — Affiliates")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.super_admin, Role.admin)
@Controller("admin/affiliates")
export class AdminAffiliatesController {
  constructor(private service: AffiliateService) {}

  @Get()
  list(
    @Query("page") page = "1",
    @Query("limit") limit = "25",
    @Query("status") status?: string,
    @Query("search") search?: string,
  ) {
    return this.service.adminList({
      page: parseInt(page), limit: parseInt(limit), status, search,
    });
  }

  @Get("stats")
  stats() {
    return this.service.adminStats();
  }

  @Get("products")
  listProducts() {
    return this.service.adminListProducts();
  }

  @Get("commissions")
  listCommissions(
    @Query("status") status?: string,
  ) {
    return this.service.adminListCommissions(undefined, status);
  }

  @Get("promo-codes")
  listAllPromoCodes(
    @Query("page") page = "1",
    @Query("limit") limit = "25",
    @Query("affiliateId") affiliateId?: string,
    @Query("search") search?: string,
    @Query("status") status?: string,
  ) {
    return this.service.adminGetAllPromoCodes({
      page: parseInt(page), limit: parseInt(limit), affiliateUserId: affiliateId, search, status,
    });
  }

  @Patch("promo-codes/:promoId")
  togglePromoCode(
    @Param("promoId", ParseUUIDPipe) promoId: string,
    @Body("is_active") isActive: boolean,
  ) {
    return this.service.adminTogglePromoCode(promoId, isActive);
  }

  @Delete("promo-codes/:promoId")
  deletePromoCode(@Param("promoId", ParseUUIDPipe) promoId: string) {
    return this.service.adminDeletePromoCode(promoId);
  }

  @Patch("commissions/:id/approve")
  approveCommission(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.adminApproveCommission(id);
  }

  @Patch("commissions/:id/paid")
  markCommissionPaid(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.adminMarkCommissionPaid(id);
  }

  @Get(":id")
  getOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.adminGetOne(id);
  }

  @Patch(":id/approve")
  approve(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("id") adminId: string,
  ) {
    return this.service.adminApprove(id, adminId);
  }

  @Patch(":id/suspend")
  suspend(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.adminSuspend(id);
  }

  @Patch(":id/commission-rate")
  setCommissionRate(
    @Param("id", ParseUUIDPipe) id: string,
    @Body("rate") rate: number,
  ) {
    return this.service.adminSetCommissionRate(id, rate);
  }

  @Patch(":id/notes")
  setNotes(
    @Param("id", ParseUUIDPipe) id: string,
    @Body("notes") notes: string,
  ) {
    return this.service.adminSetNotes(id, notes);
  }

  @Post(":id/products")
  assignProduct(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: { certification_id?: string; course_id?: string; commission_override?: number },
  ) {
    return this.service.adminAssignProduct(id, dto);
  }

  @Delete(":id/products/:assignmentId")
  removeProduct(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("assignmentId", ParseUUIDPipe) assignmentId: string,
  ) {
    return this.service.adminRemoveProduct(id, assignmentId);
  }

  @Get(":id/leads")
  repLeads(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("page") page = "1",
    @Query("limit") limit = "25",
    @Query("status") status?: string,
    @Query("search") search?: string,
  ) {
    return this.service.adminGetLeads(id, {
      page: parseInt(page), limit: parseInt(limit), status, search,
    });
  }

  @Post(":id/promo-codes")
  createPromoCode(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: any,
  ) {
    return this.service.adminCreatePromoCode(id, dto);
  }

  @Get(":id/commissions")
  repCommissions(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("status") status?: string,
  ) {
    return this.service.adminListCommissions(id, status);
  }
}
