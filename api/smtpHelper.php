<?php
// ==============================================================================
// AT SPECIALISTS AUSTRALIA - SECURE AUTHENTICATED SMTP CLIENT (SSL / TLS)
// ==============================================================================

declare(strict_types=1);

/**
 * Send an email directly via authenticated SMTP with strict TLS certificate verification
 *
 * @param string|array $to Single email address or array of recipient addresses
 * @param string $subject Email subject line
 * @param string $htmlContent HTML body content
 * @param array $attachments List of attachments [['name' => 'tax-invoice.pdf', 'content' => $bytes, 'type' => 'application/pdf']]
 * @param array $customHeaders Optional custom headers
 * @return array ['success' => bool, 'message' => string, 'error' => string|null]
 */
function sendSmtpEmail($to, string $subject, string $htmlContent, array $attachments = [], array $customHeaders = []): array {
    global $smtp_host, $smtp_port, $smtp_secure, $smtp_user, $smtp_pass, $smtp_from_name, $smtp_from_email;

    $host = !empty($smtp_host) ? (string)$smtp_host : 'smtp.hostinger.com';
    $port = !empty($smtp_port) ? intval($smtp_port) : 587;
    $user = !empty($smtp_user) ? (string)$smtp_user : 'admin@atspecialists.com.au';
    $pass = !empty($smtp_pass) ? (string)$smtp_pass : '';
    $fromName = !empty($smtp_from_name) ? (string)$smtp_from_name : 'AT Specialists Australia';
    $fromEmail = !empty($smtp_from_email) ? (string)$smtp_from_email : 'admin@atspecialists.com.au';
    $isSsl = ($port === 465 || strtolower((string)$smtp_secure) === 'ssl' || (string)$smtp_secure === '465');

    // Clean headers to prevent email injection + strict sender validation
    $fromName = str_replace(["\r", "\n"], '', $fromName);
    $fromEmail = str_replace(["\r", "\n"], '', $fromEmail);
    $subject = str_replace(["\r", "\n"], '', $subject);
    if (!filter_var($fromEmail, FILTER_VALIDATE_EMAIL)) {
        return ['success' => false, 'error' => 'Invalid sender email address.'];
    }

    $envelopeSender = ($user !== '' && filter_var($user, FILTER_VALIDATE_EMAIL)) ? $user : $fromEmail;
    $replyTo = $customHeaders['Reply-To'] ?? $customHeaders['reply_to'] ?? $fromEmail;
    $replyTo = str_replace(["\r", "\n"], '', (string)$replyTo);

    // Parse & validate recipient list
    $recipients = [];
    if (is_array($to)) {
        foreach ($to as $t) {
            $t = trim((string)$t);
            if (filter_var($t, FILTER_VALIDATE_EMAIL)) {
                $recipients[] = str_replace(["\r", "\n"], '', $t);
            }
        }
    } else {
        $parts = explode(',', (string)$to);
        foreach ($parts as $p) {
            $p = trim($p);
            if (filter_var($p, FILTER_VALIDATE_EMAIL)) {
                $recipients[] = str_replace(["\r", "\n"], '', $p);
            }
        }
    }

    if (empty($recipients)) {
        return ['success' => false, 'error' => 'No valid recipient email addresses provided.'];
    }

    // SSL Stream context with SECURE certificate verification
    $context = stream_context_create([
        'ssl' => [
            'verify_peer' => true,
            'verify_peer_name' => true,
            'allow_self_signed' => false,
            'crypto_method' => STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT
        ]
    ]);

    $connectHost = ($isSsl) ? "ssl://{$host}" : $host;
    $errno = 0;
    $errstr = '';
    $socket = @stream_socket_client("{$connectHost}:{$port}", $errno, $errstr, 15, STREAM_CLIENT_CONNECT, $context);

    if (!$socket) {
        error_log("SMTP Connection failed to {$host}:{$port} - ($errno) $errstr");
        return ['success' => false, 'error' => "SMTP Connection Failed to {$host}:{$port} - ($errno) $errstr"];
    }

    stream_set_timeout($socket, 15);

    $readResponse = function() use ($socket): string {
        $data = '';
        while ($line = fgets($socket, 512)) {
            $data.= $line;
            if (isset($line[3]) && $line[3] === ' ') break;
        }
        return $data;
    };

    $sendCommand = function(string $cmd) use ($socket, $readResponse): string {
        fputs($socket, $cmd. "\r\n");
        return $readResponse();
    };

    // 1. Initial Greeting
    $greeting = $readResponse();
    if (substr($greeting, 0, 3) !== '220') {
        fclose($socket);
        return ['success' => false, 'error' => "Invalid SMTP greeting: $greeting"];
    }

    // 2. EHLO
    $hostname = gethostname() ?: 'atspecialists.com.au';
    $ehlo = $sendCommand("EHLO {$hostname}");

    // 3. STARTTLS if port 587
    if ($port === 587 && stripos($ehlo, 'STARTTLS') !== false) {
        $starttlsRes = $sendCommand("STARTTLS");
        if (substr($starttlsRes, 0, 3) === '220') {
            $crypto = @stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT);
            if (!$crypto) {
                fclose($socket);
                return ['success' => false, 'error' => "Failed to negotiate TLS crypto on port 587."];
            }
            $sendCommand("EHLO {$hostname}");
        }
    }

    // 4. Authenticate
    if ($user !== '' && $pass !== '') {
        $authRes = $sendCommand("AUTH LOGIN");
        if (substr($authRes, 0, 3) === '334') {
            $userRes = $sendCommand(base64_encode($user));
            if (substr($userRes, 0, 3) === '334') {
                $passRes = $sendCommand(base64_encode($pass));
                if (substr($passRes, 0, 3) !== '235') {
                    fclose($socket);
                    return ['success' => false, 'error' => "SMTP Authentication failed."];
                }
            } else {
                fclose($socket);
                return ['success' => false, 'error' => "SMTP Username rejected."];
            }
        }
    }

    // 5. MAIL FROM
    $mailFromRes = $sendCommand("MAIL FROM:<{$envelopeSender}>");
    if (substr($mailFromRes, 0, 3) !== '250') {
        fclose($socket);
        return ['success' => false, 'error' => "MAIL FROM rejected: $mailFromRes"];
    }

    // 6. RCPT TO
    foreach ($recipients as $recipient) {
        $rcptRes = $sendCommand("RCPT TO:<{$recipient}>");
        if (substr($rcptRes, 0, 3) !== '250' && substr($rcptRes, 0, 3) !== '251') {
            fclose($socket);
            return ['success' => false, 'error' => "Recipient <{$recipient}> rejected: $rcptRes"];
        }
    }

    // 7. DATA Command
    $dataRes = $sendCommand("DATA");
    if (substr($dataRes, 0, 3) !== '354') {
        fclose($socket);
        return ['success' => false, 'error' => "DATA command rejected: $dataRes"];
    }

    // 8. Build MIME Envelope
    $boundaryMixed = "----=_Part_Mixed_". bin2hex(random_bytes(16));
    $boundaryAlt = "----=_Part_Alt_". bin2hex(random_bytes(16));

    $toHeader = implode(', ', $recipients);
    $cleanSubject = '=?UTF-8?B?'. base64_encode($subject). '?=';

    $headers = [];
    $headers[] = "Date: ". date('r');
    $headers[] = "From: =?UTF-8?B?". base64_encode($fromName). "?= <{$fromEmail}>";
    $headers[] = "To: {$toHeader}";
    $headers[] = "Reply-To: {$replyTo}";
    $headers[] = "Subject: {$cleanSubject}";
    $headers[] = "Message-ID: <". bin2hex(random_bytes(16)). "@atspecialists.com.au>";
    $headers[] = "X-Mailer: AT Specialists PHP Mailer v2.0 (TLS Hardened)";
    $headers[] = "MIME-Version: 1.0";

    $plainText = strip_tags(preg_replace('/<br\s*\/?>/i', "\n", $htmlContent));

    $body = "";

    if (!empty($attachments)) {
        $headers[] = "Content-Type: multipart/mixed; boundary=\"{$boundaryMixed}\"";

        $body.= "--{$boundaryMixed}\r\n";
        $body.= "Content-Type: multipart/alternative; boundary=\"{$boundaryAlt}\"\r\n\r\n";

        $body.= "--{$boundaryAlt}\r\n";
        $body.= "Content-Type: text/plain; charset=UTF-8\r\n";
        $body.= "Content-Transfer-Encoding: base64\r\n\r\n";
        $body.= chunk_split(base64_encode($plainText)). "\r\n";

        $body.= "--{$boundaryAlt}\r\n";
        $body.= "Content-Type: text/html; charset=UTF-8\r\n";
        $body.= "Content-Transfer-Encoding: base64\r\n\r\n";
        $body.= chunk_split(base64_encode($htmlContent)). "\r\n";

        $body.= "--{$boundaryAlt}--\r\n\r\n";

        // Append attachments
        foreach ($attachments as $att) {
            $filename = str_replace(["\r", "\n", '"'], '', (string)($att['name'] ?? 'attachment.pdf'));
            $content = '';
            if (!empty($att['content'])) {
                $content = $att['content'];
            } elseif (!empty($att['path']) && file_exists($att['path'])) {
                $content = file_get_contents($att['path']);
            }
            if (!$content) continue;

            $mimeType = $att['type'] ?? 'application/pdf';
            $body.= "--{$boundaryMixed}\r\n";
            $body.= "Content-Type: {$mimeType}; name=\"{$filename}\"\r\n";
            $body.= "Content-Disposition: attachment; filename=\"{$filename}\"\r\n";
            $body.= "Content-Transfer-Encoding: base64\r\n\r\n";
            $body.= chunk_split(base64_encode($content)). "\r\n";
        }

        $body.= "--{$boundaryMixed}--\r\n";
    } else {
        $headers[] = "Content-Type: multipart/alternative; boundary=\"{$boundaryAlt}\"";

        $body.= "--{$boundaryAlt}\r\n";
        $body.= "Content-Type: text/plain; charset=UTF-8\r\n";
        $body.= "Content-Transfer-Encoding: base64\r\n\r\n";
        $body.= chunk_split(base64_encode($plainText)). "\r\n";

        $body.= "--{$boundaryAlt}\r\n";
        $body.= "Content-Type: text/html; charset=UTF-8\r\n";
        $body.= "Content-Transfer-Encoding: base64\r\n\r\n";
        $body.= chunk_split(base64_encode($htmlContent)). "\r\n";

        $body.= "--{$boundaryAlt}--\r\n";
    }

    $rawMessage = implode("\r\n", $headers). "\r\n\r\n". $body. "\r\n.\r\n";

    fputs($socket, $rawMessage);
    $sendRes = $readResponse();

    $sendCommand("QUIT");
    fclose($socket);

    if (substr($sendRes, 0, 3) === '250') {
        return ['success' => true, 'message' => 'Email dispatched successfully.', 'error' => null];
    } else {
        return ['success' => false, 'error' => "Email body rejected: $sendRes"];
    }
}

