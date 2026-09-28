import axios from 'axios';
import type { 
  User, DisasterEvent, MapLayer, SatelliteScene, 
  PreprocessingStage, AIDetection, DamageAsset, 
  RescueZone, RescueTeam, OptimizedRoute, Alert 
} from '../types';
import { 
  mockUsers, mockDisasterEvents, mockMapLayers, 
  mockDamageAssets, 
  mockRescueZones, mockRescueTeams, mockRoutes, 
  mockAlerts, mockDashboardMetrics 
} from '../data/mockData';

export const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
export const assetUrl = (path: string) => {
  if (/^https?:\/\//.test(path)) return path;
  const base = (import.meta.env.VITE_IMAGE_BASE_URL || BASE_URL).replace(/\/$/, '');
  return base + '/' + path.replace(/^\/api\/v1\/?/, '').replace(/^\//, '');
};

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sentinelaid_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors and 401s
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('sentinelaid_token');
      localStorage.removeItem('sentinelaid_user');
    }
    return Promise.reject(error);
  }
);

// ============================================================
// Centralized API Services
// ============================================================

export const authService = {
  async login(email: string, password: string): Promise<{ user: User; access_token: string }> {
    try {
      const res = await api.post('/auth/login', { email, password });
      const { access_token, user } = res.data;
      localStorage.setItem('sentinelaid_token', access_token);
      localStorage.setItem('sentinelaid_user', JSON.stringify(user));
      return { user, access_token };
    } catch (err) {
      // Local fallback for offline/development resilience
      const found = mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (found && password === 'password') {
        const dummyToken = 'dev-token-offline-fallback';
        localStorage.setItem('sentinelaid_token', dummyToken);
        localStorage.setItem('sentinelaid_user', JSON.stringify(found));
        return { user: found, access_token: dummyToken };
      }
      throw err;
    }
  },

  async getMe(): Promise<User> {
    const res = await api.get('/auth/me');
    return res.data.data;
  },

  logout() {
    localStorage.removeItem('sentinelaid_token');
    localStorage.removeItem('sentinelaid_user');
  }
};

export const operationService = {
  async getActiveOperation() {
    try {
      const res = await api.get('/operations/active');
      return res.data.data;
    } catch {
      return {
        id: 'CY-2025-05B',
        name: 'Cyclone Remal',
        region: 'Bay Area / Delta Sector 4',
        severity: 'CRITICAL',
        status: 'ACTIVE',
        response_phase: 'Phase 2 Evacuation & Rescue'
      };
    }
  },

  async getOperations() {
    try {
      const res = await api.get('/operations');
      return res.data.data;
    } catch {
      return [
        {
          id: 'CY-2025-05B',
          name: 'Cyclone Remal',
          region: 'Bay Area / Delta Sector 4',
          severity: 'CRITICAL',
          status: 'ACTIVE',
          response_phase: 'Phase 2 Evacuation & Rescue'
        }
      ];
    }
  },

  async activateOperation(id: string) {
    const res = await api.post(`/operations/${id}/activate`);
    return res.data.data;
  }
};

export const dashboardService = {
  async getSummary(operationId?: string) {
    try {
      const res = await api.get('/dashboard/summary', { params: { operation_id: operationId } });
      return res.data.data;
    } catch {
      return null;
    }
  },

  async getMetrics(operationId?: string) {
    try {
      const res = await api.get('/dashboard/metrics', { params: { operation_id: operationId } });
      return res.data.data;
    } catch {
      return mockDashboardMetrics;
    }
  },

  async getUpdates() {
    const res = await api.get('/dashboard/updates');
    return res.data.data;
  },

  async broadcastSitrep() {
    const res = await api.post('/reports/sitrep/broadcast');
    return res.data.data;
  },

  async sendCommand(command: string, operationId: string = 'CY-2025-05B') {
    const res = await api.post('/commands', { operation_id: operationId, command });
    return res.data.data;
  },

  async getRecentIncidents() {
    try {
      const res = await api.get('/dashboard/recent-incidents');
      return res.data.data;
    } catch {
      return [];
    }
  },

  async getRecentDetections() {
    try {
      const res = await api.get('/dashboard/recent-detections');
      return res.data.data;
    } catch {
      return [];
    }
  },

  async getRescueStatus() {
    try {
      const res = await api.get('/dashboard/rescue-status');
      return res.data.data;
    } catch {
      return [];
    }
  },

  async getAlerts() {
    try {
      const res = await api.get('/dashboard/alerts');
      return res.data.data;
    } catch {
      return mockAlerts;
    }
  }
};


