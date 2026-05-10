// src/utils/formatCurrency.js
export const formatCurrency = (amount) => {
  if (amount == null) return 'PKR —';
  return `PKR ${Number(amount).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// src/utils/formatDate.js — bundled here for simplicity
export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PK', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

// src/utils/roleGuard.js
export const getDefaultRoute = (role) => {
  switch (role) {
    case 'Rider':  return '/dashboard/rider';
    case 'Driver': return '/dashboard/driver';
    case 'Admin':  return '/dashboard/admin';
    default:       return '/login';
  }
};
