import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { SsoService } from "./sso.service";
import { SsoController } from "./sso.controller";
import { AuthModule } from "../auth/auth.module";

@Module({
  // Empty JwtModule.register() just provides an injectable JwtService — every
  // sign()/verify() call here passes its own explicit `secret`, same pattern
  // AuthService itself already uses for exam/preview tokens, so no shared
  // module-level signing config is needed.
  imports: [JwtModule.register({}), AuthModule],
  providers: [SsoService],
  controllers: [SsoController],
})
export class SsoModule {}
