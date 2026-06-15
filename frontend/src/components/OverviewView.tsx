import { Button, DatePicker, Empty, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { LANG } from '../lang';
import type { OverviewDetail } from '../types';

type OverviewViewProps = {
  overviewFromDate: string;
  overviewToDate: string;
  overviewDetail: OverviewDetail | null;
  overviewLoading: boolean;
  isManager: boolean;
  setOverviewFromDate: (v: string) => void;
  setOverviewToDate: (v: string) => void;
  loadOverview: (reset?: boolean, fromDate?: string, toDate?: string) => Promise<void>;
  ensureTabOfType: (type: 'SALE' | 'RETURN' | 'PURCHASE') => Promise<void>;
  focusSearchInput: () => void;
  openProductManager: () => void;
};

export function OverviewView({
  overviewFromDate,
  overviewToDate,
  overviewDetail,
  overviewLoading,
  isManager,
  setOverviewFromDate,
  setOverviewToDate,
  loadOverview,
  ensureTabOfType,
  focusSearchInput,
  openProductManager,
}: OverviewViewProps) {
  return (
    <>
      <div className="overview-toolbar">
        <div className="overview-toolbar-title">{LANG.overviewTitle}</div>
        <div className="overview-toolbar-filters">
          <span>{LANG.overviewFromDate}</span>
          <DatePicker
            value={dayjs(overviewFromDate)}
            format="DD/MM/YYYY"
            onChange={(date) => {
              const v = date ? date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
              setOverviewFromDate(v);
              void loadOverview(false, v, undefined);
            }}
          />
          <span>{LANG.overviewToDate}</span>
          <DatePicker
            value={dayjs(overviewToDate)}
            format="DD/MM/YYYY"
            onChange={(date) => {
              const v = date ? date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
              setOverviewToDate(v);
              void loadOverview(false, undefined, v);
            }}
          />
          <Button type="primary" onClick={() => void loadOverview()}>
            {LANG.overviewRefresh}
          </Button>
        </div>
      </div>

      <div className="sale-list">
        <div className="purchase-table-head purchase-table-head-overview">
          <div>{LANG.purchaseTableNo}</div>
          <div>{LANG.purchaseTableName}</div>
          <div>{LANG.purchaseTableUnit}</div>
          <div>{LANG.purchaseTableQty.replace(' nhập', '')}</div>
          <div>{LANG.purchaseTablePrice}</div>
          <div>{LANG.purchaseTableTotal}</div>
        </div>
        {overviewDetail?.items.length ? (
          overviewDetail.items.map((item) => (
            <div key={`${overviewDetail.header.recordType}-${overviewDetail.header.id}-${item.rowNo}`} className={`purchase-row purchase-row-overview purchase-row-${overviewDetail.header.recordType.toLowerCase()}`}>
              <div>{item.rowNo}</div>
              <div className="purchase-name">{item.productName}</div>
              <div>{item.unitName ?? ''}</div>
              <div>{item.quantity.toLocaleString('vi-VN')}</div>
              <div>{item.unitPrice.toLocaleString('vi-VN')}</div>
              <div className="purchase-total">{item.lineTotal.toLocaleString('vi-VN')}</div>
            </div>
          ))
        ) : (
          <div className="empty-stage empty-stage-purchase">
            <Empty description={overviewLoading ? LANG.saving : LANG.overviewEmptyDetail} />
          </div>
        )}
      </div>

      <div className="sale-footer">
        <div className="sale-modes">
          <Tooltip title={LANG.modeSaleTip}>
            <button type="button" className="sale-mode" onClick={async () => { await ensureTabOfType('SALE'); focusSearchInput(); }}>
              {LANG.modeSale}
            </button>
          </Tooltip>
          <Tooltip title={LANG.modeReturnTip}>
            <button type="button" className="sale-mode" onClick={() => { void ensureTabOfType('RETURN'); }}>
              {LANG.modeReturn}
            </button>
          </Tooltip>
          {isManager && (
            <>
              <Tooltip title={LANG.modeImportTip}>
                <button type="button" className="sale-mode" onClick={() => { void ensureTabOfType('PURCHASE'); }}>
                  {LANG.modeImport}
                </button>
              </Tooltip>
              <Tooltip title={LANG.modeCategoryTip}>
                <button type="button" className="sale-mode" onClick={openProductManager}>
                  {LANG.modeCategory}
                </button>
              </Tooltip>
              <Tooltip title={LANG.modeOverviewTip}>
                <button type="button" className="sale-mode is-active">
                  {LANG.modeOverview}
                </button>
              </Tooltip>
            </>
          )}
        </div>
      </div>
    </>
  );
}
