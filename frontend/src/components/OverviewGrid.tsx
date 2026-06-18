import { Empty, Select, Skeleton } from 'antd';
import dayjs from 'dayjs';
import { LANG } from '../lang';
import type { OverviewDetail, OverviewRecord } from '../types';

type OverviewGridProps = {
  records: OverviewRecord[];
  loading: boolean;
  recordTypeFilter: 'ALL' | 'SALE' | 'RETURN' | 'PURCHASE' | 'CANCELLED';
  showProfit: boolean;
  totalAmount: number;
  totalDiscount: number;
  totalLoyaltyDiscount: number;
  totalCost: number;
  totalRevenue: number;
  grossProfit: number;
  overviewDetail: OverviewDetail | null;
  onSetRecordTypeFilter: (value: 'ALL' | 'SALE' | 'RETURN' | 'PURCHASE' | 'CANCELLED') => void;
  onLoadDetail: (recordType: OverviewRecord['recordType'], id: number) => Promise<void>;
};

export function OverviewGrid({
  records,
  loading,
  recordTypeFilter,
  showProfit,
  totalAmount,
  totalDiscount,
  totalLoyaltyDiscount,
  totalCost,
  totalRevenue,
  grossProfit,
  overviewDetail,
  onSetRecordTypeFilter,
  onLoadDetail,
}: OverviewGridProps) {
  return (
    <div className="overview-grid-wrapper">
      <div className="overview-grid-top">
        <div className="overview-grid-count">{LANG.overviewTotalRecords}: <strong>{records.length}</strong></div>
        <Select
          size="small"
          style={{ minWidth: 130 }}
          value={recordTypeFilter}
          options={[
            { label: LANG.overviewFilterAll, value: 'ALL' },
            { label: LANG.overviewTypeSale, value: 'SALE' },
            { label: LANG.overviewTypeReturn, value: 'RETURN' },
            { label: LANG.overviewTypePurchase, value: 'PURCHASE' },
            { label: LANG.overviewTypeCancelled, value: 'CANCELLED' },
          ]}
          onChange={(value) => onSetRecordTypeFilter(value as 'ALL' | 'SALE' | 'RETURN' | 'PURCHASE' | 'CANCELLED')}
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
        {records.length ? records.map((record) => (
          <button
            key={`${record.recordType}-${record.id}`}
            type="button"
            className={`overview-grid-row overview-grid-row-${record.recordType.toLowerCase()}${showProfit ? '' : ' overview-grid-hide-profit'} ${record.status === 'CANCELLED' ? ' is-cancelled' : ''} ${overviewDetail?.header.id === record.id && overviewDetail?.header.recordType === record.recordType ? ' is-active' : ''}`}
            onClick={() => void onLoadDetail(record.recordType, record.id)}
          >
            <div className="overview-grid-cell overview-grid-code">
              <span className={`overview-grid-badge ${record.status === 'CANCELLED' ? 'overview-badge-cancelled' : `overview-badge-${record.recordType.toLowerCase()}`}`}>
                {record.status === 'CANCELLED' ? LANG.overviewTypeCancelled : record.recordType === 'PURCHASE' ? LANG.overviewBadgePurchase : record.recordType === 'RETURN' ? LANG.overviewBadgeReturn : LANG.overviewBadgeSale}
              </span>
              {record.code}
            </div>
            <div className="overview-grid-cell">{dayjs(record.eventAt).format('DD/MM HH:mm')}</div>
            <div className="overview-grid-cell">{record.subtotalAmount.toLocaleString('vi-VN')}</div>
            <div className={`overview-grid-cell${record.discountAmount > 0 ? ' has-discount' : ''}`}>{record.discountAmount.toLocaleString('vi-VN')}</div>
            <div className={`overview-grid-cell${record.loyaltyDiscountAmount > 0 ? ' has-discount' : ''}`}>{record.loyaltyDiscountAmount.toLocaleString('vi-VN')}</div>
            <div className="overview-grid-cell">{Math.round(record.costAmount).toLocaleString('vi-VN')}</div>
            <div className="overview-grid-cell">{Math.round(record.revenueAmount).toLocaleString('vi-VN')}</div>
            {showProfit && <div className="overview-grid-cell overview-grid-profit">{Math.round(record.revenueAmount - record.costAmount).toLocaleString('vi-VN')}</div>}
          </button>
        )) : (
          <div className="empty-stage">
            {loading ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : (
              <Empty description={LANG.overviewEmpty} />
            )}
          </div>
        )}
      </div>
      <div className={`overview-grid-foot${showProfit ? '' : ' overview-grid-hide-profit'}`}>
        <div className="overview-grid-cell overview-grid-foot-label">{LANG.overviewTotalValue}</div>
        <div className="overview-grid-cell overview-grid-foot-val overview-grid-cell-empty">
          <span style={{ fontWeight: 400, fontSize: 11, color: '#6b7280' }}>({records.length} {LANG.receiptQty})</span>
        </div>
        <div className="overview-grid-cell overview-grid-foot-val">{totalAmount.toLocaleString('vi-VN')}</div>
        <div className="overview-grid-cell overview-grid-foot-val">{totalDiscount.toLocaleString('vi-VN')}</div>
        <div className="overview-grid-cell overview-grid-foot-val">{totalLoyaltyDiscount.toLocaleString('vi-VN')}</div>
        <div className="overview-grid-cell overview-grid-foot-val">{Math.round(totalCost).toLocaleString('vi-VN')}</div>
        <div className="overview-grid-cell overview-grid-foot-val">{totalRevenue.toLocaleString('vi-VN')}</div>
        {showProfit && <div className="overview-grid-cell overview-grid-foot-val">{Math.round(grossProfit).toLocaleString('vi-VN')}</div>}
      </div>
    </div>
  );
}
