import { useState } from 'react';
import { Settings, Shield, Bell, Database, Key, CheckCircle, Save } from 'lucide-react';

export const SettingsPage = () => {
  const [stacSync, setStacSync] = useState(true);
  const [copernicusApi, setCopernicusApi] = useState(true);
  const [autoTriage, setAutoTriage] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {saved && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-semibold">Settings saved successfully.</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-slate-100 text-slate-700 rounded-xl border border-slate-200">
            <Settings className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              System Settings & Integrations
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Configure satellite imagery ingestion pipelines, AI model thresholds, and telemetry relays.
            </p>
          </div>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-sky-600" />
            Earth Observation & STAC APIs
          </h2>

          <div className="space-y-4 text-xs">
            <label className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
              <div>
                <div className="font-bold text-slate-800">Automated Sentinel-2 L2A Ingestion</div>
                <div className="text-slate-500 mt-0.5">Poll Copernicus Data Space Ecosystem every 15 minutes for new tiles.</div>
              </div>
              <input 
                type="checkbox" 
                checked={stacSync} 
                onChange={e => setStacSync(e.target.checked)} 
                className="w-4 h-4 text-sky-600 rounded" 
              />
            </label>

            <label className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
              <div>
                <div className="font-bold text-slate-800">SAR Sentinel-1 Flood Inundation Engine</div>
                <div className="text-slate-500 mt-0.5">Enable synthetic aperture radar interferometry during high cloud cover.</div>
              </div>
              <input 
                type="checkbox" 
                checked={copernicusApi} 
                onChange={e => setCopernicusApi(e.target.checked)} 
                className="w-4 h-4 text-sky-600 rounded" 
              />
            </label>

            <label className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
              <div>
                <div className="font-bold text-slate-800">Continuous AI Prioritization Triage Engine</div>
                <div className="text-slate-500 mt-0.5">Automatically trigger re-scoring of P1–P3 rescue zones on telemetry change.</div>
              </div>
              <input 
                type="checkbox" 
                checked={autoTriage} 
                onChange={e => setAutoTriage(e.target.checked)} 
                className="w-4 h-4 text-sky-600 rounded" 
              />
            </label>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 flex justify-end">
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" />
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
