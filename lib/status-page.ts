import { createAdminClient } from "@/lib/supabase/admin";
import type { Translator } from "@/lib/i18n/translator";

export type ServiceStatusLevel = "operational" | "degraded" | "outage";

export type StatusService = {
  id: string;
  name: string;
  description: string;
};

export type StatusIncident = {
  id: string;
  date: string;
  title: string;
  status: "resolved" | "investigating" | "identified";
  severity: "minor" | "major" | "critical";
  affectedServices: string[];
  updates: { time: string; message: string }[];
  /** True for incidents detected automatically from real request data. */
  auto?: boolean;
};

export const STATUS_SERVICES: StatusService[] = [
  {
    id: "api",
    name: "API",
    description: "Core API gateway and health endpoints",
  },
  {
    id: "chat",
    name: "Chat API",
    description: "POST /api/v1/chat: AI responses with knowledge retrieval",
  },
  {
    id: "auth",
    name: "Authentication",
    description: "API key validation for API requests",
  },
];

/**
 * Manually recorded incidents. These override the measured uptime for the
 * days they cover, so you can annotate what actually happened. Leave empty
 * when nothing notable occurred.
 */
export const STATUS_INCIDENTS: StatusIncident[] = [];

const HISTORY_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;
const CHAT_ENDPOINT = "/api/v1/chat";
const USAGE_ROW_LIMIT = 50000;

/** Aggregated request outcomes for a single calendar day. */
export type DailyUsage = { total: number; failures: number };

