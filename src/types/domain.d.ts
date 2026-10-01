/**
 * Core Domain Type Definitions for Fabric Manager ERP
 * Covers all business entities, complex nested JSON structures, and database contracts.
 */

// -------------------------------------------------------------
// 1. NESTED PRODUCT & COMPONENT CONFIGURATIONS
// -------------------------------------------------------------

export interface ProductComponentConfig {
  id: string;
  name: string;
  qty: number;
}

export interface SubPartConfig {
  id: string;
  name: string;
  qty?: number;
  rate?: number;
  components?: ProductComponentConfig[];
  [key: string]: unknown;
}

export interface ProductStructure {
  productName: string;
  subParts?: SubPartConfig[];
  [key: string]: unknown;
}

export type TailorRates = Record<string, number | string>;
export type CutPiecesMap = Record<string, number>;
export type AssignedPiecesMap = Record<string, number>;
export type SubPartsDeliveredMap = Record<string, number>;

// -------------------------------------------------------------
// 2. FABRIC INVENTORY ENTITIES
// -------------------------------------------------------------

export type FabricStatus = 'In Stock' | 'In Cutting' | 'Completed' | 'Archived';

export interface FabricLot {
  id: string;
  lot_no?: number | string;
  lotNo?: number | string;
  fabricType: string;
  fabric_type?: string;
  color?: string;
  plainMeters?: number | string;
  plain_meters?: number | string;
  totalMeters?: number | string;
  total_meters?: number | string;
  printPieces?: number | string;
  print_pieces?: number | string;
  targetSets?: number | string;
  target_sets?: number | string;
  pricePerPiece?: number | string;
  price_per_piece?: number | string;
  pricePerSet?: number | string;
  price_per_set?: number | string;
  totalAmount?: number | string;
  total_amount?: number | string;
  supplierId?: string | null;
  supplier_id?: string | null;
  supplierName?: string;
  supplier_name?: string;
  supplierPhone?: string;
  supplier_phone?: string;
  assignedMasterId?: string | null;
  assigned_master_id?: string | null;
  assignedMasterName?: string;
  assigned_master_name?: string;
  productName?: string;
  product_name?: string;
  productStructure?: ProductStructure | null;
  product_structure?: ProductStructure | null;
  tailorRates?: TailorRates | null;
  tailor_rates?: TailorRates | null;
  status: FabricStatus;
  date?: string;
  notes?: string;
  is_archived?: boolean;
  isArchived?: boolean;
  is_invoiced?: boolean;
  isInvoiced?: boolean;
  user_id?: string | null;
  created_at?: string;
  createdAt?: string;
}

// -------------------------------------------------------------
// 3. CUTTING BATCH ENTITIES
// -------------------------------------------------------------

export type CuttingStatus =
  | 'Ready for Stitching'
  | 'Partially Assigned'
  | 'Fully Assigned'
  | 'Completed'
  | 'Archived';

export interface CuttingRecord {
  id: string;
  fabricId: string | null;
  fabric_id?: string | null;
  fabricName?: string;
  fabric_name?: string;
  fabricColor?: string;
  fabric_color?: string;
  supplierName?: string;
  supplier_name?: string;
  masterId: string | null;
  master_id?: string | null;
  masterName?: string;
  master_name?: string;
  masterPhone?: string;
  master_phone?: string;
  cutDate?: string;
  cut_date?: string;
  productName?: string;
  product_name?: string;
  productStructure?: ProductStructure | null;
  product_structure?: ProductStructure | null;
  cutPieces?: CutPiecesMap;
  cut_pieces?: CutPiecesMap;
  availableSubParts?: Record<string, number>;
  available_sub_parts?: Record<string, number>;
  totalPieces: number;
  total_pieces?: number;
  totalSets?: number;
  total_sets?: number;
  metersUsed?: number | null;
  meters_used?: number | null;
  tailorRates?: TailorRates | null;
  tailor_rates?: TailorRates | null;
  status: CuttingStatus;
  notes?: string;
  is_archived?: boolean;
  isArchived?: boolean;
  user_id?: string | null;
  created_at?: string;
  createdAt?: string;
}

// -------------------------------------------------------------
// 4. TAILOR ASSIGNMENTS & DAILY WORK SUBMISSIONS
// -------------------------------------------------------------

export type AssignmentStatus =
  | 'Pending Acceptance'
  | 'Declined'
  | 'In Stitching'
  | 'Completed'
  | 'Archived';

