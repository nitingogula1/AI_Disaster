import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Navigation, Route, Zap, AlertTriangle, ShieldCheck, CheckCircle, 
  Radio, Send, RefreshCw, Printer, Compass, Layers, Eye, Check, ChevronRight,
  MapPin, Search, Globe, Truck, Shield, X, ArrowRight, Gauge, AlertOctagon,
  ArrowUpDown, Crosshair, Navigation2, LocateFixed
} from 'lucide-react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { routeService } from '../../services/api';
import { mockRoutes } from '../../data/mockData';
import type { OptimizedRoute, RouteRisk } from '../../types';

// Fix Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createWaypointIcon = (label: string, bgClass: string, isDest: boolean = false) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${bgClass}; color: white; padding: 4px 10px; border-radius: 9999px; font-weight: 800; font-size: 11px; border: 2px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.45); white-space: nowrap; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; display: flex; align-items: center; gap: 4px; ${isDest ? 'animation: bounce 1.4s infinite;' : ''}"><span>${label}</span></div>`,
    iconSize: [110, 28],
    iconAnchor: [55, 14],
  });
};

const createHazardMarkerIcon = (depth: number) => {
  return L.divIcon({
    className: 'custom-hazard-icon',
    html: `<div style="background-color: #dc2626; color: white; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 10px; border: 1.5px solid white; box-shadow: 0 0 14px rgba(220,38,38,0.85); white-space: nowrap; font-family: monospace; animation: pulse 1.2s infinite; display: flex; align-items: center; gap: 3px;"><span>⚠️ WATER ${depth.toFixed(1)}m</span></div>`,
    iconSize: [96, 24],
    iconAnchor: [48, 12],
  });
};

// Map Controller to smoothly fit bounds to active route & viewport
function MapRouteController({ 
  route, 
  startPos, 
  destPos,
  fitTrigger 
}: { 
  route?: OptimizedRoute; 
  startPos: [number, number]; 
  destPos: [number, number]; 
  fitTrigger?: number;
}) {
  const map = useMap();

  useEffect(() => {
    const executeFit = () => {
      try {
        map.invalidateSize();
        const pts: [number, number][] = [];
        if (route && route.path && route.path.length > 0) {
          route.path.forEach(pt => {
            if (Array.isArray(pt) && pt.length >= 2 && !isNaN(pt[0]) && !isNaN(pt[1])) {
              pts.push([pt[0], pt[1]]);
            }
          });
        }
        pts.push(startPos);
        pts.push(destPos);

        if (pts.length >= 2) {
          const bounds = L.latLngBounds(pts);
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14, animate: true });
        }
      } catch (err) {
        console.warn('Map bounds fit error:', err);
      }
    };

    executeFit();
    const t = setTimeout(executeFit, 200);
    return () => clearTimeout(t);
  }, [route?.id, route?.path?.length, startPos[0], startPos[1], destPos[0], destPos[1], fitTrigger, map]);

  return null;
}

// Map Click Picker for Origin / Destination
function MapClickHandler({ 
  pickingMode, 
  onPick 
}: { 
  pickingMode: 'START' | 'DEST' | null; 
  onPick: (pos: [number, number]) => void; 
}) {
  useMapEvents({
    click(e) {
      if (pickingMode) {
        onPick([+e.latlng.lat.toFixed(5), +e.latlng.lng.toFixed(5)]);
      }
    },
  });
  return null;
}