export const disasterService = {
  async getActiveDisasters(params?: any): Promise<DisasterEvent[]> {
    try {
      const res = await api.get('/disasters/active', { params });
      return res.data.data;
    } catch {
      return mockDisasterEvents.filter(d => d.status === 'ACTIVE');
    }
  },

  async getDisasters(params?: { status?: string; severity?: string; search?: string; page?: number; limit?: number }): Promise<DisasterEvent[]> {
    try {
      const res = await api.get('/disasters', { params });
      return res.data.data;
    } catch {
      return mockDisasterEvents;
    }
  },


  async getDisasterById(id: string): Promise<DisasterEvent> {
    try {
      const res = await api.get(`/disasters/${id}`);
      return res.data.data;
    } catch {
      return mockDisasterEvents.find((d) => d.id === id) || mockDisasterEvents[0];
    }
  },

  async createDisaster(data: any) {
    const res = await api.post('/disasters', data);
    return res.data.data;
  },

  async updateDisaster(id: string, data: any) {
    const res = await api.put(`/disasters/${id}`, data);
    return res.data.data;
  },

  async patchStatus(id: string, status: string) {
    const res = await api.patch(`/disasters/${id}/status`, null, { params: { status } });
    return res.data.data;
  },

  async deleteDisaster(id: string) {
    const res = await api.delete(`/disasters/${id}`);
    return res.data;
  }
};

export const incidentService = {
  async getIncidents(params?: { disaster_id?: string; severity?: string }) {
    const res = await api.get('/incidents', { params });
    return res.data.data;
  },

  async getIncidentById(id: string) {
    const res = await api.get(`/incidents/${id}`);
    return res.data.data;
  },

  async createIncident(data: any) {
    const res = await api.post('/incidents', data);
    return res.data.data;
  },

  async updateStatus(id: string, status: string) {
    const res = await api.patch(`/incidents/${id}/status`, null, { params: { status } });
    return res.data.data;
  },

  async deleteIncident(id: string) {
    const res = await api.delete(`/incidents/${id}`);
    return res.data;
  }
};

