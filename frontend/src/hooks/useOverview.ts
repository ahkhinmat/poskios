import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { api } from '../api';
import { LANG } from '../lang';
import type {
  ApiEnvelope,
  OverviewDetail,
  OverviewRecord,
} from '../types';

export function useOverview(
  message: ReturnType<typeof import('antd').App.useApp>['message'],
  isManager: boolean,
  overviewPassword: string,
  setCurrentView: (view: 'POS' | 'OVERVIEW') => void,
) {
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewRecords, setOverviewRecords] = useState<OverviewRecord[]>([]);
  const [overviewDetail, setOverviewDetail] = useState<OverviewDetail | null>(null);
  const [overviewFromDate, setOverviewFromDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [overviewToDate, setOverviewToDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [overviewRecordTypeFilter, setOverviewRecordTypeFilter] = useState<'ALL' | 'SALE' | 'RETURN' | 'PURCHASE'>('SALE');
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const showProfit = overviewRecordTypeFilter === 'SALE';
  const isOverviewPasswordRequired = import.meta.env.VITE_IS_OVERVIEW_PASSWORD !== 'false';

  const filteredOverviewRecords = useMemo(
    () =>
      overviewRecordTypeFilter === 'ALL'
        ? overviewRecords
        : overviewRecords.filter((record) => record.recordType === overviewRecordTypeFilter),
    [overviewRecords, overviewRecordTypeFilter],
  );
  const overviewTotalAmount = useMemo(
    () => filteredOverviewRecords.reduce((sum, record) => sum + record.subtotalAmount, 0),
    [filteredOverviewRecords],
  );
  const overviewTotalDiscount = useMemo(
    () => filteredOverviewRecords.reduce((sum, record) => sum + record.discountAmount, 0),
    [filteredOverviewRecords],
  );
  const overviewTotalLoyaltyDiscount = useMemo(
    () =>
      filteredOverviewRecords.reduce(
        (sum, record) => sum + record.loyaltyDiscountAmount,
        0,
      ),
    [filteredOverviewRecords],
  );
  const overviewTotalCost = useMemo(
    () => filteredOverviewRecords.reduce((sum, record) => sum + record.costAmount, 0),
    [filteredOverviewRecords],
  );
  const overviewTotalRevenue = useMemo(
    () => filteredOverviewRecords.reduce((sum, record) => sum + record.revenueAmount, 0),
    [filteredOverviewRecords],
  );
  const overviewGrossProfit = useMemo(
    () => filteredOverviewRecords.reduce((sum, record) => sum + (record.revenueAmount - record.costAmount), 0),
    [filteredOverviewRecords],
  );

  async function loadOverview(selectRecord = true, fromDate?: string, toDate?: string) {
    if (!isManager) return;

    setOverviewLoading(true);
    try {
      const response = await api.get<ApiEnvelope<{ items: OverviewRecord[] }>>('/pos/overview', {
        params: {
          fromDate: fromDate ?? overviewFromDate,
          toDate: toDate ?? overviewToDate,
        },
      });
      const items = response.data.data.items;
      setOverviewRecords(items);
      if (selectRecord && items.length) {
        await loadOverviewDetail(items[0].recordType, items[0].id);
      } else if (!items.length) {
        setOverviewDetail(null);
      }
    } catch {
      message.error(LANG.errLoadOverview);
    } finally {
      setOverviewLoading(false);
    }
  }

  async function loadOverviewDetail(recordType: OverviewRecord['recordType'], id: number) {
    try {
      const response = await api.get<ApiEnvelope<OverviewDetail>>(`/pos/overview/${recordType}/${id}`);
      setOverviewDetail(response.data.data);
    } catch {
      message.error(LANG.errLoadOverview);
    }
  }

  function handleOpenOverview() {
    if (!isManager) {
      message.warning(LANG.errManagerOnlyOverview);
      return;
    }

    if (isOverviewPasswordRequired) {
      setPasswordInput('');
      setPasswordDialogOpen(true);
    } else {
      setCurrentView('OVERVIEW');
      void loadOverview();
    }
  }

  function handlePasswordSubmit() {
    if (passwordInput === overviewPassword) {
      setPasswordDialogOpen(false);
      setPasswordInput('');
      setCurrentView('OVERVIEW');
      void loadOverview();
    } else {
      message.error(LANG.errPasswordIncorrect);
      setPasswordInput('');
    }
  }

  return {
    overviewLoading, overviewRecords, overviewDetail, setOverviewDetail,
    overviewFromDate, setOverviewFromDate,
    overviewToDate, setOverviewToDate,
    overviewRecordTypeFilter, setOverviewRecordTypeFilter,
    passwordDialogOpen, setPasswordDialogOpen,
    passwordInput, setPasswordInput,
    showProfit, filteredOverviewRecords,
    overviewTotalAmount, overviewTotalDiscount, overviewTotalLoyaltyDiscount,
    overviewTotalCost, overviewTotalRevenue, overviewGrossProfit,
    loadOverview, loadOverviewDetail, handleOpenOverview, handlePasswordSubmit,
  };
}