// Comprehensive Landmark Dictionary for instant 0ms autocomplete
const REGIONAL_LANDMARKS = [
  // Nepal - Nuwakot / Rasuwa Corridor
  { title: 'Trishuli DEOC Command Base (Nuwakot)', subtitle: 'District Emergency Operations Center, Bidur', pos: [27.9150, 85.1650] as [number, number], region: 'Nuwakot, Nepal' },
  { title: 'Syabrubesi Flood Evacuation Point (Rasuwa)', subtitle: 'Langtang Valley Triage & Haven Point', pos: [28.1560, 85.3340] as [number, number], region: 'Rasuwa, Nepal' },
  { title: 'Dhunche District Hospital Staging (Rasuwa)', subtitle: 'High-Elevation Trauma & Relief Post', pos: [28.1130, 85.3010] as [number, number], region: 'Rasuwa, Nepal' },
  { title: 'Rasuwagadhi Border Tactical Base', subtitle: 'Northern Nepal-China Highway Border Checkpoint', pos: [28.2730, 85.3780] as [number, number], region: 'Rasuwa, Nepal' },
  { title: 'Timure Evacuation Hub (Rasuwa)', subtitle: 'Customs & Emergency Supply Depot', pos: [28.2310, 85.3670] as [number, number], region: 'Rasuwa, Nepal' },
  { title: 'Battar Civil Hospital (Nuwakot)', subtitle: 'Central Nuwakot Medical Evacuation Center', pos: [27.9040, 85.1610] as [number, number], region: 'Nuwakot, Nepal' },
  { title: 'Devighat Hydropower Haven (Nuwakot)', subtitle: 'Trishuli River Confluence Bridge', pos: [27.8730, 85.1220] as [number, number], region: 'Nuwakot, Nepal' },
  { title: 'Betrawati River Confluence (Nuwakot)', subtitle: 'Rasuwa-Nuwakot Border Bridge Post', pos: [27.9780, 85.1850] as [number, number], region: 'Nuwakot, Nepal' },
  { title: 'Ramche Landslide Risk Bypass (Rasuwa)', subtitle: 'Pasang Lhamu Highway Critical Sector', pos: [28.0550, 85.2440] as [number, number], region: 'Rasuwa, Nepal' },
  { title: 'Kalikasthan Tactical Post (Rasuwa)', subtitle: 'Ridge Route Emergency Checkpoint', pos: [28.0320, 85.2280] as [number, number], region: 'Rasuwa, Nepal' },

  // Nepal - Kathmandu Basin
  { title: 'Balkhu Vegetable Market Rooftop', subtitle: 'Bagmati River Overflow Ground Zero', pos: [27.6842, 85.2945] as [number, number], region: 'Kathmandu, Nepal' },
  { title: 'Tribhuvan University High Ridge Haven', subtitle: 'Kirtipur Elevated Safe Haven & Helipad', pos: [27.6885, 85.2915] as [number, number], region: 'Kirtipur, Nepal' },
  { title: 'Kalanki Transit Tactical Hub', subtitle: 'West Ring Road Emergency Corridor', pos: [27.6935, 85.2815] as [number, number], region: 'Kathmandu, Nepal' },
  { title: 'Patan Hospital Emergency Haven', subtitle: 'Lalitpur Medical & Trauma Command', pos: [27.6685, 85.3210] as [number, number], region: 'Lalitpur, Nepal' },
  { title: 'Teku Emergency Center', subtitle: 'Bishnumati-Bagmati Confluence Sector', pos: [27.6975, 85.3060] as [number, number], region: 'Kathmandu, Nepal' },
  { title: 'Chobhar Gorge Elevated Point', subtitle: 'Southern Kathmandu Valley Drainage Outflow', pos: [27.6620, 85.2905] as [number, number], region: 'Kathmandu, Nepal' },
  { title: 'Thamel Tourism Emergency Base', subtitle: 'North Central Kathmandu Hub', pos: [27.7150, 85.3110] as [number, number], region: 'Kathmandu, Nepal' },
  { title: 'Bhaktapur Durbar Square Triage', subtitle: 'Eastern Valley Cultural Center Haven', pos: [27.6720, 85.4280] as [number, number], region: 'Bhaktapur, Nepal' },
  { title: 'Pokhara Lakeside Emergency Command', subtitle: 'Western Regional Disaster Logistics Depot', pos: [28.2096, 83.9575] as [number, number], region: 'Pokhara, Nepal' },

  // India - Andhra Pradesh (Rajam / Vizianagaram / Srikakulam Corridor)
  { title: 'Rajam Town Center (RTC Complex Base)', subtitle: 'Central Logistics & Staging Point, Main Road', pos: [18.4498, 83.6565] as [number, number], region: 'Rajam, Andhra Pradesh' },
  { title: 'Boddam High-Ground Shelter (Rajam)', subtitle: 'Elevated Community Center, Flood Evac Zone', pos: [18.4350, 83.6620] as [number, number], region: 'Rajam, Andhra Pradesh' },
  { title: 'Prasanthi Nagar Community Triage (Rajam)', subtitle: 'Emergency Medical Camp & Triage Point', pos: [18.4550, 83.6490] as [number, number], region: 'Rajam, Andhra Pradesh' },
  { title: 'Pogiri Relief Post (Rajam)', subtitle: 'Agricultural Perimeter Evac Camp', pos: [18.4720, 83.6350] as [number, number], region: 'Rajam, Andhra Pradesh' },
  { title: 'Saradhi Evac Camp (Rajam)', subtitle: 'Lowland Lake Sector Rescue Staging', pos: [18.4480, 83.6700] as [number, number], region: 'Rajam, Andhra Pradesh' },
  { title: 'GMRIT Campus Elevated Haven (Rajam)', subtitle: 'Engineering College Gymnasium Staging Area', pos: [18.4655, 83.6630] as [number, number], region: 'Rajam, Andhra Pradesh' },
  { title: 'Vizianagaram District Relief Center', subtitle: 'Collectorate Emergency Operations Wing', pos: [18.1150, 83.4050] as [number, number], region: 'Vizianagaram, Andhra Pradesh' },
  { title: 'Srikakulam Collectorate Command Base', subtitle: 'Nagavali River Basin Emergency Center', pos: [18.2970, 83.8960] as [number, number], region: 'Srikakulam, Andhra Pradesh' },
  { title: 'Palakonda Emergency Post', subtitle: 'Northern Hill Foothills Relief Camp', pos: [18.6010, 83.7540] as [number, number], region: 'Palakonda, Andhra Pradesh' },
  { title: 'Bobbili Fort High Ridge Base', subtitle: 'Western Regional Inundation Haven', pos: [18.5720, 83.3640] as [number, number], region: 'Bobbili, Andhra Pradesh' },
  { title: 'Kanchili Cyclone Shelter', subtitle: 'Coastal Cyclone & Inundation Safe Haven', pos: [18.8820, 84.5820] as [number, number], region: 'Kanchili, Andhra Pradesh' },
  { title: 'Visakhapatnam Port Rescue Command', subtitle: 'Naval SAR Fleet & Heavy Amphibious Base', pos: [17.6868, 83.2185] as [number, number], region: 'Visakhapatnam, Andhra Pradesh' },
];

// Preset Tactical Corridors
const PRESET_CORRIDORS = [
  {
    id: 'corridor-nepal-rasuwa',
    region: 'Nuwakot - Rasuwa Trishuli River Corridor (Nepal 2026)',
    badge: '🇳🇵 RASUWA-NUWAKOT FLASH FLOOD',
    startName: 'Trishuli DEOC Command Base (Nuwakot)',
    startPos: [27.9150, 85.1650] as [number, number],
    destName: 'Syabrubesi Flood Evacuation Point (Rasuwa)',
    destPos: [28.1560, 85.3340] as [number, number],
    vehicle: 'Amphibious Craft B-14 (0.8m H₂O)',
    team: 'APF Disaster Response Force (Eagle 1)',
  },
  {
    id: 'corridor-nepal',
    region: 'Kathmandu Bagmati Basin (Nepal)',
    badge: '🇳🇵 BAGMATI FLASH FLOOD',
    startName: 'Balkhu Vegetable Market Rooftop',
    startPos: [27.6842, 85.2945] as [number, number],
    destName: 'Tribhuvan University High Ridge Haven',
    destPos: [27.6885, 85.2915] as [number, number],
    vehicle: 'Tactical 4x4 Rescue Truck (0.55m H₂O)',
    team: 'APF Disaster Response Task Force',
  },
  {
    id: 'corridor-rajam',
    region: 'Vizianagaram / Rajam Basin (Andhra Pradesh)',
    badge: '🇮🇳 ANDHRA DISASTER RELIEF',
    startName: 'Rajam Town Center (RTC Complex)',
    startPos: [18.4498, 83.6565] as [number, number],
    destName: 'Boddam High-Ground Shelter (Rajam)',
    destPos: [18.4350, 83.6620] as [number, number],
    vehicle: 'Advanced Life Support Ambulance',
    team: 'NDRF 10th Battalion Unit Alpha',
  },
  {
    id: 'corridor-rajam-vizianagaram',
    region: 'Rajam to Vizianagaram Arterial Highway',
    badge: '🇮🇳 RAJAM-VIZIANAGARAM ARTERY',
    startName: 'Rajam Town Center (RTC Complex)',
    startPos: [18.4498, 83.6565] as [number, number],
    destName: 'Vizianagaram District Relief Center',
    destPos: [18.1150, 83.4050] as [number, number],
    vehicle: 'Tactical 4x4 Rescue Truck (0.55m H₂O)',
    team: 'NDRF Fast Response Column',
  }
];

