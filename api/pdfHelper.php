<?php
// ==============================================================================
// AT SPECIALISTS AUSTRALIA - ATO / NDIS TAX INVOICE & QUOTE PDF GENERATOR
// ==============================================================================

declare(strict_types=1);

require_once __DIR__. '/fpdf.php';

const COMPANY_LEGAL_NAME = 'Assistive Technology Specialists Pty Ltd';
const COMPANY_TRADING_NAME = 'AT Specialists Australia';
const COMPANY_ABN = '48 123 456 789';
const COMPANY_NDIS_REG = '4-3M19KL2-PROV';
const COMPANY_ADDRESS = 'Level 2, 88 Holmes Road, Moonee Ponds VIC 3039';
const COMPANY_PHONE = '0494 767 409';
const COMPANY_EMAIL = 'admin@atspecialists.com.au';
const COMPANY_ACCOUNTS_EMAIL = 'accounts@atspecialists.com.au';
const COMPANY_WEB = 'https://atspecialists.com.au';
const COMPANY_BANK = 'Commonwealth Bank of Australia (CBA)';
const COMPANY_BSB = '063-000';
const COMPANY_ACC = '1088 4422';
const COMPANY_ACC_NAME = 'Assistive Technology Specialists Trust Account';

/**
 * Helper to safely convert UTF-8 strings to ISO-8859-1 for FPDF
 */
function fpdfSafeText(string $str): string {
    $clean = str_replace(['•', '–', '—', '’', '‘', '“', '”', '…'], ['-', '-', '-', "'", "'", '"', '"', '...'], $str);
    $converted = @iconv('UTF-8', 'windows-1252//TRANSLIT//IGNORE', $clean);
    return $converted !== false ? $converted : utf8_decode($clean);
}

/**
 * Generate Australian Tax Invoice PDF
 */
