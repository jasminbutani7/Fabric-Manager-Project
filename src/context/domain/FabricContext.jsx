import { createContext, useContext } from 'react';

export const FabricContext = createContext(null);

export const useFabrics = () => {
  const context = useContext(FabricContext);
  if (!context) {
    throw new Error('useFabrics must be used within a ManagementProvider');
  }
  return context;
};

export const useFabric = useFabrics;

