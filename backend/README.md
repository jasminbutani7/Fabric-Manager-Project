# Fabric Manager — Backend Architecture & Examination Guide

> **College Project: Backend Engineering Component**  
> **Team Division**: 2 Students (Student 3: Database & RLS, Student 4: REST API & Security)

---

## 1. System Overview

The Fabric Manager Backend is designed to handle high-throughput manufacturing floor telemetry, inventory logistics, atomic production cuts, and financial balance sheets for textile and garment manufacturing units.

```
                           ┌────────────────────────────────────────┐
                           │            CLIENT REQUESTS             │
                           │   React 19 SPA / Floor Mobile Portals  │
                           └───────────────────┬────────────────────┘
                                               │
                        ┌──────────────────────┴──────────────────────┐
                        ▼                                             ▼
          ┌───────────────────────────┐                 ┌───────────────────────────┐
          │  EXPRESS.JS REST API      │                 │  SUPABASE POSTGREST / WS  │
          │  (Port 5000)              │                 │  Realtime Subscriptions   │
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

## 2. Student Responsibility Breakdown

### Student 3: Database Architect & PostgreSQL Engineer
- **Core Files**:
  - [`backend/database/schema.sql`](file:///d:/Fabric%20Manager/backend/database/schema.sql): 16 Relational Tables with primary key prefixes (`mst_`, `mch_`, `tlr_`, `fab_`, `cut_`, `asg_`, `inv_`, `exp_`).
  - [`backend/database/rls_policies.sql`](file:///d:/Fabric%20Manager/backend/database/rls_policies.sql): Multi-tenant Row Level Security policies.
  - Foreign key cascading constraints ensuring database integrity when deleting master accounts.
  - B-tree indexing on tenant IDs (`user_id`), worker phones (`phone`), and production statuses.
  - Supabase Realtime publication setup (`ALTER PUBLICATION supabase_realtime ADD TABLE ...`).

### Student 4: API Services, Cryptography & Backend Logic
- **Core Files**:
  - [`backend/server.cjs`](file:///d:/Fabric%20Manager/backend/server.cjs): Express server lifecycle, CORS, request telemetry.
  - [`backend/config/security.cjs`](file:///d:/Fabric%20Manager/backend/config/security.cjs): PBKDF2 cryptographic hashing (`100,000` iterations, 16-byte random salts), timing-safe equal verification.
  - [`backend/controllers/`](file:///d:/Fabric%20Manager/backend/controllers/): Business logic for Auth, Inventory, Production, and Finance.
  - [`backend/database/stored_procedures.sql`](file:///d:/Fabric%20Manager/backend/database/stored_procedures.sql): Atomic transaction RPCs (`rpc_record_cutting_batch`, `verify_worker_pin`).

---

## 3. How to Run the Backend Server

```bash
# 1. Start the Backend API Server (Development mode)
npm run server:dev

# Server will run on:
# http://localhost:5000
# Health check: http://localhost:5000/api/health
```

---

## 4. REST API Endpoint Reference

### Health & Telemetry
- `GET /api/health`: Returns server status, uptime, and PostgreSQL connection status.
- `GET /api/stats`: Returns live record counts across primary production tables.

### Authentication (`/api/auth`)
- `POST /api/auth/register`: Create a new business admin with PBKDF2 encrypted password.
- `POST /api/auth/login`: Authenticate admin with mobile and password.
- `POST /api/auth/verify-pin`: Authenticate mobile floor workers (Master, Tailor, Helper) using PIN.
- `POST /api/auth/forgot-password`: Validate admin email, generate cryptographically random 6-digit OTP, send branded HTML email via Gmail SMTP (or simulated fallback in dev).
- `POST /api/auth/verify-otp`: Validate 6-digit OTP against expiration window (10 minutes).
- `POST /api/auth/reset-password`: Verify valid OTP session proof, hash new password via PBKDF2, and update PostgreSQL database.

### Email Service (`backend/services/emailService.cjs`)
- **Transport**: `nodemailer` with Gmail SMTP (`smtp.gmail.com:465` SSL).
- **Credentials**: Read from `SMTP_USER` and `SMTP_PASS` (16-character Google App Password) in `.env`.
- **Branding**: Responsive HTML email with brand gradient banner, large OTP display card, and 10-minute expiry warning.
- **Smart Fallback**: If App Password is not yet configured, automatically enters developer simulation mode, logging the OTP to the console and returning it to the frontend so development and testing never stall.


### Inventory (`/api/inventory`)
- `GET /api/inventory/fabrics?user_id={id}`: Fetch all active fabric lots.
- `POST /api/inventory/fabrics`: Create a new fabric inward roll with lot number and meterage.
- `GET /api/inventory/suppliers?user_id={id}`: Fetch supplier list.
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

## 5. College Viva Questions & Model Answers (For Students 3 & 4)

### Questions for Student 3 (Database Engineer):
1. **Q: Why did you use prefixed primary keys (e.g. `mst_...`, `fab_...`) instead of auto-incrementing integers?**
   - **Answer**: Prefixed IDs identify the entity type instantly in logs, APIs, and client caches, and allow client-side optimistic ID generation without database roundtrips or collision risks.
2. **Q: How does Row Level Security (RLS) protect tenant data in PostgreSQL?**
   - **Answer**: RLS operates at the database engine level. Every SQL query automatically filters rows matching the tenant (`user_id`), ensuring one factory owner can never view another factory's cutting rates or invoices even if querying the same table.

### Questions for Student 4 (API & Security Engineer):
1. **Q: Why PBKDF2 instead of MD5 or SHA-1 for admin passwords?**
   - **Answer**: MD5 and SHA-1 are fast hashing algorithms susceptible to rainbow tables and brute-force GPU attacks. PBKDF2 applies 100,000 iterative HMAC-SHA256 cycles with unique random salts, making brute-force cracking computationally infeasible.
2. **Q: Why use atomic stored procedures for cutting batches?**
   - **Answer**: A cutting order must update the fabric roll meters and insert cutting breakdown records simultaneously. Doing this inside PostgreSQL stored procedure (`rpc_record_cutting_batch`) guarantees ACID compliance — if either step fails, the entire transaction rolls back.
