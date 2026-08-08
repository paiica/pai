import { SetMetadata } from "@nestjs/common";

// Unlike @Public() (which skips authentication entirely), this still runs
// the JWT strategy so req.user is populated when a valid token is present,
// but never throws when one isn't — for routes that behave differently for
// logged-in vs anonymous callers without requiring a login.
export const IS_OPTIONAL_AUTH_KEY = "isOptionalAuth";
export const OptionalAuth = () => SetMetadata(IS_OPTIONAL_AUTH_KEY, true);
