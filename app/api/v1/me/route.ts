import { apiError, apiSuccess, withApiAuth } from "@/lib/api/handler";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  return withApiAuth(request, async (_request, context) => {
    const admin = createAdminClient();

    const [{ data: profile }, { data: apiKey }] = await Promise.all([
      admin
        .from("profiles")
        .select("id, email, company_name, created_at")
        .eq("id", context.userId)
        .single(),
      admin.from("api_keys").select("id, name, last_used_at").eq("id", context.apiKeyId).single(),
    ]);

    if (!profile || !apiKey) {
      return apiError("Partner profile not found.", 404);
    }

    return apiSuccess({
      partner: profile,
      api_key: apiKey,
    });
  });
}
