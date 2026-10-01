import React, { useState } from 'react';
import {
  Scissors,
  Plus,
  Search,
  ChevronDown,
  Phone,
  Trash2,
  UserMinus,
  Calendar,
  RotateCcw,
  Cog,
  RefreshCw,
  Copy,
  ExternalLink,
  Share2,
  Check,
  Edit2,
} from 'lucide-react';
import { useFactorySetup } from '../../context/domain';

export default function SetupTailorsTab({
  onAddTailor,
  onEditTailor,
  onRelieveTailor,
  onOpenReplace,
}) {
  const {
    tailors = [],
    machines = [],
    assignTailorToMachine,
    unassignTailorFromMachine,
    reactivateWorker,
    deleteWorkerPermanent,
  } = useFactorySetup();

  const [tailorSubFilter, setTailorSubFilter] = useState('active'); // 'active' | 'former'
  const [tailorSearch, setTailorSearch] = useState('');
  const [expandedCardIds, setExpandedCardIds] = useState(new Set());
  const [reassignTailorId, setReassignTailorId] = useState(null);
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

  const activeTailors = tailors.filter((t) => t.status !== 'Left');
  const formerTailors = tailors.filter((t) => t.status === 'Left');

  const displayedTailors = (tailorSubFilter === 'active' ? activeTailors : formerTailors).filter(
    (t) =>
      t.name.toLowerCase().includes(tailorSearch.toLowerCase()) ||
      t.phone.includes(tailorSearch) ||
      (t.specialty && t.specialty.toLowerCase().includes(tailorSearch.toLowerCase()))
  );

  return (
    <div className="space-y-3.5 animate-in fade-in duration-200">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Tailors (Stitchers)</h2>
          <p className="text-[11px] text-slate-500">
            Manage operators, replacements, and preserved archives
          </p>
        </div>
        <button
          type="button"
          onClick={onAddTailor}
          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-md shadow-emerald-100 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Tailor</span>
        </button>
      </div>

      {/* Sub-tab pills: Active Staff vs Former Staff */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTailorSubFilter('active')}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
            tailorSubFilter === 'active'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600'
          }`}
        >
          <span>Active Staff</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
              tailorSubFilter === 'active'
                ? 'bg-white/20 text-white'
                : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            {activeTailors.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTailorSubFilter('former')}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
            tailorSubFilter === 'former'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600'
          }`}
        >
          <span>Former Staff Archive</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
              tailorSubFilter === 'former'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {formerTailors.length}
          </span>
        </button>
      </div>

      {/* Search bar & Expand All Toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={`Search ${tailorSubFilter === 'active' ? 'active' : 'former'} tailors by name or phone...`}
            value={tailorSearch}
            onChange={(e) => setTailorSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {displayedTailors.length > 0 && (() => {
          const allTailorIds = displayedTailors.map((t) => `tailor-${t.id}`);
          const allExpanded = allTailorIds.every((id) => expandedCardIds.has(id));
          return (
            <button
              type="button"
              onClick={() => (allExpanded ? handleCollapseAll() : handleExpandAll(allTailorIds))}
              className="px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1 shrink-0 whitespace-nowrap cursor-pointer"
              title={allExpanded ? 'Collapse All Cards' : 'Expand All Cards'}
            >
              <span>{allExpanded ? '▲ Collapse All' : '▼ Expand All'}</span>
            </button>
          );
        })()}
      </div>

      {/* Tailor Cards */}
      <div className="space-y-2.5">
        {displayedTailors.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl border border-dashed border-slate-300 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <Scissors className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              {tailorSubFilter === 'active' ? 'No Active Tailors' : 'No Former Staff in Archive'}
            </h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              {tailorSubFilter === 'active'
                ? "Tap '+ Add Tailor' above to register a tailor and assign them to a machine."
                : 'When a tailor leaves or is replaced, their full record and history will appear safely here.'}
            </p>
          </div>
        ) : (
          displayedTailors.map((t) => {
            const cardId = `tailor-${t.id}`;
            const isExpanded = expandedCardIds.has(cardId);
            const assignedMachine = machines.find((m) => m.id === t.assignedMachineId);
            const isFormer = t.status === 'Left';

            return (
              <div
                key={t.id}
                onClick={() => toggleCardExpand(cardId)}
                className={`p-3 bg-white rounded-2xl border shadow-xs transition-all cursor-pointer ${
                  isFormer
                    ? 'border-slate-300/80 bg-slate-50/50 hover:border-slate-400'
                    : 'border-slate-200/80 hover:border-emerald-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className={`w-8 h-8 rounded-full font-extrabold text-xs flex items-center justify-center shrink-0 shadow-2xs ${
                        isFormer
                          ? 'bg-slate-200 text-slate-600'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {t.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h3 className="text-xs font-bold text-slate-900 truncate">{t.name}</h3>
                        {isFormer ? (
                          <span className="text-[9px] bg-slate-100 text-slate-600 border border-slate-200 font-extrabold uppercase px-1.5 py-0.2 rounded-full shrink-0">
                            Former
                          </span>
                        ) : (
                          <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-extrabold uppercase px-1.5 py-0.2 rounded-full shrink-0">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 flex-wrap mt-0.5">
                        {assignedMachine ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100/80 px-1.5 py-0.2 rounded-md shrink-0 whitespace-nowrap">
                            <Cog className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                            <span>{assignedMachine.code}</span>
                            <span className="text-indigo-400 font-normal">
                              ({assignedMachine.line ? (assignedMachine.line.toLowerCase().startsWith('block') ? assignedMachine.line : `Block ${assignedMachine.line}`) : 'Block A'})
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.2 rounded-md shrink-0 whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                            <span>Standby Float</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {t.phone && (
                      <a
                        href={`tel:${t.phone}`}
                        className="w-7 h-7 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg flex items-center justify-center transition-colors shrink-0"
                        title={`Call ${t.phone}`}
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}

                    {isFormer ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Permanently remove record for ${t.name}?`)) {
                            deleteWorkerPermanent('tailor', t.id);
                          }
                        }}
                        title="Permanently remove"
                        className="w-7 h-7 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <>
                        {onEditTailor && (
                          <button
                            type="button"
                            onClick={() => onEditTailor(t)}
                            title="Edit Tailor Details"
                            className="w-7 h-7 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onRelieveTailor(t.id)}
                          title="Mark as Left (Archive records)"
                          className="w-7 h-7 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleCardExpand(cardId)}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 text-slate-500 flex items-center justify-center shrink-0 cursor-pointer transition-colors shadow-2xs"
                      title={isExpanded ? 'Collapse' : 'Expand Details'}
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180 text-emerald-600' : 'text-slate-400'
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
                    {/* If Former Staff: Show departure history & Reactivate button */}
                    {isFormer ? (
                      <div className="pt-2 border-t border-slate-200/70 space-y-2">
                        <div className="p-2.5 bg-amber-50/70 border border-amber-100 rounded-xl text-[11px] text-amber-900">
                          <p className="font-semibold flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-amber-600" />
                            <span>Left on: {t.leftDate || 'Recorded'}</span>
                          </p>
                          {t.exitReason && (
                            <p className="text-amber-800 mt-0.5 text-[10px]">
                              <span className="font-bold">Reason:</span> {t.exitReason}
                            </p>
                          )}
                          {t.pastAssignments && (
                            <p className="text-amber-800 mt-0.5 text-[10px]">
                              <span className="font-bold">Past Machine:</span>{' '}
                              {t.pastAssignments.join(', ')}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            reactivateWorker('tailor', t.id);
                            setTailorSubFilter('active');
                          }}
                          className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Reactivate {t.name} (Returning Staff)</span>
                        </button>
                      </div>
                    ) : (
                      /* If Active Staff: Machine Assignment & Replacement controls */
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        {reassignTailorId === t.id ? (
                          <div className="space-y-2 p-3 bg-slate-50 border border-emerald-200 rounded-xl animate-in fade-in-50">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                                Select Machine to Assign:
                              </label>
                              <button
                                type="button"
                                onClick={() => setReassignTailorId(null)}
                                className="text-[11px] text-slate-500 hover:text-slate-800 font-bold px-2 py-0.5 rounded-md hover:bg-slate-200/60 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  unassignTailorFromMachine(t.id);
                                  setReassignTailorId(null);
                                }}
                                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold text-left flex items-center justify-between border transition-all ${
                                  !t.assignedMachineId
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold shadow-xs'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                <span className="italic">-- No Machine (Standby Float) --</span>
                                {!t.assignedMachineId && <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />}
                              </button>
                              {machines.map((m) => {
                                const isCurrent = t.assignedMachineId === m.id;
                                return (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => {
                                      assignTailorToMachine(t.id, m.id);
                                      setReassignTailorId(null);
                                    }}
                                    className={`w-full px-3 py-2 rounded-xl text-xs font-semibold text-left flex items-center justify-between border transition-all ${
                                      isCurrent
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold shadow-xs'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0 pr-2">
                                      <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md font-bold border border-slate-200 shrink-0">
                                        {m.code}
                                      </span>
                                      <span className="truncate">{m.name}</span>
                                      {m.line && (
                                        <span className="text-[10px] text-slate-600 shrink-0">({m.line})</span>
                                      )}
                                    </div>
                                    {isCurrent && <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5] shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            {assignedMachine ? (
                              <div className="flex items-center gap-2">
                                <span className="p-1 bg-indigo-50 text-indigo-600 rounded-md font-bold text-[10px]">
                                  {assignedMachine.code}
                                </span>
                                <div className="text-[11px]">
                                  <p className="font-bold text-slate-800 leading-tight">
                                    {assignedMachine.name}
                                  </p>
                                  <p className="text-[10px] text-slate-500">{assignedMachine.line}</p>
                                </div>
                              </div>
                            ) : (
                              <div className="text-[11px] text-amber-600 font-semibold flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                <span>No Machine (Available Float)</span>
                              </div>
                            )}

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setReassignTailorId(t.id)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold cursor-pointer"
                              >
                                {assignedMachine ? 'Change' : 'Assign'}
                              </button>

                              {/* If assigned to machine, provide Replace on Machine */}
                              {assignedMachine && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onOpenReplace({
                                      machineId: assignedMachine.id,
                                      currentTailorId: t.id,
                                    })
                                  }
                                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  <span>Replace</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Unique Tailor Portal Link & WhatsApp Share */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const origin = typeof window !== 'undefined' ? window.location.origin : '';
                              const url = `${origin}/portal/tailor/${t.id}`;
                              handleCopyPortalLink(url, t.id);
                            }}
                            className="flex-1 py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-[11px] font-bold border border-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span>{copiedPortalId === t.id ? '✓ Link Copied!' : 'Copy Portal Link'}</span>
                          </button>
                          <a
                            href={`/portal/tailor/${t.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl transition-colors"
                            title="Open Tailor Portal"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          {t.phone && (
                            <a
                              href={`https://wa.me/91${t.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                                `Namaste ${t.name}, here is your Fabric Manager Tailor Portal link to view your assigned machine, stitching pieces, and earnings: ${typeof window !== 'undefined' ? window.location.origin : ''}/portal/tailor/${t.id}`
                              )}`}
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
