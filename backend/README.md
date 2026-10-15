# Fabric Manager — Backend Architecture & Technical Guide

A secure, high-throughput Node.js / Express REST API and PostgreSQL backend designed for manufacturing floor telemetry, inventory logistics, atomic production cuts, and financial accounting for garment and textile factories.

---

## 1. System Overview

The Fabric Manager Backend coordinates high-frequency floor operations, cryptographic authentication, email OTP verification, and multi-tenant PostgreSQL storage with Row Level Security (RLS).

```
                           ┌────────────────────────────────────────┐
                           │            CLIENT REQUESTS             │
                           │   React 19 SPA / Floor Mobile Portals  │
                           └───────────────────┬────────────────────┘
                                               │
                        ┌──────────────────────┴──────────────────────┐
                        ▼                                             ▼
          ┌───────────────────────────┐                 ┌───────────────────────────┐
          │    EXPRESS.JS REST API    │                 │  SUPABASE POSTGREST / WS  │
          │    (Port 5000)            │                 │  Realtime Subscriptions   │
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

## 2. Core Components & Responsibilities

### Database Architecture & Multi-Tenancy
- **Normalized Schema**:
  - [`backend/database/schema.sql`](file:///d:/Fabric%20Manager/backend/database/schema.sql) — 16 relational tables with semantic ID prefixes (`mst_`, `mch_`, `tlr_`, `fab_`, `cut_`, `asg_`, `inv_`, `exp_`).
  - Table relationships enforce cascading foreign key constraints to prevent orphaned operational records.
  - B-tree indexing on tenant IDs (`user_id`), worker contact details (`phone`), and lifecycle statuses.
- **Row Level Security (RLS)**:
  - [`backend/database/rls_policies.sql`](file:///d:/Fabric%20Manager/backend/database/rls_policies.sql) — Enforces multi-tenant isolation directly inside PostgreSQL.
  - Ensures a business account can never view or modify another factory's production data, cutting rates, or financial records.
- **Atomic Stored Procedures**:
  - [`backend/database/stored_procedures.sql`](file:///d:/Fabric%20Manager/backend/database/stored_procedures.sql) — Stored functions (`rpc_record_cutting_batch`, `verify_worker_pin`) execute multi-table modifications inside ACID-compliant transactions.

### API Services, Cryptography & Security
- **Server Lifecycle**:
  - [`backend/server.cjs`](file:///d:/Fabric%20Manager/backend/server.cjs) — Express 5 server configuration, CORS policy, JSON body parsers, and telemetry health probes.
- **Cryptographic Authentication**:
  - [`backend/config/security.cjs`](file:///d:/Fabric%20Manager/backend/config/security.cjs) — PBKDF2 hashing (`100,000` HMAC-SHA256 iterations with 16-byte cryptographically secure random salts) and timing-safe equality verification (`crypto.timingSafeEqual`).
- **Authentication & Password Recovery**:
  - [`backend/controllers/authController.cjs`](file:///d:/Fabric%20Manager/backend/controllers/authController.cjs) — Admin signup/login, worker PIN authentication, and password reset flows.
  - Upgraded to `crypto.randomInt(100000, 1000000)` for unguessable 6-digit OTP generation with 10-minute validity.
- **Email Service**:
  - [`backend/services/emailService.cjs`](file:///d:/Fabric%20Manager/backend/services/emailService.cjs) — Automated delivery of branded HTML emails via Gmail SMTP (`smtp.gmail.com:465` SSL) with developer simulation fallback.

---

## 3. Running the Backend Server

```bash
# Start backend server in development mode
npm run server:dev

# Server will run on:
# http://localhost:5000
# Health check: http://localhost:5000/api/health
```

---

## 4. REST API Endpoint Reference

### Health & Telemetry
- `GET /api/health`: Server uptime, status, and PostgreSQL connectivity check.
- `GET /api/stats`: Live record counts across primary production tables.

### Authentication (`/api/auth`)
- `POST /api/auth/register`: Create a new business account with PBKDF2 encrypted password.
- `POST /api/auth/login`: Authenticate admin with mobile/email and password.
- `POST /api/auth/verify-pin`: Authenticate mobile workshop workers (Master, Tailor, Helper) using secure PIN.
- `POST /api/auth/forgot-password`: Generate cryptographically random 6-digit OTP and send branded HTML email via SMTP.
- `POST /api/auth/verify-otp`: Validate 6-digit OTP against expiration window (10 minutes).
- `POST /api/auth/reset-password`: Verify valid OTP session proof, hash new password via PBKDF2, and update database.

### Inventory (`/api/inventory`)
- `GET /api/inventory/fabrics?user_id={id}`: Fetch all active fabric lots.
- `POST /api/inventory/fabrics`: Create a new fabric inward roll with lot number and meterage.
- `GET /api/inventory/suppliers?user_id={id}`: Fetch supplier directory.
- `POST /api/inventory/suppliers`: Add vendor details and GST number.

### Production (`/api/production`)
- `GET /api/production/cuttings?user_id={id}`: Fetch cutting orders.
- `POST /api/production/cuttings`: Record a cutting batch.
- `GET /api/production/assignments?user_id={id}`: View tailor stitching allocations.
- `POST /api/production/assignments/submit`: Record daily piece submissions from stitching operators.

### Finance (`/api/finance`)
- `GET /api/finance/invoices?user_id={id}`: Fetch client invoices.
- `POST /api/finance/invoices`: Create client invoice.
- `GET /api/finance/expenses?user_id={id}`: Fetch factory expenses.
- `POST /api/finance/expenses`: Record an operating expense.
- `GET /api/finance/overview?user_id={id}`: Aggregate revenue, expenses, and net profit.

---

## 5. Technical Architecture FAQ

1. **Why use prefixed primary keys (e.g. `mst_...`, `fab_...`) instead of serial integers?**
   - Prefixed IDs immediately communicate the entity type across logs, APIs, and client caches. They also enable safe client-side optimistic ID generation without database roundtrips or collision hazards.

2. **How does Row Level Security (RLS) enforce multi-tenancy?**
   - RLS operates at the database kernel level. Every query automatically restricts records to the active tenant (`user_id`), ensuring complete tenant separation even if multiple factories operate within the same database instance.

3. **Why PBKDF2 over simple hashing algorithms?**
   - Fast hashing functions (MD5, SHA-1, standard SHA-256) are vulnerable to GPU-accelerated brute force and rainbow table lookups. PBKDF2 introduces 100,000 iterative key-stretching cycles with cryptographically unique salts, mitigating offline attacks.

4. **Why are cutting batches handled through atomic operations?**
   - A cutting order alters fabric roll meterage while simultaneously creating cutting sub-batch records. Running this inside an atomic PostgreSQL procedure ensures ACID compliance — either all records commit, or the transaction safely rolls back.
