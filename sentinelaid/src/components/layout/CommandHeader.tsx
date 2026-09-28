import { useState, useEffect, useRef } from 'react';
import { Search, Bell, Maximize2, ChevronDown, Check } from 'lucide-react';
import SentinelAidLogo from '../common/SentinelAidLogo';
import { useAppStore } from '../../store/appStore';
import { operationService, systemService, alertService } from '../../services/api';
import ApiStatusIndicator from '../common/ApiStatusIndicator';

export default function CommandHeader() {
  const {
    activeDisasterContext,
    activeOperationId,
    setActiveOperation,
    threatLevel,
    setThreatLevel,
    satelliteStream,
    setSatelliteStream,
    notifications,
    setNotifications,
    triggerRefresh,
    refreshTrigger
  } = useAppStore();

  const [operations, setOperations] = useState<any[]>([]);
  const [showOpDropdown, setShowOpDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch initial telemetry and system data
  useEffect(() => {
    // 1. Fetch active operation
    operationService.getActiveOperation().then((op) => {
      if (op) {
        setActiveOperation(op.id, op.name, op.region);
      }
    });

    // 2. Fetch operations list
    operationService.getOperations().then((ops) => {
      if (ops && ops.length) {
        setOperations(ops);
      }
    });

    // 3. Fetch threat level
    systemService.getThreatLevel().then((tl) => {
      if (tl) setThreatLevel(tl);
    });

    // 4. Fetch satellite status
    systemService.getSatelliteStatus().then((st) => {
      if (st) setSatelliteStream(st);
    });

    // 5. Fetch alerts count
    alertService.getAlerts({ unread: true }).then((res: any) => {
      if (Array.isArray(res)) {
        setNotifications(res.filter((a) => !a.is_read).length || 4);
      } else if (res && typeof res.unread_count === 'number') {
        setNotifications(res.unread_count);
      }
    });
  }, [refreshTrigger]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowOpDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectOperation = async (op: any) => {
    setShowOpDropdown(false);
    try {
      await operationService.activateOperation(op.id);
    } catch {
      // Offline fallback
    }
    setActiveOperation(op.id, op.name, op.region);
    triggerRefresh();
  };

  const threatColor =
    threatLevel.level >= 4
      ? 'text-critical'
      : threatLevel.level === 3
      ? 'text-warning'
      : 'text-primary';

  const threatBg =
    threatLevel.level >= 4
      ? 'bg-critical/20 border-critical/40'
      : threatLevel.level === 3
      ? 'bg-warning/20 border-warning/40'
      : 'bg-primary/20 border-primary/40';

  const satIndicatorColor =
    ['ONLINE', 'CONNECTED'].includes(satelliteStream.status)
      ? 'bg-success'
      : satelliteStream.status === 'DEGRADED'
      ? 'bg-warning'
      : 'bg-critical';

  return (
    <header className="fixed top-0 left-0 right-0 h-[48px] bg-nav-primary z-50 flex items-center px-4 border-b border-white/10">
      {/* Logo & Brand */}
      <div className="flex items-center gap-2.5 mr-6 flex-shrink-0">
        <SentinelAidLogo size={30} />
        <div className="leading-tight">
          <div className="text-white text-[13px] font-bold tracking-wide">SentinelAid AI</div>
          <div className="text-slate-400 text-[10px] uppercase tracking-wider">DISASTER COMMAND</div>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-slate-400 text-[12px] mr-4">
        <span className="hover:text-white cursor-pointer">🏠</span>
        <span>/</span>
        <span className="text-slate-300 hover:text-white cursor-pointer">Active Operation</span>
        <span>/</span>
        <span className="text-slate-300 hover:text-white cursor-pointer">Intelligence Feed</span>
      </div>

      {/* Active Disaster / Operation Selector Dropdown */}
      <div className="relative mr-4" ref={dropdownRef}>
        <div
          onClick={() => setShowOpDropdown(!showOpDropdown)}
          className="flex items-center gap-2 bg-white/5 border border-white/10 rounded px-3 py-1 cursor-pointer hover:bg-white/10 transition"
        >
          <span className="text-critical text-[10px] font-bold">[ACTIVE CRITICAL]</span>
          <span className="text-white text-[12px] font-medium max-w-[260px] truncate">{activeDisasterContext}</span>
          <ChevronDown size={12} className={`text-slate-400 transition-transform ${showOpDropdown ? 'rotate-180' : ''}`} />
        </div>

        {showOpDropdown && (
          <div className="absolute top-full left-0 mt-1 w-[320px] bg-nav-primary border border-white/15 rounded-md shadow-xl z-50 overflow-hidden py-1 animate-fade-in">
            <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-white/10">
              Select Active Operation
            </div>
            {operations.map((op) => {
              const isSelected = op.id === activeOperationId;
              return (
                <div
                  key={op.id}
                  onClick={() => handleSelectOperation(op)}
                  className={`px-3 py-2 flex items-center justify-between cursor-pointer text-[12px] transition ${
                    isSelected ? 'bg-primary/20 text-white font-medium' : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-semibold truncate">{op.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{op.region} • ID: {op.id}</div>
                  </div>
                  {isSelected && <Check size={14} className="text-primary flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded px-3 py-1 flex-1 max-w-[280px] mr-4">
        <Search size={14} className="text-slate-400" />
        <input
          type="text"
          placeholder="Search coords, zones, incid"
          className="bg-transparent text-slate-300 text-[12px] outline-none w-full placeholder:text-slate-500"
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Threat Level */}
      <div className="flex items-center gap-2 mr-4">
        <div className={`flex items-center gap-1.5 border rounded px-2.5 py-1 ${threatBg}`}>
          <span className={`w-2 h-2 rounded-full ${threatLevel.level >= 4 ? 'bg-critical animate-pulse-critical' : 'bg-warning'}`} />
          <span className={`text-[10px] font-bold uppercase tracking-wider ${threatColor}`}>THREAT LEVEL:</span>
          <span className={`text-[10px] font-bold ${threatColor}`}>
            {threatLevel.label} (LEVEL {threatLevel.level})
          </span>
        </div>
      </div>

      {/* Satellite Status */}
      <div className="flex items-center gap-1.5 text-slate-300 text-[11px] mr-3 bg-white/5 border border-white/10 rounded px-2.5 py-1">
        <span className="text-[10px] font-medium">Satellite Stream:</span>
        <span className="text-primary-light font-bold">{satelliteStream.label || satelliteStream.status || 'Not checked'}</span>
        <span className={`w-1.5 h-1.5 rounded-full ${satIndicatorColor}`} />
      </div>

      {/* Backend API Connection Indicator */}
      <div className="mr-3">
        <ApiStatusIndicator variant="dark" />
      </div>

      {/* Notifications */}
      <button className="relative p-2 text-slate-400 hover:text-white transition-colors mr-2">
        <Bell size={18} />
        {notifications > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-critical text-white text-[9px] font-bold flex items-center justify-center">
            {notifications}
          </span>
        )}
      </button>

      {/* Fullscreen */}
      <button
        onClick={() => {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
          } else {
            document.exitFullscreen();
          }
        }}
        className="p-2 text-slate-400 hover:text-white transition-colors"
      >
        <Maximize2 size={16} />
      </button>
    </header>
  );
}
