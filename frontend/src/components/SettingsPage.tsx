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
  type: 'text' | 'number' | 'phone' | 'number-nullable';
} | null;

const DEFAULT_SETTINGS: AppSettings = {
  storeName: 'KA MART',
  storeAddress: '',
  storePhoneNumber: '',
  receiptHeader: '',
  receiptFooter: '',
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
      message.error(extractApiErrorMessage(err, 'Không thể tải cấu hình'));
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
      message.success('Đã lưu');
      closeEditor();
    } catch (err) {
      message.error(extractApiErrorMessage(err, 'Lỗi lưu cấu hình'));
    } finally {
      setSaving(false);
    }
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
              <button type="button" className="settings-row" onClick={() => openEditor({ key: 'storeName', label: LANG.settingsStoreName, type: 'text' })}>
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
                <span className="settings-row-value">{settings.loyaltyPointsExpiryDays != null ? `${settings.loyaltyPointsExpiryDays} ngày` : '—'}</span>
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
        {editField?.type === 'number' || editField?.type === 'number-nullable' ? (
          <InputNumber
            autoFocus
            className="settings-edit-input"
            value={editValue as number}
            min={0}
            onChange={(val) => setEditValue(val)}
            onPressEnter={() => void handleSave()}
          />
        ) : editField?.type === 'phone' ? (
          <Input
            autoFocus
            value={editValue as string}
            onChange={(e) => setEditValue(e.target.value)}
            onPressEnter={() => void handleSave()}
            placeholder={LANG.settingsStorePhonePlaceholder}
          />
        ) : (
          <Input.TextArea
            autoFocus
            rows={3}
            value={editValue as string}
            onChange={(e) => setEditValue(e.target.value)}
            onPressEnter={() => void handleSave()}
          />
        )}
      </Modal>
    </>
  );
}
