export const SEVERITIES = ["info", "low", "medium", "high", "critical"] as const;
export type Severity = (typeof SEVERITIES)[number];

export interface Alert {
  id: string;
  received_at: string;
  source: string;
  event_type: string;
  severity: Severity;
  score: number;
  reasons: string[];
  summary: string;
  engine: string;
}

const isString = (v: unknown): v is string => typeof v === "string";

/** Validates untrusted JSON and returns a clean Alert, or null if it is malformed. */
export function parseAlert(input: unknown): Alert | null {
  if (typeof input !== "object" || input === null) return null;
  const o = input as Record<string, unknown>;
  if (!isString(o.id) || !isString(o.source) || !isString(o.event_type)) return null;
  if (!SEVERITIES.includes(o.severity as Severity)) return null;
  if (typeof o.score !== "number" || !Number.isFinite(o.score)) return null;
  const reasons = Array.isArray(o.reasons) ? o.reasons.filter(isString) : [];
  return {
    id: o.id.slice(0, 128),
    received_at: isString(o.received_at) ? o.received_at : new Date().toISOString(),
    source: o.source.slice(0, 64),
    event_type: o.event_type.slice(0, 64),
    severity: o.severity as Severity,
    score: Math.max(0, Math.min(100, o.score)),
    reasons: reasons.slice(0, 20).map((r) => r.slice(0, 300)),
    summary: isString(o.summary) ? o.summary.slice(0, 1000) : "",
    engine: isString(o.engine) ? o.engine.slice(0, 32) : "rules",
  };
}

/** Bounded in-memory store; newest alerts first. Replace with a database for production. */
export class AlertStore {
  private alerts: Alert[] = [];

  constructor(private readonly capacity = 500) {}

  add(alert: Alert): void {
    this.alerts = [alert, ...this.alerts.filter((a) => a.id !== alert.id)].slice(0, this.capacity);
  }

  list(minSeverity?: Severity): Alert[] {
    if (!minSeverity) return [...this.alerts];
    const floor = SEVERITIES.indexOf(minSeverity);
    return this.alerts.filter((a) => SEVERITIES.indexOf(a.severity) >= floor);
  }

  get size(): number {
    return this.alerts.length;
  }
}
