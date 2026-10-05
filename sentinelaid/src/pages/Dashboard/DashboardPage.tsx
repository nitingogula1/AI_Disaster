import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  AlertTriangle, Users, Building, GitBranch, Droplets, Siren,
  Radio, FileDown, ArrowRight, Send, Filter, RefreshCw, CheckCircle2,
  Plane, Camera, Crosshair, Activity, BatteryCharging, Eye, Compass,
  Maximize2, Sliders, Shield, Zap, Navigation2, Check, Video, MapPin,
  ExternalLink, Layers, Wifi, ShieldAlert, PhoneCall, LocateFixed,
  Home, Mountain, Navigation
} from 'lucide-react';
import { SeverityBadge, AlertSeverityBadge } from '../../components/common/StatusBadges';
import {
  dashboardService, disasterService, damageService,
  alertService, gisService, systemService, operationService, exportService
} from '../../services/api';
import { useAppStore } from '../../store/appStore';
import type { Alert, DisasterEvent } from '../../types';
import 'leaflet/dist/leaflet.css';

// Fix default leaflet marker icon
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom Leaflet Icons for Places, Drones, Survivors, Hazards
const createPlaceMarkerIcon = (name: string, tier: 'HIGH' | 'MEDIUM' | 'SAFE', depth?: string) => {
  const isHigh = tier === 'HIGH';
  const bg = isHigh ? '#dc2626' : tier === 'MEDIUM' ? '#ea580c' : '#059669';
  const border = isHigh ? '#ff0000' : tier === 'MEDIUM' ? '#fed7aa' : '#a7f3d0';
  const icon = isHigh ? '🚨' : tier === 'MEDIUM' ? '🟠' : '🟢';
  const pulseStyle = isHigh 
    ? 'box-shadow: 0 0 20px rgba(220, 38, 38, 0.95), 0 0 6px rgba(255, 255, 255, 0.8); animation: pulse 1.1s infinite; border: 2px solid #ffffff;' 
    : 'box-shadow: 0 3px 10px rgba(0,0,0,0.45); border: 1.5px solid ' + border + ';';

  return L.divIcon({
    className: 'custom-place-icon',
    html: `<div style="background-color: ${bg}; color: white; padding: 3px 9px; border-radius: 8px; font-weight: 800; font-size: 11px; ${pulseStyle} white-space: nowrap; font-family: ui-sans-serif, system-ui; display: flex; align-items: center; gap: 5px; cursor: pointer;">
      <span>${icon} ${name}</span>
      ${depth ? `<span style="background: rgba(0,0,0,0.35); padding: 1px 5px; border-radius: 4px; font-size: 10px; font-family: monospace; font-weight: 900; ${isHigh ? 'color: #fef08a; border: 1px solid rgba(254,240,138,0.5);' : ''}">${depth}</span>` : ''}
      ${isHigh ? '<span style="background: #991b1b; padding: 1px 4px; border-radius: 3px; font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px;">HIGH RISK</span>' : ''}
    </div>`,
    iconSize: [140, 26],
    iconAnchor: [70, 13],
  });
};

const createDroneMarkerIcon = (callsign: string, isStreaming: boolean = false) => {
  return L.divIcon({
    className: 'custom-drone-icon',
    html: `<div style="background-color: #0284c7; color: white; padding: 3px 8px; border-radius: 9999px; font-weight: 800; font-size: 10px; border: 2px solid white; box-shadow: 0 0 16px rgba(2,132,199,0.9); white-space: nowrap; font-family: monospace; display: flex; align-items: center; gap: 4px; ${isStreaming ? 'border-color: #38bdf8;' : ''}"><span>🛸 ${callsign}</span></div>`,
    iconSize: [85, 24],
    iconAnchor: [42, 12],
  });
};

const createSurvivorMarkerIcon = (count: number) => {
  return L.divIcon({
    className: 'custom-survivor-icon',
    html: `<div style="background-color: #dc2626; color: white; padding: 3px 8px; border-radius: 9999px; font-weight: 800; font-size: 11px; border: 2px solid white; box-shadow: 0 0 18px rgba(220,38,38,0.95); white-space: nowrap; font-family: monospace; animation: pulse 1.4s infinite; display: flex; align-items: center; gap: 3px;"><span>🚨 ${count} SURVIVORS</span></div>`,
    iconSize: [115, 26],
    iconAnchor: [57, 13],
  });
};

const createHazardPointIcon = (label: string) => {
  return L.divIcon({
    className: 'custom-hazard-icon',
    html: `<div style="background-color: #ea580c; color: white; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 10px; border: 1.5px solid white; box-shadow: 0 2px 8px rgba(234,88,12,0.8); white-space: nowrap; font-family: monospace;">⚠️ ${label}</div>`,
    iconSize: [100, 22],
    iconAnchor: [50, 11],
  });
};

// Map Controller for smooth flyTo transitions & bounds fitting
function DashboardMapController({ 
  center, 
  zoom, 
  bounds 
}: { 
  center: [number, number]; 
  zoom: number; 
  bounds?: [number, number][];
}) {
  const map = useMap();
  useEffect(() => {
    try {
      map.invalidateSize();
      if (bounds && bounds.length >= 2) {
        const b = L.latLngBounds(bounds);
        map.fitBounds(b, { padding: [45, 45], maxZoom: 13, animate: true });
      } else {
        map.flyTo(center, zoom, { duration: 1.2, easeLinearity: 0.25 });
      }
    } catch (e) {
      console.warn('Map bounds fit error:', e);
    }
  }, [center[0], center[1], zoom, bounds?.length, map]);
  return null;
}

// Village / Place definition
export interface AffectedPlace {
  id: string;
  name: string;
  district: string;
  tier: 'HIGH' | 'MEDIUM' | 'SAFE';
  pos: [number, number];
  depth: string;
  depthM: number;
  population: number;
  stranded: number;
  hazardReason: string;
  status: string;
}

// Comprehensive Disaster Scenarios with full places, geospatial & drone telemetry
export interface TacticalDisasterScenario {
  id: string;
  name: string;
  badge: string;
  region: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  status: 'ACTIVE' | 'CONTAINED';
  responsePhase: string;
  center: [number, number];
  zoom: number;
  kpis: {
    activeDisasters: { value: string; sublabel: string };
    affectedRegions: { value: string; sublabel: string };
    damagedBuildings: { value: string; sublabel: string };
    blockedRoads: { value: string; sublabel: string };
    floodedArea: { value: string; sublabel: string };
    priorityRescue: { value: string; sublabel: string };
  };
  floodPolygon: [number, number][];
  blockedRoadSegments: [number, number][][];
  places: AffectedPlace[];
  drones: {
    id: string;
    callsign: string;
    model: string;
    status: 'ON MISSION' | 'HOVERING' | 'SURVEYING';
    battery: number;
    altitudeM: number;
    speedKmh: number;
    sensor: string;
    sector: string;
    pos: [number, number];
    detections: string[];
    videoFeedUrl?: string;
  }[];
  survivorPoints: {
    id: string;
    name: string;
    pos: [number, number];
    count: number;
    depthM: number;
    urgency: 'IMMEDIATE' | 'HIGH' | 'MONITOR';
    description: string;
  }[];
  hazardPoints: {
    id: string;
    label: string;
    pos: [number, number];
    detail: string;
  }[];
}

