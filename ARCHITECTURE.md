# Architecture — POS Kiosk

## 1. System Context (C4 - Level 1)

```mermaid
C4Context
  title System Context — POS Kiosk

  Person(cashier, "Thu ngân (Staff)", "Nhân viên bán hàng tại quầy")
  Person(manager, "Quản lý (Manager)", "Chủ cửa hàng / Quản lý")

  System_Boundary(pos, "POS Kiosk System") {
    System(frontend, "Frontend SPA", "React 19 + Ant Design 6\nVite dev server :5173")
    System(backend, "Backend API", "NestJS 11 + TypeORM\nProduction :3000")
    SystemDb(database, "SQL Server", "POS database\n:1433")
  }

  System_Ext(scanner, "Máy scan USB", "Keyboard emulation\nbarcode scanner")
  System_Ext(printer, "Máy in nhiệt 80mm", "Xprinter\nwindow.print()")

  Rel(cashier, frontend, "Sử dụng", "Browser")
  Rel(manager, frontend, "Sử dụng", "Browser")
  Rel(frontend, backend, "REST API", "HTTP /api/v1")
  Rel(backend, database, "TypeORM", "mssql driver")
  Rel(cashier, scanner, "Quét mã vạch")
  Rel(frontend, printer, "In hóa đơn", "HTML print")
```

## 2. Container Diagram (C4 - Level 2)

```mermaid
C4Container
  title Container — Backend NestJS

  System_Boundary(backend, "Backend NestJS") {
    Container(main, "main.ts", "NestJS Bootstrap", "CORS, ValidationPipe, /api/v1 prefix")

    Container_Boundary(app_module, "AppModule (Root)") {
      Component(config_module, "ConfigModule", ".env", "DB_HOST, DB_PORT, JWT_SECRET...")
      Component(typeorm_module, "TypeOrmModule", "mssql", "Kết nối SQL Server")
      Container_Boundary(pos_module, "PosModule (hiện tại)") {
        Component(pos_ctrl, "PosController", "REST", "10 endpoints POS")
        Component(ret_ctrl, "ReturnsController", "REST", "1 endpoint return")
        Component(pos_svc, "PosService", "Business Logic", "~1326 dòng")
        Component(entities, "10 Entities", "TypeORM", "Product, SalesOrder...")
        Component(dtos, "9 DTOs", "class-validator", "Validation schemas")
      }
      Component(auth_mod, "AuthModule", "JWT + RBAC", "CHƯA TRIỂN KHAI")
      Component(user_mod, "UserModule", "User CRUD", "CHƯA TRIỂN KHAI")
      Component(product_mod, "ProductModule", "Product CRUD", "CHƯA TRIỂN KHAI")
      Component(invoice_mod, "InvoiceModule", "Invoice", "CHƯA TRIỂN KHAI")
      Component(report_mod, "ReportModule", "Reports", "CHƯA TRIỂN KHAI")
    }
  }
```

## 3. Deployment Diagram (C4 - Level 3)

```mermaid
C4Deployment
  title Deployment — Windows Server

  Deployment_Node(windows_server, "Windows Server", "PM2 + IIS / Nginx") {
    Deployment_Node(node, "Node.js Runtime", "PM2 process manager") {
      Container(backend_process, "Backend", "NestJS\nPort 3000")
    }
    Deployment_Node(static, "Static Files", "IIS / Nginx") {
      Container(frontend_build, "Frontend", "React build\nindex.html + assets")
    }
    Deployment_Node(sql, "SQL Server Instance", "Database Engine") {
      ContainerDb(pos_db, "POS Database", "SQL Server\nPort 1433")
    }
  }

  Deployment_Node(client, "Client Machine (Quầy thu ngân)", "Windows") {
    Container(browser, "Browser", "Chrome / Edge")
    Container(barcode_scanner, "Máy scan USB", "Keyboard HID")
    Container(thermal_printer, "Máy in nhiệt 80mm", "Xprinter")
  }

  Rel(browser, frontend_build, "HTTP", "Serves static files")
  Rel(browser, backend_process, "REST API", "/api/v1")
  Rel(backend_process, pos_db, "TypeORM", "mssql")
```

