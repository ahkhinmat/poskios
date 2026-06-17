import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import { LANG } from '../lang';
import { PERMISSIONS } from '../permissions';
import { createDefaultPurchaseMeta, getNextTabNumber } from '../utils/purchase';
import type {
  ApiEnvelope,
  AppSettings,
  DraftTabsResponse,
  PosDraftItem,
  PosDraftTab,
  PosProduct,
  PosProductUnitOption,
  ProductUnitOptionsResponse,
  PurchaseMeta,
} from '../types';

export function useTabs(
  message: ReturnType<typeof import('antd').App.useApp>['message'],
  appSettings: AppSettings | null,
  permissions: string[],
  setCurrentView: (view: 'POS' | 'OVERVIEW') => void,
) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tabs, setTabs] = useState<PosDraftTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [closeTabTarget, setCloseTabTarget] = useState<number | null>(null);
  const [purchaseMetaMap, setPurchaseMetaMap] = useState<Record<number, PurchaseMeta>>({});
  const [productUnitOptionsMap, setProductUnitOptionsMap] = useState<
    Record<number, PosProductUnitOption[]>
  >({});
  const saveTimerRef = useRef<number | null>(null);
  const saleListRef = useRef<HTMLDivElement>(null);

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? null,
    [tabs, activeTabId],
  );
  const activePurchaseMeta = useMemo(
    () => (activeTab ? purchaseMetaMap[activeTab.id] : undefined),
    [activeTab, purchaseMetaMap],
  );

  const isReturnTab = activeTab?.tabType === 'RETURN';
  const isPurchaseTab = activeTab?.tabType === 'PURCHASE';

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
      paymentMethod: appSettings?.defaultPaymentMethod ?? 'CASH',
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
            paymentMethod: appSettings?.defaultPaymentMethod ?? 'CASH',
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

  async function ensureTabOfType(tabType: 'SALE' | 'RETURN' | 'PURCHASE') {
    setCurrentView('POS');

    if (tabType === 'PURCHASE' && !permissions.includes(PERMISSIONS.PURCHASE_CREATE)) {
      message.warning(LANG.permissionDenied);
      return;
    }

    if (activeTab?.tabType === tabType) return;

    const existing = tabs.find((tab) => tab.tabType === tabType);
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }

    await handleCreateTab(tabType);
  }

  function addProductToActiveTab(product: PosProduct) {
    if (!activeTab) return;

    const unitPrice = activeTab.tabType === 'PURCHASE' ? product.costPrice : product.salePrice;

    setTabs((current) => {
      const nextTabs = current.map((tab) => {
        if (tab.id !== activeTab.id) return tab;

        const existingItemIndex = tab.items.findIndex((item) => {
          if (item.productUnitId === product.productUnitId) return true;
          if (item.barcode && product.barcode && item.barcode === product.barcode) return true;
          if (item.productCode && item.productCode === product.productCode) return true;
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
          quantity: appSettings?.defaultAddQuantity ?? 1,
          unitPrice,
          discountAmount: 0,
          lineTotal: (appSettings?.defaultAddQuantity ?? 1) * unitPrice,
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

    scrollSaleListToTop();
  }

  function setActiveTabItems(items: PosDraftItem[], sourceSalesOrderId: number) {
    if (!activeTab) return;

    setTabs((current) =>
      current.map((tab) =>
        tab.id === activeTab.id
          ? { ...tab, items, sourceSalesOrderId }
          : tab,
      ),
    );
  }

  function updateActiveTab(patch: Partial<PosDraftTab>) {
    if (!activeTab) return;

    setTabs((current) =>
      current.map((tab) => (tab.id === activeTab.id ? { ...tab, ...patch } : tab)),
    );
  }

  function updateItem(productUnitId: number, patch: Partial<PosDraftItem>) {
    if (!activeTab) return;

    setTabs((current) =>
      current.map((tab) => {
        if (tab.id !== activeTab.id) return tab;

        return {
          ...tab,
          items: tab.items.map((item) => {
            if (item.productUnitId !== productUnitId) return item;

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

    if (!nextUnit || !activeTab) return;

    const unitPrice = activeTab.tabType === 'PURCHASE' ? nextUnit.costPrice : nextUnit.salePrice;

    setTabs((current) =>
      current.map((tab) => {
        if (tab.id !== activeTab.id) return tab;

        const existingTarget = tab.items.find(
          (tabItem) =>
            tabItem.productUnitId === nextUnit.productUnitId &&
            tabItem.productUnitId !== item.productUnitId,
        );

        if (existingTarget) {
          const mergedItems = tab.items
            .filter((tabItem) => tabItem.productUnitId !== item.productUnitId)
            .map((tabItem) => {
              if (tabItem.productUnitId !== nextUnit.productUnitId) return tabItem;

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

          return { ...tab, items: mergedItems };
        }

        return {
          ...tab,
          items: tab.items.map((tabItem) => {
            if (tabItem.productUnitId !== item.productUnitId) return tabItem;

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

  const [lastRemovedItem, setLastRemovedItem] = useState<{ item: PosDraftItem; tabId: number; sortOrder: number } | null>(null);

  function removeItem(productUnitId: number) {
    if (!activeTab) return;

    const removed = activeTab.items.find((item) => item.productUnitId === productUnitId);
    if (!removed) return;

    setLastRemovedItem({ item: { ...removed }, tabId: activeTab.id, sortOrder: removed.sortOrder });

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

  function undoRemove() {
    if (!lastRemovedItem) return;

    const { item, tabId, sortOrder } = lastRemovedItem;
    setTabs((current) =>
      current.map((tab) =>
        tab.id === tabId
          ? {
              ...tab,
              items: [...tab.items, { ...item, sortOrder }]
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((itm, idx) => ({ ...itm, sortOrder: idx + 1 })),
            }
          : tab,
      ),
    );
    setLastRemovedItem(null);
  }

  useEffect(() => {
    void bootstrapDraftTabs();
  }, []);

  useEffect(() => {
    if (!activeTab || loading) return;

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      void persistDraftTab(activeTab);
    }, appSettings?.autoSaveDebounceMs ?? 500);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [activeTab, activePurchaseMeta, loading]);

  useEffect(() => {
    setPurchaseMetaMap((current) => {
      const next = { ...current };
      let changed = false;

      for (const tab of tabs) {
        if (tab.tabType !== 'PURCHASE' || next[tab.id]) continue;

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
    if (!activeTab?.items.length) return;

    const missingProductIds = [...new Set(activeTab.items.map((item) => item.productId))].filter(
      (productId) => !productUnitOptionsMap[productId],
    );

    if (!missingProductIds.length) return;

    void Promise.all(missingProductIds.map((productId) => loadProductUnitOptions(productId)));
  }, [activeTab, productUnitOptionsMap]);

  return {
    loading, saving,
    tabs, setTabs,
    activeTabId, setActiveTabId,
    closeTabTarget, setCloseTabTarget,
    purchaseMetaMap, setPurchaseMetaMap,
    productUnitOptionsMap,
    saleListRef,
    activeTab, activePurchaseMeta,
    isReturnTab, isPurchaseTab,
    bootstrapDraftTabs, createDraftTab, persistDraftTab,
    handleCreateTab, handleCloseTab, doDeleteTab,
    ensureTabOfType, addProductToActiveTab,
    setActiveTabItems,
    updateActiveTab, updateItem, handleChangeItemUnit, removeItem,
    getUnitOptionsForItem, loadProductUnitOptions, updatePurchaseMeta,
    lastRemovedItem, undoRemove,
  };
}
