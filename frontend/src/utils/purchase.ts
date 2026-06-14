import type { PosDraftTab, PurchaseMeta } from '../types';
import { LANG } from '../lang';

export function getNextTabNumber(currentTabs: PosDraftTab[], prefix: string) {
  const numbers = currentTabs
    .filter((tab) => tab.title.startsWith(prefix))
    .map((tab) => {
      const matched = tab.title.match(/(\d+)$/);
      return matched ? Number(matched[1]) : 0;
    });
  return numbers.length ? Math.max(...numbers) + 1 : 1;
}

export function getNextPurchaseSequence(currentTabs: PosDraftTab[]) {
  return currentTabs.filter((tab) => tab.tabType === 'PURCHASE').length + 1;
}

export function getPurchaseSequenceFromTab(tab: PosDraftTab, allTabs: PosDraftTab[]) {
  const matched = tab.title.match(/(\d+)$/);
  return matched ? Number(matched[1]) : getNextPurchaseSequence(allTabs);
}

export function buildPurchaseOrderCode(sequence: number, identitySeed: number | string) {
  const identityText = String(identitySeed).replace(/\D/g, '').slice(-6).padStart(6, '0');
  return `PNH${String(sequence).padStart(4, '0')}${identityText}`;
}

export function createDefaultPurchaseMeta(tab: PosDraftTab, allTabs: PosDraftTab[]): PurchaseMeta {
  const purchaseSequence = getPurchaseSequenceFromTab(tab, allTabs);
  return {
    importDate: tab.importDate ?? (tab.lastTouchedAt ? tab.lastTouchedAt.slice(0, 10) : new Date().toISOString().slice(0, 10)),
    purchaseOrderCode: tab.purchaseOrderCode ?? buildPurchaseOrderCode(purchaseSequence, tab.id || tab.tabCode),
    purchaseSequence,
    supplierOrderCode: tab.supplierOrderCode ?? '',
    supplierInvoiceCode: tab.supplierInvoiceCode ?? '',
    supplierId: tab.supplierId ?? null,
    status: tab.purchaseStatus ?? LANG.purchaseDraftStatus,
    supplierPaidAmount: tab.supplierPaidAmount ?? 0,
  };
}
