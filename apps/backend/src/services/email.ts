/**
 * SMTP Email Service
 * 
 * Powered by Nodemailer with dynamic runtime configuration.
 * Generates ultra-professional, responsive HTML transactional emails with inline CSS.
 */

import nodemailer, { type Transporter } from 'nodemailer';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENV_PATH = path.resolve(__dirname, '../../../../.env');
dotenv.config({ path: ENV_PATH });

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

let currentConfig: SmtpConfig = {
  host: process.env.SMTP_HOST || 'smtp.zoho.in',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: process.env.SMTP_SECURE === 'ssl' || process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465' || !process.env.SMTP_PORT,
  user: process.env.SMTP_USER || 'admin@atspecialists.com.au',
  pass: process.env.SMTP_PASS || 'Admin@atspe1508',
  fromName: process.env.SMTP_FROM_NAME || 'AT Specialists Australia',
  fromEmail: process.env.SMTP_FROM_EMAIL || 'admin@atspecialists.com.au',
};

let cachedTransporter: Transporter | null = null;

export function getSmtpConfig(): SmtpConfig {
  return {...currentConfig };
}

export function isSmtpConfigured(): boolean {
  return (Boolean(currentConfig.host) &&
    Boolean(currentConfig.user) &&
    Boolean(currentConfig.pass) &&
    !currentConfig.pass.includes('your_'));
}

/**
 * Update SMTP configuration dynamically and persist to.env
 */
export function updateSmtpConfig(newConfig: Partial<SmtpConfig>): void {
  currentConfig = {
    ...currentConfig,
    ...newConfig,
    port: typeof newConfig.port === 'string' ? parseInt(newConfig.port, 10) : newConfig.port || currentConfig.port,
    secure: newConfig.secure !== undefined ? Boolean(newConfig.secure) : (newConfig.port === 465 || currentConfig.port === 465),
  };

  cachedTransporter = null;

  try {
    let envContent = '';
    if (fs.existsSync(ENV_PATH)) {
      envContent = fs.readFileSync(ENV_PATH, 'utf-8');
    }

    const updates: Record<string, string> = {
      SMTP_HOST: currentConfig.host,
      SMTP_PORT: String(currentConfig.port),
      SMTP_SECURE: String(currentConfig.secure),
      SMTP_USER: currentConfig.user,
      SMTP_PASS: currentConfig.pass,
      SMTP_FROM_NAME: currentConfig.fromName,
      SMTP_FROM_EMAIL: currentConfig.fromEmail,
    };

    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        envContent += `\n${key}=${value}`;
      }
    }

    fs.writeFileSync(ENV_PATH, envContent.trim() + '\n', 'utf-8');
    console.log('✅ SMTP configuration updated and saved to.env');
  } catch (err) {
    console.warn('Could not write SMTP settings to.env file:', err);
  }
}

/**
 * Get or create a Nodemailer Transporter
 */
function getTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter;

  const transportOptions: any = {
    host: currentConfig.host,
    port: currentConfig.port,
    secure: currentConfig.secure,
    auth: {
      user: currentConfig.user,
      pass: currentConfig.pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  };

  if (currentConfig.host.includes('gmail.com')) {
    transportOptions.service = 'gmail';
  }

  cachedTransporter = nodemailer.createTransport(transportOptions);
  return cachedTransporter!;
}

/**
 * Verify SMTP connection with the mail server
 */
export async function verifySmtpConnection(): Promise<{ success: boolean; message: string; host: string; port: number }> {
  if (!isSmtpConfigured()) {
    return {
      success: false,
      message: 'SMTP credentials are incomplete. Please provide Host, Port, Username, and Password.',
      host: currentConfig.host,
      port: currentConfig.port,
    };
  }

  try {
    const transporter = getTransporter();
    await transporter.verify();
    return {
      success: true,
      message: `Successfully authenticated with SMTP server ${currentConfig.host}:${currentConfig.port}`,
      host: currentConfig.host,
      port: currentConfig.port,
    };
  } catch (error: any) {
    console.error('❌ SMTP verification failed:', error.message);
    return {
      success: false,
      message: `SMTP Connection Failed: ${error.message || error}`,
      host: currentConfig.host,
      port: currentConfig.port,
    };
  }
}

export interface SendMailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content?: Buffer | string;
    path?: string;
    contentType?: string;
    cid?: string;
  }>;
}

/**
 * Send an email via SMTP
 */
