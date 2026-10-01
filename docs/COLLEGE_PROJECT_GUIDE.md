# Fabric Manager — College Project Guide & Viva Defense Handbook

> **Project Title**: Fabric Manager — Cloud-Integrated ERP & Telemetry System for Garment Manufacturing  
> **Team Structure**: 4 Students (2 Frontend + 2 Backend)  
> **Technology Stack**: React 19, TailwindCSS v4, Vite, Node.js / Express, PostgreSQL 17, Supabase Realtime, PBKDF2 Cryptography.

---

## 1. Project Overview & Problem Statement

Small-to-medium apparel manufacturing units struggle with fragmented paper job slips, lost lot counts, disputed piece-rate wage calculations, and inaccurate fabric usage estimates.

**Fabric Manager** solves this by providing:
1. **Production Floor Telemetry**: Tracking cutting lots, fabric meterage, machine lines, and tailor piece work in real time.
2. **Multi-Role Portals**: Dedicated, simplified mobile portals for floor supervisors (Masters), stitchers (Tailors), and finishers (Helpers).
3. **Integrated Accounting & Invoicing**: Automatic linkage of fabric purchase expenses, piece-rate labour costs, challans, and client billing.

---

## 2. Team Division & Student Responsibilities (4 Students)

```
                            ┌────────────────────────────────────────┐
                            │        FABRIC MANAGER PROJECT          │
                            │           (College Project)            │
                            └───────────────────┬────────────────────┘
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 ▼                                                             ▼
    ┌──────────────────────────┐                                  ┌──────────────────────────┐
    │      FRONTEND TEAM       │                                  │       BACKEND TEAM       │
    │       (2 Students)       │                                  │       (2 Students)       │
    └────────────┬─────────────┘                                  └────────────┬─────────────┘
                 │                                                             │
         ┌───────┴───────┐                                             ┌───────┴───────┐
         ▼               ▼                                             ▼               ▼
   ┌───────────┐   ┌───────────┐                                 ┌───────────┐   ┌───────────┐
   │ STUDENT 1 │   │ STUDENT 2 │                                 │ STUDENT 3 │   │ STUDENT 4 │
   │  UI / UX  │   │ State /   │                                 │ Database  │   │ REST API  │
   │  & Views  │   │ Portals   │                                 │ & Schema  │   │ & Security│
   └───────────┘   └───────────┘                                 └───────────┘   └───────────┘
```

---

