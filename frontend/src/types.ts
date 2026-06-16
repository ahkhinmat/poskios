export type Category = {
  id: number;
  name: string;
  isActive: boolean;
};

export type AuthUser = {
  id: number;
  username: string;
  fullName: string;
  roleCode: 'STAFF' | 'MANAGER';
};

export type LoginResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: AuthUser;
};

export type Supplier = {
  id: number;
  code: string | null;
  name: string;
  phoneNumber: string | null;
  address: string | null;
};

export type Customer = {
  id: number;
  phoneNumber: string;
  fullName: string | null;
  currentPoints: number;
};

export type LoyaltySettings = {
  earnAmountPerPoint: number;
  redeemAmountPerPoint: number;
  minimumRedeemPoints: number;
  pointsExpiryDays: number | null;
};

export type AppSettings = {
  storeName: string;
  storeAddress: string;
  storePhoneNumber: string;
  receiptHeader: string;
  receiptFooter: string;
  currencySuffix: string;
  locale: string;
  receiptPaperWidth: string;
  receiptPoweredBy: string;
  defaultPaymentMethod: string;
  quickPayAmount1: number;
  quickPayAmount2: number;
  quickPayAmount3: number;
  salesOrderPrefix: string;
  returnOrderPrefix: string;
  purchaseOrderPrefix: string;
  productSearchMaxResults: number;
  invoiceSearchMaxResults: number;
  customerSearchMaxResults: number;
  defaultAddQuantity: number;
  overviewPassword: string;
  cashierLabel: string;
  productManagerPageSize: number;
  searchDebounceMs: number;
  autoSaveDebounceMs: number;
  paymentMethods: string;
  loyaltyEarnAmountPerPoint: number;
  loyaltyRedeemAmountPerPoint: number;
  loyaltyMinimumRedeemPoints: number;
  loyaltyPointsExpiryDays: number | null;
};

export type LoyaltyPointHistoryItem = {
  id: number;
  salesOrderId: number | null;
  transactionType: string;
  pointsChange: number;
  balanceAfter: number;
  amountBasis: number | null;
  expireAt: string | null;
  notes: string | null;
  transactionAt: string;
};

export type PosProduct = {
  id: number;
  productUnitId: number;
  productCode: string;
  barcode: string | null;
  name: string;
  unitId: number;
  unitName: string;
  conversionValue: number;
  costPrice: number;
  salePrice: number;
  stockOnHand: number;
  allowDirectSale: boolean;
  isActive: boolean;
};

export type PosDraftItem = {
  id?: number;
  productId: number;
  productUnitId: number;
  productCode: string;
  barcode: string | null;
  productName: string;
  unitId: number;
  unitName: string;
  conversionValue: number;
  stockOnHand: number;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  lineTotal: number;
  note?: string | null;
  sortOrder: number;
};

export type PosProductUnitOption = {
  productUnitId: number;
  productId: number;
  productCode: string;
  productName: string;
  unitId: number;
  unitName: string;
  barcode: string | null;
  conversionValue: number;
  costPrice: number;
  salePrice: number;
  stockOnHand: number;
  allowDirectSale: boolean;
  isDefaultForPos: boolean;
  isSmallestUnit: boolean;
  isActive: boolean;
};

export type PosDraftTab = {
  id: number;
  tabCode: string;
  tabType: string;
  title: string;
  saleMode: string;
  customerId?: number | null;
  customerName: string | null;
  customerPhone: string | null;
  note: string | null;
  paymentMethod: string;
  customerPaidAmount: number;
  discountAmount: number;
  redeemedPoints?: number;
  sourceSalesOrderId: number | null;
  importDate?: string | null;
  purchaseOrderCode?: string | null;
  supplierId?: number | null;
  supplierOrderCode?: string | null;
  supplierInvoiceCode?: string | null;
  purchaseStatus?: string | null;
  supplierPaidAmount?: number;
  isActive: boolean;
  lastTouchedAt: string;
  items: PosDraftItem[];
};

export type ReturnCheckoutResponse = {
  salesOrderId: number;
  salesOrderCode: string;
  status: string;
  soldAt: string;
  cashier: {
    id: number;
    fullName: string;
  };
  summary: {
    itemCount: number;
    subtotalAmount: number;
    discountAmount: number;
    returnFeeAmount: number;
    totalAmount: number;
    customerRefundAmount: number;
    paymentMethod: string;
    customer: Customer | null;
    loyalty: {
      reversedPoints: number;
    };
  };
  receiptData: {
    storeName: string;
    storeAddress: string | null;
    storePhoneNumber: string | null;
    salesOrderCode: string;
    soldAt: string;
    cashierName: string;
    items: Array<{
      productName: string;
      unitName: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }>;
    subtotalAmount: number;
    discountAmount: number;
    returnFeeAmount: number;
    totalAmount: number;
    customerRefundAmount: number;
    footerMessage: string | null;
    reversedPoints?: number;
  };
};

