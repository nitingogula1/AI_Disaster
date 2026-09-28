import { useState } from 'react';
import { 
  Users, AlertTriangle, Radio, Phone, ShieldAlert, CheckCircle, 
  Clock, Navigation, Droplets, Wind, Battery, Anchor, ChevronRight, 
  Flame, Check, MessageSquare, AlertCircle
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { mockRescueTeams } from '../../data/mockData';

// Fix Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createConsolePin = (text: string, color: string) => {
  return L.divIcon({
    className: 'console-pin',
    html: `<div style="background-color: ${color}; color: white; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; font-family: monospace; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">${text}</div>`,
    iconSize: [60, 24],
    iconAnchor: [30, 12],
  });
};

export const RescueTeamsPage = () => {
  const [task1Completed, setTask1Completed] = useState(false);
  const [headcount, setHeadcount] = useState(45);
  const [sosActive, setSosActive] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
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
              <div className="font-bold text-base">EMERGENCY SOS BROADCAST ACTIVE</div>
              <div className="text-xs text-red-100">All local SAR units & air medevac alerted to your live GPS coordinates!</div>
            </div>
          </div>
          <button 
            onClick={() => {
              setSosActive(false);
              showToast("SOS alert cancelled. Resuming standard operations.");
            }}
            className="px-4 py-1.5 bg-white text-red-700 font-bold text-xs rounded-lg shadow"
          >
            Cancel SOS
          </button>
        </div>
      )}

      {/* Tactical Priority Top Strip */}
      <div className="bg-red-600 text-white px-4 py-2.5 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs font-semibold shadow-sm">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-red-800 rounded text-[10px] font-mono tracking-wider uppercase">
            TACTICAL PRIORITY RED
          </span>
          <span>Water surge rising +0.15m/hr. Target cutoff window closes at 16:45 Local.</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px] opacity-90">
          <span>MIL-GRID: 88Q-ED-4109</span>
          <span>•</span>
          <span>ENCRYPTED L3</span>
        </div>
      </div>

      {/* Header & Console Identity */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                DEPLOYED IN FIELD
              </span>
              <span className="text-xs font-mono text-slate-500">UNIT ID: RT-02</span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-600 font-medium">Amphibious Craft B-14</span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500 font-mono">Iridium/Starlink Dual Sync</span>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Rescue Team Field Console - Unit RT-02 (Water Rescue & Evac)
            </h1>

            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-600">
              <span className="flex items-center gap-1 font-medium text-slate-800">
                <Navigation className="w-3.5 h-3.5 text-sky-600" />
                Mission: Cyclone Remal - Delta Sector 4B Extraction
              </span>
              <span className="text-slate-300">|</span>
              <span>Lead Officer: <strong>Lt. Marcus Vance</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => showToast("PTT Voice Comms opened to Tactical Net 4.")}
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-semibold rounded-xl transition-colors shadow-sm"
            >
              <Radio className="w-4 h-4 text-sky-600" />
              PTT Radio
            </button>
            <button 
              onClick={() => setSosActive(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors shadow-md animate-pulse"
            >
              <ShieldAlert className="w-4 h-4" />
              SOS EMERGENCY / BACKUP
            </button>
          </div>
        </div>
      </div>

      {/* 5 Tactical Status Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Card 1 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
            <span>ACTIVE INCIDENTS</span>
            <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">3</div>
          <div className="text-xs text-slate-500 mt-1">1 Underway • 2 Staged</div>
        </div>

        {/* Card 2 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm border-l-4 border-l-red-500">
          <div className="flex items-center justify-between text-red-600 text-[10px] font-bold uppercase tracking-wider mb-1">
            <span>IMMEDIATE PRIORITY</span>
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
          </div>
          <div className="text-lg font-bold text-red-600 font-mono">#INC-402</div>
          <div className="text-xs font-semibold text-slate-800 truncate">High School Cutoff Point</div>
          <div className="text-[10px] text-red-700 font-bold mt-0.5">STRUCTURAL COMPROMISE</div>
        </div>

        {/* Card 3 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
            <span>AWAITING EXTRAC.</span>
            <Users className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">320 <span className="text-xs font-normal text-slate-500">Souls</span></div>
          <div className="text-xs text-red-600 font-medium mt-1">18 Critical Medical triage</div>
        </div>

        {/* Card 4 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
            <span>ETA DESTINATION</span>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-sky-600 font-mono">14 <span className="text-xs font-normal text-slate-500">Minutes</span></div>
          <div className="text-xs text-slate-500 mt-1 truncate">Via West Levee Bypass</div>
        </div>

        {/* Card 5 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
            <span>FLOOD DEPTH</span>
            <Droplets className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">1.2m</div>
          <div className="text-xs text-emerald-600 font-semibold mt-1">Amphibious Nav OK</div>
        </div>
      </div>

      {/* Main Grid: HUD Navigation Map & Tactical Incident Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Tactical Waypoint HUD (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg relative">
            {/* Top HUD Bar */}
            <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs text-white">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-sky-400" />
                <span className="font-semibold text-slate-200">
                  Tactical Waypoint Navigation (Route A Vector)
                </span>
                <span className="px-2 py-0.5 bg-sky-900/60 border border-sky-700/80 text-[10px] font-mono text-sky-300 rounded">
                  1:5,000 VECTOR HUD
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => showToast("Synthetic Aperture Radar overlay refreshed.")}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded transition-colors"
                >
                  SAR Synthetic Overlay
                </button>
                <button 
                  onClick={() => showToast("Map view centered on RT-02 coordinates.")}
                  className="px-2 py-1 bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold rounded transition-colors"
                >
                  Center RT-02
                </button>
              </div>
            </div>

            {/* Map Canvas */}
            <div className="h-[420px] relative">
              <MapContainer
                center={[21.848, 89.545]}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; CARTO'
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
                />

                {/* Tactical Vector Path */}
                <Polyline
                  positions={[
                    [21.87, 89.60],
                    [21.855, 89.57],
                    [21.848, 89.545],
                    [21.84, 89.54],
                  ]}
                  pathOptions={{ color: '#0284c7', weight: 6, opacity: 0.95 }}
                />

                {/* Submerged culvert hazard line */}
                <Polyline
                  positions={[
                    [21.848, 89.545],
                    [21.842, 89.535],
                  ]}
                  pathOptions={{ color: '#dc2626', weight: 4, dashArray: '6,6', opacity: 0.8 }}
                />

                {/* RT-02 Pin */}
                <Marker position={[21.848, 89.545]} icon={createConsolePin('RT-02 (Amphibious B-14)', '#0284c7')}>
                  <Popup>Unit RT-02 • Speed: 18.4 kt • Heading: 034°</Popup>
                </Marker>

                {/* LZ-1 Secondary Evac */}
                <Marker position={[21.86, 89.56]} icon={createConsolePin('LZ-1 (Secondary Evac)', '#7c3aed')}>
                  <Popup>LZ-1 Helipad / Boat Transfer</Popup>
                </Marker>

                {/* Field Aid Station */}
                <Marker position={[21.865, 89.585]} icon={createConsolePin('Field Aid Station Delta', '#059669')}>
                  <Popup>Field Aid Station Delta</Popup>
                </Marker>

                {/* Hazard Marker */}
                <Marker position={[21.842, 89.535]} icon={createConsolePin('HAZARD: km 4.8 Submerged Culvert', '#b91c1c')}>
                  <Popup>Debris warning: underwater logs</Popup>
                </Marker>
              </MapContainer>
            </div>

            {/* Bottom Telemetry HUD Ribbon */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 grid grid-cols-3 gap-2 text-xs font-mono text-slate-300">
              <div>
                <span className="text-slate-500 block text-[10px]">GPS FIX</span>
                <span className="font-bold text-white">22°14'08.2"N 89°32'44.1"E</span>
              </div>
              <div className="text-center">
                <span className="text-slate-500 block text-[10px]">CURRENT SPEED</span>
                <span className="font-bold text-sky-400">18.4 knots</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block text-[10px]">TARGET DIST</span>
                <span className="font-bold text-emerald-400">4.2 km remaining</span>
              </div>
            </div>
          </div>

          {/* Waypoint Progression Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                A1
              </div>
              <div className="text-xs">
                <div className="font-bold text-slate-800">Boat Slip Base Alpha</div>
                <div className="text-emerald-600 font-medium">Cleared at 14:10</div>
              </div>
            </div>

            <div className="bg-sky-50 border border-sky-300 rounded-xl p-3 shadow-sm flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs">
                A2
              </div>
              <div className="text-xs">
                <div className="font-bold text-sky-950">West Levee Waterway</div>
                <div className="text-sky-700 font-medium">Navigating • 1.2m depth</div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-100 text-red-800 flex items-center justify-center font-bold text-xs">
                A3
              </div>
              <div className="text-xs">
                <div className="font-bold text-slate-800">Sector 4B Clinic & School</div>
                <div className="text-red-600 font-medium">ETA 14:48 (Critical Extraction)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Field Incident Actions & Telemetry (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Action List */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-slate-900">Field Incident Actions</h2>
              <span className="px-2 py-0.5 bg-red-100 text-red-800 text-[10px] font-bold rounded">
                HIGH PRIORITY
              </span>
            </div>

            <button 
              onClick={() => showToast("Water hazard logged at current GPS marker.")}
              className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-between group"
            >
              <div>
                <div className="text-xs font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                  Report Road / Water Hazard
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Submerged powerline, logjam, breach...
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700" />
            </button>

            <button 
              onClick={() => {
                setHeadcount(prev => prev + 5);
                showToast("Updated headcount: +5 souls secured.");
              }}
              className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-between group"
            >
              <div>
                <div className="text-xs font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                  Update Civilian Headcount
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Logged on-board / rescued triage: <strong>{headcount}</strong>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700" />
            </button>

            <button 
              onClick={() => showToast("Medevac helicopter requested for LZ-1!")}
              className="w-full text-left p-3 rounded-xl bg-red-50 border border-red-200 hover:bg-red-100 transition-all flex items-center justify-between group"
            >
              <div>
                <div className="text-xs font-bold text-red-900">
                  Request Air Evac (Medevac)
                </div>
                <div className="text-[11px] text-red-700 mt-0.5">
                  Immediate helicopter airlift for LZ-1
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-red-400 group-hover:text-red-700" />
            </button>

            <button 
              onClick={() => showToast("Disengagement signal sent. Returning to base.")}
              className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-between group"
            >
              <div>
                <div className="text-xs font-bold text-slate-900">
                  Complete & Return to Base
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Disengage from sector, fuel low alert
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700" />
            </button>
          </div>

          {/* Unit Telemetry & Fuel */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900">Unit Telemetry & Fuel</h2>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                STABLE
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3.5 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center justify-between text-slate-500 text-[10px] mb-1">
                  <span>Fuel (Dual Tank)</span>
                  <Anchor className="w-3 h-3" />
                </div>
                <div className="text-lg font-bold text-slate-900 font-mono">78%</div>
                <div className="text-[10px] text-slate-500">~4.8 hrs runtime</div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center justify-between text-slate-500 text-[10px] mb-1">
                  <span>Wind Gusts</span>
                  <Wind className="w-3 h-3" />
                </div>
                <div className="text-lg font-bold text-slate-900 font-mono">48 kt</div>
                <div className="text-[10px] text-red-600 font-medium">Sustained Gale</div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center justify-between text-slate-500 text-[10px] mb-1">
                  <span>Water Temp</span>
                  <Droplets className="w-3 h-3" />
                </div>
                <div className="text-lg font-bold text-slate-900 font-mono">24.2°C</div>
                <div className="text-[10px] text-slate-500">Hypothermia Risk Mid</div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center justify-between text-slate-500 text-[10px] mb-1">
                  <span>Battery / Comms</span>
                  <Battery className="w-3 h-3" />
                </div>
                <div className="text-lg font-bold text-emerald-600 font-mono">92%</div>
                <div className="text-[10px] text-emerald-700 font-medium">Mesh Relay Active</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Checklist & Incident Priority Queue */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Field Operations Checklist & Incident Priority Queue
            </h2>
            <p className="text-xs text-slate-500">
              Ordered by Life-Safety Severity Matrix
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Task 1 */}
          <div className="border border-slate-200 rounded-xl p-4.5 bg-slate-50/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 bg-sky-100 text-sky-800 text-[10px] font-bold rounded">
                  TASK 1 • IN PROGRESS
                </span>
                <span className="text-xs font-mono font-semibold text-slate-500">INC-402-A</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                Extract 45 stranded residents from Community Clinic 2F
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                First floor completely flooded under 1.8m surge. 12 elderly patients, 3 on ventilator backup generators. Amphibious docking recommended at north balcony.
              </p>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200 mb-3 flex items-center justify-between text-xs">
                <span className="text-slate-500">STATUS</span>
                <span className="font-bold text-sky-700 font-mono">IN NAVIGATION (ETA 8m)</span>
              </div>

              {/* Recon Thumbnail Preview */}
              <div className="bg-slate-900 text-white rounded-lg p-2 text-xs flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Aerial Recon Confirmed: Clear Balcony Approach</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center gap-2">
              <button 
                onClick={() => {
                  setTask1Completed(!task1Completed);
                  showToast(task1Completed ? "Task set to in progress" : "Unit RT-02 marked On-Site!");
                }}
                className={`flex-1 py-2 rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5 ${
                  task1Completed ? 'bg-emerald-600 text-white' : 'bg-sky-600 hover:bg-sky-700 text-white shadow-sm'
                }`}
              >
                {task1Completed ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    On-Site Verified
                  </>
                ) : (
                  <>
                    <Navigation className="w-3.5 h-3.5" />
                    Mark RT-02 On-Site
                  </>
                )}
              </button>
              <button 
                onClick={() => showToast("Direct audio link dialed to Clinic Shelter Lead.")}
                className="p-2 border border-slate-300 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors"
              >
                <Phone className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Task 2 */}
          <div className="border border-slate-200 rounded-xl p-4.5 bg-slate-50/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded">
                  TASK 2 • STAGED NEXT
                </span>
                <span className="text-xs font-mono font-semibold text-slate-500">INC-402-B</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                Deliver emergency insulin & water purification to Sector 4 High School
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                Shelter cutoff with 275 civilians. Fresh water contaminated by sewage backflow. Cold-chain storage container onboard Craft B-14 must be transferred.
              </p>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200 mb-3 flex items-center justify-between text-xs">
                <span className="text-slate-500">STATUS</span>
                <span className="font-bold text-slate-700 font-mono">STAGED / CARGO SECURED</span>
              </div>

              <div className="p-2 bg-slate-100 rounded-lg text-xs text-slate-700 font-medium mb-3">
                Payload: 200kg Medical • 500L Aquatabs
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center gap-2">
              <button 
                onClick={() => showToast("Task 2 promoted to current primary objective!")}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs transition-colors shadow-sm"
              >
                Promote to Current Mission
              </button>
            </div>
          </div>

          {/* Task 3 */}
          <div className="border border-red-200 bg-red-50/30 rounded-xl p-4.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 bg-red-100 text-red-800 text-[10px] font-bold rounded">
                  TASK 3 • STANDBY CORDON
                </span>
                <span className="text-xs font-mono font-semibold text-red-600">INC-409-HAZ</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                Secure perimeter cordons around ruptured gas line on South Dock
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                Submerged natural gas conduit leaking bubbles. Severe explosion hazard within 200m buffer. Civilian boats must be diverted to northern bypass canal.
              </p>

              <div className="bg-white p-2.5 rounded-lg border border-red-200 mb-3 flex items-center justify-between text-xs">
                <span className="text-slate-500">STATUS</span>
                <span className="font-bold text-red-700 font-mono">HAZMAT DANGER ZONE</span>
              </div>

              <div className="p-2 bg-red-100/60 border border-red-200 rounded-lg text-xs text-red-800 font-medium mb-3 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                <span>Air Sniffer: LEL 14% at 50m water surface</span>
              </div>
            </div>

            <div className="pt-3 border-t border-red-200 flex items-center gap-2">
              <button 
                onClick={() => showToast("Hazard Order acknowledged. Warning buoys active.")}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Acknowledge Hazard Order
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
