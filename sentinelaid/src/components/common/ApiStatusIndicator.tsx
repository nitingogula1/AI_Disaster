import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Server,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ExternalLink,
  Database,
  ChevronDown
} from 'lucide-react';
import { systemService, BASE_URL } from '../../services/api';

interface ApiHealthState {
  connected: boolean;
  status: 'healthy' | 'degraded' | 'disconnected' | 'checking';
  database: string;
  version: string;
  environment: string;
  latencyMs: number | null;
  error?: string;
  lastChecked: Date | null;
  baseUrl: string;
}

interface ApiStatusIndicatorProps {
  variant?: 'dark' | 'light';
  showDetailsOnHover?: boolean;
}

export default function ApiStatusIndicator({
  variant = 'dark',
  showDetailsOnHover = false,
}: ApiStatusIndicatorProps) {
  const [health, setHealth] = useState<ApiHealthState>({
    connected: false,
    status: 'checking',
    database: 'checking...',
    version: '...',
    environment: '...',
    latencyMs: null,
    lastChecked: null,
    baseUrl: BASE_URL,
  });

  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const checkStatus = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const res = await systemService.checkConnection();
      setHealth(res);
    } catch (err: any) {
      setHealth({
        connected: false,
        status: 'disconnected',
        database: 'unreachable',
        version: 'offline',
        environment: 'offline',
        latencyMs: null,
        error: err.message || 'Network error',
        lastChecked: new Date(),
        baseUrl: BASE_URL,
      });
    } finally {
      if (isManual) {
        setTimeout(() => setIsRefreshing(false), 400);
      }
    }
  }, []);

  // Poll on mount and interval
  useEffect(() => {
    checkStatus();
    const interval = setInterval(() => checkStatus(), 20000);

    const handleFocus = () => checkStatus();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkStatus]);

  // Click outside listener for dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isDark = variant === 'dark';

  // Status visual attributes
  const isHealthy = health.connected && health.status === 'healthy';
  const isDegraded = health.connected && health.status === 'degraded';
  const isChecking = health.status === 'checking' && !health.lastChecked;

  const dotColorClass = isChecking
    ? 'bg-amber-400 animate-pulse'
    : isHealthy
    ? 'bg-emerald-400'
    : isDegraded
    ? 'bg-amber-500'
    : 'bg-rose-500';

  const badgeBg = isDark
    ? isHealthy
      ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/50'
      : isDegraded
      ? 'bg-amber-950/60 border-amber-500/30 text-amber-300 hover:bg-amber-900/50'
      : isChecking
      ? 'bg-blue-950/60 border-blue-500/30 text-blue-300 hover:bg-blue-900/50'
      : 'bg-rose-950/60 border-rose-500/40 text-rose-300 hover:bg-rose-900/50'
    : isHealthy
    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
    : isDegraded
    ? 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
    : isChecking
    ? 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100'
    : 'bg-rose-50 border-rose-300 text-rose-800 hover:bg-rose-100';

  const statusLabel = isChecking
    ? 'Checking API...'
    : isHealthy
    ? 'Backend Connected'
    : isDegraded
    ? 'Backend Degraded'
    : 'Backend Offline';

  const docsUrl = BASE_URL.replace(/\/api\/v1\/?$/, '') + '/docs';

  return (
    <div
      className="relative inline-flex items-center"
      ref={popoverRef}
      onMouseEnter={() => showDetailsOnHover && setIsOpen(true)}
      onMouseLeave={() => showDetailsOnHover && setIsOpen(false)}
    >
      {/* Clickable Status Pill */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all duration-150 shadow-sm cursor-pointer select-none ${badgeBg}`}
        title={`Backend API Status: ${statusLabel}. Click for connection telemetry.`}
      >
        {/* Pulsing Status Dot */}
        <span className="relative flex h-2 w-2">
          {isHealthy && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          )}
          {!isHealthy && !isChecking && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColorClass}`} />
        </span>

        {/* Server Icon */}
        <Server size={12} className={isHealthy ? 'text-emerald-400' : isDegraded ? 'text-amber-400' : 'text-rose-400'} />

        {/* Status text */}
        <span className="font-semibold tracking-tight">{statusLabel}</span>

        {/* Latency badge when connected */}
        {isHealthy && health.latencyMs !== null && (
          <span
            className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
              isDark ? 'bg-white/10 text-emerald-200' : 'bg-emerald-200/70 text-emerald-900'
            }`}
          >
            {health.latencyMs}ms
          </span>
        )}

        <ChevronDown
          size={11}
          className={`opacity-70 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Connection Detail Popover */}
      {isOpen && (
        <div
          className={`absolute top-full mt-2 right-0 w-[310px] rounded-xl shadow-2xl z-50 p-4 border transition-all animate-fade-in ${
            isDark
              ? 'bg-[#0f172a]/95 backdrop-blur-md border-white/15 text-slate-100 shadow-black/60'
              : 'bg-white/95 backdrop-blur-md border-slate-200 text-slate-800 shadow-xl'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 dark:border-white/10">
            <div className="flex items-center gap-2">
              {isHealthy ? (
                <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
              ) : isDegraded ? (
                <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />
              ) : (
                <XCircle size={16} className="text-rose-400 flex-shrink-0" />
              )}
              <div>
                <div className="text-[12px] font-bold leading-tight">API & Backend Status</div>
                <div className="text-[10px] text-slate-400">
                  {isHealthy ? 'FastAPI 200 OK • Operational' : 'Offline / Standby Mode'}
                </div>
              </div>
            </div>

            <button
              onClick={() => checkStatus(true)}
              disabled={isRefreshing}
              className={`p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white transition disabled:opacity-50 cursor-pointer`}
              title="Ping Backend API"
            >
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-primary' : ''} />
            </button>
          </div>

          {/* Telemetry Metrics */}
          <div className="mt-3 space-y-2 text-[11px]">
            {/* Endpoint */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Activity size={12} /> Endpoint
              </span>
              <span className="font-mono text-[10px] text-slate-300 max-w-[170px] truncate" title={health.baseUrl}>
                {health.baseUrl}
              </span>
            </div>

            {/* Database */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Database size={12} /> Database
              </span>
              <span className="flex items-center gap-1 font-medium">
                <span className={`w-1.5 h-1.5 rounded-full ${health.connected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <span className="capitalize text-[10px]">{health.database}</span>
              </span>
            </div>

            {/* Latency */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Round-trip Latency</span>
              <span className="font-mono text-[10px] font-semibold text-emerald-400">
                {health.latencyMs !== null ? `${health.latencyMs} ms` : '—'}
              </span>
            </div>

            {/* Environment / Version */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Version / Mode</span>
              <span className="text-[10px] text-slate-300">
                v{health.version} ({health.environment})
              </span>
            </div>

            {/* Last Checked */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Last Verified</span>
              <span className="text-[10px] text-slate-400">
                {health.lastChecked ? health.lastChecked.toLocaleTimeString() : 'Pending'}
              </span>
            </div>
          </div>

          {/* Quick Action Links */}
          <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between gap-2">
            <a
              href={docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-400 hover:text-sky-300 transition"
            >
              Open API Docs (Swagger)
              <ExternalLink size={10} />
            </a>

            <button
              onClick={() => checkStatus(true)}
              disabled={isRefreshing}
              className="text-[10px] px-2 py-0.5 rounded bg-white/10 hover:bg-white/15 text-slate-300 font-medium transition cursor-pointer"
            >
              {isRefreshing ? 'Testing...' : 'Test Now'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
