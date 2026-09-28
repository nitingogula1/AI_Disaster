import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline, Circle } from 'react-leaflet';
import L from 'leaflet';
import { Search, Layers, Navigation, Maximize, Download, Radio } from 'lucide-react';
import { gisService } from '../../services/api';
import { mockMapLayers } from '../../data/mockData';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const floodPolygon: [number, number][] = [
  [21.86, 89.52], [21.87, 89.56], [21.855, 89.58], [21.83, 89.57], [21.82, 89.54], [21.83, 89.51],
];
const blockedRoads: [number, number][][] = [
  [[21.845, 89.50], [21.86, 89.56]],
  [[21.83, 89.53], [21.82, 89.58]],
  [[21.835, 89.48], [21.85, 89.51]],
];
const rescueZones: { center: [number, number]; label: string; civilians: number }[] = [
  { center: [21.845, 89.545], label: 'South Delta Comm. Center', civilians: 320 },
  { center: [21.86, 89.53], label: '542 Structures', civilians: 542 },
];

export default function GISMapPage() {
  const [layers, setLayers] = useState(mockMapLayers);
  const [searchQuery, setSearchQuery] = useState('Zone 4B - South Delta');
  const [basemap, setBasemap] = useState<'satellite' | 'vector' | 'thermal'>('satellite');
  const [selectedFilter, setSelectedFilter] = useState<string>('Critical (42)');

  useEffect(() => {
    const fetchLayers = async () => {
      try {
        const data = await gisService.getLayers();
        if (data && data.length > 0) {
          setLayers(data);
        }
      } catch (err) {
        console.error('Failed to load GIS layers:', err);
      }
    };
    fetchLayers();
  }, []);

  const toggleLayer = (id: string) => {
    setLayers((prev) => prev.map((l) => l.id === id ? { ...l, visible: !l.visible } : l));
  };

  return (
    <div className="flex h-[calc(100vh-48px)] animate-fade-in">
      {/* Left Panel — Layers */}
      <div className="w-[280px] bg-surface border-r border-border flex flex-col overflow-y-auto flex-shrink-0">
        {/* Header */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-bold text-critical flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-critical animate-pulse-critical" />
              LIVE GIS INCIDENT
            </span>
            <span className="px-2 py-0.5 bg-critical/10 text-critical text-[10px] font-bold rounded">Delta Sector 4</span>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-8 border border-border-input rounded text-[12px] outline-none focus:border-primary transition"
            />
          </div>
        </div>

        {/* Severity Filters */}
        <div className="flex flex-wrap gap-1.5 p-3 border-b border-border">
          {['Critical (42)', 'High (118)', 'Moderate', 'Safe'].map((f) => (
            <button
              key={f}
              onClick={() => setSelectedFilter(f)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium border transition ${
                selectedFilter === f
                  ? f.includes('Critical') ? 'bg-critical text-white border-critical' : 'bg-primary/10 text-primary border-primary/30'
                  : 'bg-surface text-text-secondary border-border hover:border-border-strong'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Threat & Hazard Layers */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="label-uppercase text-text-secondary text-[10px]">THREAT & HAZARD LAYERS</span>
            <span className="text-[10px] text-primary font-semibold">5 ACTIVE</span>
          </div>
          <div className="space-y-2">
            {layers.filter((l) => l.type === 'hazard').map((layer) => (
              <div key={layer.id} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={layer.visible}
                  onChange={() => toggleLayer(layer.id)}
                  className="mt-0.5 w-4 h-4 rounded border-border-input text-primary focus:ring-primary"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-medium text-text-primary">{layer.name}</span>
                    {layer.aiVerified && <span className="text-[10px] text-critical font-semibold">AI Verified</span>}
                  </div>
                  <span className="text-[11px] text-text-muted">{layer.description}</span>
                  {layer.id === 'lyr-flood' && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-text-muted">Opacity</span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={layer.opacity}
                        onChange={(e) => setLayers((prev) => prev.map((l) => l.id === layer.id ? { ...l, opacity: Number(e.target.value) } : l))}
                        className="flex-1 h-1 accent-primary"
                      />
                      <span className="text-[10px] text-text-primary font-medium tabular-nums">{layer.opacity}%</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Response & Logistics */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="label-uppercase text-text-secondary text-[10px]">RESPONSE & LOGISTICS</span>
            <span className="text-[10px] text-primary font-semibold">2 ACTIVE</span>
          </div>
          <div className="space-y-2">
            {layers.filter((l) => l.type === 'response').map((layer) => (
              <div key={layer.id} className="flex items-start gap-2">
                <input type="checkbox" checked={layer.visible} onChange={() => toggleLayer(layer.id)} className="mt-0.5 w-4 h-4 rounded border-border-input text-primary focus:ring-primary" />
                <div className="flex-1 min-w-0">
                  <span className="text-[12px] font-medium text-text-primary block">{layer.name}</span>
                  <span className="text-[11px] text-text-muted">{layer.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Infrastructure */}
        <div className="p-3 border-t border-border">
          <div className="space-y-2">
            {layers.filter((l) => l.type === 'infrastructure').map((layer) => (
              <div key={layer.id} className="flex items-start gap-2">
                <input type="checkbox" checked={layer.visible} onChange={() => toggleLayer(layer.id)} className="mt-0.5 w-4 h-4 rounded border-border-input text-text-muted" />
                <div className="flex-1 min-w-0">
                  <span className="text-[12px] font-medium text-text-muted block">{layer.name}</span>
                  <span className="text-[11px] text-text-muted">{layer.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative">
        {/* Top Map Controls */}
        <div className="absolute top-3 left-3 right-3 z-[1000] flex items-center justify-between pointer-events-none">
          <div className="bg-nav-primary/90 backdrop-blur text-white text-[11px] rounded px-3 py-1.5 flex items-center gap-3 pointer-events-auto tabular-nums">
            <span>● SENTINEL-2C / STAC LIVE</span>
            <span>📍 21°54'10"N, 89°09'22"E</span>
            <span>Res: 10m/px • Cloud: 4.2%</span>
          </div>
          <div className="flex items-center gap-1.5 pointer-events-auto">
            {(['satellite', 'vector', 'thermal'] as const).map((b) => (
              <button
                key={b}
                onClick={() => setBasemap(b)}
                className={`px-3 py-1.5 rounded text-[11px] font-medium transition ${
                  basemap === b
                    ? 'bg-primary text-white'
                    : 'bg-white/90 backdrop-blur text-text-secondary border border-border hover:bg-white'
                }`}
              >
                {b === 'satellite' ? '🛰 Satellite Hybrid' : b === 'vector' ? '◉ Vector OSM' : '🌡 Thermal IR'}
              </button>
            ))}
          </div>
        </div>

        {/* Map */}
        <MapContainer
          center={[21.845, 89.54]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            url={
              basemap === 'satellite'
                ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                : basemap === 'thermal'
                ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
                : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            }
            attribution={
              basemap === 'satellite'
                ? 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics'
                : basemap === 'thermal'
                ? '&copy; CARTO'
                : '&copy; OpenStreetMap contributors'
            }
          />

          {/* Flood zone */}
          <Polygon positions={floodPolygon} pathOptions={{ color: '#0284C7', fillColor: '#0284C7', fillOpacity: 0.2, weight: 2, dashArray: '6 4' }} />

          {/* Blocked roads */}
          {blockedRoads.map((road, i) => (
            <Polyline key={i} positions={road} pathOptions={{ color: '#DC2626', weight: 3, dashArray: '8 4' }} />
          ))}

          {/* Rescue zones */}
          {rescueZones.map((zone, i) => (
            <Circle key={i} center={zone.center} radius={400} pathOptions={{ color: '#DC2626', fillColor: '#DC2626', fillOpacity: 0.1, weight: 1.5 }}>
              <Popup>
                <div className="p-3 min-w-[280px]">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-2 h-2 rounded-full bg-critical animate-pulse-critical" />
                    <span className="text-[10px] font-bold text-critical uppercase">PRIORITY ALPHA: CRITICAL RESCUE</span>
                  </div>
                  <h3 className="text-[15px] font-bold text-text-primary mb-1">{zone.label}</h3>
                  <p className="text-[11px] text-text-muted mb-2">Zone 4B • Lat {zone.center[0].toFixed(4)}°N, {zone.center[1].toFixed(4)}°E</p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-critical/10 rounded p-2">
                      <div className="text-[10px] text-critical font-semibold">Civilians Stranded</div>
                      <div className="text-[18px] font-bold text-critical tabular-nums">{zone.civilians} souls</div>
                    </div>
                    <div className="bg-primary/10 rounded p-2">
                      <div className="text-[10px] text-primary font-semibold">Flood Depth</div>
                      <div className="text-[18px] font-bold text-primary tabular-nums">1.2 meters</div>
                    </div>
                  </div>
                  <div className="space-y-1 mb-3 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-critical">⊘</span>
                      <span className="text-text-secondary"><strong className="text-critical">North Approach:</strong> Blocked (Bridge washed out)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-success">◉</span>
                      <span className="text-text-secondary"><strong className="text-success">West Approach:</strong> Navigable via Shallow Vessel</span>
                    </div>
                  </div>
                  <button className="w-full bg-critical hover:bg-critical-hover text-white text-[12px] font-semibold py-2 rounded transition flex items-center justify-center gap-1.5">
                    ▷ Assign RT-01
                  </button>
                </div>
              </Popup>
            </Circle>
          ))}

          {/* Rescue team marker */}
          <Marker position={[21.84, 89.55]}>
            <Popup>
              <div className="p-2 text-[12px]">
                <div className="font-bold text-primary">🚤 RT-01 (Amphibious)</div>
                <div className="text-text-muted">Status: Deployed • Speed: 18.4 kt</div>
              </div>
            </Popup>
          </Marker>
        </MapContainer>

        {/* Right side map controls */}
        <div className="absolute right-3 top-1/3 z-[1000] flex flex-col gap-1">
          {[
            { icon: '+', label: 'Zoom In' },
            { icon: '−', label: 'Zoom Out' },
            { icon: '◎', label: 'Locate' },
            { icon: '□', label: 'Layers' },
            { icon: '⟲', label: 'Refresh' },
            { icon: '↗', label: 'Share' },
            { icon: '📍', label: 'Pin' },
            { icon: '⊘', label: 'Alert' },
          ].map((c) => (
            <button
              key={c.label}
              title={c.label}
              className="w-8 h-8 bg-white/90 backdrop-blur border border-border rounded flex items-center justify-center text-[14px] text-text-secondary hover:bg-white hover:border-border-strong transition"
            >
              {c.icon}
            </button>
          ))}
        </div>

        {/* Severity Legend */}
        <div className="absolute bottom-3 left-3 z-[1000] flex items-center gap-3 bg-white/90 backdrop-blur border border-border rounded px-3 py-2 text-[11px]">
          <span className="font-semibold text-text-secondary">SEVERITY LEGEND</span>
          {[
            { color: 'bg-critical', label: 'Critical' },
            { color: 'bg-secondary-blue', label: 'High' },
            { color: 'bg-primary', label: 'Moderate' },
            { color: 'bg-success', label: 'Safe' },
            { color: 'bg-primary/40', label: 'Flood Mask' },
          ].map((s) => (
            <span key={s.label} className="flex items-center gap-1">
              <span className={`w-3 h-3 rounded-sm ${s.color}`} />
              {s.label}
            </span>
          ))}
        </div>

        {/* Bottom Action Bar */}
        <div className="absolute bottom-3 right-3 z-[1000] flex items-center gap-2">
          <button className="flex items-center gap-1.5 bg-critical hover:bg-critical-hover text-white text-[11px] font-semibold px-3 py-2 rounded transition">
            <Radio size={12} />
            Dispatch Nearest Unit
          </button>
          <button className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-[11px] font-semibold px-3 py-2 rounded transition">
            Recalculate Route
          </button>
          <button className="flex items-center gap-1.5 bg-white border border-border text-text-secondary text-[11px] font-medium px-3 py-2 rounded hover:bg-panel transition">
            <Download size={12} />
            Export (GeoJSON)
          </button>
        </div>
      </div>
    </div>
  );
}
