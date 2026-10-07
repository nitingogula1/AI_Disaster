import { useState, useEffect, useMemo, Fragment } from 'react';
import { getRegionalDisasterCorridor, type RegionalDisasterCorridor } from '../../data/regionalDisasterCorridors';
import { getRegionalStagingBases, calculateOptimalRescuePath, type StagingBase, type OptimalRescuePathResult } from '../../services/rescueMissionService';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import { 
  Navigation, Crosshair, Users, AlertTriangle, ShieldCheck, CheckCircle, 
  Layers, Radio, Send, RefreshCw, Compass, Eye, ShieldAlert, 
  Activity, ArrowRight, Zap, Droplets, Mountain, Video, Info, 
  Plane, UploadCloud, X, Play, Truck, Camera, BatteryCharging, Wifi, 
  Sliders, Maximize2, Sparkles, HelpCircle, ChevronRight, RotateCcw,
  ExternalLink, Navigation2, Check, PhoneCall, RadioTower, AlertOctagon,
  CheckCircle2, XCircle, Gauge, MapPin, Shield, Search, Globe, Building2
} from 'lucide-react';
import { MapContainer, TileLayer, Polygon, Polyline, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { droneService, rescueService } from '../../services/api';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createSurvivorIcon = (count: number, isSelected: boolean = false) => {
  return L.divIcon({
    className: 'custom-drone-survivor-icon',
    html: `<div style="background-color: ${isSelected ? '#b91c1c' : '#dc2626'}; color: white; padding: 3px 8px; border-radius: 9999px; font-weight: 800; font-size: 11px; border: ${isSelected ? '3px solid #fef08a' : '2px solid white'}; box-shadow: 0 0 16px ${isSelected ? 'rgba(234,179,8,1)' : 'rgba(220,38,38,0.8)'}; white-space: nowrap; font-family: monospace; animation: pulse 1.5s infinite;">🚨 ${count} SURVIVORS</div>`,
    iconSize: [110, 26],
    iconAnchor: [55, 13],
  });
};

const createHazardIcon = (label: string) => {
  return L.divIcon({
    className: 'custom-drone-hazard-icon',
    html: `<div style="background-color: #ea580c; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; border: 1.5px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.5); white-space: nowrap; font-family: monospace;">⚠️ ${label}</div>`,
    iconSize: [110, 22],
    iconAnchor: [55, 11],
  });
};

const createWaypointIcon = (label: string) => {
  return L.divIcon({
    className: 'custom-drone-waypoint-icon',
    html: `<div style="background-color: #0284c7; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 9px; border: 1.5px solid #38bdf8; box-shadow: 0 2px 8px rgba(2,132,199,0.6); white-space: nowrap; font-family: monospace;">✈️ ${label}</div>`,
    iconSize: [70, 20],
    iconAnchor: [35, 10],
  });
};


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

const createDroneRescueBaseIcon = (org: string, name: string) => {
  const bg = org === 'NDRF' ? '#dc2626' : org === 'APF' ? '#0284c7' : '#059669';
  return L.divIcon({
    className: 'custom-drone-rescue-base-icon',
    html: `<div style="background: ${bg}; color: white; padding: 4px 10px; border-radius: 9999px; font-weight: 800; font-size: 11px; border: 2.5px solid white; box-shadow: 0 4px 14px rgba(0,0,0,0.6); white-space: nowrap; font-family: system-ui, sans-serif; display: flex; align-items: center; gap: 4px; animation: bounce 1.8s infinite;">
      <span>🚑</span>
      <span>[${org}] ${name.split('(')[0].trim()}</span>
    </div>`,
    iconSize: [160, 26],
    iconAnchor: [80, 13],
  });
};

const createVillageIcon = (tier: 'HIGH' | 'MEDIUM' | 'SAFE', name: string, isSelected: boolean = false) => {
  const bg = tier === 'HIGH' ? '#dc2626' : tier === 'MEDIUM' ? '#d97706' : '#16a34a';
  const border = isSelected ? '#fef08a' : '#ffffff';
  const pulse = tier === 'HIGH' ? 'animation: pulse 1.2s infinite;' : '';
  return L.divIcon({
    className: 'custom-village-icon',
    html: `<div style="background-color: ${bg}; color: white; padding: 2.5px 8px; border-radius: 9999px; font-weight: 700; font-size: 10px; border: 2px solid ${border}; box-shadow: 0 2px 10px rgba(0,0,0,0.6); white-space: nowrap; font-family: sans-serif; cursor: pointer; ${pulse}">${tier === 'HIGH' ? '🔴' : tier === 'MEDIUM' ? '🟡' : '🟢'} ${name}</div>`,
    iconSize: [110, 24],
    iconAnchor: [55, 12],
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
        hazard_reason: 'Bagmati river violent torrent & bridgehead breach. Water depth 2.1m. Multiple homes inundated.',
        depth_m: 2.10,
        population: 2100,
        stranded: 68,
        status: 'Critical Inundation / Aerial Winch',
        lat: +(baseLat - 0.0020).toFixed(5),
        lng: +(baseLng - 0.0015).toFixed(5),
        bearing: '1.0 km SW'
      },
      {
        id: 'vil-n-2',
        name: 'Sundarighat Settlement',
        tier: 'HIGH',
        hazard_reason: 'Low riverbank floodplain overflow. Access bridge washed out (1.85m depth). Inflatable boats required.',
        depth_m: 1.85,
        population: 1450,
        stranded: 44,
        status: 'Submerged Access Corridor',
        lat: +(baseLat - 0.0030).toFixed(5),
        lng: +(baseLng + 0.0012).toFixed(5),
        bearing: '1.4 km SE'
      },
      {
        id: 'vil-n-3',
        name: 'Teku Dobhan Confluence',
        tier: 'HIGH',
        hazard_reason: 'Confluence surge of Bishnumati & Bagmati rivers (1.65m depth). Low-lying structures submerged.',
        depth_m: 1.65,
        population: 1780,
        stranded: 36,
        status: 'Confluence Backflow Hazard',
        lat: +(baseLat - 0.0012).toFixed(5),
        lng: +(baseLng + 0.0025).toFixed(5),
        bearing: '1.1 km East'
      },
      {
        id: 'vil-n-4',
        name: 'Sanepa Lowland Margins',
        tier: 'MEDIUM',
        hazard_reason: 'Stormwater drainage backflow and street waterlogging (0.65m depth). 4x4 trucks and tractors operating.',
        depth_m: 0.65,
        population: 1920,
        stranded: 0,
        status: '4x4 Vehicles Only',
        lat: +(baseLat + 0.0015).toFixed(5),
        lng: +(baseLng - 0.0022).toFixed(5),
        bearing: '1.3 km NW'
      },
      {
        id: 'vil-n-5',
        name: 'Kalanki Bypass Ring',
        tier: 'MEDIUM',
        hazard_reason: 'Highway underpass water accumulation (0.50m depth). Controlled traffic diversion active.',
        depth_m: 0.50,
        population: 3200,
        stranded: 0,
        status: 'Traffic Diversion Active',
        lat: +(baseLat + 0.0025).toFixed(5),
        lng: +(baseLng + 0.0018).toFixed(5),
        bearing: '1.5 km NE'
      },
      {
        id: 'vil-n-6',
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
      },
      {
        id: 'vil-n-7',
        name: 'Kuleshwor Elevated Plateau',
        tier: 'SAFE',
        hazard_reason: 'Elevated dry municipal compound. Relief hospital & emergency food rations dispensary.',
        depth_m: 0.0,
        population: 0,
        stranded: 0,
        status: 'Relief Hospital Compound',
        lat: +(baseLat + 0.0045).toFixed(5),
        lng: +(baseLng + 0.0020).toFixed(5),
        bearing: '2.0 km NE'
      }
    ];
  }

  // Dynamic generator for any other district or region globally
  const title = districtName.split(',')[0].trim();
  return [
    {
      id: 'vil-g-1',
      name: `${title} Riverbed Lowlands`,
      tier: 'HIGH',
      hazard_reason: 'Direct riverbank surge & basinal depression. Water depth 1.70m. Submerged residential structures.',
      depth_m: 1.70,
      population: 1350,
      stranded: 46,
      status: 'Critical Inundation / Evacuate',
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
      name: `${title} East Canal Fringe`,
      tier: 'HIGH',
      hazard_reason: 'Irrigation canal overflow flooding residential ground floors (1.35m depth). Muddy access compromised.',
      depth_m: 1.35,
      population: 940,
      stranded: 18,
      status: 'Submerged Habitation',
      lat: +(baseLat - 0.0032).toFixed(5),
      lng: +(baseLng - 0.0010).toFixed(5),
      bearing: '1.4 km South'
    },
    {
      id: 'vil-g-4',
      name: `${title} Market Approach Sector`,
      tier: 'MEDIUM',
      hazard_reason: 'Water logging across access avenues (0.50m depth). Passable for tactical 4x4 trucks & emergency tractors.',
      depth_m: 0.50,
      population: 1550,
      stranded: 0,
      status: 'Tactical Vehicles Only',
      lat: +(baseLat + 0.0012).toFixed(5),
      lng: +(baseLng + 0.0025).toFixed(5),
      bearing: '1.3 km NE'
    },
    {
      id: 'vil-g-5',
      name: `${title} Western Outskirts`,
      tier: 'MEDIUM',
      hazard_reason: 'Field runoff encroaching perimeter road (0.40m depth). Flood watch advisory active.',
      depth_m: 0.40,
      population: 1180,
      stranded: 0,
      status: 'Watch Advisory Active',
      lat: +(baseLat - 0.0005).toFixed(5),
      lng: +(baseLng + 0.0030).toFixed(5),
      bearing: '1.2 km East'
    },
    {
      id: 'vil-g-6',
      name: `${title} North Elevated High Ground`,
      tier: 'SAFE',
      hazard_reason: 'Elevated bedrock ridge (+25m above valley floor). Designated Civilian Relief Haven & Shelter.',
      depth_m: 0.0,
      population: 0,
      stranded: 0,
      status: 'Designated Relief Haven',
      lat: +(baseLat + 0.0055).toFixed(5),
      lng: +(baseLng - 0.0032).toFixed(5),
      bearing: '2.2 km NW'
    },
    {
      id: 'vil-g-7',
      name: `${title} Ridge Assembly LZ`,
      tier: 'SAFE',
      hazard_reason: 'Dry plateau ground with unobstructed helicopter landing zone and emergency supply tents.',
      depth_m: 0.0,
      population: 0,
      stranded: 0,
      status: 'Medical & Helicopter LZ',
      lat: +(baseLat + 0.0065).toFixed(5),
      lng: +(baseLng + 0.0015).toFixed(5),
      bearing: '2.5 km NE'
    }
  ];
};