function generateOrderInvoicePdfPhp(array $order): string {
    $pdf = new FPDF('P', 'mm', 'A4');
    $pdf->SetMargins(12, 12, 12);
    $pdf->SetAutoPageBreak(true, 12);
    $pdf->AddPage();

    $invId = (string)($order['id'] ?? ($order['orderId'] ?? 'ATS-'. strtoupper(substr(md5((string)uniqid((string)rand(), true)), 0, 8))));
    $invDate = !empty($order['createdAt']) ? date('d/m/Y', strtotime((string)$order['createdAt'])) : date('d/m/Y');
    
    $compTrading = (string)($order['companyName'] ?? ($order['invoice_settings']['companyName'] ?? COMPANY_TRADING_NAME));
    $compLegal = (string)($order['companyLegalName'] ?? ($order['invoice_settings']['companyName'] ?? COMPANY_LEGAL_NAME));
    $compAbn = (string)($order['abn'] ?? ($order['invoice_settings']['abn'] ?? COMPANY_ABN));
    $compAddress = (string)($order['companyAddress'] ?? ($order['invoice_settings']['address'] ?? COMPANY_ADDRESS));
    $compPhone = (string)($order['companyPhone'] ?? ($order['invoice_settings']['phone'] ?? COMPANY_PHONE));
    $compEmail = (string)($order['companyEmail'] ?? ($order['invoice_settings']['email'] ?? COMPANY_EMAIL));
    $compBank = (string)($order['bankName'] ?? ($order['invoice_settings']['bankName'] ?? COMPANY_BANK));
    $compAccName = (string)($order['accountName'] ?? ($order['invoice_settings']['accountName'] ?? COMPANY_ACC_NAME));
    $compBsb = (string)($order['bsb'] ?? ($order['invoice_settings']['bsb'] ?? COMPANY_BSB));
    $compAcc = (string)($order['accountNumber'] ?? ($order['invoice_settings']['accountNumber'] ?? COMPANY_ACC));

    // Outer border
    $pdf->SetDrawColor(203, 213, 225); // #cbd5e1
    $pdf->SetLineWidth(0.3);
    $pdf->Rect(8, 8, 194, 281, 'D');

    // Header bar (Teal brand color #0F766E)
    $pdf->SetFillColor(15, 118, 110);
    $pdf->Rect(8, 8, 194, 24, 'F');

    $pdf->SetTextColor(255, 255, 255);
    $pdf->SetFont('Arial', 'B', 16);
    $pdf->SetXY(12, 12);
    $pdf->Cell(110, 8, fpdfSafeText($compTrading), 0, 0, 'L');

    $pdf->SetFont('Arial', 'B', 14);
    $pdf->SetXY(125, 12);
    $pdf->Cell(72, 8, fpdfSafeText('TAX INVOICE'), 0, 1, 'R');

    $pdf->SetFont('Arial', '', 8);
    $pdf->SetXY(12, 21);
    $pdf->Cell(110, 5, fpdfSafeText('Assistive Technology & Disability Equipment Supplies'), 0, 0, 'L');
    $pdf->SetXY(125, 21);
    $pdf->Cell(72, 5, fpdfSafeText('Invoice #: '. $invId), 0, 1, 'R');

    // Company & Invoice Meta Details
    $pdf->SetTextColor(30, 41, 59);
    $pdf->SetY(36);

    // Left Column: Business Details
    $pdf->SetFont('Arial', 'B', 9);
    $pdf->SetX(12);
    $pdf->Cell(95, 5, fpdfSafeText($compLegal), 0, 1, 'L');
    $pdf->SetFont('Arial', '', 8);
    $pdf->SetX(12);
    $pdf->Cell(95, 4, fpdfSafeText('ABN: '. $compAbn. ' | NDIS Reg: '. COMPANY_NDIS_REG), 0, 1, 'L');
    $pdf->SetX(12);
    $pdf->Cell(95, 4, fpdfSafeText($compAddress), 0, 1, 'L');
    $pdf->SetX(12);
    $pdf->Cell(95, 4, fpdfSafeText('Phone: '. $compPhone. ' | '. $compEmail), 0, 1, 'L');

    // Right Column: Invoice Info Box
    $pdf->SetY(36);
    $pdf->SetX(115);
    $pdf->SetFillColor(248, 250, 252);
    $pdf->SetDrawColor(226, 232, 240);
    $pdf->RoundedRect(115, 36, 82, 22, 2, 'DF');

    $pdf->SetXY(118, 38);
    $pdf->SetFont('Arial', 'B', 8);
    $pdf->Cell(35, 4, fpdfSafeText('Invoice Date:'), 0, 0, 'L');
    $pdf->SetFont('Arial', '', 8);
    $pdf->Cell(40, 4, fpdfSafeText($invDate), 0, 1, 'R');

    $paymentStatus = strtoupper((string)($order['paymentStatus'] ?? ($order['payment_status'] ?? 'PENDING')));
    $pdf->SetXY(118, 43);
    $pdf->SetFont('Arial', 'B', 8);
    $pdf->Cell(35, 4, fpdfSafeText('Payment Status:'), 0, 0, 'L');
    if ($paymentStatus === 'PAID') {
        $pdf->SetTextColor(16, 185, 129);
    } else {
        $pdf->SetTextColor(245, 158, 11);
    }
    $pdf->SetFont('Arial', 'B', 8);
    $pdf->Cell(40, 4, fpdfSafeText($paymentStatus), 0, 1, 'R');
    $pdf->SetTextColor(30, 41, 59);

    $paymentMethod = (string)($order['paymentMethod'] ?? ($order['payment_method'] ?? 'Online Payment'));
    $pdf->SetXY(118, 48);
    $pdf->SetFont('Arial', 'B', 8);
    $pdf->Cell(35, 4, fpdfSafeText('Payment Method:'), 0, 0, 'L');
    $pdf->SetFont('Arial', '', 8);
    $pdf->Cell(40, 4, fpdfSafeText(ucwords(str_replace('_', ' ', $paymentMethod))), 0, 1, 'R');

    // Customer & Shipping Box
    $pdf->SetY(62);
    $pdf->SetFillColor(241, 245, 249);
    $pdf->RoundedRect(12, 62, 185, 24, 2, 'DF');

    $customerName = (string)($order['customerName'] ?? ($order['customer']['name'] ?? ($order['customer_name'] ?? 'Valued Customer')));
    $customerEmail = (string)($order['customerEmail'] ?? ($order['customer']['email'] ?? ($order['customer_email'] ?? '')));
    $customerPhone = (string)($order['customerPhone'] ?? ($order['customer']['phone'] ?? ($order['customer_phone'] ?? '')));
    
    $shippingAddr = '';
    if (!empty($order['shippingAddress'])) {
        $shippingAddr = (string)$order['shippingAddress'];
    } elseif (!empty($order['shipping']) && is_array($order['shipping'])) {
        $s = $order['shipping'];
        $shippingAddr = trim(implode(', ', array_filter([$s['address'] ?? '', $s['city'] ?? '', $s['state'] ?? '', $s['postcode'] ?? ''])));
    }

    $ndisNo = (string)($order['ndisNumber'] ?? ($order['ndis_number'] ?? ''));

    $pdf->SetXY(16, 64);
    $pdf->SetFont('Arial', 'B', 8);
    $pdf->Cell(90, 4, fpdfSafeText('BILLED / SHIPPED TO:'), 0, 0, 'L');
    $pdf->Cell(85, 4, fpdfSafeText('NDIS & PARTICIPANT DETAILS:'), 0, 1, 'L');

    $pdf->SetXY(16, 69);
    $pdf->SetFont('Arial', 'B', 8);
    $pdf->Cell(90, 4, fpdfSafeText($customerName), 0, 0, 'L');
    $pdf->SetFont('Arial', '', 8);
    $pdf->Cell(85, 4, fpdfSafeText('NDIS Participant No: '. ($ndisNo !== '' ? $ndisNo : 'N/A (Direct Supply)')), 0, 1, 'L');

    $pdf->SetXY(16, 73);
    $pdf->SetFont('Arial', '', 8);
    $pdf->Cell(90, 4, fpdfSafeText(($customerEmail !== '' ? $customerEmail. ' ' : ''). ($customerPhone !== '' ? '| '. $customerPhone : '')), 0, 0, 'L');
    $pdf->Cell(85, 4, fpdfSafeText('Delivery Method: '. ucwords((string)($order['deliveryMethod'] ?? ($order['delivery_method'] ?? 'Standard Tracked Courier')))), 0, 1, 'L');

    $pdf->SetXY(16, 77);
    $pdf->Cell(90, 4, fpdfSafeText($shippingAddr !== '' ? $shippingAddr : 'Delivery address as per customer file'), 0, 1, 'L');

    // Line Items Table Header
    $pdf->SetY(91);
    $pdf->SetFillColor(15, 118, 110);
    $pdf->SetTextColor(255, 255, 255);
    $pdf->SetFont('Arial', 'B', 8);
    $pdf->Cell(10, 7, fpdfSafeText('#'), 0, 0, 'C', true);
    $pdf->Cell(64, 7, fpdfSafeText('Item Description'), 0, 0, 'L', true);
    $pdf->Cell(24, 7, fpdfSafeText('SKU / Code'), 0, 0, 'L', true);
    $pdf->Cell(20, 7, fpdfSafeText('Type'), 0, 0, 'C', true);
    $pdf->Cell(15, 7, fpdfSafeText('Qty'), 0, 0, 'C', true);
    $pdf->Cell(24, 7, fpdfSafeText('Unit Price'), 0, 0, 'R', true);
    $pdf->Cell(28, 7, fpdfSafeText('Total (AUD)'), 0, 1, 'R', true);

    // Parse Items
    $items = $order['items'] ?? [];
    if (is_string($items)) {
        $decoded = json_decode($items, true);
        if (is_array($decoded)) $items = $decoded;
    }
    if (!is_array($items)) $items = [];

    $pdf->SetTextColor(30, 41, 59);
    $pdf->SetFont('Arial', '', 8);
    $rowIdx = 0;
    $calcSubtotal = 0.0;

    foreach ($items as $item) {
        $rowIdx++;
        $isEven = ($rowIdx % 2 === 0);
        $pdf->SetFillColor($isEven ? 248 : 255, $isEven ? 250 : 255, $isEven ? 252 : 255);

        $name = (string)($item['name'] ?? 'Assistive Technology Item');
        $skuCode = (string)($item['sku'] ?? ($item['code'] ?? ($item['productId'] ?? ($item['product_id'] ?? ($item['id'] ?? '')))));
        $qty = intval($item['quantity'] ?? 1);
        $price = floatval($item['price'] ?? 0);
        $lineTotal = $price * $qty;
        $calcSubtotal += $lineTotal;

        $type = ($item['purchaseType'] ?? ($item['purchase_type'] ?? 'buy')) === 'hire' ? 'Rental' : 'Purchase';

        $pdf->Cell(10, 6, (string)$rowIdx, 'B', 0, 'C', true);
        $pdf->Cell(64, 6, fpdfSafeText(substr($name, 0, 36)), 'B', 0, 'L', true);
        $pdf->Cell(24, 6, fpdfSafeText(substr($skuCode, 0, 13)), 'B', 0, 'L', true);
        $pdf->Cell(20, 6, fpdfSafeText($type), 'B', 0, 'C', true);
        $pdf->Cell(15, 6, (string)$qty, 'B', 0, 'C', true);
        $pdf->Cell(24, 6, '$'. number_format($price, 2), 'B', 0, 'R', true);
        $pdf->Cell(28, 6, '$'. number_format($lineTotal, 2), 'B', 1, 'R', true);
    }

    // Pad empty rows if fewer than 3 items
    while ($rowIdx < 3) {
        $rowIdx++;
        $isEven = ($rowIdx % 2 === 0);
        $pdf->SetFillColor($isEven ? 248 : 255, $isEven ? 250 : 255, $isEven ? 252 : 255);
        $pdf->Cell(10, 6, '', 'B', 0, 'C', true);
        $pdf->Cell(64, 6, '', 'B', 0, 'L', true);
        $pdf->Cell(24, 6, '', 'B', 0, 'L', true);
        $pdf->Cell(20, 6, '', 'B', 0, 'C', true);
        $pdf->Cell(15, 6, '', 'B', 0, 'C', true);
        $pdf->Cell(24, 6, '', 'B', 0, 'R', true);
        $pdf->Cell(28, 6, '', 'B', 1, 'R', true);
    }

    // Totals Table & Bank Details
    // Cart rule: totals are GST-inclusive, so total = subtotal + deliveryFee (never + gstTotal).
    $subtotal = floatval($order['subtotal'] ?? $calcSubtotal);
    $deliveryFee = floatval($order['deliveryFee'] ?? ($order['delivery_fee'] ?? 0));
    $gstTotal = floatval($order['gstTotal'] ?? ($order['gst_total'] ?? 0));
    $total = floatval($order['total'] ?? ($order['total_amount'] ?? ($subtotal + $deliveryFee)));

    $yAfterTable = $pdf->GetY() + 4;

    // Bank Details Box on Left
    $pdf->SetXY(12, $yAfterTable);
    $pdf->SetFillColor(241, 245, 249);
    $pdf->RoundedRect(12, $yAfterTable, 105, 34, 2, 'DF');

    $pdf->SetXY(15, $yAfterTable + 2);
    $pdf->SetFont('Arial', 'B', 8);
    $pdf->Cell(100, 4, fpdfSafeText('DIRECT BANK TRANSFER / PAYMENT DETAILS:'), 0, 1, 'L');

    $pdf->SetFont('Arial', '', 7.5);
    $pdf->SetXY(15, $yAfterTable + 7);
    $pdf->Cell(100, 4, fpdfSafeText('Bank: '. $compBank), 0, 1, 'L');
    $pdf->SetXY(15, $yAfterTable + 12);
    $pdf->Cell(100, 4, fpdfSafeText('Account Name: '. $compAccName), 0, 1, 'L');
    $pdf->SetXY(15, $yAfterTable + 17);
    $pdf->Cell(100, 4, fpdfSafeText('BSB: '. $compBsb. ' | Account Number: '. $compAcc), 0, 1, 'L');
    $pdf->SetXY(15, $yAfterTable + 22);
    $pdf->SetFont('Arial', 'B', 7.5);
    $pdf->Cell(100, 4, fpdfSafeText('Payment Reference: '. $invId), 0, 1, 'L');
    $pdf->SetFont('Arial', '', 7);
    $pdf->SetXY(15, $yAfterTable + 27);
    $pdf->Cell(100, 4, fpdfSafeText('Remittance Email: '. $compEmail), 0, 1, 'L');

    // Totals on Right
    $pdf->SetXY(122, $yAfterTable);
    $pdf->SetFont('Arial', '', 8);
    $pdf->Cell(38, 5, fpdfSafeText('Subtotal (ex GST):'), 0, 0, 'L');
    $pdf->Cell(32, 5, '$'. number_format($subtotal, 2), 0, 1, 'R');

    $pdf->SetX(122);
    $pdf->Cell(38, 5, fpdfSafeText('Freight & Handling:'), 0, 0, 'L');
    $pdf->Cell(32, 5, '$'. number_format($deliveryFee, 2), 0, 1, 'R');

    $pdf->SetX(122);
    $pdf->Cell(38, 5, fpdfSafeText('GST Total:'), 0, 0, 'L');
    $pdf->Cell(32, 5, '$'. number_format($gstTotal, 2), 0, 1, 'R');

    $pdf->SetX(122);
    $pdf->SetDrawColor(15, 118, 110);
    $pdf->SetLineWidth(0.4);
    $pdf->Line(122, $pdf->GetY() + 1, 192, $pdf->GetY() + 1);

    $pdf->SetY($pdf->GetY() + 2);
    $pdf->SetX(122);
    $pdf->SetFont('Arial', 'B', 10);
    $pdf->SetTextColor(15, 118, 110);
    $pdf->Cell(38, 7, fpdfSafeText('Total Amount (AUD):'), 0, 0, 'L');
    $pdf->Cell(32, 7, '$'. number_format($total, 2), 0, 1, 'R');

    // NDIS & GST Compliance Note Box at bottom
    $pdf->SetTextColor(71, 85, 105);
    $pdf->SetXY(12, 245);
    $pdf->SetFillColor(248, 250, 252);
    $pdf->SetDrawColor(226, 232, 240);
    $pdf->RoundedRect(12, 245, 185, 26, 2, 'DF');

    $pdf->SetXY(16, 247);
    $pdf->SetFont('Arial', 'B', 7.5);
    $pdf->Cell(177, 4, fpdfSafeText('ATO TAX COMPLIANCE & NDIS FUNDING STATEMENT:'), 0, 1, 'L');

    $pdf->SetFont('Arial', '', 7);
    $pdf->SetXY(16, 252);
    $pdf->MultiCell(177, 3.5, fpdfSafeText("This Tax Invoice is issued by Assistive Technology Specialists Pty Ltd (ABN 48 123 456 789). Supplies of medical assistive technology and disability equipment to NDIS participants and individuals with disabilities are GST-Free in accordance with Section 38-45 of A New Tax System (Goods and Services Tax) Act 1999. Thank you for choosing AT Specialists Australia."), 0, 'L');

    return $pdf->Output('S');
}

