/**
 * Email & SMTP Routes — Unified Template & PDF Engine
 * 
 * GET /api/emails/smtp-config → Get active SMTP settings (password masked)
 * POST /api/emails/smtp-config → Update SMTP settings dynamically
 * POST /api/emails/verify-smtp → Test SMTP connection
 * POST /api/emails/send-test → Send diagnostic test email
 * POST /api/emails/dispatch-template → UNIFIED method to dispatch any email & PDF template (Customer & Admin)
 * POST /api/emails/send-invoice → Dispatches Tax Invoice (wraps unified method)
 * POST /api/emails/send-ndis-quote → Dispatches NDIS Quotation (wraps unified method)
 * POST /api/emails/send-template-sample → Dispatches sample template preview to test recipient
 */

import { Router, Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getSmtpConfig,
  updateSmtpConfig,
  verifySmtpConnection,
  sendEmail,
  generateTestEmailHtml,
} from '../services/email.js';
import { requireAdmin } from './auth.js';
import { getStoredSettings } from './settings.js';
import { getDb } from '../db/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// ============================================================================
// 0. PERSISTED DOCUMENT STORE & CACHE FOR ONLINE VIEWING
// ============================================================================

export interface StoredDocument {
  docId: string;
  templateId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: string;
  total?: number | string;
  subtotal?: number | string;
  deliveryFee?: number | string;
  gstTotal?: number | string;
  items?: any[];
  notes?: string;
  extraMeta?: Record<string, any>;
  customSettings?: Record<string, any>;
  filename: string;
  pdfBase64?: string;
  createdAt: string;
}

const DOCUMENTS_FILE = path.resolve(__dirname, '../../data/documents.json');
const savedDocuments = new Map<string, StoredDocument>();

function loadDocumentsFromFile() {
  try {
    if (fs.existsSync(DOCUMENTS_FILE)) {
      const raw = fs.readFileSync(DOCUMENTS_FILE, 'utf-8');
      const list: StoredDocument[] = JSON.parse(raw);
      list.forEach((doc) => {
        if (doc && doc.docId) savedDocuments.set(doc.docId, doc);
      });
    }
  } catch (err) {
    console.warn('⚠️ Could not load saved documents from file:', err);
  }
}

function persistDocumentsToFile() {
  try {
    const list = Array.from(savedDocuments.values()).slice(-300);
    fs.writeFileSync(DOCUMENTS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.warn('⚠️ Could not persist documents to file:', err);
  }
}

loadDocumentsFromFile();

export function saveStoredDocument(doc: StoredDocument) {
  savedDocuments.set(doc.docId, doc);
  persistDocumentsToFile();
}

export function getStoredDocument(docId: string): StoredDocument | null {
  if (savedDocuments.has(docId)) {
    return savedDocuments.get(docId)!;
  }
  const cleanSearch = docId.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [k, v] of savedDocuments.entries()) {
    const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanKey === cleanSearch) {
      return v;
    }
  }
  return null;
}

// ============================================================================
// 1. SMTP CONFIGURATION ROUTES
// ============================================================================

router.get('/smtp-config', requireAdmin, (_req: Request, res: Response) => {
  const config = getSmtpConfig();
  res.json({
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.user,
    passMasked: config.pass ? '••••••••' : '',
    fromName: config.fromName,
    fromEmail: config.fromEmail,
  });
});

router.post('/smtp-config', requireAdmin, (req: Request, res: Response) => {
  try {
    const { host, port, secure, user, pass, fromName, fromEmail } = req.body;

    const updates: any = {};
    if (host !== undefined) updates.host = host;
    if (port !== undefined) updates.port = Number(port);
    if (secure !== undefined) updates.secure = Boolean(secure);
    if (user !== undefined) updates.user = user;
    if (pass !== undefined && pass !== '••••••••' && pass !== '') updates.pass = pass;
    if (fromName !== undefined) updates.fromName = fromName;
    if (fromEmail !== undefined) updates.fromEmail = fromEmail;

    updateSmtpConfig(updates);
    res.json({ success: true, message: 'SMTP configuration updated successfully' });
  } catch (error: any) {
    console.error('SMTP config update error:', error);
    res.status(500).json({ error: 'Failed to update SMTP configuration' });
  }
});

router.post('/verify-smtp', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await verifySmtpConnection();
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/send-test', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { to } = req.body;
    if (!to || !to.includes('@')) {
      res.status(400).json({ error: 'Valid recipient email address is required' });
      return;
    }

    const html = generateTestEmailHtml(to);
    const pdfRes = generateUnifiedPdf({
      templateId: 'order',
      documentId: 'INV/2026/10001',
      customerName: 'Sarah Jenkins',
      customerEmail: to,
      customerPhone: '0412 345 678',
      shippingAddress: '42 Victoria Parade, Fitzroy VIC 3065 Australia',
      total: 1280,
      subtotal: 1163.64,
      gstTotal: 116.36,
      items: [
        { name: 'Air-Cell Pressure Relief Cushion', code: 'EQ-104', quantity: 1, price: 480, amount: 480 },
        { name: 'Ultralight Folding Transport Wheelchair', code: 'EQ-102', quantity: 1, price: 800, amount: 800 },
      ],
    });

    const attachments: Array<{
      filename: string;
      content?: Buffer | string;
      path?: string;
      contentType?: string;
      cid?: string;
    }> = [
      {
        filename: pdfRes.filename,
        content: pdfRes.pdfBuffer,
        contentType: 'application/pdf',
      },
    ];

    const logoAtt = getLogoAttachment();
    if (logoAtt) {
      attachments.push(logoAtt);
    }

    const result = await sendEmail({
      to,
      subject: 'Order Confirmation & Tax Invoice #INV/2026/10001 — AT Specialists Australia',
      html,
      text: 'Order Confirmation & Tax Invoice #INV/2026/10001 from AT Specialists Australia.',
      attachments,
    });

    if (result.success) {
      res.json({ success: true, message: `Order Confirmation & Tax Invoice dispatched to ${to}`, messageId: result.messageId });
    } else {
      res.status(500).json({ error: result.error || 'Failed to dispatch email' });
    }
  } catch (error: any) {
    console.error('Send test email error:', error);
    res.status(500).json({ error: error.message || 'Failed to send test email' });
  }
});

// ============================================================================
// 2. GENERIC VECTOR PDF BUILDER (Compliant %PDF-1.4 Binary Generator)
// ============================================================================

function safeText(value: unknown): string {
  return String(value ?? '-')
    .replace(/•/g, ' | ')
    .replace(/—/g, '-')
    .replace(/–/g, '-')
    .replace(/([\\()])/g, '\\$1')
    .replace(/\r?\n/g, ' ');
}

