import {
  App as AntApp,
  Button,
  Drawer,
  Input,
  InputNumber,
  Modal,
  Select,
  Tag,
  Upload,
} from 'antd';
import { UploadOutlined } from '@ant-design/icons';
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

export function ProductManager({ open, onClose }: Props) {
  const { message } = AntApp.useApp();
  const [products, setProducts] = useState<ManageProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
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

  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgressText, setImportProgressText] = useState('');
  const [importResult, setImportResult] = useState<{
    fileName: string;
    totalRows: number;
    createdProducts: number;
    updatedProducts: number;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const importStartRef = useRef(0);
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (!open) return;
    api.get<ApiEnvelope<{ productManagerPageSize: number }>>('/pos/settings').then((res) => {
      const ps = res.data.data.productManagerPageSize ?? 30;
      setPageSize(ps);
      searchKeywordRef.current = '';
      setPage(1);
      setProducts([]);
      void loadPage(1, '', false, ps);
    }).catch(() => {
      void loadPage(1, '', false, 30);
    });
  }, [open]);

  async function loadPage(p: number, keyword: string, append = false, ps?: number) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('pageSize', String(ps ?? pageSize));
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
    if (!importing) { setElapsedSec(0); return; }
    const id = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - importStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [importing]);

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
    <Drawer
      title={LANG.productTitle}
      open={open}
      onClose={onClose}
      width="100vw"
      styles={{ body: { padding: '12px 20px', display: 'flex', flexDirection: 'column' } }}
    >
      <div className="product-top">
        <span className="product-count">{LANG.productTotalCount} <strong>{total}</strong></span>
        <Input.Search
          className="product-search"
          placeholder={LANG.searchProducts}
          allowClear
          onSearch={(val) => void resetSearch(val)}
        />
        <Button type="primary" onClick={() => openForm()}>
          {LANG.addProduct}
        </Button>
        <Button icon={<UploadOutlined />} onClick={() => { setImportOpen(true); setImportResult(null); setImportError(null); }}>
          {LANG.productImportExcel}
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
        {loading && <div className="product-loading">{LANG.productLoading}</div>}
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
            placeholder={LANG.productCodePlaceholder}
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
            placeholder={LANG.productNamePlaceholder}
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
            placeholder={LANG.productUnitPlaceholder}
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

      <Modal
        title={LANG.productImportTitle}
        open={importOpen}
        onCancel={() => { setImportOpen(false); setImportResult(null); setImportError(null); }}
        footer={null}
        width={500}
        destroyOnClose
      >
        <div style={{ padding: '16px 0' }}>
          <Upload.Dragger
            key={importResult ? 'result' : 'upload'}
            name="file"
            accept=".xlsx"
            showUploadList={false}
            disabled={importing || !!importResult}
              customRequest={async (options) => {
              setImporting(true);
              setImportError(null);
              setImportResult(null);
              importStartRef.current = Date.now();
              setImportProgressText(LANG.productImportParsing);
              try {
                const formData = new FormData();
                formData.append('file', options.file as File);
                setImportProgressText(LANG.productImportProcessing);
                const res = await api.post<ApiEnvelope<{
                  fileName: string;
                  totalRows: number;
                  createdProducts: number;
                  updatedProducts: number;
                }>>('/pos/products/import/upsert', formData);
                setImportResult(res.data.data);
                message.success(LANG.productImportCompleted(res.data.data.totalRows, res.data.data.createdProducts, res.data.data.updatedProducts));
                resetSearch(searchKeywordRef.current);
              } catch (err: any) {
                const msg = err?.response?.data?.message ?? err?.message ?? LANG.productImportFailed;
                setImportError(typeof msg === 'string' ? msg : JSON.stringify(msg));
              } finally {
                setImporting(false);
              }
            }}
          >
            {importResult ? (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, color: '#52c41a' }}>{LANG.productImportSuccess}</div>
                <div>{LANG.productImportFileName} {importResult.fileName}</div>
                <div>{LANG.productImportTotalRows} {importResult.totalRows}</div>
                <div>{LANG.productImportCreated} {importResult.createdProducts}</div>
                <div>{LANG.productImportUpdated} {importResult.updatedProducts}</div>
              </div>
            ) : importing ? (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <div style={{ fontSize: 16, color: '#1890ff', marginBottom: 8 }}>{LANG.productImportInProgress}</div>
                <div style={{ color: '#555', marginBottom: 4 }}>{importProgressText}</div>
                <div style={{ color: '#888', fontSize: 13 }}>{LANG.productImportElapsed} {elapsedSec}s</div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <p className="ant-upload-drag-icon">
                  <UploadOutlined style={{ fontSize: 48, color: '#40a9ff' }} />
                </p>
                <p className="ant-upload-text">{LANG.productImportDropHint}</p>
                <p className="ant-upload-hint">{LANG.productImportFormatHint}</p>
              </div>
            )}
          </Upload.Dragger>

          {importError && (
            <div style={{ textAlign: 'center', marginTop: 12, color: '#ff4d4f' }}>
              {importError}
            </div>
          )}

          {importResult && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Button onClick={() => { setImportOpen(false); setImportResult(null); setImportError(null); }}>
                {LANG.close}
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </Drawer>
  );
}
