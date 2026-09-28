import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, Satellite, Crosshair, Radio } from 'lucide-react';
import SentinelAidLogo from '../../components/common/SentinelAidLogo';
import { useAuthStore } from '../../store/authStore';

type DutyRole = 'Administrator' | 'Disaster Officer' | 'Rescue Lead';

const DEMO_PROFILES = [
  { label: 'Admin', email: 'admin@sentinelaid.gov', color: 'bg-critical' },
  { label: 'Officer', email: 'officer.jenkins@sentinelaid.gov', color: 'bg-warning' },
  { label: 'Rescue', email: 'rt02.lead@sar.ops', color: 'bg-primary' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('admin@sentinelaid.gov');
  const [password, setPassword] = useState('password');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<DutyRole>('Administrator');
  const [keepSession, setKeepSession] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const success = await login(email, password);
    if (success) navigate('/command');
  };

  const fillProfile = (profileEmail: string) => {
    setEmail(profileEmail);
    setPassword('password');
    clearError();
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Dark info side */}
      <div className="hidden lg:flex flex-col w-[55%] bg-nav-primary text-white relative overflow-hidden">
        {/* Background imagery overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-nav-primary via-nav-primary/95 to-nav-secondary" />
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2338bdf8' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative z-10 flex flex-col h-full p-8">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-4">
            <SentinelAidLogo size={44} />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">SENTINELAID AI</span>
                <span className="px-1.5 py-0.5 bg-primary/30 text-primary-light text-[10px] font-bold rounded">V4.8.2</span>
              </div>
              <div className="text-slate-400 text-[12px]">Geospatial Disaster Intelligence</div>
            </div>
          </div>

          {/* Auth banner */}
          <div className="flex items-center gap-2 bg-critical/20 border border-critical/30 rounded px-3 py-1.5 mb-12 w-fit">
            <span className="w-2 h-2 rounded-full bg-critical animate-pulse-critical" />
            <span className="text-[11px] font-semibold text-critical/90 uppercase tracking-wider">
              ENCRYPTED JWT AUTH V4.2 • LEVEL-3 CLEARANCE REQUIRED
            </span>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Tagline */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Satellite size={16} className="text-primary-light" />
              <span className="label-uppercase text-primary-light text-[11px]">MULTI-CONSTELLATION SATELLITE ORCHESTRATION</span>
            </div>
            <h1 className="text-[32px] font-bold leading-tight mb-4">
              Mission-Critical Disaster Intelligence Platform
            </h1>
            <p className="text-slate-300 text-[15px] leading-relaxed max-w-lg">
              Real-time satellite inference, AI damage segmentation, and dynamic route optimization for emergency command authorities.
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { icon: Satellite, title: 'Orbital STAC', desc: 'Sentinel-2 L2A & Planet Labs automated 10m multispectral ingestion pipeline with 8-minu...', stat: 'Sync Lag', value: '142ms' },
              { icon: Crosshair, title: 'Triage Matrix', desc: 'Multi-attribute utility prioritization algorithm generating automated life-...', stat: 'Precision', value: '99.1% F1' },
              { icon: Radio, title: 'Field Mesh Sync', desc: 'Low-latency peer-to-peer offline synchronization with tactical rescue teams across...', stat: 'Node Coverage', value: '100% Mesh' },
            ].map((f, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <f.icon size={16} className={i === 1 ? 'text-ai-light' : 'text-primary-light'} />
                  <span className="text-white text-[14px] font-semibold">{f.title}</span>
                </div>
                <p className="text-slate-400 text-[12px] leading-relaxed mb-3">{f.desc}</p>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">{f.stat}</span>
                  <span className="text-white font-semibold tabular-nums">{f.value}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom status bar */}
          <div className="flex items-center gap-4 pt-4 border-t border-white/10 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-slate-400">All 14 Regional Command Hubs Online • Zero Data Obfuscation</span>
            </div>
            <div className="text-slate-500 ml-auto tabular-nums">
              LAT 37.7749° N
            </div>
            <div className="text-slate-500 tabular-nums">
              LON 122.4194° W
            </div>
            <div className="text-slate-400 font-medium">
              UTC+00:00
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex flex-col bg-white min-h-screen">
        <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 max-w-[520px] mx-auto w-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2 text-text-secondary text-[12px]">
              <Shield size={14} />
              <span className="label-uppercase">SECURE MISSION GATEWAY</span>
            </div>
            <button className="text-primary text-[12px] font-medium hover:underline flex items-center gap-1">
              ⊘ Duty Support
            </button>
          </div>

          <h2 className="text-[28px] font-bold text-text-primary mb-2">Sign In to Command Center</h2>
          <p className="text-text-secondary text-[14px] mb-8">
            Enter your authorized credentials to access mission operations.
          </p>

          {/* Role Selection */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="label-uppercase text-text-secondary">OPERATIONAL DUTY ROLE</span>
              <span className="px-2 py-0.5 bg-success text-white text-[10px] font-bold rounded">Tier 1 Clearance</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['Administrator', 'Disaster Officer', 'Rescue Lead'] as DutyRole[]).map((role) => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border-2 transition-all text-[12px] font-medium ${
                    selectedRole === role
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border text-text-secondary hover:border-border-strong'
                  }`}
                >
                  <Shield size={20} strokeWidth={1.5} />
                  {role}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2 text-text-muted text-[12px]">
              <span>ⓘ</span>
              <span>Global telemetry, orbital ingestion pipeline, AI clearance delegation.</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-[13px] font-semibold text-text-primary mb-1.5">
                Duty Email / Station Call-Sign
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                  <Shield size={14} />
                </span>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 border border-border-input rounded text-[13px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                  placeholder="admin@sentinelaid.gov"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-[13px] font-semibold text-text-primary">Security Passcode / Token</label>
                <button type="button" className="text-primary text-[12px] font-medium hover:underline">Forgot Token?</button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">🔒</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 pl-9 pr-10 border border-border-input rounded text-[13px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={keepSession}
                onChange={(e) => setKeepSession(e.target.checked)}
                className="w-4 h-4 rounded border-border-input text-primary focus:ring-primary"
              />
              <span className="text-[13px] text-text-secondary">Keep duty station session active (12h)</span>
            </label>

            {/* Error */}
            {error && (
              <div className="bg-critical/10 border border-critical/30 rounded px-3 py-2 text-critical text-[13px]">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-primary hover:bg-primary-hover text-white font-semibold rounded flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Shield size={16} />
                  Authorize & Enter Command Center
                </>
              )}
            </button>
          </form>

          {/* SSO Section */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center"><span className="bg-white px-3 text-[11px] text-text-muted uppercase tracking-wider">HARDWARE & ENTERPRISE SSO</span></div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button className="h-10 border border-border rounded flex items-center justify-center gap-2 text-[12px] font-medium text-text-secondary hover:bg-panel transition">
              💳 PIV / CAC Smart Card
            </button>
            <button className="h-10 border border-border rounded flex items-center justify-center gap-2 text-[12px] font-medium text-text-secondary hover:bg-panel transition">
              🏛️ Gov Cloud SSO
            </button>
          </div>

          {/* Demo Profiles */}
          <div className="border border-border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="label-uppercase text-text-muted text-[10px]">⚠ DEMO QUICK-FILL PROFILES</span>
              <span className="text-text-muted text-[10px]">Click to populate</span>
            </div>
            <div className="space-y-1.5">
              {DEMO_PROFILES.map((p) => (
                <button
                  key={p.email}
                  onClick={() => fillProfile(p.email)}
                  className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded hover:bg-panel transition text-[12px]"
                >
                  <span className={`w-2 h-2 rounded-full ${p.color}`} />
                  <span className="text-text-secondary font-medium">{p.label}:</span>
                  <span className="text-text-primary">{p.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom security info */}
        <div className="flex items-center justify-center gap-6 py-3 border-t border-border text-[11px] text-text-muted px-4">
          <span>🔒 256-Bit TLS • FIPS 140-3 Compliant</span>
          <span>Authorized Emergency Response Personnel Only</span>
        </div>
      </div>
    </div>
  );
}