export function buildPdfStream(meta: {
    companyName: string;
    addressLine1: string;
    addressLine2: string;
    addressCountry: string;
    abn: string;
    phone: string;
    email: string;
    website: string;
    title: string;
    docId: string;
    date: string;
    terms?: string;
    dueDate?: string;
    requiredByDate?: string;
    customerReference?: string;
  },
  parties: {
    billToHeader?: string;
    billToName: string;
    billToDetail?: string;
    shipToHeader?: string;
    shipToAddress?: string;
    shipToPhone?: string;
    badge?: string;
  },
  table: {
    headers: string[];
    rows: Array<{
      code?: string;
      name: string;
      detail?: string;
      qty: number | string;
      price?: number | string;
      gst?: number | string;
      amount?: number | string;
    }>;
  },
  totals: Array<{ label: string; value: string; bold?: boolean }>,
  bankInfo: {
    title: string;
    bankName: string;
    accountName: string;
    bsb: string;
    accountNumber: string;
    reference: string;
    remittanceTitle: string;
    remittanceEmail?: string;
  },
  footerText?: string,
  extraMeta: Record<string, any> = {},
  isQuote = true): Buffer {
  const lines: string[] = [];
  const text = (font: string, size: number, x: number, y: number, value: unknown) => {
    lines.push(`BT /${font} ${size} Tf ${x} ${y} Td (${safeText(value)}) Tj ET`);
  };
  const rule = (x1: number, y: number, x2: number, width = 1) => lines.push(`${width} w ${x1} ${y} m ${x2} ${y} l S`);

  // Top header accent bar (Teal #147A7A: 45 to 550, width 505)
  lines.push('0.08 0.48 0.48 rg 45 802 505 4 re f 0 0 0 rg');

  // Top Header: Provider Branding & Contact
  text('F2', 15, 45, 785, meta.companyName.toUpperCase());
  text('F1', 8.5, 45, 772, 'Assistive Technology & Healthcare Specialists | NDIS Provider');
  text('F1', 8, 45, 761, 'TGA Certified Medical Devices | Australian Standards AS/NZS Compliant');

  text('F2', 9, 360, 785, 'AT Specialists Australia Pty Ltd');
  text('F1', 8, 360, 773, `${meta.addressLine1}, ${meta.addressLine2}`);
  text('F1', 8, 360, 762, `ABN: ${meta.abn} | Phone: ${meta.phone}`);
  text('F1', 8, 360, 751, `Email: ${meta.email} | Web: ${meta.website}`);

  // Divider under header
  rule(45, 742, 550, 1.5);

  // Document Title & Reference
  text('F2', 13, 45, 725, meta.title);
  if (parties.badge) {
    text('F1', 8, 45, 712, parties.badge);
  }

  // Right-aligned reference block
  text('F2', 10, 440, 725, `Ref: #${meta.docId}`);
  text('F1', 8, 440, 712, `Date of Issue: ${meta.date}`);

  // Divider above metadata grid
  rule(45, 700, 550, 0.5);

  // Differentiate document types:
  const docIdUpper = (meta.docId || '').toUpperCase();
  const titleUpper = (meta.title || '').toUpperCase();
  const isCommQuote = !docIdUpper.includes('NDIS') && (docIdUpper.startsWith('QT') || titleUpper.includes('COMMERCIAL') || titleUpper.includes('PRODUCT & EQUIPMENT'));
  const isTrialDoc = docIdUpper.startsWith('TRL') || titleUpper.includes('TRIAL') || titleUpper.includes('EVALUATION');
  const isHireDoc = docIdUpper.startsWith('HIRE') || docIdUpper.startsWith('HIR') || titleUpper.includes('HIRE') || titleUpper.includes('RENTAL');
  const isOrderDoc = docIdUpper.startsWith('INV') || docIdUpper.startsWith('ORD') || titleUpper.includes('TAX INVOICE');
  const isNdisDoc = docIdUpper.includes('NDIS') || titleUpper.includes('NDIS');

  // Metadata 2-Column Grid (y: 690 to 610)
  // Left Box: Customer / Participant Record (x: 45 to 290, width 245)
  lines.push('0.97 0.98 0.99 rg 45 610 245 82 re f 0.8 0.85 0.9 RG 45 610 245 82 re s 0 0 0 rg');
  const leftHeader = isCommQuote
    ? 'QUOTATION PREPARED FOR:'
    : isTrialDoc
    ? 'TRIAL PARTICIPANT & RESIDENCE:'
    : isHireDoc
    ? 'HIRER / PATIENT DETAILS:'
    : isOrderDoc
    ? 'BILLED TO (CUSTOMER / ENTITY):'
    : (parties.billToHeader || 'NDIS PARTICIPANT DETAILS:');

  text('F2', 8.5, 52, 680, leftHeader);
  text('F2', 9.5, 52, 666, parties.billToName);
  if (isNdisDoc && extraMeta.ndisNumber) {
    text('F2', 8, 52, 653, `NDIS Participant #: ${extraMeta.ndisNumber}`);
  } else if (extraMeta.customerCompany) {
    text('F1', 8, 52, 653, String(extraMeta.customerCompany).slice(0, 36));
  } else if (extraMeta.ndisNumber) {
    text('F2', 8, 52, 653, `Client Ref #: ${extraMeta.ndisNumber}`);
  } else if (parties.billToDetail && !parties.billToDetail.includes('@')) {
    text('F1', 8, 52, 653, parties.billToDetail.slice(0, 36));
  } else {
    text('F1', 8, 52, 653, 'Client Healthcare Account On File');
  }
  text('F1', 8, 52, 641, `Delivery: ${(parties.shipToAddress || 'On File / Site Delivery').slice(0, 36)}`);
  text('F1', 8, 52, 629, `Phone: ${parties.shipToPhone || '0412 345 678'}`);
  if (extraMeta.participantDob) {
    text('F1', 8, 52, 617, `DOB: ${extraMeta.participantDob}`);
  } else if (parties.billToDetail && parties.billToDetail.includes('@')) {
    text('F1', 8, 52, 617, parties.billToDetail.slice(0, 36));
  }

  // Right Box: Terms, Prescriber & Delivery ETA (x: 305 to 550, width 245)
  lines.push('0.97 0.98 0.99 rg 305 610 245 82 re f 0.8 0.85 0.9 RG 305 610 245 82 re s 0 0 0 rg');
  if (isCommQuote) {
    text('F2', 8.5, 312, 680, 'QUOTATION TERMS & VALIDITY:');
    text('F2', 9.5, 312, 666, 'Commercial Healthcare Supply');
    text('F1', 8, 312, 653, `Validity: ${(meta.terms || '30 Days Validity from Issue').slice(0, 32)}`);
    text('F1', 8, 312, 641, `Delivery ETA: ${(meta.dueDate || '5 - 10 Business Days').slice(0, 32)}`);
    text('F1', 8, 312, 629, 'Freight: Standard Healthcare Logistics');
    text('F1', 8, 312, 617, `Remittance: ${meta.email}`);
  } else if (isTrialDoc) {
    text('F2', 8.5, 312, 680, 'CLINICAL EVALUATION SCHEDULE:');
    text('F2', 9.5, 312, 666, 'In-Home Clinical Equipment Trial');
    text('F1', 8, 312, 653, `Trial Session: ${(extraMeta.trialDate || meta.terms || 'Scheduled Session').slice(0, 32)}`);
    text('F1', 8, 312, 641, `Clinician: ${(extraMeta.prescribingClinician || 'Senior Clinical OT').slice(0, 32)}`);
    text('F1', 8, 312, 629, 'Trial Fee: COMPLIMENTARY ($0.00)');
    text('F1', 8, 312, 617, 'Setup & Calibration: INCLUDED');
  } else if (isHireDoc) {
    text('F2', 8.5, 312, 680, 'EQUIPMENT HIRE SCHEDULE & TENURE:');
    text('F2', 9.5, 312, 666, extraMeta.hireLocationType === 'hospital' ? 'Hospital Inpatient Handover' : 'Residential Equipment Hire');
    text('F1', 8, 312, 653, `Start Date: ${(extraMeta.hireStartDate || meta.terms || 'Immediate Dispatch').slice(0, 32)}`);
    text('F1', 8, 312, 641, `Est. Return Due: ${(extraMeta.hireReturnDate || meta.dueDate || 'Ongoing Weekly Rental').slice(0, 32)}`);
    if (extraMeta.hireFacilityName) {
      text('F1', 7.5, 312, 629, `Facility: ${String(extraMeta.hireFacilityName).slice(0, 20)} W:${String(extraMeta.hireFacilityWard || '-').slice(0, 6)}`);
    } else {
      text('F1', 8, 312, 629, 'Ongoing Rental: Weekly until collection booked');
    }
    text('F2', 7.5, 312, 617, '100% Purchase Credit Rebate (up to 4wks)');
  } else if (isOrderDoc) {
    text('F2', 8.5, 312, 680, 'PAYMENT & INVOICE TERMS:');
    text('F2', 9.5, 312, 666, 'Payment Confirmed & Processed');
    text('F1', 8, 312, 653, `Terms: ${(meta.terms || 'Strictly 14 Days Net').slice(0, 32)}`);
    text('F1', 8, 312, 641, `Due Date: ${(meta.dueDate || 'Within 14 Days').slice(0, 32)}`);
    text('F1', 8, 312, 629, 'Payment Method: EFT / Direct Deposit');
    text('F1', 8, 312, 617, `Remittance Advice: ${meta.email}`);
  } else {
    // Default / NDIS
    text('F2', 8.5, 312, 680, parties.shipToHeader || 'PLAN MANAGEMENT & PRESCRIBER:');
    text('F2', 9.5, 312, 666, (extraMeta.planManager || extraMeta.customerCompany || 'Plan-Managed').slice(0, 34));
    if (extraMeta.prescribingClinician) {
      text('F1', 8, 312, 653, `Prescriber: ${String(extraMeta.prescribingClinician).slice(0, 32)}`);
    } else {
      text('F1', 8, 312, 653, `Funding: ${extraMeta.planType || 'NDIS Capital / Core AT'}`);
    }
    if (extraMeta.assessmentRef) {
      text('F1', 8, 312, 641, `Assessment Ref: ${String(extraMeta.assessmentRef).slice(0, 30)}`);
    } else {
      text('F1', 8, 312, 641, `Quote Validity: ${(meta.terms || '30 Days Validity').slice(0, 30)}`);
    }
    text('F1', 8, 312, 629, `Terms: ${(meta.terms || '30 Days Validity').slice(0, 32)}`);
    text('F1', 8, 312, 617, `Delivery ETA: ${(meta.dueDate || '2 - 4 Weeks').slice(0, 32)}`);
  }

  // Table Header Bar (Teal #147A7A background)
  lines.push('0.08 0.48 0.48 rg 45 580 505 18 re f 1 1 1 rg');
  text('F2', 8, 52, 585, table.headers[0] || 'Support Item Code');
  text('F2', 8, 175, 585, table.headers[1] || 'Equipment Description & Technical Specs');
  text('F2', 8, 375, 585, 'Qty');
  text('F2', 8, 410, 585, 'Unit Rate');
  text('F2', 8, 465, 585, 'GST');
  text('F2', 8, 505, 585, 'Line Total');
  lines.push('0 0 0 rg');

  // Table Rows (Safe layout with 0 overlapping)
  const rows = table.rows.slice(0, 5);
  let curTableY = 560;

  rows.forEach((row) => {
    const codeStr = (row.code || '-').slice(0, 24);
    const nameStr = (row.name || '-').slice(0, 46);
    const detail = row.detail || '';
    let detailLines: string[] = [];
    if (detail) {
      if (detail.length <= 48) {
        detailLines = [detail];
      } else {
        const splitIdx = detail.lastIndexOf(' • ', 50) !== -1 
          ? detail.lastIndexOf(' • ', 50) 
          : (detail.lastIndexOf(', ', 50) !== -1 ? detail.lastIndexOf(', ', 50) : 48);
        detailLines = [
          detail.slice(0, splitIdx).trim(),
          detail.slice(splitIdx).replace(/^[•,\s]+/, '').slice(0, 52).trim()
        ].filter(Boolean);
      }
    }

    text('F2', 8, 52, curTableY, codeStr);
    text('F2', 8.5, 175, curTableY, nameStr);
    if (detailLines.length > 0) {
      text('F1', 7.5, 175, curTableY - 9, detailLines[0]);
      if (detailLines[1]) {
        text('F1', 7.0, 175, curTableY - 17, detailLines[1]);
      }
    }
    text('F1', 8.5, 380, curTableY, String(row.qty ?? 1));
    text('F1', 8.5, 410, curTableY, row.price ? (typeof row.price === 'number' ? `$${row.price.toFixed(2)}` : String(row.price)) : '—');
    text('F1', 8, 465, curTableY, 'GST-Free');
    text('F2', 8.5, 505, curTableY, row.amount ? (typeof row.amount === 'number' ? `$${row.amount.toFixed(2)}` : String(row.amount)) : '—');

    const rowHeight = detailLines.length > 1 ? 28 : (detailLines.length === 1 ? 22 : 18);
    rule(45, curTableY - (detailLines.length > 1 ? 20 : (detailLines.length === 1 ? 12 : 6)), 550, 0.5);
    curTableY -= rowHeight;
  });

  // GST Statutory Notice & Totals Section
  const totalsY = Math.min(curTableY - 10, 440);

  // Left: GST Notice Box (x: 45 to 280)
  text('F2', 8, 45, totalsY, 'STATUTORY GST EXEMPTION NOTICE:');
  text('F1', 7.5, 45, totalsY - 11, 'Medical Aids & Appliances are GST-Free under Section 38-45 of');
  text('F1', 7.5, 45, totalsY - 21, 'A New Tax System (Goods and Services Tax) Act 1999.');
  text('F1', 7.5, 45, totalsY - 31, 'NDIS Provider | PACE Compliant Claim');

  // Right: Totals (x: 295 to 550) — 170pt width, zero overlap
  let tY = totalsY;
  totals.forEach((tot) => {
    if (tot.bold) {
      rule(295, tY + 10, 550, 1.5);
      text('F2', 9.5, 295, tY, tot.label);
      text('F2', 9.5, 465, tY, tot.value);
    } else {
      text('F1', 8.5, 295, tY, tot.label);
      text('F1', 8.5, 465, tY, tot.value);
    }
    tY -= 15;
  });

  // Perforated Cut Line
  lines.push('[3 3] 0 d 0.5 w 45 320 m 550 320 l S [] 0 d');
  text('F2', 7.5, 120, 324, '-- PLEASE DETACH AND RETURN (QUOTATION ACCEPTANCE / EFT REMITTANCE) --');

  if (isCommQuote) {
    // Commercial Purchase Acceptance & Order Authorization
    lines.push('0.98 0.98 0.99 rg 45 160 505 145 re f 0.8 0.85 0.9 RG 45 160 505 145 re s 0 0 0 rg');
    text('F2', 9, 55, 290, 'COMMERCIAL PURCHASE ACCEPTANCE & ORDER AUTHORIZATION');
    text('F2', 8.5, 360, 290, `Ref: #${meta.docId} | Total: ${totals[totals.length - 1]?.value || '$0.00'}`);

    // Col 1: Purchase Order & Organization
    text('F2', 8, 55, 270, '1. Purchase Order & Authorization:');
    text('F1', 7.5, 55, 255, 'PO Number: ________________________');
    text('F1', 7.5, 55, 240, 'Authorized Name: ___________________');
    rule(55, 195, 200, 0.5);
    text('F1', 7, 55, 183, 'Authorized Officer Signature & Date');

    // Col 2: Invoicing & Delivery
    text('F2', 8, 220, 270, '2. Invoicing & Delivery Contact:');
    text('F1', 7.5, 220, 255, `Accounts Email: ${meta.email}`);
    text('F1', 7.5, 220, 240, 'Payment Terms: Strictly 30 Days Net');
    rule(220, 195, 365, 0.5);
    text('F1', 7, 220, 183, 'Receiving / Procurement Sign-off');

    // Col 3: Remittance & Banking
    text('F2', 8, 385, 270, '3. Direct EFT Banking Details:');
    text('F1', 7.5, 385, 255, `Bank: ${bankInfo.bankName}`);
    text('F1', 7.5, 385, 243, `BSB: ${bankInfo.bsb} | Acc: ${bankInfo.accountNumber}`);
    text('F1', 7.5, 385, 231, `Ref: Quote #${meta.docId}`);
    text('F2', 8, 385, 195, 'Commercial Supply Verified [X]');
    text('F1', 7, 385, 183, 'AS/NZS Standards Medical Device');
  } else if (isTrialDoc) {
    // Clinical Trial Handover & OT Sign-off
    lines.push('0.98 0.98 0.99 rg 45 160 505 145 re f 0.8 0.85 0.9 RG 45 160 505 145 re s 0 0 0 rg');
    text('F2', 9, 55, 290, 'CLINICAL TRIAL HANDOVER & OT EVALUATION SIGN-OFF');
    text('F2', 8.5, 360, 290, `Ref: #${meta.docId} | Evaluation Fee: COMPLIMENTARY`);

    // Col 1: Participant Acknowledgment
    text('F2', 8, 55, 270, '1. Participant / Carer Handover:');
    text('F1', 7.5, 55, 255, 'Equipment received in safe clinical condition.');
    rule(55, 195, 200, 0.5);
    text('F1', 7, 55, 183, 'Participant / Nominee Signature & Date');

    // Col 2: Clinician Assessment
    text('F2', 8, 220, 270, '2. Prescribing Clinician / OT Sign-off:');
    text('F1', 7.5, 220, 255, (extraMeta.prescribingClinician || 'Prescribing Occupational Therapist').slice(0, 32));
    rule(220, 195, 365, 0.5);
    text('F1', 7, 220, 183, 'Clinician Signature & AHPRA Reg');

    // Col 3: Setup & Verification
    text('F2', 8, 385, 270, '3. Equipment Safety & Calibration:');
    text('F1', 7.5, 385, 255, 'Technician Setup Verified [X]');
    text('F1', 7.5, 385, 243, 'Emergency Lowering / Battery Tested [X]');
    text('F1', 7.5, 385, 231, 'Client User Guidance Completed [X]');
    text('F2', 8, 385, 195, 'Trial Registered [X]');
    text('F1', 7, 385, 183, 'AT Specialists Clinical Support Team');
  } else if (isHireDoc) {
    // Rehab Hire Model: Equipment Hire Authorization & 100% Rebate Schedule
    lines.push('0.98 0.98 0.99 rg 45 160 505 145 re f 0.8 0.85 0.9 RG 45 160 505 145 re s 0 0 0 rg');
    text('F2', 9, 55, 290, 'EQUIPMENT HIRE AUTHORIZATION & REBATE SCHEDULE');
    text('F2', 8.5, 330, 290, `Ref: #${meta.docId} | Initial Total: ${totals[totals.length - 1]?.value || '$0.00'}`);

    // Col 1: Hirer Acceptance
    text('F2', 8, 55, 272, '1. Hirer / Carer Agreement:');
    text('F1', 7.5, 55, 260, 'I agree to 2-week min & ongoing rental.');
    rule(55, 195, 200, 0.5);
    text('F1', 7, 55, 183, 'Hirer Signature & Date');

    // Col 2: Hospital / Facility or Delivery Handover
    text('F2', 8, 220, 272, '2. Delivery & Return Handover:');
    if (extraMeta.hireLocationType === 'hospital') {
      text('F1', 7.5, 220, 260, `Facility: ${(extraMeta.hireFacilityName || 'Hospital').slice(0, 22)}`);
      text('F1', 7.5, 220, 248, `Ward/Room: ${(extraMeta.hireFacilityWard || '')} ${(extraMeta.hireFacilityRoom || '')}`.slice(0, 22));
    } else {
      text('F1', 7.5, 220, 260, 'Private Residence Delivery');
      text('F1', 7.5, 220, 248, 'Free sanitized collection upon request');
    }
    rule(220, 195, 365, 0.5);
    text('F1', 7, 220, 183, 'Delivery Driver / Staff Handover');

    // Col 3: Rehab Hire 100% Rebate Clause & Payment
    text('F2', 8, 385, 272, '3. 100% Purchase Credit Rebate:');
    text('F1', 7.5, 385, 260, '100% hire fee (up to 4 wks) credited');
    text('F1', 7.5, 385, 248, 'if purchased outright during hire.');
    text('F2', 7.5, 385, 225, `EFT: BSB ${bankInfo.bsb} Acc ${bankInfo.accountNumber}`);
    text('F1', 7, 385, 213, `Ref: ${meta.docId}`);
    text('F2', 8, 385, 195, 'Rental Agreement Active [X]');
    text('F1', 7, 385, 183, 'AT Specialists Hire Fleet Service');
  } else if (isNdisDoc || isQuote) {
    // 3-Part NDIS Quotation Acceptance Slip
    lines.push('0.98 0.98 0.99 rg 45 160 505 145 re f 0.8 0.85 0.9 RG 45 160 505 145 re s 0 0 0 rg');
    text('F2', 9, 55, 290, 'QUOTATION ACCEPTANCE & CLINICAL SERVICE AUTHORIZATION');
    text('F2', 8.5, 360, 290, `Ref: #${meta.docId} | Total: ${totals[totals.length - 1]?.value || '$0.00'}`);

    // Col 1: Participant Approval
    text('F2', 8, 55, 272, '1. Participant Approval:');
    text('F1', 7.5, 55, 260, 'I approve supply of the quoted equipment.');
    rule(55, 195, 200, 0.5);
    text('F1', 7, 55, 183, 'Participant Signature & Date');

    // Col 2: Plan Manager Sign-off
    text('F2', 8, 220, 272, '2. Plan Manager Sign-off:');
    text('F1', 7.5, 220, 260, 'PO / Service Booking #: ______________');
    rule(220, 195, 365, 0.5);
    text('F1', 7, 220, 183, 'Plan Manager Signature & Date');

    // Col 3: Prescribing Clinician
    text('F2', 8, 385, 272, '3. Prescribing Clinician / OT:');
    text('F2', 8, 385, 260, (extraMeta.prescribingClinician || 'Dr. Alistair Vance, Senior OT').slice(0, 36));
    text('F1', 7.5, 385, 248, extraMeta.clinicianAhpra || 'AHPRA: OCC0001892341');
    text('F2', 8, 385, 195, 'Clinically Verified [X]');
    text('F1', 7, 385, 183, 'Clinical Setup Authorized');
  } else {
    // Direct EFT Remittance Advice Slip (Orders / Invoices / Hire)
    lines.push('0.98 0.98 0.99 rg 45 160 505 145 re f 0.8 0.85 0.9 RG 45 160 505 145 re s 0 0 0 rg');
    text('F2', 9, 55, 290, 'DIRECT BANK TRANSFER (EFT) REMITTANCE ADVICE SLIP');
    text('F2', 8.5, 360, 290, `Ref: #${meta.docId} | Total: ${totals[totals.length - 1]?.value || '$0.00'}`);

    // Col 1: Banking Details
    text('F2', 8.5, 55, 270, 'Bank Deposit (EFT) Account:');
    text('F1', 8, 55, 255, `Bank: ${bankInfo.bankName}`);
    text('F1', 8, 55, 241, `Account Name: ${bankInfo.accountName}`);
    text('F2', 8.5, 55, 227, `BSB Code: ${bankInfo.bsb}`);
    text('F2', 8.5, 55, 213, `Account Number: ${bankInfo.accountNumber}`);
    text('F2', 8.5, 55, 199, `Payment Reference: ${meta.docId}`);

    // Col 2: Remittance Guidance
    text('F2', 8.5, 290, 270, 'Remittance & PACE Inquiries:');
    text('F1', 8, 290, 255, `Email remittance advice to: ${meta.email}`);
    text('F1', 8, 290, 241, `Claims department phone: ${meta.phone}`);
    text('F1', 8, 290, 227, 'NDIS Provider | PACE Claim');
    text('F1', 8, 290, 213, 'Payment Terms: Strictly 14 Days Net');
    text('F1', 7.5, 290, 199, `Quote invoice reference #${meta.docId} on bank transfer.`);
  }

  // Footer (y: 65 to 45)
  rule(45, 75, 550, 0.5);
  text('F1', 7.5, 45, 62, 'NDIS Provider | Assistive Technology & Clinical Solutions');
  text('F1', 7, 45, 51, `https://${meta.website} | ABN: ${meta.abn} | Accounts: ${meta.email} | Phone: ${meta.phone}`);
  text('F1', 7, 505, 51, 'Page 1 of 1');

  const stream = lines.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'utf-8');
}

