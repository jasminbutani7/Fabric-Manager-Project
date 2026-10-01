import { useState, useCallback, useMemo } from 'react';

/**
 * Custom hook to manage state for all hoisted fabric lot modals.
 * Used once per page (Inventory, Home) instead of instantiating modals inside each card.
 */
export function useFabricModals() {
  const [editingFabric, setEditingFabric] = useState(null);
  const [deliveryFabric, setDeliveryFabric] = useState(null);
  const [structureFabric, setStructureFabric] = useState(null);
  const [masterFabric, setMasterFabric] = useState(null);
  const [cuttingFabric, setCuttingFabric] = useState(null);
  const [invoiceFabric, setInvoiceFabric] = useState(null);
  const [deleteConfirmFabric, setDeleteConfirmFabric] = useState(null);
  const [trimmingDecisionFabric, setTrimmingDecisionFabric] = useState(null);
  const [trimmingVerifiedCount, setTrimmingVerifiedCount] = useState(0);

  const [showAssignThreadCuttingModal, setShowAssignThreadCuttingModal] = useState(false);
  const [selectedCuttingForThreadCutting, setSelectedCuttingForThreadCutting] = useState(null);
  const [selectedSubPartForThreadCutting, setSelectedSubPartForThreadCutting] = useState(null);
  const [selectedQuantityForThreadCutting, setSelectedQuantityForThreadCutting] = useState(null);
  const [selectedSubPartQuantitiesForThreadCutting, setSelectedSubPartQuantitiesForThreadCutting] = useState(null);

  const [selectedInvoiceForDetails, setSelectedInvoiceForDetails] = useState(null);
  const [archiveModalFabric, setArchiveModalFabric] = useState(null);
  const [archiveModalIsArchiving, setArchiveModalIsArchiving] = useState(true);

  const onOpenEdit = useCallback((fabric) => setEditingFabric(fabric), []);
  const onOpenDeliver = useCallback((fabric) => setDeliveryFabric(fabric), []);
  const onOpenStructure = useCallback((fabric) => setStructureFabric(fabric), []);
  const onOpenAssignMaster = useCallback((fabric) => setMasterFabric(fabric), []);
  const onOpenCut = useCallback((fabric) => setCuttingFabric(fabric), []);
  const onOpenInvoice = useCallback((fabric) => setInvoiceFabric(fabric), []);
  const onDeleteFabric = useCallback((fabric) => setDeleteConfirmFabric(fabric), []);

  const onOpenArchiveLot = useCallback((fabric, isArchiving = true) => {
    setArchiveModalFabric(fabric);
    setArchiveModalIsArchiving(Boolean(isArchiving));
  }, []);

  const onOpenTrimmingDecision = useCallback((fabric, verifiedCount = 0) => {
    setTrimmingDecisionFabric(fabric);
    setTrimmingVerifiedCount(verifiedCount);
  }, []);

  const onOpenAssignThreadCutting = useCallback(({ cuttingId, subPartKey, pcsCount, subPartMap }) => {
    setSelectedCuttingForThreadCutting(cuttingId);
    setSelectedSubPartForThreadCutting(subPartKey || null);
    setSelectedQuantityForThreadCutting(pcsCount || null);
    setSelectedSubPartQuantitiesForThreadCutting(subPartMap || null);
    setShowAssignThreadCuttingModal(true);
  }, []);

  const onViewInvoice = useCallback((invoice) => setSelectedInvoiceForDetails(invoice), []);

  const modalActions = useMemo(() => ({
    onOpenEdit,
    onOpenDeliver,
    onOpenStructure,
    onOpenAssignMaster,
    onOpenCut,
    onOpenInvoice,
    onDeleteFabric,
    onOpenArchiveLot,
    onOpenTrimmingDecision,
    onOpenAssignThreadCutting,
    onViewInvoice,
  }), [
    onOpenEdit,
    onOpenDeliver,
    onOpenStructure,
    onOpenAssignMaster,
    onOpenCut,
    onOpenInvoice,
    onDeleteFabric,
    onOpenArchiveLot,
    onOpenTrimmingDecision,
    onOpenAssignThreadCutting,
    onViewInvoice,
  ]);

  const modalState = {
    editingFabric,
    setEditingFabric,
    deliveryFabric,
    setDeliveryFabric,
    structureFabric,
    setStructureFabric,
    masterFabric,
    setMasterFabric,
    cuttingFabric,
    setCuttingFabric,
    invoiceFabric,
    setInvoiceFabric,
    deleteConfirmFabric,
    setDeleteConfirmFabric,
    trimmingDecisionFabric,
    setTrimmingDecisionFabric,
    trimmingVerifiedCount,
    showAssignThreadCuttingModal,
    setShowAssignThreadCuttingModal,
    selectedCuttingForThreadCutting,
    setSelectedCuttingForThreadCutting,
    selectedSubPartForThreadCutting,
    setSelectedSubPartForThreadCutting,
    selectedQuantityForThreadCutting,
    setSelectedQuantityForThreadCutting,
    selectedSubPartQuantitiesForThreadCutting,
    setSelectedSubPartQuantitiesForThreadCutting,
    selectedInvoiceForDetails,
    setSelectedInvoiceForDetails,
    archiveModalFabric,
    setArchiveModalFabric,
    archiveModalIsArchiving,
    setArchiveModalIsArchiving,
  };

  return { modalActions, modalState };
}

export default useFabricModals;
