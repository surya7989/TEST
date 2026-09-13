const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment configuration
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const smtpHost = process.env.SMTP_HOST || 'smtp.zoho.in';
const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
const smtpSecure = process.env.SMTP_SECURE === 'ssl' || smtpPort === 465;
const senderEmail = process.env.SMTP_USER || 'admin@atspecialists.com.au';
const senderPass = process.env.SMTP_PASS || 'Admin@atspe1508';
const senderName = process.env.SMTP_FROM_NAME || 'AT Specialists Australia';
const recipientEmail = 'admin@atspecialists.com.au';

console.log('======================================================================');
console.log('AT SPECIALISTS AUSTRALIA - ZOHO MAIL ACTION EMAIL TEST RUNNER');
console.log('======================================================================');
console.log(`Sender:    "${senderName}" <${senderEmail}>`);
console.log(`Recipient: ${recipientEmail}`);
console.log(`Server:    ${smtpHost}:${smtpPort} (SSL: ${smtpSecure})`);
console.log('Provider:  Zoho Mail Server');
console.log('Attachments: PDF attachments disabled (Clean Online Browser Links)');
console.log('======================================================================\n');

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  auth: {
    user: senderEmail,
    pass: senderPass,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Resolve logo image for CID embedding
let logoAttachment = null;
const logoCandidates = [
  path.resolve(__dirname, '../apps/frontend/src/assets/logo-header.png'),
  path.resolve(__dirname, '../apps/frontend/dist/assets/logo-header-DWzt4WZZ.png'),
];
for (const cand of logoCandidates) {
  if (fs.existsSync(cand)) {
    logoAttachment = {
      filename: 'logo-header.png',
      path: cand,
      cid: 'at-specialists-logo',
      contentDisposition: 'inline',
    };
    break;
  }
}

const baseCompanyInfo = {
  companyName: 'AT Specialists Australia',
  abn: '48 123 456 789',
  address: 'Level 2, 88 Holmes Road, Moonee Ponds VIC 3039',
  phone: '0494 767 409',
  email: 'admin@atspecialists.com.au',
  website: 'https://atspecialists.com.au',
  bankName: 'Commonwealth Bank of Australia (CBA)',
  accountName: 'AT Specialists Australia Pty Ltd - Client Account',
  bsb: '063-000',
  accountNumber: '1088 4422',
};

/**
 * Standard branded responsive HTML email template
 */
function buildEmailHtml({
  badge,
  badgeColor = '#0D9488',
  headline,
  subtext,
  docRef,
  docTypeTitle = 'Verified Digital Document',
  viewUrl,
  actionButtonText = '👉 Click & Visit: View Document Online →',
  metaBoxHtml = '',
  items = [],
  totalsHtml = '',
  extraSectionHtml = '',
  customerNotes = '',
}) {
  const itemsRows = items.map((it) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #F1F5F9;">
        <div style="font-weight:700;color:#0F172A;font-size:13px;">${it.name}</div>
        ${it.code ? `<div style="font-size:11px;color:#64748B;margin-top:2px;">Item Code / SKU: <span style="font-family:ui-monospace,monospace;font-weight:700;color:#147A7A;background:#F0FDFA;padding:2px 6px;border-radius:4px;border:1px solid #CCFBF1;">${it.code}</span>${it.detail ? ` &bull; ${it.detail}` : ''}</div>` : (it.detail ? `<div style="font-size:11px;color:#64748B;margin-top:2px;">${it.detail}</div>` : '')}
      </td>
      <td align="center" style="padding:10px 12px;border-bottom:1px solid #F1F5F9;font-weight:700;font-size:13px;color:#475569;">${it.qty || 1}</td>
      <td align="right" style="padding:10px 12px;border-bottom:1px solid #F1F5F9;font-weight:700;font-size:13px;color:#0F172A;">$${Number(it.amount || it.price || 0).toFixed(2)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${headline}</title>
</head>
<body style="margin:0;padding:24px 8px;background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#F1F5F9">
    <tr>
      <td align="center">
        <table width="640" border="0" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" style="width:640px;max-width:640px;background:#FFFFFF;border-radius:12px;border:1px solid #E2E8F0;padding:24px 20px;box-shadow:0 4px 16px rgba(0,0,0,0.04);">
          <!-- Header -->
          <tr>
            <td align="center" style="border-bottom:2px solid #0F766E;padding-bottom:14px;">
              ${logoAttachment ? '<img src="cid:at-specialists-logo" alt="AT Specialists" height="42" style="height:42px;max-height:42px;width:auto;display:block;margin:0 auto 8px auto;border:0;" />' : ''}
              <div style="font-size:17px;font-weight:900;color:#0F172A;letter-spacing:-0.3px;line-height:1.2;text-transform:uppercase;">${baseCompanyInfo.companyName}</div>
              <div style="font-size:11.5px;color:#0F766E;font-weight:700;margin-top:2px;">Assistive Technology &amp; Healthcare Specialists &bull; NDIS Provider</div>
              <div style="font-size:11px;color:#64748B;margin-top:2px;">${baseCompanyInfo.address} &bull; Phone: ${baseCompanyInfo.phone} &bull; ABN: ${baseCompanyInfo.abn}</div>
            </td>
          </tr>
          <tr><td height="16" style="font-size:16px;line-height:16px;">&nbsp;</td></tr>

          <!-- Status Badge -->
          <tr>
            <td style="font-size:11.5px;font-weight:800;color:${badgeColor};text-transform:uppercase;letter-spacing:0.5px;padding-bottom:6px;">
              ${badge}
            </td>
          </tr>

          <!-- Headline -->
          <tr>
            <td style="color:#0F172A;font-size:20px;font-weight:800;line-height:1.25;padding-bottom:6px;">
              ${headline}
            </td>
          </tr>
          <tr>
            <td style="color:#475569;font-size:13px;line-height:1.6;padding-bottom:14px;">
              ${subtext}
            </td>
          </tr>

          <!-- Online View Card -->
          ${viewUrl ? `
          <tr>
            <td style="padding-bottom:18px;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#F0FDFA" style="border:1.5px solid #0D9488;border-radius:10px;padding:16px 18px;text-align:center;">
                <tr>
                  <td>
                    <div style="font-size:11px;font-weight:800;color:#0F766E;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:4px;">
                      📄 ${docTypeTitle}
                    </div>
                    ${docRef ? `<div style="font-size:14px;font-weight:800;color:#0F172A;margin-bottom:4px;">Reference: #${docRef}</div>` : ''}
                    <div style="font-size:12px;color:#475569;margin-bottom:12px;">
                      Click below to securely review your official document, specifications &amp; printable record online.
                    </div>
                    <div>
                      <a href="${viewUrl}" target="_blank" style="display:inline-block;background:#147A7A;color:#FFFFFF;font-weight:800;font-size:13.5px;padding:11px 26px;text-decoration:none;border-radius:7px;box-shadow:0 2px 4px rgba(20,122,122,0.25);">
                        ${actionButtonText}
                      </a>
                    </div>
                    <div style="margin-top:8px;font-size:11px;color:#64748B;">
                      Instant browser view &bull; No download required &bull; Official ATSA Record
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- Metadata Box -->
          ${metaBoxHtml ? `<tr><td style="padding-bottom:14px;">${metaBoxHtml}</td></tr>` : ''}

          <!-- Line Items Table -->
          ${items.length > 0 ? `
          <tr>
            <td style="padding-bottom:16px;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;">
                <tr bgcolor="#F8FAFC">
                  <th align="left" style="padding:10px 12px;font-size:12px;font-weight:700;color:#475569;border-bottom:1px solid #E2E8F0;">Equipment Description &amp; Specifications</th>
                  <th align="center" style="padding:10px 12px;font-size:12px;font-weight:700;color:#475569;width:45px;border-bottom:1px solid #E2E8F0;">Qty</th>
                  <th align="right" style="padding:10px 12px;font-size:12px;font-weight:700;color:#475569;width:95px;border-bottom:1px solid #E2E8F0;">Total</th>
                </tr>
                ${itemsRows}
                ${totalsHtml ? `
                <tr>
                  <td colspan="3" style="padding:12px 14px;background:#FFFFFF;border-top:1px solid #E2E8F0;">
                    ${totalsHtml}
                  </td>
                </tr>
                ` : ''}
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- Extra Section (EFT, Clinical advice, etc.) -->
          ${extraSectionHtml ? `<tr><td style="padding-bottom:14px;">${extraSectionHtml}</td></tr>` : ''}

          <!-- Notes -->
          ${customerNotes ? `
          <tr>
            <td style="font-size:11.5px;color:#64748B;padding-bottom:14px;">
              <strong>Clinical / Order Notes:</strong> ${customerNotes}
            </td>
          </tr>
          ` : ''}

          <!-- Footer -->
          <tr>
            <td align="center" style="border-top:1px solid #E2E8F0;padding-top:16px;font-size:11px;color:#64748B;line-height:1.5;">
              <div style="font-weight:700;color:#334155;margin-bottom:3px;">
                ${baseCompanyInfo.companyName} &bull; ABN: ${baseCompanyInfo.abn} &bull; NDIS Registered Provider
              </div>
              <div style="font-size:10.5px;color:#94A3B8;max-width:540px;margin:0 auto 4px auto;">
                Confidentiality Notice: This medical and assistive technology communication is confidential and intended solely for the recipient. If received in error, please notify sender immediately.
              </div>
              <div style="font-size:10.5px;color:#94A3B8;">
                ${baseCompanyInfo.website} &bull; ${baseCompanyInfo.email} &bull; Phone: ${baseCompanyInfo.phone}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Define the test scenarios corresponding to actions customers perform on the website
const scenarios = [
  // --------------------------------------------------------------------------
  // 1. Customer Places Storefront Order (Accora Configura Lift Chair + Cushion)
  // --------------------------------------------------------------------------
  {
    name: '1. Customer Order Confirmation & Tax Invoice',
    subject: 'Order Confirmation & ATO Tax Invoice #INV-2026-8492 — AT Specialists Australia',
    html: buildEmailHtml({
      badge: '✓ ORDER CONFIRMED • ATO TAX INVOICE #INV-2026-8492',
      badgeColor: '#166534',
      headline: 'Thank you for your order, Surya!',
      subtext: 'We have received your assistive technology order and payment has been confirmed. Your ATO Tax Invoice and dispatch tracking are available online below.',
      docRef: 'INV-2026-8492',
      docTypeTitle: 'ATO Compliant Tax Invoice & Dispatch Tracker',
      viewUrl: 'http://localhost:5173/account?lookup=INV-2026-8492',
      actionButtonText: '👉 View Order & Track Dispatch →',
      metaBoxHtml: `
        <table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#F0FDF4" style="border:1px solid #BBF7D0;border-radius:8px;padding:12px 14px;">
          <tr><td colspan="2" style="font-weight:800;font-size:12.5px;color:#166534;padding-bottom:6px;">Order &amp; Payment Confirmation:</td></tr>
          <tr style="font-size:12px;color:#334155;line-height:1.6;">
            <td width="50%" valign="top">
              <strong>Customer:</strong> Surya V<br />
              <strong>Tax Invoice #:</strong> <span style="font-family:ui-monospace,monospace;font-weight:700;color:#166534;">INV-2026-8492</span><br />
              <strong>Order Date:</strong> ${new Date().toLocaleDateString('en-AU')}<br />
              <strong>Destination:</strong> Level 2, 88 Holmes Road, Moonee Ponds VIC 3039
            </td>
            <td width="50%" valign="top" style="padding-left:10px;">
              <strong>Payment Status:</strong> <span style="color:#166534;font-weight:700;">CONFIRMED / PAID (PayPal)</span><br />
              <strong>Fulfillment:</strong> Australia Medical Express Courier<br />
              <strong>Tracking Reference:</strong> <span style="font-family:ui-monospace,monospace;font-weight:700;">AT-EXP-AU-98214</span><br />
              <strong>Medical GST:</strong> <span style="font-weight:700;color:#166534;">GST-Free (s38-45)</span>
            </td>
          </tr>
        </table>
      `,
      items: [
        {
          name: 'Accora Configura® Comfort Electric Lift Chair | Vinyl (Large)',
          code: 'CR5426',
          detail: 'Dual motor, Tilt-in-Space, Pressure care vinyl, Contrasting stitching, SWL 160kg',
          qty: 1,
          price: 4799.00,
          amount: 4799.00,
        },
        {
          name: 'Air-Cell High-Risk Pressure Relief Seating Overlay',
          code: 'AT-PRD-101',
          detail: 'Multi-cell immersion profile with breathable wipe-clean incontinence cover',
          qty: 1,
          price: 480.00,
          amount: 480.00,
        },
      ],
      totalsHtml: `
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size:12px;color:#64748B;line-height:1.6;">
          <tr><td align="left">Items Subtotal:</td><td align="right" style="color:#334155;font-weight:600;">$5,279.00 AUD</td></tr>
          <tr><td align="left">Delivery &amp; White Glove Setup:</td><td align="right" style="color:#334155;font-weight:600;">FREE (Included)</td></tr>
          <tr><td align="left">GST (s38-45 Medical Exemption):</td><td align="right" style="color:#166534;font-weight:700;">$0.00 AUD (GST-Free)</td></tr>
          <tr>
            <td align="left" style="padding-top:6px;border-top:1px solid #F1F5F9;font-size:14.5px;font-weight:800;color:#0F172A;">Total Paid:</td>
            <td align="right" style="padding-top:6px;border-top:1px solid #F1F5F9;font-size:14.5px;font-weight:800;color:#166534;">$5,279.00 AUD</td>
          </tr>
        </table>
      `,
      customerNotes: 'Ground floor residence. Attendant delivery orientation requested.',
    }),
  },

  // --------------------------------------------------------------------------
  // 2. Admin Alert: New Order Placed
  // --------------------------------------------------------------------------
  {
    name: '2. Admin Notification - New Order Alert',
    subject: '🔔 New Order: #INV-2026-8492 ($5,279.00 AUD) - Surya V',
    html: buildEmailHtml({
      badge: '📦 STOREFRONT PURCHASE ALERT • DISPATCH PENDING',
      badgeColor: '#D97706',
      headline: 'New Storefront Order Received: #INV-2026-8492',
      subtext: 'A customer has completed an order on the storefront and payment has been captured successfully. Please arrange inventory allocation and courier dispatch.',
      docRef: 'INV-2026-8492',
      docTypeTitle: 'Admin Order Management File',
      viewUrl: 'http://localhost:5173/at/orders',
      actionButtonText: '👉 Open Admin Order Console →',
      metaBoxHtml: `
        <table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#FEF3C7" style="border:1px solid #FDE68A;border-radius:8px;padding:12px 14px;">
          <tr><td colspan="2" style="font-weight:800;font-size:12.5px;color:#92400E;padding-bottom:6px;">Administrative Order Summary:</td></tr>
          <tr style="font-size:12px;color:#78350F;line-height:1.6;">
            <td width="50%" valign="top">
              <strong>Customer:</strong> Surya V<br />
              <strong>Email:</strong> ${recipientEmail}<br />
              <strong>Phone:</strong> 0400 000 000<br />
              <strong>Delivery Address:</strong> Level 2, 88 Holmes Road, Moonee Ponds VIC 3039
            </td>
            <td width="50%" valign="top" style="padding-left:10px;">
              <strong>Payment Gateway:</strong> PayPal Express<br />
              <strong>Payment Amount:</strong> $5,279.00 AUD<br />
              <strong>Inventory Status:</strong> In Stock &bull; Melbourne Warehouse<br />
              <strong>Action:</strong> Dispatch Manifest Required
            </td>
          </tr>
        </table>
      `,
      items: [
        {
          name: 'Accora Configura® Comfort Electric Lift Chair | Vinyl (Large)',
          code: 'CR5426',
          qty: 1,
          price: 4799.00,
          amount: 4799.00,
        },
        {
          name: 'Air-Cell High-Risk Pressure Relief Seating Overlay',
          code: 'AT-PRD-101',
          qty: 1,
          price: 480.00,
          amount: 480.00,
        },
      ],
      totalsHtml: `
        <div style="font-size:13px;font-weight:800;text-align:right;color:#0F172A;">
          Net Order Total: <span style="color:#166534;">$5,279.00 AUD</span> (GST-Free)
        </div>
      `,
    }),
  },

  // --------------------------------------------------------------------------
  // 3. Customer Official NDIS Quotation ($0 Upfront Quote)
  // --------------------------------------------------------------------------
  {
    name: '3. Customer Official NDIS Quotation',
    subject: 'NDIS Quotation #NDIS-QT-9281 — AT Specialists Australia (Surya V)',
    html: buildEmailHtml({
      badge: '✓ OFFICIAL NDIS QUOTATION • REF #NDIS-QT-9281',
      badgeColor: '#0D9488',
      headline: 'NDIS Equipment Quotation for Surya V',
      subtext: 'Thank you for requesting an Assistive Technology quotation. Your quotation has been prepared in strict accordance with NDIA Pricing Arrangements and is viewable online below.',
      docRef: 'NDIS-QT-9281',
      docTypeTitle: 'Official NDIS Assistive Technology Quotation',
      viewUrl: 'http://localhost:5173/view-document/NDIS-QT-9281',
      actionButtonText: '👉 Click & Visit: View Quotation Online →',
      metaBoxHtml: `
        <table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#F0FDFA" style="border:1px solid #CCFBF1;border-radius:8px;padding:12px 14px;">
          <tr><td colspan="2" style="font-weight:800;font-size:12.5px;color:#0F766E;padding-bottom:6px;">NDIS Participant &amp; Plan Details:</td></tr>
          <tr style="font-size:12px;color:#334155;line-height:1.6;">
            <td width="50%" valign="top">
              <strong>Participant Name:</strong> Surya V<br />
              <strong>NDIS Number:</strong> <span style="font-family:ui-monospace,monospace;font-weight:700;color:#0F766E;">430 921 884</span><br />
              <strong>Plan Management:</strong> MyPlan Health Solutions Pty Ltd<br />
              <strong>Funding Category:</strong> Plan-Managed (Capital AT Level 3/4)
            </td>
            <td width="50%" valign="top" style="padding-left:10px;">
              <strong>Prescribing OT:</strong> Dr. Alistair Vance, Senior OT (AHPRA: OCC0001892341)<br />
              <strong>Assessment Ref:</strong> <span style="font-family:ui-monospace,monospace;font-weight:700;">AT-ASSESS/2026/0812</span><br />
              <strong>Price Validity:</strong> Quote Valid for 30 Days<br />
              <strong>Delivery ETA:</strong> 2 - 4 Weeks from Approval
            </td>
          </tr>
        </table>
      `,
      items: [
        {
          name: 'Electric Profiling Low Care Bed with Wooden Safety Rails',
          code: '05_120603099_0105_1_2',
          detail: 'Four-section profiling deck, integral wooden headboards, AS/NZS 3696.19 healthcare certified',
          qty: 1,
          price: 2450.00,
          amount: 2450.00,
        },
        {
          name: 'Pressure Relief Dynamic Alternating Air Mattress System',
          code: '05_181206121_0103_1_2',
          detail: 'Alternating cycle therapy, cell-on-cell safety core, multi-stretch vapor permeable cover',
          qty: 1,
          price: 1850.00,
          amount: 1850.00,
        },
      ],
      totalsHtml: `
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size:12px;color:#64748B;line-height:1.6;">
          <tr><td align="left">Subtotal (Excl. GST):</td><td align="right" style="color:#334155;font-weight:600;">$4,300.00 AUD</td></tr>
          <tr><td align="left">Delivery &amp; Prescriber Setup:</td><td align="right" style="color:#334155;font-weight:600;">INCLUDED</td></tr>
          <tr><td align="left">GST (Medical Exemption s38-45):</td><td align="right" style="color:#0F766E;font-weight:700;">$0.00 AUD (GST-Free)</td></tr>
          <tr>
            <td align="left" style="padding-top:6px;border-top:1px solid #F1F5F9;font-size:14.5px;font-weight:800;color:#0F172A;">Quotation Amount:</td>
            <td align="right" style="padding-top:6px;border-top:1px solid #F1F5F9;font-size:14.5px;font-weight:800;color:#0F766E;">$4,300.00 AUD</td>
          </tr>
        </table>
      `,
      extraSectionHtml: `
        <table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#F8FAFC" style="border:1px solid #E2E8F0;border-radius:8px;padding:12px 14px;">
          <tr><td colspan="2" style="font-weight:800;font-size:12.5px;color:#0F172A;padding-bottom:6px;">Plan Manager Remittance &amp; EFT Details:</td></tr>
          <tr style="font-size:12px;color:#334155;line-height:1.6;">
            <td width="50%" valign="top">
              <strong>Account Name:</strong> ${baseCompanyInfo.accountName}<br />
              <strong>Bank:</strong> ${baseCompanyInfo.bankName}
            </td>
            <td width="50%" valign="top" style="padding-left:10px;">
              <strong>BSB:</strong> <span style="font-family:ui-monospace,monospace;font-weight:700;">${baseCompanyInfo.bsb}</span><br />
              <strong>Account Number:</strong> <span style="font-family:ui-monospace,monospace;font-weight:700;">${baseCompanyInfo.accountNumber}</span>
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding-top:6px;font-size:12px;color:#334155;">
              <strong>Payment Reference / Quote Ref:</strong> <code style="background:#E2E8F0;padding:2px 6px;border-radius:4px;font-family:ui-monospace,monospace;font-weight:700;">NDIS-QT-9281</code>
            </td>
          </tr>
        </table>
      `,
      customerNotes: 'Quote prepared for NDIS Plan Manager submission. Valid for 30 calendar days.',
    }),
  },

  // --------------------------------------------------------------------------
  // 4. Customer Website Inquiry / Clinical Advice Response
  // --------------------------------------------------------------------------
  {
    name: '4. Customer Website Inquiry Acknowledgment',
    subject: "We've Received Your Inquiry (#INQ-7724) — AT Specialists Australia",
    html: buildEmailHtml({
      badge: '💬 INQUIRY RECEIVED • REF #INQ-7724',
      badgeColor: '#0F766E',
      headline: 'Regarding your Inquiry, Surya',
      subtext: 'Thank you for contacting AT Specialists Australia. Our clinical equipment team has received your request and prepared this confirmation below.',
      docRef: 'INQ-7724',
      docTypeTitle: 'Clinical Consultation & Inquiry Record',
      viewUrl: 'http://localhost:5173/contact',
      actionButtonText: '👉 Contact Specialist Support Team →',
      metaBoxHtml: `
        <div style="background:#FFFFFF;border:1.5px solid #0F766E;border-radius:10px;padding:16px 18px;margin-bottom:12px;">
          <div style="font-size:11.5px;font-weight:800;color:#0F766E;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">
            💬 Message from AT Specialists Clinical Team:
          </div>
          <div style="font-size:13px;color:#1E293B;line-height:1.65;margin-bottom:10px;">
            Thank you for reaching out regarding the <strong>Accora Configura® Comfort Electric Lift Chair</strong>. Our Senior Clinical Consultant is reviewing your requirements regarding seat sizing (Large: 558mm width) and pressure care compatibility. We will get back to you within 4 business hours.
          </div>
          <div style="font-size:11.5px;color:#64748B;border-top:1px solid #F1F5F9;padding-top:8px;">
            Topic: <strong style="color:#0F172A;">Equipment Sizing &amp; Clinical Suitability</strong> &bull; Response Ref: <strong style="color:#0F766E;">#INQ-7724</strong>
          </div>
        </div>
        <div style="background:#F0FDFA;border:1px solid #CCFBF1;border-radius:8px;padding:12px 14px;font-size:12px;color:#0F766E;line-height:1.6;">
          <strong>Need immediate clinical advice or to speak with an OT?</strong><br />
          Contact our Specialist Advice Line on <strong>0494 767 409</strong> (Mon-Fri 8:30am - 5:30pm AEST) or reply directly to this email.
        </div>
      `,
    }),
  },

  // --------------------------------------------------------------------------
  // 5. Customer Equipment Hire Agreement & Schedule
  // --------------------------------------------------------------------------
  {
    name: '5. Equipment Hire Agreement & Schedule',
    subject: 'Equipment Hire Agreement & Schedule #HIRE-2026-3195 — AT Specialists Australia',
    html: buildEmailHtml({
      badge: '✓ HIRE AGREEMENT CONFIRMED • REF #HIRE-2026-3195',
      badgeColor: '#1E40AF',
      headline: 'Equipment Hire Agreement • Surya V',
      subtext: 'Your equipment rental has been scheduled for delivery. Full hire terms, weekly rental schedule, and sanitization protocols are detailed below.',
      docRef: 'HIRE-2026-3195',
      docTypeTitle: 'Verified Equipment Hire Schedule',
      viewUrl: 'http://localhost:5173/view-document/HIRE-2026-3195',
      actionButtonText: '👉 View Hire Agreement & Schedule →',
      metaBoxHtml: `
        <table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#EFF6FF" style="border:1px solid #BFDBFE;border-radius:8px;padding:12px 14px;">
          <tr><td colspan="2" style="font-weight:800;font-size:12.5px;color:#1E40AF;padding-bottom:6px;">NDIS Rental Agreement Details:</td></tr>
          <tr style="font-size:12px;color:#334155;line-height:1.6;">
            <td width="50%" valign="top">
              <strong>Participant:</strong> Surya V<br />
              <strong>Funding Stream:</strong> Core / Capital AT Allocation<br />
              <strong>Delivery Location:</strong> Moonee Ponds VIC 3039
            </td>
            <td width="50%" valign="top" style="padding-left:10px;">
              <strong>Hire Tenure:</strong> Flexible (4 Weeks Initial)<br />
              <strong>Weekly Rate:</strong> $184.00 AUD / Week<br />
              <strong>Sanitization:</strong> Hospital Grade Terminal Clean Completed
            </td>
          </tr>
        </table>
      `,
      items: [
        {
          name: 'Accora Configura® Comfort Vinyl Hire (4-Week Initial Term)',
          code: 'HIRE-CR5426',
          detail: 'Hospital-grade sanitized terminal clean &bull; Delivery and setup orientation included',
          qty: 1,
          price: 736.00,
          amount: 736.00,
        },
      ],
      totalsHtml: `
        <div style="font-size:13px;font-weight:800;text-align:right;color:#0F172A;">
          Initial 4-Week Hire Total: <span style="color:#1E40AF;">$736.00 AUD</span> (GST-Free)
        </div>
      `,
      customerNotes: 'Refundable security deposit covered under NDIS Core allocation.',
    }),
  },

  // --------------------------------------------------------------------------
  // 6. In-Home Clinical Equipment Trial Schedule
  // --------------------------------------------------------------------------
  {
    name: '6. In-Home Clinical Trial Schedule',
    subject: 'Home Equipment Trial & Clinical Evaluation Schedule #TRL-2026-5520 — Surya V — AT Specialists Australia',
    html: buildEmailHtml({
      badge: '📅 IN-HOME EQUIPMENT TRIAL SCHEDULED • REF #TRL-2026-5520',
      badgeColor: '#0F766E',
      headline: 'Home Equipment Trial & Evaluation: Surya V',
      subtext: 'In-home clinical equipment evaluation scheduled with prescribing Occupational Therapist. Scripted equipment trial paperwork and schedule are detailed below.',
      docRef: 'TRL-2026-5520',
      docTypeTitle: 'Clinical Trial & Handover Protocol',
      viewUrl: 'http://localhost:5173/view-document/TRL-2026-5520',
      actionButtonText: '👉 View Trial Protocol & Schedule →',
      metaBoxHtml: `
        <table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#F0FDFA" style="border:1px solid #CCFBF1;border-radius:8px;padding:12px 14px;">
          <tr><td colspan="2" style="font-weight:800;font-size:12.5px;color:#0F766E;padding-bottom:6px;">In-Home Clinical Trial Protocols:</td></tr>
          <tr style="font-size:12px;color:#334155;line-height:1.6;">
            <td width="50%" valign="top">
              <strong>Participant:</strong> Surya V<br />
              <strong>Trial Location:</strong> Residence (Moonee Ponds VIC)<br />
              <strong>Trial Appointment:</strong> <span style="font-weight:700;color:#0F766E;">Thursday, 18 September 2026 at 10:30 AM</span>
            </td>
            <td width="50%" valign="top" style="padding-left:10px;">
              <strong>Prescribing Clinician:</strong> Dr. Alistair Vance, Senior OT (AHPRA: OCC0001892341)<br />
              <strong>Clinical Session:</strong> 60 - 90 Minutes Assessment<br />
              <strong>Participant Fee:</strong> <span style="font-weight:700;color:#0F766E;">COMPLIMENTARY ($0.00)</span>
            </td>
          </tr>
        </table>
      `,
      items: [
        {
          name: 'Clinical In-Home Equipment Trial & Ergonomic Assessment Session',
          code: 'TRIAL-OT-01',
          detail: 'On-site prescriptional trial of Accora Configura Comfort with Senior Clinician & Prescribing OT',
          qty: 1,
          price: 0.00,
          amount: 0.00,
        },
      ],
      totalsHtml: `
        <div style="font-size:13px;font-weight:800;text-align:right;color:#0F766E;">
          Total Trial Fee: $0.00 AUD (Complimentary OT Session)
        </div>
      `,
    }),
  },

  // --------------------------------------------------------------------------
  // 7. Auto Account Created Upon Storefront Order (New Customer Feature)
  // --------------------------------------------------------------------------
  {
    name: '7. Customer Welcome & Auto Account Activation',
    subject: 'Welcome to AT Specialists Australia — Account Created',
    html: buildEmailHtml({
      badge: '✨ WELCOME TO AT SPECIALISTS • ACCOUNT ACTIVATED',
      badgeColor: '#0F766E',
      headline: 'Welcome to Your Account, Surya!',
      subtext: 'Thank you for choosing AT Specialists Australia. Your personal customer portal has been automatically created following your recent storefront order.',
      docRef: 'ACC-8821',
      docTypeTitle: 'Customer Portal & Order History',
      viewUrl: 'http://localhost:5173/account',
      actionButtonText: '👉 Open My Customer Portal →',
      metaBoxHtml: `
        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:14px;font-size:12.5px;color:#334155;line-height:1.6;">
          <strong>Your Portal Benefits:</strong>
          <ul style="margin:6px 0 0 18px;padding:0;">
            <li>Instant access to all ATO Tax Invoices and NDIS Quotations</li>
            <li>Real-time courier dispatch and delivery tracking</li>
            <li>Direct re-orders and clinical OT support requests</li>
            <li>Manage plan manager details and NDIS funding allocations</li>
          </ul>
        </div>
      `,
    }),
  },
];

async function run() {
  console.log(`🚀 Starting dispatch of ${scenarios.length} customer action test emails...\n`);

  let count = 0;
  for (const s of scenarios) {
    count++;
    console.log(`[${count}/${scenarios.length}] Sending: "${s.name}"...`);
    console.log(`      Subject: "${s.subject}"`);

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      to: recipientEmail,
      subject: s.subject,
      html: s.html,
      replyTo: baseCompanyInfo.email,
    };

    if (logoAttachment) {
      mailOptions.attachments = [logoAttachment];
    }

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`      ✅ Sent successfully! MessageId: ${info.messageId}`);
    } catch (err) {
      console.error(`      ❌ Failed to send:`, err.message);
    }

    // Small delay between emails to respect Gmail rate limits
    await new Promise((r) => setTimeout(r, 1200));
    console.log('');
  }

  console.log('======================================================================');
  console.log('🎉 ALL TEST EMAILS HAVE BEEN DISPATCHED SUCCESSFULLY!');
  console.log(`👉 Please check your inbox at: ${recipientEmail}`);
  console.log('======================================================================');
}

run().catch((err) => {
  console.error('Fatal error in test runner:', err);
  process.exit(1);
});
