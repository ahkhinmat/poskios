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
  Tooltip,
  Typography,
  theme,
} from 'antd';
import type { InputRef } from 'antd';
import {
  AppstoreOutlined,
  DeleteOutlined,
  EyeOutlined,
  MinusOutlined,
  MoreOutlined,
  PlusOutlined,
  PrinterOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  SwapOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api';
import { LANG } from './lang';
import { CategoryManager } from './components/CategoryManager';
import { ReceiptModal } from './components/ReceiptModal';
import { extractApiErrorMessage } from './utils/error';
import { formatPurchaseDate } from './utils/format';
import { createDefaultPurchaseMeta, getNextTabNumber } from './utils/purchase';
import type {
  ApiEnvelope,
  Category,
  CheckoutResponse,
  DraftTabsResponse,
  InvoiceItemData,
  InvoiceItemsResponse,
  InvoiceSearchItem,
  InvoiceSearchResponse,
  PosDraftItem,
  PosDraftTab,
  PosProduct,
  PosProductUnitOption,
  ProductUnitOptionsResponse,
  PurchaseCheckoutResponse,
  PurchaseMeta,
  PurchaseReceiptData,
  OverviewDetail,
  OverviewRecord,
  ReceiptPreviewData,
  ReturnCheckoutResponse,
  ReturnReceiptData,
  SaleReceiptData,
  SearchResponse,
  Supplier,
} from './types';

const { Text } = Typography;

const paymentOptions = [
  { label: LANG.cash, value: 'CASH' },
  { label: LANG.bankTransfer, value: 'BANK_TRANSFER' },
  { label: LANG.card, value: 'CARD' },
  { label: LANG.ewallet, value: 'EWALLET' },
];





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
  const [lastScannedProductName, setLastScannedProductName] = useState('');
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
  const [purchaseMetaMap, setPurchaseMetaMap] = useState<Record<number, PurchaseMeta>>({});
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [currentView, setCurrentView] = useState<'POS' | 'OVERVIEW'>('POS');
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewRecords, setOverviewRecords] = useState<OverviewRecord[]>([]);
  const [overviewDetail, setOverviewDetail] = useState<OverviewDetail | null>(null);
  const [overviewFromDate, setOverviewFromDate] = useState(new Date().toISOString().slice(0, 10));
  const [overviewToDate, setOverviewToDate] = useState(new Date().toISOString().slice(0, 10));
  const [overviewRecordTypeFilter, setOverviewRecordTypeFilter] = useState<'ALL' | 'SALE' | 'RETURN' | 'PURCHASE'>('SALE');
  const showProfit = overviewRecordTypeFilter === 'ALL' || overviewRecordTypeFilter === 'SALE';
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const overviewPassword = import.meta.env.VITE_OVERVIEW_PASSWORD ?? '11111';
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
  const isPurchaseTab = activeTab?.tabType === 'PURCHASE';
  const filteredOverviewRecords = useMemo(
    () =>
      overviewRecordTypeFilter === 'ALL'
        ? overviewRecords
        : overviewRecords.filter((record) => record.recordType === overviewRecordTypeFilter),
    [overviewRecords, overviewRecordTypeFilter],
  );
  const overviewTotalAmount = useMemo(
    () => filteredOverviewRecords.reduce((sum, record) => sum + record.subtotalAmount, 0),
    [filteredOverviewRecords],
  );
  const overviewTotalDiscount = useMemo(
    () => filteredOverviewRecords.reduce((sum, record) => sum + record.discountAmount, 0),
    [filteredOverviewRecords],
  );
  const overviewTotalCost = useMemo(
    () => filteredOverviewRecords.reduce((sum, record) => sum + record.costAmount, 0),
    [filteredOverviewRecords],
  );
  const overviewTotalRevenue = useMemo(
    () => filteredOverviewRecords.reduce((sum, record) => sum + record.revenueAmount, 0),
    [filteredOverviewRecords],
  );
  const overviewGrossProfit = useMemo(
    () => overviewTotalAmount - overviewTotalDiscount - overviewTotalCost,
    [overviewTotalAmount, overviewTotalDiscount, overviewTotalCost],
  );

  useEffect(() => {
    void bootstrapDraftTabs();
    void loadSuppliers();
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
      void searchProducts(keyword, false, true);
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
    if (!activeTab || isReturnTab || isPurchaseTab || activeTab.customerPaidAmount === summary.total) {
      return;
    }

    updateActiveTab({ customerPaidAmount: summary.total });
  }, [summary.total, activeTabId, activeTab?.customerPaidAmount, isReturnTab, isPurchaseTab]);

  useEffect(() => {
    setPurchaseMetaMap((current) => {
      const next = { ...current };
      let changed = false;

      for (const tab of tabs) {
        if (tab.tabType !== 'PURCHASE' || next[tab.id]) {
          continue;
        }

        next[tab.id] = createDefaultPurchaseMeta(tab, tabs);
        changed = true;
      }

      for (const tabId of Object.keys(next).map(Number)) {
        if (!tabs.some((tab) => tab.id === tabId && tab.tabType === 'PURCHASE')) {
          delete next[tabId];
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [tabs]);

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

  function clearSearchInput() {
    setSearchValue('');
    setSearchResults([]);
    setHighlightedSearchIndex(-1);
    searchKeywordRef.current = '';

    const input = searchInputRef.current?.input;
    if (input) {
      input.value = '';
      input.setSelectionRange(0, 0);
    }
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

  async function loadSuppliers(keyword?: string) {
    setSuppliersLoading(true);
    try {
      const response = await api.get<ApiEnvelope<Supplier[]>>('/pos/suppliers', {
        params: keyword?.trim() ? { keyword: keyword.trim() } : undefined,
      });
      setSuppliers(response.data.data);
    } catch {
      message.error(LANG.errLoadSuppliers);
    } finally {
      setSuppliersLoading(false);
    }
  }

  function updatePurchaseMeta(tabId: number, patch: Partial<PurchaseMeta>) {
    setPurchaseMetaMap((current) => ({
      ...current,
      [tabId]: {
        ...(current[tabId] ?? createDefaultPurchaseMeta(
          tabs.find((tab) => tab.id === tabId) ?? {
            id: tabId,
            tabCode: `TAB${tabId}`,
            tabType: 'PURCHASE',
            title: `${LANG.tabPurchase} ${tabId}`,
            saleMode: 'PURCHASE',
            customerName: null,
            customerPhone: null,
            note: null,
            paymentMethod: 'CASH',
            customerPaidAmount: 0,
            discountAmount: 0,
            sourceSalesOrderId: null,
            isActive: true,
            lastTouchedAt: new Date().toISOString(),
            items: [],
          },
          tabs,
        )),
        ...patch,
      },
    }));
  }

  async function createDraftTab(
    title?: string,
    tabType: 'SALE' | 'RETURN' | 'PURCHASE' = 'SALE',
  ) {
    const label =
      tabType === 'RETURN'
        ? LANG.tabReturn
        : tabType === 'PURCHASE'
          ? LANG.tabPurchase
          : LANG.tabSale;
    const response = await api.post<ApiEnvelope<PosDraftTab>>('/pos/draft-tabs', {
      tabType,
      title: title ?? `${label} ${getNextTabNumber(tabs, label)}`,
      saleMode: tabType === 'PURCHASE' ? 'PURCHASE' : 'QUICK_SALE',
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

  async function handleCreateTab(tabType: 'SALE' | 'RETURN' | 'PURCHASE' = 'SALE') {
    try {
      const created = await createDraftTab(undefined, tabType);
      setTabs((current) => [...current, created]);
      setActiveTabId(created.id);
      setCurrentView('POS');
      if (tabType === 'PURCHASE') {
        setPurchaseMetaMap((current) => ({
          ...current,
          [created.id]: createDefaultPurchaseMeta(created, tabs),
        }));
      }
    } catch {
      message.error(
        tabType === 'RETURN'
          ? LANG.errCreateReturnTab
          : tabType === 'PURCHASE'
            ? LANG.errCreatePurchaseTab
            : LANG.errCreateTab,
      );
    }
  }

  async function ensureSaleTab() {
    setCurrentView('POS');

    if (activeTab?.tabType === 'SALE') {
      return;
    }

    const existingSaleTab = tabs.find((tab) => tab.tabType === 'SALE');
    if (existingSaleTab) {
      setActiveTabId(existingSaleTab.id);
      return;
    }

    await handleCreateTab('SALE');
  }

  async function loadOverview(selectRecord = true) {
    setOverviewLoading(true);
    try {
      const response = await api.get<ApiEnvelope<{ items: OverviewRecord[] }>>('/pos/overview', {
        params: {
          fromDate: overviewFromDate,
          toDate: overviewToDate,
        },
      });
      const items = response.data.data.items;
      setOverviewRecords(items);
      if (selectRecord && items.length) {
        await loadOverviewDetail(items[0].recordType, items[0].id);
      } else if (!items.length) {
        setOverviewDetail(null);
      }
    } catch {
      message.error(LANG.errLoadOverview);
    } finally {
      setOverviewLoading(false);
    }
  }

  async function loadOverviewDetail(recordType: OverviewRecord['recordType'], id: number) {
    try {
      const response = await api.get<ApiEnvelope<OverviewDetail>>(`/pos/overview/${recordType}/${id}`);
      setOverviewDetail(response.data.data);
    } catch {
      message.error(LANG.errLoadOverview);
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
    const code = (searchInputRef.current?.input?.value ?? searchValue).trim();

    if (!code || !activeTab) {
      return;
    }

    clearSearchInput();
    setSearching(true);

    try {
      const response = await api.get<ApiEnvelope<PosProduct>>('/pos/products/resolve', {
        params: { code },
      });
      const resolvedProduct = response.data.data;
      addProductToActiveTab(resolvedProduct);
      setLastScannedProductName(resolvedProduct.name);
      focusSearchInput();
      return;
    } catch {
      // resolve failed; continue with search fallback
    } finally {
      setSearching(false);
    }

    if (
      highlightedSearchIndex >= 0 &&
      highlightedSearchIndex < searchResults.length &&
      code === searchKeywordRef.current
    ) {
      const selectedProduct = searchResults[highlightedSearchIndex];
      addProductToActiveTab(selectedProduct);
      setLastScannedProductName(selectedProduct.name);
      focusSearchInput();
      return;
    }

    await searchProducts(code, true);
  }

  async function searchProducts(
    keyword: string,
    notifyWhenEmpty = false,
    autoAddExactMatch = false,
  ) {
    try {
      const response = await api.get<ApiEnvelope<SearchResponse>>('/pos/products/search', {
        params: { keyword, limit: 8 },
      });
      const items = response.data.data.items;

      if (autoAddExactMatch && activeTab) {
        const exactMatch = items.find(
          (item) => item.barcode === keyword || item.productCode === keyword,
        );

        if (exactMatch) {
          addProductToActiveTab(exactMatch);
          setLastScannedProductName(exactMatch.name);
          clearSearchInput();
          focusSearchInput();
          return;
        }
      }

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

    setTabs((current) => {
      const nextTabs = current.map((tab) => {
        if (tab.id !== activeTab.id) {
          return tab;
        }

        const existingItemIndex = tab.items.findIndex((item) => {
          if (item.productUnitId === product.productUnitId) {
            return true;
          }

          if (item.barcode && product.barcode && item.barcode === product.barcode) {
            return true;
          }

          if (item.productCode && item.productCode === product.productCode) {
            return true;
          }

          return false;
        });

        if (existingItemIndex >= 0) {
          const existingItem = tab.items[existingItemIndex];
          const nextQuantity = existingItem.quantity + 1;
          const updatedItem = {
            ...existingItem,
            quantity: nextQuantity,
            lineTotal: nextQuantity * existingItem.unitPrice - existingItem.discountAmount,
          };
          const remainingItems = tab.items.filter((_, index) => index !== existingItemIndex);

          return {
            ...tab,
            items: [updatedItem, ...remainingItems].map((item, index) => ({
              ...item,
              sortOrder: index + 1,
            })),
          };
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
      });

      const updatedActiveTab = nextTabs.find((tab) => tab.id === activeTab.id);
      if (updatedActiveTab) {
        void persistDraftTab(updatedActiveTab);
      }

      return nextTabs;
    });

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
      unitName: item.unitName,
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

    if (isPurchaseTab) {
      const purchasePaidAmount = purchaseMetaMap[activeTab.id]?.supplierPaidAmount ?? 0;
      const purchaseReceipt: PurchaseReceiptData = {
        storeName: LANG.storeNameReceipt,
        storeAddress: LANG.storeAddress,
        storePhoneNumber: LANG.storePhoneNumber,
        purchaseOrderCode:
          purchaseMetaMap[activeTab.id]?.purchaseOrderCode ?? activeTab.title,
        orderedAt: purchaseMetaMap[activeTab.id]?.importDate
          ? new Date(purchaseMetaMap[activeTab.id]!.importDate).toISOString()
          : new Date().toISOString(),
        supplierName:
          suppliers.find((supplier) => supplier.id === (purchaseMetaMap[activeTab.id]?.supplierId ?? null))?.name ?? null,
        items,
        subtotalAmount: summary.subtotal,
        discountAmount: activeTab.discountAmount,
        totalAmount: summary.total,
        supplierPaidAmount: purchasePaidAmount,
        debtAmount: Math.max(0, summary.total - purchasePaidAmount),
        footerMessage: LANG.receiptFooter,
      };
      return purchaseReceipt;
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
      : 'supplierPaidAmount' in receipt
        ? `
          <div class="summary-row"><span>${LANG.receiptProductTotal}:</span><span>${receipt.subtotalAmount.toLocaleString('vi-VN')}</span></div>
          <div class="summary-row"><span>${LANG.discount}:</span><span>${receipt.discountAmount.toLocaleString('vi-VN')}</span></div>
          <div class="summary-row total"><span>${LANG.purchasePayable}:</span><span>${receipt.totalAmount.toLocaleString('vi-VN')}</span></div>
          <div class="summary-row"><span>${LANG.receiptPaidSupplier}:</span><span>${receipt.supplierPaidAmount.toLocaleString('vi-VN')}</span></div>
          <div class="summary-row"><span>${LANG.receiptDebtSupplier}:</span><span>${receipt.debtAmount.toLocaleString('vi-VN')}</span></div>`
      : `
          <div class="summary-row"><span>${LANG.receiptProductTotal}:</span><span>${receipt.subtotalAmount.toLocaleString('vi-VN')}</span></div>
          <div class="summary-row"><span>${LANG.discount}:</span><span>${receipt.discountAmount.toLocaleString('vi-VN')}</span></div>
          <div class="summary-row total"><span>${LANG.totalPayment}:</span><span>${receipt.totalAmount.toLocaleString('vi-VN')}</span></div>`;

    const receiptTitle =
      'returnFeeAmount' in receipt
        ? LANG.receiptReturnTitle
        : 'supplierPaidAmount' in receipt
          ? LANG.receiptPurchaseTitle
          : LANG.receiptTitle;

    const itemsHtml = receipt.items
      .map(
        (item) => `
          <div class="item">
            <div class="item-name">${item.productName} - (${item.unitName})</div>
            <div class="item-row">
              <div class="item-price">${item.unitPrice.toLocaleString('vi-VN')}</div>
              <div class="item-qty">${item.quantity}</div>
              <div class="item-total">${item.lineTotal.toLocaleString('vi-VN')}</div>
            </div>
          </div>
        `,
      )
      .join('');

    const receiptCodeLabel =
      'supplierPaidAmount' in receipt ? LANG.receiptPurchaseCode : LANG.receiptCode;
    const receiptCodeValue =
      'supplierPaidAmount' in receipt ? receipt.purchaseOrderCode : receipt.salesOrderCode;
    const receiptDateValue =
      'supplierPaidAmount' in receipt ? receipt.orderedAt : receipt.soldAt;
    const receiptDateText = new Date(receiptDateValue)
      .toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
      .replace(',', '');
    const supplierLine =
      'supplierPaidAmount' in receipt && receipt.supplierName
        ? `<div class="subcenter">${LANG.receiptSupplier}: ${receipt.supplierName}</div>`
        : '';

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${receiptCodeValue}</title>
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
              <div class="header-title">${receiptTitle}</div>
              <div class="subcenter">${receiptCodeLabel}: ${receiptCodeValue}</div>
              <div class="subcenter">${receiptDateText}</div>
              ${supplierLine}
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
      if (isPurchaseTab) {
        const purchaseMeta = purchaseMetaMap[activeTab.id] ?? createDefaultPurchaseMeta(activeTab, tabs);
        const response = await api.post<ApiEnvelope<PurchaseCheckoutResponse>>('/pos/purchase-orders/checkout', {
          purchaseOrderCode: purchaseMeta.purchaseOrderCode,
          supplierId: purchaseMeta.supplierId,
          supplierOrderCode: purchaseMeta.supplierOrderCode,
          supplierInvoiceCode: purchaseMeta.supplierInvoiceCode,
          status: 'COMPLETED',
          importDate: purchaseMeta.importDate,
          note: activeTab.note,
          discountAmount: activeTab.discountAmount,
          supplierPaidAmount: purchaseMeta.supplierPaidAmount,
          items: activeTab.items.map((item) => ({
            productId: item.productId,
            productUnitId: item.productUnitId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountAmount: item.discountAmount,
            note: item.note ?? null,
          })),
        });

        message.success(LANG.purchaseCompleted);
        setReceiptPreview({
          ...response.data.data.receiptData,
          storeName: LANG.storeNameReceipt,
          storeAddress: LANG.storeAddress,
          storePhoneNumber: LANG.storePhoneNumber,
          footerMessage: LANG.receiptFooter,
        });
      } else if (isReturnTab) {
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
      const fallback = isReturnTab ? LANG.errReturnFailed : LANG.errPaymentFailed;
      message.error(extractApiErrorMessage(error, fallback));
    } finally {
      setCheckingOut(false);
    }
  }

  function openCategoryModal() {
    setCategoryModalOpen(true);
  }

  function handleOpenOverview() {
    setPasswordInput('');
    setPasswordDialogOpen(true);
  }

  function handlePasswordSubmit() {
    if (passwordInput === overviewPassword) {
      setPasswordDialogOpen(false);
      setPasswordInput('');
      setCurrentView('OVERVIEW');
      void loadOverview();
    } else {
      message.error(LANG.errPasswordIncorrect);
      setPasswordInput('');
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
                <Tooltip key={tab.id} title={`${LANG.openTab}: ${tab.title}`}>
                  <button
                    type="button"
                    className={`draft-chip ${tab.id === activeTabId ? 'is-active' : ''}`}
                    onClick={() => setActiveTabId(tab.id)}
                  >
                    <span>{tab.title}</span>
                    {tabs.length > 1 && (
                      <Tooltip title={`${LANG.closeTab}: ${tab.title}`}>
                        <span
                          className="draft-chip-close"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleCloseTab(tab.id);
                          }}
                        >
                          {LANG.closeTabSymbol}
                        </span>
                      </Tooltip>
                    )}
                  </button>
                </Tooltip>
              ))}
              <Tooltip title={LANG.addTab}>
                <button
                  type="button"
                  className="draft-chip draft-chip-add"
                  onClick={() => void handleCreateTab()}
                >
                  <PlusOutlined />
                </button>
              </Tooltip>
            </div>

            <div className="topbar-actions">
              {lastScannedProductName ? (
                <Tag color="green">{LANG.scannedLabel} {lastScannedProductName}</Tag>
              ) : null}
              <Tag color={saving ? 'processing' : 'success'}>
                {saving ? LANG.saving : LANG.synced}
              </Tag>
            </div>
          </div>

          {currentView === 'OVERVIEW' ? (
            <>
              <div className="overview-toolbar">
                <div className="overview-toolbar-title">{LANG.overviewTitle}</div>
                <div className="overview-toolbar-filters">
                  <span>{LANG.overviewFromDate}</span>
                  <DatePicker
                    value={dayjs(overviewFromDate)}
                    format="DD/MM/YYYY"
                    onChange={(date) =>
                      setOverviewFromDate(
                        date ? date.format('YYYY-MM-DD') : new Date().toISOString().slice(0, 10),
                      )
                    }
                  />
                  <span>{LANG.overviewToDate}</span>
                  <DatePicker
                    value={dayjs(overviewToDate)}
                    format="DD/MM/YYYY"
                    onChange={(date) =>
                      setOverviewToDate(
                        date ? date.format('YYYY-MM-DD') : new Date().toISOString().slice(0, 10),
                      )
                    }
                  />
                  <Button type="primary" onClick={() => void loadOverview()}>
                    {LANG.overviewRefresh}
                  </Button>
                </div>
              </div>

              <div className="sale-list" ref={saleListRef}>
                <div className="purchase-table-head purchase-table-head-overview">
                  <div>{LANG.purchaseTableNo}</div>
                  <div>{LANG.purchaseTableName}</div>
                  <div>{LANG.purchaseTableUnit}</div>
                  <div>{LANG.purchaseTableQty.replace(' nhập', '')}</div>
                  <div>{LANG.purchaseTablePrice}</div>
                  <div>{LANG.purchaseTableTotal}</div>
                </div>
                {overviewDetail?.items.length ? (
                  overviewDetail.items.map((item) => (
                    <div key={`${overviewDetail.header.recordType}-${overviewDetail.header.id}-${item.rowNo}`} className={`purchase-row purchase-row-overview purchase-row-${overviewDetail.header.recordType.toLowerCase()}`}>
                      <div>{item.rowNo}</div>
                      <div className="purchase-name">{item.productName}</div>
                      <div>{item.unitName ?? ''}</div>
                      <div>{item.quantity.toLocaleString('vi-VN')}</div>
                      <div>{item.unitPrice.toLocaleString('vi-VN')}</div>
                      <div className="purchase-total">{item.lineTotal.toLocaleString('vi-VN')}</div>
                    </div>
                  ))
                ) : (
                  <div className="empty-stage empty-stage-purchase">
                    <Empty description={overviewLoading ? LANG.saving : LANG.overviewEmptyDetail} />
                  </div>
                )}
              </div>

              <div className="sale-footer">
                <div className="sale-modes">
                  <Tooltip title={LANG.modeSaleTip}>
                    <button type="button" className="sale-mode" onClick={() => { void ensureSaleTab(); }}>
                      {LANG.modeSale}
                    </button>
                  </Tooltip>
                  <Tooltip title={LANG.modeReturnTip}>
                    <button type="button" className="sale-mode" onClick={() => { setCurrentView('POS'); void handleCreateTab('RETURN'); }}>
                      {LANG.modeReturn}
                    </button>
                  </Tooltip>
                  <Tooltip title={LANG.modeImportTip}>
                    <button type="button" className="sale-mode" onClick={() => { setCurrentView('POS'); void handleCreateTab('PURCHASE'); }}>
                      {LANG.modeImport}
                    </button>
                  </Tooltip>
                  <Tooltip title={LANG.modeCategoryTip}>
                    <button type="button" className="sale-mode" onClick={openCategoryModal}>
                      {LANG.modeCategory}
                    </button>
                  </Tooltip>
                  <Tooltip title={LANG.modeOverviewTip}>
                    <button type="button" className="sale-mode is-active">
                      {LANG.modeOverview}
                    </button>
                  </Tooltip>
                </div>
              </div>
            </>
          ) : (
            <>

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
                          clearSearchInput();
                          focusSearchInput();
                        }}
                      >
                        {LANG.select}
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={`${product.name} (${product.unitName})`}
                      description={`${product.productCode} ${LANG.productUnitSep} ${LANG.stockLabel} ${product.stockOnHand.toLocaleString('vi-VN')} ${LANG.productUnitSep} ${product.salePrice.toLocaleString('vi-VN')}${LANG.currencySuffix}`}
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
                  className="return-search-type"
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
              <div className="return-search-row return-search-row-spaced">
                <DatePicker.RangePicker
                  size="small"
                  className="return-date-range"
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
                          {inv.totalAmount.toLocaleString('vi-VN')}{LANG.currencySuffix}
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

          {isPurchaseTab && (
            <div className="purchase-toolbar">
              <div className="purchase-toolbar-title">{LANG.purchaseHeader}</div>
              <div className="purchase-toolbar-actions">
                <Tooltip title={LANG.purchaseToolbarLayout}>
                  <button
                    type="button"
                    className="purchase-toolbar-button"
                    aria-label={LANG.purchaseToolbarLayout}
                    onClick={() => message.info(LANG.errFeatureDev)}
                  >
                    <AppstoreOutlined />
                  </button>
                </Tooltip>
                <Tooltip title={LANG.purchaseToolbarAdd}>
                  <button
                    type="button"
                    className="purchase-toolbar-button"
                    aria-label={LANG.purchaseToolbarAdd}
                    onClick={() => focusSearchInput()}
                  >
                    <PlusOutlined />
                  </button>
                </Tooltip>
                <Tooltip title={LANG.purchaseToolbarPrint}>
                  <button
                    type="button"
                    className="purchase-toolbar-button"
                    aria-label={LANG.purchaseToolbarPrint}
                    onClick={() => activeTab && void persistDraftTab(activeTab)}
                  >
                    <PrinterOutlined />
                  </button>
                </Tooltip>
                <Tooltip title={LANG.purchaseToolbarPreview}>
                  <button
                    type="button"
                    className="purchase-toolbar-button"
                    aria-label={LANG.purchaseToolbarPreview}
                    onClick={() => message.info(LANG.errFeatureDev)}
                  >
                    <EyeOutlined />
                  </button>
                </Tooltip>
                <Tooltip title={LANG.purchaseToolbarAlert}>
                  <button
                    type="button"
                    className="purchase-toolbar-button"
                    aria-label={LANG.purchaseToolbarAlert}
                    onClick={() => message.info(LANG.errFeatureDev)}
                  >
                    <WarningOutlined />
                  </button>
                </Tooltip>
              </div>
            </div>
          )}

          <div className="sale-list" ref={saleListRef}>
            {isPurchaseTab ? (
              <>
                <div className="purchase-table-head">
                  <div>{LANG.purchaseTableNo}</div>
                  <div>{LANG.purchaseTableImportDate}</div>
                  <div>{LANG.purchaseTableCode}</div>
                  <div>{LANG.purchaseTableName}</div>
                  <div>{LANG.purchaseTableUnit}</div>
                  <div>{LANG.purchaseTableStock}</div>
                  <div>{LANG.purchaseTableQty}</div>
                  <div>{LANG.purchaseTablePrice}</div>
                  <div>{LANG.purchaseTableDiscount}</div>
                  <div>{LANG.purchaseTableTotal}</div>
                </div>
                {activeTab?.items.length ? (
                  activeTab.items.map((item, index) => (
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
                      <div>
                        {formatPurchaseDate(
                          purchaseMetaMap[activeTab.id]?.importDate ?? activeTab.lastTouchedAt,
                        )}
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
            ) : activeTab?.items.length ? (
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
              <Tooltip title={LANG.modeSaleTip}>
                <button
                  type="button"
                  className={`sale-mode ${!isReturnTab && !isPurchaseTab ? 'is-active' : ''}`}
                  onClick={() => {
                    void ensureSaleTab();
                  }}
                >
                  {LANG.modeSale}
                </button>
              </Tooltip>
              <Tooltip title={LANG.modeReturnTip}>
                <button
                  type="button"
                  className={`sale-mode ${isReturnTab ? 'is-active' : ''}`}
                  onClick={() => {
                    if (!isReturnTab) { void handleCreateTab('RETURN'); }
                  }}
                >
                  {LANG.modeReturn}
                </button>
              </Tooltip>
              <Tooltip title={LANG.modeImportTip}>
                <button
                  type="button"
                  className={`sale-mode ${isPurchaseTab ? 'is-active' : ''}`}
                  onClick={() => {
                    if (!isPurchaseTab) {
                      void handleCreateTab('PURCHASE');
                    }
                  }}
                >
                  {LANG.modeImport}
                </button>
              </Tooltip>
              <Tooltip title={LANG.modeCategoryTip}>
                <button
                  type="button"
                  className="sale-mode"
                  onClick={openCategoryModal}
                >
                  {LANG.modeCategory}
                </button>
              </Tooltip>
              <Tooltip title={LANG.modeOverviewTip}>
                <button
                  type="button"
                  className="sale-mode"
                  onClick={handleOpenOverview}
                >
                  {LANG.modeOverview}
                </button>
              </Tooltip>
            </div>
          </div>
            </>
          )}
        </section>

        <aside className={`checkout-panel ${isPurchaseTab ? 'checkout-panel-purchase' : ''} ${currentView === 'OVERVIEW' ? 'checkout-panel-overview' : ''}`}>
          {currentView === 'OVERVIEW' ? (
            <>
              <div className="checkout-header">
                <div className="checkout-user">{LANG.overviewTitle}</div>
                <div className="checkout-time">{filteredOverviewRecords.length}</div>
              </div>
              <div className="overview-grid-top">
                <div className="overview-grid-count">{LANG.overviewTotalRecords}: <strong>{filteredOverviewRecords.length}</strong></div>
                <Select
                  size="small"
                  value={overviewRecordTypeFilter}
                  options={[
                    { label: LANG.overviewFilterAll, value: 'ALL' },
                    { label: LANG.overviewTypeSale, value: 'SALE' },
                    { label: LANG.overviewTypeReturn, value: 'RETURN' },
                    { label: LANG.overviewTypePurchase, value: 'PURCHASE' },
                  ]}
                  onChange={(value) =>
                    setOverviewRecordTypeFilter(value as 'ALL' | 'SALE' | 'RETURN' | 'PURCHASE')
                  }
                />
              </div>
              <div className={`overview-grid-head${showProfit ? '' : ' overview-grid-hide-profit'}`}>
                <div className="overview-grid-cell">{LANG.overviewHeaderCode}</div>
                <div className="overview-grid-cell">{LANG.overviewHeaderTotal}</div>
                <div className="overview-grid-cell">{LANG.overviewHeaderDiscount}</div>
                <div className="overview-grid-cell">{LANG.overviewHeaderCost}</div>
                <div className="overview-grid-cell">{LANG.overviewHeaderRevenue}</div>
                {showProfit && <div className="overview-grid-cell">{LANG.overviewGrossProfit}</div>}
              </div>
              <div className="overview-grid-body">
                {filteredOverviewRecords.length ? filteredOverviewRecords.map((record) => (
                  <button
                    key={`${record.recordType}-${record.id}`}
                    type="button"
                    className={`overview-grid-row overview-grid-row-${record.recordType.toLowerCase()}${showProfit ? '' : ' overview-grid-hide-profit'} ${overviewDetail?.header.id === record.id && overviewDetail?.header.recordType === record.recordType ? ' is-active' : ''}`}
                    onClick={() => void loadOverviewDetail(record.recordType, record.id)}
                  >
                    <div className="overview-grid-cell overview-grid-code">
                      <span className={`overview-grid-badge overview-badge-${record.recordType.toLowerCase()}`}>
                        {record.recordType === 'PURCHASE' ? 'NK' : record.recordType === 'RETURN' ? 'TH' : 'BH'}
                      </span>
                      {record.code}
                    </div>
                    <div className="overview-grid-cell">{record.subtotalAmount.toLocaleString('vi-VN')}</div>
                    <div className={`overview-grid-cell${record.discountAmount > 0 ? ' has-discount' : ''}`}>{record.discountAmount.toLocaleString('vi-VN')}</div>
                    <div className="overview-grid-cell">{record.costAmount.toLocaleString('vi-VN')}</div>
                    <div className="overview-grid-cell">{record.revenueAmount.toLocaleString('vi-VN')}</div>
                    {showProfit && <div className="overview-grid-cell overview-grid-profit">{Math.round(record.subtotalAmount - record.discountAmount - record.costAmount).toLocaleString('vi-VN')}</div>}
                  </button>
                )) : (
                  <div className="empty-stage">
                    <Empty description={LANG.overviewEmpty} />
                  </div>
                )}
              </div>
              <div className={`overview-grid-foot${showProfit ? '' : ' overview-grid-hide-profit'}`}>
                <div className="overview-grid-cell overview-grid-foot-label">{LANG.overviewTotalValue}</div>
                <div className="overview-grid-cell overview-grid-foot-val">{overviewTotalAmount.toLocaleString('vi-VN')}</div>
                <div className="overview-grid-cell overview-grid-foot-val">{overviewTotalDiscount.toLocaleString('vi-VN')}</div>
                <div className="overview-grid-cell overview-grid-foot-val">{Math.round(overviewTotalCost).toLocaleString('vi-VN')}</div>
                <div className="overview-grid-cell overview-grid-foot-val">{overviewTotalRevenue.toLocaleString('vi-VN')}</div>
                {showProfit && <div className="overview-grid-cell overview-grid-foot-val">{Math.round(overviewGrossProfit).toLocaleString('vi-VN')}</div>}
              </div>
            </>
          ) : (
            <>
              <div className="checkout-header">
                <div className="checkout-user">{isPurchaseTab ? LANG.purchaseHeader : LANG.cashier}</div>
                <div className="checkout-time">{LANG.storeNameSale}</div>
              </div>

              {isPurchaseTab ? (
                <div className="checkout-form checkout-form-purchase">
              <div className="purchase-status-top">
                <span className="purchase-status-label">{LANG.purchaseStatus}</span>
                <Tag color="red" className="purchase-status-tag">
                  {purchaseMetaMap[activeTab?.id ?? 0]?.status ?? LANG.purchaseDraftStatus}
                </Tag>
              </div>

              <div className="purchase-inline-row">
                <span className="purchase-inline-label">{LANG.purchaseImportDate}</span>
                <DatePicker
                  className="purchase-inline-control"
                  value={
                    purchaseMetaMap[activeTab?.id ?? 0]?.importDate
                      ? dayjs(purchaseMetaMap[activeTab?.id ?? 0]?.importDate)
                      : dayjs()
                  }
                  format="DD/MM/YYYY"
                  onChange={(date) => {
                    if (activeTab) {
                      updatePurchaseMeta(activeTab.id, {
                        importDate: date
                          ? date.format('YYYY-MM-DD')
                          : new Date().toISOString().slice(0, 10),
                      });
                    }
                  }}
                />
              </div>

              <Form layout="vertical">
                <Form.Item label={LANG.purchaseOrderCode}>
                  <Input
                    value={
                      purchaseMetaMap[activeTab?.id ?? 0]?.purchaseOrderCode ??
                      activeTab?.tabCode ??
                      ''
                    }
                    readOnly
                  />
                </Form.Item>

                <Form.Item label={LANG.purchaseSupplier}>
                  <Select
                    allowClear
                    showSearch
                    loading={suppliersLoading}
                    placeholder={LANG.purchaseSearchSupplier}
                    optionFilterProp="label"
                    value={purchaseMetaMap[activeTab?.id ?? 0]?.supplierId ?? undefined}
                    options={suppliers.map((supplier) => ({
                      label: supplier.code ? `${supplier.name} (${supplier.code})` : supplier.name,
                      value: supplier.id,
                    }))}
                    notFoundContent={LANG.purchaseNoSuppliersFound}
                    onChange={(value) =>
                      activeTab &&
                      updatePurchaseMeta(activeTab.id, {
                        supplierId: value ?? null,
                      })
                    }
                  />
                </Form.Item>

                <Form.Item label={LANG.purchaseSupplierOrderCode}>
                  <Input
                    value={purchaseMetaMap[activeTab?.id ?? 0]?.supplierOrderCode ?? ''}
                    onChange={(event) =>
                      activeTab &&
                      updatePurchaseMeta(activeTab.id, {
                        supplierOrderCode: event.target.value,
                      })
                    }
                  />
                </Form.Item>

                <Form.Item label={LANG.purchaseSupplierInvoiceCode}>
                  <Input
                    value={purchaseMetaMap[activeTab?.id ?? 0]?.supplierInvoiceCode ?? ''}
                    onChange={(event) =>
                      activeTab &&
                      updatePurchaseMeta(activeTab.id, {
                        supplierInvoiceCode: event.target.value,
                      })
                    }
                  />
                </Form.Item>
              </Form>

              <div className="summary-rows">
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
                  <Text>{LANG.purchasePayable}</Text>
                  <Text>{summary.total.toLocaleString('vi-VN')}</Text>
                </div>
                <div className="summary-row">
                  <Text>{LANG.purchasePaidAmount}</Text>
                  <InputNumber
                    min={0}
                    controls={false}
                    value={purchaseMetaMap[activeTab?.id ?? 0]?.supplierPaidAmount ?? 0}
                    onChange={(value) =>
                      activeTab &&
                      updatePurchaseMeta(activeTab.id, {
                        supplierPaidAmount: Number(value ?? 0),
                      })
                    }
                  />
                </div>
                <div className="summary-row">
                  <Text>{LANG.purchaseDebtAmount}</Text>
                  <Text>
                    {Math.max(
                      0,
                      summary.total -
                        (purchaseMetaMap[activeTab?.id ?? 0]?.supplierPaidAmount ?? 0),
                    ).toLocaleString('vi-VN')}
                  </Text>
                </div>
              </div>
                </div>
              ) : (
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
              )}

              <div className="payment-quick">
                <button type="button" className="quick-money">
                  {summary.total.toLocaleString('vi-VN')}
                </button>
              </div>

              <div className="checkout-actions">
                {isPurchaseTab ? (
                  <>
                    <Button
                      className="print-button"
                      onClick={() => handlePrintReceipt(buildDraftReceipt())}
                    >
                      {LANG.print}
                    </Button>
                    <Button
                      type="primary"
                      className="pay-button"
                      loading={checkingOut}
                      onClick={() => void handleCheckout()}
                    >
                      {LANG.purchaseComplete}
                    </Button>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </>
          )}
        </aside>
      </div>

      <ReceiptModal
        receiptPreview={receiptPreview}
        onClose={() => setReceiptPreview(null)}
        onPrint={handlePrintReceipt}
      />

      <CategoryManager open={categoryModalOpen} onClose={() => setCategoryModalOpen(false)} />

      <Modal
        title={LANG.overviewTitle}
        open={passwordDialogOpen}
        onCancel={() => { setPasswordDialogOpen(false); setPasswordInput(''); }}
        footer={[
          <Button key="ok" type="primary" onClick={handlePasswordSubmit}>
            {LANG.overviewRefresh}
          </Button>,
        ]}
        width={320}
        destroyOnClose
      >
        <Input.Password
          value={passwordInput}
          onChange={(e) => setPasswordInput(e.target.value)}
          onPressEnter={handlePasswordSubmit}
          autoFocus
          placeholder=""
        />
      </Modal>
    </div>
  );
}