export type PurchaseCheckoutResponse = {
  purchaseOrderId: number;
  purchaseOrderCode: string;
  status: string;
  orderedAt: string;
  supplier: {
    id: number | null;
    name: string | null;
  };
  summary: {
    itemCount: number;
    subtotalAmount: number;
    discountAmount: number;
    totalAmount: number;
    supplierPaidAmount: number;
    debtAmount: number;
  };
  receiptData: {
    storeName: string;
    storeAddress: string | null;
    storePhoneNumber: string | null;
    purchaseOrderCode: string;
    orderedAt: string;
    supplierName: string | null;
    items: Array<{
      productName: string;
      unitName: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }>;
    subtotalAmount: number;
    discountAmount: number;
    totalAmount: number;
    supplierPaidAmount: number;
    debtAmount: number;
    footerMessage: string | null;
  };
};

export type InvoiceSearchItem = {
  id: number;
  salesOrderCode: string;
  status: string;
  orderType: string;
  soldAt: string;
  customerName: string | null;
  totalAmount: number;
};

export type CheckoutResponse = {
  salesOrderId: number;
  salesOrderCode: string;
  status: string;
  soldAt: string;
  cashier: {
    id: number;
    fullName: string;
  };
  summary: {
    itemCount: number;
    subtotalAmount: number;
    discountAmount: number;
    loyaltyDiscountAmount: number;
    totalAmount: number;
    customerPaidAmount: number;
    changeAmount: number;
    paymentMethod: string;
    customer: Customer | null;
    loyalty: {
      redeemedPoints: number;
      earnedPoints: number;
      loyaltyDiscountAmount: number;
    };
  };
  receiptData: {
    storeName: string;
    storeAddress: string | null;
    storePhoneNumber: string | null;
    salesOrderCode: string;
    soldAt: string;
    cashierName: string;
    items: Array<{
      productName: string;
      unitName: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }>;
    subtotalAmount: number;
    discountAmount: number;
    loyaltyDiscountAmount?: number;
    totalAmount: number;
    customerPaidAmount: number;
    changeAmount: number;
    footerMessage: string | null;
    redeemedPoints?: number;
    earnedPoints?: number;
  };
};

export type OverviewRecord = {
  id: number;
  recordType: 'SALE' | 'RETURN' | 'PURCHASE';
  code: string;
  status: string;
  partyName: string | null;
  subtotalAmount: number;
  discountAmount: number;
  loyaltyDiscountAmount: number;
  totalAmount: number;
  costAmount: number;
  revenueAmount: number;
  eventAt: string;
};

export type OverviewDetail = {
  header: OverviewRecord;
  items: Array<{
    rowNo: number;
    eventDate: string;
    productCode: string;
    productName: string;
    unitName: string | null;
    quantity: number;
    unitPrice: number;
    costPrice: number;
    revenueAmount: number;
    discountAmount: number;
    lineTotal: number;
  }>;
};

export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type DraftTabsResponse = {
  items: PosDraftTab[];
};

export type SearchResponse = {
  items: PosProduct[];
};

export type ProductUnitOptionsResponse = {
  items: PosProductUnitOption[];
};

export type InvoiceSearchResponse = {
  items: InvoiceSearchItem[];
};

export type InvoiceItemData = {
  salesOrderItemId: number;
  productId: number;
  productUnitId: number;
  unitId: number;
  productCode: string;
  barcode: string | null;
  productName: string;
  unitName: string | null;
  conversionValue: number;
  originalQuantity: number;
  unitPrice: number;
  discountAmount: number;
  lineTotal: number;
  stockOnHand: number;
};

export type InvoiceItemsResponse = {
  salesOrderCode: string;
  soldAt: string;
  customerName: string | null;
  items: InvoiceItemData[];
};

export type SaleReceiptData = CheckoutResponse['receiptData'];
export type ReturnReceiptData = ReturnCheckoutResponse['receiptData'];
export type PurchaseReceiptData = PurchaseCheckoutResponse['receiptData'];
export type ReceiptPreviewData = SaleReceiptData | ReturnReceiptData | PurchaseReceiptData;

export type ManageProductUnit = {
  id: number;
  unitId: number;
  unitName: string;
  barcode: string | null;
  conversionValue: number;
  costPrice: number;
  salePrice: number;
  isDefaultForPos: boolean;
  isActive: boolean;
};

export type ManageProduct = {
  id: number;
  productCode: string;
  barcode: string | null;
  name: string;
  categoryId: number;
  costPrice: number;
  salePrice: number;
  stockOnHand: number;
  isActive: boolean;
  allowDirectSale: boolean;
  units: ManageProductUnit[];
  defaultUnitName: string;
};

export type PurchaseMeta = {
  importDate: string;
  purchaseOrderCode: string;
  purchaseSequence: number;
  supplierOrderCode: string;
  supplierInvoiceCode: string;
  supplierId: number | null;
  status: string;
  supplierPaidAmount: number;
};

export type LoyaltyHistoryResponse = {
  customer: Customer;
  items: LoyaltyPointHistoryItem[];
};

export type CustomerSearchResponse = {
  items: Customer[];
};
