import { LANG } from '../lang';
import type {
  PurchaseReceiptData,
  ReceiptPreviewData,
  ReturnReceiptData,
  SaleReceiptData,
} from '../types';

type ReceiptSummaryRow = {
  label: string;
  value: string;
  isTotal?: boolean;
};

export type ReceiptViewModel = {
  title: string;
  codeLabel: string;
  codeValue: string;
  partyLabel: string;
  partyValue: string;
  dateLabel: string;
  dateValue: string;
  supplierLine: string | null;
  items: Array<{
    productName: string;
    unitName: string;
    quantityText: string;
    unitPriceText: string;
    lineTotalText: string;
  }>;
  summaryRows: ReceiptSummaryRow[];
  footerMessage: string | null;
};

function isPurchaseReceipt(
  receipt: ReceiptPreviewData,
): receipt is PurchaseReceiptData {
  return 'supplierPaidAmount' in receipt;
}

function isReturnReceipt(
  receipt: ReceiptPreviewData,
): receipt is ReturnReceiptData {
  return 'returnFeeAmount' in receipt;
}

function isSaleReceipt(receipt: ReceiptPreviewData): receipt is SaleReceiptData {
  return !isPurchaseReceipt(receipt) && !isReturnReceipt(receipt);
}

export function formatReceiptDate(dateValue: string) {
  return new Date(dateValue)
    .toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    .replace(',', '');
}

export function buildReceiptViewModel(
  receipt: ReceiptPreviewData,
): ReceiptViewModel {
  const summaryRows: ReceiptSummaryRow[] = [
    {
      label: LANG.receiptProductTotal,
      value: receipt.subtotalAmount.toLocaleString('vi-VN'),
    },
    {
      label: LANG.discount,
      value: receipt.discountAmount.toLocaleString('vi-VN'),
    },
  ];

  if ('loyaltyDiscountAmount' in receipt && (receipt.loyaltyDiscountAmount ?? 0) > 0) {
    summaryRows.push({
      label: LANG.loyaltyDiscount,
      value: (receipt.loyaltyDiscountAmount ?? 0).toLocaleString('vi-VN'),
    });
  }

  if (isReturnReceipt(receipt)) {
    summaryRows.push(
      {
        label: LANG.totalReturn,
        value: receipt.totalAmount.toLocaleString('vi-VN'),
        isTotal: true,
      },
      {
        label: LANG.refund,
        value: receipt.customerRefundAmount.toLocaleString('vi-VN'),
      },
    );
  } else if (isPurchaseReceipt(receipt)) {
    summaryRows.push(
      {
        label: LANG.purchasePayable,
        value: receipt.totalAmount.toLocaleString('vi-VN'),
        isTotal: true,
      },
      {
        label: LANG.receiptPaidSupplier,
        value: receipt.supplierPaidAmount.toLocaleString('vi-VN'),
      },
      {
        label: LANG.receiptDebtSupplier,
        value: receipt.debtAmount.toLocaleString('vi-VN'),
      },
    );
  } else if (isSaleReceipt(receipt)) {
    summaryRows.push(
      {
        label: LANG.totalPayment,
        value: receipt.totalAmount.toLocaleString('vi-VN'),
        isTotal: true,
      },
      {
        label: LANG.customerGiven,
        value: receipt.customerPaidAmount.toLocaleString('vi-VN'),
      },
      {
        label: LANG.changeAmount,
        value: receipt.changeAmount.toLocaleString('vi-VN'),
      },
    );
  }

  return {
    title: isReturnReceipt(receipt)
      ? LANG.receiptReturnTitle
      : isPurchaseReceipt(receipt)
        ? LANG.receiptPurchaseTitle
        : LANG.receiptTitle,
    codeLabel: isPurchaseReceipt(receipt)
      ? LANG.receiptPurchaseCode
      : LANG.receiptInvoice,
    codeValue: isPurchaseReceipt(receipt)
      ? receipt.purchaseOrderCode
      : receipt.salesOrderCode,
    partyLabel: isPurchaseReceipt(receipt)
      ? LANG.receiptSupplier
      : LANG.cashier,
    partyValue: isPurchaseReceipt(receipt)
      ? receipt.supplierName ?? ''
      : receipt.cashierName,
    dateLabel: LANG.receiptDate,
    dateValue: formatReceiptDate(
      isPurchaseReceipt(receipt) ? receipt.orderedAt : receipt.soldAt,
    ),
    supplierLine:
      isPurchaseReceipt(receipt) && receipt.supplierName
        ? `${LANG.receiptSupplier}: ${receipt.supplierName}`
        : null,
    items: receipt.items.map((item) => ({
      productName: item.productName,
      unitName: item.unitName,
      quantityText: item.quantity.toLocaleString('vi-VN'),
      unitPriceText: item.unitPrice.toLocaleString('vi-VN'),
      lineTotalText: item.lineTotal.toLocaleString('vi-VN'),
    })),
    summaryRows,
    footerMessage: receipt.footerMessage,
  };
}