/**
 * Generate standard branded HTML wrapper for emails
 */
function renderEmailTemplate(string $title, string $preheader, string $bodyContent, string $actionUrl = '', string $actionText = ''): string {
    $btnHtml = '';
    if ($actionUrl !== '' && $actionText !== '') {
        $safeUrl = htmlspecialchars($actionUrl, ENT_QUOTES, 'UTF-8');
        $safeText = htmlspecialchars($actionText, ENT_QUOTES, 'UTF-8');
        $btnHtml = '
        <table align="center" cellpadding="0" cellspacing="0" border="0" style="margin: 28px auto; text-align: center;">
            <tr>
                <td align="center" style="border-radius: 8px; background-color: #0F766E;">
                    <a href="' . $safeUrl . '" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 14px 28px; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; font-size: 13.5px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 8px; letter-spacing: 0.3px; background-color: #0F766E;">' . $safeText . '</a>
                </td>
            </tr>
        </table>';
    }

    $safeTitle = htmlspecialchars($title, ENT_QUOTES, 'UTF-8');
    $safePreheader = htmlspecialchars($preheader, ENT_QUOTES, 'UTF-8');

    return '<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>' . $safeTitle . '</title>
<style>
  :root { color-scheme: light; supported-color-schemes: light; }
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
  body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; }
  @media only screen and (max-width: 620px) {
    .email-container { width: 100% !important; max-width: 100% !important; }
    .email-content { padding: 20px 16px !important; }
  }
