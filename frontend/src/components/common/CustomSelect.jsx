import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

const THEME_STYLES = {
  emerald: {
    focusRing: 'focus:ring-emerald-400 focus:border-emerald-500',
    openBorder: 'border-emerald-500 ring-2 ring-emerald-100 bg-white',
    selectedBg: 'bg-emerald-50 text-emerald-900 border-emerald-200 font-bold',
    selectedIcon: 'bg-emerald-600 text-white',
    checkColor: 'text-emerald-600',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    countBadge: 'text-emerald-700 bg-emerald-50',
    searchFocus: 'focus:border-emerald-500 focus:ring-emerald-200',
  },
  purple: {
    focusRing: 'focus:ring-purple-400 focus:border-purple-500',
    openBorder: 'border-purple-500 ring-2 ring-purple-100 bg-white',
    selectedBg: 'bg-purple-50 text-purple-900 border-purple-200 font-bold',
    selectedIcon: 'bg-purple-600 text-white',
    checkColor: 'text-purple-600',
    badge: 'bg-purple-100 text-purple-800 border-purple-200',
    countBadge: 'text-purple-700 bg-purple-50',
    searchFocus: 'focus:border-purple-500 focus:ring-purple-200',
  },
  indigo: {
    focusRing: 'focus:ring-indigo-400 focus:border-indigo-500',
    openBorder: 'border-indigo-500 ring-2 ring-indigo-100 bg-white',
    selectedBg: 'bg-indigo-50 text-indigo-900 border-indigo-200 font-bold',
    selectedIcon: 'bg-indigo-600 text-white',
    checkColor: 'text-indigo-600',
    badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    countBadge: 'text-indigo-700 bg-indigo-50',
    searchFocus: 'focus:border-indigo-500 focus:ring-indigo-200',
  },
  blue: {
    focusRing: 'focus:ring-blue-400 focus:border-blue-500',
    openBorder: 'border-blue-500 ring-2 ring-blue-100 bg-white',
    selectedBg: 'bg-blue-50 text-blue-900 border-blue-200 font-bold',
    selectedIcon: 'bg-blue-600 text-white',
    checkColor: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
    countBadge: 'text-blue-700 bg-blue-50',
    searchFocus: 'focus:border-blue-500 focus:ring-blue-200',
  },
  teal: {
    focusRing: 'focus:ring-teal-400 focus:border-teal-500',
    openBorder: 'border-teal-500 ring-2 ring-teal-100 bg-white',
    selectedBg: 'bg-teal-50 text-teal-900 border-teal-200 font-bold',
    selectedIcon: 'bg-teal-600 text-white',
    checkColor: 'text-teal-600',
    badge: 'bg-teal-100 text-teal-800 border-teal-200',
    countBadge: 'text-teal-700 bg-teal-50',
    searchFocus: 'focus:border-teal-500 focus:ring-teal-200',
  },
  amber: {
    focusRing: 'focus:ring-amber-400 focus:border-amber-500',
    openBorder: 'border-amber-500 ring-2 ring-amber-100 bg-white',
    selectedBg: 'bg-amber-50 text-amber-900 border-amber-200 font-bold',
    selectedIcon: 'bg-amber-600 text-white',
    checkColor: 'text-amber-600',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    countBadge: 'text-amber-700 bg-amber-50',
    searchFocus: 'focus:border-amber-500 focus:ring-amber-200',
  },
  slate: {
    focusRing: 'focus:ring-slate-400 focus:border-slate-500',
    openBorder: 'border-slate-500 ring-2 ring-slate-100 bg-white',
    selectedBg: 'bg-slate-100 text-slate-900 border-slate-300 font-bold',
    selectedIcon: 'bg-slate-700 text-white',
    checkColor: 'text-slate-700',
    badge: 'bg-slate-200 text-slate-800 border-slate-300',
    countBadge: 'text-slate-700 bg-slate-100',
    searchFocus: 'focus:border-slate-500 focus:ring-slate-200',
  },
  rose: {
    focusRing: 'focus:ring-rose-400 focus:border-rose-500',
    openBorder: 'border-rose-500 ring-2 ring-rose-100 bg-white',
    selectedBg: 'bg-rose-50 text-rose-900 border-rose-200 font-bold',
    selectedIcon: 'bg-rose-600 text-white',
    checkColor: 'text-rose-600',
    badge: 'bg-rose-100 text-rose-800 border-rose-200',
    countBadge: 'text-rose-700 bg-rose-50',
    searchFocus: 'focus:border-rose-500 focus:ring-rose-200',
  },
};

