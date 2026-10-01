import React from 'react';
import {
  UserCheck,
  ArrowRight,
  ChevronDown,
  Clock,
  Check,
  Share2,
  Edit2,
} from 'lucide-react';

export default function Step2AssignMaster({
  fabric: f,
  isProductConfigured,
  isUnderMasterReview,
  isMasterAccepted,
  isStep2Open,
  toggleStep2,
  targetSets = 0,
  dueStatus,
  masters = [],
  onOpenAssignMasterModal,
  navigate,
}) {
  if (!f.assignedMasterId) {
    return (
      <div
        className={`p-3 rounded-xl flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap border-2 ${isProductConfigured
          ? 'bg-purple-50/80 border-dashed border-purple-300'
          : 'bg-slate-50 border-slate-200 opacity-75'
          }`}
      >
        <div className="flex items-start gap-2.5 min-w-0">
          <span
            className={`w-6 h-6 rounded-full text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5 shadow-2xs ${isProductConfigured ? 'bg-purple-600' : 'bg-slate-400'
              }`}
          >
            2
          </span>
          <div>
            <h4
              className={`text-xs font-extrabold flex items-center gap-1.5 ${isProductConfigured ? 'text-purple-950' : 'text-slate-700'
                }`}
            >
              <span>Step 2: Assign to Cutting Master</span>
              {isProductConfigured ? (
                <span className="text-[9px] font-black uppercase tracking-wider bg-purple-200 text-purple-900 px-1.5 py-0.2 rounded">
                  Next Step
                </span>
              ) : (
                <span className="text-[9px] font-medium text-slate-500 bg-slate-200 px-1.5 py-0.2 rounded">
                  Requires Step 1
                </span>
              )}
            </h4>
            <p
              className={`text-[11px] mt-0.5 ${isProductConfigured ? 'text-purple-800/90' : 'text-slate-500'
                }`}
            >
              {isProductConfigured
                ? 'Assign fabric roll meters to a Cutting Master with a target due date.'
                : 'Set up product structure in Step 1 first, then assign to master.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => onOpenAssignMasterModal?.(f)}
            className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 ${isProductConfigured
              ? 'bg-purple-600 hover:bg-purple-700 text-white'
              : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
              }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Assign Master</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/orders?tab=cuttings')}
            className="p-2 rounded-xl text-purple-800 hover:bg-purple-100/60 border border-purple-300 bg-white shadow-2xs transition-all cursor-pointer"
            title="Show More"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  const masterObj =
    masters.find((m) => m.id === f.assignedMasterId) ||
    masters.find(
      (m) =>
        m.name &&
        f.assignedMasterName &&
        m.name.trim().toLowerCase() === f.assignedMasterName.trim().toLowerCase()
    );
  const phoneDigits = (masterObj?.phone || '').replace(/\D/g, '');
  const lotTitle = `${f.fabricType || 'Fabric'}${f.color ? ` (${f.color})` : ''}${f.lotNo ? ` #${f.lotNo}` : ''}`;
  const targetMasterId = masterObj?.id || f.assignedMasterId;
  const masterPortalUrl = targetMasterId
    ? `${window.location.origin}/portal/master/${targetMasterId}`
    : null;

  const struct = f.productStructure || f.product_structure;
  const subPartsList = Array.isArray(struct?.subParts) ? struct.subParts : [];
  const partsSummary = subPartsList.length > 0
    ? ` Parts: ${subPartsList.map((p) => p.name).join(', ')}.`
    : '';
  const waMsg = `Namaste ${f.assignedMasterName || masterObj?.name || 'Master'}, fabric lot "${lotTitle}" is assigned to you.${f.dueDate ? ` Target Due Date: ${f.dueDate}.` : ''}${partsSummary}${masterPortalUrl ? ` View & Accept Work: ${masterPortalUrl}` : ''}`;
  const waUrl = phoneDigits
    ? `https://wa.me/91${phoneDigits}?text=${encodeURIComponent(waMsg)}`
    : `https://wa.me/?text=${encodeURIComponent(waMsg)}`;

  return (
    <div
      className={`rounded-xl border overflow-hidden shadow-2xs transition-all ${isUnderMasterReview
        ? 'bg-gradient-to-br from-amber-50/80 via-orange-50/40 to-slate-50/80 border-amber-200'
        : 'bg-gradient-to-br from-purple-50/70 via-emerald-50/30 to-slate-50/80 border-purple-200/80'
        }`}
    >
      {/* Header */}
      <div
        onClick={toggleStep2}
        className="p-2.5 sm:p-3 flex items-center justify-between gap-2 cursor-pointer select-none hover:bg-purple-100/30 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow-2xs ${isUnderMasterReview
              ? 'bg-amber-500 text-white'
              : 'bg-emerald-600 text-white'
              }`}
          >
            {isUnderMasterReview ? (
              <Clock className="w-3 h-3 stroke-[2.5]" />
            ) : (
              <Check className="w-3 h-3 stroke-[3]" />
            )}
          </span>
          <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
            <span
              className={`text-[10px] font-black uppercase tracking-wider ${isUnderMasterReview ? 'text-amber-900' : 'text-purple-900'
                }`}
            >
              {isUnderMasterReview
                ? 'Step 2: Awaiting Master Review'
                : 'Step 2: Master Custody'}
            </span>
            <span className="text-xs font-black text-slate-900 truncate">
              • {f.assignedMasterName}
            </span>
            {masterObj?.phone && (
              <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
                ({masterObj.phone})
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <span className="text-[10px] font-bold text-purple-950 bg-white/90 px-2 py-0.5 rounded-lg border border-purple-200 shadow-2xs hidden xs:inline">
            {f.plainMeters ? `${f.plainMeters} m` : ''}{f.plainMeters && targetSets ? ' • ' : ''}{targetSets ? `${targetSets} Sets` : ''}
          </span>

          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 sm:px-2 sm:py-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
              title="Ping Cutting Master on WhatsApp"
            >
              <Share2 className="w-3 h-3" />
              <span className="hidden md:inline">WhatsApp</span>
            </a>
          )}

          <button
            type="button"
            onClick={() => navigate('/orders?tab=cuttings')}
            className="p-1 sm:px-2 sm:py-1 rounded-lg text-purple-700 hover:text-purple-950 hover:bg-purple-50 transition-all flex items-center gap-1 text-[11px] font-bold border border-purple-200 bg-white shadow-2xs cursor-pointer"
            title="Show More"
          >
            <span className="hidden sm:inline">Show More</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={toggleStep2}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-transform cursor-pointer"
            title={isStep2Open ? 'Collapse Step 2' : 'Expand Step 2'}
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isStep2Open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      {isStep2Open && (
        <div className="p-3 pt-0 border-t border-purple-100 animate-in fade-in duration-150 space-y-2.5">
          <div className="pt-2.5 flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-500">
              Master Assignment & Material Details
            </span>
            {isUnderMasterReview && !isMasterAccepted && (
              <button
                type="button"
                onClick={() => onOpenAssignMasterModal?.(f)}
                className="px-2 py-1 text-xs font-bold text-purple-700 bg-white hover:bg-purple-50 hover:text-purple-900 rounded-lg border border-purple-200 flex items-center gap-1 transition-all cursor-pointer shadow-2xs shrink-0"
                title="Change Cutting Master or Due Date"
              >
                <Edit2 className="w-3 h-3" />
                <span>Change Master</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-0.5">
            <div className="p-2 bg-white/90 rounded-lg border border-purple-100">
              <span className="text-[9px] font-bold text-slate-400 uppercase block">
                Assigned Material
              </span>
              <span className="text-xs font-black text-purple-950">
                {f.plainMeters ? `${f.plainMeters} m` : '0 m'}
              </span>
            </div>
            <div className="p-2 bg-white/90 rounded-lg border border-purple-100">
              <span className="text-[9px] font-bold text-slate-400 uppercase block">
                Expected Sets
              </span>
              <span className="text-xs font-black text-purple-950">
                {targetSets ? `${targetSets} Sets` : 'Not set'}
              </span>
            </div>
            <div className="p-2 bg-white/90 rounded-lg border border-purple-100">
              <span className="text-[9px] font-bold text-slate-400 uppercase block">
                Fabric / Color
              </span>
              <span className="text-xs font-black text-purple-950 truncate block">
                {f.fabricType || 'Fabric'}
                {f.color ? ` (${f.color})` : ''}
              </span>
            </div>
            <div className="p-2 bg-white/90 rounded-lg border border-purple-100">
              <span className="text-[9px] font-bold text-slate-400 uppercase block">
                Target Due Date
              </span>
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-xs font-black text-slate-900">
                  {f.dueDate || 'Not set'}
                </span>
                {dueStatus?.isWarning && (
                  <span
                    className={`text-[8px] font-black px-1 rounded-full ${dueStatus.className}`}
                  >
                    {dueStatus.label}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
