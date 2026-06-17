import { useEffect, useState } from 'react';
import { App as AntApp, Button, Checkbox, Modal, Skeleton, Tag } from 'antd';
import { api } from '../api';
import { LANG } from '../lang';
import { PERMISSION_GROUPS, PERMISSION_LABELS } from '../permissions';

type Role = {
  id: number;
  code: string;
  name: string;
  permissions: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

export function RoleManager({ open, onClose }: Props) {
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [checkedPerms, setCheckedPerms] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) {
      return;
    }

    setLoading(true);
    api.get('/auth/roles')
      .then((res) => {
        setRoles(res.data.data ?? []);
        const first = res.data.data?.[0];
        if (first) {
          setSelectedRole(first.code);
          loadPermissions(first.code);
        }
      })
      .catch(() => message.error('Không tải được danh sách vai trò'))
      .finally(() => setLoading(false));
  }, [open, message]);

  const loadPermissions = async (code: string) => {
    try {
      const res = await api.get(`/auth/roles/${code}/permissions`);
      const perms: string[] = res.data.data ?? [];
      setCheckedPerms(new Set(perms));
    } catch {
      setCheckedPerms(new Set());
    }
  };

  const handleRoleChange = (code: string) => {
    setSelectedRole(code);
    loadPermissions(code);
  };

  const togglePerm = (perm: string) => {
    setCheckedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) {
        next.delete(perm);
      } else {
        next.add(perm);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedRole) {
      return;
    }

    setSaving(true);

    try {
      await api.put(`/auth/roles/${selectedRole}/permissions`, {
        permissions: Array.from(checkedPerms),
      });
      message.success(LANG.settingsSaved);
    } catch {
      message.error(LANG.settingsSaveError);
    } finally {
      setSaving(false);
    }
  };

  const currentRole = roles.find((r) => r.code === selectedRole);

  return (
    <Modal
      title="Phân quyền"
      open={open}
      onCancel={onClose}
      width={600}
      footer={
        <Button type="primary" loading={saving} onClick={handleSave} disabled={!selectedRole}>
          {LANG.save}
        </Button>
      }
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <>
          <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
            {roles.map((role) => (
              <Tag
                key={role.code}
                color={selectedRole === role.code ? 'blue' : 'default'}
                style={{ cursor: 'pointer', padding: '4px 12px', fontSize: 14 }}
                onClick={() => handleRoleChange(role.code)}
              >
                {role.name}
              </Tag>
            ))}
          </div>

          {currentRole && (
            <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>
              Vai trò: <strong>{currentRole.name}</strong> — đánh dấu các quyền được phép
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {PERMISSION_GROUPS.map((group) => (
              <div key={group.label}>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>{group.label}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 8 }}>
                  {group.permissions.map((perm) => (
                    <Checkbox
                      key={perm}
                      checked={checkedPerms.has(perm)}
                      onChange={() => togglePerm(perm)}
                    >
                      {PERMISSION_LABELS[perm] ?? perm}
                    </Checkbox>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}
