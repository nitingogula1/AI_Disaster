// ============================================================
// SentinelAid — Core Type Definitions
// ============================================================

// --- Auth & Users ---
export type UserRole = 'ADMIN' | 'DISASTER_OFFICER' | 'GIS_ANALYST' | 'AI_ANALYST' | 'RESCUE_TEAM';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  avatar?: string;
}

// --- Disaster Events ---
export type DisasterType = 'Cyclone' | 'Flood' | 'Earthquake' | 'Wildfire' | 'Landslide' | 'Tsunami' | 'Volcanic' | 'Typhoon';
export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'RESOLVED';
export type EventStatus = 'ACTIVE' | 'MONITORING' | 'RESPONSE' | 'RESOLVED' | 'ARCHIVED';

export interface DisasterEvent {
  id: string;
  name: string;
  type: DisasterType;
  hazardTypes: string[];
  location: string;
  coordinates: { lat: number; lng: number };
  severity: SeverityLevel;
  status: EventStatus;
  affectedArea: number; // km²
  affectedPopulation: number;
  teamsDeployed: number;
  floodCrest?: string;
  satelliteSource?: string;
  lastSatellitePass?: string;
  aiConfidence?: number;
  createdAt: string;
  updatedAt: string;
  description?: string;
  thumbnailBand?: string;
}

// --- GIS / Map ---
export interface MapLayer {
  id: string;
  name: string;
  description: string;
  type: 'hazard' | 'response' | 'infrastructure';
  visible: boolean;
  opacity: number;
  icon?: string;
  count?: number;
  aiVerified?: boolean;
}

export interface MapMarker {
  id: string;
  type: 'incident' | 'rescue-team' | 'shelter' | 'hospital' | 'blocked-road' | 'flood-zone';
  position: [number, number];
  label: string;
  severity?: SeverityLevel;
  details?: Record<string, string | number>;
}

export interface IncidentPopup {
  id: string;
  title: string;
  zone: string;
  coordinates: string;
  civilianCount: number;
  floodDepth: number;
  structuralGrade: string;
  aiConfidence: number;
  accessRoutes: { direction: string; status: string }[];
}

// --- Satellite ---
export type SatellitePlatform = 'Sentinel-2A' | 'Sentinel-2B' | 'Sentinel-1A' | 'Sentinel-1C' | 'Landsat-9' | 'PlanetScope' | 'MODIS';
export type ProcessingStatus = 'Verified' | 'Calibrated' | 'In Progress' | 'Ready' | 'Queued' | 'Failed';
export type SpectralBand = 'RGB' | 'False Color NIR' | 'NDWI' | 'NDVI' | 'NBR' | 'SWIR' | 'SAR';
export type FloodStatus = 'FLOOD RELEVANT' | 'POSSIBLE FLOOD SIGNAL' | 'NO SIGNIFICANT FLOOD SIGNAL' | 'CLOUD OBSCURED' | 'PROCESSING' | 'FAILED';

export interface SatelliteScene {
  id: string;
  platform: string;
  acquisitionDate: string;
  cloudCover: number;
  resolution: string;
  sensorType: string;
  pipelineStatus: ProcessingStatus;
  bands?: number;
  size?: string;
  floodStatus?: FloodStatus | string;
  floodSignal?: string;
  floodRelevanceScore?: number;
  floodAreaKm2?: number;
  detectionMethod?: string;
  flood_relevant?: boolean;
  isDemo?: boolean;
  source?: string;
  thumbnail_url?: string;
}

export interface FloodDisasterEvent {
  event: string;
  operation_id: string;
  location: string;
  latest_scene: string;
  scene_count: number;
  latest_acquisition: string;
  flood_area_km2: number;
  status: string;
}


export interface PreprocessingStage {
  id: number;
  name: string;
  status: ProcessingStatus;
  detail: string;
  progress?: number;
}

// --- AI Damage Detection ---
export type DamageClass = 'DESTROYED' | 'SEVERE' | 'MODERATE' | 'MINOR' | 'NO_DAMAGE';

export interface AIDetection {
  id: string;
  category: 'building' | 'road' | 'flood' | 'infrastructure';
  damageClass: DamageClass;
  confidence: number;
  coordinates: { lat: number; lng: number };
  description: string;
  boundingBox?: [number, number, number, number];
}

export interface InferencePipeline {
  modelName: string;
  backbone: string;
  inferenceTime: number; // ms
  gpu: string;
  status: 'READY' | 'RUNNING' | 'COMPLETE' | 'ERROR';
}

export interface DetectionBreakdown {
  buildingsAnalyzed: number;
  severeCollapse: number;
  partialDamage: number;
  destroyedPercent: number;
  roadSegments: number;
  roadCuts: number;
  blockedLength: number;
  floodFootprint: number;
  waterExpansion: string;
}

// --- Damage Assessment ---
export interface DamageAsset {
  id: string;
  location: string;
  category: 'Medical' | 'Transport' | 'Education' | 'Residential' | 'Utility' | 'Commercial';
  damageGrade: number; // 1-5
  failureMode: string;
  floodDepth: number;
  floodType: string;
  aiConfidence: number;
  coordinates: { lat: number; lng: number };
  rescueStatus: string;
  population?: number;
}

// --- Rescue ---
export type RescuePriority = 'P1' | 'P2' | 'P3';
export type TeamStatus = 'DEPLOYED' | 'EN_ROUTE' | 'ON_SITE' | 'RETURNING' | 'STANDBY' | 'UNASSIGNED';

export interface RescueZone {
  rank: string;
  zone: string;
  gridCoords: string;
  structuralDamage: string;
  populationAtRisk: number;
  populationDetail: string;
  cutoffLevel: string;
  cutoffDetail: string;
  recommendedResponse: string;
  assignedUnit: string;
  unitStatus: string;
  priority: RescuePriority;
}

export interface RescueTeam {
  id: string;
  name: string;
  type: string;
  status: TeamStatus;
  members: number;
  currentLocation: string;
  currentMission?: string;
  missionId?: string;
  eta?: number; // minutes
  distance?: number; // km
  vehicleType?: string;
  gpsPosition: [number, number];
  speed?: number;
  heading?: number;
  fuel?: number;
}

// --- Route Optimization ---
export type RouteRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface OptimizedRoute {
  id: string;
  name: string;
  label: string;
  distance: number; // km
  estimatedTime: number; // minutes
  riskFactor: RouteRisk;
  riskPercent: number;
  status: 'RECOMMENDED' | 'HAZARD' | 'CONGESTED' | 'BLOCKED';
  blockedSegments: number;
  maxDepth?: number;
  waypoints: { name: string; position: [number, number] }[];
  path: [number, number][];
  details?: string;
}

// --- Alerts ---
export type AlertSeverity = 'CRITICAL' | 'HIGH_SURGE' | 'WARNING' | 'INFO' | 'SATELLITE_INGEST';

export interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  message?: string;
  timestamp: string;
  coordinates?: string;
  actions?: { label: string; type: 'primary' | 'secondary' }[];
  is_read?: boolean;
}


// --- Reports ---
export type ReportType = 'SITREP' | 'DAMAGE' | 'SATELLITE' | 'RESCUE' | 'EXECUTIVE';

export interface Report {
  id: string;
  type: ReportType;
  title: string;
  generatedAt: string;
  generatedBy: string;
  status: 'DRAFT' | 'FINAL' | 'PUBLISHED';
  eventId: string;
}

// --- Dashboard Metrics ---
export interface DashboardMetric {
  label: string;
  value: string | number;
  sublabel?: string;
  change?: string;
  icon: string;
  color?: string;
}
