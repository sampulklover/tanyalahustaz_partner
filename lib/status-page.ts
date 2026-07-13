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
    description: "POST /api/v1/chat — AI responses with knowledge retrieval",
  },
  {
    id: "auth",
    name: "Authentication",
    description: "API key validation for partner requests",
  },
];

/** Add incidents here when something happens — drives uptime bars and the incident log. */
export const STATUS_INCIDENTS: StatusIncident[] = [];

const HISTORY_DAYS = 90;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dayKey(date: Date) {
  return startOfDay(date).toISOString().slice(0, 10);
}

function incidentLevel(severity: StatusIncident["severity"]): ServiceStatusLevel {
  if (severity === "critical") return "outage";
  return "degraded";
}

export function buildServiceHistory(
  serviceId: string,
  incidents: StatusIncident[],
  liveOperational: boolean,
): ServiceStatusLevel[] {
  const today = startOfDay(new Date());
  const history: ServiceStatusLevel[] = [];

  for (let offset = HISTORY_DAYS - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const key = dayKey(date);
    const isToday = offset === 0;

    let level: ServiceStatusLevel = "operational";

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
