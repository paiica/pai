import { Injectable, NotFoundException, BadRequestException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogService } from "../audit-log/audit-log.service";

export interface ResolvedPrice {
  currency_code: string;
  symbol: string;
  price: number;
  compare_at_price: number | null;
  // true when this number came from live/manual FX math rather than an
  // explicit regional_prices override or the base currency itself — shown
  // in the UI as "approx." so nobody's surprised the real charge rounds
  // slightly differently.
  is_converted: boolean;
}

// A free, keyless FX endpoint — no API key management, no paid dependency.
// If it's ever unreachable, refreshLiveRates just reports the failure;
// manually-entered rates are always the fallback and are never overwritten
// by a failed refresh.
const LIVE_RATE_API = "https://open.er-api.com/v6/latest";

@Injectable()
export class CurrencyService {
  constructor(private prisma: PrismaService, private auditLog: AuditLogService) {}

  // Called lazily rather than at bootstrap — cheap (one indexed lookup) and
  // keeps the module free of any startup-ordering dependency on the DB
  // being reachable the instant the process boots.
  async ensureDefaultCurrency() {
    const existing = await this.prisma.currency.findFirst({ where: { is_default: true } });
    if (existing) return existing;
    return this.prisma.currency.upsert({
      where: { code: "USD" },
      update: { is_default: true },
      create: { code: "USD", symbol: "$", name: "US Dollar", is_active: true, is_default: true, fx_rate: 1, fx_rate_source: "manual" },
    });
  }

  async getDefaultCurrency() {
    return this.ensureDefaultCurrency();
  }

  // Public — every active currency, for the storefront selector.
  async listActive() {
    await this.ensureDefaultCurrency();
    return this.prisma.currency.findMany({ where: { is_active: true }, orderBy: [{ is_default: "desc" }, { code: "asc" }] });
  }

  // Admin — every currency including inactive ones.
  async adminList() {
    await this.ensureDefaultCurrency();
    return this.prisma.currency.findMany({ orderBy: [{ is_default: "desc" }, { code: "asc" }] });
  }

