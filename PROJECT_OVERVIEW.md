# POS Kiosk — Tổng Quan Hệ Thống

## 1. Giới Thiệu

**POS Kiosk** là hệ thống Web App bán hàng siêu thị mini / POS dành cho cửa hàng nhỏ 1–2 quầy thu ngân. Hệ thống hỗ trợ quản lý sản phẩm, bán hàng tại quầy, in hóa đơn nhiệt 80mm, quản lý tồn kho, nhập hàng, báo cáo doanh thu và phân quyền nhân viên/quản lý.

---

## 2. Công Nghệ Sử Dụng

| Layer | Công Nghệ | Version |
|-------|-----------|---------|
| Frontend | React + Vite | React 19, Vite 8 |
| UI Library | Ant Design | 6.x |
| Backend | NestJS | 11.x |
| ORM | TypeORM | 1.x |
| Database | SQL Server | (qua driver `mssql`) |
| Auth | JWT + bcrypt | *(chưa triển khai, đang dùng header tạm)* |
| Bundler | Rolldown / Vite | |
| Deploy | Windows Server + PM2 | |
| In hóa đơn | HTML/CSS print (`window.print()`) | Khổ 80mm |

---

## 3. Cấu Trúc Thư Mục

```
D:\React\poskios/
├── frontend/                     # React SPA
│   ├── src/
│   │   ├── App.tsx               # Component POS chính (~1133 dòng)
│   │   ├── main.tsx              # Entry point React
│   │   ├── api.ts                # Axios instance (baseURL, x-user-id)
│   │   ├── types.ts              # TypeScript types cho POS flow
│   │   └── styles.css            # CSS (grid layout POS, receipt)
│   ├── public/                   # Static assets (icons, favicon)
│   ├── dist/                     # Build output
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                      # NestJS API server
│   ├── src/
│   │   ├── main.ts               # Bootstrap (CORS, prefix /api/v1, ValidationPipe)
│   │   ├── app.module.ts         # Root module (ConfigModule + TypeORM + PosModule)
│   │   ├── app.controller.ts     # Health check endpoint
│   │   └── modules/
│   │       └── pos/              # POS module (hiện tại là module duy nhất)
│   │           ├── pos.module.ts
│   │           ├── pos.controller.ts    # REST endpoints POS
│   │           ├── pos.service.ts       # Business logic (~1326 dòng)
│   │           ├── returns.controller.ts # Return checkout endpoint
│   │           ├── entities/            # 10 TypeORM entities
│   │           │   ├── product.entity.ts
│   │           │   ├── product-unit.entity.ts
│   │           │   ├── category.entity.ts
│   │           │   ├── unit.entity.ts
│   │           │   ├── sales-order.entity.ts
│   │           │   ├── sales-order-item.entity.ts
│   │           │   ├── inventory-transaction.entity.ts
│   │           │   ├── pos-draft-tab.entity.ts
│   │           │   ├── pos-draft-tab-item.entity.ts
│   │           │   └── setting.entity.ts
│   │           └── dto/                 # 7 DTO files
│   │               ├── pos-checkout.dto.ts
│   │               ├── pos-checkout-item.dto.ts
│   │               ├── search-pos-products-query.dto.ts
│   │               ├── resolve-pos-product-query.dto.ts
│   │               ├── return-checkout.dto.ts
│   │               ├── return-checkout-item.dto.ts
│   │               ├── create-pos-draft-tab.dto.ts
│   │               ├── update-pos-draft-tab.dto.ts
│   │               └── pos-draft-item.dto.ts
│   ├── test/                     # E2E test scaffold
│   ├── dist/                     # Build output
│   ├── checkout-test.json        # Test payload mẫu
│   ├── package.json
│   ├── nest-cli.json
│   ├── tsconfig.json
│   ├── tsconfig.build.json
│   └── eslint.config.mjs
│
├── docs/                         # Tài liệu thiết kế
│   ├── readme.md                 # Spec tổng thể (11 modules, business requirements)
│   ├── api-contract-pos-mvp.md   # API contract MVP (801 dòng)
│   ├── spec-phan-tich-danh-muc-va-man-hinh.md  # Phân tích Excel & mockup UI (701 dòng)
│   ├── sqlserver-mvp-schema.sql  # Full schema 15 bảng + indexes + seed
│   ├── sqlserver-seed-test-users.sql  # Seed user test
│   ├── sqlserver-alter-allow-negative-stock.sql  # Xoá CK cho phép tồn âm
│   ├── DanhSachSanPham_KaMax.xlsx  # File Excel mẫu 6346 sản phẩm
│   └── mockup/                   # Ảnh mockup giao diện tham chiếu
│
├── PROJECT_OVERVIEW.md           # File này
└── readme.md                     # Spec gốc (đã merge vào docs/)
```

