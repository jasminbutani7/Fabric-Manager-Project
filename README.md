# Fabric Manager

A mobile-first, real-time Textile & Fabric Management ERP web application built for textile manufacturers, traders, and administrative teams.

---

## Features

- **Master Management**: Configure parties (suppliers/buyers), fabric qualities, processes (dyeing, printing, etc.), gray fabric pieces, and internal/external job workers.
- **Inward Operations**: Track gray fabric inward purchases, process returns, and finished fabric lots with meters, weight, and rate calculations.
- **Process Lifecycle Tracking**: Assign fabric rolls to dyeing/printing mills, monitor in-flight goods, and record inward processing receipts.
- **Cutting & Production**: Convert finished fabric rolls into garment production pieces, auto-calculating average consumption and remnant scraps.
- **Stock & Inventory Valuation**: Real-time roll-level and meter-level stock summaries with automatic inventory valuation.
- **Ledgers & Audit Trail**: Chronological activity ledgers tracking every roll dispatch, receipt, and cutting operation.
- **Supabase Realtime Sync**: Instant multi-device updates across all active admin and factory floor sessions.

---

## Tech Stack

- **Frontend**: React 19, React Router v7
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`), Lucide Icons
- **Backend & Database**: Supabase (PostgreSQL with Row Level Security & Realtime subscriptions)
- **Tooling & Bundler**: Vite 8, Oxlint

---

## Getting Started

### 1. Prerequisites

- Node.js (v18 or higher recommended)
- npm or pnpm
- A Supabase project

### 2. Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Configure your credentials in `.env`:

```env
# Frontend Supabase Client
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Direct PostgreSQL Access (For database scripts)
SUPABASE_DB_PASSWORD=your-database-password
```

### 3. Database Verification & Setup

Verify database connectivity and schema tables:

```bash
npm run db:check
```

If initializing tables on a new Supabase database, run the schema migration:

```bash
npm run db:migrate
```

### 4. Development Server

Start the local development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000` (or the port specified in terminal).

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Starts local Vite development server with HMR |
| `npm run build` | Compiles and bundles production assets into `dist/` |
| `npm run preview` | Serves the production build locally for verification |
| `npm run lint` | Fast static analysis and linting via Oxlint |
| `npm run db:check` | Verifies PostgreSQL tables and connectivity |
| `npm run db:migrate` | Runs database migrations |

---

## Production Deployment

1. Run static checks and build the project:
   ```bash
   npm run lint
   npm run build
   ```
2. The output in `dist/` is ready to be hosted on any static hosting platform (Vercel, Netlify, Cloudflare Pages, AWS S3 / CloudFront, etc.).
3. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your hosting provider's environment settings.
