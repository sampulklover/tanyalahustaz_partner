import { apiError, apiSuccess, withApiAuth } from "@/lib/api/handler";
import { ApiErrorCode } from "@/lib/api/errors";
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
      return apiError(
        ApiErrorCode.NOT_FOUND,
        "Account profile not found.",
        404,
        { requestId: context.requestId },
      );
    }

    return apiSuccess(
      {
        partner: profile,
        api_key: apiKey,
      },
      200,
      context.requestId,
    );
  });
}
