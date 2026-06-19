import { useEffect, useMemo, useState } from 'react';
import {
  App as AntApp,
  Badge,
  Button,
  Checkbox,
  Input,
  Modal,
  Select,
  Skeleton,
  Tabs,
  Tag,
  Tooltip,
  Tree,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import { api } from '../api';
import { LANG } from '../lang';
import type { RegistryModule, Role, User as UserType } from '../types';

type Props = { open: boolean; onClose: () => void };

type UserWithRoles = UserType & {
  role?: Role;
  userRoles?: { role: Role }[];
};

export function PermissionPage({ open, onClose }: Props) {
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'roles' | 'users'>('roles');

  // Data
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [registry, setRegistry] = useState<RegistryModule[]>([]);

  // Role selection
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [directPerms, setDirectPerms] = useState<Set<string>>(new Set());
  const [effPerms, setEffPerms] = useState<Set<string>>(new Set());
  const [roleSearch, setRoleSearch] = useState('');

  // Role form
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formParentId, setFormParentId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // User
  const [userSearch, setUserSearch] = useState('');
  const [editUser, setEditUser] = useState<UserWithRoles | null>(null);
  const [editUserRoleIds, setEditUserRoleIds] = useState<number[]>([]);

  // ---- Data loading ----
  const loadData = async () => {
    setLoading(true);
    try {
      const [rolesRes, registryRes, usersRes] = await Promise.all([
        api.get('/auth/roles'),
        api.get('/auth/roles/permission-registry'),
        api.get('/auth/users'),
      ]);
      const r = rolesRes.data.data ?? [];
      setRoles(r);
      setRegistry(registryRes.data.data ?? []);
      setUsers(usersRes.data.data ?? []);
      if (r.length && !selectedCode) setSelectedCode(r[0].code);
    } catch {
      message.error('Không tải được dữ liệu');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!open) return;
    loadData();
  }, [open]);

  useEffect(() => {
    if (selectedCode) loadPerms(selectedCode);
  }, [selectedCode]);

  const loadPerms = async (code: string) => {
    try {
      const [directRes, effRes] = await Promise.all([
        api.get(`/auth/roles/${code}/permissions`),
        api.get(`/auth/roles/${code}/effective-permissions`),
      ]);
      setDirectPerms(new Set(directRes.data.data ?? []));
      setEffPerms(new Set(effRes.data.data ?? []));
    } catch {
      setDirectPerms(new Set());
      setEffPerms(new Set());
    }
  };

  const inheritedPerms = useMemo(() => {
    const inherited = new Set(effPerms);
    for (const p of directPerms) inherited.delete(p);
    return inherited;
  }, [directPerms, effPerms]);

  const selectedRole = roles.find((r) => r.code === selectedCode);

  // ---- Role CRUD ----
  const openCreate = () => {
    setFormCode('');
    setFormName('');
    setFormDesc('');
    setFormParentId(selectedRole?.id ?? null);
    setRoleModalOpen(true);
  };

  const openEdit = () => {
    if (!selectedRole) return;
    setFormCode(selectedRole.code);
    setFormName(selectedRole.name);
    setFormDesc(selectedRole.description ?? '');
    setFormParentId(selectedRole.parentId);
    setRoleModalOpen(true);
  };

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const isEditing = !!formCode && roles.some((r) => r.code === formCode);

  const handleSaveRole = async () => {
    if (!formCode.trim() || !formName.trim()) {
      message.warning('Mã và tên không được để trống');
      return;
    }
    setSaving(true);
    try {
      if (isEditing) {
        await api.put(`/auth/roles/${formCode}`, {
          name: formName.trim(),
          description: formDesc.trim() || undefined,
          parentId: formParentId,
        });
        message.success('Đã cập nhật vai trò');
      } else {
        await api.post('/auth/roles', {
          code: formCode.trim(),
          name: formName.trim(),
          description: formDesc.trim() || undefined,
          parentId: formParentId,
        });
        message.success('Đã tạo vai trò mới');
        setSelectedCode(formCode.trim());
      }
      setRoleModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      message.error(axiosErr.response?.data?.message ?? 'Lỗi lưu vai trò');
    }
    setSaving(false);
  };

  const handleDelete = (code: string) => {
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
            setSelectedCode(roles.find((r) => r.code !== code)?.code ?? null);
          }
          await loadData();
        } catch (err: unknown) {
          const axiosErr = err as { response?: { data?: { message?: string } } };
          message.error(axiosErr.response?.data?.message ?? 'Không thể xóa');
        }
      },
    });
  };

  // ---- Permission toggling ----
  const togglePerm = (perm: string) => {
    setDirectPerms((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) next.delete(perm);
      else next.add(perm);
      return next;
    });
  };

  const toggleModule = (modulePerms: string[]) => {
    const allChecked = modulePerms.every((p) => directPerms.has(p));
    setDirectPerms((prev) => {
      const next = new Set(prev);
      for (const p of modulePerms) {
        if (allChecked) next.delete(p);
        else next.add(p);
      }
      return next;
    });
  };

  const handleSavePerms = async () => {
    if (!selectedCode) return;
    setSaving(true);
    try {
      await api.put(`/auth/roles/${selectedCode}/permissions`, {
        permissions: Array.from(directPerms),
      });
      message.success(LANG.settingsSaved);
      await loadPerms(selectedCode);
    } catch {
      message.error(LANG.settingsSaveError);
    }
    setSaving(false);
  };

  // ---- User actions ----
  const openUserRoleEditor = (user: UserWithRoles) => {
    setEditUser(user);
    setEditUserRoleIds(user.userRoles?.map((ur) => ur.role.id) ?? []);
  };

  const handleSaveUserRoles = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      await api.put(`/auth/users/${editUser.id}/roles`, { roleIds: editUserRoleIds });
      message.success('Đã cập nhật vai trò');
      setEditUser(null);
      const res = await api.get('/auth/users');
      setUsers(res.data.data ?? []);
    } catch {
      message.error('Lỗi cập nhật');
    }
    setSaving(false);
  };

  // ---- Derived data ----

  const buildTree = (): DataNode[] => {
    const childrenMap = new Map<number | null, Role[]>();
    for (const r of roles) {
      const key = r.parentId;
      if (!childrenMap.has(key)) childrenMap.set(key, []);
      childrenMap.get(key)!.push(r);
    }
    const build = (parentId: number | null): DataNode[] =>
      (childrenMap.get(parentId) ?? []).map((r) => ({
        key: r.code,
        title: (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 0',
              fontWeight: selectedCode === r.code ? 600 : 400,
            }}
          >
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.name}
            </span>
            <Tooltip title={`${effPerms?.size ?? 0} quyền`}>
              <Badge count={effPerms?.size ?? 0} style={{ backgroundColor: '#1677ff', fontSize: 10 }} />
            </Tooltip>
          </div>
        ),
        icon: <UserOutlined style={{ fontSize: 12 }} />,
        isLeaf: !childrenMap.has(r.id),
      }));

    return build(null);
  };

  const treeData = useMemo(() => buildTree(), [roles, selectedCode, effPerms]);

  const getPermStatus = (perm: string): 'direct' | 'inherited' | 'none' => {
    if (directPerms.has(perm)) return 'direct';
    if (inheritedPerms.has(perm)) return 'inherited';
    return 'none';
  };

  const filteredUsers = users.filter(
    (u) =>
      !userSearch ||
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.fullName.toLowerCase().includes(userSearch.toLowerCase()),
  );

  const content = (
    <div style={{ display: 'flex', height: '65vh', gap: 0 }}>
      {/* Sidebar */}
      <div
        style={{
          width: 260,
          minWidth: 260,
          borderRight: '1px solid #f0f0f0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
          <Input
            size="small"
            placeholder="Tìm vai trò..."
            prefix={<SearchOutlined />}
            value={roleSearch}
            onChange={(e) => setRoleSearch(e.target.value)}
          />
        </div>
        <div style={{ padding: '8px 12px' }}>
          <Button type="dashed" size="small" icon={<PlusOutlined />} block onClick={openCreate}>
            Thêm vai trò
          </Button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '0 8px' }}>
          {loading ? (
            <Skeleton active paragraph={{ rows: 4 }} />
          ) : (
            <Tree
              treeData={treeData as DataNode[]}
              selectedKeys={selectedCode ? [selectedCode] : []}
              onSelect={(keys) => {
                if (keys[0]) setSelectedCode(keys[0] as string);
              }}
              showIcon
              blockNode
            />
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!selectedRole ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>Chọn một vai trò để xem quyền</div>
        ) : (
          <>
            {/* Role Info Header */}
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: 1 }}>
                <Tag color="blue" style={{ fontSize: 14, padding: '2px 10px' }}>
                  {selectedRole.name}
                </Tag>
                <code style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>{selectedRole.code}</code>
                {selectedRole.parentId && (
                  <span style={{ marginLeft: 8, fontSize: 12, color: '#888' }}>
                    Kế thừa: <strong>{roles.find((r) => r.id === selectedRole.parentId)?.name ?? '?'}</strong>
                  </span>
                )}
              </div>
              <Tooltip title="Sửa thông tin">
                <Button size="small" icon={<EditOutlined />} onClick={openEdit} />
              </Tooltip>
              <Tooltip title="Xóa">
                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(selectedRole.code)} />
              </Tooltip>
            </div>

            {/* Permission Matrix */}
            <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {registry.map((mod) => {
                  const modulePerms = mod.actions.map((a) => a.perm);
                  const allChecked = modulePerms.every((p) => directPerms.has(p));
                  const someChecked = modulePerms.some((p) => directPerms.has(p));
                  return (
                    <div key={mod.key}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 14,
                          marginBottom: 6,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <Checkbox
                          checked={allChecked}
                          indeterminate={!allChecked && someChecked}
                          onChange={() => toggleModule(modulePerms)}
                        />
                        {mod.label}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 4,
                          paddingLeft: 24,
                        }}
                      >
                        {mod.actions.map((a) => {
                          const status = getPermStatus(a.perm);
                          const disabled = status === 'inherited';
                          const inheritedFrom =
                            disabled && selectedRole?.parentId
                              ? roles.find((r) => r.id === selectedRole.parentId)?.name
                              : null;
                          return (
                            <Tooltip
                              key={a.perm}
                              title={
                                disabled
                                  ? `Kế thừa từ ${inheritedFrom ?? 'parent role'}`
                                  : undefined
                              }
                            >
                              <Tag
                                style={{
                                  cursor: disabled ? 'not-allowed' : 'pointer',
                                  opacity: status === 'none' ? 0.5 : 1,
                                  fontStyle: disabled ? 'italic' : undefined,
                                  borderColor: status === 'direct' ? '#1677ff' : undefined,
                                  userSelect: 'none',
                                  margin: 0,
                                }}
                                color={status === 'direct' ? 'blue' : 'default'}
                                onClick={() => {
                                  if (!disabled) togglePerm(a.perm);
                                }}
                              >
                                {a.label}
                                {status === 'inherited' && ' (kế thừa)'}
                              </Tag>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Save Button */}
            <div
              style={{
                padding: '8px 16px',
                borderTop: '1px solid #f0f0f0',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <Button type="primary" loading={saving} onClick={handleSavePerms}>
                {LANG.save}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  const usersContent = (
    <div style={{ padding: 16 }}>
      <Input
        size="small"
        placeholder="Tìm người dùng..."
        prefix={<SearchOutlined />}
        value={userSearch}
        onChange={(e) => setUserSearch(e.target.value)}
        style={{ marginBottom: 12, maxWidth: 300 }}
      />
      {loading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f0f0f0', fontSize: 13, color: '#888' }}>
              <th style={{ textAlign: 'left', padding: '8px 12px' }}>Tên đăng nhập</th>
              <th style={{ textAlign: 'left', padding: '8px 12px' }}>Họ tên</th>
              <th style={{ textAlign: 'left', padding: '8px 12px' }}>Trạng thái</th>
              <th style={{ textAlign: 'left', padding: '8px 12px' }}>Vai trò</th>
              <th style={{ textAlign: 'right', padding: '8px 12px' }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '8px 12px' }}>{u.username}</td>
                <td style={{ padding: '8px 12px' }}>{u.fullName}</td>
                <td style={{ padding: '8px 12px' }}>
                  {u.isActive ? (
                    <Tag color="green" style={{ fontSize: 11 }}>
                      Hoạt động
                    </Tag>
                  ) : (
                    <Tag color="red" style={{ fontSize: 11 }}>
                      Khóa
                    </Tag>
                  )}
                </td>
                <td style={{ padding: '8px 12px' }}>
                  <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    {u.role && <Tag color="blue">{u.role.name}</Tag>}
                    {u.userRoles?.map((ur) => (
                      <Tag key={ur.role.id}>{ur.role.name}</Tag>
                    ))}
                  </div>
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                  <Button size="small" onClick={() => openUserRoleEditor(u)}>
                    Gán vai trò
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <>
      <Modal
        title="Phân quyền hệ thống"
        open={open}
        onCancel={onClose}
        width="90vw"
        style={{ maxWidth: 1200, top: 20 }}
        footer={null}
        destroyOnClose
      >
        <Tabs
          activeKey={tab}
          onChange={(k) => setTab(k as 'roles' | 'users')}
          items={[
            { key: 'roles', label: 'Vai trò & Quyền', children: content },
            { key: 'users', label: 'Người dùng', children: usersContent },
          ]}
          style={{ marginTop: -8 }}
        />
      </Modal>

      {/* Create/Edit Role Modal */}
      <Modal
        title={isEditing ? `Sửa vai trò ${formCode}` : 'Thêm vai trò mới'}
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
              disabled={isEditing}
              placeholder="VD: SUPERVISOR"
            />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500, fontSize: 13 }}>Tên</div>
            <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="VD: Giám sát" />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500, fontSize: 13 }}>Mô tả</div>
            <Input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Mô tả vai trò..." />
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
                .filter((r) => r.code !== formCode)
                .map((r) => ({ label: `${r.name} (${r.code})`, value: r.id }))}
            />
          </div>
        </div>
      </Modal>

      {/* Assign User Roles Modal */}
      <Modal
        title={`Gán vai trò — ${editUser?.fullName ?? ''}`}
        open={!!editUser}
        onCancel={() => setEditUser(null)}
        onOk={handleSaveUserRoles}
        confirmLoading={saving}
        okText={LANG.save}
        cancelText={LANG.cancel}
      >
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          placeholder="Chọn vai trò..."
          value={editUserRoleIds}
          onChange={setEditUserRoleIds}
          options={roles.map((r) => ({ label: `${r.name} (${r.code})`, value: r.id }))}
        />
        {editUser && (
          <div style={{ marginTop: 12, fontSize: 13, color: '#888' }}>
            Vai trò chính: <Tag color="blue">{editUser.role?.name}</Tag>
          </div>
        )}
      </Modal>
    </>
  );
}
