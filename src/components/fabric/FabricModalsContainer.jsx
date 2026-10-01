import React, { lazy, Suspense } from 'react';
import { useFabrics, useProduction } from '../../context/useManagement';

const RecordCuttingModal = lazy(() => import('../modals/RecordCuttingModal'));
const AddInvoiceModal = lazy(() => import('../modals/AddInvoiceModal'));
const DeliverToSupplierModal = lazy(() => import('../modals/DeliverToSupplierModal'));
const ThreadTrimmingDecisionModal = lazy(() => import('../modals/ThreadTrimmingDecisionModal'));
const AssignThreadCuttingModal = lazy(() => import('../modals/AssignThreadCuttingModal'));
const SetProductStructureModal = lazy(() => import('../modals/SetProductStructureModal'));
const AssignFabricMasterModal = lazy(() => import('../modals/AssignFabricMasterModal'));
const AddFabricModal = lazy(() => import('../modals/AddFabricModal'));
const InvoiceDetailsModal = lazy(() => import('../modals/InvoiceDetailsModal'));
const ArchiveLotModal = lazy(() => import('../modals/ArchiveLotModal'));
const DeleteFabricLotModal = lazy(() => import('../modals/DeleteFabricLotModal'));

/**
 * Hoisted single instance of fabric lot modals rendered at the page level.
 */
