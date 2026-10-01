import { useTailorAssignmentOps } from './production/useTailorAssignmentOps';
import { useMasterHandoverOps } from './production/useMasterHandoverOps';
import { useThreadCuttingOps } from './production/useThreadCuttingOps';
import { useDeliveryOps } from './production/useDeliveryOps';

/**
 * useProductionOperations
 * Modular coordinator hook delegating to focused domain hooks:
 * - useTailorAssignmentOps: Floor assignments & daily submissions
 * - useMasterHandoverOps: Master handovers & admin verification
 * - useThreadCuttingOps: Thread cutting jobs & trimming decisions
 * - useDeliveryOps: Final garment deliveries to supplier & invoice triggers
 */
export function useProductionOperations(params) {
  const tailorOps = useTailorAssignmentOps(params);
  const handoverOps = useMasterHandoverOps(params);
  const threadOps = useThreadCuttingOps(params);
  const deliveryOps = useDeliveryOps(params);

  return {
    ...tailorOps,
    ...handoverOps,
    ...threadOps,
    ...deliveryOps,
  };
}
