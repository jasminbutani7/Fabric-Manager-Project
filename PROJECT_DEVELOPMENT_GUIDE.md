# Fabric Manager - Step-by-Step Beginner Development Guide
**Simple, Practical Guide to Build the Entire Web App from Scratch**

> **Team:**
> - **Lead:** Sharad
> - **Frontend:** Nandni & Tisha
> - **Backend:** Sharad & Jasmin
>
> **Project Goal:** Build a mobile-friendly web application for textile and garment factories.

---

## 💡 What is this Project About? (In Simple Words)
Imagine a small garment factory:
1. They buy big rolls of cloth (called **Fabric Lots**).
2. A **Cutting Master** cuts cloth into pieces (Front, Back, Sleeves).
3. **Tailors** sit on machines and stitch the pieces together into shirts, kurtis, or pants.
4. **Helpers** trim extra threads and pack them.
5. The factory **delivers** the finished clothes to the buyer and makes a **bill (Invoice)**.
6. The factory owner pays worker wages and tracks daily profit.

Our app, **Fabric Manager**, does all of this on a mobile phone and computer!

---

# 🎨 PART 1: FRONTEND STEP-BY-STEP GUIDE (Nandni & Tisha)

*Build the application step-by-step in this exact order:*

---

### Step 1: Admin Signup & Login Screens (`SignUp.jsx` & `SignIn.jsx`)
*The app must first allow factory owners to create an account and sign in.*

- **What to build:**
  1. **Signup Page (`/signup`):**
     - Form fields: Factory Name, Admin Name, Mobile Number, Email, and Password.
     - A green/indigo "Create Account" button.
     - Link at bottom: "Already have an account? Sign In".
  2. **Login Page (`/signin`):**
     - Form fields: Mobile Number or Email, and Password.
     - A "Sign In" button.
     - Automatically save the login session in `sessionStorage` so the user stays logged in.
  3. **Route Protection (`App.jsx`):**
     - If user is **not logged in**, redirect to `/signin`.
     - If user **is logged in**, open the Home dashboard.

---

### Step 2: Main App Shell & Home Page (`MobileLayout.jsx` & `Home.jsx`)
*Create the look and feel of the app with easy mobile navigation.*

- **What to build:**
  1. **Top Header Bar:**
     - Factory Name (e.g., "Krishna Textiles") with a small green pulse dot (Live status).
     - A menu icon button to open a sidebar drawer.
  2. **Bottom Navigation Bar (5 Main Tabs):**
     - 🏠 **Home** (Quick overview & live pulse)
     - 🧵 **Fabrics** (Raw cloth lots & inventory)
     - ✂️ **Production** (Cutting & tailor stitching)
     - 💳 **Transaction** (Expenses & invoices)
     - ⚙️ **Setup** (Machines, workers, and suppliers)
  3. **Home Screen Content (`Home.jsx`):**
     - **Live Factory Pulse:** Total active machines, tailors at work, lots currently running.
     - **Quick Action Buttons:** 1-tap buttons to "+ Add Cloth Lot", "+ Record Cutting", "+ Add Expense".

---

### Step 3: Setup Page - Workers & Machines (`Setup.jsx`)
*Before cutting cloth, we need machines and workers registered in the app.*

- **What to build:**
  1. Tab buttons at the top: **Machines | Tailors | Cutting Masters | Helpers | Suppliers**.
  2. **Popup Modals for adding items:**
     - **Add Machine Modal:** Enter Machine Code (e.g. M-01), Type (Single needle, Overlock), and Brand (Juki/Jack).
     - **Add Tailor Modal:** Enter Tailor Name, Mobile number, and select which machine they will use.
     - **Add Cutting Master Modal:** Enter Master Name, Mobile number, and years of experience.
     - **Add Helper Modal:** Enter Helper Name and default piece rate (e.g., Rs. 2 per piece).
     - **Add Supplier Modal:** Enter Supplier Name, Mobile, and GST number.
  3. **List Cards:** Show registered workers and machines with options to edit, relieve, or delete.

---

### Step 4: Fabric Inventory Page (`Inventory.jsx`)
*Record cloth arriving at the factory and design the dress structure.*