---

## 4. Cơ Sở Dữ Liệu

### 4.1 Danh sách bảng (SQL Server)

| Bảng | Mục đích | Ghi chú |
|------|----------|---------|
| `Roles` | Vai trò: MANAGER, STAFF | Seed mặc định |
| `Users` | Tài khoản nhân viên | Có FK → Roles |
| `Categories` | Nhóm hàng (hỗ trợ 3 cấp qua ParentId) | |
| `Brands` | Thương hiệu | |
| `Units` | Đơn vị tính | |
| `Suppliers` | Nhà cung cấp | |
| `Products` | Sản phẩm | ProductCode unique, có indexes |
| `ProductImages` | Hình ảnh sản phẩm | |
| `ProductUnits` | Quy đổi đơn vị | Mỗi sản phẩm có nhiều ĐVT, giá riêng |
| `PurchaseOrders` | Phiếu nhập hàng | |
| `PurchaseOrderItems` | Chi tiết phiếu nhập | Snapshot sản phẩm |
| `SalesOrders` | Hóa đơn bán hàng / trả hàng | OrderType: SALE / RETURN |
| `SalesOrderItems` | Chi tiết hóa đơn | Snapshot sản phẩm tại thời điểm bán |
| `InventoryTransactions` | Sổ cái tồn kho | Audit trail, TransactionType enum |
| `PosDraftTabs` | Tab bán hàng tạm | Lưu giỏ hàng khi chưa checkout |
| `PosDraftTabItems` | Chi tiết tab tạm | |
| `PrintTemplates` | Mẫu in hóa đơn | HTML content, kích thước giấy |
| `Settings` | Cấu hình cửa hàng | Store name, address, receipt footer |

### 4.2 Enum nghiệp vụ

