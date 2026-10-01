// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import './setupTests';

import TailorPortal from '../src/pages/TailorPortal';
import MasterPortal from '../src/pages/MasterPortal';
import TailorHistoryTab from '../src/components/tailor/TailorHistoryTab';
import TailorArchiveTab from '../src/components/tailor/TailorArchiveTab';

const mockLoginAsWorker = vi.fn();
const mockLogout = vi.fn();
let mockCurrentUser = null;

const mockTailor = {
  id: 'tailor_1',
  name: 'Ramesh Tailor',
  phone: '9876543210',
  password: 'secretpassword',
  role: 'Tailor',
  assignedMachineId: 'm1',
};

const mockMaster = {
  id: 'master_1',
  name: 'Suresh Master',
  phone: '9123456780',
  password: 'mastersecret',
  role: 'Master',
  specialization: 'Master Pattern Maker & Cutter',
};

const mockManagementContext = {
  isInitialized: true,
  tailors: [mockTailor],
  masters: [mockMaster],
  machines: [
    { id: 'm1', code: 'M-01', name: 'Juki Single Needle', assignedTailorId: 'tailor_1', assignedTailorName: 'Ramesh Tailor' },
  ],
  fabrics: [
    {
      id: 'fab_1',
      fabricType: 'Cotton Cambric',
      color: 'Navy Blue',
      productName: 'Kurti Pant Set',
      assignedMasterId: 'master_1',
      masterId: 'master_1',
      status: 'In Cutting',
      totalMeters: 500,
    },
  ],
  cuttings: [
    {
      id: 'cut_1',
      fabricId: 'fab_1',
      masterId: 'master_1',
      masterName: 'Suresh Master',
      totalPieces: 100,
      totalPcs: 100,
    },
  ],
  tailorAssignments: [
    {
      id: 'asgn_1',
      tailorId: 'tailor_1',
      tailorName: 'Ramesh Tailor',
      masterId: 'master_1',
      masterName: 'Suresh Master',
      fabricId: 'fab_1',
      fabricName: 'Cotton Cambric',
      cuttingId: 'cut_1',
      status: 'Active',
      tailorAccepted: true,
      assignedPieces: { top: 50, bottom: 50 },
      ratePerPiece: 30,
      totalJobAmount: 1500,
      dailySubmissions: [],
    },
  ],
  helpers: [
    { id: 'h1', name: 'Ganesh Helper', masterId: 'master_1' },
  ],
  threadCuttingAssignments: [],
  masterHandovers: [],
  invoices: [],
  deliveryLogs: [],
  acceptTailorAssignment: vi.fn(),
  toggleArchiveTailorAssignment: vi.fn(),
  deleteDailyTailorSubmission: vi.fn(),
  refreshTailorAssignments: vi.fn(),
  refreshAllData: vi.fn(),
};

vi.mock('../src/context/useManagement', () => ({
  useManagement: () => mockManagementContext,
  useFactory: () => mockManagementContext,
  useFabric: () => mockManagementContext,
  useProduction: () => mockManagementContext,
  useFinance: () => mockManagementContext,
}));

vi.mock('../src/context/useAuth', () => ({
  useAuth: () => ({
    currentUser: mockCurrentUser,
    loginAsWorker: mockLoginAsWorker,
    logout: mockLogout,
  }),
}));

// Mock supabase client to test local/fallback auth directly
vi.mock('../src/lib/supabaseClient', () => ({
  isSupabaseConfigured: false,
  supabase: null,
}));