/** Real request history, overall and for the chat endpoint specifically. */
export type UsageHistory = {
  all: Map<string, DailyUsage>;
  chat: Map<string, DailyUsage>;
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dayKey(date: Date) {
  return startOfDay(date).toISOString().slice(0, 10);
}

function bump(map: Map<string, DailyUsage>, key: string, statusCode: number | null) {
  const entry = map.get(key) ?? { total: 0, failures: 0 };
  entry.total += 1;
  // Only server-side failures count as downtime; 4xx are caller mistakes.
  if ((statusCode ?? 0) >= 500) entry.failures += 1;
  map.set(key, entry);
}

function failureRate(entry: DailyUsage) {
  return entry.total > 0 ? entry.failures / entry.total : 0;
}

/**
 * Classifies a day's failures. Returns null when the day looks healthy.
 * Tiny samples are treated gently so a single failure does not look like an outage.
 */
function severityFor(entry: DailyUsage | undefined): StatusIncident["severity"] | null {
  if (!entry || entry.total === 0 || entry.failures === 0) return null;
  if (entry.total < 3) return "minor";

  const rate = failureRate(entry);
  if (rate >= 0.5) return "critical";
  if (rate >= 0.25) return "major";
  if (rate >= 0.1) return "minor";
  return null;
}

const SEVERITY_ORDER: Record<StatusIncident["severity"], number> = {
  minor: 0,
  major: 1,
  critical: 2,
};

function worseSeverity(
  a: StatusIncident["severity"] | null,
  b: StatusIncident["severity"],
): StatusIncident["severity"] {
  if (!a) return b;
  return SEVERITY_ORDER[b] > SEVERITY_ORDER[a] ? b : a;
}

function levelFromUsage(entry: DailyUsage | undefined): ServiceStatusLevel {
  const severity = severityFor(entry);
  if (!severity) return "operational";
  return severity === "critical" ? "outage" : "degraded";
}

type AutoIncidentOptions = {
  liveOperational?: boolean;
  limit?: number;
};

/**
 * Turns real request history into incident entries. One incident per day is
 * produced when any service's server-error rate crossed the threshold, so the
 * "Past incidents" list reflects what actually happened without any manual work.
 */
export function deriveIncidents(
  usage: UsageHistory,
  t: Translator,
  { liveOperational = true, limit = 12 }: AutoIncidentOptions = {},
): StatusIncident[] {
  const dates = Array.from(new Set([...usage.all.keys(), ...usage.chat.keys()])).sort(
    (a, b) => b.localeCompare(a),
  );
  const today = new Date().toISOString().slice(0, 10);
  const incidents: StatusIncident[] = [];

  for (const date of dates) {
    const affected: string[] = [];
    const updates: { time: string; message: string }[] = [];
    let severity: StatusIncident["severity"] | null = null;

    const apiSeverity = severityFor(usage.all.get(date));
    if (apiSeverity) {
      affected.push("api", "auth");
      severity = worseSeverity(severity, apiSeverity);
      const entry = usage.all.get(date)!;
      updates.push({
        time: t("status.auto.detectedAt"),
        message: t("status.auto.update", {
          service: t("status.services.api.name"),
          failed: entry.failures,
          total: entry.total,
          rate: Math.round(failureRate(entry) * 100),
        }),
      });
    }

    const chatSeverity = severityFor(usage.chat.get(date));
    if (chatSeverity) {
      affected.push("chat");
      severity = worseSeverity(severity, chatSeverity);
      const entry = usage.chat.get(date)!;
      updates.push({
        time: t("status.auto.detectedAt"),
        message: t("status.auto.update", {
          service: t("status.services.chat.name"),
          failed: entry.failures,
          total: entry.total,
          rate: Math.round(failureRate(entry) * 100),
        }),
      });
    }

    if (!severity || affected.length === 0) continue;

    incidents.push({
      id: `auto-${date}`,
      date,
      title:
        severity === "critical"
          ? t("status.auto.outageTitle")
          : t("status.auto.degradedTitle"),
      status: date === today && !liveOperational ? "investigating" : "resolved",
      severity,
      affectedServices: affected,
      updates,
      auto: true,
    });
  }

  return incidents.slice(0, limit);
}

/**
 * Reads the last 90 days of real API outcomes from `api_usage`. The status
 * page is public, so this uses the admin client to aggregate across all keys.
 * Degrades gracefully to "all operational" if the database is unreachable.
 */
export async function fetchUsageHistory(days = HISTORY_DAYS): Promise<UsageHistory> {
  const empty: UsageHistory = { all: new Map(), chat: new Map() };

  try {
    const admin = createAdminClient();
    const since = new Date(Date.now() - days * DAY_MS).toISOString();

    const { data, error } = await admin
      .from("api_usage")
      .select("created_at, status_code, endpoint")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(USAGE_ROW_LIMIT);

    if (error || !data) return empty;

    const all = new Map<string, DailyUsage>();
    const chat = new Map<string, DailyUsage>();

    for (const row of data) {
      const key = String(row.created_at).slice(0, 10);
      const statusCode = (row.status_code as number | null) ?? null;
      bump(all, key, statusCode);
      if (row.endpoint === CHAT_ENDPOINT) bump(chat, key, statusCode);
    }

    return { all, chat };
  } catch {
    return empty;
  }
}

function incidentLevel(severity: StatusIncident["severity"]): ServiceStatusLevel {
  if (severity === "critical") return "outage";
  return "degraded";
}

export function buildServiceHistory(
  serviceId: string,
  usage: UsageHistory,
  incidents: StatusIncident[],
  liveOperational: boolean,
): ServiceStatusLevel[] {
  const today = startOfDay(new Date());
  const source = serviceId === "chat" ? usage.chat : usage.all;
  const history: ServiceStatusLevel[] = [];

  for (let offset = HISTORY_DAYS - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const key = dayKey(date);
    const isToday = offset === 0;

    let level = levelFromUsage(source.get(key));

    for (const incident of incidents) {
      if (!incident.affectedServices.includes(serviceId)) continue;
      if (incident.date !== key) continue;
      level = incidentLevel(incident.severity);
      break;
    }

    if (isToday && !liveOperational) {
      level = "outage";
    }

    history.push(level);
  }

  return history;
}

export function overallStatus(
  histories: Record<string, ServiceStatusLevel[]>,
): ServiceStatusLevel {
  const levels = Object.values(histories).map((history) => history.at(-1) ?? "operational");
  if (levels.includes("outage")) return "outage";
  if (levels.includes("degraded")) return "degraded";
  return "operational";
}

export async function fetchApiHealth(baseUrl: string) {
  const start = Date.now();
  try {
    const response = await fetch(`${baseUrl}/api/v1/health`, {
      cache: "no-store",
      next: { revalidate: 0 },
    });
    const body = (await response.json()) as { status?: string; version?: string };
    return {
      ok: response.ok && body.status === "ok",
      latencyMs: Date.now() - start,
      version: body.version ?? "v1",
      checkedAt: new Date().toISOString(),
    };
  } catch {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      version: "v1",
      checkedAt: new Date().toISOString(),
    };
  }
}

export const STATUS_HISTORY_DAYS = HISTORY_DAYS;