export default function FabricModalsContainer({ modalState }) {
  const {
    deleteFabric,
    archiveFabricLot,
    unarchiveFabricLot,
    cuttings = [],
  } = useFabrics();

  const {
    setFabricThreadCuttingDecision,
    tailorAssignments = [],
    masterHandovers = [],
    threadCuttingAssignments = [],
    deliveryLogs = [],
  } = useProduction();

  const {
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
  } = modalState;

  const targetLotFabricId = archiveModalFabric?.id || deleteConfirmFabric?.id;
  const linkedCuttingsCount = (cuttings || []).filter(
    (c) => c.fabricId === targetLotFabricId || c.fabric_id === targetLotFabricId
  ).length;
  const linkedAssignmentsCount = (tailorAssignments || []).filter(
    (a) => a.fabricId === targetLotFabricId || a.fabric_id === targetLotFabricId
  ).length;
  const linkedHandoversCount = (masterHandovers || []).filter(
    (h) => h.fabricId === targetLotFabricId || h.fabric_id === targetLotFabricId
  ).length;
  const linkedThreadJobsCount = (threadCuttingAssignments || []).filter(
    (tc) => tc.fabricId === targetLotFabricId || tc.fabric_id === targetLotFabricId
  ).length;
  const linkedDeliveriesCount = (deliveryLogs || []).filter(
    (dl) => dl.fabricId === targetLotFabricId || dl.fabric_id === targetLotFabricId
  ).length;

  return (
    <Suspense fallback={null}>
      {/* 1. Edit Fabric Details Modal */}
      {editingFabric && (
        <AddFabricModal
          key={editingFabric.id || 'edit-fab-modal'}
          isOpen={Boolean(editingFabric)}
          onClose={() => setEditingFabric(null)}
          fabricToEdit={editingFabric}
          onSuccess={() => setEditingFabric(null)}
        />
      )}

      {/* 2. Deliver To Supplier Modal */}
      {deliveryFabric && (
        <DeliverToSupplierModal
          key={deliveryFabric.id || 'inv-deliver-modal'}
          isOpen={Boolean(deliveryFabric)}
          initialFabricId={deliveryFabric.id}
          onClose={() => setDeliveryFabric(null)}
          onSuccess={() => setDeliveryFabric(null)}
        />
      )}

      {/* 3. Product Structure & Tailor Rates Modal */}
      {structureFabric && (
        <SetProductStructureModal
          key={structureFabric.id || 'prod-struct-modal'}
          isOpen={Boolean(structureFabric)}
          onClose={() => setStructureFabric(null)}
          onSaved={() => setStructureFabric(null)}
          fabric={structureFabric}
        />
      )}

      {/* 4. Assign Cutting Master Modal */}
      {masterFabric && (
        <AssignFabricMasterModal
          key={masterFabric.id || 'assign-master-modal'}
          isOpen={Boolean(masterFabric)}
          onClose={() => setMasterFabric(null)}
          fabric={masterFabric}
        />
      )}

      {/* 5. Record Master Cutting Modal */}
      {cuttingFabric && (
        <RecordCuttingModal
          key={cuttingFabric.id || 'inv-cut-open'}
          isOpen={Boolean(cuttingFabric)}
          initialFabricId={cuttingFabric.id}
          onClose={() => setCuttingFabric(null)}
        />
      )}

      {/* 6. Create Invoice on Fabric Modal */}
      {invoiceFabric && (
        <AddInvoiceModal
          key={invoiceFabric.id || 'inv-modal-open'}
          isOpen={Boolean(invoiceFabric)}
          onClose={() => setInvoiceFabric(null)}
          preselectedFabric={invoiceFabric}
        />
      )}

      {/* 7. Delete Fabric Confirmation Modal */}
      {deleteConfirmFabric && (
        <DeleteFabricLotModal
          key={deleteConfirmFabric.id || 'delete-fabric-lot-modal'}
          isOpen={Boolean(deleteConfirmFabric)}
          fabric={deleteConfirmFabric}
          cuttingsCount={linkedCuttingsCount}
          assignmentsCount={linkedAssignmentsCount}
          handoversCount={linkedHandoversCount}
          threadJobsCount={linkedThreadJobsCount}
          deliveriesCount={linkedDeliveriesCount}
          onClose={() => setDeleteConfirmFabric(null)}
          onConfirm={(fabricId) => {
            deleteFabric(fabricId);
            setDeleteConfirmFabric(null);
          }}
        />
      )}

      {/* 8. Thread Trimming Decision Modal */}
      {trimmingDecisionFabric && (
        <ThreadTrimmingDecisionModal
          key={trimmingDecisionFabric.id || 'inv-trimming-decision'}
          isOpen={Boolean(trimmingDecisionFabric)}
          fabric={trimmingDecisionFabric}
          verifiedPiecesCount={trimmingVerifiedCount || 0}
          onClose={() => setTrimmingDecisionFabric(null)}
          onChooseAssignTrimming={(subPartKey, subPartName, pcsCount, subPartMap) => {
            const fId = trimmingDecisionFabric.id;
            setTrimmingDecisionFabric(null);
            setSelectedCuttingForThreadCutting(fId);
            setSelectedSubPartForThreadCutting(subPartKey || null);
            setSelectedQuantityForThreadCutting(pcsCount || null);
            setSelectedSubPartQuantitiesForThreadCutting(subPartMap || null);
            setShowAssignThreadCuttingModal(true);
          }}
          onChooseSkipTrimming={(subPartKey, pcsCount) => {
            const fId = trimmingDecisionFabric.id;
            if (subPartKey) {
              setFabricThreadCuttingDecision(fId, 'skipped', subPartKey, pcsCount);
            } else {
              setFabricThreadCuttingDecision(fId, 'skipped');
            }
            setTrimmingDecisionFabric(null);
          }}
        />
      )}

      {/* 9. Assign Thread Cutting Modal */}
      {showAssignThreadCuttingModal && (
        <AssignThreadCuttingModal
          key={`${selectedCuttingForThreadCutting || 'inv-asgn'}-${selectedSubPartForThreadCutting || 'all'}-${selectedQuantityForThreadCutting || 'auto'}`}
          isOpen={showAssignThreadCuttingModal}
          initialCuttingId={selectedCuttingForThreadCutting}
          initialSubPart={selectedSubPartForThreadCutting}
          initialQuantity={selectedQuantityForThreadCutting}
          initialSubPartQuantities={selectedSubPartQuantitiesForThreadCutting}
          onClose={() => {
            setShowAssignThreadCuttingModal(false);
            setSelectedCuttingForThreadCutting(null);
            setSelectedSubPartForThreadCutting(null);
            setSelectedQuantityForThreadCutting(null);
            setSelectedSubPartQuantitiesForThreadCutting(null);
          }}
          onSuccess={() => {
            setShowAssignThreadCuttingModal(false);
            setSelectedCuttingForThreadCutting(null);
            setSelectedSubPartForThreadCutting(null);
            setSelectedQuantityForThreadCutting(null);
            setSelectedSubPartQuantitiesForThreadCutting(null);
          }}
        />
      )}

      {/* 10. View Invoice Details Modal */}
      {selectedInvoiceForDetails && (
        <InvoiceDetailsModal
          key={selectedInvoiceForDetails.id || 'inv-details-card'}
          isOpen={Boolean(selectedInvoiceForDetails)}
          invoice={selectedInvoiceForDetails}
          onClose={() => setSelectedInvoiceForDetails(null)}
          onRecordPaymentSuccess={(updated) => setSelectedInvoiceForDetails(updated)}
        />
      )}

      {/* 11. Archive / Restore Fabric Lot Modal */}
      {archiveModalFabric && (
        <ArchiveLotModal
          key={archiveModalFabric.id || 'archive-lot-modal'}
          isOpen={Boolean(archiveModalFabric)}
          fabric={archiveModalFabric}
          isArchiving={archiveModalIsArchiving}
          cuttingsCount={linkedCuttingsCount}
          assignmentsCount={linkedAssignmentsCount}
          handoversCount={linkedHandoversCount}
          threadJobsCount={linkedThreadJobsCount}
          deliveriesCount={linkedDeliveriesCount}
          onClose={() => setArchiveModalFabric(null)}
          onConfirm={(fabricId) => {
            if (archiveModalIsArchiving) {
              archiveFabricLot(fabricId);
            } else {
              unarchiveFabricLot(fabricId);
            }
          }}
        />
      )}
    </Suspense>
  );
}
