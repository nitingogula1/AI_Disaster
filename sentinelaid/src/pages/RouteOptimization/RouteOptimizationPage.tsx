import { useState, useEffect } from 'react';
import { 
  Navigation, Route, Zap, AlertTriangle, ShieldCheck, CheckCircle, 
  Radio, Send, RefreshCw, Printer, Compass, Layers, Eye, Check, ChevronRight
} from 'lucide-react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { routeService } from '../../services/api';
import { mockRoutes } from '../../data/mockData';
import type { OptimizedRoute } from '../../types';

// Fix Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createWaypointIcon = (label: string, bgClass: string) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${bgClass}; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; border: 1.5px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); white-space: nowrap; font-family: monospace;">${label}</div>`,
    iconSize: [40, 20],
    iconAnchor: [20, 10],
  });
};

export const RouteOptimizationPage = () => {
  const [routes, setRoutes] = useState<OptimizedRoute[]>(mockRoutes);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('route-a');
  const [activeLayer, setActiveLayer] = useState<'multispectral' | 'ndwi' | 'sar'>('ndwi');
  const [avoidInundation, setAvoidInundation] = useState(true);
  const [excludeBridges, setExcludeBridges] = useState(true);
  const [prioritizePaved, setPrioritizePaved] = useState(true);
  const [transmissionSuccess, setTransmissionSuccess] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const data = await routeService.getRoutes();
        if (data && data.length > 0) {
          setRoutes(data);
        }
      } catch (err) {
        console.error('Error fetching routes:', err);
      }
    };
    fetchRoutes();
  }, []);

  const selectedRoute = routes.find(r => r.id === selectedRouteId) || routes[0];

  const handleTransmit = () => {
    setTransmissionSuccess(true);
    setTimeout(() => setTransmissionSuccess(false), 4000);
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await routeService.optimizeRoute({
        start_location: [selectedRoute.waypoints[0]?.position[0] || 21.87, selectedRoute.waypoints[0]?.position[1] || 89.60],
        destination: [selectedRoute.waypoints[selectedRoute.waypoints.length - 1]?.position[0] || 21.84, selectedRoute.waypoints[selectedRoute.waypoints.length - 1]?.position[1] || 89.54],
        avoid_inundation: avoidInundation,
        exclude_bridges: excludeBridges,
        prioritize_paved: prioritizePaved
      });
    } catch (e) {
      console.error('Recalculation error:', e);
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {transmissionSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-semibold">Route A data vector transmitted directly to Unit RT-02 HUD!</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-100 text-sky-700 border border-sky-200 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5" />
                TACTICAL NAVIGATION • A* / DIJKSTRA HYBRID ENGINE v4.2
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Emergency Route Optimization & Obstacle Avoidance
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Dynamic AI Dijkstra & A* Graph-Based Routing Accounting for Flood Depth, Debris, and Road Inundation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-semibold text-slate-700">Routing Engine: Operational</span>
              </div>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">Latency: <strong>42ms</strong></span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">Graph Nodes: <strong>18,420</strong></span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-purple-600" />
              <span>Satellite Obstacle Cache: <strong>6 mins old</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Route Mission Parameters & Trajectories (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Mission Parameters Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Route className="w-4 h-4 text-sky-600" />
                Route Mission Parameters
              </h2>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded">
                LIVE MISSION
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Origin */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  STARTING ORIGIN
                </label>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2 font-medium text-slate-800">
                  <div className="w-2.5 h-2.5 rounded-full border-2 border-sky-600 bg-white"></div>
                  <span>Command Station Alpha (HQ Base)</span>
                </div>
              </div>

              {/* Destination */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  DESTINATION TARGET
                </label>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2 font-medium text-slate-800">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-600"></div>
                  <span>Sector 4B Coastal Shelter Gate</span>
                </div>
              </div>

              {/* Assigned Team */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  ASSIGNED RESPONSE TEAM
                </label>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2 font-medium text-slate-800">
                  <span className="font-semibold text-sky-700">Rescue Team 02</span>
                  <span className="text-slate-500">(Water Rescue & Evac)</span>
                </div>
              </div>

              {/* Vehicle Specs */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  VEHICLE CLASSIFICATION & SPECS
                </label>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between font-medium text-slate-800">
                  <span>Amphibious Craft B-14</span>
                  <span className="px-2 py-0.5 bg-sky-100 text-sky-800 text-[10px] font-bold rounded">
                    MAX 0.8m H₂O
                  </span>
                </div>
              </div>

              {/* Hazard Constraints Checkboxes */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  AUTOMATED HAZARD CONSTRAINTS
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={avoidInundation} 
                    onChange={e => setAvoidInundation(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300" 
                  />
                  <span className="text-slate-700">Avoid Inundation Depth &gt; 0.4m</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={excludeBridges} 
                    onChange={e => setExcludeBridges(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300" 
                  />
                  <span className="text-slate-700">Exclude Structural Bridge Collapses</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={prioritizePaved} 
                    onChange={e => setPrioritizePaved(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300" 
                  />
                  <span className="text-slate-700">Prioritize Reinforced Paved Arteries</span>
                </label>
              </div>
            </div>
          </div>

          {/* Evaluated Graph Trajectories */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
              <span>EVALUATED GRAPH TRAJECTORIES (3)</span>
              <button 
                onClick={handleRecalculate}
                className="text-sky-600 hover:text-sky-700 font-semibold flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${recalculating ? 'animate-spin' : ''}`} />
                Re-score Graph
              </button>
            </div>

            {/* Route A Card */}
            <div 
              onClick={() => setSelectedRouteId('route-a')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedRouteId === 'route-a'
                  ? 'bg-sky-50/50 border-sky-400 ring-2 ring-sky-500/20 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-sky-700 uppercase tracking-wide">
                  ROUTE A • RECOMMENDED
                </span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                  OPTIMAL SAFE
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">West Levee Bypass</h3>
              
              <div className="grid grid-cols-3 gap-2 text-center py-2 bg-white rounded-lg border border-slate-100 mb-2">
                <div>
                  <div className="text-[10px] text-slate-400">Distance</div>
                  <div className="text-xs font-bold text-slate-800 font-mono">14.2 km</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Est. Time</div>
                  <div className="text-xs font-bold text-sky-600 font-mono">22 min</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Risk Factor</div>
                  <div className="text-xs font-bold text-emerald-600 font-mono">LOW (12%)</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <Check className="w-3.5 h-3.5" /> 0 Blocked Segments
                </span>
                <span>Max Depth: <strong>0.15m</strong></span>
              </div>
            </div>

            {/* Route B Card */}
            <div 
              onClick={() => setSelectedRouteId('route-b')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedRouteId === 'route-b'
                  ? 'bg-red-50/50 border-red-400 ring-2 ring-red-500/20 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-red-600 uppercase tracking-wide">
                  ROUTE B • HIGH HAZARD
                </span>
                <span className="px-2 py-0.5 bg-red-100 text-red-800 text-[10px] font-bold rounded">
                  SUBMERGED
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">Direct Delta Highway</h3>
              
              <div className="grid grid-cols-3 gap-2 text-center py-2 bg-white rounded-lg border border-slate-100 mb-2">
                <div>
                  <div className="text-[10px] text-slate-400">Distance</div>
                  <div className="text-xs font-bold text-slate-800 font-mono">9.8 km</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Est. Time</div>
                  <div className="text-xs font-bold text-slate-800 font-mono">16 min</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Risk Factor</div>
                  <div className="text-xs font-bold text-red-600 font-mono">CRITICAL (88%)</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-red-600 bg-red-50 p-1.5 rounded">
                <span className="flex items-center gap-1 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" /> Flash flood at km 5.2
                </span>
                <span className="font-bold">Depth: 1.10m</span>
              </div>
            </div>

            {/* Route C Card */}
            <div 
              onClick={() => setSelectedRouteId('route-c')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedRouteId === 'route-c'
                  ? 'bg-amber-50/50 border-amber-400 ring-2 ring-amber-500/20 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                  ROUTE C • CONGESTED
                </span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded">
                  CONGESTED
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">North Perimeter Ring</h3>
              
              <div className="grid grid-cols-3 gap-2 text-center py-2 bg-white rounded-lg border border-slate-100 mb-2">
                <div>
                  <div className="text-[10px] text-slate-400">Distance</div>
                  <div className="text-xs font-bold text-slate-800 font-mono">18.6 km</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Est. Time</div>
                  <div className="text-xs font-bold text-slate-800 font-mono">34 min</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Risk Factor</div>
                  <div className="text-xs font-bold text-amber-600 font-mono">MEDIUM (45%)</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Civilian Evac Jam</span>
                <span>Avg Spd: <strong>22 km/h</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Column: Interactive GIS Map & Obstacle Avoidance (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg relative">
            {/* Top Toolbar */}
            <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs text-white">
              <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
                <button 
                  onClick={() => setActiveLayer('multispectral')}
                  className={`px-2 py-1 rounded transition-colors ${activeLayer === 'multispectral' ? 'bg-sky-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Multispectral
                </button>
                <button 
                  onClick={() => setActiveLayer('ndwi')}
                  className={`px-2 py-1 rounded transition-colors ${activeLayer === 'ndwi' ? 'bg-sky-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  NDWI Water
                </button>
                <button 
                  onClick={() => setActiveLayer('sar')}
                  className={`px-2 py-1 rounded transition-colors ${activeLayer === 'sar' ? 'bg-sky-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  SAR Pen.
                </button>
              </div>

              <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
                <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                <span>GPS SYNC: RT-02 [21.8412°N, 89.9654°E]</span>
              </div>
            </div>

            {/* Map Container */}
            <div className="h-[520px] relative">
              <MapContainer
                center={[21.85, 89.56]}
                zoom={12}
                style={{ height: '100%', width: '100%' }}
                className="z-10"
              >
                <TileLayer
                  attribution='&copy; CARTO'
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
                />

                {/* Route A Path (Blue / Cyan) */}
                <Polyline
                  positions={mockRoutes[0].path}
                  pathOptions={{
                    color: selectedRouteId === 'route-a' ? '#0284c7' : '#94a3b8',
                    weight: selectedRouteId === 'route-a' ? 6 : 3,
                    opacity: selectedRouteId === 'route-a' ? 0.95 : 0.4,
                  }}
                />

                {/* Route B Path (Red Hazard) */}
                <Polyline
                  positions={mockRoutes[1].path}
                  pathOptions={{
                    color: selectedRouteId === 'route-b' ? '#dc2626' : '#f87171',
                    weight: selectedRouteId === 'route-b' ? 6 : 3,
                    dashArray: '8, 8',
                    opacity: selectedRouteId === 'route-b' ? 0.95 : 0.4,
                  }}
                />

                {/* Route C Path (Gray Congested) */}
                <Polyline
                  positions={mockRoutes[2].path}
                  pathOptions={{
                    color: selectedRouteId === 'route-c' ? '#d97706' : '#cbd5e1',
                    weight: selectedRouteId === 'route-c' ? 5 : 2,
                    opacity: selectedRouteId === 'route-c' ? 0.9 : 0.4,
                  }}
                />

                {/* Waypoint Markers */}
                <Marker position={[21.87, 89.60]} icon={createWaypointIcon('START: Alpha HQ', '#0284c7')}>
                  <Popup>Start Base: Command Station Alpha</Popup>
                </Marker>

                <Marker position={[21.855, 89.57]} icon={createWaypointIcon('WP-1: West Levee Rd', '#0284c7')}>
                  <Popup>WP-1: West Levee Road</Popup>
                </Marker>

                <Marker position={[21.845, 89.54]} icon={createWaypointIcon('WP-2: Sluice Gate 7', '#0284c7')}>
                  <Popup>WP-2: Sluice Gate 7</Popup>
                </Marker>

                <Marker position={[21.835, 89.52]} icon={createWaypointIcon('WP-3: High Causeway', '#0284c7')}>
                  <Popup>WP-3: High Causeway</Popup>
                </Marker>

                <Marker position={[21.84, 89.54]} icon={createWaypointIcon('DEST: Sector 4B', '#dc2626')}>
                  <Popup>Destination: Sector 4B Shelter Gate</Popup>
                </Marker>

                {/* Hazard Obstacle Pin */}
                <Marker position={[21.85, 89.56]} icon={createWaypointIcon('SUBMERGED (1.1m)', '#b91c1c')}>
                  <Popup>Flash flood hazard: road impassable</Popup>
                </Marker>
              </MapContainer>

              {/* Floating Legend */}
              <div className="absolute bottom-4 left-4 z-20 bg-slate-900/90 border border-slate-700/80 rounded-lg p-2.5 backdrop-blur text-[11px] text-slate-300 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ACTIVE VISUAL LEGEND</div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-1 bg-sky-500 rounded"></span>
                  <span>Route A: Selected Primary (Obstacle Cleared)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-1 bg-red-500 rounded"></span>
                  <span>Route B: Inundated Hazard Corridor</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-1 bg-amber-500 rounded"></span>
                  <span>Route C: Alternate Congestion Bypass</span>
                </div>
              </div>
            </div>

            {/* Map Telemetry Footer */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Dynamic Re-Routing: Active
                </span>
                <span>Sensor Mesh updates every <strong>30s</strong></span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px]">
                <span>Waypoints: <strong>5 Plotted</strong></span>
                <span>•</span>
                <span>Geofence: <strong className="text-emerald-400">Secure</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Route Telemetry & Turn-by-Turn Instructions (3 cols) */}
        <div className="lg:col-span-3 space-y-5">
          {/* Telemetry Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-sky-600" />
                {selectedRoute.name} Telemetry
              </h2>
              <span className="px-2 py-0.5 bg-sky-100 text-sky-800 text-[10px] font-bold rounded">
                92% CONFIDENCE
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">Total Distance</span>
                <span className="font-bold text-slate-900 font-mono text-sm">{selectedRoute.distance} km</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">Est. Travel Time</span>
                <span className="font-bold text-sky-600 font-mono text-sm">{selectedRoute.estimatedTime} minutes</span>
              </div>

              <div className="pb-2 border-b border-slate-100">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-slate-500">Road Quality Index</span>
                  <span className="font-bold text-slate-800 font-mono">92/100</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-sky-600 h-full rounded-full" style={{ width: '92%' }}></div>
                </div>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">Flood Crossings</span>
                <span className="font-bold text-slate-800 font-mono">0 Crit (1 Minor splash)</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Corridor Clearance</span>
                <span className="font-bold text-emerald-600 font-mono">98% Open</span>
              </div>
            </div>
          </div>

          {/* Turn-by-Turn Instruction Preview */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              TURN-BY-TURN INSTRUCTION PREVIEW
            </h2>

            <div className="space-y-3 text-xs relative pl-4 border-l-2 border-slate-200">
              <div className="relative">
                <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-sky-600"></div>
                <div className="font-mono text-[11px] text-sky-700 font-bold">0.0 km</div>
                <div className="font-semibold text-slate-800 mt-0.5">Depart Base Alpha East Gate</div>
                <div className="text-[11px] text-slate-500">Head south along reinforced taxiway</div>
              </div>

              <div className="relative">
                <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                <div className="font-mono text-[11px] text-slate-600 font-bold">4.2 km</div>
                <div className="font-semibold text-slate-800 mt-0.5">Turn Right onto Bypass Rd 14</div>
                <div className="text-[11px] text-emerald-600 font-medium">Clear of debris & overhead wire hazard</div>
              </div>

              <div className="relative">
                <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                <div className="font-mono text-[11px] text-slate-600 font-bold">9.1 km</div>
                <div className="font-semibold text-slate-800 mt-0.5">Cross Reinforced Causeway</div>
                <div className="text-[11px] text-slate-500">Monitored safe • Water depth 0.12m</div>
              </div>

              <div className="relative">
                <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-red-600"></div>
                <div className="font-mono text-[11px] text-red-600 font-bold">14.2 km</div>
                <div className="font-semibold text-slate-800 mt-0.5">Arrive Sector 4B Shelter Gate</div>
                <div className="text-[11px] text-slate-500">North triage staging access point</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5">
            <button 
              onClick={handleTransmit}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm rounded-xl transition-colors shadow-md"
            >
              <Radio className="w-4 h-4 animate-pulse" />
              Transmit Route to Team RT-02
            </button>

            <button 
              onClick={handleRecalculate}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-purple-600" />
              Recalculate with Drone Feeds
            </button>

            <button 
              onClick={() => window.print()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs rounded-xl transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Tactical Route Sheet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
