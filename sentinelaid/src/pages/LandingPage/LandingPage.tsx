import { useNavigate } from 'react-router-dom';
import { Satellite, Brain, Map, ShieldAlert, Route, FileText, Zap, Layers, Target, Radio } from 'lucide-react';
import SentinelAidLogo from '../../components/common/SentinelAidLogo';

const NAV_LINKS = ['Solutions', 'Satellite & AI Tech', 'GIS Mapping', 'Rescue Optimization', 'Documentation', 'Case Studies'];

const FEATURES = [
  { icon: Satellite, title: 'Automated STAC Satellite Ingestion', desc: 'Real-time querying of Microsoft Planetary Computer Sentinel-2 Level-2A imagery with automated cloud masking using Scene Classification Layer (SCL) filtering.', protocol: 'Telemetry Protocol', value: 'STAC API v1.0 • COG Streaming' },
  { icon: Brain, title: 'Deep Learning Damage Detection', desc: 'Dual-stream Siamese CNN & Vision Transformer models detecting building structural collapses, partial failures, and debris spreads from pre/post imagery passes.', protocol: 'Model Architecture', value: 'Siamese SegFormer + FPN Decoder' },
  { icon: Layers, title: 'Spectral Water & Flood Indexing', desc: 'High-precision MNDWI & NDWI indices mapping water inundation dynamics, shoreline variations, and submerged municipal infrastructure boundaries.', protocol: 'Spectral Math', value: '(Green - SWIR) / (Green + SWIR)' },
  { icon: ShieldAlert, title: 'Life-Safety Rescue Prioritization', desc: 'Multi-criteria decision engine dynamically evaluating building occupancy, casualty risk, critical healthcare proximity, and population density metrics.', protocol: 'Triage Engine', value: 'Multi-Attribute Utility Theory (MAUT)' },
  { icon: Route, title: 'Dynamic Graph Route Optimization', desc: 'A* & Dijkstra pathfinding algorithms routing first responders around flooded segments, collapsed overpasses, and heavy obstacle debris corridors.', protocol: 'Routing Topology', value: 'OSM Directed Graph + Dynamic Edge Weights' },
  { icon: FileText, title: 'Official Assessment PDF Generation', desc: 'Automated compilation of executive situation reports adhering to international disaster response standards (INSARAG & FEMA format compliance).', protocol: 'Compliance Standard', value: 'ISO 22320 • UN-SPIDER Harmonized' },
];

