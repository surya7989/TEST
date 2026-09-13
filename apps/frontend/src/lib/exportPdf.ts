import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export async function exportElementToPdf(element: HTMLElement, filename: string): Promise<void> {
  // Capture the element cleanly using html2canvas
  const canvas = await html2canvas(element, {
    scale: 2, // 2x crisp resolution
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: 1024,
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.98);

  // A4 dimensions in mm: 210 x 297
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const margin = 8; // 8mm margin
  const printWidth = pageWidth - margin * 2;
  const printHeight = (canvas.height * printWidth) / canvas.width;

  let heightLeft = printHeight;
  let position = margin;

  // First page
  pdf.addImage(imgData, 'JPEG', margin, position, printWidth, printHeight);
  heightLeft -= (pageHeight - margin * 2);

  // Subsequent pages if content overflows A4 height
  while (heightLeft > 0) {
    position = heightLeft - printHeight + margin;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', margin, position, printWidth, printHeight);
    heightLeft -= (pageHeight - margin * 2);
  }

  const outputName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  pdf.save(outputName);
}
