import React from 'react';
import { BriefcaseIcon, HammerIcon, HelpCircle, LayoutDashboardIcon, LogOut, Settings, Star } from 'lucide-react';
import NavItem from './NavItem.tsx';

const WORKER_DASHBOARD_ROUTE = '/home-worker';
const WORKER_PROFILE_ROUTE = '/worker-own-profile';
const WORKER_SETTINGS_ROUTE = '/worker-settings';
const WORKER_HELP_ROUTE = '/worker-help';

interface SidebarProps {
  location: {
    pathname: string;
  };
  navigate: (path: string, options?: any) => void;
  workerName?: string;
  workerAvatar?: string;
  workerProfession?: string;
  workerRating?: number | null;
  onLogout: () => void;
  stickyTop?: number;
  stickyHeight?: string;
  showProfileCard?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  location,
  navigate,
  workerName = 'Worker',
  workerAvatar = '',
  workerProfession = '',
  workerRating = null,
  onLogout,
  stickyTop = 88,
  stickyHeight = 'calc(100vh - 112px)',
  showProfileCard = true,
}) => {
  const handleNav = (targetPath: string) => {
    if (location.pathname === targetPath) return;
    navigate(targetPath, { replace: true });
  };

  const resolvedWorkerRating = Number.isFinite(Number(workerRating)) ? Number(workerRating) : 0;
  const ratingLabel = resolvedWorkerRating > 0 ? `${resolvedWorkerRating.toFixed(1)} rating` : 'Rating not set';
  const professionLabel = String(workerProfession || '').trim() || 'Profession not set';

  return (
    <>
      {/* Desktop Vertical Sidebar */}
      <aside
        className="hidden lg:flex w-[260px] sticky bg-white flex-col rounded-2xl shadow-sm border border-gray-100 shrink-0"
        style={{ top: stickyTop, height: stickyHeight }}
      >
        <div className="px-6 pt-6 pb-3">
          <p className="text-[9px] font-semibold text-gray-300 uppercase tracking-[0.25em]">Main Menu</p>
        </div>

        <nav className="flex-1 space-y-1.5">
          <NavItem
            icon={<LayoutDashboardIcon className="w-5 h-5" />}
            label="Dashboard"
            active={location.pathname === WORKER_DASHBOARD_ROUTE}
            onClick={() => handleNav(WORKER_DASHBOARD_ROUTE)}
          />
          <NavItem
            icon={<BriefcaseIcon className="w-5 h-5" />}
            label="Jobs"
            active={location.pathname === '/worker-jobs'}
            onClick={() => handleNav('/worker-jobs')}
          />
          <NavItem
            icon={<Settings className="w-5 h-5" />}
            label="Settings"
            active={location.pathname === WORKER_SETTINGS_ROUTE}
            onClick={() => handleNav(WORKER_SETTINGS_ROUTE)}
          />
          <NavItem
            icon={<HelpCircle className="w-5 h-5" />}
            label="Help & Support"
            active={location.pathname === WORKER_HELP_ROUTE}
            onClick={() => handleNav(WORKER_HELP_ROUTE)}
          />
        </nav>

        <div className="p-5 mt-auto border-t border-gray-50 text-left">
          {showProfileCard && (
            <div
              onClick={() => handleNav(WORKER_PROFILE_ROUTE)}
              className="bg-white border border-gray-100/80 rounded-2xl p-4 mb-4 flex items-center gap-3 shadow-[0_10px_30px_rgba(11,59,104,0.08)] cursor-pointer hover:border-[#00A651] transition-all group"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-full overflow-hidden shrink-0 flex items-center justify-center">
                {workerAvatar ? (
                  <img src={workerAvatar} alt="Worker" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[11px] font-bold text-[#00A651]">{workerName.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-gray-900 truncate group-hover:text-[#00A651]">{workerName}</p>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-500 font-medium">
                  <span className="inline-flex items-center gap-1">
                    <Star className="w-3 h-3 text-[#F4B740]" />
                    {ratingLabel}
                  </span>
                </div>
                <span className="mt-1 inline-flex text-[8px] bg-[#EBF7F3] text-[#00A651] px-1.5 py-0.5 rounded-full items-center gap-1 font-bold">
                  <HammerIcon className="w-2 h-2" /> {professionLabel}
                </span>
              </div>
            </div>
          )}
          <button
            onClick={onLogout}
            className="w-full py-2 border border-gray-200 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Worker Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200 px-2 py-1.5 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
      >
        <button
          type="button"
          onClick={() => handleNav(WORKER_DASHBOARD_ROUTE)}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all cursor-pointer ${
            location.pathname === WORKER_DASHBOARD_ROUTE
              ? "text-[#00A651] font-bold"
              : "text-gray-400 hover:text-gray-600 font-medium"
          }`}
        >
          <LayoutDashboardIcon className="w-5 h-5" />
          <span className="text-[10px]">Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => handleNav('/worker-jobs')}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all cursor-pointer ${
            location.pathname === '/worker-jobs'
              ? "text-[#00A651] font-bold"
              : "text-gray-400 hover:text-gray-600 font-medium"
          }`}
        >
          <BriefcaseIcon className="w-5 h-5" />
          <span className="text-[10px]">Jobs</span>
        </button>

        <button
          type="button"
          onClick={() => handleNav(WORKER_PROFILE_ROUTE)}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all cursor-pointer ${
            location.pathname === WORKER_PROFILE_ROUTE
              ? "text-[#00A651] font-bold"
              : "text-gray-400 hover:text-gray-600 font-medium"
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full overflow-hidden flex items-center justify-center border ${
              location.pathname === WORKER_PROFILE_ROUTE ? "border-[#00A651]" : "border-gray-300"
            }`}
          >
            {workerAvatar ? (
              <img src={workerAvatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[9px] font-bold text-gray-600">{workerName.slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <span className="text-[10px]">Profile</span>
        </button>

        <button
          type="button"
          onClick={() => handleNav(WORKER_SETTINGS_ROUTE)}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all cursor-pointer ${
            location.pathname === WORKER_SETTINGS_ROUTE
              ? "text-[#00A651] font-bold"
              : "text-gray-400 hover:text-gray-600 font-medium"
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px]">Settings</span>
        </button>

        <button
          type="button"
          onClick={() => handleNav(WORKER_HELP_ROUTE)}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all cursor-pointer ${
            location.pathname === WORKER_HELP_ROUTE
              ? "text-[#00A651] font-bold"
              : "text-gray-400 hover:text-gray-600 font-medium"
          }`}
        >
          <HelpCircle className="w-5 h-5" />
          <span className="text-[10px]">Help</span>
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl text-red-500 hover:text-red-700 transition-all cursor-pointer"
          title="Log Out"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] font-bold">Logout</span>
        </button>
      </nav>
    </>
  );
};

export default Sidebar;
