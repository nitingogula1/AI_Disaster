import type { SeverityLevel, EventStatus, DamageClass, TeamStatus, RouteRisk, AlertSeverity, ProcessingStatus } from '../../types';

// ============================================================
// StatusBadge — colored pill for severity, status, etc.
// ============================================================
const severityStyles: Record<string, string> = {
  CRITICAL: 'bg-critical/10 text-critical border-critical/30',
  HIGH: 'bg-warning/10 text-warning border-warning/30',
  MODERATE: 'bg-secondary-blue/10 text-secondary-blue border-secondary-blue/30',
  LOW: 'bg-success/10 text-success border-success/30',
  RESOLVED: 'bg-success/10 text-success border-success/30',
};

export function SeverityBadge({ level }: { level: SeverityLevel }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider border ${severityStyles[level] || 'bg-panel text-text-secondary border-border'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${level === 'CRITICAL' ? 'bg-critical animate-pulse-critical' : level === 'HIGH' ? 'bg-warning' : level === 'MODERATE' ? 'bg-secondary-blue' : 'bg-success'}`} />
      {level} {level === 'CRITICAL' ? '(Level 4)' : level === 'HIGH' ? '(Level 3)' : level === 'MODERATE' ? '(Level 2)' : '(Level 1)'}
    </span>
  );
}

// ============================================================
// EventStatusBadge
// ============================================================
const statusStyles: Record<EventStatus, string> = {
  ACTIVE: 'bg-critical/10 text-critical border-critical/30',
  MONITORING: 'bg-warning/10 text-warning border-warning/30',
  RESPONSE: 'bg-primary/10 text-primary border-primary/30',
  RESOLVED: 'bg-success/10 text-success border-success/30',
  ARCHIVED: 'bg-panel text-text-muted border-border',
};

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold uppercase tracking-wider border ${statusStyles[status]}`}>
      {status === 'ACTIVE' && <span className="w-1.5 h-1.5 rounded-full bg-critical animate-pulse-critical" />}
      {status}
    </span>
  );
}

// ============================================================
// DamageClassBadge
// ============================================================
const damageStyles: Record<DamageClass, string> = {
  DESTROYED: 'bg-critical text-white',
  SEVERE: 'bg-critical/80 text-white',
  MODERATE: 'bg-warning text-white',
  MINOR: 'bg-secondary-blue text-white',
  NO_DAMAGE: 'bg-success text-white',
};

export function DamageClassBadge({ damage }: { damage: DamageClass }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${damageStyles[damage]}`}>
      {damage.replace('_', ' ')}
    </span>
  );
}

// ============================================================
// DamageGradeBadge (1-5 scale from reference)
// ============================================================
const gradeColors: Record<number, string> = {
  5: 'bg-critical text-white',
  4: 'bg-critical/80 text-white',
  3: 'bg-warning text-white',
  2: 'bg-secondary-blue text-white',
  1: 'bg-success text-white',
};
const gradeLabels: Record<number, string> = {
  5: 'Grade 5: Destroyed',
  4: 'Grade 4: Severe',
  3: 'Grade 3: Moderate',
  2: 'Grade 2: Minor',
  1: 'Grade 1: Intact',
};

export function DamageGradeBadge({ grade }: { grade: number }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${gradeColors[grade] || 'bg-panel text-text-secondary'}`}>
      {gradeLabels[grade] || `Grade ${grade}`}
    </span>
  );
}

// ============================================================
// TeamStatusBadge
// ============================================================
const teamStyles: Record<TeamStatus, string> = {
  DEPLOYED: 'bg-success/10 text-success border-success/30',
  EN_ROUTE: 'bg-primary/10 text-primary border-primary/30',
  ON_SITE: 'bg-success/10 text-success border-success/30',
  RETURNING: 'bg-warning/10 text-warning border-warning/30',
  STANDBY: 'bg-panel text-text-secondary border-border',
  UNASSIGNED: 'bg-critical/10 text-critical border-critical/30',
};

export function TeamStatusBadge({ status }: { status: TeamStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider border ${teamStyles[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

// ============================================================
// RouteRiskBadge
// ============================================================
const riskStyles: Record<RouteRisk, string> = {
  LOW: 'text-success font-bold',
  MEDIUM: 'text-warning font-bold',
  HIGH: 'text-warning font-bold',
  CRITICAL: 'text-critical font-bold',
};

export function RouteRiskBadge({ risk, percent }: { risk: RouteRisk; percent?: number }) {
  return (
    <span className={riskStyles[risk]}>
      {risk}{percent !== undefined ? ` (${percent}%)` : ''}
    </span>
  );
}

// ============================================================
// ConfidenceBadge
// ============================================================
export function ConfidenceBadge({ value }: { value: number }) {
  const style = value >= 90
    ? 'bg-success/10 text-success border-success/30'
    : value >= 70
    ? 'bg-warning/10 text-warning border-warning/30'
    : 'bg-critical/10 text-critical border-critical/30';
  const label = value >= 90 ? 'High' : value >= 70 ? 'Moderate' : 'Low';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border tabular-nums ${style}`}>
      {value.toFixed(1)}% ({label})
    </span>
  );
}

// ============================================================
// AlertSeverityBadge
// ============================================================
const alertStyles: Record<AlertSeverity, { bg: string; text: string; label: string }> = {
  CRITICAL: { bg: 'bg-critical', text: 'text-white', label: 'CRITICAL' },
  HIGH_SURGE: { bg: 'bg-critical/80', text: 'text-white', label: 'HIGH SURGE' },
  WARNING: { bg: 'bg-warning', text: 'text-white', label: 'WARNING' },
  INFO: { bg: 'bg-primary', text: 'text-white', label: 'INFO' },
  SATELLITE_INGEST: { bg: 'bg-primary/20', text: 'text-primary', label: 'SATELLITE INGEST' },
};

export function AlertSeverityBadge({ severity }: { severity: AlertSeverity }) {
  const s = alertStyles[severity];
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

// ============================================================
// ProcessingStatusBadge
// ============================================================
const procStyles: Record<string, string> = {
  Verified: 'bg-success/10 text-success border-success/30',
  Calibrated: 'bg-primary/10 text-primary border-primary/30',
  'In Progress': 'bg-warning/10 text-warning border-warning/30',
  Ready: 'bg-secondary-blue/10 text-secondary-blue border-secondary-blue/30',
  Queued: 'bg-panel text-text-muted border-border',
  Failed: 'bg-critical/10 text-critical border-critical/30',
};

export function ProcessingStatusBadge({ status }: { status: ProcessingStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${procStyles[status] || 'bg-panel text-text-muted border-border'}`}>
      {status === 'Verified' && <span className="text-success">✓</span>}
      {status}
    </span>
  );
}
