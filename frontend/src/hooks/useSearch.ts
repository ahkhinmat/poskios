import { useEffect, useRef, useState } from 'react';
import type { InputRef } from 'antd';
import { api } from '../api';
import { LANG } from '../lang';
import type {
  ApiEnvelope,
  AppSettings,
  InvoiceItemsResponse,
  InvoiceSearchItem,
  InvoiceSearchResponse,
  PosDraftItem,
  PosDraftTab,
  PosProduct,
  SearchResponse,
} from '../types';

export function useSearch(
  message: ReturnType<typeof import('antd').App.useApp>['message'],
  appSettings: AppSettings | null,
  activeTab: PosDraftTab | null,
  addProductToActiveTab: (product: PosProduct) => void,
  onSelectInvoiceItems: (items: PosDraftItem[], sourceSalesOrderId: number) => void,
) {
  const [searching, setSearching] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [searchResults, setSearchResults] = useState<PosProduct[]>([]);
  const [highlightedSearchIndex, setHighlightedSearchIndex] = useState(-1);
  const [lastScannedProductName, setLastScannedProductName] = useState('');
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
  const searchInputRef = useRef<InputRef>(null);
  const searchKeywordRef = useRef('');

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

  async function searchProducts(
    keyword: string,
    notifyWhenEmpty = false,
    autoAddExactMatch = false,
  ) {
    try {
      const response = await api.get<ApiEnvelope<SearchResponse>>('/pos/products/search', {
        params: { keyword, limit: appSettings?.productSearchMaxResults ?? 8 },
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

      onSelectInvoiceItems(draftItems, invoiceId);

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

  async function handleResolveProduct() {
    const code = (searchInputRef.current?.input?.value ?? searchValue).trim();

    if (!code || !activeTab) return;

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
    }, appSettings?.searchDebounceMs ?? 250);

    return () => {
      window.clearTimeout(debounceTimer);
    };
  }, [searchValue]);

  return {
    searching, searchValue, setSearchValue,
    searchResults, setSearchResults,
    highlightedSearchIndex, setHighlightedSearchIndex,
    lastScannedProductName,
    searchInputRef, searchKeywordRef,
    invoiceSearchType, setInvoiceSearchType,
    invoiceSearchValue, setInvoiceSearchValue,
    invoiceFromDate, setInvoiceFromDate,
    invoiceToDate, setInvoiceToDate,
    foundInvoices, setFoundInvoices,
    invoiceSearching,
    focusSearchInput, clearSearchInput,
    searchProducts, searchInvoice, handleSelectInvoice, handleResolveProduct,
  };
}
