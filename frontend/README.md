# Fabric Manager — Frontend Architecture & Technical Guide

A high-performance React 19 Single Page Application (SPA) compiled with Vite & Rolldown, styled using TailwindCSS v4, with Progressive Web App (PWA) offline precaching and Supabase Realtime synchronization.

---

## 1. System Overview

The Fabric Manager Frontend is designed for responsive, low-latency floor operations in textile and garment manufacturing units. It provides responsive views for desktop administration and mobile-optimized interfaces for workshop floor personnel.

```
                           ┌────────────────────────────────────────┐
                           │          REACT 19 SPA CLIENT           │
                           │   Vite + Rolldown + TailwindCSS v4     │
                           └───────────────────┬────────────────────┘
                                               │
                        ┌──────────────────────┴──────────────────────┐
                        ▼                                             ▼
          ┌───────────────────────────┐                 ┌───────────────────────────┐
          │   ADMIN DESKTOP VIEWS     │                 │   MOBILE FLOOR PORTALS    │
          │  Home, Orders, Invoices,  │                 │   MasterPortal.jsx        │
          │  Transactions, Setup      │                 │   TailorPortal.jsx        │
          └─────────────┬─────────────┘                 └─────────────┬─────────────┘
                        │                                             │
                        └──────────────────────┬──────────────────────┘
                                               │
                                               ▼
                              ┌─────────────────────────────────┐
                              │      DOMAIN CONTEXT ENGINE      │
                              │   ManagementContext.jsx         │
                              │   useFactoryOperations.js       │
                              │   useFinancials.js              │
                              │   useRealtimeSyncListener.js    │
                              └─────────────────────────────────┘
```

---

## 2. Architecture & Module Breakdown

