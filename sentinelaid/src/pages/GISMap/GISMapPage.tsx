import { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import { getRegionalDisasterCorridor, type RegionalDisasterCorridor } from '../../data/regionalDisasterCorridors';
import { useSearchParams } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Search, Layers, Navigation, Maximize, Download, Radio, Loader2, MapPin, Building2, Crosshair, CheckCircle2, AlertTriangle, ShieldCheck, Truck, Shield, Send, X, RefreshCw, ChevronRight, Compass, Route, AlertOctagon } from 'lucide-react';
import { getRegionalStagingBases, calculateOptimalRescuePath, type StagingBase, type OptimalRescuePathResult } from '../../services/rescueMissionService';
import { gisService } from '../../services/api';
import { mockMapLayers } from '../../data/mockData';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function MapRecenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const prevCenterRef = useRef<[number, number]>(center);

  useEffect(() => {
    if (prevCenterRef.current[0] !== center[0] || prevCenterRef.current[1] !== center[1]) {
      map.flyTo(center, zoom, { duration: 1.5 });
      prevCenterRef.current = center;
    } else {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);

  return null;
}

// Organic polygon generator for realistic geographic contours
const getOrganicPolygon = (cLat: number, cLng: number, rLat: number, rLng: number, pts = 8, phase = 0): [number, number][] => {
  const coords: [number, number][] = [];
  const seed = Math.abs(cLat * 1000 + cLng * 100) % 1000;
  for (let i = 0; i < pts; i++) {
    const angle = (i / pts) * 2 * Math.PI + phase;
    const harmonic1 = Math.sin(angle * 2 + seed * 0.1) * 0.28;
    const harmonic2 = Math.cos(angle * 3 + seed * 0.05) * 0.18;
    const radFactor = 1.0 + harmonic1 + harmonic2;
    const lat = cLat + Math.sin(angle) * rLat * radFactor;
    const lng = cLng + Math.cos(angle) * rLng * radFactor;
    coords.push([+lat.toFixed(5), +lng.toFixed(5)]);
  }
  coords.push(coords[0]);
  return coords;
};

// Smart candidate geocode queries builder

export interface DistrictVillage {
  id: string;
  name: string;
  tier: 'HIGH' | 'MEDIUM' | 'SAFE';
  hazard_reason: string;
  depth_m: number;
  population: number;
  stranded: number;
  status: string;
  lat: number;
  lng: number;
  bearing: string;
}


const createDistrictBadgeIcon = (name: string, badgeColor: string) => {
  return L.divIcon({
    className: 'custom-district-badge-icon',
    html: `<div style="background-color: #0f172a; color: #f8fafc; padding: 3px 12px; border-radius: 9999px; font-weight: 800; font-size: 12px; border: 2px solid #38bdf8; box-shadow: 0 4px 12px rgba(15,23,42,0.6); white-space: nowrap; font-family: sans-serif; cursor: pointer; text-align: center; transform: translate(-50%, -50%); display: flex; align-items: center; gap: 4px;">
      <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #38bdf8;"></span>
      <span>${name}</span>
    </div>`,
    iconSize: [140, 26],
    iconAnchor: [70, 13],
  });
};

const createAdjacentMonitorIcon = (name: string) => {
  return L.divIcon({
    className: 'custom-monitor-badge-icon',
    html: `<div style="background-color: #334155; color: white; padding: 3px 11px; border-radius: 9999px; font-weight: 700; font-size: 11px; border: 1.5px solid rgba(255,255,255,0.7); box-shadow: 0 2px 6px rgba(0,0,0,0.4); white-space: nowrap; font-family: sans-serif; transform: translate(-50%, -50%);">${name}</div>`,
    iconSize: [80, 24],
    iconAnchor: [40, 12],
  });
};


const createRescueBaseIcon = (org: string, name: string) => {
  const bg = org === 'NDRF' ? '#dc2626' : org === 'APF' ? '#0284c7' : '#059669';
  return L.divIcon({
    className: 'custom-rescue-base-icon',
    html: `<div style="background: ${bg}; color: white; padding: 4px 10px; border-radius: 9999px; font-weight: 800; font-size: 11px; border: 2.5px solid white; box-shadow: 0 4px 14px rgba(0,0,0,0.6); white-space: nowrap; font-family: system-ui, sans-serif; display: flex; align-items: center; gap: 4px; animation: bounce 1.8s infinite;">
      <span>🚑</span>
      <span>[${org}] ${name.split('(')[0].trim()}</span>
    </div>`,
    iconSize: [160, 26],
    iconAnchor: [80, 13],
  });
};

const createHazardAvoidanceIcon = (reason: string) => {
  return L.divIcon({
    className: 'custom-hazard-avoid-icon',
    html: `<div style="background: #ef4444; color: white; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 10px; border: 2px solid white; box-shadow: 0 0 14px rgba(239,68,68,0.8); white-space: nowrap; font-family: monospace;">
      <span>⚠️ BYPASSED: ${reason}</span>
    </div>`,
    iconSize: [180, 24],
    iconAnchor: [90, 12],
  });
};

const createDownstreamAlertIcon = (label: string) => {
  return L.divIcon({
    className: 'custom-downstream-alert-icon',
    html: `<div style="background-color: #f97316; color: white; padding: 4px 10px; border-radius: 8px; font-weight: 800; font-size: 10px; border: 1.5px solid white; box-shadow: 0 3px 10px rgba(249,115,22,0.6); white-space: nowrap; font-family: sans-serif; display: flex; align-items: center; gap: 4px; transform: translate(-50%, -50%);"><span>${label}</span> <span style="font-size: 12px;">📈</span></div>`,
    iconSize: [110, 26],
    iconAnchor: [55, 13],
  });
};

const createFloodTownIcon = (name: string, symbol: string) => {
  return L.divIcon({
    className: 'custom-flood-town-marker',
    html: `<div style="display: flex; align-items: center; gap: 4px; background: rgba(88,28,135,0.92); backdrop-filter: blur(4px); padding: 2px 8px; border-radius: 9999px; border: 1.5px solid #e9d5ff; box-shadow: 0 2px 8px rgba(88,28,135,0.5); white-space: nowrap; cursor: pointer; transform: translate(-50%, -100%);">
      <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #c084fc; border: 1.5px solid white;"></span>
      <span style="color: #faf5ff; font-size: 11px; font-weight: 700; font-family: sans-serif;">${name}</span>
    </div>`,
    iconSize: [120, 22],
    iconAnchor: [60, 22],
  });
};

const createVillageIcon = (tier: 'HIGH' | 'MEDIUM' | 'SAFE', name: string) => {
  const bg = tier === 'HIGH' ? '#dc2626' : tier === 'MEDIUM' ? '#d97706' : '#16a34a';
  return L.divIcon({
    className: 'custom-village-icon',
    html: `<div style="background-color: ${bg}; color: white; padding: 2px 7px; border-radius: 9999px; font-weight: 700; font-size: 10px; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.5); white-space: nowrap; font-family: sans-serif; cursor: pointer;">${tier === 'HIGH' ? '🔴' : tier === 'MEDIUM' ? '🟡' : '🟢'} ${name}</div>`,
    iconSize: [100, 22],
    iconAnchor: [50, 11],
  });
};

const getDistrictVillages = (districtName: string, baseLat: number, baseLng: number): DistrictVillage[] => {
  const dLower = districtName.toLowerCase();
  const isRajam = dLower.includes('rajam') || dLower.includes('srikakulam') || dLower.includes('vizianagaram') || dLower.includes('andhra');
  const isNepal = dLower.includes('nepal') || dLower.includes('kathmandu') || dLower.includes('trishuli') || dLower.includes('nuwakot') || dLower.includes('bagmati');

    if (isRajam) {
    return [
      {
        id: 'vil-r-1',
        name: 'Boddam',
        tier: 'HIGH',
        hazard_reason: 'Lowland agricultural basin & irrigation canal breach. Water depth 1.65m. Road traffic completely submerged.',
        depth_m: 1.65,
        population: 1420,
        stranded: 58,
        status: 'Evacuation Critical (Boat/Air)',
        lat: +(baseLat - 0.0200).toFixed(5),
        lng: +(baseLng - 0.0220).toFixed(5),
        bearing: '2.1 km SW'
      },
      {
        id: 'vil-r-2',
        name: 'Prasanthi Nagar',
        tier: 'HIGH',
        hazard_reason: 'Palakonda road underpass submerged 1.85m. Lowland residential ground floors flooded by storm runoff.',
        depth_m: 1.85,
        population: 2800,
        stranded: 42,
        status: 'Road Cutoff / Rooftop Rescue',
        lat: +(baseLat - 0.0220).toFixed(5),
        lng: +(baseLng + 0.0180).toFixed(5),
        bearing: '1.9 km SE'
      },
      {
        id: 'vil-r-3',
        name: 'Pogiri',
        tier: 'HIGH',
        hazard_reason: 'Low riverbank settlement near arterial bridge on Suvarnamukhi/Vegavathi drainage. Water depth 1.55m. Access pathways washed out.',
        depth_m: 1.55,
        population: 2150,
        stranded: 34,
        status: 'Riverbank Breach / Cutoff',
        lat: +(baseLat + 0.0240).toFixed(5),
        lng: +(baseLng - 0.0220).toFixed(5),
        bearing: '2.4 km NW'
      },
      {
        id: 'vil-r-4',
        name: 'Saradhi',
        tier: 'MEDIUM',
        hazard_reason: 'Residential & agricultural border on eastern fringe of Rajam town. Road shoulder overflow (0.55m depth). Accessible by high-clearance 4x4 trucks & tractors.',
        depth_m: 0.55,
        population: 1850,
        stranded: 0,
        status: 'Flood Alert / Convoys Only',
        lat: +(baseLat - 0.0020).toFixed(5),
        lng: +(baseLng + 0.0320).toFixed(5),
        bearing: '1.8 km East'
      },
      {
        id: 'vil-r-5',
        name: 'Maredubaka',
        tier: 'MEDIUM',
        hazard_reason: 'Canal overflow encroaching village approach road (0.45m depth). Low-lying lanes waterlogged. Receding slowly.',
        depth_m: 0.45,
        population: 1320,
        stranded: 0,
        status: 'Accessible via Bypass',
        lat: +(baseLat + 0.0240).toFixed(5),
        lng: +(baseLng + 0.0220).toFixed(5),
        bearing: '2.3 km NE'
      },
      {
        id: 'vil-r-6',
        name: 'Gadimudidam',
        tier: 'MEDIUM',
        hazard_reason: 'Agricultural field runoff approaching village perimeter (0.38m depth). Road passable with caution.',
        depth_m: 0.38,
        population: 1480,
        stranded: 0,
        status: 'Caution Passable',
        lat: +(baseLat - 0.0380).toFixed(5),
        lng: +(baseLng - 0.0040).toFixed(5),
        bearing: '3.6 km South'
      },
      {
        id: 'vil-r-7',
        name: 'Kondampeta (GMRIT Campus)',
        tier: 'SAFE',
        hazard_reason: 'Elevated bedrock plateau (68m MSL). Designated District Civilian Relief Shelter, Triage Hospital & Helicopter LZ.',
        depth_m: 0.0,
        population: 0,
        stranded: 0,
        status: 'Primary Evacuation LZ',
        lat: +(baseLat + 0.0340).toFixed(5),
        lng: +(baseLng - 0.0020).toFixed(5),
        bearing: '2.4 km North'
      }
    ];
  }

  if (isNepal) {
    return [
      {
        id: 'vil-n-1',
        name: 'Balkhu Riverside',
        tier: 'HIGH',
        hazard_reason: 'Bagmati river violent torrent & bridgehead breach. Water depth 2.1m. Homes inundated.',
        depth_m: 2.10,
        population: 2100,
        stranded: 68,
        status: 'Critical Inundation',
        lat: +(baseLat - 0.0020).toFixed(5),
        lng: +(baseLng - 0.0015).toFixed(5),
        bearing: '1.0 km SW'
      },
      {
        id: 'vil-n-2',
        name: 'Sundarighat Settlement',
        tier: 'HIGH',
        hazard_reason: 'Low riverbank floodplain overflow. Access bridge washed out (1.85m depth). Inflatable craft needed.',
        depth_m: 1.85,
        population: 1450,
        stranded: 44,
        status: 'Submerged Access',
        lat: +(baseLat - 0.0030).toFixed(5),
        lng: +(baseLng + 0.0012).toFixed(5),
        bearing: '1.4 km SE'
      },
      {
        id: 'vil-n-3',
        name: 'Sanepa Lowlands',
        tier: 'MEDIUM',
        hazard_reason: 'Stormwater drainage backflow and street waterlogging (0.65m depth). 4x4 trucks operating.',
        depth_m: 0.65,
        population: 1920,
        stranded: 0,
        status: '4x4 Vehicles Only',
        lat: +(baseLat + 0.0015).toFixed(5),
        lng: +(baseLng - 0.0022).toFixed(5),
        bearing: '1.3 km NW'
      },
      {
        id: 'vil-n-4',
        name: 'Tribhuvan University Ridge Haven',
        tier: 'SAFE',
        hazard_reason: 'High elevation ridge crest (1,310m MSL). Designated multi-ward civilian shelter and helicopter LZ.',
        depth_m: 0.0,
        population: 0,
        stranded: 0,
        status: 'Primary Safe Haven & LZ',
        lat: +(baseLat + 0.0058).toFixed(5),
        lng: +(baseLng - 0.0035).toFixed(5),
        bearing: '2.5 km NW'
      }
    ];
  }

  const rawTitle = districtName.split(',')[0].trim();
  const title = (rawTitle.toLowerCase().includes('sector 4b') || rawTitle.toLowerCase().includes('south delta'))
    ? 'Trishuli Valley'
    : rawTitle;
  return [
    {
      id: 'vil-g-1',
      name: `${title} Riverbed Lowlands`,
      tier: 'HIGH',
      hazard_reason: 'Direct riverbank surge & basinal depression. Water depth 1.70m. Submerged residential structures.',
      depth_m: 1.70,
      population: 1350,
      stranded: 46,
      status: 'Critical Inundation',
      lat: +(baseLat - 0.0020).toFixed(5),
      lng: +(baseLng - 0.0018).toFixed(5),
      bearing: '1.1 km SW'
    },
    {
      id: 'vil-g-2',
      name: `${title} South Basinal Ward`,
      tier: 'HIGH',
      hazard_reason: 'Main arterial culvert breach. Road access submerged 1.55m. Ground vehicles cannot traverse.',
      depth_m: 1.55,
      population: 1820,
      stranded: 32,
      status: 'Road Cutoff Hazard',
      lat: +(baseLat - 0.0015).toFixed(5),
      lng: +(baseLng + 0.0012).toFixed(5),
      bearing: '0.9 km SE'
    },
    {
      id: 'vil-g-3',
      name: `${title} Market Approach`,
      tier: 'MEDIUM',
      hazard_reason: 'Water logging across access avenues (0.50m depth). Passable for tactical 4x4 trucks.',
      depth_m: 0.50,
      population: 1550,
      stranded: 0,
      status: 'Tactical Vehicles Only',
      lat: +(baseLat + 0.0012).toFixed(5),
      lng: +(baseLng + 0.0025).toFixed(5),
      bearing: '1.3 km NE'
    },
    {
      id: 'vil-g-4',
      name: `${title} North High Ground Haven`,
      tier: 'SAFE',
      hazard_reason: 'Elevated bedrock ridge (+25m above valley floor). Designated Civilian Relief Haven & Shelter.',
      depth_m: 0.0,
      population: 0,
      stranded: 0,
      status: 'Designated Relief Haven',
      lat: +(baseLat + 0.0055).toFixed(5),
      lng: +(baseLng - 0.0032).toFixed(5),
      bearing: '2.2 km NW'
    }
  ];
};

const buildGeocodeQueries = (rawQuery: string): string[] => {
  const trimmed = rawQuery.trim();
  if (!trimmed) return [];
  const parts = trimmed.split(/[,/]+/).map(p => p.trim()).filter(Boolean);
  const candidates: string[] = [trimmed];
  if (parts.length > 1) {
    candidates.push(parts[0]);
    candidates.push(`${parts[0]}, ${parts[parts.length - 1]}`);
  }
  return Array.from(new Set(candidates));
};

export default function GISMapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeOperationId } = useAppStore();

  const queryLat = parseFloat(searchParams.get('lat') || '');
  const queryLng = parseFloat(searchParams.get('lng') || '');
  const queryZoom = parseInt(searchParams.get('zoom') || '13', 10);

  const isNepal = 
    (!isNaN(queryLat) && queryLat > 25 && !isNaN(queryLng) && queryLng < 88) ||
    (activeOperationId || '').toUpperCase().includes('NEPAL') ||
    (activeOperationId || '').toUpperCase().includes('NPL');

  const initialLat = !isNaN(queryLat) ? queryLat : (isNepal ? 27.9250 : 27.9250);
  const initialLng = !isNaN(queryLng) ? queryLng : (isNepal ? 85.1550 : 85.1550);
  const initialZoom = !isNaN(queryZoom) ? queryZoom : 13;

  // Active Map Location State
  const [currentCenter, setCurrentCenter] = useState<[number, number]>([initialLat, initialLng]);
  const [currentZoom, setCurrentZoom] = useState<number>(initialZoom);
  const [locationName, setLocationName] = useState<string>(
    isNepal ? 'Bagmati River Basin, Kathmandu' : 'Trishuli Valley, Nuwakot (Nepal)'
  );

  // Search and Autocomplete State
  const [searchQuery, setSearchQuery] = useState(locationName);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ name: string; subtitle: string; lat: number; lng: number }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchDebounceRef = useRef<any>(null);

  // Real Road Routing state from OpenStreetMap OSRM
  const [realSafeRoute, setRealSafeRoute] = useState<[number, number][] | null>(null);
  const [realBlockedRoad, setRealBlockedRoad] = useState<[number, number][] | null>(null);
  const [activeRescueMission, setActiveRescueMission] = useState<OptimalRescuePathResult | null>(null);
  const [isCalculatingRescuePath, setIsCalculatingRescuePath] = useState(false);
  const [dispatchToast, setDispatchToast] = useState<string | null>(null);
  const [showRescueHUD, setShowRescueHUD] = useState(true);
  const [showTurnSteps, setShowTurnSteps] = useState(false);

  const [roadInfo, setRoadInfo] = useState<{ roadName: string; distanceKm: string; durationMin: string } | null>(null);

  const [layers, setLayers] = useState(mockMapLayers);
  const [basemap, setBasemap] = useState<'satellite' | 'vector' | 'thermal'>('satellite');
  const [selectedFilter, setSelectedFilter] = useState<string>('Critical (42)');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Fetch real road routes whenever map center changes
  useEffect(() => {
    let active = true;
    const fetchRealRoadGeometry = async () => {
      const [baseLat, baseLng] = currentCenter;
      const startLat = +(baseLat - 0.0020).toFixed(5);
      const startLng = +(baseLng + 0.0005).toFixed(5);
      const endLat = +(baseLat + 0.0055).toFixed(5);
      const endLng = +(baseLng - 0.0035).toFixed(5);

      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        if (data.routes && data.routes.length > 0 && active) {
          const mainRoute = data.routes[0];
          const rawCoords = mainRoute.geometry.coordinates;
          const leafletPoints: [number, number][] = rawCoords.map((c: [number, number]) => [c[1], c[0]]);
          setRealSafeRoute(leafletPoints);

          let name = '';
          if (mainRoute.legs && mainRoute.legs[0]?.steps) {
            for (const step of mainRoute.legs[0].steps) {
              if (step.name && step.name.trim().length > 0) {
                name = step.name;
                break;
              }
            }
          }

          setRoadInfo({
            roadName: name || 'Paved Arterial Highway',
            distanceKm: (mainRoute.distance / 1000).toFixed(2),
            durationMin: Math.max(1, Math.ceil(mainRoute.duration / 60)).toString(),
          });

          if (leafletPoints.length >= 4) {
            const cutoffCount = Math.max(3, Math.min(16, Math.floor(leafletPoints.length * 0.35)));
            setRealBlockedRoad(leafletPoints.slice(0, cutoffCount));
          }
        }
      } catch (err) {
        console.warn('OSRM routing fetch failed:', err);
      }
    };

    fetchRealRoadGeometry();
    return () => {
      active = false;
    };
  }, [currentCenter]);

  // Autocomplete Suggestions Generator
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(async () => {
      const presets = [
        { name: 'Rajam', subtitle: 'Vizianagaram / Srikakulam, Andhra Pradesh, India', lat: 18.4554, lng: 83.6558 },
        { name: 'Kathmandu', subtitle: 'Bagmati Province, Nepal', lat: 27.7172, lng: 85.3240 },
        { name: 'Trishuli Bazaar', subtitle: 'Nuwakot, Bagmati Province, Nepal', lat: 27.9250, lng: 85.1550 },
        { name: 'Assam Valley', subtitle: 'Brahmaputra Basin, Guwahati, Assam, India', lat: 26.1600, lng: 91.7500 },
        { name: 'Balkhu Bridge', subtitle: 'Kathmandu Valley Flashflood Zone, Nepal', lat: 27.6835, lng: 85.2930 },
      ];

      const q = searchQuery.toLowerCase();
      const matchedPresets = presets.filter(p => p.name.toLowerCase().includes(q) || p.subtitle.toLowerCase().includes(q));

      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=4&addressdetails=1`);
        if (res.ok) {
          const data = await res.json();
          const nominatimResults = data.map((item: any) => ({
            name: item.name || item.display_name.split(',')[0],
            subtitle: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon)
          }));
          const combined = [...matchedPresets, ...nominatimResults];
          const unique = Array.from(new Map(combined.map(item => [`${item.lat.toFixed(4)},${item.lng.toFixed(4)}`, item])).values());
          setSuggestions(unique.slice(0, 5));
        } else {
          setSuggestions(matchedPresets);
        }
      } catch (err) {
        setSuggestions(matchedPresets);
      }
    }, 280);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  const handleSelectLocation = (loc: { name: string; subtitle: string; lat: number; lng: number }) => {
    setCurrentCenter([loc.lat, loc.lng]);
    setCurrentZoom(14);
    setLocationName(`${loc.name} (${loc.subtitle.split(',')[0]})`);
    setSearchQuery(`${loc.name}, ${loc.subtitle.split(',')[0]}`);
    setShowSuggestions(false);
    setSearchParams({ lat: loc.lat.toFixed(5), lng: loc.lng.toFixed(5), zoom: '14' });
  };

  const handleExecuteSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setShowSuggestions(false);

    const candidates = buildGeocodeQueries(searchQuery);
    for (const cand of candidates) {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cand)}&limit=1&addressdetails=1`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            const item = data[0];
            const lat = parseFloat(item.lat);
            const lng = parseFloat(item.lon);
            handleSelectLocation({
              name: item.name || cand,
              subtitle: item.display_name,
              lat,
              lng
            });
            setIsSearching(false);
            return;
          }
        }
      } catch (e) {
        // try next candidate
      }
    }
    setIsSearching(false);
  };

  // Export GeoJSON FeatureCollection
  const handleExportGeoJSON = () => {
    const [cLat, cLng] = currentCenter;
    const floodPolygon = getOrganicPolygon(cLat, cLng, 0.0055, 0.0075, 10, 0.4);

    const featureCollection = {
      type: 'FeatureCollection',
      metadata: {
        location: locationName,
        timestamp: new Date().toISOString(),
        system: 'SentinelAID Tactical GIS Engine',
      },
      features: [
        {
          type: 'Feature',
          properties: {
            layer: 'INUNDATION_EXTENT',
            severity: 'HIGH_CRITICAL',
            avgDepthM: 1.45,
          },
          geometry: {
            type: 'Polygon',
            coordinates: [floodPolygon.map(([lat, lng]) => [lng, lat])],
          },
        },
        ...(realSafeRoute ? [{
          type: 'Feature',
          properties: {
            layer: 'SAFE_EVACUATION_CORRIDOR',
            roadName: roadInfo?.roadName || 'Paved Arterial',
            distanceKm: roadInfo?.distanceKm || '2.3',
            status: 'PASSABLE_DRY',
          },
          geometry: {
            type: 'LineString',
            coordinates: realSafeRoute.map(([lat, lng]) => [lng, lat]),
          },
        }] : []),
        ...(realBlockedRoad ? [{
          type: 'Feature',
          properties: {
            layer: 'BLOCKED_ROAD_CUTOFF',
            hazard: 'SUBMERGED_PULSE',
            status: 'IMPASSABLE',
          },
          geometry: {
            type: 'LineString',
            coordinates: realBlockedRoad.map(([lat, lng]) => [lng, lat]),
          },
        }] : []),
      ],
    };

    const blob = new Blob([JSON.stringify(featureCollection, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sentinelaid_gis_${locationName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.geojson`;
    link.click();
    URL.revokeObjectURL(url);

    setExportNotice('GeoJSON exported successfully');
    setTimeout(() => setExportNotice(null), 3500);
  };

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

  // Dynamic Geographic Features based on current map center
  const [cLat, cLng] = currentCenter;

  // Regional Multi-District Disaster Corridor (Matching User Reference Image)
  // Regional Emergency Staging Bases (NDRF, APF, SDRF)
  const stagingBases: StagingBase[] = useMemo(() => {
    return getRegionalStagingBases(locationName, cLat, cLng);
  }, [locationName, cLat, cLng]);

  // Optimal Rescue Route calculation for any village
  const handleFindRescuePath = async (village: DistrictVillage) => {
    setIsCalculatingRescuePath(true);
    try {
      const base = stagingBases[0];
      const result = await calculateOptimalRescuePath({
        base,
        targetName: village.name,
        targetPos: [village.lat, village.lng],
        targetDepthM: village.depth_m,
        targetStranded: village.stranded || 28,
        avoidInundation: true
      });
      setActiveRescueMission(result);
      setShowRescueHUD(true);
      setCurrentCenter([village.lat, village.lng]);
      setCurrentZoom(13);
      setDispatchToast(`Optimal safe path routed from ${base.name} to ${village.name}!`);
      setTimeout(() => setDispatchToast(null), 4500);
    } catch (err) {
      console.error('Failed to calculate rescue path:', err);
    } finally {
      setIsCalculatingRescuePath(false);
    }
  };

  const regionalCorridor: RegionalDisasterCorridor = useMemo(() => {
    return getRegionalDisasterCorridor(locationName, cLat, cLng);
  }, [locationName, cLat, cLng]);

  // District villages and locality risk breakdown
  const districtVillages = getDistrictVillages(locationName, cLat, cLng);
  const [villageFilter, setVillageFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'SAFE'>('ALL');
  const dynamicFloodPolygon = getOrganicPolygon(cLat, cLng, 0.0055, 0.0075, 10, 0.4);
  const dynamicSafeZonePolygon = getOrganicPolygon(cLat + 0.0055, cLng - 0.0035, 0.0030, 0.0035, 7, 0.8);

  const dynamicRescueZones = [
    {
      center: [+(cLat - 0.0018).toFixed(5), +(cLng - 0.0012).toFixed(5)] as [number, number],
      label: `${locationName.split(' ')[0]} Lowland Rescue Sector Alpha`,
      civilians: 320,
    },
    {
      center: [+(cLat + 0.0015).toFixed(5), +(cLng + 0.0022).toFixed(5)] as [number, number],
      label: `${locationName.split(' ')[0]} Municipal School Cluster`,
      civilians: 145,
    },
  ];

  return (
    <div className="flex h-screen bg-canvas overflow-hidden pt-12">
      {/* PRIORITY 1: UNMISSABLE FLOATING SIMULATION BANNER */}
      <div className="absolute top-14 left-84 right-4 z-[1000] pointer-events-none">
        <div className="bg-amber-500/95 border-2 border-amber-700 text-slate-950 px-3.5 py-1.5 rounded-lg shadow-lg flex items-center justify-between gap-2 pointer-events-auto backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-black text-amber-300 font-mono font-black text-[10px] rounded uppercase">
              SIMULATED SCENARIO DATA — NOT LIVE
            </span>
            <span className="text-[11px] font-extrabold text-slate-950">
              Village casualty census, stranded headcounts, and water depths are synthetic drill data.
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold bg-amber-600 text-white px-2 py-0.5 rounded uppercase hidden md:inline">
            DRILL SCENARIO
          </span>
        </div>
      </div>

      {/* Left Control Panel */}
      <div className="w-80 bg-surface border-r border-border flex flex-col shrink-0 z-10 overflow-y-auto">
        <div className="p-3 border-b border-border bg-panel/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-bold text-text-primary uppercase tracking-wide">
              TACTICAL GIS MAP
            </span>
            <span className="px-2 py-0.5 bg-critical/10 text-critical text-[10px] font-bold rounded flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-critical animate-pulse" />
              DRILL SIMULATION
            </span>
          </div>

          {/* Interactive Geocoding Search */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={(e) => e.key === 'Enter' && handleExecuteSearch()}
              placeholder="Search district, city or coordinate..."
              className="w-full h-8 pl-8 pr-8 border border-border-input rounded text-[12px] outline-none focus:border-primary transition bg-white"
            />
            {isSearching ? (
              <Loader2 size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-primary animate-spin" />
            ) : (
              <button
                onClick={handleExecuteSearch}
                className="absolute right-1 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-primary text-white rounded text-[10px] font-semibold hover:bg-primary-hover transition"
              >
                Go
              </button>
            )}

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-border rounded-md shadow-xl z-50 overflow-hidden text-left">
                <div className="p-1.5 bg-slate-50 border-b border-border text-[10px] font-bold text-text-muted uppercase">
                  Matching Operational Sectors
                </div>
                {suggestions.map((loc, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectLocation(loc)}
                    className="w-full px-2.5 py-1.5 text-left hover:bg-primary/5 transition border-b border-slate-100 last:border-0 flex flex-col"
                  >
                    <span className="text-[12px] font-bold text-text-primary">{loc.name}</span>
                    <span className="text-[10px] text-text-muted truncate">{loc.subtitle}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Presets */}
          <div className="flex gap-1 mt-2 overflow-x-auto pb-1 text-[10px]">
            {[
              { label: 'Rajam (AP)', lat: 18.4554, lng: 83.6558, name: 'Rajam' },
              { label: 'Kathmandu', lat: 27.7172, lng: 85.3240, name: 'Kathmandu' },
              { label: 'Trishuli', lat: 27.9250, lng: 85.1550, name: 'Trishuli' },
              { label: 'Assam (India)', lat: 26.1600, lng: 91.7500, name: 'Assam Valley' },
            ].map(preset => (
              <button
                key={preset.label}
                onClick={() => handleSelectLocation({ name: preset.name, subtitle: preset.label, lat: preset.lat, lng: preset.lng })}
                className="px-2 py-0.5 bg-surface border border-border rounded hover:border-primary text-text-secondary hover:text-primary whitespace-nowrap transition"
              >
                {preset.label}
              </button>
            ))}
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
                  id={layer.id}
                  checked={layer.visible}
                  onChange={() => toggleLayer(layer.id)}
                  className="rounded border-border mt-0.5 text-primary focus:ring-0"
                />
                <label htmlFor={layer.id} className="text-[12px] text-text-primary leading-tight cursor-pointer">
                  <div className="font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: (layer as any).color || '#0284C7' }} />
                    {layer.name}
                  </div>
                  <div className="text-[10px] text-text-muted mt-0.5">
                    OSM Snap &bull; Multi-Temporal Radar
                  </div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* District Village Risk Breakdown Panel */}
        <div className="p-3 border-t border-border bg-white">
          {/* Quick Rescue Dispatch Button */}
          <div className="mb-2.5">
            <button
              onClick={() => {
                const highRisk = districtVillages.find(v => v.tier === 'HIGH') || districtVillages[0];
                if (highRisk) handleFindRescuePath(highRisk);
              }}
              disabled={isCalculatingRescuePath}
              className="w-full py-2 px-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-lg text-[11px] font-extrabold transition shadow-sm flex items-center justify-center gap-1.5 active:scale-98"
            >
              <Truck size={13} className={isCalculatingRescuePath ? 'animate-spin' : ''} />
              {isCalculatingRescuePath ? 'Calculating Safe Vector...' : '🚑 FIND OPTIMAL RESCUE PATH'}
            </button>
          </div>

          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-text-primary uppercase flex items-center gap-1.5">
              <Building2 size={13} className="text-primary" />
              VILLAGE RISK BREAKDOWN
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {districtVillages.length} LOCATIONS
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-1 mb-2.5">
            {(['ALL', 'HIGH', 'MEDIUM', 'SAFE'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setVillageFilter(f)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                  villageFilter === f
                    ? f === 'HIGH' ? 'bg-red-600 text-white' : f === 'MEDIUM' ? 'bg-amber-500 text-white' : f === 'SAFE' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Village Items List */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {districtVillages
              .filter(v => villageFilter === 'ALL' || v.tier === villageFilter)
              .map((v) => (
                <div
                  key={v.id}
                  onClick={() => setCurrentCenter([v.lat, v.lng])}
                  className={`p-2 rounded-lg border text-left cursor-pointer transition hover:shadow-xs ${
                    v.tier === 'HIGH'
                      ? 'bg-red-50/50 border-red-200 hover:border-red-400'
                      : v.tier === 'MEDIUM'
                      ? 'bg-amber-50/50 border-amber-200 hover:border-amber-400'
                      : 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-400'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="font-bold text-[12px] text-slate-900 flex items-center gap-1">
                      <MapPin size={11} className={v.tier === 'HIGH' ? 'text-red-600' : v.tier === 'MEDIUM' ? 'text-amber-600' : 'text-emerald-600'} />
                      {v.name}
                    </span>
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase ${
                      v.tier === 'HIGH' ? 'bg-red-100 text-red-800' : v.tier === 'MEDIUM' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {v.tier === 'HIGH' ? 'HIGH RISK' : v.tier === 'MEDIUM' ? 'MED RISK' : 'SAFE'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-600 leading-tight mb-1 line-clamp-2">{v.hazard_reason}</p>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-1">
                    <span>Depth: <strong className={v.depth_m > 1 ? 'text-red-600' : v.depth_m > 0 ? 'text-amber-600' : 'text-emerald-600'}>{v.depth_m}m</strong></span>
                    <div className="flex items-center gap-1.5 font-sans">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFindRescuePath(v);
                        }}
                        disabled={isCalculatingRescuePath}
                        className="px-2 py-0.5 bg-cyan-600 hover:bg-cyan-700 active:scale-95 text-white rounded text-[10px] font-bold transition flex items-center gap-1 shadow-xs"
                      >
                        <Truck size={10} />
                        Rescue Path
                      </button>
                      <span className="text-primary font-bold hover:underline">Locate ➔</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Real Road Navigation Details */}
        {roadInfo && (
          <div className="p-3 border-t border-border bg-slate-50/70">
            <div className="flex items-center gap-1.5 mb-1.5 text-emerald-700 font-bold text-[11px]">
              <ShieldCheck size={14} />
              REAL ROAD EVACUATION CORRIDOR
            </div>
            <div className="bg-white border border-emerald-200 rounded p-2 text-[11px] space-y-1">
              <div>Corridor: <strong className="text-slate-800">{roadInfo.roadName}</strong></div>
              <div>Distance: <strong>{roadInfo.distanceKm} km</strong> &bull; Drive: ~<strong>{roadInfo.durationMin} mins</strong></div>
              <div className="text-[10px] text-slate-500 font-medium">Snapped to OpenStreetMap asphalt pavement</div>
            </div>
          </div>
        )}
      </div>

      {/* Main Map Container */}
      <div className="flex-1 relative">
        {/* Top Control Bar */}
        <div className="absolute top-3 left-3 right-3 z-[1000] flex items-center justify-between pointer-events-none gap-4">
          <div className="pointer-events-auto flex items-center gap-2 bg-white/95 backdrop-blur-md border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] shadow-md max-w-[480px]">
            <Navigation size={13} className="text-primary shrink-0" />
            <span className="font-bold text-slate-900 truncate">{locationName}</span>
            <span className="text-slate-500 font-mono shrink-0">({currentCenter[0].toFixed(4)}°N, {currentCenter[1].toFixed(4)}°E)</span>
          </div>

          {/* Basemap Switcher */}
          <div className="pointer-events-auto flex items-center gap-1 bg-white/95 backdrop-blur-md border border-slate-200 rounded-lg p-1 shadow-md shrink-0">
            {(['satellite', 'vector', 'thermal'] as const).map((b) => (
              <button
                key={b}
                onClick={() => setBasemap(b)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                  basemap === b ? 'bg-primary text-white shadow-xs' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {b === 'satellite' ? '🛰️ Satellite' : b === 'vector' ? '🗺️ Vector OSM' : '🌡️ Thermal IR'}
              </button>
            ))}
          </div>
        </div>

        {/* Top-Left Floating Legend */}
        <div className="absolute top-14 left-3 z-[1000] bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-3.5 shadow-xl text-xs space-y-2 pointer-events-auto">
          <div className="flex items-center gap-2.5">
            <span className="w-4 h-4 rounded-md bg-red-600 border border-red-700 shadow-xs" />
            <span className="font-bold text-slate-800 text-[11px] tracking-tight">Severely affected (Surge over 1.5m)</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-4 h-4 rounded-md bg-amber-500 border border-amber-600 shadow-xs" />
            <span className="font-bold text-slate-800 text-[11px] tracking-tight">Downstream alerts</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-4 h-4 rounded-full bg-purple-700 border-2 border-white ring-2 ring-purple-400 shadow-xs" />
            <span className="font-bold text-slate-800 text-[11px] tracking-tight">Flood-affected towns (Purple Pin)</span>
          </div>
          <div className="flex items-center gap-2.5 pt-0.5 border-t border-slate-100">
            <span className="w-4 h-2.5 rounded-full bg-slate-900 border border-sky-400" />
            <span className="font-bold text-slate-700 text-[10px] tracking-tight">Operational Region Center</span>
          </div>
        </div>

        {/* Bottom-Left Regional Title Banner (Matching User Reference Image) */}
        <div className="absolute bottom-14 left-3 z-[1000] bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-2xl px-4 py-2.5 shadow-xl pointer-events-auto">
          <div className="text-base font-black text-slate-900 tracking-tight leading-tight">
            {regionalCorridor.regionTitle}
          </div>
          <div className="text-[10px] text-slate-500 font-semibold mt-0.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Multi-District Inundation &bull; Real-time Downstream Flash Flood Corridor
          </div>
        </div>

        {/* Map */}
        <MapContainer
          center={currentCenter}
          zoom={currentZoom}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <MapRecenter center={currentCenter} zoom={currentZoom} />
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

          {/* Regional District Choropleth Polygons (Matching User Reference Image) */}
          {regionalCorridor.districts.map((d) => (
            <Polygon
              key={d.id}
              positions={d.polygon}
              pathOptions={{
                color: d.borderColor,
                fillColor: d.fillColor,
                fillOpacity: d.fillOpacity,
                weight: 2.5,
                dashArray: '5 4',
              }}
            >
              <Popup>
                <div className="p-2 text-xs">
                  <strong className="text-sm font-extrabold block mb-0.5" style={{ color: d.badgeColor }}>
                    {d.name} District
                  </strong>
                  <div className="text-slate-600">
                    Classification: <strong>{d.status === 'SEVERELY_AFFECTED' ? 'Severely Affected Zone' : 'Downstream Alert Zone'}</strong>
                  </div>
                </div>
              </Popup>
            </Polygon>
          ))}

          {/* District Center Badges (Rasuwa, Nuwakot, Dhading / Rajam, Vizianagaram, Srikakulam) */}
          {regionalCorridor.districts.map((d) => (
            <Marker
              key={`badge-${d.id}`}
              position={d.center}
              icon={createDistrictBadgeIcon(d.name, d.badgeColor)}
              eventHandlers={{
                click: () => {
                  setCurrentCenter(d.center);
                  setCurrentZoom(11);
                }
              }}
            />
          ))}

          {/* Adjacent Monitor District Pills */}
          {regionalCorridor.adjacentMonitors.map((m, idx) => (
            <Marker
              key={`mon-${idx}`}
              position={m.pos}
              icon={createAdjacentMonitorIcon(m.name)}
            />
          ))}

          {/* River Corridors & Downstream Alert Callouts */}
          {regionalCorridor.riverCorridors.map((r, idx) => (
            <Fragment key={`river-${idx}`}>
              <Polyline
                positions={r.points}
                pathOptions={{ color: '#0284c7', weight: 4.5, opacity: 0.85, dashArray: '6 4' }}
              />
              {r.alertBadge && (
                <Marker
                  position={r.alertBadge.pos}
                  icon={createDownstreamAlertIcon(r.alertBadge.label)}
                />
              )}
            </Fragment>
          ))}

          {/* Flood-Affected Towns & Villages Pins (Red Bullseye Markers with Name Pills) */}
          {regionalCorridor.towns.map((t) => (
            <Marker
              key={`town-${t.id}`}
              position={t.pos}
              icon={createFloodTownIcon(t.name, t.symbol)}
              eventHandlers={{
                click: () => {
                  setCurrentCenter(t.pos);
                  setCurrentZoom(15);
                }
              }}
            >
              <Popup>
                <div className="p-2.5 min-w-[210px] text-xs font-sans">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      t.tier === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {t.tier === 'HIGH' ? '🔴 Severely Affected' : '🟡 Downstream Alert'}
                    </span>
                    <span className="text-[10px] text-slate-500">{t.district}</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 mb-1">{t.name} {t.symbol}</h4>
                  <p className="text-[11px] text-slate-600 mb-2 leading-tight">{t.hazardReason}</p>
                  <div className="bg-slate-50 border border-slate-200 rounded p-1.5 font-mono text-[10px] space-y-1 mb-2">
                    <div>Water Depth: <strong>{t.depth}</strong></div>
                    <div>Affected: <strong>{t.population.toLocaleString()} souls</strong></div>
                    {t.stranded > 0 && <div className="text-red-600 font-bold">Stranded: {t.stranded} souls</div>}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Inundated Flood Basin Polygon (Blue) */}
          <Polygon
            positions={dynamicFloodPolygon}
            pathOptions={{ color: '#0284C7', fillColor: '#0284C7', fillOpacity: 0.25, weight: 2, dashArray: '6 4' }}
          >
            <Popup>
              <div className="p-2 text-xs">
                <strong className="text-sky-600 font-bold">🌊 ACTIVE INUNDATION EXTENT</strong><br />
                Location: <strong>{locationName}</strong><br />
                Avg Surge: 1.45m &bull; Elevation Subtraction Active.
              </div>
            </Popup>
          </Polygon>

          {/* Safe Ground Relief Haven Polygon (Green) */}
          <Polygon
            positions={dynamicSafeZonePolygon}
            pathOptions={{ color: '#16a34a', fillColor: '#22c55e', fillOpacity: 0.22, weight: 2 }}
          >
            <Popup>
              <div className="p-2 text-xs">
                <strong className="text-emerald-600 font-bold">🟢 DESIGNATED SAFE ZONE / SHELTER HAVEN</strong><br />
                Location: <strong>{locationName} High Ground</strong><br />
                Dry Land LZ &bull; Zero Inundation.
              </div>
            </Popup>
          </Polygon>

          {/* Real Street Evacuation Route (Snapped to OSM Paved Roads) */}
          {realSafeRoute && (
            <>
              <Polyline positions={realSafeRoute} pathOptions={{ color: '#047857', weight: 6, opacity: 0.5 }} />
              <Polyline positions={realSafeRoute} pathOptions={{ color: '#10b981', weight: 4 }}>
                <Popup>
                  <div className="p-2 text-xs">
                    <strong className="text-emerald-600 font-bold">🛣️ REAL ROAD EVACUATION ROUTE</strong><br />
                    Corridor: <strong>{roadInfo?.roadName || 'Mapped Paved Highway'}</strong><br />
                    Distance: {roadInfo?.distanceKm} km &bull; Time: ~{roadInfo?.durationMin} mins<br />
                    Status: Snapped to OpenStreetMap road pavement.
                  </div>
                </Popup>
              </Polyline>
            </>
          )}

          {/* Single authoritative marker layer: rendered cleanly above in regionalCorridor.towns */}

          {/* Blocked Road Cutoff Segment (Red dashed line on actual street) */}
          {realBlockedRoad && (
            <Polyline positions={realBlockedRoad} pathOptions={{ color: '#DC2626', weight: 5, dashArray: '8 4' }}>
              <Popup>
                <div className="p-2 text-xs">
                  <strong className="text-red-600 font-bold">⚠️ BLOCKED ARTERIAL ROAD</strong><br />
                  Road: <strong>{roadInfo?.roadName || 'Lowland Approach Underpass'}</strong><br />
                  Hazard: Submerged culvert dip &bull; Impassable for standard vehicles.
                </div>
              </Popup>
            </Polyline>
          )}

          {/* Rescue zones */}
          {dynamicRescueZones.map((zone, i) => (
            <Circle key={i} center={zone.center} radius={350} pathOptions={{ color: '#DC2626', fillColor: '#DC2626', fillOpacity: 0.12, weight: 1.5 }}>
              <Popup>
                <div className="p-3 min-w-[280px]">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-2 h-2 rounded-full bg-critical animate-pulse" />
                    <span className="text-[10px] font-bold text-critical uppercase">PRIORITY ALPHA: CRITICAL RESCUE</span>
                  </div>
                  <h3 className="text-[15px] font-bold text-text-primary mb-1">{zone.label}</h3>
                  <p className="text-[11px] text-text-muted mb-2">Lat {zone.center[0].toFixed(4)}°N, {zone.center[1].toFixed(4)}°E</p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-critical/10 rounded p-2">
                      <div className="text-[10px] text-critical font-semibold">Civilians Stranded</div>
                      <div className="text-[18px] font-bold text-critical tabular-nums">{zone.civilians} souls</div>
                    </div>
                    <div className="bg-primary/10 rounded p-2">
                      <div className="text-[10px] text-primary font-semibold">Flood Depth</div>
                      <div className="text-[18px] font-bold text-primary tabular-nums">1.4 meters</div>
                    </div>
                  </div>
                  <div className="space-y-1 mb-3 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-critical font-bold">✕</span>
                      <span className="text-text-secondary"><strong className="text-critical">Lowland Approach:</strong> Blocked by flood surge</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-success font-bold">✓</span>
                      <span className="text-text-secondary"><strong className="text-success">High Ridge Road:</strong> Navigable via Emergency Vehicles</span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Circle>
          ))}

          {/* Emergency Rescue Staging Bases (NDRF / APF / SDRF) */}
          {stagingBases.map((b) => (
            <Marker
              key={`base-${b.id}`}
              position={b.pos}
              icon={createRescueBaseIcon(b.organization, b.name)}
            >
              <Popup>
                <div className="p-2.5 text-xs font-sans">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="px-1.5 py-0.5 bg-cyan-100 text-cyan-800 rounded font-bold text-[10px]">
                      {b.organization} DEOC STAGING
                    </span>
                    <span className="font-mono text-slate-500 text-[10px]">Elev {b.elevationM}m MSL</span>
                  </div>
                  <strong className="text-sm font-bold block mb-1 text-slate-900">{b.name}</strong>
                  <div className="text-slate-600 mb-2">High-Ground Assembly & Evacuation Depot. Zero flood risk.</div>
                  <div className="bg-slate-50 border border-slate-200 rounded p-1.5 text-[10px] space-y-1 mb-2 font-mono">
                    <div>Callsign: <strong>{b.callsign}</strong></div>
                    <div>Vehicles: <strong>{b.vehicleTypes.join(', ')}</strong></div>
                  </div>
                  <button
                    onClick={() => {
                      const highRisk = districtVillages.find(v => v.tier === 'HIGH') || districtVillages[0];
                      if (highRisk) handleFindRescuePath(highRisk);
                    }}
                    className="w-full py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded font-bold text-[11px] transition flex items-center justify-center gap-1"
                  >
                    <Truck size={12} />
                    Route Convoy to Inundated Village
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Optimal Rescue Path (Cyan / Emerald Glowing Vector Snapped to Safe Roads) */}
          {activeRescueMission && (
            <>
              {/* Outer Cyan Glow */}
              <Polyline
                positions={activeRescueMission.geometry}
                pathOptions={{ color: '#0891b2', weight: 9, opacity: 0.45 }}
              />
              {/* Core Vector */}
              <Polyline
                positions={activeRescueMission.geometry}
                pathOptions={{ color: '#06b6d4', weight: 5, opacity: 0.95 }}
              >
                <Popup>
                  <div className="p-2 text-xs font-sans">
                    <div className="flex items-center gap-1.5 text-cyan-600 font-bold mb-1">
                      <Truck size={13} />
                      OPTIMAL RESCUE VECTOR
                    </div>
                    <div>From: <strong>{activeRescueMission.originBase.name}</strong></div>
                    <div>To: <strong>{activeRescueMission.targetVillageName}</strong></div>
                    <div className="font-mono mt-1 text-[11px]">
                      Distance: <strong>{activeRescueMission.distanceKm} km</strong> &bull; ETA: <strong>{activeRescueMission.durationMin} mins</strong>
                    </div>
                    <div className="text-emerald-600 font-semibold text-[10px] mt-0.5">
                      ✓ Flood Safety Score: {activeRescueMission.safetyScore}% (Submerged roads bypassed)
                    </div>
                  </div>
                </Popup>
              </Polyline>

              {/* Impassable Direct Cutoff Line (Red Dashed) */}
              {activeRescueMission.directHazardousGeometry && (
                <Polyline
                  positions={activeRescueMission.directHazardousGeometry}
                  pathOptions={{ color: '#ef4444', weight: 3.5, dashArray: '6 6', opacity: 0.75 }}
                >
                  <Popup>
                    <div className="p-2 text-xs text-red-600 font-sans">
                      <strong>⚠️ DIRECT LOWLAND ROAD: IMPASSABLE</strong><br />
                      Submerged water depth &gt; 1.4m &bull; Safely bypassed via elevated ridge.
                    </div>
                  </Popup>
                </Polyline>
              )}

              {/* Hazard Avoidance Markers */}
              {activeRescueMission.bypassedHazards.map((h, idx) => (
                <Marker
                  key={`avoid-${idx}`}
                  position={h.pos}
                  icon={createHazardAvoidanceIcon(h.name)}
                >
                  <Popup>
                    <div className="p-2 text-xs font-sans text-red-700">
                      <strong>⚠️ BYPASSED FLOOD CHOKEPOINT</strong><br />
                      Hazard: {h.name} ({h.depthM}m water)<br />
                      <span className="text-slate-600 text-[10px]">{h.actionTaken}</span>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </>
          )}

          {/* Deployed Tactical Unit Marker */}
          <Marker position={[+(cLat - 0.0010).toFixed(5), +(cLng + 0.0015).toFixed(5)]}>
            <Popup>
              <div className="p-2 text-[12px]">
                <div className="font-bold text-primary">🚤 RT-01 (Amphibious Response Unit)</div>
                <div className="text-text-muted">Sector: {locationName} &bull; Status: Deployed</div>
              </div>
            </Popup>
          </Marker>
        </MapContainer>

        {/* Floating Optimal Rescue Mission HUD (Top-Right / Mid-Right) */}
        {activeRescueMission && showRescueHUD && (
          <div className="absolute top-16 right-3 z-[1000] w-88 bg-slate-900/95 backdrop-blur-md text-white border border-cyan-500/60 rounded-xl shadow-2xl overflow-hidden font-sans text-xs animate-fade-in pointer-events-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-900/80 to-slate-900 px-3.5 py-2.5 border-b border-cyan-500/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-cyan-500 text-slate-950 font-black">
                  <Truck size={14} />
                </span>
                <div>
                  <div className="font-extrabold text-[12px] tracking-wide text-cyan-300">
                    OPTIMAL RESCUE CONVOY VECTOR
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    CALLSIGN: <span className="text-white font-bold">{activeRescueMission.callsign}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveRescueMission(null)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/10 transition"
              >
                <X size={14} />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-3.5 space-y-3">
              {/* Target Location and Origin */}
              <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-2.5 space-y-1.5">
                <div className="flex items-start justify-between text-[11px]">
                  <span className="text-slate-400">Target Village:</span>
                  <span className="font-bold text-amber-300 text-right">{activeRescueMission.targetVillageName}</span>
                </div>
                <div className="flex items-start justify-between text-[11px]">
                  <span className="text-slate-400">Staging Base:</span>
                  <span className="font-semibold text-slate-200 text-right">{activeRescueMission.originBase.name.split('(')[0]}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-700/60">
                  <span className="text-slate-400">Assigned Unit:</span>
                  <span className="font-bold text-cyan-300">{activeRescueMission.assignedTeam}</span>
                </div>
              </div>

              {/* Tactical Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-800/60 border border-slate-700/80 rounded-lg p-2">
                  <div className="text-[9px] uppercase font-bold text-slate-400">Distance</div>
                  <div className="text-[15px] font-black font-mono text-cyan-300">{activeRescueMission.distanceKm} km</div>
                </div>
                <div className="bg-slate-800/60 border border-slate-700/80 rounded-lg p-2">
                  <div className="text-[9px] uppercase font-bold text-slate-400">Drive ETA</div>
                  <div className="text-[15px] font-black font-mono text-emerald-300">~{activeRescueMission.durationMin} min</div>
                </div>
                <div className="bg-slate-800/60 border border-slate-700/80 rounded-lg p-2">
                  <div className="text-[9px] uppercase font-bold text-slate-400">Safety Score</div>
                  <div className="text-[15px] font-black font-mono text-emerald-400">{activeRescueMission.safetyScore}%</div>
                </div>
              </div>

              {/* Recommended Vehicle */}
              <div className="bg-cyan-950/40 border border-cyan-800/50 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[10px]">
                <span className="text-slate-400">Recommended Carrier:</span>
                <span className="font-bold text-cyan-200">{activeRescueMission.recommendedVehicle}</span>
              </div>

              {/* Turn-by-Turn Collapsible */}
              <div>
                <button
                  onClick={() => setShowTurnSteps(!showTurnSteps)}
                  className="w-full flex items-center justify-between py-1 text-[11px] font-bold text-slate-300 hover:text-white"
                >
                  <span className="flex items-center gap-1">
                    <Compass size={12} className="text-cyan-400" />
                    Turn-by-Turn Safe Waypoints ({activeRescueMission.steps.length})
                  </span>
                  <ChevronRight size={12} className={`transition transform ${showTurnSteps ? 'rotate-90' : ''}`} />
                </button>
                {showTurnSteps && (
                  <div className="mt-1.5 max-h-36 overflow-y-auto space-y-1.5 pr-1 border-t border-slate-800 pt-1.5">
                    {activeRescueMission.steps.map((st, i) => (
                      <div
                        key={i}
                        className={`p-1.5 rounded text-[10px] ${
                          st.isHazardWarning ? 'bg-amber-950/50 border border-amber-700/60 text-amber-200' : 'bg-slate-800/50 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between font-mono font-bold text-[9px] text-slate-400">
                          <span>{st.km} km</span>
                          {st.isHazardWarning && <span className="text-amber-400 uppercase font-bold">HAZARD BYPASS</span>}
                        </div>
                        <div className="font-semibold text-white mt-0.5">{st.instruction}</div>
                        <div className="text-[9px] text-slate-400 mt-0.5">{st.detail}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                <button
                  onClick={() => {
                    setDispatchToast(`Convoy orders and GPS path transmitted to ${activeRescueMission.assignedTeam}!`);
                    setTimeout(() => setDispatchToast(null), 4000);
                  }}
                  className="flex-1 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg font-bold text-[11px] transition shadow-md flex items-center justify-center gap-1.5"
                >
                  <Send size={12} />
                  Transmit to Field Unit
                </button>
                <button
                  onClick={() => {
                    const v = districtVillages.find(vil => vil.name === activeRescueMission.targetVillageName);
                    if (v) handleFindRescuePath(v);
                  }}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                  title="Recalculate Path"
                >
                  <RefreshCw size={12} />
                </button>
                <button
                  onClick={() => setActiveRescueMission(null)}
                  className="p-2 bg-slate-800 hover:bg-red-900/60 text-slate-300 hover:text-red-300 rounded-lg transition"
                  title="Clear Path"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Severity Legend */}
        <div className="absolute bottom-3 left-3 z-[1000] flex items-center gap-3 bg-white/90 backdrop-blur border border-border rounded px-3 py-2 text-[11px] shadow-md">
          <span className="font-semibold text-text-secondary">SEVERITY LEGEND</span>
          {[
            { color: 'bg-critical', label: 'Critical' },
            { color: 'bg-secondary-blue', label: 'High' },
            { color: 'bg-primary', label: 'Moderate' },
            { color: 'bg-success', label: 'Safe Haven' },
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
          {dispatchToast && (
        <div className="fixed top-16 right-6 z-[2000] bg-slate-900 border border-cyan-400 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
          <Truck className="w-5 h-5 text-cyan-400 shrink-0" />
          <div>
            <div className="text-xs font-bold text-cyan-300">TACTICAL RESCUE CONVOY DISPATCH</div>
            <div className="text-[11px] text-slate-200">{dispatchToast}</div>
          </div>
        </div>
      )}

      {exportNotice && (
            <div className="px-3 py-1.5 bg-emerald-600 text-white rounded text-[11px] font-bold shadow-lg flex items-center gap-1.5 animate-fade-in">
              <CheckCircle2 size={13} />
              {exportNotice}
            </div>
          )}
          <button
            onClick={() => {
              const [bLat, bLng] = currentCenter;
              setCurrentCenter([bLat + 0.0001, bLng + 0.0001]);
            }}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-[11px] font-semibold px-3 py-2 rounded transition shadow-sm"
          >
            Recalculate Route
          </button>
          <button
            onClick={handleExportGeoJSON}
            className="flex items-center gap-1.5 bg-white border border-border text-text-secondary text-[11px] font-medium px-3 py-2 rounded hover:bg-slate-50 transition shadow-sm"
          >
            <Download size={12} />
            Export (GeoJSON)
          </button>
        </div>
      </div>
    </div>
  );
}
