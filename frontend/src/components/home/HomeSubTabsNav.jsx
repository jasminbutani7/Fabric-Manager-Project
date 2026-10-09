import React from 'react';
import { TrendingUp, Zap, Truck, Clock } from 'lucide-react';

export default function HomeSubTabsNav({
  activeTab,
  setActiveTab,
  runningLotsCount = 0,
  urgentActionsCount = 0,
  suppliersCount = 0,
  feedActivitiesCount = 0,
}) {
  const tabs = [
    {
      id: 'pulse',
      label: 'Activities',
      icon: TrendingUp,
      count: urgentActionsCount > 0 ? urgentActionsCount : runningLotsCount,
      color: 'text-indigo-700',
    },
    {
      id: 'actions',
      label: 'Actions',
      icon: Zap,
      count: 14,
      color: 'text-indigo-700',
    },
    {
      id: 'suppliers',
      label: 'Suppliers',
      icon: Truck,
      count: suppliersCount,
      color: 'text-blue-700',
    },
    {
      id: 'feed',
      label: 'Feed',
      icon: Clock,
      count: feedActivitiesCount,
      color: 'text-indigo-700',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-1 sm:gap-1.5 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/80 text-center shadow-2xs">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`py-1.5 px-1 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 cursor-pointer ${
              isActive
                ? `bg-white ${tab.color} shadow-xs ring-1 ring-black/5 font-extrabold`
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[10px] sm:text-xs truncate">{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold leading-none shrink-0 ${
                  isActive ? 'bg-slate-100 text-slate-800' : 'bg-slate-200/70 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