### STUDENT 1: Frontend UI/UX, Component Architecture & Modals
- **Role Title**: Lead Frontend Interface & Presentation Engineer
- **Core Modules**:
  - Global Navigation & Layouts: [`src/components/layout/Navbar.jsx`](file:///d:/Fabric%20Manager/src/components/layout/Navbar.jsx), `Sidebar.jsx`, `ThemeToggle.jsx`.
  - Core Dashboard Pages: [`src/pages/Home.jsx`](file:///d:/Fabric%20Manager/src/pages/Home.jsx), `Setup.jsx`, `Transactions.jsx`, `Orders.jsx`.
  - 18 Production Modals: [`src/components/modals/RecordCuttingModal.jsx`](file:///d:/Fabric%20Manager/src/components/modals/RecordCuttingModal.jsx), `AssignTailorModal.jsx`, `AddInvoiceModal.jsx`, `AddFabricModal.jsx`, `DeliverToSupplierModal.jsx`.
  - Print & PDF Engine: [`src/utils/pdfExport.js`](file:///d:/Fabric%20Manager/src/utils/pdfExport.js) (Challans, Invoices, Delivery Slips).
- **Viva Focus**: Component lifecycle, responsive layout design, accessible form controls, and client-side PDF document generation.

---

### STUDENT 2: Frontend State Management, Multi-Role Portals & Client Logic
- **Role Title**: Frontend Systems & Client Application Architect
- **Core Modules**:
  - Domain-Driven State Contexts: [`src/context/ManagementContext.jsx`](file:///d:/Fabric%20Manager/src/context/ManagementContext.jsx), [`src/context/domain/useFactoryOperations.js`](file:///d:/Fabric%20Manager/src/context/domain/useFactoryOperations.js), `useFinancials.js`, `useFactorySetup.js`.
  - Floor Worker Mobile Portals: [`src/pages/MasterPortal.jsx`](file:///d:/Fabric%20Manager/src/pages/MasterPortal.jsx) (Pattern cut logs), [`src/pages/TailorPortal.jsx`](file:///d:/Fabric%20Manager/src/pages/TailorPortal.jsx) (Piece rate acceptance & daily logs).
  - Validation Engine: [`src/utils/schemaValidators.js`](file:///d:/Fabric%20Manager/src/utils/schemaValidators.js), [`src/utils/formValidation.js`](file:///d:/Fabric%20Manager/src/utils/formValidation.js).
  - Realtime Sync Listener: [`src/context/domain/useRealtimeSyncListener.js`](file:///d:/Fabric%20Manager/src/context/domain/useRealtimeSyncListener.js).
  - PWA Offline Support: Service worker precaching (`vite-plugin-pwa`).
- **Viva Focus**: React Context vs Redux, custom hook domain partitioning, optimistic UI updates, and WebSocket event subscription.

---

### STUDENT 3: Database Engineering, PostgreSQL Architecture & RLS
- **Role Title**: Database Administrator & Relational Data Architect
- **Core Modules**:
  - Relational Schema (16 Tables): [`backend/database/schema.sql`](file:///d:/Fabric%20Manager/backend/database/schema.sql).
  - Primary Key Prefixing Convention: `mst_`, `mch_`, `tlr_`, `hlp_`, `fab_`, `cut_`, `asg_`, `hnd_`, `tca_`, `inv_`, `exp_`, `dlg_`.
  - Row Level Security (RLS) Multi-Tenant Policies: [`backend/database/rls_policies.sql`](file:///d:/Fabric%20Manager/backend/database/rls_policies.sql).
  - Performance B-Tree Indexing (`user_id`, `phone`, `status`, `invoice_number`).
  - Migration & Schema Integrity Scripts: `scripts/db-check.cjs`, `scripts/db-migrate.cjs`.
- **Viva Focus**: Relational normalization (3NF), foreign key cascading integrity, query index optimization, and database-level multi-tenancy.

---

### STUDENT 4: Backend REST API Server, Business Controllers & Security
- **Role Title**: Backend API Engineer & Security Specialist
- **Core Modules**:
  - Express.js REST API Server: [`backend/server.cjs`](file:///d:/Fabric%20Manager/backend/server.cjs).
  - Modular API Routes & Controllers:
    - Auth & Sessions: [`backend/routes/authRoutes.cjs`](file:///d:/Fabric%20Manager/backend/routes/authRoutes.cjs), [`backend/controllers/authController.cjs`](file:///d:/Fabric%20Manager/backend/controllers/authController.cjs).
    - Production & Floor Jobs: [`backend/routes/productionRoutes.cjs`](file:///d:/Fabric%20Manager/backend/routes/productionRoutes.cjs), [`backend/controllers/productionController.cjs`](file:///d:/Fabric%20Manager/backend/controllers/productionController.cjs).
    - Inventory: [`backend/routes/inventoryRoutes.cjs`](file:///d:/Fabric%20Manager/backend/routes/inventoryRoutes.cjs).
    - Finance & Invoices: [`backend/routes/financeRoutes.cjs`](file:///d:/Fabric%20Manager/backend/routes/financeRoutes.cjs).
  - Cryptographic Authentication: [`backend/config/security.cjs`](file:///d:/Fabric%20Manager/backend/config/security.cjs) (PBKDF2 with 100,000 iterations, random salts, timing-safe checks).
  - Atomic Stored Procedures: [`backend/database/stored_procedures.sql`](file:///d:/Fabric%20Manager/backend/database/stored_procedures.sql) (`rpc_record_cutting_batch`, `verify_worker_pin`).
- **Viva Focus**: REST API design principles, ACID transactions via stored procedures, cryptographic defense against timing attacks, and password salting.

---

## 3. How to Run the Entire Project

### Terminal 1: Run the Backend API Server
```bash
npm run server:dev
# Running on http://localhost:5000
# Health check: http://localhost:5000/api/health
```

### Terminal 2: Run the Frontend Application
```bash
npm run dev
# Running on http://localhost:3000
```

---

## 4. Viva Examination Questions & Answers (By Student)

### Student 1 (Frontend UI/UX)
- **Q1: Why did you use React 19 and TailwindCSS instead of traditional CSS or component libraries like MUI?**
  - **A**: TailwindCSS generates minimal utility CSS at build time with zero runtime overhead. React 19 provides enhanced hydration and rendering performance. Custom Tailwind modals give us complete control over high-density factory floor layouts.
- **Q2: How does the application generate PDF invoices without sending data to an external server?**
  - **A**: We utilize `jspdf` and `html2canvas-pro` locally on the client. It renders the invoice DOM into a vector-accurate canvas and chunks long multi-page invoices dynamically, keeping proprietary financial data strictly on the client device.

### Student 2 (Frontend State & Portals)
- **Q1: Why did you partition your state into multiple custom domain hooks instead of one massive context?**
  - **A**: A single massive context causes unnecessary re-renders across unrelated components whenever any state updates. Partitioning into `useFactorySetup`, `useFactoryOperations`, and `useFinancials` isolates re-renders and adheres to Single Responsibility principles.
- **Q2: How does the Tailor Portal work for non-technical workers on mobile?**
  - **A**: Tailors simply enter their 10-digit mobile number and 4-digit PIN. The UI displays large, touch-friendly piece-work cards, shows rate per piece, and allows one-tap daily piece count submission without complicated menus.

### Student 3 (Database Architecture & RLS)
- **Q1: What are the advantages of prefixed keys like `cut_172...` over standard sequential integers?**
  - **A**: 1) Prevents enumeration attacks where competitors guess record IDs. 2) Uniquely identifies the table type across global logs. 3) Allows client-side optimistic ID generation before the server responds.
- **Q2: What is Row Level Security (RLS) and why is it superior to application-level `WHERE` clauses?**
  - **A**: Application-level `WHERE` clauses depend on every developer remembering to add `WHERE user_id = ...`. If a single query forgets it, data leaks. RLS is enforced by the PostgreSQL kernel itself for all operations.

### Student 4 (Backend API & Security)
- **Q1: What is PBKDF2 and why did you choose it over plain SHA-256?**
  - **A**: SHA-256 is designed to be fast, which allows attackers to calculate billions of guesses per second with GPUs. PBKDF2 forces 100,000 recursive HMAC-SHA256 iterations with unique cryptographic salts, making dictionary attacks mathematically infeasible.
- **Q2: What is the purpose of `rpc_record_cutting_batch`?**
  - **A**: When a master cuts a fabric roll, two things must happen: the fabric roll record updates its consumed meterage, and new cutting piece rows are created. By executing this in a single PostgreSQL function (`plpgsql`), we guarantee atomic ACID rollback if any failure occurs.
