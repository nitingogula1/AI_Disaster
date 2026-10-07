import { useState, useEffect } from 'react';
import { 
  Users, AlertTriangle, Radio, ShieldAlert, CheckCircle, 
  Clock, Navigation, Droplets, Battery, ChevronRight, 
  Flame, Check, RefreshCw, MapPin, Compass, Shield
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { rescueService } from '../../services/api';
import type { RescueTeam, TeamStatus } from '../../types';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createTeamPin = (text: string, color: string, isSelected: boolean = false) => {
  return L.divIcon({
    className: 'console-pin',
    html: `<div style="background-color: ${color}; color: white; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 11px; font-family: monospace; border: ${isSelected ? '3px solid #facc15' : '2px solid white'}; box-shadow: 0 4px 12px rgba(0,0,0,0.5); white-space: nowrap; transform: ${isSelected ? 'scale(1.1)' : 'scale(1)'}; transition: all 0.2s;">${text}</div>`,
    iconSize: [80, 26],
    iconAnchor: [40, 13],
  });
};

function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 13, { duration: 1 });
  }, [center, map]);
  return null;
}

export const RescueTeamsPage = () => {
  const [teams, setTeams] = useState<RescueTeam[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('RT-02');
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);
  const [sosActive, setSosActive] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadTeams = async () => {
    setLoading(true);
    try {
      const data = await rescueService.getTeams();
      if (data && data.length > 0) {
        setTeams(data);
        if (!data.some(t => t.id === selectedTeamId)) {
          setSelectedTeamId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load rescue teams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  const selectedTeam = teams.find(t => t.id === selectedTeamId) || teams[0];

  const handleStatusChange = async (newStatus: TeamStatus) => {
    if (!selectedTeam) return;
    setUpdatingStatus(true);
    try {
      await rescueService.updateTeamStatus(selectedTeam.id, newStatus);
      setTeams(prev => prev.map(t => t.id === selectedTeam.id ? { ...t, status: newStatus } : t));
      showToast(`${selectedTeam.name} status updated to ${newStatus}`);
    } catch (err) {
      console.error('Failed to update status:', err);
      showToast(`Error updating ${selectedTeam.name} status`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Metrics
  const activeTeamsCount = teams.filter(t => t.status !== 'STANDBY').length;
  const deployedCount = teams.filter(t => t.status === 'DEPLOYED' || t.status === 'ON_SITE').length;
  const dispatchedCount = teams.filter(t => t.status === 'DISPATCHED' || t.status === 'EN_ROUTE').length;
  const totalPersonnel = teams.reduce((acc, t) => acc + (t.members || 0), 0);
  const avgFuel = teams.length ? Math.round(teams.reduce((acc, t) => acc + (t.fuel || 80), 0) / teams.length) : 80;

  const currentCenter: [number, number] = selectedTeam?.gpsPosition || [21.848, 89.545];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DEPLOYED': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'ON_SITE': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'DISPATCHED':
      case 'EN_ROUTE': return 'bg-amber-100 text-amber-800 border-amber-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getStatusPinColor = (status: string) => {
    switch (status) {
      case 'DEPLOYED': return '#059669';
      case 'ON_SITE': return '#2563eb';
      case 'DISPATCHED':
      case 'EN_ROUTE': return '#d97706';
      default: return '#64748b';
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* SOS Alert Modal Banner */}
      {sosActive && (
        <div className="bg-red-600 text-white p-4 rounded-xl flex items-center justify-between shadow-2xl animate-pulse">
          <div className="flex items-center gap-3">
            <Flame className="w-6 h-6" />
            <div>
              <div className="font-bold text-base">EMERGENCY SOS BROADCAST ACTIVE FOR {selectedTeam?.name || 'UNIT'}</div>
              <div className="text-xs text-red-100">Live coordinates broadcasted to Incident Command & Air Medevac: {selectedTeam?.gpsPosition?.join(', ')}</div>
            </div>
          </div>
          <button 
            onClick={() => {
              setSosActive(false);
              showToast("SOS alert cancelled. Resuming standard operations.");
            }}
            className="px-4 py-1.5 bg-white text-red-700 font-bold text-xs rounded-lg shadow hover:bg-red-50 transition"
          >
            Cancel SOS
          </button>
        </div>
      )}

      {/* Top Banner Strip */}
      <div className="bg-slate-900 border border-slate-800 text-white px-4 py-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-mono tracking-wider uppercase font-bold">
            LIVE REGISTRY CONNECTED
          </span>
          <span className="text-slate-300 font-medium">
            Active Fleet Telemetry & SAR Dispatch: {teams.length} Registered Field Teams
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
          <button 
            onClick={loadTeams}
            disabled={loading}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Telemetry
          </button>
        </div>
      </div>

      {/* Fleet KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
            <span>ACTIVE TEAMS</span>
            <Users className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">{activeTeamsCount} / {teams.length}</div>
          <div className="text-xs text-slate-500 mt-1">{deployedCount} Deployed in Field</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-emerald-600 text-[10px] font-bold uppercase tracking-wider mb-1">
            <span>DEPLOYED ON-SITE</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <div className="text-2xl font-bold text-emerald-600 font-mono">{deployedCount}</div>
          <div className="text-xs text-slate-600 mt-1 font-medium">{totalPersonnel} First Responders</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-amber-600 text-[10px] font-bold uppercase tracking-wider mb-1">
            <span>DISPATCHED / EN ROUTE</span>
            <Navigation className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 font-mono">{dispatchedCount}</div>
          <div className="text-xs text-slate-500 mt-1">Transit Corridor Active</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
            <span>SELECTED TEAM SPEED</span>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-sky-600 font-mono">
            {selectedTeam?.speed || 0} <span className="text-xs font-normal text-slate-500">knots</span>
          </div>
          <div className="text-xs text-slate-500 mt-1 truncate">Heading {selectedTeam?.heading || 0}&deg;</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
            <span>AVG FLEET FUEL</span>
            <Battery className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 font-mono">{avgFuel}%</div>
          <div className="text-xs text-slate-500 mt-1">Selected Unit: {selectedTeam?.fuel || 80}%</div>
        </div>
      </div>

      {/* Team Selection Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 px-1">
          Select Field Rescue Team Console:
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {teams.map(t => {
            const isSel = t.id === selectedTeam?.id;
            return (
              <button
                key={t.id}
                onClick={() => setSelectedTeamId(t.id)}
                className={`text-left p-3 rounded-xl border transition-all ${
                  isSel 
                    ? 'border-sky-500 bg-sky-50/70 shadow-sm ring-1 ring-sky-400' 
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-xs text-slate-900">{t.id}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(t.status)}`}>
                    {t.status}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-800 truncate">{t.name}</div>
                <div className="text-[11px] text-slate-500 mt-0.5 truncate">{t.type} &bull; {t.members} Crew</div>
                <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between font-mono">
                  <span>Fuel: {t.fuel || 80}%</span>
                  <span>{t.speed || 0} kt</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Team Header */}
      {selectedTeam && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold border flex items-center gap-1.5 ${getStatusColor(selectedTeam.status)}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                  {selectedTeam.status}
                </span>
                <span className="text-xs font-mono text-slate-500">UNIT CODE: {selectedTeam.id}</span>
                <span className="text-slate-300">&bull;</span>
                <span className="text-xs text-slate-700 font-semibold">{selectedTeam.vehicleType || 'Standard SAR Craft'}</span>
                <span className="text-slate-300">&bull;</span>
                <span className="text-xs text-slate-500 font-mono">GPS: {selectedTeam.gpsPosition?.map(c => c.toFixed(4)).join(', ')}</span>
              </div>

              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {selectedTeam.name} - {selectedTeam.type}
              </h1>

              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-600">
                <span className="flex items-center gap-1 font-medium text-slate-800">
                  <Navigation className="w-3.5 h-3.5 text-sky-600" />
                  Location: <strong>{selectedTeam.currentLocation}</strong>
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-700">
                  Mission: <strong>{selectedTeam.currentMission || 'Active Search & Evacuation'}</strong>
                </span>
                <span className="text-slate-300">|</span>
                <span>Crew: <strong>{selectedTeam.members} Specialists</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => showToast(`PTT Radio opened to Tactical Comms Channel ${selectedTeam.id}.`)}
                className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-semibold rounded-xl transition shadow-sm"
              >
                <Radio className="w-4 h-4 text-sky-600" />
                Radio Comms
              </button>
              <button 
                onClick={() => setSosActive(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition shadow-md animate-pulse"
              >
                <ShieldAlert className="w-4 h-4" />
                SOS EMERGENCY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Interactive Map HUD & Incident Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Telemetry HUD Map (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg relative">
            {/* Top HUD Bar */}
            <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs text-white">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-sky-400" />
                <span className="font-semibold text-slate-200">
                  Active Fleet GIS Radar & GPS Positions ({teams.length} Units)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => showToast(`Map centered on ${selectedTeam?.name}.`)}
                  className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold rounded transition"
                >
                  Center {selectedTeam?.id}
                </button>
              </div>
            </div>

            {/* Map Canvas */}
            <div className="h-[440px] relative">
              <MapContainer
                center={currentCenter}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; CARTO'
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
                />

                <MapRecenter center={currentCenter} />

                {/* Plot ALL real teams on the map */}
                {teams.map(t => {
                  if (!t.gpsPosition || t.gpsPosition.length < 2) return null;
                  const isSel = t.id === selectedTeam?.id;
                  const pinColor = getStatusPinColor(t.status);
                  return (
                    <Marker
                      key={t.id}
                      position={t.gpsPosition}
                      icon={createTeamPin(`${t.id} (${t.status})`, pinColor, isSel)}
                      eventHandlers={{
                        click: () => setSelectedTeamId(t.id)
                      }}
                    >
                      <Popup>
                        <div className="p-1">
                          <div className="font-bold text-sm text-slate-900">{t.name}</div>
                          <div className="text-xs text-slate-600 mt-0.5">{t.type} &bull; Crew: {t.members}</div>
                          <div className="text-xs text-slate-700 font-semibold mt-1">Status: {t.status}</div>
                          <div className="text-xs text-slate-500 mt-0.5">Location: {t.currentLocation}</div>
                          <div className="text-xs font-mono text-slate-600 mt-1 flex gap-2">
                            <span>Speed: {t.speed || 0} kt</span>
                            <span>Fuel: {t.fuel || 80}%</span>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>

            {/* Bottom Telemetry HUD Ribbon */}
            {selectedTeam && (
              <div className="p-3 bg-slate-950 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono text-slate-300">
                <div>
                  <span className="text-slate-500 block text-[10px]">ACTIVE UNIT</span>
                  <span className="font-bold text-white">{selectedTeam.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">GPS FIX</span>
                  <span className="font-bold text-sky-400">
                    {selectedTeam.gpsPosition ? `${selectedTeam.gpsPosition[0].toFixed(4)}°N, ${selectedTeam.gpsPosition[1].toFixed(4)}°E` : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">CURRENT SPEED</span>
                  <span className="font-bold text-emerald-400">{selectedTeam.speed || 0} knots</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">FUEL LEVEL</span>
                  <span className="font-bold text-amber-400">{selectedTeam.fuel || 80}%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Tactical Controls & Status Dispatch (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Status Update Control */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Field Unit Status Dispatch</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Update live status in database for {selectedTeam?.name || 'unit'}:
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(['DEPLOYED', 'ON_SITE', 'DISPATCHED', 'STANDBY'] as TeamStatus[]).map(st => (
                <button
                  key={st}
                  disabled={updatingStatus || selectedTeam?.status === st}
                  onClick={() => handleStatusChange(st)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    selectedTeam?.status === st
                      ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-700'
                      : 'border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {selectedTeam?.status === st && <Check size={14} />}
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Mission Actions */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-slate-900">Tactical Quick Actions</h2>

            <button 
              onClick={() => showToast(`Hazard report logged for coordinates of ${selectedTeam?.name}.`)}
              className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition flex items-center justify-between group"
            >
              <div>
                <div className="text-xs font-bold text-slate-800">Log Hazard at Unit GPS</div>
                <div className="text-[11px] text-slate-500">Tag submerged debris or road blockage</div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition" />
            </button>

            <button 
              onClick={() => showToast(`Air medevac backup requested for ${selectedTeam?.name}.`)}
              className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition flex items-center justify-between group"
            >
              <div>
                <div className="text-xs font-bold text-slate-800">Request Air Medevac Support</div>
                <div className="text-[11px] text-slate-500">Alert helicopter evacuation flight wing</div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition" />
            </button>

            <button 
              onClick={() => showToast(`Direct supply drop request sent to logistics hub.`)}
              className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition flex items-center justify-between group"
            >
              <div>
                <div className="text-xs font-bold text-slate-800">Request Field Supply Drop</div>
                <div className="text-[11px] text-slate-500">Fuel drums, inflatable rafts, trauma kits</div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RescueTeamsPage;
