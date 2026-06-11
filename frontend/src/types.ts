export type Category = {
  id: number;
  name: string;
  isActive: boolean;
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
  customerName: string | null;
  customerPhone: string | null;
  note: string | null;
  paymentMethod: string;
  customerPaidAmount: number;
  discountAmount: number;
  sourceSalesOrderId: number | null;
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
    totalAmount: number;
    customerPaidAmount: number;
    changeAmount: number;
    paymentMethod: string;
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
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }>;
    subtotalAmount: number;
    discountAmount: number;
    totalAmount: number;
    customerPaidAmount: number;
    changeAmount: number;
    footerMessage: string | null;
  };
};