export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = '-- Select Option --',
  label = null,
  icon: LabelIcon = null,
  theme = 'indigo',
  searchable = null, // auto if > 6 options
  searchPlaceholder = 'Search...',
  disabled = false,
  required = false,
  className = '',
  maxHeight = 'max-h-56',
  renderOption = null,
  renderTrigger = null,
  autoFocusSelected = true,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const selectedOptionRef = useRef(null);
  const searchInputRef = useRef(null);
  const listContainerRef = useRef(null);

  const t = THEME_STYLES[theme] || THEME_STYLES.indigo;

  // Normalize options to objects: { value, label, subLabel, badge, icon, disabled }
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'object' && opt !== null) {
      return {
        value: opt.value !== undefined ? opt.value : opt.id,
        label: opt.label || opt.name || String(opt.value || opt.id || ''),
        subLabel: opt.subLabel || null,
        badge: opt.badge || null,
        icon: opt.icon || null,
        disabled: Boolean(opt.disabled),
        raw: opt,
      };
    }
    return {
      value: opt,
      label: String(opt),
      subLabel: null,
      badge: null,
      icon: null,
      disabled: false,
      raw: opt,
    };
  });

  // Find currently selected option
  const selectedOption = normalizedOptions.find(
    (opt) => String(opt.value) === String(value)
  );

  // Determine if search input should be shown
  const isSearchable = searchable !== null ? searchable : normalizedOptions.length > 6;

  // Filter options based on search query
  const filteredOptions = isSearchable && searchTerm.trim()
    ? normalizedOptions.filter((opt) => {
        const query = searchTerm.toLowerCase();
        const matchesLabel = String(opt.label).toLowerCase().includes(query);
        const matchesSub = opt.subLabel ? String(opt.subLabel).toLowerCase().includes(query) : false;
        const matchesBadge = opt.badge ? String(opt.badge).toLowerCase().includes(query) : false;
        return matchesLabel || matchesSub || matchesBadge;
      })
    : normalizedOptions;

  // Click & touch outside listener
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Auto-scroll and auto-focus selected option when dropdown opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (autoFocusSelected && selectedOptionRef.current) {
          selectedOptionRef.current.scrollIntoView({
            block: 'center',
            behavior: 'smooth',
          });
          selectedOptionRef.current.focus({ preventScroll: true });
        } else if (searchInputRef.current) {
          searchInputRef.current.focus({ preventScroll: true });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoFocusSelected]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown' && !isOpen) {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef} onKeyDown={handleKeyDown}>
      {label && (
        <label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            {LabelIcon && <LabelIcon className="w-3.5 h-3.5 opacity-80" />}
            <span>{label} {required && <span className="text-rose-500">*</span>}</span>
          </span>
          {normalizedOptions.length > 0 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${t.countBadge}`}>
              {normalizedOptions.length} Options
            </span>
          )}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full min-h-[42px] px-3.5 py-2.5 rounded-xl border text-left transition-all flex items-center justify-between outline-none cursor-pointer ${
          disabled
            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
            : isOpen
            ? t.openBorder
            : selectedOption
            ? 'border-slate-300 bg-white hover:border-slate-400'
            : 'border-slate-200 bg-white hover:border-slate-300'
        }`}
      >
        {renderTrigger ? (
          renderTrigger(selectedOption)
        ) : selectedOption ? (
          <div className="flex items-center gap-2 min-w-0 pr-2">
            {selectedOption.badge && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 ${t.badge}`}>
                {selectedOption.badge}
              </span>
            )}
            <span className="text-xs font-bold text-slate-800 truncate">
              {selectedOption.label}
            </span>
            {selectedOption.subLabel && (
              <span className="text-[11px] text-slate-500 truncate hidden sm:inline">
                • {selectedOption.subLabel}
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs font-medium text-slate-500 truncate">
            {placeholder}
          </span>
        )}

        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ml-2 ${
            isOpen ? `rotate-180 ${t.checkColor}` : ''
          }`}
        />
      </button>

      {/* Dropdown Card */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden py-1 animate-in fade-in-50 zoom-in-95 duration-100 text-left">
          {/* Search Header if > 6 items */}
          {isSearchable && (
            <div className="p-2 border-b border-slate-100 bg-slate-50/80">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={searchPlaceholder}
                  className={`w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none transition-all ${t.searchFocus}`}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List */}
          <div ref={listContainerRef} className={`${maxHeight} overflow-y-auto p-1 space-y-0.5 divide-y-0`}>
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400 font-medium">
                No matching options found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);

                return (
                  <button
                    key={String(opt.value)}
                    ref={isSelected ? selectedOptionRef : null}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => {
                      if (!opt.disabled) {
                        onChange(opt.value, opt.raw);
                        setIsOpen(false);
                        setSearchTerm('');
                      }
                    }}
                    className={`w-full px-3 py-2 text-left rounded-xl text-xs flex items-center justify-between transition-all outline-none min-h-[38px] ${
                      opt.disabled
                        ? 'opacity-40 cursor-not-allowed bg-slate-50 text-slate-400'
                        : isSelected
                        ? `${t.selectedBg} border shadow-2xs`
                        : 'text-slate-700 hover:bg-slate-50 font-medium cursor-pointer'
                    }`}
                  >
                    {renderOption ? (
                      renderOption(opt, isSelected)
                    ) : (
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        {opt.badge && (
                          <span
                            className={`px-1.5 py-0.5 rounded-md font-mono text-[10px] font-bold shrink-0 border ${
                              isSelected
                                ? t.badge
                                : 'bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                          >
                            {opt.badge}
                          </span>
                        )}
                        <div className="truncate">
                          <p className="font-bold text-slate-900 truncate leading-tight">
                            {opt.label}
                          </p>
                          {opt.subLabel && (
                            <p className="text-[10px] text-slate-500 font-normal truncate mt-0.5">
                              {opt.subLabel}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {isSelected && (
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow-2xs ml-2 ${t.selectedIcon}`}>
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