// ============================================================================
// 3. UNIFIED PDF GENERATOR (Supports all 7 Templates)
// ============================================================================

function extractItemDetail(it: any): string {
  let extrasStr = '';
  let extrasList: any[] = [];
  if (Array.isArray(it.selectedExtras) && it.selectedExtras.length > 0) {
    extrasList = it.selectedExtras;
  } else if (typeof it.selected_extras === 'string' && it.selected_extras.startsWith('[')) {
    try { extrasList = JSON.parse(it.selected_extras); } catch {}
  } else if (Array.isArray(it.selected_extras)) {
    extrasList = it.selected_extras;
  } else if (Array.isArray(it.extras)) {
    extrasList = it.extras;
  }

  if (extrasList.length > 0) {
    extrasStr = extrasList.map((e: any) => `+ ${e.name || e.title || 'Extra'} ($${Number(e.price || 0).toFixed(2)})`).join(', ');
  }

  let detail = it.detail || (it.selectedSize ? `Size: ${it.selectedSize}` : '') || '';
  if (extrasStr && !detail.includes('Extras:') && !detail.includes(extrasList[0]?.name)) {
    detail = detail ? `${detail} • Extras: ${extrasStr}` : `Extras: ${extrasStr}`;
  }
  return detail;
}

export function generateUnifiedPdf(params: {
  templateId: string;
  documentId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  shippingAddress?: string;
  total?: number | string;
  subtotal?: number | string;
  deliveryFee?: number | string;
  gstTotal?: number | string;
  items?: any[];
  date?: string;
  notes?: string;
  extraMeta?: Record<string, any>;
  customSettings?: Record<string, any>;
}): { pdfBuffer: Buffer; filename: string } {
  const invSettings = getStoredSettings('invoice_settings') || {};
  const s = {...invSettings,...(params.customSettings || {}) };

  const companyName = s.companyName || 'AT Specialists Australia Pty Ltd';
  const abn = s.abn || '48 123 456 789';
  const addressLine1 = s.addressLine1 || 'Level 2, 88 Holmes Road';
  const addressLine2 = s.addressLine2 || 'Moonee Ponds VIC 3039';
  const addressCountry = s.addressCountry || 'Australia';
  const phone = s.phone || '0494 767 409';
  const email = s.email || 'payments@atspecialists.com.au';
  const website = s.website || 'atspecialists.com.au';
  const bankTitle = s.bankTitle || 'Direct Bank Transfer (EFT) Details:';
  const bankName = s.bankName || 'Commonwealth Bank of Australia (CBA)';
  const accountName = s.accountName || 'AT Specialists Australia Pty Ltd';
  const bsb = s.bsb || '063-000';
  const accountNumber = s.accountNumber || '1088 4422';
  const remittanceTitle = s.remittanceTitle || 'Remittance & Accounts:';

  const docId = params.documentId || 'ATS-DOC-1001';
  const cleanId = docId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dStr = params.date || new Date().toLocaleDateString('en-AU');
  const customerName = params.customerName || 'Valued Client';
  const customerEmail = params.customerEmail || '';
  const customerPhone = params.customerPhone || '';
  const shippingAddress = params.shippingAddress || '';
  const computedItemsSubtotal = Array.isArray(params.items) && params.items.length > 0
    ? params.items.reduce((s: number, it: any) => s + Number(it.amount !== undefined ? it.amount : (Number(it.price || 0) * Number(it.quantity || 1))), 0)
    : 0;

  const deliveryAmount = Number(params.deliveryFee || 0);
  const taxAmount = Number(params.gstTotal !== undefined ? params.gstTotal : 0);

  const subtotalAmount = (params.subtotal !== undefined && params.subtotal !== null && !isNaN(Number(params.subtotal)) && Number(params.subtotal) > 0 && (computedItemsSubtotal === 0 || Math.abs(Number(params.subtotal) - computedItemsSubtotal) < 0.01))
    ? Number(params.subtotal)
    : (computedItemsSubtotal > 0 ? computedItemsSubtotal : Number(params.total || 0));

  const totalAmount = (params.total !== undefined && params.total !== null && !isNaN(Number(params.total)) && Number(params.total) > 0 && (computedItemsSubtotal === 0 || Math.abs(Number(params.total) - (subtotalAmount + deliveryAmount + taxAmount)) < 0.01))
    ? Number(params.total)
    : (subtotalAmount + deliveryAmount + taxAmount);

  const tId = (params.templateId || 'order').toLowerCase();

  let title = 'TAX INVOICE';
  let badge = 'ORDER CONFIRMED • PAID IN FULL';
  let filename = `Tax-Invoice-${cleanId}.pdf`;
  let billToHeader = 'Bill To (Customer):';
  let shipToHeader = 'Ship To (Delivery Destination):';
  let terms = s.terms || 'Net 14 Days';
  let dueDate = s.dueDate || 'Within 14 Days';

  let headers = ['Code', 'Item Description', 'Qty', 'Unit Price', 'GST', 'Total'];
  let rows: Array<{ code?: string; name: string; qty: any; price?: any; gst?: any; amount?: any }> = [];
  let totals: Array<{ label: string; value: string; bold?: boolean }> = [];

  if (tId === 'order') {
    title = 'TAX INVOICE';
    badge = 'ORDER CONFIRMED • PAID IN FULL';
    filename = `Tax-Invoice-${cleanId}.pdf`;
    billToHeader = 'Bill To (Purchaser):';
    shipToHeader = 'Ship To (Prescribed Address):';
    headers = ['Code', 'Equipment Description', 'Qty', 'Unit Price', 'GST', 'Total'];

    const itemsList = Array.isArray(params.items) && params.items.length > 0
      ? params.items
      : [
          { code: 'EQ-104', name: 'Air-Cell Pressure Relief Cushion', quantity: 1, price: 480, amount: 480 },
          { code: 'EQ-102', name: 'Ultralight Folding Transport Wheelchair', quantity: 1, price: 800, amount: 800 },
        ];

    rows = itemsList.map((it: any) => ({
      code: it.code || it.sku || it.productId || it.id || 'AT-EQ',
      name: it.name || 'Assistive Equipment',
      detail: extractItemDetail(it),
      qty: it.quantity || it.qty || 1,
      price: Number(it.price || 0),
      gst: Number(it.gst || 0),
      amount: Number(it.amount !== undefined ? it.amount : (Number(it.price || 0) * Number(it.quantity || it.qty || 1))),
    }));

    totals = [
      { label: 'Subtotal (Excl. GST):', value: `$${subtotalAmount.toFixed(2)} AUD` },
      { label: 'Freight / Delivery:', value: deliveryAmount > 0 ? `$${deliveryAmount.toFixed(2)} AUD` : 'FREE' },
      { label: 'GST (10% / Exemption):', value: `$${taxAmount.toFixed(2)} AUD` },
      { label: 'Total Amount (Paid):', value: `$${totalAmount.toFixed(2)} AUD`, bold: true },
    ];
  } else if (tId === 'hosp_public' || tId === 'hospital_public') {
    title = 'TAX INVOICE & CLINICAL DISCHARGE EQUIPMENT SCHEDULE';
    badge = 'VIC HEALTH CLINICAL NETWORK • PROVIDER #4920188A • NSQHS CERTIFIED';
    filename = `Hospital-Tax-Invoice-Alfred-RMH-${cleanId}.pdf`;
    billToHeader = 'Hospital Patient & Unit Record (U.R.):';
    shipToHeader = 'NDIA Plan Manager / Remittance Entity:';
    terms = 'Strictly 14 Days Net (Hospital Remittance)';
    dueDate = '14 Days from Discharge';
    headers = ['MBS / NDIS Code', 'Clinical Description & TGA Specification', 'Qty', 'Unit Rate', 'GST', 'Total Amount'];

    const itemsList = Array.isArray(params.items) && params.items.length > 0
      ? params.items
      : [
          { code: '05_120603099_0105_1_2', name: 'Rebound Therapy Tilt-in-Space Wheelchair (Custom Contoured Lateral Supports)', quantity: 1, price: totalAmount, amount: totalAmount },
        ];

    rows = itemsList.map((it: any) => ({
      code: it.code || it.sku || it.productId || it.id || '05_120603099_0105_1_2',
      name: it.name || 'Hospital Prescribed Clinical Equipment',
      detail: it.detail || '',
      qty: it.quantity || it.qty || 1,
      price: Number(it.price || 0),
      gst: 'GST-Free (s38-45)',
      amount: Number(it.amount !== undefined ? it.amount : (Number(it.price || 0) * Number(it.quantity || it.qty || 1))),
    }));

    totals = [
      { label: 'Hospital Equipment Subtotal:', value: `$${subtotalAmount.toFixed(2)} AUD` },
      { label: 'Clinical Setup & OT Fitting:', value: deliveryAmount > 0 ? `$${deliveryAmount.toFixed(2)} AUD` : 'INCLUDED' },
      { label: 'GST (Section 38-45 Medical Exemption):', value: '$0.00 AUD (GST-Free)' },
      { label: 'Total Hospital Claim Amount:', value: `$${totalAmount.toFixed(2)} AUD`, bold: true },
    ];
  } else if (tId === 'product_quote' || tId === 'quote') {
    title = 'PRODUCT & EQUIPMENT QUOTATION';
    badge = 'COMMERCIAL QUOTATION • VALID 30 DAYS • ABN 48 123 456 789';
    filename = `Product-Quotation-${cleanId}.pdf`;
    billToHeader = 'Quotation Prepared For:';
    shipToHeader = 'Delivery Destination / Site Address:';
    terms = 'Quotation Valid for 30 Days from Issue';
    dueDate = 'Lead Time: 5 - 10 Business Days from Order';
    headers = ['Item Code / SKU', 'Product & Technical Specification', 'Qty', 'Unit Rate', 'GST', 'Line Total'];

    const itemsList = Array.isArray(params.items) && params.items.length > 0
      ? params.items
      : [
          { code: 'AT-EQ-100', name: 'Assistive Technology Equipment Item', quantity: 1, price: totalAmount, amount: totalAmount },
        ];

    rows = itemsList.map((it: any) => ({
      code: it.code || it.sku || it.productId || it.id || 'AT-SKU',
      name: it.name || 'Commercial Product Item',
      detail: it.detail || '',
      qty: it.quantity || it.qty || 1,
      price: Number(it.price || 0),
      gst: 'GST-Free',
      amount: Number(it.amount !== undefined ? it.amount : (Number(it.price || 0) * Number(it.quantity || it.qty || 1))),
    }));

    totals = [
      { label: 'Subtotal (Excl. GST):', value: `$${subtotalAmount.toFixed(2)} AUD` },
      { label: 'Delivery & Handling Freight:', value: deliveryAmount > 0 ? `$${deliveryAmount.toFixed(2)} AUD` : 'INCLUDED' },
      { label: 'GST (Medical Exemption s38-45):', value: '$0.00 AUD (GST-Free)' },
      { label: 'Total Quotation Value:', value: `$${totalAmount.toFixed(2)} AUD`, bold: true },
    ];
  } else if (tId === 'product_buy' || tId === 'order_invoice') {
    title = 'TAX INVOICE & ORDER CONFIRMATION';
    badge = 'STOREFRONT PURCHASE • PAYMENT CONFIRMED • ABN 48 123 456 789';
    filename = `Tax-Invoice-Order-${cleanId}.pdf`;
    billToHeader = 'Billed To (Customer):';
    shipToHeader = 'Shipping Destination:';
    terms = 'Paid in Full via Website Checkout / Direct Remittance';
    dueDate = 'Status: Confirmed & Dispatched';
    headers = ['SKU / Code', 'Purchased Product Item', 'Qty', 'Unit Price', 'GST', 'Total (AUD)'];

    const itemsList = Array.isArray(params.items) && params.items.length > 0
      ? params.items
      : [
          { code: 'AT-ORD-01', name: 'Storefront Purchased Assistive Product', quantity: 1, price: totalAmount, amount: totalAmount },
        ];

    rows = itemsList.map((it: any) => ({
      code: it.code || it.sku || it.productId || it.id || 'PRD-ITEM',
      name: it.name || 'Purchased Product',
      detail: it.detail || (it.selectedSize ? `Size: ${it.selectedSize}` : '') || '',
      qty: it.quantity || it.qty || 1,
      price: Number(it.price || 0),
      gst: 'GST-Free',
      amount: Number(it.amount !== undefined ? it.amount : (Number(it.price || 0) * Number(it.quantity || it.qty || 1))),
    }));

    totals = [
      { label: 'Purchased Items Subtotal:', value: `$${subtotalAmount.toFixed(2)} AUD` },
      { label: 'Shipping & Delivery:', value: deliveryAmount > 0 ? `$${deliveryAmount.toFixed(2)} AUD` : 'FREE' },
      { label: 'GST (Section 38-45 Medical Exemption):', value: '$0.00 AUD (GST-Free)' },
      { label: 'Total Amount Paid:', value: `$${totalAmount.toFixed(2)} AUD`, bold: true },
    ];
  } else if (tId === 'customer_request') {
    title = 'WEBSITE CUSTOMER REQUEST & QUOTATION SUMMARY';
    badge = 'WEBSITE INQUIRY & QUOTE REQUEST • 4-HOUR RESPONSE GUARANTEE';
    filename = `Customer-Request-Summary-${cleanId}.pdf`;
    billToHeader = 'Requesting Customer Profile:';
    shipToHeader = 'Delivery / Contact Address:';
    terms = 'Inquiry Registered via Website';
    dueDate = 'Clinical Review: Immediate (Within 4 Hours)';
    headers = ['Item Code', 'Requested Assistive Technology Item', 'Qty', 'Est. Price', 'GST', 'Status'];

    const itemsList = Array.isArray(params.items) && params.items.length > 0
      ? params.items
      : [
          { code: 'REQ-ITEM-1', name: params.extraMeta?.subject || 'Assistive Equipment Consultation Request', quantity: 1, price: totalAmount, amount: totalAmount },
        ];

    rows = itemsList.map((it: any) => ({
      code: it.code || it.sku || it.productId || it.id || 'REQ-01',
      name: it.name || 'Website Inquiry Item',
      detail: it.detail || '',
      qty: it.quantity || it.qty || 1,
      price: Number(it.price || 0),
      gst: 'GST-Free',
      amount: Number(it.amount !== undefined ? it.amount : (Number(it.price || 0) * Number(it.quantity || 1))),
    }));

    totals = [
      { label: 'Estimated Equipment Subtotal:', value: `$${subtotalAmount.toFixed(2)} AUD` },
      { label: 'Clinical Review & Trial Booking:', value: 'COMPLIMENTARY ($0.00)' },
      { label: 'GST (Section 38-45):', value: '$0.00 AUD (GST-Free)' },
      { label: 'Estimated Quotation Total:', value: `$${totalAmount.toFixed(2)} AUD`, bold: true },
    ];
  } else if (tId === 'ndis_quote' || tId === 'quote') {
    title = 'NDIS ASSISTIVE TECHNOLOGY QUOTATION';
    badge = 'NDIS PROVIDER • CAPITAL AT (CAT 05) • PACE COMPLIANT';
    filename = `NDIS-Assistive-Technology-Quotation-${cleanId}.pdf`;
    billToHeader = 'NDIS Participant & Plan Management:';
    shipToHeader = 'Prescribed Delivery & OT Handover Location:';
    terms = 'Quote Valid for 30 Days (NDIA Pricing Arrangements Compliant)';
    dueDate = 'Delivery: 2 - 4 Weeks from Approval';
    headers = ['Support Item No', 'Scripted Assistive Technology & Specs', 'Qty', 'Unit Price', 'GST', 'Line Total'];

    const itemsList = Array.isArray(params.items) && params.items.length > 0
      ? params.items
      : [
          { code: '05_120603099_0105_1_2', name: 'Quantum Edge 3 Complex Power Wheelchair (TRU-Balance 3 Tilt/Recline)', quantity: 1, price: totalAmount, amount: totalAmount },
        ];

    rows = itemsList.map((it: any) => ({
      code: it.code || it.sku || it.productId || it.id || '05_120603099_0105_1_2',
      name: it.name || 'NDIS Assistive Technology',
      detail: extractItemDetail(it),
      qty: it.quantity || it.qty || 1,
      price: Number(it.price || 0),
      gst: 'GST-Free',
      amount: Number(it.amount !== undefined ? it.amount : (Number(it.price || 0) * Number(it.quantity || 1))),
    }));

    totals = [
      { label: 'Subtotal (Excl. GST):', value: `$${subtotalAmount.toFixed(2)} AUD` },
      { label: 'Delivery & Setup:', value: deliveryAmount > 0 ? `$${deliveryAmount.toFixed(2)} AUD` : 'INCLUDED' },
      { label: 'GST (s38-45 Exemption):', value: '$0.00 (GST-Free)' },
      { label: 'Total Quotation Amount:', value: `$${totalAmount.toFixed(2)} AUD`, bold: true },
    ];
  } else if (tId === 'ndis_invoice') {
    title = 'NDIS PARTICIPANT TAX INVOICE';
    badge = 'NDIS PROVIDER | PACE CLAIM | SEC 38-45 GST-FREE';
    filename = `NDIS-Participant-Tax-Invoice-${cleanId}.pdf`;
    billToHeader = 'Participant & Plan Manager Remittance:';
    shipToHeader = 'Delivery / Installation Destination:';
    terms = 'Payment Terms: Strictly 14 Days Net (Plan Manager Standard)';
    dueDate = 'Payment Due: Within 14 Days';
    headers = ['Support Item No', 'Delivered Assistive Technology Item', 'Qty', 'NDIS Rate', 'GST', 'Amount (AUD)'];

    const itemsList = Array.isArray(params.items) && params.items.length > 0
      ? params.items
      : [
          { code: '05_120603099_0105_1_2', name: 'Quantum Edge 3 Complex Power Wheelchair (TRU-Balance 3 Tilt/Recline)', quantity: 1, price: totalAmount, amount: totalAmount },
        ];

    rows = itemsList.map((it: any) => ({
      code: it.code || it.sku || it.productId || it.id || '05_120603099_0105_1_2',
      name: it.name || 'NDIS Assistive Technology',
      detail: extractItemDetail(it),
      qty: it.quantity || it.qty || 1,
      price: Number(it.price || 0),
      gst: 'GST-Free',
      amount: Number(it.amount !== undefined ? it.amount : (Number(it.price || 0) * Number(it.quantity || 1))),
    }));

    totals = [
      { label: 'Support Items Subtotal:', value: `$${subtotalAmount.toFixed(2)} AUD` },
      { label: 'Delivery & Prescriber Handover:', value: 'INCLUDED' },
      { label: 'GST (s38-45 Exemption):', value: '$0.00 (GST-Free)' },
      { label: 'Total Tax Invoice Amount:', value: `$${totalAmount.toFixed(2)} AUD`, bold: true },
    ];
  } else if (tId === 'trial' || tId === 'ndis_trial') {
    title = 'HOME EQUIPMENT TRIAL & CLINICAL EVALUATION SCHEDULE';
    badge = 'IN-HOME TRIAL SCHEDULED • CLINICAL OT ENDORSEMENT';
    filename = `Home-Equipment-Trial-Schedule-${cleanId}.pdf`;
    billToHeader = 'Participant / Client Details:';
    shipToHeader = 'Clinical Trial Location & Prescriber:';
    terms = params.extraMeta?.trialDate ? `Scheduled Date: ${params.extraMeta.trialDate}` : 'In-Home Equipment Evaluation (Complimentary)';
    dueDate = params.extraMeta?.prescribingClinician ? `Clinician: ${params.extraMeta.prescribingClinician}` : 'Scheduled Trial Session';
    headers = ['Trial SKU', 'Evaluated Assistive Equipment Specification', 'Qty', 'Trial Fee', 'GST', 'Status'];

    const itemsList = Array.isArray(params.items) && params.items.length > 0
      ? params.items
      : [
          { code: 'TRL-BED-01', name: 'Electric Profiling Low Bed with Safety Side Rails', quantity: 1, price: 0, amount: 0 },
          { code: 'TRL-MAT-02', name: 'Pressure Relief Dynamic Alternating Air Mattress', quantity: 1, price: 0, amount: 0 },
        ];

    rows = itemsList.map((it: any) => ({
      code: it.code || it.sku || it.productId || it.id || 'TRL-EQ',
      name: it.name || 'Evaluated Assistive Equipment',
      detail: it.detail || '',
      qty: it.quantity || it.qty || 1,
      price: '$0.00',
      gst: 'GST-Free',
      amount: 'Trial Scheduled',
    }));

    totals = [
      { label: 'Clinical Assessment Session:', value: params.extraMeta?.trialDate || 'In-Home OT Trial Handover' },
      { label: 'Equipment Delivery & Orientation:', value: 'INCLUDED ($0.00)' },
      { label: 'Participant Trial Cost:', value: 'COMPLIMENTARY ($0.00)', bold: true },
    ];
  } else if (tId === 'ndis_hire' || tId === 'hire') {
    title = 'EQUIPMENT HIRE AGREEMENT & RENTAL SCHEDULE';
    badge = 'ATSA HIRE FLEET • 100% PURCHASE REBATE GUARANTEE • AS/NZS COMPLIANT';
    filename = `Equipment-Hire-Agreement-${cleanId}.pdf`;
    billToHeader = params.extraMeta?.planManager ? 'Hirer & NDIS Plan Manager:' : 'Hirer / Patient Details:';
    shipToHeader = params.extraMeta?.hireLocationType === 'hospital' ? 'Hospital / Ward Delivery Destination:' : 'Hire Delivery Destination:';
    terms = params.extraMeta?.hireStartDate ? `Start Date: ${params.extraMeta.hireStartDate} (2-Wk Min)` : '2-Week Minimum Hire (Ongoing Weekly Thereafter)';
    dueDate = params.extraMeta?.hireReturnDate ? `Est. Return Due: ${params.extraMeta.hireReturnDate}` : (params.extraMeta?.hireDurationWeeks ? `${params.extraMeta.hireDurationWeeks} Weeks Initial Hire` : 'Ongoing Weekly Rental');
    headers = ['Asset Code', 'Hired Equipment Description', 'Qty', 'Weekly Rate', 'GST', 'Period Total'];

    const itemsList = Array.isArray(params.items) && params.items.length > 0
      ? params.items
      : [
          { code: 'HIRE-BED-01', name: 'Alerta Community Profiling Electric Low Bed with Rails', quantity: 1, price: 65, amount: 260 },
          { code: 'HIRE-AIR-02', name: 'Sensacare Alternating Dynamic Air Pressure Mattress', quantity: 1, price: 0, amount: 0 },
        ];

    rows = itemsList.map((it: any) => ({
      code: it.code || it.sku || it.productId || it.id || 'HIRE-EQ',
      name: it.name || 'Hired Assistive Technology',
      detail: it.detail || (params.extraMeta?.hireDurationWeeks ? `${params.extraMeta.hireDurationWeeks} Weeks Initial Rental` : (it.hireWeeks ? `${it.hireWeeks} Weeks Hire` : '')),
      qty: it.quantity || it.qty || 1,
      price: typeof it.price === 'number' && it.price > 0 ? `$${it.price.toFixed(2)}/wk` : (it.price || '$65.00/wk'),
      gst: 'GST-Free',
      amount: typeof it.amount === 'number' ? `$${it.amount.toFixed(2)}` : (it.amount || '$260.00'),
    }));

    const durationLabel = params.extraMeta?.hireDurationWeeks ? `${params.extraMeta.hireDurationWeeks} Weeks Initial` : 'Initial Period';
    totals = [
      { label: `Hire Schedule Subtotal (${durationLabel}):`, value: `$${subtotalAmount.toFixed(2)} AUD` },
      { label: 'Delivery & Sanitized Collection:', value: deliveryAmount > 0 ? `$${deliveryAmount.toFixed(2)} AUD` : 'FREE RETURN SERVICE' },
      { label: 'Rehab Hire 100% Purchase Credit:', value: 'Up to 4 wks credited on purchase' },
      { label: 'Total Initial Hire Due:', value: `$${totalAmount.toFixed(2)} AUD`, bold: true },
    ];
  } else if (tId === 'referral') {
    title = 'NDIS CLINICAL REFERRAL & INTAKE';
    badge = 'CLINICAL TRIAGE REGISTERED • 3-STEP JOURNEY';
    filename = `NDIS-Clinical-Referral-Intake-${cleanId}.pdf`;
    billToHeader = 'Participant / Prescriber Profile:';
    shipToHeader = 'Prescribed Assessment Location:';
    terms = 'Clinical Triage within 24h';
    dueDate = 'Trial Booking: Within 7 Days';
    headers = ['Service Code', 'Clinical Assessment Item', 'Qty', 'Funding', 'GST', 'Status'];

    rows = [
      { code: 'OT-TRIAGE', name: 'Complex Powered Mobility Assessment', qty: 1, price: '$0.00', gst: '$0.00', amount: 'Registered' },
      { code: 'TRI-TRIAL', name: 'In-Home Certified Equipment Trial', qty: 1, price: '$0.00', gst: '$0.00', amount: 'Pending Schedule' },
    ];

    totals = [
      { label: 'Funding Pathway:', value: 'NDIS Capital / Core AT' },
      { label: 'Clinical Review SLA:', value: 'Within 24 Hours' },
      { label: 'Consultation Fee:', value: 'COVERED BY NDIS', bold: true },
    ];
  } else if (tId === 'aged_care') {
    title = 'SUPPORT AT HOME / AGED CARE REFERRAL';
    badge = 'HOME CARE PACKAGE (HCP) / CHSP INTAKE';
    filename = `Support-At-Home-Intake-${cleanId}.pdf`;
    billToHeader = 'Client / Care Coordinator:';
    shipToHeader = 'Residence Delivery Address:';
    terms = params.extraMeta?.packageLevel || 'Home Care Package Level 3';
    dueDate = 'Provision Schedule: 5 Business Days';
    headers = ['Package Ref', 'Assistive Equipment Item', 'Qty', 'Unit Allocation', 'GST', 'Status'];

    rows = [
      { code: 'HCP-BED', name: 'Electric Profiling Hospital Bed & Mattress', qty: 1, price: '$0.00', gst: '$0.00', amount: 'Approved' },
      { code: 'HCP-MOB', name: 'Indoor/Outdoor Four-Wheel Rollator Walker', qty: 1, price: '$0.00', gst: '$0.00', amount: 'Approved' },
    ];

    totals = [
      { label: 'Package Stream:', value: 'Support at Home (HCP Level 3)' },
      { label: 'Package Delivery & Setup:', value: 'INCLUDED' },
      { label: 'Client Contribution:', value: '$0.00 AUD (Covered)', bold: true },
    ];
  } else if (tId === 'booking') {
    title = 'CLINICAL ASSESSMENT & TRIAL BOOKING';
    badge = 'IN-HOME TRIAL CONFIRMED • OT APPOINTMENT';
    filename = `Booking-Confirmation-Summary-${cleanId}.pdf`;
    billToHeader = 'Participant / Client:';
    shipToHeader = 'Trial Location / Residence:';
    terms = 'In-Home Clinical Trial';
    dueDate = 'Scheduled Appointment';
    headers = ['Service Code', 'Requested Equipment / Trial', 'Qty', 'Trial Fee', 'GST', 'Status'];

    rows = [
      { code: 'BKG-TRIAL', name: 'Clinical In-Home Equipment Trial', qty: 1, price: '$0.00', gst: '$0.00', amount: 'Confirmed' },
      { code: 'BKG-CALIB', name: 'Certified Technician Setup & Orientation', qty: 1, price: '$0.00', gst: '$0.00', amount: 'Included' },
    ];

    totals = [
      { label: 'Appointment Type:', value: 'In-Home OT Clinical Trial' },
      { label: 'Equipment Calibration:', value: 'INCLUDED' },
      { label: 'Trial Cost:', value: 'COMPLIMENTARY ($0.00)', bold: true },
    ];
  } else {
    // General contact / inquiry
    title = 'CLINICAL INQUIRY & CONSULTATION RECORD';
    badge = 'INQUIRY RECEIVED • 4-HOUR RESPONSE SLA';
    filename = `Consultation-Inquiry-${cleanId}.pdf`;
    billToHeader = 'Inquirer / Client:';
    shipToHeader = 'Contact & Communication:';
    terms = 'Response within 4 Business Hours';
    dueDate = 'Clinical Review: Immediate';
    headers = ['Reference', 'Inquiry Classification', 'Contact', 'Method', 'Priority', 'Status'];

    rows = [
      { code: 'INQ-CONSULT', name: params.extraMeta?.subject || 'Assistive Technology Consultation', qty: 1, price: '—', gst: '—', amount: 'Received' },
    ];

    totals = [
      { label: 'Response Guarantee:', value: 'Within 4 Business Hours' },
      { label: 'Clinical Inquiry Status:', value: 'LOGGED & ASSIGNED', bold: true },
    ];
  }

  const isQuote = tId.includes('quote');

  const pdfBuffer = buildPdfStream({
      companyName,
      addressLine1,
      addressLine2,
      addressCountry,
      abn,
      phone,
      email,
      website,
      title,
      docId,
      date: dStr,
      terms: params.extraMeta?.validityPeriod || terms,
      dueDate: params.extraMeta?.deliveryTimeframe || dueDate,
      customerReference: params.extraMeta?.assessmentRef || docId,
    },
    {
      billToHeader,
      billToName: customerName,
      billToDetail: customerEmail ? `Email: ${customerEmail}` : undefined,
      shipToHeader,
      shipToAddress: shippingAddress,
      shipToPhone: customerPhone,
      badge,
    },
    { headers, rows },
    totals,
    {
      title: bankTitle,
      bankName,
      accountName,
      bsb,
      accountNumber,
      reference: docId,
      remittanceTitle,
      remittanceEmail: params.extraMeta?.remittanceEmail || email,
    },
    `https://${website} • ABN: ${abn} • AT Specialists Australia Documentation`,
    params.extraMeta || {},
    isQuote);

  return { pdfBuffer, filename };
}

