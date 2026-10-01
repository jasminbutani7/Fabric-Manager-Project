import { createContext, useContext } from 'react';

export const FinanceContext = createContext(null);

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a ManagementProvider');
  }
  return context;
};
