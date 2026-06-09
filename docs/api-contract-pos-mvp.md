# API contract MVP cho man hinh POS uu tien so 1

Tai lieu nay chot API cho man hinh POS tai quay, dua tren `docs/image.png`.

Muc tieu:

- Tim san pham nhanh bang barcode, ma hang, ten hang
- Tao hoa don tai quay va thanh toan ngay
- Tra du lieu de in hoa don 80mm
- Lam co so de khoa schema SQL Server truoc khi thuc thi

Quy uoc chung:

- Base prefix: `/api/v1`
- Auth: `Authorization: Bearer <jwt>`
- Response JSON thong nhat:

```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

- Response loi:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "items[0].quantity",
      "message": "Quantity must be greater than 0"
    }
  ]
}
```

## 1. Roles va quyen

- `STAFF`
  - Tim san pham POS
  - Tao hoa don POS
  - Sua gia khi ban hang
  - Xem chi tiet hoa don
  - In hoa don
  - Tra hang
- `MANAGER`
  - Toan bo quyen cua `STAFF`
  - Huy hoa don

## 2. Dinh nghia enum nghiep vu

### 2.1 Sale mode

- `QUICK_SALE`
- `NORMAL_SALE`
- `DELIVERY_SALE`

### 2.2 Payment method

- `CASH`
- `BANK_TRANSFER`
- `CARD`
- `EWALLET`

### 2.3 Sales order status

- `DRAFT`
- `COMPLETED`
- `CANCELLED`
- `RETURNED`

### 2.4 Inventory transaction type

- `INITIAL_IMPORT`
- `PURCHASE_IN`
- `SALE_OUT`
- `RETURN_IN`
- `ADJUSTMENT_IN`
- `ADJUSTMENT_OUT`
- `CANCEL_SALE_IN`

## 3. API tim san pham cho POS

### 3.1 Search san pham

`GET /api/v1/pos/products/search`

Query params:

- `keyword`: string, bat buoc
- `limit`: number, optional, default `20`, max `50`

Rule:

- Tim uu tien theo thu tu:
  - `ProductUnits.Barcode` exact match
  - `Products.Barcode` exact match
  - `ProductCode` exact match
  - `Name` contains
- Chi tra ve san pham:
  - `IsActive = true`
  - `AllowDirectSale = true`
- Moi ket qua phai tra ve theo don vi POS mac dinh:
  - uu tien `IsSmallestUnit = true`
  - `salePrice` phai la gia cua `don vi tinh nho nhat`

Rule bo sung tu mockup hang hoa:

- Moi san pham co 1 don vi co ban.
- Co the co nhieu don vi quy doi.
- Moi don vi quy doi co gia ban rieng va co `Ban truc tiep` rieng.
- Product search cho POS phai resolve theo `ProductUnit` chu khong chi theo `Product`.

Response:

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "items": [
      {
        "id": 101,
        "productUnitId": 1001,
        "productCode": "8934774001005",
        "barcode": "8934774001005",
        "name": "Nuoc khoang ngot huong chanh day Danh Thanh",
        "unitId": 3,
        "unitName": "Chai",
        "conversionValue": 1,
        "salePrice": 10000,
        "stockOnHand": 24,
        "allowDirectSale": true,
        "isActive": true
      }
    ]
  }
}
```

### 3.2 Lay nhanh 1 san pham theo barcode hoac ma hang

`GET /api/v1/pos/products/resolve`

Query params:

- `code`: string, bat buoc

Rule:

- Dung cho truong hop scan barcode lien tuc.
- Neu tim thay exact match theo `Barcode` hoac `ProductCode` thi tra ve 1 ban ghi.
- Neu san pham co nhieu don vi, tra ve `don vi tinh nho nhat` va gia tuong ung neu quet o POS.
- Neu khong tim thay thi tra `404`.

Response:

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": 101,
    "productUnitId": 1001,
    "productCode": "8934774001005",
    "barcode": "8934774001005",
    "name": "Nuoc khoang ngot huong chanh day Danh Thanh",
    "unitId": 3,
    "unitName": "Chai",
    "conversionValue": 1,
    "salePrice": 10000,
    "stockOnHand": 24,
    "allowDirectSale": true,
    "isActive": true
  }
}
```

## 4. API tao hoa don POS

### 4.1 Thanh toan va tao hoa don

`POST /api/v1/pos/checkout`

Roles:

- `STAFF`
- `MANAGER`

Request body:

```json
{
  "saleMode": "QUICK_SALE",
  "customerId": null,
  "customerName": null,
  "customerPhone": null,
  "note": "Khach mua le",
  "discountAmount": 0,
  "paymentMethod": "CASH",
  "customerPaidAmount": 200000,
  "items": [
    {
      "productId": 101,
      "productUnitId": 1001,
      "quantity": 2,
      "unitPrice": 10000,
      "discountAmount": 0,
      "note": null
    },
    {
      "productId": 102,
      "quantity": 1,
      "unitPrice": 15000,
      "discountAmount": 0,
      "note": null
    }
  ]
}
```

Validation rules:

- `saleMode`: bat buoc
- `paymentMethod`: bat buoc
- `items.length >= 1`
- `quantity > 0`
- `unitPrice >= 0`
- `discountAmount >= 0`
- `customerPaidAmount >= totalAmount` neu `paymentMethod = CASH`
- San pham phai:
  - ton tai
  - `IsActive = true`
  - `AllowDirectSale = true`
- Cho phep sua `unitPrice`
- Cho phep ban am kho trong MVP
- Quet trung san pham thi tang so luong tren cung dong theo `productUnitId`
- `productUnitId` duoc resolve mac dinh theo `don vi tinh nho nhat`

Xu ly server bat buoc:

- Tinh lai toan bo tien o server, khong tin tong tien tu client
- Lay snapshot san pham tai thoi diem ban:
  - `ProductCode`
  - `Barcode`
  - `Name`
  - `UnitName`
  - `ProductUnitId`
  - `ConversionValue`
  - `CostPrice`
  - `UnitPrice`
- Tao `SalesOrders`
- Tao `SalesOrderItems`
- Tao `InventoryTransactions` voi `TransactionType = SALE_OUT`
- Cap nhat `Products.StockOnHand`
- Tinh `ChangeAmount`
- Ho tro giam gia tren tung dong hang
- Ho tro giam gia tren tong hoa don

Response:

```json
{
  "success": true,
  "message": "Checkout successful",
  "data": {
    "salesOrderId": 9001,
    "salesOrderCode": "HD0009001",
    "status": "COMPLETED",
    "soldAt": "2026-06-08T14:35:20+07:00",
    "cashier": {
      "id": 12,
      "fullName": "Kim Anh"
    },
    "summary": {
      "itemCount": 16,
      "subtotalAmount": 193000,
      "discountAmount": 0,
      "totalAmount": 193000,
      "customerPaidAmount": 200000,
      "changeAmount": 7000,
      "paymentMethod": "CASH"
    },
    "receiptData": {
      "storeName": "POS Kiosk",
      "storeAddress": "Dia chi cua hang",
      "storePhoneNumber": "0905455982",
      "salesOrderCode": "HD0009001",
      "soldAt": "2026-06-08T14:35:20+07:00",
      "cashierName": "Kim Anh",
      "items": [
        {
          "productName": "Nuoc khoang ngot huong chanh day Danh Thanh",
          "quantity": 2,
          "unitPrice": 10000,
          "lineTotal": 20000
        }
      ],
      "subtotalAmount": 193000,
      "discountAmount": 0,
      "totalAmount": 193000,
      "customerPaidAmount": 200000,
      "changeAmount": 7000,
      "footerMessage": "Cam on quy khach"
    }
  }
}
```

### 4.2 Huy hoa don

`POST /api/v1/invoices/{salesOrderId}/cancel`

Roles:

- `MANAGER`

Request body:

```json
{
  "reason": "Nhap sai so luong"
}
```

Xu ly server:

- Chi cho huy hoa don `COMPLETED`
- Cap nhat `SalesOrders.Status = CANCELLED`
- Ghi `CancelledAt`, `CancelledByUserId`
- Tao `InventoryTransactions` voi `TransactionType = CANCEL_SALE_IN`
- Cong ton tro lai vao `Products.StockOnHand`

Response:

```json
{
  "success": true,
  "message": "Invoice cancelled",
  "data": {
    "salesOrderId": 9001,
    "status": "CANCELLED"
  }
}
```

## 5. API xem hoa don va in lai

### 5.1 Chi tiet hoa don

`GET /api/v1/invoices/{salesOrderId}`

Roles:

- `STAFF`
- `MANAGER`

