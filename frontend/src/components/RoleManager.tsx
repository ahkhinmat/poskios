import { useEffect, useState } from 'react';
import { App as AntApp, Button, Checkbox, Input, Modal, Select, Skeleton, Tag, Tooltip } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { api } from '../api';
import { LANG } from '../lang';
import { PERMISSION_GROUPS, PERMISSION_LABELS } from '../permissions';
import type { Role } from '../types';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function RoleManager({ open, onClose }: Props) {
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [checkedPerms, setCheckedPerms] = useState<Set<string>>(new Set());

  // Role create/edit modal
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formParentId, setFormParentId] = useState<number | null>(null);

  const loadRoles = async () => {
    try {
      const res = await api.get('/auth/roles');
      const data: Role[] = res.data.data ?? [];
      setRoles(data);

      if (data.length && !selectedCode) {
        setSelectedCode(data[0].code);
        loadPermissions(data[0].code);
      }
    } catch {
      message.error('Không tải được danh sách vai trò');
    }
  };

  const loadPermissions = async (code: string) => {
    try {
      const res = await api.get(`/auth/roles/${code}/permissions`);
      setCheckedPerms(new Set(res.data.data ?? []));
    } catch {
      setCheckedPerms(new Set());
    }
  };

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    loadRoles().finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (selectedCode) loadPermissions(selectedCode);
  }, [selectedCode]);

  const handleRoleChange = (code: string) => {
    setSelectedCode(code);
  };

  const togglePerm = (perm: string) => {
    setCheckedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) next.delete(perm);
      else next.add(perm);
      return next;
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedCode) return;
    setSaving(true);
    try {
      await api.put(`/auth/roles/${selectedCode}/permissions`, {
        permissions: Array.from(checkedPerms),
      });
      message.success(LANG.settingsSaved);
    } catch {
      message.error(LANG.settingsSaveError);
    } finally {
      setSaving(false);
    }
  };

  // ---- Role CRUD ----
  const openCreateModal = () => {
    setEditingRole(null);
    setFormCode('');
    setFormName('');
    setFormDescription('');
    setFormParentId(null);
    setRoleModalOpen(true);
  };

  const openEditModal = (role: Role) => {
    setEditingRole(role);
    setFormCode(role.code);
    setFormName(role.name);
    setFormDescription(role.description ?? '');
    setFormParentId(role.parentId);
    setRoleModalOpen(true);
  };

  const handleSaveRole = async () => {
    if (!formCode.trim() || !formName.trim()) {
      message.warning('Mã và tên vai trò không được để trống');
      return;
    }

    setSaving(true);
    try {
      if (editingRole) {
        await api.put(`/auth/roles/${editingRole.code}`, {
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          parentId: formParentId,
        });
        message.success('Đã cập nhật vai trò');
      } else {
        await api.post('/auth/roles', {
          code: formCode.trim(),
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          parentId: formParentId,
        });
        message.success('Đã tạo vai trò mới');
      }
      setRoleModalOpen(false);
      await loadRoles();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      message.error(axiosErr.response?.data?.message ?? 'Lỗi lưu vai trò');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (code: string) => {
    Modal.confirm({
      title: `Xóa vai trò ${code}?`,
      content: 'Hành động này không thể hoàn tác.',
      okText: 'Xóa',
      okType: 'danger',
      cancelText: LANG.cancel,
      onOk: async () => {
        try {
          await api.delete(`/auth/roles/${code}`);
          message.success('Đã xóa vai trò');
          if (selectedCode === code) {
            setSelectedCode(null);
            setCheckedPerms(new Set());
          }
          await loadRoles();
        } catch (err: unknown) {
          const axiosErr = err as { response?: { data?: { message?: string } } };
          message.error(axiosErr.response?.data?.message ?? 'Không thể xóa');
        }
      },
    });
  };

  const currentRole = roles.find((r) => r.code === selectedCode);

  return (
    <>
      <Modal
        title="Phân quyền"
        open={open}
        onCancel={onClose}
        width={680}
        footer={
          <Button type="primary" loading={saving} onClick={handleSavePermissions} disabled={!selectedCode}>
            {LANG.save}
          </Button>
        }
      >
        {loading ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : (
          <>
            <div style={{ marginBottom: 12, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {roles.map((role) => (
                <Tag
                  key={role.code}
                  color={selectedCode === role.code ? 'blue' : 'default'}
                  style={{ cursor: 'pointer', padding: '4px 8px', fontSize: 13 }}
                  onClick={() => handleRoleChange(role.code)}
                >
                  {role.name}
                  <Tooltip title="Sửa">
                    <EditOutlined
                      style={{ marginLeft: 6, fontSize: 11, opacity: 0.6 }}
                      onClick={(e) => { e.stopPropagation(); openEditModal(role); }}
                    />
                  </Tooltip>
                  <Tooltip title="Xóa">
                    <DeleteOutlined
                      style={{ marginLeft: 4, fontSize: 11, opacity: 0.6, color: '#ff4d4f' }}
                      onClick={(e) => { e.stopPropagation(); handleDeleteRole(role.code); }}
                    />
                  </Tooltip>
                </Tag>
              ))}
              <Tooltip title="Thêm vai trò">
                <Button size="small" icon={<PlusOutlined />} onClick={openCreateModal} />
              </Tooltip>
            </div>

            {currentRole && (
              <div style={{ fontSize: 13, color: '#888', marginBottom: 6 }}>
                <strong>{currentRole.name}</strong>
                {currentRole.parentId && (
                  <span style={{ marginLeft: 8 }}>
                    (kế thừa: {roles.find((r) => r.id === currentRole.parentId)?.name ?? '?'})
                  </span>
                )}
                <span style={{ marginLeft: 8 }}>
                  — đánh dấu các quyền được phép
                </span>
              </div>
            )}

            <div style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {PERMISSION_GROUPS.map((group) => (
                <div key={group.label}>
                  <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 14 }}>{group.label}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingLeft: 8 }}>
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

      {/* Create/Edit Role Modal */}
      <Modal
        title={editingRole ? `Sửa vai trò ${editingRole.code}` : 'Thêm vai trò mới'}
        open={roleModalOpen}
        onCancel={() => setRoleModalOpen(false)}
        onOk={handleSaveRole}
        confirmLoading={saving}
        okText={LANG.save}
        cancelText={LANG.cancel}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500, fontSize: 13 }}>Mã</div>
            <Input
              value={formCode}
              onChange={(e) => setFormCode(e.target.value)}
              disabled={!!editingRole}
              placeholder="VD: SUPERVISOR"
            />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500, fontSize: 13 }}>Tên</div>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="VD: Giám sát"
            />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500, fontSize: 13 }}>Mô tả</div>
            <Input
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Mô tả vai trò..."
            />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500, fontSize: 13 }}>Kế thừa quyền từ</div>
            <Select
              allowClear
              style={{ width: '100%' }}
              placeholder="Không kế thừa"
              value={formParentId}
              onChange={(v) => setFormParentId(v ?? null)}
              options={roles
                .filter((r) => r.code !== editingRole?.code)
                .map((r) => ({ label: `${r.name} (${r.code})`, value: r.id }))}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
