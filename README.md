# Fabric Manager

A modern, mobile-first Enterprise Resource Planning (ERP) and factory floor telemetry system built for textile and apparel manufacturers, garment job-work units, and administrative teams.

---

## 1. Project Overview

Small-to-medium apparel manufacturing factories often struggle with paper job-slips, disputed tailor piece rates, untracked cutting waste, and disconnected client billing. **Fabric Manager** digitizes the entire production lifecycle from raw fabric roll inwards to client invoice delivery in a unified, real-time platform.

```
                           ┌────────────────────────────────────────┐
                           │          REACT 19 SPA CLIENT           │
                           │   Vite 8 + TailwindCSS v4 + PWA        │
                           └───────────────────┬────────────────────┘
                                               │
                        ┌──────────────────────┴──────────────────────┐
                        ▼                                             ▼
          ┌───────────────────────────┐                 ┌───────────────────────────┐
          │    ADMIN WEB DASHBOARD    │                 │   MOBILE FLOOR PORTALS    │
          │  Home, Orders, Inventory, │                 │   Cutting Master Portal   │
          │  Invoices, Transactions   │                 │   Stitching Tailor Portal │
          └─────────────┬─────────────┘                 └─────────────┬─────────────┘
                        │                                             │
                        └──────────────────────┬──────────────────────┘
                                               │
                        ┌──────────────────────┴──────────────────────┐
                        ▼                                             ▼
          ┌───────────────────────────┐                 ┌───────────────────────────┐
          │    EXPRESS REST API       │                 │  SUPABASE POSTGREST / WS  │
          │  Port 5000 / Auth / Mail  │                 │  Realtime Subscriptions   │
          └─────────────┬─────────────┘                 └─────────────┬─────────────┘
                        │                                             │
                        └──────────────────────┬──────────────────────┘
                                               │
                                               ▼
                              ┌─────────────────────────────────┐
                              │     POSTGRESQL 17 DATABASE      │
                              │   16 Normalized Tables          │
                              │   Row Level Security (RLS)      │
                              │   Atomic Stored Procedures      │
                              └─────────────────────────────────┘
```

---

## 2. Key Capabilities

### The 5-Step Manufacturing Pipeline
1. **Fabric Inward & Roll Stock**: Log incoming fabric rolls with meters, weight, expected sets, and supplier details. Real-time valuation and inventory stock tracking.
2. **Master Custody & Table Cutting**: Assign fabric to Cutting Masters, set custom multi-part garment patterns (e.g., Top, Bottom, Dupatta), and record cut piece batches with scrap loss telemetry.
3. **Tailor Stitching & Floor Verification**: Allocate subparts to machine operators with customizable piece rates. Stitchers submit daily completed work via their mobile portal for admin approval.
4. **Master Handover & Thread Trimming**: Handovers are counted and verified by floor supervisors. Configurable thread trimming steps allow flexible assignment or skipping depending on garment quality needs.
5. **Final Delivery & Invoicing**: Automatic calculation of completed ready garment sets. Delivered goods generate commercial GST invoices, payment challans, and instant WhatsApp dispatch notices.

### Multi-Role Dedicated Floor Portals
- **Admin Management Portal**: Floor pulse telemetry, active running lot cards, financial statements, supplier directories, and factory machinery configuration.
- **Cutting Master Portal**: Touch-friendly interface for floor supervisors to view fabric inwards, record pattern cutting batches, and verify piece handovers.
- **Tailor Stitching Portal**: PIN-protected mobile screen for stitchers to accept jobs, track accumulated wages, and submit daily completed piece counts.

### Accounting, Billing & Document Generation
- **Automated Client Billing**: Convert delivered fabric batches directly into professional invoices with customizable rates and GST calculations.
- **Client-Side PDF Engine**: Browser-based vector PDF generation via `html2canvas-pro` and `jspdf` without requiring server-side rendering binaries.
- **80mm Thermal Receipts**: Generate compact thermal print slips for physical job work and dispatch packaging.
- **WhatsApp Direct Sharing**: One-tap preformatted WhatsApp status notifications for suppliers and factory floor teams.

### Enterprise Security & Architecture
- **PBKDF2 Password Hashing**: Passwords hashed using `100,000` iterations of HMAC-SHA256 with 16-byte cryptographically secure random salts.
- **Multi-Tenant Row Level Security (RLS)**: PostgreSQL kernel-level RLS policies isolate all tenant data by `user_id`.
- **OTP Password Recovery**: Cryptographically random 6-digit OTP delivery via Nodemailer with Gmail SMTP and a developer simulation fallback.
- **Offline PWA Support**: Service worker precaching powered by `vite-plugin-pwa` allows workers to view assigned work during floor network drops.

---