/**
 * Backwards-compatible Tax Invoice PDF string generator
 */
export function generatePdfTaxInvoice(params: any): string {
  const res = generateUnifiedPdf({
    templateId: 'order',
    documentId: params.invoiceId || 'INV/2026/10001',
    customerName: params.customerName || 'Valued Customer',
    customerPhone: params.customerPhone,
    shippingAddress: params.shippingAddress,
    total: params.total,
    subtotal: params.subtotal,
    gstTotal: params.gstTotal,
    items: params.items,
    date: params.date,
    customSettings: params,
  });
  return res.pdfBuffer.toString('utf-8');
}

// ============================================================================
// 4. UNIFIED RESPONSIVE HTML EMAIL GENERATOR
// ============================================================================

export function generateUnifiedEmailHtml(params: {
  templateId: string;
  recipientType: 'customer' | 'admin';
  documentId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: string;
  items?: any[];
  subtotal?: number | string;
  deliveryFee?: number | string;
  gstTotal?: number | string;
  total?: number | string;
  notes?: string;
  extraMeta?: Record<string, any>;
  customSettings?: Record<string, any>;
}): { html: string; subject: string; text: string } {
  const invSettings = getStoredSettings('invoice_settings') || {};
  const s = {...invSettings,...(params.customSettings || {}) };

  const companyName = s.companyName || 'AT Specialists Australia';
  const abn = s.abn || '48 123 456 789';
  const address = s.addressLine1
    ? `${s.addressLine1}, ${s.addressLine2 || ''} ${s.addressCountry || ''}`.trim()
    : 'Level 2, 88 Holmes Road, Moonee Ponds VIC 3039';
  const phone = s.phone || '0494 767 409';
  const email = s.email || 'payments@atspecialists.com.au';
  const website = s.website || 'atspecialists.com.au';
  const bankTitle = s.bankTitle || 'Direct Bank Transfer (EFT) Details:';
  const bankName = s.bankName || 'Commonwealth Bank of Australia (CBA)';
  const accountName = s.accountName || 'AT Specialists Australia Pty Ltd';
  const bsb = s.bsb || '063-000';
  const accountNumber = s.accountNumber || '1088 4422';
  const brandColor = s.brandColor || '#147A7A';
  const footerText = 'Confidentiality Notice: This medical and assistive technology communication is confidential and intended solely for the recipient. If received in error, please notify sender immediately.';

  const docId = params.documentId || 'ATS-DOC-1001';
  const customerName = params.customerName || 'Valued Client';
  const firstName = customerName.split(' ')[0] || customerName;
  const isReceiver = params.recipientType === 'customer';
  const tId = (params.templateId || 'order').toLowerCase();

  const computedEmailItemsSum = Array.isArray(params.items) && params.items.length > 0
    ? params.items.reduce((acc: number, it: any) => acc + Number(it.amount !== undefined ? it.amount : (Number(it.price || 0) * Number(it.quantity || 1))), 0)
    : 0;

  const rawSubtotal = (params.subtotal !== undefined && params.subtotal !== null && !isNaN(Number(params.subtotal)) && Number(params.subtotal) > 0 && (computedEmailItemsSum === 0 || Math.abs(Number(params.subtotal) - computedEmailItemsSum) < 0.01))
    ? Number(params.subtotal)
    : (computedEmailItemsSum > 0 ? computedEmailItemsSum : Number(params.total || 0));

  const rawDelivery = Number(params.deliveryFee || 0);
  const rawGst = Number(params.gstTotal !== undefined ? params.gstTotal : 0);

  const rawTotal = (params.total !== undefined && params.total !== null && !isNaN(Number(params.total)) && Number(params.total) > 0 && (computedEmailItemsSum === 0 || Math.abs(Number(params.total) - (rawSubtotal + rawDelivery + rawGst)) < 0.01))
    ? Number(params.total)
    : (rawSubtotal + rawDelivery + rawGst);

  const formattedSubtotal = rawSubtotal.toFixed(2);
  const formattedDelivery = rawDelivery.toFixed(2);
  const formattedGst = rawGst.toFixed(2);
  const formattedTotal = rawTotal.toFixed(2);

  let subject = '';
  let statusBadge = '';
  let headline = '';
  let subtext = '';
  let bodyContent = '';

  const clientUrl = process.env.CLIENT_URL || process.env.CORS_ORIGIN || 'http://localhost:5173';
  const viewDocumentUrl = `${clientUrl}/view-document/${encodeURIComponent(docId)}`;
  const directPdfUrl = `${clientUrl}/api/emails/pdf/${encodeURIComponent(docId)}`;

  let defaultBody = '';

  if (tId === 'order' || tId === 'ndis_invoice' || tId === 'order_invoice') {
    subject = isReceiver
      ? `NDIS Invoice #${docId} — ${companyName} (${customerName})`
      : `[NDIS Invoice Alert] #${docId} — ${customerName} ($${formattedTotal} AUD)`;

    statusBadge = isReceiver
      ? `&#10003; NDIS INVOICE &bull; REF #${docId}`
      : `📦 NDIS INVOICE PROCESSED &bull; REF #${docId}`;

    headline = isReceiver
      ? `Thank you for your order, ${firstName}!`
      : `NDIS Invoice: ${customerName}`;

    subtext = isReceiver
      ? 'We have received your assistive technology order. Your official NDIS Invoice is ready and viewable online below.'
      : `NDIS Invoice ${docId} has been generated for ${customerName}.`;

    defaultBody = `Dear ${customerName},\n\nThank you for choosing ${companyName}. Your NDIS order has been confirmed. Our clinical dispatch team is preparing your assistive technology equipment for handover.\n\nYour itemized NDIS Invoice, compliance certifications, and receipt details are available in the attached PDF and online document viewer.`;
  } else if (tId === 'ndis_quote') {
    subject = isReceiver
      ? `NDIS Quotation #${docId} — ${companyName} (${customerName})`
      : `🔔 [New NDIS Quote Request] #${docId} from ${customerName} ($${formattedTotal} AUD)`;

    statusBadge = isReceiver
      ? `&#10003; NDIS QUOTATION &bull; REF #${docId}`
      : `📋 NDIS QUOTE SUBMITTED &bull; REF #${docId}`;

    headline = isReceiver
      ? `NDIS Equipment Quotation for ${customerName}`
      : `New NDIS Quote Request: ${customerName}`;

    subtext = isReceiver
      ? 'Thank you for requesting an Assistive Technology quotation. Your verified digital document link and official PDF are ready below.'
      : `NDIS participant ${customerName} has submitted a quotation request. Review line items and forward to plan manager.`;

    defaultBody = `Dear ${customerName},\n\nPlease find enclosed your NDIS Quotation prepared by our clinical team. This quote includes itemized NDIA support codes suitable for plan management claim submission and capital funding allocation.\n\nTo view your complete itemized quotation, please use the verified digital document button below or open the attached official PDF.`;
  } else if (tId === 'quote' || tId === 'product_quote') {
    subject = isReceiver
      ? `EQUIPMENT INVOICE #${docId} — ${companyName} (${customerName})`
      : `🔔 [New Equipment Invoice/Quote] #${docId} from ${customerName} ($${formattedTotal} AUD)`;

    statusBadge = `💼 EQUIPMENT INVOICE &bull; REF #${docId}`;
    headline = `EQUIPMENT INVOICE: ${customerName}`;
    subtext = `Thank you for choosing ${companyName}. Please find your EQUIPMENT INVOICE and verified digital document link below.`;
    defaultBody = `Dear ${customerName},\n\nPlease review your EQUIPMENT INVOICE. We have itemized specifications, freight delivery allowances, and clinical warranty terms for your review.\n\nTo proceed with purchase approval or if you require an amended invoice, please let us know.`;
  } else if (tId === 'hire' || tId === 'ndis_hire') {
    subject = isReceiver
      ? `EQUIPMENT HIRE Agreement #${docId} — ${companyName} (${customerName})`
      : `[EQUIPMENT HIRE Alert] #${docId} — ${customerName}`;

    statusBadge = isReceiver
      ? `&#10003; EQUIPMENT HIRE CONFIRMED &bull; REF #${docId}`
      : `🚚 NEW EQUIPMENT HIRE BOOKING &bull; REF #${docId}`;

    headline = isReceiver
      ? `EQUIPMENT HIRE Agreement & Schedule`
      : `Equipment Rental Scheduled: ${customerName}`;

    subtext = isReceiver
      ? 'Your assistive equipment hire booking has been confirmed. Full hire schedule and handover protocols are detailed in the official agreement below.'
      : `Hire Agreement ${docId} has been confirmed for ${customerName}.`;

    defaultBody = `Dear ${customerName},\n\nYour EQUIPMENT HIRE agreement has been scheduled. All equipment in our rental fleet undergoes clinical hospital-grade terminal sanitation and thorough safety inspection prior to dispatch.\n\nPlease review your hire agreement terms and handover schedule below.`;
  } else if (tId === 'trial' || tId === 'ndis_trial') {
    subject = isReceiver
      ? `EQUIPMENT TRIAL Schedule #${docId} — ${customerName} — ${companyName}`
      : `[EQUIPMENT TRIAL Scheduled] ${customerName} — Ref #${docId}`;

    statusBadge = `📅 EQUIPMENT TRIAL SCHEDULED &bull; REF #${docId}`;
    headline = `Home Equipment Trial & Evaluation: ${customerName}`;
    subtext = 'In-home clinical equipment evaluation scheduled with prescribing Occupational Therapist. Scripted equipment trial paperwork and schedule are attached.';
    defaultBody = `Dear ${customerName},\n\nYour EQUIPMENT TRIAL evaluation has been scheduled with our senior clinician. We will arrive with the requested equipment for ergonomic trial and prescription assessment.\n\nPlease review your trial schedule details in the attached document.`;
  } else if (tId === 'product_buy') {
    subject = isReceiver
      ? `Tax Invoice & Order Confirmation #${docId} — ${companyName}`
      : `🛍️ [Storefront Purchase Alert] #${docId} by ${customerName} ($${formattedTotal} AUD)`;

    statusBadge = `🛍️ STOREFRONT PURCHASE &bull; TAX INVOICE #${docId}`;
    headline = `Tax Invoice & Order Receipt: ${customerName}`;
    subtext = `Thank you for your purchase from ${companyName}. Your order has been registered and is being prepared for dispatch.`;
    defaultBody = `Dear ${customerName},\n\nThank you for your purchase. Your order has been processed and is being prepared for dispatch.\n\nYour ATO-compliant Tax Invoice and itemized receipt are attached for your records.`;
  } else if (tId === 'customer_request') {
    subject = isReceiver
      ? `Website Request & Quotation Summary #${docId} — ${companyName}`
      : `💬 [Website Request Alert] #${docId} from ${customerName}`;

    statusBadge = `💬 WEBSITE REQUEST REGISTERED &bull; REF #${docId}`;
    headline = `Customer Request: ${customerName}`;
    subtext = `Thank you for your inquiry via ${companyName}. Our clinical assistive technology team has reviewed your request.`;
    defaultBody = `Dear ${customerName},\n\nThank you for your inquiry with ${companyName}. Our clinical assistive technology consultants have reviewed your request and prepared this notification.\n\nPlease view your document online or refer to the attached schedule.`;
  } else if (tId === 'referral') {
    subject = isReceiver
      ? `NDIS Referral Intake Confirmed #${docId} — ${companyName}`
      : `[New NDIS Referral Alert] ${customerName} — Ref #${docId}`;

    statusBadge = isReceiver
      ? `&#10003; INTAKE REGISTERED &bull; REF #${docId}`
      : `📋 NEW NDIS PARTICIPANT REFERRAL &bull; REF #${docId}`;

    headline = isReceiver
      ? `Referral Received — ${companyName}`
      : `New NDIS Referral: ${customerName}`;

    subtext = isReceiver
      ? `Dear ${customerName} / Support Coordinator, thank you for submitting a referral for assistive technology solutions.`
      : `Participant ${customerName} has been registered for clinical triage and trial.`;

    defaultBody = `Dear ${customerName} / Support Coordinator,\n\nThank you for submitting a referral to AT Specialists Australia. Our Senior Occupational Therapist is reviewing the clinical requirements and will be in touch within 24 business hours to coordinate next steps.`;
  } else if (tId === 'aged_care') {
    subject = isReceiver
      ? `Support at Home Referral Confirmation #${docId} — ${companyName}`
      : `[Aged Care Referral Alert] ${customerName} — Ref #${docId}`;

    statusBadge = isReceiver
      ? `&#10003; AGED CARE INTAKE CONFIRMED &bull; REF #${docId}`
      : `🏠 SUPPORT AT HOME PACKAGE REFERRAL &bull; REF #${docId}`;

    headline = isReceiver
      ? 'Support at Home Referral Confirmed'
      : `Aged Care Referral: ${customerName}`;

    subtext = isReceiver
      ? `Dear Care Coordinator / ${customerName}, we confirm receipt of the clinical referral under the Support at Home Package program.`
      : `Client ${customerName} has been referred for aged care assistive equipment provision.`;

    defaultBody = `Dear Care Coordinator / ${customerName},\n\nWe confirm receipt of the clinical referral for assistive equipment under the Support at Home Package. Our team will coordinate delivery and clinical setup in accordance with program guidelines.`;
  } else if (tId === 'booking') {
    subject = isReceiver
      ? `Appointment Request Received #${docId} — ${companyName}`
      : `[Assessment Booking Alert] ${customerName} — Ref #${docId}`;

    statusBadge = isReceiver
      ? `&#10003; BOOKING REQUEST REGISTERED &bull; REF #${docId}`
      : `📅 NEW TRIAL BOOKING REQUEST &bull; REF #${docId}`;

    headline = isReceiver
      ? 'Equipment Trial Request Received!'
      : `New Assessment Booking: ${customerName}`;

    subtext = isReceiver
      ? 'We have received your trial booking request. A specialist clinician will call you within 24 hours to confirm appointment details.'
      : `Client ${customerName} has requested an in-home trial assessment.`;

    defaultBody = `Dear ${customerName},\n\nWe have received your in-home equipment trial request. A clinical coordinator will contact you within 24 hours to confirm your scheduled appointment time.`;
  } else {
    subject = isReceiver
      ? `Clinical Advisory #${docId} — ${companyName}`
      : `[Inquiry Response Alert] ${customerName} — ${params.extraMeta?.subject || 'Consultation Inquiry'}`;

    statusBadge = isReceiver
      ? `&#10003; CLINICAL ADVISORY &bull; REF #${docId}`
      : `💬 CONSULTATION INQUIRY REPLY &bull; REF #${docId}`;

    headline = isReceiver
      ? `Regarding your Inquiry, ${firstName}`
      : `Inquiry Response: ${customerName}`;

    subtext = isReceiver
      ? 'Thank you for contacting AT Specialists Australia. Our clinical equipment team has reviewed your inquiry and prepared this response below.'
      : `Inquiry response prepared for ${customerName} (${params.customerEmail || 'No Email'} | ${params.customerPhone || 'No Phone'}).`;

    defaultBody = params.extraMeta?.responseMessage || params.notes || 'Thank you for contacting AT Specialists Australia. Our Senior Clinical Consultant has reviewed your request. We have tailored assistive equipment options available to support your mobility and rehabilitation goals.';
  }

  const rawBody = params.extraMeta?.mailBody || params.extraMeta?.responseMessage || defaultBody;
  const resolvedBody = (rawBody || defaultBody)
    .replace(/\{\{docId\}\}/g, docId)
    .replace(/\{\{document_id\}\}/g, docId)
    .replace(/\{\{customerName\}\}/g, customerName)
    .replace(/\{\{customer_name\}\}/g, customerName)
    .replace(/\{\{firstName\}\}/g, firstName)
    .replace(/\{\{companyName\}\}/g, companyName)
    .replace(/\{\{company_name\}\}/g, companyName)
    .replace(/\{\{total\}\}/g, `$${formattedTotal} AUD`);

  bodyContent = `
    <div style="background:#F0FDFA;border:1px solid #CCFBF1;border-radius:10px;padding:18px 20px;margin-bottom:18px;font-size:13.5px;color:#1E293B;line-height:1.65;white-space:pre-line;">
      ${resolvedBody}
    </div>
  `;

  if (params.extraMeta?.originalInquiry) {
    bodyContent += `
      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:12px 14px;margin-bottom:18px;font-size:12px;color:#475569;line-height:1.5;">
        <strong style="color:#0F172A;display:block;margin-bottom:4px;">Your Original Inquiry:</strong>
        <span style="font-style:italic;">"${params.extraMeta.originalInquiry}"</span>
      </div>
    `;
  }

  if (tId === 'contact') {
    bodyContent += `
      <div style="background:#F0FDFA;border:1px solid #CCFBF1;border-radius:8px;padding:14px;margin-bottom:18px;font-size:12px;color:#0F766E;line-height:1.6;">
        <strong>Need direct clinical advice or to speak with an OT?</strong><br />
        Contact our Specialist Advice Line on <strong>${phone}</strong> (Mon-Fri 8:30am - 5:30pm AEST) or reply directly to this email.
      </div>
    `;
  }

  const html = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:24px 8px;background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#F1F5F9">
    <tr>
      <td align="center">
        <table width="640" border="0" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" style="width:640px;max-width:640px;background:#FFFFFF;border-radius:12px;border:1px solid #E2E8F0;padding:24px 20px;box-shadow:0 4px 16px rgba(0,0,0,0.04);">
          <!-- Header -->
          <tr>
            <td align="center" style="border-bottom:2px solid #0F766E;padding-bottom:14px;">
              <img src="cid:at-specialists-logo" alt="${companyName}" height="44" style="height:44px;max-height:44px;width:auto;display:block;margin:0 auto 8px auto;border:0;" />
              <div style="font-size:17px;font-weight:900;color:#0F172A;letter-spacing:-0.3px;line-height:1.2;text-transform:uppercase;">${companyName}</div>
              <div style="font-size:11.5px;color:#0F766E;font-weight:700;margin-top:2px;">Assistive Technology &amp; Healthcare Specialists &bull; NDIS Provider</div>
              <div style="font-size:11px;color:#64748B;margin-top:2px;">${address} &bull; Phone: ${phone} &bull; ABN: ${abn}</div>
            </td>
          </tr>
          <tr><td height="18" style="font-size:18px;line-height:18px;">&nbsp;</td></tr>
          <!-- Status Badge -->
          <tr>
            <td style="font-size:12px;font-weight:800;color:#0D9488;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:6px;">
              ${statusBadge}
            </td>
          </tr>
          <!-- Headline -->
          <tr>
            <td style="color:#0F172A;font-size:21px;font-weight:800;line-height:1.25;padding-bottom:8px;">
              ${headline}
            </td>
          </tr>
          <tr>
            <td style="color:#475569;font-size:13px;line-height:1.6;padding-bottom:14px;">
              ${subtext}
            </td>
          </tr>
          <!-- Main Message Body -->
          <tr><td>${bodyContent}</td></tr>
          <!-- Click & Visit PDF Document Action Card (Only when topic requires a PDF document) -->
          ${params.extraMeta?.generatePdf !== false && tId !== 'contact' && tId !== 'general' ? `
          <tr>
            <td style="padding-bottom: 20px;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#F0FDFA" style="border: 1.5px solid #0D9488; border-radius: 12px; padding: 18px 20px; text-align: center;">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 800; color: #0F766E; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 6px;">
                      📄 Verified Digital Document
                    </div>
                    <div style="font-size: 15px; font-weight: 800; color: #0F172A; margin-bottom: 4px;">
                      Document Reference: #${docId}
                    </div>
                    <div style="font-size: 12.5px; color: #475569; margin-bottom: 14px; line-height: 1.5;">
                      Click below to open and review your itemized document &amp; printable PDF directly in your browser.
                    </div>
                    <div>
                      <a href="${viewDocumentUrl}" target="_blank" style="display: inline-block; background: #147A7A; color: #FFFFFF; font-weight: 800; font-size: 14px; padding: 12px 28px; text-decoration: none; border-radius: 8px; box-shadow: 0 2px 5px rgba(20, 122, 122, 0.3);">
                        👉 Click &amp; Visit: View PDF Document &rarr;
                      </a>
                    </div>
                    <div style="margin-top: 10px; font-size: 11px; color: #64748B;">
                      Instant browser view &bull; No download required &bull; ATSA Record
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>` : ''}
          <!-- Footer -->
          <tr>
            <td align="center" style="border-top:1px solid #E2E8F0;padding-top:16px;color:#64748B;font-size:11px;line-height:1.6;">
              <div style="font-weight:700;color:#334155;">${companyName} &bull; ABN: ${abn} &bull; NDIS Provider</div>
              <div style="margin-top:4px;color:#94A3B8;">${footerText}</div>
              <div style="margin-top:4px;color:#94A3B8;">${website} &bull; ${email} &bull; Phone: ${phone}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `${subject}\n\n${headline}\n${subtext}\n\nTotal: $${formattedTotal} AUD\n${companyName} • ${phone} • ${website}`;

  return { html, subject, text };
}

