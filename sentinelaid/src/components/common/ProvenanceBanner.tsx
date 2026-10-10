import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

export interface ProvenanceMetricItem {
  fieldName: string;
  value?: any;
  provenance?: string | null;
  as_of?: string | null;
  stale?: boolean;
}

interface ProvenanceBannerProps {
  metrics: ProvenanceMetricItem[];
  mode?: 'LIVE' | 'DRILL';
}

export const formatAge = (asOf?: string | null): string => {
  if (!asOf) return 'unknown age';
  const diffMs = Date.now() - new Date(asOf).getTime();
  if (isNaN(diffMs) || diffMs < 0) return 'just now';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export const ProvenanceBanner: React.FC<ProvenanceBannerProps> = ({ metrics, mode = 'LIVE' }) => {
  // Fail-safe: if metrics array is empty or undefined, default to showing simulated warning
  if (!metrics || metrics.length === 0) {
    return (
      <div className="bg-amber-500 border-2 border-amber-700 text-slate-950 px-4 py-2.5 rounded-xl shadow-md flex items-center justify-between gap-3 font-sans">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 bg-black text-amber-300 font-mono font-black text-xs rounded tracking-widest uppercase flex items-center gap-1.5 shadow-sm shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            SIMULATED SCENARIO DATA — NOT LIVE
          </span>
          <span className="text-xs font-extrabold text-slate-950 tracking-tight">
            DATA STATUS UNCONFIRMED: Provenance metadata missing. Treating all visible parameters as synthetic simulation.
          </span>
        </div>
        <span className="hidden lg:inline text-[11px] font-mono font-bold px-2 py-0.5 bg-amber-600 text-white rounded uppercase">
          FAIL-SAFE MODE
        </span>
      </div>
    );
  }

  // Detect simulated or missing provenance fields
  const simulatedFields: string[] = [];
  const validSourcesMap = new Map<string, string>(); // provenance -> age

  metrics.forEach((m) => {
    const prov = m.provenance?.toUpperCase();
    if (!prov || prov === 'SIMULATED' || !['LIVE_SENSOR', 'SATELLITE_DERIVED', 'FORECAST_MODEL', 'FIELD_REPORT', 'ESTIMATE'].includes(prov)) {
      if (!simulatedFields.includes(m.fieldName)) {
        simulatedFields.push(m.fieldName);
      }
    } else {
      const age = formatAge(m.as_of);
      validSourcesMap.set(prov, age);
    }
  });

  const isAllReal = simulatedFields.length === 0 && mode === 'LIVE';

  if (isAllReal) {
    // Hidden banner, but show small "Data sources" chip
    return (
      <div className="bg-slate-900 border border-slate-700 px-4 py-2 rounded-xl text-white flex flex-wrap items-center justify-between gap-2 shadow-sm font-sans">
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-emerald-400 tracking-wide uppercase text-[11px]">
            Live Verified Feed:
          </span>
          <span className="text-slate-300 text-xs">All visible metrics backed by persistent database ground-truth.</span>
        </div>

        <div className="flex items-center gap-2 text-xs flex-wrap font-mono">
          <span className="text-slate-400 text-[11px] uppercase font-bold">Data sources:</span>
          {Array.from(validSourcesMap.entries()).map(([src, age]) => (
            <span key={src} className="px-2 py-0.5 bg-slate-800 text-sky-300 border border-slate-700 rounded text-[11px]">
              {src.replace('_', ' ')} ({age})
            </span>
          ))}
        </div>
      </div>
    );
  }

  // Mixed or Simulated
  const isMixed = simulatedFields.length > 0 && validSourcesMap.size > 0 && mode !== 'DRILL';

  return (
    <div className="bg-amber-500 border-2 border-amber-700 text-slate-950 px-4 py-2.5 rounded-xl shadow-md flex items-center justify-between gap-3 font-sans">
      <div className="flex items-center gap-3">
        <span className="px-2.5 py-1 bg-black text-amber-300 font-mono font-black text-xs rounded tracking-widest uppercase flex items-center gap-1.5 shadow-sm shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          SIMULATED SCENARIO DATA — NOT LIVE
        </span>
        <span className="text-xs font-extrabold text-slate-950 tracking-tight">
          {isMixed ? (
            <>
              SYNTHETIC FIELDS DETECTED: <span className="underline font-mono bg-amber-600/30 px-1 py-0.5 rounded">{simulatedFields.join(', ')}</span>. Not connected to live sensor telemetry.
            </>
          ) : (
            <>
              TRAINING DRILL ENVIRONMENT: All casualty headcounts, flood depths, and village risk classifications are synthetic scenario parameters.
            </>
          )}
        </span>
      </div>
      <span className="hidden lg:inline text-[11px] font-mono font-bold px-2 py-0.5 bg-amber-600 text-white rounded uppercase">
        {mode === 'DRILL' ? 'EXERCISE DRILL' : 'SIMULATED DATA'}
      </span>
    </div>
  );
};
export default ProvenanceBanner;