## 4. Luồng Xử Lý Chính

### 4.1 POS Checkout (Bán hàng)

```mermaid
sequenceDiagram
  actor Cashier as Thu ngân
  participant UI as Frontend (App.tsx)
  participant API as axios (api.ts)
  participant BE as NestJS (pos.service.ts)
  participant DB as SQL Server

  Note over Cashier,DB: === TÌM KIẾM SẢN PHẨM ===
  Cashier->>UI: Nhập barcode / tên hàng
  UI->>API: GET /pos/products/resolve?code=XXX
  API->>BE: resolveProduct()
  BE->>DB: SELECT ProductUnit WHERE barcode=:code
  DB-->>BE: ProductUnit + Product + Unit
  BE-->>API: { id, productUnitId, salePrice, stockOnHand... }
  API-->>UI: PosProduct response

  alt Không tìm thấy exact match
    UI->>API: GET /pos/products/search?keyword=XXX&limit=8
    API->>BE: searchProducts()
    BE->>DB: WHERE barcode=X OR productCode=X OR name LIKE '%X%'
    DB-->>BE: Danh sách ProductUnit
    BE-->>API: { items: PosProduct[] }
    API-->>UI: Hiển thị dropdown kết quả
    Cashier->>UI: Chọn sản phẩm từ danh sách
  end

  Note over Cashier,DB: === TẠO GIỎ HÀNG ===
  UI->>UI: addProductToActiveTab()
  UI->>UI: Tự động gọi persistDraftTab() sau 500ms
  UI->>API: PUT /pos/draft-tabs/:id (items + metadata)
  API->>BE: updateDraftTab()
  BE->>DB: Delete + Insert PosDraftTabItems
  DB-->>BE: Saved

  Note over Cashier,DB: === THANH TOÁN ===
  Cashier->>UI: Bấm "THANH TOÁN"
  UI->>API: POST /pos/checkout
  API->>BE: checkout(userId, PosCheckoutDto)

  BE->>BE: BEGIN TRANSACTION
  BE->>DB: SELECT ProductUnit (WHERE id IN :ids, isActive=true)
  DB-->>BE: productUnits + product + unit relations

  BE->>BE: Tính toán server:
  Note over BE: subtotal = SUM(quantity * unitPrice)<br/>lineDiscount = SUM(discountAmount)<br/>total = subtotal - lineDiscount - orderDiscount<br/>changeAmount = customerPaid - total

  alt CASH và customerPaid < total
    BE->>BE: THROW BadRequestException
  end

  BE->>DB: INSERT SalesOrder (status=COMPLETED)
  DB-->>BE: salesOrderId

  loop Mỗi item trong giỏ
    BE->>DB: INSERT SalesOrderItem (snapshot: productCode, name, price...)
    BE->>DB: UPDATE Product SET stockOnHand = stockBefore - quantity
    BE->>DB: INSERT InventoryTransaction (SALE_OUT, stockBefore, stockAfter)
  end

  BE->>BE: COMMIT TRANSACTION
  BE-->>API: { salesOrderId, receiptData, summary }
  API-->>UI: CheckoutResponse

  Note over Cashier,DB: === IN HÓA ĐƠN ===
  UI->>UI: Hiển thị receipt modal
  Cashier->>UI: Bấm "In hóa đơn"
  UI->>UI: window.print() — HTML 80mm
```

### 4.2 Import Excel

```mermaid
sequenceDiagram
  actor Manager as Quản lý
  participant UI as Frontend
  participant BE as NestJS (pos.service.ts)
  participant DB as SQL Server

  Manager->>UI: Chọn file .xlsx
  UI->>BE: POST /pos/products/import/excel (multipart)

  BE->>BE: XLSX.read(buffer) → parse sheet
  BE->>BE: Validate 11 cột bắt buộc

  BE->>DB: SELECT Categories
  DB-->>BE: existing categories
  loop Mỗi category mới
    BE->>DB: INSERT Categories
  end

  BE->>DB: SELECT Units
  DB-->>BE: existing units
  loop Mỗi unit mới
    BE->>DB: INSERT Units
  end

  BE->>DB: SELECT Products WHERE productCode IN (:codes)
  DB-->>BE: existing products (batch 500)

  loop Mỗi dòng trong Excel
    alt Product đã tồn tại
      BE->>DB: UPDATE Products SET ...
    else Product mới
      BE->>DB: INSERT Products
    end

    alt ProductUnit đã tồn tại
      BE->>DB: UPDATE ProductUnits SET ...
    else ProductUnit mới
      BE->>DB: INSERT ProductUnits (conversionValue=1, isDefaultForPos=true, isSmallestUnit=true)
    end
  end

  BE-->>UI: { totalRows, createdProducts, updatedProducts... }
  UI-->>Manager: Hiển thị kết quả import
```