export interface DailySubmission {
  id: string;
  date: string;
  quantity: number;
  pscQuantity?: number;
  subParts?: Record<string, number> | null;
  parts?: Record<string, number> | null;
  pieceType?: string;
  ratePerPiece?: number;
  earnedAmount?: number;
  approvalStatus: 'Pending Approval' | 'Approved' | 'Rejected';
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  notes?: string;
  createdAt?: string;
}

export interface TailorAssignment {
  id: string;
  cuttingId: string | null;
  cutting_id?: string | null;
  fabricId?: string | null;
  fabric_id?: string | null;
  fabricName?: string;
  fabric_name?: string;
  fabricColor?: string;
  fabric_color?: string;
  productName?: string;
  product_name?: string;
  masterId?: string | null;
  master_id?: string | null;
  masterName?: string;
  master_name?: string;
  tailorId: string | null;
  tailor_id?: string | null;
  tailorName: string;
  tailor_name?: string;
  tailorPhone?: string;
  tailor_phone?: string;
  machineId?: string | null;
  machine_id?: string | null;
  machineCode?: string;
  machine_code?: string;
  machineName?: string;
  machine_name?: string;
  assignedPieces: AssignedPiecesMap;
  assigned_pieces?: AssignedPiecesMap;
  assignedSubParts?: Record<string, number> | null;
  assigned_sub_parts?: Record<string, number> | null;
  allocatedParts?: string[];
  allocated_parts?: string[];
  totalAssignedPieces: number;
  total_assigned_pieces?: number;
  completedQuantity: number;
  completed_quantity?: number;
  tailorRates?: TailorRates | null;
  tailor_rates?: TailorRates | null;
  subPartRates?: Record<string, number>;
  ratePerPiece: number;
  rate_per_piece?: number;
  totalJobAmount: number;
  total_job_amount?: number;
  totalEarned: number;
  total_earned?: number;
  pieceType?: string;
  piece_type?: string;
  allocationMode?: 'by_machine' | 'by_tailor' | string;
  dailySubmissions?: DailySubmission[];
  daily_submissions?: DailySubmission[];
  assignDate?: string;
  assign_date?: string;
  dueDate?: string;
  due_date?: string;
  tailorAccepted?: boolean;
  tailor_accepted?: boolean;
  acceptedAt?: string | null;
  accepted_at?: string | null;
  declinedAt?: string | null;
  declined_at?: string | null;
  status: AssignmentStatus;
  notes?: string;
  is_archived?: boolean;
  isArchived?: boolean;
  user_id?: string | null;
  created_at?: string;
  createdAt?: string;
}

// -------------------------------------------------------------
// 5. MASTER HANDOVERS & THREAD TRIMMING & DELIVERIES
// -------------------------------------------------------------

export interface MasterHandover {
  id: string;
  masterId: string;
  master_id?: string;
  masterName: string;
  master_name?: string;
  fabricId: string;
  fabric_id?: string;
  fabricName: string;
  fabric_name?: string;
  lotNo?: string | number;
  lot_no?: string | number;
  quantity: number;
  subPartsDelivered?: SubPartsDeliveredMap;
  sub_parts_delivered?: SubPartsDeliveredMap;
  readySetsCalculated?: number;
  ready_sets_calculated?: number;
  status: 'Pending Admin Verification' | 'Verified' | 'Rejected';
  handoverDate: string;
  handover_date?: string;
  verifiedAt?: string | null;
  verified_at?: string | null;
  notes?: string;
  user_id?: string | null;
}

export interface ThreadCuttingAssignment {
  id: string;
  fabricId: string;
  fabric_id?: string;
  fabricName?: string;
  fabric_name?: string;
  helperId?: string | null;
  helper_id?: string | null;
  helperName?: string;
  helper_name?: string;
  masterId?: string | null;
  master_id?: string | null;
  quantityAssigned: number;
  quantity_assigned?: number;
  quantityCompleted: number;
  quantity_completed?: number;
  ratePerPiece: number;
  rate_per_piece?: number;
  totalCost: number;
  total_cost?: number;
  status: 'In Progress' | 'Completed' | 'Cancelled';
  assignedDate?: string;
  assigned_date?: string;
  completedDate?: string | null;
  completed_date?: string | null;
  notes?: string;
  user_id?: string | null;
}

