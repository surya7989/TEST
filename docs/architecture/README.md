# System Architecture Specification

## 1. Architectural Overview

AT Specialists Australia operates on a decoupled client-server architecture designed for high availability, security, and low maintenance overhead on Hostinger Shared/Cloud hosting:

```
┌────────────────────────────────────────────────────────┐
│               Client Browser (Store / Admin)           │
│  React 18 SPA + Zustand + Tailwind + PayPal JS SDK     │
└───────────┬────────────────────────────────┬───────────┘
            │ HTTPS API Requests             │ Static Assets
            ▼                                ▼
┌───────────────────────────┐    ┌───────────────────────┐
│     LiteSpeed / Apache    │    │  public_html/ assets/ │
│  .htaccess Rewrite Engine │    │  (HTML, JS, CSS, PNG) │
└───────────┬───────────────┘    └───────────────────────┘
            │ FastCGI CGIPassAuth
            ▼
┌────────────────────────────────────────────────────────┐
│               Hostinger Native PHP 8 API               │
│  ┌──────────────────────────────────────────────────┐  │
│  │ api/config.php (CORS, JWT, PDO, Env Loader)      │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ api/index.php (Router, Pricing Engine, Auth)     │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ api/smtpHelper.php (TLS Authenticated Mailer)    │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ api/pdfHelper.php (ATO Tax Invoice & NDIS Quotes)│  │
│  └──────────────────────────────────────────────────┘  │
└───────────┬────────────────────────────────┬───────────┘
            │ PDO Prepared Statements        │ HTTPS REST v2
            ▼                                ▼
┌───────────────────────────┐    ┌───────────────────────┐
│     MySQL / MariaDB       │    │  PayPal REST API      │
│  (InnoDB utf8mb4_unicode) │    │  (OAuth2, Capture)    │
└───────────────────────────┘    └───────────────────────┘
```

---

## 2. Component Boundaries & Responsibilities

### Frontend Layer (`apps/frontend`)
- **State Management**: Zustand store (`useCartStore.ts`) serves as the single source of truth for UI cart interactions. `useAuthStore.ts` manages customer tokens, and `adminStore.ts` handles admin data.
- **Client Payment Integration**: PayPal Buttons render in PCI-compliant iframes via `@paypal/react-paypal-js`.
- **Zero Financial Authority**: The frontend never calculates final payment totals. It invokes `POST /api/cart/calculate` to render authoritative totals.

### Backend Layer (`api/`)
- **Routing & Controllers**: [`api/index.php`](file:///c:/Users/voakh/Downloads/AT%20Specalist/api/index.php) handles request dispatching, input validation, and business logic execution.
- **Authoritative Calculations**: Product prices, hire duration multipliers (`weeklyRate * weeks`), Section 38-45 GST rules, and shipping methods are resolved from the database catalog.
- **Payment Verification**: Captures are submitted directly to PayPal's REST API. Orders are recorded only after PayPal responds with `status === 'COMPLETED'` and currency matching `AUD`.
- **Document Generation**: [`api/pdfHelper.php`](file:///c:/Users/voakh/Downloads/AT%20Specalist/api/pdfHelper.php) generates tax invoices with required ATO identifiers (ABN, invoice number, date, tax-inclusive breakdowns) in memory.

### Data Storage Layer (`hostinger_schema.sql`)
- **Tables**: `products`, `orders`, `order_items`, `payment_logs`, `customers`, `ndis_quotes`, `inquiries`, `app_settings`, `admin_users`.
- **Integrity**: Foreign keys with `ON DELETE CASCADE` or `RESTRICT` prevent orphaned records. Atomic transactions guard inventory and order creation.