/**
 * Backwards-compatible Tax Invoice HTML generator
 */
export function generateTaxInvoiceEmailHtml(params: any): string {
  const res = generateUnifiedEmailHtml({
    templateId: 'order',
    recipientType: 'customer',
    documentId: params.invoiceId || 'INV/2026/10001',
    customerName: params.customerName || 'Valued Customer',
    customerPhone: params.customerPhone,
    shippingAddress: params.shippingAddress,
    items: params.items,
    subtotal: params.subtotal,
    deliveryFee: params.deliveryFee,
    gstTotal: params.gstTotal,
    total: params.total,
    notes: params.notes,
    customSettings: params,
  });
  return res.html;
}

/**
 * Backwards-compatible Admin Order HTML generator
 */
export function generateAdminOrderEmailHtml(data: any): string {
  const res = generateUnifiedEmailHtml({
    templateId: 'order',
    recipientType: 'admin',
    documentId: data.orderId || 'INV/2026/10001',
    customerName: data.customerName || 'Customer',
    customerEmail: data.customerEmail,
    customerPhone: data.customerPhone,
    shippingAddress: data.shippingAddress,
    items: data.items,
    subtotal: data.subtotal,
    gstTotal: data.gstTotal,
    total: data.total,
    extraMeta: { trackingNumber: data.trackingNumber },
  });
  return res.html;
}

