import { useState, useEffect } from 'react';
import { 
  ShieldAlert, Download, Zap, AlertTriangle, Users, Clock, 
  MapPin, Radio, CheckCircle, Navigation, ExternalLink, RefreshCw, Send, ArrowRight
} from 'lucide-react';
import { rescueService } from '../../services/api';
import { mockRescueZones } from '../../data/mockData';
import type { RescueZone } from '../../types';

export const RescuePriorityPage = () => {
  const [filterTier, setFilterTier] = useState<'ALL' | 'P1' | 'P2'>('P1');
  const [zones, setZones] = useState<RescueZone[]>(mockRescueZones);
  const [selectedZone, setSelectedZone] = useState<RescueZone | null>(mockRescueZones[0]);
  const [assignedStatus, setAssignedStatus] = useState<Record<string, string>>({});
  const [notification, setNotification] = useState<string | null>(null);

  const fetchPriorities = async () => {
    try {
      const data = await rescueService.getPriorities('evt-remal-001');
      if (data && data.length) {
        setZones(data);
        setSelectedZone(data[0]);
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    fetchPriorities();
  }, []);

  const filteredZones = zones.filter(z => {
    if (filterTier === 'ALL') return true;
    if (filterTier === 'P1') return z.priority === 'P1';
    if (filterTier === 'P2') return z.priority === 'P2';
    return true;
  });

  const handleAssignUnit = (rank: string) => {
    setAssignedStatus(prev => ({ ...prev, [rank]: 'RT-02 Assigned (Immediate)' }));
    setNotification(`Dispatched Unit to ${rank}`);
    setTimeout(() => setNotification(null), 4000);
  };

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
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-red-100 text-red-700 border border-red-200">
                  LIVE EXECUTION MODE
                </span>
              </div>
              <p className="text-sm text-slate-600">
                Synchronized incident triage engine feeding immediate dispatch vectors to aerial, marine, and tracked SAR units.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-medium rounded-lg transition-colors shadow-sm">
              <Download className="w-4 h-4" />
              Export Triage Manifest (PDF/CSV)
            </button>
            <button 
              onClick={() => {
                setNotification("Automated Rescue Deployment Plan generated & dispatched to tactical net!");
                setTimeout(() => setNotification(null), 4000);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              <Zap className="w-4 h-4" />
              Generate Automated Rescue Deployment Plan
            </button>
          </div>
        </div>

        {/* Algorithm Telemetry Banner */}
        <div className="mt-5 p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5 font-semibold text-slate-800">
              <Zap className="w-3.5 h-3.5 text-purple-600" />
              AI Priority Algorithm v3.4 Active
            </span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              Structural Collapse: <strong>40%</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-sky-500"></span>
              Water Surge: <strong>30%</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              Vulnerable Density: <strong>20%</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Road Cutoff Index: <strong>10%</strong>
            </span>
          </div>
          <span className="flex items-center gap-1.5 text-slate-500 font-mono">
            <RefreshCw className="w-3 h-3 text-emerald-600 animate-spin" />
            Re-scored 14s ago via Sentinel-2C SAR
          </span>
        </div>
      </div>

      {/* 3 Priority Tier Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Tier 1 */}
        <div className="bg-white border-l-4 border-l-red-500 border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-red-600 tracking-wider uppercase">HIGH PRIORITY (CRITICAL)</span>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 rounded">P1 TIER</span>
          </div>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">7</span>
            <span className="text-sm font-semibold text-slate-600">Severe Isolation Zones</span>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
            <div>
              <div className="text-slate-500 uppercase tracking-wider text-[10px]">CIVILIANS AT RISK</div>
              <div className="text-base font-bold text-red-600 font-mono mt-0.5">4,850</div>
            </div>
            <div>
              <div className="text-slate-500 uppercase tracking-wider text-[10px]">DROP EXTRACTION</div>
              <div className="text-base font-bold text-slate-800 font-mono mt-0.5">18 Immediate</div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50/70 px-2.5 py-1.5 rounded-lg border border-red-100">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Survivability window closing in 90 minutes</span>
          </div>
        </div>

        {/* Tier 2 */}
        <div className="bg-white border-l-4 border-l-sky-500 border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-sky-600 tracking-wider uppercase">MEDIUM PRIORITY (ELEVATED)</span>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 rounded">P2 TIER</span>
          </div>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">12</span>
            <span className="text-sm font-semibold text-slate-600">Restricted Sectors</span>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
            <div>
              <div className="text-slate-500 uppercase tracking-wider text-[10px]">CIVILIANS IMPACTED</div>
              <div className="text-base font-bold text-slate-800 font-mono mt-0.5">8,200</div>
            </div>
            <div>
              <div className="text-slate-500 uppercase tracking-wider text-[10px]">EVACUATION HORIZON</div>
              <div className="text-base font-bold text-slate-800 font-mono mt-0.5">Within 6–12h</div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
            <Clock className="w-3.5 h-3.5 flex-shrink-0 text-slate-500" />
            <span>Secondary levee overflow projected at 19:40</span>
          </div>
        </div>

        {/* Tier 3 */}
        <div className="bg-white border-l-4 border-l-emerald-500 border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-600 tracking-wider uppercase">LOW / STABLE PRIORITY</span>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">P3 TIER</span>
          </div>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">24</span>
            <span className="text-sm font-semibold text-slate-600">Secured & Sheltered Areas</span>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
            <div>
              <div className="text-slate-500 uppercase tracking-wider text-[10px]">CIVILIANS SHELTERED</div>
              <div className="text-base font-bold text-slate-800 font-mono mt-0.5">14,500</div>
            </div>
            <div>
              <div className="text-slate-500 uppercase tracking-wider text-[10px]">OPERATIONAL MANDATE</div>
              <div className="text-base font-bold text-emerald-700 font-mono mt-0.5">Supplies & Patrol</div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50/70 px-2.5 py-1.5 rounded-lg border border-emerald-100">
            <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 text-emerald-600" />
            <span>Rations safe; potable water distributed for 72 hrs</span>
          </div>
        </div>
      </div>

      {/* Geospatial Radar / Heatmap View */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl text-white">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-red-400 animate-pulse" />
            <h2 className="text-sm font-semibold text-slate-200">
              Priority Geospatial Heatmap & Cluster View
            </h2>
            <span className="text-xs text-slate-400">
              Multi-band radar overlay with life-safety threat clustering
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="px-2 py-1 bg-slate-800 rounded border border-slate-700 font-mono">CENTER: 21°48'33"N 89°12'19"E</span>
            <span className="px-2 py-1 bg-slate-800 rounded border border-slate-700 font-mono">ALT: 1,400m SAR GRID</span>
          </div>
        </div>

        {/* Interactive Tactical Heat Canvas */}
        <div className="relative h-[340px] bg-slate-950 flex items-center justify-center overflow-hidden">
          {/* Concentric radar range rings */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[580px] h-[580px] rounded-full border border-sky-500/10"></div>
            <div className="w-[420px] h-[420px] rounded-full border border-sky-500/15"></div>
            <div className="w-[260px] h-[260px] rounded-full border border-sky-500/20"></div>
            <div className="w-[120px] h-[120px] rounded-full border border-sky-500/25"></div>
            <div className="absolute w-full h-[1px] bg-sky-500/10"></div>
            <div className="absolute h-full w-[1px] bg-sky-500/10"></div>
          </div>

          {/* Visual Heat Gradients */}
          <div className="absolute top-[28%] left-[45%] w-48 h-48 bg-red-600/20 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute top-[48%] left-[62%] w-56 h-56 bg-red-600/15 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-[20%] left-[36%] w-40 h-40 bg-red-600/25 rounded-full blur-3xl pointer-events-none"></div>

          {/* Zone Pin 1 */}
          <div 
            onClick={() => setSelectedZone(mockRescueZones[0])}
            className="absolute top-[42%] left-[46%] transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-20"
          >
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-4 h-4 bg-red-500 rounded-full animate-ping absolute inset-0"></div>
                <div className="w-4 h-4 bg-red-500 border-2 border-white rounded-full relative z-10 shadow-lg shadow-red-500/50"></div>
              </div>
              <div className="bg-slate-900/90 border border-red-500/80 px-2.5 py-1 rounded text-xs backdrop-blur font-mono text-white shadow-xl flex flex-col">
                <span className="font-bold text-red-400">P1-01 Zone 4B (1,240 Souls)</span>
                <span className="text-[10px] text-amber-300">100% ROAD CUTOFF • +1.6m SURGE</span>
              </div>
            </div>
          </div>

          {/* Zone Pin 2 */}
          <div 
            onClick={() => setSelectedZone(mockRescueZones[1])}
            className="absolute top-[24%] left-[68%] transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-20"
          >
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-4 h-4 bg-red-500 rounded-full animate-ping absolute inset-0"></div>
                <div className="w-4 h-4 bg-red-500 border-2 border-white rounded-full relative z-10 shadow-lg shadow-red-500/50"></div>
              </div>
              <div className="bg-slate-900/90 border border-red-500/80 px-2.5 py-1 rounded text-xs backdrop-blur font-mono text-white shadow-xl flex flex-col">
                <span className="font-bold text-red-400">P1-02 Sector 7 Central (920 Souls)</span>
                <span className="text-[10px] text-amber-300">LEVEES BREACHED • ROOFTOP TRAPPED</span>
              </div>
            </div>
          </div>

          {/* Zone Pin 3 */}
          <div 
            onClick={() => setSelectedZone(mockRescueZones[2])}
            className="absolute bottom-[18%] left-[38%] transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-20"
          >
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-3.5 h-3.5 bg-red-500 rounded-full animate-ping absolute inset-0"></div>
                <div className="w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full relative z-10 shadow-lg shadow-red-500/50"></div>
              </div>
              <div className="bg-slate-900/90 border border-red-500/80 px-2.5 py-1 rounded text-xs backdrop-blur font-mono text-white shadow-xl flex flex-col">
                <span className="font-bold text-red-400">P1-03 Old Town Island (860 Souls)</span>
                <span className="text-[10px] text-amber-300">ISOLATED • BOAT ONLY</span>
              </div>
            </div>
          </div>

          {/* Map Layer Legend in Top-Left */}
          <div className="absolute top-4 left-4 bg-slate-900/80 border border-slate-700/80 rounded-lg p-3 backdrop-blur text-xs space-y-1.5">
            <div className="font-bold text-slate-300 uppercase tracking-wider text-[10px] mb-1">HEAT INDEX LAYERS</div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              <span>Critical Submersion (&gt;1.5m)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
              <span>Active Evacuation Route</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
              <span>High Ridge Assembly Zone</span>
            </div>
          </div>
        </div>

        {/* Footer info bar */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>Optical + SAR Dual Pass Co-registered: <strong className="text-white">98.2% Confidence</strong></span>
          </div>
          <button 
            onClick={() => {
              setNotification("Recalculating centroids via latest SAR pass...");
              setTimeout(() => setNotification(null), 2500);
            }}
            className="text-sky-400 hover:text-sky-300 font-medium transition-colors"
          >
            RECALCULATE CENTROIDS
          </button>
        </div>
      </div>

      {/* Priority Triage Action Queue & Decision Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-red-500 font-extrabold text-base">!</span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Priority Triage Action Queue & Decision Table
              </h2>
              <p className="text-xs text-slate-500">
                Ranked real-time by multi-variable life-threat matrix
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">FILTER TIER:</span>
            <button 
              onClick={() => setFilterTier('P1')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                filterTier === 'P1' 
                  ? 'bg-red-600 text-white shadow-sm' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              P1 Critical (7)
            </button>
            <button 
              onClick={() => setFilterTier('P2')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                filterTier === 'P2' 
                  ? 'bg-sky-600 text-white shadow-sm' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              P2 (12)
            </button>
            <button 
              onClick={() => setFilterTier('ALL')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                filterTier === 'ALL' 
                  ? 'bg-slate-800 text-white shadow-sm' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All (43)
            </button>
          </div>
        </div>

        {/* Dense Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider">
                <th className="py-3 px-4">RANK</th>
                <th className="py-3 px-4">ZONE & GRID COORDS</th>
                <th className="py-3 px-4">STRUCTURAL DAMAGE</th>
                <th className="py-3 px-4">POPULATION AT RISK</th>
                <th className="py-3 px-4">CUTOFF & INACCESSIBILITY</th>
                <th className="py-3 px-4">RECOMMENDED RESPONSE</th>
                <th className="py-3 px-4">ASSIGNED SAR UNIT</th>
                <th className="py-3 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredZones.map((zone) => {
                const assigned = assignedStatus[zone.rank] || zone.assignedUnit;
                const isUnassigned = assigned === 'UNASSIGNED';

                return (
                  <tr 
                    key={zone.rank} 
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-1 bg-red-600 text-white font-mono font-bold text-xs rounded shadow-sm">
                        {zone.rank}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      <div>{zone.zone}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{zone.gridCoords}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-red-600 flex items-center gap-1">
                        <span>{zone.structuralDamage.split('-')[0]}</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {zone.structuralDamage.split('-')[1] || ''}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{zone.populationAtRisk} people</div>
                      <div className="text-[11px] text-red-600 font-medium">{zone.populationDetail}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="inline-block px-1.5 py-0.5 rounded text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                        {zone.cutoffLevel}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{zone.cutoffDetail}</div>
                    </td>
                    <td className="py-3.5 px-4 text-sky-700 font-medium">
                      <div>{zone.recommendedResponse.split('-')[0]}</div>
                      <div className="text-[11px] text-slate-500">{zone.recommendedResponse.split('-')[1] || ''}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {isUnassigned ? (
                        <span className="px-2.5 py-1 bg-red-700 text-white text-[11px] font-mono font-bold rounded">
                          UNASSIGNED
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-sky-900 text-white text-[11px] font-mono font-semibold rounded flex items-center gap-1.5 w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          {assigned}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {isUnassigned ? (
                        <button 
                          onClick={() => handleAssignUnit(zone.rank)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded transition-colors shadow-sm"
                        >
                          Dispatch
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleAssignUnit(zone.rank)}
                          className="px-2.5 py-1 border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded transition-colors"
                        >
                          Reassign
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Displaying <strong>{filteredZones.length} of 7 Critical Tier-1 Rescue Zones</strong>. Total live critical count: <strong className="text-red-600">4,850 lives</strong>.
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                setNotification("All reserve assets batched and assigned to P1 tiers!");
                setTimeout(() => setNotification(null), 3500);
              }}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded transition-colors"
            >
              BATCH ASSIGN RESERVE ASSETS
            </button>
            <button 
              onClick={() => {
                setNotification("Opened AI scoring weights configuration dialog.");
                setTimeout(() => setNotification(null), 3000);
              }}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded transition-colors"
            >
              Override AI Scoring Weights
            </button>
          </div>
        </div>
      </div>

      {/* Automated Resource Allocation Recommendations */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg border border-purple-100">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Automated Resource Allocation Recommendations
              </h2>
              <p className="text-xs text-slate-500">
                Synthesized by AI Decision Engine v3.4 comparing hydraulic surge trajectories against asset capabilities
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Continuous Optimization Engine Engaged
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1 */}
          <div className="border border-slate-200 rounded-xl p-4.5 bg-slate-50/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded">
                  TIME-CRITICAL (42M LEFT)
                </span>
                <span className="text-xs font-mono font-semibold text-slate-600">Confidence 96.4%</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                Deploy Boat Fleet 2 to Zone 4B before projected 18:00 river surge
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Hydrodynamic telemetry indicates high-tide surge (+1.85m) will breach embankment barrier at 17:58, cutting off existing rooftop access routes for 1,240 trapped civilians.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">Asset: 6 Jet-RIBs + 2 Hovercraft</span>
              <button 
                onClick={() => {
                  setNotification("Dispatched Boat Fleet 2 to Zone 4B!");
                  setTimeout(() => setNotification(null), 3500);
                }}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded transition-colors shadow-sm"
              >
                Approve & Dispatch
              </button>
            </div>
          </div>

          {/* Card 2 */}
          <div className="border border-slate-200 rounded-xl p-4.5 bg-slate-50/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 bg-sky-100 text-sky-700 text-[10px] font-bold rounded">
                  TACTICAL RELOCATION
                </span>
                <span className="text-xs font-mono font-semibold text-slate-600">Confidence 91.8%</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                Relocate field hospital from low-lying Sector 3 to High School Ridge
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Runoff simulation predicts 0.8m sheet flooding in Sector 3 staging ground within 3 hours. Moving 1.4km uphill ensures uninterrupted triage for 48 critically injured triaged patients.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">Involved: Unit M-3 & 4 Ambulances</span>
              <button 
                onClick={() => {
                  setNotification("Authorized Field Hospital Relocation to High School Ridge!");
                  setTimeout(() => setNotification(null), 3500);
                }}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded transition-colors shadow-sm"
              >
                Authorize Move
              </button>
            </div>
          </div>

          {/* Card 3 */}
          <div className="border border-slate-200 rounded-xl p-4.5 bg-slate-50/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded">
                  INTEL GAP CLOSURE
                </span>
                <span className="text-xs font-mono font-semibold text-slate-600">Confidence 94.2%</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                Request additional aerial reconnaissance over isolated Island Sector 9
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Cell towers dark since 14:10. Synthetic Aperture Radar detects massive sediment displacement near coastal school shelter. Drone UAV thermal scan required for casualty verification.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">Tasking: ScanEagle UAV Group 4</span>
              <button 
                onClick={() => {
                  setNotification("ScanEagle UAV Group 4 retasked to Island Sector 9!");
                  setTimeout(() => setNotification(null), 3500);
                }}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded transition-colors shadow-sm"
              >
                Retask Drone
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
