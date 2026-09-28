import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Search, MapPin, Calendar, Layers, RefreshCw, Download, 
  Send, Eye, AlertCircle, CheckCircle2, ChevronRight, Sliders,
  ArrowRight, ShieldAlert, Sparkles, Filter, ExternalLink, Info
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Rectangle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import { placesService, satelliteService, stacService, type PlaceItem } from '../../services/api';

// Fix Leaflet default icon issues in bundled environments
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MapRecenter({ center, bbox }: { center: [number, number]; bbox?: [number, number, number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (bbox && bbox.length === 4) {
      // bbox is [min_lon, min_lat, max_lon, max_lat] -> Leaflet bounds: [[min_lat, min_lon], [max_lat, max_lon]]
      map.fitBounds([
        [bbox[1], bbox[0]],
        [bbox[3], bbox[2]]
      ], { padding: [30, 30], maxZoom: 14 });
    } else {
      map.setView(center, 11);
    }
  }, [center, bbox, map]);
  return null;
}

export default function SatelliteComparisonPage() {
  // Place search state
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceItem[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [placeStatus, setPlaceStatus] = useState<any>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlaceItem>({
    name: 'Khulna Division, Ganges-Brahmaputra Delta',
    latitude: 22.8456,
    longitude: 89.5403,
    bbox: [89.310, 21.540, 90.040, 22.120],
    country: 'Bangladesh',
    region: 'Khulna'
  });

  // AOI parameters
  const [aoiRadiusKm, setAoiRadiusKm] = useState(25);
  const [customBbox, setCustomBbox] = useState<[number, number, number, number]>([89.310, 21.540, 90.040, 22.120]);
  const [cloudMax, setCloudMax] = useState(20);

  // Date ranges for scene discovery
  const [preStartDate, setPreStartDate] = useState('2024-05-01');
  const [preEndDate, setPreEndDate] = useState('2024-05-15');
  const [postStartDate, setPostStartDate] = useState('2024-05-20');
  const [postEndDate, setPostEndDate] = useState('2024-06-02');

  // Discovered scenes
  const [isSearchingScenes, setIsSearchingScenes] = useState(false);
  const [preScenes, setPreScenes] = useState<any[]>([]);
  const [postScenes, setPostScenes] = useState<any[]>([]);
  const [selectedPreScene, setSelectedPreScene] = useState<any>(null);
  const [selectedPostScene, setSelectedPostScene] = useState<any>(null);
  const [sceneSearchError, setSceneSearchError] = useState<string | null>(null);

  // Comparison execution & results
  const [comparisonMethod, setComparisonMethod] = useState<'MNDWI' | 'NDWI'>('MNDWI');
  const [threshold, setThreshold] = useState(0.05);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [comparisonResult, setComparisonResult] = useState<any>(null);

  // Visual comparison viewer state
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [comparisonViewMode, setComparisonViewMode] = useState<'swipe' | 'side-by-side'>('swipe');
  const [showDifferenceMask, setShowDifferenceMask] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Toast / notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Load places service status on mount
  useEffect(() => {
    placesService.getStatus()
      .then((status) => setPlaceStatus(status))
      .catch(() => setPlaceStatus({ google_maps_configured: false, provider: 'nominatim' }));
  }, []);

  // Debounced place search
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingPlaces(true);
      try {
        const res = await placesService.searchPlaces(q);
        setSuggestions(res.places || []);
      } catch (err: any) {
        setSuggestions([]);
      } finally {
        setIsSearchingPlaces(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Recalculate bounding box when place or radius changes
  const updateBboxFromRadius = (lat: number, lon: number, radiusKm: number) => {
    // 1 deg lat ~ 111 km; 1 deg lon ~ 111 * cos(lat) km
    const latDelta = radiusKm / 111.0;
    const lonDelta = radiusKm / (111.0 * Math.cos((lat * Math.PI) / 180));
    const newBox: [number, number, number, number] = [
      Number((lon - lonDelta).toFixed(4)),
      Number((lat - latDelta).toFixed(4)),
      Number((lon + lonDelta).toFixed(4)),
      Number((lat + latDelta).toFixed(4))
    ];
    setCustomBbox(newBox);
  };

  const handleSelectPlace = (place: PlaceItem) => {
    setSelectedPlace(place);
    setSearchQuery(place.name);
    setSuggestions([]);
    if (place.bbox && place.bbox.length === 4) {
      setCustomBbox(place.bbox);
    } else {
      updateBboxFromRadius(place.latitude, place.longitude, aoiRadiusKm);
    }
    showToast(`Centered on ${place.name}`);
  };

  const handleRadiusChange = (radius: number) => {
    setAoiRadiusKm(radius);
    if (selectedPlace) {
      updateBboxFromRadius(selectedPlace.latitude, selectedPlace.longitude, radius);
    }
  };

  // Discover real Sentinel-2 scenes for pre and post date ranges
  const handleDiscoverScenes = async () => {
    if (!customBbox) return;
    setIsSearchingScenes(true);
    setSceneSearchError(null);
    try {
      // 1. Search Pre-disaster candidate scenes
      const preRes = await stacService.search({
        bbox: customBbox,
        start_datetime: preStartDate,
        end_datetime: preEndDate,
        collections: ['sentinel-2-l2a'],
        max_cloud_cover: cloudMax,
        limit: 20
      });
      const preList = preRes?.scenes || [];
      setPreScenes(preList);
      if (preList.length > 0) {
        setSelectedPreScene(preList[0]);
      } else {
        setSelectedPreScene(null);
      }

      // 2. Search Post-disaster candidate scenes
      const postRes = await stacService.search({
        bbox: customBbox,
        start_datetime: postStartDate,
        end_datetime: postEndDate,
        collections: ['sentinel-2-l2a'],
        max_cloud_cover: cloudMax,
        limit: 20
      });
      const postList = postRes?.scenes || [];
      setPostScenes(postList);
      if (postList.length > 0) {
        setSelectedPostScene(postList[0]);
      } else {
        setSelectedPostScene(null);
      }

      if (preList.length === 0 && postList.length === 0) {
        setSceneSearchError('No Sentinel-2 scenes matched this AOI and date range. Try widening dates or increasing cloud cover.');
      } else {
        showToast(`Discovered ${preList.length} pre-disaster and ${postList.length} post-disaster Sentinel-2 passes`);
      }
    } catch (err: any) {
      setSceneSearchError(err?.message || 'Failed to query Sentinel-2 STAC catalog.');
      setPreScenes([]);
      setPostScenes([]);
    } finally {
      setIsSearchingScenes(false);
    }
  };

  // Trigger real backend flood comparison
  const handleRunComparison = async () => {
    if (!selectedPreScene || !selectedPostScene) {
      setComparisonError('Please select both a pre-disaster and post-disaster scene.');
      return;
    }
    setIsComparing(true);
    setComparisonError(null);
    try {
      const res = await satelliteService.compareScenes({
        pre_scene_id: selectedPreScene.id || selectedPreScene.scene_id,
        post_scene_id: selectedPostScene.id || selectedPostScene.scene_id,
        method: comparisonMethod,
        threshold: threshold
      });
      setComparisonResult(res);
      showToast('Flood comparison calculated from actual pixel rasters!');
    } catch (err: any) {
      setComparisonError(err?.response?.data?.error?.message || err?.response?.data?.detail || err?.message || 'Comparison failed.');
    } finally {
      setIsComparing(false);
    }
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    setSliderPos(Math.max(5, Math.min(95, x)));
  }, [isDragging]);

  const handleDownloadGeoJSON = () => {
    if (!comparisonResult?.difference_geojson) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(comparisonResult.difference_geojson, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `flood_inundation_${comparisonResult.pre_scene.id}_${comparisonResult.post_scene.id}.geojson`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="p-4 space-y-5 animate-fade-in max-w-[1600px] mx-auto">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-nav-primary text-white border border-primary/40 px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 animate-fade-in text-[13px]">
          <Sparkles size={16} className="text-primary" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Breadcrumb */}
      <div>
        <div className="text-[11px] text-text-muted uppercase tracking-wider mb-1">
          OPERATIONS / SATELLITE IMAGERY / <span className="text-primary font-bold">PLACE-BASED FLOOD COMPARISON</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-[24px] font-bold text-text-primary tracking-tight">
              Satellite Place Search & Flood Comparison
            </h1>
            <p className="text-[13px] text-text-muted mt-0.5">
              Locate any place or coordinates, inspect Sentinel-2 imagery, and measure pixel-level flood inundation.
            </p>
          </div>
          {placeStatus && (
            <div className={`text-[11px] px-3 py-1.5 rounded-md border flex items-center gap-2 ${
              placeStatus.google_maps_configured
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-semibold'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}>
              <Info size={14} />
              <span>
                {placeStatus.google_maps_configured 
                  ? 'Google Places & Geocoding API Active' 
                  : 'OpenStreetMap / Coordinate Geocoder Active (Manual entry supported)'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Step 1: Place Search & AOI Configuration */}
      <div className="bg-surface border border-border rounded-xl p-4 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-primary font-bold text-[14px]">
          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[12px]">1</span>
          <span>Search Place & Define Target AOI</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-4">
          {/* Search Box & Controls */}
          <div className="space-y-3">
            <div className="relative">
              <label className="text-[11px] font-semibold text-text-muted uppercase mb-1 block">Place Name, Landmark, or Coordinates (Lat, Lon)</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="e.g. 'Khulna, Bangladesh' or '22.8456, 89.5403'"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-9 pr-8 bg-panel border border-border rounded-lg text-[13px] text-text-primary outline-none focus:border-primary transition"
                />
                {isSearchingPlaces && (
                  <RefreshCw size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary animate-spin" />
                )}
              </div>

              {/* Autocomplete Dropdown */}
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-xl z-30 max-h-[220px] overflow-y-auto">
                  {suggestions.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectPlace(item)}
                      className="w-full text-left px-3 py-2.5 hover:bg-panel border-b border-border/50 last:border-0 flex items-start gap-2.5 transition text-[12px]"
                    >
                      <MapPin size={14} className="text-primary mt-0.5 flex-shrink-0" />
                      <div className="truncate">
                        <div className="font-semibold text-text-primary">{item.name}</div>
                        <div className="text-[10px] text-text-muted font-mono">
                          {item.latitude.toFixed(4)}°N, {item.longitude.toFixed(4)}°E {item.country ? `• ${item.country}` : ''}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Place Details */}
            {selectedPlace && (
              <div className="bg-panel border border-border/60 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[12px] font-bold text-text-primary">
                    <MapPin size={14} className="text-critical" />
                    <span>{selectedPlace.name}</span>
                  </div>
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-mono font-semibold">
                    {selectedPlace.latitude.toFixed(4)}°N, {selectedPlace.longitude.toFixed(4)}°E
                  </span>
                </div>

                {/* Radius Slider */}
                <div className="pt-2 border-t border-border/40">
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-text-muted font-medium">AOI Coverage Radius:</span>
                    <span className="text-primary font-bold tabular-nums">{aoiRadiusKm} km</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={60}
                    step={5}
                    value={aoiRadiusKm}
                    onChange={(e) => handleRadiusChange(Number(e.target.value))}
                    className="w-full h-1.5 accent-primary cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-text-muted font-mono mt-1">
                    <span>5 km (Local)</span>
                    <span>25 km (Sector)</span>
                    <span>60 km (Regional)</span>
                  </div>
                </div>

                {/* Direct Bounding Box Readout */}
                <div className="text-[10px] text-text-muted font-mono bg-surface p-2 rounded border border-border/40 flex justify-between">
                  <span>Bounding Box:</span>
                  <span className="text-text-primary">[{customBbox.map(v => v.toFixed(3)).join(', ')}]</span>
                </div>
              </div>
            )}

            {/* Date Filters & Discovery */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-[10px] font-bold text-primary uppercase block mb-1">Pre-Disaster Window</label>
                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    value={preStartDate}
                    onChange={(e) => setPreStartDate(e.target.value)}
                    className="bg-panel border border-border text-[11px] text-text-primary p-1 rounded w-full outline-none"
                  />
                  <span className="text-text-muted text-[10px]">to</span>
                  <input
                    type="date"
                    value={preEndDate}
                    onChange={(e) => setPreEndDate(e.target.value)}
                    className="bg-panel border border-border text-[11px] text-text-primary p-1 rounded w-full outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-critical uppercase block mb-1">Post-Disaster Window</label>
                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    value={postStartDate}
                    onChange={(e) => setPostStartDate(e.target.value)}
                    className="bg-panel border border-border text-[11px] text-text-primary p-1 rounded w-full outline-none"
                  />
                  <span className="text-text-muted text-[10px]">to</span>
                  <input
                    type="date"
                    value={postEndDate}
                    onChange={(e) => setPostEndDate(e.target.value)}
                    className="bg-panel border border-border text-[11px] text-text-primary p-1 rounded w-full outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-text-muted">Max Cloud:</span>
                <select
                  value={cloudMax}
                  onChange={(e) => setCloudMax(Number(e.target.value))}
                  className="bg-panel border border-border text-[11px] text-text-primary p-1 rounded outline-none"
                >
                  <option value={10}>&lt; 10% (Clear)</option>
                  <option value={20}>&lt; 20% (Optimal)</option>
                  <option value={35}>&lt; 35% (Moderate)</option>
                  <option value={60}>&lt; 60% (Cloudy)</option>
                </select>
              </div>

              <button
                onClick={handleDiscoverScenes}
                disabled={isSearchingScenes}
                className="bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-semibold text-[12px] px-4 py-2 rounded-lg flex items-center gap-1.5 transition shadow-sm"
              >
                {isSearchingScenes ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Querying Sentinel-2 STAC...
                  </>
                ) : (
                  <>
                    <Search size={14} /> Search Sentinel-2 Passes
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Interactive Leaflet Map Preview */}
          <div className="h-[280px] w-full rounded-lg overflow-hidden border border-border relative z-0">
            <MapContainer
              center={[selectedPlace.latitude, selectedPlace.longitude]}
              zoom={10}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapRecenter center={[selectedPlace.latitude, selectedPlace.longitude]} bbox={customBbox} />
              <Marker position={[selectedPlace.latitude, selectedPlace.longitude]}>
                <Popup>
                  <div className="text-[11px]">
                    <strong>{selectedPlace.name}</strong><br />
                    Lat: {selectedPlace.latitude.toFixed(4)}, Lon: {selectedPlace.longitude.toFixed(4)}
                  </div>
                </Popup>
              </Marker>
              {customBbox && (
                <Rectangle
                  bounds={[
                    [customBbox[1], customBbox[0]],
                    [customBbox[3], customBbox[2]]
                  ]}
                  pathOptions={{ color: '#0ea5e9', weight: 2, fillOpacity: 0.12 }}
                />
              )}
            </MapContainer>
            <div className="absolute bottom-2 left-2 bg-nav-primary/90 text-white text-[10px] font-mono px-2 py-1 rounded backdrop-blur z-[1000]">
              AOI Extent: {aoiRadiusKm * 2} × {aoiRadiusKm * 2} km
            </div>
          </div>
        </div>
      </div>

      {/* Step 2: Choose Pre-Disaster and Post-Disaster Scenes */}
      <div className="bg-surface border border-border rounded-xl p-4 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-bold text-[14px]">
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[12px]">2</span>
            <span>Choose Pre-Disaster & Post-Disaster Scenes</span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-text-muted">
              Pre Candidates: <strong className="text-primary">{preScenes.length}</strong>
            </span>
            <span className="text-text-muted">
              Post Candidates: <strong className="text-critical">{postScenes.length}</strong>
            </span>
          </div>
        </div>

        {sceneSearchError && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-3 rounded-lg text-[12px] flex items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{sceneSearchError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pre-Disaster Column */}
          <div className="border border-border/80 rounded-lg p-3 space-y-3 bg-panel/30">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <span className="text-[12px] font-bold text-primary flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Pre-Disaster Baseline
              </span>
              <span className="text-[11px] text-text-muted">Baseline Dry / Pre-Event</span>
            </div>

            {preScenes.length === 0 ? (
              <div className="p-6 text-center text-text-muted text-[12px]">
                No pre-disaster scenes loaded. Click "Search Sentinel-2 Passes" above to query the STAC catalog.
              </div>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {preScenes.map((sc) => {
                  const isSelected = selectedPreScene && (selectedPreScene.id === sc.id || selectedPreScene.scene_id === sc.scene_id);
                  return (
                    <div
                      key={sc.id || sc.scene_id}
                      onClick={() => setSelectedPreScene(sc)}
                      className={`p-2.5 rounded-lg border text-[11px] cursor-pointer transition flex items-center justify-between ${
                        isSelected 
                          ? 'bg-primary/10 border-primary text-text-primary shadow-sm'
                          : 'bg-surface border-border hover:border-primary/40 text-text-secondary'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-text-primary flex items-center gap-2">
                          <span>{sc.platform || 'Sentinel-2'}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-200">
                            {sc.cloud_cover !== undefined ? `${sc.cloud_cover.toFixed(1)}% Cloud` : 'Clear'}
                          </span>
                        </div>
                        <div className="text-[10px] text-text-muted font-mono truncate max-w-[240px]">
                          {sc.acquisition_datetime || sc.datetime || sc.acquisitionDate || 'May 2024'}
                        </div>
                      </div>
                      <button
                        className={`px-2.5 py-1 rounded text-[10px] font-bold transition ${
                          isSelected ? 'bg-primary text-white' : 'border border-border text-text-muted hover:text-text-primary'
                        }`}
                      >
                        {isSelected ? '✓ Selected' : 'Select Pre'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Post-Disaster Column */}
          <div className="border border-border/80 rounded-lg p-3 space-y-3 bg-panel/30">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <span className="text-[12px] font-bold text-critical flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-critical" /> Post-Disaster Surge
              </span>
              <span className="text-[11px] text-text-muted">Target Inundation Pass</span>
            </div>

            {postScenes.length === 0 ? (
              <div className="p-6 text-center text-text-muted text-[12px]">
                No post-disaster scenes loaded. Click "Search Sentinel-2 Passes" above to query the STAC catalog.
              </div>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {postScenes.map((sc) => {
                  const isSelected = selectedPostScene && (selectedPostScene.id === sc.id || selectedPostScene.scene_id === sc.scene_id);
                  return (
                    <div
                      key={sc.id || sc.scene_id}
                      onClick={() => setSelectedPostScene(sc)}
                      className={`p-2.5 rounded-lg border text-[11px] cursor-pointer transition flex items-center justify-between ${
                        isSelected 
                          ? 'bg-critical/10 border-critical text-text-primary shadow-sm'
                          : 'bg-surface border-border hover:border-critical/40 text-text-secondary'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-text-primary flex items-center gap-2">
                          <span>{sc.platform || 'Sentinel-2'}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-200">
                            {sc.cloud_cover !== undefined ? `${sc.cloud_cover.toFixed(1)}% Cloud` : 'Clear'}
                          </span>
                        </div>
                        <div className="text-[10px] text-text-muted font-mono truncate max-w-[240px]">
                          {sc.acquisition_datetime || sc.datetime || sc.acquisitionDate || 'June 2024'}
                        </div>
                      </div>
                      <button
                        className={`px-2.5 py-1 rounded text-[10px] font-bold transition ${
                          isSelected ? 'bg-critical text-white' : 'border border-border text-text-muted hover:text-text-primary'
                        }`}
                      >
                        {isSelected ? '✓ Selected' : 'Select Post'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Comparison Parameters & Action Button */}
        <div className="bg-panel border border-border rounded-lg p-3 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-[12px]">
            <div>
              <span className="text-text-muted font-medium mr-2">Spectral Index:</span>
              <select
                value={comparisonMethod}
                onChange={(e) => setComparisonMethod(e.target.value as any)}
                className="bg-surface border border-border text-text-primary text-[11px] p-1.5 rounded outline-none font-semibold"
              >
                <option value="MNDWI">MNDWI (Green - SWIR1) [Recommended]</option>
                <option value="NDWI">NDWI (Green - NIR)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-text-muted font-medium">Water Threshold:</span>
              <input
                type="number"
                step="0.01"
                min="-0.2"
                max="0.4"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-16 bg-surface border border-border text-text-primary text-[11px] p-1.5 rounded text-center font-mono"
              />
            </div>
          </div>

          <button
            onClick={handleRunComparison}
            disabled={!selectedPreScene || !selectedPostScene || isComparing}
            className="bg-critical hover:bg-critical/90 disabled:opacity-40 text-white font-bold text-[13px] px-6 py-2.5 rounded-lg flex items-center gap-2 transition shadow-md w-full md:w-auto justify-center"
          >
            {isComparing ? (
              <>
                <RefreshCw size={16} className="animate-spin" /> Aligning Rasters & Calculating Areas...
              </>
            ) : (
              <>
                <Sliders size={16} /> Compare Flood Extent (Pixel Analysis)
              </>
            )}
          </button>
        </div>

        {comparisonError && (
          <div className="bg-critical/10 border border-critical/30 text-critical p-3 rounded-lg text-[12px] flex items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{comparisonError}</span>
          </div>
        )}
      </div>

      {/* Step 3: Comparison Results Dashboard */}
      {comparisonResult && (
        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-5 animate-fade-in">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-success animate-pulse" />
                <h2 className="text-[18px] font-bold text-text-primary">
                  Flood Extent Comparison Results ({comparisonResult.method})
                </h2>
              </div>
              <p className="text-[12px] text-text-muted mt-0.5">
                Derived by aligning both rasters to identical resolution ({comparisonResult.resolution?.[0] || 10}m) and subtracting pre-disaster permanent water.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadGeoJSON}
                className="border border-border hover:bg-panel text-text-primary text-[11px] font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
              >
                <Download size={14} /> Download Polygons (.geojson)
              </button>
            </div>
          </div>

          {/* 4 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-panel border border-border rounded-lg p-3.5 space-y-1">
              <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Pre-Disaster Baseline Water</div>
              <div className="text-[22px] font-extrabold text-primary tabular-nums">
                {comparisonResult.pre_area_km2.toFixed(2)} <span className="text-[13px] font-semibold">km²</span>
              </div>
              <div className="text-[10px] text-text-muted font-mono truncate">
                Scene: {comparisonResult.pre_scene.id}
              </div>
            </div>

            <div className="bg-panel border border-border rounded-lg p-3.5 space-y-1">
              <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Post-Disaster Total Water</div>
              <div className="text-[22px] font-extrabold text-text-primary tabular-nums">
                {comparisonResult.post_area_km2.toFixed(2)} <span className="text-[13px] font-semibold">km²</span>
              </div>
              <div className="text-[10px] text-text-muted font-mono truncate">
                Scene: {comparisonResult.post_scene.id}
              </div>
            </div>

            <div className="bg-critical/10 border border-critical/30 rounded-lg p-3.5 space-y-1">
              <div className="text-[10px] font-bold text-critical uppercase tracking-wider">Newly Flooded Area</div>
              <div className="text-[22px] font-extrabold text-critical tabular-nums flex items-baseline gap-2">
                <span>{comparisonResult.newly_flooded_area_km2.toFixed(2)} km²</span>
                <span className="text-[11px] font-bold bg-critical/20 px-1.5 py-0.5 rounded text-critical">
                  +{comparisonResult.percentage_change}%
                </span>
              </div>
              <div className="text-[10px] text-critical/80 font-medium">
                Surface water surge beyond normal baseline
              </div>
            </div>

            <div className="bg-panel border border-border rounded-lg p-3.5 space-y-1">
              <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Vector Polygons Extracted</div>
              <div className="text-[22px] font-extrabold text-text-primary tabular-nums">
                {comparisonResult.polygon_count} <span className="text-[13px] font-semibold">features</span>
              </div>
              <div className="text-[10px] text-success font-semibold">
                Status: {comparisonResult.processing_status}
              </div>
            </div>
          </div>

          {/* Interactive Split Swipe Viewer */}
          <div className="border border-border rounded-xl overflow-hidden bg-surface">
            {/* Viewer controls */}
            <div className="bg-panel px-4 py-2.5 border-b border-border flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-semibold text-text-primary">Viewing Mode:</span>
                <button
                  onClick={() => setComparisonViewMode('swipe')}
                  className={`text-[11px] px-2.5 py-1 rounded font-semibold transition ${
                    comparisonViewMode === 'swipe' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  Interactive Swipe
                </button>
                <button
                  onClick={() => setComparisonViewMode('side-by-side')}
                  className={`text-[11px] px-2.5 py-1 rounded font-semibold transition ${
                    comparisonViewMode === 'side-by-side' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  Side by Side
                </button>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-[11px] text-text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showDifferenceMask}
                    onChange={(e) => setShowDifferenceMask(e.target.checked)}
                    className="accent-critical"
                  />
                  <span>Show Differential Inundation Mask (Red = New Flood)</span>
                </label>
              </div>
            </div>

            {/* Comparison Container */}
            {comparisonViewMode === 'swipe' ? (
              <div
                ref={containerRef}
                className="relative h-[520px] cursor-ew-resize select-none overflow-hidden bg-slate-950"
                onMouseMove={handleMouseMove}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
              >
                {/* Pre-Disaster Image (Left Base Layer) */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <img
                    src={comparisonResult.pre_scene.preview_url}
                    alt="Pre-disaster RGB"
                    className="w-full h-full object-cover pointer-events-none"
                  />
                  <div className="absolute top-3 left-3 bg-nav-primary/90 text-white text-[11px] font-bold px-2.5 py-1 rounded shadow-md z-10 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    <span>PRE-DISASTER BASELINE</span>
                    <span className="text-text-muted font-mono text-[10px]">
                      ({comparisonResult.pre_scene.acquisition_date ? new Date(comparisonResult.pre_scene.acquisition_date).toLocaleDateString() : 'Baseline'})
                    </span>
                  </div>
                </div>

                {/* Post-Disaster Image (Right Clipped Layer) */}
                <div
                  className="absolute inset-0 flex items-center justify-center overflow-hidden"
                  style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
                >
                  <img
                    src={comparisonResult.post_scene.preview_url}
                    alt="Post-disaster RGB"
                    className="w-full h-full object-cover pointer-events-none"
                  />
                  
                  {/* Difference Mask Overlay on Post Image */}
                  {showDifferenceMask && comparisonResult.difference_mask_preview && (
                    <img
                      src={comparisonResult.difference_mask_preview}
                      alt="Difference mask"
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none mix-blend-screen opacity-85"
                    />
                  )}

                  <div className="absolute top-3 right-3 bg-critical/90 text-white text-[11px] font-bold px-2.5 py-1 rounded shadow-md z-10 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>POST-DISASTER FLOOD SURGE</span>
                    <span className="text-white/80 font-mono text-[10px]">
                      ({comparisonResult.post_scene.acquisition_date ? new Date(comparisonResult.post_scene.acquisition_date).toLocaleDateString() : 'Target'})
                    </span>
                  </div>
                </div>

                {/* Draggable Divider Handle */}
                <div
                  className="absolute top-0 bottom-0 z-20 pointer-events-none"
                  style={{ left: `${sliderPos}%` }}
                >
                  <div className="w-[3px] h-full bg-white shadow-[0_0_10px_rgba(0,0,0,0.8)]" />
                  <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-nav-primary border-2 border-white flex items-center justify-center shadow-2xl pointer-events-auto cursor-ew-resize"
                    onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }}
                  >
                    <span className="text-white text-xs font-bold">↔</span>
                  </div>
                </div>

                {/* Bottom Overlay Legend */}
                <div className="absolute bottom-3 left-3 bg-nav-primary/90 text-white text-[10px] px-3 py-1.5 rounded backdrop-blur z-10 flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-blue-500" /> Permanent Baseline Water
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-red-500 animate-pulse" /> Newly Flooded Inundation
                  </span>
                  <span className="text-text-muted">Swipe left/right to compare</span>
                </div>
              </div>
            ) : (
              /* Side-by-Side Mode */
              <div className="grid grid-cols-1 md:grid-cols-2 h-[450px]">
                <div className="relative border-r border-border overflow-hidden bg-slate-950">
                  <img
                    src={comparisonResult.pre_scene.preview_url}
                    alt="Pre-disaster"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-nav-primary/90 text-white text-[11px] font-bold px-2 py-1 rounded">
                    PRE-DISASTER ({comparisonResult.pre_area_km2.toFixed(2)} km² water)
                  </div>
                </div>
                <div className="relative overflow-hidden bg-slate-950">
                  <img
                    src={comparisonResult.post_scene.preview_url}
                    alt="Post-disaster"
                    className="w-full h-full object-cover"
                  />
                  {showDifferenceMask && comparisonResult.difference_mask_preview && (
                    <img
                      src={comparisonResult.difference_mask_preview}
                      alt="Difference mask"
                      className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-85"
                    />
                  )}
                  <div className="absolute top-3 left-3 bg-critical/90 text-white text-[11px] font-bold px-2 py-1 rounded">
                    POST-DISASTER ({comparisonResult.post_area_km2.toFixed(2)} km² total • +{comparisonResult.newly_flooded_area_km2.toFixed(2)} km² new)
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
