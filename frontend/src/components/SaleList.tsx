function stockBarProps(stock: number) {
  if (stock <= 0) return { pct: 0, color: '#ef4444' };
  if (stock <= 10) return { pct: Math.max(10, stock * 5), color: '#f59e0b' };
  if (stock <= 50) return { pct: Math.min(50, stock), color: '#f59e0b' };
  return { pct: 100, color: '#16a34a' };
}

import {
  DeleteOutlined,
  MinusOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Empty, InputNumber, Select } from 'antd';
import { LANG } from '../lang';
import type { PosDraftItem, PosProductUnitOption } from '../types';

type SaleListProps = {
  items: PosDraftItem[];
  removeItem: (productUnitId: number) => void;
  updateItem: (productUnitId: number, updates: Partial<PosDraftItem>) => void;
  getUnitOptionsForItem: (item: PosDraftItem) => PosProductUnitOption[];
  loadProductUnitOptions: (productId: number) => Promise<PosProductUnitOption[]>;
  handleChangeItemUnit: (item: PosDraftItem, newUnitId: number) => void;
};

export function SaleList({
  items,
  removeItem,
  updateItem,
  getUnitOptionsForItem,
  loadProductUnitOptions,
  handleChangeItemUnit,
}: SaleListProps) {
  if (!items.length) {
    return (
      <div className="empty-stage">
        <Empty description={LANG.emptyCart} />
      </div>
    );
  }

  return (
    <>
      {items.map((item, index) => (
        <div key={item.productUnitId} className="sale-row">
          <div className="sale-cell sale-cell-index">{items.length - index}</div>
          <button
            type="button"
            className="sale-icon-button sale-icon-delete"
            onClick={() => removeItem(item.productUnitId)}
          >
            <DeleteOutlined />
          </button>
          <div className="sale-cell sale-code">{item.productCode}</div>
          <div className="sale-cell sale-product">
            <div className="sale-product-line">
              <div className="sale-product-name">{item.productName}</div>
              <div className="sale-stock-wrapper">
                <div className="sale-stock-bar">
                  <div
                    className="sale-stock-bar-fill"
                    style={{ width: `${stockBarProps(item.stockOnHand).pct}%`, background: stockBarProps(item.stockOnHand).color }}
                  />
                </div>
                <strong style={{ fontSize: 11, color: stockBarProps(item.stockOnHand).color, minWidth: 32, textAlign: 'right' }}>
                  {item.stockOnHand.toLocaleString('vi-VN')}
                </strong>
              </div>
              <Select
                size="small"
                className="sale-unit-select"
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
          </div>
          <div className="sale-cell sale-qty">
            <button
              type="button"
              className="sale-icon-button"
              onClick={() =>
                updateItem(item.productUnitId, {
                  quantity: Math.max(1, item.quantity - 1),
                })
              }
            >
              <MinusOutlined />
            </button>
            <InputNumber
              min={1}
              step={1}
              controls={false}
              value={item.quantity}
              onChange={(value) =>
                updateItem(item.productUnitId, {
                  quantity: Math.max(1, Number(value ?? 1)),
                })
              }
            />
            <button
              type="button"
              className="sale-icon-button"
              aria-label={`${LANG.increaseQuantity} ${item.productName}`}
              onClick={() =>
                updateItem(item.productUnitId, {
                  quantity: item.quantity + 1,
                })
              }
            >
              <PlusOutlined />
            </button>
          </div>
          <div className="sale-cell sale-price">
            <InputNumber
              min={0}
              controls={false}
              value={item.unitPrice}
              onChange={(value) =>
                updateItem(item.productUnitId, {
                  unitPrice: Number(value ?? 0),
                })
              }
            />
          </div>
          <div className="sale-cell sale-total">
            {item.lineTotal.toLocaleString('vi-VN')}
          </div>
        </div>
      ))}
    </>
  );
}
