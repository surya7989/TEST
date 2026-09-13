import { Router, Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireAdmin } from './auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const settingsFilePath = path.resolve(__dirname, '../../data/settings.json');

const router = Router();

const defaultSettings: Record<string, any> = {
  store_info: {
    clinicName: 'AT Specialists Australia',
    abn: '48 123 456 789',
    phone: '0494 767 409',
    email: 'admin@atspecialists.com.au',
    address: 'Level 2, 88 Holmes Road, Moonee Ponds VIC 3039',
  },
  invoice_settings: {
    companyName: 'AT Specialists Australia Pty Ltd',
    abn: '48 123 456 789',
    addressLine1: 'Level 2, 88 Holmes Road',
    addressLine2: 'Moonee Ponds VIC 3039',
    addressCountry: 'Australia',
    phone: '0494 767 409',
    email: 'payments@atspecialists.com.au',
    website: 'atspecialists.com.au',
    bankTitle: 'Bank Deposit via EFT',
    bankName: 'Commonwealth Bank of Australia (CBA)',
    accountName: 'Assistive Technology Specialists Australia Pty Ltd',
    bsb: '063-000',
    accountNumber: '1088 4422',
    remittanceTitle: 'Remittance & Inquiries:',
    terms: 'Net 14 Days',
    dueDate: 'Within 14 Days',
    requiredByDate: 'Within 14 Days',
    footerLeft: 'https://atspecialists.com.au • ABN: 48 123 456 789',
    footerRight: 'Page 1',
    brandColor: '#147A7A',
  },
  shipping_defaults: {
    standard: 0,
    express: 29,
    white_glove: 149,
  },
};

let settings: Record<string, any> = {...defaultSettings };

// Load settings from disk on startup
function loadSettingsFromDisk(): void {
  try {
    if (fs.existsSync(settingsFilePath)) {
      const data = fs.readFileSync(settingsFilePath, 'utf-8');
      const parsed = JSON.parse(data);
      settings = {
        ...defaultSettings,
        ...parsed,
        invoice_settings: {
          ...defaultSettings.invoice_settings,
          ...(parsed.invoice_settings || {}),
        },
      };
    } else {
      // Ensure data directory exists
      const dataDir = path.dirname(settingsFilePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('Failed to load settings from disk:', err);
  }
}

// Save settings to disk
function persistSettingsToDisk(): void {
  try {
    const dataDir = path.dirname(settingsFilePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist settings to disk:', err);
  }
}

loadSettingsFromDisk();

/**
 * Access stored settings synchronously from any backend route
 */
export function getStoredSettings(key?: string): any {
  if (key) {
    return settings[key] || defaultSettings[key] || {};
  }
  return settings;
}

router.get('/', requireAdmin, (_req: Request, res: Response) => {
  res.json({ settings });
});

router.post('/', requireAdmin, (req: Request, res: Response) => {
  const { key, value } = req.body;
  if (key) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      settings[key] = {...(settings[key] || {}),...value };
    } else {
      settings[key] = value;
    }
    persistSettingsToDisk();
  }
  res.json({ success: true, message: 'Settings saved successfully' });
});

export default router;