export const RouteOptimizationPage = () => {
  const [searchParams] = useSearchParams();
  // Active Corridor Preset
  const [activeCorridorId, setActiveCorridorId] = useState<string>('corridor-nepal-rasuwa');
  
  // Coordinates & User Editable Text Inputs
  const [startName, setStartName] = useState<string>(PRESET_CORRIDORS[0].startName);
  const [startPos, setStartPos] = useState<[number, number]>(PRESET_CORRIDORS[0].startPos);
  const [startInput, setStartInput] = useState<string>(PRESET_CORRIDORS[0].startName);

  const [destName, setDestName] = useState<string>(PRESET_CORRIDORS[0].destName);
  const [destPos, setDestPos] = useState<[number, number]>(PRESET_CORRIDORS[0].destPos);
  const [destInput, setDestInput] = useState<string>(PRESET_CORRIDORS[0].destName);

  // Autocomplete suggestions
  const [startSuggestions, setStartSuggestions] = useState<any[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<any[]>([]);
  const [isSearchingStart, setIsSearchingStart] = useState<boolean>(false);
  const [isSearchingDest, setIsSearchingDest] = useState<boolean>(false);
  const [showStartDropdown, setShowStartDropdown] = useState<boolean>(false);
  const [showDestDropdown, setShowDestDropdown] = useState<boolean>(false);

  // Map Click Picking Mode
  const [pickingMode, setPickingMode] = useState<'START' | 'DEST' | null>(null);
  const [fitTrigger, setFitTrigger] = useState<number>(0);

  // Routes & Active Selection
  const [routes, setRoutes] = useState<OptimizedRoute[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [activeLayer, setActiveLayer] = useState<'multispectral' | 'ndwi' | 'sar'>('ndwi');

  // Constraints & Vehicle Specs
  const [vehicleType, setVehicleType] = useState<string>('Amphibious Craft B-14 (0.8m H₂O)');
  const [avoidInundation, setAvoidInundation] = useState(true);
  const [excludeBridges, setExcludeBridges] = useState(true);
  const [prioritizePaved, setPrioritizePaved] = useState(true);

  // Transmission & Status
  const [transmissionSuccess, setTransmissionSuccess] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [engineLatencyMs, setEngineLatencyMs] = useState(42);

  // Run Route Optimization
  const runOptimization = async (origin: [number, number], destination: [number, number]) => {
    setRecalculating(true);
    const startT = performance.now();
    try {
      const res = await routeService.optimizeRoute({
        start_location: origin,
        destination: destination,
        avoid_inundation: avoidInundation,
        exclude_bridges: excludeBridges,
        prioritize_paved: prioritizePaved
      });

      if (res && res.selected_route) {
        const all = [res.selected_route, ...(res.alternative_routes || [])];
        setRoutes(all);
        setSelectedRouteId(res.selected_route.id);
      }
      setEngineLatencyMs(Math.round(performance.now() - startT));
      setFitTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Optimization error:', err);
    } finally {
      setRecalculating(false);
    }
  };

  // Initial Route Run on Mount & SearchParam Handler
  useEffect(() => {
    const dest = searchParams.get('dest');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const start = searchParams.get('start');
    const sLat = searchParams.get('sLat');
    const sLng = searchParams.get('sLng');

    if (dest && lat && lng) {
      const targetPos: [number, number] = [+parseFloat(lat).toFixed(5), +parseFloat(lng).toFixed(5)];
      setDestName(dest);
      setDestPos(targetPos);
      setDestInput(dest);

      let originPos = startPos;
      if (start && sLat && sLng) {
        originPos = [+parseFloat(sLat).toFixed(5), +parseFloat(sLng).toFixed(5)];
        setStartName(start);
        setStartPos(originPos);
        setStartInput(start);
      }

      runOptimization(originPos, targetPos);
    } else {
      runOptimization(startPos, destPos);
    }
  }, [searchParams]);

  // Preset Corridor Switcher
  const handleSelectCorridor = (corridorId: string) => {
    const corridor = PRESET_CORRIDORS.find(c => c.id === corridorId);
    if (!corridor) return;
    setActiveCorridorId(corridorId);
    setStartName(corridor.startName);
    setStartPos(corridor.startPos);
    setStartInput(corridor.startName);
    setDestName(corridor.destName);
    setDestPos(corridor.destPos);
    setDestInput(corridor.destName);
    setShowStartDropdown(false);
    setShowDestDropdown(false);
    setPickingMode(null);
    runOptimization(corridor.startPos, corridor.destPos);
  };

  // Instant local filtering + Debounced Nominatim Geocoding for Start Search
  useEffect(() => {
    const query = startInput.trim().toLowerCase();
    if (query.length < 2) {
      setStartSuggestions([]);
      return;
    }

    // 1. Instant match from regional landmarks
    const localMatches = REGIONAL_LANDMARKS.filter(lm => 
      lm.title.toLowerCase().includes(query) || 
      lm.subtitle.toLowerCase().includes(query) ||
      lm.region.toLowerCase().includes(query)
    ).map(lm => ({
      title: lm.title,
      subtitle: `${lm.subtitle} • ${lm.region}`,
      pos: lm.pos,
      isLocal: true
    }));

    setStartSuggestions(localMatches);

    // 2. Concurrently fetch Nominatim for any general query
    const controller = new AbortController();
    const fetchGeo = async () => {
      setIsSearchingStart(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=4&addressdetails=1`,
          { signal: controller.signal, headers: { 'Accept-Language': 'en' } }
        );
        if (res.ok) {
          const data = await res.json();
          const nominatimMatches = data.map((d: any) => ({
            title: d.name || d.display_name.split(',')[0],
            subtitle: d.display_name,
            pos: [+parseFloat(d.lat).toFixed(5), +parseFloat(d.lon).toFixed(5)] as [number, number],
            isLocal: false
          }));

          // Merge without duplicate coordinates
          setStartSuggestions(prev => {
            const combined = [...localMatches];
            nominatimMatches.forEach((nm: any) => {
              if (!combined.some(c => Math.abs(c.pos[0] - nm.pos[0]) < 0.01 && Math.abs(c.pos[1] - nm.pos[1]) < 0.01)) {
                combined.push(nm);
              }
            });
            return combined.slice(0, 6);
          });
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') console.error(err);
      } finally {
        setIsSearchingStart(false);
      }
    };

    const t = setTimeout(fetchGeo, 300);
    return () => { clearTimeout(t); controller.abort(); };
  }, [startInput]);

  // Instant local filtering + Debounced Nominatim Geocoding for Destination Search
  useEffect(() => {
    const query = destInput.trim().toLowerCase();
    if (query.length < 2) {
      setDestSuggestions([]);
      return;
    }

    const localMatches = REGIONAL_LANDMARKS.filter(lm => 
      lm.title.toLowerCase().includes(query) || 
      lm.subtitle.toLowerCase().includes(query) ||
      lm.region.toLowerCase().includes(query)
    ).map(lm => ({
      title: lm.title,
      subtitle: `${lm.subtitle} • ${lm.region}`,
      pos: lm.pos,
      isLocal: true
    }));

    setDestSuggestions(localMatches);

    const controller = new AbortController();
    const fetchGeo = async () => {
      setIsSearchingDest(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=4&addressdetails=1`,
          { signal: controller.signal, headers: { 'Accept-Language': 'en' } }
        );
        if (res.ok) {
          const data = await res.json();
          const nominatimMatches = data.map((d: any) => ({
            title: d.name || d.display_name.split(',')[0],
            subtitle: d.display_name,
            pos: [+parseFloat(d.lat).toFixed(5), +parseFloat(d.lon).toFixed(5)] as [number, number],
            isLocal: false
          }));

          setDestSuggestions(prev => {
            const combined = [...localMatches];
            nominatimMatches.forEach((nm: any) => {
              if (!combined.some(c => Math.abs(c.pos[0] - nm.pos[0]) < 0.01 && Math.abs(c.pos[1] - nm.pos[1]) < 0.01)) {
                combined.push(nm);
              }
            });
            return combined.slice(0, 6);
          });
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') console.error(err);
      } finally {
        setIsSearchingDest(false);
      }
    };

    const t = setTimeout(fetchGeo, 300);
    return () => { clearTimeout(t); controller.abort(); };
  }, [destInput]);

  // Execute Immediate Search / Coordinate Resolution on Enter or Search Button
  const handleExecuteSearch = async (targetType: 'START' | 'DEST') => {
    const raw = targetType === 'START' ? startInput.trim() : destInput.trim();
    if (!raw) return;

    // Check if input is direct coordinates: e.g. "27.915, 85.165"
    const coordMatch = raw.match(/^(-?\d+(\.\d+)?)[,\s]+(-?\d+(\.\d+)?)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lon = parseFloat(coordMatch[3]);
      if (!isNaN(lat) && !isNaN(lon)) {
        const newPos: [number, number] = [+lat.toFixed(5), +lon.toFixed(5)];
        if (targetType === 'START') {
          setStartPos(newPos);
          setStartName(`Point (${newPos[0]}, ${newPos[1]})`);
          setShowStartDropdown(false);
          runOptimization(newPos, destPos);
        } else {
          setDestPos(newPos);
          setDestName(`Point (${newPos[0]}, ${newPos[1]})`);
          setShowDestDropdown(false);
          runOptimization(startPos, newPos);
        }
        return;
      }
    }

    // Check available suggestions first
    const list = targetType === 'START' ? startSuggestions : destSuggestions;
    if (list.length > 0) {
      const top = list[0];
      if (targetType === 'START') {
        setStartName(top.title);
        setStartPos(top.pos);
        setStartInput(top.title);
        setShowStartDropdown(false);
        runOptimization(top.pos, destPos);
      } else {
        setDestName(top.title);
        setDestPos(top.pos);
        setDestInput(top.title);
        setShowDestDropdown(false);
        runOptimization(startPos, top.pos);
      }
      return;
    }

    // Fallback: immediate Nominatim query
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(raw)}&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          const item = data[0];
          const newPos: [number, number] = [+parseFloat(item.lat).toFixed(5), +parseFloat(item.lon).toFixed(5)];
          const title = item.name || item.display_name.split(',')[0];
          if (targetType === 'START') {
            setStartName(title);
            setStartPos(newPos);
            setStartInput(title);
            setShowStartDropdown(false);
            runOptimization(newPos, destPos);
          } else {
            setDestName(title);
            setDestPos(newPos);
            setDestInput(title);
            setShowDestDropdown(false);
            runOptimization(startPos, newPos);
          }
        }
      }
    } catch (err) {
      console.error('Instant geocode error:', err);
    }
  };

  // Swap Start & Destination
  const handleSwapEndpoints = () => {
    const prevStartName = startName;
    const prevStartPos = startPos;
    const prevStartInput = startInput;

    setStartName(destName);
    setStartPos(destPos);
    setStartInput(destInput);

    setDestName(prevStartName);
    setDestPos(prevStartPos);
    setDestInput(prevStartInput);

    runOptimization(destPos, startPos);
  };

  // Map Click Pick handler
  const handleMapPick = (pos: [number, number]) => {
    if (pickingMode === 'START') {
      const label = `Pinned Origin (${pos[0]}, ${pos[1]})`;
      setStartPos(pos);
      setStartName(label);
      setStartInput(label);
      setPickingMode(null);
      runOptimization(pos, destPos);
    } else if (pickingMode === 'DEST') {
      const label = `Pinned Target (${pos[0]}, ${pos[1]})`;
      setDestPos(pos);
      setDestName(label);
      setDestInput(label);
      setPickingMode(null);
      runOptimization(startPos, pos);
    }
  };

  const selectedRoute = routes.find(r => r.id === selectedRouteId) || routes[0] || mockRoutes[0];

  const handleTransmit = () => {
    setTransmissionSuccess(true);
    setTimeout(() => setTransmissionSuccess(false), 4500);
  };

  return (
    <div className="space-y-4 animate-fade-in p-2">
      {/* PRIORITY 1: UNMISSABLE SIMULATION BANNER */}
      <div className="bg-amber-500 border-2 border-amber-700 text-slate-950 px-4 py-2.5 rounded-xl shadow-md flex items-center justify-between gap-3 font-sans mb-3">
        <div className="flex items-center gap-2.5">
          <span className="px-2 py-0.5 bg-black text-amber-300 font-mono font-black text-[11px] rounded tracking-wider uppercase flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            SIMULATED CORRIDOR PRESETS
          </span>
          <span className="text-xs font-bold text-slate-950">
            Water depth markers and road hazard levels reflect pre-calibrated scenario exercises.
          </span>
        </div>
        <span className="text-[10px] font-mono font-bold bg-amber-600 text-white px-2 py-0.5 rounded uppercase hidden sm:inline">
          DRILL PRESETS
        </span>
      </div>

      {/* Toast Alert */}
      {transmissionSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div>
            <div className="text-sm font-bold">Tactical Vector Transmitted!</div>
            <div className="text-xs text-slate-300">Route {selectedRoute.name} sent to Unit RT-02 HUD & Nav Display</div>
          </div>
        </div>
      )}

      {/* Header Banner & Regional Preset Selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-slate-500 tracking-wider uppercase font-mono">TACTICAL OPERATIONAL SCENARIOS:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {PRESET_CORRIDORS.map(corridor => (
                <button
                  key={corridor.id}
                  onClick={() => handleSelectCorridor(corridor.id)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 ${
                    activeCorridorId === corridor.id
                      ? 'bg-sky-50 border-sky-600 text-sky-800 ring-2 ring-sky-400/20'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>{corridor.badge}</span>
                  <span className="text-[11px] font-normal text-slate-500">({corridor.region.split('(')[0].trim()})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Map Click Pick Mode Controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setPickingMode(pickingMode === 'START' ? null : 'START')}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 ${
                pickingMode === 'START'
                  ? 'bg-emerald-600 text-white border-emerald-700 animate-pulse ring-2 ring-emerald-300'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              {pickingMode === 'START' ? 'Click Map to Place Origin 🟢' : 'Set Origin on Map 🟢'}
            </button>

            <button
              onClick={() => setPickingMode(pickingMode === 'DEST' ? null : 'DEST')}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 ${
                pickingMode === 'DEST'
                  ? 'bg-red-600 text-white border-red-700 animate-pulse ring-2 ring-red-300'
                  : 'bg-red-50 text-red-800 border-red-300 hover:bg-red-100'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              {pickingMode === 'DEST' ? 'Click Map to Place Dest 🔴' : 'Set Dest on Map 🔴'}
            </button>
          </div>
        </div>
      </div>

      {/* 3-Column Main Tactical Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Route Mission Parameters & Trajectories (4 cols) */}
        <div className="lg:col-span-4 space-y-3.5">
          {/* Mission Parameters Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Route className="w-4 h-4 text-sky-600" />
                Route Waypoint Parameters
              </h2>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded">
                DYNAMIC GRAPH
              </span>
            </div>

            {/* Starting Origin Input */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> STARTING ORIGIN
                </label>
                <span className="text-[10px] font-mono text-slate-400">[{startPos[0]}, {startPos[1]}]</span>
              </div>
              
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={startInput}
                  onFocus={() => setShowStartDropdown(true)}
                  onChange={(e) => {
                    setStartInput(e.target.value);
                    setShowStartDropdown(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleExecuteSearch('START');
                    }
                  }}
                  placeholder="Search starting origin, hospital, base..."
                  className="w-full pl-8 pr-16 py-2 bg-slate-50 hover:bg-white focus:bg-white text-xs text-slate-900 font-semibold border border-slate-300 focus:border-sky-500 rounded-lg outline-none transition shadow-inner"
                />
                <div className="absolute right-1.5 flex items-center gap-1">
                  {startInput && (
                    <button
                      onClick={() => {
                        setStartInput('');
                        setShowStartDropdown(false);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    onClick={() => handleExecuteSearch('START')}
                    title="Search and set starting origin"
                    className="p-1 bg-sky-100 hover:bg-sky-200 text-sky-700 rounded text-[10px] font-bold flex items-center gap-0.5 px-1.5"
                  >
                    Go
                  </button>
                </div>
              </div>

              {/* Start Dropdown */}
              {showStartDropdown && startSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-2xl z-50 divide-y divide-slate-100 max-h-52 overflow-y-auto">
                  {startSuggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setStartName(s.title);
                        setStartPos(s.pos);
                        setStartInput(s.title);
                        setShowStartDropdown(false);
                        runOptimization(s.pos, destPos);
                      }}
                      className="w-full text-left p-2.5 hover:bg-sky-50 text-xs transition flex items-center justify-between group"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-slate-800 group-hover:text-sky-700 truncate flex items-center gap-1.5">
                          {s.isLocal && <span className="px-1 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded">MATCH</span>}
                          <span>{s.title}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">{s.subtitle}</div>
                      </div>
                      <span className="text-[10px] text-emerald-600 font-mono font-bold flex-shrink-0 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        Set Origin
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Endpoints Swap Divider */}
            <div className="flex items-center justify-center my-0.5">
              <button
                onClick={handleSwapEndpoints}
                title="Swap Start & Destination"
                className="p-1 rounded-full bg-slate-100 hover:bg-sky-100 border border-slate-200 text-slate-600 hover:text-sky-700 text-[10px] font-bold flex items-center gap-1 px-2.5 transition"
              >
                <ArrowUpDown className="w-3 h-3 text-sky-600" />
                <span>Reverse Direction</span>
              </button>
            </div>

            {/* Destination Target Input */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span> DESTINATION TARGET
                </label>
                <span className="text-[10px] font-mono text-slate-400">[{destPos[0]}, {destPos[1]}]</span>
              </div>
              
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={destInput}
                  onFocus={() => setShowDestDropdown(true)}
                  onChange={(e) => {
                    setDestInput(e.target.value);
                    setShowDestDropdown(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleExecuteSearch('DEST');
                    }
                  }}
                  placeholder="Search destination shelter, high ridge, triage..."
                  className="w-full pl-8 pr-16 py-2 bg-slate-50 hover:bg-white focus:bg-white text-xs text-slate-900 font-semibold border border-slate-300 focus:border-sky-500 rounded-lg outline-none transition shadow-inner"
                />
                <div className="absolute right-1.5 flex items-center gap-1">
                  {destInput && (
                    <button
                      onClick={() => {
                        setDestInput('');
                        setShowDestDropdown(false);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    onClick={() => handleExecuteSearch('DEST')}
                    title="Search and set destination target"
                    className="p-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-[10px] font-bold flex items-center gap-0.5 px-1.5"
                  >
                    Go
                  </button>
                </div>
              </div>

              {/* Dest Dropdown */}
              {showDestDropdown && destSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-2xl z-50 divide-y divide-slate-100 max-h-52 overflow-y-auto">
                  {destSuggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setDestName(s.title);
                        setDestPos(s.pos);
                        setDestInput(s.title);
                        setShowDestDropdown(false);
                        runOptimization(startPos, s.pos);
                      }}
                      className="w-full text-left p-2.5 hover:bg-sky-50 text-xs transition flex items-center justify-between group"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-slate-800 group-hover:text-red-700 truncate flex items-center gap-1.5">
                          {s.isLocal && <span className="px-1 py-0.2 bg-red-100 text-red-800 text-[9px] font-bold rounded">MATCH</span>}
                          <span>{s.title}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">{s.subtitle}</div>
                      </div>
                      <span className="text-[10px] text-red-600 font-mono font-bold flex-shrink-0 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                        Set Target
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Prominent Action Button: Calculate Optimal Path */}
            <button
              onClick={() => runOptimization(startPos, destPos)}
              disabled={recalculating}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-50"
            >
              {recalculating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Computing Live Road Corridor Mesh...</span>
                </>
              ) : (
                <>
                  <Navigation2 className="w-4 h-4 text-emerald-300" />
                  <span>Calculate Optimal Path ({engineLatencyMs}ms)</span>
                </>
              )}
            </button>

            {/* Vehicle Specs Selection */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                VEHICLE CLEARANCE & LOGISTICS SPECS
              </label>
              <select
                value={vehicleType}
                onChange={(e) => {
                  setVehicleType(e.target.value);
                  runOptimization(startPos, destPos);
                }}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="Amphibious Craft B-14 (0.8m H₂O)">Amphibious Craft B-14 (Max 0.8m H₂O Clearance)</option>
                <option value="Tactical 4x4 Rescue Truck (0.55m H₂O)">Tactical 4x4 Rescue Truck (Max 0.55m H₂O Clearance)</option>
                <option value="Advanced Life Support Ambulance">Advanced Life Support Ambulance (Max 0.20m H₂O Clearance)</option>
                <option value="Zodiac Inflatable Raft (Deep Water)">Zodiac Inflatable Raft (Deep Water Navigation Only)</option>
              </select>
            </div>

            {/* Hazard Constraints Checkboxes */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                AUTOMATED HAZARD CONSTRAINTS
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                <input 
                  type="checkbox" 
                  checked={avoidInundation} 
                  onChange={e => {
                    setAvoidInundation(e.target.checked);
                    runOptimization(startPos, destPos);
                  }}
                  className="w-3.5 h-3.5 rounded text-sky-600 focus:ring-sky-500 border-slate-300" 
                />
                <span>Avoid Inundation Depth &gt; 0.4m</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                <input 
                  type="checkbox" 
                  checked={excludeBridges} 
                  onChange={e => {
                    setExcludeBridges(e.target.checked);
                    runOptimization(startPos, destPos);
                  }}
                  className="w-3.5 h-3.5 rounded text-sky-600 focus:ring-sky-500 border-slate-300" 
                />
                <span>Exclude Structural Bridge Collapses</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                <input 
                  type="checkbox" 
                  checked={prioritizePaved} 
                  onChange={e => {
                    setPrioritizePaved(e.target.checked);
                    runOptimization(startPos, destPos);
                  }}
                  className="w-3.5 h-3.5 rounded text-sky-600 focus:ring-sky-500 border-slate-300" 
                />
                <span>Prioritize Reinforced Paved Arteries</span>
              </label>
            </div>
          </div>

          {/* Evaluated Graph Trajectories */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
              <span>EVALUATED GRAPH TRAJECTORIES ({routes.length})</span>
              <span className="text-[10px] text-slate-400 font-normal">Click trajectory to inspect</span>
            </div>

            {routes.map((r) => {
              const isSelected = r.id === selectedRoute.id;
              const isHazard = r.status === 'HAZARD' || r.riskFactor === 'CRITICAL' || r.riskFactor === 'HIGH';
              const isCongested = r.status === 'CONGESTED';

              return (
                <div
                  key={r.id}
                  onClick={() => {
                    setSelectedRouteId(r.id);
                    setFitTrigger(prev => prev + 1);
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? isHazard
                        ? 'border-red-500 bg-red-50/50 shadow-md ring-1 ring-red-400'
                        : isCongested
                          ? 'border-amber-500 bg-amber-50/50 shadow-md ring-1 ring-amber-400'
                          : 'border-sky-500 bg-sky-50/60 shadow-md ring-2 ring-sky-300'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold font-mono tracking-wider text-slate-500">
                      {r.label || r.name}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        r.status === 'RECOMMENDED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.status === 'HAZARD'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-slate-900 mb-2 truncate">
                    {r.name}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-100 text-[11px]">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Distance</div>
                      <div className="font-bold text-slate-800 font-mono">{r.distance} km</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Est. Time</div>
                      <div className="font-bold text-sky-600 font-mono">{r.estimatedTime} min</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Risk Index</div>
                      <div className={`font-bold font-mono ${isHazard ? 'text-red-600' : 'text-emerald-600'}`}>
                        {r.riskPercent || (isHazard ? 88 : 12)}%
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center Column: Live GIS Map Viewport (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
            {/* Map Header Toolbar */}
            <div className="p-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
                  <button
                    onClick={() => setActiveLayer('multispectral')}
                    className={`px-2 py-1 rounded font-semibold transition ${
                      activeLayer === 'multispectral' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Multispectral
                  </button>
                  <button
                    onClick={() => setActiveLayer('ndwi')}
                    className={`px-2 py-1 rounded font-semibold transition ${
                      activeLayer === 'ndwi' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    NDWI Water
                  </button>
                  <button
                    onClick={() => setActiveLayer('sar')}
                    className={`px-2 py-1 rounded font-semibold transition ${
                      activeLayer === 'sar' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    SAR Pen.
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
                <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                <span>GPS SYNC: RT-02 [{startPos[0]}°N, {startPos[1]}°E]</span>
              </div>
            </div>

            {/* Map Container Canvas */}
            <div className="h-[530px] relative">
              <MapContainer
                center={[(startPos[0] + destPos[0]) / 2, (startPos[1] + destPos[1]) / 2]}
                zoom={11}
                style={{ height: '100%', width: '100%' }}
                className="z-10"
              >
                <MapRouteController 
                  route={selectedRoute} 
                  startPos={startPos} 
                  destPos={destPos} 
                  fitTrigger={fitTrigger} 
                />
                <MapClickHandler pickingMode={pickingMode} onPick={handleMapPick} />

                <TileLayer
                  key={activeLayer}
                  attribution='&copy; OpenStreetMap &copy; Esri'
                  url={
                    activeLayer === 'multispectral'
                      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                      : activeLayer === 'sar'
                        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                  }
                />

                {/* Render Alternative Polylines */}
                {routes.map((r, idx) => {
                  const isCurrent = r.id === selectedRoute.id;
                  const isHazard = r.status === 'HAZARD' || r.riskFactor === 'CRITICAL' || r.riskFactor === 'HIGH';
                  const isCongested = r.status === 'CONGESTED';
                  const color = isHazard ? '#ef4444' : isCongested ? '#f59e0b' : '#06b6d4';

                  return (
                    <div key={r.id || idx}>
                      {/* Glow outline for active recommended route */}
                      {isCurrent && !isHazard && (
                        <Polyline
                          positions={r.path || []}
                          pathOptions={{
                            color: '#0284c7',
                            weight: 10,
                            opacity: 0.35,
                          }}
                        />
                      )}

                      <Polyline
                        positions={r.path || []}
                        eventHandlers={{
                          click: () => {
                            setSelectedRouteId(r.id);
                            setFitTrigger(prev => prev + 1);
                          },
                        }}
                        pathOptions={{
                          color: color,
                          weight: isCurrent ? 6 : 3,
                          opacity: isCurrent ? 0.95 : 0.45,
                          dashArray: isHazard ? '8, 8' : undefined,
                        }}
                      >
                        <Popup>
                          <div className="p-2 text-xs">
                            <strong className={isHazard ? 'text-red-600' : 'text-sky-600'}>{r.name}</strong><br />
                            Distance: <strong>{r.distance} km</strong> | Time: <strong>{r.estimatedTime} min</strong><br />
                            Max Water Depth: <strong>{r.maxDepth || 0.12}m</strong>
                          </div>
                        </Popup>
                      </Polyline>
                    </div>
                  );
                })}

                {/* Start Marker */}
                <Marker position={startPos} icon={createWaypointIcon('🟢 ORIGIN', '#10b981')}>
                  <Popup>
                    <div className="p-2 text-xs">
                      <strong>ORIGIN: {startName}</strong><br />
                      GPS: {startPos[0]}, {startPos[1]}
                    </div>
                  </Popup>
                </Marker>

                {/* Destination Marker */}
                <Marker position={destPos} icon={createWaypointIcon('🔴 DESTINATION', '#dc2626', true)}>
                  <Popup>
                    <div className="p-2 text-xs">
                      <strong>DESTINATION: {destName}</strong><br />
                      GPS: {destPos[0]}, {destPos[1]}
                    </div>
                  </Popup>
                </Marker>

                {/* Inundated Hazard Marker (If hazard route exists) */}
                {routes.some(r => r.status === 'HAZARD') && (
                  <Marker 
                    position={[
                      +((startPos[0] * 0.45 + destPos[0] * 0.55).toFixed(5)),
                      +((startPos[1] * 0.45 + destPos[1] * 0.55).toFixed(5))
                    ]} 
                    icon={createHazardMarkerIcon(1.15)}
                  >
                    <Popup>
                      <div className="p-2 text-xs">
                        <strong className="text-red-600">⚠️ FLOODWATER INUNDATION CUTOFF</strong><br />
                        Water Depth: <strong>1.15m</strong> (Critical Submersion)<br />
                        Status: Route B Impassable. Detour via Route A High-Ground Bypass.
                      </div>
                    </Popup>
                  </Marker>
                )}
              </MapContainer>

              {/* Floating Quick Re-Center Map Button */}
              <button
                onClick={() => setFitTrigger(prev => prev + 1)}
                title="Fit Viewport to Full Route"
                className="absolute top-4 right-4 z-20 bg-white/90 hover:bg-white text-slate-800 p-2 rounded-lg shadow-lg border border-slate-300 transition flex items-center gap-1.5 text-xs font-bold backdrop-blur"
              >
                <LocateFixed className="w-4 h-4 text-sky-600" />
                <span>Fit Route</span>
              </button>

              {/* Floating Legend */}
              <div className="absolute bottom-4 left-4 z-20 bg-slate-900/90 border border-slate-700/80 rounded-lg p-2.5 backdrop-blur text-[11px] text-slate-300 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TACTICAL ROAD CORRIDORS</div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-1 bg-cyan-400 rounded"></span>
                  <span>Route A: Safe High Ground Bypass (Active)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-1 bg-red-500 rounded border-dashed"></span>
                  <span>Route B: Inundated Hazard Cutoff (&gt;1.1m)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-1 bg-amber-500 rounded"></span>
                  <span>Route C: Perimeter Evac Congestion Bypass</span>
                </div>
              </div>
            </div>

            {/* Map Telemetry Footer */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  OSRM Road Graph: Active
                </span>
                <span>Terrain Clearance: <strong className="text-white">Passable</strong></span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px]">
                <span>Corridor: <strong className="text-sky-400">{selectedRoute.name}</strong></span>
                <span>•</span>
                <span>Latency: <strong className="text-emerald-400">{engineLatencyMs}ms</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Route Telemetry & Turn-by-Turn Instructions (3 cols) */}
        <div className="lg:col-span-3 space-y-3">
          {/* Telemetry Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 truncate">
                <Zap className="w-4 h-4 text-sky-600 flex-shrink-0" />
                <span className="truncate">{selectedRoute.name}</span>
              </h2>
              <span className="px-2 py-0.5 bg-sky-100 text-sky-800 text-[10px] font-bold rounded flex-shrink-0">
                94% CONF
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <span className="text-slate-500">Total Distance</span>
                <span className="font-bold text-slate-900 font-mono text-sm">{selectedRoute.distance} km</span>
              </div>

              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <span className="text-slate-500">Est. Travel Time</span>
                <span className="font-bold text-sky-600 font-mono text-sm">{selectedRoute.estimatedTime} min</span>
              </div>

              <div className="pb-1.5 border-b border-slate-100">
                <div className="flex items-center justify-between mb-1 text-[11px]">
                  <span className="text-slate-500">Road Quality Index</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {selectedRoute.status === 'RECOMMENDED' ? '94/100' : '42/100'}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      selectedRoute.status === 'RECOMMENDED' ? 'bg-sky-500' : 'bg-red-500'
                    }`}
                    style={{ width: selectedRoute.status === 'RECOMMENDED' ? '94%' : '42%' }}
                  ></div>
                </div>
              </div>

              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <span className="text-slate-500">Flood Crossings</span>
                <span className="font-bold font-mono text-slate-800">
                  {selectedRoute.status === 'RECOMMENDED' ? '0 Critical (Passable)' : '1 Critical (>1.1m)'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Corridor Clearance</span>
                <span className="font-bold text-emerald-600 font-mono">
                  {selectedRoute.status === 'RECOMMENDED' ? '98% Passable' : '15% Blocked'}
                </span>
              </div>
            </div>
          </div>

          {/* Turn-by-Turn Manifest */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Turn-by-Turn Manifest
              </h2>
              <span className="text-[10px] text-slate-400 font-mono">TACTICAL LEGS</span>
            </div>

            <div className="space-y-3 max-h-56 overflow-y-auto text-xs relative pl-3 border-l-2 border-slate-200">
              {selectedRoute.turn_by_turn && selectedRoute.turn_by_turn.length > 0 ? (
                selectedRoute.turn_by_turn.map((step, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[19px] top-0.5 w-2 h-2 rounded-full bg-sky-600"></div>
                    <div className="font-mono text-[10px] text-slate-500 font-bold">{step.km} km</div>
                    <div className="font-bold text-slate-800 mt-0.5">{step.instruction}</div>
                    <div className="text-[11px] text-slate-500">{step.detail}</div>
                  </div>
                ))
              ) : (
                <>
                  <div className="relative">
                    <div className="absolute -left-[19px] top-0.5 w-2 h-2 rounded-full bg-emerald-600"></div>
                    <div className="font-mono text-[10px] text-emerald-600 font-bold">0.0 km</div>
                    <div className="font-bold text-slate-800 mt-0.5">Depart {startName}</div>
                    <div className="text-[11px] text-slate-500">Begin transit on designated arterial road corridor</div>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-[19px] top-0.5 w-2 h-2 rounded-full bg-sky-600"></div>
                    <div className="font-mono text-[10px] text-slate-600 font-bold">{(selectedRoute.distance * 0.45).toFixed(1)} km</div>
                    <div className="font-bold text-slate-800 mt-0.5">Maintain High-Ground Bypass</div>
                    <div className="text-[11px] text-emerald-600 font-medium">Safe of river flood surge &bull; Depth &lt; 0.15m</div>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-[19px] top-0.5 w-2 h-2 rounded-full bg-red-600"></div>
                    <div className="font-mono text-[10px] text-red-600 font-bold">{selectedRoute.distance} km</div>
                    <div className="font-bold text-slate-800 mt-0.5">Arrive at {destName}</div>
                    <div className="text-[11px] text-slate-500">Staging area clear for offloading and triage</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <button 
              onClick={handleTransmit}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl transition shadow-sm"
            >
              <Radio className="w-4 h-4 animate-pulse" />
              Transmit Vector to Team RT-02
            </button>

            <button 
              onClick={() => runOptimization(startPos, destPos)}
              disabled={recalculating}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
            >
              <Zap className="w-3.5 h-3.5 text-purple-600" />
              Recalculate with Drone Feeds
            </button>

            <button 
              onClick={() => window.print()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs rounded-xl transition"
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