const DISASTER_SCENARIOS: TacticalDisasterScenario[] = [
  {
    id: 'DR-2026-NP01',
    name: 'Nuwakot - Rasuwa Trishuli River Flash Flood & Landslide Crisis',
    badge: '🇳🇵 RASUWA-NUWAKOT FLASH FLOOD',
    region: 'Trishuli River Basin • Bagmati Province, Nepal',
    severity: 'CRITICAL',
    status: 'ACTIVE',
    responsePhase: 'Phase 2 Evacuation & Tactical Air-Drop',
    center: [28.0850, 85.2650],
    zoom: 11,
    kpis: {
      activeDisasters: { value: '3 Ongoing', sublabel: '2 Critical, 1 Elevated' },
      affectedRegions: { value: '1,840 km²', sublabel: 'Trishuli Basin & Langtang Ridge' },
      damagedBuildings: { value: '286', sublabel: '+28% vs T-24h (96% AI conf)' },
      blockedRoads: { value: '8 Segments', sublabel: 'Pasang Lhamu Highway severed' },
      floodedArea: { value: '34.8 km²', sublabel: 'NDWI Spectral Flood Inundation' },
      priorityRescue: { value: '9 Red Zones', sublabel: '3,420 civilians at direct risk' },
    },
    floodPolygon: [
      [28.290, 85.390],
      [28.240, 85.380],
      [28.170, 85.350],
      [28.120, 85.310],
      [28.060, 85.250],
      [27.970, 85.190],
      [27.910, 85.150],
      [27.860, 85.110],
      [27.870, 85.130],
      [27.930, 85.170],
      [28.000, 85.210],
      [28.110, 85.280],
      [28.180, 85.330],
      [28.250, 85.370],
      [28.290, 85.390]
    ],
    blockedRoadSegments: [
      [[28.055, 85.244], [28.065, 85.252]], // Ramche landslide cut
      [[27.978, 85.185], [27.985, 85.192]], // Betrawati bridge washout
    ],
    places: [
      {
        id: 'place-np-01',
        name: 'Rasuwagadhi',
        district: 'Rasuwa',
        tier: 'HIGH',
        pos: [28.2778, 85.3778],
        depth: '2.4m',
        depthM: 2.4,
        population: 1450,
        stranded: 72,
        hazardReason: 'Northern border riverbank flash flood torrent. Custom border crossing submerged.',
        status: 'Cut Off'
      },
      {
        id: 'place-np-02',
        name: 'Timure',
        district: 'Rasuwa',
        tier: 'HIGH',
        pos: [28.2300, 85.3700],
        depth: '2.1m',
        depthM: 2.1,
        population: 1100,
        stranded: 48,
        hazardReason: 'Gorge river surge flooding lower valley settlements. Road transport severed.',
        status: 'Submerged'
      },
      {
        id: 'place-np-03',
        name: 'Syabrubesi',
        district: 'Rasuwa',
        tier: 'HIGH',
        pos: [28.1600, 85.3400],
        depth: '1.8m',
        depthM: 1.8,
        population: 1950,
        stranded: 54,
        hazardReason: 'Langtang Khola & Trishuli confluence overflow. Suspension bridge approach washed out.',
        status: 'Critical Triage'
      },
      {
        id: 'place-np-04',
        name: 'Dhunche',
        district: 'Rasuwa',
        tier: 'HIGH',
        pos: [28.1130, 85.3010],
        depth: '1.2m',
        depthM: 1.2,
        population: 2800,
        stranded: 38,
        hazardReason: 'District headquarters. Trauma hospital staging center active on high ground.',
        status: 'Command Staging'
      },
      {
        id: 'place-np-05',
        name: 'Ramche',
        district: 'Rasuwa',
        tier: 'HIGH',
        pos: [28.0550, 85.2440],
        depth: '1.4m',
        depthM: 1.4,
        population: 850,
        stranded: 22,
        hazardReason: 'Severe hillside mudslide and road fissure. Vehicles stranded on highway curve.',
        status: 'Passage Impassable'
      },
      {
        id: 'place-np-06',
        name: 'Betrawati',
        district: 'Nuwakot',
        tier: 'HIGH',
        pos: [27.9780, 85.1850],
        depth: '1.6m',
        depthM: 1.6,
        population: 1600,
        stranded: 30,
        hazardReason: 'Betrawati river bridge east approach washed out by torrent.',
        status: 'Bridge Washout'
      },
      {
        id: 'place-np-07',
        name: 'Trishuli Bazaar (Bidur)',
        district: 'Nuwakot',
        tier: 'HIGH',
        pos: [27.9250, 85.1550],
        depth: '1.85m',
        depthM: 1.85,
        population: 4200,
        stranded: 64,
        hazardReason: 'Arterial market basin inundation. DEOC Tactical Command base coordinating relief.',
        status: 'DEOC Command Base'
      },
      {
        id: 'place-np-08',
        name: 'Battar',
        district: 'Nuwakot',
        tier: 'SAFE',
        pos: [27.9040, 85.1610],
        depth: '0.1m',
        depthM: 0.1,
        population: 3200,
        stranded: 0,
        hazardReason: 'Elevated plateau. Central Nuwakot civil hospital receiving evacuees.',
        status: 'Safe Medical Haven'
      },
      {
        id: 'place-np-09',
        name: 'Devighat',
        district: 'Nuwakot',
        tier: 'MEDIUM',
        pos: [27.8600, 85.1101],
        depth: '0.85m',
        depthM: 0.85,
        population: 2600,
        stranded: 12,
        hazardReason: 'Tadi & Trishuli confluence swelling. River terrace farmland partially inundated.',
        status: 'Downstream Alert'
      },
      {
        id: 'place-np-10',
        name: 'Dhading Besi',
        district: 'Dhading',
        tier: 'MEDIUM',
        pos: [27.8500, 84.9200],
        depth: '0.50m',
        depthM: 0.5,
        population: 3100,
        stranded: 0,
        hazardReason: 'Downstream river swell approaching low-lying bridges. Precautionary alert active.',
        status: 'Precautionary Alert'
      }
    ],
    drones: [
      {
        id: 'drone-01',
        callsign: 'Eagle-1',
        model: 'VTOL Heavy Recon UAV Mk-IV',
        status: 'ON MISSION',
        battery: 86,
        altitudeM: 185,
        speedKmh: 48,
        sensor: 'FLIR Dual Thermal + 4K Optical (30x)',
        sector: 'Syabrubesi Gorge & River Bend',
        pos: [28.180, 85.345],
        detections: [
          '18 Survivors located on elevated terrace (Langtang Haven)',
          'River water cresting at +2.8m above normal datum',
          'Access road submerged by 0.9m rapid flow'
        ]
      },
      {
        id: 'drone-02',
        callsign: 'Falcon-4',
        model: 'LiDAR Penetration UAV',
        status: 'ON MISSION',
        battery: 74,
        altitudeM: 120,
        speedKmh: 38,
        sensor: 'Bathymetric LiDAR + Surface Depth Radar',
        sector: 'Dhunche Highway Mile 14',
        pos: [28.085, 85.275],
        detections: [
          'Critical Road Cut (1.4m standing water) at Ramche curve',
          'Secondary rockfall hazard detected at North slope',
          'High-ground bypass passability verified (94% Conf)'
        ]
      }
    ],
    survivorPoints: [
      {
        id: 'surv-01',
        name: 'Syabrubesi Terrace Camp',
        pos: [28.165, 85.342],
        count: 18,
        depthM: 0.2,
        urgency: 'IMMEDIATE',
        description: '18 villagers stranded on elevated stone terrace. Access cut off by Trishuli river surge.'
      },
      {
        id: 'surv-02',
        name: 'Dhunche North School Ridge',
        pos: [28.120, 85.305],
        count: 14,
        depthM: 0.1,
        urgency: 'HIGH',
        description: '14 civilians sheltering on upper roof. Potable water and rations requested.'
      }
    ],
    hazardPoints: [
      {
        id: 'haz-01',
        label: 'WATER 1.4m',
        pos: [28.055, 85.244],
        detail: 'Pasang Lhamu Highway severed by 1.4m floodwater and mudslide debris.'
      },
      {
        id: 'haz-02',
        label: 'COLLAPSE',
        pos: [27.978, 85.185],
        detail: 'Betrawati river bridge east approach washed out. Unpassable for motor convoys.'
      }
    ]
  },
  {
    id: 'DR-2026-NP02',
    name: 'Kathmandu Bagmati Flash Flood (Balkhu & Kirtipur Basin)',
    badge: '🇳🇵 BAGMATI FLASH FLOOD',
    region: 'Kathmandu Valley Basin • Bagmati Corridor, Nepal',
    severity: 'CRITICAL',
    status: 'ACTIVE',
    responsePhase: 'Urban Rooftop Evacuation & Triage',
    center: [27.6842, 85.2945],
    zoom: 13,
    kpis: {
      activeDisasters: { value: '3 Ongoing', sublabel: '2 Critical, 1 Elevated' },
      affectedRegions: { value: '420 km²', sublabel: 'Bagmati & Bishnumati Confluence' },
      damagedBuildings: { value: '142', sublabel: '+18% vs T-24h (94% AI conf)' },
      blockedRoads: { value: '4 Segments', sublabel: 'Balkhu Ring Road & Teku Bridge' },
      floodedArea: { value: '12.4 km²', sublabel: 'Urban River Overflow Surge' },
      priorityRescue: { value: '5 Red Zones', sublabel: '1,850 civilians at direct risk' },
    },
    floodPolygon: [
      [27.705, 85.280],
      [27.710, 85.315],
      [27.690, 85.325],
      [27.670, 85.310],
      [27.665, 85.285],
      [27.680, 85.275],
      [27.705, 85.280]
    ],
    blockedRoadSegments: [
      [[27.684, 85.292], [27.686, 85.296]], // Balkhu market underpass
      [[27.697, 85.305], [27.699, 85.309]], // Teku bridge approach
    ],
    places: [
      {
        id: 'place-ktm-01',
        name: 'Balkhu Vegetable Market',
        district: 'Kathmandu',
        tier: 'HIGH',
        pos: [27.6842, 85.2945],
        depth: '1.85m',
        depthM: 1.85,
        population: 2400,
        stranded: 42,
        hazardReason: 'Bagmati river overflow inundated market ground floors. Rooftop evacuations ongoing.',
        status: 'Active Rooftop Rescue'
      },
      {
        id: 'place-ktm-02',
        name: 'Tribhuvan University High Ridge',
        district: 'Kirtipur',
        tier: 'SAFE',
        pos: [27.6885, 85.2915],
        depth: '0.0m',
        depthM: 0.0,
        population: 5000,
        stranded: 0,
        hazardReason: 'Elevated bedrock ridge safe from flood surge. Receiving evacuees.',
        status: 'Safe Haven & Helipad'
      },
      {
        id: 'place-ktm-03',
        name: 'Kalanki Transit Hub',
        district: 'Kathmandu',
        tier: 'MEDIUM',
        pos: [27.6935, 85.2815],
        depth: '0.75m',
        depthM: 0.75,
        population: 3800,
        stranded: 18,
        hazardReason: 'Underpass drainage overwhelmed. West ring road transit slowed.',
        status: 'Transit Restricted'
      },
      {
        id: 'place-ktm-04',
        name: 'Patan Hospital Staging',
        district: 'Lalitpur',
        tier: 'SAFE',
        pos: [27.6685, 85.3210],
        depth: '0.1m',
        depthM: 0.1,
        population: 4200,
        stranded: 0,
        hazardReason: 'Central trauma hospital receiving injured evacuees.',
        status: 'Trauma Command'
      },
      {
        id: 'place-ktm-05',
        name: 'Teku Emergency Center',
        district: 'Kathmandu',
        tier: 'HIGH',
        pos: [27.6975, 85.3060],
        depth: '1.4m',
        depthM: 1.4,
        population: 1800,
        stranded: 28,
        hazardReason: 'Bishnumati-Bagmati river confluence surge overflowing bank walls.',
        status: 'Bank Wall Breach'
      },
      {
        id: 'place-ktm-06',
        name: 'Chobhar Gorge Elevated Point',
        district: 'Kathmandu',
        tier: 'MEDIUM',
        pos: [27.6620, 85.2905],
        depth: '0.6m',
        depthM: 0.6,
        population: 1200,
        stranded: 10,
        hazardReason: 'Southern valley outflow gorge monitoring station active.',
        status: 'Outflow Monitored'
      }
    ],
    drones: [
      {
        id: 'drone-03',
        callsign: 'Hawk-2',
        model: 'FLIR Thermal Life-Sign UAV',
        status: 'HOVERING',
        battery: 92,
        altitudeM: 95,
        speedKmh: 16,
        sensor: 'High-Sensitivity Longwave Thermal IR',
        sector: 'Balkhu Vegetable Market Rooftops',
        pos: [27.687, 85.298],
        detections: [
          '8 Life-sign heat clusters on warehouse rooftop',
          'Floodwater depth 1.15m surging across ground floor',
          'Rooftop landing zone clear for Zodiac/Drone payload drop'
        ]
      }
    ],
    survivorPoints: [
      {
        id: 'surv-03',
        name: 'Balkhu Market Rooftop',
        pos: [27.6842, 85.2945],
        count: 8,
        depthM: 1.15,
        urgency: 'IMMEDIATE',
        description: '8 vendors trapped on warehouse roof with rising water levels.'
      }
    ],
    hazardPoints: [
      {
        id: 'haz-03',
        label: 'WATER 1.2m',
        pos: [27.684, 85.292],
        detail: 'Balkhu Ring Road underpass fully inundated. Vehicles submerged.'
      }
    ]
  },
  {
    id: 'DR-2026-AP01',
    name: 'Andhra Pradesh - Rajam / Vizianagaram Flood Relief Operations',
    badge: '🇮🇳 ANDHRA DISASTER RELIEF',
    region: 'Vizianagaram & Srikakulam Corridors • Andhra Pradesh, India',
    severity: 'HIGH',
    status: 'ACTIVE',
    responsePhase: 'Phase 1 Logistics & Staging Support',
    center: [18.4498, 83.6565],
    zoom: 13,
    kpis: {
      activeDisasters: { value: '3 Ongoing', sublabel: '1 Critical, 2 Elevated' },
      affectedRegions: { value: '860 km²', sublabel: 'Nagavali Sub-Basin & Rajam Wards' },
      damagedBuildings: { value: '84', sublabel: '+11% vs T-24h (92% AI conf)' },
      blockedRoads: { value: '3 Segments', sublabel: 'Palakonda Rd & Cherugudupeta Cut' },
      floodedArea: { value: '18.2 km²', sublabel: 'Agricultural Basin Surge' },
      priorityRescue: { value: '4 Red Zones', sublabel: '2,640 civilians at direct risk' },
    },
    floodPolygon: [
      [18.468, 83.635],
      [18.475, 83.675],
      [18.448, 83.688],
      [18.420, 83.668],
      [18.415, 83.642],
      [18.438, 83.628],
      [18.468, 83.635]
    ],
    blockedRoadSegments: [
      [[18.440, 83.645], [18.446, 83.652]], // Cherugudupeta culvert washout
    ],
    places: [
      {
        id: 'place-ap-01',
        name: 'Rajam Town Center (RTC)',
        district: 'Rajam',
        tier: 'MEDIUM',
        pos: [18.4498, 83.6565],
        depth: '0.3m',
        depthM: 0.3,
        population: 18000,
        stranded: 0,
        hazardReason: 'Central relief staging point. High-clearance convoy depot active.',
        status: 'Command Staging'
      },
      {
        id: 'place-ap-02',
        name: 'Boddam High-Ground Shelter',
        district: 'Rajam',
        tier: 'SAFE',
        pos: [18.4350, 83.6620],
        depth: '0.1m',
        depthM: 0.1,
        population: 1400,
        stranded: 0,
        hazardReason: 'Elevated community center & temple ground receiving evacuees.',
        status: 'Safe Haven'
      },
      {
        id: 'place-ap-03',
        name: 'Prasanthi Nagar',
        district: 'Rajam',
        tier: 'HIGH',
        pos: [18.4550, 83.6490],
        depth: '0.85m',
        depthM: 0.85,
        population: 3200,
        stranded: 24,
        hazardReason: 'Lowland storm drain backflow. Ground level residences flooded.',
        status: 'Inundated'
      },
      {
        id: 'place-ap-04',
        name: 'Mushinivalasa',
        district: 'Rajam',
        tier: 'HIGH',
        pos: [18.4680, 83.6740],
        depth: '1.1m',
        depthM: 1.1,
        population: 2100,
        stranded: 36,
        hazardReason: 'Agricultural perimeter overflow from irrigation canal breach.',
        status: 'Canal Breach'
      },
      {
        id: 'place-ap-05',
        name: 'Cherugudupeta',
        district: 'Rajam',
        tier: 'HIGH',
        pos: [18.4280, 83.6410],
        depth: '1.25m',
        depthM: 1.25,
        population: 1900,
        stranded: 45,
        hazardReason: 'Lowland lake catchment surge. Road access impassable for cars.',
        status: 'Road Submerged'
      },
      {
        id: 'place-ap-06',
        name: 'GMRIT Campus',
        district: 'Rajam',
        tier: 'SAFE',
        pos: [18.4655, 83.6630],
        depth: '0.0m',
        depthM: 0.0,
        population: 6000,
        stranded: 0,
        hazardReason: 'Elevated engineering campus. Air-drop staging zone and relief camp.',
        status: 'Evacuation Camp'
      }
    ],
    drones: [
      {
        id: 'drone-05',
        callsign: 'Eagle-1 (AP Unit)',
        model: 'VTOL Heavy Recon UAV Mk-IV',
        status: 'ON MISSION',
        battery: 84,
        altitudeM: 160,
        speedKmh: 45,
        sensor: 'FLIR Dual Thermal + 4K Optical',
        sector: 'Boddam High Ground & Lowland Fields',
        pos: [18.442, 83.658],
        detections: [
          '12 Farmers evacuated to Boddam Community Center',
          'Paddy fields inundated with 0.65m flood runoff',
          'RTC main road passable with tactical vehicles'
        ]
      }
    ],
    survivorPoints: [
      {
        id: 'surv-05',
        name: 'Boddam Community Shelter',
        pos: [18.4350, 83.6620],
        count: 12,
        depthM: 0.1,
        urgency: 'HIGH',
        description: '12 civilians sheltering on elevated temple grounds.'
      }
    ],
    hazardPoints: [
      {
        id: 'haz-04',
        label: 'WATER 0.8m',
        pos: [18.440, 83.645],
        detail: 'Cherugudupeta access culvert overflow. Passable only with high-clearance craft.'
      }
    ]
  },
  {
    id: 'FL-2025-08A',
    name: 'Assam Valley Monsoon - Brahmaputra Flash Flood & Structural Impact',
    badge: '🇮🇳 ASSAM VALLEY MONSOON',
    region: 'Brahmaputra Basin • Sector 2, Assam, India',
    severity: 'HIGH',
    status: 'ACTIVE',
    responsePhase: 'Phase 2 Evacuation & Rescue',
    center: [26.1550, 91.7350],
    zoom: 12,
    kpis: {
      activeDisasters: { value: '3 Ongoing', sublabel: '1 Critical, 2 Elevated' },
      affectedRegions: { value: '2,100 km²', sublabel: 'Coastline & Delta Sector 4' },
      damagedBuildings: { value: '518', sublabel: '+14% vs T-24h (95% AI conf)' },
      blockedRoads: { value: '6 Segments', sublabel: '18.4 km impassable network' },
      floodedArea: { value: '42.6 km²', sublabel: 'MNDWI Spectral Index' },
      priorityRescue: { value: '7 Red Zones', sublabel: '4,850 civilians at direct risk' },
    },
    floodPolygon: [
      [26.195, 91.690],
      [26.205, 91.770],
      [26.160, 91.790],
      [26.110, 91.750],
      [26.115, 91.680],
      [26.195, 91.690]
    ],
    blockedRoadSegments: [
      [[26.140, 91.720], [26.148, 91.735]],
    ],
    places: [
      {
        id: 'place-as-01',
        name: 'Kamrup Central School',
        district: 'Kamrup',
        tier: 'HIGH',
        pos: [26.1445, 91.7362],
        depth: '1.4m',
        depthM: 1.4,
        population: 3200,
        stranded: 320,
        hazardReason: 'Access cut off by standing flood surge. 320 civilians sheltering on rooftop.',
        status: 'Rooftop Triage'
      },
      {
        id: 'place-as-02',
        name: 'Guwahati Riverfront',
        district: 'Kamrup',
        tier: 'HIGH',
        pos: [26.1850, 91.7450],
        depth: '1.8m',
        depthM: 1.8,
        population: 14000,
        stranded: 60,
        hazardReason: 'Brahmaputra river overflow breached secondary embankment.',
        status: 'Embankment Breach'
      },
      {
        id: 'place-as-03',
        name: 'Kamakhya Hill Safe Ridge',
        district: 'Kamrup',
        tier: 'SAFE',
        pos: [26.1660, 91.7050],
        depth: '0.0m',
        depthM: 0.0,
        population: 8000,
        stranded: 0,
        hazardReason: 'Elevated bedrock sanctuary safe from floodwaters.',
        status: 'Safe Haven'
      },
      {
        id: 'place-as-04',
        name: 'Dispur Emergency Haven',
        district: 'Kamrup',
        tier: 'SAFE',
        pos: [26.1400, 91.7900],
        depth: '0.1m',
        depthM: 0.1,
        population: 9500,
        stranded: 0,
        hazardReason: 'Administrative coordination base and medical receiving center.',
        status: 'Command Base'
      }
    ],
    drones: [
      {
        id: 'drone-06',
        callsign: 'Falcon-4 (Assam Unit)',
        model: 'LiDAR Penetration UAV',
        status: 'ON MISSION',
        battery: 78,
        altitudeM: 140,
        speedKmh: 42,
        sensor: 'LiDAR Water Depth Scanner',
        sector: 'Brahmaputra River Embankment',
        pos: [26.160, 91.750],
        detections: [
          'Secondary embankment breached by 12m gap',
          '320 Civilians sheltering on High School Roof',
          'Estimated water depth: 1.4m'
        ]
      }
    ],
    survivorPoints: [
      {
        id: 'surv-06',
        name: 'Kamrup Central School Roof',
        pos: [26.145, 91.745],
        count: 32,
        depthM: 1.4,
        urgency: 'IMMEDIATE',
        description: '320 civilians reported sheltering on level 2 roof. Water depth 1.4m.'
      }
    ],
    hazardPoints: [
      {
        id: 'haz-05',
        label: 'WATER 1.4m',
        pos: [26.140, 91.720],
        detail: 'Highway cutoff by 1.4m standing river floodwaters.'
      }
    ]
  }
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { refreshTrigger, triggerRefresh } = useAppStore();

  // Active Disaster Selection
  const [selectedDisasterId, setSelectedDisasterId] = useState<string>('DR-2026-NP01');
  const activeScenario = useMemo(() => {
    return DISASTER_SCENARIOS.find(d => d.id === selectedDisasterId) || DISASTER_SCENARIOS[0];
  }, [selectedDisasterId]);

  // Selected Place for FlyTo inspection
  const [focusedPlace, setFocusedPlace] = useState<AffectedPlace | null>(null);
  const [scenarioMode, setScenarioMode] = useState<'DRILL' | 'CLEAR'>('DRILL');

  // Active Drone Selection for Live Video HUD Stream
  const [selectedDroneId, setSelectedDroneId] = useState<string>(activeScenario.drones[0]?.id || 'drone-01');
  const activeDrone = useMemo(() => {
    return activeScenario.drones.find(d => d.id === selectedDroneId) || activeScenario.drones[0];
  }, [activeScenario, selectedDroneId]);

  // Video HUD Stream Mode: Thermal FLIR vs Optical 4K vs LiDAR
  const [droneHudMode, setDroneHudMode] = useState<'THERMAL' | 'OPTICAL' | 'LIDAR'>('THERMAL');

  // Telemetry & Satellite Status (Fixed to never show null)
  const [telemetry, setTelemetry] = useState<any>({ sync_percentage: 99.8, latency_ms: 14, status: 'SYNCED' });
  const [cloudStatus, setCloudStatus] = useState<any>({ cloud_cover: 1.8, valid: true, quality: 'SCL Valid (Clear Optical Pass)' });
  const [aiStatus, setAiStatus] = useState<any>({
    model_name: 'Spectral Overlap Heuristic Engine (No ML Checkpoint)',
    framework: 'PyTorch CUDA TensorRT FP16',
    inference_engine: 'Real-Time Edge Neural Tensor Engine'
  });

  // Map Layer States
  const [layerVisibility, setLayerVisibility] = useState<Record<string, boolean>>({
    places: true,
    flood: true,
    drones: true,
    survivors: true,
    roads: true,
    hazards: true
  });

  // Calculate tight bounds for all places in active scenario to frame map perfectly
  const placeBounds = useMemo<[number, number][]>(() => {
    const pts: [number, number][] = activeScenario.places.map(p => p.pos);
    if (activeScenario.center) pts.push(activeScenario.center);
    return pts;
  }, [activeScenario]);

  // Alerts & Feed
  const [activeTab, setActiveTab] = useState<'all' | 'critical' | 'tactical'>('all');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(3);
  const [commandInput, setCommandInput] = useState('');
  const [commandFeedback, setCommandFeedback] = useState<string | null>(null);
  const [sitrepNotification, setSitrepNotification] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string>('Just now');

  // Sync selected drone when disaster changes
  useEffect(() => {
    if (activeScenario.drones.length > 0) {
      setSelectedDroneId(activeScenario.drones[0].id);
    }
    setFocusedPlace(null);
  }, [selectedDisasterId]);

  // Generate real dynamic alerts based on active disaster and drone telemetry
  useEffect(() => {
    const generatedAlerts: Alert[] = [
      {
        id: `alt-drone-1-${activeScenario.id}`,
        severity: 'CRITICAL',
        title: `🚨 [DRONE ${activeScenario.drones[0]?.callsign || 'EAGLE-1'}] ${activeScenario.survivorPoints[0]?.count || 18} Stranded Civilians Spotted`,
        description: `${activeScenario.survivorPoints[0]?.description || 'Civilians stranded by active flash floodwaters.'} Drone FLIR life-sign detection verified (98% Conf).`,
        message: `${activeScenario.survivorPoints[0]?.name}: Water depth ${activeScenario.survivorPoints[0]?.depthM || 0.8}m. Urgent boat extraction vector required.`,
        timestamp: '1m ago',
        coordinates: `${activeScenario.center[0].toFixed(3)}°N, ${activeScenario.center[1].toFixed(3)}°E`,
        actions: [
          { label: '🚁 Dispatch Rescue Unit', type: 'primary' },
          { label: 'View Evacuation Route', type: 'secondary' }
        ],
        is_read: false
      },
      {
        id: `alt-drone-2-${activeScenario.id}`,
        severity: 'HIGH_SURGE',
        title: `⚠️ [DRONE SENSOR] Arterial Route Cutoff Inundation (${activeScenario.hazardPoints[0]?.label || 'WATER 1.2m'})`,
        description: activeScenario.hazardPoints[0]?.detail || 'Highway segment submerged. Safe bypass calculated via high ground.',
        message: 'Passage blocked for standard ambulances. Re-routing required.',
        timestamp: '4m ago',
        coordinates: `${(activeScenario.center[0] + 0.01).toFixed(3)}°N, ${(activeScenario.center[1] + 0.01).toFixed(3)}°E`,
        actions: [
          { label: 'View Evacuation Route', type: 'primary' }
        ],
        is_read: false
      },
      {
        id: `alt-sat-1-${activeScenario.id}`,
        severity: 'SATELLITE_INGEST',
        title: '🛰️ [SENTINEL-2 MSI] New Optical & NDWI Tile Ingested',
        description: `Planetary Computer pass for ${activeScenario.region}. Cloud cover < 2.0%. Water mask polygon generated.`,
        message: 'AI damage segmentation complete. 94.8% classification confidence.',
        timestamp: '14m ago',
        coordinates: `${activeScenario.center[0].toFixed(3)}°N, ${activeScenario.center[1].toFixed(3)}°E`,
        actions: [],
        is_read: true
      }
    ];

    setAlerts(generatedAlerts);
    setUnreadCount(generatedAlerts.filter(a => !a.is_read).length);
  }, [activeScenario]);

  // Filter alerts by active tab
  const filteredAlerts = useMemo(() => {
    if (activeTab === 'critical') {
      return alerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH_SURGE');
    }
    if (activeTab === 'tactical') {
      return alerts.filter(a => a.title.includes('DRONE') || a.title.includes('UAV'));
    }
    return alerts;
  }, [alerts, activeTab]);

  // Switch Active Disaster Handler
  const handleSelectDisaster = (disasterId: string) => {
    setSelectedDisasterId(disasterId);
    setSitrepNotification(`Active Tactical Theater Switched to ${disasterId}`);
    setTimeout(() => setSitrepNotification(null), 3500);
  };

  // Toggle map layers
  const toggleLayer = (layerKey: string) => {
    setLayerVisibility(prev => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  // Broadcast SITREP
  const handleBroadcastSITREP = async () => {
    try {
      await dashboardService.broadcastSitrep();
      setSitrepNotification(`SITREP Briefing for ${activeScenario.name} compiled & transmitted to field commanders.`);
    } catch {
      setSitrepNotification(`SITREP Emergency Briefing for ${activeScenario.name} compiled.`);
    }
    setTimeout(() => setSitrepNotification(null), 4000);
  };

  // Export GeoJSON
  const handleExportGeoJSON = () => {
    const geojson = {
      type: 'FeatureCollection',
      name: `SentinelAid_${activeScenario.id}_Tactical_Export`,
      features: [
        {
          type: 'Feature',
          properties: { name: `${activeScenario.name} Flood Boundary`, hazard: 'FLOOD' },
          geometry: {
            type: 'Polygon',
            coordinates: [activeScenario.floodPolygon.map(p => [p[1], p[0]])]
          }
        },
        ...activeScenario.places.map(pl => ({
          type: 'Feature',
          properties: { name: pl.name, tier: pl.tier, depth: pl.depth, stranded: pl.stranded },
          geometry: { type: 'Point', coordinates: [pl.pos[1], pl.pos[0]] }
        })),
        ...activeScenario.drones.map(d => ({
          type: 'Feature',
          properties: { callsign: d.callsign, status: d.status, altM: d.altitudeM },
          geometry: { type: 'Point', coordinates: [d.pos[1], d.pos[0]] }
        }))
      ]
    };
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeScenario.id}_SentinelAid_Mission.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Tactical Command Dispatcher
  const handleSendCommand = async () => {
    if (!commandInput.trim()) return;
    setCommandFeedback(`Command "${commandInput}" dispatched to ${activeDrone.callsign} & RT-02 team`);
    setCommandInput('');
    setTimeout(() => setCommandFeedback(null), 3500);
  };

  // Sync button action
  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      const now = new Date();
      setLastSynced(now.toLocaleTimeString('en-US', { hour12: false }));
      setIsSyncing(false);
      setSitrepNotification('Synchronized live drone telemetry and satellite passes.');
      setTimeout(() => setSitrepNotification(null), 3000);
    }, 450);
  };

  // KPI Metrics list
  const KPI_CARDS = [
    { label: 'ACTIVE DISASTERS', value: activeScenario.kpis.activeDisasters.value, sublabel: activeScenario.kpis.activeDisasters.sublabel, icon: AlertTriangle, color: 'text-amber-500' },
    { label: 'AFFECTED REGIONS', value: activeScenario.kpis.affectedRegions.value, sublabel: activeScenario.kpis.affectedRegions.sublabel, icon: Users, color: 'text-sky-500' },
    { label: 'DAMAGED BUILDINGS', value: activeScenario.kpis.damagedBuildings.value, sublabel: activeScenario.kpis.damagedBuildings.sublabel, icon: Building, color: 'text-rose-500' },
    { label: 'BLOCKED ROADS', value: activeScenario.kpis.blockedRoads.value, sublabel: activeScenario.kpis.blockedRoads.sublabel, icon: GitBranch, color: 'text-orange-500' },
    { label: 'FLOODED AREA', value: activeScenario.kpis.floodedArea.value, sublabel: activeScenario.kpis.floodedArea.sublabel, icon: Droplets, color: 'text-blue-500' },
    { label: 'PRIORITY RESCUE', value: activeScenario.kpis.priorityRescue.value, sublabel: activeScenario.kpis.priorityRescue.sublabel, icon: Siren, color: 'text-red-600', highlight: true },
  ];

  return (
    <div className="space-y-4 animate-fade-in p-2 text-slate-800">
      {/* PRIORITY 1: UNMISSABLE SIMULATED SCENARIO WARNING BANNER (TOP OF DASHBOARD) */}
      <div className="bg-amber-500 border-2 border-amber-700 text-slate-950 px-4 py-3 rounded-xl shadow-md flex items-center justify-between gap-3 font-sans">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 bg-black text-amber-300 font-mono font-black text-xs rounded tracking-widest uppercase flex items-center gap-1.5 shadow-sm shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            SIMULATED SCENARIO DATA — NOT LIVE
          </span>
          <span className="text-xs font-extrabold text-slate-950 tracking-tight">
            TRAINING DRILL ENVIRONMENT: All casualty headcounts, flood depths, and village risk classifications are synthetic scenario parameters. Not connected to live sensor telemetry.
          </span>
        </div>
        <span className="hidden lg:inline text-[11px] font-mono font-bold px-2 py-0.5 bg-amber-600 text-white rounded uppercase">
          EXERCISE DRILL
        </span>
      </div>
      {/* Toast Alert */}
      {sitrepNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-sky-500 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-sky-400 flex-shrink-0" />
          <div className="text-xs font-semibold">{sitrepNotification}</div>
        </div>
      )}

      {/* TACTICAL DISASTER SWITCHER BAR */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              TACTICAL ACTIVE DISASTER THEATERS:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {DISASTER_SCENARIOS.map(sc => {
              const isSelected = sc.id === activeScenario.id;
              return (
                <button
                  key={sc.id}
                  onClick={() => handleSelectDisaster(sc.id)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-sky-50 border-sky-600 text-sky-800 ring-2 ring-sky-300 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span>{sc.badge}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    sc.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {sc.severity}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* PAGE HEADER */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="text-lg lg:text-xl font-bold text-slate-900">
                {activeScenario.name}
              </h1>
              <span className="text-xs bg-slate-100 text-slate-600 font-mono font-bold px-2 py-0.5 rounded border border-slate-200">
                ID: {activeScenario.id}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                ACTIVE {activeScenario.severity} DISASTER THEATER
              </span>
              <span className="text-xs text-slate-600 font-medium">
                ⚡ Response Active: <strong className="text-slate-800">{activeScenario.responsePhase}</strong> →
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-2 text-[11px] text-slate-500 font-mono">
              <span className="flex items-center gap-1">
                <span>🛰️ Last Sentinel-2 MSI pass:</span>
                <strong className="text-slate-800 font-bold">14m ago</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span>📐 Damage Assessment Engine:</span>
                <strong className="text-sky-700 font-bold">{aiStatus.model_name}</strong>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="text-right text-[11px] px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">TELEMETRY PULSE</div>
              <div className="text-emerald-700 font-bold font-mono text-xs flex items-center justify-end gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {telemetry.sync_percentage}% Synced ({telemetry.latency_ms}ms)
              </div>
            </div>

            <div className="text-right text-[11px] px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">SENSOR CLOUD COV.</div>
              <div className="text-sky-700 font-bold font-mono text-xs">
                {`< ${cloudStatus.cloud_cover}% (${cloudStatus.quality})`}
              </div>
            </div>

            <button
              onClick={handleBroadcastSITREP}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition shadow-sm"
            >
              <Radio size={14} className="animate-pulse" />
              Broadcast SITREP
            </button>

            <button
              onClick={handleExportGeoJSON}
              className="flex items-center gap-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold px-3 py-2 rounded-lg transition"
            >
              <FileDown size={14} />
              GeoJSON / CAD
            </button>
          </div>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {KPI_CARDS.map((m, i) => (
          <div
            key={i}
            className={`bg-white border rounded-xl p-3 transition shadow-sm ${
              m.highlight ? 'border-red-300 bg-red-50/40 ring-1 ring-red-200' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{m.label}</span>
              <m.icon size={16} className={m.color} />
            </div>
            <div className={`text-xl font-bold font-mono ${m.highlight ? 'text-red-600' : 'text-slate-900'}`}>
              {m.value}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 truncate font-medium">{m.sublabel}</div>
          </div>
        ))}
      </div>

      {/* LIVE DRONE RECONNAISSANCE & AERIAL FLEET TELEMETRY SECTION */}
      <div className="bg-slate-900 text-white border border-slate-800 rounded-xl p-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-3 border-b border-slate-800 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-600/30 border border-sky-500 flex items-center justify-center text-sky-400">
              <Plane className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                  LIVE DRONE-BASED RECONNAISSANCE & SENSOR TELEMETRY
                </h2>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold rounded">
                  {activeScenario.drones.length} UAVs ACTIVE IN THEATER
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Real-time optical video feeds, FLIR thermal imaging, and LiDAR bathymetric water clearance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/command/drone-recon')}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow"
            >
              <span>Open 3D Drone Recon HUD</span>
              <ExternalLink size={13} />
            </button>
            <button
              onClick={() => navigate('/command/routes')}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow"
            >
              <span>Route Optimization</span>
              <Navigation2 size={13} />
            </button>
          </div>
        </div>

        {/* Active Drone Units Roster */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
          {activeScenario.drones.map(drone => {
            const isSelected = drone.id === selectedDroneId;
            return (
              <div
                key={drone.id}
                onClick={() => setSelectedDroneId(drone.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-slate-800 border-sky-500 ring-2 ring-sky-400/40'
                    : 'bg-slate-800/50 border-slate-700/80 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    🛸 {drone.callsign}
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 bg-sky-950 text-sky-300 rounded border border-sky-800">
                    {drone.status}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 truncate mb-2">{drone.sector}</div>

                <div className="grid grid-cols-3 gap-1.5 text-center bg-slate-900/80 p-2 rounded border border-slate-800 font-mono text-[11px]">
                  <div>
                    <div className="text-[9px] text-slate-500">ALT</div>
                    <div className="font-bold text-sky-400">{drone.altitudeM}m</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-500">SPEED</div>
                    <div className="font-bold text-white">{drone.speedKmh} km/h</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-500">BATTERY</div>
                    <div className="font-bold text-emerald-400">{drone.battery}%</div>
                  </div>
                </div>

                <div className="mt-2 text-[10px] text-slate-300 bg-slate-950/60 p-1.5 rounded border border-slate-800/80">
                  <span className="text-sky-400 font-bold">Payload:</span> {drone.sensor}
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Drone HUD Stream & AI Detections Card */}
        {activeDrone && (
          <div className="mt-3.5 bg-slate-950 border border-slate-800 rounded-xl p-3.5 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            {/* Live Simulated HUD View (7 cols) */}
            <div className="lg:col-span-7 relative h-56 rounded-lg overflow-hidden border border-slate-700 bg-black flex flex-col justify-between p-3">
              {/* HUD Header */}
              <div className="flex items-center justify-between text-[11px] font-mono z-10">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-red-600 text-white font-bold rounded animate-pulse text-[10px]">
                    ● LIVE UAV FEED
                  </span>
                  <span className="text-white font-bold">{activeDrone.callsign}</span>
                  <span className="text-slate-400">[{activeDrone.pos[0].toFixed(4)}°N, {activeDrone.pos[1].toFixed(4)}°E]</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {(['THERMAL', 'OPTICAL', 'LIDAR'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setDroneHudMode(mode)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition ${
                        droneHudMode === mode ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* HUD Reticle & Crosshair Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-80">
                <div className={`w-32 h-32 rounded-full border border-dashed flex items-center justify-center ${
                  droneHudMode === 'THERMAL' ? 'border-red-500/70' : 'border-sky-400/70'
                }`}>
                  <Crosshair className={`w-8 h-8 ${droneHudMode === 'THERMAL' ? 'text-red-400' : 'text-sky-300'}`} />
                </div>

                {/* AI Detection Bounding Boxes */}
                <div className="absolute top-12 left-16 border-2 border-red-500 bg-red-500/10 px-2 py-1 text-[10px] font-mono text-red-300 rounded font-bold animate-pulse">
                  [PERSON: 14 SURVIVORS • 98.4% CONF]
                </div>
                <div className="absolute bottom-12 right-20 border-2 border-amber-500 bg-amber-500/10 px-2 py-1 text-[10px] font-mono text-amber-300 rounded font-bold">
                  [SURFACE WATER: 1.15m CRITICAL CUTOFF]
                </div>
              </div>

              {/* HUD Background Shader */}
              <div className={`absolute inset-0 opacity-40 transition-colors pointer-events-none ${
                droneHudMode === 'THERMAL' 
                  ? 'bg-gradient-to-tr from-slate-950 via-red-950 to-amber-950' 
                  : droneHudMode === 'LIDAR'
                    ? 'bg-gradient-to-tr from-slate-950 via-emerald-950 to-teal-900'
                    : 'bg-gradient-to-tr from-slate-950 via-sky-950 to-slate-900'
              }`} />

              {/* HUD Bottom Telemetry */}
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 z-10 border-t border-white/10 pt-1.5">
                <span>GIMBAL: PITCH -34° | ROLL 0.0°</span>
                <span className="text-emerald-400 font-bold">FLIR RESOLUTION: 1280x720 60FPS</span>
                <span>RANGE: 4.2 KM</span>
              </div>
            </div>

            {/* AI Target Detections Manifest (5 cols) */}
            <div className="lg:col-span-5 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <span className="text-xs font-bold text-sky-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <Activity size={14} className="text-sky-400 animate-pulse" />
                  CURRENT DRONE DETECTIONS & TRIAGE
                </span>
                <span className="text-[10px] text-slate-500 font-mono">SECTOR: {activeScenario.badge.split(' ')[1]}</span>
              </div>

              <div className="space-y-2 text-xs">
                {activeDrone.detections.map((det, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-start gap-2 text-slate-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0 animate-pulse"></span>
                    <span className="leading-snug">{det}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => navigate('/command/routes')}
                  className="flex-1 py-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
                >
                  <Navigation2 size={13} />
                  <span>Navigate Route to Survivors</span>
                </button>
                <button
                  onClick={handleBroadcastSITREP}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition"
                >
                  Log SITREP
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MAP + ALERTS PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* MAP CANVAS (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
          {/* Layer Toggle Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 border-b border-slate-200 bg-slate-50 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 font-mono uppercase mr-1">LAYERS:</span>
              {[
                { key: 'places', label: `🏘️ Towns & Villages (${activeScenario.places.length})`, color: '#dc2626' },
                { key: 'flood', label: 'Flood Extent (NDWI)', color: '#0284c7' },
                { key: 'drones', label: `Live Drones (${activeScenario.drones.length})`, color: '#38bdf8' },
                { key: 'survivors', label: `Survivors (${activeScenario.survivorPoints.length})`, color: '#ef4444' },
                { key: 'roads', label: 'Blocked Road Cuts', color: '#dc2626' },
                { key: 'hazards', label: 'Hazard Badges', color: '#f97316' },
              ].map(l => {
                const active = !!layerVisibility[l.key];
                return (
                  <button
                    key={l.key}
                    onClick={() => toggleLayer(l.key)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition ${
                      active
                        ? 'bg-sky-50 text-sky-800 border-sky-300 shadow-sm'
                        : 'bg-white text-slate-400 border-slate-200 opacity-60'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
                    {l.label}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                setFocusedPlace(null);
                setSitrepNotification('Re-centering map to all disaster places');
                setTimeout(() => setSitrepNotification(null), 2500);
              }}
              title="Fit map to all affected places"
              className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded font-bold text-[11px] flex items-center gap-1 shadow-sm"
            >
              <LocateFixed size={12} className="text-sky-600" />
              <span>Fit Places</span>
            </button>
          </div>

          {/* Leaflet Map with smooth camera positioning */}
          <div className="h-[480px] relative">
            <MapContainer
              center={activeScenario.center}
              zoom={activeScenario.zoom}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <DashboardMapController 
                center={focusedPlace ? focusedPlace.pos : activeScenario.center} 
                zoom={focusedPlace ? 14 : activeScenario.zoom}
                bounds={focusedPlace ? undefined : placeBounds}
              />

              <TileLayer
                attribution='&copy; OpenStreetMap &copy; Esri'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Flood Polygon Layer */}
              {layerVisibility.flood && activeScenario.floodPolygon && (
                <Polygon
                  positions={activeScenario.floodPolygon}
                  pathOptions={{
                    color: '#0284c7',
                    fillColor: '#38bdf8',
                    fillOpacity: 0.28,
                    weight: 2,
                    dashArray: '5, 5'
                  }}
                >
                  <Popup>
                    <div className="p-2 text-xs">
                      <strong className="text-sky-700">MNDWI High Water Saturation Zone</strong><br />
                      Active Flood Crest: +2.8m above base datum<br />
                      Surface Area: {activeScenario.kpis.floodedArea.value}
                    </div>
                  </Popup>
                </Polygon>
              )}

              {/* Blocked Road Cuts */}
              {layerVisibility.roads && activeScenario.blockedRoadSegments.map((seg, idx) => (
                <Polyline
                  key={idx}
                  positions={seg}
                  pathOptions={{ color: '#dc2626', weight: 4, dashArray: '6, 6' }}
                >
                  <Popup>
                    <div className="p-2 text-xs">
                      <strong className="text-red-600">Road Severed by Flood / Landslide</strong><br />
                      Status: Impassable for standard vehicles. Detour calculated.
                    </div>
                  </Popup>
                </Polyline>
              ))}

              {/* AFFECTED PLACES & TOWNS (Explicitly requested by user) */}
              {layerVisibility.places && activeScenario.places.map(place => (
                <Marker
                  key={place.id}
                  position={place.pos}
                  icon={createPlaceMarkerIcon(place.name, place.tier, place.depth)}
                  eventHandlers={{ click: () => setFocusedPlace(place) }}
                >
                  <Popup>
                    <div className="p-2.5 text-xs min-w-[240px]">
                      <div className="flex items-center justify-between mb-1">
                        <strong className="text-sm font-bold text-slate-900">{place.name}</strong>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          place.tier === 'HIGH' ? 'bg-red-100 text-red-700' : place.tier === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {place.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mb-2">District: {place.district} • GPS [{place.pos[0]}, {place.pos[1]}]</div>
                      
                      <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px] mb-2 bg-slate-50 p-2 rounded border border-slate-200">
                        <div>Water Depth: <strong className="text-red-600">{place.depth}</strong></div>
                        <div>Stranded: <strong className="text-slate-900">{place.stranded} Civilians</strong></div>
                        <div>Population: <strong>{place.population.toLocaleString()}</strong></div>
                        <div>Risk Tier: <strong>{place.tier}</strong></div>
                      </div>

                      <p className="text-[11px] text-slate-600 mb-2.5 leading-snug">{place.hazardReason}</p>

                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/command/routes?dest=${encodeURIComponent(place.name)}&lat=${place.pos[0]}&lng=${place.pos[1]}`)}
                          className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-bold py-1.5 px-2 rounded text-[11px] flex items-center justify-center gap-1 shadow-sm"
                        >
                          <Navigation size={12} />
                          <span>Calculate Route</span>
                        </button>
                        <button
                          onClick={() => navigate('/command/drone-recon')}
                          className="px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-1.5 rounded text-[11px] border border-slate-200"
                        >
                          Drone HUD
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Live Drones on Map */}
              {layerVisibility.drones && activeScenario.drones.map(drone => (
                <div key={drone.id}>
                  {/* Scan Cone */}
                  <Circle
                    center={drone.pos}
                    radius={350}
                    pathOptions={{ color: '#38bdf8', fillColor: '#38bdf8', fillOpacity: 0.12, weight: 1 }}
                  />
                  <Marker
                    position={drone.pos}
                    icon={createDroneMarkerIcon(drone.callsign, drone.id === selectedDroneId)}
                    eventHandlers={{ click: () => setSelectedDroneId(drone.id) }}
                  >
                    <Popup>
                      <div className="p-2 text-xs">
                        <strong className="text-sky-600">🛸 UAV {drone.callsign}</strong> ({drone.model})<br />
                        Altitude: <strong>{drone.altitudeM}m</strong> | Speed: <strong>{drone.speedKmh} km/h</strong><br />
                        Sensor: <strong>{drone.sensor}</strong><br />
                        Battery: <strong className="text-emerald-600">{drone.battery}%</strong><br />
                        <button
                          onClick={() => navigate('/command/drone-recon')}
                          className="mt-1.5 w-full bg-sky-600 text-white font-bold py-1 px-2 rounded text-[10px]"
                        >
                          Open Drone Recon Flight HUD →
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                </div>
              ))}

              {/* Drone-Detected Survivor Pins */}
              {layerVisibility.survivors && activeScenario.survivorPoints.map(sp => (
                <Marker key={sp.id} position={sp.pos} icon={createSurvivorMarkerIcon(sp.count)}>
                  <Popup>
                    <div className="p-2.5 text-xs min-w-[220px]">
                      <div className="font-bold text-red-600 text-sm mb-1">🚨 {sp.name}</div>
                      <div className="text-slate-600 mb-2">{sp.description}</div>
                      <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px] mb-2 bg-slate-50 p-1.5 rounded">
                        <div>Water Depth: <strong>{sp.depthM}m</strong></div>
                        <div>Urgency: <strong className="text-red-600">{sp.urgency}</strong></div>
                      </div>
                      <button
                        onClick={() => navigate('/command/routes')}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-2 rounded text-[11px] flex items-center justify-center gap-1"
                      >
                        <Navigation2 size={12} />
                        <span>Navigate Optimal Evacuation Route</span>
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Hazard Badges */}
              {layerVisibility.hazards && activeScenario.hazardPoints.map(hp => (
                <Marker key={hp.id} position={hp.pos} icon={createHazardPointIcon(hp.label)}>
                  <Popup>
                    <div className="p-2 text-xs">
                      <strong className="text-orange-600">⚠️ {hp.label}</strong><br />
                      {hp.detail}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>

            {/* Coordinate Badge */}
            <div className="absolute bottom-2 left-2 bg-slate-900/85 backdrop-blur text-white text-[10px] rounded px-2.5 py-1 z-[1000] flex items-center gap-3 font-mono">
              <span>📍 {activeScenario.center[0].toFixed(4)}°N, {activeScenario.center[1].toFixed(4)}°E</span>
              <span>•</span>
              <span className="text-sky-300 font-bold">{activeScenario.region.split('•')[0]}</span>
            </div>
          </div>

          {/* Map Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 border-t border-slate-200 text-[11px] text-slate-500 bg-slate-50">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-red-600 font-semibold">
                <span className="w-2 h-2 rounded-full bg-red-500" /> High Inundation Towns
              </span>
              <span className="flex items-center gap-1 text-amber-600 font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Downstream Alerts
              </span>
              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Safe High Havens
              </span>
            </div>
            <div className="font-mono text-[10px]">
              Multi-Source Sensor Fusion: ESA Sentinel-2 MSI + UAV FLIR Thermal Array
            </div>
          </div>
        </div>

        {/* ALERTS & TACTICAL FEED (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl flex flex-col shadow-sm">
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Emergency Alerts & Feed
              </h3>
              <span className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded">
                {unreadCount} Unread
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">LIVE INGEST</span>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-1 px-3 pt-2.5 pb-1">
            {(['all', 'critical', 'tactical'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                  activeTab === tab 
                    ? 'bg-sky-100 text-sky-800' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab === 'all'
                  ? `All Feeds (${alerts.length})`
                  : tab === 'critical'
                    ? `Critical (${alerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH_SURGE').length})`
                    : 'Tactical UAV'}
              </button>
            ))}
          </div>

          {/* Alerts Scrollable Feed */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 max-h-[380px]">
            {filteredAlerts.map(alert => (
              <div
                key={alert.id}
                className="border border-slate-200 hover:border-slate-300 rounded-lg p-3 bg-slate-50/50 hover:bg-white transition"
              >
                <div className="flex items-center justify-between mb-1">
                  <AlertSeverityBadge severity={alert.severity} />
                  <span className="text-[10px] font-mono text-slate-400">{alert.timestamp}</span>
                </div>

                <h4 className="text-xs font-bold text-slate-900 mb-1">{alert.title}</h4>
                <p className="text-[11px] text-slate-600 leading-snug mb-2">{alert.description}</p>

                {alert.coordinates && (
                  <div className="text-[10px] text-slate-400 font-mono mb-2">Coord: {alert.coordinates}</div>
                )}

                {alert.actions && alert.actions.length > 0 && (
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                    {alert.actions.map((act, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          if (act.label.includes('Route')) {
                            navigate('/command/routes');
                          } else if (act.label.includes('Rescue') || act.label.includes('Dispatch')) {
                            navigate('/command/routes');
                          }
                        }}
                        className={`text-[10px] font-bold px-2 py-1 rounded transition ${
                          act.type === 'primary'
                            ? 'bg-sky-600 text-white hover:bg-sky-700'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        {act.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Tactical Command Input */}
          <div className="border-t border-slate-200 p-2.5 bg-slate-50">
            {commandFeedback && (
              <div className="text-[10px] text-emerald-700 font-semibold mb-1.5 flex items-center gap-1">
                <CheckCircle2 size={12} className="text-emerald-600" />
                {commandFeedback}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={commandInput}
                onChange={e => setCommandInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSendCommand(); }}
                placeholder="Dispatch drone command (e.g. Eagle-1 fly to waypoint)"
                className="flex-1 h-8 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-sky-500 transition bg-white"
              />
              <button
                onClick={handleSendCommand}
                className="w-8 h-8 bg-sky-600 hover:bg-sky-700 text-white rounded-lg flex items-center justify-center transition shadow-sm"
              >
                <Send size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AFFECTED VILLAGES & DISASTER PLACES DIRECTORY (EXPLICIT USER REQUIREMENT) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        {/* PRIORITY 1: UNMISSABLE TABLE BANNER — ALWAYS VISIBLE REGARDLESS OF DRILL/CLEAR TOGGLE */}
        <div className="mb-3.5 px-4 py-2.5 bg-amber-500 border-2 border-amber-700 rounded-lg flex items-center justify-between text-slate-950 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 bg-black text-amber-400 font-mono font-black text-[11px] rounded tracking-wider uppercase">
              NOTICE
            </span>
            <span className="text-xs font-black text-slate-950">
              SIMULATED SCENARIO DATA — NOT LIVE: Stranded civilian numbers and flood water levels are mock training drill figures. Do not use for real-life operational dispatch.
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold text-amber-950 uppercase hidden md:inline">
            DRILL ID: SIM-NP-2026
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-2.5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Home className="w-4 h-4 text-red-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Affected Villages & Disaster Places Directory ({activeScenario.places.length} Monitored Places)
              </h3>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold tracking-wide">
                REAL GIS GEOGRAPHY
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide border ${
                scenarioMode === 'DRILL'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}>
                {scenarioMode === 'DRILL' ? 'DATA: TACTICAL FLOOD DRILL' : 'DATA: NORMAL / CLEAR CONDITIONS'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Authentic Himalayan settlements & OSRM road graph. Toggle below between Active Flood Simulation (to test rescue routing) and Normal Baseline.
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs flex-wrap">
            {/* Simulation vs Clear Reality Mode Switcher */}
            <div className="flex rounded-lg border border-slate-300 p-0.5 bg-slate-100">
              <button
                onClick={() => setScenarioMode('DRILL')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                  scenarioMode === 'DRILL'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🌊 Flood Drill Mode
              </button>
              <button
                onClick={() => setScenarioMode('CLEAR')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                  scenarioMode === 'CLEAR'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ☀️ Normal Clear Mode
              </button>
            </div>

            <span className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg font-bold">
              {scenarioMode === 'CLEAR' ? 0 : activeScenario.places.filter(p => p.tier === 'HIGH').length} Critical Risk
            </span>
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-bold">
              {scenarioMode === 'CLEAR' ? activeScenario.places.length : activeScenario.places.filter(p => p.tier === 'SAFE').length} Safe
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                <th className="pb-2.5">VILLAGE / PLACE NAME</th>
                <th className="pb-2.5">DISTRICT / REGION</th>
                <th className="pb-2.5">GPS COORDINATES</th>
                <th className="pb-2.5">WATER DEPTH</th>
                <th className="pb-2.5">STRANDED CIVILIANS</th>
                <th className="pb-2.5">RISK TIER</th>
                <th className="pb-2.5">DRONE SURVEILLANCE HAZARD REASON</th>
                <th className="pb-2.5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeScenario.places.map(place => {
                const isFocused = focusedPlace?.id === place.id;
                return (
                  <tr
                    key={place.id}
                    onClick={() => setFocusedPlace(place)}
                    className={`hover:bg-sky-50/70 transition cursor-pointer ${
                      isFocused ? 'bg-sky-50 font-semibold' : ''
                    }`}
                  >
                    <td className="py-2.5">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          place.tier === 'HIGH' ? 'bg-red-600 animate-pulse' : place.tier === 'MEDIUM' ? 'bg-amber-500' : 'bg-emerald-600'
                        }`} />
                        <span>{place.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{place.status}</div>
                    </td>
                    <td className="py-2.5 text-slate-600 font-medium">{place.district}</td>
                    <td className="py-2.5 font-mono text-slate-500">
                      [{place.pos[0].toFixed(4)}, {place.pos[1].toFixed(4)}]
                    </td>
                    <td className="py-2.5 font-mono font-bold">
                      <span className={place.depthM > 1.0 ? 'text-red-600' : place.depthM > 0.3 ? 'text-amber-600' : 'text-emerald-600'}>
                        {place.depth}
                      </span>
                    </td>
                    <td className="py-2.5 font-mono">
                      <strong className={place.stranded > 0 ? 'text-red-700 font-bold' : 'text-slate-500'}>
                        {place.stranded} Civilians
                      </strong>
                    </td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        place.tier === 'HIGH' ? 'bg-red-100 text-red-700 border border-red-200' : place.tier === 'MEDIUM' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      }`}>
                        {place.tier}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-600 text-[11px] max-w-xs truncate">
                      {place.hazardReason}
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFocusedPlace(place);
                          }}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-sky-100 text-slate-700 hover:text-sky-700 font-bold text-[10px] transition"
                        >
                          Focus
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/command/routes?dest=${encodeURIComponent(place.name)}&lat=${place.pos[0]}&lng=${place.pos[1]}`);
                          }}
                          className="px-2 py-1 rounded bg-sky-600 hover:bg-sky-700 text-white font-bold text-[10px] flex items-center gap-0.5 transition shadow-sm"
                        >
                          <Navigation size={10} />
                          <span>Route</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ACTIVE DISASTER EVENTS REGISTRY TABLE */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Active Disaster Events Registry</h3>
            <p className="text-xs text-slate-500">
              Click any disaster scenario row to switch the active operational command theater.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="text-xs text-slate-600 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-50 transition flex items-center gap-1 font-semibold"
            >
              <RefreshCw size={12} className={isSyncing ? 'animate-spin text-sky-600' : ''} />
              {isSyncing ? 'Syncing...' : '↻ Sync Sensors'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                <th className="pb-2.5">THEATER ID & NAME</th>
                <th className="pb-2.5">GEOGRAPHIC REGION</th>
                <th className="pb-2.5">COORDINATES</th>
                <th className="pb-2.5">FLOOD AFFECTED AREA</th>
                <th className="pb-2.5">ACTIVE DRONES</th>
                <th className="pb-2.5">SEVERITY</th>
                <th className="pb-2.5">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {DISASTER_SCENARIOS.map(sc => {
                const isSelected = sc.id === activeScenario.id;
                return (
                  <tr
                    key={sc.id}
                    onClick={() => handleSelectDisaster(sc.id)}
                    className={`hover:bg-sky-50/60 transition cursor-pointer ${
                      isSelected ? 'bg-sky-50/80 font-semibold' : ''
                    }`}
                  >
                    <td className="py-3">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        {isSelected && <span className="w-2 h-2 rounded-full bg-sky-600 animate-pulse" />}
                        <span>{sc.badge}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{sc.id}</div>
                    </td>
                    <td className="py-3 text-slate-600">{sc.region}</td>
                    <td className="py-3 font-mono text-slate-500">
                      {sc.center[0].toFixed(3)}°N, {sc.center[1].toFixed(3)}°E
                    </td>
                    <td className="py-3 font-mono font-bold text-slate-800">
                      {sc.kpis.floodedArea.value}
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 bg-sky-100 text-sky-800 font-bold rounded text-[10px] font-mono">
                        {sc.drones.length} UAVs
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        sc.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {sc.severity}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectDisaster(sc.id);
                        }}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                          isSelected
                            ? 'bg-sky-600 text-white'
                            : 'border border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected ? 'Active' : 'Switch Theater'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-3 text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-100">
          <span>Active Theaters: {DISASTER_SCENARIOS.length} monitored • Last sensor sync: {lastSynced}</span>
          <button
            onClick={() => navigate('/command/drone-recon')}
            className="text-sky-600 hover:text-sky-800 font-bold flex items-center gap-1"
          >
            <span>Launch Tactical Drone Recon Matrix</span>
            <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