- **What to build:**
  1. **Add Fabric Lot Modal (`AddFabricModal.jsx`):**
     - Enter Lot Number (e.g., Lot #101).
     - Select Supplier from dropdown.
     - Enter plain cloth meters (e.g., 500 meters) and color.
     - Enter price per meter or price per set.
  2. **Product Structure Modal (`SetProductStructureModal.jsx`):**
     - Define what garment is being made (e.g., "3-Piece Suit").
     - Add sub-parts: **Top Kurti** (Rate: Rs. 25), **Pant** (Rate: Rs. 15), **Dupatta** (Rate: Rs. 5).
     - Under each part, list pieces (Front, Back, Sleeves).
  3. **Lot Cards on Screen:**
     - Display lot cards with a 5-step progress line (1. Inward ➔ 2. Cutting ➔ 3. Stitching ➔ 4. Handover ➔ 5. Delivery).

---

### Step 5: Production & Cutting Execution (`Orders.jsx`)
*Cutting master cuts cloth, and pieces are given to tailors.*

- **What to build:**
  1. **Record Cutting Modal (`RecordCuttingModal.jsx`):**
     - Select which Cutting Master did the cutting.
     - Enter how many meters of cloth were used (e.g., 120 meters).
     - Enter number of pieces cut (e.g., 50 Front, 50 Back, 100 Sleeves).
     - The app automatically calculates how many complete sets are ready and how many meters of cloth are left.
  2. **Assign Tailors Modal (`AssignTailorModal.jsx`):**
     - Select the cut pieces.
     - Pick a tailor from the list.
     - Enter how many pieces to assign (e.g., 50 Tops).
     - App shows total wage the tailor will earn (e.g., 50 pieces × Rs. 25 = Rs. 1,250).

---

### Step 6: Dedicated Worker Mobile Portals (Self-Service)
*Workers open their own link on their mobile without seeing admin accounts.*

- **What to build:**
  1. **Tailor Portal (`/portal/tailor/:id`):**
     - Clean, simple mobile screen for tailors.
     - Big card showing: "New Job Assigned: 50 Tops at Rs. 25/pc".
     - Green **"Accept Job"** button.
     - **"Log Today's Work" Modal:** Tailor types how many pieces they finished today (e.g., "Today I stitched 20 pieces").
     - Shows tailor's total earnings in Rupees.
  2. **Cutting Master Portal (`/portal/master/:id`):**
     - Screen for Cutting Master to see assigned fabric rolls.
     - 1-tap **"Approve"** button to check and verify tailor's daily submissions.
     - **"Handover to Admin" Modal:** Send finished goods back to factory manager.

---

### Step 7: Deliveries, Billing & Expenses (`Transactions.jsx`)
*Deliver finished clothes to buyer, create invoices, and log factory expenses.*

- **What to build:**
  1. **Thread Trimming & Packing Popup:**
     - Ask admin: "Does this lot need thread cutting?" If Yes, assign helper at Rs. 2/pc.
  2. **Deliver to Buyer Modal (`DeliverToSupplierModal.jsx`):**
     - Enter delivery date, vehicle number, and quantity of dresses dispatched.
  3. **Create Invoice Modal (`AddInvoiceModal.jsx`):**
     - Enter client/buyer name, total pieces delivered, rate per piece.
     - Add GST Tax % and Discount.
     - Automatically calculates Subtotal, Tax, and Grand Total.
  4. **Record Payment Modal (`RecordInvoicePaymentModal.jsx`):**
     - If client gives partial payment (e.g., Rs. 10,000 out of Rs. 30,000), log payment.
     - Card updates to show status as **Partial** with Remaining Due amount.
  5. **Factory Expenses Screen (`Expenses.jsx`):**
     - Record factory expenses: Rent, Electricity, Machine Needles, Thread, Tea/Snacks.

---

# ⚙️ PART 2: BACKEND STEP-BY-STEP GUIDE (Jasmin & Sharad)

*Build the database and data connections step-by-step in this exact order:*

---

### Step 1: Create Supabase Project & Connect App
*Connect the React frontend to the PostgreSQL cloud database.*

- **What to do:**
  1. Go to [Supabase](https://supabase.com) and create a free project.
  2. Get `Project URL` and `Anon Public Key`.
  3. Save them in `.env` file:
     ```env
     VITE_SUPABASE_URL=https://your-project.supabase.co
     VITE_SUPABASE_ANON_KEY=your-anon-key
     ```
  4. Create `src/lib/supabaseClient.js` to initialize the connection.

---

### Step 2: Create Users Table (For Admin Logins)
*Store factory admin accounts securely.*

- **Table: `users`**
  - `id` (text, primary key)
  - `name` (text)
  - `email` (text, unique)
  - `phone` (text, unique)
  - `company_name` (text)
  - `password` (text)
  - `created_at` (timestamp)

---

### Step 3: Create Master Data Tables
*Tables to store machines, workers, and suppliers.*

1. **Table: `masters`** (Cutting Masters)
   - `id`, `user_id`, `name`, `phone`, `experience`, `status`
2. **Table: `machines`** (Sewing Machines)
   - `id`, `user_id`, `code`, `name`, `type`, `brand`, `assigned_tailor_id`, `status`
3. **Table: `tailors`** (Tailors)
   - `id`, `user_id`, `name`, `phone`, `assigned_machine_id`, `specialty`, `status`
4. **Table: `helpers`** (Trimming helpers)
   - `id`, `user_id`, `name`, `phone`, `default_rate_per_piece`, `status`
5. **Table: `suppliers`** (Fabric suppliers & buyers)
   - `id`, `user_id`, `name`, `phone`, `gst_number`, `payment_terms`, `status`

---

### Step 4: Create Fabric & Cutting Tables
*Track incoming cloth and cutting pieces.*

1. **Table: `fabrics`** (Raw Cloth Lots)
   - `id`, `user_id`, `lot_no`, `supplier_id`, `plain_meters`, `target_sets`, `price_per_set`, `product_name`, `product_structure (JSONB)`, `status`
2. **Table: `cuttings`** (Cut Batches)
   - `id`, `user_id`, `fabric_id`, `master_id`, `cut_pieces (JSONB)`, `total_pieces`, `sets_count`, `meters_used`, `status`

---

### Step 5: Create Stitching & Handover Tables
*Track tailor jobs and daily finished work.*

1. **Table: `tailor_assignments`**
   - `id`, `user_id`, `cutting_id`, `tailor_id`
   - `assigned_cut_pieces (JSONB)`
   - `rate_per_piece` (numeric)
   - `completed_quantity` (integer)
   - `total_earned` (numeric)
   - `daily_submissions (JSONB)` -> Array of daily logs `[{ date, quantity, earned, status }]`
   - `tailor_accepted` (boolean)
   - `status` ('Pending Acceptance', 'In Progress', 'Completed')
2. **Table: `master_handovers`**
   - `id`, `user_id`, `fabric_id`, `cutting_id`, `master_id`, `pieces_count`, `status` ('Pending', 'Verified')

---

### Step 6: Create Billing & Expense Tables
*Track dispatches, payments, and expenses.*

1. **Table: `delivery_logs`**
   - `id`, `user_id`, `fabric_id`, `supplier_id`, `total_pieces`, `vehicle_no`, `delivery_date`
2. **Table: `invoices`**
   - `id`, `user_id`, `invoice_number`, `client_name`, `date`, `due_date`, `subtotal`, `tax`, `discount`, `total_amount`, `paid_amount`, `due_amount`, `payments (JSONB)`, `status` ('Pending', 'Partial', 'Paid')
3. **Table: `expenses`**
   - `id`, `user_id`, `category`, `title`, `amount`, `date`, `payment_method`, `paid_to`

---

### Step 7: Turn On Realtime Live Sync (Important!)
*So when a tailor submits work on phone, admin screen updates instantly without refreshing!*

- In Supabase Dashboard ➔ Database ➔ Publications:
  - Enable **Realtime** for tables: `fabrics`, `cuttings`, `tailor_assignments`, `master_handovers`, `invoices`.

---

# 🚀 4-WEEK SIMPLE TIMELINE FOR TEAM

| Week | Nandni & Tisha (Frontend) | Jasmin & Sharad (Backend) | Result at End of Week |
|---|---|---|---|
| **Week 1** | Build Login, Signup, Layout & Setup Page (Workers + Machines) | Create Supabase project, Setup `users`, `machines`, `tailors` tables | Login works, and you can add tailors and machines! |
| **Week 2** | Build Fabric Inventory screen & Cutting Batch popup | Create `fabrics` and `cuttings` tables with remaining meters calculation | You can add cloth lots and cut them! |
| **Week 3** | Build Tailor Portal on mobile & Daily Work logging popup | Create `tailor_assignments` table & enable Realtime live sync | Tailor can accept job and submit pieces from phone! |
| **Week 4** | Build Deliveries, Invoices (Billing) & Expense screen | Create `invoices`, `delivery_logs`, and `expenses` tables | Complete app ready with live billing & P&L! |
