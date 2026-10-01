import React, { useState } from 'react';
import {
  X,
  Receipt,
  Building2,
  Wrench,
  Zap,
  Users,
  UserCheck,
  HeartHandshake,
  Calendar,
  IndianRupee,
  FileText,
  CheckCircle2,
  CreditCard,
  Hash,
  Cog,
  MoreHorizontal,
  Tag,
  ArrowRight,
  ArrowLeft,
  Check,
} from 'lucide-react';
import { useFactory, useFinance } from '../../context/useManagement';
import AlertModal from './AlertModal';
import { sanitizeDecimal, blockInvalidNumberKeys } from '../../utils/formValidation';
import CustomSelect from '../common/CustomSelect';

const EXPENSE_TYPES = [
  {
    id: 'Rent',
    label: 'Rent',
    icon: Building2,
    desc: 'Factory / Shop / Godown',
    color: 'border-purple-200 text-purple-700 bg-purple-50/40 hover:bg-purple-50',
    activeColor: 'border-purple-600 bg-purple-600 text-white shadow-md shadow-purple-200',
    tag: 'Fixed Monthly',
  },
  {
    id: 'Maintainance',
    label: 'Maintainance',
    icon: Wrench,
    desc: 'Machine servicing & repairs',
    color: 'border-amber-200 text-amber-700 bg-amber-50/40 hover:bg-amber-50',
    activeColor: 'border-amber-600 bg-amber-600 text-white shadow-md shadow-amber-200',
    tag: 'Machine & Floor',
  },
  {
    id: 'Light Bill',
    label: 'Light Bill',
    icon: Zap,
    desc: 'Electricity & power bills',
    color: 'border-yellow-200 text-yellow-800 bg-yellow-50/40 hover:bg-yellow-50',
    activeColor: 'border-yellow-500 bg-yellow-500 text-white shadow-md shadow-yellow-200',
    tag: 'Utility',
  },
  {
    id: 'Salary',
    label: 'Salary',
    icon: Users,
    desc: 'Master & Helper wages',
    color: 'border-emerald-200 text-emerald-700 bg-emerald-50/40 hover:bg-emerald-50',
    activeColor: 'border-emerald-600 bg-emerald-600 text-white shadow-md shadow-emerald-200',
    tag: 'Staff Payroll',
  },
  {
    id: 'Other',
    label: 'Other',
    icon: MoreHorizontal,
    desc: 'General & Misc costs',
    color: 'border-slate-200 text-slate-700 bg-slate-50/50 hover:bg-slate-100',
    activeColor: 'border-slate-800 bg-slate-800 text-white shadow-md shadow-slate-300',
    tag: 'Supplies / Misc',
  },
];

const PAYMENT_METHODS = [
  'Cash',
  'UPI / GPay',
  'Bank Transfer / NEFT',
  'Cheque',
];

const STEPS = [
  { number: 1, title: 'Category', subtitle: 'Choose Type' },
  { number: 2, title: 'Details', subtitle: 'Who / What' },
  { number: 3, title: 'Payment', subtitle: 'Amount & Mode' },
];

