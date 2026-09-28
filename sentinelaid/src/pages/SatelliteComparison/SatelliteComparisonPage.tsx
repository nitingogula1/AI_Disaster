import { useState, useRef, useCallback, useEffect } from 'react';
import { RefreshCw, Download, Send, Eye } from 'lucide-react';
import { ProcessingStatusBadge } from '../../components/common/StatusBadges';
import { satelliteService } from '../../services/api';
import { mockPreprocessingStages } from '../../data/mockData';
import type { PreprocessingStage } from '../../types';

export default function SatelliteComparisonPage() {
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeView, setActiveView] = useState('RGB True Color (B4-3-2)');
  const [stages, setStages] = useState<PreprocessingStage[]>(mockPreprocessingStages);
  const [calibrating, setCalibrating] = useState(false);

  const runCalibration = async () => {
    setCalibrating(true);
    try {
      const res = await satelliteService.processImagery({
        disaster_id: 'evt-remal-001',
        calculate_mndwi: true,
        calculate_ndvi: true,
        cloud_masking: true
      });
      if (res && res.length) setStages(res);
    } catch {
      // Fallback
    } finally {
      setCalibrating(false);
    }
  };

  useEffect(() => {
    runCalibration();
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    setSliderPos(Math.max(5, Math.min(95, x)));
  }, [isDragging]);

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      {/* Breadcrumb */}
      <div className="text-[11px] text-text-muted">
        OPERATIONS / SATELLITE IMAGERY / <span className="text-primary font-semibold">COMPARISON & PREPROCESSING (#PRC-2024-0526)</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-text-primary">Satellite Image Comparison & Preprocessing Workspace</h1>
          <div className="flex items-center gap-3 mt-1 text-[11px] text-text-muted">
            <span className="text-primary font-semibold">● BOA Reflectance L2A</span>
            <span>◉ CRS: EPSG:32645 (WGS 84 / UTM 45N)</span>
            <span>Scene: S2B_MSIL2A_20240526T044719_N0510_R083</span>
            <span>• GSD: 10m/px Native Resampled</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={runCalibration} className="flex items-center gap-1.5 border border-border text-text-secondary text-[12px] font-medium px-3 py-1.5 rounded hover:bg-panel transition">
            <RefreshCw size={14} className={calibrating ? 'animate-spin' : ''} /> Re-Calibrate
          </button>
          <button className="flex items-center gap-1.5 border border-border text-text-secondary text-[12px] font-medium px-3 py-1.5 rounded hover:bg-panel transition">
            <Eye size={14} /> Cycle View Mode
          </button>
          <button className="flex items-center gap-1.5 border border-border text-text-secondary text-[12px] font-medium px-3 py-1.5 rounded hover:bg-panel transition">
            <Download size={14} /> Export GeoTIFF
          </button>
          <button className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-[12px] font-semibold px-3 py-1.5 rounded transition">
            <Send size={14} /> Send to AI Damage Model
          </button>
        </div>
      </div>

      {/* Date Panels */}
      <div className="grid grid-cols-[1fr_1fr_auto] gap-3">
        <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-2 flex items-center justify-between">
          <div>
            <span className="label-uppercase text-primary text-[10px] font-bold">PRE-DISASTER BASELINE</span>
            <span className="ml-4 text-[12px] font-medium text-primary">Sentinel-2A</span>
          </div>
          <span className="text-[11px] text-text-muted tabular-nums">12-May-2024 04:36 UTC • SCL Cloud: 0.8%</span>
        </div>
        <div className="bg-critical/5 border border-critical/20 rounded-lg px-4 py-2 flex items-center justify-between">
          <div>
            <span className="label-uppercase text-critical text-[10px] font-bold">POST-DISASTER SURGE</span>
            <span className="ml-4 text-[12px] font-medium text-critical">Sentinel-2B</span>
          </div>
          <span className="text-[11px] text-text-muted tabular-nums">26-May-2024 04:47 UTC • SCL Cloud: 3.8%</span>
        </div>
        <div className="bg-panel border border-border rounded-lg px-4 py-2">
          <span className="label-uppercase text-text-muted text-[10px]">Sub-Pixel Co-Registration</span>
          <div className="text-[12px] font-medium text-text-primary">Affine Matrix Locked • P...</div>
          <span className="text-[10px] text-success font-semibold tabular-nums">RMSE 0.18 px</span>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-1 mb-0">
        {['RGB True Color (B4-3-2)', 'False Color NIR (B8-4-3)', 'Water NDWI (B3-B8)', 'SWIR Flood (B12-8-4)'].map((v) => (
          <button
            key={v}
            onClick={() => setActiveView(v)}
            className={`px-3 py-1.5 rounded-t text-[12px] font-medium transition ${activeView === v ? 'bg-primary text-white' : 'bg-panel text-text-secondary hover:bg-white border border-border border-b-0'}`}
          >
            {v}
          </button>
        ))}
        <span className="ml-4 text-[11px] text-text-muted">Mode: <span className="text-primary font-semibold">Interactive Split Swipe</span></span>
      </div>

      {/* Main Content: Comparison + Preprocessing Stages */}
      <div className="grid grid-cols-[1fr_300px] gap-4">
        {/* Comparison Viewer */}
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          {/* Split View Comparison */}
          <div
            ref={containerRef}
            className="relative h-[500px] cursor-ew-resize select-none overflow-hidden"
            onMouseMove={handleMouseMove}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
          >
            {/* Pre-disaster (left) */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a4a3a] via-[#0d3a2d] to-[#0a2d1f]">
              <div className="absolute top-3 left-3 px-2 py-1 bg-primary/80 text-white text-[11px] font-semibold rounded z-10">
                ● PRE-DISASTER <span className="tabular-nums">12-MAY-2024</span>
              </div>
              {/* Pixel inspector overlay */}
              <div className="absolute top-14 left-3 bg-nav-primary/90 backdrop-blur text-white text-[11px] rounded p-3 z-10 min-w-[280px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-[10px] uppercase tracking-wider">PIXEL VALUE INSPECTOR</span>
                  <span className="text-[10px] text-text-muted">SYNCHRONIZED</span>
                </div>
                <div className="space-y-1 tabular-nums text-[11px]">
                  <div className="flex justify-between"><span className="text-slate-400">Crosshair Lat/Lon:</span><span>21°59'42.1"N, 89°32'10.4"E</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Pre BOA (B03/Green):</span><span>0.142 sr⁻¹</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Post BOA (B03/Green):</span><span>0.021 sr⁻¹ (Deep Water)</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">MNDWI Shift:</span><span className="text-primary font-bold">+0.684 (Inundated)</span></div>
                </div>
              </div>
            </div>

            {/* Post-disaster (right) - clipped */}
            <div
              className="absolute inset-0 bg-gradient-to-br from-[#0a2d4a] via-[#1a3a5a] to-[#0c2035]"
              style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
            >
              <div className="absolute top-3 right-3 px-2 py-1 bg-critical/80 text-white text-[11px] font-semibold rounded z-10">
                ● POST-DISASTER AI SEGMENTATION <span className="tabular-nums text-warning">26-MAY-2024</span>
              </div>
              {/* Damage annotations */}
              <div className="absolute top-[35%] right-[30%] px-2 py-1 bg-critical/80 text-white text-[10px] font-bold rounded">
                Embankment Breach (+4.2m Surge)
              </div>
              <div className="absolute bottom-[35%] right-[25%] px-2 py-1 bg-warning/80 text-white text-[10px] font-bold rounded">
                Flooded Coastal Transport Node
              </div>
            </div>

            {/* Slider */}
            <div
              className="absolute top-0 bottom-0 z-20"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="w-[3px] h-full bg-white shadow-lg" />
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-nav-primary border-2 border-white flex items-center justify-center cursor-ew-resize shadow-lg"
                onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }}
              >
                <span className="text-white text-sm">↔</span>
              </div>
            </div>

            {/* Bottom info bar */}
            <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between">
              <div className="bg-nav-primary/85 backdrop-blur text-white text-[10px] rounded px-3 py-1.5 tabular-nums flex items-center gap-4">
                <span>● PRE-DISASTER BASELINE</span>
                <span>△ N 0°</span>
                <span>━ 500 m</span>
                <span>Zoom: 100% (10m)</span>
                <span>□ S (26-MAY-2024 04:47)</span>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-[11px] text-text-muted bg-panel/50">
            <span className="font-semibold text-text-secondary">Spectral Index Heatmap Legend:</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#0a4a8a] rounded-sm" />Permanent Water</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#2080cc] rounded-sm" />Sudden Inundation Surge</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#a0842a] rounded-sm" />Saturated Mud / Sediment Silt</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#3a7a3a] rounded-sm" />Unaltered Terrestrial Canopy</span>
          </div>
          <div className="px-4 py-1.5 text-[10px] text-text-muted tabular-nums">
            ⏱ Delta T: 14 Days, 00h, 11m
          </div>
        </div>

        {/* Right Panel — Preprocessing Stages */}
        <div className="bg-surface border border-border rounded-lg overflow-y-auto">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-text-primary">⚙ Preprocessing Stages</h3>
            <span className="text-[10px] text-success font-bold">5 / 5 Verified</span>
          </div>
          <div className="p-3 space-y-4">
            {stages.map((stage) => (
              <div key={stage.id} className="border-b border-border pb-3 last:border-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-semibold text-text-primary flex items-center gap-1.5">
                    <span className="text-success">✓</span> {stage.id}. {stage.name}
                  </span>
                  <span className="text-[10px] text-primary font-medium">
                    {stage.id === 1 ? 'Sen2Cor v2.11' : stage.id === 2 ? 'AOT 0.124 Locked' : stage.id === 4 ? '10m B-Spline' : stage.id === 5 ? '2 Derived' : 'Active Mask'}
                  </span>
                </div>
                <p className="text-[11px] text-text-muted leading-relaxed">{stage.detail}</p>
                {stage.id === 3 && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="text-text-muted">SCL Cloud Exclusion Mask:</span>
                      <span className="text-text-primary font-medium">85% Opacity</span>
                    </div>
                    <input type="range" min={0} max={100} defaultValue={85} className="w-full h-1 accent-primary" />
                    <div className="flex justify-between text-[9px] text-text-muted mt-0.5">
                      <span>0% (Raw Scene)</span>
                      <span>Exclude Cirrus & Semi-Transparent</span>
                      <span>100%</span>
                    </div>
                  </div>
                )}
                {stage.id === 5 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between bg-primary/5 rounded px-2 py-1">
                      <span className="text-[11px] font-medium text-text-primary">MNDWI (Green - SWIR)</span>
                      <span className="text-[11px] font-bold text-primary tabular-nums">+18.64 km²</span>
                    </div>
                    <div className="text-[10px] text-text-muted">Threshold {'>'} +0.12 → New Flood Inundation</div>
                    <div className="flex items-center justify-between bg-critical/5 rounded px-2 py-1 mt-1">
                      <span className="text-[11px] font-medium text-text-primary">Vegetation Vigor Delta</span>
                      <span className="text-[11px] font-bold text-critical tabular-nums">-48.2%</span>
                    </div>
                    <div className="text-[10px] text-text-muted">Normalized Diff ΔNDVI → Canopy Loss Detected</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom: Verification + Action */}
      <div className="bg-success/10 border border-success/30 rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-success text-xl">✓</span>
          <div>
            <div className="text-[14px] font-bold text-text-primary">All 5 Preprocessing Stages Verified • Radiometric Consistency Validated</div>
            <div className="text-[12px] text-text-muted">COG Tile Cache generated • Zero geometric dri...</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="border border-border text-text-secondary text-[12px] font-medium px-3 py-1.5 rounded hover:bg-panel transition">📋 Preprocessing Report</button>
          <button className="border border-border text-text-secondary text-[12px] font-medium px-3 py-1.5 rounded hover:bg-panel transition">📥 Download Aligned COG</button>
          <button className="bg-primary hover:bg-primary-hover text-white text-[12px] font-semibold px-4 py-1.5 rounded transition">➡ Proceed to AI Damage Detection</button>
        </div>
      </div>
    </div>
  );
}