export function getLogoAttachment() {
  const candidates = [
    path.resolve(process.cwd(), '../frontend/src/assets/logo-header.png'),
    path.resolve(process.cwd(), 'apps/frontend/src/assets/logo-header.png'),
    path.resolve(process.cwd(), 'apps/frontend/dist/assets/logo-header.png'),
    path.resolve(__dirname, '../../../../frontend/src/assets/logo-header.png'),
    path.resolve(__dirname, '../../../frontend/src/assets/logo-header.png'),
    path.resolve(__dirname, '../../frontend/src/assets/logo-header.png'),
  ];
  const logoPath = candidates.find((candidate) => fs.existsSync(candidate));
  return logoPath
    ? { filename: 'logo-header.png', path: logoPath, cid: 'at-specialists-logo', contentType: 'image/png', contentDisposition: 'inline' }
    : null;
}

export function getLogoDataUri(): string {
  const candidates = [
    path.resolve(process.cwd(), '../frontend/src/assets/logo-header.png'),
    path.resolve(process.cwd(), 'apps/frontend/src/assets/logo-header.png'),
    path.resolve(process.cwd(), 'apps/frontend/dist/assets/logo-header.png'),
    path.resolve(__dirname, '../../../../frontend/src/assets/logo-header.png'),
    path.resolve(__dirname, '../../../frontend/src/assets/logo-header.png'),
    path.resolve(__dirname, '../../frontend/src/assets/logo-header.png'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      try {
        const b64 = fs.readFileSync(candidate).toString('base64');
        return `data:image/png;base64,${b64}`;
      } catch { /* unreadable candidate — try next */ }
    }
  }
  return '';
}

