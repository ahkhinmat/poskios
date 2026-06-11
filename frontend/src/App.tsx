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
  Table,
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
import { LANG } from './lang';
import type {
  Category,
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
  { label: LANG.cash, value: 'CASH' },
  { label: LANG.bankTransfer, value: 'BANK_TRANSFER' },
  { label: LANG.card, value: 'CARD' },
  { label: LANG.ewallet, value: 'EWALLET' },
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
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryKeyword, setCategoryKeyword] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [categoryFormName, setCategoryFormName] = useState('');
  const [categorySaving, setCategorySaving] = useState(false);
  const saveTimerRef = useRef<number | null>(null);
  const searchInputRef = useRef<InputRef>(null);
  const searchKeywordRef = useRef('');
  const saleListRef = useRef<HTMLDivElement>(null);

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

  function scrollSaleListToTop() {
    window.setTimeout(() => {
      saleListRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
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

    setProductUnitOptionsMap((current) => {
      const nextMap = { ...current, [productId]: items };
      for (const item of items) {
        nextMap[item.productId] = items;
      }
      return nextMap;
    });

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
        productCode: item.productCode,
        productName: item.productName,
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
      message.error(LANG.errLoadTab);
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
    const label = tabType === 'RETURN' ? LANG.tabReturn : LANG.tabSale;
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
      message.error(LANG.errSaveTab);
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
      message.error(tabType === 'RETURN' ? LANG.errCreateReturnTab : LANG.errCreateTab);
    }
  }

  async function handleCloseTab(targetId: number) {
    if (tabs.length === 1) {
      message.warning(LANG.warnNeedTab);
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
      message.error(LANG.errCloseTab);
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
        message.error(LANG.errProductNotFound);
      }
    } catch {
      if (notifyWhenEmpty) {
        message.error(LANG.errProductNotFound);
      }
    }
  }

  async function searchInvoice() {
    const keyword = invoiceSearchValue.trim();
    const hasKeyword = !!keyword;
    const hasFromDate = !!invoiceFromDate;
    const hasToDate = !!invoiceToDate;

    if (!hasKeyword && !hasFromDate && !hasToDate) {
      message.warning(LANG.searchInvoiceHint);
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
        message.error(LANG.errInvoiceNotFound);
      }
    } catch {
      message.error(LANG.errLoadInvoice);
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

      message.success(LANG.loadedInvoice(data.salesOrderCode));
    } catch {
      message.error(LANG.errLoadInvoiceDetail);
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
          const nextItems = [
            {
              ...existingItem,
              quantity: existingItem.quantity + 1,
              lineTotal:
                (existingItem.quantity + 1) * existingItem.unitPrice -
                existingItem.discountAmount,
            },
            ...tab.items.filter(
              (item) => item.productUnitId !== product.productUnitId,
            ),
          ].map((item, index) => ({ ...item, sortOrder: index + 1 }));
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
          sortOrder: 1,
        };

        return {
          ...tab,
          items: [newItem, ...tab.items].map((item, index) => ({
            ...item,
            sortOrder: index + 1,
          })),
        };
      }),
    );

    setHighlightedSearchIndex(-1);
    scrollSaleListToTop();
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

    if (!activeTab) {
      return;
    }

    setTabs((current) =>
      current.map((tab) => {
        if (tab.id !== activeTab.id) {
          return tab;
        }

        const existingTarget = tab.items.find(
          (tabItem) =>
            tabItem.productUnitId === nextUnit.productUnitId &&
            tabItem.productUnitId !== item.productUnitId,
        );

        if (existingTarget) {
          const mergedItems = tab.items
            .filter((tabItem) => tabItem.productUnitId !== item.productUnitId)
            .map((tabItem) => {
              if (tabItem.productUnitId !== nextUnit.productUnitId) {
                return tabItem;
              }

              const quantity = tabItem.quantity + item.quantity;
              const discountAmount = tabItem.discountAmount + item.discountAmount;
              return {
                ...tabItem,
                quantity,
                discountAmount,
                lineTotal: quantity * tabItem.unitPrice - discountAmount,
              };
            })
            .map((tabItem, index) => ({ ...tabItem, sortOrder: index + 1 }));

          return {
            ...tab,
            items: mergedItems,
          };
        }

        return {
          ...tab,
          items: tab.items.map((tabItem) => {
            if (tabItem.productUnitId !== item.productUnitId) {
              return tabItem;
            }

            const nextItem = {
              ...tabItem,
              productId: nextUnit.productId,
              productUnitId: nextUnit.productUnitId,
              productCode: nextUnit.productCode,
              productName: nextUnit.productName,
              unitId: nextUnit.unitId,
              unitName: nextUnit.unitName,
              barcode: nextUnit.barcode,
              conversionValue: nextUnit.conversionValue,
              unitPrice: nextUnit.salePrice,
              stockOnHand: nextUnit.stockOnHand,
            };
            nextItem.lineTotal =
              nextItem.quantity * nextItem.unitPrice - nextItem.discountAmount;
            return nextItem;
          }),
        };
      }),
    );
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
        storeName: LANG.storeNameReceipt,
        storeAddress: LANG.storeAddress,
        storePhoneNumber: LANG.storePhoneNumber,
        salesOrderCode: activeTab.title,
        soldAt: new Date().toISOString(),
        cashierName: LANG.cashier,
        items,
        subtotalAmount: summary.subtotal,
        discountAmount: activeTab.discountAmount,
        returnFeeAmount: returnFee,
        totalAmount: refundAmount,
        customerRefundAmount: refundAmount,
        footerMessage: LANG.receiptFooter,
      };
      return returnReceipt;
    }

    const customerPaidAmount = summary.total;
    const saleReceipt: SaleReceiptData = {
      storeName: LANG.storeNameReceipt,
      storeAddress: LANG.storeAddress,
      storePhoneNumber: LANG.storePhoneNumber,
      salesOrderCode: activeTab.title,
      soldAt: new Date().toISOString(),
      cashierName: LANG.cashier,
      items,
      subtotalAmount: summary.subtotal,
      discountAmount: activeTab.discountAmount,
      totalAmount: summary.total,
      customerPaidAmount,
      changeAmount: Math.max(0, customerPaidAmount - summary.total),
      footerMessage: LANG.receiptFooter,
    };
    return saleReceipt;
  }

  function handlePrintReceipt(receiptSource?: ReceiptPreviewData | null) {
    const receipt = receiptSource ?? receiptPreview;

    if (!receipt) {
      return;
    }

    const printWindow = window.open('', '_blank', 'width=420,height=720');
    if (!printWindow) {
      message.error(LANG.errPrintWindow);
      return;
    }

    const summaryRows = 'returnFeeAmount' in receipt
      ? `
          <div class="summary-row"><span>${LANG.receiptProductTotal}:</span><span>${receipt.subtotalAmount.toLocaleString('vi-VN')}</span></div>
          <div class="summary-row"><span>${LANG.discount}:</span><span>${receipt.discountAmount.toLocaleString('vi-VN')}</span></div>
          <div class="summary-row total"><span>${LANG.totalReturn}:</span><span>${receipt.totalAmount.toLocaleString('vi-VN')}</span></div>
          <div class="summary-row"><span>${LANG.refund}:</span><span>${receipt.customerRefundAmount.toLocaleString('vi-VN')}</span></div>`
      : `
          <div class="summary-row"><span>${LANG.receiptProductTotal}:</span><span>${receipt.subtotalAmount.toLocaleString('vi-VN')}</span></div>
          <div class="summary-row"><span>${LANG.discount}:</span><span>${receipt.discountAmount.toLocaleString('vi-VN')}</span></div>
          <div class="summary-row total"><span>${LANG.totalPayment}:</span><span>${receipt.totalAmount.toLocaleString('vi-VN')}</span></div>`;

    const itemsHtml = receipt.items
      .map(
        (item) => `
          <div class="item">
            <div class="item-name">${item.productName}</div>
            <div class="item-row">
              <div class="item-price">${item.unitPrice.toLocaleString('vi-VN')}</div>
              <div class="item-qty">${item.quantity}</div>
              <div class="item-total">${item.lineTotal.toLocaleString('vi-VN')}</div>
            </div>
          </div>
        `,
      )
      .join('');

    const soldAtText = new Date(receipt.soldAt)
      .toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
      .replace(',', '');

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${receipt.salesOrderCode}</title>
          <style>
            @page { size: 80mm auto; margin: 3mm; }
            * { box-sizing: border-box; }
            html, body { margin: 0; padding: 0; width: 100%; font-family: Arial, sans-serif; color: #111; }
            body { font-size: 10px; line-height: 1.25; }
            .receipt { width: 74mm; margin: 0 auto; padding: 0 1mm; }
            .center { text-align: center; }
            .store { margin: 1mm 0 1.5mm; font-size: 16px; font-weight: 700; }
            .subcenter { text-align: center; }
            .header-title { margin: 2.5mm 0 1mm; font-size: 15px; font-weight: 700; }
            .line { border-top: 1px solid #999; margin: 2mm 0; }
            .table-head { display: grid; grid-template-columns: minmax(0, 1fr) 28px 72px; column-gap: 3mm; font-size: 10px; font-weight: 700; padding-bottom: 1mm; }
            .table-head > :nth-child(2) { text-align: center; }
            .table-head > :last-child { text-align: right; }
            .item { margin-bottom: 1.8mm; padding-bottom: 1.8mm; border-bottom: 1px dashed #999; }
            .item-name { font-size: 10px; font-weight: 400; word-break: break-word; }
            .item-row { display: grid; grid-template-columns: minmax(0, 1fr) 28px 72px; column-gap: 3mm; margin-top: 0.8mm; }
            .item-qty { text-align: center; }
            .item-total { text-align: right; white-space: nowrap; }
            .summary { margin-top: 5mm; }
            .summary-row { display: grid; grid-template-columns: minmax(0, 1fr) 72px; column-gap: 3mm; margin-top: 0.8mm; font-size: 10px; }
            .summary-row > :first-child { text-align: right; font-weight: 700; }
            .summary-row > :last-child { text-align: right; white-space: nowrap; font-weight: 700; }
            .summary-row:not(.total) > :first-child, .summary-row:not(.total) > :last-child { font-weight: 400; }
            .summary-row.total { font-size: 11px; }
            .footer { margin-top: 24mm; text-align: center; }
            .footer-secondary { margin-top: 1mm; text-align: center; font-size: 10px; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="center">
              <div class="store">${LANG.storeNameReceipt}</div>
              <div class="subcenter">${LANG.storeAddress}</div>
              <div class="subcenter">${LANG.storePhoneNumber}</div>
              <div class="header-title">${LANG.receiptTitle}</div>
              <div class="subcenter">${LANG.receiptCode}: ${receipt.salesOrderCode}</div>
              <div class="subcenter">${soldAtText}</div>
            </div>
            <div class="line"></div>
            <div class="table-head">
              <div>${LANG.receiptUnitPrice}</div>
              <div>${LANG.receiptQty}</div>
              <div>${LANG.receiptTotal}</div>
            </div>
            <div class="line"></div>
            ${itemsHtml}
            <div class="summary">
              ${summaryRows}
            </div>
            <div class="footer">${LANG.receiptFooter}</div>
            <div class="footer-secondary">${LANG.receiptPoweredBy}</div>
          </div>
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
      message.warning(LANG.emptyCartCheckout);
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

        message.success(LANG.returnCreated(response.data.data.salesOrderCode));
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

        message.success(LANG.saleCreated(response.data.data.salesOrderCode));
        setReceiptPreview({
          ...response.data.data.receiptData,
          storeName: LANG.storeNameReceipt,
          storeAddress: LANG.storeAddress,
          storePhoneNumber: LANG.storePhoneNumber,
          footerMessage: LANG.receiptFooter,
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
            ? LANG.errReturnFailed
            : LANG.errPaymentFailed;
      message.error(apiMessage);
    } finally {
      setCheckingOut(false);
    }
  }

  // ── Category CRUD ──

  async function loadCategories(keyword?: string) {
    setCategoryLoading(true);
    try {
      const params = keyword?.trim() ? `?keyword=${encodeURIComponent(keyword.trim())}` : '';
      const res = await api.get<ApiEnvelope<Category[]>>(`/pos/categories${params}`);
      setCategories(res.data.data);
    } catch {
      message.error('Không tải được danh mục');
    } finally {
      setCategoryLoading(false);
    }
  }

  function openCategoryModal() {
    setCategoryKeyword('');
    setCategories([]);
    setCategoryModalOpen(true);
    void loadCategories();
  }

  function openCategoryForm(category?: Category) {
    setEditingCategory(category ?? null);
    setCategoryFormName(category?.name ?? '');
    setCategoryFormOpen(true);
  }

  async function handleSaveCategory() {
    const name = categoryFormName.trim();
    if (!name) {
      message.warning('Vui lòng nhập tên danh mục');
      return;
    }
    setCategorySaving(true);
    try {
      if (editingCategory) {
        await api.put<ApiEnvelope<Category>>(`/pos/categories/${editingCategory.id}`, { name });
        message.success('Đã cập nhật danh mục');
      } else {
        await api.post<ApiEnvelope<Category>>('/pos/categories', { name });
        message.success('Đã thêm danh mục');
      }
      setCategoryFormOpen(false);
      setEditingCategory(null);
      void loadCategories(categoryKeyword);
    } catch {
      message.error('Lỗi lưu danh mục');
    } finally {
      setCategorySaving(false);
    }
  }

  async function handleDeleteCategory(category: Category) {
    Modal.confirm({
      title: LANG.confirmDelete,
      content: `"${category.name}"`,
      okText: LANG.deleteCategory,
      okType: 'danger',
      cancelText: LANG.cancel,
      onOk: async () => {
        try {
          await api.delete(`/pos/categories/${category.id}`);
          message.success('Đã xóa danh mục');
          void loadCategories(categoryKeyword);
        } catch (error: unknown) {
          const apiMsg =
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
              : 'Không xóa được danh mục';
          message.error(apiMsg);
        }
      },
    });
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
                placeholder={LANG.placeholderSearch}
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
                {saving ? LANG.saving : LANG.synced}
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
                        {LANG.select}
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={`${product.name} (${product.unitName})`}
                      description={`${product.productCode} ${LANG.productUnitSep} ${LANG.stockLabel} ${product.stockOnHand.toLocaleString('vi-VN')} ${LANG.productUnitSep} ${product.salePrice.toLocaleString('vi-VN')}đ`}
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
                    { label: LANG.searchTypeInvoiceCode, value: 'code' },
                    { label: LANG.searchTypeProductCode, value: 'product' },
                  ]}
                />
                <Input
                  placeholder={invoiceSearchType === 'code' ? LANG.placeholderInvoiceCode : LANG.placeholderProductCode}
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
                  {LANG.searchBtn}
                </Button>
              </div>
              <div className="return-search-row" style={{ marginTop: 6 }}>
                <DatePicker.RangePicker
                  size="small"
                  style={{ flex: 1 }}
                  placeholder={[LANG.placeholderFromDate, LANG.placeholderToDate]}
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
                    {LANG.foundInvoiceNote}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="sale-list" ref={saleListRef}>
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
                <Empty description={LANG.emptyCart} />
              </div>
            )}
          </div>

          <div className="sale-footer">
            <Input
              placeholder={LANG.orderNote}
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
                {LANG.modeSale}
              </button>
              <button
                type="button"
                className={`sale-mode ${isReturnTab ? 'is-active' : ''}`}
                onClick={() => {
                  if (!isReturnTab) { void handleCreateTab('RETURN'); }
                }}
              >
                {LANG.modeReturn}
              </button>
              <button
                type="button"
                className="sale-mode"
                onClick={() => message.info(LANG.errFeatureDev)}
              >
                {LANG.modeImport}
              </button>
              <button
                type="button"
                className="sale-mode"
                onClick={openCategoryModal}
              >
                {LANG.modeCategory}
              </button>
              <button
                type="button"
                className="sale-mode"
                onClick={() => message.info(LANG.errFeatureDev)}
              >
                {LANG.modeOverview}
              </button>
            </div>
          </div>
        </section>

        <aside className="checkout-panel">
          <div className="checkout-header">
            <div className="checkout-user">{LANG.cashier}</div>
            <div className="checkout-time">{LANG.storeNameSale}</div>
          </div>

          <Form layout="vertical" className="checkout-form">
            <Form.Item label={LANG.customer}>
              <Input
                value={activeTab?.customerName ?? ''}
                onChange={(event) =>
                  updateActiveTab({ customerName: event.target.value || null })
                }
                placeholder={LANG.placeholderCustomer}
              />
            </Form.Item>

            <div className="summary-rows">
              {isReturnTab ? (
                <>
                  <div className="summary-row">
                    <Text>{LANG.subtotalReturn}</Text>
                    <Text>{summary.subtotal.toLocaleString('vi-VN')}</Text>
                  </div>
                  <div className="summary-row">
                    <Text>{LANG.discount}</Text>
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
                    <Text>{LANG.returnFee}</Text>
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
                    <Text>{LANG.refund}</Text>
                    <Text>
                      {Math.max(0, summary.subtotal - (activeTab?.discountAmount ?? 0) - (activeTab?.customerPaidAmount ?? 0)).toLocaleString('vi-VN')}
                    </Text>
                  </div>
                </>
              ) : (
                <>
                  <div className="summary-row">
                    <Text>{LANG.subtotalSale}</Text>
                    <Text>{summary.subtotal.toLocaleString('vi-VN')}</Text>
                  </div>
                  <div className="summary-row">
                    <Text>{LANG.discount}</Text>
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
                    <Text>{LANG.customerPay}</Text>
                    <Text>{summary.total.toLocaleString('vi-VN')}</Text>
                  </div>
                  <div className="summary-row">
                    <Text>{LANG.customerPaid}</Text>
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

            <Form.Item label={LANG.paymentMethod}>
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
            <Button
              className="print-button"
              onClick={() => handlePrintReceipt(buildDraftReceipt())}
            >
              {LANG.print}
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
                {LANG.completeReturn}
              </Button>
            ) : (
              <Button
                type="primary"
                className="pay-button"
                icon={<ShoppingCartOutlined />}
                loading={checkingOut}
                onClick={() => void handleCheckout()}
              >
                {LANG.completePayment}
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
            {LANG.close}
          </Button>,
          <Button key="print" type="primary" onClick={() => handlePrintReceipt()}>
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
              {receiptPreview.storePhoneNumber && (
                <div>{receiptPreview.storePhoneNumber}</div>
              )}
            </div>
            <div className="receipt-dash" />
            <div className="receipt-row">
              <span>{LANG.receiptInvoice}</span>
              <strong>{receiptPreview.salesOrderCode}</strong>
            </div>
            <div className="receipt-row">
              <span>{LANG.cashier}</span>
              <span>{receiptPreview.cashierName}</span>
            </div>
            <div className="receipt-row">
              <span>{LANG.receiptDate}</span>
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
              <span>{'returnFeeAmount' in receiptPreview ? LANG.totalReturn : LANG.totalPayment}</span>
              <span>{receiptPreview.totalAmount.toLocaleString('vi-VN')}</span>
            </div>
            {'customerRefundAmount' in receiptPreview ? (
              <div className="receipt-row">
                <span>{LANG.refund}</span>
                <span>{receiptPreview.customerRefundAmount.toLocaleString('vi-VN')}</span>
              </div>
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

      {/* ── Category Manager Modal ── */}
      <Modal
        title={LANG.categoryTitle}
        open={categoryModalOpen}
        onCancel={() => setCategoryModalOpen(false)}
        footer={null}
        width={640}
      >
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <Input.Search
            placeholder={LANG.searchCategories}
            allowClear
            value={categoryKeyword}
            onChange={(e) => setCategoryKeyword(e.target.value)}
            onSearch={(value) => {
              setCategoryKeyword(value);
              void loadCategories(value);
            }}
            style={{ flex: 1 }}
          />
          <Button type="primary" onClick={() => openCategoryForm()}>
            {LANG.addCategory}
          </Button>
        </div>

        <Table
          dataSource={categories}
          rowKey="id"
          loading={categoryLoading}
          locale={{ emptyText: LANG.noCategoriesFound }}
          pagination={false}
          columns={[
            {
              title: LANG.categoryName,
              dataIndex: 'name',
              key: 'name',
            },
            {
              title: 'Trạng thái',
              dataIndex: 'isActive',
              key: 'isActive',
              width: 100,
              render: (isActive: boolean) =>
                isActive ? (
                  <Tag color="green">Hoạt động</Tag>
                ) : (
                  <Tag color="red">Ngưng</Tag>
                ),
            },
            {
              title: LANG.categoryActions,
              key: 'actions',
              width: 160,
              render: (_: unknown, record: Category) => (
                <span style={{ display: 'flex', gap: 8 }}>
                  <Button
                    size="small"
                    onClick={() => openCategoryForm(record)}
                  >
                    {LANG.editCategory}
                  </Button>
                  <Button
                    size="small"
                    danger
                    onClick={() => void handleDeleteCategory(record)}
                  >
                    {LANG.deleteCategory}
                  </Button>
                </span>
              ),
            },
          ]}
        />

        <Modal
          title={editingCategory ? LANG.editCategory : LANG.addCategory}
          open={categoryFormOpen}
          onCancel={() => {
            setCategoryFormOpen(false);
            setEditingCategory(null);
          }}
          onOk={() => void handleSaveCategory()}
          confirmLoading={categorySaving}
          okText={LANG.saveCategory}
          cancelText={LANG.cancel}
          destroyOnClose
        >
          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>{LANG.categoryName}</div>
            <Input
              value={categoryFormName}
              onChange={(e) => setCategoryFormName(e.target.value)}
              placeholder="Nhập tên danh mục"
              onPressEnter={() => void handleSaveCategory()}
              autoFocus
            />
          </div>
        </Modal>
      </Modal>
    </div>
  );
}

