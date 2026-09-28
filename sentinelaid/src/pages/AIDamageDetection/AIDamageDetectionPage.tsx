import { useState, useRef, useCallback, useEffect } from 'react';
import { Brain, Zap, Download, CheckCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { ConfidenceBadge } from '../../components/common/StatusBadges';
import { aiDetectionService } from '../../services/api';
import { mockInferencePipeline, mockDetectionBreakdown } from '../../data/mockData';

export default function AIDamageDetectionPage() {
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [maskOpacity, setMaskOpacity] = useState(85);
  const [viewMode, setViewMode] = useState<'split' | 'polygons'>('split');
  const containerRef = useRef<HTMLDivElement>(null);
  const [pipeline, setPipeline] = useState<any>(mockInferencePipeline);
  const [breakdown, setBreakdown] = useState<any>(mockDetectionBreakdown);
  const [running, setRunning] = useState(false);
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  }, [isDragging]);

  const runModel = async () => {
    setRunning(true);
    try {
      const res = await aiDetectionService.runDamageDetection({
        disaster_id: 'evt-remal-001',
        model_name: 'Dual-Stream Siamese U-Net + Transformer CV',
        confidence_threshold: 0.85
      });
      if (res) {
        setPipeline({
          ...mockInferencePipeline,
          ...res,
          modelName: res.model_name || res.modelName || mockInferencePipeline.modelName,
          inferenceTime: res.inference_time_ms ?? res.inferenceTime ?? 1420,
          gpu: res.gpu || res.device || mockInferencePipeline.gpu
        });
        setBreakdown({
          ...mockDetectionBreakdown,
          damagedBuildings: res.severe_collapse || res.damagedBuildings || 1126,
          totalAnalyzed: res.total_buildings_analyzed || res.totalAnalyzed || 4280,
          roadCuts: res.blocked_road_segments || res.roadCuts || 42,
          floodFootprint: res.flood_footprint_km2 || res.floodFootprint || 18.6
        });
      }
    } catch {
      // Fallback
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    runModel();
  }, []);

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 text-[11px] text-text-muted mb-1">
            <span className="text-primary font-semibold">CYCLONE REMAL</span>
            <span>/</span>
            <span>ACQUISITION SET #S2A-2024-0526</span>
            <span>/</span>
            <span className="text-critical font-semibold">SECTOR 4 (COASTAL DELTA)</span>
          </div>
          <h1 className="text-[22px] font-bold text-text-primary">AI-Based Change & Structural Damage Detection</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 bg-ai/10 text-ai border border-ai/30 text-[10px] font-bold rounded">SIAMESE-UNET v4.2</span>
          </div>
          <div className="flex items-center gap-4 mt-2 text-[11px] text-text-muted">
            <span>🛰 Sensor: Sentinel-2 MSI Level-2A (ESA CopHub)</span>
            <span>⊙ Bands: B04 (Red), B03 (Green), B02 (Blue), B08 (NIR 842nm), B11 (SWIR 1610nm)</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-text-muted">
            <span>▣ GSD: 10m Multispectral Pixel</span>
            <span>☁ Cloud Masking: SCL Quality 98.4% Clean</span>
            <span className="text-primary font-semibold">⟳ SYNC: REAL-TIME STREAM ACTIVE</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="border border-border text-text-secondary text-[12px] font-medium px-3 py-1.5 rounded hover:bg-panel transition">🔄 Re-run Indices (NDWI/NDVI)</button>
          <button className="border border-border text-text-secondary text-[12px] font-medium px-3 py-1.5 rounded hover:bg-panel transition">📦 Export GeoTIFF Mask</button>
          <button onClick={runModel} className="bg-critical hover:bg-critical-hover text-white text-[12px] font-semibold px-3 py-1.5 rounded transition flex items-center gap-1.5">
            <Brain size={14} className={running ? 'animate-spin' : ''} /> {running ? 'Running Model...' : '🧠 Run Model (ResNet-U-Net)'}
          </button>
          <button className="bg-success hover:bg-success/90 text-white text-[12px] font-semibold px-3 py-1.5 rounded transition">📊 Generate Assessment</button>
        </div>
      </div>

      {/* Main: Comparison + Detection Panel */}
      <div className="grid grid-cols-[1fr_320px] gap-4">
        {/* Split View */}
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div
            ref={containerRef}
            className="relative h-[520px] cursor-ew-resize select-none overflow-hidden"
            onMouseMove={handleMouseMove}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
          >
            {/* Pre-disaster */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a4a3a] via-[#0d3a2d] to-[#0a2d1f]">
              <div className="absolute top-3 left-3 px-2 py-1 bg-primary/80 text-white text-[11px] font-semibold rounded z-10">
                ● PRE-DISASTER <span className="tabular-nums">12-MAY-2024</span>
              </div>
            </div>

            {/* Post-disaster with AI overlay */}
            <div
              className="absolute inset-0 bg-gradient-to-br from-[#0a2d4a] via-[#1a3a5a] to-[#0c2035]"
              style={{ clipPath: `inset(0 0 0 ${sliderPos}%)`, opacity: maskOpacity / 100 }}
            >
              <div className="absolute top-3 right-3 px-2 py-1 bg-critical/80 text-white text-[11px] font-semibold rounded z-10">
                ● POST-DISASTER AI SEGMENTATION <span className="tabular-nums text-warning">26-MAY-2024</span>
              </div>
              {/* AI Detection boxes */}
              <div className="absolute top-[25%] right-[35%] border-2 border-critical bg-critical/20 rounded px-2 py-1">
                <span className="text-[10px] font-bold text-white">ROOF LOSS 85%</span>
              </div>
              <div className="absolute top-[40%] right-[28%] border-2 border-warning bg-warning/20 rounded px-2 py-1">
                <span className="text-[10px] font-bold text-white">LAPSE</span>
              </div>
              <div className="absolute top-[52%] right-[30%] border-2 border-critical bg-critical/20 rounded px-2 py-1">
                <span className="text-[10px] font-bold text-white">ROOF LOSS 79%</span>
              </div>
              {/* Water anomaly */}
              <div className="absolute bottom-[18%] left-[55%] bg-nav-primary/90 text-white text-[10px] rounded px-2 py-1">
                <span className="text-slate-400">ACTIVE WATER ANOMALY</span>
                <div className="font-semibold">MNDWI = +0.584 (Submerged Zone 4B)</div>
              </div>
            </div>

            {/* Slider handle */}
            <div className="absolute top-0 bottom-0 z-20" style={{ left: `${sliderPos}%` }}>
              <div className="w-[3px] h-full bg-white shadow-lg" />
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-nav-primary border-2 border-white flex items-center justify-center cursor-ew-resize shadow-lg"
                onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }}
              >
                <span className="text-white text-sm">↔</span>
              </div>
            </div>

            {/* Bottom coordinate */}
            <div className="absolute bottom-3 left-3 z-10 bg-nav-primary/85 backdrop-blur text-white text-[10px] rounded px-3 py-1.5 tabular-nums">
              LAT: 21°59'42.1"N
            </div>
          </div>

          {/* Controls bar */}
          <div className="px-3 py-2 border-t border-border flex items-center gap-3 bg-panel/50">
            <button onClick={() => setViewMode('split')} className={`px-2.5 py-1 rounded text-[11px] font-medium border transition ${viewMode === 'split' ? 'bg-primary/10 text-primary border-primary/30' : 'border-border text-text-secondary'}`}>
              ⧈ Split Mode
            </button>
            <button onClick={() => setViewMode('polygons')} className={`px-2.5 py-1 rounded text-[11px] font-medium border transition ${viewMode === 'polygons' ? 'bg-primary/10 text-primary border-primary/30' : 'border-border text-text-secondary'}`}>
              ◰ Polygons
            </button>
            <div className="flex items-center gap-2 ml-4">
              <span className="text-[11px] text-text-muted">Mask Opacity</span>
              <input type="range" min={0} max={100} value={maskOpacity} onChange={(e) => setMaskOpacity(Number(e.target.value))} className="w-24 h-1 accent-primary" />
              <span className="text-[11px] text-text-primary font-medium tabular-nums w-8">{maskOpacity}%</span>
            </div>
            <div className="ml-auto flex gap-1">
              {['🔍+', '🔍-', '🔍', '⊞'].map((icon, i) => (
                <button key={i} className="w-7 h-7 border border-border rounded flex items-center justify-center text-[12px] hover:bg-white transition">{icon}</button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="px-3 py-2 border-t border-border flex items-center gap-4 text-[11px] text-text-muted">
            <span className="font-semibold text-text-secondary">ACTIVE LEGEND:</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-critical rounded-sm" />Destroyed / Collapse ({breakdown.severeCollapse})</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-warning rounded-sm" />Partial / Major Roof Loss ({breakdown.partialDamage})</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-primary rounded-sm" />Submerged Ground ({breakdown.floodFootprint} km²)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-critical/60 rounded-sm" />Impassable Road Segments ({breakdown.roadCuts} cuts)</span>
          </div>

          {/* Basemap selector */}
          <div className="px-3 py-1.5 border-t border-border text-[10px] text-text-muted flex items-center gap-3">
            <span className="font-semibold">Basemap:</span>
            {['True Color (RGB)', 'False Color NIR', 'SWIR Penetration'].map((b) => (
              <button key={b} className="hover:text-primary transition">{b}</button>
            ))}
          </div>
        </div>

        {/* Right Detection Panel */}
        <div className="bg-surface border border-border rounded-lg overflow-y-auto">
          {/* Inference Pipeline */}
          <div className="px-3 py-2 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-semibold text-ai flex items-center gap-1.5"><Brain size={14} /> INFERENCE PIPELINE</span>
              <span className="text-[10px] text-success font-bold">STATUS: READY</span>
            </div>
            <div className="text-[13px] font-bold text-text-primary mb-1">{pipeline.modelName}</div>
            <p className="text-[11px] text-text-muted mb-2">{pipeline.backbone}</p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div><span className="text-text-muted block">Inference Time:</span><span className="font-bold tabular-nums">{(pipeline?.inferenceTime ?? 1420).toLocaleString()} ms</span></div>
              <div><span className="text-text-muted block">GPU:</span><span className="font-bold">{pipeline?.gpu || 'NVIDIA RTX A6000'}</span></div>
            </div>
          </div>

          {/* Detection Breakdown */}
          <div className="px-3 py-3 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[14px] font-semibold text-text-primary">Detection Breakdown</span>
              <span className="text-[10px] text-text-muted">Sector 4 Total</span>
            </div>

            {/* Buildings */}
            <div className="border border-border rounded-lg p-3 mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] font-semibold text-text-primary flex items-center gap-1">🏢 Buildings Analyzed</span>
                <span className="text-[14px] font-bold tabular-nums">{breakdown.buildingsAnalyzed.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-4 text-[11px]">
                <span>Severe Collapse: <strong className="text-critical tabular-nums">{breakdown.severeCollapse.toLocaleString()}</strong></span>
                <span>Partial: <strong className="text-warning tabular-nums">{breakdown.partialDamage}</strong></span>
              </div>
              <div className="text-[11px] text-critical font-bold mt-1 tabular-nums">{breakdown.destroyedPercent}% Destroyed</div>
              <div className="h-1.5 bg-panel rounded-full mt-1 overflow-hidden">
                <div className="h-full bg-critical rounded-full" style={{ width: `${breakdown.destroyedPercent}%` }} />
              </div>
            </div>

            {/* Roads */}
            <div className="border border-border rounded-lg p-3 mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] font-semibold text-text-primary flex items-center gap-1">🛤 Road Segments</span>
                <span className="text-[14px] font-bold tabular-nums">{breakdown.roadSegments} segments</span>
              </div>
              <div className="flex items-center gap-4 text-[11px]">
                <span>Cut / Impassable: <strong className="text-critical tabular-nums">{breakdown.roadCuts} cuts</strong></span>
                <span>Blocked Length: <strong className="text-critical tabular-nums">{breakdown.blockedLength} km</strong></span>
              </div>
              <div className="h-1.5 bg-panel rounded-full mt-1 overflow-hidden">
                <div className="h-full bg-critical rounded-full" style={{ width: `${(breakdown.roadCuts / breakdown.roadSegments) * 100}%` }} />
              </div>
            </div>

            {/* Flood */}
            <div className="border border-border rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] font-semibold text-text-primary flex items-center gap-1">🌊 Inundated Flood Footprint</span>
                <span className="text-[14px] font-bold text-primary tabular-nums">{breakdown.floodFootprint} km²</span>
              </div>
              <p className="text-[11px] text-text-muted">Water expansion rate is <strong className="text-critical">{breakdown.waterExpansion}</strong> over baseline river channel.</p>
            </div>
          </div>

          {/* Confidence Metrics */}
          <div className="px-3 py-3 border-b border-border">
            <span className="label-uppercase text-text-secondary text-[10px] mb-2 block">INFERENCE CONFIDENCE METRICS</span>
            <div className="space-y-2">
              {[
                { label: 'Building Collapse Extraction', value: 94.2, tier: 'High' },
                { label: 'Flood Boundary Extraction', value: 96.8, tier: 'Very High' },
                { label: 'Road Obstruction / Debris', value: 89.1, tier: 'Moderate-High' },
              ].map((m) => (
                <div key={m.label} className="flex items-center justify-between text-[12px]">
                  <span className="text-text-primary font-medium">{m.label}</span>
                  <span className={`font-bold tabular-nums ${m.value >= 95 ? 'text-success' : m.value >= 90 ? 'text-primary' : 'text-warning'}`}>
                    {m.value}% ({m.tier})
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Mission Response Actions */}
          <div className="px-3 py-3">
            <span className="label-uppercase text-text-secondary text-[10px] mb-2 block">MISSION RESPONSE ACTIONS</span>
            <div className="space-y-2">
              <button className="w-full bg-primary hover:bg-primary-hover text-white text-[12px] font-semibold py-2 rounded transition flex items-center justify-center gap-1.5">
                <CheckCircle size={14} /> Commit Detections to GIS Map
              </button>
              <button className="w-full bg-critical hover:bg-critical-hover text-white text-[12px] font-semibold py-2 rounded transition flex items-center justify-center gap-1.5">
                <Zap size={14} /> Prioritize Evacuation in Sector 4B
              </button>
              <button className="w-full border border-border text-text-secondary text-[12px] font-medium py-2 rounded hover:bg-panel transition flex items-center justify-center gap-1.5">
                <Download size={14} /> Download Mask Shapefile / GeoJSON
              </button>
            </div>
          </div>

          {/* GIS Validation */}
          <div className="px-3 py-2 border-t border-border">
            <div className="flex items-center gap-2 text-[11px] text-text-muted">
              <span className="w-6 h-6 rounded-full bg-panel flex items-center justify-center text-[10px]">👤</span>
              <div>
                <span className="label-uppercase text-[9px]">GIS LEAD VALIDATION</span>
                <div className="text-text-primary font-medium">Cmdr. S. Jenkins (Verified)</div>
              </div>
              <span className="ml-auto tabular-nums text-[10px]">14:02 UTC</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Spectral Indices */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { title: 'MNDWI WATER INUNDATION DELTA', value: '+310%', desc: 'Significant coastal intrusion; water absorption verified in Band 11.', color: 'text-primary', bars: ['#0a4a8a', '#1a6aba', '#2a8ada', '#3aaafa', '#4acaff'] },
          { title: 'NDVI CANOPY STRIPPING', value: '-48.2%', desc: 'Severe defoliation across agricultural buffer sectors 4B and 4C.', color: 'text-critical', bars: ['#dc2626', '#ef4444', '#f87171', '#dc2626', '#ef4444'] },
          { title: 'INTERFEROMETRIC COHERENCE (SAR)', value: 'γ = 0.22', desc: 'Critical decorrelation indicative of widespread structural failure.', color: 'text-text-primary', bars: ['#6366f1', '#818cf8', '#a5b4fc', '#6366f1', '#818cf8'] },
        ].map((idx) => (
          <div key={idx.title} className="bg-surface border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="label-uppercase text-text-muted text-[10px]">{idx.title}</span>
              <span className={`text-[16px] font-bold tabular-nums ${idx.color}`}>{idx.value}</span>
            </div>
            <p className="text-[11px] text-text-secondary mb-3">{idx.desc}</p>
            <div className="flex gap-1 h-8">
              {idx.bars.map((c, i) => (
                <div key={i} className="flex-1 rounded" style={{ backgroundColor: c, height: `${50 + Math.random() * 50}%`, alignSelf: 'flex-end' }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