### 4.3 Return Checkout (Trả hàng)

```mermaid
sequenceDiagram
  actor Cashier as Thu ngân
  participant UI as Frontend
  participant BE as NestJS (pos.service.ts)
  participant DB as SQL Server

  Cashier->>UI: Mở tab trả hàng
  UI->>BE: POST /returns/checkout
  BE->>DB: SELECT SalesOrder WHERE id = sourceSalesOrderId
  DB-->>BE: Source order (kiểm tra tồn tại)

  BE->>BE: BEGIN TRANSACTION
  BE->>DB: SELECT ProductUnit (WHERE id IN :ids)
  DB-->>BE: productUnits + product + unit

  BE->>BE: Tính toán: refundAmount = subtotal - discounts - returnFee

  alt refundAmount < 0
    BE->>BE: THROW BadRequestException
  end

  BE->>DB: INSERT SalesOrder (orderType=RETURN, sourceSalesOrderId)
  loop Mỗi item trả
    BE->>DB: INSERT SalesOrderItem
    BE->>DB: UPDATE Product SET stockOnHand = stockBefore + quantity (cộng lại)
    BE->>DB: INSERT InventoryTransaction (RETURN_IN)
  end

  BE->>BE: COMMIT TRANSACTION
  BE-->>UI: Return receipt data
```

### 4.4 Draft Tab Auto-Save

```mermaid
sequenceDiagram
  participant UI as Frontend (React state)
  participant API as REST API
  participant BE as Backend
  participant DB as SQL Server

  Note over UI: User thay đổi giỏ hàng
  UI->>UI: setTabs() → re-render
  UI->>UI: useEffect phát hiện activeTab thay đổi
  UI->>UI: Clear timer cũ (nếu có)
  UI->>UI: setTimeout 500ms → persistDraftTab()

  UI->>API: PUT /pos/draft-tabs/:draftTabId
  API->>BE: updateDraftTab()
  BE->>DB: UPDATE PosDraftTabs SET ...
  BE->>DB: DELETE PosDraftTabItems WHERE posDraftTabId = :id
  BE->>DB: INSERT PosDraftTabItems (batch)
  DB-->>BE: Done
  BE-->>API: Updated tab response
  API-->>UI: 200 OK

  alt Lỗi network
    UI->>UI: message.error("Không lưu được tab tạm")
    Note over UI: Dữ liệu vẫn còn trong React state
  end
```

## 5. Kiến Trúc Database — Entity Relationship