</style>
<!--[if mso]>
<xml>
<o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings>
</xml>
<![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
<div style="display: none; font-size: 1px; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all; font-family: sans-serif;">
  ' . $safePreheader . '
</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0; padding: 28px 12px; background-color: #f1f5f9; width: 100%;">
  <tr>
    <td align="center">
      <!-- Main White Container Card -->
      <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);">
        <!-- Header -->
        <tr>
          <td align="center" style="padding: 26px 24px 20px; background-color: #ffffff; border-bottom: 3px solid #0F766E;">
            <div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: 0.5px; text-transform: uppercase; margin: 0 0 4px;">
              AT SPECIALISTS AUSTRALIA
            </div>
            <div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; font-size: 11.5px; font-weight: 700; color: #0F766E; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 6px;">
              Assistive Technology &amp; Healthcare Specialists &bull; NDIS Registered Provider
            </div>
            <div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; font-size: 11px; color: #64748b; line-height: 1.4; margin: 0;">
              Level 2, 88 Holmes Road, Moonee Ponds VIC 3039 &bull; Phone: 0494 767 409 &bull; ABN 48 123 456 789
            </div>
          </td>
        </tr>
        <!-- Main Body Content -->
        <tr>
          <td class="email-content" style="padding: 28px 26px; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; font-size: 13.5px; line-height: 1.6; color: #1e293b; background-color: #ffffff;">
            ' . $bodyContent . '
            ' . $btnHtml . '
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding: 22px 24px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; font-size: 11px; color: #64748b; line-height: 1.6;">
            <div style="font-weight: 700; color: #334155; margin-bottom: 4px;">
              Assistive Technology Specialists Pty Ltd &bull; ABN 48 123 456 789
            </div>
            <div style="color: #64748b; margin-bottom: 6px;">
              NDIS Registered Provider &bull; Australian Clinical Equipment Standards
            </div>
            <div style="font-size: 10px; color: #94a3b8; line-height: 1.5; margin-bottom: 8px;">
              Confidentiality Notice: This medical and assistive technology communication is confidential and intended solely for the recipient. If received in error, please notify sender immediately.
            </div>
            <div style="font-weight: 600; color: #0F766E;">
              <a href="https://atspecialists.com.au" target="_blank" rel="noopener noreferrer" style="color: #0F766E; text-decoration: none;">atspecialists.com.au</a> &bull;
              <a href="mailto:admin@atspecialists.com.au" style="color: #0F766E; text-decoration: none;">admin@atspecialists.com.au</a> &bull;
              Phone: 0494 767 409
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>';
}
