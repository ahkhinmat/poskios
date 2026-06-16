import { useState } from 'react';
import { api } from '../api';
import { LANG } from '../lang';
import { PERMISSIONS } from '../permissions';
import { createDefaultPurchaseMeta } from '../utils/purchase';
import { extractApiErrorMessage } from '../utils/error';
import { buildReceiptDocumentHtml } from '../utils/receipt';
import type {
  ApiEnvelope,
  AppSettings,
  CheckoutResponse,
  PosDraftTab,
  PurchaseCheckoutResponse,
  PurchaseMeta,
  ReceiptPreviewData,
  ReturnCheckoutResponse,
  Supplier,
} from '../types';

interface Summary {
  itemCount: number;
  subtotal: number;
  costAmount: number;
  rawTotal: number;
  pointsDiscount: number;
  total: number;
  grossProfitAmount: number;
  grossProfitPercent: number;
}

export function useCheckout(
  message: ReturnType<typeof import('antd').App.useApp>['message'],
  appSettings: AppSettings | null,
  permissions: string[],
  activeTab: PosDraftTab | null,
  tabs: PosDraftTab[],
  setTabs: (tabs: PosDraftTab[] | ((prev: PosDraftTab[]) => PosDraftTab[])) => void,
  setActiveTabId: (id: number | null) => void,
  summary: Summary,
  isReturnTab: boolean,
  isPurchaseTab: boolean,
  purchaseMetaMap: Record<number, PurchaseMeta>,
  suppliers: Supplier[],
  createDraftTab: (title?: string, tabType?: 'SALE' | 'RETURN' | 'PURCHASE') => Promise<PosDraftTab>,
  focusSearchInput: () => void,
) {
  const [checkingOut, setCheckingOut] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState<ReceiptPreviewData | null>(null);
  const [productManagerOpen, setProductManagerOpen] = useState(false);

  function buildDraftReceipt(): ReceiptPreviewData | null {
    if (!activeTab?.items.length) return null;

    const s = appSettings;
    const storeName = s?.storeName || LANG.storeNameReceipt;
    const storeAddress = s?.storeAddress || LANG.storeAddress;
    const storePhoneNumber = s?.storePhoneNumber || LANG.storePhoneNumber;
    const footerMessage = s?.receiptFooter || LANG.receiptFooter;

    const items = activeTab.items.map((item) => ({
      productName: item.productName,
      unitName: item.unitName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    }));

    if (isReturnTab) {
      const returnFee = activeTab.customerPaidAmount ?? 0;
      const refundAmount = Math.max(0, summary.subtotal - (activeTab.discountAmount ?? 0) - returnFee);
      return {
        storeName, storeAddress, storePhoneNumber,
        salesOrderCode: activeTab.title,
        soldAt: new Date().toISOString(),
        cashierName: LANG.cashier,
        items,
        subtotalAmount: summary.subtotal,
        discountAmount: activeTab.discountAmount,
        returnFeeAmount: returnFee,
        totalAmount: refundAmount,
        customerRefundAmount: refundAmount,
        footerMessage,
      };
    }

    if (isPurchaseTab) {
      const purchasePaidAmount = purchaseMetaMap[activeTab.id]?.supplierPaidAmount ?? 0;
      return {
        storeName, storeAddress, storePhoneNumber,
        purchaseOrderCode:
          purchaseMetaMap[activeTab.id]?.purchaseOrderCode ?? activeTab.title,
        orderedAt: purchaseMetaMap[activeTab.id]?.importDate
          ? new Date(purchaseMetaMap[activeTab.id]!.importDate).toISOString()
          : new Date().toISOString(),
        supplierName:
          suppliers.find((supplier) => supplier.id === (purchaseMetaMap[activeTab.id]?.supplierId ?? null))?.name ?? null,
        items,
        subtotalAmount: summary.subtotal,
        discountAmount: activeTab.discountAmount,
        totalAmount: summary.total,
        supplierPaidAmount: purchasePaidAmount,
        debtAmount: Math.max(0, summary.total - purchasePaidAmount),
        footerMessage,
      };
    }

    const customerPaidAmount = summary.total;
    const loyaltyDiscountAmount = summary.pointsDiscount;
    return {
      storeName, storeAddress, storePhoneNumber,
      salesOrderCode: activeTab.title,
      soldAt: new Date().toISOString(),
      cashierName: LANG.cashier,
      items,
      subtotalAmount: summary.subtotal,
      discountAmount: loyaltyDiscountAmount > 0 ? 0 : activeTab.discountAmount,
      loyaltyDiscountAmount,
      totalAmount: summary.total,
      customerPaidAmount,
      changeAmount: Math.max(0, customerPaidAmount - summary.total),
      footerMessage,
    };
  }

  function handlePrintReceipt(receiptSource?: ReceiptPreviewData | null) {
    const receipt = receiptSource ?? receiptPreview;

    if (!receipt) return;

    const printWindow = window.open('', '_blank', 'width=420,height=720');
    if (!printWindow) {
      message.error(LANG.errPrintWindow);
      return;
    }

    printWindow.document.write(buildReceiptDocumentHtml(receipt));
    printWindow.document.close();
  }

  async function handleCheckout() {
    if (!activeTab || !activeTab.items.length) {
      message.warning(LANG.emptyCartCheckout);
      return;
    }

    const checkoutPaidAmount = summary.total;

    setCheckingOut(true);
    try {
      if (isPurchaseTab) {
        if (!permissions.includes(PERMISSIONS.PURCHASE_CREATE)) {
          message.warning(LANG.permissionDenied);
          setCheckingOut(false);
          return;
        }

        const purchaseMeta = purchaseMetaMap[activeTab.id] ?? createDefaultPurchaseMeta(activeTab, tabs);
        const response = await api.post<ApiEnvelope<PurchaseCheckoutResponse>>('/pos/purchase-orders/checkout', {
          purchaseOrderCode: purchaseMeta.purchaseOrderCode,
          supplierId: purchaseMeta.supplierId,
          supplierOrderCode: purchaseMeta.supplierOrderCode,
          supplierInvoiceCode: purchaseMeta.supplierInvoiceCode,
          status: 'COMPLETED',
          importDate: purchaseMeta.importDate,
          note: activeTab.note,
          discountAmount: activeTab.discountAmount,
          supplierPaidAmount: purchaseMeta.supplierPaidAmount,
          items: activeTab.items.map((item) => ({
            productId: item.productId,
            productUnitId: item.productUnitId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountAmount: item.discountAmount,
            note: item.note ?? null,
          })),
        });

        message.success(LANG.purchaseCompleted);
        setReceiptPreview({
          ...response.data.data.receiptData,
          storeName: LANG.storeNameReceipt,
          storeAddress: LANG.storeAddress,
          storePhoneNumber: LANG.storePhoneNumber,
          footerMessage: LANG.receiptFooter,
        });
      } else if (isReturnTab) {
        const response = await api.post<ApiEnvelope<ReturnCheckoutResponse>>('/returns/checkout', {
          sourceSalesOrderId: activeTab.sourceSalesOrderId ?? 0,
          saleMode: activeTab.saleMode,
          customerName: activeTab.customerName,
          customerPhone: activeTab.customerPhone,
          note: activeTab.note,
          discountAmount: activeTab.discountAmount,
          returnFeeAmount: activeTab.customerPaidAmount ?? 0,
          paymentMethod: activeTab.paymentMethod,
          customerRefundAmount: Math.max(0, summary.subtotal - (activeTab.discountAmount ?? 0) - (activeTab.customerPaidAmount ?? 0)),
          items: activeTab.items.map((item) => ({
            productId: item.productId,
            productUnitId: item.productUnitId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountAmount: item.discountAmount,
            note: item.note ?? null,
          })),
        });

        message.success(LANG.returnCreated(response.data.data.salesOrderCode));
        setReceiptPreview(response.data.data.receiptData);
      } else {
        const response = await api.post<ApiEnvelope<CheckoutResponse>>('/pos/checkout', {
          saleMode: activeTab.saleMode,
          customerId: activeTab.customerId ?? null,
          customerName: activeTab.customerName,
          customerPhone: activeTab.customerPhone,
          note: activeTab.note,
          discountAmount: activeTab.discountAmount,
          redeemedPoints: activeTab.redeemedPoints ?? 0,
          paymentMethod: activeTab.paymentMethod,
          customerPaidAmount:
            activeTab.paymentMethod === (appSettings?.defaultPaymentMethod ?? 'CASH')
              ? checkoutPaidAmount
              : summary.total,
          items: activeTab.items.map((item) => ({
            productId: item.productId,
            productUnitId: item.productUnitId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountAmount: item.discountAmount,
            note: item.note ?? null,
          })),
        });

        message.success(LANG.saleCreated(response.data.data.salesOrderCode));
        setReceiptPreview({
          ...response.data.data.receiptData,
          storeName: LANG.storeNameReceipt,
          storeAddress: LANG.storeAddress,
          storePhoneNumber: LANG.storePhoneNumber,
          footerMessage: LANG.receiptFooter,
        });
      }

      const created = await createDraftTab(undefined, 'SALE');
      setTabs((current) => [...current.filter((tab) => tab.id !== activeTab.id), created]);
      setActiveTabId(created.id);

      await api.delete(`/pos/draft-tabs/${activeTab.id}`);
      focusSearchInput();
    } catch (error: unknown) {
      const fallback = isReturnTab ? LANG.errReturnFailed : LANG.errPaymentFailed;
      message.error(extractApiErrorMessage(error, fallback));
    } finally {
      setCheckingOut(false);
    }
  }

  function openProductManager() {
    if (!permissions.includes(PERMISSIONS.PRODUCTS_MANAGE) && !permissions.includes(PERMISSIONS.CATEGORIES_MANAGE)) {
      message.warning(LANG.permissionDenied);
      return;
    }

    setProductManagerOpen(true);
  }

  return {
    checkingOut, receiptPreview, setReceiptPreview,
    productManagerOpen, setProductManagerOpen,
    buildDraftReceipt, handlePrintReceipt,
    handleCheckout, openProductManager,
  };
}