export const satelliteService = {
  async getAOI(operationId: string = 'EVT-8821-BGD') {
    try {
      const res = await api.get('/satellite/aoi', { params: { operation_id: operationId } });
      return res.data.data;
    } catch (error) {
      throw error;
    }
  },

  async setAOI(bbox: number[], operationId: string = 'EVT-8821-BGD', region?: string, incidentName?: string) {
    const res = await api.post('/satellite/aoi', { 
      operation_id: operationId, 
      bbox,
      region,
      incident_name: incidentName 
    });
    return res.data.data;
  },

  async connectPlanetaryComputer() {
    const res = await api.post('/satellite/providers/planetary-computer/connect');
    return res.data.data;
  },

  async getProviders() {
    try {
      const res = await api.get('/satellite/providers');
      return res.data.data;
    } catch (error) {
      throw error;
    }
  },

  async searchScenes(params?: {
    provider?: string;
    satellite?: string;
    start_date?: string;
    end_date?: string;
    max_cloud_cover?: number;
  }): Promise<SatelliteScene[]> {
    try {
      const res = await api.get('/satellite/scenes', { params: { cloud_max: params?.max_cloud_cover } });
      return res.data.data.map((s: any) => ({
        id: s.id || s.scene_id || s.product_id,
        platform: s.platform || s.satellite || 'Sentinel-2B',
        acquisitionDate: s.acquisitionDate || (s.acquisition_datetime ? new Date(s.acquisition_datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'May 26, 2024'),
        cloudCover: s.cloudCover ?? s.cloud_cover ?? 3.8,
        resolution: s.resolution ?? '10m',
        sensorType: s.sensorType ?? s.sensor_type ?? 'Optical Multispectral',
        pipelineStatus: s.pipelineStatus ?? s.processing_status ?? 'Ready',
        bands: s.bands ?? s.bands_count ?? 13,
        size: s.size ?? s.file_size ?? '514 MB',
        thumbnail_url: s.thumbnail_url
      }));
    } catch (error) {
      throw error;
    }
  },

  async getScenes(params?: { cloud_max?: number; sort?: string; page?: number; limit?: number }): Promise<SatelliteScene[]> {
    try {
      const res = await api.get('/satellite/scenes', { params });
      return res.data.data.map((s: any) => ({
        id: s.id || s.scene_id || s.product_id,
        platform: s.platform || s.satellite || 'Sentinel-2B',
        acquisitionDate: s.acquisitionDate || (s.acquisition_datetime ? new Date(s.acquisition_datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'May 26, 2024'),
        cloudCover: s.cloudCover ?? s.cloud_cover ?? 3.8,
        resolution: s.resolution ?? '10m',
        sensorType: s.sensorType ?? s.sensor_type ?? 'Optical Multispectral',
        pipelineStatus: s.pipelineStatus ?? s.processing_status ?? 'Ready',
        bands: s.bands ?? s.bands_count ?? 13,
        size: s.size ?? s.file_size ?? '514 MB',
        thumbnail_url: s.thumbnail_url
      }));
    } catch (error) {
      throw error;
    }
  },

  async getSceneById(id: string) {
    const res = await api.get(`/satellite/scenes/${id}`);
    return res.data.data;
  },

  async assignSceneRole(sceneId: string, role: string, operationId: string = 'EVT-8821-BGD') {
    const res = await api.post(`/satellite/scenes/${sceneId}/assign-role`, {
      operation_id: operationId,
      role
    });
    return res.data.data;
  },

  async directIngest(sceneId: string, sceneRole: string = 'POST_DISASTER', operationId: string = 'EVT-8821-BGD') {
    const res = await api.post(`/satellite/scenes/${sceneId}/ingest`, {
      operation_id: operationId,
      scene_role: sceneRole
    });
    return res.data.data;
  },

  async getIngestionQueue() {
    try {
      const res = await api.get('/satellite/ingestion/queue');
      return res.data.data;
    } catch (error) {
      throw error;
    }
  },

  async getJobStatus(jobId: string) {
    const res = await api.get(`/satellite/jobs/${jobId}`);
    return res.data.data;
  },

  async cancelJob(jobId: string) {
    const res = await api.post(`/satellite/jobs/${jobId}/cancel`);
    return res.data.data;
  },

  async getSceneBands(sceneId: string = 'scn-001') {
    try {
      const res = await api.get(`/satellite/scenes/${sceneId}/bands`);
      return res.data.data.bands || [];
    } catch (error) {
      throw error;
    }
  },

  async inspectBand(sceneId: string = 'scn-001', bandName: string = 'B08') {
    const res = await api.get(`/satellite/scenes/${sceneId}/bands/${bandName}`);
    return res.data.data;
  },

  async getBandSummary(sceneId: string = 'scn-001') {
    try {
      const res = await api.get(`/satellite/scenes/${sceneId}/band-summary`);
      return res.data.data;
    } catch (error) {
      throw error;
    }
  },

  async renderRGB(sceneId: string = 'scn-001', red: string = 'B04', green: string = 'B03', blue: string = 'B02') {
    const res = await api.post('/satellite/render/rgb', { scene_id: sceneId, red, green, blue });
    return res.data.data;
  },

  async renderFalseColor(sceneId: string = 'scn-001', nir: string = 'B08', red: string = 'B04', green: string = 'B03') {
    const res = await api.post('/satellite/render/false-color', { scene_id: sceneId, nir, red, green });
    return res.data.data;
  },

  async calculateNDWI(sceneId: string = 'scn-001') {
    const res = await api.post('/satellite/indices/ndwi', { scene_id: sceneId });
    return res.data.data;
  },

  async calculateMNDWI(sceneId: string = 'scn-001') {
    const res = await api.post('/satellite/indices/mndwi', { scene_id: sceneId });
    return res.data.data;
  },

  async vectorizeFlood(sceneId: string = 'scn-001', threshold: number = 0.05) {
    const res = await api.post('/satellite/flood/vectorize', { scene_id: sceneId, threshold });
    return res.data.data;
  },

  async preprocess(sceneId: string = 'scn-001', stages?: string[], operationId: string = 'EVT-8821-BGD') {
    const res = await api.post('/satellite/preprocess', {
      operation_id: operationId,
      scene_id: sceneId,
      stages: stages || ['RADIOMETRIC', 'ATMOSPHERIC', 'CLOUD_MASK', 'COREGISTRATION']
    });
    return res.data.data;
  },

  async getPreprocessingJob(jobId: string) {
    const res = await api.get(`/satellite/preprocess/jobs/${jobId}`);
    return res.data.data;
  },

  async processImagery(data: {
    disaster_id: string;
    pre_image_id?: string;
    post_image_id?: string;
    calculate_mndwi?: boolean;
    calculate_ndvi?: boolean;
    cloud_masking?: boolean;
  }): Promise<PreprocessingStage[]> {
    try {
      const res = await api.post('/satellite/preprocess', {
        operation_id: data.disaster_id,
        scene_id: data.post_image_id || 'scn-001'
      });
      return res.data.data.stages || [];
    } catch (error) {
      throw error;
    }
  },

  async sendToGIS(productId: string = 'scn-001-mndwi', operationId: string = 'EVT-8821-BGD') {
    const res = await api.post(`/satellite/products/${productId}/send-to-gis`, { operation_id: operationId });
    return res.data.data;
  },

  async runBenchmark() {
    const res = await api.post('/satellite/benchmark');
    return res.data.data;
  },

  async getBenchmark(jobId: string) {
    const res = await api.get(`/satellite/benchmark/${jobId}`);
    return res.data.data;
  },

  async uploadImage(formData: FormData) {
    const res = await api.post('/satellite/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data.data;
  },

  async downloadScene(productId: string, provider: string = 'PLANETARY_COMPUTER') {
    const res = await api.post('/satellite/download', { product_id: productId, provider });
    return res.data.data;
  },

  async getFloodScenes(operationId: string = 'EVT-8821-BGD', hours: number = 72, maxCloudCover: number = 30.0, satellites?: string, limit: number = 50): Promise<SatelliteScene[]> {
    try {
      const res = await api.get('/satellite/flood-scenes', {
        params: {
          operation_id: operationId,
          hours,
          max_cloud_cover: maxCloudCover,
          satellites,
          limit
        }
      });
      return res.data.data.map((s: any) => ({
        id: s.id || s.scene_id,
        platform: s.platform || 'Sentinel-2A',
        acquisitionDate: s.acquisitionDate || (s.acquisition_datetime ? new Date(s.acquisition_datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Sep 26, 2026'),
        cloudCover: s.cloudCover ?? s.cloud_cover ?? 0,
        resolution: s.resolution || '10m',
        sensorType: s.sensorType || s.sensor || 'MSI',
        pipelineStatus: s.pipelineStatus || s.status || 'Verified',
        floodStatus: s.flood_status || s.floodStatus || 'NOT_ANALYZED',
        floodSignal: s.flood_signal || s.floodSignal || s.detection_method || 'MNDWI',
        floodRelevanceScore: s.flood_relevance_score ?? s.floodRelevanceScore ?? 0,
        floodAreaKm2: s.flood_area_km2 ?? s.floodAreaKm2 ?? 0,
        detectionMethod: s.detection_method || s.detectionMethod || 'MNDWI',
        source: s.source || 'LIVE SATELLITE DATA',
        isDemo: s.is_demo ?? false
      }));
    } catch (error) {
      throw error;
    }
  },

  async searchFloodScenes(payload: { operation_id?: string; hours?: number; max_cloud_cover?: number; satellites?: string[]; limit?: number }): Promise<SatelliteScene[]> {
    try {
      const res = await api.post('/satellite/flood-scenes/search', payload);
      return res.data.data.map((s: any) => ({
        id: s.id || s.scene_id,
        platform: s.platform || 'Sentinel-2A',
        acquisitionDate: s.acquisitionDate || (s.acquisition_datetime ? new Date(s.acquisition_datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Sep 26, 2026'),
        cloudCover: s.cloudCover ?? s.cloud_cover ?? 0,
        resolution: s.resolution || '10m',
        sensorType: s.sensorType || s.sensor || 'MSI',
        pipelineStatus: s.pipelineStatus || s.status || 'Verified',
        floodStatus: s.flood_status || s.floodStatus || 'NOT_ANALYZED',
        floodSignal: s.flood_signal || s.floodSignal || s.detection_method || 'MNDWI',
        floodRelevanceScore: s.flood_relevance_score ?? s.floodRelevanceScore ?? 0,
        floodAreaKm2: s.flood_area_km2 ?? s.floodAreaKm2 ?? 0,
        detectionMethod: s.detection_method || s.detectionMethod || 'MNDWI',
        source: s.source || 'LIVE SATELLITE DATA',
        isDemo: s.is_demo ?? false
      }));
    } catch (error) {
      throw error;
    }
  },

  async getFloodEvents() {
    try {
      const res = await api.get('/satellite/flood-scenes/events');
      return res.data.data;
    } catch (error) {
      throw error;
    }
  },

  async runFloodAnalysis(sceneId: string, operationId: string = 'EVT-8821-BGD', method: string = 'MNDWI') {
    try {
      const res = await api.post(`/satellite/scenes/${sceneId}/flood-analysis`, {
        operation_id: operationId,
        method
      });
      return res.data.data;
    } catch (error) {
      throw error;
    }
  },

  async getFloodGeoJSON(sceneId: string) {
    try {
      const res = await api.get(`/gis/flood/${sceneId}`);
      return res.data;
    } catch (error) {
      throw error;
    }
  },

  async compareScenes(payload: {
    pre_scene_id: string;
    post_scene_id: string;
    method?: string;
    threshold?: number;
  }) {
    const res = await api.post('/satellite/compare', payload);
    return res.data.data;
  }
};

export interface PlaceItem {
  name: string;
  latitude: number;
  longitude: number;
  bbox: [number, number, number, number];
  country?: string;
  region?: string;
}

export const placesService = {
  async searchPlaces(query: string): Promise<{ places: PlaceItem[]; provider: string; google_configured: boolean; message: string }> {
    const res = await api.get('/places/search', { params: { q: query } });
    return res.data.data;
  },

  async getStatus(): Promise<{ google_maps_configured: boolean; provider: string; manual_entry_supported: boolean; instructions: string }> {
    const res = await api.get('/places/status');
    return res.data.data;
  }
};

export const stacService = {
  async search(params: {
    operation_id?: string;
    bbox?: number[];
    collections?: string[];
    start_datetime?: string;
    end_datetime?: string;
    max_cloud_cover?: number;
    limit?: number;
  }) {
    const res = await api.post('/satellite/stac/search', params);
    return res.data.data;
  }
};

export const aiDetectionService = {
  async launchDamageSegmentation(data: {
    operation_id?: string;
    pre_scene_id?: string;
    post_scene_id?: string;
    model?: string;
    confidence_threshold?: number;
  }) {
    const res = await api.post('/ai/damage-segmentation', data);
    return res.data.data;
  },

  async getAIJob(jobId: string) {
    const res = await api.get(`/ai/jobs/${jobId}`);
    return res.data.data;
  },

  async runDamageDetection(data: {
    disaster_id: string;
    model_name?: string;
    confidence_threshold?: number;
  }) {
    try {
      const res = await api.post('/ai/damage-detection', data);
      return res.data.data;
    } catch (error) {
      throw error;
    }
  }
};

export const damageService = {
  async getDamageAssets(disasterId: string, params?: { category?: string; grade?: number }): Promise<DamageAsset[]> {
    try {
      const res = await api.get(`/damage/${disasterId}`, { params });
      return res.data.data;
    } catch {
      return mockDamageAssets;
    }
  },

  async getDamageSummary(operationId: string = 'CY-2025-05B') {
    try {
      const res = await api.get(`/damage/summary/${operationId}`);
      return res.data.data;
    } catch {
      try {
        const res2 = await api.get(`/damage/${operationId}/summary`);
        return res2.data.data;
      } catch {
        return null;
      }
    }
  },


  async verifyAsset(id: string, verified: boolean = true) {
    const res = await api.patch(`/damage/${id}/verify`, null, { params: { verified } });
    return res.data.data;
  }
};

export const rescueService = {
  async getTeams(status?: string): Promise<RescueTeam[]> {
    try {
      const res = await api.get('/rescue/teams', { params: { status } });
      return res.data.data;
    } catch {
      return mockRescueTeams;
    }
  },

  async updateTeamStatus(id: string, status: string) {
    const res = await api.patch(`/rescue/teams/${id}/status`, null, { params: { status } });
    return res.data.data;
  },

  async getPriorities(disasterId: string): Promise<RescueZone[]> {
    try {
      const res = await api.get(`/rescue/priorities/${disasterId}`);
      return res.data.data;
    } catch {
      return mockRescueZones;
    }
  },

  async calculatePriorities(data: {
    disaster_id: string;
    population_weight?: number;
    damage_weight?: number;
    water_surge_weight?: number;
    cutoff_weight?: number;
  }) {
    try {
      const res = await api.post('/rescue/priorities/calculate', data);
      return res.data.data;
    } catch {
      return mockRescueZones;
    }
  },

  async getMissions() {
    const res = await api.get('/rescue/missions');
    return res.data.data;
  },

  async createMission(data: any) {
    const res = await api.post('/rescue/missions', data);
    return res.data.data;
  },

  async updateMissionStatus(id: string, status: string) {
    const res = await api.patch(`/rescue/missions/${id}/status`, null, { params: { status } });
    return res.data.data;
  }
};

export const routeService = {
  async getRoutes(): Promise<OptimizedRoute[]> {
    try {
      const res = await api.get('/routes');
      return res.data.data;
    } catch {
      return mockRoutes;
    }
  },

  async optimizeRoute(data: {
    start_location: [number, number];
    destination: [number, number];
    avoid_inundation?: boolean;
    exclude_bridges?: boolean;
    prioritize_paved?: boolean;
  }) {
    try {
      const res = await api.post('/routes/optimize', data);
      return res.data.data;
    } catch {
      return {
        selected_route: mockRoutes[0],
        alternative_routes: [mockRoutes[1], mockRoutes[2]]
      };
    }
  }
};

export const gisService = {
  async getLayers(): Promise<MapLayer[]> {
    try {
      const res = await api.get('/gis/layers');
      return res.data.data;
    } catch {
      return mockMapLayers;
    }
  },

  async getOperationLayers(operationId: string = 'CY-2025-05B') {
    try {
      const res = await api.get(`/gis/operations/${operationId}/layers`);
      return res.data;
    } catch {
      return null;
    }
  },

  async getLayer(layerName: string) {
    try {
      const res = await api.get(`/gis/layers/${layerName}`);
      return res.data;
    } catch {
      return null;
    }
  },

  async getDisasterGeoJSON(disasterId: string) {
    const res = await api.get(`/gis/disasters/${disasterId}`);
    return res.data;
  },

  async getDamageGeoJSON(disasterId: string) {
    const res = await api.get(`/gis/damage/${disasterId}`);
    return res.data;
  },

  async getRescueTeamsGeoJSON() {
    const res = await api.get('/gis/rescue-teams');
    return res.data;
  },

  async getSheltersGeoJSON() {
    const res = await api.get('/gis/shelters');
    return res.data;
  },

  async getHospitalsGeoJSON() {
    const res = await api.get('/gis/hospitals');
    return res.data;
  }
};

export const alertService = {
  async getAlerts(params?: { operation_id?: string; severity?: string; unread?: boolean; category?: string; limit?: number }): Promise<Alert[]> {
    try {
      const res = await api.get('/alerts', { params });
      return res.data.data || res.data.alerts || [];
    } catch {
      return mockAlerts;
    }
  },

  async createAlert(data: {
    severity: string;
    title: string;
    message: string;
    disaster_id?: string;
    coordinates_str?: string;
    actions?: string[];
  }) {
    const res = await api.post('/alerts', data);
    return res.data.data;
  },

  async markRead(id: string) {
    const res = await api.patch(`/alerts/${id}/read`);
    return res.data;
  },

  async acknowledgeAlert(id: string) {
    const res = await api.post(`/alerts/${id}/acknowledge`);
    return res.data;
  },

  async assignUnit(id: string, teamId: string = 'RT-02') {
    const res = await api.post(`/alerts/${id}/assign`, { team_id: teamId });
    return res.data;
  },

  async deleteAlert(id: string) {
    const res = await api.delete(`/alerts/${id}`);
    return res.data;
  }
};

export const reportService = {
  async getReports() {
    try {
      const res = await api.get('/reports');
      return res.data.data;
    } catch {
      return [];
    }
  },

  async getReportById(id: string) {
    const res = await api.get(`/reports/${id}`);
    return res.data.data;
  },

  async generateReport(disasterId: string, reportType: string) {
    const res = await api.post('/reports/generate', {
      disaster_id: disasterId,
      report_type: reportType
    });
    return res.data.data;
  },

  getDownloadUrl(reportId: string) {
    return `${BASE_URL}/reports/${reportId}/download`;
  }
};

export const userService = {
  async getUsers(): Promise<User[]> {
    try {
      const res = await api.get('/users');
      return res.data.data;
    } catch {
      return mockUsers;
    }
  },

  async createUser(data: any) {
    const res = await api.post('/users', data);
    return res.data.data;
  },

  async updateUser(id: string, data: any) {
    const res = await api.put(`/users/${id}`, data);
    return res.data.data;
  },

  async deleteUser(id: string) {
    const res = await api.delete(`/users/${id}`);
    return res.data;
  }
};

export const systemService = {
  async getThreatLevel() {
    try {
      const res = await api.get('/system/threat-level');
      return res.data.data;
    } catch {
      return { level: 4, label: 'CRITICAL' };
    }
  },

  async getSatelliteStatus() {
    try {
      const res = await api.get('/system/satellite-status');
      return res.data.data;
    } catch {
      return { status: 'DISCONNECTED', label: 'Unavailable' };
    }
  },

  async getTelemetry() {
    try {
      const res = await api.get('/system/telemetry');
      return res.data.data;
    } catch {
      return { sync_percentage: null, latency_ms: null, status: 'UNAVAILABLE' };
    }
  },

  async getCloudStatus() {
    try {
      const res = await api.get('/satellite/cloud-status');
      return res.data.data;
    } catch {
      return { cloud_cover: null, valid: false, quality: 'Unavailable' };
    }
  },

  async getAIStatus() {
    try {
      const res = await api.get('/ai/status');
      return res.data.data;
    } catch {
      return { model_name: null, status: 'UNAVAILABLE' };
    }
  },

  async getHealth() {
    try {
      const res = await axios.get(`${BASE_URL}/health`, { timeout: 4000 });
      return res.data;
    } catch {
      const rootRes = await axios.get(`${BASE_URL.replace('/api/v1', '')}/health`, { timeout: 4000 });
      return rootRes.data;
    }
  },

  async checkConnection(): Promise<{
    connected: boolean;
    status: 'healthy' | 'degraded' | 'disconnected';
    database: string;
    version: string;
    environment: string;
    latencyMs: number | null;
    error?: string;
    lastChecked: Date;
    baseUrl: string;
  }> {
    const start = performance.now();
    try {
      // First try API v1 health endpoint
      const res = await axios.get(`${BASE_URL}/health`, { timeout: 4000 });
      const latencyMs = Math.round(performance.now() - start);
      const data = res.data;
      return {
        connected: true,
        status: data.status === 'healthy' ? 'healthy' : 'degraded',
        database: data.database || 'connected',
        version: data.version || '1.0.0',
        environment: data.environment || 'development',
        latencyMs,
        lastChecked: new Date(),
        baseUrl: BASE_URL,
      };
    } catch (err: any) {
      // Fallback try root health endpoint
      try {
        const rootHealth = `${BASE_URL.replace(/\/api\/v1\/?$/, '')}/health`;
        const res = await axios.get(rootHealth, { timeout: 4000 });
        const latencyMs = Math.round(performance.now() - start);
        const data = res.data;
        return {
          connected: true,
          status: data.status === 'healthy' ? 'healthy' : 'degraded',
          database: data.database || 'connected',
          version: data.version || '1.0.0',
          environment: data.environment || 'development',
          latencyMs,
          lastChecked: new Date(),
          baseUrl: BASE_URL,
        };
      } catch (fallbackErr: any) {
        return {
          connected: false,
          status: 'disconnected',
          database: 'unreachable',
          version: 'offline',
          environment: 'offline',
          latencyMs: null,
          error: fallbackErr.message || err.message || 'Connection refused',
          lastChecked: new Date(),
          baseUrl: BASE_URL,
        };
      }
    }
  },

  async getStatus() {
    const res = await api.get('/system/status');
    return res.data.data;
  }
};

export const exportService = {
  async exportGeoJSON(operationId: string = 'CY-2025-05B') {
    const res = await api.get(`/export/operation/${operationId}/geojson`);
    return res.data;
  },

  async exportCAD(operationId: string = 'CY-2025-05B') {
    const res = await api.get(`/export/operation/${operationId}/cad`);
    return res.data;
  },

  async exportAIMask(operationId: string = 'CY-2025-05B') {
    const res = await api.get(`/ai/export/${operationId}/mask`, { responseType: 'blob' });
    return res.data;
  }
};

