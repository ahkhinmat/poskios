import {
  App as AntApp,
  Button,
  Input,
  InputNumber,
  Modal,
  Select,
  Tag,
} from 'antd';
import type { InputRef } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { LANG } from '../lang';
import type { ApiEnvelope, ManageProduct } from '../types';
import { extractApiErrorMessage } from '../utils/error';

type Props = {
  open: boolean;
  onClose: () => void;
};

const PAGE_SIZE = 10;

export function ProductManager({ open, onClose }: Props) {
  const { message } = AntApp.useApp();
  const [products, setProducts] = useState<ManageProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const searchKeywordRef = useRef('');
  const bodyRef = useRef<HTMLDivElement>(null);
  const [editingProduct, setEditingProduct] = useState<ManageProduct | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [formProductCode, setFormProductCode] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategoryId, setFormCategoryId] = useState<number | null>(null);
  const [formUnitId, setFormUnitId] = useState<number | null>(null);
  const [formCostPrice, setFormCostPrice] = useState<number>(0);
  const [formSalePrice, setFormSalePrice] = useState<number>(0);
  const [formStockOnHand, setFormStockOnHand] = useState<number>(0);

  const [units, setUnits] = useState<{ id: number; name: string }[]>([]);
  const barcodeRef = useRef<InputRef>(null);

  async function loadPage(p: number, keyword: string, append = false) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('pageSize', String(PAGE_SIZE));
      if (keyword.trim()) params.set('keyword', keyword.trim());
      const res = await api.get<ApiEnvelope<{ items: ManageProduct[]; total: number }>>(`/pos/products/manage?${params}`);
      if (append) {
        setProducts((prev) => [...prev, ...res.data.data.items]);
      } else {
        setProducts(res.data.data.items);
      }
      setTotal(res.data.data.total);
    } catch (err) {
      console.error('loadPage error', err);
      message.error(LANG.errLoadProducts);
    } finally {
      setLoading(false);
    }
  }

  function resetSearch(value: string) {
    searchKeywordRef.current = value;
    setPage(1);
    setProducts([]);
    void loadPage(1, value);
  }

  useEffect(() => {
    if (!open) return;
    resetSearch('');
  }, [open]);

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (loading || products.length >= total) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 60) {
      const nextPage = page + 1;
      setPage(nextPage);
      void loadPage(nextPage, searchKeywordRef.current, true);
    }
  }

  async function openForm(product?: ManageProduct) {
    setEditingProduct(product ?? null);
    setFormProductCode(product?.productCode ?? '');
    setFormBarcode(product?.barcode ?? '');
    setFormName(product?.name ?? '');
    setFormCategoryId(product?.categoryId ?? null);
    setFormUnitId(product?.units?.find((u) => u.isDefaultForPos)?.unitId ?? null);
    setFormCostPrice(product?.costPrice ?? 0);
    setFormSalePrice(product?.salePrice ?? 0);
    setFormStockOnHand(product?.stockOnHand ?? 0);
    try {
      const res = await api.get<ApiEnvelope<{ id: number; name: string }[]>>('/pos/units');
      setUnits(res.data.data);
    } catch { /* ignore */ }
    setFormOpen(true);
    setTimeout(() => barcodeRef.current?.focus(), 100);
  }

  async function handleSave() {
    if (!formProductCode.trim()) {
      message.warning(LANG.productCodeRequired);
      return;
    }
    if (!formName.trim()) {
      message.warning(LANG.productNameRequired);
      return;
    }
    setSaving(true);
    try {
      if (editingProduct) {
        const body: Record<string, unknown> = {
          barcode: formBarcode.trim() || undefined,
          name: formName.trim(),
          categoryId: formCategoryId ?? 1,
          unitId: formUnitId ?? 1,
          costPrice: formCostPrice,
          salePrice: formSalePrice,
          stockOnHand: formStockOnHand,
        };
        await api.put<ApiEnvelope<ManageProduct>>(`/pos/products/${editingProduct.id}`, body);
        message.success(LANG.successProductUpdated);
      } else {
        const body = {
          productCode: formProductCode.trim(),
          barcode: formBarcode.trim() || undefined,
          name: formName.trim(),
          categoryId: formCategoryId ?? 1,
          unitId: formUnitId ?? 1,
          costPrice: formCostPrice,
          salePrice: formSalePrice,
          stockOnHand: formStockOnHand,
        };
        await api.post<ApiEnvelope<ManageProduct>>('/pos/products', body);
        message.success(LANG.successProductCreated);
      }

      setFormOpen(false);
      setEditingProduct(null);
      resetSearch(formName.trim());
    } catch (err: any) {
      console.error('save product error', err);
      const msg = err?.response?.data?.message ?? err?.message ?? LANG.errSaveProduct;
      message.error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProduct(product: ManageProduct) {
    Modal.confirm({
      title: LANG.confirmDeleteProduct,
      content: `"${product.name}"`,
      okText: LANG.deleteProduct,
      okType: 'danger',
      cancelText: LANG.cancel,
      onOk: async () => {
        try {
          await api.delete(`/pos/products/${product.id}`);
          message.success(LANG.successProductDeleted);
          resetSearch(searchKeywordRef.current);
        } catch (error: unknown) {
          message.error(extractApiErrorMessage(error, LANG.errDeleteProduct));
        }
      },
    });
  }

  return (
    <Modal
      className="product-modal-full"
      title={LANG.productTitle}
      open={open}
      onCancel={onClose}
      footer={null}
      width={1400}
      style={{ top: 0 }}
      styles={{ body: { padding: '12px 20px', height: 'calc(100vh - 110px)', overflow: 'auto' } }}
    >
      <div className="product-top">
        <span className="product-count">Tổng số: <strong>{total}</strong></span>
        <Input.Search
          className="product-search"
          placeholder={LANG.searchProducts}
          allowClear
          onSearch={(val) => void resetSearch(val)}
        />
        <Button type="primary" onClick={() => openForm()}>
          {LANG.addProduct}
        </Button>
      </div>

      <div className="product-grid-head">
        <div className="product-cell">{LANG.productCode}</div>
        <div className="product-cell">{LANG.productName}</div>
        <div className="product-cell">{LANG.productCost}</div>
        <div className="product-cell">{LANG.productPrice}</div>
        <div className="product-cell">{LANG.productStock}</div>
        <div className="product-cell">{LANG.productUnit}</div>
        <div className="product-cell">{LANG.productStatus}</div>
        <div className="product-cell">{LANG.productActions}</div>
      </div>

      <div className="product-grid-body" ref={bodyRef} onScroll={handleScroll}>
        {products.length ? products.map((product) => (
          <div
            key={product.id}
            className={`product-grid-row${product.isActive ? '' : ' product-row-inactive'}`}
          >
            <div className="product-cell product-cell-code">{product.productCode}</div>
            <div className="product-cell product-cell-name">{product.name}</div>
            <div className="product-cell">{product.costPrice.toLocaleString('vi-VN')}</div>
            <div className="product-cell">{product.salePrice.toLocaleString('vi-VN')}</div>
            <div className="product-cell">{product.stockOnHand.toLocaleString('vi-VN')}</div>
            <div className="product-cell" title={product.units.map((u) => `${u.unitName} (x${u.conversionValue})`).join(', ')}>
              {product.units.map((u) => `${u.unitName}${u.isDefaultForPos ? ' ★' : ''} (x${u.conversionValue})`).join(', ')}
            </div>
            <div className="product-cell">
              {product.isActive ? (
                <Tag color="green" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>{LANG.productActive}</Tag>
              ) : (
                <Tag color="red" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>{LANG.productInactive}</Tag>
              )}
            </div>
            <div className="product-cell product-actions">
              <Button size="small" onClick={() => openForm(product)}>{LANG.editProduct}</Button>
              <Button size="small" danger onClick={() => void handleDeleteProduct(product)}>{LANG.deleteProduct}</Button>
            </div>
          </div>
        )) : (
          !loading && (
            <div className="empty-stage">
              <span>{LANG.noProductsFound}</span>
            </div>
          )
        )}
        {loading && <div className="product-loading">Đang tải...</div>}
      </div>

      <Modal
        title={editingProduct ? LANG.editProduct : LANG.addProduct}
        open={formOpen}
        onCancel={() => { setFormOpen(false); setEditingProduct(null); }}
        onOk={() => void handleSave()}
        confirmLoading={saving}
        okText={LANG.saveProduct}
        cancelText={LANG.cancel}
        destroyOnClose
        width={520}
      >
        <div className="product-form-grid">
          <div className="product-form-label">{LANG.productCode}</div>
          <Input
            value={formProductCode}
            onChange={(e) => setFormProductCode(e.target.value)}
            placeholder="VD: SP001"
          />
          <div className="product-form-label">{LANG.scanBarcode}</div>
          <Input
            ref={barcodeRef}
            value={formBarcode}
            onChange={(e) => setFormBarcode(e.target.value)}
            placeholder={LANG.barcodePlaceholder}
          />
          <div className="product-form-label">{LANG.productName}</div>
          <Input
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Nhập tên sản phẩm"
          />
          <div className="product-form-label">{LANG.productCost}</div>
          <InputNumber
            value={formCostPrice}
            onChange={(v) => setFormCostPrice(v ?? 0)}
            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
            parser={(v) => Number((v ?? '0').replace(/\./g, ''))}
            style={{ width: '100%' }}
          />
          <div className="product-form-label">{LANG.productPrice}</div>
          <InputNumber
            value={formSalePrice}
            onChange={(v) => setFormSalePrice(v ?? 0)}
            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
            parser={(v) => Number((v ?? '0').replace(/\./g, ''))}
            style={{ width: '100%' }}
          />
          <div className="product-form-label">{LANG.productUnit}</div>
          <Select
            showSearch
            value={formUnitId}
            onChange={(v) => setFormUnitId(v)}
            options={units.map((u) => ({ value: u.id, label: u.name }))}
            style={{ width: '100%' }}
            placeholder="Chọn ĐVT"
            filterOption={(input, option) =>
              (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
          <div className="product-form-label">{LANG.productStock}</div>
          <InputNumber
            value={formStockOnHand}
            onChange={(v) => setFormStockOnHand(v ?? 0)}
            style={{ width: '100%' }}
          />
        </div>
      </Modal>
    </Modal>
  );
}
