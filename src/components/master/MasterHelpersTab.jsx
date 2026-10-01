import React from 'react';
import { HeartHandshake, Phone, UserCheck, MessageSquare } from 'lucide-react';
import { isAssistantHelper, isExternalHelper } from '../../utils/masterHelpers';

export default function MasterHelpersTab({ assignedHelpers = [], masterName = '' }) {
  // Filter strictly to Assistant and Internal helpers (exclude External)
  const validHelpers = assignedHelpers.filter((h) => !isExternalHelper(h));

  const assistantHelpers = validHelpers.filter((h) => isAssistantHelper(h));
  const internalHelpers = validHelpers.filter((h) => !isAssistantHelper(h));

  const renderHelperCard = (h) => {
    const isAssistant = isAssistantHelper(h);
    const phoneDigits = (h.phone || '').replace(/\D/g, '');
    const cleanPhone = phoneDigits.length === 10 ? `91${phoneDigits}` : phoneDigits;
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
          `Hello ${h.name}, this is Master ${masterName || 'Cutting Master'}.`
        )}`
      : null;

    return (
      <div
        key={h.id}
        className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between gap-2.5"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 ${
              isAssistant
                ? 'bg-purple-100 text-purple-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {h.name?.slice(0, 2).toUpperCase() || 'HE'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="text-xs font-bold text-slate-900 truncate">{h.name}</h4>
              {isAssistant ? (
                <span className="text-[9px] bg-purple-50 text-purple-700 border border-purple-200/60 font-extrabold uppercase px-1.5 py-0.2 rounded-full shrink-0">
                  Assistant
                </span>
              ) : (
                <span className="text-[9px] bg-amber-50 text-amber-800 border border-amber-200/60 font-extrabold uppercase px-1.5 py-0.2 rounded-full shrink-0">
                  Internal
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 flex-wrap mt-0.5">
              <span className="text-slate-600 font-medium truncate max-w-[170px] sm:max-w-none">
                {h.workType || (isAssistant ? 'Cutting Table Assistant' : 'Thread Trimming & General Chores')}
              </span>
              {isAssistant && (h.assignedMasterName || masterName) && (
                <span className="inline-flex items-center text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-100 px-1.5 py-0.2 rounded-md shrink-0">
                  Master: {h.assignedMasterName || masterName}
                </span>
              )}
              {!isAssistant && h.wageType && (
                <span className="inline-flex items-center text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/70 px-1.5 py-0.2 rounded-md shrink-0">
                  {h.wageType === 'Monthly' ? 'Monthly Salary + Chores' : `${h.wageType} Wage`}
                </span>
              )}
              {h.phone && (
                <span className="text-slate-400 flex items-center gap-0.5 text-[10px]">
                  <Phone className="w-2.5 h-2.5" />
                  <span>{h.phone}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl transition-colors shrink-0"
              title="Message on WhatsApp"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </a>
          )}
          {h.phone && (
            <a
              href={`tel:${h.phone}`}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors shrink-0"
              title={`Call ${h.name}`}
            >
              Call
            </a>
          )}
        </div>
      </div>
    );
  };

  if (validHelpers.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Floor Helpers & Assistants
        </h3>
        <div className="p-8 bg-white rounded-3xl border border-dashed border-slate-300 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-700">No Helpers Available</h4>
          <p className="text-xs text-slate-500">
            When factory admin assigns table assistants or adds internal floor helpers, they will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. Assistant Helpers */}
      {assistantHelpers.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-purple-600" />
              <span>Table Assistants ({assistantHelpers.length})</span>
            </h3>
          </div>
          <div className="space-y-2">
            {assistantHelpers.map(renderHelperCard)}
          </div>
        </div>
      )}

      {/* 2. Internal Floor Helpers */}
      {internalHelpers.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <HeartHandshake className="w-3.5 h-3.5 text-amber-600" />
                <span>Internal Floor Helpers ({internalHelpers.length})</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Support staff available for thread trimming and factory chores
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {internalHelpers.map(renderHelperCard)}
          </div>
        </div>
      )}
    </div>
  );
}
