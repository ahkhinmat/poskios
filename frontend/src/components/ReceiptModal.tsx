import { Button, Modal } from 'antd';
import { LANG } from '../lang';
import type { ReceiptPreviewData } from '../types';
import { buildReceiptViewModel } from '../utils/receipt';

type Props = {
  receiptPreview: ReceiptPreviewData | null;
  onClose: () => void;
  onPrint: (receipt: ReceiptPreviewData) => void;
};

export function ReceiptModal({ receiptPreview, onClose, onPrint }: Props) {
  const view = receiptPreview ? buildReceiptViewModel(receiptPreview) : null;

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
      {receiptPreview && view && (
        <div className="receipt-preview">
          <div className="receipt-center">
            <div className="receipt-store">{receiptPreview.storeName}</div>
            {receiptPreview.storeAddress && <div>{receiptPreview.storeAddress}</div>}
            {receiptPreview.storePhoneNumber && <div>{receiptPreview.storePhoneNumber}</div>}
          </div>
          <div className="receipt-dash" />
          <div className="receipt-row">
            <span>{view.codeLabel}</span>
            <strong>{view.codeValue}</strong>
          </div>
          <div className="receipt-row">
            <span>{view.partyLabel}</span>
            <span>{view.partyValue}</span>
          </div>
          <div className="receipt-row">
            <span>{view.dateLabel}</span>
            <span>{view.dateValue}</span>
          </div>
          <div className="receipt-dash" />
          {view.items.map((item, index) => (
            <div className="receipt-item" key={`${item.productName}-${index}`}>
              <div className="receipt-item-name">
                {item.productName} - ({item.unitName})
              </div>
              <div className="receipt-row receipt-muted">
                <span>
                  {item.quantityText} x {item.unitPriceText}
                </span>
                <span>{item.lineTotalText}</span>
              </div>
            </div>
          ))}
          <div className="receipt-dash" />
          {view.summaryRows.map((row) => (
            <div
              className={`receipt-row${row.isTotal ? ' receipt-total' : ''}`}
              key={`${row.label}-${row.value}`}
            >
              <span>{row.label}</span>
              <span>{row.value}</span>
            </div>
          ))}
          <div className="receipt-dash" />
          <div className="receipt-center">{receiptPreview.footerMessage}</div>
          {receiptPreview.receiptPoweredBy && (
            <div className="receipt-center receipt-powered">{receiptPreview.receiptPoweredBy}</div>
          )}
        </div>
      )}
    </Modal>
  );
}
