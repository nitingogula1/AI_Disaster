import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Filter, Download, Plus, RefreshCw, Satellite, MapPin, 
  ExternalLink, Eye, FileText, X, CheckCircle, Crosshair, Map, 
  Clock, Globe, Layers, AlertTriangle
} from 'lucide-react';
import { SeverityBadge, ConfidenceBadge } from '../../components/common/StatusBadges';
import { disasterService, operationService } from '../../services/api';
import { useAppStore } from '../../store/appStore';
import type { DisasterEvent } from '../../types';

const REGION_PRESETS = [
  { label: 'All Regions', filter: '' },
  { label: '🇳🇵 Nepal (Bagmati / Dhading)', filter: 'nepal' },
  { label: '🇵🇰 Pakistan (Indus / Sindh)', filter: 'pakistan' },
  { label: '🇧🇩 Bangladesh (Delta / Feni)', filter: 'bangladesh' },
  { label: '🇮🇳 India (Assam / Kerala)', filter: 'india' },
  { label: '🇱🇾 Libya (Derna)', filter: 'libya' },
];

export default function DisasterEventsPage() {
  const navigate = useNavigate();
  const { setActiveOperation } = useAppStore();

  const [events, setEvents] = useState<DisasterEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'HISTORICAL'>('ALL');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const [showCreate, setShowCreate] = useState(false);
  const [newDisaster, setNewDisaster] = useState({
    name: '',
    disaster_type: 'FLOOD',
    location_name: '',
    latitude: 27.7172,
    longitude: 85.3240,
    severity: 'CRITICAL',
    status: 'ACTIVE',
    affected_area: 1200,
    affected_population: 35000,
    teams_deployed: 4
  });

  const loadDisasters = async () => {
    setLoading(true);
    try {
      const data = await disasterService.getDisasters();
      setEvents(data);
    } catch {
      // Fallback handled in disasterService
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDisasters();
  }, []);

  const handleActivateAndOpen = async (evt: any, targetRoute: string = '/command') => {
    try {
      const opId = evt.operation_id || evt.operationId || evt.id;
      try {
        await operationService.activateOperation(opId);
      } catch (err) {
        console.warn('Backend activation fallback:', err);
      }
      setActiveOperation(opId, evt.name, evt.location_name || evt.location);
      setToastMessage(`Switched active operation to: ${evt.name}`);

      const isNepal = 
        (evt.name || '').toLowerCase().includes('nepal') || 
        (evt.location_name || '').toLowerCase().includes('nepal') || 
        (evt.location || '').toLowerCase().includes('nepal') ||
        (opId || '').toUpperCase().includes('NEPAL') ||
        (opId || '').toUpperCase().includes('NPL');

      let destination = targetRoute;
      if (targetRoute === '/command/drone-recon') {
        destination = isNepal 
          ? '/command/drone-recon?mission=drn-msn-nepal' 
          : '/command/drone-recon?mission=drn-msn-001';
      } else if (targetRoute === '/command/gis') {
        const lat = evt.latitude || evt.coordinates?.lat || (isNepal ? 27.7172 : 21.8412);
        const lng = evt.longitude || evt.coordinates?.lng || (isNepal ? 85.3240 : 89.5422);
        destination = `/command/gis?lat=${lat}&lng=${lng}&zoom=14`;
      }

      setTimeout(() => {
        navigate(destination);
      }, 200);
    } catch (e) {
      console.error('Error switching operation:', e);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await disasterService.createDisaster(newDisaster);
      setShowCreate(false);
      setNewDisaster({
        name: '',
        disaster_type: 'FLOOD',
        location_name: '',
        latitude: 27.7172,
        longitude: 85.3240,
        severity: 'CRITICAL',
        status: 'ACTIVE',
        affected_area: 1200,
        affected_population: 35000,
        teams_deployed: 4
      });
      loadDisasters();
      setToastMessage('New disaster registered and synced to live registry.');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error('Failed to create disaster event', err);
    }
  };

  // Filter Logic
  const filteredEvents = events.filter((e: any) => {
    // Tab filter
    if (activeTab === 'ACTIVE' && e.status !== 'ACTIVE') return false;
    if (activeTab === 'HISTORICAL' && e.status === 'ACTIVE') return false;

    // Region filter
    if (selectedRegion) {
      const targetStr = `${e.name || ''} ${e.location || ''} ${e.location_name || ''} ${e.country || ''}`.toLowerCase();
      if (!targetStr.includes(selectedRegion.toLowerCase())) return false;
    }

    // Search query
    if (search.trim()) {
      const s = search.toLowerCase();
      const targetStr = `${e.name || ''} ${e.location || ''} ${e.location_name || ''} ${e.country || ''} ${e.id || ''} ${e.description || ''}`.toLowerCase();
      if (!targetStr.includes(s)) return false;
    }

    return true;
  });

  const activeCount = events.filter((e) => e.status === 'ACTIVE').length;
  const historicalCount = events.filter((e) => e.status !== 'ACTIVE').length;

  return (
    <div className="p-4 space-y-4 animate-fade-in relative">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'GLOBAL FLOOD REGISTRY', value: `${events.length}`, change: '🌐 Nepal, Pakistan, BD, India, Libya', changeColor: 'text-sky-500' },
          { label: 'ACTIVE DEPLOYMENTS', value: `${activeCount}`, change: '🚨 Live response corridors active', changeColor: 'text-critical' },
          { label: 'HISTORICAL FLOOD ARCHIVES', value: `${historicalCount}`, change: '📚 Accessible with full satellite passes', changeColor: 'text-emerald-500' },
          { label: 'STAC SAR PASSES QUEUED', value: '38', change: '🛰 Sentinel-1/2 SAR & Drone Ortho', changeColor: 'text-primary' },
        ].map((m, i) => (
          <div key={i} className="bg-surface border border-border rounded-lg p-4">
            <div className="label-uppercase text-text-muted text-[10px] mb-1">{m.label}</div>
            <div className="text-[28px] font-bold text-text-primary tabular-nums">{m.value}</div>
            <div className={`text-[11px] mt-1 ${m.changeColor}`}>{m.change}</div>
          </div>
        ))}
      </div>

      {/* Header & Actions */}
      <div className="bg-surface border border-border rounded-lg p-4">
        <div className="flex items-center gap-3 mb-1">
          <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded uppercase">OPERATIONAL HUB</span>
          <span className="text-[11px] text-text-muted tabular-nums">SENTINELAID::GLOBAL-EVENT-ARCHIVE</span>
        </div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-bold text-text-primary">Disaster Events Registry & Management</h1>
            <p className="text-[12px] text-text-muted mt-1">
              Access Active Incidents & Previous Historical Floods (Nepal 2024, Pakistan 2022, Bangladesh, Wayanad, Libya)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-[12px] font-semibold px-3 py-2 rounded transition"
            >
              <Plus size={14} />
              Register Disaster Event
            </button>
            <button 
              onClick={loadDisasters} 
              title="Refresh Live Registry" 
              className="flex items-center gap-1.5 border border-border text-text-secondary text-[12px] font-medium px-3 py-2 rounded hover:bg-panel transition"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Tab Switcher: All vs Active vs Previous Floods */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'ALL' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:bg-panel'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            All Disasters ({events.length})
          </button>
          <button
            onClick={() => setActiveTab('ACTIVE')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'ACTIVE' ? 'bg-red-600 text-white shadow-sm' : 'text-text-muted hover:bg-panel'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-400 animate-ping"></span>
            Active Operations ({activeCount})
          </button>
          <button
            onClick={() => setActiveTab('HISTORICAL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'HISTORICAL' ? 'bg-indigo-600 text-white shadow-sm' : 'text-text-muted hover:bg-panel'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Previous & Historical Floods ({historicalCount})
          </button>
        </div>
      </div>

      {/* Region Presets & Search Filter Bar */}
      <div className="space-y-3">
        {/* Quick Region Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 bg-surface p-2.5 border border-border rounded-lg text-xs">
          <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Quick Region:
          </span>
          {REGION_PRESETS.map((rp) => (
            <button
              key={rp.label}
              onClick={() => setSelectedRegion(rp.filter)}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                selectedRegion === rp.filter
                  ? 'bg-sky-600 text-white'
                  : 'bg-panel border border-border text-text-secondary hover:border-sky-500'
              }`}
            >
              {rp.label}
            </button>
          ))}
          {selectedRegion && (
            <button 
              onClick={() => setSelectedRegion('')}
              className="text-[11px] text-red-400 hover:underline font-bold ml-1"
            >
              Clear Region
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1 bg-surface border border-border-input rounded-lg px-3.5 py-2">
            <Search size={15} className="text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search previous floods by keyword (e.g. 'Nepal', 'Bagmati', 'Pakistan', 'Indus', 'Assam', 'Wayanad')..."
              className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-text-muted text-text-primary"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-text-muted hover:text-text-primary">
                <X size={14} />
              </button>
            )}
          </div>
          <span className="text-xs text-text-muted whitespace-nowrap">
            Showing <strong>{filteredEvents.length}</strong> events
          </span>
        </div>
      </div>

      {/* Event Cards */}
      <div className="space-y-4">
        {filteredEvents.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl p-10 text-center text-text-muted">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <div className="text-sm font-bold text-text-primary">No flood events matched your criteria</div>
            <p className="text-xs mt-1">Try clearing your search query or selecting "All Regions".</p>
          </div>
        ) : (
          filteredEvents.map((evt: any) => {
            const isHistorical = evt.status !== 'ACTIVE';
            return (
              <div 
                key={evt.id} 
                className={`bg-surface border rounded-xl p-5 hover:border-primary transition shadow-sm ${
                  isHistorical ? 'border-border/80 bg-slate-900/40' : 'border-red-500/40'
                }`}
              >
                {/* Event Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl ${
                      evt.severity === 'CRITICAL' ? 'bg-critical/10 text-critical' :
                      evt.severity === 'HIGH' ? 'bg-warning/10 text-warning' :
                      evt.severity === 'MODERATE' ? 'bg-secondary-blue/10 text-secondary-blue' :
                      'bg-success/10 text-success'
                    }`}>
                      {evt.disaster_type === 'FLOOD' || evt.type === 'Flood' ? '🌊' : '🌀'}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-[17px] font-bold text-text-primary">{evt.name}</h3>
                        <span className="text-[10px] text-text-muted font-mono bg-panel px-1.5 py-0.5 rounded border border-border">
                          #{evt.event_code || evt.id}
                        </span>
                        <SeverityBadge level={evt.severity} />
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                          evt.status === 'ACTIVE' 
                            ? 'bg-red-500/20 text-red-400 border border-red-500/40' 
                            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                        }`}>
                          {evt.status === 'ACTIVE' ? 'LIVE DEPLOYMENT' : 'HISTORICAL ARCHIVE'}
                        </span>
                      </div>
                      
                      <p className="text-[12px] text-slate-300 leading-relaxed mb-2 max-w-3xl">
                        {evt.description || 'Monitored perimeter with multi-spectral satellite inundation data.'}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-text-muted">
                        <span className="flex items-center gap-1 font-medium text-slate-200">
                          <MapPin size={12} className="text-sky-400" />
                          {evt.location_name || evt.location}
                        </span>
                        {evt.satellite_source && (
                          <span className="flex items-center gap-1">
                            <Satellite size={12} className="text-emerald-400" />
                            {evt.satellite_source}
                          </span>
                        )}
                        {evt.coordinates && (
                          <span className="tabular-nums font-mono text-[10px] text-slate-400">
                            {Number(evt.coordinates.lat || evt.latitude || 0).toFixed(4)}° N, {Number(evt.coordinates.lng || evt.longitude || 0).toFixed(4)}° E
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {evt.aiConfidence && <ConfidenceBadge value={evt.aiConfidence} />}
                </div>

                {/* Event Metrics + Thumbnail + Actions Bar */}
                <div className="flex flex-col md:flex-row items-stretch gap-4 pt-3 border-t border-border/80">
                  {/* Thumbnail */}
                  <div className="w-full md:w-[220px] h-[100px] rounded-lg bg-nav-primary overflow-hidden flex-shrink-0 relative border border-white/10">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#0c2d4a] to-nav-secondary flex items-center justify-center p-2 text-center">
                      <span className="text-primary-light text-[11px] font-medium">
                        {evt.thumbnailBand || 'Sentinel-1 SAR / Sentinel-2 NDWI'}
                      </span>
                    </div>
                    <div className="absolute bottom-1.5 left-1.5">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-sky-950 border border-sky-600 text-sky-200">
                        {evt.satellite_source || 'Sentinel-1/2'}
                      </span>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-panel/50 p-2.5 rounded-lg border border-border/60">
                      <div className="label-uppercase text-text-muted text-[10px]">AFFECTED AREA</div>
                      <div className="text-[18px] font-bold text-text-primary tabular-nums font-mono">
                        {(evt.affected_area || evt.affectedArea || 0).toLocaleString()} <span className="text-xs font-normal">km²</span>
                      </div>
                      <div className="text-[10px] text-sky-400 mt-0.5">Satellite Verified</div>
                    </div>
                    <div className="bg-panel/50 p-2.5 rounded-lg border border-border/60">
                      <div className="label-uppercase text-text-muted text-[10px]">POPULATION</div>
                      <div className="text-[18px] font-bold text-primary tabular-nums font-mono">
                        {(evt.affected_population || evt.affectedPopulation || 0).toLocaleString()}
                      </div>
                      <div className="text-[10px] text-text-muted mt-0.5">Census Overlay</div>
                    </div>
                    <div className="bg-panel/50 p-2.5 rounded-lg border border-border/60">
                      <div className="label-uppercase text-text-muted text-[10px]">SURGE / CREST</div>
                      <div className="text-[18px] font-bold text-critical tabular-nums font-mono">
                        {evt.floodCrest || '+3.8m peak'}
                      </div>
                      <div className="text-[10px] text-text-muted mt-0.5">Hydro-metric Datum</div>
                    </div>
                    <div className="bg-panel/50 p-2.5 rounded-lg border border-border/60">
                      <div className="label-uppercase text-text-muted text-[10px]">RESCUE UNITS</div>
                      <div className="text-[18px] font-bold text-emerald-400 tabular-nums font-mono">
                        {evt.teams_deployed || evt.teamsDeployed || 12} Teams
                      </div>
                      <div className="text-[10px] text-emerald-500 mt-0.5">SAR Deployed</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0 justify-center">
                    <button 
                      onClick={() => handleActivateAndOpen(evt, '/command')}
                      className="flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-[12px] font-bold px-4 py-2 rounded-lg transition shadow-sm"
                    >
                      <ExternalLink size={13} />
                      Open in Command Center
                    </button>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleActivateAndOpen(evt, '/command/drone-recon')}
                        className="flex-1 flex items-center justify-center gap-1 bg-panel border border-border text-[11px] font-semibold text-text-secondary hover:text-white hover:border-sky-500 py-1.5 px-2 rounded-lg transition"
                      >
                        <Crosshair size={12} className="text-red-400" />
                        Drone Recon
                      </button>
                      <button 
                        onClick={() => handleActivateAndOpen(evt, '/command/gis-map')}
                        className="flex-1 flex items-center justify-center gap-1 bg-panel border border-border text-[11px] font-semibold text-text-secondary hover:text-white hover:border-sky-500 py-1.5 px-2 rounded-lg transition"
                      >
                        <Map size={12} className="text-emerald-400" />
                        GIS Map
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Register New Disaster Event Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                <h2 className="text-[16px] font-bold text-text-primary">Register New Disaster Event</h2>
              </div>
              <button onClick={() => setShowCreate(false)} className="text-text-muted hover:text-text-primary">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-text-muted uppercase">Event Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nepal 2024 Monsoon Bagmati River Inundation"
                  value={newDisaster.name}
                  onChange={(e) => setNewDisaster({ ...newDisaster, name: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 bg-panel border border-border-input rounded text-[13px] outline-none focus:border-primary text-text-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-text-muted uppercase">Disaster Type</label>
                  <select
                    value={newDisaster.disaster_type}
                    onChange={(e) => setNewDisaster({ ...newDisaster, disaster_type: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 bg-panel border border-border-input rounded text-[13px] outline-none text-text-primary"
                  >
                    <option value="FLOOD">FLOOD</option>
                    <option value="CYCLONE">CYCLONE</option>
                    <option value="EARTHQUAKE">EARTHQUAKE</option>
                    <option value="LANDSLIDE">LANDSLIDE</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-text-muted uppercase">Severity</label>
                  <select
                    value={newDisaster.severity}
                    onChange={(e) => setNewDisaster({ ...newDisaster, severity: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 bg-panel border border-border-input rounded text-[13px] outline-none text-text-primary"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MODERATE">MODERATE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-text-muted uppercase">Location Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kathmandu Valley, Bagmati River Basin, Nepal"
                  value={newDisaster.location_name}
                  onChange={(e) => setNewDisaster({ ...newDisaster, location_name: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 bg-panel border border-border-input rounded text-[13px] outline-none focus:border-primary text-text-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-text-muted uppercase">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={newDisaster.latitude}
                    onChange={(e) => setNewDisaster({ ...newDisaster, latitude: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 px-3 py-1.5 bg-panel border border-border-input rounded text-[13px] outline-none text-text-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-text-muted uppercase">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={newDisaster.longitude}
                    onChange={(e) => setNewDisaster({ ...newDisaster, longitude: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 px-3 py-1.5 bg-panel border border-border-input rounded text-[13px] outline-none text-text-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-text-muted uppercase">Affected Area (km²)</label>
                  <input
                    type="number"
                    value={newDisaster.affected_area}
                    onChange={(e) => setNewDisaster({ ...newDisaster, affected_area: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 px-3 py-1.5 bg-panel border border-border-input rounded text-[13px] outline-none text-text-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-text-muted uppercase">Affected Population</label>
                  <input
                    type="number"
                    value={newDisaster.affected_population}
                    onChange={(e) => setNewDisaster({ ...newDisaster, affected_population: parseInt(e.target.value, 10) || 0 })}
                    className="w-full mt-1 px-3 py-1.5 bg-panel border border-border-input rounded text-[13px] outline-none text-text-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 border border-border rounded text-[12px] font-medium text-text-secondary hover:bg-panel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded text-[12px] font-semibold shadow-sm transition"
                >
                  Submit & Sync to Registry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