describe('Role Portals Workflow Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser = null;
  });

  describe('TailorPortal Workflows', () => {
    it('renders Tailor PIN verification gate when not authenticated', () => {
      render(
        <MemoryRouter initialEntries={['/portal/tailor/tailor_1']}>
          <Routes>
            <Route path="/portal/tailor/:tailorId" element={<TailorPortal />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText(/Tailor Portal Verification/i)).toBeInTheDocument();
      expect(screen.getByText(/Enter your security PIN or password/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/4-digit PIN or password/i)).toBeInTheDocument();
    });

    it('displays error message on incorrect PIN submission', async () => {
      render(
        <MemoryRouter initialEntries={['/portal/tailor/tailor_1']}>
          <Routes>
            <Route path="/portal/tailor/:tailorId" element={<TailorPortal />} />
          </Routes>
        </MemoryRouter>
      );

      const pinInput = screen.getByPlaceholderText(/4-digit PIN or password/i);
      const submitBtn = screen.getByRole('button', { name: /Unlock Stitching Portal/i });

      fireEvent.change(pinInput, { target: { value: '9999' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/Incorrect PIN or password/i)).toBeInTheDocument();
      });
      expect(mockLoginAsWorker).not.toHaveBeenCalled();
    });

    it('authenticates tailor successfully with correct PIN', async () => {
      render(
        <MemoryRouter initialEntries={['/portal/tailor/tailor_1']}>
          <Routes>
            <Route path="/portal/tailor/:tailorId" element={<TailorPortal />} />
          </Routes>
        </MemoryRouter>
      );

      const pinInput = screen.getByPlaceholderText(/4-digit PIN or password/i);
      const submitBtn = screen.getByRole('button', { name: /Unlock Stitching Portal/i });

      // Using the password configured on the tailor
      fireEvent.change(pinInput, { target: { value: 'secretpassword' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockLoginAsWorker).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'tailor_1',
            name: 'Ramesh Tailor',
            role: 'Tailor',
          })
        );
      });
    });

    it('renders full Tailor Portal dashboard when authenticated', () => {
      mockCurrentUser = {
        id: 'tailor_1',
        name: 'Ramesh Tailor',
        role: 'Tailor',
      };

      render(
        <MemoryRouter initialEntries={['/portal/tailor/tailor_1']}>
          <Routes>
            <Route path="/portal/tailor/:tailorId" element={<TailorPortal />} />
          </Routes>
        </MemoryRouter>
      );

      // Tailor profile card
      expect(screen.getAllByText('Ramesh Tailor').length).toBeGreaterThan(0);
      expect(screen.getByText(/Juki Single Needle/i)).toBeInTheDocument();

      // Navigation tabs
      expect(screen.getByText(/Active \(/i)).toBeInTheDocument();
      expect(screen.getByText(/Logs \(/i)).toBeInTheDocument();
      expect(screen.getByText(/Archive/i)).toBeInTheDocument();

      // Active Work Order
      expect(screen.getByText(/Cotton Cambric/i)).toBeInTheDocument();
    });
  });

  describe('MasterPortal Workflows', () => {
    it('renders Cutting Master verification gate when not authenticated', () => {
      render(
        <MemoryRouter initialEntries={['/portal/master/master_1']}>
          <Routes>
            <Route path="/portal/master/:masterId" element={<MasterPortal />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText(/Cutting Master Verification/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/4-digit PIN or password/i)).toBeInTheDocument();
    });

    it('rejects incorrect PIN for Master portal', async () => {
      render(
        <MemoryRouter initialEntries={['/portal/master/master_1']}>
          <Routes>
            <Route path="/portal/master/:masterId" element={<MasterPortal />} />
          </Routes>
        </MemoryRouter>
      );

      const pinInput = screen.getByPlaceholderText(/4-digit PIN or password/i);
      const submitBtn = screen.getByRole('button', { name: /Unlock Master Portal/i });

      fireEvent.change(pinInput, { target: { value: 'wrongpin' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/Incorrect PIN or password/i)).toBeInTheDocument();
      });
      expect(mockLoginAsWorker).not.toHaveBeenCalled();
    });

    it('authenticates Cutting Master successfully with correct PIN', async () => {
      render(
        <MemoryRouter initialEntries={['/portal/master/master_1']}>
          <Routes>
            <Route path="/portal/master/:masterId" element={<MasterPortal />} />
          </Routes>
        </MemoryRouter>
      );

      const pinInput = screen.getByPlaceholderText(/4-digit PIN or password/i);
      const submitBtn = screen.getByRole('button', { name: /Unlock Master Portal/i });

      fireEvent.change(pinInput, { target: { value: 'mastersecret' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockLoginAsWorker).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'master_1',
            name: 'Suresh Master',
            role: 'Master',
          })
        );
      });
    });

    it('renders full Master Portal dashboard with tabs when authenticated', () => {
      mockCurrentUser = {
        id: 'master_1',
        name: 'Suresh Master',
        role: 'Master',
      };

      render(
        <MemoryRouter initialEntries={['/portal/master/master_1']}>
          <Routes>
            <Route path="/portal/master/:masterId" element={<MasterPortal />} />
          </Routes>
        </MemoryRouter>
      );

      // Master profile
      expect(screen.getAllByText('Suresh Master').length).toBeGreaterThan(0);
      expect(screen.getByText(/Master Pattern Maker & Cutter/i)).toBeInTheDocument();

      // Navigation tab options
      expect(screen.getByText('Fabrics')).toBeInTheDocument();
      expect(screen.getByText('Cuts')).toBeInTheDocument();
      expect(screen.getByText('Tailors')).toBeInTheDocument();
      expect(screen.getByText('Trimming')).toBeInTheDocument();
      expect(screen.getByText('Helpers')).toBeInTheDocument();
      expect(screen.getByText('Archive')).toBeInTheDocument();

      // Assigned fabric card
      expect(screen.getByText(/Cotton Cambric/i)).toBeInTheDocument();
    });
  });

  describe('Tailor Portal Fabric Lot Grouping', () => {
    const testFabrics = [
      { id: 'fab_1', lotNo: 101, fabricType: 'Cotton Cambric', color: 'Navy Blue' },
      { id: 'fab_2', lotNo: 102, fabricType: 'Rayon Slub', color: 'Maroon' },
    ];
    const testCuttings = [
      { id: 'cut_1', fabricId: 'fab_1' },
      { id: 'cut_2', fabricId: 'fab_2' },
    ];

    it('groups work submissions by fabric lot in TailorHistoryTab', () => {
      const activeSubs = [
        {
          id: 'sub_1',
          assignmentId: 'asgn_1',
          fabricId: 'fab_1',
          cuttingId: 'cut_1',
          fabricName: 'Cotton Cambric',
          pscQuantity: 50,
          earnedAmount: 1250,
          approvalStatus: 'Approved',
          date: '2026-09-30',
        },
        {
          id: 'sub_2',
          assignmentId: 'asgn_2',
          fabricId: 'fab_2',
          cuttingId: 'cut_2',
          fabricName: 'Rayon Slub',
          pscQuantity: 30,
          earnedAmount: 900,
          approvalStatus: 'Approved',
          date: '2026-09-30',
        },
      ];

      render(
        <TailorHistoryTab
          activeSubmissions={activeSubs}
          cuttings={testCuttings}
          fabrics={testFabrics}
        />
      );

      // Verify lot headers
      expect(screen.getByText('LOT #101')).toBeInTheDocument();
      expect(screen.getByText('LOT #102')).toBeInTheDocument();
      expect(screen.getByText('Collapse All Lots (2)')).toBeInTheDocument();
    });

    it('groups completed orders and archived logs by fabric lot in TailorArchiveTab', () => {
      const archivedAssignments = [
        {
          id: 'asgn_arch_1',
          fabricId: 'fab_1',
          cuttingId: 'cut_1',
          fabricName: 'Cotton Cambric',
          completedQuantity: 100,
          totalAssignedPieces: 100,
          status: 'Completed',
          isArchived: true,
        },
      ];

      const { rerender } = render(
        <TailorArchiveTab
          archivedAssignments={archivedAssignments}
          archiveSubFilter="orders"
          cuttings={testCuttings}
          fabrics={testFabrics}
        />
      );

      expect(screen.getByText('LOT #101')).toBeInTheDocument();
      expect(screen.getByText('Completed & Settled')).toBeInTheDocument();

      const archivedSubs = [
        {
          id: 'sub_arch_1',
          assignmentId: 'asgn_arch_1',
          fabricId: 'fab_1',
          cuttingId: 'cut_1',
          fabricName: 'Cotton Cambric',
          pscQuantity: 100,
          earnedAmount: 2500,
          approvalStatus: 'Approved',
          date: '2026-09-30',
        },
      ];

      rerender(
        <TailorArchiveTab
          archivedAssignments={archivedAssignments}
          archivedSubmissions={archivedSubs}
          archiveSubFilter="logs"
          cuttings={testCuttings}
          fabrics={testFabrics}
        />
      );

      expect(screen.getByText('LOT #101')).toBeInTheDocument();
      expect(screen.getByText('Collapse All Lots (1)')).toBeInTheDocument();
    });
  });
});
