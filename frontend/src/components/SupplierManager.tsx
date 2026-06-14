import {
  App as AntApp,
  Form,
  Input,
  Modal,
} from 'antd';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { LANG } from '../lang';
import type { ApiEnvelope, Supplier } from '../types';
import { extractApiErrorMessage } from '../utils/error';

type Props = {
  open: boolean;
  supplier?: Supplier | null;
  onClose: () => void;
  onSaved: (supplier: Supplier) => void;
};

export function SupplierManager({ open, supplier, onClose, onSaved }: Props) {
  const { message } = AntApp.useApp();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setCode(supplier?.code ?? '');
    setName(supplier?.name ?? '');
    setPhoneNumber(supplier?.phoneNumber ?? '');
    setAddress(supplier?.address ?? '');
  }, [open, supplier]);

  async function handleSaveSupplier() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      message.warning(LANG.errSupplierNameRequired);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code: code.trim() || null,
        name: trimmedName,
        phoneNumber: phoneNumber.trim() || null,
        address: address.trim() || null,
      };

      const response = supplier
        ? await api.put<ApiEnvelope<Supplier>>(`/pos/suppliers/${supplier.id}`, payload)
        : await api.post<ApiEnvelope<Supplier>>('/pos/suppliers', payload);

      message.success(
        supplier ? LANG.successSupplierUpdated : LANG.successSupplierCreated,
      );
      onSaved(response.data.data);
    } catch (error: unknown) {
      message.error(extractApiErrorMessage(error, LANG.errSupplierSave));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={supplier ? LANG.editSupplier : LANG.addSupplier}
      open={open}
      onCancel={onClose}
      onOk={() => void handleSaveSupplier()}
      confirmLoading={saving}
      okText={LANG.saveSupplier}
      cancelText={LANG.cancel}
      destroyOnClose
    >
      <Form layout="vertical" className="supplier-form">
        <Form.Item label={LANG.supplierName} required>
          <Input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={LANG.supplierNamePlaceholder}
            onPressEnter={() => void handleSaveSupplier()}
          />
        </Form.Item>

        <Form.Item label={LANG.supplierCode}>
          <Input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder={LANG.supplierCodePlaceholder}
          />
        </Form.Item>

        <Form.Item label={LANG.supplierPhone}>
          <Input
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(event.target.value)}
            placeholder={LANG.supplierPhonePlaceholder}
          />
        </Form.Item>

        <Form.Item label={LANG.supplierAddress}>
          <Input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder={LANG.supplierAddressPlaceholder}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