export function buildReceiptDocumentHtml(receipt: ReceiptPreviewData) {
  const view = buildReceiptViewModel(receipt);

  const itemsHtml = view.items
    .map(
      (item) => `
        <div class="item">
          <div class="item-name">${item.productName} - (${item.unitName})</div>
          <div class="item-row">
            <div class="item-price">${item.unitPriceText}</div>
            <div class="item-qty">${item.quantityText}</div>
            <div class="item-total">${item.lineTotalText}</div>
          </div>
        </div>
      `,
    )
    .join('');

  const summaryRowsHtml = view.summaryRows
    .map(
      (row) => `
        <div class="summary-row${row.isTotal ? ' total' : ''}">
          <span>${row.label}:</span>
          <span>${row.value}</span>
        </div>
      `,
    )
    .join('');

  const supplierLine = view.supplierLine
    ? `<div class="subcenter">${view.supplierLine}</div>`
    : '';

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${view.codeValue}</title>
        <style>
          @page { size: 76mm auto; margin: 2mm; }
          * { box-sizing: border-box; }
          html, body { margin: 0; padding: 0; font-family: Arial, sans-serif; color: #111; }
          body { font-size: 10px; line-height: 1.25; }
          .receipt { padding: 0 1mm; }
          .center { text-align: center; }
          .store { margin: 1mm 0 1.5mm; font-size: 16px; font-weight: 700; }
          .subcenter { text-align: center; }
          .header-title { margin: 2.5mm 0 1mm; font-size: 15px; font-weight: 700; }
          .dash { border-top: 1px dashed #666; margin: 1.5mm 0; }
          .meta-row,
          .summary-row,
          .item-row {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 3mm;
            align-items: end;
          }
          .meta-row strong,
          .summary-row span:last-child,
          .item-total { white-space: nowrap; text-align: right; }
          .item { padding: 0.8mm 0; }
          .item-name { font-weight: 700; margin-bottom: 0.8mm; }
          .item-row { grid-template-columns: minmax(0, 1fr) auto auto; }
          .item-price { white-space: nowrap; }
          .item-qty { min-width: 10mm; text-align: right; white-space: nowrap; }
          .summary-row { margin: 0.6mm 0; }
          .summary-row.total { font-size: 12px; font-weight: 700; }
          .footer { margin-top: 2mm; text-align: center; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="center">
            <div class="store">${receipt.storeName}</div>
            ${receipt.storeAddress ? `<div>${receipt.storeAddress}</div>` : ''}
            ${receipt.storePhoneNumber ? `<div>${receipt.storePhoneNumber}</div>` : ''}
            <div class="header-title">${view.title}</div>
            ${supplierLine}
          </div>
          <div class="dash"></div>
          <div class="meta-row"><span>${view.codeLabel}</span><strong>${view.codeValue}</strong></div>
          <div class="meta-row"><span>${view.partyLabel}</span><span>${view.partyValue}</span></div>
          <div class="meta-row"><span>${view.dateLabel}</span><span>${view.dateValue}</span></div>
          <div class="dash"></div>
          ${itemsHtml}
          <div class="dash"></div>
          ${summaryRowsHtml}
          <div class="dash"></div>
          <div class="footer">${view.footerMessage ?? ''}</div>
        </div>
        <script>
          window.onload = function () {
            window.focus();
            window.print();
          };
        </script>
      </body>
    </html>
  `;
}
