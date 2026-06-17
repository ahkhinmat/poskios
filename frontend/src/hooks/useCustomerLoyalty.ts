import { useEffect, useState } from 'react';
import { api } from '../api';
import { LANG } from '../lang';
import { PERMISSIONS } from '../permissions';
import type {
  ApiEnvelope,
  Customer,
  CustomerSearchResponse,
  LoyaltyHistoryResponse,
  LoyaltySettings,
  PosDraftTab,
  PurchaseMeta,
  Supplier,
} from '../types';

export function useCustomerLoyalty(
  message: ReturnType<typeof import('antd').App.useApp>['message'],
  permissions: string[],
  activeTab: PosDraftTab | null,
  isReturnTab: boolean,
  isPurchaseTab: boolean,
  updateActiveTab: (patch: Partial<PosDraftTab>) => void,
  purchaseMetaMap: Record<number, PurchaseMeta>,
  loyaltySettings: LoyaltySettings | null,
  setLoyaltySettings: (settings: LoyaltySettings | null) => void,
) {
  const [customerLookup, setCustomerLookup] = useState<Customer | null>(null);
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);
  const [customerLookupLoading, setCustomerLookupLoading] = useState(false);
  const [loyaltyHistoryOpen, setLoyaltyHistoryOpen] = useState(false);
  const [loyaltyHistory, setLoyaltyHistory] = useState<LoyaltyHistoryResponse | null>(null);
  const [loyaltySettingsOpen, setLoyaltySettingsOpen] = useState(false);
  const [loyaltySettingsSaving, setLoyaltySettingsSaving] = useState(false);
  const [customerNameModalOpen, setCustomerNameModalOpen] = useState(false);
  const [customerNameInput, setCustomerNameInput] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierManagerOpen, setSupplierManagerOpen] = useState(false);

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
    if (!customerLookup?.id) return;

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
        { phoneNumber, fullName: trimmed },
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

  async function handleSaveLoyaltySettings() {
    if (!permissions.includes(PERMISSIONS.LOYALTY_CONFIGURE)) {
      message.warning(LANG.permissionDenied);
      return;
    }

    if (!loyaltySettings) return;

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

  function openCreateSupplier() {
    if (!permissions.includes(PERMISSIONS.SUPPLIERS_MANAGE)) return;

    setEditingSupplier(null);
    setSupplierManagerOpen(true);
  }

  function openEditSupplier() {
    if (!permissions.includes(PERMISSIONS.SUPPLIERS_MANAGE)) return;

    if (!activeTab || activeTab.tabType !== 'PURCHASE') return;

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

  useEffect(() => {
    if (permissions.includes(PERMISSIONS.SUPPLIERS_MANAGE)) {
      void loadSuppliers();
    }
    void loadLoyaltySettings();
  }, []);

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

  return {
    customerLookup, setCustomerLookup,
    customerSearchResults, setCustomerSearchResults,
    customerLookupLoading,
    loyaltyHistoryOpen, setLoyaltyHistoryOpen,
    loyaltyHistory,
    loyaltySettingsOpen, setLoyaltySettingsOpen,
    loyaltySettingsSaving,
    customerNameModalOpen, setCustomerNameModalOpen,
    customerNameInput, setCustomerNameInput,
    suppliers, setSuppliers,
    suppliersLoading, setSuppliersLoading,
    editingSupplier, setEditingSupplier,
    supplierManagerOpen, setSupplierManagerOpen,
    loadSuppliers, loadLoyaltySettings,
    searchCustomers, openLoyaltyHistory,
    openCustomerNameModal, handleSaveCustomerName,
    openCreateSupplier, openEditSupplier,
    handleSaveLoyaltySettings,
  };
}
