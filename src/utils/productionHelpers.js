/**
 * Helpers for Production and Orders pages
 */

export const getCuttingStatusBadge = (status) => {
  switch (status) {
    case 'Ready for Stitching':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'Partially Assigned':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Fully Assigned':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Completed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

export const getAssignStatusBadge = (status) => {
  switch (status) {
    case 'Assigned':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'In Stitching':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Completed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

export const formatCuttingStatus = (status) => {
  if (status === 'Ready for Stitching') return 'Ready';
  if (status === 'Partially Assigned') return 'Partial';
  if (status === 'Fully Assigned' || status === 'Completed') return 'Assigned';
  return status;
};

export const formatAssignStatus = (status) => {
  if (status === 'In Stitching') return 'Stitching';
  if (status === 'Completed') return 'Done';
  return status;
};

export const getDueDateStatus = (dueDate, status, todayStr) => {
  if (!dueDate || status === 'Completed') return null;
  const today = todayStr || new Date().toISOString().split('T')[0];
  if (dueDate < today) {
    return {
      label: 'Overdue',
      className: 'bg-rose-50 text-rose-700 border-rose-200',
      isWarning: true,
    };
  }
  const daysDiff = Math.ceil((new Date(dueDate) - new Date(today)) / (1000 * 60 * 60 * 24));
  if (daysDiff <= 3) {
    return {
      label: `Due in ${daysDiff}d`,
      className: 'bg-amber-50 text-amber-700 border-amber-200',
      isWarning: true,
    };
  }
  return {
    label: `Due: ${dueDate}`,
    className: 'bg-slate-100 text-slate-600 border-slate-200',
    isWarning: false,
  };
};
