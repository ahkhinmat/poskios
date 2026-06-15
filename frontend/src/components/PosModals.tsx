import { WarningOutlined } from '@ant-design/icons';
import { Button, Form, Input, InputNumber, List, Modal, Typography } from 'antd';
import { LANG } from '../lang';
import type { LoyaltyHistoryResponse, LoyaltySettings, PosDraftTab, ReceiptPreviewData, Supplier } from '../types';
import { ProductManager } from './ProductManager';
import { ReceiptModal } from './ReceiptModal';
import { SupplierManager } from './SupplierManager';

const { Text } = Typography;

type PosModalsProps = {
  closeTabTarget: number | null;
  receiptPreview: ReceiptPreviewData | null;
  loyaltyHistoryOpen: boolean;
  loyaltyHistory: LoyaltyHistoryResponse | null;
  customerNameModalOpen: boolean;
  customerNameInput: string;
  loyaltySettingsOpen: boolean;
  loyaltySettings: LoyaltySettings | null;
  loyaltySettingsSaving: boolean;
  supplierManagerOpen: boolean;
  editingSupplier: Supplier | null;
  productManagerOpen: boolean;
  passwordDialogOpen: boolean;
  passwordInput: string;
  activeTabPhone: string | null;
  formatPoints: (value: number) => string;
  setCloseTabTarget: (v: number | null) => void;
  setActiveTabId: (id: number) => void;
  doDeleteTab: (id: number) => Promise<void>;
  setReceiptPreview: (v: ReceiptPreviewData | null) => void;
  handlePrintReceipt: (receipt: ReceiptPreviewData) => void;
  setLoyaltyHistoryOpen: (v: boolean) => void;
  setCustomerNameModalOpen: (v: boolean) => void;
  handleSaveCustomerName: () => void;
  setCustomerNameInput: (v: string) => void;
  setLoyaltySettingsOpen: (v: boolean) => void;
  handleSaveLoyaltySettings: () => Promise<void>;
  setLoyaltySettings: React.Dispatch<React.SetStateAction<LoyaltySettings | null>>;
  setSupplierManagerOpen: (v: boolean) => void;
  setEditingSupplier: (v: Supplier | null) => void;
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  activeTab: PosDraftTab | null;
  updatePurchaseMeta: (tabId: number, meta: Partial<{ supplierId: number }>) => void;
  setProductManagerOpen: (v: boolean) => void;
  setPasswordDialogOpen: (v: boolean) => void;
  setPasswordInput: (v: string) => void;
  handlePasswordSubmit: () => void;
};

