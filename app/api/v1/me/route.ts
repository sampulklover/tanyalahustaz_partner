import { NextResponse } from "next/server";
import { authenticateApiRequest, recordApiUsage } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const admin = createAdminClient();

  const [{ data: profile }, { data: apiKey }] = await Promise.all([
    admin.from("profiles").select("id, email, company_name").eq("id", auth.context.userId).single(),
    admin.from("api_keys").select("id, name").eq("id", auth.context.apiKeyId).single(),
  ]);

  const response = NextResponse.json({
    partner: profile,
    api_key: apiKey,
  });

  await recordApiUsage(auth.context, request, response.status);

  return response;
}
