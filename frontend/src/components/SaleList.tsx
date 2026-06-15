import {
  DeleteOutlined,
  MinusOutlined,
  MoreOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Empty, InputNumber, Select, Tag } from 'antd';
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
          <div className="sale-cell sale-cell-index">{index + 1}</div>
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
              <Tag color={item.stockOnHand < 0 ? 'red' : 'green'} className="sale-stock-tag">
                {item.stockOnHand.toLocaleString('vi-VN')}
              </Tag>
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
          <button type="button" className="sale-icon-button sale-icon-more" aria-label={`${LANG.itemOptions} ${item.productName}`}>
            <MoreOutlined />
          </button>
        </div>
      ))}
    </>
  );
}