// ============================================================================
// 5. UNIFIED MASTER DISPATCHER (Single Method for All Templates & Portals)
// ============================================================================

export interface UnifiedTemplateOptions {
  templateId: 'order' | 'ndis_quote' | 'referral' | 'aged_care' | 'hire' | 'booking' | 'contact' | string;
  recipientEmail?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: string;
  documentId?: string;
  items?: any[];
  subtotal?: number | string;
  deliveryFee?: number | string;
  gstTotal?: number | string;
  total?: number | string;
  notes?: string;
  extraMeta?: Record<string, any>;
  sendCustomerCopy?: boolean; // default true
  sendAdminCopy?: boolean; // default true
  adminEmail?: string;
  customSettings?: Record<string, any>;
  attachPdf?: boolean; // default false (links via Click & Visit online view)
}

export async function dispatchUnifiedTemplateEmail(options: UnifiedTemplateOptions): Promise<{
  success: boolean;
  documentId: string;
  filename?: string;
  customerSent: boolean;
  adminSent: boolean;
  message: string;
  messageId?: string;
  viewDocumentUrl?: string;
  directPdfUrl?: string;
}> {
  const templateId = (options.templateId || (options as any).templateType || 'order').toLowerCase();

  // 1. Resolve Document ID
  let docId = options.documentId;
  if (!docId) {
    const rnd = Math.floor(10000 + Math.random() * 90000);
    if (templateId === 'order') docId = `INV-2026-${rnd}`;
    else if (templateId === 'ndis_quote') docId = `NDIS-QT-${rnd}`;
    else if (templateId === 'quote' || templateId === 'product_quote') docId = `QT-2026-${rnd}`;
    else if (templateId === 'trial' || templateId === 'ndis_trial' || templateId === 'booking') docId = `TRL-2026-${rnd}`;
    else if (templateId === 'hire' || templateId === 'ndis_hire') docId = options.extraMeta?.quoteType === 'hire' ? `HIR-QT-${rnd}` : `HIR-${rnd}`;
    else if (templateId === 'referral') docId = `REF-${Math.floor(1000 + Math.random() * 9000)}`;
    else if (templateId === 'aged_care') docId = `HCP-${Math.floor(1000 + Math.random() * 9000)}`;
    else docId = `INQ-${rnd}`;
  }

  const customerName = options.customerName || 'Valued Client';
  const customerTarget = options.customerEmail || options.recipientEmail;

  const needsPdf = options.extraMeta?.generatePdf !== false && templateId !== 'contact' && templateId !== 'general';

  // 2. Generate PDF & Store for Online Viewing (Only if PDF is needed)
  let pdfRes: { pdfBuffer: Buffer; filename: string } | null = null;
  if (needsPdf) {
    pdfRes = generateUnifiedPdf({
      templateId,
      documentId: docId,
      customerName,
      customerPhone: options.customerPhone,
      customerEmail: customerTarget,
      shippingAddress: options.shippingAddress,
      total: options.total,
      subtotal: options.subtotal,
      deliveryFee: options.deliveryFee,
      gstTotal: options.gstTotal,
      items: options.items,
      notes: options.notes,
      extraMeta: options.extraMeta,
      customSettings: options.customSettings,
    });

    saveStoredDocument({
      docId,
      templateId,
      customerName,
      customerEmail: customerTarget,
      customerPhone: options.customerPhone,
      shippingAddress: options.shippingAddress,
      total: options.total,
      subtotal: options.subtotal,
      deliveryFee: options.deliveryFee,
      gstTotal: options.gstTotal,
      items: options.items,
      notes: options.notes,
      extraMeta: options.extraMeta,
      customSettings: options.customSettings,
      filename: pdfRes.filename,
      createdAt: new Date().toISOString(),
    });
  }

  const clientUrl = process.env.CLIENT_URL || process.env.CORS_ORIGIN || 'http://localhost:5173';
  const viewDocumentUrl = needsPdf ? `${clientUrl}/view-document/${encodeURIComponent(docId)}` : undefined;
  const directPdfUrl = needsPdf ? `${clientUrl}/api/emails/pdf/${encodeURIComponent(docId)}` : undefined;

  // Per user request, attachments not needed - clean browser view link only
  const shouldAttachPdf = false;
  const attachments: Array<{
    filename: string;
    content?: Buffer | string;
    path?: string;
    contentType?: string;
    cid?: string;
    contentDisposition?: string;
  }> = shouldAttachPdf && pdfRes
    ? [
        {
          filename: pdfRes.filename,
          content: pdfRes.pdfBuffer,
          contentType: 'application/pdf',
        },
      ]
    : [];

  const logoAtt = getLogoAttachment();
  if (logoAtt) {
    attachments.push(logoAtt);
  }

  let customerSent = false;
  let adminSent = false;
  let lastMessageId: string | undefined;

  // 3. Dispatch to Customer / Prescriber / Plan Manager
  if (options.sendCustomerCopy !== false && customerTarget && customerTarget.includes('@')) {
    const emailData = generateUnifiedEmailHtml({
      templateId,
      recipientType: 'customer',
      documentId: docId,
      customerName,
      customerEmail: customerTarget,
      customerPhone: options.customerPhone,
      shippingAddress: options.shippingAddress,
      items: options.items,
      subtotal: options.subtotal,
      deliveryFee: options.deliveryFee,
      gstTotal: options.gstTotal,
      total: options.total,
      notes: options.notes,
      extraMeta: options.extraMeta,
      customSettings: options.customSettings,
    });

    const recipients = [customerTarget];
    const planMgrEmail = options.extraMeta?.planManagerEmail;
    const isMockDomain = (em: string) => /@(myplanhealth\.com\.au|example\.com|test\.com|stjudehealth\.com\.au|ndis\.gov\.au)$/i.test(em.trim());
    if (planMgrEmail && planMgrEmail.includes('@') && !recipients.includes(planMgrEmail) && !isMockDomain(planMgrEmail)) {
      recipients.push(planMgrEmail);
    }

    const custResult = await sendEmail({
      to: recipients.join(', '),
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      attachments,
    });

    if (custResult.success) {
      customerSent = true;
      lastMessageId = custResult.messageId;
    } else {
      console.warn(`⚠️ Customer email dispatch failed for ${docId}:`, custResult.error);
    }
  }

  // 4. Dispatch Alert Copy to Store Admin / Clinic Staff
  if (options.sendAdminCopy !== false) {
    const adminMailbox = options.adminEmail || process.env.ADMIN_NOTIFICATION_EMAIL || process.env.SMTP_USER || 'admin@atspecialists.com.au';
    const emailData = generateUnifiedEmailHtml({
      templateId,
      recipientType: 'admin',
      documentId: docId,
      customerName,
      customerEmail: customerTarget,
      customerPhone: options.customerPhone,
      shippingAddress: options.shippingAddress,
      items: options.items,
      subtotal: options.subtotal,
      deliveryFee: options.deliveryFee,
      gstTotal: options.gstTotal,
      total: options.total,
      notes: options.notes,
      extraMeta: options.extraMeta,
      customSettings: options.customSettings,
    });

    const adminResult = await sendEmail({
      to: adminMailbox,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      replyTo: customerTarget || undefined,
      attachments,
    });

    if (adminResult.success) {
      adminSent = true;
      console.log(`✅ Admin alert email successfully sent for ${docId} to ${adminMailbox} (MessageId: ${adminResult.messageId})`);
      if (!lastMessageId) lastMessageId = adminResult.messageId;
    } else {
      console.warn(`⚠️ Admin alert email dispatch failed for ${docId}:`, adminResult.error);
    }
  }

  return {
    success: customerSent || adminSent,
    documentId: docId,
    filename: pdfRes?.filename,
    customerSent,
    adminSent,
    message: needsPdf
      ? `Template '${templateId}' dispatched for ${docId} (Customer: ${customerSent ? 'Sent' : 'Skipped'}, Admin: ${adminSent ? 'Sent' : 'Skipped'}). PDF Link: ${viewDocumentUrl}`
      : `Email message '${templateId}' dispatched for ${docId} (Clean Email Only - No PDF Attached).`,
    messageId: lastMessageId,
    viewDocumentUrl,
    directPdfUrl,
  };
}

// ============================================================================
// 6. ROUTE HANDLERS
// ============================================================================

/**
 * GET /api/emails/pdf/:docId
 * Stream vector PDF directly to browser tab (opens built-in PDF viewer)
 */
