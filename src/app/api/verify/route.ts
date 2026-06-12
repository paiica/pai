import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ found: false, error: "Certificate ID is required" }, { status: 400 });
  }

  // Validate format: ACRONYM-YEAR-SEQUENCE (e.g. CAIP-2026-00001)
  const certIdRegex = /^[A-Z]{2,6}-\d{4}-\d{5}$/;
  if (!certIdRegex.test(id)) {
    return NextResponse.json({ found: false, error: "Invalid certificate ID format" }, { status: 400 });
  }

  try {
    const supabase = await createAdminClient();

    const { data: certificate, error } = await supabase
      .from("certificates")
      .select(
        "certificate_id, student_name, student_email, certification_title, certification_acronym, issue_date, expiry_date, status, score"
      )
      .eq("certificate_id", id)
      .single();

    if (error || !certificate) {
      return NextResponse.json({ found: false });
    }

    // Mask email for privacy
    const emailParts = certificate.student_email.split("@");
    const maskedEmail =
      emailParts[0].slice(0, 2) + "***@" + emailParts[1];

    return NextResponse.json({
      found: true,
      certificate: {
        ...certificate,
        student_email: maskedEmail,
      },
    });
  } catch (err) {
    console.error("Verification error:", err);
    return NextResponse.json(
      { found: false, error: "Verification service unavailable" },
      { status: 500 }
    );
  }
}
