import { Button, Modal } from 'antd';
import { LANG } from '../lang';
import type { ReceiptPreviewData, SaleReceiptData } from '../types';

type Props = {
  receiptPreview: ReceiptPreviewData | null;
  onClose: () => void;
  onPrint: (receipt: ReceiptPreviewData) => void;
};

export function ReceiptModal({ receiptPreview, onClose, onPrint }: Props) {
  return (
    <Modal
      title={null}
      className="receipt-modal"
      wrapClassName="receipt-modal-wrap"
      open={!!receiptPreview}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          {LANG.close}
        </Button>,
        <Button key="print" type="primary" onClick={() => receiptPreview && onPrint(receiptPreview)}>
          {LANG.printInvoice}
        </Button>,
      ]}
      width={360}
    >
      {receiptPreview && (
        <div className="receipt-preview">
          <div className="receipt-center">
            <div className="receipt-store">{receiptPreview.storeName}</div>
            {receiptPreview.storeAddress && <div>{receiptPreview.storeAddress}</div>}
            {receiptPreview.storePhoneNumber && <div>{receiptPreview.storePhoneNumber}</div>}
          </div>
          <div className="receipt-dash" />
          <div className="receipt-row">
            <span>{'supplierPaidAmount' in receiptPreview ? LANG.receiptPurchaseCode : LANG.receiptInvoice}</span>
            <strong>{'supplierPaidAmount' in receiptPreview ? receiptPreview.purchaseOrderCode : receiptPreview.salesOrderCode}</strong>
          </div>
          <div className="receipt-row">
            <span>{'supplierPaidAmount' in receiptPreview ? LANG.receiptSupplier : LANG.cashier}</span>
            <span>{'supplierPaidAmount' in receiptPreview ? (receiptPreview.supplierName ?? '') : receiptPreview.cashierName}</span>
          </div>
          <div className="receipt-row">
            <span>{LANG.receiptDate}</span>
            <span>{new Date('supplierPaidAmount' in receiptPreview ? receiptPreview.orderedAt : receiptPreview.soldAt).toLocaleString('vi-VN')}</span>
          </div>
          <div className="receipt-dash" />
          {receiptPreview.items.map((item, index) => (
            <div className="receipt-item" key={`${item.productName}-${index}`}>
              <div className="receipt-item-name">{item.productName}</div>
              <div className="receipt-row receipt-muted">
                <span>
                  {item.quantity} x {item.unitPrice.toLocaleString('vi-VN')}
                </span>
                <span>{item.lineTotal.toLocaleString('vi-VN')}</span>
              </div>
            </div>
          ))}
          <div className="receipt-dash" />
          <div className="receipt-row">
            <span>{LANG.receiptProductTotal}</span>
            <span>{receiptPreview.subtotalAmount.toLocaleString('vi-VN')}</span>
          </div>
          <div className="receipt-row">
            <span>{LANG.discount}</span>
            <span>{receiptPreview.discountAmount.toLocaleString('vi-VN')}</span>
          </div>
          {'returnFeeAmount' in receiptPreview && (
            <div className="receipt-row">
              <span>{LANG.returnFee}</span>
              <span>{receiptPreview.returnFeeAmount.toLocaleString('vi-VN')}</span>
            </div>
          )}
          <div className="receipt-row receipt-total">
            <span>{'returnFeeAmount' in receiptPreview ? LANG.totalReturn : 'supplierPaidAmount' in receiptPreview ? LANG.purchasePayable : LANG.totalPayment}</span>
            <span>{receiptPreview.totalAmount.toLocaleString('vi-VN')}</span>
          </div>
          {'customerRefundAmount' in receiptPreview ? (
            <div className="receipt-row">
              <span>{LANG.refund}</span>
              <span>{receiptPreview.customerRefundAmount.toLocaleString('vi-VN')}</span>
            </div>
          ) : 'supplierPaidAmount' in receiptPreview ? (
            <>
              <div className="receipt-row">
                <span>{LANG.receiptPaidSupplier}</span>
                <span>{receiptPreview.supplierPaidAmount.toLocaleString('vi-VN')}</span>
              </div>
              <div className="receipt-row">
                <span>{LANG.receiptDebtSupplier}</span>
                <span>{receiptPreview.debtAmount.toLocaleString('vi-VN')}</span>
              </div>
            </>
          ) : (
            <>
              <div className="receipt-row">
                <span>{LANG.customerGiven}</span>
                <span>{(receiptPreview as SaleReceiptData).customerPaidAmount.toLocaleString('vi-VN')}</span>
              </div>
              <div className="receipt-row">
                <span>{LANG.changeAmount}</span>
                <span>{(receiptPreview as SaleReceiptData).changeAmount.toLocaleString('vi-VN')}</span>
              </div>
            </>
          )}
          <div className="receipt-dash" />
          <div className="receipt-center">{receiptPreview.footerMessage}</div>
        </div>
      )}
    </Modal>
  );
}
