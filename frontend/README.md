# Fabric Manager — Frontend Architecture & Examination Guide

> **College Project: Frontend Engineering Component**  
> **Team Division**: 2 Students (Student 1: Nandni — UI/UX & Modals, Student 2: Tisha — State & Portals)

---

## 1. System Overview

The Fabric Manager Frontend is a high-performance React 19 Single Page Application (SPA) compiled with Vite & Rolldown, styled using TailwindCSS v4, with Progressive Web App (PWA) offline precaching.

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

## 2. Student Responsibility Breakdown

### Student 1 (Nandni): Lead Frontend Interface & Presentation Engineer
- **Core Files & Modules**:
  - Global Navigation & Shell: [`src/components/layout/Navbar.jsx`](file:///d:/Fabric%20Manager/frontend/src/components/layout/Navbar.jsx), [`Sidebar.jsx`](file:///d:/Fabric%20Manager/frontend/src/components/layout/Sidebar.jsx), [`ThemeToggle.jsx`](file:///d:/Fabric%20Manager/frontend/src/components/layout/ThemeToggle.jsx).
  - Main Business Pages: [`src/pages/Home.jsx`](file:///d:/Fabric%20Manager/frontend/src/pages/Home.jsx), [`Setup.jsx`](file:///d:/Fabric%20Manager/frontend/src/pages/Setup.jsx), [`Transactions.jsx`](file:///d:/Fabric%20Manager/frontend/src/pages/Transactions.jsx), [`Orders.jsx`](file:///d:/Fabric%20Manager/frontend/src/pages/Orders.jsx).
  - 18 Interactive Modals:
    - Cutting: [`RecordCuttingModal.jsx`](file:///d:/Fabric%20Manager/frontend/src/components/modals/RecordCuttingModal.jsx), [`SetProductStructureModal.jsx`](file:///d:/Fabric%20Manager/frontend/src/components/modals/SetProductStructureModal.jsx).
    - Stitching: [`AssignTailorModal.jsx`](file:///d:/Fabric%20Manager/frontend/src/components/modals/AssignTailorModal.jsx), [`ReviewAcceptWorkModal.jsx`](file:///d:/Fabric%20Manager/frontend/src/components/modals/ReviewAcceptWorkModal.jsx).
    - Invoicing: [`AddInvoiceModal.jsx`](file:///d:/Fabric%20Manager/frontend/src/components/modals/AddInvoiceModal.jsx), [`InvoiceDetailsModal.jsx`](file:///d:/Fabric%20Manager/frontend/src/components/modals/InvoiceDetailsModal.jsx).
    - Inventory: [`AddFabricModal.jsx`](file:///d:/Fabric%20Manager/frontend/src/components/modals/AddFabricModal.jsx), [`DeliverToSupplierModal.jsx`](file:///d:/Fabric%20Manager/frontend/src/components/modals/DeliverToSupplierModal.jsx).
  - PDF & Print Engine: [`src/utils/pdfExport.js`](file:///d:/Fabric%20Manager/frontend/src/utils/pdfExport.js), [`ThermalReceipt.jsx`](file:///d:/Fabric%20Manager/frontend/src/components/common/ThermalReceipt.jsx).

### Student 2 (Tisha): Frontend Systems & Client Application Architect
- **Core Files & Modules**:
  - State Architecture: [`src/context/ManagementContext.jsx`](file:///d:/Fabric%20Manager/frontend/src/context/ManagementContext.jsx), [`useFactoryOperations.js`](file:///d:/Fabric%20Manager/frontend/src/context/domain/useFactoryOperations.js), [`useFinancials.js`](file:///d:/Fabric%20Manager/frontend/src/context/domain/useFinancials.js), [`useFactorySetup.js`](file:///d:/Fabric%20Manager/frontend/src/context/domain/useFactorySetup.js).
  - Mobile Floor Portals:
    - Master Portal: [`src/pages/MasterPortal.jsx`](file:///d:/Fabric%20Manager/frontend/src/pages/MasterPortal.jsx) (Pattern cut logs & handovers).
    - Tailor Portal: [`src/pages/TailorPortal.jsx`](file:///d:/Fabric%20Manager/frontend/src/pages/TailorPortal.jsx) (Piece rate acceptance, daily completed piece logs).
  - Validation Engine: [`src/utils/schemaValidators.js`](file:///d:/Fabric%20Manager/frontend/src/utils/schemaValidators.js), [`src/utils/formValidation.js`](file:///d:/Fabric%20Manager/frontend/src/utils/formValidation.js).
  - WebSocket Synchronisation: [`src/context/domain/useRealtimeSyncListener.js`](file:///d:/Fabric%20Manager/frontend/src/context/domain/useRealtimeSyncListener.js).
  - PWA Offline Support: Service worker precaching (`vite-plugin-pwa`).

---

## 3. How to Run the Frontend Application

```bash
# Start Frontend Vite Dev Server
npm run dev

# Running on:
# http://localhost:3000
```

---

## 4. Frontend Viva Questions & Model Answers

### Questions for Student 1 (Nandni - UI/UX & Modals):
1. **Q: Why did you choose TailwindCSS v4 with `@tailwindcss/vite`?**
   - **Answer**: Tailwind v4 utilizes the lightning-fast Oxide engine that compiles CSS in milliseconds with zero runtime footprint. Utility classes ensure a coherent design system with glassmorphism and responsive breakpoints without writing thousands of lines of ad-hoc CSS.
2. **Q: How does the client render high-resolution PDF invoices without a backend graphics engine?**
   - **Answer**: We use `html2canvas-pro` to rasterize clean DOM invoice templates into vector canvases and `jspdf` to generate multi-page PDF documents locally in the browser, saving server compute and ensuring immediate downloads.

### Questions for Student 2 (Tisha - State & Portals):
1. **Q: How do you prevent unnecessary re-renders in a complex manufacturing dashboard?**
   - **Answer**: We partition domain state into isolated custom hooks (`useFactorySetup`, `useFactoryOperations`, `useFinancials`). A state change in cutting lots only triggers re-renders in production components, without re-rendering unrelated financial or machinery tables.
2. **Q: How does the Tailor Portal handle realtime updates when the master assigns a new job?**
   - **Answer**: We subscribe to Supabase PostgreSQL changes via WebSockets in `useRealtimeSyncListener.js`. When a new row is inserted into `tailor_assignments`, the tailor's mobile dashboard updates instantly without needing manual page refreshes.
