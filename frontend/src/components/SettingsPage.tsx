import { App as AntApp, Input, InputNumber, Modal } from 'antd';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { LANG } from '../lang';
import type { ApiEnvelope, AppSettings } from '../types';
import { extractApiErrorMessage } from '../utils/error';

type Props = {
  open: boolean;
  onClose: () => void;
};

type EditField = {
  key: keyof AppSettings;
  label: string;
  type: 'text' | 'text-short' | 'number' | 'phone' | 'number-nullable';
} | null;

const DEFAULT_SETTINGS: AppSettings = {
  storeName: 'KA MART',
  storeAddress: '',
  storePhoneNumber: '',
  receiptHeader: '',
  receiptFooter: '',
  currencySuffix: 'đ',
  locale: 'vi-VN',
  receiptPaperWidth: '76mm',
  receiptPoweredBy: 'Powered by KIOTVIET',
  defaultPaymentMethod: 'CASH',
  quickPayAmount1: 100000,
  quickPayAmount2: 200000,
  quickPayAmount3: 500000,
  salesOrderPrefix: 'HD',
  returnOrderPrefix: 'TH',
  purchaseOrderPrefix: 'PNH',
  productSearchMaxResults: 8,
  invoiceSearchMaxResults: 20,
  customerSearchMaxResults: 10,
  defaultAddQuantity: 1,
  overviewPassword: '11111',
  cashierLabel: 'Thu ngân',
  productManagerPageSize: 30,
  searchDebounceMs: 250,
  autoSaveDebounceMs: 500,
  paymentMethods: 'CASH,BANK_TRANSFER,CARD,EWALLET',
  loyaltyEarnAmountPerPoint: 10000,
  loyaltyRedeemAmountPerPoint: 1000,
  loyaltyMinimumRedeemPoints: 10,
  loyaltyPointsExpiryDays: null,
};

