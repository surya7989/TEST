<?php
// ==============================================================================
// PHYSIO CARE & REHAB SERVICES - ROBUST PURE PHP PDF ENGINE (FPDF 1.86 COMPLIANT)
// ==============================================================================

if (!class_exists('FPDF')) {
class FPDF {
    protected $page;
    protected $n;
    protected $offsets;
    protected $buffer;
    protected $pages;
    protected $state;
    protected $compress;
    protected $k;
    protected $DefOrientation;
    protected $CurOrientation;
    protected $StdPageSizes;
    protected $DefPageSize;
    protected $CurPageSize;
    protected $CurRotation;
    protected $PageInfo;
    protected $wPt, $hPt;
    protected $w, $h;
    protected $lMargin, $tMargin, $rMargin, $bMargin;
    protected $x, $y;
    protected $lasth;
    protected $LineWidth;
    protected $fontpath;
    protected $CoreFonts;
    protected $fonts;
    protected $FontFiles;
    protected $diffs;
    protected $FontFamily;
    protected $FontStyle;
    protected $underline;
    protected $CurrentFont;
    protected $FontSizePt;
    protected $FontSize;
    protected $DrawColor;
    protected $FillColor;
    protected $TextColor;
    protected $ColorFlag;
    protected $WithAlpha;
    protected $ws;
    protected $AutoPageBreak;
    protected $PageBreakTrigger;
    protected $InHeader, $InFooter;
    protected $AliasNbPages;
    protected $ZoomMode;
    protected $LayoutMode;
    protected $metadata;
    protected $PDFVersion;
    protected $cMargin;

    function __construct($orientation='P', $unit='mm', $size='A4') {
        $this->state = 0;
        $this->page = 0;
        $this->n = 2; // Reserve 1 for Pages, 2 for Resources
        $this->buffer = '';
        $this->pages = [];
        $this->PageInfo = [];
        $this->fonts = [];
        $this->images = [];
        $this->FontFiles = [];
        $this->diffs = [];
        $this->offsets = [];
        $this->CurRotation = 0;
        $this->metadata = [];
        $this->compress = true;
        $this->PDFVersion = '1.4';
        $this->CoreFonts = ['courier', 'helvetica', 'times', 'symbol', 'zapfdingbats'];

        if ($unit == 'pt') $this->k = 1;
        elseif ($unit == 'mm') $this->k = 72/25.4;
        elseif ($unit == 'cm') $this->k = 72/2.54;
        elseif ($unit == 'in') $this->k = 72;
        else $this->Error('Incorrect unit: '. $unit);

        $this->StdPageSizes = [
            'a3' => [841.89, 1190.55],
            'a4' => [595.28, 841.89],
            'a5' => [420.94, 595.28],
            'letter' => [612, 792],
            'legal' => [612, 1008]
        ];
        $size = $this->_getpagesize($size);
        $this->DefPageSize = $size;
        $this->CurPageSize = $size;

        $orientation = strtolower($orientation);
        if ($orientation == 'p' || $orientation == 'portrait') {
            $this->DefOrientation = 'P';
            $this->w = $size[0];
            $this->h = $size[1];
        } elseif ($orientation == 'l' || $orientation == 'landscape') {
            $this->DefOrientation = 'L';
            $this->w = $size[1];
            $this->h = $size[0];
        } else $this->Error('Incorrect orientation: '. $orientation);

        $this->CurOrientation = $this->DefOrientation;
        $this->wPt = $this->w * $this->k;
        $this->hPt = $this->h * $this->k;

        $margin = 28.35 / $this->k;
        $this->SetMargins($margin, $margin);
        $this->cMargin = $margin / 10;
        $this->LineWidth =.567 / $this->k;
        $this->SetAutoPageBreak(true, 2 * $margin);
        $this->SetDisplayMode('default');
        $this->SetCompression(true);
        $this->fontpath = '';
    }

    function SetMargins($left, $top, $right=null) {
        $this->lMargin = $left;
        $this->tMargin = $top;
        $this->rMargin = ($right === null) ? $left : $right;
    }

    function SetLeftMargin($margin) {
        $this->lMargin = $margin;
        if ($this->page > 0 && $this->x < $margin) $this->x = $margin;
    }

    function SetTopMargin($margin) {
        $this->tMargin = $margin;
    }

    function SetRightMargin($margin) {
        $this->rMargin = $margin;
    }

    function SetAutoPageBreak($auto, $margin=0) {
        $this->AutoPageBreak = $auto;
        $this->bMargin = $margin;
        $this->PageBreakTrigger = $this->h - $margin;
    }

    function SetDisplayMode($zoom, $layout='default') {
        if ($zoom == 'fullpage' || $zoom == 'fullwidth' || $zoom == 'real' || $zoom == 'default' || !is_string($zoom))
            $this->ZoomMode = $zoom;
        else
            $this->Error('Incorrect zoom display mode: '. $zoom);
        if ($layout == 'single' || $layout == 'continuous' || $layout == 'two' || $layout == 'default')
            $this->LayoutMode = $layout;
        else
            $this->Error('Incorrect layout display mode: '. $layout);
    }

    function SetCompression($compress) {
        $this->compress = (function_exists('gzcompress') && $compress);
    }

    function SetTitle($title, $isUTF8=false) {
        $this->metadata['Title'] = $isUTF8 ? $title : $this->_sanitizeText($title);
    }

    function SetAuthor($author, $isUTF8=false) {
        $this->metadata['Author'] = $isUTF8 ? $author : $this->_sanitizeText($author);
    }

    function Error($msg) {
        throw new Exception('FPDF error: '. $msg);
    }

    function Open() {
        $this->state = 1;
        $this->_putheader();
    }

    function Close() {
        if ($this->state == 3) return;
        if ($this->page == 0) $this->AddPage();
        $this->InFooter = true;
        $this->Footer();
        $this->InFooter = false;
        $this->_endpage();
        $this->_enddoc();
    }

    function AddPage($orientation='', $size='', $rotation=0) {
        if ($this->state == 0) $this->Open();
        $family = $this->FontFamily;
        $style = $this->FontStyle. ($this->underline ? 'U' : '');
        $fontsize = $this->FontSizePt;
        $lw = $this->LineWidth;
        $dc = $this->DrawColor;
        $fc = $this->FillColor;
        $tc = $this->TextColor;
        $cf = $this->ColorFlag;

        if ($this->page > 0) {
            $this->InFooter = true;
            $this->Footer();
            $this->InFooter = false;
            $this->_endpage();
        }

        $this->_beginpage($orientation, $size, $rotation);
        $this->_out('2 J');
        $this->LineWidth = $lw;
        $this->_out(sprintf('%.2F w', $lw * $this->k));
        if ($family) $this->SetFont($family, $style, $fontsize);
        $this->DrawColor = $dc;
        if ($dc != '0 G') $this->_out($dc);
        $this->FillColor = $fc;
        if ($fc != '0 g') $this->_out($fc);
        $this->TextColor = $tc;
        $this->ColorFlag = $cf;

        $this->InHeader = true;
        $this->Header();
        $this->InHeader = false;

        if ($this->LineWidth != $lw) {
            $this->LineWidth = $lw;
            $this->_out(sprintf('%.2F w', $lw * $this->k));
        }
        if ($family) $this->SetFont($family, $style, $fontsize);
        if ($this->DrawColor != $dc) {
            $this->DrawColor = $dc;
            $this->_out($dc);
        }
        if ($this->FillColor != $fc) {
            $this->FillColor = $fc;
            $this->_out($fc);
        }
        $this->TextColor = $tc;
        $this->ColorFlag = $cf;
    }

    function Header() {}
    function Footer() {}
    function PageNo() { return $this->page; }

    function SetDrawColor($r, $g=null, $b=null) {
        if (($r == 0 && $g == 0 && $b == 0) || $g === null)
            $this->DrawColor = sprintf('%.3F G', $r / 255);
        else
            $this->DrawColor = sprintf('%.3F %.3F %.3F RG', $r / 255, $g / 255, $b / 255);
        if ($this->page > 0) $this->_out($this->DrawColor);
    }

    function SetFillColor($r, $g=null, $b=null) {
        if (($r == 0 && $g == 0 && $b == 0) || $g === null)
            $this->FillColor = sprintf('%.3F g', $r / 255);
        else
            $this->FillColor = sprintf('%.3F %.3F %.3F rg', $r / 255, $g / 255, $b / 255);
        $this->ColorFlag = ($this->FillColor != $this->TextColor);
        if ($this->page > 0) $this->_out($this->FillColor);
    }

    function SetTextColor($r, $g=null, $b=null) {
        if (($r == 0 && $g == 0 && $b == 0) || $g === null)
            $this->TextColor = sprintf('%.3F g', $r / 255);
        else
            $this->TextColor = sprintf('%.3F %.3F %.3F rg', $r / 255, $g / 255, $b / 255);
        $this->ColorFlag = ($this->FillColor != $this->TextColor);
    }

    function _sanitizeText($str) {
        if ($str === null || $str === '') return '';
        if (is_array($str)) $str = implode(', ', array_filter($str));
        $str = (string)$str;
        
        $replacements = [
            "\xE2\x80\x94" => '-',
            "\xE2\x80\x93" => '-',
            "\xE2\x80\x98" => "'",
            "\xE2\x80\x99" => "'",
            "\xE2\x80\x9C" => '"',
            "\xE2\x80\x9D" => '"',
            "\xE2\x80\xA2" => '*',
            "\xE2\x80\xA6" => '...',
            "\xC2\xA0" => ' ',
            "\xE2\x86\x92" => '->',
            "—" => '-',
            "–" => '-',
            "‘" => "'",
            "’" => "'",
            "“" => '"',
            "”" => '"',
            "•" => '*',
            "…" => '...',
        ];
        $str = strtr($str, $replacements);

        if (function_exists('mb_convert_encoding')) {
            $conv = @mb_convert_encoding($str, 'ISO-8859-1', 'UTF-8');
            if ($conv !== false) return $conv;
        }
        if (function_exists('iconv')) {
            $conv = @iconv('UTF-8', 'ISO-8859-1//TRANSLIT//IGNORE', $str);
            if ($conv !== false) return $conv;
        }
        return utf8_decode($str);
    }

    function GetStringWidth($s) {
        $s = $this->_sanitizeText($s);
        $cw = &$this->CurrentFont['cw'];
        $w = 0;
        $l = strlen($s);
        for ($i=0; $i<$l; $i++) {
            $w += $cw[$s[$i]] ?? 600;
        }
        return $w * $this->FontSize / 1000;
    }

    function SetLineWidth($width) {
        $this->LineWidth = $width;
        if ($this->page > 0) $this->_out(sprintf('%.2F w', $width * $this->k));
    }

    function Line($x1, $y1, $x2, $y2) {
        $this->_out(sprintf('%.2F %.2F m %.2F %.2F l S', $x1*$this->k, ($this->h-$y1)*$this->k, $x2*$this->k, ($this->h-$y2)*$this->k));
    }

    function Rect($x, $y, $w, $h, $style='') {
        if ($style == 'F') $op = 'f';
        elseif ($style == 'FD' || $style == 'DF') $op = 'B';
        else $op = 'S';
        $this->_out(sprintf('%.2F %.2F %.2F %.2F re %s', $x*$this->k, ($this->h-$y)*$this->k, $w*$this->k, -$h*$this->k, $op));
    }

    function RoundedRect($x, $y, $w, $h, $r, $style='') {
        if ($w <= 0 || $h <= 0) return;
        $r = max(0, min($r, $w / 2, $h / 2));
        if ($r == 0) {
            $this->Rect($x, $y, $w, $h, $style);
            return;
        }
        if ($style == 'F') $op = 'f';
        elseif ($style == 'FD' || $style == 'DF') $op = 'B';
        else $op = 'S';
        $k = $this->k;
        $hp = $this->h;
        // Approximation constant for a circular arc with cubic Bezier curves.
        $arc = 4 / 3 * (sqrt(2) - 1);
        $this->_out(sprintf('%.2F %.2F m', ($x + $r) * $k, ($hp - $y) * $k));
        $xc = $x + $w - $r;
        $yc = $y + $r;
        // Top edge + top-right corner
        $this->_out(sprintf('%.2F %.2F l', $xc * $k, ($hp - $y) * $k));
        $this->_Arc($xc + $r * $arc, $y, $xc + $r, $y + $r * (1 - $arc), $xc + $r, $yc);
        $xc = $x + $w - $r;
        $yc = $y + $h - $r;
        // Right edge + bottom-right corner
        $this->_out(sprintf('%.2F %.2F l', ($x + $w) * $k, ($hp - $yc) * $k));
        $this->_Arc($x + $w, $yc + $r * $arc, $x + $w - $r * (1 - $arc), $yc + $r, $xc, $y + $h);
        $xc = $x + $r;
        $yc = $y + $h - $r;
        // Bottom edge + bottom-left corner
        $this->_out(sprintf('%.2F %.2F l', $xc * $k, ($hp - ($y + $h)) * $k));
        $this->_Arc($xc - $r * $arc, $y + $h, $x, $y + $h - $r * (1 - $arc), $x, $yc);
        $xc = $x + $r;
        $yc = $y + $r;
        // Left edge + top-left corner
        $this->_out(sprintf('%.2F %.2F l', $x * $k, ($hp - $yc) * $k));
        $this->_Arc($x, $yc - $r * $arc, $x + $r * (1 - $arc), $y, $xc, $y);
        $this->_out($op);
    }

    function _Arc($x1, $y1, $x2, $y2, $x3, $y3) {
        $h = $this->h;
        $this->_out(sprintf('%.2F %.2F %.2F %.2F %.2F %.2F c ', $x1*$this->k, ($h-$y1)*$this->k, $x2*$this->k, ($h-$y2)*$this->k, $x3*$this->k, ($h-$y3)*$this->k));
    }

    function SetFont($family, $style='', $size=0) {
        if ($family == '') $family = $this->FontFamily;
        else $family = strtolower($family);
        $style = strtoupper($style);
        if (strpos($style, 'U') !== false) {
            $this->underline = true;
            $style = str_replace('U', '', $style);
        } else $this->underline = false;
        if ($style == 'IB') $style = 'BI';
        if ($size == 0) $size = $this->FontSizePt;

        if ($family == 'arial') $family = 'helvetica';
        $fontkey = $family. $style;
        if (!isset($this->fonts[$fontkey])) {
            $this->_loadfont($family, $style);
        }
        $this->FontFamily = $family;
        $this->FontStyle = $style;
        $this->FontSizePt = $size;
        $this->FontSize = $size / $this->k;
        $this->CurrentFont = &$this->fonts[$fontkey];
        if ($this->page > 0) $this->_out(sprintf('BT /F%d %.2F Tf ET', $this->CurrentFont['i'], $this->FontSizePt));
    }

    function SetFontSize($size) {
        if ($this->FontSizePt == $size) return;
        $this->FontSizePt = $size;
        $this->FontSize = $size / $this->k;
        if ($this->page > 0) $this->_out(sprintf('BT /F%d %.2F Tf ET', $this->CurrentFont['i'], $this->FontSizePt));
    }

    function SetXY($x, $y) {
        $this->SetY($y);
        $this->SetX($x);
    }

    function SetX($x) {
        if ($x >= 0) $this->x = $x;
        else $this->x = $this->w + $x;
    }

    function SetY($y, $resetX=true) {
        if ($y >= 0) $this->y = $y;
        else $this->y = $this->h + $y;
        if ($resetX) $this->x = $this->lMargin;
    }

    function GetX() { return $this->x; }
    function GetY() { return $this->y; }

    function Cell($w, $h=0, $txt='', $border=0, $ln=0, $align='', $fill=false, $link='') {
        $k = $this->k;
        if ($this->y + $h > $this->PageBreakTrigger && !$this->InHeader && !$this->InFooter && $this->AcceptPageBreak()) {
            $x = $this->x;
            $ws = $this->ws;
            if ($ws > 0) { $this->ws = 0; $this->_out('0 Tw'); }
            $this->AddPage($this->CurOrientation, $this->CurPageSize, $this->CurRotation);
            $this->x = $x;
            if ($ws > 0) { $this->ws = $ws; $this->_out(sprintf('%.3F Tw', $ws * $k)); }
        }
        if ($w == 0) $w = $this->w - $this->rMargin - $this->x;
        $s = '';
        if ($fill || $border == 1) {
            if ($fill) $op = ($border == 1) ? 'B' : 'f';
            else $op = 'S';
            $s = sprintf('%.2F %.2F %.2F %.2F re %s ', $this->x*$k, ($this->h-$this->y)*$k, $w*$k, -$h*$k, $op);
        }
        if (is_string($border)) {
            $x = $this->x;
            $y = $this->y;
            if (strpos($border, 'L') !== false) $s.= sprintf('%.2F %.2F m %.2F %.2F l S ', $x*$k, ($this->h-$y)*$k, $x*$k, ($this->h-($y+$h))*$k);
            if (strpos($border, 'T') !== false) $s.= sprintf('%.2F %.2F m %.2F %.2F l S ', $x*$k, ($this->h-$y)*$k, ($x+$w)*$k, ($this->h-$y)*$k);
            if (strpos($border, 'R') !== false) $s.= sprintf('%.2F %.2F m %.2F %.2F l S ', ($x+$w)*$k, ($this->h-$y)*$k, ($x+$w)*$k, ($this->h-($y+$h))*$k);
            if (strpos($border, 'B') !== false) $s.= sprintf('%.2F %.2F m %.2F %.2F l S ', $x*$k, ($this->h-($y+$h))*$k, ($x+$w)*$k, ($this->h-($y+$h))*$k);
        }
        if ($txt !== '') {
            $txt = $this->_sanitizeText($txt);
            if ($align == 'R') $dx = $w - $this->cMargin - $this->GetStringWidth($txt);
            elseif ($align == 'C') $dx = ($w - $this->GetStringWidth($txt)) / 2;
            else $dx = $this->cMargin;
            if ($this->ColorFlag) $s.= 'q '. $this->TextColor. ' ';
            $s.= sprintf('BT %.2F %.2F Td (%s) Tj ET', ($this->x+$dx)*$k, ($this->h-($this->y+.5*$h+.3*$this->FontSize))*$k, $this->_escape($txt));
            if ($this->underline) $s.= ' '. $this->_dounderline($this->x+$dx, $this->y+.5*$h+.3*$this->FontSize, $txt);
            if ($this->ColorFlag) $s.= ' Q';
        }
        if ($s) $this->_out($s);
        $this->lasth = $h;
        if ($ln > 0) {
            $this->y += $h;
            if ($ln == 1) $this->x = $this->lMargin;
        } else $this->x += $w;
    }

    function MultiCell($w, $h, $txt, $border=0, $align='J', $fill=false) {
        $cw = &$this->CurrentFont['cw'];
        if ($w == 0) $w = $this->w - $this->rMargin - $this->x;
        $wmax = ($w - 2 * $this->cMargin) * 1000 / $this->FontSize;
        $s = str_replace("\r", '', $this->_sanitizeText($txt));
        $nb = strlen($s);
        if ($nb > 0 && $s[$nb-1] == "\n") $nb--;
        $b = 0;
        if ($border) {
            if ($border == 1) {
                $border = 'LTRB';
                $b = 'LRT';
                $b2 = 'LR';
            } else {
                $b2 = '';
                if (strpos($border, 'L') !== false) $b2.= 'L';
                if (strpos($border, 'R') !== false) $b2.= 'R';
                $b = (strpos($border, 'T') !== false) ? $b2. 'T' : $b2;
            }
        }
        $sep = -1;
        $i = 0;
        $j = 0;
        $l = 0;
        $ns = 0;
        $nl = 1;
        while ($i < $nb) {
            $c = $s[$i];
            if ($c == "\n") {
                $this->Cell($w, $h, substr($s, $j, $i-$j), $b, 2, $align, $fill);
                $i++;
                $sep = -1;
                $j = $i;
                $l = 0;
                $ns = 0;
                $nl++;
                if ($border && $nl == 2) $b = $b2;
                continue;
            }
            if ($c == ' ') { $sep = $i; $ls = $l; $ns++; }
            $l += $cw[$c] ?? 600;
            if ($l > $wmax) {
                if ($sep == -1) {
                    if ($i == $j) $i++;
                    $this->Cell($w, $h, substr($s, $j, $i-$j), $b, 2, $align, $fill);
                } else {
                    $this->Cell($w, $h, substr($s, $j, $sep-$j), $b, 2, $align, $fill);
                    $i = $sep + 1;
                }
                $sep = -1;
                $j = $i;
                $l = 0;
                $ns = 0;
                $nl++;
                if ($border && $nl == 2) $b = $b2;
            } else $i++;
        }
        if ($border && strpos($border, 'B') !== false) $b.= 'B';
        $this->Cell($w, $h, substr($s, $j, $i-$j), $b, 2, $align, $fill);
        $this->x = $this->lMargin;
    }

    function Image($file, $x=null, $y=null, $w=0, $h=0, $type='', $link='') {
        if (!file_exists($file)) return;
        if (!isset($this->images[$file])) {
            $info = @getimagesize($file);
            if ($info === false) return;
            $wImg = $info[0];
            $hImg = $info[1];
            $mime = $info['mime'] ?? '';
            
            $imgData = null;
            if ($info[2] == IMAGETYPE_JPEG || stripos($mime, 'jpeg') !== false || stripos($mime, 'jpg') !== false) {
                $imgData = file_get_contents($file);
            } elseif ($info[2] == IMAGETYPE_PNG || stripos($mime, 'png') !== false) {
                if (function_exists('imagecreatefrompng')) {
                    $im = @imagecreatefrompng($file);
                    if ($im) {
                        $canvas = imagecreatetruecolor($wImg, $hImg);
                        $white = imagecolorallocate($canvas, 255, 255, 255);
                        imagefilledrectangle($canvas, 0, 0, $wImg, $hImg, $white);
                        imagecopy($canvas, $im, 0, 0, 0, 0, $wImg, $hImg);
                        imagedestroy($im);
                        ob_start();
                        imagejpeg($canvas, null, 95);
                        $imgData = ob_get_clean();
                        imagedestroy($canvas);
                    }
                }
                if (!$imgData) {
                    $imgData = file_get_contents($file);
                }
            } else {
                $imgData = file_get_contents($file);
            }
            
            if (!$imgData) return;

            $i = count($this->images) + 1;
            $this->images[$file] = [
                'i' => $i,
                'n' => 0,
                'w' => $wImg,
                'h' => $hImg,
                'cs' => 'DeviceRGB',
                'bpc' => 8,
                'f' => 'DCTDecode',
                'data' => $imgData
            ];
        }

        if ($x === null) $x = $this->x;
        if ($y === null) $y = $this->y;

        $info = $this->images[$file];
        if ($w == 0 && $h == 0) {
            $w = $info['w'] / $this->k;
            $h = $info['h'] / $this->k;
        } elseif ($w == 0) {
            $w = $h * $info['w'] / $info['h'];
        } elseif ($h == 0) {
            $h = $w * $info['h'] / $info['w'];
        }

        $this->_out(sprintf('q %.2F 0 0 %.2F %.2F %.2F cm /I%d Do Q', $w*$this->k, $h*$this->k, $x*$this->k, ($this->h-($y+$h))*$this->k, $this->images[$file]['i']));
    }

    function Ln($h=null) {
        $this->x = $this->lMargin;
        if ($h === null) $this->y += $this->lasth;
        else $this->y += $h;
    }

    function Output($dest='', $name='', $isUTF8=false) {
        $this->Close();
        if (strlen($name) == 0) $name = 'document.pdf';
        $dest = strtoupper($dest);
        if ($dest == '' || $dest == 'I') {
            while (ob_get_level()) ob_end_clean();
            header('Content-Type: application/pdf');
            header('Content-Disposition: inline; filename="'. $name. '"');
            header('Content-Length: '. strlen($this->buffer));
            header('Cache-Control: private, max-age=0, must-revalidate');
            header('Pragma: public');
            echo $this->buffer;
        } elseif ($dest == 'D') {
            while (ob_get_level()) ob_end_clean();
            header('Content-Type: application/pdf');
            header('Content-Disposition: attachment; filename="'. $name. '"');
            header('Content-Length: '. strlen($this->buffer));
            header('Cache-Control: private, max-age=0, must-revalidate');
            header('Pragma: public');
            echo $this->buffer;
        } elseif ($dest == 'F') {
            $f = fopen($name, 'wb');
            if (!$f) $this->Error('Unable to create output file: '. $name);
            fwrite($f, $this->buffer, strlen($this->buffer));
            fclose($f);
        } elseif ($dest == 'S') {
            return $this->buffer;
        } else {
            $this->Error('Incorrect output destination: '. $dest);
        }
        return '';
    }

    protected function _loadfont($family, $style) {
        $fontkey = $family. $style;
        $cw = [];
        for ($i=0; $i<256; $i++) $cw[chr($i)] = 600;
        $cw[' '] = 278; $cw['!'] = 278; $cw['"'] = 355; $cw['#'] = 556; $cw['$'] = 556; $cw['%'] = 889; $cw['&'] = 667;
        $cw['\''] = 191; $cw['('] = 333; $cw[')'] = 333; $cw['*'] = 389; $cw['+'] = 584; $cw[','] = 278; $cw['-'] = 333;
        $cw['.'] = 278; $cw['/'] = 278; $cw['0'] = 556; $cw['1'] = 556; $cw['2'] = 556; $cw['3'] = 556; $cw['4'] = 556;
        $cw['5'] = 556; $cw['6'] = 556; $cw['7'] = 556; $cw['8'] = 556; $cw['9'] = 556; $cw[':'] = 278; $cw[';'] = 278;
        $cw['<'] = 584; $cw['='] = 584; $cw['>'] = 584; $cw['?'] = 556; $cw['@'] = 1015;
        foreach (range('A', 'Z') as $c) $cw[$c] = 722;
        $cw['I'] = 278; $cw['J'] = 500; $cw['M'] = 833; $cw['W'] = 944;
        foreach (range('a', 'z') as $c) $cw[$c] = 556;
        $cw['f'] = 278; $cw['i'] = 222; $cw['j'] = 222; $cw['l'] = 222; $cw['m'] = 833; $cw['r'] = 333; $cw['t'] = 278; $cw['w'] = 722;

        $name = 'Helvetica';
        if ($style == 'B') $name = 'Helvetica-Bold';
        elseif ($style == 'I') $name = 'Helvetica-Oblique';
        elseif ($style == 'BI') $name = 'Helvetica-BoldOblique';

        $i = count($this->fonts) + 1;
        $this->fonts[$fontkey] = [
            'i' => $i,
            'type' => 'core',
            'name' => $name,
            'up' => -100,
            'ut' => 50,
            'cw' => $cw
        ];
    }

    protected function _getpagesize($size) {
        if (is_string($size)) {
            $size = strtolower($size);
            if (!isset($this->StdPageSizes[$size])) $this->Error('Unknown page size: '. $size);
            $a = $this->StdPageSizes[$size];
            return [$a[0]/$this->k, $a[1]/$this->k];
        } else {
            if ($size[0] > $size[1]) return [$size[1], $size[0]];
            else return $size;
        }
    }

    protected function _beginpage($orientation, $size, $rotation) {
        $this->page++;
        $this->pages[$this->page] = '';
        $this->state = 2;
        $this->x = $this->lMargin;
        $this->y = $this->tMargin;
        $this->FontFamily = '';
        if (!$orientation) $orientation = $this->DefOrientation;
        else {
            $orientation = strtoupper($orientation[0]);
            if ($orientation != 'P' && $orientation != 'L') $this->Error('Incorrect orientation: '. $orientation);
        }
        $this->CurOrientation = $orientation;
    }

    protected function _endpage() {
        $this->state = 1;
    }

    protected function _putheader() {
        $this->_put('%PDF-'. $this->PDFVersion);
        $this->_put("%\xE2\xE3\xCF\xD3");
    }

    protected function _escape($s) {
        return str_replace(['\\', ')', '('], ['\\\\', '\\)', '\\('], $s);
    }

    protected function _dounderline($x, $y, $txt) {
        $up = $this->CurrentFont['up'];
        $ut = $this->CurrentFont['ut'];
        $w = $this->GetStringWidth($txt) + $this->ws * substr_count($txt, ' ');
        return sprintf('%.2F %.2F %.2F %.2F re f', $x*$this->k, ($this->h-($y-$up/1000*$this->FontSize))*$this->k, $w*$this->k, -$ut/1000*$this->FontSizePt);
    }

    protected function _out($s) {
        if ($this->state == 2) $this->pages[$this->page].= $s. "\n";
        elseif ($this->state == 1) $this->_put($s);
        elseif ($this->state == 0) $this->Error('No page has been added yet');
        elseif ($this->state == 3) $this->Error('The document is closed');
    }

    protected function _put($s) {
        $this->buffer.= $s. "\n";
    }

    protected function _newobj($n=null) {
        if ($n === null) $n = ++$this->n;
        $this->offsets[$n] = strlen($this->buffer);
        $this->_out($n. ' 0 obj');
        return $n;
    }

    protected function _putpages() {
        $nb = $this->page;
        for ($n=1; $n<=$nb; $n++) {
            $pageObj = $this->_newobj();
            $contentsObj = $this->n + 1;

            $this->_out('<</Type /Page');
            $this->_out('/Parent 1 0 R');
            $this->_out('/Resources 2 0 R');
            $this->_out(sprintf('/MediaBox [0 0 %.2F %.2F]', $this->wPt, $this->hPt));
            $this->_out('/Contents '. $contentsObj. ' 0 R>>');
            $this->_out('endobj');

            $p = $this->compress ? gzcompress($this->pages[$n]) : $this->pages[$n];
            $this->_newobj();
            $this->_out('<<'. ($this->compress ? '/Filter /FlateDecode ' : ''). '/Length '. strlen($p). '>>');
            $this->_out('stream');
            $this->_put($p);
            $this->_out('endstream');
            $this->_out('endobj');
        }

        // Object 1 is Pages container
        $this->offsets[1] = strlen($this->buffer);
        $this->_out('1 0 obj');
        $this->_out('<</Type /Pages');
        $kids = '/Kids [';
        for ($i=0; $i<$nb; $i++) {
            $kids.= (3 + 2*$i). ' 0 R ';
        }
        $this->_out($kids. ']');
        $this->_out('/Count '. $nb);
        $this->_out('>>');
        $this->_out('endobj');
    }

    protected function _putfonts() {
        foreach ($this->fonts as $k => $font) {
            $this->fonts[$k]['n'] = $this->_newobj();
            $this->_out('<</Type /Font');
            $this->_out('/BaseFont /'. $font['name']);
            $this->_out('/Subtype /Type1');
            $this->_out('/Encoding /WinAnsiEncoding');
            $this->_out('>>');
            $this->_out('endobj');
        }
    }

    protected function _putimages() {
        foreach ($this->images as $k => $image) {
            $this->images[$k]['n'] = $this->_newobj();
            $this->_out('<</Type /XObject');
            $this->_out('/Subtype /Image');
            $this->_out('/Width '. $image['w']);
            $this->_out('/Height '. $image['h']);
            $this->_out('/ColorSpace /'. $image['cs']);
            $this->_out('/BitsPerComponent '. $image['bpc']);
            if (isset($image['f'])) {
                $this->_out('/Filter /'. $image['f']);
            }
            $this->_out('/Length '. strlen($image['data']). '>>');
            $this->_out('stream');
            $this->_put($image['data']);
            $this->_out('endstream');
            $this->_out('endobj');
        }
    }

    protected function _putresourcedict() {
        $this->_out('/ProcSet [/PDF /Text /ImageB /ImageC /ImageI]');
        $this->_out('/Font <<');
        foreach ($this->fonts as $font) {
            $this->_out('/F'. $font['i']. ' '. $font['n']. ' 0 R');
        }
        $this->_out('>>');
        $this->_out('/XObject <<');
        foreach ($this->images as $image) {
            $this->_out('/I'. $image['i']. ' '. $image['n']. ' 0 R');
        }
        $this->_out('>>');
    }

    protected function _putresources() {
        $this->_putfonts();
        $this->_putimages();
        $this->offsets[2] = strlen($this->buffer);
        $this->_out('2 0 obj');
        $this->_out('<<');
        $this->_putresourcedict();
        $this->_out('>>');
        $this->_out('endobj');
    }

    protected function _putinfo() {
        $this->metadata['Producer'] = 'Physio Care & Rehab Services PDF Engine';
        $this->metadata['CreationDate'] = 'D:'. @date('YmdHis');
        foreach ($this->metadata as $key => $value) {
            $this->_out('/'. $key. ' ('. $this->_escape($value). ')');
        }
    }

    protected function _putcatalog() {
        $this->_out('/Type /Catalog');
        $this->_out('/Pages 1 0 R');
    }

    protected function _enddoc() {
        $this->_putpages();
        $this->_putresources();

        $infoObj = $this->_newobj();
        $this->_out('<<');
        $this->_putinfo();
        $this->_out('>>');
        $this->_out('endobj');

        $rootObj = $this->_newobj();
        $this->_out('<<');
        $this->_putcatalog();
        $this->_out('>>');
        $this->_out('endobj');

        $o = strlen($this->buffer);
        $this->_out('xref');
        $this->_out('0 '. ($this->n + 1));
        $this->_out('0000000000 65535 f ');
        for ($i=1; $i<=$this->n; $i++) {
            $this->_out(sprintf('%010d 00000 n ', $this->offsets[$i]));
        }
        $this->_out('trailer');
        $this->_out('<<');
        $this->_out('/Size '. ($this->n + 1));
        $this->_out('/Root '. $rootObj. ' 0 R');
        $this->_out('/Info '. $infoObj. ' 0 R');
        $this->_out('>>');
        $this->_out('startxref');
        $this->_out($o);
        $this->_out('%%EOF');
        $this->state = 3;
    }

    function AcceptPageBreak() { return $this->AutoPageBreak; }
}
}
