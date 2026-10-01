import React, { useMemo } from 'react';
import { resolvePieceLabel } from '../../utils/productUtils';

const formatCurrency = (val) => {
  const n = parseFloat(val) || 0;
  return n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

/**
 * ThermalReceipt
 * Renders an 80mm / 3-inch POS thermal receipt layout.
 * Optimized for standard ESC/POS 80mm thermal roll printers and PDF receipt export.
 */
export default function ThermalReceipt({
  invoice,
  currentUser,
  deliveryLog,
}) {
  const isInvoice = Boolean(invoice);
  const data = invoice || deliveryLog || {};

  const totalAmount = parseFloat(data.totalAmount) || 0;
  const paidAmount = parseFloat(data.paidAmount) || 0;
  const pendingAmount =
    data.pendingAmount !== undefined && data.pendingAmount !== null
      ? parseFloat(data.pendingAmount)
      : Math.max(0, totalAmount - paidAmount);

  const subtotal = parseFloat(data.subtotal) || totalAmount;
  const discount = parseFloat(data.discount) || 0;
  const taxAmount = parseFloat(data.taxAmount) || 0;

  const supplierName =
    data.supplierName || data.clientName || 'Valued Customer / Supplier';
  const supplierPhone = data.supplierPhone || data.clientPhone || '';
  const receiptNo = data.invoiceNumber || data.deliveryNumber || data.id || 'REC-001';
  const dateStr = data.date || data.deliveryDate || new Date().toISOString().split('T')[0];
  const timeStr = data.createdAt ? new Date(data.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  // Generate pseudo-barcode bars based on receipt number
  const barcodeChars = (receiptNo + '987654321').slice(0, 24);

  // Normalize items array with accurate piece names, rates, and amounts
  const itemsList = useMemo(() => {
    if (Array.isArray(data.items) && data.items.length > 0) {
      return data.items.map((it, idx) => {
        const rawName =
          it.pieceName ||
          it.description ||
          it.name ||
          it.subPart ||
          `Item #${idx + 1}`;
        const name =
          it.subPart && typeof resolvePieceLabel === 'function'
            ? resolvePieceLabel(it.subPart, data.struct) || rawName
            : rawName;
        const quantity = parseFloat(it.quantity ?? it.qty ?? it.pieces ?? it.totalPieces) || 0;
        const unitPrice =
          parseFloat(it.unitPrice ?? it.rate ?? it.price ?? data.pricePerPSC ?? data.price_per_piece ?? data.pricePerPiece) || 0;
        const amount =
          parseFloat(it.amount ?? it.total ?? it.totalAmount) || (quantity * unitPrice);

        return {
          name,
          quantity,
          unitPrice,
          amount,
          fabricName: it.fabricName,
        };
      });
    }

    if (data.subParts && typeof data.subParts === 'object' && Object.keys(data.subParts).length > 0) {
      const defaultRate =
        parseFloat(data.pricePerPSC ?? data.price_per_piece ?? data.pricePerPiece) ||
        (totalAmount > 0 && data.totalPieces ? totalAmount / data.totalPieces : 0);

      return Object.entries(data.subParts).map(([key, qtyVal]) => {
        const qty = parseFloat(qtyVal) || 0;
        const name =
          typeof resolvePieceLabel === 'function'
            ? resolvePieceLabel(key, data.struct)
            : key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        const rate = defaultRate;
        const amount = qty * rate;

        return {
          name,
          quantity: qty,
          unitPrice: rate,
          amount,
          fabricName: data.fabricName,
        };
      });
    }

    // Single item fallback
    const singleQty = parseFloat(data.totalPieces || data.deliveredPSC || data.quantity || 1) || 1;
    const singleRate = parseFloat(data.pricePerPiece || data.pricePerSet || (totalAmount / singleQty)) || 0;
    return [
      {
        name: data.fabricType || data.fabricName || data.productName || 'Finished Goods',
        quantity: singleQty,
        unitPrice: singleRate,
        amount: totalAmount || (singleQty * singleRate),
        fabricName: data.fabricName,
      },
    ];
  }, [data, totalAmount]);

  return (
    <div
      id="printable-thermal-receipt"
      className="thermal-receipt bg-white text-black font-mono text-[11px] leading-tight p-4 mx-auto w-full max-w-[80mm] select-text shadow-sm border border-slate-200 rounded-sm"
      style={{
        width: '80mm',
        minWidth: '72mm',
      }}
    >
      {/* 1. Thermal Header */}
      <div className="text-center space-y-1 pb-2">
        <h2 className="text-base font-black tracking-wider uppercase text-black">
          {currentUser?.companyName || 'FABRIC MANAGER FACTORY'}
        </h2>
        <p className="text-[10px] text-slate-700">
          Textile Manufacturing & Garments Unit
        </p>
        {currentUser?.address && (
          <p className="text-[9px] text-slate-600">{currentUser.address}</p>
        )}
        {currentUser?.phone && (
          <p className="text-[10px] font-bold text-slate-800">
            TEL: {currentUser.phone}
          </p>
        )}
        {currentUser?.gstin && (
          <p className="text-[9px] font-bold text-slate-700">
            GSTIN: {currentUser.gstin}
          </p>
        )}
      </div>

      {/* Dashed Separator */}
      <div className="border-t border-dashed border-black my-1.5" />

      {/* 2. Receipt Badge & Meta */}
      <div className="text-center font-bold text-[10px] uppercase py-0.5">
        *** {isInvoice ? 'TAX INVOICE' : 'DELIVERY GATE PASS'} ***
      </div>

      <div className="border-t border-dashed border-black my-1.5" />

      <div className="space-y-0.5 text-[10px]">
        <div className="flex justify-between">
          <span className="text-slate-600">RECEIPT #:</span>
          <span className="font-extrabold">{receiptNo}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">DATE & TIME:</span>
          <span>{dateStr} {timeStr}</span>
        </div>
        {data.dueDate && (
          <div className="flex justify-between">
            <span className="text-slate-600">DUE DATE:</span>
            <span className="font-bold">{data.dueDate}</span>
          </div>
        )}
        <div className="flex justify-between pt-1">
          <span className="text-slate-600">PARTY / SUPPLIER:</span>
          <span className="font-extrabold truncate max-w-[45mm] text-right">
            {supplierName}
          </span>
        </div>
        {supplierPhone && (
          <div className="flex justify-between">
            <span className="text-slate-600">PHONE:</span>
            <span>{supplierPhone}</span>
          </div>
        )}
        {data.fabricType && (
          <div className="flex justify-between">
            <span className="text-slate-600">FABRIC LOT:</span>
            <span className="font-bold truncate max-w-[45mm] text-right">
              {data.fabricType} {data.color ? `(${data.color})` : ''}
            </span>
          </div>
        )}
      </div>

      {/* Dashed Separator */}
      <div className="border-t border-dashed border-black my-2" />

      {/* 3. Items Column Header */}
      <div className="flex justify-between font-extrabold text-[10px] pb-1 border-b border-black">
        <span className="w-1/2">ITEM / LOT</span>
        <span className="w-1/6 text-center">QTY</span>
        <span className="w-1/6 text-right">RATE</span>
        <span className="w-1/6 text-right">TOTAL</span>
      </div>

      {/* 4. Items List */}
      <div className="divide-y divide-dotted divide-slate-300 py-1">
        {itemsList.map((it, idx) => (
          <div key={idx} className="py-1 text-[10px]">
            <div className="flex justify-between items-center">
              <span className="w-1/2 font-bold truncate pr-1">
                {it.name}
              </span>
              <span className="w-1/6 text-center">{it.quantity}</span>
              <span className="w-1/6 text-right">₹{formatCurrency(it.unitPrice)}</span>
              <span className="w-1/6 text-right font-extrabold">
                ₹{formatCurrency(it.amount)}
              </span>
            </div>
            {it.fabricName && it.fabricName !== it.name && (
              <div className="text-[9px] text-slate-500 pl-1">
                Lot: {it.fabricName}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Dashed Separator */}
      <div className="border-t border-dashed border-black my-2" />

      {/* 5. Financial Summary */}
      <div className="space-y-1 text-[10px] text-right">
        <div className="flex justify-between">
          <span className="text-slate-600">SUBTOTAL:</span>
          <span className="font-bold">₹{formatCurrency(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-600">DISCOUNT:</span>
            <span>-₹{formatCurrency(discount)}</span>
          </div>
        )}
        {taxAmount > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-600">GST ({data.taxPercent || 0}%):</span>
            <span>+₹{formatCurrency(taxAmount)}</span>
          </div>
        )}
        <div className="flex justify-between text-xs font-black pt-1 border-t border-black">
          <span>GRAND TOTAL:</span>
          <span>₹{formatCurrency(totalAmount)}</span>
        </div>
        <div className="flex justify-between font-bold pt-0.5">
          <span>PAID AMOUNT:</span>
          <span>₹{formatCurrency(paidAmount)}</span>
        </div>
        <div className="flex justify-between font-black text-[11px] pt-0.5 border-t border-dotted border-black">
          <span>BALANCE DUE:</span>
          <span>₹{formatCurrency(pendingAmount)}</span>
        </div>
      </div>

      {/* Payment methods list if present */}
      {Array.isArray(data.payments) && data.payments.length > 0 && (
        <>
          <div className="border-t border-dashed border-black my-2" />
          <div className="space-y-0.5 text-[9px]">
            <div className="font-bold text-slate-700">COLLECTIONS RECEIVED:</div>
            {data.payments.map((p, i) => (
              <div key={i} className="flex justify-between">
                <span>{p.date} ({p.method}):</span>
                <span className="font-bold">+₹{formatCurrency(p.amount)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 6. Terms & Signature */}
      <div className="border-t border-dashed border-black my-2.5" />

      {data.notes && (
        <div className="text-[9px] text-slate-700 italic pb-2">
          Note: {data.notes}
        </div>
      )}

      {/* Pseudo-Barcode for POS Scanners */}
      <div className="text-center pt-1 pb-2">
        <div className="flex justify-center items-end gap-[1.5px] h-9 mb-1 overflow-hidden px-4">
          {barcodeChars.split('').map((char, idx) => {
            const h = (char.charCodeAt(0) % 18) + 16;
            const w = idx % 3 === 0 ? 'w-[2px]' : idx % 2 === 0 ? 'w-[1.5px]' : 'w-[1px]';
            return (
              <span
                key={idx}
                className={`bg-black inline-block ${w}`}
                style={{ height: `${h}px` }}
              />
            );
          })}
        </div>
        <div className="text-[9px] font-mono tracking-widest text-slate-800">
          *{receiptNo.replace(/[^A-Za-z0-9]/g, '')}*
        </div>
      </div>

      {/* Authorized Signature & Tear Line */}
      <div className="text-center pt-2 border-t border-dotted border-slate-400 space-y-1">
        <div className="text-[9px] font-extrabold uppercase">
          THANK YOU FOR YOUR BUSINESS!
        </div>
        <div className="text-[8px] text-slate-500">
          Fabric Manager • System Generated POS Slip
        </div>
        <div className="text-[9px] text-slate-400 pt-2 tracking-widest">
          - - - - - - [ TEAR HERE ] - - - - - -
        </div>
      </div>
    </div>
  );
}