const createDistrictBadgeIcon = (name: string, badgeColor: string) => {
  return L.divIcon({
    className: 'custom-district-badge-icon',
    html: `<div style="background-color: ${badgeColor}; color: white; padding: 4px 14px; border-radius: 9999px; font-weight: 800; font-size: 13px; border: 2.5px solid white; box-shadow: 0 4px 14px rgba(0,0,0,0.5); white-space: nowrap; font-family: sans-serif; cursor: pointer; text-align: center; transform: translate(-50%, -50%); letter-spacing: -0.01em;">${name}</div>`,
    iconSize: [120, 30],
    iconAnchor: [60, 15],
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

const createDownstreamAlertIcon = (label: string) => {
  return L.divIcon({
    className: 'custom-downstream-alert-icon',
    html: `<div style="background-color: #f97316; color: white; padding: 4px 10px; border-radius: 8px; font-weight: 800; font-size: 10px; border: 1.5px solid white; box-shadow: 0 3px 10px rgba(249,115,22,0.6); white-space: nowrap; font-family: sans-serif; display: flex; align-items: center; gap: 4px; transform: translate(-50%, -50%);"><span>${label}</span> <span style="font-size: 12px;">📈</span></div>`,
    iconSize: [110, 26],
    iconAnchor: [55, 13],
  });
};

const createFloodTownIcon = (name: string, symbol: string, isSelected: boolean = false) => {
  return L.divIcon({
    className: 'custom-flood-town-marker',
    html: `<div style="display: flex; align-items: center; gap: 5px; background: rgba(15,23,42,0.88); backdrop-filter: blur(4px); padding: 2px 8px; border-radius: 9999px; border: ${isSelected ? '2.5px solid #fef08a' : '1.5px solid white'}; box-shadow: 0 2px 8px rgba(0,0,0,0.5); white-space: nowrap; cursor: pointer; transform: translate(-50%, -50%);">
      <span style="display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: #dc2626; border: 2px solid white; box-shadow: 0 0 6px #dc2626;"></span>
      <span style="color: white; font-size: 11px; font-weight: 800; font-family: sans-serif;">${name} <span style="font-size: 10px; opacity: 0.85;">${symbol}</span></span>
    </div>`,
    iconSize: [120, 24],
    iconAnchor: [60, 12],
  });
};

const createRiskProbeIcon = (riskTier: 'HIGH' | 'MEDIUM' | 'SAFE') => {
  const bg = riskTier === 'HIGH' ? '#dc2626' : riskTier === 'MEDIUM' ? '#d97706' : '#16a34a';
  const label = riskTier === 'HIGH' ? '🔴 HIGH RISK' : riskTier === 'MEDIUM' ? '🟡 MED RISK' : '🟢 SAFE ZONE';
  return L.divIcon({
    className: 'custom-risk-probe-icon',
    html: `<div style="background-color: ${bg}; color: white; padding: 4px 10px; border-radius: 9999px; font-weight: 800; font-size: 11px; border: 2.5px solid white; box-shadow: 0 0 20px ${bg}; white-space: nowrap; font-family: monospace; animation: bounce 1.2s infinite;">📍 ${label}</div>`,
    iconSize: [120, 28],
    iconAnchor: [60, 14],
  });
};

function MapUpdater({ 
  center, 
  flyTarget, 
  zoomLevel = 15 
}: { 
  center: [number, number]; 
  flyTarget?: [number, number] | null;
  zoomLevel?: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (flyTarget) {
      map.flyTo(flyTarget, zoomLevel, { duration: 1.5 });
    } else {
      map.setView(center, 15);
    }
  }, [center, flyTarget, zoomLevel, map]);
  return null;
}

function MapClickHandler({ onMapClick }: { onMapClick: (latlng: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

export interface PointRiskAssessment {
  lat: number;
  lng: number;
  riskTier: 'HIGH' | 'MEDIUM' | 'SAFE';
  waterDepthM: number;
  groundDemM: number;
  waterDsmM: number;
  flowVelocityMs: number;
  label: string;
  passability: {
    foot: boolean;
    ambulance: boolean;
    truck: boolean;
    boat: boolean;
    helicopter: boolean;
  };
  nearestSafeZone: {
    name: string;
    distanceM: number;
    bearing: string;
  };
  recommendation: string;
}

export const evaluatePointRisk = (
  lat: number, 
  lng: number, 
  missionId: string,
  placeName?: string,
  customElevation?: number
): PointRiskAssessment => {
  const isNepalSector = (missionId === 'drn-msn-nepal' || (lat > 27.5 && lat < 28.0 && lng > 85.0 && lng < 85.6));
  const isBgdSector = (missionId === 'drn-msn-001' && (lat > 21.6 && lat < 22.2 && lng > 89.2 && lng < 89.8));
  
  if (isNepalSector) {
    const dLat = (lat - 27.6835) * 111000;
    const dLng = (lng - 85.2930) * 98000;
    const distToBreachM = Math.sqrt(dLat * dLat + dLng * dLng);

    const x = (lng - 85.2915) * 98000;
    const y = (lat - 27.6815) * 111000;
    const riverLen = Math.sqrt(588 * 588 + 777 * 777);
    const crossDist = Math.abs(x * 777 - y * 588) / riverLen;
    const waterDsmM = 1298.40;

    if (crossDist < 170 || distToBreachM < 190) {
      const depth = Math.min(2.40, Math.max(1.50, +(1.7 + (170 - crossDist) / 170 * 0.7).toFixed(2)));
      return {
        lat: +lat.toFixed(5),
        lng: +lng.toFixed(5),
        riskTier: 'HIGH',
        waterDepthM: depth,
        groundDemM: +(waterDsmM - depth).toFixed(1),
        waterDsmM: waterDsmM,
        flowVelocityMs: 2.4,
        label: 'CRITICAL HIGH-SURGE INUNDATION (BAGMATI RIVERBED)',
        passability: { foot: false, ambulance: false, truck: false, boat: true, helicopter: true },
        nearestSafeZone: { name: 'Tribhuvan University High Ridge', distanceM: Math.round(320 + crossDist), bearing: '038° NE' },
        recommendation: 'SEVERE DROWNING & WATER SUCTION: Complete closure for pedestrians and standard vehicles. Water depth >1.5m with 2.4 m/s violent current. Immediate APF Raft or Aerial Winch evacuation only.',
      };
    } else if (crossDist < 380) {
      const depth = +(0.30 + ((380 - crossDist) / 210) * 0.85).toFixed(2);
      return {
        lat: +lat.toFixed(5),
        lng: +lng.toFixed(5),
        riskTier: 'MEDIUM',
        waterDepthM: depth,
        groundDemM: +(waterDsmM - depth).toFixed(1),
        waterDsmM: waterDsmM,
        flowVelocityMs: 0.8,
        label: 'MODERATE RISK FLOODWAY (MARKET MARGINS)',
        passability: { foot: false, ambulance: false, truck: depth <= 0.55, boat: true, helicopter: true },
        nearestSafeZone: { name: 'Kalanki Elevated Ridge Bypass', distanceM: Math.round(210 + crossDist * 0.4), bearing: '315° NW' },
        recommendation: 'CAUTION - PARTIAL FLOODING (0.3m - 1.2m): Submerged road shoulders. High-clearance tactical 4x4 trucks authorized.',
      };
    } else {
      const groundElev = +(1299.2 + (crossDist - 380) * 0.008).toFixed(1);
      return {
        lat: +lat.toFixed(5),
        lng: +lng.toFixed(5),
        riskTier: 'SAFE',
        waterDepthM: 0.0,
        groundDemM: groundElev,
        waterDsmM: waterDsmM,
        flowVelocityMs: 0.0,
        label: 'SAFE HIGH GROUND HAVEN (ABOVE FLOOD DATUM)',
        passability: { foot: true, ambulance: true, truck: true, boat: false, helicopter: true },
        nearestSafeZone: { name: 'Tribhuvan University Ridge Assembly', distanceM: 0, bearing: 'ON-SITE' },
        recommendation: 'ZERO FLOOD RISK: Ground elevation is well above river crest datum. Safe for civilian assembly, field hospitals, and helicopter landing.',
      };
    }
  } else if (isBgdSector) {
    const dLat = (lat - 21.8440) * 111000;
    const dLng = (lng - 89.5440) * 102000;
    const distToCenter = Math.sqrt(dLat * dLat + dLng * dLng);
    const waterDsmM = 3.80;

    if (distToCenter < 190) {
      return {
        lat: +lat.toFixed(5),
        lng: +lng.toFixed(5),
        riskTier: 'HIGH',
        waterDepthM: 1.85,
        groundDemM: 1.95,
        waterDsmM: 3.80,
        flowVelocityMs: 2.1,
        label: 'HIGH RISK RIVERBANK BREACH (TRISHULI SECTOR)',
        passability: { foot: false, ambulance: false, truck: false, boat: true, helicopter: true },
        nearestSafeZone: { name: 'North High School Shelter Helipad', distanceM: 340, bearing: '040° NE' },
        recommendation: 'CRITICAL SURGE INUNDATION: Submerged road and electrical hazard. Deploy Zodiac inflatables.',
      };
    } else if (distToCenter < 420) {
      return {
        lat: +lat.toFixed(5),
        lng: +lng.toFixed(5),
        riskTier: 'MEDIUM',
        waterDepthM: 0.65,
        groundDemM: 3.15,
        waterDsmM: 3.80,
        flowVelocityMs: 0.7,
        label: 'MEDIUM RISK BUFFER ZONE (LEVEE SLIPWAY)',
        passability: { foot: false, ambulance: false, truck: true, boat: true, helicopter: true },
        nearestSafeZone: { name: 'Coastal Embankment Ridge', distanceM: 180, bearing: '120° SE' },
        recommendation: 'MODERATE DEPTH: Heavy high-clearance vehicles or amphibious craft required.',
      };
    } else {
      return {
        lat: +lat.toFixed(5),
        lng: +lng.toFixed(5),
        riskTier: 'SAFE',
        waterDepthM: 0.0,
        groundDemM: 4.20,
        waterDsmM: 3.80,
        flowVelocityMs: 0.0,
        label: 'SAFE DRY ZONE (ELEVATED EMBANKMENT)',
        passability: { foot: true, ambulance: true, truck: true, boat: false, helicopter: true },
        nearestSafeZone: { name: 'Current Location (Dry Ground)', distanceM: 0, bearing: 'ON-SITE' },
        recommendation: 'SAFE HIGH GROUND: Unaffected by flood surge. Safe for pedestrian staging and ambulances.',
      };
    }
  } else {
    // Universal Geocoded Search Assessment:
    // Uses real elevation data and geographic coordinates to determine genuine risk
    const cleanName = placeName ? placeName.split(',').slice(0, 2).join(', ').trim() : `Location (${lat.toFixed(3)}, ${lng.toFixed(3)})`;
    const isRajam = cleanName.toLowerCase().includes('rajam');

    // Determine actual elevation
    let baseElev = customElevation;
    if (baseElev === undefined) {
      if (isRajam) {
        baseElev = 52.0; // Rajam elevation ~50-75m
      } else {
        // Approximate elevation based on continental coordinates
        baseElev = +(Math.abs(Math.sin(lat * 1.5) * 60 + Math.cos(lng * 1.2) * 50)).toFixed(1);
      }
    }

    // Natural geographic risk stratification based on terrain elevation:
    // Coastal lowlands / deep depressions (< 18m): HIGH RISK
    // Inland river basin margins / drainage flats (18m - 60m): MEDIUM RISK
    // Elevated plains / ridges / plateaus (> 60m): SAFE GROUND
    let tier: 'HIGH' | 'MEDIUM' | 'SAFE';
    let waterDepth = 0.0;
    let flowVelocity = 0.0;

    if (baseElev < 18.0) {
      tier = 'HIGH';
      waterDepth = +(1.4 + Math.max(0, (18.0 - baseElev) * 0.05)).toFixed(2);
      flowVelocity = 2.1;
    } else if (baseElev <= 60.0) {
      tier = 'MEDIUM';
      waterDepth = +(0.35 + Math.max(0, (60.0 - baseElev) * 0.008)).toFixed(2);
      flowVelocity = 0.7;
    } else {
      tier = 'SAFE';
      waterDepth = 0.0;
      flowVelocity = 0.0;
    }

    return {
      lat: +lat.toFixed(5),
      lng: +lng.toFixed(5),
      riskTier: tier,
      waterDepthM: waterDepth,
      groundDemM: baseElev,
      waterDsmM: +(baseElev + waterDepth).toFixed(1),
      flowVelocityMs: flowVelocity,
      label: tier === 'HIGH'
        ? `🔴 HIGH RISK LOWLAND: ${cleanName.toUpperCase()} (DEPTH ${waterDepth}M)`
        : tier === 'MEDIUM'
          ? `🟡 MEDIUM RISK BUFFER: ${cleanName.toUpperCase()} (DEPTH ${waterDepth}M)`
          : `🟢 SAFE ELEVATED HAVEN: ${cleanName.toUpperCase()} (${baseElev}M ASL)`,
      passability: {
        foot: tier === 'SAFE',
        ambulance: tier === 'SAFE',
        truck: tier !== 'HIGH',
        boat: tier === 'HIGH',
        helicopter: true,
      },
      nearestSafeZone: {
        name: isRajam ? 'GMRIT Campus Ridge & Mandal Revenue HQ' : `${cleanName} High Ground Shelter`,
        distanceM: tier === 'SAFE' ? 0 : 380,
        bearing: '045° NE',
      },
      recommendation: tier === 'HIGH'
        ? `CRITICAL INUNDATION: Elevation is low (${baseElev}m). Flood depth ${waterDepth}m with rapid runoff. Road traffic halted. Deploy boat crews & aerial winches.`
        : tier === 'MEDIUM'
          ? `MODERATE DRAINAGE WATERLOGGING: Elevation ${baseElev}m. Rainwater pooling in road margins (${waterDepth}m). High-clearance vehicles and 4x4 convoys operational.`
          : `ZERO FLOOD RISK: Elevated ground (${baseElev}m ASL). Completely clear of flood waters. Designated civilian assembly shelter, triage post, and helicopter LZ.`,
    };
  }
};

// Smart geocoding query builder with progressive fallback candidates
// Handles commas without spaces (e.g. "Trishuli Bazaar,nepal"), transliterations (bazaar <-> bazar),
// and strips locality suffixes to reliably find any place globally on OpenStreetMap.
function buildGeocodeQueries(rawQuery: string): string[] {
  const trimmed = rawQuery.trim();
  const queries: string[] = [trimmed];

  const spaced = trimmed.replace(/,([^\s])/g, ', $1');
  if (spaced !== trimmed) queries.push(spaced);

  if (/bazaar/i.test(trimmed)) {
    queries.push(trimmed.replace(/bazaar/gi, 'bazar'));
    queries.push(spaced.replace(/bazaar/gi, 'bazar'));
  } else if (/bazar/i.test(trimmed)) {
    queries.push(trimmed.replace(/bazar/gi, 'bazaar'));
    queries.push(spaced.replace(/bazar/gi, 'bazaar'));
  }

  const stripped = spaced
    .replace(/\b(bazaar|bazar|market|mandi|chowk|nagar|village|town|city|mandal)\b/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .trim();
  if (stripped && !queries.includes(stripped)) {
    queries.push(stripped);
  }

  const parts = spaced.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const firstWord = parts[0].split(/\s+/)[0];
    const parentContext = parts[parts.length - 1];
    const simple = `${firstWord}, ${parentContext}`;
    if (!queries.includes(simple)) queries.push(simple);
    if (firstWord.length >= 4 && !queries.includes(firstWord)) queries.push(firstWord);
  }

  return [...new Set(queries)];
}

export default function DroneReconPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeOperationId } = useAppStore();

  const queryMission = searchParams.get('mission');
  const querySector = searchParams.get('sector');

  const getInitialMission = () => {
    if (queryMission) return queryMission;
    if (querySector === 'nepal' || activeOperationId?.includes('NEPAL') || activeOperationId?.includes('NPL')) {
      return 'drn-msn-nepal';
    }
    return 'drn-msn-001';
  };

  const [selectedMissionId, setSelectedMissionId] = useState<string>(getInitialMission);
  const [activeRescueMission, setActiveRescueMission] = useState<OptimalRescuePathResult | null>(null);
  
  const [missionData, setMissionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [dispatchSuccess, setDispatchSuccess] = useState<string | null>(null);

  // Selected survivor for map inspection & tracking
  const [selectedSurvivorId, setSelectedSurvivorId] = useState<string | null>(null);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [trackingSurvivor, setTrackingSurvivor] = useState<any | null>(null);
  const [selectedTeamMap, setSelectedTeamMap] = useState<Record<string, string>>({});

  // Real street-level road geometry from OpenStreetMap OSRM routing engine
  const [liveRealRoute, setLiveRealRoute] = useState<[number, number][] | null>(null);
  const [liveBlockedRoute, setLiveBlockedRoute] = useState<[number, number][] | null>(null);
  const [realRoadSummary, setRealRoadSummary] = useState<{ distanceKm: string; durationMin: string; roadName: string } | null>(null);

  // Active searched district / state / global place target
  const [searchedLocation, setSearchedLocation] = useState<{
    name: string;
    subtitle: string;
    lat: number;
    lng: number;
  } | null>(null);
  
  // Update mission if URL or active operation changes
  useEffect(() => {
    const target = queryMission || (querySector === 'nepal' || activeOperationId?.includes('NEPAL') || activeOperationId?.includes('NPL') ? 'drn-msn-nepal' : null);
    if (target && target !== selectedMissionId) {
      setSelectedMissionId(target);
      setSelectedSurvivorId(null);
      setFlyTarget(null);
    }
  }, [queryMission, querySector, activeOperationId]);

  // Synchronize initial location from URL query params (if opened via GIS Map or direct link)
  useEffect(() => {
    const qLat = parseFloat(searchParams.get('lat') || '');
    const qLng = parseFloat(searchParams.get('lng') || '');
    const qPlace = searchParams.get('place') || searchParams.get('name');
    if (!isNaN(qLat) && !isNaN(qLng) && !searchedLocation) {
      setSearchedLocation({
        name: qPlace || (qLat.toFixed(4) + ', ' + qLng.toFixed(4)),
        subtitle: qPlace || 'Target Sector',
        lat: qLat,
        lng: qLng
      });
      setFlyTarget([qLat, qLng]);
    }
  }, [searchParams]);
  
  // Fetch real street road geometry from OpenStreetMap OSRM routing engine
  // Snaps evacuation corridors directly to actual mapped highways & paved streets
  useEffect(() => {
    let active = true;
    const fetchRealRoadGeometry = async () => {
      const curBaseLat = searchedLocation ? searchedLocation.lat : (missionData?.mission?.latitude || 21.8450);
      const curBaseLng = searchedLocation ? searchedLocation.lng : (missionData?.mission?.longitude || 89.5450);

      // Start near the southern / low-lying flood basin
      const startLat = +(curBaseLat - 0.0020).toFixed(5);
      const startLng = +(curBaseLng + 0.0005).toFixed(5);
      // Destination to northern safe high-ground shelter / helipad
      const endLat = +(curBaseLat + 0.0055).toFixed(5);
      const endLng = +(curBaseLng - 0.0035).toFixed(5);

      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        if (data.routes && data.routes.length > 0 && active) {
          const mainRoute = data.routes[0];
          const rawCoords = mainRoute.geometry.coordinates; // [lng, lat]
          const leafletPoints: [number, number][] = rawCoords.map((c: [number, number]) => [c[1], c[0]]);
          setLiveRealRoute(leafletPoints);

          // Extract real street/highway name from OSM navigation steps
          let roadName = '';
          if (mainRoute.legs && mainRoute.legs[0]?.steps) {
            for (const step of mainRoute.legs[0].steps) {
              if (step.name && step.name.trim().length > 0) {
                roadName = step.name;
                break;
              }
            }
          }

          setRealRoadSummary({
            distanceKm: (mainRoute.distance / 1000).toFixed(2),
            durationMin: Math.max(1, Math.ceil(mainRoute.duration / 60)).toString(),
            roadName: roadName || (searchedLocation ? `${searchedLocation.name} Main Road` : 'Paved Arterial Highway')
          });

          // Blocked section: the low-lying segment on that exact same road that gets cut off by flood water
          if (leafletPoints.length >= 4) {
            const cutoffCount = Math.max(3, Math.min(18, Math.floor(leafletPoints.length * 0.35)));
            setLiveBlockedRoute(leafletPoints.slice(0, cutoffCount));
          }
        }
      } catch (err) {
        console.warn('Real road routing fallback:', err);
      }
    };

    fetchRealRoadGeometry();
    return () => {
      active = false;
    };
  }, [searchedLocation?.lat, searchedLocation?.lng, selectedMissionId, missionData?.mission?.latitude, missionData?.mission?.longitude]);

  // Layer Toggles
  const [showDepthLayer, setShowDepthLayer] = useState(true);
  const [showSurvivorLayer, setShowSurvivorLayer] = useState(true);
  const [showBlockedLayer, setShowBlockedLayer] = useState(true);
  const [showFlightPlanLayer, setShowFlightPlanLayer] = useState(false);
  const [showRiskZonesLayer, setShowRiskZonesLayer] = useState(true);
  const [showVillagesLayer, setShowVillagesLayer] = useState(true);
  const [villageFilter, setVillageFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'SAFE'>('ALL');
  const [selectedVillageId, setSelectedVillageId] = useState<string | null>(null);

  // Interactive Risk Assessment Probe (When user clicks map or places pin)
  const [riskProbe, setRiskProbe] = useState<PointRiskAssessment | null>(null);

  const handleMapClick = (latlng: { lat: number; lng: number }) => {
    const assessment = evaluatePointRisk(latlng.lat, latlng.lng, selectedMissionId);
    setRiskProbe(assessment);
    setFlyTarget([latlng.lat, latlng.lng]);
  };

  const handleQuickProbePreset = (tier: 'HIGH' | 'MEDIUM' | 'SAFE') => {
    const isNepal = selectedMissionId === 'drn-msn-nepal';
    const curBaseLat = searchedLocation ? searchedLocation.lat : (mission.latitude || 21.8450);
    const curBaseLng = searchedLocation ? searchedLocation.lng : (mission.longitude || 89.5450);
    const locName = searchedLocation ? searchedLocation.name : (isNepal ? 'Balkhu Sector' : 'Trishuli Sector A');

    let targetLat = curBaseLat;
    let targetLng = curBaseLng;

    if (searchedLocation) {
      if (tier === 'HIGH') {
        targetLat = curBaseLat - 0.0015;
        targetLng = curBaseLng - 0.0015;
      } else if (tier === 'MEDIUM') {
        targetLat = curBaseLat + 0.0012;
        targetLng = curBaseLng + 0.0018;
      } else {
        targetLat = curBaseLat + 0.0055;
        targetLng = curBaseLng - 0.0030;
      }
    } else if (isNepal) {
      if (tier === 'HIGH') {
        targetLat = 27.6835;
        targetLng = 85.2930;
      } else if (tier === 'MEDIUM') {
        targetLat = 27.6848;
        targetLng = 85.2962;
      } else {
        targetLat = 27.6885;
        targetLng = 85.2915;
      }
    } else {
      if (tier === 'HIGH') {
        targetLat = 21.8435;
        targetLng = 89.5435;
      } else if (tier === 'MEDIUM') {
        targetLat = 21.8460;
        targetLng = 89.5465;
      } else {
        targetLat = 21.8485;
        targetLng = 89.5490;
      }
    }

    const assessment = evaluatePointRisk(targetLat, targetLng, selectedMissionId, `${locName} (${tier})`);
    assessment.riskTier = tier;
    if (tier === 'HIGH') {
      assessment.waterDepthM = 1.85;
      assessment.flowVelocityMs = 2.4;
      assessment.label = `🔴 HIGH RISK SECTOR: ${locName.toUpperCase()} (CORE FLOOD BASIN)`;
      assessment.recommendation = `CRITICAL HIGH-SURGE INUNDATION: Submerged arterial routes and severe current. Depth 1.85m. Closed for ground vehicles. Immediate inflatable raft or chopper rescue only.`;
      assessment.passability = { foot: false, ambulance: false, truck: false, boat: true, helicopter: true };
    } else if (tier === 'MEDIUM') {
      assessment.waterDepthM = 0.65;
      assessment.flowVelocityMs = 0.8;
      assessment.label = `🟡 MEDIUM RISK SECTOR: ${locName.toUpperCase()} (WATERLOGGED BUFFER)`;
      assessment.recommendation = `MODERATE RISK BUFFER ZONE: Submerged road margins (0.3m - 1.0m). Hazardous for pedestrians and sedans. Heavy 4x4 tactical trucks and amphibious craft authorized.`;
      assessment.passability = { foot: false, ambulance: false, truck: true, boat: true, helicopter: true };
    } else {
      assessment.waterDepthM = 0.0;
      assessment.flowVelocityMs = 0.0;
      assessment.label = `🟢 SAFE HIGH GROUND HAVEN: ${locName.toUpperCase()} (RELIEF CENTER)`;
      assessment.recommendation = `ZERO FLOOD RISK: Elevated ground well above flood datum. Primary evacuation shelter, emergency supply convoy depot, and helicopter landing zone (LZ).`;
      assessment.passability = { foot: true, ambulance: true, truck: true, boat: false, helicopter: true };
    }

    setRiskProbe(assessment);
    setFlyTarget([targetLat, targetLng]);
    setFlyZoom(16);
  };

  // Tactical Search Bar State & Filterable Entities
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
  const [globalResults, setGlobalResults] = useState<any[]>([]);
  const [flyZoom, setFlyZoom] = useState(15);

  const isNepal = selectedMissionId === 'drn-msn-nepal';

  const searchableLocations = isNepal
    ? [
        {
          id: 'drn-det-npl-001',
          title: 'Balkhu Vegetable Market Rooftop',
          subtitle: '42 Stranded Vendors • 1.90m Bagmati Surge',
          type: 'SURVIVOR',
          lat: 27.6842,
          lng: 85.2945,
          icon: '🚨',
          chipStyle: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
          label: '🚨 Balkhu (42 Souls)'
        },
        {
          id: 'drn-det-npl-002',
          title: 'Dhading Riverside Secondary School',
          subtitle: '20 Trapped Students & Staff • 2.10m Torrent',
          type: 'SURVIVOR',
          lat: 27.6870,
          lng: 85.2965,
          icon: '🚨',
          chipStyle: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
          label: '🚨 Dhading School (20 Souls)'
        },
        {
          id: 'drn-det-npl-003',
          title: 'Balkhu Ring Road Underpass (Culvert Cut)',
          subtitle: '2.20m Deep Flash Surge • Complete Vehicle Closure',
          type: 'HAZARD',
          lat: 27.6835,
          lng: 85.2930,
          icon: '⚠️',
          chipStyle: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
          label: '⚠️ Balkhu Underpass'
        },
        {
          id: 'npl-sh-1',
          title: 'Tribhuvan University High Ridge Haven',
          subtitle: 'Elevation 1,301m • 0.0m Depth • Civilian Shelter & LZ',
          type: 'SHELTER',
          lat: 27.6885,
          lng: 85.2915,
          icon: '🟢',
          chipStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
          label: '🟢 Tribhuvan Ridge (Dry)'
        },
        {
          id: 'npl-sh-2',
          title: 'Kalanki Elevated Ridge Bypass',
          subtitle: 'Elevation 1,299m • 0.3m Shoulder • Truck/Ambulance Drivable',
          type: 'SHELTER',
          lat: 27.6865,
          lng: 85.2985,
          icon: '🟢',
          chipStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
          label: '🟢 Kalanki Bypass'
        },
        {
          id: 'npl-rt-1',
          title: 'Bagmati North Levee Boat Slipway',
          subtitle: '1.45m Flood Depth • Authorized APF Inflatable Route',
          type: 'ROUTE',
          lat: 27.6855,
          lng: 85.2955,
          icon: '🚤',
          chipStyle: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100',
          label: '🚤 North Levee Pass'
        }
      ]
    : [
        {
          id: 'drn-det-001',
          title: 'Coastal Primary School Rooftop',
          subtitle: '32 Civilians Stranded • 1.60m Cyclone Surge',
          type: 'SURVIVOR',
          lat: 21.8452,
          lng: 89.5448,
          icon: '🚨',
          chipStyle: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
          label: '🚨 Primary School (32 Souls)'
        },
        {
          id: 'drn-det-002',
          title: 'Classroom Building A Roof',
          subtitle: '16 Stranded Residents • 1.45m Water Depth',
          type: 'SURVIVOR',
          lat: 21.8465,
          lng: 89.5460,
          icon: '🚨',
          chipStyle: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
          label: '🚨 Building A (16 Souls)'
        },
        {
          id: 'drn-det-003',
          title: 'Pasang Lhamu Highway (NH-04) Submerged Culvert Cutoff',
          subtitle: '1.85m Depth • Electrical Wire & Debris Logjam Hazard',
          type: 'HAZARD',
          lat: 21.8435,
          lng: 89.5430,
          icon: '⚠️',
          chipStyle: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
          label: '⚠️ Pasang Lhamu Highway (NH-04) Culvert'
        },
        {
          id: 'bgd-sh-1',
          title: 'Helipad LZ-1 (North High Ridge)',
          subtitle: 'Elevation 4.2m • 0.0m Water Depth • Cyclone Shelter LZ',
          type: 'SHELTER',
          lat: 21.8480,
          lng: 89.5480,
          icon: '🟢',
          chipStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
          label: '🟢 LZ-1 High Ground'
        },
        {
          id: 'bgd-rt-1',
          title: 'West Levee Amphibious Slipway',
          subtitle: '1.20m Depth • Passable for Amphibious Craft & ZAR',
          type: 'ROUTE',
          lat: 21.8448,
          lng: 89.5448,
          icon: '🚤',
          chipStyle: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100',
          label: '🚤 West Levee Slipway'
        }
      ];

  // Live global geocoding debounced search using OpenStreetMap Nominatim with smart candidate fallbacks
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setGlobalResults([]);
      setIsSearchingGlobal(false);
      return;
    }

    const controller = new AbortController();
    const fetchGlobal = async () => {
      setIsSearchingGlobal(true);
      const candidates = buildGeocodeQueries(trimmed);
      let foundData: any[] = [];

      for (const q of candidates) {
        if (controller.signal.aborted) return;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1`,
            {
              signal: controller.signal,
              headers: { 'Accept-Language': 'en' },
            }
          );
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              foundData = data;
              break;
            }
          }
        } catch (err: any) {
          if (err.name === 'AbortError') return;
        }
      }

      if (foundData.length > 0) {
        const mapped = foundData.map((item: any) => {
          const addr = item.address || {};
          let cleanTitle = item.name && item.name.length > 2 ? item.name : '';
          if (!cleanTitle || cleanTitle.length <= 2) {
            cleanTitle = addr.city || addr.town || addr.village || addr.municipality || addr.state_district || addr.county || addr.suburb || addr.state || (item.display_name ? item.display_name.split(',')[0].trim() : 'Location');
          }
          if (cleanTitle.length <= 2 && item.display_name) {
            cleanTitle = item.display_name.split(',')[0].trim();
          }
          const contextParts = [addr.state_district, addr.state, addr.country].filter(Boolean);
          const contextStr = contextParts.length > 0 ? contextParts.join(', ') : item.display_name;
          return {
            id: `osm-${item.place_id}`,
            title: cleanTitle,
            subtitle: contextStr,
            type: 'GEOCODE',
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            icon: '📍',
            chipStyle: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
            label: `📍 ${cleanTitle}`
          };
        });
        setGlobalResults(mapped);
      } else {
        setGlobalResults([]);
      }
      setIsSearchingGlobal(false);
    };

    const timer = setTimeout(fetchGlobal, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  const localSearchResults = searchQuery.trim()
    ? searchableLocations.filter(
        (loc) =>
          loc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          loc.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
          loc.type.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const searchResults = [...localSearchResults, ...globalResults];

  const handleSelectSearchResult = async (item: any) => {
    setSearchQuery(item.title);
    setShowSearchDropdown(false);
    const zoom = item.type === 'GEOCODE' ? 14 : 16;
    setFlyZoom(zoom);
    setFlyTarget([item.lat, item.lng]);

    let customElev: number | undefined = undefined;
    if (item.type === 'GEOCODE') {
      try {
        const elevRes = await fetch(
          `https://api.open-meteo.com/v1/elevation?latitude=${item.lat.toFixed(4)}&longitude=${item.lng.toFixed(4)}`
        );
        if (elevRes.ok) {
          const elevData = await elevRes.json();
          if (elevData?.elevation?.[0] !== undefined) {
            customElev = elevData.elevation[0];
          }
        }
      } catch {
        // fallback to regional baseline in evaluatePointRisk
      }
    }

    if (item.type === 'GEOCODE') {
      setSearchedLocation({
        name: item.title,
        subtitle: item.subtitle || item.title,
        lat: item.lat,
        lng: item.lng
      });
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('lat', item.lat.toFixed(5));
        next.set('lng', item.lng.toFixed(5));
        next.set('place', item.title);
        return next;
      });
    }

    const assessment = evaluatePointRisk(
      item.lat, 
      item.lng, 
      selectedMissionId, 
      item.subtitle || item.title, 
      customElev
    );
    // Sets natural risk tier computed from actual elevation and geography
    setRiskProbe(assessment);

    if (item.type === 'SURVIVOR') {
      const match = detections.find((d: any) => d.id === item.id || (Math.abs(d.latitude - item.lat) < 0.001 && Math.abs(d.longitude - item.lng) < 0.001));
      if (match) setSelectedSurvivorId(match.id);
    }
  };

  const handleSearchSubmit = async () => {
    if (localSearchResults.length > 0) {
      handleSelectSearchResult(localSearchResults[0]);
      return;
    }
    if (globalResults.length > 0) {
      handleSelectSearchResult(globalResults[0]);
      return;
    }
    const q = searchQuery.trim();
    if (!q) return;

    setIsSearchingGlobal(true);
    const candidates = buildGeocodeQueries(q);
    let foundItem: any = null;

    for (const cand of candidates) {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cand)}&limit=1&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            foundItem = data[0];
            break;
          }
        }
      } catch (err) {
        console.error('Candidate search error:', err);
      }
    }

    setIsSearchingGlobal(false);

    if (foundItem) {
      const addr = foundItem.address || {};
      let cleanTitle = foundItem.name && foundItem.name.length > 2 ? foundItem.name : '';
      if (!cleanTitle || cleanTitle.length <= 2) {
        cleanTitle = addr.city || addr.town || addr.village || addr.municipality || addr.state_district || addr.county || addr.suburb || addr.state || (foundItem.display_name ? foundItem.display_name.split(',')[0].trim() : 'Location');
      }
      const contextParts = [addr.state_district, addr.state, addr.country].filter(Boolean);
      const contextStr = contextParts.length > 0 ? contextParts.join(', ') : foundItem.display_name;
      handleSelectSearchResult({
        id: `osm-${foundItem.place_id}`,
        title: cleanTitle,
        subtitle: contextStr,
        type: 'GEOCODE',
        lat: parseFloat(foundItem.lat),
        lng: parseFloat(foundItem.lon),
      });
    }
  };

  // Modals
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showLiveStreamModal, setShowLiveStreamModal] = useState(false);
  const [showFlightPlanModal, setShowFlightPlanModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Live Stream Controls
  const [streamMode, setStreamMode] = useState<'RGB' | 'THERMAL'>('RGB');
  const [aiBoundingBoxes, setAiBoundingBoxes] = useState(true);

  // SAR Flight Plan Data
  const [flightPlan, setFlightPlan] = useState<any>(null);
  const [generatingFlightPlan, setGeneratingFlightPlan] = useState(false);

  // Upload Imagery State
  const [uploadDroneModel, setUploadDroneModel] = useState('DJI Matrice 300 RTK');
  const [uploadSensorType, setUploadSensorType] = useState('RGB + NIR Dual Sensor');
  const [uploadAltitude, setUploadAltitude] = useState(65);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const fetchMission = async (missionId: string = selectedMissionId) => {
    try {
      setLoading(true);
      const res = await droneService.getMissionDetail(missionId);
      if (res) {
        setMissionData(res);
      }
    } catch (e) {
      console.error('Failed to load drone mission detail:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMission(selectedMissionId);
  }, [selectedMissionId]);

  const handleSelectSurvivor = (survivor: any) => {
    setSelectedSurvivorId(survivor.id);
    setFlyTarget([survivor.latitude, survivor.longitude]);
  };

  const handleTriggerAnalysis = async () => {
    try {
      setAnalyzing(true);
      await droneService.triggerFlightAnalysis({
        target_sector: selectedMissionId === 'drn-msn-nepal' ? 'Bagmati River Corridor' : 'Trishuli Sector A Delta',
        drone_model: 'DJI Matrice 300 RTK + Zenmuse P1 / L1 LiDAR',
        flight_altitude_m: selectedMissionId === 'drn-msn-nepal' ? 70.0 : 65.0,
        baseline_ground_elevation_m: selectedMissionId === 'drn-msn-nepal' ? 1296.2 : 2.6,
        simulated_flood_surge_m: selectedMissionId === 'drn-msn-nepal' ? 1298.4 : 1.2
      });
      await fetchMission();
      setDispatchSuccess('Deep Learning Photogrammetry Pipeline re-run successfully!');
      setTimeout(() => setDispatchSuccess(null), 4000);
    } catch (e) {
      console.error('Analysis failed:', e);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleResetMissionDetections = async () => {
    try {
      await droneService.resetMissionDetections(selectedMissionId);
      await fetchMission();
      setDispatchSuccess('All survivor detections reset to un-dispatched state for live demo.');
      setTimeout(() => setDispatchSuccess(null), 4000);
    } catch (e) {
      console.error('Reset failed:', e);
      // Fallback local reset
      setMissionData((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          detections: prev.detections.map((d: any) => ({
            ...d,
            is_rescued: false,
            assigned_team_id: null
          }))
        };
      });
      setDispatchSuccess('Local survivor detections reset to un-dispatched state.');
      setTimeout(() => setDispatchSuccess(null), 4000);
    }
  };

  const handleResetSingleSurvivor = async (e: React.MouseEvent, detectionId: string) => {
    e.stopPropagation();
    try {
      await droneService.resetSurvivorDetection(detectionId);
      setMissionData((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          detections: prev.detections.map((d: any) => 
            d.id === detectionId ? { ...d, is_rescued: false, assigned_team_id: null } : d
          )
        };
      });
      setDispatchSuccess('Cluster status reset. Ready for dispatch.');
      setTimeout(() => setDispatchSuccess(null), 3000);
    } catch (err) {
      console.error('Reset survivor error:', err);
    }
  };

  const handleGenerateSARPlan = async () => {
    try {
      setGeneratingFlightPlan(true);
      const isNepal = selectedMissionId === 'drn-msn-nepal';
      const cLat = isNepal ? 27.6850 : 21.8450;
      const cLng = isNepal ? 85.2950 : 89.5450;
      const plan = await droneService.generateSARFlightPlan(cLat, cLng, isNepal ? 70.0 : 65.0);
      setFlightPlan(plan);
      setShowFlightPlanLayer(true);
      setShowFlightPlanModal(true);
    } catch (e) {
      console.error('Failed to generate SAR flight plan:', e);
    } finally {
      setGeneratingFlightPlan(false);
    }
  };

  const handleUploadSubmit = () => {
    setIsUploading(true);
    let p = 0;
    const interval = setInterval(() => {
      p += 20;
      setUploadProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(async () => {
          setIsUploading(false);
          setShowUploadModal(false);
          setUploadProgress(0);
          await handleTriggerAnalysis();
          setDispatchSuccess('Drone survey uploaded & full AI photogrammetry pipeline executed!');
          setTimeout(() => setDispatchSuccess(null), 5000);
        }, 600);
      }
    }, 250);
  };

  const handleDispatch = async (detectionId: string, teamId: string = 'RT-02') => {
    try {
      setDispatchingId(detectionId);
      const res = await droneService.dispatchSurvivorRescue(detectionId, teamId, 'CRITICAL');
      
      setDispatchSuccess(
        `Rescue Unit ${teamId} dispatched! Mission Code: ${res.data?.rescue_mission_code || 'MSN-SAR-001'}`
      );
      
      setMissionData((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          detections: prev.detections.map((d: any) => 
            d.id === detectionId ? { ...d, is_rescued: true, assigned_team_id: teamId } : d
          )
        };
      });

      setTimeout(() => setDispatchSuccess(null), 6000);
    } catch (e) {
      console.error('Dispatch failed:', e);
    } finally {
      setDispatchingId(null);
    }
  };

  const mission = missionData?.mission || {};
  const elevation = missionData?.elevation_profile || {};

  // Dynamic base coordinates for mission or searched place
  const baseLat = searchedLocation ? searchedLocation.lat : (mission.latitude || 21.8450);
  const baseLng = searchedLocation ? searchedLocation.lng : (mission.longitude || 89.5450);

  // Regional Multi-District Disaster Corridor (Matching User Reference: Rasuwa, Nuwakot, Dhading, etc.)
  const regionalCorridor: RegionalDisasterCorridor = useMemo(() => {
    return getRegionalDisasterCorridor(
      searchedLocation ? searchedLocation.name : (selectedMissionId === 'drn-msn-nepal' ? 'Nepal' : 'Trishuli Sector A'),
      baseLat,
      baseLng
    );
  }, [searchedLocation?.name, selectedMissionId, baseLat, baseLng]);

  // Village risk directory and locality list for active district / place
  const districtVillages: DistrictVillage[] = getDistrictVillages(
    searchedLocation ? searchedLocation.name : (selectedMissionId === 'drn-msn-nepal' ? 'Bagmati' : 'Trishuli Sector A'),
    baseLat,
    baseLng
  );

  // Dynamic localization flags
  const isRajam = searchedLocation?.name.toLowerCase().includes('rajam') || searchedLocation?.subtitle.toLowerCase().includes('rajam');
  const isTrishuli = searchedLocation?.name.toLowerCase().includes('trishuli') || searchedLocation?.subtitle.toLowerCase().includes('trishuli') || searchedLocation?.name.toLowerCase().includes('trisuli');
  const activePlaceTitle = searchedLocation ? searchedLocation.name : (selectedMissionId === 'drn-msn-nepal' ? 'Bagmati' : 'Trishuli Sector A');

  // Dynamically tailor survivor clusters to the searched location:
  const rawDetections = missionData?.detections || [];
  const detections = searchedLocation
    ? (riskProbe?.riskTier === 'SAFE'
        ? [] // Zero stranded survivors in safe high ground
        : [
            {
              id: 'det-search-1',
              detection_code: 'DET-LOC-001',
              title: isRajam
                ? 'Rajam Boddam Road Rooftop (32 Souls)'
                : isTrishuli
                  ? 'Trishuli Riverbed Settlement (32 Souls)'
                  : `${activePlaceTitle} Lowland Rooftop (32 Souls)`,
              detection_type: 'SURVIVOR_CLUSTER',
              headcount: 32,
              water_depth_m: riskProbe?.riskTier === 'HIGH' ? 1.60 : 0.65,
              confidence: 0.978,
              latitude: +(baseLat - 0.0018).toFixed(5),
              longitude: +(baseLng - 0.0012).toFixed(5),
              description: isRajam
                ? '32 stranded residents gathered on Boddam Road 2F terrace in Rajam. Lowland approach road flooded in 1.6m surge. Clear approach for rescue boats.'
                : isTrishuli
                  ? '32 stranded residents gathered on riverbank clinic 2F terrace in Trishuli. Ground floor inundated by Trishuli River surge (1.6m).'
                  : `32 stranded individuals gathered on lowland terrace in ${activePlaceTitle}. Approach road submerged. Rescue boat access verified.`,
              is_rescued: false,
              assigned_team_id: null,
            },
            {
              id: 'det-search-2',
              detection_code: 'DET-LOC-002',
              title: isRajam
                ? 'Rajam Commercial Market Terrace (16 Souls)'
                : isTrishuli
                  ? 'Trishuli School Building Roof (16 Souls)'
                  : `${activePlaceTitle} School Building Roof (16 Souls)`,
              detection_type: 'SURVIVOR_CLUSTER',
              headcount: 16,
              water_depth_m: riskProbe?.riskTier === 'HIGH' ? 1.45 : 0.50,
              confidence: 0.954,
              latitude: +(baseLat - 0.0010).toFixed(5),
              longitude: +(baseLng + 0.0018).toFixed(5),
              description: isRajam
                ? '16 residents signaling with yellow tarp on commercial 2F roof near Rajam market. Safe boat docking verified at northern approach.'
                : isTrishuli
                  ? '16 residents on school building roof signaling with tarp above Trishuli flood margins. Safe docking at eastern stairs.'
                  : `16 residents stranded on building roof in ${activePlaceTitle} signaling for evacuation. Safe boat dock verified at stairs.`,
              is_rescued: false,
              assigned_team_id: null,
            },
          ])
    : rawDetections;

  // Dynamically tailor evacuation routes to the searched location:
  const rawRoutes = missionData?.evacuation_routes || [];
  const routes = searchedLocation
    ? [
        {
          route_id: 'rte-search-1',
          name: isRajam
            ? 'SH-16 Rajam High Ridge Bypass'
            : isTrishuli
              ? 'Trishuli High Valley Ridge Bypass'
              : `${activePlaceTitle} High Ridge Corridor`,
          passability: 'PASSABLE_DRY',
          obstruction: isRajam
            ? 'Dry pavement corridor leading directly toward GMRIT Campus designated relief shelter.'
            : isTrishuli
              ? 'Elevated ridge road clear of river swell. Direct escape toward Nuwakot district HQ.'
              : 'Elevated dry pavement corridor clear of flood surge. Direct path to shelter haven.',
          water_depth_m: 0.0,
          recommended_for: 'All Vehicles / Ambulances / Evacuation Convoys',
        },
        {
          route_id: 'rte-search-2',
          name: isRajam
            ? 'Rajam RTC Bus Stand Slipway'
            : isTrishuli
              ? 'Trishuli Riverbank Slipway'
              : `${activePlaceTitle} Secondary Slipway`,
          passability: 'PASSABLE_BOAT_AMPHIBIOUS',
          obstruction: isRajam
            ? 'Submerged market road margin (0.65m depth). Passable for tactical 4x4 trucks & rescue boats.'
            : isTrishuli
              ? 'Riverbank approach road flooded (1.2m depth). Passable for inflatable rafts & Zodiac craft.'
              : 'Road shoulder flooded. Passable for amphibious craft & high-clearance 4x4 vehicles.',
          water_depth_m: riskProbe?.riskTier === 'HIGH' ? 1.20 : 0.65,
          recommended_for: 'Tactical 4x4 / Amphibious Craft',
        },
        {
          route_id: 'rte-search-3',
          name: isRajam
            ? 'Boddam Culvert Lowland Dip'
            : isTrishuli
              ? 'Trishuli Lowland Culvert Underpass'
              : `${activePlaceTitle} Lowland Culvert Cutoff`,
          passability: 'IMPASSABLE_BLOCKED',
          obstruction: isRajam
            ? 'Severe flood surge (1.7m) across culvert dip. Dangerous water suction. Road traffic closed.'
            : isTrishuli
              ? 'Trishuli River violent torrent (1.85m) submerging road pass. Impassable for all ground vehicles.'
              : 'Arterial underpass completely submerged. Closed for ground vehicles.',
          water_depth_m: 1.85,
          recommended_for: 'Closed / Aerial Winch Only',
        },
      ]
    : rawRoutes;

  // Location-unique organic polygon generator:
  // Creates distinct geographic contours for every unique city, district, or place on Earth
  const getOrganicPolygon = (cLat: number, cLng: number, rLat: number, rLng: number, pts = 8, phase = 0): [number, number][] => {
    const ptsArr: [number, number][] = [];
    const seed = Math.abs(Math.sin(cLat * 37.19 + cLng * 73.41));
    for (let i = 0; i < pts; i++) {
      const angle = (i / pts) * 2 * Math.PI + phase;
      const v = 0.72 + 0.52 * Math.abs(Math.sin(cLat * (i + 1) * 13.7 + cLng * (i + 2) * 23.3 + seed * 7));
      const pLat = cLat + Math.sin(angle) * rLat * v;
      const pLng = cLng + Math.cos(angle) * rLng * v * (1.0 + 0.25 * Math.cos(angle + seed));
      ptsArr.push([+pLat.toFixed(5), +pLng.toFixed(5)]);
    }
    ptsArr.push(ptsArr[0]); // close loop
    return ptsArr;
  };

  // Dynamic risk polygons uniquely molded to current coordinates
  const highRiskPositions: [number, number][] = searchedLocation
    ? getOrganicPolygon(baseLat - 0.0016, baseLng - 0.0014, 0.0028, 0.0036, 8, 0.2)
    : (selectedMissionId === 'drn-msn-nepal' || (mission.latitude && mission.latitude > 25))
      ? [
          [27.6815, 85.2915],
          [27.6835, 85.2930],
          [27.6855, 85.2950],
          [27.6875, 85.2965],
          [27.6870, 85.2980],
          [27.6845, 85.2960],
          [27.6825, 85.2935],
          [27.6815, 85.2915]
        ]
      : [
          [21.8430, 89.5420],
          [21.8440, 89.5450],
          [21.8465, 89.5455],
          [21.8460, 89.5470],
          [21.8435, 89.5460],
          [21.8425, 89.5430]
        ];

  const mediumRiskPositions: [number, number][] = searchedLocation
    ? getOrganicPolygon(baseLat, baseLng, 0.0048, 0.0062, 9, 0.5)
    : (selectedMissionId === 'drn-msn-nepal' || (mission.latitude && mission.latitude > 25))
      ? [
          [27.6805, 85.2900],
          [27.6830, 85.2915],
          [27.6865, 85.2935],
          [27.6890, 85.2960],
          [27.6885, 85.2995],
          [27.6850, 85.2985],
          [27.6820, 85.2955],
          [27.6805, 85.2900]
        ]
      : [
          [21.8415, 89.5405],
          [21.8430, 89.5470],
          [21.8475, 89.5485],
          [21.8480, 89.5415],
          [21.8415, 89.5405]
        ];

  const safeRiskPositions: [number, number][] = searchedLocation
    ? getOrganicPolygon(baseLat + 0.0055, baseLng - 0.0035, 0.0026, 0.0032, 7, 0.8)
    : (selectedMissionId === 'drn-msn-nepal' || (mission.latitude && mission.latitude > 25))
      ? [
          [27.6865, 85.2890],
          [27.6895, 85.2910],
          [27.6910, 85.2940],
          [27.6885, 85.2930],
          [27.6865, 85.2890]
        ]
      : [
          [21.8470, 89.5465],
          [21.8495, 89.5485],
          [21.8490, 89.5510],
          [21.8465, 89.5490]
        ];

  const blockedRoadPositions: [number, number][] = (liveBlockedRoute && liveBlockedRoute.length > 0)
    ? liveBlockedRoute
    : (searchedLocation
        ? [
            [+(baseLat - 0.0022).toFixed(5), +(baseLng - 0.0024).toFixed(5)],
            [+(baseLat - 0.0006).toFixed(5), +(baseLng - 0.0009).toFixed(5)],
            [+(baseLat + 0.0008).toFixed(5), +(baseLng + 0.0006).toFixed(5)]
          ]
        : (selectedMissionId === 'drn-msn-nepal' || (mission.latitude && mission.latitude > 25))
          ? [
              [27.6825, 85.2925],
              [27.6835, 85.2935],
              [27.6845, 85.2945]
            ]
          : [
              [21.8430, 89.5420],
              [21.8435, 89.5435],
              [21.8440, 89.5450]
            ]);

  const safeRoutePositions: [number, number][] = (liveRealRoute && liveRealRoute.length > 0)
    ? liveRealRoute
    : (searchedLocation
        ? [
            [+(baseLat + 0.0004).toFixed(5), +(baseLng + 0.0012).toFixed(5)],
            [+(baseLat + 0.0024).toFixed(5), +(baseLng - 0.0012).toFixed(5)],
            [+(baseLat + 0.0046).toFixed(5), +(baseLng - 0.0032).toFixed(5)],
            [+(baseLat + 0.0058).toFixed(5), +(baseLng - 0.0035).toFixed(5)]
          ]
        : (selectedMissionId === 'drn-msn-nepal' || (mission.latitude && mission.latitude > 25))
          ? [
              [27.6810, 85.2905],
              [27.6835, 85.2925],
              [27.6860, 85.2950],
              [27.6880, 85.2970],
              [27.6895, 85.2985]
            ]
          : [
              [21.8410, 89.5410],
              [21.8435, 89.5440],
              [21.8460, 89.5460],
              [21.8480, 89.5480]
            ]);

  // Dynamic 4 top intelligence metrics derived from actual terrain elevation & active triage
  const activeTriageTier = riskProbe ? riskProbe.riskTier : 'HIGH';
  const terrainElev = riskProbe?.groundDemM ?? (searchedLocation ? 50 : 2.5);

  // Scaled realistically based on local terrain
  const displayFootprint = activeTriageTier === 'HIGH'
    ? (terrainElev < 25 ? 68.4 : +(38.0 + Math.abs(Math.sin(baseLat * 10)) * 20).toFixed(1))
    : activeTriageTier === 'MEDIUM'
      ? (terrainElev < 25 ? 24.5 : +(16.0 + Math.abs(Math.cos(baseLng * 10)) * 10).toFixed(1))
      : 0.0;

  const displayAvgDepth = activeTriageTier === 'HIGH' 
    ? (riskProbe?.waterDepthM || (terrainElev < 25 ? 1.85 : 1.35)) 
    : activeTriageTier === 'MEDIUM' 
      ? (riskProbe?.waterDepthM || (terrainElev < 25 ? 0.65 : 0.45)) 
      : 0.0;

  const displayMaxDepth = activeTriageTier === 'HIGH' 
    ? (terrainElev < 25 ? 2.40 : +(displayAvgDepth * 1.35).toFixed(2)) 
    : activeTriageTier === 'MEDIUM' 
      ? (terrainElev < 25 ? 1.10 : +(displayAvgDepth * 1.4).toFixed(2)) 
      : 0.0;

  const displayCutoffs = activeTriageTier === 'HIGH' 
    ? (terrainElev < 25 ? 3 : 2) 
    : activeTriageTier === 'MEDIUM' ? 1 : 0;

  const placeTitle = searchedLocation ? searchedLocation.name : (selectedMissionId === 'drn-msn-nepal' ? 'Bagmati' : 'Trishuli Sector A');

  const displayCutoffText = isRajam
    ? (activeTriageTier === 'HIGH'
        ? 'SH-16 Lowland Dip & Boddam Culvert Submerged • Inflatable Boats & Aerial Winch only'
        : activeTriageTier === 'MEDIUM'
          ? 'Rajam RTC Bus Stand & Market Margins Submerged (0.65m) • Passable for High-Clearance 4x4'
          : 'All roads via GMRIT Campus Ridge 100% dry & clear • Primary evacuation corridor active')
    : searchedLocation
      ? (activeTriageTier === 'HIGH'
          ? `${placeTitle} Lowland Arterial & Culvert Submerged • Inflatable Boats & Choppers only`
          : activeTriageTier === 'MEDIUM'
            ? `${placeTitle} Road Shoulders Submerged (0.65m) • Passable for High-Clearance 4x4`
            : `All escape routes in ${placeTitle} dry & open • Primary evacuation highway active`)
      : (selectedMissionId === 'drn-msn-nepal'
          ? (activeTriageTier === 'HIGH'
              ? 'Balkhu Underpass Submerged • Inflatables & Choppers only'
              : activeTriageTier === 'MEDIUM'
                ? 'Market Approach Road Submerged (0.65m) • 4x4 Trucks Passable'
                : 'Tribhuvan University Ridge Corridor 100% dry & open')
          : (activeTriageTier === 'HIGH'
              ? 'Pasang Lhamu Highway (NH-04) & Main Arterial Submerged • Inflatable Boats & Choppers only'
              : activeTriageTier === 'MEDIUM'
                ? '1 Levee Slipway Submerged • Passable for High-Clearance 4x4'
                : 'All routes dry & open • Primary evacuation highway active'));

  const displaySurvivors = activeTriageTier === 'HIGH' ? 48 : activeTriageTier === 'MEDIUM' ? 12 : 0;
  const displaySurvivorText = isRajam
    ? (activeTriageTier === 'HIGH'
        ? '2 Low-lying residential clusters in Rajam flagged for immediate dispatch'
        : activeTriageTier === 'MEDIUM'
          ? 'Ground-floor staging near Rajam market • Awaiting 4x4 evacuation convoy'
          : 'Zero stranded • GMRIT & Mandal Revenue HQ designated safe assembly shelter')
    : searchedLocation
      ? (activeTriageTier === 'HIGH'
          ? `2 Low-lying rooftop clusters in ${placeTitle} flagged for immediate dispatch`
          : activeTriageTier === 'MEDIUM'
            ? `Ground-floor staging in ${placeTitle} • Awaiting amphibious escort`
            : `Zero stranded • Designated civilian assembly shelter in ${placeTitle}`)
      : (activeTriageTier === 'HIGH'
          ? '2 Rooftop clusters flagged for immediate dispatch'
          : activeTriageTier === 'MEDIUM'
            ? 'Ground-floor staging • Awaiting amphibious escort'
            : 'Zero stranded • Designated civilian assembly shelter');

  return (
    <div className="space-y-5 animate-fade-in p-2">
      {/* Toast Alert */}
      {dispatchSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="text-sm font-semibold">{dispatchSuccess}</span>
        </div>
      )}

      {/* Header & UAV Mission Console Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-red-100 text-red-700 border border-red-200 flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5" />
                TACTICAL UAV / DRONE RECON • 2.4cm GSD PHOTOGRAMMETRY
              </span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                RTK ACCURACY ±1.8cm
              </span>
              <span className="text-xs font-mono text-slate-500">UAV CALLSIGN: EAGLE-01</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">RECON SECTOR:</span>
              <select
                value={selectedMissionId}
                onChange={(e) => {
                  setSelectedMissionId(e.target.value);
                  setSearchParams({ mission: e.target.value });
                }}
                className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-900 text-xs font-bold rounded-lg px-2.5 py-1 focus:border-sky-500 outline-none cursor-pointer"
              >
                <option value="drn-msn-001">🇧🇩 Trishuli Sector A Delta (Cyclone Remal, Bangladesh)</option>
                <option value="drn-msn-nepal">🇳🇵 Bagmati River Basin (Nepal 2024 Monsoon Flood)</option>
              </select>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {mission.mission_name || 'Trishuli Sector A Delta Evacuation Recon'}
            </h1>
            <p className="text-xs text-slate-600 mt-1 flex items-center gap-2">
              <span>End-to-end aerial pipeline: Flight Photogrammetry → Orthomosaic (WebODM) → Deep Learning Segmentation (YOLOv8 / SegFormer) → Elevation Subtraction (DSM - DEM).</span>
              <button 
                onClick={() => setShowGuideModal(true)}
                className="text-sky-600 hover:text-sky-700 font-bold underline flex items-center gap-0.5 text-xs inline-flex"
              >
                <HelpCircle className="w-3.5 h-3.5" /> How Pipeline Works?
              </button>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Live Camera Feed HUD Button */}
            <button
              onClick={() => setShowLiveStreamModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition border border-slate-700"
            >
              <Video className="w-3.5 h-3.5 text-red-400 animate-pulse" />
              Live Drone Cam Feed
            </button>

            {/* SAR Grid Flight Planner Button */}
            <button
              onClick={handleGenerateSARPlan}
              disabled={generatingFlightPlan}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition"
            >
              <Plane className={`w-3.5 h-3.5 ${generatingFlightPlan ? 'animate-bounce' : ''}`} />
              {generatingFlightPlan ? 'Planning...' : 'SAR Grid Flight Plan'}
            </button>

            {/* Ingest Drone Survey Imagery */}
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition border border-slate-300"
            >
              <UploadCloud className="w-3.5 h-3.5 text-slate-600" />
              Ingest Drone Photos
            </button>

            {/* Re-Run AI Pipeline */}
            <button
              onClick={handleTriggerAnalysis}
              disabled={analyzing}
              className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
              {analyzing ? 'Processing...' : 'Re-Run Pipeline'}
            </button>

            {/* Reset All Detections Button for Interactive Testing */}
            <button
              onClick={handleResetMissionDetections}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-xl transition border border-amber-300 shadow-sm"
              title="Reset survivor status to test dispatch workflow again"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
              Reset Demo
            </button>
          </div>
        </div>
      </div>

      {/* Tactical Sector Search & Quick-Target Filter */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm relative z-20">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Search Input Box */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4 text-slate-500" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setShowSearchDropdown(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearchSubmit();
                }
              }}
              placeholder={
                isNepal
                  ? 'Search any city, village, landmark or sector hotspot (e.g. "Rajam, Andhra Pradesh", "Balkhu", "Dhading")...'
                  : 'Search any city, village, landmark or sector hotspot (e.g. "Rajam, Andhra Pradesh", "School", "Ridge")...'
              }
              className="w-full pl-10 pr-16 py-2.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-sm text-slate-800 placeholder-slate-400 border border-slate-200 focus:border-blue-500 rounded-xl outline-none transition font-medium shadow-inner"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5">
              {isSearchingGlobal && (
                <span title="Searching global geocoder...">
                  <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                </span>
              )}
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setShowSearchDropdown(false);
                  }}
                  className="text-slate-400 hover:text-slate-600 p-0.5"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Autocomplete Dropdown Popover */}
            {showSearchDropdown && searchQuery.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50 divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {isSearchingGlobal && (
                  <div className="px-3.5 py-1.5 bg-blue-50/70 text-[11px] text-blue-700 flex items-center gap-1.5 font-medium border-b border-blue-100">
                    <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />
                    Searching global OpenStreetMap satellite geocoder...
                  </div>
                )}

                {searchResults.length > 0 ? (
                  searchResults.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelectSearchResult(item)}
                      className="w-full text-left p-3 hover:bg-blue-50/70 transition flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-lg flex-shrink-0">{item.icon}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700 truncate">
                            {item.title}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {item.subtitle}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 pl-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                          item.type === 'SURVIVOR' 
                            ? 'bg-red-50 text-red-700 border-red-200' 
                            : item.type === 'HAZARD' 
                              ? 'bg-amber-50 text-amber-700 border-amber-200' 
                              : item.type === 'SHELTER' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : item.type === 'GEOCODE'
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  : 'bg-sky-50 text-sky-700 border-sky-200'
                        }`}>
                          {item.type === 'GEOCODE' ? 'GLOBAL LOCATION' : item.type}
                        </span>
                        <span className="text-[10px] text-blue-600 font-bold group-hover:translate-x-0.5 transition hidden sm:inline">
                          Fly & Probe →
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-slate-500">
                    {isSearchingGlobal ? (
                      <div className="flex flex-col items-center justify-center gap-2 py-2">
                        <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                        <span>Locating &ldquo;{searchQuery}&rdquo; on global satellite registry...</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div>No exact local matches found for &ldquo;<span className="font-semibold text-slate-700">{searchQuery}</span>&rdquo;.</div>
                        <button
                          onClick={handleSearchSubmit}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 shadow-sm"
                        >
                          <Globe className="w-3.5 h-3.5" /> Query Global OpenStreetMap for &ldquo;{searchQuery}&rdquo;
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-thin">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap pl-1 pr-0.5">
              Tactical Targets:
            </span>
            {searchableLocations.map((loc) => (
              <button
                key={loc.id}
                onClick={() => handleSelectSearchResult(loc)}
                className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition whitespace-nowrap shadow-xs flex items-center gap-1 ${loc.chipStyle}`}
                title={`Focus map on ${loc.title} & evaluate risk profile`}
              >
                <span>{loc.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active Location Banner if user searched a place */}
      {searchedLocation && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-xl p-3.5 px-4 flex flex-wrap items-center justify-between gap-3 shadow-md border border-blue-700/50 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/20 border border-blue-400/40 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-sky-400 animate-bounce" />
            </div>
            <div>
              <div className="font-bold text-sm flex items-center gap-2">
                <span>Active Recon Target: {searchedLocation.name}</span>
                <span className="text-[10px] bg-sky-500/30 text-sky-200 px-2 py-0.5 rounded-full border border-sky-400/40 font-mono">
                  PROBED SECTOR
                </span>
              </div>
              <div className="text-xs text-blue-200/80 mt-0.5">
                {searchedLocation.subtitle} &bull; Coordinates: {searchedLocation.lat.toFixed(4)}, {searchedLocation.lng.toFixed(4)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSearchedLocation(null);
                setRiskProbe(null);
                setFlyTarget([mission.latitude || 21.8450, mission.longitude || 89.5450]);
                setFlyZoom(15);
              }}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition border border-white/20 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to Mission Sector
            </button>
          </div>
        </div>
      )}

      {/* 4 Core Intelligence Pipeline Output Cards (Dynamically Synchronized) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Exact Flood Footprint */}
        <div 
          onClick={() => handleQuickProbePreset('HIGH')}
          className={`bg-white border rounded-xl p-4 shadow-sm cursor-pointer transition border-l-4 ${
            activeTriageTier === 'HIGH' ? 'border-sky-500 border-l-sky-500 ring-2 ring-sky-200' : 'border-slate-200 border-l-sky-500 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
            <span>1. EXACT FLOOD FOOTPRINT</span>
            <Droplets className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {displayFootprint.toFixed(1)}k <span className="text-xs font-normal text-slate-500">m²</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {activeTriageTier === 'HIGH' ? 'Severe Inundation Core Zone' : activeTriageTier === 'MEDIUM' ? 'Buffer Margins Waterlogged' : 'Zero Flood Inundation on Dry Ground'}
          </div>
        </div>

        {/* Card 2: Water Depth (Elevation Subtraction) */}
        <div 
          onClick={() => handleQuickProbePreset(activeTriageTier === 'SAFE' ? 'HIGH' : activeTriageTier)}
          className={`bg-white border rounded-xl p-4 shadow-sm cursor-pointer transition border-l-4 ${
            activeTriageTier === 'HIGH' ? 'border-blue-600 border-l-blue-600 ring-2 ring-blue-200' : 'border-slate-200 border-l-blue-600 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
            <span>2. WATER DEPTH (DSM - DEM)</span>
            <Mountain className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-700 font-mono">
            {displayAvgDepth.toFixed(1)}m <span className="text-xs font-normal text-slate-500">Avg Surge</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Max depth: <strong className="text-slate-700">{displayMaxDepth.toFixed(2)}m</strong> (DSM minus DEM ground)
          </div>
        </div>

        {/* Card 3: Blocked Evacuation Routes */}
        <div 
          onClick={() => handleQuickProbePreset('HIGH')}
          className={`bg-white border rounded-xl p-4 shadow-sm cursor-pointer transition border-l-4 ${
            activeTriageTier === 'HIGH' ? 'border-orange-500 border-l-orange-500 ring-2 ring-orange-200' : 'border-slate-200 border-l-orange-500 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
            <span>3. BLOCKED EVACUATION ROUTES</span>
            <AlertTriangle className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl font-bold text-orange-600 font-mono">
            {displayCutoffs} <span className="text-xs font-normal text-slate-500">Cutoffs</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate" title={displayCutoffText}>
            {displayCutoffText}
          </div>
        </div>

        {/* Card 4: Stranded Survivors */}
        <div 
          onClick={() => handleQuickProbePreset('HIGH')}
          className={`bg-white border rounded-xl p-4 shadow-sm cursor-pointer transition border-l-4 ${
            activeTriageTier === 'HIGH' ? 'border-red-500 border-l-red-500 ring-2 ring-red-200' : 'border-slate-200 border-l-red-500 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between text-red-600 text-[10px] font-bold uppercase tracking-wider mb-1">
            <span>4. STRANDED SURVIVORS DETECTED</span>
            <Users className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-600 font-mono">
            {displaySurvivors} <span className="text-xs font-normal text-slate-500">Souls</span>
          </div>
          <div className="text-[11px] text-red-700 font-medium mt-1">
            {displaySurvivorText}
          </div>
        </div>
      </div>

      {/* Main Grid: Leaflet Map & Stranded Survivors Live Action Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Drone Tactical Map (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg relative">
            {/* Top Map Action Bar */}
            <div className="p-3 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-white">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-red-400" />
                <span className="font-semibold text-slate-200">
                  {selectedMissionId === 'drn-msn-nepal' ? 'Bagmati River Drone Photogrammetry HUD' : 'Trishuli Sector A Drone Photogrammetry HUD'}
                </span>
                <span className="px-2 py-0.5 bg-red-950 border border-red-700 text-[10px] font-mono text-red-300 rounded">
                  UAV VECTOR HUD 1:2,500
                </span>
              </div>

              {/* Layer Toggles */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDepthLayer(!showDepthLayer)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                    showDepthLayer ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Water Extent (DSM)
                </button>
                <button
                  onClick={() => setShowSurvivorLayer(!showSurvivorLayer)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                    showSurvivorLayer ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Survivors ({detections.filter((d: any) => d.detection_type === 'SURVIVOR_CLUSTER').length})
                </button>
                <button
                  onClick={() => setShowBlockedLayer(!showBlockedLayer)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                    showBlockedLayer ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Blocked Cuts
                </button>
                <button
                  onClick={() => setShowRiskZonesLayer(!showRiskZonesLayer)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition flex items-center gap-1 ${
                    showRiskZonesLayer ? 'bg-rose-700 text-white shadow-sm' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  Risk Zones (🔴🟡🟢)
                </button>
                {flightPlan && (
                  <button
                    onClick={() => setShowFlightPlanLayer(!showFlightPlanLayer)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                      showFlightPlanLayer ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    SAR Grid
                  </button>
                )}
              </div>
            </div>

            {/* Risk Zone Triage HUD Bar */}
            <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 pr-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
                  RISK OVERLAY:
                </span>
                <button
                  onClick={() => handleQuickProbePreset('HIGH')}
                  className={`px-3 py-1 rounded text-xs font-bold transition flex items-center gap-1.5 ${
                    activeTriageTier === 'HIGH'
                      ? 'bg-red-600 text-white shadow-md shadow-red-900/60 ring-2 ring-red-400'
                      : 'bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/60'
                  }`}
                >
                  <AlertOctagon className="w-3.5 h-3.5" />
                  🔴 High Risk (1.85m)
                </button>
                <button
                  onClick={() => handleQuickProbePreset('MEDIUM')}
                  className={`px-3 py-1 rounded text-xs font-bold transition flex items-center gap-1.5 ${
                    activeTriageTier === 'MEDIUM'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-900/60 ring-2 ring-amber-400'
                      : 'bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-800/60'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  🟡 Medium Risk (0.65m)
                </button>
                <button
                  onClick={() => handleQuickProbePreset('SAFE')}
                  className={`px-3 py-1 rounded text-xs font-bold transition flex items-center gap-1.5 ${
                    activeTriageTier === 'SAFE'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/60 ring-2 ring-emerald-400'
                      : 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/60'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  🟢 Safe Ground (Dry)
                </button>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Active: <span className="font-bold text-white">{searchedLocation ? searchedLocation.name : (selectedMissionId === 'drn-msn-nepal' ? 'Bagmati Basin' : 'Trishuli Sector A')}</span>
              </div>
            </div>

            {/* Leaflet Map Canvas */}
            <div className="h-[520px] relative overflow-hidden rounded-xl border border-slate-800 shadow-inner">
              {/* ================================================================= */}
              {/* TOP-LEFT FLOATING LEGEND (Matching User Reference Image)          */}
              {/* ================================================================= */}
              <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-3.5 shadow-xl text-xs space-y-2 pointer-events-auto">
                <div className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-md bg-red-600 border border-red-700 shadow-xs" />
                  <span className="font-bold text-slate-800 text-[11px] tracking-tight">Severely affected</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-md bg-amber-500 border border-amber-600 shadow-xs" />
                  <span className="font-bold text-slate-800 text-[11px] tracking-tight">Downstream alerts</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-red-600 border-2 border-white ring-2 ring-red-500 shadow-xs" />
                  <span className="font-bold text-slate-800 text-[11px] tracking-tight">Flood-affected towns</span>
                </div>
              </div>

              {/* ================================================================= */}
              {/* BOTTOM-LEFT REGIONAL TITLE BANNER (Matching User Reference Image) */}
              {/* ================================================================= */}
              <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-2xl px-4 py-2.5 shadow-xl pointer-events-auto">
                <div className="text-base font-black text-slate-900 tracking-tight leading-tight">
                  {regionalCorridor.regionTitle}
                </div>
                <div className="text-[10px] text-slate-500 font-semibold mt-0.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Multi-District Inundation &bull; Real-time Downstream Flash Flood Corridor
                </div>
              </div>

              <MapContainer
                center={[mission.latitude || 21.8450, mission.longitude || 89.5450]}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
              >
                <MapUpdater 
                  center={[mission.latitude || 21.8450, mission.longitude || 89.5450]} 
                  flyTarget={flyTarget}
                  zoomLevel={flyZoom}
                />
                <MapClickHandler onMapClick={handleMapClick} />
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
                        setFlyTarget(d.center);
                        setFlyZoom(11);
                      }
                    }}
                  />
                ))}

                {/* Adjacent Monitor District Pills (Gorkha, Tanahun, Chitwan, etc.) */}
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
                    icon={createFloodTownIcon(t.name, t.symbol, selectedVillageId === t.id)}
                    eventHandlers={{
                      click: () => {
                        setSelectedVillageId(t.id);
                        handleMapClick({ lat: t.pos[0], lng: t.pos[1] });
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
                        <button
                          onClick={() => {
                            setSelectedVillageId(t.id);
                            setFlyTarget(t.pos);
                            setFlyZoom(15);
                            handleMapClick({ lat: t.pos[0], lng: t.pos[1] });
                          }}
                          className="w-full py-1 bg-slate-900 hover:bg-sky-600 text-white font-bold rounded text-[10px] transition"
                        >
                          Zoom In & Trace Evacuation
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* 1. HIGH RISK ZONE POLYGON (RED) */}
                {showRiskZonesLayer && (
                  <Polygon
                    positions={highRiskPositions}
                    pathOptions={{
                      color: '#dc2626',
                      fillColor: '#ef4444',
                      fillOpacity: 0.35,
                      weight: 2
                    }}
                  >
                    <Popup>
                      <div className="p-2 text-xs">
                        <strong className="text-red-600 font-bold">🔴 HIGH RISK ZONE (SEVERE DANGER)</strong><br />
                        Water Depth: <strong>1.50m &ndash; 2.40m</strong><br />
                        Current: <strong>2.4 m/s violent torrent</strong><br />
                        Status: Complete evacuation closure. Inflatables/Choppers only.
                      </div>
                    </Popup>
                  </Polygon>
                )}

                {/* 2. MEDIUM RISK ZONE POLYGON (YELLOW/AMBER) */}
                {showRiskZonesLayer && (
                  <Polygon
                    positions={mediumRiskPositions}
                    pathOptions={{
                      color: '#d97706',
                      fillColor: '#f59e0b',
                      fillOpacity: 0.20,
                      weight: 2,
                      dashArray: '5 5'
                    }}
                  >
                    <Popup>
                      <div className="p-2 text-xs">
                        <strong className="text-amber-600 font-bold">🟡 MEDIUM RISK ZONE (CAUTION)</strong><br />
                        Water Depth: <strong>0.30m &ndash; 1.20m</strong><br />
                        Status: Submerged roads & market fringe. 4x4 Trucks & Boats only.
                      </div>
                    </Popup>
                  </Polygon>
                )}

                {/* 3. SAFE ZONE POLYGON (GREEN) */}
                {showRiskZonesLayer && (
                  <Polygon
                    positions={safeRiskPositions}
                    pathOptions={{
                      color: '#16a34a',
                      fillColor: '#22c55e',
                      fillOpacity: 0.25,
                      weight: 2
                    }}
                  >
                    <Popup>
                      <div className="p-2 text-xs">
                        <strong className="text-emerald-600 font-bold">🟢 SAFE HIGH GROUND HAVEN</strong><br />
                        Ground Elevation: <strong>1,299m+ (Above Crest)</strong><br />
                        Water Depth: <strong>0.0m (Dry Land)</strong><br />
                        Status: Designated Civilian Shelter & Helicopter LZ.
                      </div>
                    </Popup>
                  </Polygon>
                )}

                {/* Interactive Clicked Risk Probe Marker */}
                {riskProbe && (
                  <>
                    <Circle
                      center={[riskProbe.lat, riskProbe.lng]}
                      radius={60}
                      pathOptions={{
                        color: riskProbe.riskTier === 'HIGH' ? '#ef4444' : riskProbe.riskTier === 'MEDIUM' ? '#f59e0b' : '#22c55e',
                        fillColor: riskProbe.riskTier === 'HIGH' ? '#ef4444' : riskProbe.riskTier === 'MEDIUM' ? '#f59e0b' : '#22c55e',
                        fillOpacity: 0.3,
                        weight: 2,
                        dashArray: '3 3'
                      }}
                    />
                    <Marker
                      position={[riskProbe.lat, riskProbe.lng]}
                      icon={createRiskProbeIcon(riskProbe.riskTier)}
                    >
                      <Popup>
                        <div className="p-2.5 min-w-[220px] text-xs font-sans">
                          <div className={`font-bold text-sm mb-1 ${
                            riskProbe.riskTier === 'HIGH' ? 'text-red-600' : riskProbe.riskTier === 'MEDIUM' ? 'text-amber-600' : 'text-emerald-600'
                          }`}>
                            {riskProbe.riskTier === 'HIGH' ? '🔴 HIGH RISK ZONE' : riskProbe.riskTier === 'MEDIUM' ? '🟡 MEDIUM RISK ZONE' : '🟢 SAFE GROUND ZONE'}
                          </div>
                          <div className="text-[11px] text-slate-600 mb-2">{riskProbe.label}</div>
                          <div className="bg-slate-50 border border-slate-200 rounded p-1.5 font-mono text-[11px] space-y-1 mb-2">
                            <div>Water Depth: <strong>{riskProbe.waterDepthM}m</strong></div>
                            <div>Ground DEM: <strong>{riskProbe.groundDemM}m</strong></div>
                            <div>Water DSM: <strong>{riskProbe.waterDsmM}m</strong></div>
                            <div>Flow Velocity: <strong>{riskProbe.flowVelocityMs} m/s</strong></div>
                          </div>
                          <div className="text-[10px] text-slate-500 font-semibold mb-2">
                            Nearest Safe: <strong>{riskProbe.nearestSafeZone.name} ({riskProbe.nearestSafeZone.distanceM}m)</strong>
                          </div>
                          <button
                            onClick={() => setRiskProbe(null)}
                            className="w-full py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded text-[10px]"
                          >
                            Remove Pin
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  </>
                )}

                {/* Drone Flood Footprint Polygon */}
                {showDepthLayer && (
                  <Polygon
                    positions={
                      selectedMissionId === 'drn-msn-nepal' || (mission.latitude && mission.latitude > 25)
                        ? [
                            [27.6820, 85.2910],
                            [27.6835, 85.2970],
                            [27.6880, 85.2980],
                            [27.6875, 85.2920],
                            [27.6820, 85.2910]
                          ]
                        : [
                            [21.8425, 89.5410],
                            [21.8435, 89.5475],
                            [21.8480, 89.5480],
                            [21.8475, 89.5420],
                            [21.8425, 89.5410]
                          ]
                    }
                    pathOptions={{
                      color: '#0284c7',
                      fillColor: '#0284c7',
                      fillOpacity: 0.35,
                      weight: 3,
                      dashArray: '4 4'
                    }}
                  >
                    <Popup>
                      <div className="p-2 text-xs">
                        <strong>Drone Flood Footprint</strong><br />
                        Coverage: {(mission.flood_footprint_sqm || 68400).toLocaleString()} m²<br />
                        Avg Water Depth: {mission.avg_water_depth_m || 1.2}m surge<br />
                        Elevation Subtraction Confidence: {mission.ai_confidence || 97.4}%
                      </div>
                    </Popup>
                  </Polygon>
                )}

                {/* District Village Risk Markers */}
                {showVillagesLayer && districtVillages.map((v) => (
                  <Marker
                    key={v.id}
                    position={[v.lat, v.lng]}
                    icon={createVillageIcon(v.tier, v.name, selectedVillageId === v.id)}
                    eventHandlers={{
                      click: () => {
                        setSelectedVillageId(v.id);
                        handleMapClick({ lat: v.lat, lng: v.lng });
                      }
                    }}
                  >
                    <Popup>
                      <div className="p-2.5 min-w-[220px] text-xs font-sans">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                            v.tier === 'HIGH' ? 'bg-red-100 text-red-700' : v.tier === 'MEDIUM' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {v.tier === 'HIGH' ? '🔴 HIGH RISK' : v.tier === 'MEDIUM' ? '🟡 MED RISK' : '🟢 SAFE HAVEN'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">{v.bearing}</span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 mb-1">{v.name}</h4>
                        <p className="text-[11px] text-slate-600 mb-2 leading-tight">{v.hazard_reason}</p>
                        <div className="bg-slate-50 border border-slate-200 rounded p-1.5 font-mono text-[10px] space-y-1 mb-2">
                          <div>Water Depth: <strong>{v.depth_m}m</strong></div>
                          {v.stranded > 0 ? (
                            <div className="text-red-600 font-bold">Stranded Population: {v.stranded} souls</div>
                          ) : (
                            <div>Affected Pop: {v.population > 0 ? v.population.toLocaleString() : 'N/A (Shelter Site)'}</div>
                          )}
                          <div>Status: <span className="font-semibold text-slate-700">{v.status}</span></div>
                        </div>
                        <button
                          onClick={() => {
                            handleMapClick({ lat: v.lat, lng: v.lng });
                            setSelectedVillageId(v.id);
                          }}
                          className="w-full py-1 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded text-[10px] transition"
                        >
                          Drop Probe & Trace Evacuation
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* Blocked Road Segment (Red/Orange dashed line) */}
                {showBlockedLayer && (
                  <Polyline
                    positions={blockedRoadPositions}
                    pathOptions={{ color: '#ea580c', weight: 6, dashArray: '6,6' }}
                  >
                    <Popup>
                      <div className="p-2 text-xs">
                        <strong className="text-orange-600">BLOCKED ROAD CUTOFF</strong><br />
                        Water Depth: {mission.max_water_depth_m || 1.85}m<br />
                        Reason: Submerged arterial underpass / culvert hazard.
                      </div>
                    </Popup>
                  </Polyline>
                )}

                {/* Dynamic Active Rescue Path OR Default Safe Route */}
                {activeRescueMission ? (
                  <>
                    {/* Base Marker */}
                    <Marker
                      position={activeRescueMission.originBase.pos}
                      icon={createDroneRescueBaseIcon(activeRescueMission.originBase.organization, activeRescueMission.originBase.name)}
                    >
                      <Popup>
                        <div className="p-2 text-xs font-sans">
                          <strong className="text-cyan-700 block mb-0.5">🚑 {activeRescueMission.originBase.name}</strong>
                          <div>Deploying Convoy to: <strong>{activeRescueMission.targetVillageName}</strong></div>
                        </div>
                      </Popup>
                    </Marker>

                    {/* Glowing Cyan Vector to THIS village */}
                    <Polyline
                      positions={activeRescueMission.geometry}
                      pathOptions={{ color: '#0891b2', weight: 9, opacity: 0.45 }}
                    />
                    <Polyline
                      positions={activeRescueMission.geometry}
                      pathOptions={{ color: '#06b6d4', weight: 5, opacity: 0.95 }}
                    >
                      <Popup>
                        <div className="p-2.5 text-xs font-sans">
                          <strong className="text-cyan-600 font-bold block mb-1">🚑 OPTIMAL RESCUE CONVOY ROUTE</strong>
                          <div>Target Village: <strong className="text-slate-900">{activeRescueMission.targetVillageName}</strong></div>
                          <div>Distance: <strong>{activeRescueMission.distanceKm} km</strong> &bull; ETA: <strong>~{activeRescueMission.durationMin} mins</strong></div>
                          <div className="text-emerald-600 font-semibold mt-1">✓ Safe Paved Corridor &bull; Flood Breaches Bypassed</div>
                        </div>
                      </Popup>
                    </Polyline>

                    {/* Impassable Direct Cutoff */}
                    {activeRescueMission.directHazardousGeometry && (
                      <Polyline
                        positions={activeRescueMission.directHazardousGeometry}
                        pathOptions={{ color: '#ef4444', weight: 3, dashArray: '6 6', opacity: 0.7 }}
                      />
                    )}
                  </>
                ) : (
                  <>
                    <Polyline
                      positions={safeRoutePositions}
                      pathOptions={{ color: '#047857', weight: 6, opacity: 0.5 }}
                    />
                    <Polyline
                      positions={safeRoutePositions}
                      pathOptions={{ color: '#10b981', weight: 4 }}
                    >
                      <Popup>
                        <div className="p-2 text-xs">
                          <strong className="text-emerald-600 font-bold">REAL ROAD EVACUATION ROUTE</strong><br />
                          Corridor: <strong>{realRoadSummary?.roadName || 'Mapped Paved Highway'}</strong><br />
                          Distance: {realRoadSummary?.distanceKm || '2.35'} km &bull; Drive Time: ~{realRoadSummary?.durationMin || '4'} mins
                        </div>
                      </Popup>
                    </Polyline>
                  </>
                )}

                {/* SAR Lawnmower Grid Flight Path */}
                {showFlightPlanLayer && flightPlan && (
                  <>
                    <Polyline
                      positions={flightPlan.waypoints.map((wp: any) => [wp.lat, wp.lng])}
                      pathOptions={{ color: '#818cf8', weight: 3, dashArray: '8,6' }}
                    />
                    {flightPlan.waypoints.map((wp: any) => (
                      <Marker
                        key={wp.waypoint_id}
                        position={[wp.lat, wp.lng]}
                        icon={createWaypointIcon(wp.waypoint_id)}
                      >
                        <Popup>
                          <div className="p-2 text-xs">
                            <strong className="text-indigo-600">{wp.waypoint_id}</strong><br />
                            Altitude: {wp.alt_m}m AGL<br />
                            Action: {wp.action}
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </>
                )}

                {/* Detections Markers */}
                {detections.map((det: any) => {
                  if (det.detection_type === 'SURVIVOR_CLUSTER' && showSurvivorLayer) {
                    const isSelected = selectedSurvivorId === det.id;
                    return (
                      <div key={det.id}>
                        {isSelected && (
                          <Circle
                            center={[det.latitude, det.longitude]}
                            radius={50}
                            pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.25, weight: 2, dashArray: '4 4' }}
                          />
                        )}
                        <Marker
                          position={[det.latitude, det.longitude]}
                          icon={createSurvivorIcon(det.headcount, isSelected)}
                          eventHandlers={{
                            click: () => handleSelectSurvivor(det),
                          }}
                        >
                          <Popup>
                            <div className="p-2.5 min-w-[230px] text-xs">
                              <div className="font-bold text-red-600 text-sm mb-1">{det.title}</div>
                              <p className="text-slate-600 mb-2 leading-relaxed">{det.description}</p>
                              <div className="bg-slate-50 border border-slate-200 rounded p-1.5 mb-2 font-mono text-[11px]">
                                <div>Headcount: <strong>{det.headcount} civilians</strong></div>
                                <div>Water Depth: <strong>{det.water_depth_m}m</strong></div>
                                <div>Confidence: <strong>{(det.confidence * 100).toFixed(1)}%</strong></div>
                              </div>
                              {det.is_rescued ? (
                                <div className="space-y-1.5">
                                  <div className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-1 rounded flex items-center justify-between">
                                    <span>✓ Dispatched: {det.assigned_team_id || 'RT-02'}</span>
                                    <span className="animate-pulse text-emerald-900">EN ROUTE</span>
                                  </div>
                                  <div className="flex gap-1.5">
                                    <button
                                      onClick={() => setTrackingSurvivor(det)}
                                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs flex items-center justify-center gap-1 shadow-sm"
                                    >
                                      <Radio className="w-3.5 h-3.5" /> Track Unit
                                    </button>
                                    <button
                                      onClick={(e) => handleResetSingleSurvivor(e, det.id)}
                                      className="px-2 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-bold text-xs"
                                      title="Reset status"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleDispatch(det.id, selectedTeamMap[det.id] || 'RT-02')}
                                  disabled={dispatchingId === det.id}
                                  className="w-full py-2 rounded font-bold text-xs bg-red-600 hover:bg-red-700 text-white shadow transition flex items-center justify-center gap-1.5"
                                >
                                  <Radio className="w-3.5 h-3.5" /> 🚨 Dispatch Unit RT-02 Now
                                </button>
                              )}
                            </div>
                          </Popup>
                        </Marker>
                      </div>
                    );
                  }

                  if (det.detection_type === 'BLOCKED_ROAD' && showBlockedLayer) {
                    return (
                      <Marker
                        key={det.id}
                        position={[det.latitude, det.longitude]}
                        icon={createHazardIcon('Culvert Cut')}
                      >
                        <Popup>
                          <div className="p-2 text-xs">
                            <strong className="text-orange-600">{det.title}</strong>
                            <p className="text-slate-600 mt-1">{det.description}</p>
                            <div className="mt-1 font-mono">Depth: {det.water_depth_m}m</div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  }

                  return null;
                })}

                {/* Tactical Risk Probe Pin (Interactive Drop / Search Target) */}
                {riskProbe && (
                  <Marker
                    position={[riskProbe.lat, riskProbe.lng]}
                    icon={createRiskProbeIcon(riskProbe.riskTier)}
                  >
                    <Popup>
                      <div className="p-2.5 text-xs min-w-[220px]">
                        <strong className={
                          riskProbe.riskTier === 'HIGH' 
                            ? 'text-red-600 font-bold' 
                            : riskProbe.riskTier === 'MEDIUM' 
                              ? 'text-amber-600 font-bold' 
                              : 'text-emerald-600 font-bold'
                        }>
                          {riskProbe.label}
                        </strong>
                        <div className="mt-1.5 font-mono text-[11px] bg-slate-50 p-1.5 rounded border border-slate-200">
                          <div>Water Depth: <strong>{riskProbe.waterDepthM}m</strong></div>
                          <div>Ground Elevation: <strong>{riskProbe.groundDemM}m</strong></div>
                          <div>Flow Current: <strong>{riskProbe.flowVelocityMs} m/s</strong></div>
                        </div>
                        <p className="mt-1.5 text-slate-600 text-[11px] leading-relaxed">
                          {riskProbe.recommendation}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>

            {/* Bottom HUD Ribbon */}
            <div className="p-2.5 bg-slate-950 border-t border-slate-800 grid grid-cols-3 gap-2 text-xs font-mono text-slate-300">
              <div>
                <span className="text-slate-500 block text-[9px]">SURFACE DATUM</span>
                <span className="font-bold text-white">3.80m Mean Water Table</span>
              </div>
              <div className="text-center">
                <span className="text-slate-500 block text-[9px]">PHOTOGRAMMETRY STITCH</span>
                <span className="font-bold text-emerald-400">WebODM Orthophoto 100% Valid</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block text-[9px]">RADIAL RESOLUTION</span>
                <span className="font-bold text-sky-400">2.4 cm/pixel</span>
              </div>
            </div>
          </div>

          {/* Tactical Point Risk Inspector Panel (Interactive Click / Pin Placement) */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-rose-600" />
                  Tactical Point Risk Inspector (High / Medium / Safe Zone Analysis)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click anywhere on the map above or use quick test buttons to drop a pin and inspect flood risk.
                </p>
              </div>

              {/* Quick Preset Test Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => handleQuickProbePreset('HIGH')}
                  className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-[11px] font-bold rounded-lg transition border border-red-200 flex items-center gap-1"
                >
                  <AlertOctagon className="w-3 h-3 text-red-600" />
                  Probe High Risk
                </button>
                <button
                  onClick={() => handleQuickProbePreset('MEDIUM')}
                  className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 text-[11px] font-bold rounded-lg transition border border-amber-200 flex items-center gap-1"
                >
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  Probe Med Risk
                </button>
                <button
                  onClick={() => handleQuickProbePreset('SAFE')}
                  className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-bold rounded-lg transition border border-emerald-200 flex items-center gap-1"
                >
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Probe Safe Zone
                </button>
                {riskProbe && (
                  <button
                    onClick={() => setRiskProbe(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                    title="Clear Pin"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* If Risk Probe Active */}
            {riskProbe ? (
              <div className="space-y-3 animate-in fade-in duration-200">
                {/* Risk Level Banner */}
                <div className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                  riskProbe.riskTier === 'HIGH'
                    ? 'bg-red-50 border-red-200 text-red-900'
                    : riskProbe.riskTier === 'MEDIUM'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}>
                  <div className="flex items-start sm:items-center gap-2.5">
                    <span className={`p-2 rounded-lg text-white flex-shrink-0 ${
                      riskProbe.riskTier === 'HIGH' ? 'bg-red-600' : riskProbe.riskTier === 'MEDIUM' ? 'bg-amber-600' : 'bg-emerald-600'
                    }`}>
                      {riskProbe.riskTier === 'HIGH' ? <AlertOctagon className="w-5 h-5" /> : riskProbe.riskTier === 'MEDIUM' ? <AlertTriangle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                    </span>
                    <div>
                      <div className="text-xs font-bold tracking-wide">
                        {riskProbe.riskTier === 'HIGH' ? '🔴 HIGH RISK LEVEL: SEVERE FLOOD HAZARD' : riskProbe.riskTier === 'MEDIUM' ? '🟡 MEDIUM RISK LEVEL: CAUTIONARY FLOODWAY' : '🟢 ZERO RISK: DESIGNATED SAFE HIGH GROUND'}
                      </div>
                      <div className="text-[11px] opacity-80 mt-0.5">{riskProbe.label}</div>
                    </div>
                  </div>

                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-white/80 border border-current self-start sm:self-auto">
                    GPS: {riskProbe.lat}, {riskProbe.lng}
                  </span>
                </div>

                {/* 4 Telemetry Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] text-slate-500 uppercase block font-sans">WATER DEPTH</span>
                    <strong className={`text-base ${riskProbe.waterDepthM >= 1.5 ? 'text-red-600' : riskProbe.waterDepthM > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {riskProbe.waterDepthM.toFixed(2)}m
                    </strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] text-slate-500 uppercase block font-sans">GROUND DEM</span>
                    <strong className="text-base text-slate-800">{riskProbe.groundDemM.toFixed(1)}m</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] text-slate-500 uppercase block font-sans">WATER SURFACE DSM</span>
                    <strong className="text-base text-blue-700">{riskProbe.waterDsmM.toFixed(1)}m</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] text-slate-500 uppercase block font-sans">FLOW VELOCITY</span>
                    <strong className={`text-base ${riskProbe.flowVelocityMs > 1.5 ? 'text-red-600' : 'text-slate-800'}`}>
                      {riskProbe.flowVelocityMs} m/s
                    </strong>
                  </div>
                </div>

                {/* Evacuation & Vehicle Passability Checklist */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    VEHICLE & EVACUATION PASSABILITY CLEARANCE
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 ${
                      riskProbe.passability.foot ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-red-100 text-red-800 border border-red-200'
                    }`}>
                      {riskProbe.passability.foot ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-red-600" />}
                      🚶 Pedestrian / Foot
                    </span>
                    <span className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 ${
                      riskProbe.passability.ambulance ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-red-100 text-red-800 border border-red-200'
                    }`}>
                      {riskProbe.passability.ambulance ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-red-600" />}
                      🚑 Civilian Ambulances
                    </span>
                    <span className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 ${
                      riskProbe.passability.truck ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-red-100 text-red-800 border border-red-200'
                    }`}>
                      {riskProbe.passability.truck ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-red-600" />}
                      🚜 4x4 Heavy Tactical Trucks
                    </span>
                    <span className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 ${
                      riskProbe.passability.boat ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-200 text-slate-600 border border-slate-300'
                    }`}>
                      {riskProbe.passability.boat ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-slate-400" />}
                      🚤 Inflatable Rafts / Boats
                    </span>
                    <span className="px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      🚁 Helicopter LZ / Winch
                    </span>
                  </div>
                </div>

                {/* Operational Recommendation & Nearest Safe Haven */}
                <div className="flex flex-col sm:flex-row items-stretch gap-2.5 text-xs">
                  <div className="flex-1 p-3 bg-blue-50/60 border border-blue-200 rounded-xl">
                    <span className="text-[10px] font-bold text-blue-800 uppercase block mb-1">CLOSEST HIGH-GROUND SAFE HAVEN</span>
                    <div className="font-semibold text-slate-900">{riskProbe.nearestSafeZone.name}</div>
                    <div className="text-[11px] text-blue-700 mt-0.5">
                      Distance: <strong>{riskProbe.nearestSafeZone.distanceM}m</strong> &bull; Heading: <strong>{riskProbe.nearestSafeZone.bearing}</strong>
                    </div>
                  </div>

                  <div className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-600 uppercase block mb-1">FIELD ACTION RECOMMENDATION</span>
                    <p className="text-[11px] text-slate-700 leading-relaxed">
                      {riskProbe.recommendation}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Idle Prompt state */
              <div 
                onClick={() => handleQuickProbePreset('HIGH')}
                className="p-4 border-2 border-dashed border-slate-200 hover:border-sky-400 rounded-xl text-center bg-slate-50/60 cursor-pointer transition"
              >
                <Crosshair className="w-6 h-6 text-slate-400 mx-auto mb-1 animate-pulse" />
                <div className="text-xs font-bold text-slate-700">Click anywhere on the map above to drop a Risk Assessment Probe</div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Calculates exact ground elevation, flood water depth, risk classification (High 🔴, Medium 🟡, Safe 🟢), and vehicle passability.
                </p>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* DISTRICT VILLAGE RISK MATRIX & LOCALITY TRIAGE (DOWN SECTION)             */}
          {/* ========================================================================= */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-rose-600 text-white font-mono font-bold text-[10px] rounded tracking-wide uppercase">
                    DISTRICT RISK DIRECTORY
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-sky-600" />
                    {searchedLocation ? searchedLocation.name : (selectedMissionId === 'drn-msn-nepal' ? 'Bagmati Province / Kathmandu' : 'Trishuli Sector A Delta')} — Village Hazard Breakdown
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Detailed breakdown of all villages and habitations in this district: shows where flood risk is present, specific hazards, water depth, and safe havens.
                </p>
              </div>

              {/* Filter Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setVillageFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    villageFilter === 'ALL'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  All Localities ({districtVillages.length})
                </button>
                <button
                  onClick={() => setVillageFilter('HIGH')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    villageFilter === 'HIGH'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  High Risk ({districtVillages.filter(v => v.tier === 'HIGH').length})
                </button>
                <button
                  onClick={() => setVillageFilter('MEDIUM')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    villageFilter === 'MEDIUM'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Medium Risk ({districtVillages.filter(v => v.tier === 'MEDIUM').length})
                </button>
                <button
                  onClick={() => setVillageFilter('SAFE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    villageFilter === 'SAFE'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Safe Havens ({districtVillages.filter(v => v.tier === 'SAFE').length})
                </button>
              </div>
            </div>

            {/* Village Cards Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {districtVillages
                .filter(v => villageFilter === 'ALL' || v.tier === villageFilter)
                .map((v) => {
                  const isSelected = selectedVillageId === v.id;
                  return (
                    <div
                      key={v.id}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                        isSelected 
                          ? 'bg-sky-50/70 border-sky-400 ring-2 ring-sky-300 shadow-md' 
                          : v.tier === 'HIGH'
                          ? 'bg-white border-red-200 hover:border-red-400 hover:shadow-sm'
                          : v.tier === 'MEDIUM'
                          ? 'bg-white border-amber-200 hover:border-amber-400 hover:shadow-sm'
                          : 'bg-white border-emerald-200 hover:border-emerald-400 hover:shadow-sm'
                      }`}
                    >
                      <div>
                        {/* Card Header */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                              <MapPin className={`w-3.5 h-3.5 ${
                                v.tier === 'HIGH' ? 'text-red-600' : v.tier === 'MEDIUM' ? 'text-amber-600' : 'text-emerald-600'
                              }`} />
                              {v.name}
                            </h4>
                            <span className="text-[10px] text-slate-500 font-mono">{v.bearing}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1 ${
                            v.tier === 'HIGH'
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : v.tier === 'MEDIUM'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {v.tier === 'HIGH' ? '🔴 HIGH RISK' : v.tier === 'MEDIUM' ? '🟡 MED RISK' : '🟢 SAFE HAVEN'}
                          </span>
                        </div>

                        {/* Exact Location & Hazard Description */}
                        <div className={`p-2.5 rounded-lg text-xs leading-relaxed mb-3 ${
                          v.tier === 'HIGH'
                            ? 'bg-red-50/90 text-red-900 border border-red-100'
                            : v.tier === 'MEDIUM'
                            ? 'bg-amber-50/90 text-amber-900 border border-amber-100'
                            : 'bg-emerald-50/90 text-emerald-900 border border-emerald-100'
                        }`}>
                          <strong className="block text-[10px] uppercase tracking-wider mb-0.5 font-bold opacity-90">
                            {v.tier === 'HIGH' ? '⚠️ Severe Inundation Cause' : v.tier === 'MEDIUM' ? '⚡ Flood Threat Cause' : '🛡️ Safe Relief Site'}
                          </strong>
                          {v.hazard_reason}
                        </div>

                        {/* Stat Metrics Grid */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] mb-3">
                          <div className="bg-slate-50 border border-slate-100 rounded-lg p-2">
                            <span className="text-[9px] text-slate-500 uppercase font-bold block">Water Depth</span>
                            <span className={`font-mono font-bold text-xs ${v.depth_m > 1.0 ? 'text-red-600' : v.depth_m > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {v.depth_m > 0 ? `${v.depth_m} meters` : '0.0m (Dry Ground)'}
                            </span>
                          </div>
                          <div className="bg-slate-50 border border-slate-100 rounded-lg p-2">
                            <span className="text-[9px] text-slate-500 uppercase font-bold block">
                              {v.stranded > 0 ? 'Stranded Count' : 'Population Status'}
                            </span>
                            <span className={`font-mono font-bold text-xs ${v.stranded > 0 ? 'text-red-600 animate-pulse' : 'text-slate-800'}`}>
                              {v.stranded > 0 ? `${v.stranded} souls` : v.population > 0 ? `${v.population.toLocaleString()} residents` : 'Civilian Haven'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-slate-500 font-medium truncate">
                          Status: <strong className="text-slate-700">{v.status}</strong>
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={async () => {
                            const base = getRegionalStagingBases(
                              searchedLocation ? searchedLocation.name : (selectedMissionId === 'drn-msn-nepal' ? 'Nuwakot' : 'Trishuli Sector A'),
                              baseLat,
                              baseLng
                            )[0];
                            const res = await calculateOptimalRescuePath({
                              base,
                              targetName: v.name,
                              targetPos: [v.lat, v.lng],
                              targetDepthM: v.depth_m,
                              targetStranded: v.stranded || 28,
                              avoidInundation: true
                            });
                            setActiveRescueMission(res);
                            setFlyTarget([v.lat, v.lng]);
                            window.scrollTo({ top: 140, behavior: 'smooth' });
                          }}
                          className="px-2.5 py-1 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 shadow-xs"
                        >
                          <Truck className="w-3 h-3" />
                          Rescue Path
                        </button>
                        <button
                          onClick={() => {
                            setSelectedVillageId(v.id);
                            setFlyTarget([v.lat, v.lng]);
                            handleMapClick({ lat: v.lat, lng: v.lng });
                          }}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-sky-600 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0"
                        >
                          <Crosshair className="w-3 h-3" />
                          Inspect & Fly
                        </button>
                      </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Elevation Subtraction (DSM - DEM) Transect Cross-Section */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Mountain className="w-4 h-4 text-blue-600" />
                  Elevation Subtraction Transect Profile (DSM Water Minus DEM Ground)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Calculates real flood surge depth across 8 ground sampling stations
                </p>
              </div>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold rounded">
                NET SURGE: +{elevation.net_surge_depth_m || 1.20}m
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 pt-2">
              {(elevation.transect_points || []).map((pt: any, idx: number) => {
                const isMax = pt.water_depth_m >= 1.8;
                const isDry = pt.water_depth_m === 0;
                return (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-lg border text-center transition ${
                      isMax
                        ? 'bg-red-50 border-red-300 ring-1 ring-red-400'
                        : isDry
                        ? 'bg-emerald-50 border-emerald-300'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="text-[10px] font-bold text-slate-600 truncate">{pt.station.split(' ')[0]}</div>
                    <div className={`text-base font-bold font-mono my-1 ${
                      isMax ? 'text-red-700' : isDry ? 'text-emerald-700' : 'text-blue-700'
                    }`}>
                      {pt.water_depth_m.toFixed(2)}m
                    </div>
                    <div className="text-[9px] font-mono text-slate-400 truncate">
                      G:{pt.ground_dem_m}m | W:{pt.water_dsm_m}m
                    </div>
                    <div className={`text-[9px] font-bold uppercase mt-1 px-1 rounded truncate ${
                      isMax ? 'bg-red-200 text-red-800' : isDry ? 'bg-emerald-200 text-emerald-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {pt.status.replace('_', ' ')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Stranded Survivors Queue & Evacuation Routes (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Stranded Survivors Priority Queue */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-red-600" />
                Drone-Detected Survivor Clusters ({detections.filter((d: any) => d.detection_type === 'SURVIVOR_CLUSTER').length})
              </h3>
              <span className="px-2 py-0.5 bg-red-100 text-red-800 text-[10px] font-bold rounded animate-pulse">
                LIFE THREAT
              </span>
            </div>

            <div className="space-y-3">
              {detections.filter((d: any) => d.detection_type === 'SURVIVOR_CLUSTER').length === 0 ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1">
                  <ShieldCheck className="w-6 h-6 text-emerald-600 mx-auto" />
                  <div className="text-xs font-bold text-emerald-900">Zero Stranded Survivor Clusters</div>
                  <div className="text-[11px] text-emerald-700">Elevated dry terrain ({activePlaceTitle}) &bull; All civilian areas unaffected by flood surge.</div>
                </div>
              ) : (
                detections
                  .filter((d: any) => d.detection_type === 'SURVIVOR_CLUSTER')
                  .map((survivor: any) => {
                  const isSelected = selectedSurvivorId === survivor.id;
                  const currentTeam = selectedTeamMap[survivor.id] || survivor.assigned_team_id || 'RT-02';

                  return (
                    <div
                      key={survivor.id}
                      onClick={() => handleSelectSurvivor(survivor)}
                      className={`border rounded-xl p-3.5 transition cursor-pointer relative ${
                        isSelected 
                          ? 'border-red-500 bg-red-50 shadow-md ring-2 ring-red-400/50' 
                          : 'border-red-200 bg-red-50/40 hover:bg-red-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5 truncate max-w-[210px]">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${survivor.is_rescued ? 'bg-emerald-500' : 'bg-red-600 animate-ping'}`} />
                          <span className="font-bold text-red-950 text-xs truncate">
                            {survivor.title}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 bg-red-600 text-white font-mono font-bold text-[10px] rounded-full flex-shrink-0">
                          {survivor.headcount} SOULS
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 leading-relaxed mb-2.5">
                        {survivor.description}
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-white p-2 rounded-lg border border-red-100 mb-3">
                        <div>
                          <span className="text-slate-400 block">WATER DEPTH</span>
                          <strong className="text-blue-700">{survivor.water_depth_m}m</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">HEURISTIC CONFIDENCE</span>
                          <strong className="text-emerald-700">{(survivor.confidence * 100).toFixed(1)}%</strong>
                        </div>
                      </div>

                      {/* Dispatched vs Ready for Dispatch State */}
                      {survivor.is_rescued ? (
                        <div className="space-y-2 pt-1" onClick={(e) => e.stopPropagation()}>
                          <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] flex items-center justify-between text-emerald-800">
                            <span className="flex items-center gap-1.5 font-bold">
                              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                              Unit Dispatched ({survivor.assigned_team_id || 'RT-02'})
                            </span>
                            <span className="text-[10px] font-mono bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-bold animate-pulse">
                              EN ROUTE • ETA 8m
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setTrackingSurvivor(survivor)}
                              className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-sm transition flex items-center justify-center gap-1"
                            >
                              <Radio className="w-3.5 h-3.5" />
                              Live Track Unit
                            </button>
                            <button
                              onClick={() => navigate('/command/rescue')}
                              className="py-1.5 px-2.5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-lg text-xs border border-slate-300 transition flex items-center gap-1 shadow-sm"
                              title="Open Rescue Operations Page"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                              SAR Matrix
                            </button>
                            <button
                              onClick={(e) => handleResetSingleSurvivor(e, survivor.id)}
                              className="py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg text-xs border border-slate-300 transition shadow-sm"
                              title="Reset dispatch status to test again"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 pt-1" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            <select
                              value={selectedTeamMap[survivor.id] || 'RT-02'}
                              onChange={(e) => setSelectedTeamMap(prev => ({ ...prev, [survivor.id]: e.target.value }))}
                              className="flex-1 bg-white border border-slate-300 text-slate-800 text-[11px] font-semibold rounded-lg px-2 py-1.5 outline-none focus:border-red-500"
                            >
                              <option value="RT-02">RT-02: APF Inflatable Rafts (Water SAR)</option>
                              <option value="RT-01">RT-01: Nepal Army Helicopter (Winch)</option>
                              <option value="RT-03">RT-03: Red Cross Swiftwater Unit</option>
                            </select>
                          </div>

                          <button
                            onClick={() => handleDispatch(survivor.id, selectedTeamMap[survivor.id] || 'RT-02')}
                            disabled={dispatchingId === survivor.id}
                            className="w-full py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs shadow-sm transition flex items-center justify-center gap-1.5"
                          >
                            <Radio className={`w-3.5 h-3.5 ${dispatchingId === survivor.id ? 'animate-spin' : ''}`} />
                            {dispatchingId === survivor.id ? 'Dispatching Field Unit...' : `🚨 Dispatch Unit ${selectedTeamMap[survivor.id] || 'RT-02'} Now`}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }))}
            </div>
          </div>

          {/* Blocked vs. Passable Evacuation Routes Matrix */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-sky-600" />
                UAV Evaluated Evacuation Routes ({routes.length})
              </h3>
            </div>

            <div className="space-y-2.5">
              {routes.map((rte: any) => {
                const isBlocked = rte.passability === 'IMPASSABLE_BLOCKED';
                const isBoat = rte.passability === 'PASSABLE_BOAT_AMPHIBIOUS';
                return (
                  <div
                    key={rte.route_id}
                    className={`p-3 rounded-lg border text-xs transition ${
                      isBlocked
                        ? 'border-red-200 bg-red-50/50'
                        : isBoat
                        ? 'border-sky-200 bg-sky-50/50'
                        : 'border-emerald-200 bg-emerald-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 truncate">{rte.name}</span>
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded ${
                        isBlocked
                          ? 'bg-red-200 text-red-900'
                          : isBoat
                          ? 'bg-sky-200 text-sky-900'
                          : 'bg-emerald-200 text-emerald-900'
                      }`}>
                        {isBlocked ? 'BLOCKED' : isBoat ? 'BOAT ONLY' : 'OPEN'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 mb-1">{rte.obstruction}</div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>Water Depth: <strong>{rte.water_depth_m}m</strong></span>
                      <span className="font-semibold text-slate-700">{rte.recommended_for.split('/')[0]}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. INTERACTIVE "HOW IT WORKS" PIPELINE ARCHITECTURE GUIDE MODAL */}
      {/* ========================================================================= */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl text-white">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-400 flex items-center justify-center text-sky-400">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Drone Photogrammetry & Deep Learning Architecture</h2>
                  <p className="text-xs text-slate-400">How SentinelAid transforms raw drone flights into sub-meter flood intelligence</p>
                </div>
              </div>
              <button 
                onClick={() => setShowGuideModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Visual Pipeline Flowchart */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs">
                <div className="text-sky-400 font-bold mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> COMPLETE END-TO-END PIPELINE FLOW
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <div className="text-slate-400 text-[10px]">STEP 01</div>
                    <div className="font-bold text-sky-300 mt-1">Drone UAV Flight</div>
                    <div className="text-[11px] text-slate-400 mt-1">RGB + NIR dual cameras capture 65m AGL with 80% front overlap</div>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <div className="text-slate-400 text-[10px]">STEP 02</div>
                    <div className="font-bold text-emerald-300 mt-1">WebODM Stitching</div>
                    <div className="text-[11px] text-slate-400 mt-1">Structure-from-Motion generates 2.4cm orthomosaic & 3D DSM</div>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <div className="text-slate-400 text-[10px]">STEP 03</div>
                    <div className="font-bold text-purple-300 mt-1">Deep Learning & Math</div>
                    <div className="text-[11px] text-slate-400 mt-1">YOLOv8-Seg pixel classification + (DSM - DEM) depth calculation</div>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <div className="text-slate-400 text-[10px]">STEP 04</div>
                    <div className="font-bold text-red-300 mt-1">Tactical Action</div>
                    <div className="text-[11px] text-slate-400 mt-1">Immediate survivor rescue dispatch & ambulance route clearances</div>
                  </div>
                </div>
              </div>

              {/* Elevation Subtraction Formula Explained */}
              <div className="p-4 bg-blue-950/40 rounded-xl border border-blue-900/60">
                <h3 className="font-bold text-blue-300 text-sm flex items-center gap-2 mb-2">
                  <Mountain className="w-4 h-4 text-blue-400" />
                  The Science: How Water Depth is Measured (Elevation Subtraction)
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  Satellites can only detect <em>where</em> water is. Drones with photogrammetry or LiDAR can measure <em>how deep</em> the water is by subtracting baseline terrain height:
                </p>
                <div className="bg-slate-950 p-3 rounded-lg font-mono text-xs text-center border border-blue-800/80 text-blue-200">
                  <strong className="text-emerald-400">Net Flood Surge Depth</strong> = <strong className="text-sky-300">DSM (Water Surface Datum)</strong> &minus; <strong className="text-orange-300">DEM (Pre-Disaster Ground Level)</strong>
                </div>
                <div className="text-[11px] text-slate-400 mt-2">
                  Example in Trishuli Sector A: The drone measures water surface at <strong>3.80m</strong> above sea level. The pre-flood baseline ground DEM was at <strong>2.60m</strong>.
                  The resulting surge depth is <strong>3.80m &minus; 2.60m = 1.20m</strong>.
                </div>
              </div>

              {/* The 4 Outputs Table */}
              <div>
                <h3 className="font-bold text-slate-200 text-sm mb-3">The 4 Mission-Critical Outputs Delivered:</h3>
                <div className="space-y-2.5">
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400"><Droplets className="w-4 h-4" /></div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">1. Exact Flood Footprint</h4>
                      <p className="text-[11px] text-slate-400">Centimeter-accurate vector polygons showing the precise water edge, capturing flooded streets, schoolyards, and yards that satellites miss.</p>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400"><Mountain className="w-4 h-4" /></div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">2. Water Depth Grids</h4>
                      <p className="text-[11px] text-slate-400">Real-time depth measurements at every pixel. Determines if roads are passable by foot (&lt;0.15m), high-clearance truck (&lt;0.5m), or boat-only (&gt;0.8m).</p>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400"><AlertTriangle className="w-4 h-4" /></div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">3. Blocked Evacuation Routes</h4>
                      <p className="text-[11px] text-slate-400">Automated spatial intersection between roads and high flood depths. Identifies submerged culverts, washed-out asphalt, and reroutes ambulances.</p>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-red-500/10 text-red-400"><Users className="w-4 h-4" /></div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">4. Stranded Survivor Locations</h4>
                      <p className="text-[11px] text-slate-400">Computer vision detects groups of people waving or stranded on rooftops. One click dispatches rescue team units (e.g. Unit RT-02) directly to their GPS coordinates.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
              <button
                onClick={() => setShowGuideModal(false)}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition"
              >
                Got It, Return to Drone Console
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. LIVE DRONE AERIAL CAMERA HUD STREAM MODAL */}
      {/* ========================================================================= */}
      {showLiveStreamModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl text-white">
            {/* UNMISSABLE SIMULATION PREVIEW WARNING BANNER */}
            <div className="bg-amber-500 border-b-2 border-amber-700 px-4 py-2 flex items-center justify-between text-slate-950 font-sans shadow-md">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-slate-950 flex-shrink-0" />
                <span className="font-mono font-black text-xs uppercase tracking-wider">
                  SIMULATION PREVIEW — No Live Drone Connected
                </span>
                <span className="text-[11px] font-extrabold text-slate-900 hidden sm:inline">
                  • Synthetic Training Drill HUD. Hardware RTSP pipeline is disconnected.
                </span>
              </div>
              <span className="text-[10px] font-mono font-black bg-black text-amber-300 px-2 py-0.5 rounded tracking-widest uppercase">
                HARDWARE OFFLINE
              </span>
            </div>

            {/* Top Modal Bar */}
            <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">SIMULATION PREVIEW HUD &bull; UAV-EAGLE-01</span>
                <span className="text-[10px] font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 font-bold uppercase tracking-wider">[SYNTHETIC DRILL HUD]</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-slate-800 p-1 rounded-lg flex items-center text-xs">
                  <button 
                    onClick={() => setStreamMode('RGB')}
                    className={`px-3 py-1 rounded font-bold transition ${streamMode === 'RGB' ? 'bg-sky-600 text-white' : 'text-slate-400'}`}
                  >
                    RGB Optical
                  </button>
                  <button 
                    onClick={() => setStreamMode('THERMAL')}
                    className={`px-3 py-1 rounded font-bold transition ${streamMode === 'THERMAL' ? 'bg-amber-600 text-white' : 'text-slate-400'}`}
                  >
                    FLIR Thermal IR
                  </button>
                </div>
                <button
                  onClick={() => setAiBoundingBoxes(!aiBoundingBoxes)}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition border ${
                    aiBoundingBoxes ? 'bg-emerald-950 border-emerald-600 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  Simulation Bounding: {aiBoundingBoxes ? 'ON' : 'OFF'}
                </button>
                <button 
                  onClick={() => setShowLiveStreamModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Video Canvas Simulated Viewport */}
            <div className={`relative h-[500px] w-full overflow-hidden flex items-center justify-center transition-colors duration-500 ${
              streamMode === 'RGB' ? 'bg-gradient-to-b from-sky-900 via-slate-800 to-slate-950' : 'bg-gradient-to-b from-purple-950 via-slate-900 to-black'
            }`}>
              {/* Background Simulated Landscape Gradients */}
              <div className="absolute inset-0 opacity-40">
                <div className="absolute top-1/4 left-1/4 w-96 h-48 rounded-full bg-blue-500/30 blur-3xl"></div>
                <div className="absolute bottom-10 right-1/4 w-80 h-40 rounded-full bg-cyan-600/30 blur-2xl"></div>
              </div>

              {/* HUD Crosshairs Overlay */}
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 font-mono text-xs text-emerald-400/90">
                {/* Top Telemetry */}
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-[9px] font-black text-amber-400 tracking-widest uppercase mb-1 bg-black/60 px-1 py-0.5 rounded inline-block">
                      SYNTHETIC DRILL TELEMETRY
                    </div>
                    <div>ALT: <strong className="text-white">{selectedMissionId === 'drn-msn-nepal' ? '70.0m AGL' : '64.8m AGL'}</strong></div>
                    <div>SPD: <strong className="text-white">28.4 km/h</strong></div>
                    <div>GIMBAL PITCH: <strong className="text-white">-60.0°</strong></div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] tracking-widest text-emerald-500">
                      {selectedMissionId === 'drn-msn-nepal' ? 'BAGMATI BASIN • HEADING 045° NE' : 'TRISHULI RIVERBASIN CORRIDOR • HEADING 082° ENE'}
                    </div>
                    <div className="w-36 h-1 bg-emerald-500/40 mx-auto mt-1 rounded"></div>
                  </div>
                  <div className="text-right">
                    <div>GPS: <strong className="text-white">{selectedMissionId === 'drn-msn-nepal' ? '27.6850° N, 85.2950° E' : '21.8458° N, 89.5442° E'}</strong></div>
                    <div>RTK FIX: <strong className="text-emerald-400">±1.8cm [FIXED]</strong></div>
                    <div>BATTERY: <strong className="text-white">84% (32m REMAINING)</strong></div>
                  </div>
                </div>

                {/* Center Reticle */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-emerald-500/30 rounded-full flex items-center justify-center pointer-events-none">
                  <div className="w-6 h-0.5 bg-emerald-400"></div>
                  <div className="h-6 w-0.5 bg-emerald-400 absolute"></div>
                  <div className="absolute -top-6 text-[10px] text-emerald-300 font-bold">SIMULATED TARGET LOCK</div>
                </div>

                {/* Simulated AI Object Bounding Boxes */}
                {aiBoundingBoxes && (
                  <>
                    {/* Bounding Box 1: Rooftop Survivors */}
                    <div className="absolute top-[32%] left-[45%] border-2 border-red-500 bg-red-500/10 p-1 rounded font-mono text-[10px] text-white">
                      <div className="bg-red-600 text-white px-1 font-bold inline-block">
                        {selectedMissionId === 'drn-msn-nepal' ? 'DRILL PRESET: SURVIVORS (42 SOULS)' : 'DRILL PRESET: SURVIVORS (35 SOULS)'}
                      </div>
                      <div className="text-red-200 mt-1">
                        {selectedMissionId === 'drn-msn-nepal' ? 'BALKHU VEGETABLE MARKET ROOF' : 'COASTAL PRIMARY SCHOOL ROOF'}
                      </div>
                    </div>

                    {/* Bounding Box 2: Submerged Culvert */}
                    <div className="absolute bottom-[28%] left-[22%] border-2 border-amber-500 bg-amber-500/10 p-1 rounded font-mono text-[10px] text-white">
                      <div className="bg-amber-600 text-white px-1 font-bold inline-block">
                        {selectedMissionId === 'drn-msn-nepal' ? 'DRILL PRESET: ROAD CUTOFF (2.20m)' : 'DRILL PRESET: ROAD CUTOFF (1.85m)'}
                      </div>
                      <div className="text-amber-200 mt-1">
                        {selectedMissionId === 'drn-msn-nepal' ? 'BALKHU RING ROAD UNDERPASS' : 'PASANG LHAMU HWY (NH-04) CULVERT'}
                      </div>
                    </div>

                    {/* Bounding Box 3: Safe Landing Zone */}
                    <div className="absolute top-[25%] right-[22%] border-2 border-emerald-500 bg-emerald-500/10 p-1 rounded font-mono text-[10px] text-white">
                      <div className="bg-emerald-600 text-white px-1 font-bold inline-block">
                        DRILL PRESET: DROP ZONE
                      </div>
                      <div className="text-emerald-200 mt-1">
                        {selectedMissionId === 'drn-msn-nepal' ? 'NORTH LEVEE SLIPWAY (ELEV: 1298m)' : 'DRY LEVEE PASS (ELEV: 4.8m)'}
                      </div>
                    </div>
                  </>
                )}

                {/* Bottom Status */}
                <div className="flex justify-between items-end text-[11px]">
                  <div>
                    FEED: <strong className="text-amber-300">SYNTHETIC PREVIEW (No Hardware Connected)</strong> &bull; TELEMETRY: <strong className="text-slate-400">DRILL SIMULATION</strong>
                  </div>
                  <div className="text-right">
                    CAMERA: <strong className="text-white">SONY FULL-FRAME 45MP SENSOR</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3 text-slate-400">
                <span className="flex items-center gap-1 text-amber-400"><Wifi className="w-3.5 h-3.5 text-amber-400" /> Hardware Link: Disconnected (Drill Sim)</span>
                <span className="flex items-center gap-1"><BatteryCharging className="w-3.5 h-3.5 text-emerald-400" /> 84% Battery</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const firstDet = detections.find((d: any) => d.detection_type === 'SURVIVOR_CLUSTER');
                    if (firstDet) handleDispatch(firstDet.id, 'RT-02');
                    setShowLiveStreamModal(false);
                  }}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition flex items-center gap-1.5"
                >
                  <Radio className="w-3.5 h-3.5" /> Quick Dispatch RT-02 to Locked Crosshairs
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SAR LAWNMOWER GRID FLIGHT PLANNER MODAL */}
      {/* ========================================================================= */}
      {showFlightPlanModal && flightPlan && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl text-white">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400 flex items-center justify-center text-indigo-400">
                  <Plane className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold">Automated Search-and-Rescue Grid Flight Plan</h2>
                  <p className="text-xs text-slate-400">Double-grid lawnmower pattern for photogrammetry reconstruction</p>
                </div>
              </div>
              <button 
                onClick={() => setShowFlightPlanModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Flight Metrics Summary */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">FLIGHT DISTANCE</div>
                  <div className="text-xl font-bold font-mono text-indigo-400 mt-0.5">{flightPlan.total_distance_km} km</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">EST. FLIGHT TIME</div>
                  <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">{flightPlan.estimated_flight_time_min} mins</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">BATTERY DRAW</div>
                  <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">{flightPlan.battery_consumption_est_pct}%</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">IMAGE OVERLAP</div>
                  <div className="text-xl font-bold font-mono text-sky-400 mt-0.5">{flightPlan.overlap_forward_pct}% / {flightPlan.overlap_side_pct}%</div>
                </div>
              </div>

              {/* Waypoints Sequence */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 mb-2">Calculated Waypoints Sequence ({flightPlan.waypoints?.length} Waypoints)</h4>
                <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-800 rounded-xl p-2 bg-slate-950 font-mono text-[11px]">
                  {flightPlan.waypoints?.map((wp: any) => (
                    <div key={wp.waypoint_id} className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800/80">
                      <span className="font-bold text-indigo-300">{wp.waypoint_id}</span>
                      <span className="text-slate-400">Lat: {wp.lat.toFixed(5)}, Lng: {wp.lng.toFixed(5)}</span>
                      <span className="text-emerald-400">{wp.alt_m}m AGL</span>
                      <span className="text-slate-300">{wp.action}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-xs text-slate-400 bg-indigo-950/30 p-3 rounded-xl border border-indigo-900/50">
                💡 <strong>Notice:</strong> The computed flight path has been plotted as an overlay on the Tactical Drone Recon map. The drone will execute an automated photogrammetry pass with 80% overlap to enable WebODM orthomosaic stitching.
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-between items-center">
              <span className="text-xs text-slate-400">Target Altitude: {flightPlan.flight_altitude_m}m AGL</span>
              <button
                onClick={() => setShowFlightPlanModal(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition"
              >
                Close & View Grid on Map
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. UPLOAD / INGEST DRONE AERIAL SURVEY IMAGERY MODAL */}
      {/* ========================================================================= */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl text-white">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-400 flex items-center justify-center text-sky-400">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold">Ingest Tactical Drone Imagery</h2>
                  <p className="text-xs text-slate-400">Upload geotagged flight photos for WebODM & AI processing</p>
                </div>
              </div>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Dropzone */}
              <div className="border-2 border-dashed border-slate-700 hover:border-sky-500 rounded-xl p-6 text-center bg-slate-950 transition cursor-pointer">
                <UploadCloud className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                <div className="text-sm font-bold text-slate-200">Drag & Drop Drone Flight Survey Images</div>
                <p className="text-xs text-slate-500 mt-1">Supports DJI JPG, DNG, TIFF with EXIF GPS tags or GeoTIFF orthomosaic</p>
                <div className="mt-3 inline-block px-3 py-1 bg-slate-800 text-xs font-semibold rounded-lg text-slate-300">
                  Browse Flight Files (248 Photos Selected)
                </div>
              </div>

              {/* Flight Specs Form */}
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">UAV Platform / Drone Model</label>
                  <select 
                    value={uploadDroneModel}
                    onChange={(e) => setUploadDroneModel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option>DJI Matrice 300 RTK</option>
                    <option>DJI Mavic 3 Enterprise Thermal</option>
                    <option>WingtraOne Gen II VTOL</option>
                    <option>Autel EVO Max 4T</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Payload Sensor</label>
                    <select 
                      value={uploadSensorType}
                      onChange={(e) => setUploadSensorType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                    >
                      <option>RGB + NIR Dual Sensor</option>
                      <option>Zenmuse P1 (45MP Full-Frame)</option>
                      <option>Zenmuse L1 (LiDAR + RGB)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Flight Altitude (AGL)</label>
                    <input 
                      type="number"
                      value={uploadAltitude}
                      onChange={(e) => setUploadAltitude(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Progress Bar when uploading */}
              {isUploading && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Uploading & Stitches WebODM Orthophoto...</span>
                    <span className="text-sky-400">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-sky-500 h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end gap-2">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadSubmit}
                disabled={isUploading}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isUploading ? 'Processing Pipeline...' : 'Start Photogrammetry Pipeline'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TACTICAL SAR LIVE DEPLOYMENT & RADIO TRACKING MODAL */}
      {/* ========================================================================= */}
      {trackingSurvivor && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl text-white">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white">Live SAR Unit Telemetry & Dispatch</h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 border border-emerald-700 text-emerald-300 font-mono">
                      UNIT {trackingSurvivor.assigned_team_id || 'RT-02'} ACTIVE
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Real-time rescue vector tracking & hazard avoidance stream</p>
                </div>
              </div>
              <button 
                onClick={() => setTrackingSurvivor(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Mission Summary Banner */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-mono font-bold">TARGET SURVIVOR CLUSTER</div>
                  <div className="font-bold text-white text-sm mt-0.5">{trackingSurvivor.title}</div>
                  <div className="text-xs text-red-400 font-semibold mt-0.5">
                    {trackingSurvivor.headcount} Souls trapped • {trackingSurvivor.water_depth_m}m flood surge
                  </div>
                </div>
                <div className="text-right sm:border-l sm:border-slate-800 sm:pl-4">
                  <div className="text-[10px] text-slate-400 uppercase font-mono font-bold">STATUS & SPEED</div>
                  <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">12 knots (Transit)</div>
                  <div className="text-xs text-slate-400">ETA: ~7 mins</div>
                </div>
              </div>

              {/* Progress Milestones Tracker */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                  <span>DEPLOYMENT STAGES</span>
                  <span className="text-emerald-400 font-mono">STAGE 3 OF 4</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-mono">
                  <div className="p-2 rounded bg-emerald-950/60 border border-emerald-700/60 text-emerald-300">
                    <Check className="w-3.5 h-3.5 mx-auto mb-1 text-emerald-400" />
                    1. Acknowledged
                  </div>
                  <div className="p-2 rounded bg-emerald-950/60 border border-emerald-700/60 text-emerald-300">
                    <Check className="w-3.5 h-3.5 mx-auto mb-1 text-emerald-400" />
                    2. Craft Launched
                  </div>
                  <div className="p-2 rounded bg-sky-950 border border-sky-600 text-sky-200 font-bold">
                    <Navigation2 className="w-3.5 h-3.5 mx-auto mb-1 text-sky-400" />
                    3. River Transit
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-500">
                    <Users className="w-3.5 h-3.5 mx-auto mb-1" />
                    4. Extraction
                  </div>
                </div>
              </div>

              {/* Tactical Radio Transmissions Log */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <RadioTower className="w-4 h-4 text-sky-400" />
                    Live Radio VHF Channel 16 / TAC-04 Transmissions
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">SECURE MESH</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] space-y-2 max-h-36 overflow-y-auto">
                  <div className="text-slate-400">
                    <span className="text-sky-400">[00:41:10] HQ:</span> Drone UAV confirms {trackingSurvivor.headcount} souls on rooftop. Water depth {trackingSurvivor.water_depth_m}m.
                  </div>
                  <div className="text-slate-300">
                    <span className="text-emerald-400">[00:41:28] RT-02:</span> Zodiac inflatable launched from Tribhuvan staging slipway.
                  </div>
                  <div className="text-amber-300">
                    <span className="text-orange-400">[00:41:52] HQ WARNING:</span> Underpass impassable due to raging backflow. Divert via Bagmati North Levee track.
                  </div>
                  <div className="text-slate-200">
                    <span className="text-emerald-400">[00:42:15] RT-02:</span> Copy underpass hazard. Rerouting along North Levee. 500m to survivor terrace.
                  </div>
                </div>
              </div>

              {/* Safety & Route Clearance Guidance */}
              <div className="p-3 bg-indigo-950/30 border border-indigo-900/50 rounded-xl text-xs flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div className="text-slate-300 text-[11px] leading-relaxed">
                  <strong>Tactical Routing Advisory:</strong> Ground navigation algorithms have redirected Unit {trackingSurvivor.assigned_team_id || 'RT-02'} along the safe Bagmati North Levee corridor, bypassing the submerged Balkhu underpass.
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-2 text-xs">
              <button
                onClick={(e) => {
                  handleResetSingleSurvivor(e, trackingSurvivor.id);
                  setTrackingSurvivor(null);
                }}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Dispatch
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setTrackingSurvivor(null);
                    navigate('/command/rescue');
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open Rescue Operations Matrix
                </button>
                <button
                  onClick={() => setTrackingSurvivor(null)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