router.get('/pdf/:docId', (req: Request, res: Response) => {
  try {
    const { docId } = req.params;
    const clientUrl = process.env.CLIENT_URL || process.env.CORS_ORIGIN || 'http://localhost:5173';

    // If request comes from a browser tab (wants HTML) and not explicitly requesting raw binary stream,
    // redirect to the interactive document portal which downloads the exact 2nd one!
    if (req.headers.accept && req.headers.accept.includes('text/html') && req.query.raw !== 'true') {
      return res.redirect(`${clientUrl}/view-document/${encodeURIComponent(docId)}?download=true`);
    }

    let doc = getStoredDocument(docId);

    if (!doc) {
      const db = getDb();
      const order = (db.orders || []).find((o: any) => o.id === docId || `ORD-${o.id}` === docId || `INV/2026/${o.id}` === docId);
      if (order) {
        doc = {
          docId,
          templateId: 'order',
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          customerPhone: order.customer_phone,
          shippingAddress: order.shipping_address,
          total: order.total,
          subtotal: order.subtotal,
          gstTotal: order.gst_total,
          deliveryFee: order.delivery_fee,
          items: (db.order_items || []).filter((it: any) => it.order_id === order.id).map((it: any) => ({
            code: it.code || it.sku || it.product_id || 'AT-EQ',
            sku: it.sku || it.code || it.product_id || 'AT-EQ',
            name: it.name,
            detail: it.detail,
            quantity: it.quantity,
            price: it.price,
            amount: it.price * it.quantity,
          })),
          filename: `Tax-Invoice-${docId}.pdf`,
          createdAt: order.created_at || new Date().toISOString(),
        };
      }
      const quote = ((db as any).quotes || []).find((q: any) => q.id === docId);
      if (quote) {
        doc = {
          docId,
          templateId: 'ndis_quote',
          customerName: quote.customerName,
          customerEmail: quote.customerEmail,
          customerPhone: quote.customerPhone,
          shippingAddress: quote.shippingAddress,
          total: quote.total,
          subtotal: quote.subtotal,
          gstTotal: quote.gstTotal,
          deliveryFee: quote.deliveryFee,
          items: quote.items || [],
          extraMeta: {
            ndisNumber: quote.ndisNumber,
            planManager: quote.planManager,
            planManagerEmail: quote.planManagerEmail,
            planType: quote.planType,
          },
          filename: `NDIS-Quotation-${docId}.pdf`,
          createdAt: quote.created_at || new Date().toISOString(),
        };
      }
    }

    const tId = doc?.templateId || (
      docId.toUpperCase().startsWith('HIR') || docId.toUpperCase().includes('HIRE') ? 'hire' :
      docId.toUpperCase().includes('NDIS') ? 'ndis_quote' :
      docId.startsWith('TRL') ? 'trial' :
      docId.startsWith('QT') ? 'quote' :
      docId.startsWith('ORD') || docId.startsWith('INV') ? 'order' : 'ndis_quote');

    const docItemsSum = doc?.items && Array.isArray(doc.items) && doc.items.length > 0
      ? doc.items.reduce((s: number, it: any) => s + Number(it.amount !== undefined ? it.amount : (Number(it.price || 0) * Number(it.quantity || 1))), 0)
      : undefined;

    const resolvedSubtotal = (doc?.subtotal !== undefined && Number(doc.subtotal) > 0)
      ? Number(doc.subtotal)
      : (docItemsSum !== undefined ? docItemsSum : (doc?.total ? Number(doc.total) : 0));

    const resolvedTotal = (doc?.total !== undefined && Number(doc.total) > 0)
      ? Number(doc.total)
      : (resolvedSubtotal + Number(doc?.deliveryFee || 0) + Number(doc?.gstTotal || 0));

    const pdfRes = generateUnifiedPdf({
      templateId: tId,
      documentId: docId,
      customerName: doc?.customerName || 'Valued Client',
      customerPhone: doc?.customerPhone,
      customerEmail: doc?.customerEmail,
      shippingAddress: doc?.shippingAddress,
      total: resolvedTotal,
      subtotal: resolvedSubtotal,
      deliveryFee: doc?.deliveryFee || 0,
      gstTotal: doc?.gstTotal || 0,
      items: doc?.items,
      notes: doc?.notes,
      extraMeta: doc?.extraMeta,
      customSettings: doc?.customSettings,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${pdfRes.filename}"`);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(pdfRes.pdfBuffer);
  } catch (err: any) {
    console.error('Stream PDF error:', err);
    res.status(500).send('Error generating PDF document');
  }
});

/**
 * GET /api/emails/document/:docId
 * Returns document JSON data for public viewer page
 */
router.get('/document/:docId', (req: Request, res: Response) => {
  try {
    const { docId } = req.params;
    let doc = getStoredDocument(docId);

    if (!doc) {
      const db = getDb();
      const order = (db.orders || []).find((o: any) => o.id === docId || `ORD-${o.id}` === docId || `INV/2026/${o.id}` === docId);
      if (order) {
        doc = {
          docId,
          templateId: 'order',
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          customerPhone: order.customer_phone,
          shippingAddress: order.shipping_address,
          total: order.total,
          subtotal: order.subtotal,
          gstTotal: order.gst_total,
          deliveryFee: order.delivery_fee,
          items: (db.order_items || []).filter((it: any) => it.order_id === order.id).map((it: any) => ({
            code: it.code || it.sku || it.product_id || 'AT-EQ',
            sku: it.sku || it.code || it.product_id || 'AT-EQ',
            name: it.name,
            detail: it.detail,
            quantity: it.quantity,
            price: it.price,
            amount: it.price * it.quantity,
          })),
          filename: `Tax-Invoice-${docId}.pdf`,
          createdAt: order.created_at || new Date().toISOString(),
        };
      }
      const quote = ((db as any).quotes || []).find((q: any) => q.id === docId);
      if (quote) {
        doc = {
          docId,
          templateId: 'ndis_quote',
          customerName: quote.customerName,
          customerEmail: quote.customerEmail,
          customerPhone: quote.customerPhone,
          shippingAddress: quote.shippingAddress,
          total: quote.total,
          subtotal: quote.subtotal,
          gstTotal: quote.gstTotal,
          deliveryFee: quote.deliveryFee,
          items: quote.items || [],
          extraMeta: {
            ndisNumber: quote.ndisNumber,
            planManager: quote.planManager,
            planManagerEmail: quote.planManagerEmail,
            planType: quote.planType,
          },
          filename: `NDIS-Quotation-${docId}.pdf`,
          createdAt: quote.created_at || new Date().toISOString(),
        };
      }
    }

    if (!doc) {
      const isHire = docId.toUpperCase().startsWith('HIR') || docId.toUpperCase().includes('HIRE');
      const isNdis = !isHire && docId.toUpperCase().includes('NDIS');
      const isTrial = docId.toUpperCase().includes('TRL');
      const isQuote = docId.toUpperCase().includes('QT');
      const isOrder = docId.toUpperCase().includes('ORD') || docId.toUpperCase().includes('INV');
      const templateId = isHire ? 'hire' : isNdis ? 'ndis_quote' : isTrial ? 'trial' : isQuote ? 'quote' : isOrder ? 'order' : 'ndis_quote';
      const isFree = isTrial;
      doc = {
        docId,
        templateId,
        customerName: 'Valued Client',
        customerPhone: '0494 767 409',
        shippingAddress: 'Client Specified Delivery Address',
        total: isFree ? 0 : 1850.00,
        subtotal: isFree ? 0 : 1850.00,
        gstTotal: 0,
        deliveryFee: 0,
        items: [
          {
            code: isNdis ? '05_120603099_0105_1_2' : isTrial ? 'TRL-BED-01' : isHire ? 'HIRE-BED-01' : 'AT-PRD-01',
            name: isNdis ? 'NDIS Scripted Assistive Technology' : isTrial ? 'Home Trial Profiling Low Bed' : isHire ? 'Hospital Profiling Bed Rental' : 'Commercial Assistive Technology Item',
            quantity: 1,
            price: isFree ? 0 : 1850.00,
            amount: isFree ? 0 : 1850.00,
            detail: 'Clinical specification and assistive technology script',
          },
        ],
        filename: `${docId}.pdf`,
        createdAt: new Date().toISOString(),
      };
    }

    const clientUrl = process.env.CLIENT_URL || process.env.CORS_ORIGIN || 'http://localhost:5173';
    res.json({
      success: true,
      document: doc,
      pdfUrl: `${clientUrl}/api/emails/pdf/${encodeURIComponent(docId)}`,
    });
  } catch (err: any) {
    console.error('Get document error:', err);
    res.status(500).json({ error: 'Failed to retrieve document' });
  }
});

/**
 * GET /api/emails/documents
 * Returns list of all stored and dispatched invoices, quotes, and emails
 */
router.get('/documents', (_req: Request, res: Response) => {
  try {
    const clientUrl = process.env.CLIENT_URL || process.env.CORS_ORIGIN || 'http://localhost:5173';
    const list = Array.from(savedDocuments.values())
      .map((doc) => {
        const needsPdf = doc.extraMeta?.generatePdf !== false && doc.templateId !== 'contact' && doc.templateId !== 'general';
        return {
          docId: doc.docId,
          templateId: doc.templateId,
          customerName: doc.customerName || 'Valued Client',
          customerEmail: doc.customerEmail || '',
          customerPhone: doc.customerPhone || '',
          total: Number(doc.total) || 0,
          createdAt: doc.createdAt || new Date().toISOString(),
          filename: doc.filename || (needsPdf ? `${doc.docId}.pdf` : undefined),
          needsPdf,
          viewDocumentUrl: needsPdf ? `${clientUrl}/view-document/${encodeURIComponent(doc.docId)}` : undefined,
          directPdfUrl: needsPdf ? `${clientUrl}/api/emails/pdf/${encodeURIComponent(doc.docId)}` : undefined,
        };
      })
      .reverse();

    res.json({
      success: true,
      documents: list,
    });
  } catch (err: any) {
    console.error('Get documents list error:', err);
    res.status(500).json({ error: 'Failed to retrieve documents list' });
  }
});

/**
 * POST /api/emails/dispatch-template
 * Main unified endpoint accessible by Admin Console and frontend actions
 */
router.post('/dispatch-template', requireAdmin, async (req: Request, res: Response) => {
  try {
    const result = await dispatchUnifiedTemplateEmail(req.body);
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json({ error: 'Failed to dispatch template email', details: result });
    }
  } catch (error: any) {
    console.error('Dispatch template error:', error);
    res.status(500).json({ error: error.message || 'Failed to dispatch template' });
  }
});

/**
 * POST /api/emails/send-invoice
 * Dispatches Custom Tax Invoice (wraps unified method)
 */
router.post('/send-invoice', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { to, invoiceId, customerName, customerPhone, total, subtotal, deliveryFee, gstTotal, items, notes, shippingAddress,...customSettings } = req.body;
    if (!to || !to.includes('@')) {
      res.status(400).json({ error: 'Valid recipient email address is required' });
      return;
    }

    const result = await dispatchUnifiedTemplateEmail({
      templateId: 'order',
      documentId: invoiceId,
      recipientEmail: to,
      customerName,
      customerPhone,
      shippingAddress,
      total,
      subtotal,
      deliveryFee,
      gstTotal,
      items,
      notes,
      customSettings,
      sendCustomerCopy: true,
      sendAdminCopy: true,
    });

    res.json({
      success: true,
      message: `Tax Invoice #${result.documentId} dispatched successfully to ${to} and clinic staff copy sent.`,
      messageId: result.messageId,
    });
  } catch (error: any) {
    console.error('Send invoice error:', error);
    res.status(500).json({ error: error.message || 'Failed to send invoice email' });
  }
});

/**
 * POST /api/emails/send-ndis-quote
 * Dispatches NDIS Quotation (wraps unified method)
 */
router.post('/send-ndis-quote', async (req: Request, res: Response) => {
  try {
    const { to, quoteId, customerName, customerEmail, customerPhone, shippingAddress, ndisNumber, planManager, planManagerEmail, planType, items, subtotal, deliveryFee, gstTotal, total, notes,...customSettings } = req.body;
    const targetEmail = to || customerEmail;
    if (!targetEmail || !targetEmail.includes('@')) {
      res.status(400).json({ error: 'Valid recipient email address is required' });
      return;
    }

    const result = await dispatchUnifiedTemplateEmail({
      templateId: 'ndis_quote',
      documentId: quoteId,
      recipientEmail: targetEmail,
      customerName,
      customerPhone,
      shippingAddress,
      total,
      subtotal,
      deliveryFee,
      gstTotal,
      items,
      notes,
      extraMeta: { ndisNumber, planManager, planManagerEmail, planType },
      customSettings,
      sendCustomerCopy: true,
      sendAdminCopy: true,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Send NDIS quote error:', error);
    res.status(500).json({ error: error.message || 'Failed to send NDIS quote email' });
  }
});

/**
 * POST /api/emails/send-template-sample
 * Allows Admin to dispatch a live test of any of the templates
 */
router.post('/send-template-sample', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { templateId, recipientType, to } = req.body;
    if (!to || !to.includes('@')) {
      res.status(400).json({ error: 'Valid recipient email address is required' });
      return;
    }

    const isReceiver = recipientType === 'receiver';

    const result = await dispatchUnifiedTemplateEmail({
      templateId: templateId || 'order',
      recipientEmail: to,
      customerEmail: isReceiver ? to : 'customer.sample@atspecialists.com.au',
      adminEmail: !isReceiver ? to : undefined,
      sendCustomerCopy: isReceiver,
      sendAdminCopy: !isReceiver,
    });

    res.json({
      success: true,
      message: `Sample email (${isReceiver ? 'Customer Copy' : 'Clinic Staff Alert'}) dispatched to ${to} with attached PDF (${result.filename})!`,
      messageId: result.messageId,
    });
  } catch (error: any) {
    console.error('Send template sample error:', error);
    res.status(500).json({ error: error.message || 'Failed to send template sample email' });
  }
});

/**
 * Backwards-compatible helper for PayPal capture and storefront checkout
 */
export async function dispatchOrderConfirmationEmails(orderData: {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress?: string;
  items: any[];
  subtotal: number;
  deliveryFee: number;
  gstTotal: number;
  total: number;
  paymentMethod?: string;
  trackingNumber?: string;
  hireStartDate?: string;
  hireDurationWeeks?: number;
  hireReturnDate?: string;
  hireLocationType?: string;
  hireFacilityName?: string;
  hireFacilityWard?: string;
  hireFacilityRoom?: string;
  hireDischargeDate?: string;
}): Promise<{ success: boolean; messageId?: string }> {
  const isHire = (orderData.orderId && String(orderData.orderId).toUpperCase().startsWith('HIR')) ||
    (Array.isArray(orderData.items) && orderData.items.some((it: any) => it.isRental || it.type === 'hire' || (it.purchaseType || '').toLowerCase() === 'hire'));
  const templateId = isHire ? 'hire' : 'order';

  const res = await dispatchUnifiedTemplateEmail({
    templateId,
    documentId: orderData.orderId,
    customerName: orderData.customerName,
    customerEmail: orderData.customerEmail,
    customerPhone: orderData.customerPhone,
    shippingAddress: orderData.shippingAddress,
    items: orderData.items,
    subtotal: orderData.subtotal,
    deliveryFee: orderData.deliveryFee,
    gstTotal: orderData.gstTotal,
    total: orderData.total,
    extraMeta: {
      paymentMethod: orderData.paymentMethod,
      trackingNumber: orderData.trackingNumber,
      hireStartDate: orderData.hireStartDate,
      hireDurationWeeks: orderData.hireDurationWeeks,
      hireReturnDate: orderData.hireReturnDate,
      hireLocationType: orderData.hireLocationType,
      hireFacilityName: orderData.hireFacilityName,
      hireFacilityWard: orderData.hireFacilityWard,
      hireFacilityRoom: orderData.hireFacilityRoom,
      hireDischargeDate: orderData.hireDischargeDate,
    },
    sendCustomerCopy: true,
    sendAdminCopy: true,
  });
  return { success: res.success, messageId: res.messageId };
}

/**
 * Backwards-compatible helper for NDIS quotes and Hire quotes
 */
export async function dispatchNdisQuoteEmails(data: any): Promise<{ success: boolean; message: string; quoteId: string }> {
  const isHire = data.quoteType === 'hire' || 
    (data.quoteId && String(data.quoteId).toUpperCase().startsWith('HIR')) || 
    (Array.isArray(data.items) && data.items.some((it: any) => it.isRental || it.type === 'hire' || (it.purchaseType || '').toLowerCase() === 'hire'));
  const templateId = isHire ? 'hire' : 'ndis_quote';

  const res = await dispatchUnifiedTemplateEmail({
    templateId,
    documentId: data.quoteId,
    customerName: data.customerName,
    customerEmail: data.to || data.customerEmail,
    customerPhone: data.customerPhone,
    shippingAddress: data.shippingAddress,
    items: data.items,
    subtotal: data.subtotal,
    deliveryFee: data.deliveryFee,
    gstTotal: data.gstTotal,
    total: data.total,
    notes: data.notes,
    extraMeta: {
      quoteType: data.quoteType || (isHire ? 'hire' : 'purchase'),
      ndisNumber: data.ndisNumber,
      participantDob: data.participantDob,
      planManager: data.planManager,
      planManagerEmail: data.planManagerEmail,
      planType: data.planType,
      prescriberName: data.prescriberName,
      prescriberOrg: data.prescriberOrg,
      prescriberPhone: data.prescriberPhone,
      prescriberEmail: data.prescriberEmail,
      clinicalRationale: data.clinicalRationale,
      prescribingClinician: data.prescriberName ? `${data.prescriberName}${data.prescriberOrg ? ' (' + data.prescriberOrg + ')' : ''}` : undefined,
      hireStartDate: data.hireStartDate,
      hireDurationWeeks: data.hireDurationWeeks,
      hireReturnDate: data.hireReturnDate,
      hireLocationType: data.hireLocationType,
      hireFacilityName: data.hireFacilityName,
      hireFacilityWard: data.hireFacilityWard,
      hireFacilityRoom: data.hireFacilityRoom,
      hireDischargeDate: data.hireDischargeDate,
    },
    sendCustomerCopy: true,
    sendAdminCopy: true,
  });
  return { success: res.success, message: res.message, quoteId: res.documentId };
}

/**
 * GET /api/emails/logo.png
 * Public logo asset endpoint for browser and email clients
 */
router.get('/logo.png', (_req: Request, res: Response) => {
  const logoAtt = getLogoAttachment();
  if (logoAtt && logoAtt.path && fs.existsSync(logoAtt.path)) {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=604800');
    fs.createReadStream(logoAtt.path).pipe(res);
  } else {
    res.status(404).send('Logo not found');
  }
});

export default router;
