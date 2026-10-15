import React, { useState } from 'react';
import {
  Truck,
  Plus,
  Search,
  ChevronDown,
  Phone,
  Edit2,
  Trash2,
  MessageSquare,
  MapPin,
} from 'lucide-react';
import { useFactorySetup } from '../../context/domain';
import CustomSelect from '../common/CustomSelect';
import { formatWhatsAppPhone } from '../../utils/whatsappNotification';

export default function SetupSuppliersTab({
  onAddSupplier,
  onEditSupplier,
  onDeleteSupplier,
}) {
  const { suppliers = [] } = useFactorySetup();

  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierCategoryFilter, setSupplierCategoryFilter] = useState('all');
  const [expandedCardIds, setExpandedCardIds] = useState(new Set());

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

  const getSupplierCategoryBadge = (category) => {
    switch (category) {
      case 'Fabric / Cloth':
        return 'bg-blue-50 text-blue-700 border-blue-200/60';
      case 'Sewing Threads':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
      case 'Buttons & Zippers':
        return 'bg-amber-50 text-amber-700 border-amber-200/60';
      case 'Interlining & Elastic':
        return 'bg-purple-50 text-purple-700 border-purple-200/60';
      case 'Packaging & Bags':
        return 'bg-slate-100 text-slate-700 border-slate-200/60';
      case 'Machine Spares & Oil':
        return 'bg-rose-50 text-rose-700 border-rose-200/60';
      default:
        return 'bg-indigo-50 text-indigo-700 border-indigo-200/60';
    }
  };

  const displayedSuppliers = (suppliers || []).filter((s) => {
    if (supplierCategoryFilter !== 'all' && s.category !== supplierCategoryFilter) {
      return false;
    }
    const query = supplierSearch.toLowerCase();
    return (
      (s.name && s.name.toLowerCase().includes(query)) ||
      (s.contactPerson && s.contactPerson.toLowerCase().includes(query)) ||
      (s.phone && s.phone.includes(query)) ||
      (s.category && s.category.toLowerCase().includes(query)) ||
      (s.address && s.address.toLowerCase().includes(query)) ||
      (s.gstNumber && s.gstNumber.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-3.5 animate-in fade-in duration-200">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Supplier & Vendor Directory</h2>
          <p className="text-[11px] text-slate-500">
            Fabric mills, thread vendors, trim suppliers & spares dealers
          </p>
        </div>
        <button
          type="button"
          onClick={onAddSupplier}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-md shadow-blue-100 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Supplier</span>
        </button>
      </div>

      {/* Search bar & Category filter pills */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by firm name, contact, phone, city..."
            value={supplierSearch}
            onChange={(e) => setSupplierSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200/80 rounded-2xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-xs transition-all"
          />
        </div>

        {/* One Unified Filter Dropdown Button & Expand All */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-[150px]">
            <CustomSelect
              value={supplierCategoryFilter}
              onChange={(val) => setSupplierCategoryFilter(val)}
              options={[
                { value: 'all', label: `All Suppliers (${suppliers.length})` },
                { value: 'Fabric / Cloth', label: 'Fabric / Cloth' },
                { value: 'Sewing Threads', label: 'Sewing Threads' },
                { value: 'Buttons & Zippers', label: 'Buttons & Zippers' },
                { value: 'Interlining & Elastic', label: 'Interlining & Elastic' },
                { value: 'Packaging & Bags', label: 'Packaging & Bags' },
                { value: 'Machine Spares & Oil', label: 'Machine Spares & Oil' },
              ]}
              placeholder="Filter Category"
              theme="blue"
            />
          </div>

          {displayedSuppliers.length > 0 && (() => {
            const allSupplierIds = displayedSuppliers.map((s) => `supplier-${s.id}`);
            const allExpanded = allSupplierIds.every((id) => expandedCardIds.has(id));
            return (
              <button
                type="button"
                onClick={() => (allExpanded ? handleCollapseAll() : handleExpandAll(allSupplierIds))}
                className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1 shrink-0 whitespace-nowrap ml-auto cursor-pointer shadow-2xs"
                title={allExpanded ? 'Collapse All Cards' : 'Expand All Cards'}
              >
                <span>{allExpanded ? '▲ Collapse All' : '▼ Expand All'}</span>
              </button>
            );
          })()}
        </div>
      </div>

      {/* Suppliers Cards Grid */}
      <div className="space-y-2.5">
        {displayedSuppliers.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700">No Suppliers Found</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                {supplierSearch || supplierCategoryFilter !== 'all'
                  ? 'No supplier matches your current search or category filter.'
                  : 'Register cloth mills, thread suppliers, and accessory vendors to have their contact details ready.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onAddSupplier}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 active:scale-95 shadow-md shadow-blue-100 transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Supplier</span>
            </button>
          </div>
        ) : (
          displayedSuppliers.map((s) => {
            const cardId = `supplier-${s.id}`;
            const isExpanded = expandedCardIds.has(cardId);
            return (
              <div
                key={s.id}
                onClick={() => toggleCardExpand(cardId)}
                className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs hover:border-blue-300 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                        <h3 className="text-xs font-bold text-slate-900 truncate">{s.name}</h3>
                        <span
                          className={`text-[9px] font-extrabold uppercase px-2 py-0.2 rounded-full border shrink-0 ${getSupplierCategoryBadge(
                            s.category
                          )}`}
                        >
                          {s.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 flex-wrap mt-0.5">
                        {s.contactPerson && (
                          <span className="text-slate-600 font-medium truncate max-w-[120px] sm:max-w-none flex items-center gap-1">
                            <span>👤</span>
                            <span className="truncate">{s.contactPerson}</span>
                          </span>
                        )}
                        {s.paymentTerms && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200/80 px-1.5 py-0.2 rounded-md shrink-0 whitespace-nowrap">
                            <span>⏱️</span>
                            <span>{s.paymentTerms}</span>
                          </span>
                        )}
                        {s.city && (
                          <span className="text-slate-400 text-[10px] font-medium shrink-0 flex items-center gap-0.5">
                            <span>📍</span>
                            <span>{s.city}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 sm:gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {s.phone && (
                      <a
                        href={`tel:${s.phone}`}
                        className="w-7 h-7 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg flex items-center justify-center transition-colors shrink-0"
                        title={`Call ${s.phone}`}
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => onEditSupplier(s)}
                      className="w-7 h-7 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                      title="Edit Supplier"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteSupplier(s)}
                      className="w-7 h-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                      title="Delete Supplier"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleCardExpand(cardId)}
                      className="w-7 h-7 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-500 rounded-lg flex items-center justify-center shrink-0 cursor-pointer transition-colors shadow-2xs"
                      title={isExpanded ? 'Collapse' : 'Expand Details'}
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180 text-blue-600' : 'text-slate-400'
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
                    {/* 1-Tap Quick Action Contact Row: Call & WhatsApp */}
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={`tel:${s.phone}`}
                        className="py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-800 border border-emerald-200/80 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Call ({s.phone})</span>
                      </a>

                      <a
                        href={`https://wa.me/${formatWhatsAppPhone(s.whatsapp || s.phone)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-1.5 px-3 bg-green-500 hover:bg-green-600 active:scale-95 text-white shadow-xs rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-white" />
                        <span>WhatsApp</span>
                      </a>
                    </div>

                    {/* Meta Details: Address, GST, Notes */}
                    {(s.address || s.gstNumber || s.notes) && (
                      <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                        {s.address && (
                          <div className="flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
                            <span className="text-[11px] text-slate-600 font-medium">
                              {s.address}
                            </span>
                          </div>
                        )}
                        {s.gstNumber && (
                          <div className="text-[11px]">
                            <span className="font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold">
                              GST: {s.gstNumber}
                            </span>
                          </div>
                        )}
                        {s.notes && (
                          <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-100 italic">
                            "{s.notes}"
                          </p>
                        )}
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
