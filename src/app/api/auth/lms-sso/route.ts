import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { createClient } from "@/lib/supabase/server";

const LMS_URL = process.env.LMS_URL ?? "https://lms.professionalaiinstitute.com";
const SSO_SECRET = process.env.LMS_SSO_SECRET;

export async function GET() {
  if (!SSO_SECRET) {
    return NextResponse.json({ error: "SSO not configured" }, { status: 500 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL));
  }

  const fullName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "Student";

  const secret = new TextEncoder().encode(SSO_SECRET);

  const token = await new SignJWT({
    email: user.email,
    full_name: fullName,
    iss: "pai",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(secret);

  return NextResponse.redirect(
    `${LMS_URL}/api/method/lms.sso.login?token=${token}`
  );
}