export default function AddExpenseModal({
  isOpen,
  onClose,
  initialType = '',
  onSuccess = null,
}) {
  const { masters = [], helpers = [], machines = [] } = useFactory();
  const { addExpense } = useFinance();
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = new Date().toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  const activeMasters = masters.filter((m) => m.status !== 'Left');
  const activeHelpers = helpers.filter((h) => h.status !== 'Left');

  // Wizard active step: 1 | 2 | 3
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    expenseType: initialType || '',
    salarySubType: '', // No default selection! User must choose 'Master' or 'Helper'
    workerId: '', // No default selection! User must choose worker from list
    workerName: '',
    customWorkerName: '',
    machineId: '',
    machineCode: '',
    amount: '',
    date: todayStr,
    month: currentMonthStr,
    paymentMethod: 'Cash',
    paidTo: '',
    referenceNo: '',
    notes: '',
  });

  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
  });

  if (!isOpen) return null;

  // Handle Type Change
  const handleTypeChange = (type) => {
    let update = { expenseType: type };
    if (type === 'Salary') {
      update = {
        ...update,
        salarySubType: '', // User must explicitly decide between Master & Helper
        workerId: '',
        workerName: '',
        customWorkerName: '',
        paidTo: '',
      };
    } else if (type === 'Rent') {
      update.paidTo = formData.paidTo || 'Factory Landlord';
    } else if (type === 'Light Bill') {
      update.paidTo = formData.paidTo || 'Electricity Board / DISCOM';
    } else if (type === 'Maintainance') {
      update.paidTo = formData.paidTo || '';
    } else if (type === 'Other') {
      update.paidTo = formData.paidTo || '';
    }
    setFormData((prev) => ({ ...prev, ...update }));
  };

  const handleSalarySubChange = (sub) => {
    setFormData((prev) => ({
      ...prev,
      salarySubType: sub,
      workerId: '', // User must select which worker in Step 2
      workerName: '',
      customWorkerName: '',
      paidTo: '',
    }));
  };

  const handleMasterSelect = (masterId) => {
    if (!masterId) {
      setFormData((prev) => ({
        ...prev,
        workerId: '',
        workerName: '',
        paidTo: '',
      }));
    } else if (masterId === 'custom') {
      setFormData((prev) => ({
        ...prev,
        workerId: 'custom',
        workerName: prev.customWorkerName,
        paidTo: prev.customWorkerName,
      }));
    } else {
      const found = activeMasters.find((m) => m.id === masterId);
      setFormData((prev) => ({
        ...prev,
        workerId: masterId,
        workerName: found ? found.name : '',
        paidTo: found ? found.name : '',
      }));
    }
  };

  const handleHelperSelect = (helperId) => {
    if (!helperId) {
      setFormData((prev) => ({
        ...prev,
        workerId: '',
        workerName: '',
        paidTo: '',
      }));
    } else if (helperId === 'custom') {
      setFormData((prev) => ({
        ...prev,
        workerId: 'custom',
        workerName: prev.customWorkerName,
        paidTo: prev.customWorkerName,
      }));
    } else {
      const found = activeHelpers.find((h) => h.id === helperId);
      setFormData((prev) => ({
        ...prev,
        workerId: helperId,
        workerName: found ? found.name : '',
        paidTo: found ? found.name : '',
      }));
    }
  };

  const handleMachineSelect = (mId) => {
    if (!mId) {
      setFormData((prev) => ({ ...prev, machineId: '', machineCode: '' }));
    } else {
      const found = machines.find((m) => m.id === mId);
      setFormData((prev) => ({
        ...prev,
        machineId: mId,
        machineCode: found ? found.machineCode : '',
      }));
    }
  };

  const handleQuickAdd = (delta) => {
    const cur = parseFloat(formData.amount) || 0;
    const next = Math.min(10000000, cur + delta);
    setFormData((prev) => ({ ...prev, amount: String(next) }));
  };

  // Step 1 Validation -> Proceed to Step 2
  const handleNextFromStep1 = () => {
    if (!formData.expenseType) {
      setAlertModal({
        isOpen: true,
        title: 'Select Category Required',
        message: 'Please choose an expense category (Rent, Maintainance, Light Bill, Salary, or Other) to proceed.',
        type: 'warning',
      });
      return;
    }
    if (formData.expenseType === 'Salary' && !formData.salarySubType) {
      setAlertModal({
        isOpen: true,
        title: 'Salary Type Required',
        message: 'Please decide who this salary payment is for: "Master" or "Helper".',
        type: 'warning',
      });
      return;
    }
    setCurrentStep(2);
  };

  // Step 2 Validation -> Proceed to Step 3
  const handleNextFromStep2 = () => {
    if (formData.expenseType === 'Salary') {
      if (!formData.workerId) {
        setAlertModal({
          isOpen: true,
          title: 'Select Worker Required',
          message: `Please choose which ${formData.salarySubType} is receiving this salary payment from the dropdown list, or select "Other / Unregistered".`,
          type: 'warning',
        });
        return;
      }
      if (formData.workerId === 'custom') {
        if (!formData.customWorkerName.trim()) {
          setAlertModal({
            isOpen: true,
            title: 'Worker Name Required',
            message: `Please enter the ${formData.salarySubType}'s full name.`,
            type: 'warning',
          });
          return;
        }
      }
    }
    setCurrentStep(3);
  };

  // Step 3 Final Submit
  const handleSubmit = (e) => {
    e.preventDefault();

    const amt = parseFloat(formData.amount);
    if (!amt || amt <= 0 || amt > 10000000) {
      setAlertModal({
        isOpen: true,
        title: 'Valid Amount Required',
        message: 'Please enter a valid expense amount between ₹1 and ₹10,000,000.',
        type: 'warning',
      });
      return;
    }

    let finalWorkerName = formData.workerName;
    if (formData.expenseType === 'Salary' && formData.workerId === 'custom') {
      finalWorkerName = formData.customWorkerName.trim();
    }

    const payload = {
      expenseType: formData.expenseType,
      salarySubType: formData.expenseType === 'Salary' ? formData.salarySubType : '',
      workerId:
        formData.expenseType === 'Salary' && formData.workerId !== 'custom'
          ? formData.workerId
          : '',
      workerName: finalWorkerName,
      machineId: formData.expenseType === 'Maintainance' ? formData.machineId : '',
      machineCode: formData.expenseType === 'Maintainance' ? formData.machineCode : '',
      amount: amt,
      date: formData.date,
      month: formData.month,
      paymentMethod: formData.paymentMethod,
      paidTo: formData.paidTo ? formData.paidTo.trim() : finalWorkerName || formData.expenseType,
      referenceNo: formData.referenceNo,
      notes: formData.notes,
    };

    const result = addExpense(payload);
    if (result.success) {
      if (onSuccess) onSuccess(result.expense);
      onClose();
    }
  };

  const selectedCategoryObj =
    EXPENSE_TYPES.find((t) => t.id === formData.expenseType) || EXPENSE_TYPES[0];
  const CategoryIcon = selectedCategoryObj.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg border border-slate-100 shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 flex flex-col max-h-[92vh] sm:max-h-[88vh] text-left"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header (Sticky Top) */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-rose-50/20 to-white shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-200 shrink-0">
              <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                  Record Expense
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  Step {currentStep} of 3
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate mt-0.5">
                {STEPS[currentStep - 1].subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Wizard Step Progress Bar (Compact & Sleek) */}
        <div className="bg-slate-50/80 px-4 py-2 border-b border-slate-100 flex items-center justify-between gap-1.5 shrink-0">
          {STEPS.map((s, idx) => {
            const isDone = currentStep > s.number;
            const isCurrent = currentStep === s.number;

            return (
              <React.Fragment key={s.number}>
                <button
                  type="button"
                  onClick={() => {
                    if (s.number < currentStep) setCurrentStep(s.number);
                  }}
                  disabled={s.number > currentStep}
                  className={`flex items-center gap-1.5 py-0.5 px-1.5 rounded-lg transition-all ${
                    s.number < currentStep ? 'cursor-pointer hover:bg-slate-100' : s.number === currentStep ? 'cursor-default' : 'cursor-not-allowed opacity-50'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                      isDone
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : isCurrent
                        ? 'bg-rose-600 text-white shadow-2xs ring-2 ring-rose-200'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {isDone ? <Check className="w-3 h-3 stroke-[3]" /> : s.number}
                  </div>
                  <span
                    className={`text-xs font-bold leading-none hidden xs:inline ${
                      isCurrent ? 'text-slate-900 font-black' : isDone ? 'text-emerald-700' : 'text-slate-400'
                    }`}
                  >
                    {s.title}
                  </span>
                </button>

                {idx < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 rounded-full transition-all ${
                      currentStep > idx + 1 ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Wizard Step Content Body (Scrollable) */}
        <div className="p-3.5 sm:p-4 overflow-y-auto flex-1 text-left space-y-3.5 min-h-0">
          {/* ================= STEP 1: CATEGORY SELECTION ================= */}
          {currentStep === 1 && (
            <div className="space-y-3 animate-in fade-in slide-in-from-right-2 duration-150">
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
                  Select Expense Category
                </h3>
                <p className="text-[11px] text-slate-500">
                  Choose the type of factory expenditure you wish to record.
                </p>
              </div>

              {/* Modern 2-Column Responsive Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {EXPENSE_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = formData.expenseType === type.id;

                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => handleTypeChange(type.id)}
                      className={`p-2.5 sm:p-3 rounded-xl border text-left flex items-center justify-between gap-2.5 transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? 'border-rose-600 ring-2 ring-rose-100 bg-rose-50/40 text-rose-950 shadow-2xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-rose-600 text-white' : type.color
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-extrabold truncate">
                              {type.label}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                isSelected
                                  ? 'bg-rose-100 text-rose-800 border-rose-200'
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}
                            >
                              {type.tag}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                            {type.desc}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                          isSelected
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Sub-choice inside Step 1 for Salary (Master vs Helper) */}
              {formData.expenseType === 'Salary' && (
                <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Who is this salary payment for? *</span>
                    </span>
                    <span className="text-[9px] text-emerald-700 font-extrabold bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                      Required
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSalarySubChange('Master')}
                      className={`p-2 rounded-xl border flex items-center justify-between px-3 text-xs font-bold transition-all cursor-pointer ${
                        formData.salarySubType === 'Master'
                          ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                          : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4" />
                        <span>Master</span>
                      </span>
                      <div
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all ${
                          formData.salarySubType === 'Master'
                            ? 'bg-white text-purple-600 border-white'
                            : 'border-purple-300 bg-purple-50/50'
                        }`}
                      >
                        {formData.salarySubType === 'Master' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSalarySubChange('Helper')}
                      className={`p-2 rounded-xl border flex items-center justify-between px-3 text-xs font-bold transition-all cursor-pointer ${
                        formData.salarySubType === 'Helper'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                          : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <HeartHandshake className="w-4 h-4" />
                        <span>Helper</span>
                      </span>
                      <div
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all ${
                          formData.salarySubType === 'Helper'
                            ? 'bg-white text-amber-600 border-white'
                            : 'border-amber-300 bg-amber-50/50'
                        }`}
                      >
                        {formData.salarySubType === 'Helper' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= STEP 2: CATEGORY SPECIFIC DETAILS ================= */}
          {currentStep === 2 && (
            <div className="space-y-3.5 animate-in fade-in slide-in-from-right-2 duration-150">
              {/* Active Selection Banner */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${selectedCategoryObj.color}`}
                  >
                    <CategoryIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-slate-900 block leading-tight">
                      {formData.expenseType === 'Salary'
                        ? `Salary: ${formData.salarySubType}`
                        : selectedCategoryObj.label}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Category Selected
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  Change
                </button>
              </div>

              {/* 2.1 DETAILS FOR SALARY */}
              {formData.expenseType === 'Salary' && (
                <div className="space-y-3">
                  {formData.salarySubType === 'Master' ? (
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 block flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                        <span>Select Cutting Master *</span>
                      </label>
                      {activeMasters.length > 0 ? (
                        <CustomSelect
                          value={formData.workerId}
                          onChange={(val) => handleMasterSelect(val)}
                          options={[
                            ...activeMasters.map((m) => ({
                              value: m.id,
                              badge: 'MASTER',
                              label: m.name,
                              subLabel: `${m.phone ? `${m.phone} • ` : ''}${m.specialization || 'Master'}`,
                            })),
                            {
                              value: 'custom',
                              badge: 'NEW',
                              label: '➕ Other / Unregistered Master',
                            },
                          ]}
                          placeholder="-- Choose Registered Master * --"
                          theme="purple"
                        />
                      ) : (
                        <p className="text-[11px] text-purple-700 bg-purple-50 p-2.5 rounded-xl border border-purple-100">
                          No active masters found. Please enter the master's name manually below.
                        </p>
                      )}

                      {(formData.workerId === 'custom' || activeMasters.length === 0) && (
                        <input
                          type="text"
                          placeholder="Enter Master's Full Name"
                          value={formData.customWorkerName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData((prev) => ({
                              ...prev,
                              customWorkerName: val,
                              workerName: val,
                              paidTo: val,
                            }));
                          }}
                          className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          required
                        />
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 block flex items-center gap-1.5">
                        <HeartHandshake className="w-3.5 h-3.5 text-amber-600" />
                        <span>Select Factory Helper *</span>
                      </label>
                      {activeHelpers.length > 0 ? (
                        <CustomSelect
                          value={formData.workerId}
                          onChange={(val) => handleHelperSelect(val)}
                          options={[
                            ...activeHelpers.map((h) => ({
                              value: h.id,
                              badge: h.helperType === 'master_assigned' ? 'MASTER ASST' : 'FLOOR',
                              label: h.name,
                              subLabel: `${h.phone ? `${h.phone} • ` : ''}${h.helperType === 'master_assigned' ? 'Master Assistant' : 'General Floor'}`,
                            })),
                            {
                              value: 'custom',
                              badge: 'NEW',
                              label: '➕ Other / Unregistered Helper',
                            },
                          ]}
                          placeholder="-- Choose Registered Helper * --"
                          theme="amber"
                        />
                      ) : (
                        <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-100">
                          No active helpers found. Please enter the helper's name manually below.
                        </p>
                      )}

                      {(formData.workerId === 'custom' || activeHelpers.length === 0) && (
                        <input
                          type="text"
                          placeholder="Enter Helper's Full Name"
                          value={formData.customWorkerName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData((prev) => ({
                              ...prev,
                              customWorkerName: val,
                              workerName: val,
                              paidTo: val,
                            }));
                          }}
                          className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          required
                        />
                      )}
                    </div>
                  )}

                  {/* Salary Billing Month */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>Salary Period / Month *</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. September 2026"
                      value={formData.month}
                      onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                    />
                  </div>
                </div>
              )}

              {/* 2.2 DETAILS FOR MAINTAINANCE */}
              {formData.expenseType === 'Maintainance' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block flex items-center gap-1.5">
                      <Cog className="w-3.5 h-3.5 text-amber-600" />
                      <span>Target Machine (Optional)</span>
                    </label>
                    <CustomSelect
                      value={formData.machineId}
                      onChange={(val) => handleMachineSelect(val)}
                      options={[
                        {
                          value: '',
                          badge: 'ALL',
                          label: 'General Factory Maintenance / All Machines',
                        },
                        ...machines.map((m) => ({
                          value: m.id,
                          badge: m.machineCode || m.code || 'MCH',
                          label: `Machine ${m.machineCode || m.code}`,
                          subLabel: m.machineName || m.name || m.model || 'Sewing Machine',
                        })),
                      ]}
                      placeholder="-- Select Target Machine --"
                      theme="amber"
                    />
                    <p className="text-[10px] text-slate-400">
                      Link servicing to a specific machine or leave as general factory repair.
                    </p>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-slate-500" />
                      <span>Technician / Service Provider</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Mechanic, Juki Authorized Service"
                      value={formData.paidTo}
                      onChange={(e) => setFormData({ ...formData, paidTo: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* 2.3 DETAILS FOR RENT */}
              {formData.expenseType === 'Rent' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-purple-600" />
                      <span>Landlord / Property Owner</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Shree Ram Industrial Estate, Unit #12"
                      value={formData.paidTo}
                      onChange={(e) => setFormData({ ...formData, paidTo: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>Rental Billing Period / Month</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. September 2026"
                      value={formData.month}
                      onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              )}

              {/* 2.4 DETAILS FOR LIGHT BILL */}
              {formData.expenseType === 'Light Bill' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-yellow-600" />
                      <span>Power Board / DISCOM Name</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Torrent Power, DGVCL, MSEB"
                      value={formData.paidTo}
                      onChange={(e) => setFormData({ ...formData, paidTo: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>Billing Period / Cycle</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. September 2026"
                      value={formData.month}
                      onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                </div>
              )}

              {/* 2.5 DETAILS FOR OTHER */}
              {formData.expenseType === 'Other' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-slate-500" />
                      <span>Expense Purpose / Nature *</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Factory Tea & Snacks, Courier, Packaging boxes, Cleaning"
                      value={formData.paidTo}
                      onChange={(e) => setFormData({ ...formData, paidTo: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500"
                      required
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Specify what was purchased or paid for.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= STEP 3: AMOUNT, DATE & PAYMENT MODE ================= */}
          {currentStep === 3 && (
            <div className="space-y-3.5 animate-in fade-in slide-in-from-right-2 duration-150">
              {/* Summary Preview Chip */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 ${selectedCategoryObj.color}`}
                  >
                    <CategoryIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-extrabold text-slate-900 block truncate leading-tight">
                      {formData.expenseType === 'Salary'
                        ? `${formData.salarySubType}: ${formData.workerName || formData.customWorkerName}`
                        : formData.paidTo || formData.expenseType}
                    </span>
                    {formData.month && (
                      <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                        Period: {formData.month}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 shrink-0">
                  {formData.expenseType}
                </span>
              </div>

              {/* Amount Input Card (Clean & Compact) */}
              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/90 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1">
                    <IndianRupee className="w-3.5 h-3.5 text-rose-600" />
                    <span>Expense Amount (₹) *</span>
                  </label>
                  <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                    INR
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-black text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="10000000"
                    step="any"
                    placeholder="0.00"
                    autoFocus
                    value={formData.amount}
                    onKeyDown={(e) => blockInvalidNumberKeys(e, { allowDecimals: true })}
                    onChange={(e) => {
                      const sanitized = sanitizeDecimal(e.target.value, { min: 0, max: 10000000, maxDecimals: 2 });
                      setFormData({ ...formData, amount: sanitized });
                    }}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xl font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-2xs"
                    required
                  />
                </div>

                {/* Quick Add Chips */}
                <div className="flex items-center gap-1 flex-wrap pt-0.5">
                  <span className="text-[10px] font-bold text-slate-400">Quick:</span>
                  {[500, 1000, 5000, 10000, 25000].map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => handleQuickAdd(step)}
                      className="px-2 py-0.5 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-600 text-[10px] font-bold rounded-md border border-slate-200 active:scale-95 transition-all cursor-pointer"
                    >
                      +₹{step.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & Payment Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Payment Date *</span>
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                    <span>Payment Mode *</span>
                  </label>
                  <CustomSelect
                    value={formData.paymentMethod}
                    onChange={(val) => setFormData({ ...formData, paymentMethod: val })}
                    options={PAYMENT_METHODS.map((mode) => ({
                      value: mode,
                      label: mode,
                    }))}
                    placeholder="Select Mode"
                    theme="neutral"
                  />
                </div>
              </div>

              {/* Bill / Ref No. & Remarks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-slate-500" />
                    <span>Bill / Receipt No. (Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bill #84920, UPI ID, Cheque #0012"
                    value={formData.referenceNo}
                    onChange={(e) =>
                      setFormData({ ...formData, referenceNo: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Notes / Remarks (Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Advance payment, motor belt"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 100% STICKY BOTTOM FOOTER (Mobile Touch Friendly) */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
          {currentStep === 1 && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 active:scale-95 transition-all cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleNextFromStep1}
                className="flex-[2] sm:flex-none px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-rose-200 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Continue to Details</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {currentStep === 2 && (
            <>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleNextFromStep2}
                className="flex-[2] sm:flex-none px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-rose-200 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Continue to Payment</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {currentStep === 3 && (
            <>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-200 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Record Expense (₹{formData.amount || '0'})</span>
              </button>
            </>
          )}
        </div>
      </div>

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
}
