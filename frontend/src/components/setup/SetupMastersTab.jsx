import React, { useState } from 'react';
import {
  UserCheck,
  Plus,
  Search,
  ChevronDown,
  Phone,
  Trash2,
  UserMinus,
  Calendar,
  RotateCcw,
  HeartHandshake,
  Copy,
  ExternalLink,
  Share2,
  Edit2,
} from 'lucide-react';
import { useFactorySetup } from '../../context/domain';
import { buildWhatsAppUrl } from '../../utils/whatsappNotification';

export default function SetupMastersTab({
  onAddMaster,
  onEditMaster,
  onRelieveMaster,
}) {
  const {
    masters = [],
    helpers = [],
    reactivateWorker,
    deleteWorkerPermanent,
  } = useFactorySetup();

  const [masterSubFilter, setMasterSubFilter] = useState('active'); // 'active' | 'former'
  const [masterSearch, setMasterSearch] = useState('');
  const [expandedCardIds, setExpandedCardIds] = useState(new Set());
  const [copiedPortalId, setCopiedPortalId] = useState(null);

  const toggleCardExpand = (id) => {
    setExpandedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExpandAll = (ids) => setExpandedCardIds(new Set(ids));
  const handleCollapseAll = () => setExpandedCardIds(new Set());

  const handleCopyPortalLink = (url, id) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
    setCopiedPortalId(id);
    setTimeout(() => setCopiedPortalId(null), 2500);
  };

  const activeMasters = masters.filter((m) => m.status !== 'Left');
  const formerMasters = masters.filter((m) => m.status === 'Left');

  const displayedMasters = (masterSubFilter === 'active' ? activeMasters : formerMasters).filter(
    (m) =>
      m.name.toLowerCase().includes(masterSearch.toLowerCase()) ||
      m.phone.includes(masterSearch) ||
      (m.specialization && m.specialization.toLowerCase().includes(masterSearch.toLowerCase()))
  );

  return (
    <div className="space-y-3.5 animate-in fade-in duration-200">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Cutting & Production Masters</h2>
          <p className="text-[11px] text-slate-500">
            Department leads, cutting supervisors & retained master records
          </p>
        </div>
        <button
          type="button"
          onClick={onAddMaster}
          className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-md shadow-purple-100 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Master</span>
        </button>
      </div>

      {/* Sub-tab pills: Active Masters vs Former Masters */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMasterSubFilter('active')}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
            masterSubFilter === 'active'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600'
          }`}
        >
          <span>Active Masters</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
              masterSubFilter === 'active'
                ? 'bg-white/20 text-white'
                : 'bg-purple-50 text-purple-700'
            }`}
          >
            {activeMasters.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMasterSubFilter('former')}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
            masterSubFilter === 'former'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600'
          }`}
        >
          <span>Former Masters Archive</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
              masterSubFilter === 'former'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {formerMasters.length}
          </span>
        </button>
      </div>

      {/* Search bar & Expand All Toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={`Search ${masterSubFilter === 'active' ? 'active' : 'former'} masters...`}
            value={masterSearch}
            onChange={(e) => setMasterSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {displayedMasters.length > 0 && (() => {
          const allMasterIds = displayedMasters.map((m) => `master-${m.id}`);
          const allExpanded = allMasterIds.every((id) => expandedCardIds.has(id));
          return (
            <button
              type="button"
              onClick={() => (allExpanded ? handleCollapseAll() : handleExpandAll(allMasterIds))}
              className="px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1 shrink-0 whitespace-nowrap cursor-pointer"
              title={allExpanded ? 'Collapse All Cards' : 'Expand All Cards'}
            >
              <span>{allExpanded ? '▲ Collapse All' : '▼ Expand All'}</span>
            </button>
          );
        })()}
      </div>

      <div className="space-y-2.5">
        {displayedMasters.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl border border-dashed border-slate-300 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
              <UserCheck className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              {masterSubFilter === 'active' ? 'No Active Masters' : 'No Former Masters in Archive'}
            </h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              {masterSubFilter === 'active'
                ? "Tap '+ Add Master' above to register your cutting or pattern leads."
                : 'When a master retires or leaves, their full record will be preserved here.'}
            </p>
          </div>
        ) : (
          displayedMasters.map((m) => {
            const cardId = `master-${m.id}`;
            const isExpanded = expandedCardIds.has(cardId);
            const isFormer = m.status === 'Left';
            const masterHelpers = (helpers || []).filter(
              (h) => h.assignedMasterId === m.id && h.status !== 'Left'
            );

            return (
              <div
                key={m.id}
                onClick={() => toggleCardExpand(cardId)}
                className={`p-3 bg-white rounded-2xl border shadow-xs transition-all cursor-pointer ${
                  isFormer
                    ? 'border-slate-300/80 bg-slate-50/50 hover:border-slate-400'
                    : 'border-slate-200/80 hover:border-purple-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${
                        isFormer
                          ? 'bg-slate-200 text-slate-600'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {m.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h3 className="text-xs font-bold text-slate-900 truncate">{m.name}</h3>
                        {isFormer ? (
                          <span className="text-[9px] bg-slate-100 text-slate-600 border border-slate-200 font-extrabold uppercase px-1.5 py-0.2 rounded-full shrink-0">
                            Former
                          </span>
                        ) : (
                          <span className="text-[9px] bg-purple-50 text-purple-700 border border-purple-200/60 font-extrabold uppercase px-1.5 py-0.2 rounded-full shrink-0">
                            Master
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 flex-wrap mt-0.5">
                        <span className="text-slate-600 font-medium truncate max-w-[150px] sm:max-w-none">
                          {m.specialization || m.experience || 'Cutting Master'}
                        </span>
                        {masterHelpers.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.2 rounded-md shrink-0 whitespace-nowrap">
                            <HeartHandshake className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                            <span>{masterHelpers.length} Helper{masterHelpers.length > 1 ? 's' : ''}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {m.phone && (
                      <a
                        href={`tel:${m.phone}`}
                        className="w-7 h-7 text-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg flex items-center justify-center transition-colors shrink-0"
                        title={`Call ${m.phone}`}
                      >
                        <Phone className="w-3.5 h-3.5 text-purple-600" />
                      </a>
                    )}

                    {!isFormer ? (
                      <>
                        {onEditMaster && (
                          <button
                            type="button"
                            onClick={() => onEditMaster(m)}
                            title="Edit Master Details"
                            className="w-7 h-7 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onRelieveMaster(m.id)}
                          title="Mark as Left (Archive records)"
                          className="w-7 h-7 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Permanently remove record for ${m.name}?`)) {
                            deleteWorkerPermanent('master', m.id);
                          }
                        }}
                        title="Permanently purge"
                        className="w-7 h-7 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleCardExpand(cardId)}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-purple-50 hover:text-purple-600 text-slate-500 flex items-center justify-center shrink-0 cursor-pointer transition-colors shadow-2xs"
                      title={isExpanded ? 'Collapse' : 'Expand Details'}
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180 text-purple-600' : 'text-slate-400'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Expandable Details */}
                {isExpanded && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-3 pt-3 border-t border-slate-100 space-y-2.5 cursor-default animate-in fade-in duration-150"
                  >
                    {m.specialization && (
                      <div className="flex items-center justify-between text-[11px] bg-slate-50 px-2.5 py-1.5 rounded-xl text-slate-600">
                        <span>Specialization: <strong className="text-purple-700">{m.specialization}</strong></span>
                      </div>
                    )}

                    {isFormer ? (
                      <div className="pt-2 border-t border-slate-200/70 space-y-2">
                        <div className="p-2.5 bg-purple-50/70 border border-purple-100 rounded-xl text-[11px] text-purple-900">
                          <p className="font-semibold flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-purple-600" />
                            <span>Left on: {m.leftDate || 'Recorded'}</span>
                          </p>
                          {m.exitReason && (
                            <p className="text-purple-800 mt-0.5 text-[10px]">
                              <span className="font-bold">Reason:</span> {m.exitReason}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            reactivateWorker('master', m.id);
                            setMasterSubFilter('active');
                          }}
                          className="w-full py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
                          <span>Reactivate {m.name} (Returning Master)</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50/60 px-2.5 py-1.5 rounded-xl">
                          <a
                            href={`tel:${m.phone}`}
                            className="flex items-center gap-1 text-[11px] text-slate-600 hover:text-purple-700"
                          >
                            <Phone className="w-3.5 h-3.5 text-purple-600" />
                            <span>{m.phone}</span>
                          </a>
                          {m.experience ? (
                            <span className="text-[11px] bg-white border border-slate-200 px-2 py-0.5 rounded-md font-medium">
                              Exp: {m.experience}
                            </span>
                          ) : (
                            <span className="text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md">
                              Active Floor Lead
                            </span>
                          )}
                        </div>

                        {/* Helpers Assigned to this Master */}
                        {masterHelpers.length > 0 && (
                          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-600">
                            <HeartHandshake className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span className="font-semibold text-slate-700">Assisting Helpers:</span>
                            <div className="flex flex-wrap gap-1">
                              {masterHelpers.map((h) => (
                                <span
                                  key={h.id}
                                  className="bg-amber-50 text-amber-800 font-bold px-1.5 py-0.5 rounded text-[10px] border border-amber-200/60"
                                >
                                  {h.name} ({h.workType || 'Assistant'})
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Unique Master Portal Link & WhatsApp Share */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const origin = typeof window !== 'undefined' ? window.location.origin : '';
                              const url = `${origin}/portal/master/${m.id}`;
                              handleCopyPortalLink(url, m.id);
                            }}
                            className="flex-1 py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-[11px] font-bold border border-purple-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5 text-purple-600" />
                            <span>{copiedPortalId === m.id ? '✓ Link Copied!' : 'Copy Portal Link'}</span>
                          </button>
                          <a
                            href={`/portal/master/${m.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-200 rounded-xl transition-colors"
                            title="Open Master Portal"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          {m.phone && (
                            <a
                              href={buildWhatsAppUrl(
                                m.phone,
                                `Namaste ${m.name}, here is your Fabric Manager Master Portal link to view your assigned fabrics and fabric cuts: ${typeof window !== 'undefined' ? window.location.origin : ''}/portal/master/${m.id}`
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-colors"
                              title="Send Portal Link via WhatsApp"
                            >
                              <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>WhatsApp</span>
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
