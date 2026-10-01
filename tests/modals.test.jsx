// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import './setupTests';

import AlertModal from '../src/components/modals/AlertModal';
import ReviewAcceptWorkModal from '../src/components/modals/ReviewAcceptWorkModal';
import ThreadTrimmingDecisionModal from '../src/components/modals/ThreadTrimmingDecisionModal';
import DeliverToSupplierModal from '../src/components/modals/DeliverToSupplierModal';
import AddInvoiceModal from '../src/components/modals/AddInvoiceModal';
import DeleteFabricLotModal from '../src/components/modals/DeleteFabricLotModal';
import { FabricLotActionsDropdown } from '../src/components/fabric/FabricLotActionButtons';

// Mock contexts
const mockManagementContext = {
  fabrics: [
    {
      id: 'fab_1',
      fabricType: 'Rayon Print',
      productName: 'Kurti Set',
      productQuantity: 100,
      supplierId: 'sup_1',
      supplierName: 'Shree Ram Textiles',
      pricePerSet: 50,
      productStructure: {
        productName: 'Kurti Set',
        subParts: [
          { id: 'top', name: 'Top Kurti', qty: 1, rate: 25 },
          { id: 'bottom', name: 'Bottom Pant', qty: 1, rate: 20 },
        ],
      },
    },
  ],
  cuttings: [
    {
      id: 'cut_1',
      fabricId: 'fab_1',
      totalPieces: 200,
    },
  ],
  suppliers: [
    { id: 'sup_1', name: 'Shree Ram Textiles' },
  ],
  threadCuttingAssignments: [],
  masterHandovers: [],
  invoices: [],
  deliveryLogs: [],
  setFabricThreadCuttingDecision: vi.fn(),
  deliverGoodsToSupplier: vi.fn(),
  addInvoice: vi.fn(),
  updateInvoice: vi.fn(),
};

const mockAuthContext = {
  currentUser: { id: 'worker_1', name: 'Ramesh Tailor', role: 'Tailor' },
};

vi.mock('../src/context/useManagement', () => ({
  useManagement: () => mockManagementContext,
  useFactory: () => mockManagementContext,
  useFabric: () => mockManagementContext,
  useProduction: () => mockManagementContext,
  useFinance: () => mockManagementContext,
}));

vi.mock('../src/context/useAuth', () => ({
  useAuth: () => mockAuthContext,
}));

