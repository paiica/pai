import { BadRequestException } from "@nestjs/common";
import { PromoCodesService } from "./promo-codes.service";

describe("PromoCodesService — discount bounds validation", () => {
  function buildService() {
    const prisma = {
      $queryRawUnsafe: jest.fn().mockResolvedValue([{ id: "promo-1", discount_type: "percentage" }]),
      $executeRawUnsafe: jest.fn().mockResolvedValue(undefined),
    } as any;
    return new PromoCodesService(prisma);
  }

  it("rejects a percentage discount over 100", async () => {
    const service = buildService();
    await expect(
      service.adminCreate({ code: "TOOBIG", discount_type: "percentage", discount_value: 150 }),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects a zero or negative discount value", async () => {
    const service = buildService();
    await expect(
      service.adminCreate({ code: "ZERO", discount_type: "fixed", discount_value: 0 }),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects an invalid discount_type", async () => {
    const service = buildService();
    await expect(
      service.adminCreate({ code: "BAD", discount_type: "half-off", discount_value: 10 } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it("accepts a valid percentage discount", async () => {
    const service = buildService();
    await expect(
      service.adminCreate({ code: "VALID", discount_type: "percentage", discount_value: 25 }),
    ).resolves.toBeDefined();
  });

  it("on update, fetches the existing discount_type to validate a value-only change", async () => {
    const service = buildService();
    // No discount_type sent, only a new value — service must look up the stored
    // type (percentage, per the mock) to correctly reject an out-of-range value.
    await expect(
      service.adminUpdate("promo-1", { discount_value: 200 }),
    ).rejects.toThrow(BadRequestException);
  });
});
