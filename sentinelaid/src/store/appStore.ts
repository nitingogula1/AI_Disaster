import { create } from 'zustand';

interface AppState {
  sidebarCollapsed: boolean;
  sidebarHovered: boolean;
  activeOperationId: string;
  activeDisasterContext: string;
  activeOperationData: any;
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
  setActiveOperation: (id: string, name?: string, region?: string) => void;
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
  systemStatus: 'OPERATIONAL',
  satelliteStatus: 'LIVE',
  threatLevel: { level: 4, label: 'CRITICAL' },
  satelliteStream: { status: 'ONLINE', label: 'Live', provider: 'Microsoft Planetary Computer' },
  telemetry: { sync_percentage: 100, latency_ms: 12, status: 'SYNCED' },
  aiEngineStatus: 'ONLINE',
  notifications: 4,
  refreshTrigger: 0,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarHovered: (hovered) => set({ sidebarHovered: hovered }),
  setActiveOperation: (id, name, region) =>
    set({
      activeOperationId: id,
      activeDisasterContext: name && region ? `${name} - ${region}` : name || id,
    }),
  setThreatLevel: (threatLevel) => set({ threatLevel }),
  setSatelliteStream: (satelliteStream) => set({ satelliteStream }),
  setTelemetry: (telemetry) => set({ telemetry }),
  setNotifications: (notifications) => set({ notifications }),
  triggerRefresh: () => set((s) => ({ refreshTrigger: s.refreshTrigger + 1 })),
}));