describe('Key Modals Testing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AlertModal Component', () => {
    it('does not render when isOpen is false', () => {
      const { container } = render(
        <AlertModal isOpen={false} onClose={vi.fn()} message="Test message" />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders title, message, and calls onClose when confirm button is clicked', () => {
      const handleClose = vi.fn();
      render(
        <AlertModal
          isOpen={true}
          onClose={handleClose}
          title="Stock Alert"
          message="Fabric lot is running low on stock."
          buttonText="Acknowledge"
        />
      );

      expect(screen.getByText('Stock Alert')).toBeInTheDocument();
      expect(screen.getByText('Fabric lot is running low on stock.')).toBeInTheDocument();

      const ackBtn = screen.getByRole('button', { name: /Acknowledge/i });
      expect(ackBtn).toBeInTheDocument();
      fireEvent.click(ackBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('renders cancel button and triggers onConfirm on confirm click', () => {
      const handleConfirm = vi.fn();
      const handleClose = vi.fn();
      render(
        <AlertModal
          isOpen={true}
          onClose={handleClose}
          title="Confirm Deletion"
          message="Are you sure you want to delete this lot?"
          showCancel={true}
          confirmText="Yes, Delete"
          cancelText="No, Keep"
          onConfirm={handleConfirm}
        />
      );

      expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();
      const cancelBtn = screen.getByRole('button', { name: /No, Keep/i });
      const confirmBtn = screen.getByRole('button', { name: /Yes, Delete/i });

      expect(cancelBtn).toBeInTheDocument();
      expect(confirmBtn).toBeInTheDocument();

      fireEvent.click(confirmBtn);
      expect(handleConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('ReviewAcceptWorkModal Component', () => {
    const mockAssignment = {
      id: 'asgn_101',
      fabricId: 'fab_1',
      cuttingId: 'cut_1',
      tailorName: 'Ramesh Tailor',
      status: 'Pending',
      assignedPieces: { top: 50, bottom: 50 },
      assignedSubParts: { top: 50, bottom: 50 },
      ratePerPiece: 45,
      totalJobAmount: 2250,
    };

    it('renders work allocation details and handles onAccept callback', () => {
      const handleAccept = vi.fn();
      const handleClose = vi.fn();

      render(
        <ReviewAcceptWorkModal
          isOpen={true}
          onClose={handleClose}
          assignment={mockAssignment}
          onAccept={handleAccept}
        />
      );

      expect(screen.getByText(/Review Work Allocation/i)).toBeInTheDocument();

      const acceptBtn = screen.getByRole('button', { name: /Confirm & Accept Work/i });
      expect(acceptBtn).toBeInTheDocument();
      fireEvent.click(acceptBtn);

      expect(handleAccept).toHaveBeenCalledWith('asgn_101');
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('ThreadTrimmingDecisionModal Component', () => {
    it('renders trimming decision options for fabric lot', () => {
      const handleAssignTrimming = vi.fn();
      const handleClose = vi.fn();

      render(
        <ThreadTrimmingDecisionModal
          isOpen={true}
          onClose={handleClose}
          fabric={mockManagementContext.fabrics[0]}
          verifiedPiecesCount={100}
          onChooseAssignTrimming={handleAssignTrimming}
        />
      );

      expect(screen.getByText(/Thread Trimming Finishing Plan/i)).toBeInTheDocument();
      expect(screen.getByText(/Rayon Print/i)).toBeInTheDocument();
    });
  });

  describe('DeliverToSupplierModal Component', () => {
    it('renders supplier delivery modal with fabric and input fields', () => {
      const handleClose = vi.fn();
      render(
        <DeliverToSupplierModal
          isOpen={true}
          onClose={handleClose}
          initialFabricId="fab_1"
        />
      );

      expect(screen.getByText(/Deliver Finished Goods to Supplier/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Shree Ram Textiles/i).length).toBeGreaterThan(0);
    });
  });

  describe('AddInvoiceModal Component - Remaining Sets/Pieces Configuration', () => {
    it('initializes with remaining sets when partially invoiced', () => {
      mockManagementContext.invoices = [
        {
          id: 'inv_1',
          fabricId: 'fab_1',
          setQuantity: 60,
          items: [
            { id: 'it_1', subPartId: 'top', quantity: 60, unitPrice: 25 },
            { id: 'it_2', subPartId: 'bottom', quantity: 60, unitPrice: 20 },
          ],
        },
      ];

      render(
        <AddInvoiceModal
          isOpen={true}
          onClose={vi.fn()}
          initialFabricId="fab_1"
        />
      );

      expect(screen.getByText(/Fabric Lot Sets Configuration/i)).toBeInTheDocument();
      expect(screen.getByText(/Remaining to Invoice:/i)).toBeInTheDocument();
      expect(screen.getAllByText(/40 Sets/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/60 of 100 sets already invoiced/i)).toBeInTheDocument();
    });

    it('shows all sets invoiced banner and defaults to 0 when remaining sets is 0', () => {
      mockManagementContext.invoices = [
        {
          id: 'inv_1',
          fabricId: 'fab_1',
          setQuantity: 100,
          items: [
            { id: 'it_1', subPartId: 'top', quantity: 100, unitPrice: 25 },
            { id: 'it_2', subPartId: 'bottom', quantity: 100, unitPrice: 20 },
          ],
        },
      ];

      render(
        <AddInvoiceModal
          isOpen={true}
          onClose={vi.fn()}
          initialFabricId="fab_1"
        />
      );

      expect(screen.getByText(/All 100 Sets.*Fully Invoiced/i)).toBeInTheDocument();
      expect(screen.getAllByText(/0 Remaining/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/0 sets remaining/i).length).toBeGreaterThan(0);
    });

    it('shows validation warning and prevents submission when subpart quantity exceeds remaining pieces', () => {
      mockManagementContext.invoices = [
        {
          id: 'inv_1',
          fabricId: 'fab_1',
          setQuantity: 60,
          items: [
            { id: 'it_1', subPartId: 'top', quantity: 60, unitPrice: 25 },
            { id: 'it_2', subPartId: 'bottom', quantity: 60, unitPrice: 20 },
          ],
        },
      ];

      render(
        <AddInvoiceModal
          isOpen={true}
          onClose={vi.fn()}
          initialFabricId="fab_1"
        />
      );

      // Remaining is 40 for both top and bottom. Find line item quantity inputs (initialized with 40)
      const fortyInputs = screen.getAllByDisplayValue('40');
      // Change the first subpart quantity to 45 (which exceeds 40)
      fireEvent.change(fortyInputs[1], { target: { value: '45' } });

      expect(screen.getByText(/Quantity Exceeds Remaining/i)).toBeInTheDocument();
      expect(screen.getByText(/Exceeds by 5 PCs/i)).toBeInTheDocument();
      const submitBtn = screen.getByRole('button', { name: /Generate Invoice/i });
      expect(submitBtn).toBeDisabled();
    });
  });

  describe('DeleteFabricLotModal', () => {
    const mockFabric = {
      id: 'fab_test_1',
      lotNo: 1,
      fabricType: 'PLAIN FABRIC',
    };

    it('renders delete confirmation modal with linked production records', () => {
      render(
        <DeleteFabricLotModal
          isOpen={true}
          fabric={mockFabric}
          cuttingsCount={2}
          assignmentsCount={2}
          handoversCount={3}
          threadJobsCount={8}
          deliveriesCount={2}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />
      );

      expect(screen.getByText('Delete Lot #1')).toBeInTheDocument();
      expect(screen.getByText('PLAIN FABRIC')).toBeInTheDocument();
      expect(screen.getByText(/Deleting Lot #1 is permanent and irreversible/i)).toBeInTheDocument();
      expect(screen.getByText(/Linked Production Records/i)).toBeInTheDocument();
      expect(screen.getByText('Cuttings:')).toBeInTheDocument();
      expect(screen.getByText('Tailor Tasks:')).toBeInTheDocument();
      expect(screen.getByText('Handovers:')).toBeInTheDocument();
      expect(screen.getByText('Thread Jobs:')).toBeInTheDocument();
      expect(screen.getByText('Delivery Logs:')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Proceed & Delete/i })).toBeInTheDocument();
    });

    it('triggers onConfirm with fabric.id when Proceed & Delete is clicked', () => {
      const onConfirm = vi.fn();
      const onClose = vi.fn();

      render(
        <DeleteFabricLotModal
          isOpen={true}
          fabric={mockFabric}
          cuttingsCount={1}
          assignmentsCount={1}
          handoversCount={1}
          threadJobsCount={1}
          deliveriesCount={1}
          onClose={onClose}
          onConfirm={onConfirm}
        />
      );

      const deleteBtn = screen.getByRole('button', { name: /Proceed & Delete/i });
      fireEvent.click(deleteBtn);

      expect(onConfirm).toHaveBeenCalledWith('fab_test_1');
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('FabricLotActionsDropdown Archive Lot Visibility', () => {
    const runningFabric = {
      id: 'fab_running',
      lotNo: 2,
      fabricType: 'COTTON PRINT',
      isArchived: false,
      status: 'Active',
    };

    const completedFabric = {
      id: 'fab_completed',
      lotNo: 3,
      fabricType: 'PLAIN FABRIC',
      isArchived: false,
      status: 'Completed',
    };

    const archivedFabric = {
      id: 'fab_archived',
      lotNo: 4,
      fabricType: 'SILK SATIN',
      isArchived: true,
      status: 'Completed',
    };

    it('does NOT show Archive Lot option when fabric lot is running/in-progress', () => {
      render(
        <FabricLotActionsDropdown
          fabric={runningFabric}
          openDropdownId="fab_running"
          setOpenDropdownId={vi.fn()}
          isLotFullyCompletedAndDelivered={false}
          isAllWorkDoneAndDelivered={false}
        />
      );

      expect(screen.queryByText('Archive Lot')).not.toBeInTheDocument();
      expect(screen.getByText('Delete Fabric Lot')).toBeInTheDocument();
      expect(screen.getByText('Edit Fabric Details')).toBeInTheDocument();
    });

    it('shows Archive Lot option when fabric lot is fully completed and all work is done', () => {
      render(
        <FabricLotActionsDropdown
          fabric={completedFabric}
          openDropdownId="fab_completed"
          setOpenDropdownId={vi.fn()}
          isLotFullyCompletedAndDelivered={true}
          isAllWorkDoneAndDelivered={true}
        />
      );

      expect(screen.getByText('Archive Lot')).toBeInTheDocument();
      expect(screen.getByText('Delete Fabric Lot')).toBeInTheDocument();
    });

    it('shows Restore Lot option when fabric lot is archived', () => {
      render(
        <FabricLotActionsDropdown
          fabric={archivedFabric}
          openDropdownId="fab_archived"
          setOpenDropdownId={vi.fn()}
          isLotFullyCompletedAndDelivered={true}
        />
      );

      expect(screen.getByText('Restore Lot')).toBeInTheDocument();
    });
  });
});
