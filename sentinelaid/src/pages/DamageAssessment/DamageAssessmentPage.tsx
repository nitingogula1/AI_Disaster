import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Download, ArrowRight, CheckCircle, Zap } from 'lucide-react';
import { DamageGradeBadge, ConfidenceBadge } from '../../components/common/StatusBadges';
import { damageService } from '../../services/api';
import { mockDamageAssets } from '../../data/mockData';
import type { DamageAsset } from '../../types';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export default function DamageAssessmentPage() {
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [activeOverlay, setActiveOverlay] = useState<'Optical' | 'NDWI Water' | 'False Color IR'>('Optical');
  const [assets, setAssets] = useState<DamageAsset[]>(mockDamageAssets);
  const [summary, setSummary] = useState<any>({
    total_inspected: 4280,
    grade_5_destroyed: 412,
    grade_4_severe: 714,
    grade_3_moderate: 482,
    grade_2_minor: 620,
    grade_1_intact: 2052,
    average_confidence: 94.6,
    estimated_loss_usd: '$84.2M',
    displaced_civilians: 14800,
  });

  const loadDamageData = async () => {
    try {
      const [assetList, sum] = await Promise.all([
        damageService.getDamageAssets('evt-remal-001'),
        damageService.getDamageSummary('evt-remal-001')
      ]);
      if (assetList && assetList.length) setAssets(assetList);
      if (sum) setSummary(sum);
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    loadDamageData();
  }, []);

  const GRADE_METRICS = [
    { label: 'TOTAL INSPECTED', value: (summary.total_inspected || 4280).toLocaleString(), sub: '100% of Sector', sub2: '10.4 sq km', icon: '🏗', border: '' },
    { label: 'GRADE 5 DESTROYED', value: (summary.grade_5_destroyed || 412).toLocaleString(), sub: 'Critical Loss', sub2: '↑ Critical', icon: '✕', border: 'border-l-4 border-l-critical', color: 'text-critical' },
    { label: 'GRADE 4 SEVERE', value: (summary.grade_4_severe || 714).toLocaleString(), sub: 'Structural Fail', sub2: 'Structural Fail', icon: '⚠', border: 'border-l-4 border-l-warning' },
    { label: 'GRADE 3 MODERATE', value: (summary.grade_3_moderate || 482).toLocaleString(), sub: 'Partial Loss', sub2: 'Partial Loss', icon: '△', border: 'border-l-4 border-l-secondary-blue' },
    { label: 'GRADE 2 MINOR', value: (summary.grade_2_minor || 620).toLocaleString(), sub: 'Habitable', sub2: 'Habitable', icon: '◇', border: '' },
    { label: 'GRADE 1 INTACT', value: (summary.grade_1_intact || 2052).toLocaleString(), sub: 'Safe Haven', sub2: 'Safe Haven', icon: '✓', border: '' },
  ];

  const toggleAsset = (id: string) => {
    setSelectedAssets((prev) => prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]);
  };

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="px-2 py-0.5 bg-ai/10 text-ai text-[10px] font-bold rounded mr-2">MODULE 12</span>
          <h1 className="text-[22px] font-bold text-text-primary mt-1">Disaster Damage Assessment & Structural Inventory</h1>
          <div className="flex items-center gap-3 mt-1 text-[11px] text-text-muted">
            <span className="text-critical font-semibold">● Live STAC Sync</span>
            <span>Incident: Cyclone Remal (Delta Sector 4) → Ingestion: Sentinel-2 L2A & InSAR Dual-Pass</span>
          </div>
          <span className="text-[11px] text-text-muted">▣ GSD: 10m MS • 3m PlanetScope Fusion</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="border border-border text-text-secondary text-[12px] font-medium px-3 py-1.5 rounded hover:bg-panel transition">↗ Sync UN-SPIDER / FEMA</button>
          <button className="border border-border text-text-secondary text-[12px] font-medium px-3 py-1.5 rounded hover:bg-panel transition"><Download size={14} className="inline mr-1" />Export Audit (PDF/CSV)</button>
          <button className="bg-critical hover:bg-critical-hover text-white text-[12px] font-semibold px-3 py-1.5 rounded transition">↗ Promote to Rescue Queue</button>
        </div>
      </div>

      {/* Grade Metrics */}
      <div className="grid grid-cols-6 gap-3">
        {GRADE_METRICS.map((m, i) => (
          <div key={i} className={`bg-surface border border-border rounded-lg p-3 ${m.border}`}>
            <div className="label-uppercase text-text-muted text-[10px] mb-1">{m.label}</div>
            <div className={`text-[26px] font-bold tabular-nums ${m.color || 'text-text-primary'}`}>{m.value}</div>
            <div className="text-[10px] text-text-muted">{m.sub}</div>
            <div className="text-[10px] text-text-muted">{m.sub2}</div>
          </div>
        ))}
      </div>

      {/* Map + Side Panel */}
      <div className="grid grid-cols-[1fr_300px] gap-4">
        {/* Map */}
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-panel/50">
            {['Footprints', 'Critical Infra', 'Flood Polyg. (1.2m+)', 'InSAR Coherence'].map((l, i) => (
              <button key={l} className={`px-2.5 py-1 rounded text-[11px] font-medium border transition ${i === 0 ? 'bg-primary/10 text-primary border-primary/30' : 'border-border text-text-secondary hover:bg-white'}`}>
                {l}
              </button>
            ))}
            <span className="ml-auto text-[10px] text-text-muted">LAYER OVERLAYS:</span>
            {(['Optical', 'NDWI Water', 'False Color IR'] as const).map((l) => (
              <button 
                key={l} 
                onClick={() => setActiveOverlay(l)}
                className={`text-[10px] px-2 py-0.5 rounded transition ${
                  activeOverlay === l ? 'bg-primary text-white font-semibold' : 'text-text-muted hover:text-primary'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="h-[350px]">
            <MapContainer center={[21.745, 89.31]} zoom={14} style={{ height: '100%', width: '100%' }} zoomControl={false}>
              <TileLayer 
                url={
                  activeOverlay === 'NDWI Water'
                    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
                    : activeOverlay === 'False Color IR'
                    ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                } 
              />
              {assets.map((asset) => (
                <Marker key={asset.id} position={[asset.coordinates.lat, asset.coordinates.lng]}>
                  <Popup>
                    <div className="p-3 min-w-[260px]">
                      <DamageGradeBadge grade={asset.damageGrade} />
                      <span className="ml-2 text-[10px] font-mono text-text-muted">#{asset.id}</span>
                      <span className="ml-2 text-[10px] font-semibold text-critical">P1 Triage Priority</span>
                      <h3 className="text-[14px] font-bold text-text-primary mt-1">{asset.location}</h3>
                      <p className="text-[11px] text-text-muted mt-1">Catastrophic roof collapse, internal load-bearing structural shearing, surrounded by 1.3m standing storm-surge floodwater.</p>
                      <div className="grid grid-cols-3 gap-2 mt-2 text-[10px]">
                        <div><span className="text-text-muted block">AI Confidence</span><span className="font-bold tabular-nums">{asset.aiConfidence}% (ResNet-Seg)</span></div>
                        <div><span className="text-text-muted block">Inundation Level</span><span className="font-bold text-critical">{asset.floodDepth}m ({asset.floodType})</span></div>
                        <div><span className="text-text-muted block">Civilian Density</span><span className="font-bold">~65 trapped</span></div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button className="text-[11px] text-primary font-medium">View Crop</button>
                        <button className="flex-1 bg-critical hover:bg-critical-hover text-white text-[11px] font-semibold py-1.5 rounded transition">⬗ Dispatch SRT-Alpha</button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
          <div className="px-3 py-2 border-t border-border flex items-center gap-4 text-[10px] text-text-muted">
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-critical" />Destroyed</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-warning" />Severe</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-secondary-blue" />Moderate</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-success" />Intact</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-primary/40" />Waterlogged</span>
          </div>
        </div>

        {/* Side: Damage by Asset Class + AI Telemetry */}
        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[13px] font-semibold text-text-primary">Damage by Asset Class</h3>
              <span className="text-[10px] text-text-muted">Sector 4 Inventory</span>
            </div>
            {[
              { name: 'Residential Dwellings', count: '820 impacted', pct: '72% High', color: 'text-critical' },
              { name: 'Bridges & Access Spans', count: '42 severed', pct: '8 Cut off', color: 'text-warning' },
              { name: 'Commercial / Warehousing', count: '142 impacted', pct: '34% High', color: 'text-text-secondary' },
              { name: 'Schools & Designated Shelters', count: '24 impacted', pct: '4 Critical', color: 'text-critical' },
              { name: 'Healthcare Facilities', count: '6 impacted', pct: '2 Critical', color: 'text-critical' },
            ].map((c) => (
              <div key={c.name} className="flex items-center justify-between py-1.5 border-t border-border first:border-0 text-[11px]">
                <span className="text-text-secondary">{c.name}</span>
                <span className={`font-semibold tabular-nums ${c.color}`}>{c.count}</span>
              </div>
            ))}
          </div>
          <div className="bg-surface border border-border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[13px] font-semibold text-text-primary">AI Verification Telemetry</h3>
              <span className="px-2 py-0.5 bg-ai/10 text-ai text-[10px] font-bold rounded tabular-nums">94.6% Mean Conf</span>
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between"><span className="text-text-muted">Model Architecture:</span><span className="font-medium">ResNet-50 + Siamese SegFormer</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Drone Ground-Truth Matches:</span><span className="font-medium tabular-nums">182 / 185 (98.4% alignment)</span></div>
              <div className="flex justify-between"><span className="text-text-muted">InSAR Decorrelation Threshold:</span><span className="font-medium tabular-nums">γ {'<'} 0.31 (High Confidence)</span></div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-border">
              <div><span className="label-uppercase text-text-muted text-[9px]">DISPLACED CIVILIANS</span><div className="text-[18px] font-bold text-text-primary tabular-nums">~14,800</div><span className="text-[10px] text-text-muted">Across 6 wards</span></div>
              <div><span className="label-uppercase text-text-muted text-[9px]">EST. ASSET LOSS</span><div className="text-[18px] font-bold text-text-primary tabular-nums">$84.2M</div><span className="text-[10px] text-text-muted">Replacement value</span></div>
            </div>
          </div>
          {/* Critical Alert */}
          <div className="bg-critical/5 border border-critical/30 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-critical text-[11px] font-bold">⚠ Critical Route Isolation Alert</span>
            </div>
            <p className="text-[11px] text-text-secondary leading-relaxed">Secondary surge barrier failure at coordinates 21°44'11"N has isolated <strong className="text-critical">3 critical shelters</strong> in Ward 9. Marine or aerial airdrop required within 4 hours.</p>
            <div className="flex gap-2 mt-2">
              <button className="bg-critical text-white text-[10px] font-semibold px-2 py-1 rounded">View Ward 9 Corridor</button>
              <button className="bg-critical text-white text-[10px] font-semibold px-2 py-1 rounded">Log Incident</button>
            </div>
          </div>
        </div>
      </div>

      {/* Asset Inventory Table */}
      <div className="bg-surface border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-[16px] font-bold text-text-primary">Asset Damage Assessment Inventory</h2>
            <p className="text-[12px] text-text-muted">Real-time AI classified structural features with flood telemetry and rescue queue routing.</p>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <input type="text" placeholder="Filter by ID, name, road..." className="h-7 px-2 border border-border-input rounded text-[11px] outline-none focus:border-primary" />
            <select className="h-7 px-2 border border-border-input rounded text-[11px] outline-none"><option>All Asset Types</option></select>
            <select className="h-7 px-2 border border-border-input rounded text-[11px] outline-none"><option>All Severities (Grades 1-5)</option></select>
          </div>
        </div>

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
            {assets.map((asset, idx) => (
              <tr key={`${asset.id}-${idx}`} className="border-b border-border hover:bg-panel/50 transition">
                <td className="py-3 pr-2"><input type="checkbox" checked={selectedAssets.includes(asset.id)} onChange={() => toggleAsset(asset.id)} className="w-3.5 h-3.5" /></td>
                <td className="py-3 pr-3">
                  <div className="font-semibold text-text-primary">{asset.id}</div>
                  <div className="text-[10px] text-text-muted">{asset.location}</div>
                </td>
                <td className="py-3 pr-3">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold text-white ${
                    asset.category === 'Medical' ? 'bg-critical' : asset.category === 'Transport' ? 'bg-ai' : asset.category === 'Education' ? 'bg-primary' : asset.category === 'Residential' ? 'bg-warning' : 'bg-text-muted'
                  }`}>{asset.category}</span>
                </td>
                <td className="py-3 pr-3">
                  <DamageGradeBadge grade={asset.damageGrade} />
                  <div className="text-[10px] text-text-muted mt-0.5">{asset.failureMode}</div>
                </td>
                <td className="py-3 pr-3">
                  <span className={`font-semibold tabular-nums ${asset.floodDepth >= 2 ? 'text-critical' : asset.floodDepth >= 1 ? 'text-warning' : 'text-text-primary'}`}>
                    {asset.floodDepth}m
                  </span>
                  <div className="text-[10px] text-text-muted">({asset.floodType})</div>
                </td>
                <td className="py-3 pr-3 tabular-nums text-text-secondary">{asset.aiConfidence}%</td>
                <td className="py-3 pr-3 tabular-nums text-[10px] text-text-muted">{asset.coordinates.lat.toFixed(4)}°N, {asset.coordinates.lng.toFixed(4)}°E</td>
                <td className="py-3">
                  <span className={`text-[10px] font-semibold ${
                    asset.rescueStatus.includes('ENQUEUED') ? 'text-critical' : asset.rescueStatus === 'OPERATIONAL' ? 'text-success' : asset.rescueStatus.includes('SEVERED') ? 'text-critical' : 'text-primary'
                  }`}>
                    {asset.rescueStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between mt-3 text-[11px] text-text-muted">
          <span>Showing 1 to 5 of 4,280 surveyed structural footprints [Filter applied: Sector 4]</span>
          <div className="flex items-center gap-1">
            <span>Previous</span>
            {[1, 2, 3, '...', 856].map((p, i) => (
              <button key={i} className={`w-6 h-6 rounded text-[11px] font-medium ${p === 1 ? 'bg-primary text-white' : 'hover:bg-panel'}`}>{p}</button>
            ))}
            <span>Next</span>
          </div>
        </div>
      </div>

      {/* Selected Action Bar */}
      {selectedAssets.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-nav-primary text-white rounded-lg px-6 py-3 flex items-center gap-4 shadow-lg animate-fade-in">
          <span className="text-[12px]">● Selected: <strong>{selectedAssets.length} High-Impact Structures</strong> ({selectedAssets.join(', ')})</span>
          <button className="text-[11px] bg-white/10 hover:bg-white/20 px-3 py-1 rounded transition">🛩 Task UAV Flight Recon</button>
          <button className="text-[11px] bg-white/10 hover:bg-white/20 px-3 py-1 rounded transition">📦 Export GeoJSON Layer</button>
          <button className="text-[11px] bg-critical hover:bg-critical-hover px-3 py-1 rounded transition font-semibold">🚨 Push Batch to Rescue Priority Triage</button>
        </div>
      )}
    </div>
  );
}
