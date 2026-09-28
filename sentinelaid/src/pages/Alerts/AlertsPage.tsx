import { useState, useEffect } from 'react';
import { Bell, AlertTriangle, ShieldAlert, CheckCircle, Clock, MapPin, ExternalLink, Filter, RefreshCw } from 'lucide-react';
import { alertService } from '../../services/api';
import { mockAlerts } from '../../data/mockData';
import type { Alert } from '../../types';

export const AlertsPage = () => {
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [loading, setLoading] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const data = await alertService.getAlerts();
      if (data && data.length > 0) {
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
                  REAL-TIME TELEMETRY
                </span>
              </div>
              <p className="text-sm text-slate-600">
                Automated multi-hazard early warning triggers, structural failure alerts, and sensor telemetry anomalies.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setFilterSeverity('ALL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${filterSeverity === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              All Alerts
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
        {filteredAlerts.map(alert => (
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
                  {alert.timestamp}
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
                {alert.description}
              </p>
            </div>

            <div className="flex items-center gap-2">
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
        ))}
      </div>
    </div>
  );
};
