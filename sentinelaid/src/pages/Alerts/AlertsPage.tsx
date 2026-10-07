import { useState, useEffect } from 'react';
import { Bell, AlertTriangle, ShieldAlert, CheckCircle, Clock, MapPin, ExternalLink, Filter, RefreshCw } from 'lucide-react';
import { alertService } from '../../services/api';
import type { Alert } from '../../types';

export const AlertsPage = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const data = await alertService.getAlerts();
      if (data && Array.isArray(data)) {
        setAlerts(data);
      }
    } catch (e) {
      console.error('Error fetching alerts:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await alertService.markRead(id);
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch (e) {
      console.error('Failed to mark alert as read:', e);
    }
  };

  const filteredAlerts = alerts.filter(a => {
    if (filterSeverity === 'ALL') return true;
    return a.severity === filterSeverity;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-500/10 text-red-600 rounded-xl border border-red-500/20">
              <Bell className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Critical Alerts & Intelligence Feed
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-red-100 text-red-700 border border-red-200">
                  LIVE DATABASE TELEMETRY
                </span>
              </div>
              <p className="text-sm text-slate-600">
                Automated multi-hazard early warning triggers, structural failure alerts, and sensor telemetry anomalies.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={loadAlerts}
              className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition"
              title="Refresh alerts from database"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={() => setFilterSeverity('ALL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${filterSeverity === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              All Alerts ({alerts.length})
            </button>
            <button 
              onClick={() => setFilterSeverity('CRITICAL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${filterSeverity === 'CRITICAL' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Critical Only
            </button>
          </div>
        </div>
      </div>

      {/* Alerts Stream */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-sky-600 mb-3" />
            <p className="text-sm font-medium">Querying live database alert triggers...</p>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No active alerts recorded</h3>
            <p className="text-xs text-slate-500 mt-1">All telemetry sectors operating within nominal safety parameters.</p>
          </div>
        ) : (
          filteredAlerts.map(alert => (
            <div 
              key={alert.id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-l-red-500"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2.5">
                  <span className="px-2 py-0.5 bg-red-100 text-red-800 text-[10px] font-bold rounded uppercase">
                    {alert.severity}
                  </span>
                  <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {alert.timestamp || 'Live Trigger'}
                  </span>
                  {alert.coordinates && (
                    <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {alert.coordinates}
                    </span>
                  )}
                </div>

                <h2 className="text-base font-bold text-slate-900">{alert.title}</h2>
                <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                  {alert.description || alert.message}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleMarkRead(alert.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 hover:bg-slate-100 text-slate-700 transition"
                >
                  Dismiss
                </button>
                {alert.actions?.map((act, i) => (
                  <button 
                    key={i}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      act.type === 'primary' 
                        ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-sm' 
                        : 'border border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    {act.label}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AlertsPage;