```mermaid
erDiagram
  Roles {
    int Id PK
    nvarchar Code
    nvarchar Name
    bit IsActive
  }

  Users {
    int Id PK
    int RoleId FK
    nvarchar Username
    nvarchar PasswordHash
    nvarchar FullName
    bit IsActive
  }

  Categories {
    int Id PK
    int ParentId FK "nullable, 3 levels"
    nvarchar Name
    bit IsActive
  }

  Brands {
    int Id PK
    nvarchar Name
    bit IsActive
  }

  Units {
    int Id PK
    nvarchar Name
    bit IsBaseUnit
  }

  Suppliers {
    int Id PK
    nvarchar Name
    nvarchar PhoneNumber
    nvarchar Address
  }

  Products {
    int Id PK
    int CategoryId FK
    int BrandId FK "nullable"
    int UnitId FK
    nvarchar ProductCode UK
    nvarchar Barcode "nullable, unique index"
    nvarchar Name
    decimal CostPrice
    decimal SalePrice
    decimal StockOnHand
    decimal MinStock
    decimal MaxStock
    bit AllowDirectSale
    bit IsActive
    bit TrackBatchExpiry
  }

  ProductImages {
    int Id PK
    int ProductId FK
    nvarchar ImageUrl
    int SortOrder
  }

  ProductUnits {
    int Id PK
    int ProductId FK
    int UnitId FK
    nvarchar Barcode "nullable, unique index"
    decimal ConversionValue
    decimal CostPrice
    decimal SalePrice
    bit AllowDirectSale
    bit IsDefaultForPos
    bit IsSmallestUnit
    bit IsActive
  }

  PurchaseOrders {
    int Id PK
    int SupplierId FK "nullable"
    int CreatedByUserId FK
    int ApprovedByUserId FK "nullable"
    nvarchar PurchaseOrderCode UK
    nvarchar Status "DRAFT / CONFIRMED / CANCELLED"
    decimal TotalAmount
  }

  PurchaseOrderItems {
    int Id PK
    int PurchaseOrderId FK
    int ProductId FK
    int ProductUnitId FK
    nvarchar ProductCodeSnapshot
    nvarchar ProductNameSnapshot
    decimal Quantity
    decimal CostPrice
    decimal LineTotal
  }

  SalesOrders {
    int Id PK
    int CreatedByUserId FK
    int CancelledByUserId FK "nullable"
    int SourceSalesOrderId FK "nullable, for RETURN"
    nvarchar SalesOrderCode UK
    nvarchar OrderType "SALE / RETURN"
    nvarchar Status "COMPLETED / CANCELLED / RETURNED"
    nvarchar SaleMode "QUICK_SALE / NORMAL_SALE / DELIVERY_SALE"
    nvarchar PaymentMethod "CASH / BANK_TRANSFER / CARD / EWALLET"
    nvarchar CustomerName "nullable"
    nvarchar CustomerPhone "nullable"
    decimal TotalAmount
    decimal DiscountAmount
    decimal ReturnFeeAmount
    decimal CustomerPaidAmount
    decimal ChangeAmount
    datetime SoldAt
  }

  SalesOrderItems {
    int Id PK
    int SalesOrderId FK
    int ProductId FK
    int ProductUnitId FK
    nvarchar ProductCodeSnapshot
    nvarchar BarcodeSnapshot "snapshot at sale time"
    nvarchar ProductNameSnapshot
    nvarchar UnitNameSnapshot
    decimal ConversionValue
    decimal Quantity
    decimal CostPrice
    decimal UnitPrice
    decimal DiscountAmount
    decimal LineTotal
  }

  InventoryTransactions {
    int Id PK
    int ProductId FK
    int PurchaseOrderId FK "nullable"
    int SalesOrderId FK "nullable"
    int CreatedByUserId FK "nullable"
    nvarchar TransactionType "SALE_OUT / RETURN_IN / PURCHASE_IN / ADJUSTMENT..."
    nvarchar ReferenceCode
    decimal QuantityChange "negative for OUT, positive for IN"
    decimal StockBefore
    decimal StockAfter
    decimal UnitCost "nullable"
    datetime TransactionAt
  }

  PosDraftTabs {
    int Id PK
    int CreatedByUserId FK
    nvarchar TabCode UK
    nvarchar TabType "SALE / RETURN"
    nvarchar Title
    nvarchar SaleMode
    decimal CustomerPaidAmount
    decimal DiscountAmount
    bit IsActive
    datetime LastTouchedAt
  }

  PosDraftTabItems {
    int Id PK
    int PosDraftTabId FK
    int ProductId FK
    int ProductUnitId FK
    nvarchar ProductCodeSnapshot
    nvarchar ProductNameSnapshot
    decimal Quantity
    decimal UnitPrice
    decimal DiscountAmount
    decimal LineTotal
    int SortOrder
  }

  PrintTemplates {
    int Id PK
    nvarchar Code UK
    nvarchar Name
    nvarchar HtmlContent
    bit IsDefault
  }

  Settings {
    int Id PK
    nvarchar StoreName
    nvarchar StoreAddress
    nvarchar StorePhoneNumber
    nvarchar ReceiptHeader
    nvarchar ReceiptFooter
  }

  %% Relationships
  Users }o--|| Roles : "RoleId"
  Products }o--|| Categories : "CategoryId"
  Products }o--o| Brands : "BrandId"
  Products }o--|| Units : "UnitId"
  ProductImages }o--|| Products : "ProductId"
  ProductUnits }o--|| Products : "ProductId"
  ProductUnits }o--|| Units : "UnitId"
  PurchaseOrders }o--o| Suppliers : "SupplierId"
  PurchaseOrders }o--|| Users : "CreatedByUserId"
  PurchaseOrderItems }o--|| PurchaseOrders : "PurchaseOrderId"
  PurchaseOrderItems }o--|| Products : "ProductId"
  PurchaseOrderItems }o--|| ProductUnits : "ProductUnitId"
  SalesOrders }o--|| Users : "CreatedByUserId"
  SalesOrders }o--o| SalesOrders : "SourceSalesOrderId"
  SalesOrderItems }o--|| SalesOrders : "SalesOrderId"
  SalesOrderItems }o--|| Products : "ProductId"
  SalesOrderItems }o--|| ProductUnits : "ProductUnitId"
  InventoryTransactions }o--|| Products : "ProductId"
  InventoryTransactions }o--o| PurchaseOrders : "PurchaseOrderId"
  InventoryTransactions }o--o| SalesOrders : "SalesOrderId"
  PosDraftTabs }o--|| Users : "CreatedByUserId"
  PosDraftTabItems }o--|| PosDraftTabs : "PosDraftTabId"
  PosDraftTabItems }o--|| Products : "ProductId"
  PosDraftTabItems }o--|| ProductUnits : "ProductUnitId"
```

