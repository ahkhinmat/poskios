import { useState } from 'react';
import { App as AntApp, Button, DatePicker, Empty, Modal, Skeleton } from 'antd';
import dayjs from 'dayjs';
import { api } from '../api';
import { Can } from './Can';
import { LANG } from '../lang';
import { PERMISSIONS } from '../permissions';
import type { OverviewDetail } from '../types';

type OverviewViewProps = {
  overviewFromDate: string;
  overviewToDate: string;
  overviewDetail: OverviewDetail | null;
  overviewLoading: boolean;
  setOverviewFromDate: (v: string) => void;
  setOverviewToDate: (v: string) => void;
  loadOverview: (reset?: boolean, fromDate?: string, toDate?: string) => Promise<void>;
};

export function OverviewView({
  overviewFromDate,
  overviewToDate,
  overviewDetail,
  overviewLoading,
  setOverviewFromDate,
  setOverviewToDate,
  loadOverview,
}: OverviewViewProps) {
  const { message } = AntApp.useApp();
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancelId, setConfirmCancelId] = useState<number | null>(null);

  const handleCancel = async () => {
    if (!confirmCancelId) return;

    setCancelling(true);

    try {
      await api.post(`/pos/sales-orders/${confirmCancelId}/cancel`);
      message.success(LANG.overviewCancelSuccess);
      setConfirmCancelId(null);
      void loadOverview();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      message.error(axiosErr.response?.data?.message ?? LANG.overviewCancelFailed);
    } finally {
      setCancelling(false);
    }
  };

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
          <Can check={PERMISSIONS.SALES_CANCEL}>
            {overviewDetail?.header.recordType === 'SALE' && overviewDetail.header.status !== 'CANCELLED' && (
              <Button danger onClick={() => setConfirmCancelId(overviewDetail.header.id)}>
                {LANG.overviewCancelButton}
              </Button>
            )}
          </Can>
        </div>
      </div>

      <div className="sale-list">
        <div className="purchase-table-head purchase-table-head-overview">
          <div>{LANG.purchaseTableNo}</div>
          <div>{LANG.purchaseTableName}</div>
          <div>{LANG.purchaseTableUnit}</div>
          <div>{LANG.purchaseTableQtyShort}</div>
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
        ) : overviewLoading ? (
          <div style={{ padding: '12px 8px' }}>
            <Skeleton active paragraph={{ rows: 4 }} />
          </div>
        ) : (
          <div className="empty-stage empty-stage-purchase">
            <Empty description={LANG.overviewEmptyDetail} />
          </div>
        )}
        {overviewDetail?.items.length ? (
          <div className="purchase-row purchase-row-overview purchase-summary-foot">
            <div></div>
            <div className="purchase-name" style={{ fontWeight: 700 }}>{LANG.overviewTotalValue}</div>
            <div></div>
            <div style={{ fontWeight: 700 }}>{overviewDetail.items.reduce((s, i) => s + i.quantity, 0).toLocaleString('vi-VN')}</div>
            <div></div>
            <div className="purchase-total" style={{ fontWeight: 700, color: 'var(--pos-primary)' }}>{overviewDetail.items.reduce((s, i) => s + i.lineTotal, 0).toLocaleString('vi-VN')}{LANG.currencySuffix}</div>
          </div>
        ) : null}
      </div>

      <Modal
        title={LANG.overviewCancelTitle}
        open={!!confirmCancelId}
        onOk={() => void handleCancel()}
        onCancel={() => setConfirmCancelId(null)}
        confirmLoading={cancelling}
        okText={LANG.overviewCancelOk}
        okButtonProps={{ danger: true }}
        cancelText={LANG.cancel}
      >
        <p>{LANG.overviewCancelConfirm}</p>
        <p style={{ fontSize: 13, color: 'var(--pos-text-secondary)' }}>
          {LANG.overviewCancelNote}
        </p>
      </Modal>
    </>
  );
}
