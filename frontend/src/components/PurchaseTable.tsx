import { DeleteOutlined } from '@ant-design/icons';
import { Empty, InputNumber, Select } from 'antd';
import { LANG } from '../lang';
import type { PosDraftItem, PosProductUnitOption } from '../types';

type PurchaseTableProps = {
  items: PosDraftItem[];
  removeItem: (productUnitId: number) => void;
  updateItem: (productUnitId: number, updates: Partial<PosDraftItem>) => void;
  getUnitOptionsForItem: (item: PosDraftItem) => PosProductUnitOption[];
  loadProductUnitOptions: (productId: number) => Promise<PosProductUnitOption[]>;
  handleChangeItemUnit: (item: PosDraftItem, newUnitId: number) => void;
};

export function PurchaseTable({
  items,
  removeItem,
  updateItem,
  getUnitOptionsForItem,
  loadProductUnitOptions,
  handleChangeItemUnit,
}: PurchaseTableProps) {
  return (
    <>
      <div className="purchase-table-head">
        <div>{LANG.purchaseTableNo}</div>
        <div>{LANG.purchaseTableCode}</div>
        <div>{LANG.purchaseTableName}</div>
        <div>{LANG.purchaseTableUnit}</div>
        <div>{LANG.purchaseTableStock}</div>
        <div>{LANG.purchaseTableQty}</div>
        <div>{LANG.purchaseTablePrice}</div>
        <div>{LANG.purchaseTableDiscount}</div>
        <div>{LANG.purchaseTableTotal}</div>
      </div>
      {items.length ? (
        items.map((item, index) => (
          <div key={item.productUnitId} className="purchase-row">
            <div className="purchase-stt">
              <button
                type="button"
                className="sale-icon-button sale-icon-delete"
                onClick={() => removeItem(item.productUnitId)}
              >
                <DeleteOutlined />
              </button>
              <span>{index + 1}</span>
            </div>
            <div>{item.productCode}</div>
            <div className="purchase-name">{item.productName}</div>
            <div>
              <Select
                size="small"
                className="purchase-unit-select"
                value={item.productUnitId}
                options={getUnitOptionsForItem(item).map((option) => ({
                  label: option.unitName,
                  value: option.productUnitId,
                }))}
                onDropdownVisibleChange={(open) => {
                  if (open) {
                    void loadProductUnitOptions(item.productId);
                  }
                }}
                onChange={(value) => handleChangeItemUnit(item, value)}
              />
            </div>
            <div>{item.stockOnHand.toLocaleString('vi-VN')}</div>
            <div>
              <InputNumber
                min={1}
                step={1}
                controls={false}
                className="purchase-input"
                value={item.quantity}
                onChange={(value) =>
                  updateItem(item.productUnitId, {
                    quantity: Math.max(1, Number(value ?? 1)),
                  })
                }
              />
            </div>
            <div>
              <InputNumber
                min={0}
                controls={false}
                className="purchase-input"
                value={item.unitPrice}
                onChange={(value) =>
                  updateItem(item.productUnitId, {
                    unitPrice: Number(value ?? 0),
                  })
                }
              />
            </div>
            <div>
              <InputNumber
                min={0}
                controls={false}
                className="purchase-input"
                value={item.discountAmount}
                onChange={(value) =>
                  updateItem(item.productUnitId, {
                    discountAmount: Number(value ?? 0),
                  })
                }
              />
            </div>
            <div className="purchase-total">
              {item.lineTotal.toLocaleString('vi-VN')}
            </div>
          </div>
        ))
      ) : (
        <div className="empty-stage empty-stage-purchase">
          <Empty description={LANG.purchaseEmpty} />
        </div>
      )}
    </>
  );
}