Response:

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": 9001,
    "salesOrderCode": "HD0009001",
    "status": "COMPLETED",
    "saleMode": "QUICK_SALE",
    "paymentMethod": "CASH",
    "soldAt": "2026-06-08T14:35:20+07:00",
    "cashier": {
      "id": 12,
      "fullName": "Kim Anh"
    },
    "customer": {
      "id": null,
      "name": null,
      "phone": null
    },
    "summary": {
      "itemCount": 16,
      "subtotalAmount": 193000,
      "discountAmount": 0,
      "totalAmount": 193000,
      "customerPaidAmount": 200000,
      "changeAmount": 7000
    },
    "items": [
      {
        "id": 1,
        "productId": 101,
        "productCodeSnapshot": "8934774001005",
        "barcodeSnapshot": "8934774001005",
        "productNameSnapshot": "Nuoc khoang ngot huong chanh day Danh Thanh",
        "unitNameSnapshot": "Chai",
        "quantity": 2,
        "unitPrice": 10000,
        "discountAmount": 0,
        "lineTotal": 20000
      }
    ]
  }
}
```

### 5.2 Du lieu in lai hoa don

`GET /api/v1/invoices/{salesOrderId}/receipt`

Roles:

- `STAFF`
- `MANAGER`

Muc dich:

- Frontend goi API nay de do du lieu vao mau HTML/CSS 80mm, sau do `window.print()`.

Response:

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "storeName": "POS Kiosk",
    "storeAddress": "Dia chi cua hang",
    "storePhoneNumber": "0905455982",
    "salesOrderCode": "HD0009001",
    "soldAt": "2026-06-08T14:35:20+07:00",
    "cashierName": "Kim Anh",
    "items": [
      {
        "productName": "Nuoc khoang ngot huong chanh day Danh Thanh",
        "quantity": 2,
        "unitPrice": 10000,
        "lineTotal": 20000
      }
    ],
    "subtotalAmount": 193000,
    "discountAmount": 0,
    "totalAmount": 193000,
    "customerPaidAmount": 200000,
    "changeAmount": 7000,
    "footerMessage": "Cam on quy khach"
  }
}
```

## 6. API danh sach hoa don toi thieu

`GET /api/v1/invoices`

Roles:

- `STAFF`
- `MANAGER`

Query params:

- `keyword`: optional, tim theo ma hoa don
- `status`: optional
- `dateFrom`: optional, ISO date
- `dateTo`: optional, ISO date
- `page`: optional, default `1`
- `pageSize`: optional, default `20`

Response:

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "items": [
      {
        "id": 9001,
        "salesOrderCode": "HD0009001",
        "status": "COMPLETED",
        "soldAt": "2026-06-08T14:35:20+07:00",
        "cashierName": "Kim Anh",
        "totalAmount": 193000,
        "paymentMethod": "CASH"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "totalItems": 1,
      "totalPages": 1
    }
  }
}
```

## 7. API luu tab hoa don tam

Muc tieu:

- Khi tat trinh duyet va mo lai, tab hoa don tam van con
- Khong mat du lieu gio hang dang thao tac

### 7.1 Danh sach tab tam

`GET /api/v1/pos/draft-tabs`

Roles:

- `STAFF`
- `MANAGER`

Response:

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "items": [
      {
        "id": 1,
        "tabCode": "TAB0001",
        "tabType": "SALE",
        "title": "Hoa don 1",
        "saleMode": "QUICK_SALE",
        "customerName": null,
        "note": null,
        "paymentMethod": "CASH",
        "customerPaidAmount": 0,
        "discountAmount": 0,
        "items": [
          {
            "productId": 101,
            "productUnitId": 1001,
            "productCode": "8934774001005",
            "barcode": "8934774001005",
            "productName": "Nuoc khoang",
            "unitId": 3,
            "unitName": "Chai",
            "conversionValue": 1,
            "quantity": 2,
            "unitPrice": 10000,
            "discountAmount": 0,
            "lineTotal": 20000
          }
        ],
        "isActive": true,
        "lastTouchedAt": "2026-06-08T15:30:00+07:00"
      }
    ]
  }
}
```

### 7.2 Tao tab tam

`POST /api/v1/pos/draft-tabs`

Request body:

```json
{
  "tabType": "SALE",
  "title": "Hoa don 3",
  "saleMode": "QUICK_SALE"
}
```

### 7.3 Luu tab tam

`PUT /api/v1/pos/draft-tabs/{draftTabId}`

Request body:

```json
{
  "title": "Hoa don 1",
  "tabType": "SALE",
  "saleMode": "QUICK_SALE",
  "customerName": null,
  "customerPhone": null,
  "note": "Khach mua le",
  "paymentMethod": "CASH",
  "customerPaidAmount": 0,
  "discountAmount": 0,
  "items": [
    {
      "productId": 101,
      "productUnitId": 1001,
      "quantity": 2,
      "unitPrice": 10000,
      "discountAmount": 0,
      "note": null
    }
  ]
}
```

### 7.4 Dong tab tam

`DELETE /api/v1/pos/draft-tabs/{draftTabId}`

Rule:

- Chi dong mem, doi sang `IsActive = false`

## 8. API tra hang

### 8.1 Tim hoa don de tra

`GET /api/v1/returns/invoices/search`

Query params:

- `keyword`: optional
- `searchType`: optional
- `dateFrom`: optional
- `dateTo`: optional
- `page`: optional, default `1`
- `pageSize`: optional, default `20`