  async adminCreate(dto: { code: string; symbol: string; name: string; fx_rate?: number }, actorUserId?: string) {
    const code = dto.code.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) throw new BadRequestException("Currency code must be a 3-letter ISO 4217 code, e.g. CAD");
    const existing = await this.prisma.currency.findUnique({ where: { code } });
    if (existing) throw new ConflictException(`${code} already exists`);
    const created = await this.prisma.currency.create({
      data: { code, symbol: dto.symbol.trim(), name: dto.name.trim(), fx_rate: dto.fx_rate ?? 1, fx_rate_source: "manual", is_active: true },
    });
    await this.auditLog.log({ userId: actorUserId, action: "currency.created", entityType: "Currency", entityId: created.id, newValue: { code } });
    return created;
  }

  async adminUpdate(id: string, dto: Partial<{ symbol: string; name: string; fx_rate: number; is_active: boolean }>, actorUserId?: string) {
    const currency = await this.prisma.currency.findUnique({ where: { id } });
    if (!currency) throw new NotFoundException("Currency not found");
    if (currency.is_default && dto.is_active === false) {
      throw new BadRequestException("Cannot deactivate the default currency");
    }
    const data: Record<string, any> = {};
    if (dto.symbol !== undefined) data.symbol = dto.symbol.trim();
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.is_active !== undefined) data.is_active = dto.is_active;
    if (dto.fx_rate !== undefined) {
      if (currency.is_default) throw new BadRequestException("The default currency's rate is always 1 — change the default currency instead of editing this rate");
      data.fx_rate = dto.fx_rate;
      data.fx_rate_source = "manual";
      data.fx_rate_updated_at = new Date();
    }
    const updated = await this.prisma.currency.update({ where: { id }, data });
    await this.auditLog.log({ userId: actorUserId, action: "currency.updated", entityType: "Currency", entityId: id, newValue: dto });
    return updated;
  }

  async adminSetDefault(id: string, actorUserId?: string) {
    const currency = await this.prisma.currency.findUnique({ where: { id } });
    if (!currency) throw new NotFoundException("Currency not found");
    if (!currency.is_active) throw new BadRequestException("Activate this currency before making it the default");
    await this.prisma.$transaction([
      this.prisma.currency.updateMany({ where: { is_default: true }, data: { is_default: false } }),
      this.prisma.currency.update({ where: { id }, data: { is_default: true, fx_rate: 1, fx_rate_source: "manual" } }),
    ]);
    await this.auditLog.log({ userId: actorUserId, action: "currency.default_changed", entityType: "Currency", entityId: id, newValue: { code: currency.code } });
    // Every price in the schema is denominated in whatever currency is now
    // default, by convention (see schema.prisma's Currency comment) — so
    // existing rates on every OTHER currency need re-anchoring, which only
    // a fresh live refresh (or manual re-entry) can do correctly. We can't
    // guess the right numbers here, so we deliberately don't try.
    return { message: `${currency.code} is now the default currency. Re-check/refresh the other currencies' FX rates — they were anchored to the previous default.` };
  }

  async adminDelete(id: string, actorUserId?: string) {
    const currency = await this.prisma.currency.findUnique({ where: { id } });
    if (!currency) throw new NotFoundException("Currency not found");
    if (currency.is_default) throw new BadRequestException("Cannot delete the default currency");
    await this.prisma.currency.delete({ where: { id } });
    await this.auditLog.log({ userId: actorUserId, action: "currency.deleted", entityType: "Currency", entityId: id, oldValue: { code: currency.code } });
    return { deleted: true };
  }

  // Pulls fresh FX rates for every active, non-default currency from a free
  // public API, keyed off the current default currency. Manual rates are
  // left completely untouched for any currency the API doesn't return a
  // rate for (and the whole operation degrades to a no-op, not a crash, if
  // the API is unreachable) — a failed refresh should never leave pricing
  // in a worse state than before the refresh was attempted.
  async refreshLiveRates(actorUserId?: string) {
    const base = await this.ensureDefaultCurrency();
    const others = await this.prisma.currency.findMany({ where: { is_active: true, is_default: false } });
    if (!others.length) return { updated: [], message: "No other active currencies to refresh." };

    let rates: Record<string, number>;
    try {
      const res = await fetch(`${LIVE_RATE_API}/${base.code}`);
      if (!res.ok) throw new Error(`Rate API responded ${res.status}`);
      const json: any = await res.json();
      rates = json?.rates ?? {};
    } catch (e: any) {
      return { updated: [], message: `Couldn't reach the live rate service (${e.message}). Existing rates were left unchanged — set them manually instead.` };
    }

    const updated: string[] = [];
    const skipped: string[] = [];
    for (const currency of others) {
      const rate = rates[currency.code];
      if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) { skipped.push(currency.code); continue; }
      await this.prisma.currency.update({
        where: { id: currency.id },
        data: { fx_rate: rate, fx_rate_source: "live", fx_rate_updated_at: new Date() },
      });
      updated.push(currency.code);
    }
    await this.auditLog.log({ userId: actorUserId, action: "currency.rates_refreshed", entityType: "Currency", newValue: { updated, skipped } });
    return { updated, skipped, message: `Updated ${updated.length} currenc${updated.length === 1 ? "y" : "ies"} from live rates.` };
  }

  // The one method everything else in the app calls. `basePrice`/
  // `baseCompareAtPrice` are always in the default currency; `regionalPrices`
  // is the raw JSON column off whichever Course/Certification/Program row is
  // being priced. Never throws — an unknown/inactive requested currency
  // silently falls back to the default currency so a bad `?currency=` query
  // param can never break a product page.
  async resolvePrice(
    basePrice: number,
    baseCompareAtPrice: number | null | undefined,
    regionalPrices: unknown,
    requestedCurrencyCode?: string | null,
  ): Promise<ResolvedPrice> {
    const base = await this.ensureDefaultCurrency();
    const code = (requestedCurrencyCode || base.code).toUpperCase();

    if (code === base.code) {
      return { currency_code: base.code, symbol: base.symbol, price: round2(basePrice), compare_at_price: baseCompareAtPrice != null ? round2(baseCompareAtPrice) : null, is_converted: false };
    }

    const currency = await this.prisma.currency.findUnique({ where: { code } });
    if (!currency || !currency.is_active) {
      return { currency_code: base.code, symbol: base.symbol, price: round2(basePrice), compare_at_price: baseCompareAtPrice != null ? round2(baseCompareAtPrice) : null, is_converted: false };
    }

    const overrides = (regionalPrices && typeof regionalPrices === "object" ? (regionalPrices as Record<string, any>) : {})[code];
    if (overrides && typeof overrides.price === "number") {
      return {
        currency_code: currency.code, symbol: currency.symbol,
        price: round2(overrides.price),
        compare_at_price: typeof overrides.compare_at_price === "number" ? round2(overrides.compare_at_price) : null,
        is_converted: false,
      };
    }

    const rate = Number(currency.fx_rate);
    return {
      currency_code: currency.code, symbol: currency.symbol,
      price: round2(basePrice * rate),
      compare_at_price: baseCompareAtPrice != null ? round2(baseCompareAtPrice * rate) : null,
      is_converted: true,
    };
  }

  // Same resolution, but for the checkout step specifically — callers there
  // need to reject an invalid currency outright (you can't charge a Stripe
  // session in a currency you can't resolve a real number for) rather than
  // silently falling back, which is the right behavior for a product page
  // but the wrong one for "what am I about to be charged."
  async resolveForCheckout(basePrice: number, regionalPrices: unknown, requestedCurrencyCode?: string | null) {
    const base = await this.ensureDefaultCurrency();
    const code = (requestedCurrencyCode || base.code).toUpperCase();
    if (code === base.code) return { currency_code: base.code, amount: round2(basePrice) };

    const currency = await this.prisma.currency.findUnique({ where: { code } });
    if (!currency || !currency.is_active) throw new BadRequestException(`${code} is not an available currency`);

    const overrides = (regionalPrices && typeof regionalPrices === "object" ? (regionalPrices as Record<string, any>) : {})[code];
    if (overrides && typeof overrides.price === "number") return { currency_code: currency.code, amount: round2(overrides.price) };

    return { currency_code: currency.code, amount: round2(basePrice * Number(currency.fx_rate)) };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
