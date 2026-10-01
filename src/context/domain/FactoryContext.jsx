import { createContext, useContext } from 'react';

export const FactoryContext = createContext(null);

export const useFactorySetup = () => {
  const context = useContext(FactoryContext);
  if (!context) {
    throw new Error('useFactorySetup must be used within a ManagementProvider');
  }
  return context;
};

export const useFactory = useFactorySetup;

