# Hostinger Production Deployment Guide

This guide details the step-by-step procedure for deploying AT Specialists Australia to Hostinger Shared, Cloud, or VPS hosting using the automated `deploy.zip` package.

---

## 1. Prerequisites on Hostinger
- Active Hostinger Web Hosting Plan with PHP 8.1+ support.
- MySQL / MariaDB database created in **hPanel -> Databases**.
- Domain name mapped with SSL certificate activated (Let's Encrypt / Hostinger SSL).

---

## 2. Build the Production Archive
From the project root on your local machine, run:
```bash
node create-deploy-zip.js
```
This will compile the frontend with Vite, copy the PHP API, apply security `.htaccess` and SEO files, and generate `deploy.zip` in the root folder.

Validate the package before uploading:
```bash
node verify-deploy-zip.js
```

---

## 3. Upload & Extract via File Manager
1. Log in to **Hostinger hPanel**.
2. Navigate to **Websites** -> select your website -> **File Manager**.
3. Open `public_html/`.
4. Upload `deploy.zip`.
5. Right-click `deploy.zip` and select **Extract**.
6. Ensure files are extracted directly into `public_html/` such that `public_html/index.html` and `public_html/api/index.php` exist.
7. Delete `deploy.zip` from `public_html/` after successful extraction.

---

## 4. Database Setup via phpMyAdmin
1. In hPanel, navigate to **Databases** -> **phpMyAdmin** -> Click **Enter phpMyAdmin**.
4. Choose [`hostinger_schema.sql`](file:///c:/Users/voakh/Downloads/AT%20Specalist/hostinger_schema.sql) (contains non-destructive `CREATE TABLE IF NOT EXISTS` definitions with initial seed data).
5. Click **Go** to execute.

---

## 5. Environment Variables Configuration
Create the `.env` file ONE level above `public_html/` (preferred — never web-accessible).
Only if your plan disallows that, use `public_html/api/.env` (it is blocked from web
access by `api/.htaccess`, but outside the docroot is strictly safer).
Copy every key from [`.env.example`](../../.env.example) — the API fails closed if
`JWT_SECRET` (min 32 chars) is missing. Required keys:

```ini
# Database Connection
DB_HOST=localhost
DB_PORT=3306
DB_USER=u123456789_atspec
DB_PASSWORD=your_actual_strong_database_password
DB_NAME=u123456789_atspecialists

# Security & Token Signing (REQUIRED — min 32 random chars, e.g. `openssl rand -hex 32`)
JWT_SECRET=generate_a_random_64_character_hex_secret_here

# PayPal REST API v2 Credentials
PAYPAL_MODE=live
PAYPAL_CLIENT_ID=your_live_paypal_client_id
PAYPAL_SECRET=your_live_paypal_secret_key
CURRENCY=AUD

# Authenticated SMTP Configuration (Hostinger Mail)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=admin@atspecialists.com.au
SMTP_PASS=your_hostinger_email_password
SMTP_FROM_EMAIL=admin@atspecialists.com.au
SMTP_FROM_NAME=AT Specialists Australia
ADMIN_NOTIFICATION_EMAIL=admin@atspecialists.com.au

# App URLs (local dev only: set DEV_CORS=true to allow localhost origins)
CLIENT_URL=https://new.atspecialists.com.au
VITE_API_URL=https://new.atspecialists.com.au
```

---

## 6. Verification Checklist
1. **Health Check**: Open `https://new.atspecialists.com.au/api/health` in your browser. It should return JSON indicating `"database": "connected (MySQL/MariaDB)"`.
2. **Admin Portal**: Open `https://new.atspecialists.com.au/at/login`.
   - Default initial admin: `admin@atspecialists.com.au`
   - Default initial password: `Admin@2026!ChangeMe`
   - *Important: Change the administrator password immediately upon first login in Admin -> Settings.*
3. **Storefront & Checkout**: Browse products, add an item to cart, and verify the checkout flow.
