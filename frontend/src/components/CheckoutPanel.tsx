import {
  AutoComplete,
  Button,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Radio,
  Select,
  Skeleton,
  Spin,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  EditOutlined,
  PlusOutlined,
  ShoppingCartOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { AppSettings, Customer, LoyaltySettings, OverviewDetail, OverviewRecord, PosDraftTab, PurchaseMeta, Supplier } from '../types';
import { LANG } from '../lang';

const { Text } = Typography;

type CheckoutPanelProps = {
  currentView: 'POS' | 'OVERVIEW';
  isPurchaseTab: boolean;
  isReturnTab: boolean;
  activeTab: PosDraftTab | null;
  summary: {
    subtotal: number;
    costAmount: number;
    rawTotal: number;
    pointsDiscount: number;
    total: number;
    grossProfitAmount: number;
    grossProfitPercent: number;
  };
  purchaseMetaMap: Record<number, PurchaseMeta>;
  suppliers: Supplier[];
  suppliersLoading: boolean;
  customerLookup: Customer | null;
  customerSearchResults: Customer[];
  customerLookupLoading: boolean;
  loyaltySettings: LoyaltySettings | null;
  overviewLoading: boolean;
  overviewRecordTypeFilter: 'ALL' | 'SALE' | 'RETURN' | 'PURCHASE';
  showProfit: boolean;
  overviewTotalAmount: number;
  overviewTotalDiscount: number;
  overviewTotalLoyaltyDiscount: number;
  overviewTotalCost: number;
  overviewTotalRevenue: number;
  overviewGrossProfit: number;
  appSettings: AppSettings | null;
  filteredOverviewRecords: OverviewRecord[];
  overviewDetail: OverviewDetail | null;
  checkingOut: boolean;
  saving: boolean;
  buildVersion: string;
  onSetOverviewRecordTypeFilter: (value: 'ALL' | 'SALE' | 'RETURN' | 'PURCHASE') => void;
  onLoadOverviewDetail: (recordType: OverviewRecord['recordType'], id: number) => Promise<void>;
  onUpdatePurchaseMeta: (tabId: number, patch: Partial<PurchaseMeta>) => void;
  onUpdateActiveTab: (patch: Partial<PosDraftTab>) => void;
  onOpenCreateSupplier: () => void;
  onOpenEditSupplier: () => void;
  onOpenCustomerNameModal: () => void;
  onOpenLoyaltyHistory: () => void;
  onPrintReceipt: () => void;
  onCheckout: () => Promise<void>;
  formatPoints: (value: number) => string;
  paymentOptions: { label: string; value: string }[];
};

export function CheckoutPanel(props: CheckoutPanelProps) {
  const {
    currentView,
    isPurchaseTab,
    isReturnTab,
    activeTab,
    summary,
    purchaseMetaMap,
    suppliers,
    suppliersLoading,
    customerLookup,
    customerSearchResults,
    customerLookupLoading,
    loyaltySettings,
    overviewLoading,
    overviewRecordTypeFilter,
    showProfit,
    overviewTotalAmount,
    overviewTotalDiscount,
    overviewTotalLoyaltyDiscount,
    overviewTotalCost,
    overviewTotalRevenue,
    overviewGrossProfit,
    filteredOverviewRecords,
    overviewDetail,
    checkingOut,
    saving,
    buildVersion,
    onSetOverviewRecordTypeFilter,
    onLoadOverviewDetail,
    onUpdatePurchaseMeta,
    onUpdateActiveTab,
    onOpenCreateSupplier,
    onOpenEditSupplier,
    onOpenCustomerNameModal,
    onOpenLoyaltyHistory,
    onPrintReceipt,
    onCheckout,
    appSettings,
    formatPoints,
    paymentOptions,
  } = props;

  return (
    <aside className={`checkout-panel ${isPurchaseTab ? 'checkout-panel-purchase' : ''} ${currentView === 'OVERVIEW' ? 'checkout-panel-overview' : ''}`}>
      {currentView === 'OVERVIEW' ? (
        <>
          <div className="checkout-header">
            <div className="checkout-user">{LANG.overviewTitle}</div>
            <div className="checkout-meta">
              <div className="checkout-time">{filteredOverviewRecords.length}</div>
              <div className="checkout-build">{buildVersion}</div>
            </div>
          </div>
          <div className="overview-grid-top">
            <div className="overview-grid-count">{LANG.overviewTotalRecords}: <strong>{filteredOverviewRecords.length}</strong></div>
            <Select
              size="small"
              value={overviewRecordTypeFilter}
              options={[
                { label: LANG.overviewFilterAll, value: 'ALL' },
                { label: LANG.overviewTypeSale, value: 'SALE' },
                { label: LANG.overviewTypeReturn, value: 'RETURN' },
                { label: LANG.overviewTypePurchase, value: 'PURCHASE' },
              ]}
              onChange={(value) => onSetOverviewRecordTypeFilter(value as 'ALL' | 'SALE' | 'RETURN' | 'PURCHASE')}
            />
          </div>
          <div className={`overview-grid-head${showProfit ? '' : ' overview-grid-hide-profit'}`}>
            <div className="overview-grid-cell">{LANG.overviewHeaderCode}</div>
            <div className="overview-grid-cell">{LANG.overviewHeaderTime}</div>
            <div className="overview-grid-cell">{LANG.overviewHeaderTotal}</div>
            <div className="overview-grid-cell">{LANG.overviewHeaderDiscount}</div>
            <div className="overview-grid-cell">{LANG.overviewHeaderLoyaltyDiscount}</div>
            <div className="overview-grid-cell">{LANG.overviewHeaderCost}</div>
            <div className="overview-grid-cell">{LANG.overviewHeaderRevenue}</div>
            {showProfit && <div className="overview-grid-cell">{LANG.overviewGrossProfit}</div>}
          </div>
          <div className="overview-grid-body">
            {filteredOverviewRecords.length ? filteredOverviewRecords.map((record) => (
              <button
                key={`${record.recordType}-${record.id}`}
                type="button"
                className={`overview-grid-row overview-grid-row-${record.recordType.toLowerCase()}${showProfit ? '' : ' overview-grid-hide-profit'} ${overviewDetail?.header.id === record.id && overviewDetail?.header.recordType === record.recordType ? ' is-active' : ''}`}
                onClick={() => void onLoadOverviewDetail(record.recordType, record.id)}
              >
                <div className="overview-grid-cell overview-grid-code">
                  <span className={`overview-grid-badge overview-badge-${record.recordType.toLowerCase()}`}>
                    {record.recordType === 'PURCHASE' ? LANG.overviewBadgePurchase : record.recordType === 'RETURN' ? LANG.overviewBadgeReturn : LANG.overviewBadgeSale}
                  </span>
                  {record.code}
                </div>
                <div className="overview-grid-cell">{dayjs(record.eventAt).format('DD/MM/YYYY HH:mm')}</div>
                <div className="overview-grid-cell">{record.subtotalAmount.toLocaleString('vi-VN')}</div>
                <div className={`overview-grid-cell${record.discountAmount > 0 ? ' has-discount' : ''}`}>{record.discountAmount.toLocaleString('vi-VN')}</div>
                <div className={`overview-grid-cell${record.loyaltyDiscountAmount > 0 ? ' has-discount' : ''}`}>{record.loyaltyDiscountAmount.toLocaleString('vi-VN')}</div>
                <div className="overview-grid-cell">{Math.round(record.costAmount).toLocaleString('vi-VN')}</div>
                <div className="overview-grid-cell">{Math.round(record.revenueAmount).toLocaleString('vi-VN')}</div>
                {showProfit && <div className="overview-grid-cell overview-grid-profit">{Math.round(record.revenueAmount - record.costAmount).toLocaleString('vi-VN')}</div>}
              </button>
            )) : (
              <div className="empty-stage">
                {overviewLoading ? (
                  <Skeleton active paragraph={{ rows: 4 }} />
                ) : (
                  <Empty description={LANG.overviewEmpty} />
                )}
              </div>
            )}
          </div>
          <div className={`overview-grid-foot${showProfit ? '' : ' overview-grid-hide-profit'}`}>
            <div className="overview-grid-cell overview-grid-foot-label">{LANG.overviewTotalValue}</div>
            <div className="overview-grid-cell overview-grid-foot-val"></div>
            <div className="overview-grid-cell overview-grid-foot-val">{overviewTotalAmount.toLocaleString('vi-VN')}</div>
            <div className="overview-grid-cell overview-grid-foot-val">{overviewTotalDiscount.toLocaleString('vi-VN')}</div>
            <div className="overview-grid-cell overview-grid-foot-val">{overviewTotalLoyaltyDiscount.toLocaleString('vi-VN')}</div>
            <div className="overview-grid-cell overview-grid-foot-val">{Math.round(overviewTotalCost).toLocaleString('vi-VN')}</div>
            <div className="overview-grid-cell overview-grid-foot-val">{overviewTotalRevenue.toLocaleString('vi-VN')}</div>
            {showProfit && <div className="overview-grid-cell overview-grid-foot-val">{Math.round(overviewGrossProfit).toLocaleString('vi-VN')}</div>}
          </div>
        </>
      ) : (
        <>
          <div className="checkout-header">
            <div className="checkout-user">{isPurchaseTab ? LANG.purchaseHeader : LANG.cashier}</div>
            <div className="checkout-meta">
              <div className="checkout-time">{LANG.storeNameSale}</div>
              <div className="checkout-build">{buildVersion}</div>
            </div>
          </div>

          {isPurchaseTab ? (
            <div className="checkout-form checkout-form-purchase">
              <div className="purchase-status-top">
                <span className="purchase-status-label">{LANG.purchaseStatus}</span>
                <Tag color="red" className="purchase-status-tag">
                  {purchaseMetaMap[activeTab?.id ?? 0]?.status ?? LANG.purchaseDraftStatus}
                </Tag>
              </div>

              <div className="purchase-inline-row">
                <span className="purchase-inline-label">{LANG.purchaseImportDate}</span>
                <DatePicker
                  className="purchase-inline-control"
                  value={
                    purchaseMetaMap[activeTab?.id ?? 0]?.importDate
                      ? dayjs(purchaseMetaMap[activeTab?.id ?? 0]?.importDate)
                      : dayjs()
                  }
                  format="DD/MM/YYYY"
                  onChange={(date) => {
                    if (activeTab) {
                      onUpdatePurchaseMeta(activeTab.id, {
                        importDate: date
                          ? date.format('YYYY-MM-DD')
                          : new Date().toISOString().slice(0, 10),
                      });
                    }
                  }}
                />
              </div>

              <Form layout="vertical">
                <Form.Item label={LANG.purchaseOrderCode}>
                  <Input
                    value={
                      purchaseMetaMap[activeTab?.id ?? 0]?.purchaseOrderCode ??
                      activeTab?.tabCode ??
                      ''
                    }
                    readOnly
                  />
                </Form.Item>

                <Form.Item label={LANG.purchaseSupplier}>
                  <div className="purchase-supplier-row">
                    <Select
                      allowClear
                      showSearch
                      className="purchase-supplier-select"
                      loading={suppliersLoading}
                      placeholder={LANG.purchaseSearchSupplier}
                      optionFilterProp="label"
                      value={purchaseMetaMap[activeTab?.id ?? 0]?.supplierId ?? undefined}
                      options={suppliers.map((supplier) => ({
                        label: supplier.code ? `${supplier.name} (${supplier.code})` : supplier.name,
                        value: supplier.id,
                      }))}
                      notFoundContent={LANG.purchaseNoSuppliersFound}
                      onChange={(value) =>
                        activeTab &&
                        onUpdatePurchaseMeta(activeTab.id, {
                          supplierId: value ?? null,
                        })
                      }
                    />
                    <Tooltip title={LANG.purchaseAddSupplier}>
                      <Button
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={onOpenCreateSupplier}
                      />
                    </Tooltip>
                    <Tooltip title={LANG.purchaseEditSupplier}>
                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        disabled={!purchaseMetaMap[activeTab?.id ?? 0]?.supplierId}
                        onClick={onOpenEditSupplier}
                      />
                    </Tooltip>
                  </div>
                </Form.Item>

                <Form.Item label={LANG.purchaseSupplierOrderCode}>
                  <Input
                    value={purchaseMetaMap[activeTab?.id ?? 0]?.supplierOrderCode ?? ''}
                    onChange={(event) =>
                      activeTab &&
                      onUpdatePurchaseMeta(activeTab.id, {
                        supplierOrderCode: event.target.value,
                      })
                    }
                  />
                </Form.Item>

                <Form.Item label={LANG.purchaseSupplierInvoiceCode}>
                  <Input
                    value={purchaseMetaMap[activeTab?.id ?? 0]?.supplierInvoiceCode ?? ''}
                    onChange={(event) =>
                      activeTab &&
                      onUpdatePurchaseMeta(activeTab.id, {
                        supplierInvoiceCode: event.target.value,
                      })
                    }
                  />
                </Form.Item>
              </Form>

              <div className="summary-rows">
                <div className="summary-row">
                  <Text>{LANG.subtotalSale}</Text>
                  <Text>{summary.subtotal.toLocaleString('vi-VN')}</Text>
                </div>
                <div className="summary-row">
                  <Text>{LANG.discount}</Text>
                  <InputNumber
                    min={0}
                    controls={false}
                    value={activeTab?.discountAmount ?? 0}
                    onChange={(value) =>
                      onUpdateActiveTab({ discountAmount: Number(value ?? 0) })
                    }
                  />
                </div>
                <div className="summary-row summary-row-primary">
                  <Text>{LANG.purchasePayable}</Text>
                  <Text>{summary.total.toLocaleString('vi-VN')}</Text>
                </div>
                <div className="summary-row">
                  <Text>{LANG.purchasePaidAmount}</Text>
                  <InputNumber
                    min={0}
                    controls={false}
                    value={purchaseMetaMap[activeTab?.id ?? 0]?.supplierPaidAmount ?? 0}
                    onChange={(value) =>
                      activeTab &&
                      onUpdatePurchaseMeta(activeTab.id, {
                        supplierPaidAmount: Number(value ?? 0),
                      })
                    }
                  />
                </div>
                <div className="summary-row">
                  <Text>{LANG.purchaseDebtAmount}</Text>
                  <Text>
                    {Math.max(
                      0,
                      summary.total -
                        (purchaseMetaMap[activeTab?.id ?? 0]?.supplierPaidAmount ?? 0),
                    ).toLocaleString('vi-VN')}
                  </Text>
                </div>
              </div>
            </div>
          ) : (
            <Form layout="vertical" className="checkout-form">
              <Form.Item
                label={
                  <span className="customer-label-text">
                    {customerLookup
                      ? `${LANG.customer}: ${customerLookup.fullName ?? activeTab?.customerName ?? LANG.customerNew} · ${formatPoints(customerLookup.currentPoints)} ${LANG.pointsUnit}`
                      : activeTab?.customerPhone
                        ? `${LANG.customer}: ${activeTab?.customerName ?? LANG.customerNew} · 0 ${LANG.pointsUnit}`
                        : LANG.customer}
                  </span>
                }
              >
                <div className="customer-input-row">
                  <AutoComplete
                    className="customer-autocomplete"
                    value={activeTab?.customerPhone ?? ''}
                    options={customerSearchResults.map((customer) => ({
                      value: customer.phoneNumber,
                      label: (
                        <div>
                          <div>
                            <strong>{customer.fullName ?? LANG.customerNew}</strong>
                          </div>
                          <div>
                            {customer.phoneNumber} · {LANG.customerPoints}: {formatPoints(customer.currentPoints)}
                          </div>
                        </div>
                      ),
                    }))}
                    onSelect={(value) => {
                      const customer = customerSearchResults.find((item) => item.phoneNumber === value) ?? null;
                      if (customer) {
                        onUpdateActiveTab({
                          customerPhone: customer.phoneNumber,
                          customerId: customer.id,
                          customerName: customer.fullName,
                        });
                      }
                    }}
                    onChange={(value) =>
                      onUpdateActiveTab({
                        customerPhone: String(value || '').trim() || null,
                        customerId: null,
                        customerName: null,
                        redeemedPoints: 0,
                      })
                    }
                    filterOption={false}
                  >
                    <Input placeholder={LANG.placeholderCustomer} />
                  </AutoComplete>
                  <Tooltip
                    title={
                      activeTab?.customerName
                        ? LANG.editCustomerName
                        : LANG.addCustomerName
                    }
                  >
                    <Button icon={<PlusOutlined />} onClick={onOpenCustomerNameModal} />
                  </Tooltip>
                  <Button
                    size="small"
                    disabled={!customerLookup?.id}
                    onClick={onOpenLoyaltyHistory}
                    style={{ marginLeft: 6 }}
                  >
                    {LANG.pointHistory}
                  </Button>
                  {customerLookupLoading && <Spin size="small" />}
                </div>
              </Form.Item>

              <div style={{ borderTop: '1px solid #f0f2f5', marginTop: 4, paddingTop: 4 }}>
              <div className="summary-rows">
                {isReturnTab ? (
                  <>
                    <div className="summary-row">
                      <Text>{LANG.subtotalReturn}</Text>
                      <Text>{summary.subtotal.toLocaleString('vi-VN')}</Text>
                    </div>
                    <div className="summary-row">
                      <Text>{LANG.discount}</Text>
                      <InputNumber
                        min={0}
                        controls={false}
                        value={activeTab?.discountAmount ?? 0}
                        onChange={(value) =>
                          onUpdateActiveTab({ discountAmount: Number(value ?? 0) })
                        }
                      />
                    </div>
                    <div className="summary-row">
                      <Text>{LANG.returnFee}</Text>
                      <InputNumber
                        min={0}
                        controls={false}
                        value={activeTab?.customerPaidAmount ?? 0}
                        onChange={(value) =>
                          onUpdateActiveTab({ customerPaidAmount: Number(value ?? 0) })
                        }
                      />
                    </div>
                    <div className="summary-row summary-row-primary">
                      <Text>{LANG.refund}</Text>
                      <Text>
                        {Math.max(0, summary.subtotal - (activeTab?.discountAmount ?? 0) - (activeTab?.customerPaidAmount ?? 0)).toLocaleString('vi-VN')}
                      </Text>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="summary-row">
                      <Text>{LANG.subtotalSale}</Text>
                      <Text>{summary.subtotal.toLocaleString('vi-VN')}</Text>
                    </div>
                    <div className="summary-row">
                      <div className="summary-label-with-meta">
                        <Text>{LANG.discount}</Text>
                        {summary.subtotal > 0 ? (
                          <Text
                            style={{
                              color: summary.grossProfitPercent < 0 ? '#ff4d4f' : '#52c41a',
                              fontWeight: 600,
                              fontSize: 13,
                            }}
                          >
                            {LANG.grossProfitRateShort}{' '}
                            {summary.grossProfitPercent.toLocaleString('vi-VN', {
                              minimumFractionDigits: 1,
                              maximumFractionDigits: 1,
                            })}
                            %
                          </Text>
                        ) : null}
                      </div>
                      <InputNumber
                        min={0}
                        controls={false}
                        value={activeTab?.discountAmount ?? 0}
                        onChange={(value) =>
                          onUpdateActiveTab({ discountAmount: Number(value ?? 0) })
                        }
                      />
                    </div>
                    <div className="summary-row">
                      <Text>{LANG.redeemPoints}</Text>
                      <InputNumber
                        min={0}
                        step={0.0001}
                        controls={false}
                        value={activeTab?.redeemedPoints ?? 0}
                        onChange={(value) =>
                          onUpdateActiveTab({
                            redeemedPoints: Number(
                              Math.max(
                                0,
                                Math.min(
                                  Number(value ?? 0),
                                  customerLookup?.currentPoints ?? Number(value ?? 0),
                                  loyaltySettings?.redeemAmountPerPoint
                                    ? Number(
                                        (summary.rawTotal / loyaltySettings.redeemAmountPerPoint).toFixed(4),
                                      )
                                    : Number(value ?? 0),
                                ),
                              ).toFixed(4),
                            ),
                          })
                        }
                      />
                    </div>
                    <div className="summary-row">
                      <Text>{LANG.loyaltyDiscount}</Text>
                      <Text>{summary.pointsDiscount.toLocaleString('vi-VN')}</Text>
                    </div>
                    <div className="summary-row summary-row-primary">
                      <Text>{LANG.customerPay}</Text>
                      <Text>{summary.total.toLocaleString('vi-VN')}</Text>
                    </div>
                    <div className="summary-row">
                      <Text>{LANG.earnPointsEstimate}</Text>
                      <Text>
                        {loyaltySettings?.earnAmountPerPoint
                          ? formatPoints(
                              Number((summary.total / loyaltySettings.earnAmountPerPoint).toFixed(4)),
                            )
                          : formatPoints(0)}
                      </Text>
                    </div>
                    <div className="summary-row">
                      <Text>{LANG.customerPaid}</Text>
                      <InputNumber
                        min={0}
                        controls={false}
                        value={activeTab?.customerPaidAmount ?? 0}
                        onChange={(value) =>
                          onUpdateActiveTab({ customerPaidAmount: Number(value ?? 0) })
                        }
                      />
                    </div>
                    {(() => {
                      const paid = activeTab?.customerPaidAmount ?? 0;
                      const changeAmount = paid - summary.total;
                      return changeAmount > 0 ? (
                        <div className="summary-row summary-row-change">
                          <Text>{LANG.change}</Text>
                          <Text>{changeAmount.toLocaleString('vi-VN')}</Text>
                        </div>
                      ) : null;
                    })()}
                  </>
                )}
              </div>
              </div>

              <Form.Item label={LANG.paymentMethod}>
                <Radio.Group
                  className="payment-methods"
                  value={activeTab?.paymentMethod ?? 'CASH'}
                  options={paymentOptions}
                  onChange={(event) =>
                    onUpdateActiveTab({ paymentMethod: event.target.value })
                  }
                />
              </Form.Item>
            </Form>
          )}

          <div style={{ borderTop: '1px solid #f0f2f5', marginTop: 2, paddingTop: 4 }} />
          {!isReturnTab && !isPurchaseTab && (
            <div className="payment-quick">
              <button type="button" className="quick-money" onClick={() => onUpdateActiveTab({ customerPaidAmount: appSettings?.quickPayAmount1 ?? 100000 })}>
                {(appSettings?.quickPayAmount1 ?? 100000).toLocaleString(appSettings?.locale ?? 'vi-VN')}
              </button>
              <button type="button" className="quick-money" onClick={() => onUpdateActiveTab({ customerPaidAmount: appSettings?.quickPayAmount2 ?? 200000 })}>
                {(appSettings?.quickPayAmount2 ?? 200000).toLocaleString(appSettings?.locale ?? 'vi-VN')}
              </button>
              <button type="button" className="quick-money" onClick={() => onUpdateActiveTab({ customerPaidAmount: appSettings?.quickPayAmount3 ?? 500000 })}>
                {(appSettings?.quickPayAmount3 ?? 500000).toLocaleString(appSettings?.locale ?? 'vi-VN')}
              </button>
              <button type="button" className="quick-money quick-money-exact" onClick={() => onUpdateActiveTab({ customerPaidAmount: summary.total })}>
                {LANG.exactChange}
              </button>
            </div>
          )}

          <div className={`process-bar${saving || checkingOut ? ' process-bar-active' : ''}${!saving && !checkingOut ? ' process-bar-done' : ''}`}>
            <span className="process-bar-dot" />
            <span className="process-bar-label">
              {saving ? LANG.saving : checkingOut ? LANG.checkingOut : LANG.synced}
            </span>
          </div>

          <div className="checkout-actions">
            {isPurchaseTab ? (
              <>
                <Button
                  className="print-button"
                  onClick={onPrintReceipt}
                >
                  {LANG.print}
                </Button>
                <Button
                  type="primary"
                  className="pay-button"
                  loading={checkingOut}
                  onClick={() => void onCheckout()}
                >
                  {LANG.purchaseComplete}
                </Button>
              </>
            ) : (
              <>
                <Button
                  className="print-button"
                  onClick={onPrintReceipt}
                >
                  {LANG.print}
                </Button>
                {isReturnTab ? (
                  <Button
                    type="primary"
                    danger
                    className="pay-button"
                    icon={<SwapOutlined />}
                    loading={checkingOut}
                    onClick={() => void onCheckout()}
                  >
                    {LANG.completeReturn}
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    className="pay-button"
                    icon={<ShoppingCartOutlined />}
                    loading={checkingOut}
                    onClick={() => void onCheckout()}
                  >
                    {LANG.completePayment}
                  </Button>
                )}
              </>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
