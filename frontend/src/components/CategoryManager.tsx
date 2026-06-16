import {
  App as AntApp,
  Button,
  Drawer,
  Input,
  Modal,
  Table,
  Tag,
} from 'antd';
import { useState } from 'react';
import { api } from '../api';
import { LANG } from '../lang';
import type { ApiEnvelope, Category } from '../types';
import { extractApiErrorMessage } from '../utils/error';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function CategoryManager({ open, onClose }: Props) {
  const { message } = AntApp.useApp();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryKeyword, setCategoryKeyword] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [categoryFormName, setCategoryFormName] = useState('');
  const [categorySaving, setCategorySaving] = useState(false);

  async function loadCategories(keyword?: string) {
    setCategoryLoading(true);
    try {
      const params = keyword?.trim() ? `?keyword=${encodeURIComponent(keyword.trim())}` : '';
      const res = await api.get<ApiEnvelope<Category[]>>(`/pos/categories${params}`);
      setCategories(res.data.data);
    } catch {
      message.error(LANG.errLoadCategories);
    } finally {
      setCategoryLoading(false);
    }
  }

  function openCategoryForm(category?: Category) {
    setEditingCategory(category ?? null);
    setCategoryFormName(category?.name ?? '');
    setCategoryFormOpen(true);
  }

  async function handleSaveCategory() {
    const name = categoryFormName.trim();
    if (!name) {
      message.warning(LANG.errCategoryNameRequired);
      return;
    }
    setCategorySaving(true);
    try {
      if (editingCategory) {
        await api.put<ApiEnvelope<Category>>(`/pos/categories/${editingCategory.id}`, { name });
        message.success(LANG.successCategoryUpdated);
      } else {
        await api.post<ApiEnvelope<Category>>('/pos/categories', { name });
        message.success(LANG.successCategoryCreated);
      }
      setCategoryFormOpen(false);
      setEditingCategory(null);
      void loadCategories(categoryKeyword);
    } catch {
      message.error(LANG.errCategorySave);
    } finally {
      setCategorySaving(false);
    }
  }

  async function handleDeleteCategory(category: Category) {
    Modal.confirm({
      title: LANG.confirmDelete,
      content: `"${category.name}"`,
      okText: LANG.deleteCategory,
      okType: 'danger',
      cancelText: LANG.cancel,
      onOk: async () => {
        try {
          await api.delete(`/pos/categories/${category.id}`);
          message.success(LANG.successCategoryDeleted);
          void loadCategories(categoryKeyword);
        } catch (error: unknown) {
          message.error(extractApiErrorMessage(error, LANG.errCategoryDelete));
        }
      },
    });
  }

  return (
    <Drawer
      title={LANG.categoryTitle}
      open={open}
      onClose={onClose}
      width={640}
    >
      <div className="category-modal-toolbar">
        <Input.Search
          className="category-search-input"
          placeholder={LANG.searchCategories}
          allowClear
          value={categoryKeyword}
          onChange={(e) => setCategoryKeyword(e.target.value)}
          onSearch={(value) => {
            setCategoryKeyword(value);
            void loadCategories(value);
          }}
        />
        <Button type="primary" onClick={() => openCategoryForm()}>
          {LANG.addCategory}
        </Button>
      </div>

      <Table
        dataSource={categories}
        rowKey="id"
        loading={categoryLoading}
        locale={{ emptyText: LANG.noCategoriesFound }}
        pagination={false}
        columns={[
          {
            title: LANG.categoryName,
            dataIndex: 'name',
            key: 'name',
          },
          {
            title: LANG.categoryStatus,
            dataIndex: 'isActive',
            key: 'isActive',
            width: 100,
            render: (isActive: boolean) =>
              isActive ? (
                <Tag color="green">{LANG.categoryStatusActive}</Tag>
              ) : (
                <Tag color="red">{LANG.categoryStatusInactive}</Tag>
              ),
          },
          {
            title: LANG.categoryActions,
            key: 'actions',
            width: 160,
            render: (_: unknown, record: Category) => (
              <span className="category-action-group">
                <Button size="small" onClick={() => openCategoryForm(record)}>
                  {LANG.editCategory}
                </Button>
                <Button size="small" danger onClick={() => void handleDeleteCategory(record)}>
                  {LANG.deleteCategory}
                </Button>
              </span>
            ),
          },
        ]}
      />

      <Modal
        title={editingCategory ? LANG.editCategory : LANG.addCategory}
        open={categoryFormOpen}
        onCancel={() => {
          setCategoryFormOpen(false);
          setEditingCategory(null);
        }}
        onOk={() => void handleSaveCategory()}
        confirmLoading={categorySaving}
        okText={LANG.saveCategory}
        cancelText={LANG.cancel}
        destroyOnClose
      >
        <div className="category-form-field">
          <div className="category-form-label">{LANG.categoryName}</div>
          <Input
            value={categoryFormName}
            onChange={(e) => setCategoryFormName(e.target.value)}
            placeholder={LANG.categoryNamePlaceholder}
            onPressEnter={() => void handleSaveCategory()}
            autoFocus
          />
        </div>
      </Modal>
    </Drawer>
  );
}
