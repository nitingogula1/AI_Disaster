import React, { useState, useEffect } from 'react';
import { 
  Users, AlertTriangle, Anchor, Crosshair, CheckCircle, 
  Trash2, Edit3, X, Filter, Navigation, ShieldCheck, Eye, RefreshCw
} from 'lucide-react';
import { droneService } from '../../services/api';

export type MarkingMode = 'SURVIVOR_LOCK' | 'ROAD_CUTOFF' | 'LZ_LOCK' | null;

export interface DroneEventItem {
  id: string;
  session_id: string;
  event_type: 'SURVIVOR_LOCK' | 'ROAD_CUTOFF' | 'LZ_LOCK' | 'AREA_SEARCHED' | 'TEAM_DISPATCHED' | 'OPERATOR_NOTE';
  place_name?: string;
  lat?: number;
  lng?: number;
  payload?: any;
  confidence?: number | null;
  provenance: string;
  is_verified: boolean;
  verified_by?: string;
  verified_at?: string;
  is_deleted: boolean;
  created_at?: string;
  updated_at?: string;
}

interface DroneMarkingToolsProps {
  sessionId: string | null;
  crosshairCoords: [number, number];
  activeMarkingMode: MarkingMode;
  onSetMarkingMode: (mode: MarkingMode) => void;
  onFlyTo: (coords: [number, number]) => void;
  onEventCreated?: (event: DroneEventItem) => void;
}

