import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Sliders,
  Building2,
  Truck,
  Trash2,
  ShieldCheck,
  Cog,
  Scissors,
  UserCheck,
  HeartHandshake,
} from 'lucide-react';
import { useFactorySetup } from '../context/domain';
import {
  SetupMachinesTab,
  SetupTailorsTab,
  SetupMastersTab,
  SetupHelpersTab,
  SetupSuppliersTab,
  SetupShopProfileTab,
} from '../components/setup';
import AddMasterModal from '../components/modals/AddMasterModal';
import AddMachineModal from '../components/modals/AddMachineModal';
import AddTailorModal from '../components/modals/AddTailorModal';
import AddHelperModal from '../components/modals/AddHelperModal';
import AddSupplierModal from '../components/modals/AddSupplierModal';
import ReplaceWorkerModal from '../components/modals/ReplaceWorkerModal';
import RelieveWorkerModal from '../components/modals/RelieveWorkerModal';
import MachineHistoryModal from '../components/modals/MachineHistoryModal';
import AlertModal from '../components/modals/AlertModal';

const VALID_SETUP_TABS = ['machines', 'tailors', 'masters', 'helpers', 'suppliers', 'profile'];

export default function Setup() {
  const {
    masters = [],
    machines = [],
    deleteMachine,
    tailors = [],
    helpers = [],
    suppliers = [],
    deleteSupplier,
    clearAllData,
    clearFabricData,
  } = useFactorySetup();

  const { tab: pathTab } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const rawTab = pathTab || searchParams.get('tab');
  const activeTab = rawTab && VALID_SETUP_TABS.includes(rawTab.toLowerCase())
    ? rawTab.toLowerCase()
    : 'machines';

  const setActiveTab = (tab) => {
    navigate(`/setup/${tab}`);
  };

  // Modal open states
  const [showAddMaster, setShowAddMaster] = useState(false);
  const [editingMaster, setEditingMaster] = useState(null);
  const [showAddMachine, setShowAddMachine] = useState(false);
  const [editingMachine, setEditingMachine] = useState(null);
  const [deleteMachineConfirm, setDeleteMachineConfirm] = useState(null);
  const [showAddTailor, setShowAddTailor] = useState(false);
  const [editingTailor, setEditingTailor] = useState(null);
  const [showAddHelper, setShowAddHelper] = useState(false);
  const [editingHelper, setEditingHelper] = useState(null);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [deleteSupplierConfirm, setDeleteSupplierConfirm] = useState(null);

  // Workflow modals: Replace, Relieve, History
  const [replaceModal, setReplaceModal] = useState({
    isOpen: false,
    machineId: null,
    currentTailorId: null,
  });

  const [relieveModal, setRelieveModal] = useState({
    isOpen: false,
    workerType: 'tailor',
    workerId: null,
  });

  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    machineId: null,
  });

  // Database factory reset state & handler
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleResetDatabase = async () => {
    setIsResetting(true);
    try {
      await clearAllData();
      setShowResetConfirm(false);
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 4000);
    } catch (e) {
      console.error('Failed to reset database', e);
    } finally {
      setIsResetting(false);
    }
  };

  // Fabric & production reset state & handler
  const [showFabricResetConfirm, setShowFabricResetConfirm] = useState(false);
  const [isResettingFabrics, setIsResettingFabrics] = useState(false);
  const [fabricResetSuccess, setFabricResetSuccess] = useState(false);

  const handleResetFabrics = async () => {
    setIsResettingFabrics(true);
    try {
      await clearFabricData();
      setShowFabricResetConfirm(false);
      setFabricResetSuccess(true);
      setTimeout(() => setFabricResetSuccess(false), 4000);
    } catch (e) {
      console.error('Failed to reset fabric data', e);
    } finally {
      setIsResettingFabrics(false);
    }
  };

  const activeTailorsCount = tailors.filter((t) => t.status !== 'Left').length;
  const activeMastersCount = masters.filter((m) => m.status !== 'Left').length;
  const activeHelpersCount = helpers.filter((h) => h.status !== 'Left').length;

  return (
    <div className="space-y-4 pb-8">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
            <Sliders className="w-5 h-5 text-indigo-600 shrink-0" />
            <span className="truncate">Setup</span>
          </h1>
          <p className="text-[11px] text-slate-500 truncate">
            Machines, staff directory & config
          </p>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded-full shrink-0">
          <ShieldCheck className="w-3 h-3 text-indigo-600" />
          <span>Admin</span>
        </span>
      </div>

      {/* 6-Column Sub-Tabs (Mobile-Friendly Grid) */}
      <div className="grid grid-cols-6 gap-1 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/80 text-center">
        {[
          { id: 'machines', label: 'Machines', icon: Cog, count: machines.length, color: 'text-indigo-700' },
          { id: 'tailors', label: 'Tailors', icon: Scissors, count: activeTailorsCount, color: 'text-emerald-700' },
          { id: 'masters', label: 'Masters', icon: UserCheck, count: activeMastersCount, color: 'text-purple-700' },
          { id: 'helpers', label: 'Helpers', icon: HeartHandshake, count: activeHelpersCount, color: 'text-amber-700' },
          { id: 'suppliers', label: 'Suppliers', icon: Truck, count: suppliers.length, color: 'text-blue-700' },
          { id: 'profile', label: 'Shop', icon: Building2, color: 'text-slate-800' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`py-1.5 px-0.5 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 cursor-pointer ${
                isActive
                  ? `bg-white ${tab.color} shadow-xs ring-1 ring-black/5 font-extrabold`
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[10px] sm:text-xs truncate">{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[9px] px-1 py-0.2 rounded-full font-bold leading-none shrink-0 ${
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

      {/* Active Tab View */}
      {activeTab === 'machines' && (
        <SetupMachinesTab
          onAddMachine={() => {
            setEditingMachine(null);
            setShowAddMachine(true);
          }}
          onEditMachine={(m) => {
            setEditingMachine(m);
            setShowAddMachine(true);
          }}
          onDeleteMachine={(m) => setDeleteMachineConfirm(m)}
          onOpenHistory={(machineId) => setHistoryModal({ isOpen: true, machineId })}
          onOpenReplace={({ machineId, currentTailorId }) =>
            setReplaceModal({ isOpen: true, machineId, currentTailorId })
          }
        />
      )}

      {activeTab === 'tailors' && (
        <SetupTailorsTab
          onAddTailor={() => {
            setEditingTailor(null);
            setShowAddTailor(true);
          }}
          onEditTailor={(t) => {
            setEditingTailor(t);
            setShowAddTailor(true);
          }}
          onRelieveTailor={(tailorId) =>
            setRelieveModal({ isOpen: true, workerType: 'tailor', workerId: tailorId })
          }
          onOpenReplace={({ machineId, currentTailorId }) =>
            setReplaceModal({ isOpen: true, machineId, currentTailorId })
          }
        />
      )}

      {activeTab === 'masters' && (
        <SetupMastersTab
          onAddMaster={() => {
            setEditingMaster(null);
            setShowAddMaster(true);
          }}
          onEditMaster={(m) => {
            setEditingMaster(m);
            setShowAddMaster(true);
          }}
          onRelieveMaster={(masterId) =>
            setRelieveModal({ isOpen: true, workerType: 'master', workerId: masterId })
          }
        />
      )}

      {activeTab === 'helpers' && (
        <SetupHelpersTab
          onAddHelper={() => {
            setEditingHelper(null);
            setShowAddHelper(true);
          }}
          onEditHelper={(h) => {
            setEditingHelper(h);
            setShowAddHelper(true);
          }}
          onRelieveHelper={(helperId) =>
            setRelieveModal({ isOpen: true, workerType: 'helper', workerId: helperId })
          }
        />
      )}

      {activeTab === 'suppliers' && (
        <SetupSuppliersTab
          onAddSupplier={() => {
            setEditingSupplier(null);
            setShowAddSupplier(true);
          }}
          onEditSupplier={(s) => {
            setEditingSupplier(s);
            setShowAddSupplier(true);
          }}
          onDeleteSupplier={(s) => setDeleteSupplierConfirm(s)}
        />
      )}

      {activeTab === 'profile' && (
        <SetupShopProfileTab
          onTriggerFabricReset={() => setShowFabricResetConfirm(true)}
          onTriggerDatabaseReset={() => setShowResetConfirm(true)}
          isResetting={isResetting}
          isResettingFabrics={isResettingFabrics}
          resetSuccess={resetSuccess}
          fabricResetSuccess={fabricResetSuccess}
        />
      )}

      {/* Global Setup Modals */}
      <AlertModal
        isOpen={showFabricResetConfirm}
        onClose={() => setShowFabricResetConfirm(false)}
        title="Clear Fabric & Production Data Only?"
        message="Are you sure you want to remove your fabric lots, cuttings, tailor assignments, master handovers, thread cutting jobs, expenses, and invoices? Your Machines, Tailors, Masters, Helpers, Suppliers, Shop details, and User Account will remain safely intact. No other user's data will be affected."
        type="warning"
        showCancel={true}
        confirmText="Yes, Clear Fabric Data"
        cancelText="Cancel"
        onConfirm={handleResetFabrics}
      />

      <AlertModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        title="Clear All Data & Start From Scratch?"
        message="Are you sure you want to clear all your business data (fabrics, cuttings, assignments, handovers, expenses, invoices, machines, tailors, masters, helpers, and suppliers)? Your logged-in user account and shop setup will stay active so you can start completely fresh. No other user's data will be touched."
        type="error"
        showCancel={true}
        confirmText="Yes, Wipe My Business Data"
        cancelText="Cancel"
        onConfirm={handleResetDatabase}
      />

      <AddMasterModal
        key={editingMaster?.id || (showAddMaster ? 'mst-open' : 'mst-closed')}
        isOpen={showAddMaster}
        onClose={() => {
          setShowAddMaster(false);
          setEditingMaster(null);
        }}
        masterToEdit={editingMaster}
      />

      <AddMachineModal
        key={editingMachine?.id || (showAddMachine ? 'mch-open' : 'mch-closed')}
        isOpen={showAddMachine}
        onClose={() => {
          setShowAddMachine(false);
          setEditingMachine(null);
        }}
        machineToEdit={editingMachine}
      />

      {deleteMachineConfirm && (
        <AlertModal
          isOpen={Boolean(deleteMachineConfirm)}
          onClose={() => setDeleteMachineConfirm(null)}
          title="Delete Machine?"
          message={`Are you sure you want to permanently delete Machine ${deleteMachineConfirm.code} (${deleteMachineConfirm.name})? Any active tailor assignments on this machine will be cleared.`}
          type="warning"
          showCancel={true}
          confirmText="Delete Machine"
          onConfirm={() => {
            deleteMachine(deleteMachineConfirm.id);
            setDeleteMachineConfirm(null);
          }}
        />
      )}

      <AddTailorModal
        key={editingTailor?.id || (showAddTailor ? 'tailor-open' : 'tailor-closed')}
        isOpen={showAddTailor}
        onClose={() => {
          setShowAddTailor(false);
          setEditingTailor(null);
        }}
        tailorToEdit={editingTailor}
      />

      <AddHelperModal
        key={editingHelper?.id || (showAddHelper ? 'helper-open' : 'helper-closed')}
        isOpen={showAddHelper}
        onClose={() => {
          setShowAddHelper(false);
          setEditingHelper(null);
        }}
        helperToEdit={editingHelper}
      />

      <AddSupplierModal
        key={editingSupplier?.id || (showAddSupplier ? 'open-new' : 'closed')}
        isOpen={showAddSupplier}
        onClose={() => {
          setShowAddSupplier(false);
          setEditingSupplier(null);
        }}
        supplierToEdit={editingSupplier}
      />

      {/* Delete Supplier Confirmation Modal */}
      {deleteSupplierConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full border border-slate-100 shadow-2xl space-y-3 text-center animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">Delete Supplier?</h3>
            <p className="text-xs text-slate-500">
              Are you sure you want to remove <span className="font-bold text-slate-800">{deleteSupplierConfirm.name}</span> from your supplier contacts?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteSupplierConfirm(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 active:scale-95 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteSupplier(deleteSupplierConfirm.id);
                  setDeleteSupplierConfirm(null);
                }}
                className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 active:scale-95 shadow-md shadow-rose-200 transition-all cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Replacement Workflow Modal */}
      <ReplaceWorkerModal
        isOpen={replaceModal.isOpen}
        onClose={() => setReplaceModal({ isOpen: false, machineId: null, currentTailorId: null })}
        machineId={replaceModal.machineId}
        currentTailorId={replaceModal.currentTailorId}
      />

      {/* Relieve Worker Modal */}
      <RelieveWorkerModal
        isOpen={relieveModal.isOpen}
        onClose={() => setRelieveModal({ isOpen: false, workerType: 'tailor', workerId: null })}
        workerType={relieveModal.workerType}
        workerId={relieveModal.workerId}
      />

      {/* Machine History Modal */}
      <MachineHistoryModal
        isOpen={historyModal.isOpen}
        onClose={() => setHistoryModal({ isOpen: false, machineId: null })}
        machineId={historyModal.machineId}
      />
    </div>
  );
}
