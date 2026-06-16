import { useState } from 'react';
import { App as AntApp, Input, Modal } from 'antd';
import { api } from '../api';
import { LANG } from '../lang';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function ChangePasswordModal({ open, onClose }: Props) {
  const { message } = AntApp.useApp();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleOk = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      message.warning(LANG.changePasswordRequired);
      return;
    }

    if (newPassword !== confirmPassword) {
      message.warning(LANG.changePasswordMismatch);
      return;
    }

    if (oldPassword === newPassword) {
      message.warning(LANG.changePasswordSame);
      return;
    }

    setSaving(true);

    try {
      await api.post('/auth/change-password', { oldPassword, newPassword });
      message.success(LANG.changePasswordSuccess);
      reset();
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string } } };

      if (axiosErr.response?.status === 409) {
        message.warning(LANG.changePasswordSame);
      } else if (axiosErr.response?.status === 401) {
        message.error(LANG.errChangePasswordWrong);
      } else {
        message.error(axiosErr.response?.data?.message ?? LANG.errChangePassword);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!saving) {
      reset();
      onClose();
    }
  };

  return (
    <Modal
      title={LANG.changePasswordTitle}
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={saving}
      okText={LANG.save}
      cancelText={LANG.cancel}
      destroyOnClose
      maskClosable={!saving}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
        <Input.Password
          size="large"
          placeholder={LANG.changePasswordOld}
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          autoFocus
        />
        <Input.Password
          size="large"
          placeholder={LANG.changePasswordNew}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <Input.Password
          size="large"
          placeholder={LANG.changePasswordConfirm}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>
    </Modal>
  );
}