## 3. Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | React 19, React Router v7 |
| **Styling & Icons** | Tailwind CSS v4 (`@tailwindcss/vite`), Lucide React |
| **Build Tooling & PWA** | Vite 8, `vite-plugin-pwa` (Workbox) |
| **Document Export** | `jspdf`, `html2canvas-pro` |
| **Backend & API** | Node.js, Express 5, `nodemailer`, `cors` |
| **Database & Realtime** | PostgreSQL 17, Supabase JS Client, WebSockets |
| **Testing & Quality** | Vitest, Testing Library, Oxlint, TypeScript strict mode |

---

## 4. Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or pnpm
- A Supabase PostgreSQL instance (or local PostgreSQL 17 database)

### Environment Configuration

Create a `.env` file in the project root:

```env
# Frontend Supabase Credentials
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Direct Database Access (for CLI migration tools)
SUPABASE_DB_PASSWORD=your-postgres-password
DATABASE_URL=postgresql://postgres:password@localhost:5432/fabric_manager

# Backend Server Configuration
PORT=5000
NODE_ENV=development

# Email OTP Service (Optional - dev simulation mode used if omitted)
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-google-app-password
```

### Installation

```bash
# Clone the repository
git clone https://github.com/jasminbutani7/Fabric-Manager-Project.git
cd Fabric-Manager-Project

# Install all dependencies
npm install
```

### Database Initialization

```bash
# Verify database connection and tables
npm run db:check

# Run schema migrations to create all 16 normalized tables and RLS policies
npm run db:migrate
```

### Starting Development Servers

```bash
# Terminal 1: Start Backend REST API Server (Port 5000)
npm run server:dev

# Terminal 2: Start Frontend Vite Server (Port 3000)
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## 5. Available Scripts

| Command | Action |
|---|---|
| `npm run dev` | Starts the Vite frontend development server on port 3000 |
| `npm run server:dev` | Starts the Express REST API development server on port 5000 |
| `npm run build` | Compiles the production bundle with Vite and generates PWA service workers |
| `npm run preview` | Runs a local web server to preview the production build |
| `npm run lint` | Runs high-speed static code analysis using Oxlint |
| `npm run typecheck` | Validates TypeScript types across the frontend codebase |
| `npm test` | Executes the unit and integration test suite with Vitest |
| `npm run check:all` | Runs linting, typechecking, tests, and production build in sequence |
| `npm run db:check` | Probes PostgreSQL connectivity and schema integrity |
| `npm run db:migrate` | Applies table schemas and security policies |
| `npm run db:backup` | Generates a timestamped JSON backup of all factory database records |

---

## 6. Project Directory Structure

```
Fabric-Manager/
├── backend/                        # Express 5 REST API & Security Engine
│   ├── config/                     # PBKDF2 cryptography & security configurations
│   ├── controllers/                # Auth, Inventory, Production & Finance endpoints
│   ├── database/                   # PostgreSQL DDL, RLS policies & stored procedures
│   ├── middleware/                 # Request authentication & tenant validation
│   ├── services/                   # Nodemailer SMTP email service
│   ├── server.cjs                  # Main Express application entrypoint
│   └── README.md                   # Backend architecture guide
│
├── frontend/                       # React 19 Single Page Application
│   ├── public/                     # Icons, robots.txt, sitemap.xml & manifest
│   ├── src/
│   │   ├── components/             # Reusable UI components & 18 domain modals
│   │   │   ├── common/             # AlertModal, ConfirmModal, ThermalReceipt
│   │   │   ├── fabric/             # FabricLotCard, FabricLotHeader
│   │   │   ├── layout/             # Navbar, Sidebar, ThemeToggle
│   │   │   └── modals/             # Cutting, Stitching, Invoicing modals
│   │   ├── context/                # Multi-domain state engine & real-time sync
│   │   ├── pages/                  # Home, Inventory, Orders, Invoices, Portals
│   │   └── utils/                  # Product, cutting, delivery & PDF export utilities
│   ├── tests/                      # 151 Vitest unit & integration test specs
│   └── README.md                   # Frontend architecture guide
│
├── scripts/                        # Database management & migration utilities
│   ├── db-check.cjs                # Connection diagnostic script
│   ├── db-migrate.cjs              # Schema deployment script
│   └── db-backup.cjs               # Data export utility
│
├── package.json                    # Project dependencies and script definitions
├── vercel.json                     # Production routing and header configuration
└── README.md                       # Main project documentation
```

---

## 7. Quality Assurance & Testing

All major business flows — including OTP password recovery, atomic cutting transactions, multi-part garment delivery checks, and role portal authentications — are verified by automated tests:

```bash
# Run all automated tests
npm test

# Expected Output:
# Test Files  17 passed (17)
# Tests       151 passed (151)
```

To run complete verification before deployment:
```bash
npm run check:all
```

---

## 8. License

This project is open-source and available under the [MIT License](LICENSE).
