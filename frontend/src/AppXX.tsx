import {
  App as AntApp,
  Button,
  ConfigProvider,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Radio,
  Select,
  Spin,
  Tag,
  Typography,
  theme,
} from 'antd';
import type { InputRef } from 'antd';
import {
  DeleteOutlined,
  MinusOutlined,
  MoreOutlined,
  PlusOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api';
import type {
  CheckoutResponse,
  InvoiceSearchItem,
  PosDraftItem,
  PosDraftTab,
  PosProduct,
  PosProductUnitOption,
  ReturnCheckoutResponse,
} from './types';

const { Text } = Typography;

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

type DraftTabsResponse = {
  items: PosDraftTab[];
};

type SearchResponse = {
  items: PosProduct[];
};

type ProductUnitOptionsResponse = {
  items: PosProductUnitOption[];
};

const paymentOptions = [
  { label: 'Tiền mặt', value: 'CASH' },
  { label: 'Chuyển khoản', value: 'BANK_TRANSFER' },
  { label: 'Thẻ', value: 'CARD' },
  { label: 'Ví', value: 'EWALLET' },
];

type InvoiceSearchResponse = {
  items: InvoiceSearchItem[];
};

type InvoiceItemData = {
  salesOrderItemId: number;
  productId: number;
  productUnitId: number;
  unitId: number;
  productCode: string;
  barcode: string | null;
  productName: string;
  unitName: string | null;
  conversionValue: number;
  originalQuantity: number;
  unitPrice: number;
  discountAmount: number;
  lineTotal: number;
  stockOnHand: number;
};

type InvoiceItemsResponse = {
  salesOrderCode: string;
  soldAt: string;
  customerName: string | null;
  items: InvoiceItemData[];
};

type SaleReceiptData = CheckoutResponse['receiptData'];
type ReturnReceiptData = ReturnCheckoutResponse['receiptData'];
type ReceiptPreviewData = SaleReceiptData | ReturnReceiptData;

export function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#16a34a',
          borderRadius: 12,
          fontFamily:
            '"Be Vietnam Pro","Segoe UI",system-ui,-apple-system,sans-serif',
        },
      }}
    >
      <AntApp>
        <PosPage />
      </AntApp>
    </ConfigProvider>
  );
}