export function PosModals({
  closeTabTarget,
  receiptPreview,
  loyaltyHistoryOpen,
  loyaltyHistory,
  customerNameModalOpen,
  customerNameInput,
  loyaltySettingsOpen,
  loyaltySettings,
  loyaltySettingsSaving,
  supplierManagerOpen,
  editingSupplier,
  productManagerOpen,
  passwordDialogOpen,
  passwordInput,
  activeTabPhone,
  formatPoints,
  setCloseTabTarget,
  setActiveTabId,
  doDeleteTab,
  setReceiptPreview,
  handlePrintReceipt,
  setLoyaltyHistoryOpen,
  setCustomerNameModalOpen,
  handleSaveCustomerName,
  setCustomerNameInput,
  setLoyaltySettingsOpen,
  handleSaveLoyaltySettings,
  setLoyaltySettings,
  setSupplierManagerOpen,
  setEditingSupplier,
  setSuppliers,
  activeTab,
  updatePurchaseMeta,
  setProductManagerOpen,
  setPasswordDialogOpen,
  setPasswordInput,
  handlePasswordSubmit,
}: PosModalsProps) {
  return (
    <>
      <Modal
        title={LANG.closeTab}
        open={closeTabTarget != null}
        onCancel={() => setCloseTabTarget(null)}
        footer={[
          <Button key="cancel" onClick={() => setCloseTabTarget(null)}>
            {LANG.cancel}
          </Button>,
          <Button key="pay" type="primary" onClick={() => {
            setActiveTabId(closeTabTarget!);
            setCloseTabTarget(null);
          }}>
            {LANG.closeTabPay}
          </Button>,
          <Button key="discard" danger onClick={async () => {
            const id = closeTabTarget;
            setCloseTabTarget(null);
            if (id != null) await doDeleteTab(id);
          }}>
            {LANG.closeTabDiscard} <WarningOutlined />
          </Button>,
        ]}
        destroyOnClose
      >
        {LANG.closeTabUnsaved}
      </Modal>

      <ReceiptModal
        receiptPreview={receiptPreview}
        onClose={() => setReceiptPreview(null)}
        onPrint={handlePrintReceipt}
      />

      <Modal
        title={LANG.pointHistory}
        open={loyaltyHistoryOpen}
        onCancel={() => setLoyaltyHistoryOpen(false)}
        footer={null}
        width={640}
        destroyOnClose
      >
        <div className="loyalty-history-header">
          <Text strong>{loyaltyHistory?.customer.fullName ?? LANG.customerNew}</Text>
          <Text type="secondary">
            {loyaltyHistory?.customer.phoneNumber ?? ''} · {LANG.customerPoints}:{' '}
            {formatPoints(loyaltyHistory?.customer.currentPoints ?? 0)}
          </Text>
        </div>
        <List
          dataSource={loyaltyHistory?.items ?? []}
          locale={{ emptyText: LANG.overviewEmpty }}
          renderItem={(item) => (
              <List.Item>
                <div className="loyalty-history-item">
                  <div>
                    <Text strong>{({
                      EARN: LANG.transactionEarn,
                      REDEEM: LANG.transactionRedeem,
                      SALE_OUT: LANG.transactionSaleOut,
                      RETURN_IN: LANG.transactionReturnIn,
                      RETURN_REVERSE: LANG.transactionReturnReverse,
                      PURCHASE_IN: LANG.transactionPurchaseIn,
                    } as Record<string, string>)[item.transactionType] ?? item.transactionType}</Text>
                    <div>
                    <Text type="secondary">
                      {new Date(item.transactionAt).toLocaleString('vi-VN')}
                    </Text>
                  </div>
                  {item.notes && <div><Text type="secondary">{item.notes}</Text></div>}
                </div>
                <div className="loyalty-history-values">
                  <Text strong>{item.pointsChange > 0 ? `+${formatPoints(item.pointsChange)}` : formatPoints(item.pointsChange)}</Text>
                  <Text type="secondary">{formatPoints(item.balanceAfter)}</Text>
                </div>
              </div>
            </List.Item>
          )}
        />
      </Modal>

      <Modal
        title={LANG.customerName}
        open={customerNameModalOpen}
        onCancel={() => setCustomerNameModalOpen(false)}
        onOk={handleSaveCustomerName}
        okText={LANG.save}
        cancelText={LANG.cancel}
        destroyOnClose
      >
        <Form layout="vertical">
          <Form.Item label={LANG.customerPhone}>
            <Input value={activeTabPhone ?? ''} readOnly />
          </Form.Item>
        </Form>
        <Input
          value={customerNameInput}
          onChange={(event) => setCustomerNameInput(event.target.value)}
          placeholder={LANG.customerName}
          maxLength={150}
        />
      </Modal>

      <Modal
        title={LANG.loyaltyConfig}
        open={loyaltySettingsOpen}
        onCancel={() => setLoyaltySettingsOpen(false)}
        onOk={() => void handleSaveLoyaltySettings()}
        confirmLoading={loyaltySettingsSaving}
        okText={LANG.saveConfig}
        cancelText={LANG.cancel}
        destroyOnClose
      >
        <Form layout="vertical" className="loyalty-settings-form">
          <Form.Item label={LANG.earnAmountPerPoint}>
            <InputNumber
              min={1}
              controls={false}
              value={loyaltySettings?.earnAmountPerPoint ?? 10000}
              onChange={(value) =>
                setLoyaltySettings((current) => ({
                  earnAmountPerPoint: Number(value ?? 10000),
                  redeemAmountPerPoint: current?.redeemAmountPerPoint ?? 1000,
                  minimumRedeemPoints: current?.minimumRedeemPoints ?? 10,
                  pointsExpiryDays: current?.pointsExpiryDays ?? null,
                }))
              }
            />
          </Form.Item>
          <Form.Item label={LANG.redeemAmountPerPoint}>
            <InputNumber
              min={1}
              controls={false}
              value={loyaltySettings?.redeemAmountPerPoint ?? 1000}
              onChange={(value) =>
                setLoyaltySettings((current) => ({
                  earnAmountPerPoint: current?.earnAmountPerPoint ?? 10000,
                  redeemAmountPerPoint: Number(value ?? 1000),
                  minimumRedeemPoints: current?.minimumRedeemPoints ?? 10,
                  pointsExpiryDays: current?.pointsExpiryDays ?? null,
                }))
              }
            />
          </Form.Item>
          <Form.Item label={LANG.minimumRedeemPoints}>
            <InputNumber
              min={0}
              step={0.0001}
              controls={false}
              value={loyaltySettings?.minimumRedeemPoints ?? 10}
              onChange={(value) =>
                setLoyaltySettings((current) => ({
                  earnAmountPerPoint: current?.earnAmountPerPoint ?? 10000,
                  redeemAmountPerPoint: current?.redeemAmountPerPoint ?? 1000,
                  minimumRedeemPoints: Number(value ?? 10),
                  pointsExpiryDays: current?.pointsExpiryDays ?? null,
                }))
              }
            />
          </Form.Item>
          <Form.Item label={LANG.pointsExpiryDays}>
            <InputNumber
              min={0}
              controls={false}
              value={loyaltySettings?.pointsExpiryDays ?? 0}
              onChange={(value) =>
                setLoyaltySettings((current) => ({
                  earnAmountPerPoint: current?.earnAmountPerPoint ?? 10000,
                  redeemAmountPerPoint: current?.redeemAmountPerPoint ?? 1000,
                  minimumRedeemPoints: current?.minimumRedeemPoints ?? 10,
                  pointsExpiryDays: Number(value ?? 0) || null,
                }))
              }
            />
          </Form.Item>
        </Form>
      </Modal>

      <SupplierManager
        open={supplierManagerOpen}
        supplier={editingSupplier}
        onClose={() => {
          setSupplierManagerOpen(false);
          setEditingSupplier(null);
        }}
        onSaved={(savedSupplier) => {
          setSupplierManagerOpen(false);
          setEditingSupplier(null);
          setSuppliers((current) => {
            const next = current.filter((supplier) => supplier.id !== savedSupplier.id);
            next.push(savedSupplier);
            next.sort((left, right) => left.name.localeCompare(right.name, 'vi'));
            return next;
          });

          if (activeTab?.tabType === 'PURCHASE') {
            updatePurchaseMeta(activeTab.id, { supplierId: savedSupplier.id });
          }
        }}
      />

      <ProductManager open={productManagerOpen} onClose={() => setProductManagerOpen(false)} />

      <Modal
        title={LANG.overviewTitle}
        open={passwordDialogOpen}
        onCancel={() => { setPasswordDialogOpen(false); setPasswordInput(''); }}
        footer={[
          <Button key="ok" type="primary" onClick={handlePasswordSubmit}>
            {LANG.overviewRefresh}
          </Button>,
        ]}
        width={320}
        destroyOnClose
      >
        <Input.Password
          value={passwordInput}
          onChange={(e) => setPasswordInput(e.target.value)}
          onPressEnter={handlePasswordSubmit}
          autoFocus
          placeholder=""
        />
      </Modal>
    </>
  );
}