export async function sendEmail(params: SendMailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!isSmtpConfigured()) {
    const message = 'SMTP credentials are incomplete. Configure SMTP_USER and SMTP_PASS before sending email.';
    console.error(`[SMTP Error] Email to ${params.to} not sent: ${message}`);
    return {
      success: false,
      error: message,
    };
  }

  try {
    const transporter = getTransporter();
    const mailOptions: any = {
      from: `"${currentConfig.fromName}" <${currentConfig.fromEmail}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text || params.subject,
      replyTo: params.replyTo || currentConfig.fromEmail,
    };

    if (params.attachments && params.attachments.length > 0) {
      mailOptions.attachments = params.attachments;
    }

    const info = await transporter.sendMail(mailOptions);

    console.log(`📧 Email dispatched to ${params.to} | MessageID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`❌ Failed to send email to ${params.to}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * High-End Diagnostic Test Email Template
 */
/**
 * Exact Admin Panel Order Confirmation & Tax Invoice Template
 * 100% Compatible with Gmail, Outlook, Apple Mail and Mobile Clients
 */
export function generateTestEmailHtml(_recipientEmail: string): string {
  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Order Confirmation & Tax Invoice #INV/2026/10001 — AT Specialists Australia</title>
</head>
<body style="margin:0;padding:24px 8px;background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#F1F5F9">
    <tr>
      <td align="center">
        <!-- Main 640px Card Canvas matching Admin Panel -->
        <table width="640" border="0" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" style="width:640px;max-width:640px;background:#FFFFFF;border-radius:12px;border:1px solid #E2E8F0;padding:28px 24px;box-shadow:0 4px 16px rgba(0,0,0,0.04);">
          
          <!-- 1. Header with Logo & Clinic Information -->
          <tr>
            <td align="center" style="border-bottom:1px solid #E2E8F0;padding-bottom:16px;">
              <img src="cid:at-specialists-logo" alt="AT Specialists Australia" height="44" style="height:44px;max-height:44px;width:auto;display:block;margin:0 auto 8px auto;border:0;" />
              <div style="font-size:16px;font-weight:800;color:#0F172A;letter-spacing:-0.3px;line-height:1.2;">
                AT Specialists Australia
              </div>
              <div style="font-size:12px;color:#64748B;margin-top:3px;">
                Level 2, 88 Holmes Road, Moonee Ponds VIC 3039 &bull; Phone: 0494 767 409
              </div>
            </td>
          </tr>

          <!-- Spacing -->
          <tr><td height="18" style="font-size:18px;line-height:18px;">&nbsp;</td></tr>

          <!-- 2. Green Status Line -->
          <tr>
            <td style="font-size:12px;font-weight:800;color:#16A34A;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:6px;">
              &#10003; ORDER CONFIRMED &bull; INVOICE #INV/2026/10001
            </td>
          </tr>

          <!-- 3. Headline -->
          <tr>
            <td style="color:#0F172A;font-size:21px;font-weight:800;line-height:1.25;padding-bottom:8px;">
              Thank you for your order, Sarah!
            </td>
          </tr>

          <!-- 4. Sub-paragraph -->
          <tr>
            <td style="color:#475569;font-size:13px;line-height:1.6;padding-bottom:18px;">
              We have received your assistive technology order. Your printable Tax Invoice is attached to this email.
            </td>
          </tr>

          <!-- 5. Itemized Table (Pure HTML Tables for 100% Gmail & Mobile Alignment) -->
          <tr>
            <td>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;margin-bottom:18px;">
                <!-- Table Header -->
                <tr bgcolor="#F8FAFC">
                  <th align="left" style="padding:10px 12px;font-size:12px;font-weight:700;color:#475569;border-bottom:1px solid #E2E8F0;">Item Description</th>
                  <th align="center" style="padding:10px 12px;font-size:12px;font-weight:700;color:#475569;width:50px;border-bottom:1px solid #E2E8F0;">Qty</th>
                  <th align="right" style="padding:10px 12px;font-size:12px;font-weight:700;color:#475569;width:90px;border-bottom:1px solid #E2E8F0;">Price</th>
                </tr>

                <!-- Item 1 -->
                <tr>
                  <td style="padding:10px 12px;border-bottom:1px solid #F1F5F9;">
                    <div style="font-weight:700;color:#0F172A;font-size:13px;">Air-Cell Pressure Relief Cushion</div>
                    <div style="font-size:11px;color:#64748B;margin-top:2px;">Code: EQ-104 &bull; High-Risk Pressure Care</div>
                  </td>
                  <td align="center" style="padding:10px 12px;border-bottom:1px solid #F1F5F9;font-weight:700;font-size:13px;color:#475569;">1</td>
                  <td align="right" style="padding:10px 12px;border-bottom:1px solid #F1F5F9;font-weight:700;font-size:13px;color:#0F172A;">$480.00</td>
                </tr>

                <!-- Item 2 -->
                <tr>
                  <td style="padding:10px 12px;border-bottom:1px solid #F1F5F9;">
                    <div style="font-weight:700;color:#0F172A;font-size:13px;">Ultralight Folding Transport Wheelchair</div>
                    <div style="font-size:11px;color:#64748B;margin-top:2px;">Code: EQ-102 &bull; 18 Inch Wide</div>
                  </td>
                  <td align="center" style="padding:10px 12px;border-bottom:1px solid #F1F5F9;font-weight:700;font-size:13px;color:#475569;">1</td>
                  <td align="right" style="padding:10px 12px;border-bottom:1px solid #F1F5F9;font-weight:700;font-size:13px;color:#0F172A;">$800.00</td>
                </tr>

                <!-- Summary Rows using 2-Column Table -->
                <tr>
                  <td colspan="3" style="padding:12px 14px;background:#FFFFFF;border-top:1px solid #E2E8F0;">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size:12px;color:#64748B;line-height:1.6;">
                      <tr>
                        <td align="left" style="padding:2px 0;">Subtotal (Excl. GST):</td>
                        <td align="right" style="padding:2px 0;color:#334155;font-weight:600;">$1,163.64 AUD</td>
                      </tr>
                      <tr>
                        <td align="left" style="padding:2px 0;">GST (10% Included):</td>
                        <td align="right" style="padding:2px 0;color:#334155;font-weight:600;">$116.36 AUD</td>
                      </tr>
                      <tr>
                        <td align="left" style="padding:8px 0 2px 0;border-top:1px solid #F1F5F9;font-size:14.5px;font-weight:800;color:#0F172A;">
                          Grand Total:
                        </td>
                        <td align="right" style="padding:8px 0 2px 0;border-top:1px solid #F1F5F9;font-size:14.5px;font-weight:800;color:#0F172A;">
                          $1,280.00 AUD
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 6. Direct Bank Transfer (EFT) Details Card -->
          <tr>
            <td>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#F8FAFC" style="border:1px solid #E2E8F0;border-radius:8px;padding:14px;margin-bottom:18px;">
                <tr>
                  <td colspan="2" style="font-weight:800;font-size:13px;color:#0F172A;padding:0 0 8px 0;">
                    Direct Bank Transfer (EFT) Details:
                  </td>
                </tr>
                <tr style="font-size:12px;color:#334155;line-height:1.6;">
                  <td width="50%" valign="top" style="padding:2px 10px 2px 0;">
                    <strong>Account Name:</strong> AT Specialists Australia Pty Ltd<br />
                    <strong>BSB:</strong> <span style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,monospace;font-weight:700;">063-000</span>
                  </td>
                  <td width="50%" valign="top" style="padding:2px 0 2px 10px;">
                    <strong>Bank:</strong> Commonwealth Bank of Australia (CBA)<br />
                    <strong>Account Number:</strong> <span style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,monospace;font-weight:700;">1088 4422</span>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="font-size:12px;color:#334155;padding-top:6px;">
                    <strong>Payment Reference:</strong> <code style="background:#E2E8F0;padding:2px 6px;border-radius:4px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,monospace;font-weight:700;">INV/2026/10001</code>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 7. Shipping To Card -->
          <tr>
            <td>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" style="border:1px solid #E2E8F0;border-radius:8px;padding:12px 14px;margin-bottom:20px;">
                <tr>
                  <td style="font-size:12px;color:#475569;line-height:1.5;">
                    <strong style="color:#0F172A;display:block;margin-bottom:2px;">Shipping To:</strong>
                    Sarah Jenkins &bull; 42 Victoria Parade, Fitzroy VIC 3065 &bull; Phone: 0412 345 678
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 8. Footer with Confidentiality & ABN -->
          <tr>
            <td align="center" style="border-top:1px solid #E2E8F0;padding-top:16px;color:#64748B;font-size:11px;line-height:1.6;">
              <div style="font-weight:700;color:#334155;">
                AT Specialists Australia &bull; ABN: 48 123 456 789
              </div>
              <div style="margin-top:4px;color:#94A3B8;">
                Confidentiality Notice: This medical and assistive technology communication is confidential and intended solely for the recipient. If received in error, please notify sender immediately.
              </div>
              <div style="margin-top:4px;color:#94A3B8;">
                atspecialists.com.au &bull; payments@atspecialists.com.au
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
