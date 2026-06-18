import { Button, Input, List, Tooltip } from 'antd';
import {
  AppstoreOutlined,
  EyeOutlined,
  PlusOutlined,
  PrinterOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { LANG } from '../lang';
import { OverviewView } from './OverviewView';
import { PurchaseTable } from './PurchaseTable';
import { ReturnSearchPanel } from './ReturnSearchPanel';
import { SaleList } from './SaleList';
import type { UsePosPageReturn } from '../hooks/usePosPage';

function stockBarProps(stock: number) {
  if (stock <= 0) return { pct: 0, color: '#ef4444' };
  if (stock <= 10) return { pct: Math.max(10, stock * 5), color: '#f59e0b' };
  if (stock <= 50) return { pct: Math.min(50, stock), color: '#f59e0b' };
  return { pct: 100, color: '#16a34a' };
}

type TransactionPanelProps = {
  p: UsePosPageReturn;
};

export function TransactionPanel({ p }: TransactionPanelProps) {
  return (
    <section className="sale-stage">
      {p.currentView === 'OVERVIEW' ? (
        <OverviewView
          overviewFromDate={p.overviewFromDate}
          overviewToDate={p.overviewToDate}
          overviewDetail={p.overviewDetail}
          overviewLoading={p.overviewLoading}
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
                renderItem={(product: any, index: number) => (
                  <List.Item
                    className={index === p.highlightedSearchIndex ? 'search-result-item is-active' : 'search-result-item'}
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
                        <span style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: '#374151', fontWeight: 500 }}>{product.productCode}</span>
                          {' · '}{LANG.stockLabel}
                          <div className="sale-stock-bar" style={{ width: 32, height: 5 }}>
                            <div className="sale-stock-bar-fill" style={{ width: `${stockBarProps(product.stockOnHand).pct}%`, background: stockBarProps(product.stockOnHand).color }} />
                          </div>
                          <strong style={{ color: stockBarProps(product.stockOnHand).color, fontSize: 11 }}>
                            {product.stockOnHand.toLocaleString('vi-VN')}
                          </strong>
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
                  <button type="button" className="purchase-toolbar-button" aria-label={LANG.purchaseToolbarLayout}>
                    <AppstoreOutlined />
                  </button>
                </Tooltip>
                <Tooltip title={LANG.purchaseToolbarAdd}>
                  <button type="button" className="purchase-toolbar-button" aria-label={LANG.purchaseToolbarAdd} onClick={() => p.focusSearchInput()}>
                    <PlusOutlined />
                  </button>
                </Tooltip>
                <Tooltip title={LANG.purchaseToolbarPrint}>
                  <button type="button" className="purchase-toolbar-button" aria-label={LANG.purchaseToolbarPrint} onClick={() => p.activeTab && void p.persistDraftTab(p.activeTab)}>
                    <PrinterOutlined />
                  </button>
                </Tooltip>
                <Tooltip title={LANG.purchaseToolbarPreview}>
                  <button type="button" className="purchase-toolbar-button" aria-label={LANG.purchaseToolbarPreview}>
                    <EyeOutlined />
                  </button>
                </Tooltip>
                <Tooltip title={LANG.purchaseToolbarAlert}>
                  <button type="button" className="purchase-toolbar-button" aria-label={LANG.purchaseToolbarAlert}>
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
          </div>
        </>
      )}
    </section>
  );
}
