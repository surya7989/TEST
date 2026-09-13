# REST API Specification

Base URL: `https://atspecialists.com.au/api`

---

## 1. Public Endpoints

### `GET /health`
Returns system status without exposing sensitive credentials.
* **Response `200 OK`**:
  ```json
  {
    "status": "ok",
    "service": "AT Specialists Production PHP API (PHP 8 + MySQL)",
    "timestamp": "2026-09-02T14:30:00Z",
    "database": "connected (MySQL/MariaDB)",
    "paypalConfigured": true,
    "paypalMode": "live",
    "currency": "AUD"
  }
  ```

### `GET /products`
Returns all active products.
* **Response `200 OK`**:
  ```json
  {
    "products": [
      {
        "id": "eq-101",
        "name": "Quantum Power Wheelchair Q6 Edge",
        "slug": "quantum-power-wheelchair-q6-edge",
        "sku": "EQ-101",
        "price": 3450.00,
        "hire_price": 180.00,
        "category": "Power Wheelchairs",
        "stock": 15,
        "gst_type": "gst-free",
        "delivery_fee": 0.00
      }
    ]
  }
  ```

### `POST /cart/calculate`
Calculates authoritative prices, hire rates, GST, and delivery fees.
* **Request Body**:
  ```json
  {
    "items": [
      { "id": "eq-101", "quantity": 1, "purchaseType": "hire", "hireWeeks": 4 }
    ],
    "deliveryMethod": "express"
  }
  ```
* **Response `200 OK`**:
  ```json
  {
    "success": true,
    "subtotal": 720.00,
    "deliveryFee": 29.00,
    "gstTotal": 0.00,
    "total": 749.00,
    "items": [ ... ]
  }
  ```

---

## 2. Customer & Authentication Endpoints

### `POST /auth/login` (Admin Login)
* **Request Body**: `{ "email": "admin@atspecialists.com.au", "password": "..." }`
* **Response `200 OK`**: `{ "success": true, "token": "JWT_TOKEN", "user": { ... } }`

### `POST /auth/customer-register`
* **Request Body**: `{ "name": "Jane Doe", "email": "jane@example.com", "password": "...", "ndisNumber": "430123456" }`
* **Response `201 Created`**: `{ "success": true, "token": "JWT_TOKEN", "user": { ... } }`

### `POST /auth/customer-login`
* **Request Body**: `{ "email": "jane@example.com", "password": "..." }`
* **Response `200 OK`**: `{ "success": true, "token": "JWT_TOKEN", "user": { ... } }`

### `POST /orders/guest-lookup`
* **Request Body**: `{ "orderId": "ATS-ORD-...", "email": "customer@example.com" }`
* **Response `200 OK`**: Returns order data and temporary HMAC `accessToken` for PDF downloads.

---

## 3. PayPal Payments Endpoints

### `GET /paypal/client-id`
Returns PayPal client ID for frontend JS SDK initialization.

### `POST /paypal/create-order`
Creates a PayPal order via `POST /v2/checkout/orders` with authoritative line totals.

### `POST /paypal/capture-order`
Captures approved payment, verifies `COMPLETED` status, decrements inventory, records payment logs, and generates PDF Tax Invoice in memory.

---

## 4. Protected Admin Endpoints (`Authorization: Bearer <token>`)

* `GET /orders` — Lists all orders with customer details.
* `PATCH /orders/{id}/status` — Updates order state with state machine validation (`pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`).
* `PATCH /orders/{id}/tracking` — Updates tracking numbers.
* `POST /products`, `PUT /products/{id}`, `DELETE /products/{id}` — Manages product catalogue.
* `GET /quotes`, `PATCH /quotes/{id}/status` — Reviews and approves NDIS quotations.
* `GET /inquiries`, `PATCH /inquiries/{id}/status` — Manages customer inquiries.
* `POST /emails/send-test` — Dispatches test email or tax invoice.
* `GET /settings`, `POST /settings` — Reads and updates application settings.
