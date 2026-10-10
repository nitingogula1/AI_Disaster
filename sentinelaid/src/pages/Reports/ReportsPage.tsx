import React, { useState, useEffect } from 'react';

import { 
  FileText, Download, Filter, Calendar, BarChart3, PieChart, 
  Share2, Printer, CheckCircle, Search, ExternalLink, Zap, Plane, Shield
} from 'lucide-react';
import { reportService, droneService } from '../../services/api';

export const ReportsPage = () => {
  const [selectedFormat, setSelectedFormat] = useState<'PDF' | 'GEOJSON' | 'CSV'>('PDF');
  const [reports, setReports] = useState<any[]>([]);
  
  
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [reconFormat, setReconFormat] = useState<'pdf' | 'csv' | 'geojson'>('pdf');

  const [stats, setStats] = useState({ total: 0, recent: 0, sessions: 0, places: 0, findings: 0 });
  const [downloading, setDownloading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
      const data = await reportService.getReports();
      const statsRes = await fetch('http://localhost:8000/api/v1/reports/stats').then(r => r.json()).catch(() => null);
      if (statsRes && statsRes.success) {
        setStats({
          total: statsRes.data.total_reports || 0,
          recent: statsRes.data.recent_reports || 0,
          sessions: statsRes.data.drone_sessions || 0,
          places: statsRes.data.places_searched || 0,
          findings: statsRes.data.total_findings || 0
        });
      }
      if (data) {
        setReports(data);
      }
    } catch {
      // Keep defaults
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const openSessionPicker = async () => {
    setShowSessionPicker(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/drone/sessions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });
      const json = await res.json();
      if (json.success && json.data) {
        setSessions(json.data);
      }
    } catch {
      // ignore
    }
  };

  const handleDownload = async (reportId: string, title: string = '') => {
    setDownloading(true);
    setToastMessage(`Downloading official dossier ${title}...`);
    try {
      window.open(reportService.getDownloadUrl(reportId), '_blank');
      setToastMessage(`Downloaded ${title} successfully.`);
    } catch {
      setToastMessage(`Download initiated.`);
    } finally {
      setTimeout(() => {
        setDownloading(false);
        setToastMessage(null);
      }, 3000);
    }
  };

  const handleDownloadAll = async () => {
    if (reports.length === 0) {
      setToastMessage("No reports available to download.");
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    setDownloading(true);
    setToastMessage("Packaging intelligence archive with manifest...");
    try {
      const reportIds = reports.map(r => r.id);
      const res = await fetch('http://localhost:8000/api/v1/reports/download-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({ report_ids: reportIds, format: selectedFormat.toLowerCase() })
      });
      if (!res.ok) throw new Error("Archive export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'intelligence_export.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setToastMessage("Intelligence archive downloaded successfully.");
    } catch (err: any) {
      setToastMessage(err.message || "Failed to download package.");
    } finally {
      setTimeout(() => {
        setDownloading(false);
        setToastMessage(null);
      }, 3000);
    }
  };

  const handleGenerateReport = async (sessionId: string) => {
    setToastMessage(`Compiling ${reconFormat.toUpperCase()} report from Tactical Drone Recon...`);
    try {
      const res = await fetch('http://localhost:8000/api/v1/reports/drone-recon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          session_ids: [sessionId],
          format: reconFormat
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.detail || 'Failed to generate report');
      }
      setToastMessage(`Recon report successfully generated.`);
      setShowSessionPicker(false);
      await fetchReports();
      if (data.data?.report_id) {
        handleDownload(data.data.report_id, 'Drone Recon Report');
      }
    } catch (err: any) {
      setToastMessage(err.message || 'Generation failed');
    } finally {
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  const filteredReports = reports.filter(r => {
    if (!selectedFormat) return true;
    const t = (r.type || '').toUpperCase();
    if (selectedFormat === 'PDF') return t.includes('PDF') || t.includes('DOSSIER') || t.includes('SITREP') || t.includes('RECON');
    if (selectedFormat === 'GEOJSON') return t.includes('GEOJSON');
    if (selectedFormat === 'CSV') return t.includes('CSV');
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-sky-500/10 text-sky-600 rounded-xl border border-sky-500/20">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Disaster Intelligence Reports & Analytics
                </h1>
              </div>
              <p className="text-sm text-slate-600">
                Automated multi-spectral damage analytics, situational bulletins, and exportable geospatial intelligence dossiers.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button 
              onClick={openSessionPicker}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
            >
              <Plane className="w-4 h-4" />
              Generate Recon Dossier
            </button>

            <button 
              onClick={handleDownloadAll}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {downloading ? 'Packaging...' : 'Download All Intelligence'}
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Reports Generated</div>
          <div className="text-3xl font-extrabold text-slate-900 font-mono">{stats.total}</div>
          <div className="text-xs text-emerald-600 font-semibold mt-1">{stats.recent} in last 24 hours</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Recon Flight Sessions</div>
          <div className="text-3xl font-extrabold text-sky-600 font-mono">{stats.sessions > 0 ? stats.sessions : 'No data'}</div>
          <div className="text-xs text-slate-500 mt-1">Operator missions recorded</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Places Searched</div>
          <div className="text-3xl font-extrabold text-indigo-600 font-mono">{stats.places > 0 ? stats.places : 'No data'}</div>
          <div className="text-xs text-slate-500 mt-1">Unique tactical sectors</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Confirmed Findings</div>
          <div className="text-3xl font-extrabold text-rose-600 font-mono">{stats.findings > 0 ? stats.findings : 'No data'}</div>
          <div className="text-xs text-slate-500 mt-1">Survivors, LZs, and cutoffs</div>
        </div>
      </div>

      {/* Available Intelligence Dossiers & Reports Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Available Intelligence Dossiers & Bulletins
            </h2>
            <p className="text-xs text-slate-500">
              Click to view, export, or transmit directly to international responders
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
              <button 
                onClick={() => setSelectedFormat('PDF')}
                className={`px-3 py-1.5 rounded-md transition-colors ${selectedFormat === 'PDF' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
              >
                PDF
              </button>
              <button 
                onClick={() => setSelectedFormat('GEOJSON')}
                className={`px-3 py-1.5 rounded-md transition-colors ${selectedFormat === 'GEOJSON' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
              >
                GeoJSON
              </button>
              <button 
                onClick={() => setSelectedFormat('CSV')}
                className={`px-3 py-1.5 rounded-md transition-colors ${selectedFormat === 'CSV' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
              >
                CSV
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider">
                <th className="py-3 px-4">REPORT ID & TITLE</th>
                <th className="py-3 px-4">TYPE</th>
                <th className="py-3 px-4">GENERATED AT</th>
                <th className="py-3 px-4">AUTHOR</th>
                <th className="py-3 px-4">FILE SIZE</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-100">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-sm">
                    No intelligence dossiers have been generated yet for this format.
                  </td>
                </tr>
              ) : filteredReports.map(rep => (
                <tr key={rep.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{rep.title}</div>
                    <div className="text-[11px] font-mono text-slate-500 mt-0.5">{rep.id}</div>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-700">
                    {rep.type}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 font-mono">
                    {rep.date}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 font-medium">
                    {rep.author}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 font-mono">
                    {rep.size}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800">
                      {rep.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button 
                      onClick={() => handleDownload(rep.id, rep.title)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 ml-auto"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-600" />
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Session Picker Modal */}
      {showSessionPicker && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Plane className="w-5 h-5 text-indigo-600" />
                Select Recon Flight Session
              </h3>
              <button onClick={() => setShowSessionPicker(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="mb-4 flex gap-4 items-center">
              <span className="text-sm font-semibold text-slate-700">Export Format:</span>
              <select 
                value={reconFormat} 
                onChange={(e) => setReconFormat(e.target.value as any)} 
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              >
                <option value="pdf">PDF Dossier (.pdf)</option>
                <option value="geojson">GeoJSON Layer (.geojson)</option>
                <option value="csv">CSV Spreadsheet (.csv)</option>
              </select>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No active or past drone reconnaissance sessions found. Perform searches on Tactical Drone Recon first.
                </div>
              ) : sessions.map(s => (
                <div key={s.id} className="border border-slate-200 rounded-xl p-4 hover:border-indigo-300 hover:bg-slate-50/50 transition flex justify-between items-center">
                  <div>
                    <div className="font-bold text-slate-800 flex items-center gap-2">
                      {s.disaster_id || 'Tactical UAV Recon Mission'}
                      {s.is_simulation && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-amber-100 text-amber-800 border border-amber-200">
                          SIMULATION / DRILL
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 font-mono">
                      Callsign: {s.uav_callsign || 'UAV-ALPHA'} | Sensor: {s.sensor_mode || 'OPTICAL'}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Session ID: {s.id}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleGenerateReport(s.id)} 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition shadow-sm"
                  >
                    Generate {reconFormat.toUpperCase()}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default ReportsPage;