## 6. Luồng Middleware / Interceptor

```mermaid
flowchart LR
  subgraph Request
    REQ[HTTP Request]
  end

  subgraph NestJS Pipeline
    direction TB
    CORS[CORS middleware] --> Validation[ValidationPipe<br/>global]
    Validation --> Controller[Controller<br/>route handler]
    Controller --> Service[Service<br/>business logic]
    Service --> TypeORM[TypeORM<br/>Repository / QueryBuilder]
  end

  subgraph Response
    RES[JSON Response<br/>{ success, message, data }]
  end

  REQ --> CORS
  TypeORM -->|SQL| DB[(SQL Server)]
  DB --> TypeORM
  Service --> RES

  style CORS fill:#e1f5fe
  style Validation fill:#e1f5fe
  style DB fill:#f3e5f5
```

## 7. State Management — Frontend (App.tsx)

```mermaid
stateDiagram-v2
  [*] --> LOADING: Mở ứng dụng

  LOADING --> READY: bootstrapDraftTabs() thành công
  LOADING --> ERROR: Lỗi tải tabs

  state READY {
    [*] --> IDLE: focusSearchInput()

    IDLE --> SEARCHING: User nhập keyword
    SEARCHING --> SHOW_RESULTS: search response
    SHOW_RESULTS --> IDLE: Chọn sản phẩm / Enter

    IDLE --> ITEM_ADDED: addProductToActiveTab()
    ITEM_ADDED --> IDLE: Cập nhật state

    IDLE --> SAVING: useEffect 500ms
    SAVING --> IDLE: PUT draft-tabs OK
    SAVING --> IDLE: PUT lỗi (vẫn giữ state)

    IDLE --> CHECKING_OUT: Bấm THANH TOÁN
    CHECKING_OUT --> SHOW_RECEIPT: POST checkout OK
    CHECKING_OUT --> IDLE: Lỗi thanh toán

    SHOW_RECEIPT --> PRINTING: Bấm IN
    PRINTING --> IDLE: window.print() done
    SHOW_RECEIPT --> IDLE: Đóng modal
  }

  ERROR --> READY: Thử lại
```

## 8. Product Search Strategy

