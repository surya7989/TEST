/**
 * Real PayPal REST API Integration Service
 * 
 * Communicates with the PayPal REST API v2 for Order Creation and Capture.
 * Never fakes payment completion; never creates fake capture IDs.
 */

let paypalClientId = process.env.PAYPAL_CLIENT_ID || '';
let paypalSecretKey = process.env.PAYPAL_SECRET || '';
let paypalMode: 'live' | 'sandbox' = (process.env.PAYPAL_MODE as any) === 'live' ? 'live' : 'sandbox';
const CURRENCY = process.env.CURRENCY || 'AUD';

export function setPayPalConfig(clientId: string, secretKey: string, mode: 'live' | 'sandbox') {
  paypalClientId = clientId;
  paypalSecretKey = secretKey;
  paypalMode = mode;
}

export function isPayPalConfigured(): boolean {
  return (Boolean(paypalClientId) &&
    Boolean(paypalSecretKey) &&
    paypalClientId !== 'your_paypal_client_id_here' &&
    paypalSecretKey !== 'your_paypal_secret_key_here');
}

function getPayPalBaseUrl(): string {
  return paypalMode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
}

/**
 * Get an OAuth2 Access Token from PayPal
 */
async function getAccessToken(): Promise<string> {
  if (!isPayPalConfigured()) {
    throw new Error('PayPal credentials (PAYPAL_CLIENT_ID and PAYPAL_SECRET) are not configured on the server.');
  }

  const baseUrl = getPayPalBaseUrl();
  const credentials = Buffer.from(`${paypalClientId}:${paypalSecretKey}`).toString('base64');

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PayPal OAuth2 authentication failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as any;
  return data.access_token;
}

export interface OrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
  sku?: string;
  description?: string;
}

export interface CreateOrderParams {
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  customerName: string;
  customerEmail: string;
  shippingAddress?: {
    address?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

/**
 * Create a PayPal order via v2/checkout/orders
 */
export async function createPayPalOrder(params: CreateOrderParams): Promise<{ id: string; status: string }> {
  const accessToken = await getAccessToken();
  const baseUrl = getPayPalBaseUrl();

  const purchaseUnit: any = {
    amount: {
      currency_code: CURRENCY,
      value: params.total.toFixed(2),
      breakdown: {
        item_total: {
          currency_code: CURRENCY,
          value: params.subtotal.toFixed(2),
        },
        shipping: {
          currency_code: CURRENCY,
          value: params.deliveryFee.toFixed(2),
        },
      },
    },
    description: 'AT Specialists Australia - Assistive Equipment Order',
    items: params.items.map((item) => ({
      name: item.name.substring(0, 127),
      unit_amount: {
        currency_code: CURRENCY,
        value: item.unitPrice.toFixed(2),
      },
      quantity: String(item.quantity),
      category: 'PHYSICAL_GOODS',
    })),
  };

  if (params.shippingAddress?.address) {
    purchaseUnit.shipping = {
      name: { full_name: params.customerName },
      address: {
        address_line_1: params.shippingAddress.address,
        admin_area_2: params.shippingAddress.city || 'Melbourne',
        admin_area_1: params.shippingAddress.state || 'VIC',
        postal_code: params.shippingAddress.postcode || '3000',
        country_code: params.shippingAddress.country || 'AU',
      },
    };
  }

  const orderPayload = {
    intent: 'CAPTURE',
    purchase_units: [purchaseUnit],
    application_context: {
      brand_name: 'AT Specialists Australia',
      landing_page: 'NO_PREFERENCE',
      user_action: 'PAY_NOW',
    },
  };

  const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'PayPal-Request-Id': `ATS-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    },
    body: JSON.stringify(orderPayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PayPal Order Creation Failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as any;
  return { id: data.id, status: data.status };
}

export interface CaptureResult {
  paypalOrderId: string;
  captureId: string;
  status: string;
  payerEmail: string;
  payerId: string;
  amount: string;
  currency: string;
  rawResponse: any;
}

/**
 * Capture a PayPal order via v2/checkout/orders/{id}/capture
 */
export async function capturePayPalOrder(paypalOrderId: string): Promise<CaptureResult> {
  const accessToken = await getAccessToken();
  const baseUrl = getPayPalBaseUrl();

  const response = await fetch(`${baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: '{}',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PayPal Capture API Error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as any;
  if (data.status !== 'COMPLETED') {
    throw new Error(`Payment capture was not completed by PayPal. Current status: ${data.status}`);
  }

  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  const payer = data.payer;

  return {
    paypalOrderId: data.id,
    captureId: capture?.id || data.id,
    status: capture?.status || data.status,
    payerEmail: payer?.email_address || '',
    payerId: payer?.payer_id || '',
    amount: capture?.amount?.value || '0.00',
    currency: capture?.amount?.currency_code || CURRENCY,
    rawResponse: data,
  };
}

export function getPayPalClientId(): string {
  return paypalClientId;
}

export function getPayPalMode(): 'live' | 'sandbox' {
  return paypalMode;
}