export interface DeliveryLog {
  id: string;
  fabricId: string;
  fabric_id?: string;
  fabricName?: string;
  fabric_name?: string;
  supplierId?: string | null;
  supplier_id?: string | null;
  supplierName?: string;
  supplier_name?: string;
  deliveredSets: number;
  delivered_sets?: number;
  deliveryDate: string;
  delivery_date?: string;
  receivedBy?: string;
  received_by?: string;
  vehicleNumber?: string;
  vehicle_number?: string;
  notes?: string;
  user_id?: string | null;
}

// -------------------------------------------------------------
// 6. FINANCIAL TRANSACTIONS: INVOICES & EXPENSES
// -------------------------------------------------------------

export interface InvoiceItem {
  id: string;
  description: string;
  fabricId?: string | null;
  fabricName?: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface InvoicePaymentRecord {
  id: string;
  date: string;
  amount: number;
  method: string;
  referenceNo?: string;
  notes?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoice_number?: string;
  date: string;
  dueDate?: string;
  due_date?: string;
  fabricId?: string | null;
  fabric_id?: string | null;
  fabricType?: string;
  fabric_type?: string;
  fabricColor?: string;
  fabric_color?: string;
  supplierId?: string | null;
  supplier_id?: string | null;
  supplierName?: string;
  supplier_name?: string;
  clientName: string;
  client_name?: string;
  clientCompany?: string;
  client_company?: string;
  clientPhone?: string;
  client_phone?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  taxPercent?: number;
  tax_percent?: number;
  taxAmount?: number;
  tax_amount?: number;
  totalAmount: number;
  total_amount?: number;
  paidAmount: number;
  paid_amount?: number;
  pendingAmount: number;
  pending_amount?: number;
  status: 'Unpaid' | 'Partial' | 'Paid';
  paymentHistory?: InvoicePaymentRecord[];
  payment_history?: InvoicePaymentRecord[];
  notes?: string;
  user_id?: string | null;
  created_at?: string;
  createdAt?: string;
}

export interface Expense {
  id: string;
  expenseType: string;
  expense_type?: string;
  category?: string;
  amount: number;
  date: string;
  month?: string;
  paymentMethod: string;
  payment_method?: string;
  paidTo?: string;
  paid_to?: string;
  workerId?: string | null;
  worker_id?: string | null;
  workerName?: string;
  worker_name?: string;
  machineId?: string | null;
  machine_id?: string | null;
  machineCode?: string;
  machine_code?: string;
  fabricId?: string | null;
  fabric_id?: string | null;
  referenceNo?: string;
  reference_no?: string;
  notes?: string;
  user_id?: string | null;
  created_at?: string;
  createdAt?: string;
}

export interface InvoiceExpenseJunction {
  id: string;
  invoiceId: string;
  invoice_id?: string;
  expenseId?: string | null;
  expense_id?: string | null;
  fabricId?: string | null;
  fabric_id?: string | null;
  costType: 'direct_fabric_material' | 'tailor_stitching_labor' | 'cutting_master_labor' | 'thread_trimming_labor' | string;
  cost_type?: string;
  allocatedAmount: number;
  allocated_amount?: number;
  notes?: string;
  user_id?: string | null;
}

// -------------------------------------------------------------
// 7. FACTORY WORKERS & ASSETS
// -------------------------------------------------------------

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  company?: string;
  address?: string;
  notes?: string;
  user_id?: string | null;
}

export interface CuttingMaster {
  id: string;
  name: string;
  phone?: string;
  role: 'Master';
  specialization?: string;
  experience?: string;
  status: 'Active' | 'Inactive' | 'Left';
  password?: string;
  user_id?: string | null;
}

export interface Tailor {
  id: string;
  name: string;
  phone?: string;
  role: 'Tailor';
  assignedMachineId?: string | null;
  assignedMachineCode?: string;
  status: 'Active' | 'Inactive' | 'Left';
  password?: string;
  user_id?: string | null;
}

export interface Machine {
  id: string;
  code: string;
  name: string;
  type?: string;
  status: 'Active' | 'Under Maintenance' | 'Inactive';
  assignedTailorId?: string | null;
  assignedTailorName?: string;
  notes?: string;
  user_id?: string | null;
}

export interface Helper {
  id: string;
  name: string;
  phone?: string;
  role: 'Helper';
  masterId?: string | null;
  status: 'Active' | 'Inactive' | 'Left';
  notes?: string;
  user_id?: string | null;
}
