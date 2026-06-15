import { Button, DatePicker, Input, Select } from 'antd';
import dayjs from 'dayjs';
import { LANG } from '../lang';
import type { InvoiceSearchItem } from '../types';

type ReturnSearchPanelProps = {
  invoiceSearchType: string;
  invoiceSearchValue: string;
  invoiceSearching: boolean;
  foundInvoices: InvoiceSearchItem[];
  setInvoiceSearchType: React.Dispatch<React.SetStateAction<'code' | 'product'>>;
  setInvoiceSearchValue: (v: string) => void;
  searchInvoice: () => Promise<void>;
  setInvoiceFromDate: (date: string | null) => void;
  setInvoiceToDate: (date: string | null) => void;
  handleSelectInvoice: (id: number) => Promise<void>;
};

export function ReturnSearchPanel({
  invoiceSearchType,
  invoiceSearchValue,
  invoiceSearching,
  foundInvoices,
  setInvoiceSearchType,
  setInvoiceSearchValue,
  searchInvoice,
  setInvoiceFromDate,
  setInvoiceToDate,
  handleSelectInvoice,
}: ReturnSearchPanelProps) {
  return (
    <div className="return-invoice-search">
      <div className="return-search-row">
        <Select
          value={invoiceSearchType}
          onChange={(v) => setInvoiceSearchType(v as 'code' | 'product')}
          size="small"
          className="return-search-type"
          options={[
            { label: LANG.searchTypeInvoiceCode, value: 'code' },
            { label: LANG.searchTypeProductCode, value: 'product' },
          ]}
        />
        <Input
          placeholder={invoiceSearchType === 'code' ? LANG.placeholderInvoiceCode : LANG.placeholderProductCode}
          value={invoiceSearchValue}
          onChange={(e) => setInvoiceSearchValue(e.target.value)}
          onPressEnter={() => void searchInvoice()}
        />
        <Button
          type="primary"
          size="small"
          loading={invoiceSearching}
          onClick={() => void searchInvoice()}
        >
          {LANG.searchBtn}
        </Button>
      </div>
      <div className="return-search-row return-search-row-spaced">
        <DatePicker.RangePicker
          size="small"
          className="return-date-range"
          placeholder={[LANG.placeholderFromDate, LANG.placeholderToDate]}
          format="DD/MM/YYYY"
          defaultValue={[dayjs(), dayjs()]}
          onChange={(dates) => {
            if (dates && dates[0] && dates[1]) {
              setInvoiceFromDate(dates[0].format('YYYY-MM-DD'));
              setInvoiceToDate(dates[1].format('YYYY-MM-DD'));
            } else {
              setInvoiceFromDate(null);
              setInvoiceToDate(null);
            }
          }}
        />
      </div>
      {!!foundInvoices.length && (
        <div className="return-found-invoice">
          {foundInvoices.map((inv) => (
            <div
              key={inv.id}
              className="found-invoice-row"
              onClick={() => void handleSelectInvoice(inv.id)}
            >
              <div className="found-invoice-header">
                <span className="found-invoice-code">{inv.salesOrderCode}</span>
                <span>{new Date(inv.soldAt).toLocaleString('vi-VN')}</span>
                <span className="found-invoice-total">
                  {inv.totalAmount.toLocaleString('vi-VN')}{LANG.currencySuffix}
                </span>
              </div>
              {inv.customerName && (
                <div className="found-invoice-customer">{inv.customerName}</div>
              )}
            </div>
          ))}
          <div className="found-invoice-note">
            {LANG.foundInvoiceNote}
          </div>
        </div>
      )}
    </div>
  );
}
