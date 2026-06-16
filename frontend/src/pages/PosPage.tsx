import { useMemo, useState } from 'react';
import {
  App as AntApp,
  Button,
  Input,
  List,
  Spin,
  Tag,
  Tooltip,
} from 'antd';
import {
  AppstoreOutlined,
  BarChartOutlined,
  ContainerOutlined,
  EyeOutlined,
  ImportOutlined,
  LogoutOutlined,
  PlusOutlined,
  PrinterOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  SwapOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { LANG } from '../lang';
import { CheckoutPanel } from '../components/CheckoutPanel';
import { OverviewView } from '../components/OverviewView';
import { PosModals } from '../components/PosModals';
import { PurchaseTable } from '../components/PurchaseTable';
import { ReturnSearchPanel } from '../components/ReturnSearchPanel';
import { SaleList } from '../components/SaleList';
import { SettingsPage } from '../components/SettingsPage';
import { usePosPage } from '../hooks/usePosPage';

const PAYMENT_LABEL_MAP: Record<string, string> = {
  CASH: LANG.cash,
  BANK_TRANSFER: LANG.bankTransfer,
  CARD: LANG.card,
  EWALLET: LANG.ewallet,
};

const BUILD_VERSION = __APP_BUILD_VERSION__;

function formatPoints(value: number) {
  return value.toLocaleString('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

export function PosPage() {
  const { message } = AntApp.useApp();
  const p = usePosPage();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const paymentOptions = useMemo(() => {
    const methods = p.appSettings?.paymentMethods ?? 'CASH,BANK_TRANSFER,CARD,EWALLET';
    return methods.split(',').map((code) => ({
      value: code.trim(),
      label: PAYMENT_LABEL_MAP[code.trim()] ?? code.trim(),
    }));
  }, [p.appSettings?.paymentMethods]);

  if (p.loading) {
    return (
      <div className="screen-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="pos-shell">
      <div className={`pos-grid${p.currentView !== 'OVERVIEW' ? ' pos-grid-sale-mode' : ''}`}>
        <section className="sale-stage">
          <div className="sale-topbar">
            <div className="search-box">
              <Input
                ref={p.searchInputRef}
                size="middle"
                prefix={<SearchOutlined />}
                suffix={p.searching ? <Spin size="small" /> : null}
                placeholder={LANG.placeholderSearch}
                value={p.searchValue}
                onChange={(event) => p.setSearchValue(event.target.value)}
                onKeyDown={(event) => {
                  if (!p.searchResults.length) {
                    return;
                  }

                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    p.setHighlightedSearchIndex((current) =>
                      Math.min(
                        current < 0 ? 0 : current + 1,
                        p.searchResults.length - 1,
                      ),
                    );
                  }

                  if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    p.setHighlightedSearchIndex((current) =>
                      Math.max(current <= 0 ? 0 : current - 1, 0),
                    );
                  }
                }}
                onPressEnter={() => void p.handleResolveProduct()}
              />
            </div>

            <div className="draft-strip">
              {p.tabs.map((tab) => (
                <Tooltip key={tab.id} title={`${LANG.openTab}: ${tab.title}`}>
                  <button
                    type="button"
                    className={`draft-chip ${tab.id === p.activeTabId ? 'is-active' : ''}`}
                    onClick={() => p.setActiveTabId(tab.id)}
                  >
                    <span>{tab.title}</span>
                    {p.tabs.length > 1 && (
                      <Tooltip title={`${LANG.closeTab}: ${tab.title}`}>
                        <span
                          className="draft-chip-close"
                          onClick={(event) => {
                            event.stopPropagation();
                            void p.handleCloseTab(tab.id);
                          }}
                        >
                          {LANG.closeTabSymbol}
                        </span>
                      </Tooltip>
                    )}
                  </button>
                </Tooltip>
              ))}
              <Tooltip title={LANG.addTab}>
                <button
                  type="button"
                  className="draft-chip draft-chip-add"
                  onClick={() => void p.handleCreateTab()}
                >
                  <PlusOutlined />
                </button>
              </Tooltip>
            </div>

            <div className="topbar-actions">
              {p.lastScannedProductName ? (
                <Tag color="green">{LANG.scannedLabel} {p.lastScannedProductName}</Tag>
              ) : null}
              <Tag color={p.isManager ? 'blue' : 'default'}>
                {p.authUser?.fullName} · {p.authUser?.roleCode}
              </Tag>
              <Tooltip title={LANG.logoutTooltip}>
                <Button
                  size="small"
                  icon={<LogoutOutlined />}
                  onClick={p.handleLogout}
                />
              </Tooltip>
            </div>
          </div>

          {p.currentView === 'OVERVIEW' ? (
            <OverviewView
              overviewFromDate={p.overviewFromDate}
              overviewToDate={p.overviewToDate}
              overviewDetail={p.overviewDetail}
              overviewLoading={p.overviewLoading}
              isManager={p.isManager}
              setOverviewFromDate={p.setOverviewFromDate}
              setOverviewToDate={p.setOverviewToDate}
              loadOverview={p.loadOverview}
              ensureTabOfType={p.ensureTabOfType}
              focusSearchInput={p.focusSearchInput}
              openProductManager={p.openProductManager}
            />
          ) : (
            <>

          {!!p.searchResults.length && (
            <div className="search-results search-results-inline">
              <List
                dataSource={p.searchResults}
                renderItem={(product, index) => (
                  <List.Item
                    className={
                      index === p.highlightedSearchIndex
                        ? 'search-result-item is-active'
                        : 'search-result-item'
                    }
                    actions={[
                      <Button
                        key={product.productUnitId}
                        type="primary"
                        ghost
                        size="small"
                        style={{ borderRadius: 6, fontWeight: 600 }}
                        onClick={() => {
                          p.addProductToActiveTab(product);
                          p.clearSearchInput();
                          p.focusSearchInput();
                        }}
                      >
                        {LANG.select}
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={<span style={{ fontWeight: 600 }}>{product.name} <span style={{ color: '#6b7280', fontWeight: 400, fontSize: 12 }}>({product.unitName})</span></span>}
                      description={
                        <span style={{ fontSize: 12, color: '#6b7280' }}>
                          <span style={{ color: '#374151', fontWeight: 500 }}>{product.productCode}</span>
                          {' · '}{LANG.stockLabel} <strong style={{ color: product.stockOnHand > 0 ? '#16a34a' : '#ef4444' }}>{product.stockOnHand.toLocaleString('vi-VN')}</strong>
                          {' · '}<span style={{ color: '#059669', fontWeight: 600 }}>{product.salePrice.toLocaleString('vi-VN')}{LANG.currencySuffix}</span>
                        </span>
                      }
                    />
                  </List.Item>
                )}
              />
            </div>
          )}

          {p.isReturnTab && (
            <ReturnSearchPanel
              invoiceSearchType={p.invoiceSearchType}
              invoiceSearchValue={p.invoiceSearchValue}
              invoiceSearching={p.invoiceSearching}
              foundInvoices={p.foundInvoices}
              setInvoiceSearchType={p.setInvoiceSearchType}
              setInvoiceSearchValue={p.setInvoiceSearchValue}
              searchInvoice={p.searchInvoice}
              setInvoiceFromDate={p.setInvoiceFromDate}
              setInvoiceToDate={p.setInvoiceToDate}
              handleSelectInvoice={p.handleSelectInvoice}
            />
          )}

          {p.isPurchaseTab && (
            <div className="purchase-toolbar">
              <div className="purchase-toolbar-title">{LANG.purchaseHeader}</div>
              <div className="purchase-toolbar-actions">
                <Tooltip title={LANG.purchaseToolbarLayout}>
                  <button
                    type="button"
                    className="purchase-toolbar-button"
                    aria-label={LANG.purchaseToolbarLayout}
                    onClick={() => message.info(LANG.errFeatureDev)}
                  >
                    <AppstoreOutlined />
                  </button>
                </Tooltip>
                <Tooltip title={LANG.purchaseToolbarAdd}>
                  <button
                    type="button"
                    className="purchase-toolbar-button"
                    aria-label={LANG.purchaseToolbarAdd}
                    onClick={() => p.focusSearchInput()}
                  >
                    <PlusOutlined />
                  </button>
                </Tooltip>
                <Tooltip title={LANG.purchaseToolbarPrint}>
                  <button
                    type="button"
                    className="purchase-toolbar-button"
                    aria-label={LANG.purchaseToolbarPrint}
                    onClick={() => p.activeTab && void p.persistDraftTab(p.activeTab)}
                  >
                    <PrinterOutlined />
                  </button>
                </Tooltip>
                <Tooltip title={LANG.purchaseToolbarPreview}>
                  <button
                    type="button"
                    className="purchase-toolbar-button"
                    aria-label={LANG.purchaseToolbarPreview}
                    onClick={() => message.info(LANG.errFeatureDev)}
                  >
                    <EyeOutlined />
                  </button>
                </Tooltip>
                <Tooltip title={LANG.purchaseToolbarAlert}>
                  <button
                    type="button"
                    className="purchase-toolbar-button"
                    aria-label={LANG.purchaseToolbarAlert}
                    onClick={() => message.info(LANG.errFeatureDev)}
                  >
                    <WarningOutlined />
                  </button>
                </Tooltip>
              </div>
            </div>
          )}

          <div className="sale-list" ref={p.saleListRef}>
            {p.isPurchaseTab ? (
              <PurchaseTable
                items={p.activeTab?.items ?? []}
                removeItem={p.removeItem}
                updateItem={p.updateItem}
                getUnitOptionsForItem={p.getUnitOptionsForItem}
                loadProductUnitOptions={p.loadProductUnitOptions}
                handleChangeItemUnit={p.handleChangeItemUnit}
              />
            ) : (
              <SaleList
                items={p.activeTab?.items ?? []}
                removeItem={p.removeItem}
                updateItem={p.updateItem}
                getUnitOptionsForItem={p.getUnitOptionsForItem}
                loadProductUnitOptions={p.loadProductUnitOptions}
                handleChangeItemUnit={p.handleChangeItemUnit}
              />
            )}
          </div>

          <div className="sale-footer">
            <Input
              placeholder={LANG.orderNote}
              value={p.activeTab?.note ?? ''}
              onChange={(event) => p.updateActiveTab({ note: event.target.value || null })}
            />
            <div className="sale-modes">
              <Tooltip title={LANG.modeSaleTip}>
                <button
                  type="button"
                  className={`sale-mode ${!p.isReturnTab && !p.isPurchaseTab ? 'is-active' : ''}`}
                  onClick={async () => { await p.ensureTabOfType('SALE'); p.focusSearchInput(); }}
                >
                  <ShoppingCartOutlined style={{ fontSize: 14 }} /> {LANG.modeSale}
                </button>
              </Tooltip>
              <Tooltip title={LANG.modeReturnTip}>
                  <button
                    type="button"
                    className={`sale-mode ${p.isReturnTab ? 'is-active' : ''}`}
                    onClick={() => { if (!p.isReturnTab) void p.ensureTabOfType('RETURN'); }}
                  >
                    <SwapOutlined style={{ fontSize: 14 }} /> {LANG.modeReturn}
                  </button>
                </Tooltip>
              {p.isManager && (
                <>
                  <Tooltip title={LANG.modeImportTip}>
                    <button
                      type="button"
                      className={`sale-mode ${p.isPurchaseTab ? 'is-active' : ''}`}
                      onClick={() => { if (!p.isPurchaseTab) void p.ensureTabOfType('PURCHASE'); }}
                    >
                      <ImportOutlined style={{ fontSize: 14 }} /> {LANG.modeImport}
                    </button>
                  </Tooltip>
                  <Tooltip title={LANG.modeCategoryTip}>
                    <button
                      type="button"
                      className="sale-mode"
                      onClick={p.openProductManager}
                    >
                      <AppstoreOutlined style={{ fontSize: 14 }} /> {LANG.modeCategory}
                    </button>
                  </Tooltip>
                  <Tooltip title={LANG.modeOverviewTip}>
                    <button
                      type="button"
                      className="sale-mode"
                      onClick={p.handleOpenOverview}
                    >
                      <BarChartOutlined style={{ fontSize: 14 }} /> {LANG.modeOverview}
                    </button>
                  </Tooltip>
                  <Tooltip title={LANG.settingsTitle}>
                    <button
                      type="button"
                      className="sale-mode"
                      onClick={() => setSettingsOpen(true)}
                    >
                      <ContainerOutlined style={{ fontSize: 14 }} /> {LANG.settingsTitle}
                    </button>
                  </Tooltip>
                </>
              )}
            </div>
          </div>
            </>
          )}
        </section>

        <CheckoutPanel
          currentView={p.currentView}
          isPurchaseTab={p.isPurchaseTab}
          isReturnTab={p.isReturnTab}
          activeTab={p.activeTab}
          summary={p.summary}
          purchaseMetaMap={p.purchaseMetaMap}
          suppliers={p.suppliers}
          suppliersLoading={p.suppliersLoading}
          customerLookup={p.customerLookup}
          customerSearchResults={p.customerSearchResults}
          customerLookupLoading={p.customerLookupLoading}
          loyaltySettings={p.loyaltySettings}
          overviewLoading={p.overviewLoading}
          overviewRecordTypeFilter={p.overviewRecordTypeFilter}
          showProfit={p.showProfit}
          overviewTotalAmount={p.overviewTotalAmount}
          overviewTotalDiscount={p.overviewTotalDiscount}
          overviewTotalLoyaltyDiscount={p.overviewTotalLoyaltyDiscount}
          overviewTotalCost={p.overviewTotalCost}
          overviewTotalRevenue={p.overviewTotalRevenue}
          overviewGrossProfit={p.overviewGrossProfit}
          filteredOverviewRecords={p.filteredOverviewRecords}
          overviewDetail={p.overviewDetail}
          appSettings={p.appSettings}
          checkingOut={p.checkingOut}
          saving={p.saving}
          buildVersion={BUILD_VERSION}
          onSetOverviewRecordTypeFilter={p.setOverviewRecordTypeFilter}
          onLoadOverviewDetail={p.loadOverviewDetail}
          onUpdatePurchaseMeta={p.updatePurchaseMeta}
          onUpdateActiveTab={p.updateActiveTab}
          onOpenCreateSupplier={p.openCreateSupplier}
          onOpenEditSupplier={p.openEditSupplier}
          onOpenCustomerNameModal={p.openCustomerNameModal}
          onOpenLoyaltyHistory={p.openLoyaltyHistory}
          onPrintReceipt={() => p.handlePrintReceipt(p.buildDraftReceipt())}
          onCheckout={p.handleCheckout}
          formatPoints={formatPoints}
          paymentOptions={paymentOptions}
        />
      </div>

      <PosModals
        closeTabTarget={p.closeTabTarget}
        receiptPreview={p.receiptPreview}
        loyaltyHistoryOpen={p.loyaltyHistoryOpen}
        loyaltyHistory={p.loyaltyHistory}
        customerNameModalOpen={p.customerNameModalOpen}
        customerNameInput={p.customerNameInput}
        loyaltySettingsOpen={p.loyaltySettingsOpen}
        loyaltySettings={p.loyaltySettings}
        loyaltySettingsSaving={p.loyaltySettingsSaving}
        supplierManagerOpen={p.supplierManagerOpen}
        editingSupplier={p.editingSupplier}
        productManagerOpen={p.productManagerOpen}
        passwordDialogOpen={p.passwordDialogOpen}
        passwordInput={p.passwordInput}
        activeTabPhone={p.activeTab?.customerPhone ?? null}
        formatPoints={formatPoints}
        setCloseTabTarget={p.setCloseTabTarget}
        setActiveTabId={p.setActiveTabId}
        doDeleteTab={p.doDeleteTab}
        setReceiptPreview={p.setReceiptPreview}
        handlePrintReceipt={p.handlePrintReceipt}
        setLoyaltyHistoryOpen={p.setLoyaltyHistoryOpen}
        setCustomerNameModalOpen={p.setCustomerNameModalOpen}
        handleSaveCustomerName={p.handleSaveCustomerName}
        setCustomerNameInput={p.setCustomerNameInput}
        setLoyaltySettingsOpen={p.setLoyaltySettingsOpen}
        handleSaveLoyaltySettings={p.handleSaveLoyaltySettings}
        setLoyaltySettings={p.setLoyaltySettings}
        setSupplierManagerOpen={p.setSupplierManagerOpen}
        setEditingSupplier={p.setEditingSupplier}
        setSuppliers={p.setSuppliers}
        activeTab={p.activeTab}
        updatePurchaseMeta={p.updatePurchaseMeta}
        setProductManagerOpen={p.setProductManagerOpen}
        setPasswordDialogOpen={p.setPasswordDialogOpen}
        setPasswordInput={p.setPasswordInput}
        handlePasswordSubmit={p.handlePasswordSubmit}
      />

      <SettingsPage
        open={settingsOpen}
        onClose={() => {
          setSettingsOpen(false);
          void p.loadAppSettings();
        }}
      />
    </div>
  );
}