export function SettingsPage({ open, onClose }: Props) {
  const { message } = AntApp.useApp();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [editField, setEditField] = useState<EditField>(null);
  const [editValue, setEditValue] = useState<string | number | null>('');

  useEffect(() => {
    if (!open) return;
    void loadSettings();
  }, [open]);

  async function loadSettings() {
    try {
      const res = await api.get<ApiEnvelope<AppSettings>>('/pos/settings');
      setSettings(res.data.data);
    } catch (err) {
      message.error(extractApiErrorMessage(err, LANG.settingsLoadError));
    }
  }

  function openEditor(field: NonNullable<EditField>) {
    setEditField(field);
    const val = settings[field.key];
    setEditValue(val ?? '');
  }

  function closeEditor() {
    setEditField(null);
    setEditValue('');
  }

  async function handleSave() {
    if (!editField) return;

    const key = editField.key;
    let patch: Partial<AppSettings>;

    if (editField.type === 'number-nullable') {
      patch = { [key]: editValue === '' || editValue === null ? null : Number(editValue) };
    } else if (editField.type === 'number') {
      patch = { [key]: Number(editValue ?? 0) };
    } else {
      patch = { [key]: String(editValue ?? '') };
    }

    setSaving(true);
    try {
      const res = await api.put<ApiEnvelope<AppSettings>>('/pos/settings', patch);
      setSettings(res.data.data);
      message.success(LANG.settingsSaved);
      closeEditor();
    } catch (err) {
      message.error(extractApiErrorMessage(err, LANG.settingsSaveError));
    } finally {
      setSaving(false);
    }
  }

  function renderEditInput() {
    if (!editField) return null;
    const isNumber = editField.type === 'number' || editField.type === 'number-nullable';
    if (isNumber) {
      return (
        <InputNumber
          autoFocus
          className="settings-edit-input"
          value={editValue as number}
          min={0}
          onChange={(val) => setEditValue(val)}
          onPressEnter={() => void handleSave()}
        />
      );
    }
    if (editField.type === 'phone') {
      return (
        <Input
          autoFocus
          value={editValue as string}
          onChange={(e) => setEditValue(e.target.value)}
          onPressEnter={() => void handleSave()}
          placeholder={LANG.settingsStorePhonePlaceholder}
        />
      );
    }
    if (editField.type === 'text') {
      return (
        <Input.TextArea
          autoFocus
          rows={3}
          value={editValue as string}
          onChange={(e) => setEditValue(e.target.value)}
          onPressEnter={() => void handleSave()}
        />
      );
    }
    return (
      <Input
        autoFocus
        value={editValue as string}
        onChange={(e) => setEditValue(e.target.value)}
        onPressEnter={() => void handleSave()}
      />
    );
  }

  return (
    <>
      <Modal
        title={LANG.settingsTitle}
        open={open}
        onCancel={onClose}
        footer={null}
        width={420}
        destroyOnClose
        className="settings-modal"
      >
        <div className="settings-page">
          {/* Store Info */}
          <div className="settings-section">
            <div className="settings-section-header">{LANG.settingsSectionStore}</div>
            <div className="settings-section-body">
              <button type="button" className="settings-row" onClick={() => openEditor({ key: 'storeName', label: LANG.settingsStoreName, type: 'text-short' })}>
                <span className="settings-row-label">{LANG.settingsStoreName}</span>
                <span className="settings-row-value">{settings.storeName}</span>
              </button>
              <button type="button" className="settings-row" onClick={() => openEditor({ key: 'storeAddress', label: LANG.settingsStoreAddress, type: 'text' })}>
                <span className="settings-row-label">{LANG.settingsStoreAddress}</span>
                <span className="settings-row-value">{settings.storeAddress || '—'}</span>
              </button>
              <button type="button" className="settings-row" onClick={() => openEditor({ key: 'storePhoneNumber', label: LANG.settingsStorePhone, type: 'phone' })}>
                <span className="settings-row-label">{LANG.settingsStorePhone}</span>
                <span className="settings-row-value">{settings.storePhoneNumber || '—'}</span>
              </button>
              <button type="button" className="settings-row" onClick={() => openEditor({ key: 'cashierLabel', label: LANG.settingsCashierLabel, type: 'text-short' })}>
                <span className="settings-row-label">{LANG.settingsCashierLabel}</span>
                <span className="settings-row-value">{settings.cashierLabel}</span>
              </button>
            </div>
          </div>

          {/* Receipt */}
          <div className="settings-section">
            <div className="settings-section-header">{LANG.settingsSectionReceipt}</div>
            <div className="settings-section-body">
              <button type="button" className="settings-row" onClick={() => openEditor({ key: 'receiptHeader', label: LANG.settingsReceiptHeader, type: 'text' })}>
                <span className="settings-row-label">{LANG.settingsReceiptHeader}</span>
                <span className="settings-row-value">{settings.receiptHeader || '—'}</span>
              </button>
              <button type="button" className="settings-row" onClick={() => openEditor({ key: 'receiptFooter', label: LANG.settingsReceiptFooter, type: 'text' })}>
                <span className="settings-row-label">{LANG.settingsReceiptFooter}</span>
                <span className="settings-row-value">{settings.receiptFooter || '—'}</span>
              </button>
              <button type="button" className="settings-row" onClick={() => openEditor({ key: 'receiptPaperWidth', label: LANG.settingsReceiptPaperWidth, type: 'text-short' })}>
                <span className="settings-row-label">{LANG.settingsReceiptPaperWidth}</span>
                <span className="settings-row-value">{settings.receiptPaperWidth}</span>
              </button>
              <button type="button" className="settings-row" onClick={() => openEditor({ key: 'receiptPoweredBy', label: LANG.settingsReceiptPoweredBy, type: 'text-short' })}>
                <span className="settings-row-label">{LANG.settingsReceiptPoweredBy}</span>
                <span className="settings-row-value">{settings.receiptPoweredBy}</span>
              </button>
              <button type="button" className="settings-row" onClick={() => openEditor({ key: 'currencySuffix', label: LANG.settingsCurrencySuffix, type: 'text-short' })}>
                <span className="settings-row-label">{LANG.settingsCurrencySuffix}</span>
                <span className="settings-row-value">{settings.currencySuffix}</span>
              </button>
            </div>
          </div>

          {/* Payment */}
          <div className="settings-section">
            <div className="settings-section-header">{LANG.settingsSectionPayment}</div>
            <div className="settings-section-body">
              <button type="button" className="settings-row" onClick={() => openEditor({ key: 'defaultPaymentMethod', label: LANG.settingsDefaultPaymentMethod, type: 'text-short' })}>
                <span className="settings-row-label">{LANG.settingsDefaultPaymentMethod}</span>
                <span className="settings-row-value">{settings.defaultPaymentMethod}</span>
              </button>
              <button type="button" className="settings-row" onClick={() => openEditor({ key: 'quickPayAmount1', label: LANG.settingsQuickPayAmount1, type: 'number' })}>
                <span className="settings-row-label">{LANG.settingsQuickPayAmount1}</span>
                <span className="settings-row-value">{settings.quickPayAmount1.toLocaleString('vi-VN')}</span>
              </button>
              <button type="button" className="settings-row" onClick={() => openEditor({ key: 'quickPayAmount2', label: LANG.settingsQuickPayAmount2, type: 'number' })}>
                <span className="settings-row-label">{LANG.settingsQuickPayAmount2}</span>
                <span className="settings-row-value">{settings.quickPayAmount2.toLocaleString('vi-VN')}</span>
              </button>
              <button type="button" className="settings-row" onClick={() => openEditor({ key: 'quickPayAmount3', label: LANG.settingsQuickPayAmount3, type: 'number' })}>
                <span className="settings-row-label">{LANG.settingsQuickPayAmount3}</span>
                <span className="settings-row-value">{settings.quickPayAmount3.toLocaleString('vi-VN')}</span>
              </button>
            </div>
          </div>

          {/* Auto Code */}
          <div className="settings-section">
            <div className="settings-section-header">{LANG.settingsSectionCode}</div>
            <div className="settings-section-body">
              <button type="button" className="settings-row" onClick={() => openEditor({ key: 'salesOrderPrefix', label: LANG.settingsSalesOrderPrefix, type: 'text-short' })}>
                <span className="settings-row-label">{LANG.settingsSalesOrderPrefix}</span>
                <span className="settings-row-value">{settings.salesOrderPrefix}</span>
              </button>
              <button type="button" className="settings-row" onClick={() => openEditor({ key: 'returnOrderPrefix', label: LANG.settingsReturnOrderPrefix, type: 'text-short' })}>
                <span className="settings-row-label">{LANG.settingsReturnOrderPrefix}</span>
                <span className="settings-row-value">{settings.returnOrderPrefix}</span>
              </button>
              <button type="button" className="settings-row" onClick={() => openEditor({ key: 'purchaseOrderPrefix', label: LANG.settingsPurchaseOrderPrefix, type: 'text-short' })}>
                <span className="settings-row-label">{LANG.settingsPurchaseOrderPrefix}</span>
                <span className="settings-row-value">{settings.purchaseOrderPrefix}</span>
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="settings-section">
            <div className="settings-section-header">{LANG.settingsSectionSearch}</div>
            <div className="settings-section-body">
              <button type="button" className="settings-row" onClick={() => openEditor({ key: 'productSearchMaxResults', label: LANG.settingsProductSearchMaxResults, type: 'number' })}>
                <span className="settings-row-label">{LANG.settingsProductSearchMaxResults}</span>
                <span className="settings-row-value">{settings.productSearchMaxResults}</span>
              </button>
              <button type="button" className="settings-row" onClick={() => openEditor({ key: 'invoiceSearchMaxResults', label: LANG.settingsInvoiceSearchMaxResults, type: 'number' })}>
                <span className="settings-row-label">{LANG.settingsInvoiceSearchMaxResults}</span>
                <span className="settings-row-value">{settings.invoiceSearchMaxResults}</span>
              </button>
              <button type="button" className="settings-row" onClick={() => openEditor({ key: 'customerSearchMaxResults', label: LANG.settingsCustomerSearchMaxResults, type: 'number' })}>
                <span className="settings-row-label">{LANG.settingsCustomerSearchMaxResults}</span>
                <span className="settings-row-value">{settings.customerSearchMaxResults}</span>
              </button>
            </div>
          </div>

          {/* Other */}
          <div className="settings-section">
            <div className="settings-section-header">{LANG.settingsSectionOther}</div>
            <div className="settings-section-body">
              <button type="button" className="settings-row" onClick={() => openEditor({ key: 'locale', label: LANG.settingsLocale, type: 'text-short' })}>
                <span className="settings-row-label">{LANG.settingsLocale}</span>
                <span className="settings-row-value">{settings.locale}</span>
              </button>
              <button type="button" className="settings-row" onClick={() => openEditor({ key: 'defaultAddQuantity', label: LANG.settingsDefaultAddQuantity, type: 'number' })}>
                <span className="settings-row-label">{LANG.settingsDefaultAddQuantity}</span>
                <span className="settings-row-value">{settings.defaultAddQuantity}</span>
              </button>
              <button type="button" className="settings-row" onClick={() => openEditor({ key: 'searchDebounceMs', label: LANG.settingsSearchDebounceMs, type: 'number' })}>
                <span className="settings-row-label">{LANG.settingsSearchDebounceMs}</span>
                <span className="settings-row-value">{settings.searchDebounceMs}ms</span>
              </button>
              <button type="button" className="settings-row" onClick={() => openEditor({ key: 'autoSaveDebounceMs', label: LANG.settingsAutoSaveDebounceMs, type: 'number' })}>
                <span className="settings-row-label">{LANG.settingsAutoSaveDebounceMs}</span>
                <span className="settings-row-value">{settings.autoSaveDebounceMs}ms</span>
              </button>
              <button type="button" className="settings-row" onClick={() => openEditor({ key: 'paymentMethods', label: LANG.settingsPaymentMethods, type: 'text-short' })}>
                <span className="settings-row-label">{LANG.settingsPaymentMethods}</span>
                <span className="settings-row-value">{settings.paymentMethods}</span>
              </button>
              <button type="button" className="settings-row" onClick={() => openEditor({ key: 'overviewPassword', label: LANG.settingsOverviewPassword, type: 'text-short' })}>
                <span className="settings-row-label">{LANG.settingsOverviewPassword}</span>
                <span className="settings-row-value">{'•'.repeat(settings.overviewPassword.length)}</span>
              </button>
              <button type="button" className="settings-row" onClick={() => openEditor({ key: 'productManagerPageSize', label: LANG.settingsProductManagerPageSize, type: 'number' })}>
                <span className="settings-row-label">{LANG.settingsProductManagerPageSize}</span>
                <span className="settings-row-value">{settings.productManagerPageSize}</span>
              </button>
            </div>
          </div>

          {/* Loyalty */}
          <div className="settings-section">
            <div className="settings-section-header">{LANG.settingsSectionLoyalty}</div>
            <div className="settings-section-body">
              <button type="button" className="settings-row" onClick={() => openEditor({ key: 'loyaltyEarnAmountPerPoint', label: LANG.earnAmountPerPoint, type: 'number' })}>
                <span className="settings-row-label">{LANG.earnAmountPerPoint}</span>
                <span className="settings-row-value">{settings.loyaltyEarnAmountPerPoint.toLocaleString('vi-VN')}</span>
              </button>
              <button type="button" className="settings-row" onClick={() => openEditor({ key: 'loyaltyRedeemAmountPerPoint', label: LANG.redeemAmountPerPoint, type: 'number' })}>
                <span className="settings-row-label">{LANG.redeemAmountPerPoint}</span>
                <span className="settings-row-value">{settings.loyaltyRedeemAmountPerPoint.toLocaleString('vi-VN')}</span>
              </button>
              <button type="button" className="settings-row" onClick={() => openEditor({ key: 'loyaltyMinimumRedeemPoints', label: LANG.minimumRedeemPoints, type: 'number' })}>
                <span className="settings-row-label">{LANG.minimumRedeemPoints}</span>
                <span className="settings-row-value">{settings.loyaltyMinimumRedeemPoints.toLocaleString('vi-VN')}</span>
              </button>
              <button type="button" className="settings-row" onClick={() => openEditor({ key: 'loyaltyPointsExpiryDays', label: LANG.pointsExpiryDays, type: 'number-nullable' })}>
                <span className="settings-row-label">{LANG.pointsExpiryDays}</span>
                <span className="settings-row-value">{settings.loyaltyPointsExpiryDays != null ? `${settings.loyaltyPointsExpiryDays} ${LANG.settingsDays}` : '—'}</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Edit Field Modal */}
      <Modal
        title={editField?.label ?? ''}
        open={!!editField}
        onCancel={closeEditor}
        onOk={() => void handleSave()}
        confirmLoading={saving}
        okText={LANG.save}
        cancelText={LANG.cancel}
        destroyOnClose
      >
        {renderEditInput()}
      </Modal>
    </>
  );
}