### User Interface & Presentation Layer
- **Global Navigation & Layout**:
  - [`src/components/layout/Navbar.jsx`](file:///d:/Fabric%20Manager/frontend/src/components/layout/Navbar.jsx) — Top navigation bar with active tenant profile and quick actions.
  - [`src/components/layout/Sidebar.jsx`](file:///d:/Fabric%20Manager/frontend/src/components/layout/Sidebar.jsx) — Desktop navigation drawer with collapsible links.
  - [`src/components/layout/ThemeToggle.jsx`](file:///d:/Fabric%20Manager/frontend/src/components/layout/ThemeToggle.jsx) — Dark/Light theme switching with persisted preferences.
- **Core Business Pages**:
  - [`src/pages/Home.jsx`](file:///d:/Fabric%20Manager/frontend/src/pages/Home.jsx) — Admin overview, active running lots, real-time floor pulse, and activity feeds.
  - [`src/pages/Inventory.jsx`](file:///d:/Fabric%20Manager/frontend/src/pages/Inventory.jsx) — Inward fabric lots, roll meters, stock valuation, and supplier tracking.
  - [`src/pages/Orders.jsx`](file:///d:/Fabric%20Manager/frontend/src/pages/Orders.jsx) — Cutting orders, pattern breakdowns, and fabric consumption.
  - [`src/pages/Invoices.jsx`](file:///d:/Fabric%20Manager/frontend/src/pages/Invoices.jsx) — Commercial invoices, payment receipts, and balance ledgers.
  - [`src/pages/Transactions.jsx`](file:///d:/Fabric%20Manager/frontend/src/pages/Transactions.jsx) — Factory operating expenses, machine maintenance, and vendor payments.
  - [`src/pages/Setup.jsx`](file:///d:/Fabric%20Manager/frontend/src/pages/Setup.jsx) — Master catalog configuration (machines, tailors, cutting masters, suppliers).
- **Interactive Modals (18 Specialized Modals)**:
  - *Cutting*: [`RecordCuttingModal.jsx`](file:///d:/Fabric%20Manager/frontend/src/components/modals/RecordCuttingModal.jsx), [`SetProductStructureModal.jsx`](file:///d:/Fabric%20Manager/frontend/src/components/modals/SetProductStructureModal.jsx).
  - *Stitching*: [`AssignTailorModal.jsx`](file:///d:/Fabric%20Manager/frontend/src/components/modals/AssignTailorModal.jsx), [`ReviewAcceptWorkModal.jsx`](file:///d:/Fabric%20Manager/frontend/src/components/modals/ReviewAcceptWorkModal.jsx).
  - *Invoicing & Finance*: [`AddInvoiceModal.jsx`](file:///d:/Fabric%20Manager/frontend/src/components/modals/AddInvoiceModal.jsx), [`InvoiceDetailsModal.jsx`](file:///d:/Fabric%20Manager/frontend/src/components/modals/InvoiceDetailsModal.jsx), [`AddExpenseModal.jsx`](file:///d:/Fabric%20Manager/frontend/src/components/modals/AddExpenseModal.jsx).
  - *Inventory & Floor*: [`AddFabricModal.jsx`](file:///d:/Fabric%20Manager/frontend/src/components/modals/AddFabricModal.jsx), [`DeliverToSupplierModal.jsx`](file:///d:/Fabric%20Manager/frontend/src/components/modals/DeliverToSupplierModal.jsx), [`AssignFabricMasterModal.jsx`](file:///d:/Fabric%20Manager/frontend/src/components/modals/AssignFabricMasterModal.jsx).
- **Print & PDF Engine**:
  - [`src/utils/pdfExport.js`](file:///d:/Fabric%20Manager/frontend/src/utils/pdfExport.js) — Local client-side PDF document generation.
  - [`src/components/common/ThermalReceipt.jsx`](file:///d:/Fabric%20Manager/frontend/src/components/common/ThermalReceipt.jsx) — 80mm thermal receipt generator for POS and floor challans.

### Systems, State & Multi-Role Portals
- **Domain State Architecture**:
  - Context Provider: [`src/context/ManagementContext.jsx`](file:///d:/Fabric%20Manager/frontend/src/context/ManagementContext.jsx).
  - Domain Modules: [`useFactoryOperations.js`](file:///d:/Fabric%20Manager/frontend/src/context/domain/useFactoryOperations.js), [`useFinancials.js`](file:///d:/Fabric%20Manager/frontend/src/context/domain/useFinancials.js), [`useFactorySetup.js`](file:///d:/Fabric%20Manager/frontend/src/context/domain/useFactorySetup.js), [`useDeliveryOps.js`](file:///d:/Fabric%20Manager/frontend/src/context/domain/production/useDeliveryOps.js).
- **Mobile Floor Portals**:
  - **Master Portal**: [`src/pages/MasterPortal.jsx`](file:///d:/Fabric%20Manager/frontend/src/pages/MasterPortal.jsx) (Pattern cut logs, piece allocations, and floor handovers).
  - **Tailor Portal**: [`src/pages/TailorPortal.jsx`](file:///d:/Fabric%20Manager/frontend/src/pages/TailorPortal.jsx) (PIN login, job acceptance, piece rates, daily completed submissions).
- **Data Validation & Business Rules**:
  - [`src/utils/schemaValidators.js`](file:///d:/Fabric%20Manager/frontend/src/utils/schemaValidators.js) — Strict schema boundary checks.
  - [`src/utils/formValidation.js`](file:///d:/Fabric%20Manager/frontend/src/utils/formValidation.js) — Real-time interactive field validation.
- **Realtime WebSocket Synchronization**:
  - [`src/context/domain/useRealtimeSyncListener.js`](file:///d:/Fabric%20Manager/frontend/src/context/domain/useRealtimeSyncListener.js) — Subscribes to PostgreSQL database change events for instant multi-device synchrony.
- **Progressive Web App (PWA)**:
  - Configured with `vite-plugin-pwa` for offline asset precaching, installable mobile application support, and instant reloads.

---

## 3. Running the Frontend

```bash
# Start Vite Development Server
npm run dev

# The frontend runs on:
# http://localhost:3000
```

---

## 4. Technical Architecture FAQ

1. **Why TailwindCSS v4 with `@tailwindcss/vite`?**
   - Tailwind v4 uses the high-performance Oxide engine that compiles CSS in milliseconds with minimal runtime footprint. Utility classes ensure a coherent design system with glassmorphism, mobile drawer layouts, and responsive breakpoints.

2. **How does the client render high-resolution PDF invoices without backend graphics dependencies?**
   - We utilize `html2canvas-pro` to rasterize DOM invoice templates into vector canvases and `jspdf` to compile multi-page PDF documents directly in the browser, eliminating server compute overhead and delivering immediate downloads.

3. **How are unnecessary re-renders avoided across complex manufacturing views?**
   - The application partitions domain state into isolated custom hooks (`useFactorySetup`, `useFabrics`, `useProduction`, `useFinance`). A state change in cutting lots only re-renders components subscribed to production, without touching unrelated financial or machine catalog tables.

4. **How does the Tailor Portal handle real-time assignment alerts?**
   - The client subscribes to Supabase PostgreSQL changes via WebSockets in `useRealtimeSyncListener.js`. When a supervisor dispatches a new assignment row, the tailor's mobile interface updates instantly without requiring manual page refreshes.
