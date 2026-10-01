import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';

/**
 * Downloads a DOM element as a crisp, standard A4 PDF document.
 * 
 * @param {HTMLElement|string} elementOrId - The target DOM element or its element ID
 * @param {string} filename - The file name to save as (e.g. 'Invoice_INV-2026-003.pdf')
 * @returns {Promise<boolean>}
 */
export async function downloadA4Pdf(elementOrId, filename = 'document.pdf') {
  const el = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
  if (!el) {
    console.error('[pdfExport] Target element not found for PDF export:', elementOrId);
    return false;
  }

  // Capture target with high scale for retina-sharp text and borders
  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: 1024,
    onclone: (_clonedDoc, clonedElement) => {
      // Ensure the cloned node is fully expanded and visible
      clonedElement.style.overflow = 'visible';
      clonedElement.style.maxHeight = 'none';
      clonedElement.style.height = 'auto';
      clonedElement.style.transform = 'none';
    },
  });

  const imgData = canvas.toDataURL('image/png');

  // A4 dimensions in millimeters
  const pdfWidth = 210;
  const pdfHeight = 297;

  // Calculate proportional height
  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  let heightLeft = imgHeight;
  let position = 0;

  // First page
  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
  heightLeft -= pdfHeight;

  // Subsequent pages if long document
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pdfHeight;
  }

  const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  pdf.save(safeFilename);
  return true;
}

/**
 * Downloads an 80mm POS Thermal Slip as a custom-sized roll PDF.
 * 
 * @param {HTMLElement|string} elementOrId - The target thermal receipt element or its ID
 * @param {string} filename - The file name to save as (e.g. 'Receipt_REC-001.pdf')
 * @returns {Promise<boolean>}
 */
export async function downloadThermalPdf(elementOrId, filename = 'thermal_receipt.pdf') {
  const el = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
  if (!el) {
    console.error('[pdfExport] Target element not found for thermal PDF export:', elementOrId);
    return false;
  }

  const canvas = await html2canvas(el, {
    scale: 2.5,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    onclone: (_clonedDoc, clonedElement) => {
      clonedElement.style.overflow = 'visible';
      clonedElement.style.maxHeight = 'none';
      clonedElement.style.height = 'auto';
      clonedElement.style.transform = 'none';
    },
  });

  const imgData = canvas.toDataURL('image/png');

  // 80mm width standard thermal roll
  const pdfWidth = 80;
  const imgHeight = (canvas.height * pdfWidth) / canvas.width;
  const pdfHeight = Math.ceil(imgHeight) + 4;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [pdfWidth, pdfHeight],
  });

  pdf.addImage(imgData, 'PNG', 0, 2, pdfWidth, imgHeight, undefined, 'FAST');

  const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  pdf.save(safeFilename);
  return true;
}

/**
 * Triggers clean browser print with complete DOM isolation.
 * Copies the target element into a top-level #print-mount-root outside #root,
 * completely hiding #root (taking 0px space), ensuring the printed document
 * starts right at the top (page 1) without multiple blank pages or vertical offsets.
 * Dynamically injects @page size (80mm roll vs A4 portrait) so Chrome's print
 * dialog previews and prints the exact structure requested.
 * 
 * @param {string|HTMLElement} [elementOrId='printable-invoice']
 * @param {'invoice'|'thermal'} [printType='invoice']
 */
export function triggerCleanPrint(elementOrId = 'printable-invoice', printType = 'invoice') {
  let targetId = elementOrId;
  let mode = printType;

  // Support polymorphic arguments: triggerCleanPrint('thermal')
  if (elementOrId === 'thermal' || elementOrId === 'invoice') {
    mode = elementOrId;
    targetId = mode === 'thermal' ? 'printable-thermal-receipt' : 'printable-invoice';
  }

  const el = typeof targetId === 'string' ? document.getElementById(targetId) : targetId;
  let mount = document.getElementById('print-mount-root');
  if (!mount) {
    mount = document.createElement('div');
    mount.id = 'print-mount-root';
    document.body.appendChild(mount);
  }

  // Clone target element cleanly into isolated mount root
  if (el) {
    const clone = el.cloneNode(true);
    clone.id = 'print-active-clone';
    clone.style.maxHeight = 'none';
    clone.style.overflow = 'visible';
    clone.style.height = 'auto';
    mount.innerHTML = '';
    mount.appendChild(clone);
  }

  // Dynamically set exact @page size so Chrome preview switches paper size
  const existingStyle = document.getElementById('dynamic-print-page-style');
  if (existingStyle) {
    existingStyle.remove();
  }

  const dynamicStyle = document.createElement('style');
  dynamicStyle.id = 'dynamic-print-page-style';
  if (mode === 'thermal') {
    dynamicStyle.innerHTML = `
      @page {
        size: 80mm auto !important;
        margin: 2mm 1mm !important;
      }
      html, body {
        width: 80mm !important;
        max-width: 80mm !important;
        margin: 0 auto !important;
      }
      #print-mount-root {
        width: 80mm !important;
        max-width: 80mm !important;
        margin: 0 auto !important;
      }
      #print-active-clone,
      .thermal-receipt,
      #printable-thermal-receipt {
        width: 80mm !important;
        max-width: 80mm !important;
        margin: 0 auto !important;
      }
    `;
  } else {
    dynamicStyle.innerHTML = `
      @page {
        size: 210mm 297mm !important;
        margin: 8mm 10mm !important;
      }
      html, body {
        width: 100% !important;
        margin: 0 !important;
      }
      #print-mount-root {
        width: 100% !important;
        margin: 0 !important;
      }
    `;
  }
  document.head.appendChild(dynamicStyle);

  const targetClass = mode === 'thermal' ? 'printing-thermal' : 'printing-invoice';
  document.body.classList.remove('printing-invoice', 'printing-thermal');
  document.body.classList.add('is-printing', targetClass);

  window.print();

  const handleCleanup = () => {
    document.body.classList.remove('is-printing', 'printing-invoice', 'printing-thermal');
    if (mount) {
      mount.innerHTML = '';
    }
    const injected = document.getElementById('dynamic-print-page-style');
    if (injected) {
      injected.remove();
    }
    window.removeEventListener('afterprint', handleCleanup);
  };

  window.addEventListener('afterprint', handleCleanup);
  setTimeout(handleCleanup, 2500);
}
