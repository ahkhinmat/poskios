import { useEffect, useState } from 'react';
import { App as AntApp, Modal, Select, Skeleton, Table, Tag, Badge } from 'antd';
import { api } from '../api';
import { LANG } from '../lang';
import type { Role } from '../types';

type UserWithRoles = {
  id: number;
  username: string;
  fullName: string;
  phoneNumber: string | null;
  email: string | null;
  isActive: boolean;
  roleId: number;
  role?: Role;
  userRoles?: { role: Role }[];
};

type Props = {
  open: boolean;
  onClose: () => void;
};

export function UserManager({ open, onClose }: Props) {
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [editingUser, setEditingUser] = useState<UserWithRoles | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);

  const loadData = async () => {
    const [usersRes, rolesRes] = await Promise.all([
      api.get('/auth/users').catch(() => null),
      api.get('/auth/roles').catch(() => null),
    ]);
    if (usersRes) setUsers(usersRes.data.data ?? []);
    if (rolesRes) setRoles(rolesRes.data.data ?? []);
    if (!usersRes) message.error('Không tải được danh sách người dùng');
  };

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [open]);

  const openRoleEditor = (user: UserWithRoles) => {
    setEditingUser(user);
    setSelectedRoleIds(user.userRoles?.map((ur) => ur.role.id) ?? []);
  };

  const handleSaveRoles = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      await api.put(`/auth/users/${editingUser.id}/roles`, {
        roleIds: selectedRoleIds,
      });
      message.success('Đã cập nhật vai trò');
      setEditingUser(null);
      await loadData();
    } catch {
      message.error('Lỗi cập nhật vai trò');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: 'Tên đăng nhập',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: 'Họ tên',
      dataIndex: 'fullName',
      key: 'fullName',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (v: boolean) =>
        v ? <Badge status="success" text="Hoạt động" /> : <Badge status="error" text="Khóa" />,
    },
    {
      title: 'Vai trò',
      key: 'roles',
      render: (_: unknown, record: UserWithRoles) => (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {record.role && <Tag color="blue">{record.role.name}</Tag>}
          {record.userRoles?.map((ur) => (
            <Tag key={ur.role.id}>{ur.role.name}</Tag>
          ))}
        </div>
      ),
    },
    {
      title: '',
      key: 'action',
      width: 80,
      render: (_: unknown, record: UserWithRoles) => (
        <a onClick={() => openRoleEditor(record)}>Gán vai trò</a>
      ),
    },
  ];

  return (
    <>
      <Modal
        title="Quản lý người dùng"
        open={open}
        onCancel={onClose}
        footer={null}
        width={800}
      >
        {loading ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : (
          <Table
            dataSource={users}
            columns={columns}
            rowKey="id"
            pagination={false}
            size="small"
          />
        )}
      </Modal>

      <Modal
        title={`Gán vai trò — ${editingUser?.fullName ?? ''}`}
        open={!!editingUser}
        onCancel={() => setEditingUser(null)}
        onOk={handleSaveRoles}
        confirmLoading={saving}
        okText={LANG.save}
        cancelText={LANG.cancel}
      >
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          placeholder="Chọn vai trò..."
          value={selectedRoleIds}
          onChange={setSelectedRoleIds}
          options={roles.map((r) => ({ label: `${r.name} (${r.code})`, value: r.id }))}
        />
        {editingUser && (
          <div style={{ marginTop: 12, fontSize: 13, color: '#888' }}>
            Vai trò chính: <Tag color="blue">{editingUser.role?.name}</Tag>
          </div>
        )}
      </Modal>
    </>
  );
}
