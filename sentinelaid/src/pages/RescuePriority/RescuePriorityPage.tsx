import { useState, useEffect } from 'react';
import { 
  ShieldAlert, Download, Zap, AlertTriangle, Users, Clock, 
  MapPin, Radio, CheckCircle, Navigation, ExternalLink, RefreshCw, Send, ArrowRight, Sliders
} from 'lucide-react';
import { rescueService } from '../../services/api';
import { useAppStore } from '../../store/appStore';
import type { RescueZone } from '../../types';

export const RescuePriorityPage = () => {
  const { activeOperationId, activeDisasterContext } = useAppStore();
  const currentDisasterId = activeOperationId || 'evt-remal-001';

  const [filterTier, setFilterTier] = useState<'ALL' | 'P1' | 'P2'>('ALL');
  const [zones, setZones] = useState<RescueZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<RescueZone | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [assignedStatus, setAssignedStatus] = useState<Record<string, string>>({});
  const [notification, setNotification] = useState<string | null>(null);

  // Weights for priority algorithm
  const [popWeight, setPopWeight] = useState(0.3);
  const [damageWeight, setDamageWeight] = useState(0.4);
  const [waterWeight, setWaterWeight] = useState(0.2);
  const [cutoffWeight, setCutoffWeight] = useState(0.1);

  const fetchPriorities = async () => {
    setLoading(true);
    try {
      const data = await rescueService.getPriorities(currentDisasterId);
      if (data && Array.isArray(data) && data.length > 0) {
        setZones(data);
        setSelectedZone(data[0]);
      } else {
        setZones([]);
        setSelectedZone(null);
      }
    } catch (err) {
      console.error('Failed to fetch priorities:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const data = await rescueService.calculatePriorities({
        disaster_id: currentDisasterId,
        population_weight: popWeight,
        damage_weight: damageWeight,
        water_surge_weight: waterWeight,
        cutoff_weight: cutoffWeight,
      });
      if (data && Array.isArray(data)) {
        setZones(data);
        if (data.length > 0) setSelectedZone(data[0]);
      }
      setNotification('Prioritization matrix re-calculated and re-ranked using live weights.');
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error('Calculation error:', err);
    } finally {
      setRecalculating(false);
    }
  };

  useEffect(() => {
    fetchPriorities();
  }, [currentDisasterId]);

  const filteredZones = zones.filter(z => {
    if (filterTier === 'ALL') return true;
    if (filterTier === 'P1') return z.priority === 'P1';
    if (filterTier === 'P2') return z.priority === 'P2';
    return true;
  });

  const handleAssignUnit = (rank: string, unitName: string = 'RT-02') => {
    setAssignedStatus(prev => ({ ...prev, [rank]: `${unitName} Assigned (Immediate)` }));
    setNotification(`Dispatched ${unitName} to ${rank}`);
    setTimeout(() => setNotification(null), 4000);
  };

  // Dynamic Metrics
  const p1Zones = zones.filter(z => z.priority === 'P1');
  const p2Zones = zones.filter(z => z.priority === 'P2');
  const totalCivilians = zones.reduce((acc, z) => acc + (z.populationAtRisk || 0), 0);
  const p1Civilians = p1Zones.reduce((acc, z) => acc + (z.populationAtRisk || 0), 0);
  const p2Civilians = p2Zones.reduce((acc, z) => acc + (z.populationAtRisk || 0), 0);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500/50 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-semibold">{notification}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-500/10 text-red-600 rounded-xl border border-red-500/20">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Rescue Prioritization & Life-Safety Triage Matrix
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                  LIVE DATABASE MATRIX
                </span>
              </div>
              <p className="text-sm text-slate-600">
                Theater: <strong className="text-slate-800">{activeDisasterContext || currentDisasterId}</strong> &bull; Incident triage engine feeding immediate dispatch vectors to field SAR units.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={fetchPriorities}
              className="flex items-center gap-2 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh Triage
            </button>
            <button 
              onClick={handleRecalculate}
              disabled={recalculating}
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg transition shadow-sm"
            >
              <Zap className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
              Re-Calculate Prioritization
            </button>
          </div>
        </div>

        {/* Algorithm Telemetry Banner */}
        <div className="mt-5 p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5 font-semibold text-slate-800">
              <Sliders className="w-3.5 h-3.5 text-purple-600" />
              Triage Weight Formulation:
            </span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              Structural Damage: <strong>{Math.round(damageWeight * 100)}%</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-sky-500"></span>
              Water Surge: <strong>{Math.round(waterWeight * 100)}%</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              Vulnerable Pop: <strong>{Math.round(popWeight * 100)}%</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Cutoff Index: <strong>{Math.round(cutoffWeight * 100)}%</strong>
            </span>
          </div>
          <span className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            Live Database Triage Sync
          </span>
        </div>
      </div>

      {/* 3 Priority Tier Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Tier 1 */}
        <div className="bg-white border-l-4 border-l-red-500 border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-red-600 tracking-wider uppercase">CRITICAL PRIORITY</span>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 rounded">P1 TIER</span>
          </div>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">{p1Zones.length}</span>
            <span className="text-sm font-semibold text-slate-600">Immediate Extraction Sectors</span>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
            <div>
              <div className="text-slate-500 uppercase tracking-wider text-[10px]">CIVILIANS AT RISK</div>
              <div className="text-base font-bold text-red-600 font-mono mt-0.5">{p1Civilians.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-slate-500 uppercase tracking-wider text-[10px]">DISPATCH PROTOCOL</div>
              <div className="text-xs font-semibold text-slate-800 mt-0.5">Amphibious / Helo Winch</div>
            </div>
          </div>
        </div>

        {/* Tier 2 */}
        <div className="bg-white border-l-4 border-l-amber-500 border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-600 tracking-wider uppercase">HIGH PRIORITY</span>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded">P2 TIER</span>
          </div>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">{p2Zones.length}</span>
            <span className="text-sm font-semibold text-slate-600">Staged Monitoring Sectors</span>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
            <div>
              <div className="text-slate-500 uppercase tracking-wider text-[10px]">POPULATION MONITORING</div>
              <div className="text-base font-bold text-amber-600 font-mono mt-0.5">{p2Civilians.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-slate-500 uppercase tracking-wider text-[10px]">CORRIDOR STATUS</div>
              <div className="text-xs font-semibold text-slate-800 mt-0.5">Secondary Access Open</div>
            </div>
          </div>
        </div>

        {/* Total Overview */}
        <div className="bg-white border-l-4 border-l-sky-500 border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-sky-600 tracking-wider uppercase">TOTAL CASUALTY SCOPE</span>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 rounded">ALL TIERS</span>
          </div>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">{zones.length}</span>
            <span className="text-sm font-semibold text-slate-600">Total Scored Zones</span>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
            <div>
              <div className="text-slate-500 uppercase tracking-wider text-[10px]">TOTAL SOULS AT RISK</div>
              <div className="text-base font-bold text-slate-900 font-mono mt-0.5">{totalCivilians.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-slate-500 uppercase tracking-wider text-[10px]">RESPONSE RATE</div>
              <div className="text-xs font-semibold text-emerald-600 mt-0.5">Active SAR Grid</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Priority Zone Ranking List & Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Triage List (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filter Tier:</span>
              {(['ALL', 'P1', 'P2'] as const).map(tier => (
                <button
                  key={tier}
                  onClick={() => setFilterTier(tier)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    filterTier === tier 
                      ? 'bg-slate-900 text-white' 
                      : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {tier === 'ALL' ? `All (${zones.length})` : tier === 'P1' ? `P1 (${p1Zones.length})` : `P2 (${p2Zones.length})`}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-sky-600 mb-3" />
              <p className="text-sm font-medium">Fetching real-time zone priorities from database...</p>
            </div>
          ) : filteredZones.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No triage zones requiring dispatch</h3>
              <p className="text-xs text-slate-500 mt-1">Select an active operational theater from Disaster Events to load priority zones.</p>
            </div>
          ) : (
            filteredZones.map(zone => {
              const isSelected = selectedZone?.rank === zone.rank;
              const isP1 = zone.priority === 'P1';
              const assigned = assignedStatus[zone.rank] || zone.assignedUnit;

              return (
                <div
                  key={zone.rank}
                  onClick={() => setSelectedZone(zone)}
                  className={`bg-white border rounded-xl p-5 shadow-sm cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-sky-500 ring-2 ring-sky-300 shadow-md' 
                      : 'border-slate-200 hover:border-slate-300 hover:shadow'
                  } border-l-4 ${isP1 ? 'border-l-red-500' : 'border-l-amber-500'}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                        isP1 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {zone.rank}
                      </span>
                      <h2 className="text-base font-bold text-slate-900">{zone.zone}</h2>
                    </div>
                    <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
                      <MapPin size={12} />
                      {zone.gridCoords}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 mb-3">
                    {zone.structuralDamage} &bull; {zone.cutoffDetail}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">POPULATION</span>
                      <span className="font-bold text-slate-800 font-mono">{zone.populationAtRisk} souls</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">CUTOFF STATUS</span>
                      <span className="font-bold text-red-600 font-mono">{zone.cutoffLevel}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-400 block uppercase">ASSIGNED UNIT</span>
                      <span className="font-bold text-sky-700 truncate block">{assigned}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Zone Detailed Dossier (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {selectedZone ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5 sticky top-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-red-100 text-red-800 font-mono font-bold text-xs rounded">
                      {selectedZone.rank}
                    </span>
                    <span className="text-xs font-mono text-slate-500">{selectedZone.gridCoords}</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedZone.zone}</h3>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                  selectedZone.priority === 'P1' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
                }`}>
                  {selectedZone.priority} PRIORITY
                </span>
              </div>

              {/* Triage Metrics Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">POPULATION AT RISK</span>
                  <span className="text-lg font-bold text-slate-900 font-mono">{selectedZone.populationAtRisk}</span>
                  <span className="text-[11px] text-slate-500 block">{selectedZone.populationDetail}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">ACCESS RESTRICTION</span>
                  <span className="text-lg font-bold text-red-600 font-mono">{selectedZone.cutoffLevel}</span>
                  <span className="text-[11px] text-slate-500 block">{selectedZone.cutoffDetail}</span>
                </div>
              </div>

              {/* Structural Integrity & Damage */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Damage & Structural Failure:
                </span>
                <div className="p-3 bg-red-50/70 border border-red-200 rounded-lg text-xs text-red-950">
                  {selectedZone.structuralDamage}
                </div>
              </div>

              {/* Recommended Response */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Recommended Tactical Response:
                </span>
                <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-lg text-xs text-sky-950 font-medium">
                  {selectedZone.recommendedResponse}
                </div>
              </div>

              {/* Field Unit Assignment */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Deployment Status:</span>
                  <span className="font-mono font-bold text-sky-700">
                    {assignedStatus[selectedZone.rank] || selectedZone.assignedUnit}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleAssignUnit(selectedZone.rank, 'RT-02 (Amphibious B-14)')}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Send size={14} />
                    Dispatch RT-02
                  </button>
                  <button
                    onClick={() => handleAssignUnit(selectedZone.rank, 'Air SAR-01 Helo')}
                    className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Navigation size={14} />
                    Dispatch Air SAR
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
              <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium">Select a zone on the left to inspect triage dossier & dispatch units.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RescuePriorityPage;
