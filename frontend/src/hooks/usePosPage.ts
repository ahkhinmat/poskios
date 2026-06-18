import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { App as AntApp } from 'antd';
import { api } from '../api';
import { useAuth } from '../auth-context';
import { LANG } from '../lang';
import type { ApiEnvelope, AppSettings, LoyaltySettings } from '../types';
import { useTabs } from './useTabs';
import { useCustomerLoyalty } from './useCustomerLoyalty';
import { useSearch } from './useSearch';
import { useCheckout } from './useCheckout';
import { useOverview } from './useOverview';

export function usePosPage(recordPayment?: (amount: number, method: string) => void) {
  const { message } = AntApp.useApp();
  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate();
  const isManager = authUser?.roleCode === 'MANAGER';
  const userPermissions = authUser?.permissions ?? [];
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings | null>(null);
  const [currentView, setCurrentView] = useState<'POS' | 'OVERVIEW'>('POS');

  const tabsHook = useTabs(message, appSettings, userPermissions, setCurrentView);
  const {
    loading, saving, tabs, setTabs, activeTabId, setActiveTabId,
    closeTabTarget, setCloseTabTarget, purchaseMetaMap, productUnitOptionsMap,
    saleListRef, activeTab, isReturnTab, isPurchaseTab,
    createDraftTab, persistDraftTab, handleCreateTab, handleCloseTab, doDeleteTab,
    ensureTabOfType, addProductToActiveTab, setActiveTabItems,
    updateActiveTab, updateItem, handleChangeItemUnit, removeItem,
    getUnitOptionsForItem, loadProductUnitOptions, updatePurchaseMeta,
    lastRemovedItem, undoRemove,
  } = tabsHook;

  const customerHook = useCustomerLoyalty(
    message, userPermissions, activeTab, isReturnTab, isPurchaseTab,
    updateActiveTab, purchaseMetaMap, loyaltySettings, setLoyaltySettings,
  );
  const {
    customerLookup, customerSearchResults, customerLookupLoading,
    loyaltyHistoryOpen, setLoyaltyHistoryOpen, loyaltyHistory,
    loyaltySettingsOpen, setLoyaltySettingsOpen, loyaltySettingsSaving,
    customerNameModalOpen, setCustomerNameModalOpen, customerNameInput, setCustomerNameInput,
    suppliers, setSuppliers, suppliersLoading,
    editingSupplier, setEditingSupplier, supplierManagerOpen, setSupplierManagerOpen,
    loadSuppliers,
    openCustomerNameModal, handleSaveCustomerName,
    openCreateSupplier, openEditSupplier, openLoyaltyHistory,
    handleSaveLoyaltySettings,
  } = customerHook;

  const searchHook = useSearch(
    message, appSettings, activeTab, addProductToActiveTab,
    (items, sourceSalesOrderId) => setActiveTabItems(items, sourceSalesOrderId),
  );
  const {
    searching, searchValue, setSearchValue,
    searchResults, setSearchResults,
    highlightedSearchIndex, setHighlightedSearchIndex, lastScannedProductName,
    searchInputRef,
    invoiceSearchType, setInvoiceSearchType,
    invoiceSearchValue, setInvoiceSearchValue,
    invoiceFromDate, setInvoiceFromDate,
    invoiceToDate, setInvoiceToDate,
    foundInvoices, setFoundInvoices, invoiceSearching,
    focusSearchInput, clearSearchInput,
    searchProducts, searchInvoice, handleSelectInvoice, handleResolveProduct,
  } = searchHook;

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
  }, [activeTab, productUnitOptionsMap, loyaltySettings]);

  const checkoutHook = useCheckout(
    message, appSettings, userPermissions, activeTab, tabs, setTabs,
    setActiveTabId, summary, isReturnTab, isPurchaseTab,
    purchaseMetaMap, suppliers, createDraftTab, focusSearchInput, recordPayment,
  );
  const {
    checkingOut, receiptPreview, setReceiptPreview,
    productManagerOpen, setProductManagerOpen,
    buildDraftReceipt, handlePrintReceipt, handleCheckout, openProductManager,
  } = checkoutHook;

  const overviewHook = useOverview(
    message, userPermissions,
    import.meta.env.VITE_OVERVIEW_PASSWORD ?? appSettings?.overviewPassword ?? '11111',
    setCurrentView,
  );
  const {
    overviewLoading, overviewRecords, overviewDetail, setOverviewDetail,
    overviewFromDate, setOverviewFromDate, overviewToDate, setOverviewToDate,
    overviewRecordTypeFilter, setOverviewRecordTypeFilter,
    passwordDialogOpen, setPasswordDialogOpen, passwordInput, setPasswordInput,
    showProfit, filteredOverviewRecords,
    overviewTotalAmount, overviewTotalDiscount, overviewTotalLoyaltyDiscount,
    overviewTotalCost, overviewTotalRevenue, overviewGrossProfit,
    loadOverview, loadOverviewDetail, handleOpenOverview, handlePasswordSubmit,
  } = overviewHook;

  async function loadAppSettings() {
    try {
      const response = await api.get<ApiEnvelope<AppSettings>>('/pos/settings');
      setAppSettings(response.data.data);
    } catch {
      // non-critical, fallback to LANG
    }
  }

  function handleLogout() {
    logout();
    message.success(LANG.logoutSuccess);
    navigate('/login');
  }

  useEffect(() => {
    void loadAppSettings();
  }, []);

  useEffect(() => {
    if (!loading) {
      focusSearchInput();
    }
  }, [loading, activeTabId]);

  useEffect(() => {
    if (!activeTab || isReturnTab || isPurchaseTab || activeTab.customerPaidAmount === summary.total) return;

    updateActiveTab({ customerPaidAmount: summary.total });
  }, [summary.total, activeTabId, activeTab?.customerPaidAmount, isReturnTab, isPurchaseTab]);

  return {
    loading, saving, searching,
    searchValue, setSearchValue,
    searchResults, setSearchResults,
    tabs, setTabs,
    activeTabId, setActiveTabId,
    productUnitOptionsMap,
    highlightedSearchIndex, setHighlightedSearchIndex,
    lastScannedProductName,
    checkingOut,
    receiptPreview, setReceiptPreview,
    invoiceSearchType, setInvoiceSearchType,
    invoiceSearchValue, setInvoiceSearchValue,
    invoiceFromDate, setInvoiceFromDate,
    invoiceToDate, setInvoiceToDate,
    foundInvoices, setFoundInvoices,
    invoiceSearching,
    productManagerOpen, setProductManagerOpen,
    supplierManagerOpen,
    editingSupplier,
    customerLookup,
    customerSearchResults,
    customerLookupLoading,
    appSettings,
    loyaltySettings, setLoyaltySettings,
    loyaltyHistoryOpen, setLoyaltyHistoryOpen,
    loyaltyHistory,
    loyaltySettingsOpen, setLoyaltySettingsOpen,
    loyaltySettingsSaving,
    customerNameModalOpen, setCustomerNameModalOpen,
    customerNameInput, setCustomerNameInput,
    purchaseMetaMap, setPurchaseMetaMap: tabsHook.setPurchaseMetaMap,
    suppliers, setSuppliers,
    suppliersLoading,
    currentView, setCurrentView,
    overviewLoading,
    overviewRecords,
    overviewDetail, setOverviewDetail,
    overviewFromDate, setOverviewFromDate,
    overviewToDate, setOverviewToDate,
    overviewRecordTypeFilter, setOverviewRecordTypeFilter,
    passwordDialogOpen, setPasswordDialogOpen,
    passwordInput, setPasswordInput,
    closeTabTarget, setCloseTabTarget,

    authUser,

    searchInputRef,
    saleListRef,

    activeTab,
    summary,
    isReturnTab,
    isPurchaseTab,
    isManager,
    lastRemovedItem,
    undoRemove,
    showProfit,
    filteredOverviewRecords,
    overviewTotalAmount,
    overviewTotalDiscount,
    overviewTotalLoyaltyDiscount,
    overviewTotalCost,
    overviewTotalRevenue,
    overviewGrossProfit,

    setSupplierManagerOpen,
    setEditingSupplier,

    handleLogout,
    handleResolveProduct,
    searchProducts,
    searchInvoice,
    handleSelectInvoice,
    addProductToActiveTab,
    updateActiveTab,
    updateItem,
    handleChangeItemUnit,
    removeItem,
    buildDraftReceipt,
    handlePrintReceipt,
    handleCheckout,
    handleCreateTab,
    handleCloseTab,
    doDeleteTab,
    openProductManager,
    handleSaveLoyaltySettings,
    handleOpenOverview,
    handlePasswordSubmit,
    openCustomerNameModal,
    handleSaveCustomerName,
    openCreateSupplier,
    openEditSupplier,
    openLoyaltyHistory,
    focusSearchInput,
    clearSearchInput,
    ensureTabOfType,
    loadOverview,
    loadOverviewDetail,
    loadSuppliers,
    loadAppSettings,
    updatePurchaseMeta,
    getUnitOptionsForItem,
    loadProductUnitOptions,
    persistDraftTab,
  };
}
