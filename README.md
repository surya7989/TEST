# AT Specialists Australia — Medical & Assistive Technology Platform

An enterprise-grade, NDIS-compliant e-commerce and assistive equipment management platform built for Australian clinicians, participants, and support coordinators.

---

## 🏛️ System Architecture

* **Frontend**: React 18 SPA (`apps/frontend`), TypeScript, Vite, TailwindCSS, Zustand, `@paypal/react-paypal-js`.
* **Production API (Hostinger)**: Native PHP 8 REST API (`api/`) connected to MySQL/MariaDB via PDO with prepared statements and atomic transactions.
* **Development Backend**: Express + TypeScript server (`apps/backend`) for local development and mock testing.
* **Payment Engine**: Official PayPal REST API v2 OAuth2 Bearer token acquisition and capture (`/v1/oauth2/token`, `/v2/checkout/orders`, `/v2/checkout/orders/{id}/capture`).
* **Invoicing & PDF Engine**: Australian ATO-compliant Tax Invoice (ABN 48 123 456 789) and official NDIS Quotation PDF generator with Section 38-45 GST-Free compliance statements.
* **Email System**: Authenticated SMTP socket client with strict TLS certificate verification (`verify_peer => true`).

---

## 📂 Repository Structure

```text
AT Specialist/
├── api/                           # Hostinger Native PHP 8 Production API
│   ├── .htaccess                  # FastCGI CGIPassAuth and rewrite rules
│   ├── config.php                 # CORS, PDO database, JWT token engine, environment loader
│   ├── index.php                  # REST API routing, PayPal capture, authoritative pricing, CRUD
│   ├── smtpHelper.php             # Authenticated TLS socket mailer with responsive HTML templates
│   ├── pdfHelper.php              # FPDF Tax Invoice & NDIS Quote generator
│   └── fpdf.php                   # Standalone FPDF library
│
├── apps/
│   ├── frontend/                  # React 18 + Vite Storefront & Admin Application
│   │   ├── src/
│   │   │   ├── components/        # Reusable UI, layout, product, and admin components
│   │   │   ├── context/           # React contexts (Search, Wishlist)
│   │   │   ├── data/              # Initial catalogue seed data and clinical articles
│   │   │   ├── hooks/             # Custom React hooks (useCart, useWishlist)
│   │   │   ├── lib/               # Typed API client with automatic Bearer JWT injection
│   │   │   ├── pages/             # Storefront pages & /at/* administrative management views
│   │   │   └── store/             # Zustand stores (useCartStore, useAuthStore, adminStore)
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   └── backend/                   # Node.js + Express + TypeScript Development Backend
│       ├── src/
│       └── package.json
│
├── docs/                          # Comprehensive Technical & Operational Documentation
│   ├── architecture/README.md     # Full architectural specification
│   ├── deployment/HOSTINGER.md    # Hostinger 1-Click deployment walkthrough
│   ├── api/API.md                 # Complete REST API specification
│   └── operations/BACKUP-RESTORE.md # Database backup, restore, and migration guide
│
├── .env.example                   # Sanitized configuration template with instructions
├── .htaccess                      # Root Apache configuration (SPA rewrites, HSTS, CSP, X-Frame)
├── create-deploy-zip.js           # Automated Hostinger 1-Click deployment package builder
├── hostinger_schema.sql           # Clean MySQL database schema with initial seed data
├── package.json                   # Monorepo root workspace configuration
├── robots.txt                     # SEO crawler directives (Disallow: /at, /api)
├── security-pen-test.js           # Automated security penetration and adversary test suite
├── sitemap.xml                    # Production XML sitemap
├── test-suite.js                  # Pricing, GST, JWT, headers, and secret sanitization test suite
└── verify-deploy-zip.js           # Deployment ZIP validation and audit script
```

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Node.js 18+ & npm 9+
- PHP 8.1+ (for testing native PHP API locally if desired)
- MySQL 8.0+ / MariaDB 10.6+

### 2. Installation
```bash
# Clone repository and install dependencies across all workspaces
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env` and fill in your local development credentials:
```bash
cp .env.example .env
```

### 4. Running Locally
```bash
# Start frontend dev server (Vite on http://localhost:5173)
npm run dev

# Or run frontend and dev backend concurrently
npm run dev:all
```

---

## 🧪 Testing & Verification

Run the automated test suites before building or deploying:
```bash
# Run workspace linting
npm run lint

# Run pricing, tax rules, JWT, and header tests
node test-suite.js

# Run security penetration and adversarial tests
node security-pen-test.js
```

---

## 📦 Production Build & Hostinger Deployment

1. **Build Deployment Package**:
   ```bash
   node create-deploy-zip.js
   ```
   This automatically runs a clean frontend production build, bundles the PHP API, applies security headers, and outputs `deploy.zip` with Linux forward-slash paths.

2. **Validate Deployment Archive**:
   ```bash
   node verify-deploy-zip.js
   ```

3. **Deploy to Hostinger**:
   - Upload `deploy.zip` to `public_html/` in Hostinger hPanel File Manager.
   - Extract `deploy.zip`.
   - In phpMyAdmin, import `hostinger_schema.sql`.
   - Create `.env` in `public_html/` (or `public_html/new/`) based on `.env.example`.
   - Open `https://new.atspecialists.com.au/api/health` to confirm database connectivity.
   - Access the admin portal at `https://new.atspecialists.com.au/at/login`.

---

## 🔒 Security Standards

- **Server-Authoritative Pricing**: All item prices, weekly hire rates, Section 38-45 GST rules, and shipping fees are calculated strictly from the database catalog (`POST /api/cart/calculate`).
- **No Client Payment Trust**: Payments are verified strictly server-side against PayPal REST API v2 OAuth2 endpoints.
- **Cryptographic Guest Access**: Guest order retrieval requires an exact Order Number + Customer Email match, generating temporary HMAC-SHA256 signed tokens.
- **TLS Peer Verification**: Native SMTP mailer enforces SSL/TLS certificate peer verification.
- **Header Security**: Root `.htaccess` enforces HSTS, Content-Security-Policy, X-Frame-Options (`SAMEORIGIN`), and nosniff protections.