/**
 * Generate NDIS Equipment Quote PDF
 */
function generateQuotePdfPhp(array $quote): string {
    $pdf = new FPDF('P', 'mm', 'A4');
    $pdf->SetMargins(12, 12, 12);
    $pdf->SetAutoPageBreak(true, 12);
    $pdf->AddPage();

    $quoteId = (string)($quote['id'] ?? ('ATS-Q-'. date('Y'). '-'. rand(1000, 9999)));
    $quoteDate = !empty($quote['createdAt']) ? date('d/m/Y', strtotime((string)$quote['createdAt'])) : date('d/m/Y');
    $validUntil = !empty($quote['validUntil']) ? date('d/m/Y', strtotime((string)$quote['validUntil'])) : date('d/m/Y', strtotime('+30 days'));

    // Border & Header
    $pdf->SetDrawColor(203, 213, 225);
    $pdf->SetLineWidth(0.3);
    $pdf->Rect(8, 8, 194, 281, 'D');

    $pdf->SetFillColor(15, 118, 110);
    $pdf->Rect(8, 8, 194, 24, 'F');

    $pdf->SetTextColor(255, 255, 255);
    $pdf->SetFont('Arial', 'B', 16);
    $pdf->SetXY(12, 12);
    $pdf->Cell(110, 8, fpdfSafeText(COMPANY_TRADING_NAME), 0, 0, 'L');

    $pdf->SetFont('Arial', 'B', 14);
    $pdf->SetXY(125, 12);
    $pdf->Cell(72, 8, fpdfSafeText('NDIS EQUIPMENT QUOTE'), 0, 1, 'R');

    $pdf->SetFont('Arial', '', 8);
    $pdf->SetXY(12, 21);
    $pdf->Cell(110, 5, fpdfSafeText('NDIS Assistive Technology Provider'), 0, 0, 'L');
    $pdf->SetXY(125, 21);
    $pdf->Cell(72, 5, fpdfSafeText('Quote #: '. $quoteId), 0, 1, 'R');

    // Participant Details
    $pdf->SetTextColor(30, 41, 59);
    $pdf->SetY(36);
    $pdf->SetFillColor(241, 245, 249);
    $pdf->RoundedRect(12, 36, 185, 24, 2, 'DF');

    $pdf->SetXY(16, 38);
    $pdf->SetFont('Arial', 'B', 8);
    $pdf->Cell(90, 4, fpdfSafeText('PARTICIPANT / CLIENT DETAILS:'), 0, 0, 'L');
    $pdf->Cell(85, 4, fpdfSafeText('QUOTE VALIDITY:'), 0, 1, 'L');

    $pdf->SetXY(16, 43);
    $pdf->SetFont('Arial', 'B', 8);
    $pdf->Cell(90, 4, fpdfSafeText((string)($quote['customerName'] ?? 'NDIS Participant')), 0, 0, 'L');
    $pdf->SetFont('Arial', '', 8);
    $pdf->Cell(85, 4, fpdfSafeText('Date Issued: '. $quoteDate. ' | Valid Until: '. $validUntil), 0, 1, 'L');

    $pdf->SetXY(16, 48);
    $pdf->Cell(90, 4, fpdfSafeText('NDIS Participant No: '. ((string)($quote['ndisNumber'] ?? 'Pending'))), 0, 0, 'L');
    $pdf->Cell(85, 4, fpdfSafeText('Plan Manager: '. ((string)($quote['planManager'] ?? 'Self / Plan Managed'))), 0, 1, 'L');

    // Table
    $pdf->SetY(65);
    $pdf->SetFillColor(15, 118, 110);
    $pdf->SetTextColor(255, 255, 255);
    $pdf->SetFont('Arial', 'B', 8);
    $pdf->Cell(10, 7, fpdfSafeText('#'), 0, 0, 'C', true);
    $pdf->Cell(66, 7, fpdfSafeText('Item / Equipment Description'), 0, 0, 'L', true);
    $pdf->Cell(24, 7, fpdfSafeText('SKU / Code'), 0, 0, 'L', true);
    $pdf->Cell(35, 7, fpdfSafeText('NDIS Support Category'), 0, 0, 'L', true);
    $pdf->Cell(15, 7, fpdfSafeText('Qty'), 0, 0, 'C', true);
    $pdf->Cell(27, 7, fpdfSafeText('Total (AUD)'), 0, 1, 'R', true);

    $items = $quote['items'] ?? [];
    if (is_string($items)) {
        $decoded = json_decode($items, true);
        if (is_array($decoded)) $items = $decoded;
    }
    if (!is_array($items)) $items = [];

    $pdf->SetTextColor(30, 41, 59);
    $pdf->SetFont('Arial', '', 8);
    $rowIdx = 0;
    $total = 0.0;

    foreach ($items as $item) {
        $rowIdx++;
        $isEven = ($rowIdx % 2 === 0);
        $pdf->SetFillColor($isEven ? 248 : 255, $isEven ? 250 : 255, $isEven ? 252 : 255);
        $name = (string)($item['name'] ?? 'Assistive Technology Item');
        $skuCode = (string)($item['sku'] ?? ($item['code'] ?? ($item['productId'] ?? ($item['product_id'] ?? ($item['id'] ?? '')))));
        $category = (string)($item['fundingCategory'] ?? 'Core / Capital (AT)');
        $qty = intval($item['quantity'] ?? 1);
        $price = floatval($item['price'] ?? 0);
        $lineTotal = $price * $qty;
        $total += $lineTotal;

        $pdf->Cell(10, 6, (string)$rowIdx, 'B', 0, 'C', true);
        $pdf->Cell(66, 6, fpdfSafeText(substr($name, 0, 36)), 'B', 0, 'L', true);
        $pdf->Cell(24, 6, fpdfSafeText(substr($skuCode, 0, 13)), 'B', 0, 'L', true);
        $pdf->Cell(35, 6, fpdfSafeText($category), 'B', 0, 'L', true);
        $pdf->Cell(15, 6, (string)$qty, 'B', 0, 'C', true);
        $pdf->Cell(27, 6, '$'. number_format($lineTotal, 2), 'B', 1, 'R', true);
    }

    $pdf->SetY($pdf->GetY() + 4);
    $pdf->SetX(120);
    $pdf->SetFont('Arial', 'B', 10);
    $pdf->SetTextColor(15, 118, 110);
    $pdf->Cell(40, 7, fpdfSafeText('Quote Total (AUD):'), 0, 0, 'L');
    $pdf->Cell(27, 7, '$'. number_format($total, 2), 0, 1, 'R');

    return $pdf->Output('S');
}