`searchType` chap nhan:

- `SALES_ORDER_CODE`
- `DELIVERY_CODE`
- `BATCH_OR_EXPIRY`
- `CUSTOMER`
- `PRODUCT_CODE`
- `PRODUCT_NAME`

### 8.2 Tao tab tra hang tu hoa don goc

`POST /api/v1/returns/draft-tabs/from-invoice`

Request body:

```json
{
  "salesOrderId": 9001
}
```

Response:

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "draftTabId": 15,
    "tabType": "RETURN",
    "title": "Tra hang 1"
  }
}
```

### 8.3 Hoan tat tra hang

`POST /api/v1/returns/checkout`

Request body:

```json
{
  "sourceSalesOrderId": 9001,
  "saleMode": "QUICK_SALE",
  "customerName": "Khach le",
  "note": "Tra hang tai quay",
  "discountAmount": 0,
  "returnFeeAmount": 0,
  "paymentMethod": "CASH",
  "customerRefundAmount": 2500,
  "items": [
    {
      "productId": 101,
      "quantity": 1,
      "unitPrice": 2500,
      "discountAmount": 0,
      "note": null
    }
  ]
}
```

Rule:

- Nghiep vu tra hang giong ban hang ve mat thao tac
- Cho phep sua gia
- Quet trung thi tang so luong, khong tach dong
- Uu tien `don vi tinh nho nhat` va gia tuong ung trong danh muc hang hoa
- Cong ton kho lai bang `InventoryTransactions.TransactionType = RETURN_IN`
- Server tu tinh:
  - `totalReturnedGoodsAmount`
  - `discountAmount`
  - `returnFeeAmount`
  - `refundAmount`

## 9. DTO backend de xay dung truoc

Ngoai POS, module hang hoa sau nay can co them:

- `CreateProductDto`
- `UpdateProductDto`
- `CreateProductUnitDto`
- `UpdateProductUnitDto`

Trong do `ProductUnit` toi thieu can mang:

- `unitId`
- `barcode?`
- `conversionValue`
- `costPrice`
- `salePrice`
- `allowDirectSale`
- `isDefaultForPos`
- `isSmallestUnit`

### 9.1 DTO search product

- `SearchPosProductsQueryDto`
  - `keyword: string`
  - `limit?: number`

### 9.2 DTO checkout

- `PosCheckoutDto`
  - `saleMode`
  - `customerId?`
  - `customerName?`
  - `customerPhone?`
  - `note?`
  - `discountAmount`
  - `paymentMethod`
  - `customerPaidAmount`
  - `items: PosCheckoutItemDto[]`

- `PosCheckoutItemDto`
  - `productId`
  - `productUnitId`
  - `quantity`
  - `unitPrice`
  - `discountAmount`
  - `note?`

### 9.3 DTO cancel invoice

- `CancelInvoiceDto`
  - `reason`

### 9.4 DTO draft tab

- `CreatePosDraftTabDto`
- `UpdatePosDraftTabDto`
- `PosDraftItemDto`

### 9.5 DTO return checkout

- `ReturnCheckoutDto`
- `ReturnCheckoutItemDto`

## 10. Anh huong toi schema SQL

De API nay chay on dinh, schema can co toi thieu:

- `SalesOrders.SaleMode`
- `SalesOrders.CustomerName`
- `SalesOrders.CustomerPhone`
- `SalesOrders.Notes`
- `SalesOrders.SourceSalesOrderId`
- `SalesOrders.ReturnFeeAmount`
- `SalesOrders.OrderType`
- `SalesOrderItems.DiscountAmount`
- `SalesOrderItems.ProductUnitId`
- `SalesOrderItems.ConversionValue`
- `InventoryTransactions.ReferenceCode`
- `InventoryTransactions.TransactionType`
- Bang luu tab tam POS
- Bang `ProductUnits`

Can cap nhat schema hien tai:

- Them cot `SaleMode` vao `SalesOrders`
- Them bang `PosDraftTabs`
- Them bang `PosDraftTabItems`
- Them lien ket hoa don tra ve `SourceSalesOrderId`
- Them bang `ProductUnits` va de POS lay don vi/gia mac dinh tu bang nay

## 11. Quyet dinh chot cho MVP

- Luu tab hoa don tam vao database.
- Cho phep ban am kho.
- Cho phep sua gia.
- Cho phep giam gia theo dong hang va theo tong hoa don.
- Ho tro tra hang o MVP.
- Khong ho tro khach hang thanh vien trong phien ban dau, nhung giu san truong `customerId`, `customerName`, `customerPhone`.
- Tinh tien va validate ton kho tai server la bat buoc.
- Receipt API chi tra du lieu, frontend tu render HTML/CSS 80mm.