export const DroneMarkingTools: React.FC<DroneMarkingToolsProps> = ({
  sessionId,
  crosshairCoords,
  activeMarkingMode,
  onSetMarkingMode,
  onFlyTo,
  onEventCreated
}) => {
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'SURVIVOR_LOCK' | 'ROAD_CUTOFF' | 'LZ_LOCK'>('SURVIVOR_LOCK');
  const [showFindingsDrawer, setShowFindingsDrawer] = useState(false);
  const [findings, setFindings] = useState<DroneEventItem[]>([]);
  const [findingsFilter, setFindingsFilter] = useState<'ALL' | 'SURVIVOR_LOCK' | 'ROAD_CUTOFF' | 'LZ_LOCK'>('ALL');
  const [loadingFindings, setLoadingFindings] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Edit / Delete State
  const [editingEvent, setEditingEvent] = useState<DroneEventItem | null>(null);
  const [editReason, setEditReason] = useState('');
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [deletionReason, setDeletionReason] = useState('');

  // Form Fields - Common
  const [formCoords, setFormCoords] = useState<{ lat: number; lng: number }>({
    lat: crosshairCoords[0],
    lng: crosshairCoords[1]
  });
  const [placeName, setPlaceName] = useState('');
  const [observationTime, setObservationTime] = useState(new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState('');

  // Form Fields - SURVIVOR_LOCK
  const [headcountMode, setHeadcountMode] = useState<'EXACT' | 'RANGE'>('EXACT');
  const [peopleCount, setPeopleCount] = useState<number>(5);
  const [peopleMin, setPeopleMin] = useState<number>(3);
  const [peopleMax, setPeopleMax] = useState<number>(8);
  const [vulnerableCategories, setVulnerableCategories] = useState<string[]>(['children']);
  const [vulnerableCount, setVulnerableCount] = useState<number | undefined>(2);
  const [structureState, setStructureState] = useState<'STABLE' | 'DAMAGED' | 'COLLAPSING' | 'UNKNOWN'>('DAMAGED');
  const [waterSituation, setWaterSituation] = useState<'RISING' | 'STABLE' | 'FALLING' | 'UNKNOWN'>('RISING');
  const [waterDepthM, setWaterDepthM] = useState<string>('1.2');
  const [canSelfEvacuate, setCanSelfEvacuate] = useState<'YES' | 'NO' | 'UNKNOWN'>('NO');

  // Form Fields - ROAD_CUTOFF
  const [cutoffType, setCutoffType] = useState<'BRIDGE_DESTROYED' | 'ROAD_SUBMERGED' | 'DEBRIS' | 'LANDSLIDE' | 'OTHER'>('ROAD_SUBMERGED');
  const [severity, setSeverity] = useState<'BLOCKED' | 'PASSABLE_WITH_LIMITS'>('BLOCKED');
  const [roadName, setRoadName] = useState('Coastal Causeway Road');
  const [vehicleLimits, setVehicleLimits] = useState('Heavy Amphibious Only');
  const [cutoffDepthM, setCutoffDepthM] = useState('1.5');

  // Form Fields - LZ_LOCK
  const [lzSize, setLzSize] = useState('30x30');
  const [lzSurface, setLzSurface] = useState('Packed Soil / Concrete Roof');
  const [lzObstacles, setLzObstacles] = useState<string[]>(['trees']);
  const [lzSlopeDeg, setLzSlopeDeg] = useState(2);
  const [lzFloodingRisk, setLzFloodingRisk] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN'>('LOW');
  const [lzSuitableFor, setLzSuitableFor] = useState<string[]>(['helicopter']);

  // Fetch Findings for current session
  const fetchFindings = async () => {
    if (!sessionId) return;
    setLoadingFindings(true);
    try {
      const res = await droneService.getDroneFindings(sessionId);
      if (res && res.data) {
        setFindings(res.data);
      }
    } catch (err) {
      console.error('Failed to load session findings:', err);
    } finally {
      setLoadingFindings(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchFindings();
    }
  }, [sessionId]);

  const handleOpenMarkModal = (type: 'SURVIVOR_LOCK' | 'ROAD_CUTOFF' | 'LZ_LOCK', customCoords?: { lat: number; lng: number }) => {
    setModalType(type);
    setFormCoords(customCoords || { lat: crosshairCoords[0], lng: crosshairCoords[1] });
    setObservationTime(new Date().toISOString().slice(0, 16));
    setEditingEvent(null);
    setShowModal(true);
  };

  const handleToggleVulnerable = (cat: string) => {
    if (vulnerableCategories.includes(cat)) {
      setVulnerableCategories(vulnerableCategories.filter(c => c !== cat));
    } else {
      setVulnerableCategories([...vulnerableCategories, cat]);
    }
  };

  const handleToggleLzObstacle = (obs: string) => {
    if (lzObstacles.includes(obs)) {
      setLzObstacles(lzObstacles.filter(o => o !== obs));
    } else {
      setLzObstacles([...lzObstacles, obs]);
    }
  };

  const handleToggleLzSuitable = (target: string) => {
    if (lzSuitableFor.includes(target)) {
      setLzSuitableFor(lzSuitableFor.filter(t => t !== target));
    } else {
      setLzSuitableFor([...lzSuitableFor, target]);
    }
  };

  const handleSubmitMark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId) {
      alert('No active drone reconnaissance session found. Please wait for session initialization.');
      return;
    }
    setSubmitting(true);

    try {
      let payload: any = {};

      if (modalType === 'SURVIVOR_LOCK') {
        payload = {
          people_count: headcountMode === 'EXACT' ? Number(peopleCount) : undefined,
          people_min: headcountMode === 'RANGE' ? Number(peopleMin) : undefined,
          people_max: headcountMode === 'RANGE' ? Number(peopleMax) : undefined,
          vulnerable_present: vulnerableCategories.length > 0 ? vulnerableCategories : ['none'],
          vulnerable_count: vulnerableCount ? Number(vulnerableCount) : undefined,
          structure_state: structureState,
          water_situation: waterSituation,
          water_depth_m: waterDepthM ? parseFloat(waterDepthM) : undefined,
          can_self_evacuate: canSelfEvacuate,
          observation_time: observationTime ? new Date(observationTime).toISOString() : new Date().toISOString(),
          notes: notes || undefined
        };
      } else if (modalType === 'ROAD_CUTOFF') {
        payload = {
          cutoff_type: cutoffType,
          severity: severity,
          geometry_type: 'POINT',
          coordinates: [formCoords.lat, formCoords.lng],
          estimated_depth_m: cutoffDepthM ? parseFloat(cutoffDepthM) : undefined,
          road_name: roadName || undefined,
          vehicle_limits: vehicleLimits || undefined,
          observation_time: observationTime ? new Date(observationTime).toISOString() : new Date().toISOString(),
          notes: notes || undefined
        };
      } else if (modalType === 'LZ_LOCK') {
        payload = {
          size_m: lzSize || undefined,
          surface: lzSurface || undefined,
          obstacles: lzObstacles.length > 0 ? lzObstacles : ['none'],
          slope_estimate_deg: lzSlopeDeg !== undefined ? Number(lzSlopeDeg) : undefined,
          flooding_risk: lzFloodingRisk,
          suitable_for: lzSuitableFor.length > 0 ? lzSuitableFor : ['helicopter'],
          observation_time: observationTime ? new Date(observationTime).toISOString() : new Date().toISOString(),
          notes: notes || undefined
        };
      }

      if (editingEvent) {
        if (!editReason || editReason.trim().length < 3) {
          alert('A mandatory edit reason (min 3 characters) is required for audit logging.');
          setSubmitting(false);
          return;
        }
        await droneService.updateDroneEvent(editingEvent.id, {
          place_name: placeName || editingEvent.place_name,
          lat: formCoords.lat,
          lng: formCoords.lng,
          payload: payload,
          edit_reason: editReason
        });
      } else {
        const createRes = await droneService.postDroneEvent(sessionId, {
          event_type: modalType,
          place_name: placeName || `${modalType.replace('_', ' ')} @ ${formCoords.lat.toFixed(4)}, ${formCoords.lng.toFixed(4)}`,
          lat: formCoords.lat,
          lng: formCoords.lng,
          payload: payload,
          confidence: null, // RULES: OPERATOR_MARKED must be null
          provenance: 'OPERATOR_MARKED'
        });
        if (createRes && createRes.data && onEventCreated) {
          onEventCreated(createRes.data);
        }
      }

      setShowModal(false);
      setEditingEvent(null);
      setEditReason('');
      onSetMarkingMode(null);
      await fetchFindings();
    } catch (err: any) {
      console.error('Error submitting drone mark:', err);
      alert(err?.response?.data?.detail?.message || err?.message || 'Failed to save operator mark');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyFinding = async (id: string) => {
    try {
      await droneService.verifyDroneEvent(id);
      await fetchFindings();
    } catch (err: any) {
      console.error('Failed to verify finding:', err);
      alert(err?.response?.data?.detail?.message || 'Verification failed');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingEventId) return;
    if (!deletionReason || deletionReason.trim().length < 3) {
      alert('Mandatory reason for soft-deletion is required.');
      return;
    }
    try {
      await droneService.deleteDroneEvent(deletingEventId, deletionReason);
      setDeletingEventId(null);
      setDeletionReason('');
      await fetchFindings();
    } catch (err: any) {
      console.error('Failed to delete finding:', err);
      alert(err?.response?.data?.detail?.message || 'Failed to delete mark');
    }
  };

  const filteredFindings = findings.filter(f => {
    if (findingsFilter === 'ALL') return true;
    return f.event_type === findingsFilter;
  });

  return (
    <>
      {/* 1. HUD MODE BUTTONS BAR */}
      <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-cyan-500/30 px-3 py-2 rounded-xl shadow-2xl">
        <span className="text-[11px] font-mono text-cyan-400 font-semibold tracking-wider uppercase border-r border-slate-700 pr-2">
          Operator Locks
        </span>

        {/* Mark Survivors Button */}
        <button
          type="button"
          onClick={() => {
            const next = activeMarkingMode === 'SURVIVOR_LOCK' ? null : 'SURVIVOR_LOCK';
            onSetMarkingMode(next);
            if (next) handleOpenMarkModal('SURVIVOR_LOCK');
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeMarkingMode === 'SURVIVOR_LOCK'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/40 ring-1 ring-rose-400'
              : 'bg-slate-800/80 hover:bg-rose-950/60 text-rose-300 border border-rose-500/30'
          }`}
          title="Mark trapped survivors at map click or crosshair position"
        >
          <Users className="w-3.5 h-3.5 text-rose-400" />
          <span>Mark Survivors</span>
        </button>

        {/* Mark Road Cutoff Button */}
        <button
          type="button"
          onClick={() => {
            const next = activeMarkingMode === 'ROAD_CUTOFF' ? null : 'ROAD_CUTOFF';
            onSetMarkingMode(next);
            if (next) handleOpenMarkModal('ROAD_CUTOFF');
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeMarkingMode === 'ROAD_CUTOFF'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/40 ring-1 ring-amber-400'
              : 'bg-slate-800/80 hover:bg-amber-950/60 text-amber-300 border border-amber-500/30'
          }`}
          title="Mark blocked road, destroyed bridge or water cutoff"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>Mark Road Cutoff</span>
        </button>

        {/* Mark Landing Zone Button */}
        <button
          type="button"
          onClick={() => {
            const next = activeMarkingMode === 'LZ_LOCK' ? null : 'LZ_LOCK';
            onSetMarkingMode(next);
            if (next) handleOpenMarkModal('LZ_LOCK');
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeMarkingMode === 'LZ_LOCK'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/40 ring-1 ring-emerald-400'
              : 'bg-slate-800/80 hover:bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
          }`}
          title="Mark safe helicopter landing zone or boat dock"
        >
          <Anchor className="w-3.5 h-3.5 text-emerald-400" />
          <span>Mark Landing Zone</span>
        </button>

        {/* Session Findings Drawer Toggle */}
        <button
          type="button"
          onClick={() => {
            setShowFindingsDrawer(!showFindingsDrawer);
            fetchFindings();
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/40 ml-1"
        >
          <Eye className="w-3.5 h-3.5 text-cyan-400" />
          <span>Findings ({findings.length})</span>
        </button>
      </div>

      {/* 2. FINDINGS LIST PANEL */}
      {showFindingsDrawer && (
        <div className="absolute right-4 top-20 z-[1000] w-96 max-h-[80vh] flex flex-col bg-slate-900/95 backdrop-blur-xl border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-right duration-200">
          <div className="p-3 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white">Recon Session Findings</h3>
              <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/30">
                {findings.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={fetchFindings}
                className="p-1 text-slate-400 hover:text-white rounded"
                title="Refresh findings"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingFindings ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => setShowFindingsDrawer(false)}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 p-2 bg-slate-950/50 border-b border-slate-800 text-[11px] overflow-x-auto">
            <button
              type="button"
              onClick={() => setFindingsFilter('ALL')}
              className={`px-2 py-0.5 rounded-full whitespace-nowrap ${findingsFilter === 'ALL' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold' : 'text-slate-400 hover:text-white'}`}
            >
              All ({findings.length})
            </button>
            <button
              type="button"
              onClick={() => setFindingsFilter('SURVIVOR_LOCK')}
              className={`px-2 py-0.5 rounded-full whitespace-nowrap ${findingsFilter === 'SURVIVOR_LOCK' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold' : 'text-slate-400 hover:text-white'}`}
            >
              Survivors ({findings.filter(f => f.event_type === 'SURVIVOR_LOCK').length})
            </button>
            <button
              type="button"
              onClick={() => setFindingsFilter('ROAD_CUTOFF')}
              className={`px-2 py-0.5 rounded-full whitespace-nowrap ${findingsFilter === 'ROAD_CUTOFF' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold' : 'text-slate-400 hover:text-white'}`}
            >
              Cutoffs ({findings.filter(f => f.event_type === 'ROAD_CUTOFF').length})
            </button>
            <button
              type="button"
              onClick={() => setFindingsFilter('LZ_LOCK')}
              className={`px-2 py-0.5 rounded-full whitespace-nowrap ${findingsFilter === 'LZ_LOCK' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold' : 'text-slate-400 hover:text-white'}`}
            >
              LZ ({findings.filter(f => f.event_type === 'LZ_LOCK').length})
            </button>
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-slate-800/40">
            {filteredFindings.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No {findingsFilter === 'ALL' ? '' : findingsFilter.toLowerCase().replace('_', ' ')} locks recorded in this session yet.
              </div>
            ) : (
              filteredFindings.map(item => {
                const isSurvivor = item.event_type === 'SURVIVOR_LOCK';
                const isCutoff = item.event_type === 'ROAD_CUTOFF';
                const isLz = item.event_type === 'LZ_LOCK';

                return (
                  <div key={item.id} className="pt-2 first:pt-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {isSurvivor && <Users className="w-4 h-4 text-rose-400 flex-shrink-0" />}
                        {isCutoff && <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                        {isLz && <Anchor className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                        <span className="text-xs font-semibold text-white">
                          {item.place_name || item.event_type.replace('_', ' ')}
                        </span>
                      </div>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold ${
                        item.is_verified 
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                      }`}>
                        {item.is_verified ? 'VERIFIED' : 'UNVERIFIED'}
                      </span>
                    </div>

                    {/* Coordinates & Provenance */}
                    <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>{item.lat?.toFixed(4)}, {item.lng?.toFixed(4)}</span>
                      <span className="text-[10px] text-slate-500">{item.provenance}</span>
                    </div>

                    {/* Specific payload details */}
                    {isSurvivor && item.payload && (
                      <div className="mt-1.5 text-xs text-slate-300 bg-slate-950/40 p-2 rounded-lg border border-slate-800">
                        <div className="flex justify-between">
                          <span>People: <strong className="text-rose-400">{item.payload.people_count ?? `${item.payload.people_min ?? '?'}-${item.payload.people_max ?? '?'}`}</strong></span>
                          <span>Structure: <strong className="text-amber-400">{item.payload.structure_state ?? 'not available'}</strong></span>
                        </div>
                        <div className="flex justify-between mt-1 text-[11px] text-slate-400">
                          <span>Water: {item.payload.water_situation || 'not available'} ({item.payload.water_depth_m ? `${item.payload.water_depth_m}m` : 'depth n/a'})</span>
                          <span>Can Evac: {item.payload.can_self_evacuate || 'not available'}</span>
                        </div>
                        {item.payload.vulnerable_present && (
                          <div className="mt-1 text-[10px] text-slate-400">
                            Vulnerable: {item.payload.vulnerable_present.join(', ')} ({item.payload.vulnerable_count ?? 'count n/a'})
                          </div>
                        )}
                      </div>
                    )}

                    {isCutoff && item.payload && (
                      <div className="mt-1.5 text-xs text-slate-300 bg-slate-950/40 p-2 rounded-lg border border-slate-800">
                        <div className="flex justify-between">
                          <span>Type: <strong className="text-amber-400">{item.payload.cutoff_type}</strong></span>
                          <span className={`font-semibold ${item.payload.severity === 'BLOCKED' ? 'text-rose-400' : 'text-amber-400'}`}>
                            {item.payload.severity}
                          </span>
                        </div>
                        {item.payload.road_name && (
                          <div className="text-[11px] text-slate-400 mt-0.5">Road: {item.payload.road_name}</div>
                        )}
                        {item.payload.estimated_depth_m && (
                          <div className="text-[11px] text-slate-400">Depth: {item.payload.estimated_depth_m}m</div>
                        )}
                      </div>
                    )}

                    {isLz && item.payload && (
                      <div className="mt-1.5 text-xs text-slate-300 bg-slate-950/40 p-2 rounded-lg border border-slate-800">
                        <div className="flex justify-between">
                          <span>Size: <strong className="text-emerald-400">{item.payload.size_m || 'not available'}</strong></span>
                          <span>Surface: <strong className="text-cyan-400">{item.payload.surface || 'not available'}</strong></span>
                        </div>
                        <div className="flex justify-between mt-1 text-[11px] text-slate-400">
                          <span>Flood Risk: {item.payload.flooding_risk}</span>
                          <span>Suitable: {(item.payload.suitable_for || []).join(', ')}</span>
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="mt-2 flex items-center justify-end gap-1.5">
                      {item.lat && item.lng && (
                        <button
                          type="button"
                          onClick={() => onFlyTo([item.lat!, item.lng!])}
                          className="flex items-center gap-1 text-[10px] font-medium bg-slate-800 hover:bg-cyan-900/60 text-cyan-300 px-2 py-1 rounded border border-slate-700"
                        >
                          <Navigation className="w-3 h-3 text-cyan-400" />
                          <span>Fly To</span>
                        </button>
                      )}

                      {!item.is_verified && (
                        <button
                          type="button"
                          onClick={() => handleVerifyFinding(item.id)}
                          className="flex items-center gap-1 text-[10px] font-medium bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 px-2 py-1 rounded border border-emerald-500/30"
                          title="Verify as Commander"
                        >
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          <span>Verify</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setDeletingEventId(item.id);
                          setDeletionReason('');
                        }}
                        className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-rose-950/40"
                        title="Soft delete mark"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 3. SOFT DELETION REASON MODAL */}
      {deletingEventId && (
        <div className="fixed inset-0 z-[1200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl p-5 max-w-md w-full shadow-2xl">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-400" />
              Soft Delete Recon Mark
            </h4>
            <p className="text-xs text-slate-400 mt-2">
              In accordance with operational audit standards, operator marks cannot be silently erased. Please specify a mandatory reason for deletion.
            </p>
            <textarea
              value={deletionReason}
              onChange={(e) => setDeletionReason(e.target.value)}
              placeholder="e.g., False positive shadow reflection, corrected in subsequent scan..."
              className="mt-3 w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              rows={3}
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingEventId(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3 py-1.5 text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white rounded-lg shadow-lg shadow-rose-600/30"
              >
                Confirm Soft Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MARKING MODAL FORM */}
      {showModal && (
        <div className="fixed inset-0 z-[1100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-500/50 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {modalType === 'SURVIVOR_LOCK' && <Users className="w-5 h-5 text-rose-400" />}
                {modalType === 'ROAD_CUTOFF' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                {modalType === 'LZ_LOCK' && <Anchor className="w-5 h-5 text-emerald-400" />}
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                    {modalType.replace('_', ' ')}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Provenance: OPERATOR_MARKED &bull; Unverified
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  onSetMarkingMode(null);
                }}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSubmitMark} className="p-4 space-y-3 max-h-[75vh] overflow-y-auto text-xs">
              {/* Common Location Coordinates */}
              <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formCoords.lat}
                    onChange={(e) => setFormCoords({ ...formCoords, lat: parseFloat(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-cyan-300 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formCoords.lng}
                    onChange={(e) => setFormCoords({ ...formCoords, lng: parseFloat(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-cyan-300 font-mono"
                    required
                  />
                </div>
              </div>

              {/* Location Name / Label */}
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Observation Landmark / Sector Title</label>
                <input
                  type="text"
                  value={placeName}
                  onChange={(e) => setPlaceName(e.target.value)}
                  placeholder="e.g., Lowland Rooftop 2F or North Canal Cause"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>

              {/* === SURVIVOR_LOCK SPECIFIC FIELDS === */}
              {modalType === 'SURVIVOR_LOCK' && (
                <>
                  {/* Headcount Mode: Exact or Range */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-slate-300">People Count</label>
                      <div className="flex items-center gap-1 text-[10px] font-mono">
                        <button
                          type="button"
                          onClick={() => setHeadcountMode('EXACT')}
                          className={`px-2 py-0.5 rounded ${headcountMode === 'EXACT' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400'}`}
                        >
                          Exact
                        </button>
                        <button
                          type="button"
                          onClick={() => setHeadcountMode('RANGE')}
                          className={`px-2 py-0.5 rounded ${headcountMode === 'RANGE' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400'}`}
                        >
                          Min-Max Range
                        </button>
                      </div>
                    </div>
                    {headcountMode === 'EXACT' ? (
                      <input
                        type="number"
                        min="0"
                        value={peopleCount}
                        onChange={(e) => setPeopleCount(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                        required
                      />
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          min="0"
                          placeholder="Min"
                          value={peopleMin}
                          onChange={(e) => setPeopleMin(parseInt(e.target.value) || 0)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                        />
                        <input
                          type="number"
                          min="0"
                          placeholder="Max"
                          value={peopleMax}
                          onChange={(e) => setPeopleMax(parseInt(e.target.value) || 0)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                        />
                      </div>
                    )}
                  </div>

                  {/* Vulnerable Population Selection */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Vulnerable Groups Present
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {['children', 'elderly', 'injured', 'disabled', 'none', 'unknown'].map((cat) => (
                        <button
                          type="button"
                          key={cat}
                          onClick={() => handleToggleVulnerable(cat)}
                          className={`px-2 py-1 rounded-md text-[11px] capitalize border transition-all ${
                            vulnerableCategories.includes(cat)
                              ? 'bg-rose-950 text-rose-300 border-rose-500/50 font-semibold'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-300'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Vulnerable Count & Can Self Evacuate */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">Vulnerable Count (optional)</label>
                      <input
                        type="number"
                        min="0"
                        value={vulnerableCount || ''}
                        onChange={(e) => setVulnerableCount(e.target.value ? parseInt(e.target.value) : undefined)}
                        placeholder="e.g., 3"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">Can Self-Evacuate?</label>
                      <select
                        value={canSelfEvacuate}
                        onChange={(e: any) => setCanSelfEvacuate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                      >
                        <option value="NO">NO (Trapped / Submerged)</option>
                        <option value="YES">YES (Walkable path clear)</option>
                        <option value="UNKNOWN">UNKNOWN (Leave null)</option>
                      </select>
                    </div>
                  </div>

                  {/* Structure State & Water Situation */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">Structure State</label>
                      <select
                        value={structureState}
                        onChange={(e: any) => setStructureState(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                      >
                        <option value="STABLE">STABLE</option>
                        <option value="DAMAGED">DAMAGED</option>
                        <option value="COLLAPSING">COLLAPSING (Critical)</option>
                        <option value="UNKNOWN">UNKNOWN</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">Water Situation</label>
                      <select
                        value={waterSituation}
                        onChange={(e: any) => setWaterSituation(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                      >
                        <option value="RISING">RISING (Escalation)</option>
                        <option value="STABLE">STABLE</option>
                        <option value="FALLING">FALLING</option>
                        <option value="UNKNOWN">UNKNOWN</option>
                      </select>
                    </div>
                  </div>

                  {/* Water Depth */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">Water Depth (meters, optional)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={waterDepthM}
                      onChange={(e) => setWaterDepthM(e.target.value)}
                      placeholder="e.g., 1.5"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </>
              )}

              {/* === ROAD_CUTOFF SPECIFIC FIELDS === */}
              {modalType === 'ROAD_CUTOFF' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">Cutoff Obstruction Type</label>
                      <select
                        value={cutoffType}
                        onChange={(e: any) => setCutoffType(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                      >
                        <option value="ROAD_SUBMERGED">ROAD SUBMERGED</option>
                        <option value="BRIDGE_DESTROYED">BRIDGE DESTROYED</option>
                        <option value="DEBRIS">DEBRIS / MUDFLOW</option>
                        <option value="LANDSLIDE">LANDSLIDE</option>
                        <option value="OTHER">OTHER</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">Severity</label>
                      <select
                        value={severity}
                        onChange={(e: any) => setSeverity(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                      >
                        <option value="BLOCKED">BLOCKED (Strict Avoid)</option>
                        <option value="PASSABLE_WITH_LIMITS">PASSABLE WITH LIMITS (Penalty)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">Road Name</label>
                      <input
                        type="text"
                        value={roadName}
                        onChange={(e) => setRoadName(e.target.value)}
                        placeholder="e.g. NH-37 Approach"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">Estimated Water Depth (m)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={cutoffDepthM}
                        onChange={(e) => setCutoffDepthM(e.target.value)}
                        placeholder="e.g. 1.8"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">Vehicle Limits / Advisory</label>
                    <input
                      type="text"
                      value={vehicleLimits}
                      onChange={(e) => setVehicleLimits(e.target.value)}
                      placeholder="e.g. Amphibious BV-206 only; No sedans or standard ambulances"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                </>
              )}

              {/* === LZ_LOCK SPECIFIC FIELDS === */}
              {modalType === 'LZ_LOCK' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">Approximate Dimensions (m x m)</label>
                      <input
                        type="text"
                        value={lzSize}
                        onChange={(e) => setLzSize(e.target.value)}
                        placeholder="e.g., 30x30 or 50x50"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">Surface Type</label>
                      <input
                        type="text"
                        value={lzSurface}
                        onChange={(e) => setLzSurface(e.target.value)}
                        placeholder="e.g. Concrete, Asphalt, Packed turf"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">Obstacles in Vicinity</label>
                    <div className="flex flex-wrap gap-1.5">
                      {['wires', 'trees', 'structures', 'none'].map((obs) => (
                        <button
                          type="button"
                          key={obs}
                          onClick={() => handleToggleLzObstacle(obs)}
                          className={`px-2 py-1 rounded-md text-[11px] capitalize border transition-all ${
                            lzObstacles.includes(obs)
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50 font-semibold'
                              : 'bg-slate-950 text-slate-400 border-slate-800'
                          }`}
                        >
                          {obs}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">Slope Estimate (degrees)</label>
                      <input
                        type="number"
                        min="0"
                        max="90"
                        value={lzSlopeDeg}
                        onChange={(e) => setLzSlopeDeg(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">Flooding Risk</label>
                      <select
                        value={lzFloodingRisk}
                        onChange={(e: any) => setLzFloodingRisk(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                      >
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                        <option value="UNKNOWN">UNKNOWN</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">Suitable For</label>
                    <div className="flex flex-wrap gap-1.5">
                      {['helicopter', 'boat_dock', 'vehicle'].map((target) => (
                        <button
                          type="button"
                          key={target}
                          onClick={() => handleToggleLzSuitable(target)}
                          className={`px-2 py-1 rounded-md text-[11px] capitalize border transition-all ${
                            lzSuitableFor.includes(target)
                              ? 'bg-cyan-950 text-cyan-300 border-cyan-500/50 font-semibold'
                              : 'bg-slate-950 text-slate-400 border-slate-800'
                          }`}
                        >
                          {target.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Observation Time & Notes */}
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Observation Time</label>
                <input
                  type="datetime-local"
                  value={observationTime}
                  onChange={(e) => setObservationTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Operator Tactical Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional context from optical/thermal camera feed..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                  rows={2}
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    onSetMarkingMode(null);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg shadow-lg shadow-cyan-600/30 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Operator Lock</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
