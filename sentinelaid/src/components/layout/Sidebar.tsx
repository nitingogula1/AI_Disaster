import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, AlertTriangle, Satellite, Brain, ClipboardList,
  ShieldAlert, Map, Route, FileText, Bell, Users, UserCog, Settings, Crosshair
} from 'lucide-react';
import SentinelAidLogo from '../common/SentinelAidLogo';
import { useAuthStore } from '../../store/authStore';
import { navigationItems } from '../../data/mockData';
import { hasAccess } from '../../store/authStore';

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, AlertTriangle, Satellite, Brain, ClipboardList,
  ShieldAlert, Map, Route, FileText, Bell, Users, UserCog, Settings, Crosshair
};

export default function Sidebar() {
  const user = useAuthStore((s) => s.user);

  const filteredNav = navigationItems.filter(
    (item) => user && hasAccess(user.role, item.id)
  );

  return (
    <aside className="fixed left-0 top-[48px] bottom-0 w-[240px] bg-nav-primary flex flex-col z-40 border-r border-white/5">
      {/* Mission Navigation Label */}
      <div className="px-5 pt-4 pb-2">
        <span className="label-uppercase text-text-muted text-[10px]">MISSION NAVIGATION</span>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {filteredNav.map((item) => {
          const Icon = iconMap[item.icon] || LayoutDashboard;
          return (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.path === '/command'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-colors duration-150 group relative ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-slate-300 hover:bg-nav-hover hover:text-white'
                }`
              }
            >
              <Icon size={18} strokeWidth={1.8} />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge && (
                <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full bg-critical text-white text-[11px] font-bold px-1.5">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Profile at Bottom */}
      {user && (
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-nav-secondary overflow-hidden flex-shrink-0">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-sm font-semibold">
                  {user.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-[13px] font-medium truncate">{user.name}</div>
              <div className="text-slate-400 text-[11px] truncate">{user.title}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            <span className="text-slate-400 text-[10px]">STAC & AI: Online</span>
            <span className="text-slate-500 text-[10px] ml-auto">v4.18</span>
          </div>
        </div>
      )}
    </aside>
  );
}