```mermaid
flowchart TD
  START([User nhập keyword]) --> ENTER{Phím Enter?}

  ENTER -->|Yes| RESOLVE[Gọi resolve API<br/>GET /pos/products/resolve?code=keyword]
  ENTER -->|No| DEBOUNCE[Chờ 250ms debounce]

  DEBOUNCE --> SEARCH[Gọi search API<br/>GET /pos/products/search?keyword=keyword&limit=8]
  SEARCH --> SHOW[Hiển thị dropdown kết quả<br/>+ highlight item đầu tiên]
  SHOW --> NAV{Phím mũi tên?}
  NAV -->|ArrowDown| NEXT[Highlight item tiếp theo]
  NAV -->|ArrowUp| PREV[Highlight item trước đó]
  NAV -->|Enter| SELECT[Chọn item đang highlight]

  RESOLVE --> FOUND{Found 200?}
  FOUND -->|Yes| ADD[addProductToActiveTab]
  FOUND -->|No| SEARCH

  ADD --> MERGE{Cùng productUnitId?}
  MERGE -->|Đã có trong giỏ| INCREASE[Tăng quantity +1]
  MERGE -->|Chưa có| NEW[Thêm dòng mới<br/>quantity=1, sortOrder=next]

  INCREASE --> CLEAR[Xoá search, focus input]
  NEW --> CLEAR
  SELECT --> ADD
```

## 9. Inventory Transaction Types

```mermaid
flowchart TD
  subgraph Legend
    IN(("+")), OUT(("-"))
  end

  INITIAL[INITIAL_IMPORT] -->|Cộng tồn| IN_P(Product.StockOnHand +)
  PURCHASE[PURCHASE_IN] -->|Cộng tồn| IN_P
  RETURN_IN[RETURN_IN<br/>Trả hàng] -->|Cộng tồn| IN_P
  CANCEL_SALE_IN[CANCEL_SALE_IN<br/>Hủy hóa đơn] -->|Cộng tồn| IN_P
  ADJUST_IN[ADJUSTMENT_IN<br/>Kiểm kê tăng] -->|Cộng tồn| IN_P

  SALE_OUT[SALE_OUT<br/>Bán hàng] -->|Trừ tồn| OUT_P(Product.StockOnHand -)
  ADJUST_OUT[ADJUSTMENT_OUT<br/>Kiểm kê giảm] -->|Trừ tồn| OUT_P

  IN_P --> AUDIT[InventoryTransactions<br/>stockBefore / stockAfter
  referenceCode = SalesOrderCode]
  OUT_P --> AUDIT
```

## 10. Cấu Trúc Response JSON

```mermaid
flowchart LR
  subgraph Success
    S1[success: true]
    S2[message: "OK"]
    S3[data: {...}]
  end

  subgraph Error
    E1[success: false]
    E2[message: "Validation failed"]
    E3[errors: [...]]
  end

  subgraph ErrorItem
    E3a[field: "items[0].quantity"]
    E3b[message: "Quantity must > 0"]
  end

  E3 --> E3a
  E3 --> E3b
```

## 11. Checkout — Server-Side Calculation

