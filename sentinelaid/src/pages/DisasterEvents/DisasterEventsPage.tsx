import { useState, useEffect } from 'react';
import { Search, Filter, Download, Plus, RefreshCw, Satellite, MapPin, ExternalLink, Eye, FileText, X } from 'lucide-react';
import { SeverityBadge, ConfidenceBadge } from '../../components/common/StatusBadges';
import { disasterService } from '../../services/api';
import type { DisasterEvent } from '../../types';

const FOCUS_REGIONS = ['Bay Area / Delta Sector 4', 'Brahmaputra Basin', 'Java Island Arc', 'Kyushu SW Basin'];

export default function DisasterEventsPage() {
  const [events, setEvents] = useState<DisasterEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newDisaster, setNewDisaster] = useState({
    name: '',
    disaster_type: 'FLOOD',
    location_name: '',
    latitude: 21.8412,
    longitude: 89.5422,
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

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await disasterService.createDisaster(newDisaster);
      setShowCreate(false);
      setNewDisaster({
        name: '',
        disaster_type: 'FLOOD',
        location_name: '',
        latitude: 21.8412,
        longitude: 89.5422,
        severity: 'CRITICAL',
        status: 'ACTIVE',
        affected_area: 1200,
        affected_population: 35000,
        teams_deployed: 4
      });
      loadDisasters();
    } catch (err) {
      console.error('Failed to create disaster event', err);
    }
  };

  const filteredEvents = events.filter((e) =>
    e.name?.toLowerCase().includes(search.toLowerCase()) || e.location?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      {/* Top Metrics */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'ACTIVE DEPLOYMENTS', value: '14', change: '↗ +2 declared in last 6h', changeColor: 'text-critical' },
          { label: 'AFFECTED POPULATION', value: '98,240', change: '👥 7 triage corridors live', changeColor: 'text-primary' },
          { label: 'STAC PASSES QUEUED', value: '28', change: '🛰 Sentinel-1/2 SAR Syncing', changeColor: 'text-primary' },
          { label: 'AI INFERENCE CONFIDENCE', value: '94.2%', change: '✨ Zero-shot flood & debris mask', changeColor: 'text-text-muted' },
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
          <span className="text-[11px] text-text-muted tabular-nums">SYS-REGISTRY::REV-2025.06</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-text-primary">Disaster Events Registry & Management</h1>
            <p className="text-[12px] text-text-muted mt-1">Active Disaster Incidents, Satellite Coverage Timelines, and Mission Status</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-[12px] font-semibold px-3 py-2 rounded transition"
            >
              <Plus size={14} />
              Register New Disaster Event
            </button>
            <button className="flex items-center gap-1.5 border border-border text-text-secondary text-[12px] font-medium px-3 py-2 rounded hover:bg-panel transition">
              <Filter size={14} />
              Filter by Type
            </button>
            <button className="flex items-center gap-1.5 border border-border text-text-secondary text-[12px] font-medium px-3 py-2 rounded hover:bg-panel transition">
              <Download size={14} />
              Export Incident Log
            </button>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md bg-surface border border-border-input rounded px-3 py-1.5">
          <Search size={14} className="text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Disaster Name, Country, Region, or ID..."
            className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-text-muted"
          />
        </div>
        {['Type: All Disaster', 'Status: All States', 'Severity: All', 'Time: Last 24 h'].map((f) => (
          <button key={f} className="flex items-center gap-1.5 border border-border text-text-secondary text-[12px] px-3 py-1.5 rounded hover:bg-panel transition">
            {f}
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
        ))}
        <button onClick={loadDisasters} title="Refresh Live Registry" className="p-1.5 border border-border rounded hover:bg-panel transition">
          <RefreshCw size={14} className={`text-text-muted ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Active Focus Regions */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">ACTIVE FOCUS:</span>
        {FOCUS_REGIONS.map((r) => (
          <button key={r} className="text-[11px] font-medium text-primary hover:underline">{r}</button>
        ))}
        <span className="ml-auto text-[11px] text-text-muted">Showing {filteredEvents.length} Incidents</span>
      </div>

      {/* Event Cards */}
      <div className="space-y-4">
        {filteredEvents.map((evt) => (
          <div key={evt.id} className="bg-surface border border-border rounded-lg p-5 hover:border-border-strong transition">
            {/* Event Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  evt.severity === 'CRITICAL' ? 'bg-critical/10 text-critical' :
                  evt.severity === 'HIGH' ? 'bg-warning/10 text-warning' :
                  evt.severity === 'MODERATE' ? 'bg-secondary-blue/10 text-secondary-blue' :
                  'bg-success/10 text-success'
                }`}>
                  {evt.severity === 'CRITICAL' ? '🌊' : evt.severity === 'HIGH' ? '🌧️' : evt.severity === 'MODERATE' ? '🌋' : '✓'}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-[16px] font-bold text-text-primary">{evt.name}</h3>
                    <span className="text-[10px] text-text-muted font-mono bg-panel px-1.5 py-0.5 rounded">#{evt.id}</span>
                    <SeverityBadge level={evt.severity} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                      evt.status === 'ACTIVE' ? 'bg-success/10 text-success border border-success/30' :
                      evt.status === 'MONITORING' ? 'bg-warning/10 text-warning border border-warning/30' :
                      'bg-panel text-text-muted border border-border'
                    }`}>
                      {evt.description || 'Active Monitored Perimeter'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-text-muted">
                    <span className="flex items-center gap-1"><MapPin size={11} />{evt.location}</span>
                    {evt.satelliteSource && <span className="flex items-center gap-1"><Satellite size={11} />{evt.satelliteSource}</span>}
                    {evt.coordinates && (
                      <span className="tabular-nums">
                        {Number(evt.coordinates.lat || 0).toFixed(4)}° N, {Number(evt.coordinates.lng || 0).toFixed(4)}° E
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {evt.aiConfidence && <ConfidenceBadge value={evt.aiConfidence} />}
            </div>

            {/* Event Metrics + Thumbnail */}
            <div className="flex items-stretch gap-4">
              {/* Thumbnail */}
              <div className="w-[200px] h-[100px] rounded-lg bg-nav-primary overflow-hidden flex-shrink-0 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[#0c2d4a] to-nav-secondary flex items-center justify-center">
                  <span className="text-primary-light text-[11px] font-medium">{evt.thumbnailBand || 'Sentinel Imagery'}</span>
                </div>
                {evt.thumbnailBand && (
                  <div className="absolute bottom-1 left-1">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      evt.severity === 'CRITICAL' ? 'bg-critical text-white' : 'bg-primary text-white'
                    }`}>
                      {evt.thumbnailBand.length > 30 ? evt.thumbnailBand.substring(0, 28) + '...' : evt.thumbnailBand}
                    </span>
                  </div>
                )}
              </div>

              {/* Metrics */}
              <div className="flex-1 grid grid-cols-4 gap-4">
                <div>
                  <div className="label-uppercase text-text-muted text-[10px]">AFFECTED AREA</div>
                  <div className="text-[20px] font-bold text-text-primary tabular-nums">{(evt.affectedArea || 0).toLocaleString()} km²</div>
                  {evt.severity === 'CRITICAL' && <div className="text-[11px] text-critical">+310 km² today</div>}
                </div>
                <div>
                  <div className="label-uppercase text-text-muted text-[10px]">POPULATION</div>
                  <div className="text-[20px] font-bold text-primary tabular-nums">{(evt.affectedPopulation || 0).toLocaleString()}</div>
                  <div className="text-[11px] text-text-muted">{evt.affectedPopulation > 10000 ? `${Math.round(evt.affectedPopulation * 0.2).toLocaleString()} vulnerable` : 'Monitoring'}</div>
                </div>
                <div>
                  <div className="label-uppercase text-text-muted text-[10px]">{evt.type === 'Volcanic' ? 'LAHAR RISK' : evt.floodCrest ? 'FLOOD CREST' : 'ROAD BLOCKAGES'}</div>
                  <div className={`text-[20px] font-bold tabular-nums ${evt.severity === 'CRITICAL' ? 'text-critical' : 'text-text-primary'}`}>
                    {evt.floodCrest || (evt.type === 'Volcanic' ? 'High Rain' : '19 Points')}
                  </div>
                  <div className="text-[11px] text-text-muted">{evt.type === 'Flood' ? 'Tidal Surge' : ''}</div>
                </div>
                <div>
                  <div className="label-uppercase text-text-muted text-[10px]">{evt.teamsDeployed > 0 ? 'TRIAGE SQUAD' : 'SENSORS ONLINE'}</div>
                  <div className="text-[20px] font-bold text-primary tabular-nums">{evt.teamsDeployed > 0 ? `${evt.teamsDeployed} Teams` : '34/34'}</div>
                  <div className="text-[11px] text-text-muted">{evt.teamsDeployed > 0 ? `${Math.ceil(evt.teamsDeployed / 2)} Air-Boats Engaged` : 'Seismic & Tilt'}</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 flex-shrink-0">
                <button className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-[11px] font-semibold px-3 py-1.5 rounded transition whitespace-nowrap">
                  <ExternalLink size={12} />
                  Open Command Center
                </button>
                <div className="flex gap-2">
                  <button className="flex items-center gap-1 text-[11px] text-text-secondary hover:text-primary transition">
                    <Eye size={12} />
                    View Masks
                  </button>
                  <button className="flex items-center gap-1 text-[11px] text-text-secondary hover:text-primary transition">
                    <FileText size={12} />
                    Incident Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Register New Disaster Event Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
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
                  placeholder="e.g. Typhoon Kalmaegi Flood Surge"
                  value={newDisaster.name}
                  onChange={(e) => setNewDisaster({ ...newDisaster, name: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 bg-panel border border-border-input rounded text-[13px] outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-text-muted uppercase">Disaster Type</label>
                  <select
                    value={newDisaster.disaster_type}
                    onChange={(e) => setNewDisaster({ ...newDisaster, disaster_type: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 bg-panel border border-border-input rounded text-[13px] outline-none"
                  >
                    <option value="FLOOD">FLOOD</option>
                    <option value="CYCLONE">CYCLONE</option>
                    <option value="EARTHQUAKE">EARTHQUAKE</option>
                    <option value="LANDSLIDE">LANDSLIDE</option>
                    <option value="WILDFIRE">WILDFIRE</option>
                    <option value="TSUNAMI">TSUNAMI</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-text-muted uppercase">Severity</label>
                  <select
                    value={newDisaster.severity}
                    onChange={(e) => setNewDisaster({ ...newDisaster, severity: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 bg-panel border border-border-input rounded text-[13px] outline-none"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MODERATE">MODERATE</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-text-muted uppercase">Location Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. East Coast Estuary & Delta Basin"
                  value={newDisaster.location_name}
                  onChange={(e) => setNewDisaster({ ...newDisaster, location_name: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 bg-panel border border-border-input rounded text-[13px] outline-none focus:border-primary"
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
                    className="w-full mt-1 px-3 py-1.5 bg-panel border border-border-input rounded text-[13px] outline-none"
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
                    className="w-full mt-1 px-3 py-1.5 bg-panel border border-border-input rounded text-[13px] outline-none"
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
                    className="w-full mt-1 px-3 py-1.5 bg-panel border border-border-input rounded text-[13px] outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-text-muted uppercase">Affected Population</label>
                  <input
                    type="number"
                    value={newDisaster.affected_population}
                    onChange={(e) => setNewDisaster({ ...newDisaster, affected_population: parseInt(e.target.value, 10) || 0 })}
                    className="w-full mt-1 px-3 py-1.5 bg-panel border border-border-input rounded text-[13px] outline-none"
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
                  Submit & Sync to Command
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
