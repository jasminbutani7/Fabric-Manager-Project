import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  UserCheck,
  Clock,
  FileText,
  Layers,
  CheckCircle2,
  Share2,
  AlertTriangle,
  ChevronDown,
  Check,
} from 'lucide-react';
import { useFactory, useFabric } from '../../context/useManagement';
import AlertModal from './AlertModal';
import { buildWhatsAppUrl } from '../../utils/whatsappNotification';

export default function AssignFabricMasterModal({
  isOpen,
  onClose,
  fabric,
}) {
  const { masters = [] } = useFactory();
  const { updateFabric } = useFabric();
  const activeMasters = masters.filter((m) => m.status !== 'Left');
  const todayStr = new Date().toISOString().split('T')[0];

  const [prevFabricId, setPrevFabricId] = useState(fabric?.id);
  const [formData, setFormData] = useState(() => ({
    assignedMasterId: fabric?.assignedMasterId || '',
    dueDate: fabric?.dueDate || todayStr,
    status: fabric?.status || 'In Stock',
    notes: fabric?.notes || '',
  }));
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const selectedOptionRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isDropdownOpen && selectedOptionRef.current) {
      const timer = setTimeout(() => {
        if (selectedOptionRef.current) {
          selectedOptionRef.current.scrollIntoView({
            block: 'center',
            behavior: 'smooth',
          });
          selectedOptionRef.current.focus({ preventScroll: true });
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isDropdownOpen]);

  if (fabric && fabric.id !== prevFabricId) {
    setPrevFabricId(fabric.id);
    setFormData({
      assignedMasterId: fabric.assignedMasterId || '',
      dueDate: fabric.dueDate || todayStr,
      status: fabric.status || 'In Stock',
      notes: fabric.notes || '',
    });
  }

  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
  });

  if (!isOpen || !fabric) return null;

  const selectedMaster = activeMasters.find((m) => m.id === formData.assignedMasterId);

  // Pre-formatted WhatsApp notification link
  const generateWhatsAppLink = () => {
    if (!selectedMaster) return null;
    const portalUrl = `${window.location.origin}/portal/master/${selectedMaster.id}`;
    const message = `Namaste ${selectedMaster.name}, a new fabric lot "${fabric.fabricType || 'Fabric Lot'} (${fabric.color || 'Standard'})" (${fabric.plainMeters ? fabric.plainMeters + 'm Plain ' : ''}${fabric.printPieces ? fabric.printPieces + ' Sets Target' : ''}) has been assigned to you for cutting (Product: ${fabric.productName || 'Garment'}). Target Due Date: ${formData.dueDate || 'ASAP'}. View your assignments: ${portalUrl}`;

    return buildWhatsAppUrl(selectedMaster.phone, message);
  };

  const isDesignConfigured = Boolean(
    fabric?.productStructure?.subParts &&
    fabric.productStructure.subParts.length > 0 &&
    (fabric.productName || fabric.productStructure.productName)
  );

  const isMasterSelected = Boolean(formData.assignedMasterId && formData.assignedMasterId.trim());

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!isMasterSelected) {
      setAlertModal({
        isOpen: true,
        title: 'Cutting Master Required',
        message: 'Please select an active Cutting Master before saving the assignment.',
        type: 'warning',
      });
      return;
    }

    const masterId = formData.assignedMasterId;
    const chosenMaster = activeMasters.find((m) => m.id === masterId);

    // When Manager assigns a Master, status stays 'In Stock' until Master accepts in portal
    let effectiveStatus = formData.status || fabric.status || 'In Stock';
    if (masterId && fabric.status !== 'In Cutting' && fabric.status !== 'Completed') {
      effectiveStatus = 'In Stock';
    }

    const payload = {
      assignedMasterId: masterId,
      assignedMasterName: chosenMaster ? chosenMaster.name : null,
      dueDate: formData.dueDate || (masterId ? todayStr : ''),
      status: effectiveStatus,
      notes: (formData.notes || '').trim(),
    };

    updateFabric(fabric.id, payload);
    onClose();
  };

  const waLink = generateWhatsAppLink();

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
        <div
          className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden max-h-[92vh] sm:max-h-[88vh] animate-in slide-in-from-bottom sm:zoom-in-95 text-left"
          role="dialog"
          aria-modal="true"
        >
          {/* Header (Sticky Top) */}
          <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50/90 via-indigo-50/40 to-white shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-200 shrink-0">
                <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                  Assign to Cutting Master
                </h3>
                <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                  Select master, set target due date & instructions
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form with Flex Layout for 100% Sticky Bottom Footer */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
            {/* Scrollable Inner Body */}
            <div className="p-3.5 sm:p-4 space-y-3.5 overflow-y-auto flex-1 min-h-0">
              {/* Fabric Lot Summary Banner */}
              <div className="p-2.5 rounded-xl border border-purple-100/90 bg-purple-50/40 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span className="font-extrabold text-slate-900 truncate">
                      {fabric.fabricType || 'Fabric Lot'}{fabric.color ? ` • ${fabric.color}` : ''}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 truncate block mt-0.5">
                    {fabric.plainMeters ? `${fabric.plainMeters}m ` : ''}
                    {fabric.printPieces ? `• ${fabric.printPieces} Sets Target ` : ''}
                    • Product: <strong className="text-slate-700">{fabric.productName || 'Garment'}</strong>
                  </span>
                </div>
                <span className="text-[9px] font-black uppercase text-purple-800 bg-white px-2 py-0.5 rounded-lg border border-purple-200 shrink-0">
                  {fabric.assignedMasterName ? `Assigned: ${fabric.assignedMasterName}` : 'Unassigned'}
                </span>
              </div>

              {/* Unconfigured Product Design Notice */}
              {!isDesignConfigured && (
                <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-extrabold text-amber-950 block">Product Structure Pending</span>
                    <span className="text-amber-800 block text-[11px] mt-0.5 leading-relaxed">
                      You can assign custody now, but configure product parts (PC) and rates before recording cutting.
                    </span>
                  </div>
                </div>
              )}

              {/* Master Selector */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                    <span>Choose Cutting Master *</span>
                  </label>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                    {activeMasters.length} Active Masters
                  </span>
                </div>

                {activeMasters.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl border border-slate-200">
                    No active cutting masters found in system. Please add masters in Setup.
                  </p>
                ) : (
                  <div className="relative" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen((prev) => !prev)}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all border outline-none cursor-pointer ${
                        isDropdownOpen
                          ? 'border-purple-500 ring-2 ring-purple-100 bg-white shadow-xs'
                          : selectedMaster
                            ? 'border-purple-300 text-slate-900 shadow-2xs bg-white'
                            : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {selectedMaster ? (
                          <>
                            <span className="w-6 h-6 rounded-lg bg-purple-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                              {selectedMaster.name.charAt(0).toUpperCase()}
                            </span>
                            <span className="font-bold text-slate-900 truncate">
                              {selectedMaster.name}
                            </span>
                            <span className="text-[10px] text-purple-700 bg-purple-100/70 border border-purple-200/60 px-1.5 py-0.5 rounded font-medium shrink-0 hidden sm:inline">
                              {selectedMaster.phone}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0"></span>
                            <span className="text-slate-400 font-medium truncate">-- Choose Cutting Master --</span>
                          </>
                        )}
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                          isDropdownOpen ? 'rotate-180 text-purple-600' : ''
                        }`}
                      />
                    </button>

                    {/* Dropdown Options Menu */}
                    {isDropdownOpen && (
                      <div className="mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 z-30">
                        <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                          {/* Unassign option */}
                          <button
                            ref={!formData.assignedMasterId ? selectedOptionRef : null}
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, assignedMasterId: '' }));
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full px-3.5 py-2.5 flex items-center justify-between text-left transition-colors cursor-pointer outline-none focus:bg-purple-50/90 focus:ring-1 focus:ring-purple-400 ${
                              !formData.assignedMasterId
                                ? 'text-purple-900 font-bold bg-purple-50/60'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`w-2.5 h-2.5 rounded-full ${
                                  !formData.assignedMasterId
                                    ? 'bg-purple-500 ring-4 ring-purple-100'
                                    : 'bg-slate-300'
                                }`}
                              ></span>
                              <p className="text-xs font-semibold">Unassigned / Pending Master</p>
                            </div>
                            {!formData.assignedMasterId && (
                              <Check className="w-4 h-4 text-purple-600 shrink-0" />
                            )}
                          </button>

                          {/* Masters List */}
                          {activeMasters.map((m) => {
                            const isSelected = m.id === formData.assignedMasterId;
                            return (
                              <button
                                key={m.id}
                                ref={isSelected ? selectedOptionRef : null}
                                type="button"
                                onClick={() => {
                                  setFormData((prev) => ({ ...prev, assignedMasterId: m.id }));
                                  setIsDropdownOpen(false);
                                }}
                                className={`w-full px-3.5 py-2.5 flex items-center justify-between text-left transition-colors cursor-pointer outline-none focus:bg-purple-50/90 focus:ring-1 focus:ring-purple-400 ${
                                  isSelected
                                    ? 'text-purple-900 font-bold bg-purple-50/60'
                                    : 'hover:bg-slate-50 text-slate-800'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div
                                    className={`w-7 h-7 rounded-lg font-bold flex items-center justify-center text-xs shrink-0 ${
                                      isSelected
                                        ? 'bg-purple-600 text-white shadow-2xs'
                                        : 'bg-purple-100 text-purple-800'
                                    }`}
                                  >
                                    {m.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0 truncate">
                                    <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                                      {m.name}
                                    </p>
                                    <p className="text-[10px] text-slate-500 font-normal truncate mt-0.5">
                                      📞 {m.phone} {m.specialization ? `• ${m.specialization}` : ''}
                                    </p>
                                  </div>
                                </div>
                                {isSelected && (
                                  <Check className="w-4 h-4 text-purple-600 shrink-0 ml-2" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Selected Master Profile Preview & WhatsApp Action */}
                {selectedMaster && (
                  <div className="p-2.5 rounded-xl border border-purple-200 bg-purple-50/30 flex items-center justify-between text-xs animate-in fade-in">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-purple-600 text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0">
                        ✂
                      </div>
                      <div className="min-w-0 truncate">
                        <span className="font-extrabold text-purple-950 block truncate">{selectedMaster.name}</span>
                        <span className="text-purple-700 text-[10px] block truncate">
                          {selectedMaster.phone} {selectedMaster.specialization ? `• ${selectedMaster.specialization}` : ''}
                        </span>
                      </div>
                    </div>
                    {waLink && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-colors shrink-0 active:scale-95"
                        title="Send WhatsApp assignment notification"
                      >
                        <Share2 className="w-3 h-3" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Target Due Date & Lot Status */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Target Due Date</span>
                    </label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-purple-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-slate-500" />
                      <span>Lot Status</span>
                    </label>
                    {formData.assignedMasterId ? (
                      <div className="p-2 border border-purple-200 bg-purple-50/50 rounded-xl text-xs flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <div className="min-w-0">
                          <span className="font-extrabold text-purple-950 block text-[11px] leading-tight">In Stock</span>
                          <span className="text-[10px] text-purple-800 block leading-tight mt-0.5 truncate">
                            Moves to In Cutting when Master accepts in portal.
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-1">
                        {['In Stock', 'In Cutting', 'Completed'].map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setFormData({ ...formData, status: st })}
                            className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                              formData.status === st
                                ? 'bg-purple-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Cutting Instructions & Remarks */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                <label className="block text-[11px] font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>Cutting Instructions / Notes (Optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Check print alignment on Fronts, balance Sleeves..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-purple-500 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal resize-none"
                ></textarea>
              </div>
            </div>

            {/* 100% STICKY BOTTOM FOOTER (Mobile Touch Friendly) */}
            <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center gap-2 sm:justify-end flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isMasterSelected}
                className={`flex-[2] sm:flex-none px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  isMasterSelected
                    ? 'bg-purple-600 hover:bg-purple-700 active:scale-95 shadow-md shadow-purple-200 text-white cursor-pointer'
                    : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-60 shadow-none'
                }`}
                title={isMasterSelected ? 'Save Master Assignment' : 'Please select a Cutting Master first'}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Master Assignment</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </>
  );
}