- **SaleMode**: `QUICK_SALE`, `NORMAL_SALE`, `DELIVERY_SALE`
- **PaymentMethod**: `CASH`, `BANK_TRANSFER`, `CARD`, `EWALLET`
- **SalesOrderStatus**: `DRAFT`, `COMPLETED`, `CANCELLED`, `RETURNED`
- **OrderType**: `SALE`, `RETURN`
- **InventoryTransactionType**: `INITIAL_IMPORT`, `PURCHASE_IN`, `SALE_OUT`, `RETURN_IN`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`, `CANCEL_SALE_IN`

---

## 5. API Endpoints (Hiện Tại)

Base prefix: `/api/v1`

### POS Module

| Method | Endpoint | Chức năng |
|--------|----------|-----------|
| GET | `/pos/products/search` | Tìm sản phẩm (keyword, limit) |
| GET | `/pos/products/resolve` | Tra cứu chính xác 1 sản phẩm (barcode/code) |
| GET | `/pos/products/:productId/units` | Danh sách ĐVT của sản phẩm |
| POST | `/pos/products/import/excel` | Import sản phẩm từ file .xlsx |
| GET | `/pos/draft-tabs` | Danh sách tab tạm |
| POST | `/pos/draft-tabs` | Tạo tab tạm mới |
| PUT | `/pos/draft-tabs/:draftTabId` | Cập nhật tab tạm (tự động lưu) |
| DELETE | `/pos/draft-tabs/:draftTabId` | Đóng tab tạm (soft delete) |
| POST | `/pos/checkout` | Thanh toán + tạo hóa đơn |
| POST | `/returns/checkout` | Hoàn tất trả hàng |
| GET | `/` | Health check |

### API chưa triển khai (trong spec)

| Method | Endpoint | Chức năng |
|--------|----------|-----------|
| GET | `/api/v1/invoices` | Danh sách hóa đơn (pagination) |
| GET | `/api/v1/invoices/{id}` | Chi tiết hóa đơn |
| GET | `/api/v1/invoices/{id}/receipt` | Dữ liệu in lại hóa đơn |
| POST | `/api/v1/invoices/{id}/cancel` | Hủy hóa đơn (MANAGER) |
| GET | `/api/v1/returns/invoices/search` | Tra cứu hóa đơn để trả hàng |
| POST | `/api/v1/returns/draft-tabs/from-invoice` | Tạo tab trả hàng từ hóa đơn gốc |

---

## 6. Kiến Trúc & Luồng Dữ Liệu

### 6.1 Kiến trúc tổng thể

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Frontend)                        │
│  React 19 + Ant Design 6                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐   │
│  │ Login    │  │POS Screen│  │ Dashboard│  │ Management    │   │
│  │ (chưa có)│  │ (có sẵn) │  │ (chưa có)│  │ Screens (chưa)│   │
│  └──────────┘  └──────────┘  └──────────┘  └───────────────┘   │
│         │             │             │              │             │
│         └─────────────┴─────────────┴──────────────┘             │
│                           │ axios                                │
│                    x-user-id header (tạm)                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP REST
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend (NestJS 11)                           │
│                                                                  │
│  ┌─────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │ AppModule   │  │ ConfigModule     │  │ TypeOrmModule    │   │
│  │ (root)      │  │ (.env)           │  │ (mssql)          │   │
│  └──────┬──────┘  └──────────────────┘  └──────────────────┘   │
│         │                                                        │
│  ┌──────▼──────────────────────────────────────────────────┐    │
│  │              PosModule                                   │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │    │
│  │  │PosController  │  │PosService    │  │ReturnsCtrl   │   │    │
│  │  │(10 endpoints) │──┤(1326 lines)  │  │(1 endpoint)  │   │    │
│  │  └──────────────┘  └──────┬───────┘  └──────────────┘   │    │
│  │                           │                              │    │
│  │  ┌────────────────────────▼──────────────────────────┐   │    │
│  │  │  Entities (10) + DTOs (9)                         │   │    │
│  │  └───────────────────────────────────────────────────┘   │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Modules chưa triển khai: Auth, User, Product, Brand/Unit,      │
│  Supplier, PurchaseOrder, Invoice, Inventory, Report             │
└──────────────────────────┬──────────────────────────────────────┘
                           │ TypeORM
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SQL Server                                    │
│  18 tables: Roles..Settings                                      │
│  Host: 10.22.10.22 (def), Port: 1433                             │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Luồng Checkout

```
1. User nhập barcode / tìm kiếm sản phẩm
2. Frontend gọi GET /pos/products/resolve hoặc /search
3. Sản phẩm được add vào PosDraftTab (local state + auto-save 500ms)
4. User chọn phương thức thanh toán, nhập tiền, discount
5. User bấm THANH TOÁN → POST /pos/checkout
6. Server:
   a. Validate items (productUnit mapping, active, allowDirectSale)
   b. Tính toán lại server-side (subtotal, discount, total)
   c. Transaction:
      - Tạo SalesOrder (status=COMPLETED)
      - Với mỗi item: SalesOrderItem, trừ stock, InventoryTransaction(SALE_OUT)
   d. Trả về receiptData
