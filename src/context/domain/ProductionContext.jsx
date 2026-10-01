import { createContext, useContext } from 'react';

export const ProductionContext = createContext(null);

export const useProduction = () => {
  const context = useContext(ProductionContext);
  if (!context) {
    throw new Error('useProduction must be used within a ManagementProvider');
  }
  return context;
};
