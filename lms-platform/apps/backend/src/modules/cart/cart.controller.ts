import { Controller, Get, Post, Delete, Body, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { CartService } from "./cart.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Cart")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("cart")
export class CartController {
  constructor(private service: CartService) {}

  @Get()
  @ApiOperation({ summary: "Get my cart" })
  getCart(@CurrentUser("id") userId: string) {
    return this.service.getCart(userId);
  }

  @Post("items")
  @ApiOperation({ summary: "Add an item to my cart" })
  addItem(
    @CurrentUser("id") userId: string,
    @Body() dto: { type: string; course_id?: string; certification_id?: string },
  ) {
    return this.service.addItem(userId, dto);
  }

  @Delete("items/:id")
  @ApiOperation({ summary: "Remove an item from my cart" })
  removeItem(@CurrentUser("id") userId: string, @Param("id") id: string) {
    return this.service.removeItem(userId, id);
  }

  @Delete()
  @ApiOperation({ summary: "Clear my cart" })
  clearCart(@CurrentUser("id") userId: string) {
    return this.service.clearCart(userId);
  }
}
