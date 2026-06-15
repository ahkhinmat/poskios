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
  WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api';
import { LANG } from './lang';
import { ReceiptModal } from './components/ReceiptModal';
import { CheckoutPanel } from './components/CheckoutPanel';
import { ProductManager } from './components/ProductManager';
import { SupplierManager } from './components/SupplierManager';
import { extractApiErrorMessage } from './utils/error';
import { createDefaultPurchaseMeta, getNextTabNumber } from './utils/purchase';
import { buildReceiptDocumentHtml } from './utils/receipt';
import type {
  ApiEnvelope,
  CheckoutResponse,
  Customer,
  CustomerSearchResponse,
  DraftTabsResponse,
  InvoiceItemsResponse,
  InvoiceSearchItem,
  InvoiceSearchResponse,
  LoyaltyHistoryResponse,
  LoyaltySettings,
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

const BUILD_VERSION = __APP_BUILD_VERSION__;

function formatPoints(value: number) {
  return value.toLocaleString('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}





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
  const [productManagerOpen, setProductManagerOpen] = useState(false);
  const [supplierManagerOpen, setSupplierManagerOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [customerLookup, setCustomerLookup] = useState<Customer | null>(null);
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);
  const [customerLookupLoading, setCustomerLookupLoading] = useState(false);
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings | null>(null);
  const [loyaltyHistoryOpen, setLoyaltyHistoryOpen] = useState(false);
  const [loyaltyHistory, setLoyaltyHistory] = useState<LoyaltyHistoryResponse | null>(null);
  const [loyaltySettingsOpen, setLoyaltySettingsOpen] = useState(false);
  const [loyaltySettingsSaving, setLoyaltySettingsSaving] = useState(false);
  const [customerNameModalOpen, setCustomerNameModalOpen] = useState(false);
  const [customerNameInput, setCustomerNameInput] = useState('');
  const [purchaseMetaMap, setPurchaseMetaMap] = useState<Record<number, PurchaseMeta>>({});
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [currentView, setCurrentView] = useState<'POS' | 'OVERVIEW'>('POS');
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewRecords, setOverviewRecords] = useState<OverviewRecord[]>([]);
  const [overviewDetail, setOverviewDetail] = useState<OverviewDetail | null>(null);
  const [overviewFromDate, setOverviewFromDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [overviewToDate, setOverviewToDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [overviewRecordTypeFilter, setOverviewRecordTypeFilter] = useState<'ALL' | 'SALE' | 'RETURN' | 'PURCHASE'>('SALE');
  const showProfit = overviewRecordTypeFilter === 'SALE';
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
  const activePurchaseMeta = useMemo(
    () => (activeTab ? purchaseMetaMap[activeTab.id] : undefined),
    [activeTab, purchaseMetaMap],
  );

  const summary = useMemo(() => {
    const items = activeTab?.items ?? [];
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const lineDiscount = items.reduce((sum, item) => sum + item.discountAmount, 0);
    const costAmount = items.reduce((sum, item) => {
      const unitOption = productUnitOptionsMap[item.productId]?.find(
        (option) => option.productUnitId === item.productUnitId,
      );
      const costPrice = unitOption?.costPrice ?? item.unitPrice;

      return sum + item.quantity * costPrice;
    }, 0);
    const orderDiscount = activeTab?.discountAmount ?? 0;
    const rawTotal = subtotal - lineDiscount - orderDiscount;
    const pointsDiscount =
      activeTab?.tabType === 'SALE'
        ? (activeTab?.redeemedPoints ?? 0) * (loyaltySettings?.redeemAmountPerPoint ?? 0)
        : 0;
    const total = rawTotal - pointsDiscount;
    const grossProfitAmount =
      activeTab?.tabType === 'SALE' ? total - costAmount : 0;
    const grossProfitPercent =
      activeTab?.tabType === 'SALE' && subtotal > 0
        ? (grossProfitAmount / subtotal) * 100
        : 0;

    return {
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal,
      costAmount,
      rawTotal,
      pointsDiscount,
      total,
      grossProfitAmount,
      grossProfitPercent,
    };
  }, [activeTab, loyaltySettings, productUnitOptionsMap]);

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
  const overviewTotalLoyaltyDiscount = useMemo(
    () =>
      filteredOverviewRecords.reduce(
        (sum, record) => sum + record.loyaltyDiscountAmount,
        0,
      ),
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
    () => filteredOverviewRecords.reduce((sum, record) => sum + (record.revenueAmount - record.costAmount), 0),
    [filteredOverviewRecords],
  );

  useEffect(() => {
    void bootstrapDraftTabs();
    void loadSuppliers();
    void loadLoyaltySettings();
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
  }, [activeTab, activePurchaseMeta, loading]);

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

  useEffect(() => {
    if (!activeTab || isReturnTab || isPurchaseTab) {
      setCustomerLookup(null);
      setCustomerSearchResults([]);
      return;
    }

    const query = String(activeTab.customerPhone ?? '').trim();
    const normalizedPhone = query.replace(/\D+/g, '');

    if (!query) {
      setCustomerLookup(null);
      setCustomerSearchResults([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      const customers = await searchCustomers(query);
      const customer =
        normalizedPhone
          ? customers.find((item) => item.phoneNumber === normalizedPhone) ?? null
          : null;

      if (!customer) {
        if (activeTab.customerId || activeTab.customerName || (activeTab.redeemedPoints ?? 0) > 0) {
          updateActiveTab({ customerId: null, customerName: null, redeemedPoints: 0 });
        }
        setCustomerLookup(null);
        return;
      }

      setCustomerLookup(customer);
      if (
        activeTab.customerId !== customer.id ||
        activeTab.customerName !== customer.fullName ||
        activeTab.customerPhone !== customer.phoneNumber
      ) {
        updateActiveTab({
          customerId: customer.id,
          customerName: customer.fullName,
          customerPhone: customer.phoneNumber,
        });
      }

      if ((activeTab.redeemedPoints ?? 0) > customer.currentPoints) {
        updateActiveTab({ redeemedPoints: customer.currentPoints });
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [
    activeTab?.id,
    activeTab?.customerId,
    activeTab?.customerName,
    activeTab?.customerPhone,
    activeTab?.redeemedPoints,
    isPurchaseTab,
    isReturnTab,
  ]);

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
          costPrice: item.unitPrice,
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
      const hydratedTabs = loadedTabs;

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
      customerId: null,
      customerName: null,
      customerPhone: null,
      note: null,
      paymentMethod: 'CASH',
      customerPaidAmount: 0,
      discountAmount: 0,
      redeemedPoints: 0,
      sourceSalesOrderId: tabType === 'RETURN' ? null : undefined,
      items: [],
    });

    return response.data.data;
  }

  async function persistDraftTab(tab: PosDraftTab) {
    setSaving(true);

    try {
      const purchaseMeta =
        tab.tabType === 'PURCHASE'
          ? purchaseMetaMap[tab.id] ?? createDefaultPurchaseMeta(tab, tabs)
          : null;

      await api.put(`/pos/draft-tabs/${tab.id}`, {
        tabType: tab.tabType,
        title: tab.title,
        saleMode: tab.saleMode,
        customerId: tab.customerId ?? null,
        customerName: tab.customerName,
        customerPhone: tab.customerPhone,
        note: tab.note,
        paymentMethod: tab.paymentMethod,
        customerPaidAmount: tab.customerPaidAmount,
        discountAmount: tab.discountAmount,
        redeemedPoints: tab.redeemedPoints ?? 0,
        sourceSalesOrderId: tab.sourceSalesOrderId,
        importDate: purchaseMeta?.importDate ?? null,
        purchaseOrderCode: purchaseMeta?.purchaseOrderCode ?? null,
        supplierId: purchaseMeta?.supplierId ?? null,
        supplierOrderCode: purchaseMeta?.supplierOrderCode ?? null,
        supplierInvoiceCode: purchaseMeta?.supplierInvoiceCode ?? null,
        purchaseStatus: purchaseMeta?.status ?? null,
        supplierPaidAmount: purchaseMeta?.supplierPaidAmount ?? 0,
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

  async function loadLoyaltySettings() {
    try {
      const response = await api.get<ApiEnvelope<LoyaltySettings>>('/pos/loyalty/settings');
      setLoyaltySettings(response.data.data);
    } catch {
      message.error(LANG.errLoadLoyaltySettings);
    }
  }

  async function searchCustomers(keyword?: string | null) {
    const rawKeyword = String(keyword ?? '').trim();
    if (!rawKeyword || isReturnTab || isPurchaseTab) {
      setCustomerSearchResults([]);
      return [];
    }

    setCustomerLookupLoading(true);
    try {
      const response = await api.get<ApiEnvelope<CustomerSearchResponse>>('/pos/customers/search', {
        params: { keyword: rawKeyword },
      });
      const items = response.data.data.items;
      setCustomerSearchResults(items);
      return items;
    } catch {
      message.error(LANG.errLoadCustomer);
      return [];
    } finally {
      setCustomerLookupLoading(false);
    }
  }

  async function openLoyaltyHistory() {
    if (!customerLookup?.id) {
      return;
    }

    try {
      const response = await api.get<ApiEnvelope<LoyaltyHistoryResponse>>(
        `/pos/customers/${customerLookup.id}/point-history`,
      );
      setLoyaltyHistory(response.data.data);
      setLoyaltyHistoryOpen(true);
    } catch {
      message.error(LANG.errLoadPointHistory);
    }
  }

  async function ensureTabOfType(tabType: 'SALE' | 'RETURN' | 'PURCHASE') {
    setCurrentView('POS');

    if (activeTab?.tabType === tabType) return;

    const existing = tabs.find((tab) => tab.tabType === tabType);
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }

    await handleCreateTab(tabType);
  }

  async function loadOverview(selectRecord = true, fromDate?: string, toDate?: string) {
    setOverviewLoading(true);
    try {
      const response = await api.get<ApiEnvelope<{ items: OverviewRecord[] }>>('/pos/overview', {
        params: {
          fromDate: fromDate ?? overviewFromDate,
          toDate: toDate ?? overviewToDate,
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

  const [closeTabTarget, setCloseTabTarget] = useState<number | null>(null);

  async function handleCloseTab(targetId: number) {
    if (tabs.length === 1) {
      message.warning(LANG.warnNeedTab);
      return;
    }

    const target = tabs.find((t) => t.id === targetId);
    if (!target) return;

    if (target.items.length) {
      setCloseTabTarget(targetId);
      return;
    }

    await doDeleteTab(targetId);
  }

  async function doDeleteTab(targetId: number) {
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

    const unitPrice = activeTab.tabType === 'PURCHASE' ? product.costPrice : product.salePrice;

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
          unitPrice,
          discountAmount: 0,
          lineTotal: unitPrice,
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

    const unitPrice = activeTab.tabType === 'PURCHASE' ? nextUnit.costPrice : nextUnit.salePrice;

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
              unitPrice,
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

    printWindow.document.write(buildReceiptDocumentHtml(receipt));
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
          customerId: activeTab.customerId ?? null,
          customerName: activeTab.customerName,
          customerPhone: activeTab.customerPhone,
          note: activeTab.note,
          discountAmount: activeTab.discountAmount,
          redeemedPoints: activeTab.redeemedPoints ?? 0,
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

  function openProductManager() {
    setProductManagerOpen(true);
  }

  async function handleSaveLoyaltySettings() {
    if (!loyaltySettings) {
      return;
    }

    setLoyaltySettingsSaving(true);
    try {
      const response = await api.put<ApiEnvelope<LoyaltySettings>>('/pos/loyalty/settings', loyaltySettings);
      setLoyaltySettings(response.data.data);
      setLoyaltySettingsOpen(false);
      message.success(LANG.loyaltySettingsSaved);
    } catch {
      message.error(LANG.errSaveLoyaltySettings);
    } finally {
      setLoyaltySettingsSaving(false);
    }
  }

  function openCustomerNameModal() {
    setCustomerNameInput(activeTab?.customerName ?? customerLookup?.fullName ?? '');
    setCustomerNameModalOpen(true);
  }

  async function handleSaveCustomerName() {
    const trimmed = customerNameInput.trim();
    const phoneNumber = String(activeTab?.customerPhone ?? '').replace(/\D+/g, '');

    if (!trimmed) {
      message.warning(LANG.errCustomerNameRequired);
      return;
    }

    if (!phoneNumber) {
      message.warning(LANG.errCustomerPhoneRequired);
      return;
    }

    try {
      const response = await api.post<ApiEnvelope<Customer>>(
        '/pos/customers/upsert-by-phone',
        {
          phoneNumber,
          fullName: trimmed,
        },
      );

      const customer = response.data.data;
      setCustomerLookup(customer);
      setCustomerSearchResults([]);
      updateActiveTab({
        customerPhone: customer.phoneNumber,
        customerId: customer.id,
        customerName: customer.fullName,
        redeemedPoints: Math.min(activeTab?.redeemedPoints ?? 0, customer.currentPoints),
      });
      setCustomerNameModalOpen(false);
      message.success(LANG.customerNameSaved);
    } catch {
      message.error(LANG.errCustomerSave);
    }
  }

  function openCreateSupplier() {
    setEditingSupplier(null);
    setSupplierManagerOpen(true);
  }

  function openEditSupplier() {
    if (!activeTab || activeTab.tabType !== 'PURCHASE') {
      return;
    }

    const supplierId = purchaseMetaMap[activeTab.id]?.supplierId ?? null;
    const selectedSupplier =
      suppliers.find((supplier) => supplier.id === supplierId) ?? null;

    if (!selectedSupplier) {
      message.warning(LANG.warnSelectSupplierToEdit);
      return;
    }

    setEditingSupplier(selectedSupplier);
    setSupplierManagerOpen(true);
  }

  const isOverviewPasswordRequired = import.meta.env.VITE_IS_OVERVIEW_PASSWORD !== 'false';

  function handleOpenOverview() {
    if (isOverviewPasswordRequired) {
      setPasswordInput('');
      setPasswordDialogOpen(true);
    } else {
      setCurrentView('OVERVIEW');
      void loadOverview();
    }
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
      <div className={`pos-grid${currentView !== 'OVERVIEW' ? ' pos-grid-sale-mode' : ''}`}>
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
                    onChange={(date) => {
                      const v = date ? date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
                      setOverviewFromDate(v);
                      void loadOverview(false, v, undefined);
                    }}
                  />
                  <span>{LANG.overviewToDate}</span>
                  <DatePicker
                    value={dayjs(overviewToDate)}
                    format="DD/MM/YYYY"
                    onChange={(date) => {
                      const v = date ? date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
                      setOverviewToDate(v);
                      void loadOverview(false, undefined, v);
                    }}
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
                    <button type="button" className="sale-mode" onClick={async () => { await ensureTabOfType('SALE'); focusSearchInput(); }}>
                      {LANG.modeSale}
                    </button>
                  </Tooltip>
                  <Tooltip title={LANG.modeReturnTip}>
                    <button type="button" className="sale-mode" onClick={() => { void ensureTabOfType('RETURN'); }}>
                      {LANG.modeReturn}
                    </button>
                  </Tooltip>
                  <Tooltip title={LANG.modeImportTip}>
                    <button type="button" className="sale-mode" onClick={() => { void ensureTabOfType('PURCHASE'); }}>
                      {LANG.modeImport}
                    </button>
                  </Tooltip>
                  <Tooltip title={LANG.modeCategoryTip}>
                    <button type="button" className="sale-mode" onClick={openProductManager}>
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
                  onClick={async () => { await ensureTabOfType('SALE'); focusSearchInput(); }}
                >
                  {LANG.modeSale}
                </button>
              </Tooltip>
              <Tooltip title={LANG.modeReturnTip}>
                  <button
                    type="button"
                    className={`sale-mode ${isReturnTab ? 'is-active' : ''}`}
                    onClick={() => { if (!isReturnTab) void ensureTabOfType('RETURN'); }}
                  >
                    {LANG.modeReturn}
                  </button>
                </Tooltip>
                <Tooltip title={LANG.modeImportTip}>
                  <button
                    type="button"
                    className={`sale-mode ${isPurchaseTab ? 'is-active' : ''}`}
                    onClick={() => { if (!isPurchaseTab) void ensureTabOfType('PURCHASE'); }}
                  >
                    {LANG.modeImport}
                  </button>
              </Tooltip>
              <Tooltip title={LANG.modeCategoryTip}>
                <button
                  type="button"
                  className="sale-mode"
onClick={openProductManager}
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

        <CheckoutPanel
          currentView={currentView}
          isPurchaseTab={isPurchaseTab}
          isReturnTab={isReturnTab}
          activeTab={activeTab}
          summary={summary}
          purchaseMetaMap={purchaseMetaMap}
          suppliers={suppliers}
          suppliersLoading={suppliersLoading}
          customerLookup={customerLookup}
          customerSearchResults={customerSearchResults}
          customerLookupLoading={customerLookupLoading}
          loyaltySettings={loyaltySettings}
          overviewLoading={overviewLoading}
          overviewRecordTypeFilter={overviewRecordTypeFilter}
          showProfit={showProfit}
          overviewTotalAmount={overviewTotalAmount}
          overviewTotalDiscount={overviewTotalDiscount}
          overviewTotalLoyaltyDiscount={overviewTotalLoyaltyDiscount}
          overviewTotalCost={overviewTotalCost}
          overviewTotalRevenue={overviewTotalRevenue}
          overviewGrossProfit={overviewGrossProfit}
          filteredOverviewRecords={filteredOverviewRecords}
          overviewDetail={overviewDetail}
          checkingOut={checkingOut}
          buildVersion={BUILD_VERSION}
          onSetOverviewRecordTypeFilter={setOverviewRecordTypeFilter}
          onLoadOverviewDetail={loadOverviewDetail}
          onUpdatePurchaseMeta={updatePurchaseMeta}
          onUpdateActiveTab={updateActiveTab}
          onOpenCreateSupplier={openCreateSupplier}
          onOpenEditSupplier={openEditSupplier}
          onOpenCustomerNameModal={openCustomerNameModal}
          onSetLoyaltySettingsOpen={setLoyaltySettingsOpen}
          onOpenLoyaltyHistory={openLoyaltyHistory}
          onPrintReceipt={() => handlePrintReceipt(buildDraftReceipt())}
          onCheckout={handleCheckout}
          formatPoints={formatPoints}
          paymentOptions={paymentOptions}
        />
      </div>

      <Modal
        title={LANG.closeTab}
        open={closeTabTarget != null}
        onCancel={() => setCloseTabTarget(null)}
        footer={[
          <Button key="cancel" onClick={() => setCloseTabTarget(null)}>
            {LANG.cancel}
          </Button>,
          <Button key="pay" type="primary" onClick={() => {
            setActiveTabId(closeTabTarget!);
            setCloseTabTarget(null);
          }}>
            {LANG.closeTabPay}
          </Button>,
          <Button key="discard" danger onClick={async () => {
            const id = closeTabTarget;
            setCloseTabTarget(null);
            if (id != null) await doDeleteTab(id);
          }}>
            {LANG.closeTabDiscard} <WarningOutlined />
          </Button>,
        ]}
        destroyOnClose
      >
        {LANG.closeTabUnsaved}
      </Modal>

      <ReceiptModal
        receiptPreview={receiptPreview}
        onClose={() => setReceiptPreview(null)}
        onPrint={handlePrintReceipt}
      />

      <Modal
        title={LANG.pointHistory}
        open={loyaltyHistoryOpen}
        onCancel={() => setLoyaltyHistoryOpen(false)}
        footer={null}
        width={640}
        destroyOnClose
      >
        <div className="loyalty-history-header">
          <Text strong>{loyaltyHistory?.customer.fullName ?? LANG.customerNew}</Text>
          <Text type="secondary">
            {loyaltyHistory?.customer.phoneNumber ?? ''} · {LANG.customerPoints}:{' '}
            {formatPoints(loyaltyHistory?.customer.currentPoints ?? 0)}
          </Text>
        </div>
        <List
          dataSource={loyaltyHistory?.items ?? []}
          locale={{ emptyText: LANG.overviewEmpty }}
          renderItem={(item) => (
            <List.Item>
              <div className="loyalty-history-item">
                <div>
                  <Text strong>{item.transactionType}</Text>
                  <div>
                    <Text type="secondary">
                      {new Date(item.transactionAt).toLocaleString('vi-VN')}
                    </Text>
                  </div>
                  {item.notes && <div><Text type="secondary">{item.notes}</Text></div>}
                </div>
                <div className="loyalty-history-values">
                  <Text strong>{item.pointsChange > 0 ? `+${formatPoints(item.pointsChange)}` : formatPoints(item.pointsChange)}</Text>
                  <Text type="secondary">{formatPoints(item.balanceAfter)}</Text>
                </div>
              </div>
            </List.Item>
          )}
        />
      </Modal>

      <Modal
        title={LANG.customerName}
        open={customerNameModalOpen}
        onCancel={() => setCustomerNameModalOpen(false)}
        onOk={handleSaveCustomerName}
        okText={LANG.save}
        cancelText={LANG.cancel}
        destroyOnClose
      >
        <Form layout="vertical">
          <Form.Item label={LANG.customerPhone}>
            <Input value={activeTab?.customerPhone ?? ''} readOnly />
          </Form.Item>
        </Form>
        <Input
          value={customerNameInput}
          onChange={(event) => setCustomerNameInput(event.target.value)}
          placeholder={LANG.customerName}
          maxLength={150}
        />
      </Modal>

      <Modal
        title={LANG.loyaltyConfig}
        open={loyaltySettingsOpen}
        onCancel={() => setLoyaltySettingsOpen(false)}
        onOk={() => void handleSaveLoyaltySettings()}
        confirmLoading={loyaltySettingsSaving}
        okText={LANG.saveConfig}
        cancelText={LANG.cancel}
        destroyOnClose
      >
        <Form layout="vertical" className="loyalty-settings-form">
          <Form.Item label={LANG.earnAmountPerPoint}>
            <InputNumber
              min={1}
              controls={false}
              value={loyaltySettings?.earnAmountPerPoint ?? 10000}
              onChange={(value) =>
                setLoyaltySettings((current) => ({
                  earnAmountPerPoint: Number(value ?? 10000),
                  redeemAmountPerPoint: current?.redeemAmountPerPoint ?? 1000,
                  minimumRedeemPoints: current?.minimumRedeemPoints ?? 10,
                  pointsExpiryDays: current?.pointsExpiryDays ?? null,
                }))
              }
            />
          </Form.Item>
          <Form.Item label={LANG.redeemAmountPerPoint}>
            <InputNumber
              min={1}
              controls={false}
              value={loyaltySettings?.redeemAmountPerPoint ?? 1000}
              onChange={(value) =>
                setLoyaltySettings((current) => ({
                  earnAmountPerPoint: current?.earnAmountPerPoint ?? 10000,
                  redeemAmountPerPoint: Number(value ?? 1000),
                  minimumRedeemPoints: current?.minimumRedeemPoints ?? 10,
                  pointsExpiryDays: current?.pointsExpiryDays ?? null,
                }))
              }
            />
          </Form.Item>
          <Form.Item label={LANG.minimumRedeemPoints}>
            <InputNumber
              min={0}
              step={0.0001}
              controls={false}
              value={loyaltySettings?.minimumRedeemPoints ?? 10}
              onChange={(value) =>
                setLoyaltySettings((current) => ({
                  earnAmountPerPoint: current?.earnAmountPerPoint ?? 10000,
                  redeemAmountPerPoint: current?.redeemAmountPerPoint ?? 1000,
                  minimumRedeemPoints: Number(value ?? 10),
                  pointsExpiryDays: current?.pointsExpiryDays ?? null,
                }))
              }
            />
          </Form.Item>
          <Form.Item label={LANG.pointsExpiryDays}>
            <InputNumber
              min={0}
              controls={false}
              value={loyaltySettings?.pointsExpiryDays ?? 0}
              onChange={(value) =>
                setLoyaltySettings((current) => ({
                  earnAmountPerPoint: current?.earnAmountPerPoint ?? 10000,
                  redeemAmountPerPoint: current?.redeemAmountPerPoint ?? 1000,
                  minimumRedeemPoints: current?.minimumRedeemPoints ?? 10,
                  pointsExpiryDays: Number(value ?? 0) || null,
                }))
              }
            />
          </Form.Item>
        </Form>
      </Modal>

      <SupplierManager
        open={supplierManagerOpen}
        supplier={editingSupplier}
        onClose={() => {
          setSupplierManagerOpen(false);
          setEditingSupplier(null);
        }}
        onSaved={(savedSupplier) => {
          setSupplierManagerOpen(false);
          setEditingSupplier(null);
          setSuppliers((current) => {
            const next = current.filter((supplier) => supplier.id !== savedSupplier.id);
            next.push(savedSupplier);
            next.sort((left, right) => left.name.localeCompare(right.name, 'vi'));
            return next;
          });

          if (activeTab?.tabType === 'PURCHASE') {
            updatePurchaseMeta(activeTab.id, { supplierId: savedSupplier.id });
          }
        }}
      />

      <ProductManager open={productManagerOpen} onClose={() => setProductManagerOpen(false)} />

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




