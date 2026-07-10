import { apiSuccess, withApiAuth } from "@/lib/api/handler";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  return withApiAuth(request, async (_req, context) => {
    const admin = createAdminClient();
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [{ count: totalRequests }, { data: recentRequests }, { data: byEndpoint }] =
      await Promise.all([
        admin
          .from("api_usage")
          .select("*", { count: "exact", head: true })
          .eq("api_key_id", context.apiKeyId)
          .gte("created_at", since.toISOString()),
        admin
          .from("api_usage")
          .select("endpoint, method, status_code, created_at")
          .eq("api_key_id", context.apiKeyId)
          .order("created_at", { ascending: false })
          .limit(10),
        admin
          .from("api_usage")
          .select("endpoint")
          .eq("api_key_id", context.apiKeyId)
          .gte("created_at", since.toISOString()),
      ]);

    const endpointCounts = (byEndpoint ?? []).reduce<Record<string, number>>((acc, row) => {
      acc[row.endpoint] = (acc[row.endpoint] ?? 0) + 1;
      return acc;
    }, {});

    const topEndpoints = Object.entries(endpointCounts)
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return apiSuccess({
      period_days: 30,
      total_requests: totalRequests ?? 0,
      top_endpoints: topEndpoints,
      recent_requests: recentRequests ?? [],
    }, 200, context.requestId);
  });
}
