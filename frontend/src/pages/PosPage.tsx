import { useEffect, useMemo, useRef, useState } from 'react';
import {
  App as AntApp,
  Spin,
} from 'antd';
import {
  ShoppingOutlined,
} from '@ant-design/icons';
import { LANG } from '../lang';
import { ChangePasswordModal } from '../components/ChangePasswordModal';
import { CheckoutPanel } from '../components/CheckoutPanel';
import { TopHeader } from '../components/TopHeader';
import { TransactionPanel } from '../components/TransactionPanel';
import { WorkspaceTabs } from '../components/WorkspaceTabs';
import { PosModals } from '../components/PosModals';
import { SettingsPage } from '../components/SettingsPage';
import { usePosPage } from '../hooks/usePosPage';
import { useSession } from '../hooks/useSession';
import { beep } from '../utils/sound';

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
  const sessionHook = useSession();
  const { session, isRunning, startSession, endSession, recordPayment } = sessionHook;
  const p = usePosPage(recordPayment);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [checkoutCollapsed, setCheckoutCollapsed] = useState(() => window.innerWidth <= 1024);
  const [panelRatio, setPanelRatio] = useState<number | null>(null);
  const posGridRef = useRef<HTMLDivElement>(null);

  const paymentOptions = useMemo(() => {
    const methods = p.appSettings?.paymentMethods ?? 'CASH,BANK_TRANSFER,CARD,EWALLET';
    return methods.split(',').map((code) => ({
      value: code.trim(),
      label: PAYMENT_LABEL_MAP[code.trim()] ?? code.trim(),
    }));
  }, [p.appSettings?.paymentMethods]);

  // Undo toast
  useEffect(() => {
    if (!p.lastRemovedItem) return;
    const key = 'undo-msg';
    message.open({
      key,
      type: 'info',
      content: (
        <div className="undo-toast">
          <span>{LANG.undoRemoved}</span>
          <button
            type="button"
            onClick={() => {
              p.undoRemove();
              message.destroy(key);
            }}
          >
            {LANG.undoAction}
          </button>
        </div>
      ),
      duration: 4,
    });
  }, [p.lastRemovedItem]);

  // Sound feedback on lastScannedProductName
  const prevScannedRef = useRef('');
  useEffect(() => {
    if (p.lastScannedProductName && p.lastScannedProductName !== prevScannedRef.current) {
      prevScannedRef.current = p.lastScannedProductName;
      beep('scan');
      message.success(`${LANG.scannedLabel} ${p.lastScannedProductName}`, 1.5);
    }
  }, [p.lastScannedProductName]);

  // Auto-collapse checkout on resize
  useEffect(() => {
    const onResize = () => {
      setCheckoutCollapsed(window.innerWidth <= 1024);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Auto-focus search on tab change
  useEffect(() => {
    p.focusSearchInput();
  }, [p.activeTabId]);

  // Keyboard shortcuts
  useEffect(() => {
    const activeTabRef = p.activeTab;
    const hc = p.handleCheckout;
    const hct = p.handleCreateTab;
    const fsi = p.focusSearchInput;
    const csi = p.clearSearchInput;
    const sir = p.searchInputRef;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F8' && activeTabRef?.items.length) {
        e.preventDefault();
        hc();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        fsi();
      }
      if (e.key === 'F1') {
        e.preventDefault();
        hct();
      }
      if (e.key === 'Escape') {
        csi();
        sir.current?.blur();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [p.activeTab, p.handleCheckout, p.handleCreateTab, p.focusSearchInput, p.clearSearchInput, p.searchInputRef]);

  if (p.loading) {
    return (
      <div className="screen-center">
        <Spin size="large" />
      </div>
    );
  }

  const isOverview = p.currentView === 'OVERVIEW';
  const defaultRatio = isOverview ? 0.5 : 0.75;
  const effectiveRatio = panelRatio ?? defaultRatio;

  return (
    <div className="pos-shell">
      <TopHeader
        searchInputRef={p.searchInputRef}
        searchValue={p.searchValue}
        setSearchValue={p.setSearchValue}
        searching={p.searching}
        searchResults={p.searchResults}
        setHighlightedSearchIndex={p.setHighlightedSearchIndex}
        handleResolveProduct={p.handleResolveProduct}
        session={session}
        isRunning={isRunning}
        startSession={startSession}
        endSession={endSession}
        lastScannedProductName={p.lastScannedProductName}
        userName={p.authUser?.fullName ?? p.authUser?.username ?? ''}
        onLogout={p.handleLogout}
        onOpenChangePassword={() => setChangePasswordOpen(true)}
        collapsed={checkoutCollapsed}
        onToggleCollapse={() => setCheckoutCollapsed((v) => !v)}
      />
      <WorkspaceTabs
        tabs={p.tabs}
        activeTabId={p.activeTabId}
        setActiveTabId={p.setActiveTabId}
        handleCreateTab={p.handleCreateTab}
        handleCloseTab={p.handleCloseTab}
      />
      <div
        className={`pos-grid${!isOverview ? ' pos-grid-sale-mode' : ''}${checkoutCollapsed ? (!isOverview ? ' pos-grid-sale-checkout-collapsed' : ' pos-grid-checkout-collapsed') : ''}`}
        ref={posGridRef}
        style={!checkoutCollapsed ? { gridTemplateColumns: `${effectiveRatio * 100}% ${(1 - effectiveRatio) * 100}%` } as React.CSSProperties : undefined}
      >
        {!checkoutCollapsed && (
          <div className="panel-resizer-wrapper" style={{ left: `${effectiveRatio * 100 - 0.5}%`, right: `${(1 - effectiveRatio) * 100 - 0.5}%` }}>
            <div className="panel-resizer"
              onMouseDown={(e) => {
                e.preventDefault();
                const grid = posGridRef.current;
                if (!grid) return;
                const startX = e.clientX;
                const startWidth = grid.getBoundingClientRect().width;
                const startRatio = effectiveRatio;

                const onMove = (ev: MouseEvent) => {
                  const dx = ev.clientX - startX;
                  const newRatio = Math.max(0.2, Math.min(0.8, startRatio + dx / startWidth));
                  setPanelRatio(newRatio);
                };

                const onUp = () => {
                  document.removeEventListener('mousemove', onMove);
                  document.removeEventListener('mouseup', onUp);
                  document.body.style.cursor = '';
                  document.body.style.userSelect = '';
                };

                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
              }}
            />
          </div>
        )}
        <TransactionPanel p={p} onOpenSettings={() => setSettingsOpen(true)} /> 

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

        <button
          type="button"
          className="checkout-toggle"
          onClick={() => setCheckoutCollapsed((v) => !v)}
        >
          <ShoppingOutlined />
        </button>
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

      <ChangePasswordModal
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
    </div>
  );
}
