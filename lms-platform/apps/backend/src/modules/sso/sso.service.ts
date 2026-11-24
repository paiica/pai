import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Issuer, generators } from "openid-client";
import { Role } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "../auth/auth.service";

type SsoStatePayload = { institution_id: string; nonce: string; type: "sso_state" };

@Injectable()
export class SsoService {
  private readonly logger = new Logger(SsoService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private jwt: JwtService,
    private auth: AuthService,
  ) {}

  private get callbackUrl(): string {
    return `${this.config.get<string>("apiBaseUrl")}/sso/callback`;
  }

  private stateSecret(): string {
    return this.config.get<string>("jwt.accessSecret")!;
  }

  // ── Institution admin (academia app) — self-service config ─────────────────

  async getConfig(institutionId: string) {
    const config = await this.prisma.institutionSsoConfig.findUnique({ where: { institution_id: institutionId } });
    if (!config) return null;
    // client_secret is write-only — never sent back to the frontend once saved.
    const { client_secret, ...safe } = config;
    return { ...safe, has_client_secret: !!client_secret };
  }

  async upsertConfig(institutionId: string, dto: { provider?: string; issuer_url: string; client_id: string; client_secret?: string; is_enabled?: boolean }) {
    if (!/^https?:\/\//.test(dto.issuer_url)) throw new BadRequestException("Issuer URL must be a valid https:// URL");
    if (!dto.client_id?.trim()) throw new BadRequestException("Client ID is required");

    const existing = await this.prisma.institutionSsoConfig.findUnique({ where: { institution_id: institutionId } });
    if (!existing && !dto.client_secret) throw new BadRequestException("Client secret is required");

    const config = await this.prisma.institutionSsoConfig.upsert({
      where: { institution_id: institutionId },
      create: {
        institution_id: institutionId,
        provider: dto.provider ?? "custom",
        issuer_url: dto.issuer_url.trim(),
        client_id: dto.client_id.trim(),
        // Prisma builds both the `create` and `update` payload objects eagerly
        // before deciding which one to use — so on an update-only call (no new
        // secret provided, the documented "leave blank to keep it" flow) this
        // literal still evaluates even though `create` is never executed.
        // `dto.client_secret!.trim()` used to crash here with a TypeError on
        // every such call; `existing` being truthy is what makes this value
        // inert instead of a required guarantee.
        client_secret: (dto.client_secret ?? "").trim(),
        is_enabled: dto.is_enabled ?? false,
      },
      update: {
        provider: dto.provider ?? existing?.provider,
        issuer_url: dto.issuer_url.trim(),
        client_id: dto.client_id.trim(),
        ...(dto.client_secret ? { client_secret: dto.client_secret.trim() } : {}),
        ...(dto.is_enabled !== undefined ? { is_enabled: dto.is_enabled } : {}),
      },
    });
    const { client_secret, ...safe } = config;
    return { ...safe, has_client_secret: !!client_secret };
  }

  // ── Public: login-page lookup + OIDC flow ───────────────────────────────────

  async getPublicSsoInfo(code: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { code: code.trim().toUpperCase() },
      include: { sso_config: true },
    });
    if (!institution || !institution.sso_config?.is_enabled) return { available: false };
    return { available: true, institution_id: institution.id, institution_name: institution.name };
  }

  private async buildClient(institutionId: string) {
    const config = await this.prisma.institutionSsoConfig.findUnique({ where: { institution_id: institutionId } });
    if (!config || !config.is_enabled) throw new NotFoundException("SSO is not enabled for this institution");

    const issuer = await Issuer.discover(config.issuer_url);
    const client = new issuer.Client({
      client_id: config.client_id,
      client_secret: config.client_secret,
      redirect_uris: [this.callbackUrl],
      response_types: ["code"],
    });
    return client;
  }

  async buildAuthorizationUrl(institutionId: string): Promise<string> {
    const institution = await this.prisma.institution.findUnique({ where: { id: institutionId } });
    if (!institution) throw new NotFoundException("Institution not found");

    const client = await this.buildClient(institutionId);
    const nonce = generators.nonce();

    const state = this.jwt.sign(
      { institution_id: institutionId, nonce, type: "sso_state" } satisfies SsoStatePayload,
      { secret: this.stateSecret(), expiresIn: "10m" },
    );

    return client.authorizationUrl({ scope: "openid email profile", state, nonce });
  }

  // Returns the frontend URL to redirect the browser to, carrying a
  // single-use SSO ticket (see AuthService.issueSsoTicket) rather than a
  // real access token.
  async handleCallback(query: Record<string, string>): Promise<string> {
    const frontendUrl = this.config.get<string>("frontendUrl");
    let payload: SsoStatePayload;
    try {
      payload = this.jwt.verify(query.state, { secret: this.stateSecret() });
    } catch {
      throw new BadRequestException("Invalid or expired SSO state — please try signing in again.");
    }
    if (payload.type !== "sso_state") throw new BadRequestException("Invalid SSO state");

    const client = await this.buildClient(payload.institution_id);
    // `query` is already the clean, parsed set of OAuth response params
    // (NestJS's @Query() decorator did the URL parsing) — no need to
    // round-trip through callbackParams()'s own URL/request parsing.
    const tokenSet = await client.callback(this.callbackUrl, query, { state: query.state, nonce: payload.nonce });
    const claims = tokenSet.claims();
    const email = claims.email as string | undefined;
    if (!email) throw new BadRequestException("The identity provider did not return an email address");
    if (claims.email_verified === false) throw new BadRequestException("Your identity provider reports this email as unverified");

    const firstName = (claims.given_name as string) || (claims.name as string)?.split(" ")[0] || "there";
    const lastName = (claims.family_name as string) || (claims.name as string)?.split(" ").slice(1).join(" ") || "";

    const user = await this.findOrCreateSsoUser(email, firstName, lastName, payload.institution_id);
    const { ticket } = await this.auth.issueSsoTicket(user.id);
    this.logger.log(`SSO callback succeeded for ${email} at institution ${payload.institution_id}`);
    return `${frontendUrl}/sso/callback?ticket=${ticket}`;
  }

  // A successful OIDC login through the institution's OWN identity provider
  // is itself the trust signal — stronger proof of institutional membership
  // than matching a registration email's domain, so this grants an active
  // student membership unconditionally (no separate verified-domain check
  // needed, unlike AuthService.register's auto-join path).
  private async findOrCreateSsoUser(email: string, firstName: string, lastName: string, institutionId: string) {
    const normalized = email.toLowerCase().trim();
    let user = await this.prisma.user.findUnique({ where: { email: normalized } });

    if (!user) {
      const bcrypt = await import("bcryptjs");
      const { randomBytes } = await import("crypto");
      const passwordHash = await bcrypt.hash(randomBytes(24).toString("hex"), 12);
      user = await this.prisma.user.create({
        data: {
          email: normalized,
          password_hash: passwordHash,
          role: Role.student,
          email_verified: true,
          is_active: true,
          profile: { create: { first_name: firstName, last_name: lastName, display_name: `${firstName} ${lastName}`.trim() } },
        },
      });
    }

    await this.prisma.institutionMembership.upsert({
      where: { user_id_institution_id: { user_id: user.id, institution_id: institutionId } },
      create: { user_id: user.id, institution_id: institutionId, role: "student", status: "active" },
      update: { status: "active" },
    });

    return user;
  }
}
