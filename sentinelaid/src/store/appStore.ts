import { create } from 'zustand';

export interface OperationCoords {
  lat: number;
  lng: number;
  zoom: number;
}

export function resolveOperationCoords(id?: string, bbox?: any, region?: string, name?: string): OperationCoords {
  let b = bbox;
  if (typeof b === 'string') {
    try {
      b = JSON.parse(b);
      if (typeof b === 'string') b = JSON.parse(b);
    } catch {}
  }
  if (b && typeof b === 'object' && b.min_lat != null && b.max_lat != null && b.min_lon != null && b.max_lon != null) {
    const lat = (Number(b.min_lat) + Number(b.max_lat)) / 2;
    const lng = (Number(b.min_lon) + Number(b.max_lon)) / 2;
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      return { lat: +lat.toFixed(5), lng: +lng.toFixed(5), zoom: 13 };
    }
  }

  const key = `${id || ''} ${region || ''} ${name || ''}`.toUpperCase();
  if (key.includes('PAK') || key.includes('INDUS') || key.includes('SINDH') || key.includes('MANCHAR')) {
    return { lat: 27.5000, lng: 68.3500, zoom: 12 };
  }
  if (key.includes('NEPAL') || key.includes('KATHMANDU') || key.includes('BAGMATI') || key.includes('NPL') || key.includes('TRISHULI')) {
    return { lat: 27.7172, lng: 85.3240, zoom: 13 };
  }
  if (key.includes('WAYANAD') || key.includes('KERALA') || key.includes('CHOORALMALA') || key.includes('MEPPADI')) {
    return { lat: 11.5350, lng: 76.1500, zoom: 13 };
  }
  if (key.includes('LBY') || key.includes('LIBYA') || key.includes('DERNA')) {
    return { lat: 32.7600, lng: 22.6400, zoom: 13 };
  }
  if (key.includes('FENI') || key.includes('MUHURI')) {
    return { lat: 23.0250, lng: 91.4000, zoom: 13 };
  }
  if (key.includes('SYLHET') || key.includes('OP-FL88')) {
    return { lat: 24.9000, lng: 91.8650, zoom: 13 };
  }
  if (key.includes('ASSAM') || key.includes('BRAHMAPUTRA')) {
    return { lat: 26.1550, lng: 91.7350, zoom: 13 };
  }
  if (key.includes('RAJAM') || key.includes('SRIKAKULAM') || key.includes('VIZIANAGARAM')) {
    return { lat: 18.4500, lng: 83.6500, zoom: 13 };
  }
  if (key.includes('REMAL') || key.includes('DELTA') || key.includes('BAY AREA') || key.includes('BGD')) {
    return { lat: 21.8450, lng: 89.5450, zoom: 13 };
  }

  return { lat: 21.8450, lng: 89.5450, zoom: 13 };
}

interface AppState {
  sidebarCollapsed: boolean;
  sidebarHovered: boolean;
  activeOperationId: string;
  activeDisasterContext: string;
  activeOperationData: any;
  activeOperationBBox: any;
  activeOperationCoords: OperationCoords;
  systemStatus: 'OPERATIONAL' | 'DEGRADED' | 'OFFLINE';
  satelliteStatus: 'LIVE' | 'SYNCING' | 'OFFLINE';
  threatLevel: { level: number; label: string };
  satelliteStream: { status: string; label: string; provider: string };
  telemetry: { sync_percentage: number; latency_ms: number; status: string };
  aiEngineStatus: 'ONLINE' | 'PROCESSING' | 'OFFLINE';
  notifications: number;
  refreshTrigger: number;
  toggleSidebar: () => void;
  setSidebarHovered: (hovered: boolean) => void;
  setActiveOperation: (id: string, name?: string, region?: string, bbox?: any, opData?: any) => void;
  setThreatLevel: (tl: { level: number; label: string }) => void;
  setSatelliteStream: (st: { status: string; label: string; provider: string }) => void;
  setTelemetry: (t: { sync_percentage: number; latency_ms: number; status: string }) => void;
  setNotifications: (count: number) => void;
  triggerRefresh: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  sidebarHovered: false,
  activeOperationId: 'CY-2025-05B',
  activeDisasterContext: 'Cyclone Remal - Bay Area / Delta Sector 4',
  activeOperationData: null,
  activeOperationBBox: null,
  activeOperationCoords: { lat: 21.8450, lng: 89.5450, zoom: 13 },
  systemStatus: 'OPERATIONAL',
  satelliteStatus: 'OFFLINE',
  threatLevel: { level: 4, label: 'CRITICAL' },
  satelliteStream: { status: 'NOT_CHECKED', label: 'Not checked', provider: 'Microsoft Planetary Computer' },
  telemetry: { sync_percentage: 0, latency_ms: 0, status: 'NOT_MEASURED' },
  aiEngineStatus: 'OFFLINE',
  notifications: 4,
  refreshTrigger: 0,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarHovered: (hovered) => set({ sidebarHovered: hovered }),
  setActiveOperation: (id, name, region, bbox, opData) => {
    const rawBbox = bbox || opData?.target_bbox;
    const coords = resolveOperationCoords(id, rawBbox, region, name);
    set({
      activeOperationId: id,
      activeDisasterContext: name && region ? `${name} - ${region}` : name || id,
      activeOperationData: opData || { id, name, region, target_bbox: rawBbox },
      activeOperationBBox: rawBbox,
      activeOperationCoords: coords,
    });
  },
  setThreatLevel: (threatLevel) => set({ threatLevel }),
  setSatelliteStream: (satelliteStream) => set({ satelliteStream }),
  setTelemetry: (telemetry) => set({ telemetry }),
  setNotifications: (notifications) => set({ notifications }),
  triggerRefresh: () => set((s) => ({ refreshTrigger: s.refreshTrigger + 1 })),
}));
