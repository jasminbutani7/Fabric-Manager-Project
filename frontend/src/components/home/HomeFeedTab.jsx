import React from 'react';
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Activity,
  Search,
  X,
  Clock,
  ChevronRight,
  Scissors,
  Layers,
  ShieldCheck,
  Truck,
  IndianRupee,
} from 'lucide-react';

export default function HomeFeedTab({
  progressPercent,
  isSetupExpanded,
  setIsSetupExpanded,
  setupTasks,
  machines,
  masters,
  tailors,
  fabrics,
  filteredFeedActivities,
  feedSearchQuery,
  setFeedSearchQuery,
  feedCategory,
  setFeedCategory,
  feedCategoryCounts,
  navigate,
}) {
  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      {/* Admin Setup Progress Widget */}
      {progressPercent === 100 ? (
        <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/5 rounded-2xl p-3.5 border border-emerald-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-900">
                    Factory Configured
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    100% Ready
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  All 7 factory milestones active and running
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsSetupExpanded(!isSetupExpanded)}
                className="text-[11px] font-bold text-emerald-700 bg-white hover:bg-emerald-50 px-2 py-1 rounded-xl border border-emerald-200 shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>{isSetupExpanded ? 'Hide' : 'Tasks'}</span>
                {isSetupExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => navigate('/setup')}
                className="text-[11px] font-bold text-slate-600 bg-white hover:bg-slate-50 px-2 py-1 rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer"
              >
                Manage →
              </button>
            </div>
          </div>

          {/* Quick Factory Stats Pill Grid */}
          <div className="grid grid-cols-4 gap-1.5 mt-3 pt-2.5 border-t border-emerald-200/40 text-center">
            <div className="bg-white/90 rounded-xl p-1.5 border border-emerald-100/80">
              <p className="text-xs font-black text-slate-800">{machines.length}</p>
              <p className="text-[9px] font-semibold text-slate-500 uppercase">Machines</p>
            </div>
            <div className="bg-white/90 rounded-xl p-1.5 border border-emerald-100/80">
              <p className="text-xs font-black text-slate-800">{masters.length}</p>
              <p className="text-[9px] font-semibold text-slate-500 uppercase">Masters</p>
            </div>
            <div className="bg-white/90 rounded-xl p-1.5 border border-emerald-100/80">
              <p className="text-xs font-black text-slate-800">{tailors.length}</p>
              <p className="text-[9px] font-semibold text-slate-500 uppercase">Tailors</p>
            </div>
            <div className="bg-white/90 rounded-xl p-1.5 border border-emerald-100/80">
              <p className="text-xs font-black text-slate-800">{fabrics.length}</p>
              <p className="text-[9px] font-semibold text-slate-500 uppercase">Fabric</p>
            </div>
          </div>

          {/* Toggled Task Checklist */}
          {isSetupExpanded && (
            <div className="space-y-1.5 mt-3 pt-2.5 border-t border-emerald-200/40 animate-in fade-in duration-150">
              {setupTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => navigate(task.route || '/setup')}
                  className="p-2 rounded-xl border bg-white/90 border-emerald-100/80 flex items-center justify-between cursor-pointer hover:bg-white transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-emerald-500" />
                    <span className="text-xs font-medium text-slate-700">{task.title}</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-100">
                    {task.tag}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Setup Progress
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-indigo-600">
                {progressPercent}% Complete
              </span>
              <button
                type="button"
                onClick={() => navigate('/setup')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
              >
                Manage →
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-2.5">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="space-y-1.5">
            {setupTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => navigate(task.route || '/setup')}
                className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                  task.done
                    ? 'bg-slate-50/70 border-slate-200/70 text-slate-600'
                    : 'bg-indigo-50/40 border-indigo-100 hover:bg-indigo-50 text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    className={`w-3.5 h-3.5 flex-shrink-0 ${task.done ? 'text-emerald-500' : 'text-slate-300'}`}
                  />
                  <span className={`text-xs font-medium ${task.done ? 'line-through text-slate-400' : ''}`}>
                    {task.title}
                  </span>
                </div>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                    task.done
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-indigo-100 text-indigo-700'
                  }`}
                >
                  {task.tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Real-time Activity Feed Card */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs space-y-3">
        {/* Header with live pulse */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Activity className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Floor Activity Feed
              </h3>
              <p className="text-[10px] text-slate-500">Live operational event stream</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-200/70">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-bold text-slate-600">
              {filteredFeedActivities.length} Recent {filteredFeedActivities.length === 1 ? 'Activity' : 'Activities'}
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={feedSearchQuery}
            onChange={(e) => setFeedSearchQuery(e.target.value)}
            placeholder="Search lot, tailor, master, invoice..."
            className="w-full pl-8.5 pr-8 py-1.5 text-xs bg-slate-50/80 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
          />
          {feedSearchQuery && (
            <button
              type="button"
              onClick={() => setFeedSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-nowrap">
          {[
            { id: 'all', label: 'All', icon: Activity, count: feedCategoryCounts.all },
            { id: 'cutting', label: 'Cutting', icon: Scissors, count: feedCategoryCounts.cutting },
            { id: 'stitching', label: 'Stitching', icon: Layers, count: feedCategoryCounts.stitching },
            { id: 'quality', label: 'Quality', icon: ShieldCheck, count: feedCategoryCounts.quality },
            { id: 'delivery', label: 'Delivery', icon: Truck, count: feedCategoryCounts.delivery },
            { id: 'expense', label: 'Expenses', icon: IndianRupee, count: feedCategoryCounts.expense },
          ].map((pill) => {
            const isSelected = feedCategory === pill.id;
            const Icon = pill.icon;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setFeedCategory(pill.id)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 border border-slate-200/50'
                }`}
              >
                {Icon && <Icon className="w-3 h-3 shrink-0" />}
                <span>{pill.label}</span>
                <span
                  className={`text-[9px] px-1 py-0.2 rounded-full font-black ${
                    isSelected ? 'bg-indigo-700/80 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {pill.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Activities List */}
        <div className="space-y-2 pt-1">
          {filteredFeedActivities.length === 0 ? (
            <div className="py-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
              <Clock className="w-7 h-7 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600">No activity recorded</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {feedSearchQuery || feedCategory !== 'all'
                  ? 'No events match your active filters.'
                  : 'Events will appear here as your floor operates.'}
              </p>
              {(feedSearchQuery || feedCategory !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setFeedCategory('all');
                    setFeedSearchQuery('');
                  }}
                  className="mt-2.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            filteredFeedActivities.map((act) => {
              const Icon = act.icon;
              return (
                <div
                  key={act.id}
                  onClick={() => navigate(act.route)}
                  className="group p-2.5 rounded-xl border border-slate-200/70 bg-white hover:bg-slate-50/80 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between gap-2.5 shadow-2xs"
                >
                  {/* Left: Icon container */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${act.iconBg}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs font-bold text-slate-800 truncate leading-snug">
                          {act.title}
                        </p>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border shrink-0 ${act.badgeColor}`}
                        >
                          {act.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {act.subtitle}
                      </p>
                      <span className="text-[9px] text-slate-400 font-medium mt-0.5 block">
                        {act.displayDate}
                      </span>
                    </div>
                  </div>

                  {/* Right: Metrics & Chevron */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-xs font-black text-slate-900 leading-tight">
                        {act.metric}
                      </p>
                      {act.metricSub && (
                        <p className="text-[9px] font-semibold text-slate-400 mt-0.5">
                          {act.metricSub}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