```mermaid
flowchart TD
  START_CHECKOUT([POST /pos/checkout]) --> VALIDATE{items.length > 0?}
  VALIDATE -->|No| ERR1[400 Cart is empty]
  VALIDATE -->|Yes| FETCH[DB: SELECT ProductUnit<br/>WHERE id IN :ids AND isActive=true<br/>JOIN Product + Unit]

  FETCH --> MAP[Tạo Map<productUnitId, ProductUnit>]
  MAP --> LOOP_ITEMS

  subgraph LOOP_ITEMS[Với mỗi item trong payload]
    direction TB
    CHECK_MAP{productUnitMap.has(id)?}
    CHECK_MAP -->|No| ERR2[400 Invalid product unit]
    CHECK_MAP -->|Yes| CHECK_ACTIVE{product.isActive<br/>& allowDirectSale?}
    CHECK_ACTIVE -->|No| ERR3[400 Product inactive]
    CHECK_ACTIVE -->|Yes| CALC[grossAmount = qty * unitPrice<br/>lineTotal = grossAmount - discountAmount]
    CALC --> CHECK_NEG{lineTotal < 0?}
    CHECK_NEG -->|Yes| ERR4[400 Invalid line total]
    CHECK_NEG -->|No| ACCUM[subtotal += grossAmount<br/>lineDiscount += discountAmount<br/>itemCount += qty]
  end

  LOOP_ITEMS --> ORDER_DISC[orderDiscountAmount = payload.discountAmount]
  ORDER_DISC --> TOTAL[totalAmount = subtotal - lineDiscount - orderDiscount]
  TOTAL --> CHECK_TOTAL{totalAmount < 0?}
  CHECK_TOTAL -->|Yes| ERR5[400 Invalid total]
  CHECK_TOTAL -->|No| CHECK_CASH{paymentMethod = CASH<br/>& customerPaid < total?}
  CHECK_CASH -->|Yes| ERR6[400 Paid amount insufficient]
  CHECK_CASH -->|No| CHANGE[changeAmount = customerPaid - total]
  CHANGE --> TX_BEGIN[BEGIN TRANSACTION]

  TX_BEGIN --> SAVE_ORDER[INSERT SalesOrder<br/>status=COMPLETED<br/>orderType=SALE]
  SAVE_ORDER --> SAVE_ITEMS

  subgraph SAVE_ITEMS[Với mỗi normalizedItem]
    direction TB
    SI1[INSERT SalesOrderItem<br/>code/name/price snapshot]
    SI2[UPDATE Product.stockOnHand -= qty]
    SI3[INSERT InventoryTransaction<br/>type=SALE_OUT<br/>stockBefore / stockAfter]
  end

  SAVE_ITEMS --> TX_COMMIT[COMMIT TRANSACTION]
  TX_COMMIT --> RESPONSE

  subgraph RESPONSE[Return]
    R1[salesOrderId]
    R2[salesOrderCode: HD{id}]
    R3[receiptData: store info + items]
    R4[summary: totals + change]
  end

  ERR1 --> BAD_RESPONSE[400 BadRequestException]
  ERR2 --> BAD_RESPONSE
  ERR3 --> BAD_RESPONSE
  ERR4 --> BAD_RESPONSE
  ERR5 --> BAD_RESPONSE
  ERR6 --> BAD_RESPONSE
```

## 12. Thư Tự Khởi Tạo Ứng Dụng

```mermaid
flowchart TD
  START([npm run start:dev]) --> NEST[NestFactory.create(AppModule)]

  NEST --> CORS[app.enableCORS<br/>origin: localhost:5173]
  CORS --> PREFIX[app.setGlobalPrefix /api/v1]
  PREFIX --> PIPE[app.useGlobalPipes<br/>ValidationPipe: transform, whitelist, forbidNonWhitelisted]

  PIPE --> LISTEN[app.listen 3000]

  LISTEN --> DB_CONN[TypeORM connects to SQL Server<br/>host: env.DB_HOST / default 10.22.10.22]
  DB_CONN --> MODULES[NestJS loads modules]

  subgraph MODULES[Module initialization]
    CFG[ConfigModule: loads .env]
    TYPEORM[TypeOrmModule: synchronize=false, autoLoadEntities=true]
    POS[PosModule: registers controllers + providers + TypeORM features]
  end

  MODULES --> READY[Server ready on port 3000]
```

## 13. Security Boundary — Kế Hoạch

```mermaid
flowchart TD
  subgraph Client
    BROWSER[Browser]
    LOCAL_STORAGE[JWT Token<br/>localStorage]
  end

  subgraph Server
    AUTH_MID[JwtAuthGuard<br/>global]
    ROLES_MID[RolesGuard<br/>@Roles decorator]
    VALIDATE[ValidationPipe<br/>class-validator]
    LOGIN[POST /auth/login<br/>username + password]
  end

  subgraph Database
    USERS_TABLE[Users table<br/>PasswordHash: bcrypt]
    ROLES_TABLE[Roles table<br/>MANAGER / STAFF]
  end

  BROWSER -->|"Authorization: Bearer &lt;jwt&gt;"| AUTH_MID
  AUTH_MID -->|Extract user| ROLES_MID
  ROLES_MID -->|Check role| CONTROLLER[Controller]
  CONTROLLER --> VALIDATE

  LOGIN -->|Verify| USERS_TABLE
  USERS_TABLE -->|"bcrypt.compare()"| LOGIN
  LOGIN -->|Sign JWT| BROWSER

  note right of AUTH_MID: CHƯA TRIỂN KHAI<br/>Hiện tại dùng x-user-id header
```