function PosPage() {
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [tabs, setTabs] = useState<PosDraftTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [searchResults, setSearchResults] = useState<PosProduct[]>([]);
  const [productUnitOptionsMap, setProductUnitOptionsMap] = useState<
    Record<number, PosProductUnitOption[]>
  >({});
  const [highlightedSearchIndex, setHighlightedSearchIndex] = useState(-1);
  const [checkingOut, setCheckingOut] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState<ReceiptPreviewData | null>(
    null,
  );
  const [invoiceSearchType, setInvoiceSearchType] = useState<'code' | 'product'>('code');
  const [invoiceSearchValue, setInvoiceSearchValue] = useState('');
  const [invoiceFromDate, setInvoiceFromDate] = useState<string | null>(
    new Date().toISOString().slice(0, 10),
  );
  const [invoiceToDate, setInvoiceToDate] = useState<string | null>(
    new Date().toISOString().slice(0, 10),
  );
  const [foundInvoices, setFoundInvoices] = useState<InvoiceSearchItem[]>([]);
  const [invoiceSearching, setInvoiceSearching] = useState(false);
  const saveTimerRef = useRef<number | null>(null);
  const searchInputRef = useRef<InputRef>(null);
  const searchKeywordRef = useRef('');

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? null,
    [tabs, activeTabId],
  );

  const summary = useMemo(() => {
    const items = activeTab?.items ?? [];
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const lineDiscount = items.reduce((sum, item) => sum + item.discountAmount, 0);
    const orderDiscount = activeTab?.discountAmount ?? 0;
    const total = subtotal - lineDiscount - orderDiscount;

    return {
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal,
      total,
    };
  }, [activeTab]);

  const isReturnTab = activeTab?.tabType === 'RETURN';

  useEffect(() => {
    void bootstrapDraftTabs();
  }, []);

  useEffect(() => {
    if (!activeTab || loading) {
      return;
    }

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      void persistDraftTab(activeTab);
    }, 500);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [activeTab, loading]);

  useEffect(() => {
    const keyword = searchValue.trim();

    if (!keyword) {
      setSearchResults([]);
      setHighlightedSearchIndex(-1);
      return;
    }

    const debounceTimer = window.setTimeout(() => {
      searchKeywordRef.current = keyword;
      void searchProducts(keyword);
    }, 250);

    return () => {
      window.clearTimeout(debounceTimer);
    };
  }, [searchValue]);

  useEffect(() => {
    if (!loading) {
      focusSearchInput();
    }
  }, [loading, activeTabId]);

  useEffect(() => {
    if (!activeTab || activeTab.customerPaidAmount === summary.total) {
      return;
    }

    updateActiveTab({ customerPaidAmount: summary.total });
  }, [summary.total, activeTabId, activeTab?.customerPaidAmount]);

  useEffect(() => {
    if (!activeTab?.items.length) {
      return;
    }

    const missingProductIds = [...new Set(activeTab.items.map((item) => item.productId))].filter(
      (productId) => !productUnitOptionsMap[productId],
    );

    if (!missingProductIds.length) {
      return;
    }

    void Promise.all(missingProductIds.map((productId) => loadProductUnitOptions(productId)));
  }, [activeTab, productUnitOptionsMap]);

  function focusSearchInput() {
    window.setTimeout(() => {
      searchInputRef.current?.focus({ cursor: 'all' });
    }, 0);
  }

  async function loadProductUnitOptions(productId: number) {
    if (productUnitOptionsMap[productId]) {
      return productUnitOptionsMap[productId];
    }

    const response = await api.get<ApiEnvelope<ProductUnitOptionsResponse>>(
      `/pos/products/${productId}/units`,
    );
    const items = response.data.data.items;

    setProductUnitOptionsMap((current) => ({
      ...current,
      [productId]: items,
    }));

    return items;
  }

  function getUnitOptionsForItem(item: PosDraftItem) {
    const loadedOptions = productUnitOptionsMap[item.productId];

    if (loadedOptions?.length) {
      return loadedOptions;
    }

    return [
      {
        productUnitId: item.productUnitId,
        productId: item.productId,
        unitId: item.unitId,
        unitName: item.unitName,
        barcode: item.barcode,
        conversionValue: item.conversionValue,
        salePrice: item.unitPrice,
        stockOnHand: item.stockOnHand,
        allowDirectSale: true,
        isDefaultForPos: true,
        isSmallestUnit: true,
        isActive: true,
      },
    ];
  }

  async function bootstrapDraftTabs() {
    setLoading(true);

    try {
      const response = await api.get<ApiEnvelope<DraftTabsResponse>>('/pos/draft-tabs');
      const loadedTabs = response.data.data.items;
      const hydratedTabs = loadedTabs.map((tab) => ({
        ...tab,
        items: tab.items.map((item) => ({
          ...item,
          stockOnHand: 0,
        })),
      }));

      if (hydratedTabs.length) {
        setTabs(hydratedTabs);
        setActiveTabId(hydratedTabs[0].id);
      } else {
        const created = await createDraftTab();
        setTabs([created]);
        setActiveTabId(created.id);
      }
    } catch {
      message.error('Không tải được tab POS');
    } finally {
      setLoading(false);
    }
  }

  function getNextTabNumber(currentTabs: PosDraftTab[], prefix: string) {
    const numbers = currentTabs
      .filter((tab) => tab.title.startsWith(prefix))
      .map((tab) => {
        const matched = tab.title.match(/(\d+)$/);
        return matched ? Number(matched[1]) : 0;
      });
    return numbers.length ? Math.max(...numbers) + 1 : 1;
  }

  async function createDraftTab(
    title?: string,
    tabType: 'SALE' | 'RETURN' = 'SALE',
  ) {
    const label = tabType === 'RETURN' ? 'Trả hàng' : 'Hóa đơn';
    const response = await api.post<ApiEnvelope<PosDraftTab>>('/pos/draft-tabs', {
      tabType,
      title: title ?? `${label} ${getNextTabNumber(tabs, label)}`,
      saleMode: 'QUICK_SALE',
      customerName: null,
      customerPhone: null,
      note: null,
      paymentMethod: 'CASH',
      customerPaidAmount: 0,
      discountAmount: 0,
      sourceSalesOrderId: tabType === 'RETURN' ? null : undefined,
      items: [],
    });

    return response.data.data;
  }

  async function persistDraftTab(tab: PosDraftTab) {
    setSaving(true);

    try {
      await api.put(`/pos/draft-tabs/${tab.id}`, {
        tabType: tab.tabType,
        title: tab.title,
        saleMode: tab.saleMode,
        customerName: tab.customerName,
        customerPhone: tab.customerPhone,
        note: tab.note,
        paymentMethod: tab.paymentMethod,
        customerPaidAmount: tab.customerPaidAmount,
        discountAmount: tab.discountAmount,
        sourceSalesOrderId: tab.sourceSalesOrderId,
        items: tab.items.map((item) => ({
          productId: item.productId,
          productUnitId: item.productUnitId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount,
          note: item.note ?? null,
        })),
      });
    } catch {
      message.error('Không lưu được tab tạm');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateTab(tabType: 'SALE' | 'RETURN' = 'SALE') {
    try {
      const created = await createDraftTab(undefined, tabType);
      setTabs((current) => [...current, created]);
      setActiveTabId(created.id);
    } catch {
      message.error(tabType === 'RETURN' ? 'Không tạo được tab trả hàng' : 'Không tạo được tab mới');
    }
  }

  async function handleCloseTab(targetId: number) {
    if (tabs.length === 1) {
      message.warning('Cần ít nhất một tab POS');
      return;
    }

    try {
      await api.delete(`/pos/draft-tabs/${targetId}`);
      setTabs((current) => current.filter((tab) => tab.id !== targetId));
      if (activeTabId === targetId) {
        const next = tabs.find((tab) => tab.id !== targetId);
        setActiveTabId(next?.id ?? null);
      }
    } catch {
      message.error('Không đóng được tab');
    }
  }

  async function handleResolveProduct() {
    if (!searchValue.trim() || !activeTab) {
      return;
    }

    setSearching(true);
    try {
      const response = await api.get<ApiEnvelope<PosProduct>>('/pos/products/resolve', {
        params: { code: searchValue.trim() },
      });
      addProductToActiveTab(response.data.data);
      setSearchResults([]);
      setHighlightedSearchIndex(-1);
      setSearchValue('');
      focusSearchInput();
      return;
    } catch {
      // resolve thất bại (không phải mã vạch/code chính xác)
    } finally {
      setSearching(false);
    }

    if (
      highlightedSearchIndex >= 0 &&
      highlightedSearchIndex < searchResults.length &&
      searchValue.trim() === searchKeywordRef.current
    ) {
      const selectedProduct = searchResults[highlightedSearchIndex];
      addProductToActiveTab(selectedProduct);
      setSearchResults([]);
      setHighlightedSearchIndex(-1);
      setSearchValue('');
      focusSearchInput();
      return;
    }

    await searchProducts(searchValue.trim(), true);
  }

  async function searchProducts(keyword: string, notifyWhenEmpty = false) {
    try {
      const response = await api.get<ApiEnvelope<SearchResponse>>('/pos/products/search', {
        params: { keyword, limit: 8 },
      });
      const items = response.data.data.items;
      setSearchResults(items);
      setHighlightedSearchIndex(items.length ? 0 : -1);

      if (notifyWhenEmpty && !items.length) {
        message.error('Không tìm thấy sản phẩm');
      }
    } catch {
      if (notifyWhenEmpty) {
        message.error('Không tìm thấy sản phẩm');
      }
    }
  }

  async function searchInvoice() {
    const keyword = invoiceSearchValue.trim();
    const hasKeyword = !!keyword;
    const hasFromDate = !!invoiceFromDate;
    const hasToDate = !!invoiceToDate;

    if (!hasKeyword && !hasFromDate && !hasToDate) {
      message.warning('Nhập thông tin tìm kiếm hoặc chọn khoảng ngày');
      return;
    }

    setInvoiceSearching(true);
    try {
      const params: Record<string, string> = {};
      if (hasKeyword) {
        if (invoiceSearchType === 'code') {
          params.invoiceCode = keyword;
        } else {
          params.productCode = keyword;
        }
      }
      if (hasFromDate) params.fromDate = invoiceFromDate!;
      if (hasToDate) params.toDate = invoiceToDate!;

      const response = await api.get<ApiEnvelope<InvoiceSearchResponse>>('/returns/invoices/search', { params });
      setFoundInvoices(response.data.data.items);

      if (!response.data.data.items.length) {
        message.error('Không tìm thấy hóa đơn');
      }
    } catch {
      message.error('Lỗi tra cứu hóa đơn');
    } finally {
      setInvoiceSearching(false);
    }
  }

  async function handleSelectInvoice(invoiceId: number) {
    if (!activeTab) return;

    setInvoiceSearching(true);
    try {
      const response = await api.get<ApiEnvelope<InvoiceItemsResponse>>(`/returns/invoices/${invoiceId}/items`);
      const data = response.data.data;

      const draftItems: PosDraftItem[] = data.items.map((item, index) => ({
        productId: item.productId,
        productUnitId: item.productUnitId,
        productCode: item.productCode,
        barcode: item.barcode,
        productName: item.productName,
        unitId: item.unitId,
        unitName: item.unitName ?? '',
        conversionValue: item.conversionValue,
        stockOnHand: item.stockOnHand,
        quantity: item.originalQuantity,
        unitPrice: item.unitPrice,
        discountAmount: 0,
        lineTotal: item.originalQuantity * item.unitPrice,
        note: null,
        sortOrder: index + 1,
      }));

      setTabs((current) =>
        current.map((tab) =>
          tab.id === activeTab.id
            ? { ...tab, items: draftItems, sourceSalesOrderId: invoiceId }
            : tab
        ),
      );

      setFoundInvoices([]);
      setInvoiceSearchValue('');
      const today = new Date().toISOString().slice(0, 10);
      setInvoiceFromDate(today);
      setInvoiceToDate(today);

      message.success(`Đã tải hóa đơn ${data.salesOrderCode}`);
    } catch {
      message.error('Không tải được chi tiết hóa đơn');
    } finally {
      setInvoiceSearching(false);
    }
  }

  function addProductToActiveTab(product: PosProduct) {
    if (!activeTab) {
      return;
    }

    setTabs((current) =>
      current.map((tab) => {
        if (tab.id !== activeTab.id) {
          return tab;
        }

        const existingItem = tab.items.find(
          (item) => item.productUnitId === product.productUnitId,
        );

        if (existingItem) {
          const nextItems = tab.items.map((item) =>
            item.productUnitId === product.productUnitId
              ? {
                  ...item,
                  quantity: item.quantity + 1,
                  lineTotal:
                    (item.quantity + 1) * item.unitPrice - item.discountAmount,
                }
              : item,
          );
          return { ...tab, items: nextItems };
        }

        const newItem: PosDraftItem = {
          productId: product.id,
          productUnitId: product.productUnitId,
          productCode: product.productCode,
          barcode: product.barcode,
          productName: product.name,
          unitId: product.unitId,
          unitName: product.unitName,
          conversionValue: product.conversionValue,
          stockOnHand: product.stockOnHand,
          quantity: 1,
          unitPrice: product.salePrice,
          discountAmount: 0,
          lineTotal: product.salePrice,
          note: null,
          sortOrder: tab.items.length + 1,
        };

        return { ...tab, items: [...tab.items, newItem] };
      }),
    );

    setHighlightedSearchIndex(-1);
  }

  function updateActiveTab(patch: Partial<PosDraftTab>) {
    if (!activeTab) {
      return;
    }

    setTabs((current) =>
      current.map((tab) => (tab.id === activeTab.id ? { ...tab, ...patch } : tab)),
    );
  }

  function updateItem(productUnitId: number, patch: Partial<PosDraftItem>) {
    if (!activeTab) {
      return;
    }

    setTabs((current) =>
      current.map((tab) => {
        if (tab.id !== activeTab.id) {
          return tab;
        }

        return {
          ...tab,
          items: tab.items.map((item) => {
            if (item.productUnitId !== productUnitId) {
              return item;
            }

            const nextItem = { ...item, ...patch };
            nextItem.lineTotal =
              nextItem.quantity * nextItem.unitPrice - nextItem.discountAmount;
            return nextItem;
          }),
        };
      }),
    );
  }

  function handleChangeItemUnit(item: PosDraftItem, nextProductUnitId: number) {
    const options = productUnitOptionsMap[item.productId] ?? [];
    const nextUnit = options.find((option) => option.productUnitId === nextProductUnitId);

    if (!nextUnit) {
      return;
    }

    updateItem(item.productUnitId, {
      productUnitId: nextUnit.productUnitId,
      unitId: nextUnit.unitId,
      unitName: nextUnit.unitName,
      barcode: nextUnit.barcode,
      conversionValue: nextUnit.conversionValue,
      unitPrice: nextUnit.salePrice,
      stockOnHand: nextUnit.stockOnHand,
    });
  }

  function removeItem(productUnitId: number) {
    if (!activeTab) {
      return;
    }

    setTabs((current) =>
      current.map((tab) =>
        tab.id === activeTab.id
          ? {
              ...tab,
              items: tab.items
                .filter((item) => item.productUnitId !== productUnitId)
                .map((item, index) => ({ ...item, sortOrder: index + 1 })),
            }
          : tab,
      ),
    );
  }

  function buildDraftReceipt(): ReceiptPreviewData | null {
    if (!activeTab?.items.length) {
      return null;
    }

    const items = activeTab.items.map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    }));

    if (isReturnTab) {
      const returnFee = activeTab.customerPaidAmount ?? 0;
      const refundAmount = Math.max(0, summary.subtotal - (activeTab.discountAmount ?? 0) - returnFee);
      const returnReceipt: ReturnReceiptData = {
        storeName: 'KA MARK',
        storeAddress: null,
        storePhoneNumber: null,
        salesOrderCode: activeTab.title,
        soldAt: new Date().toISOString(),
        cashierName: 'Thu ngân',
        items,
        subtotalAmount: summary.subtotal,
        discountAmount: activeTab.discountAmount,
        returnFeeAmount: returnFee,
        totalAmount: refundAmount,
        customerRefundAmount: refundAmount,
        footerMessage: 'Hẹn gặp lại',
      };
      return returnReceipt;
    }

    const customerPaidAmount = summary.total;
    const saleReceipt: SaleReceiptData = {
      storeName: 'KA MARK',
      storeAddress: null,
      storePhoneNumber: null,
      salesOrderCode: activeTab.title,
      soldAt: new Date().toISOString(),
      cashierName: 'Thu ngân',
      items,
      subtotalAmount: summary.subtotal,
      discountAmount: activeTab.discountAmount,
      totalAmount: summary.total,
      customerPaidAmount,
      changeAmount: Math.max(0, customerPaidAmount - summary.total),
      footerMessage: 'Hẹn gặp lại',
    };
    return saleReceipt;
  }

  function handlePreviewReceipt() {
    const draftReceipt = buildDraftReceipt();

    if (!draftReceipt) {
      message.warning('Gio hang dang trong');
      return;
    }

    setReceiptPreview(draftReceipt);
  }

  function handlePrintReceipt() {
    if (!receiptPreview) {
      return;
    }

    const printWindow = window.open('', '_blank', 'width=420,height=720');
    if (!printWindow) {
      message.error('Khong mo duoc cua so in');
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${receiptPreview.salesOrderCode}</title>
          <style>
            @page { size: 80mm auto; margin: 4mm; }
            * { box-sizing: border-box; }
            body { width: 72mm; margin: 0; font-family: Arial, sans-serif; font-size: 12px; color: #111; }
            .center { text-align: center; }
            .store { font-size: 16px; font-weight: 700; }
            .muted { color: #555; }
            .line { border-top: 1px dashed #777; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; gap: 8px; }
            .item { margin-bottom: 6px; }
            .item-name { font-weight: 600; }
            .total { font-size: 15px; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="center">
            <div class="store">${receiptPreview.storeName}</div>
            ${receiptPreview.storeAddress ? `<div>${receiptPreview.storeAddress}</div>` : ''}
            ${receiptPreview.storePhoneNumber ? `<div>${receiptPreview.storePhoneNumber}</div>` : ''}
          </div>
          <div class="line"></div>
          <div class="row"><span>Hóa đơn</span><strong>${receiptPreview.salesOrderCode}</strong></div>
          <div class="row"><span>Thu ngân</span><span>${receiptPreview.cashierName}</span></div>
          <div class="row"><span>Ngày</span><span>${new Date(receiptPreview.soldAt).toLocaleString('vi-VN')}</span></div>
          <div class="line"></div>
          ${receiptPreview.items
            .map(
              (item) => `
                <div class="item">
                  <div class="item-name">${item.productName}</div>
                  <div class="row muted">
                    <span>${item.quantity} x ${item.unitPrice.toLocaleString('vi-VN')}</span>
                    <span>${item.lineTotal.toLocaleString('vi-VN')}</span>
                  </div>
                </div>
              `,
            )
            .join('')}
          <div class="line"></div>
          <div class="row"><span>Tiền hàng</span><span>${receiptPreview.subtotalAmount.toLocaleString('vi-VN')}</span></div>
          <div class="row"><span>Giảm giá</span><span>${receiptPreview.discountAmount.toLocaleString('vi-VN')}</span></div>
          ${'returnFeeAmount' in receiptPreview ? `<div class="row"><span>Phí trả hàng</span><span>${receiptPreview.returnFeeAmount.toLocaleString('vi-VN')}</span></div>` : ''}
          <div class="row total"><span>${'returnFeeAmount' in receiptPreview ? 'Tổng trả' : 'Thanh toán'}</span><span>${receiptPreview.totalAmount.toLocaleString('vi-VN')}</span></div>
          ${'customerRefundAmount' in receiptPreview
            ? `<div class="row"><span>Hoàn tiền</span><span>${receiptPreview.customerRefundAmount.toLocaleString('vi-VN')}</span></div>`
            : `<div class="row"><span>Khách đưa</span><span>${(receiptPreview).customerPaidAmount.toLocaleString('vi-VN')}</span></div><div class="row"><span>Tiền thối</span><span>${(receiptPreview).changeAmount.toLocaleString('vi-VN')}</span></div>`}
          <div class="line"></div>
          <div class="center">${receiptPreview.footerMessage ?? ''}</div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  async function handleCheckout() {
    if (!activeTab || !activeTab.items.length) {
      message.warning('Giỏ hàng đang trống');
      return;
    }

    const checkoutPaidAmount = summary.total;

    setCheckingOut(true);
    try {
      if (isReturnTab) {
        const response = await api.post<ApiEnvelope<ReturnCheckoutResponse>>('/returns/checkout', {
          sourceSalesOrderId: activeTab.sourceSalesOrderId ?? 0,
          saleMode: activeTab.saleMode,
          customerName: activeTab.customerName,
          customerPhone: activeTab.customerPhone,
          note: activeTab.note,
          discountAmount: activeTab.discountAmount,
          returnFeeAmount: activeTab.customerPaidAmount ?? 0,
          paymentMethod: activeTab.paymentMethod,
          customerRefundAmount: Math.max(0, summary.subtotal - (activeTab.discountAmount ?? 0) - (activeTab.customerPaidAmount ?? 0)),
          items: activeTab.items.map((item) => ({
            productId: item.productId,
            productUnitId: item.productUnitId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountAmount: item.discountAmount,
            note: item.note ?? null,
          })),
        });

        message.success(`Đã trả hàng - ${response.data.data.salesOrderCode}`);
        setReceiptPreview(response.data.data.receiptData);
      } else {
        const response = await api.post<ApiEnvelope<CheckoutResponse>>('/pos/checkout', {
          saleMode: activeTab.saleMode,
          customerName: activeTab.customerName,
          customerPhone: activeTab.customerPhone,
          note: activeTab.note,
          discountAmount: activeTab.discountAmount,
          paymentMethod: activeTab.paymentMethod,
          customerPaidAmount:
            activeTab.paymentMethod === 'CASH'
              ? checkoutPaidAmount
              : summary.total,
          items: activeTab.items.map((item) => ({
            productId: item.productId,
            productUnitId: item.productUnitId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountAmount: item.discountAmount,
            note: item.note ?? null,
          })),
        });

        message.success(`Đã tạo ${response.data.data.salesOrderCode}`);
        setReceiptPreview({
          ...response.data.data.receiptData,
          storeName: 'KA MARK',
        });
      }

      const refreshed = tabs.filter((tab) => tab.id !== activeTab.id);
      if (!refreshed.length) {
        const created = await createDraftTab(undefined, isReturnTab ? 'SALE' : 'SALE');
        setTabs([created]);
        setActiveTabId(created.id);
      } else {
        setTabs(refreshed);
        setActiveTabId(refreshed[0].id);
      }

      await api.delete(`/pos/draft-tabs/${activeTab.id}`);
      focusSearchInput();
    } catch (error: unknown) {
      const apiMessage =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof error.response === 'object' &&
        error.response !== null &&
        'data' in error.response &&
        typeof error.response.data === 'object' &&
        error.response.data !== null &&
        'message' in error.response.data
          ? String(error.response.data.message)
          : isReturnTab
            ? 'Trả hàng thất bại'
            : 'Thanh toán thất bại';
      message.error(apiMessage);
    } finally {
      setCheckingOut(false);
    }
  }

  if (loading) {
    return (
      <div className="screen-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="pos-shell">
      <div className="pos-grid">
        <section className="sale-stage">
          <div className="sale-topbar">
            <div className="search-box">
              <Input
                ref={searchInputRef}
                size="middle"
                prefix={<SearchOutlined />}
                suffix={searching ? <Spin size="small" /> : null}
                placeholder="Quét mã vạch hoặc nhập mã hàng, tên hàng"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                onKeyDown={(event) => {
                  if (!searchResults.length) {
                    return;
                  }

                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    setHighlightedSearchIndex((current) =>
                      Math.min(
                        current < 0 ? 0 : current + 1,
                        searchResults.length - 1,
                      ),
                    );
                  }

                  if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    setHighlightedSearchIndex((current) =>
                      Math.max(current <= 0 ? 0 : current - 1, 0),
                    );
                  }
                }}
                onPressEnter={() => void handleResolveProduct()}
              />
            </div>

            <div className="draft-strip">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`draft-chip ${tab.id === activeTabId ? 'is-active' : ''}`}
                  onClick={() => setActiveTabId(tab.id)}
                >
                  <span>{tab.title}</span>
                  {tabs.length > 1 && (
                    <span
                      className="draft-chip-close"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleCloseTab(tab.id);
                      }}
                    >
                      ×
                    </span>
                  )}
                </button>
              ))}
              <button
                type="button"
                className="draft-chip draft-chip-add"
                onClick={() => void handleCreateTab()}
              >
                <PlusOutlined />
              </button>
            </div>

            <div className="topbar-actions">
              <Tag color={saving ? 'processing' : 'success'}>
                {saving ? 'Đang lưu' : 'Đã đồng bộ'}
              </Tag>
            </div>
          </div>

          {!!searchResults.length && (
            <div className="search-results search-results-inline">
              <List
                dataSource={searchResults}
                renderItem={(product, index) => (
                  <List.Item
                    className={
                      index === highlightedSearchIndex
                        ? 'search-result-item is-active'
                        : 'search-result-item'
                    }
                    actions={[
                      <Button
                        key={product.productUnitId}
                        type="link"
                        onClick={() => {
                          addProductToActiveTab(product);
                          setSearchResults([]);
                          setHighlightedSearchIndex(-1);
                          setSearchValue('');
                          focusSearchInput();
                        }}
                      >
                        Chọn
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={`${product.name} (${product.unitName})`}
                      description={`${product.productCode} · Tồn ${product.stockOnHand.toLocaleString('vi-VN')} · ${product.salePrice.toLocaleString('vi-VN')} đ`}
                    />
                  </List.Item>
                )}
              />
            </div>
          )}

          {isReturnTab && (
            <div className="return-invoice-search">
              <div className="return-search-row">
                <Select
                  value={invoiceSearchType}
                  onChange={(v) => setInvoiceSearchType(v)}
                  size="small"
                  style={{ width: 120 }}
                  options={[
                    { label: 'Số hóa đơn', value: 'code' },
                    { label: 'Mã hàng', value: 'product' },
                  ]}
                />
                <Input
                  placeholder={invoiceSearchType === 'code' ? 'Nhập mã hóa đơn...' : 'Nhập mã hàng...'}
                  value={invoiceSearchValue}
                  onChange={(e) => setInvoiceSearchValue(e.target.value)}
                  onPressEnter={() => void searchInvoice()}
                />
                <Button
                  type="primary"
                  size="small"
                  loading={invoiceSearching}
                  onClick={() => void searchInvoice()}
                >
                  Tìm
                </Button>
              </div>
              <div className="return-search-row" style={{ marginTop: 6 }}>
                <DatePicker.RangePicker
                  size="small"
                  style={{ flex: 1 }}
                  placeholder={['Từ ngày', 'Đến ngày']}
                  format="DD/MM/YYYY"
                  defaultValue={[dayjs(), dayjs()]}
                  onChange={(dates) => {
                    if (dates && dates[0] && dates[1]) {
                      setInvoiceFromDate(dates[0].format('YYYY-MM-DD'));
                      setInvoiceToDate(dates[1].format('YYYY-MM-DD'));
                    } else {
                      setInvoiceFromDate(null);
                      setInvoiceToDate(null);
                    }
                  }}
                />
              </div>
              {!!foundInvoices.length && (
                <div className="return-found-invoice">
                  {foundInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="found-invoice-row"
                      onClick={() => void handleSelectInvoice(inv.id)}
                    >
                      <div className="found-invoice-header">
                        <span className="found-invoice-code">{inv.salesOrderCode}</span>
                        <span>{new Date(inv.soldAt).toLocaleString('vi-VN')}</span>
                        <span className="found-invoice-total">
                          {inv.totalAmount.toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                      {inv.customerName && (
                        <div className="found-invoice-customer">{inv.customerName}</div>
                      )}
                    </div>
                  ))}
                  <div className="found-invoice-note">
                    Chọn hóa đơn để tải danh sách hàng cần trả, sau đó quét mã vạch ở ô tìm kiếm phía trên
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="sale-list">
            {activeTab?.items.length ? (
              activeTab.items.map((item, index) => (
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
                  <button type="button" className="sale-icon-button sale-icon-more">
                    <MoreOutlined />
                  </button>
                </div>
              ))
            ) : (
              <div className="empty-stage">
                <Empty description="Chưa có sản phẩm trong tab này" />
              </div>
            )}
          </div>

          <div className="sale-footer">
            <Input
              placeholder="Ghi chú đơn hàng"
              value={activeTab?.note ?? ''}
              onChange={(event) => updateActiveTab({ note: event.target.value || null })}
            />
            <div className="sale-modes">
              <button
                type="button"
                className={`sale-mode ${!isReturnTab ? 'is-active' : ''}`}
                onClick={() => {
                  if (isReturnTab) { void handleCreateTab('SALE'); }
                }}
              >
                Bán hàng
              </button>
              <button
                type="button"
                className={`sale-mode ${isReturnTab ? 'is-active' : ''}`}
                onClick={() => {
                  if (!isReturnTab) { void handleCreateTab('RETURN'); }
                }}
              >
                Trả hàng
              </button>
              <button
                type="button"
                className="sale-mode"
                onClick={() => message.info('Chức năng đang phát triển')}
              >
                Nhập hàng
              </button>
            </div>
          </div>
        </section>

        <aside className="checkout-panel">
          <div className="checkout-header">
            <div className="checkout-user">Thu ngân</div>
            <div className="checkout-time">KA MARK</div>
          </div>

          <Form layout="vertical" className="checkout-form">
            <Form.Item label="Khách hàng">
              <Input
                value={activeTab?.customerName ?? ''}
                onChange={(event) =>
                  updateActiveTab({ customerName: event.target.value || null })
                }
                placeholder="Tìm khách hàng"
              />
            </Form.Item>

            <div className="summary-rows">
              {isReturnTab ? (
                <>
                  <div className="summary-row">
                    <Text>Tiền trả hàng</Text>
                    <Text>{summary.subtotal.toLocaleString('vi-VN')}</Text>
                  </div>
                  <div className="summary-row">
                    <Text>Giảm giá</Text>
                    <InputNumber
                      min={0}
                      controls={false}
                      value={activeTab?.discountAmount ?? 0}
                      onChange={(value) =>
                        updateActiveTab({ discountAmount: Number(value ?? 0) })
                      }
                    />
                  </div>
                  <div className="summary-row">
                    <Text>Phí trả hàng</Text>
                    <InputNumber
                      min={0}
                      controls={false}
                      value={activeTab?.customerPaidAmount ?? 0}
                      onChange={(value) =>
                        updateActiveTab({ customerPaidAmount: Number(value ?? 0) })
                      }
                    />
                  </div>
                  <div className="summary-row summary-row-primary">
                    <Text>Hoàn tiền</Text>
                    <Text>
                      {Math.max(0, summary.subtotal - (activeTab?.discountAmount ?? 0) - (activeTab?.customerPaidAmount ?? 0)).toLocaleString('vi-VN')}
                    </Text>
                  </div>
                </>
              ) : (
                <>
                  <div className="summary-row">
                    <Text>Tổng tiền hàng</Text>
                    <Text>{summary.subtotal.toLocaleString('vi-VN')}</Text>
                  </div>
                  <div className="summary-row">
                    <Text>Giảm giá</Text>
                    <InputNumber
                      min={0}
                      controls={false}
                      value={activeTab?.discountAmount ?? 0}
                      onChange={(value) =>
                        updateActiveTab({ discountAmount: Number(value ?? 0) })
                      }
                    />
                  </div>
                  <div className="summary-row summary-row-primary">
                    <Text>Khách cần trả</Text>
                    <Text>{summary.total.toLocaleString('vi-VN')}</Text>
                  </div>
                  <div className="summary-row">
                    <Text>Khách thanh toán</Text>
                    <InputNumber
                      min={0}
                      controls={false}
                      readOnly
                      value={summary.total}
                    />
                  </div>
                </>
              )}
            </div>

            <Form.Item label="Phương thức thanh toán">
              <Radio.Group
                className="payment-methods"
                value={activeTab?.paymentMethod ?? 'CASH'}
                options={paymentOptions}
                onChange={(event) =>
                  updateActiveTab({ paymentMethod: event.target.value })
                }
              />
            </Form.Item>
          </Form>

          <div className="payment-quick">
            <button type="button" className="quick-money">
              {summary.total.toLocaleString('vi-VN')}
            </button>
          </div>

          <div className="checkout-actions">
            <Button className="print-button" onClick={handlePreviewReceipt}>
              IN
            </Button>
            {isReturnTab ? (
              <Button
                type="primary"
                danger
                className="pay-button"
                icon={<SwapOutlined />}
                loading={checkingOut}
                onClick={() => void handleCheckout()}
              >
                HOÀN TẤT TRẢ HÀNG
              </Button>
            ) : (
              <Button
                type="primary"
                className="pay-button"
                icon={<ShoppingCartOutlined />}
                loading={checkingOut}
                onClick={() => void handleCheckout()}
              >
                THANH TOÁN
              </Button>
            )}
          </div>
        </aside>
      </div>

      <Modal
        title={null}
        className="receipt-modal"
        style={{ top: 16 }}
        open={!!receiptPreview}
        onCancel={() => setReceiptPreview(null)}
        footer={[
          <Button key="close" onClick={() => setReceiptPreview(null)}>
            Đóng
          </Button>,
          <Button key="print" type="primary" onClick={handlePrintReceipt}>
            In hóa đơn
          </Button>,
        ]}
        width={360}
      >
        {receiptPreview && (
          <div className="receipt-preview">
            <div className="receipt-center">
              <div className="receipt-store">{receiptPreview.storeName}</div>
              {receiptPreview.storeAddress && <div>{receiptPreview.storeAddress}</div>}
              {receiptPreview.storePhoneNumber && (
                <div>{receiptPreview.storePhoneNumber}</div>
              )}
            </div>
            <div className="receipt-dash" />
            <div className="receipt-row">
              <span>Hóa đơn</span>
              <strong>{receiptPreview.salesOrderCode}</strong>
            </div>
            <div className="receipt-row">
              <span>Thu ngân</span>
              <span>{receiptPreview.cashierName}</span>
            </div>
            <div className="receipt-row">
              <span>Ngày</span>
              <span>{new Date(receiptPreview.soldAt).toLocaleString('vi-VN')}</span>
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
              <span>Tiền hàng</span>
              <span>{receiptPreview.subtotalAmount.toLocaleString('vi-VN')}</span>
            </div>
            <div className="receipt-row">
              <span>Giảm giá</span>
              <span>{receiptPreview.discountAmount.toLocaleString('vi-VN')}</span>
            </div>
            {'returnFeeAmount' in receiptPreview && (
              <div className="receipt-row">
                <span>Phí trả hàng</span>
                <span>{receiptPreview.returnFeeAmount.toLocaleString('vi-VN')}</span>
              </div>
            )}
            <div className="receipt-row receipt-total">
              <span>{'returnFeeAmount' in receiptPreview ? 'Tổng trả' : 'Thanh toán'}</span>
              <span>{receiptPreview.totalAmount.toLocaleString('vi-VN')}</span>
            </div>
            {'customerRefundAmount' in receiptPreview ? (
              <div className="receipt-row">
                <span>Hoàn tiền</span>
                <span>{receiptPreview.customerRefundAmount.toLocaleString('vi-VN')}</span>
              </div>
            ) : (
              <>
                <div className="receipt-row">
                  <span>Khách đưa</span>
                  <span>{(receiptPreview as SaleReceiptData).customerPaidAmount.toLocaleString('vi-VN')}</span>
                </div>
                <div className="receipt-row">
                  <span>Tiền thối</span>
                  <span>{(receiptPreview as SaleReceiptData).changeAmount.toLocaleString('vi-VN')}</span>
                </div>
              </>
            )}
            <div className="receipt-dash" />
            <div className="receipt-center">{receiptPreview.footerMessage}</div>
          </div>
        )}
      </Modal>
    </div>
  );
}