7. Frontend: xoá tab hiện tại, hiển thị receipt modal
8. User bấm IN → window.print() 80mm HTML
```

### 6.3 Luồng Import Excel

```
1. Upload file .xlsx (multipart)
2. Parse bằng xlsx library (sheet_to_json với header:1)
3. Validate 11 cột bắt buộc (Nhóm hàng, Mã hàng, Tên hàng, Giá bán...)
4. Auto-create Categories + Units nếu chưa tồn tại
5. Upsert Products (match theo ProductCode) + ProductUnit mặc định
6. Trả về thống kê: created/updated products & productUnits
```

---

## 7. Các Module Theo Kế Hoạch (readme)

| # | Module | Mô tả | Trạng thái |
|---|--------|-------|-----------|
| 1 | **Auth** | JWT login/logout, bcrypt, JwtAuthGuard, RolesGuard | 🔴 Chưa có |
| 2 | **User** | CRUD nhân viên, gán role Staff/Manager | 🔴 Chưa có |
| 3 | **Product** | CRUD sản phẩm, import Excel | 🟡 POS search/import có, CRUD chưa |
| 4 | **Category/Brand/Unit** | Quản lý danh mục, thương hiệu, ĐVT | 🟡 Entity có, CRUD chưa |
| 5 | **Supplier** | Quản lý nhà cung cấp | 🔴 Chưa có |
| 6 | **Purchase Order** | Nhập hàng, chọn NCC, cập nhật tồn | 🔴 Chưa có |
| 7 | **POS / Sales** | Bán tại quầy, tìm SP, scan, giỏ hàng, thanh toán, in | ✅ Có sẵn |
| 8 | **Invoice** | DS hóa đơn, chi tiết, in lại, hủy | 🔴 Chưa có |
| 9 | **Inventory** | Tồn kho, lịch sử nhập/xuất, kiểm kê | 🔴 Chưa có |
| 10 | **Report** | Báo cáo doanh thu, SP bán chạy, tồn kho | 🔴 Chưa có |
| 11 | **Setting** | Thông tin cửa hàng, cấu hình in | 🟡 Entity có, UI chưa |

---

## 8. Business Rules (Đã Chốt Cho MVP)

1. **Cho phép bán âm kho** (đã drop constraint CK_Products_StockOnHand)
2. **Cho phép sửa giá** khi bán hàng (Staff được sửa)
3. **Server-side calculation**: không tin tổng tiền từ client
4. **Snapshot sản phẩm** tại thời điểm bán (ProductCode, Name, UnitName, Price...)
5. **ProductUnit resolution**: POS ưu tiên `isSmallestUnit = true`, fallback `isDefaultForPos`
6. **Quét trùng**: tăng số lượng trên cùng 1 dòng theo productUnitId
7. **Draft tabs**: lưu database, không mất khi tắt trình duyệt
8. **Khách hàng**: chưa có module khách hàng thành viên, nhưng giữ trường customerId/Name/Phone
9. **Return**: tạo SalesOrder riêng với `OrderType = RETURN`, `SourceSalesOrderId` trỏ về hóa đơn gốc
10. **In hóa đơn**: frontend render HTML → `window.print()` khổ 80mm

---

## 9. Phân Quyền (Kế Hoạch)

| Quyền | STAFF | MANAGER |
|-------|-------|---------|
| Bán hàng POS | ✅ | ✅ |
| Tìm kiếm sản phẩm | ✅ | ✅ |
| Xem hóa đơn | ✅ | ✅ |
| In hóa đơn | ✅ | ✅ |
| Trả hàng | ✅ | ✅ |
| Sửa giá bán | ✅ | ✅ |
| Hủy hóa đơn | ❌ | ✅ |
| CRUD sản phẩm | ❌ | ✅ |
| Import Excel | ❌ | ✅ |
| Quản lý nhân viên | ❌ | ✅ |
| Xem báo cáo | ❌ | ✅ |
| Cấu hình hệ thống | ❌ | ✅ |

---

## 10. Màn Hình UI Cần Xây Dựng

| Màn hình | Trạng thái | Mô tả |
|----------|-----------|-------|
| Login | 🔴 Chưa | Form đăng nhập, JWT |
| POS bán hàng | ✅ Có | Grid 2 cột: danh sách SP + thanh toán |
| Dashboard | 🔴 Chưa | Doanh thu hôm nay, số hóa đơn, biểu đồ |
| Danh sách sản phẩm | 🔴 Chưa | Table + search + filter + import Excel |
| Tạo/sửa sản phẩm | 🔴 Chưa | Modal với tab Thông tin + Mô tả |
| Danh mục hàng hóa | 🔴 Chưa | CRUD Category, Brand, Unit |
| Nhà cung cấp | 🔴 Chưa | CRUD Supplier |
| Phiếu nhập hàng | 🔴 Chưa | Purchase order với search sản phẩm |
| Danh sách hóa đơn | 🔴 Chưa | Table + filter + chi tiết |
| Tồn kho | 🔴 Chưa | Xem + kiểm kê + điều chỉnh |
| Báo cáo | 🔴 Chưa | Doanh thu, SP bán chạy, tồn kho |
| Quản lý nhân viên | 🔴 Chưa | CRUD User, khóa/mở tài khoản |
| Cấu hình cửa hàng | 🔴 Chưa | Thông tin + mẫu hóa đơn |

---

## 11. Phân Tích Codebase — Technical Debt

### Backend

| Vấn đề | Mức độ | Mô tả |
|--------|--------|-------|
| **Không có Auth** | 🔴 Cao | JWT/bcrypt chưa triển khai, `x-user-id` là lỗ hổng |
| **God Object** | 🔴 Cao | `pos.service.ts` 1326 dòng gánh 4-5 module |
| **Concurrent không an toàn** | 🟡 TB | `SalesOrderCode` dùng `MAX(id)+1`, `TabCode` dùng `Date.now()` |
| **Import không transaction** | 🟡 TB | Nếu crash giữa chừng, DB ở trạng thái lỗi |
| **Thiếu entity Brand** | 🟡 TB | Schema có, entity TypeORM không có |
| **Cashier name hardcode** | 🟢 Nhẹ | `User ${userId}` thay vì join Users |
| **Setting lấy record đầu** | 🟢 Nhẹ | Chỉ hỗ trợ 1 cửa hàng |
| **noImplicitAny false** | 🟢 Nhẹ | TypeScript loose config |
| **Không có logging** | 🟡 TB | Không có Winston/Sentry |
| **Thiếu unit test** | 🟡 TB | Chỉ có scaffold mặc định |

### Frontend

| Vấn đề | Mức độ | Mô tả |
|--------|--------|-------|
| **SPA không routing** | 🟡 TB | `react-router-dom` trong deps nhưng chưa dùng |
| **Không có error boundary** | 🟢 Nhẹ | Crash toàn app nếu component lỗi |
| **Empty dependency arrays** | 🟢 Nhẹ | Một số useEffect thiếu deps |
| **Hardcode store name** | 🟢 Nhẹ | "KA MAX" hardcode ở App.tsx |
| **Không có loading skeleton** | 🟢 Nhẹ | Chỉ có Spin trung tâm |
| **Validation thiếu** | 🟡 TB | Quantity, discount, paid amount validate cơ bản |

---

## 12. Hướng Dẫn Chạy Dự Án

### Backend

```bash
cd backend
npm install