const PIPELINE = [
  { num: '01', icon: Satellite, title: 'Orbit & Acquire', desc: 'Automated triggers watch for localized calamity triggers via Copernicus Hub & Planetary Computer STAC endpoint feeds.', stat: 'Latency: < 8 mins' },
  { num: '02', icon: Layers, title: 'Preprocess & Align', desc: 'Cloud masking, sub-pixel orthorectification, and radiometric calibration align pre-event and post-event multispectral rasters.', stat: 'Atmospheric: BOA Corrected' },
  { num: '03', icon: Brain, title: 'AI Segmentation', desc: 'Computer vision transformers segment collapsed structures, calculate water indices, and score spatial severity matrices.', stat: 'F1-Score: 0.914' },
  { num: '04', icon: Target, title: 'Tactical Dispatch', desc: 'Graph routes bypass impassable barriers and generate high-density PDF situational briefs directly to responder tablet units.', stat: 'Protocol: GeoJSON / PDF Brief' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-border z-50 flex items-center px-6">
        <div className="flex items-center gap-2.5 mr-8">
          <SentinelAidLogo size={32} />
          <div>
            <span className="text-[14px] font-bold text-text-primary">SentinelAid AI</span>
            <span className="text-[10px] text-text-muted ml-1 uppercase tracking-wider">DISASTER RESPONSE INTELLIGENCE</span>
          </div>
        </div>
        <div className="hidden lg:flex items-center gap-6 flex-1">
          {NAV_LINKS.map((l) => (
            <button key={l} className="text-[13px] text-text-secondary hover:text-text-primary transition">{l}</button>
          ))}
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <button className="text-[13px] text-primary font-medium border border-primary/30 rounded px-4 py-1.5 hover:bg-primary/5 transition">
            View System Demo
          </button>
          <button
            onClick={() => navigate('/login')}
            className="text-[13px] text-white font-semibold bg-nav-primary hover:bg-nav-secondary rounded px-4 py-1.5 transition"
          >
            🔑 Access Command Center
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Mission badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-6">
            <Zap size={14} className="text-primary" />
            <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">MISSION-CRITICAL PLANETARY INTELLIGENCE</span>
            <span className="text-text-muted text-[11px]">•</span>
            <span className="text-text-secondary text-[11px]">Operational v3.4 L2A</span>
          </div>

          <h1 className="text-[36px] lg:text-[44px] font-bold text-text-primary leading-tight mb-4">
            AI-Powered Disaster Response Using Satellite Intelligence
          </h1>
          <p className="text-text-secondary text-[16px] leading-relaxed max-w-2xl mx-auto mb-8">
            Detect structural damage, assess flooded regions in minutes, prioritize life-saving rescue operations, and calculate obstacle-free emergency routes using Sentinel-2 imagery, deep computer vision, and GIS graph networks.
          </p>

          <div className="flex items-center justify-center gap-4 mb-12">
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white font-semibold px-6 py-2.5 rounded transition"
            >
              <Zap size={16} />
              Launch Incident Command Center
            </button>
            <button className="flex items-center gap-2 border border-border text-text-secondary font-medium px-6 py-2.5 rounded hover:bg-panel transition">
              <Map size={16} />
              Explore Live Sandbox
            </button>
          </div>

          {/* Hero Image — Satellite/map composite */}
          <div className="relative rounded-xl overflow-hidden border border-border shadow-lg bg-nav-primary">
            <div className="aspect-[16/9] flex items-center justify-center relative">
              <div className="absolute inset-0 bg-gradient-to-br from-nav-primary via-[#0c2d4a] to-nav-secondary" />
              <div className="relative z-10 flex flex-col items-center justify-center text-white/90 gap-4">
                <div className="grid grid-cols-2 gap-4 w-full max-w-2xl px-8">
                  <div className="bg-white/10 border border-white/20 rounded-lg p-4 text-left">
                    <div className="text-[10px] uppercase tracking-wider text-primary-light mb-1">TARGET ACQUISITION</div>
                    <div className="text-[13px] font-medium">Sentinel-2B • Orbit 142 • 10m Ground Res</div>
                    <div className="mt-4 h-32 bg-white/5 rounded border border-white/10 flex items-center justify-center">
                      <div className="text-center text-[11px] text-white/50">
                        <Satellite size={32} className="mx-auto mb-2 text-primary-light" />
                        Pre/Post Disaster Imagery
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/10 border border-white/20 rounded-lg p-4 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full bg-critical animate-pulse-critical" />
                      <span className="text-[10px] uppercase tracking-wider text-critical">CRITICAL ALERT: FLOOD ZONE DETECTED</span>
                    </div>
                    <div className="mt-4 h-32 bg-white/5 rounded border border-white/10 flex items-center justify-center">
                      <div className="text-center text-[11px] text-white/50">
                        <Brain size={32} className="mx-auto mb-2 text-ai-light" />
                        AI Segmentation Output
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <span className="flex items-center gap-1 text-[10px]"><span className="w-2 h-2 bg-critical rounded-sm" />Structural Collapse</span>
                      <span className="flex items-center gap-1 text-[10px]"><span className="w-2 h-2 bg-primary rounded-sm" />Inundation Polygon</span>
                      <span className="flex items-center gap-1 text-[10px]"><span className="w-2 h-2 bg-success rounded-sm" />Optimized Route</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[12px] text-white/60 mt-2">
                  <span>AI INFERENCE: Dual-Stream Siamese ResNet5G</span>
                  <span>•</span>
                  <span>CLOUD MASK (SCL): 0.82% Obscured</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            {[
              { value: '94.2%', label: 'AI Damage Confidence via Siamese v3T', icon: '🎯' },
              { value: '10m Res', label: 'Ground Spatial Resolution via Sentinel-2', icon: '🛰️' },
              { value: '< 15 Mins', label: 'Turnaround from Orbital Pass to Field', icon: '⚡' },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-3 bg-panel border border-border rounded-lg px-4 py-3">
                <span className="text-2xl">{s.icon}</span>
                <div className="text-left">
                  <div className="text-[18px] font-bold text-text-primary tabular-nums">{s.value}</div>
                  <div className="text-[11px] text-text-muted">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Capabilities */}
      <section className="py-16 px-6 bg-canvas">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="label-uppercase text-primary text-[11px]">CORE ALGORITHMIC ENGINES</span>
            <h2 className="text-[28px] font-bold text-text-primary mt-2 mb-3">
              Technical Capabilities & Deep Geospatial Infrastructure
            </h2>
            <p className="text-text-secondary text-[14px] max-w-2xl mx-auto">
              Engineered for incident commanders and disaster analysts requiring rapid, high-confidence situational telemetry under extreme operational constraints.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <div key={i} className="bg-surface border border-border rounded-lg p-5 hover:border-border-strong transition group">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/15 transition">
                  <f.icon size={20} className={i === 1 || i === 3 ? 'text-ai' : 'text-primary'} />
                </div>
                <h3 className="text-[15px] font-semibold text-text-primary mb-2">{f.title}</h3>
                <p className="text-text-secondary text-[12px] leading-relaxed mb-4">{f.desc}</p>
                <div className="pt-3 border-t border-border">
                  <div className="text-[11px] text-text-muted">{f.protocol}</div>
                  <div className="text-[11px] text-text-primary font-medium">{f.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Operational Pipeline */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="label-uppercase text-primary text-[11px]">OPERATIONAL PIPELINE</span>
            <h2 className="text-[28px] font-bold text-text-primary mt-2 mb-3">
              From Orbital Telemetry to Field Execution
            </h2>
            <p className="text-text-secondary text-[14px]">
              An automated four-stage continuous ingestion, inference, and tactical dispatch sequence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {PIPELINE.map((p, i) => (
              <div key={i} className="bg-surface border border-border rounded-lg p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] text-text-muted font-mono">{p.num}</span>
                  <p.icon size={16} className="text-primary" />
                </div>
                <h3 className="text-[14px] font-semibold text-text-primary mb-2">{p.title}</h3>
                <p className="text-text-secondary text-[12px] leading-relaxed mb-4">{p.desc}</p>
                <div className="text-[11px] text-text-muted tabular-nums">{p.stat}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-nav-primary text-white py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <SentinelAidLogo size={28} />
                <span className="text-[14px] font-bold">SentinelAid AI</span>
              </div>
              <p className="text-slate-400 text-[12px] leading-relaxed">
                High-density satellite disaster response intelligence platform built for academic research, civil protection authorities, and humanitarian missions globally.
              </p>
              <div className="mt-3 text-[10px] text-slate-500">
                System Status: 100% Operational • 99.98% Uptime SLA
              </div>
            </div>
            {[
              { title: 'CAPABILITIES', links: ['Optical Damage Scoring', 'MNDWI Water Boundaries', 'Rescue Priority Algorithm', 'Dynamic Obstacle Routing', 'Situation Brief Generation'] },
              { title: 'STANDARDS & GIS', links: ['OGC WMS / WFS Feeds', 'STAC Catalog Browser', 'INSARAG Compliance', 'GDACS Early Warnings', 'Copernicus EMS Sync'] },
              { title: 'PLATFORM & GOV', links: ['Command Center Login', 'Security Whitepaper', 'API Keys & SDKs', 'Hackathon Sandbox', 'Incident Support'] },
            ].map((col, i) => (
              <div key={i}>
                <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((l) => (
                    <li key={l}><button className="text-[12px] text-slate-300 hover:text-white transition">{l}</button></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 pt-4 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-[10px] text-slate-500">
              <span>Powered by:</span>
              {['Sentinel-2 L2A', 'Planetary Computer STAC', 'PyTorch CV', 'Leaflet GIS', 'FastAPI & GeoPandas', 'JWT Encrypted Command'].map((t) => (
                <span key={t} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-slate-400">{t}</span>
              ))}
            </div>
            <div className="text-[10px] text-slate-500">
              © SentinelAid Disaster Intelligence Initiative. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
