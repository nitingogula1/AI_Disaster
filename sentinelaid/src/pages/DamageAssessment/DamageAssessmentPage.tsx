import { useState, useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { RefreshCw, CheckCircle, AlertTriangle, ShieldAlert, Database, Layers, Info } from 'lucide-react';
import { DamageGradeBadge, ConfidenceBadge } from '../../components/common/StatusBadges';
import { damageService } from '../../services/api';
import { useAppStore } from '../../store/appStore';
import type { DamageAsset } from '../../types';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 13, { duration: 1 });
  }, [center, map]);
  return null;
}

type SyncState = 'NOT_YET_SYNCED' | 'SYNCING' | 'SYNCED' | 'SYNC_ERROR';

export default function DamageAssessmentPage() {
  const { activeOperationId, activeDisasterContext } = useAppStore();
  const currentDisasterId = activeOperationId || 'evt-remal-001';

  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [activeOverlay, setActiveOverlay] = useState<'Standard Basemap' | 'Dark Basemap' | 'Satellite Basemap'>('Standard Basemap');
  const [assets, setAssets] = useState<DamageAsset[]>([]);
  const [footprintsCount, setFootprintsCount] = useState<number>(0);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [modelName, setModelName] = useState<string>('Spectral Overlap Heuristic Engine (No ML Checkpoint)');
  const [isHeuristic, setIsHeuristic] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [syncState, setSyncState] = useState<SyncState>('NOT_YET_SYNCED');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterGrade, setFilterGrade] = useState('ALL');

  const loadDamageData = useCallback(async () => {
    setLoading(true);
    setSyncState('SYNCING');
    setSyncErrorMessage(null);

    try {
      // Parallel fetch: assets, footprints, summary, aiStatus
      const [assetList, fpRes, summaryRes, aiStatusRes] = await Promise.allSettled([
        damageService.getDamageAssets(currentDisasterId),
        damageService.getFootprints(currentDisasterId),
        damageService.getDamageSummary(currentDisasterId),
        damageService.getAiStatus()
      ]);

      let fetchSucceeded = false;

      // 1. Assets
      if (assetList.status === 'fulfilled' && Array.isArray(assetList.value)) {
        setAssets(assetList.value);
        fetchSucceeded = true;
      } else {
        setAssets([]);
      }

      // 2. Footprints
      if (fpRes.status === 'fulfilled' && fpRes.value) {
        setFootprintsCount(fpRes.value.count || 0);
        fetchSucceeded = true;
      } else {
        setFootprintsCount(0);
      }

      // 3. Summary
      if (summaryRes.status === 'fulfilled' && summaryRes.value) {
        setSummaryData(summaryRes.value);
        fetchSucceeded = true;
      } else {
        setSummaryData(null);
      }

      // 4. AI Model Status
      if (aiStatusRes.status === 'fulfilled' && aiStatusRes.value) {
        if (aiStatusRes.value.model_name) {
          setModelName(aiStatusRes.value.model_name);
        }
        setIsHeuristic(aiStatusRes.value.is_heuristic !== false);
      } else if (summaryRes.status === 'fulfilled' && summaryRes.value?.model_name) {
        setModelName(summaryRes.value.model_name);
        setIsHeuristic(summaryRes.value.is_heuristic !== false);
      }

      if (fetchSucceeded) {
        setSyncState('SYNCED');
        setLastSyncTime(new Date());
      } else {
        setSyncState('SYNC_ERROR');
        setSyncErrorMessage('Failed to connect to damage inventory endpoints.');
      }
    } catch (e: any) {
      console.error('Error fetching damage data:', e);
      setSyncState('SYNC_ERROR');
      setSyncErrorMessage(e?.message || 'Network error fetching damage data');
    } finally {
      setLoading(false);
    }
  }, [currentDisasterId]);

  useEffect(() => {
    loadDamageData();
  }, [loadDamageData]);

  // Total Inspected from real footprints or summary
  const totalInspected = summaryData?.total_inspected ?? (footprintsCount > 0 ? footprintsCount : assets.length);
  
  // Real grade counts from backend summary or assets
  const grade5 = summaryData?.grade_5_destroyed ?? assets.filter(a => a.damageGrade === 5).length;
  const grade4 = summaryData?.grade_4_severe ?? assets.filter(a => a.damageGrade === 4).length;
  const grade3 = summaryData?.grade_3_moderate ?? assets.filter(a => a.damageGrade === 3).length;
  const grade2 = summaryData?.grade_2_minor ?? assets.filter(a => a.damageGrade === 2).length;
  const grade1 = summaryData?.grade_1_intact ?? (
    totalInspected > (grade5 + grade4 + grade3 + grade2)
      ? totalInspected - (grade5 + grade4 + grade3 + grade2)
      : assets.filter(a => a.damageGrade === 1).length
  );

  // Mean Confidence: HONEST STAT. If no assets detected, show N/A
  const totalDetected = assets.length;
  const meanConf = totalDetected > 0
    ? (assets.reduce((sum, a) => sum + (a.aiConfidence || 0), 0) / totalDetected).toFixed(1)
    : null;

  const GRADE_METRICS = [
    { label: 'TOTAL INSPECTED', value: totalInspected.toLocaleString(), sub: footprintsCount > 0 ? `${footprintsCount} Vector Footprints` : 'Survey Assets', sub2: 'Active Sector', color: 'text-text-primary', border: '' },
    { label: 'GRADE 5 DESTROYED', value: grade5.toLocaleString(), sub: 'Critical Loss', sub2: 'Immediate P1', color: 'text-critical', border: 'border-l-4 border-l-critical' },
    { label: 'GRADE 4 SEVERE', value: grade4.toLocaleString(), sub: 'Structural Failure', sub2: 'P1 Triage', color: 'text-warning', border: 'border-l-4 border-l-warning' },
    { label: 'GRADE 3 MODERATE', value: grade3.toLocaleString(), sub: 'Partial Damage', sub2: 'P2 Staged', color: 'text-secondary-blue', border: 'border-l-4 border-l-secondary-blue' },
    { label: 'GRADE 2 MINOR', value: grade2.toLocaleString(), sub: 'Superficial', sub2: 'Habitable', color: 'text-emerald-600', border: '' },
    { label: 'GRADE 1 INTACT', value: grade1.toLocaleString(), sub: 'Undamaged', sub2: 'Safe Haven', color: 'text-emerald-700', border: '' },
  ];

  // Category breakdown: calculate from assets or fallback to summary categories
  const categoryCounts = useMemo(() => {
    if (summaryData?.by_category && Object.keys(summaryData.by_category).length > 0) {
      return summaryData.by_category;
    }
    const counts: Record<string, number> = {};
    assets.forEach(a => {
      const cat = a.category || 'General';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [assets, summaryData]);

  const filteredAssets = assets.filter(a => {
    if (filterCategory !== 'ALL' && a.category !== filterCategory) return false;
    if (filterGrade !== 'ALL' && a.damageGrade !== Number(filterGrade)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (a.id || '').toLowerCase().includes(q) || (a.location || '').toLowerCase().includes(q) || (a.failureMode || '').toLowerCase().includes(q);
    }
    return true;
  });

  const toggleAsset = (id: string) => {
    setSelectedAssets(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const mapCenter: [number, number] = useMemo(() => {
    if (assets.length > 0 && assets[0].coordinates?.lat) {
      return [assets[0].coordinates.lat, assets[0].coordinates.lng];
    }
    if (activeDisasterContext?.coordinates) {
      return [activeDisasterContext.coordinates.lat, activeDisasterContext.coordinates.lng];
    }
    return [22.3, 89.5]; // Default coastal AOI coordinates
  }, [assets, activeDisasterContext]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface border border-border rounded-lg p-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-text-muted">OPERATIONS // DAMAGE ASSESSMENT</span>
            
            {/* HONEST LIVE DATABASE SYNC BADGE */}
            {syncState === 'SYNCED' && (
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                LIVE DATABASE SYNC
                {lastSyncTime && (
                  <span className="font-mono text-[9px] font-normal opacity-80">
                    ({lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })})
                  </span>
                )}
              </span>
            )}
            {syncState === 'SYNCING' && (
              <span className="px-2 py-0.5 bg-sky-100 text-sky-800 text-[10px] font-bold rounded flex items-center gap-1">
                <RefreshCw size={10} className="animate-spin" />
                SYNCING DATABASE...
              </span>
            )}
            {syncState === 'NOT_YET_SYNCED' && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">
                NOT YET SYNCED
              </span>
            )}
            {syncState === 'SYNC_ERROR' && (
              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded flex items-center gap-1">
                <AlertTriangle size={10} />
                SYNC ERROR
              </span>
            )}
          </div>
          <h1 className="text-[22px] font-bold text-text-primary mt-1">Disaster Damage Assessment & Structural Inventory</h1>
          <p className="text-[12px] text-text-muted mt-0.5">
            Real-time classified building & infrastructure inventory verified from spatial damage detections and vector footprints.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={loadDamageData}
            disabled={loading}
            className="flex items-center gap-1.5 border border-border text-text-secondary text-[12px] font-medium px-3 py-1.5 rounded hover:bg-panel transition disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh Assets
          </button>
        </div>
      </div>

      {/* Sync Error Banner if any */}
      {syncErrorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-lg p-3 text-xs flex items-center gap-2">
          <AlertTriangle size={16} className="text-rose-600 flex-shrink-0" />
          <span>{syncErrorMessage}</span>
          <button onClick={loadDamageData} className="ml-auto underline font-semibold">Retry</button>
        </div>
      )}

      {/* Full Page Empty State if zero footprints and zero detections */}
      {!loading && totalInspected === 0 && assets.length === 0 ? (
        <div className="bg-surface border border-dashed border-border rounded-lg p-10 text-center space-y-3">
          <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto opacity-80" />
          <h2 className="text-base font-bold text-text-primary">No Structural Inventory Yet for This Sector</h2>
          <p className="text-xs text-text-muted max-w-lg mx-auto">
            Sector <code className="font-mono text-primary font-bold">{currentDisasterId}</code> has zero building footprints and zero AI damage detections in the database. Fetch building footprints via OpenStreetMap Overpass and run damage assessment to populate this view.
          </p>
          <div className="pt-2 flex justify-center gap-2">
            <button
              onClick={loadDamageData}
              className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded hover:bg-primary/90 transition flex items-center gap-1.5"
            >
              <RefreshCw size={14} /> Check for Footprints
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Grade Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {GRADE_METRICS.map((m, i) => (
              <div key={i} className={`bg-surface border border-border rounded-lg p-3 ${m.border}`}>
                <div className="label-uppercase text-text-muted text-[10px] mb-1">{m.label}</div>
                <div className={`text-[26px] font-bold tabular-nums ${m.color}`}>{m.value}</div>
                <div className="text-[10px] text-text-muted">{m.sub}</div>
                <div className="text-[10px] text-text-muted">{m.sub2}</div>
              </div>
            ))}
          </div>

          {/* Map + Side Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
            {/* Map */}
            <div className="bg-surface border border-border rounded-lg overflow-hidden flex flex-col">
              <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-border bg-panel/50">
                <span className="text-[11px] font-bold text-text-primary">SPATIAL RADAR HUD ({assets.length} Detections Plotted)</span>
                <span className="ml-auto text-[10px] text-text-muted font-medium">BASEMAP:</span>
                {(['Standard Basemap', 'Dark Basemap', 'Satellite Basemap'] as const).map(l => (
                  <button 
                    key={l} 
                    onClick={() => setActiveOverlay(l)}
                    className={`text-[10px] px-2 py-0.5 rounded transition ${
                      activeOverlay === l ? 'bg-primary text-white font-semibold' : 'text-text-muted hover:text-primary bg-panel'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>

              {/* Honest Map HUD Notice */}
              <div className="px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-800 text-[10px] flex items-center gap-1.5">
                <Info size={12} className="flex-shrink-0 text-amber-600" />
                <span>
                  <strong>Basemap Reference Only:</strong> Tile background provides spatial reference. Scene spectral indices (NDWI water mask / False-Color IR) require processed GeoTIFF from Satellite Analytics.
                </span>
              </div>

              <div className="h-[380px] relative">
                <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                  <TileLayer 
                    url={
                      activeOverlay === 'Dark Basemap'
                        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
                        : activeOverlay === 'Satellite Basemap'
                        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                    } 
                  />
                  <MapRecenter center={mapCenter} />

                  {assets.map((asset) => {
                    if (!asset.coordinates || !asset.coordinates.lat) return null;
                    return (
                      <Marker key={asset.id} position={[asset.coordinates.lat, asset.coordinates.lng]}>
                        <Popup>
                          <div className="p-2 min-w-[240px]">
                            <div className="flex items-center justify-between mb-1">
                              <DamageGradeBadge grade={asset.damageGrade} />
                              <span className="text-[10px] font-mono text-text-muted">#{asset.id}</span>
                            </div>
                            <h3 className="text-[13px] font-bold text-text-primary mt-1">{asset.location}</h3>
                            <p className="text-[11px] text-text-muted mt-1">{asset.failureMode || 'Structural Damage'}</p>
                            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border text-[10px]">
                              <div><span className="text-text-muted block">Flood Depth:</span><span className="font-bold">{asset.floodDepth}m</span></div>
                              <div><span className="text-text-muted block">AI Confidence:</span><span className="font-bold">{asset.aiConfidence}%</span></div>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              </div>

              <div className="px-3 py-2 border-t border-border flex flex-wrap items-center gap-4 text-[10px] text-text-muted mt-auto">
                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-critical inline-block rounded" />Grade 5 Destroyed</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-warning inline-block rounded" />Grade 4 Severe</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-secondary-blue inline-block rounded" />Grade 3 Moderate</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-emerald-600 inline-block rounded" />Grade 1-2 Intact</span>
              </div>
            </div>

            {/* Side Panel: Inventory Stats */}
            <div className="space-y-4">
              <div className="bg-surface border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[13px] font-bold text-text-primary">Damage by Category</h3>
                  <span className="text-[10px] font-mono text-text-muted">{assets.length} Detections</span>
                </div>
                {Object.keys(categoryCounts).length === 0 ? (
                  <div className="text-xs text-text-muted py-2">No category data recorded for this sector.</div>
                ) : (
                  Object.entries(categoryCounts).map(([cat, count]) => (
                    <div key={cat} className="flex items-center justify-between py-2 border-t border-border first:border-0 text-xs">
                      <span className="text-text-secondary">{cat}</span>
                      <span className="font-bold font-mono text-text-primary">{count}</span>
                    </div>
                  ))
                )}
              </div>

              <div className="bg-surface border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[13px] font-bold text-text-primary">Detection Telemetry</h3>
                  {/* CONTRADICTION FIX: Show N/A if zero detections */}
                  {meanConf !== null ? (
                    <span className="px-2 py-0.5 bg-ai/10 text-ai text-[10px] font-bold rounded tabular-nums">
                      {meanConf}% Mean Conf
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-panel text-text-muted text-[10px] font-semibold rounded">
                      N/A — No detections yet
                    </span>
                  )}
                </div>
                <div className="space-y-2 text-xs mt-3">
                  <div className="flex flex-col gap-0.5 text-text-muted border-b border-border pb-2">
                    <span className="text-[10px] uppercase tracking-wider">Model Pipeline:</span>
                    <span className="font-semibold text-text-primary text-[11px] leading-tight">
                      {modelName}
                    </span>
                    {isHeuristic && (
                      <span className="text-[9px] text-amber-700 font-medium">
                        *Heuristic spectral estimation (No trained weights loaded)
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between text-text-muted">
                    <span>Ground Sampling:</span>
                    <span className="font-medium text-text-primary">10m MS &bull; 0.5m Ortho</span>
                  </div>
                  <div className="flex justify-between text-text-muted">
                    <span>Footprints Surveyed:</span>
                    <span className="font-bold text-text-primary">{footprintsCount} Polygons</span>
                  </div>
                  <div className="flex justify-between text-text-muted">
                    <span>Total Detected:</span>
                    <span className="font-bold text-text-primary">{assets.length} Structures</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Asset Inventory Table */}
          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <h2 className="text-[16px] font-bold text-text-primary">Asset Damage Assessment Inventory</h2>
                <p className="text-[12px] text-text-muted">Classified structural features verified against real database records.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <input 
                  type="text" 
                  placeholder="Search location, failure..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="h-8 px-2.5 border border-border rounded text-[11px] outline-none focus:border-primary bg-panel" 
                />
                <select 
                  value={filterCategory} 
                  onChange={e => setFilterCategory(e.target.value)}
                  className="h-8 px-2 border border-border rounded text-[11px] outline-none bg-panel"
                >
                  <option value="ALL">All Categories</option>
                  {Object.keys(categoryCounts).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <select 
                  value={filterGrade} 
                  onChange={e => setFilterGrade(e.target.value)}
                  className="h-8 px-2 border border-border rounded text-[11px] outline-none bg-panel"
                >
                  <option value="ALL">All Grades (1-5)</option>
                  <option value="5">Grade 5 (Destroyed)</option>
                  <option value="4">Grade 4 (Severe)</option>
                  <option value="3">Grade 3 (Moderate)</option>
                  <option value="2">Grade 2 (Minor)</option>
                  <option value="1">Grade 1 (Intact)</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-500">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-sky-600 mb-3" />
                <p className="text-sm font-medium">Loading real damage detections from database...</p>
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">
                  {assets.length === 0 ? 'No damage detections recorded for this sector' : 'No assets match active filter criteria'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {assets.length === 0 ? 'Run AI Damage Detection to populate damage classifications.' : 'Adjust search or filters above.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 pr-2 w-8"><input type="checkbox" className="w-3.5 h-3.5" /></th>
                      {['ASSET ID & LOCATION', 'CATEGORY', 'DAMAGE GRADE & FAILURE MODE', 'FLOOD DEPTH', 'AI CONF.', 'COORDINATES', 'RESCUE STATUS'].map((h) => (
                        <th key={h} className="pb-2 pr-3 font-semibold text-text-muted uppercase text-[10px] tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssets.map((asset, idx) => (
                      <tr key={`${asset.id}-${idx}`} className="border-b border-border hover:bg-panel/50 transition">
                        <td className="py-3 pr-2">
                          <input 
                            type="checkbox" 
                            checked={selectedAssets.includes(asset.id)} 
                            onChange={() => toggleAsset(asset.id)} 
                            className="w-3.5 h-3.5" 
                          />
                        </td>
                        <td className="py-3 pr-3">
                          <div className="font-semibold text-text-primary">{asset.id}</div>
                          <div className="text-[11px] text-text-muted">{asset.location}</div>
                        </td>
                        <td className="py-3 pr-3 text-text-secondary">{asset.category}</td>
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-1.5">
                            <DamageGradeBadge grade={asset.damageGrade} />
                            <span className="text-[11px] text-text-muted">{asset.failureMode}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-3 font-mono font-medium">{asset.floodDepth}m</td>
                        <td className="py-3 pr-3"><ConfidenceBadge value={asset.aiConfidence} /></td>
                        <td className="py-3 pr-3 font-mono text-[11px] text-text-muted">
                          {asset.coordinates?.lat ? `${asset.coordinates.lat.toFixed(4)}, ${asset.coordinates.lng.toFixed(4)}` : 'N/A'}
                        </td>
                        <td className="py-3 pr-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            {asset.rescueStatus || 'ENQUEUED'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
