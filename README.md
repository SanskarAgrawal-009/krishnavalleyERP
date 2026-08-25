# Krishna Valley Real Estate ERP System

An Enterprise Resource Planning (ERP) platform architected specifically for real estate developers, builders, and township property managers.

---

## 🏛️ System Architecture

```
ERP system/
├── backend/
│   ├── config/              # DB connection, global real estate domain constants
│   ├── controllers/         # Modular controllers (Auth, Property, CRM, Booking, Finance, Documents, Reports)
│   ├── middleware/          # JWT auth guard, RBAC role middleware, error & validation handlers
│   ├── models/              # Entity schemas (Projects, Units, Leads, Bookings, PaymentSchedules, Transactions, Users)
│   ├── routes/              # Express REST API routes
│   ├── services/            # Business logic (Pricing calculation, CLP milestone generation, Demand Notice generation)
│   ├── utils/               # Currency (INR) formatters, area calculators, logger
│   ├── templates/           # HTML templates for Demand Notices & Allotment Letters
│   ├── server.js            # Main Express server entry point
│   └── package.json
│
├── frontend/
│   ├── public/              # Static icons and assets
│   ├── src/
│   │   ├── components/      # UI components (Sidebar, Navbar, UnitMatrix, LeadKanban, PriceCalculator, MilestoneTracker)
│   │   ├── pages/           # Module views (Dashboard, Inventory, Leads, Bookings, Finance, Customers, Settings)
│   │   ├── services/        # Frontend API client wrappers
│   │   ├── styles/          # Design system tokens, glassmorphism, responsive layout CSS
│   │   ├── utils/           # Number & INR currency formatters
│   │   ├── App.jsx          # Tab router & shell
│   │   └── main.jsx         # React DOM mount point
│   ├── vite.config.js       # Vite configuration with /api proxy
│   ├── index.html
│   └── package.json
│
└── README.md
```

---

## 🏢 Core Modules Included

1. **Property & Stacking Inventory Matrix**: Interactive visual unit selector with real-time status (Available, On Hold, Booked, Blocked), Tower/Floor filters, and rate card breakdown.
2. **CRM & Lead Pipeline**: Kanban pipeline for prospect stages (New, Contacted, Site Visit Scheduled, Negotiation, Booked) with lead scoring and broker channel attribution.
3. **Sales & Quotation Calculator**: Real estate pricing engine calculating Base Rate, PLC (Preferential Location Charges), Parking, Club House, GST @ 5%, and Stamp Duty estimates.
4. **Milestone Billing & Dues**: Construction-Linked Payment (CLP) plan generator, demand notice issuance, and transaction receipt logging.
5. **Buyer Profiles & KYC Vault**: Customer KYC records, PAN/Aadhar tracking, and agreement status.
6. **Executive Dashboard**: High-level metrics for Total Portfolio Value, Gross Sales, Realized Collections, and Lead Conversion Rates.

---

## 🚀 Getting Started

### 1. Backend Setup
```bash
cd backend
npm install
npm run dev
```
*Backend runs on `http://localhost:5000` (Health Check: `http://localhost:5000/api/health`)*

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`*
