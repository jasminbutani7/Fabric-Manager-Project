import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  Layers,
  Sliders,
  Menu,
  X,
  LogOut,
  ShieldCheck,
  Building2,
  Phone,
  ChevronRight,
  Sparkles,
  Scissors,
  ArrowLeftRight,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';

export default function MobileLayout() {
  const { currentUser, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogout = () => {
    setDrawerOpen(false);
    logout();
    navigate('/signin', { replace: true });
  };

  const navItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/fabrics', label: 'Fabrics', icon: Layers },
    { to: '/orders', label: 'Production', icon: Scissors },
    { to: '/transactions', label: 'Transaction', icon: ArrowLeftRight },
    { to: '/setup', label: 'Setup', icon: Sliders },
  ];

  const isHomeActive =
    location.pathname === '/' ||
    location.pathname.startsWith('/home');

  const isTransactionActive =
    location.pathname.startsWith('/transactions') ||
    location.pathname.startsWith('/transaction') ||
    location.pathname.startsWith('/expenses') ||
    location.pathname.startsWith('/invoices');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between max-w-md mx-auto sm:max-w-lg md:max-w-3xl lg:max-w-5xl shadow-xl shadow-slate-200/50 relative border-x border-slate-200">
      {/* Top Mobile App Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between transition-all">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 -ml-1 text-slate-700 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors active:scale-95"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-200">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900 leading-tight">
                Fabric Manager
              </h1>
              <p className="text-[11px] font-medium text-indigo-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {currentUser?.companyName || 'Fabric Hub'} &gt; {currentUser?.name || 'Admin'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Offline Connectivity Notification Banner */}
      {!isOnline && (
        <div
          role="status"
          aria-live="polite"
          className="bg-amber-500 text-white text-[11px] font-bold px-3 py-1 flex items-center justify-center gap-1.5 shadow-xs sticky top-[53px] z-30 transition-all duration-300"
        >
          <WifiOff className="w-3.5 h-3.5 shrink-0 animate-pulse" />
          <span>Offline Mode — Cached data active. Changes will sync when reconnected.</span>
        </div>
      )}

      {/* Slide-over Mobile Drawer / Sidebar */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setDrawerOpen(false)}
          ></div>

          {/* Drawer content */}
          <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col justify-between p-5 z-10 animate-in slide-in-from-left duration-200">
            <div>
              {/* Drawer header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Fabric Manager</h2>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                      <ShieldCheck className="w-3 h-3" /> Admin Portal
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Admin Profile Details Card */}
              <div className="mt-4 p-3.5 bg-gradient-to-br from-indigo-50/80 to-purple-50/80 rounded-2xl border border-indigo-100/80">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold text-base flex items-center justify-center shadow">
                    {currentUser?.name?.charAt(0) || 'A'}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-slate-900 truncate">{currentUser?.name}</p>
                    <p className="text-xs text-indigo-700 font-medium flex items-center gap-1 truncate">
                      <Building2 className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{currentUser?.companyName}</span>
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-indigo-100/60 space-y-1 text-xs text-slate-600">
                  {currentUser?.phone && (
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                      <span className="font-medium">{currentUser?.phone}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Navigation Links in Drawer */}
              <nav className="mt-5 space-y-1">
                <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Navigation
                </p>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      onClick={() => setDrawerOpen(false)}
                      className={({ isActive }) => {
                        const active =
                          item.to === '/'
                            ? isHomeActive
                            : item.to === '/transactions'
                              ? isTransactionActive
                              : isActive;
                        return `flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${active
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                          : 'text-slate-700 hover:bg-slate-100'
                          }`;
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-50" />
                    </NavLink>
                  );
                })}
              </nav>

              {/* Admin Setup Shortcut banner */}
              <div className="mt-5 p-3 bg-slate-900 text-white rounded-xl">
                <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Admin Control Center</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1">
                  Configure fabrics, mills, units & orders seamlessly.
                </p>
                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    navigate('/setup');
                  }}
                  className="mt-2.5 w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold text-center block transition-colors"
                >
                  Manage Business Setup
                </button>
              </div>
            </div>

            {/* Logout button */}
            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Screen Content */}
      <main className="flex-1 pb-24 px-4 py-4 overflow-y-auto">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-1.5 sm:px-4 py-1.5 sm:py-2 flex items-center justify-around shadow-lg max-w-md sm:max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto pb-safe">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => {
                const active =
                  item.to === '/'
                    ? isHomeActive
                    : item.to === '/transactions'
                      ? isTransactionActive
                      : isActive;
                return `flex flex-col items-center justify-center py-1 px-1.5 xs:px-2.5 sm:px-3 rounded-2xl transition-all duration-200 ${active
                  ? 'text-indigo-600 font-bold scale-105'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
                  }`;
              }}
            >
              {({ isActive }) => {
                const active =
                  item.to === '/'
                    ? isHomeActive
                    : item.to === '/transactions'
                      ? isTransactionActive
                      : isActive;
                return (
                  <>
                    <div
                      className={`p-1.5 rounded-xl transition-all ${active ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500'
                        }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] mt-0.5 tracking-tight">{item.label}</span>
                  </>
                );
              }}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