# Tạo file .env (tham khảo app.module.ts):
# DB_HOST=10.22.10.22
# DB_PORT=1433
# DB_USERNAME=sa
# DB_PASSWORD=abc1234!
# DB_NAME=POS
# PORT=3000

npm run start:dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Mở http://localhost:5173
```

### Database

```sql
-- Chạy theo thứ tự:
1. docs/sqlserver-mvp-schema.sql       -- Tạo bảng + seed roles/settings
2. docs/sqlserver-alter-allow-negative-stock.sql  -- Cho phép tồn âm
3. docs/sqlserver-seed-test-users.sql  -- Tạo user test
```

---

## 13. Các File Mới Cần Tạo (Thứ tự ưu tiên)

### Backend (modules mới)

```
src/modules/auth/          -- JwtAuthGuard, RolesGuard, AuthController, AuthService
src/modules/users/         -- User CRUD
src/modules/products/      -- Product CRUD (tách từ PosService)
src/modules/categories/    -- Category/Brand/Unit CRUD
src/modules/suppliers/     -- Supplier CRUD
src/modules/purchase-orders/  -- PurchaseOrder CRUD
src/modules/invoices/      -- Invoice list/detail/cancel
src/modules/inventory/     -- Inventory management
src/modules/reports/       -- Report endpoints
src/modules/settings/      -- Setting UI API
```

### Frontend (pages mới)

```
src/pages/Login/
src/pages/Dashboard/
src/pages/Products/        -- List + Create/Edit modals
src/pages/Categories/
src/pages/Suppliers/
src/pages/PurchaseOrders/
src/pages/Invoices/
src/pages/Inventory/
src/pages/Reports/
src/pages/Settings/
src/components/            -- Shared components
src/hooks/                 -- Custom hooks
src/contexts/              -- AuthContext, etc.
```

---

## 14. Deploy

- **Backend**: NestJS build → `node dist/main` → PM2 (ecosystem.config.js)
- **Frontend**: `npm run build` → static files → IIS / Nginx for Windows
- **Database**: SQL Server (cùng server hoặc riêng), backup định kỳ
- **Environment**: File `.env` cho DB_HOST, JWT_SECRET, PORT
- **In hóa đơn**: Máy in nhiệt 80mm (Xprinter), HTML `window.print()`
- **Quét mã vạch**: Máy scan USB (hoạt động như keyboard, focus vào ô search)

---

## 15. Số Liệu Tham Khảo (Từ File Excel Mẫu)

| Metric | Value |
|--------|-------|
| Số sản phẩm | ~6.346 |
| Số nhóm hàng | 73 |
| Số ĐVT | 76 |
| Sản phẩm có mã vạch | 882 |
| Sản phẩm có ĐVT | 6.274 |
| Sản phẩm có hình ảnh | 390 |
| Sản phẩm đang kinh doanh | 6.346 |
| Cho phép bán trực tiếp | 6.345 |
| Top nhóm | Bánh (888), Sữa (585), Tẩy Rửa (549) |
| Top ĐVT | Gói (2019), Chai (1094), Hộp (693) |
