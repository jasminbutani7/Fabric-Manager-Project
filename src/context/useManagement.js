import { useContext, useMemo } from 'react';
import { ManagementContext } from './managementContextInstance';

export const useManagement = () => {
  const context = useContext(ManagementContext);
  if (!context) {
    throw new Error('useManagement must be used within a ManagementProvider');
  }
  return context;
};

/**
 * Selective subscription hook that derives a memoized slice from the ManagementContext.
 * @param {Function} selector - Mapping function extracting specific fields
 * @param {Array} [deps] - Optional dependency array for selector stability
 */
export function useManagementSelector(selector) {
  const context = useManagement();
  return useMemo(() => selector(context), [context, selector]);
}

export { useFactorySetup, useFactorySetup as useFactory } from './domain/FactoryContext';
export { useFabrics, useFabrics as useFabric } from './domain/FabricContext';
export { useProduction } from './domain/ProductionContext';
export { useFinance } from './domain/FinanceContext';


