import {
  Receipt,
  Building2,
  Wrench,
  Zap,
  UserCheck,
  HeartHandshake,
  MoreHorizontal,
} from 'lucide-react';

export const getCategoryBadge = (type, subType) => {
  switch (type) {
    case 'Rent':
      return {
        icon: Building2,
        label: 'Rent',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
        iconBg: 'bg-purple-100 text-purple-600',
      };
    case 'Maintainance':
      return {
        icon: Wrench,
        label: 'Maint',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        iconBg: 'bg-amber-100 text-amber-600',
      };
    case 'Light Bill':
      return {
        icon: Zap,
        label: 'Light',
        badgeClass: 'bg-yellow-50 text-yellow-800 border-yellow-200',
        iconBg: 'bg-yellow-100 text-yellow-600',
      };
    case 'Salary':
      if (subType === 'Master') {
        return {
          icon: UserCheck,
          label: 'Master',
          badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
          iconBg: 'bg-purple-100 text-purple-700',
        };
      }
      return {
        icon: HeartHandshake,
        label: 'Helper',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        iconBg: 'bg-emerald-100 text-emerald-600',
      };
    case 'Other':
      return {
        icon: MoreHorizontal,
        label: 'Other',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        iconBg: 'bg-slate-100 text-slate-700',
      };
    default:
      return {
        icon: Receipt,
        label: type,
        badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
        iconBg: 'bg-slate-100 text-slate-600',
      };
  }
};
