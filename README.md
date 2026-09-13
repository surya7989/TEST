# AT Specialists Australia — Medical & Assistive Technology Platform

An enterprise-grade, NDIS-compliant e-commerce and assistive equipment management platform built for Australian clinicians, participants, and support coordinators.

---

## 🏛️ System Architecture

* **Frontend**: React 18 SPA (`apps/frontend`), TypeScript, Vite, TailwindCSS, Zustand, `@paypal/react-paypal-js`.
* **Production API (Hostinger)**: Native PHP 8 REST API (`api/`) connected to MySQL/MariaDB via PDO with prepared statements and atomic transactions.
* **Payment Engine**: Official PayPal REST API v2 OAuth2 Bearer token acquisition and capture (`/v1/oauth2/token`, `/v2/checkout/orders`, `/v2/checkout/orders/{id}/capture`).
* **Invoicing & PDF Engine**: Australian ATO-compliant Tax Invoice (ABN 48 123 456 789) and official NDIS Quotation PDF generator with Section 38-45 GST-Free compliance statements.
* **Email System**: Authenticated SMTP socket client with strict TLS certificate verification (`verify_peer => true`).

---

## 📂 Repository Structure

```text
At-Specialists/
├── api/                           # Hostinger Native PHP 8 Production API (deployed as public_html/api)
│   ├── index.php                  # REST routing: products, orders, quotes, inquiries, emails, settings
│   ├── config.php                 # CORS, PDO database, JWT token engine, environment loader
│   ├── smtpHelper.php             # Authenticated TLS socket mailer with responsive HTML templates
│   ├── pdfHelper.php              # FPDF Tax Invoice & NDIS Quote generator (+ fpdf.php library)
│   ├── img-proxy.php              # Supplier-image proxy with disk cache
│   ├── products.json              # Fallback catalogue seed (auto-synced into MySQL)
│   └── .htaccess                  # FastCGI CGIPassAuth and rewrite rules
│
├── apps/
│   └── frontend/                  # React 18 + Vite Storefront & Admin Application
│       ├── src/
│       │   ├── components/        # Reusable UI, layout, product, and admin components
│       │   ├── data/              # Catalogue seed data, categories, brands, articles
│       │   ├── hooks/             # Custom React hooks (useCart, useWishlist)
│       │   ├── lib/               # Typed API client with automatic Bearer JWT injection
│       │   ├── pages/             # Storefront pages & /at/* administrative management views
│       │   └── store/             # Zustand stores (useCartStore, useAuthStore, adminStore)
│       ├── public/                # Logos, favicons, images (copied to dist on build)
│       ├── package.json
│       └── vite.config.ts
│
├── scripts/
│   └── post-build.js              # Publishes dist output to root dist/ + root (local staging)
│
├── docs/                          # Technical & Operational Documentation
│   ├── architecture/README.md     # Full architectural specification
│   ├── deployment/HOSTINGER.md    # Hostinger deployment walkthrough
│   ├── api/API.md                 # Complete REST API specification
│   └── operations/BACKUP-RESTORE.md # Database backup, restore, and migration guide
│
├── .env.example                   # Sanitized configuration template (.env itself is never committed)
├── .htaccess                      # Root Apache configuration (SPA rewrites, HSTS, CSP)
├── create-deploy-zip.js           # Automated Hostinger deployment package builder (npm run build:deploy)
├── hostinger_schema.sql           # MySQL database schema with initial seed data
├── package.json                   # Workspace root (dev, build, deploy scripts)
├── robots.txt                     # SEO crawler directives (Disallow: /at, /api)
└── sitemap.xml                    # Production XML sitemap
```

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Node.js 20+ & npm 10+
- PHP 8.1+ (only if you want to run the native PHP API locally)
- MySQL 8.0+ / MariaDB 10.6+ (or use the live Hostinger database via `VITE_API_URL`)

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
```

---

## ✅ Verification

Before building or deploying:
```bash
# Run workspace linting
npm run lint

# Type-check + production build (also runs scripts/post-build.js staging)
npm run build
```

---

## 📦 Production Build & Hostinger Deployment

1. **Build Deployment Package**:
   ```bash
   npm run build:deploy
   ```
   This runs a clean frontend production build, bundles the PHP API, and outputs `deploy.zip` with Linux forward-slash paths (`deploy.zip` is git-ignored — rebuild it whenever you deploy).

2. **Deploy to Hostinger**:
   - Upload `deploy.zip` to `public_html/` in Hostinger hPanel File Manager.
   - Extract `deploy.zip`.
   - In phpMyAdmin, import `hostinger_schema.sql` (first time only).
   - Create `.env` on the server based on `.env.example` (never commit the real `.env`).
   - Open `https://new.atspecialists.com.au/api/health` to confirm database connectivity.
   - Access the admin portal at `https://new.atspecialists.com.au/at/login`.

---

## 🔒 Security Standards

- **Server-Authoritative Pricing**: All item prices, weekly hire rates, Section 38-45 GST rules, and shipping fees are calculated strictly from the database catalog (`POST /api/cart/calculate`).
- **No Client Payment Trust**: Payments are verified strictly server-side against PayPal REST API v2 OAuth2 endpoints.
- **Cryptographic Guest Access**: Guest order retrieval requires an exact Order Number + Customer Email match, generating temporary HMAC-SHA256 signed tokens.
- **TLS Peer Verification**: Native SMTP mailer enforces SSL/TLS certificate peer verification.
- **Header Security**: Root `.htaccess` enforces HSTS, Content-Security-Policy, X-Frame-Options (`SAMEORIGIN`), and nosniff protections.
