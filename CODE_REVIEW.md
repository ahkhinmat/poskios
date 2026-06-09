# Code Review — Senior Software Architect

> Ngày review: 2026-06-09
> Target: Backend (NestJS + TypeORM) + Frontend (React + Ant Design)
> Quy mô: ~3.200 dòng code đọc được

---

## Tổng Quan

Dự án đang ở giai đoạn **MVP early prototype**. Backend có 1 module hoạt động (POS), frontend là 1 SPA đơn (App.tsx). Khoảng **70% code là spec/design** trong thư mục `docs/`. Coding convention cơ bản tốt (NestJS style, Ant Design pattern) nhưng tồn tại nhiều vấn đề kiến trúc nghiêm trọng do chạy MVP trước khi có nền tảng.

---

## 1. Bug Tiềm Ẩn

### CRITICAL

| # | File | Dòng | Bug | Tác động |
|---|------|------|-----|----------|
| 1 | `pos.service.ts` | 1288-1296 | **`generateSalesOrderCode()` dùng `MAX(id)+1`** — race condition. Hai request checkout đồng thời sẽ cùng đọc `latest.id = 9001` và cùng sinh `HD0009002`, dẫn đến duplicate SalesOrderCode | Dữ liệu sai, UNIQUE constraint violation khi insert, checkout fail |
| 2 | `pos.service.ts` | 885 | **`tabCode = TAB${Date.now()}`** — không an toàn concurrent. Nếu 2 tab được tạo trong cùng 1 ms, trùng tabCode | PosDraftTabs.TabCode có UNIQUE constraint, request thứ 2 fail |

### HIGH

| # | File | Dòng | Bug | Tác động |
|---|------|------|-----|----------|
| 3 | `pos.service.ts` | 510-738 | **Import Excel không chạy trong transaction**. Nếu process crash giữa vòng lặp (dòng 627-727), DB ở trạng thái inconsistent: một vài product được tạo, một vài không, category/unit đã insert nhưng product chưa | Dữ liệu không đồng bộ |
| 4 | `pos.service.ts` | 1020-1083 | **`replaceDraftTabItems()`** xoá hết items cũ (DELETE) rồi insert cái mới — không trong transaction. Nếu INSERT fail sau DELETE, mất hết items của tab | Mất dữ liệu giỏ hàng |
| 5 | `pos.service.ts` | 427-433 | **Checkout không kiểm tra stock trước khi trừ**. Mặc dù business rule cho phép bán âm kho, nhưng không có cảnh báo nào cho user biết đang bán quá tồn | User không biết đang bán âm |

### MEDIUM

| # | File | Dòng | Bug | Tác động |
|---|------|------|-----|----------|
| 6 | `pos.service.ts` | 1128-1139 | **`getSheetArrayCellText()`** không kiểm tra `columnIndex` có nằm trong bounds của `rowData` không. Nếu file Excel có hàng nào đó thiếu cột (null/undefined ở cuối), index hợp lệ nhưng giá trị undefined | Import sai dữ liệu |
| 7 | `pos.service.ts` | 50-65 | **`getSetting()`** (private, inferred) dùng `this.settingRepository.find()` không có `where`/`order` — trả về **record đầu tiên** không xác định | Setting sai nếu có nhiều hơn 1 dòng |
| 8 | `pos.service.ts` | 508 | **Cashier name hardcode** `User ${userId}` trong receipt. Không join bảng Users để lấy fullName | In hóa đơn sai tên thu ngân |
| 9 | `frontend/App.tsx` | 508-524 | **`handleChangeItemUnit()`** đổi ĐVT nhưng không điều chỉnh quantity theo conversionValue. Ví dụ Chai → Thùng (conversion=20) thì quantity=1 là sai | Sai số lượng khi đổi đơn vị |
| 10 | `frontend/App.tsx` | 710-722 | **Error handling checkout** dùng `error.response.data.message` với optional chain thủ công, dễ miss case `error.response?.data` là null | Lỗi không parse được -> hiển thị "Thanh toan that bai" generic |
| 11 | `pos.service.ts` | 288-296 | **Checkout nhận `customerPaidAmount = 0` từ client** mà không kiểm tra. Với CASH, customerPaidAmount < total -> throw. Nhưng với BANK_TRANSFER/CARD không kiểm tra | Có thể checkout với số tiền 0 |
| 12 | `frontend/App.tsx` | 173-179 | **`useEffect` tự động gán `customerPaidAmount = summary.total`** — override mọi giá trị user đã nhập | User không thể nhập số tiền khách đưa khác |

### LOW

| # | File | Dòng | Bug | Tác động |
|---|------|------|-----|----------|
| 13 | `frontend/App.tsx` | 553 | **Store name hardcode** `KA MAX` trong `buildDraftReceipt()` | Sai tên cửa hàng khi in preview |
| 14 | `frontend/App.tsx` | 362 | **`handleResolveProduct()`** không kiểm tra `searchValue.trim()` empty trước khi gọi API | Gọi API vô ích |
| 15 | `pos.service.ts` | 38-39 | **ChunkArray** → DTO `limit` default 20, nhưng service gọi `limit(query.limit)` không có fallback nếu limit undefined | Lỗi TypeORM nếu limit undefined thay vì áp default |

---

## 2. Security Issues

### CRITICAL

| # | File | Dòng | Issue | Chi tiết |
|---|------|------|-------|----------|
| 1 | `pos.controller.ts` | ~75-140 | **Zero Authentication** — không có JWT guard, không có login endpoint. Mọi API đều public | Bất kỳ ai biết URL đều có thể gọi API |
| 2 | `api.ts` | 6 | **`x-user-id: 2`** hardcode ở client. Không có xác thực, user ID do client tự chọn | User có thể giả mạo bất kỳ user nào bằng cách đổi header |

### HIGH

| # | File | Dòng | Issue | Chi tiết |
|---|------|------|-------|----------|
| 3 | `pos.controller.ts` | tất cả | **Không có Authorization** — không phân biệt STAFF vs MANAGER. Chức năng nhạy cảm (import, hủy đơn) không được bảo vệ | Staff có thể import Excel, xem báo cáo... |
| 4 | Toàn bộ backend | — | **Không có Helmet/CSP**, thiếu headers bảo mật tiêu chuẩn (X-Content-Type-Options, X-Frame-Options...) | Vulnerable to clickjacking, MIME sniffing |

### MEDIUM

| # | File | Dòng | Issue | Chi tiết |
|---|------|------|-------|----------|
| 5 | `pos.service.ts` | 511-517 | **Không validate file size** cho Excel upload. File lớn có thể gây OOM hoặc DOS | Attacker upload file 1GB+ |
| 6 | `main.ts` | 12 | **CORS origin: true** — cho phép mọi origin truy cập | Nên giới hạn origin cụ thể |
| 7 | `pos.service.ts` | 453 | **TransactionType** là string free-text. Không có enum validation, client có thể truyền transaction type không hợp lệ | Dữ liệu không nhất quán |
| 8 | Toàn bộ backend | — | **Không có rate limiting** — không có `@nestjs/throttler` | Dễ bị brute force khi có auth |

---

## 3. Performance Issues

### HIGH

| # | File | Dòng | Issue | Chi tiết | Tác động |
|---|------|------|-------|----------|----------|
| 1 | `pos.service.ts` | 740-784 | **`searchProducts()` dùng `LIKE %keyword%`** trên bảng 6.000+ sản phẩm, không có FULLTEXT index trên cột Name | Latency 200-500ms mỗi lần search |
| 2 | `pos.service.ts` | 510-738 | **Import Excel load toàn bộ sản phẩm vào memory** (productMap). Với 6.346 sản phẩm, mỗi object lớn → memory spike | OOM risk với file lớn hơn |
| 3 | `pos.service.ts` | 1190-1224 | **ChunkArray 500** → 12-13 queries riêng biệt cho 6.000 products. Mỗi query có overhead network + transaction | Import chậm |

### MEDIUM

| # | File | Dòng | Issue | Tác động |
|---|------|------|-------|----------|
| 4 | `frontend/App.tsx` | 480-505 | **`updateItem()`** tạo lại toàn bộ tabs array trên mỗi lần thay đổi 1 item (setTabs map) | Re-render toàn bộ danh sách, không tối ưu |
| 5 | `pos.service.ts` | 831-860 | **`listProductUnits()`** không có pagination. Nếu product có 50+ units, response lớn | Waste bandwidth |
| 6 | `pos.service.ts` | 862-881 | **`listDraftTabs()`** load tất cả tabs + items cùng lúc. Nếu 1 user có 100 tabs, query chậm | Cần pagination + lazy load items |
| 7 | Toàn bộ backend | — | **Không có caching layer** (Redis / memory cache) cho product search, category list | Mỗi request đều query DB trực tiếp |

### LOW

| # | File | Dòng | Issue | Tác động |
|---|------|------|-------|----------|
| 8 | `pos.service.ts` | 1-20 | Import toàn bộ NestJS/TypeORM decorators không dùng đến | Tăng compile time |
| 9 | `frontend/styles.css` | 50-54 | `.pos-grid` dùng `grid-template-columns` với `332px` fixed — không responsive | Trên màn hình nhỏ bị vỡ layout |

---

## 4. Code Smell

### CRITICAL

| # | File | Dòng | Smell | Mô tả |
|---|------|------|-------|-------|
| 1 | `pos.service.ts` | 1-1326 | **God Object** — Service xử lý: checkout, product search, product unit, import Excel, draft tab CRUD, returns. **Vi phạm Single Responsibility Principle** | Khó maintain, khó test, khó extend |
| 2 | `frontend/App.tsx` | 1-1133 | **Monolith Component** — Toàn bộ POS screen trong 1 file: search, tabs, cart, checkout, receipt, print. Không chia component con | Không thể tái sử dụng, khó test, khó đọc |

### HIGH

| # | File | Dòng | Smell | Mô tả |
|---|------|------|-------|-------|
| 3 | `pos.service.ts` | 20-35, 110-170, 280-508 | **Mixed responsibilities** — Checkout, search, import, draft tab logic đan xen trong 1 file | Cần tách thành ProductService, CheckoutService, DraftTabService, ImportService riêng |
| 4 | `pos.module.ts` | 1-35 | **Module fat** — PosModule import 10 entities, 9 repositories. Đáng lẽ phải chia nhỏ | Cần split modules |
| 5 | `frontend/App.tsx` | 86-1133 | **`PosPage()` function component ~1000 dòng** — state (30+ items), effects (8 useEffects), handlers (20+ functions), JSX (500+ dòng) | Cần tách: PosSearch, PosCart, PosCheckoutPanel, PosReceipt... |

### MEDIUM

| # | File | Dòng | Smell | Mô tả |
|---|------|------|-------|-------|
| 6 | Toàn bộ | — | **Magic strings** — `'SALE'`, `'RETURN'`, `'CASH'`, `'QUICK_SALE'`, `'SALE_OUT'`, `'RETURN_IN'` xuất hiện khắp nơi trong code | Cần TypeScript enums |
| 7 | `backend/entities/*.ts` | — | **SQL column mapping dùng camelCase** — TypeORM decorator `@Column({ name: 'SoldAt' })` mapping từ camel sang Pascal, nhưng property names không nhất quán: | Khó đọc, khó maintain mapping |
| 8 | `frontend/api.ts` | 4 | **Hardcoded API URL** `http://localhost:3000` | Phải dùng VITE_API_URL env |
| 9 | `pos.controller.ts` | ~150 | **`@Req() req: Request`** — lấy userId từ header `x-user-id` thay vì từ authenticated user context | Tạm thời nhưng cần refactor ngay khi có auth |
| 10 | `pos.service.ts` | 1297-1319 | **Type `ImportProductRow`** và **`ReceiptItem`** defined ở cuối file thay vì file types riêng | Khó tái sử dụng |

### LOW

| # | File | Dòng | Smell | Mô tả |
|---|------|------|-------|-------|
| 11 | `tsconfig.json` (backend) | 21 | **`noImplicitAny: false`** — TypeScript không bắt lỗi implicit any | Giảm type safety |
| 12 | `pos.service.ts` | 27-37 | **Decorator @Injectable()** đúng pattern, nhưng thiếu interface cho service | Khó mock khi test |
| 13 | `frontend/App.tsx` | 57-62 | **`paymentOptions`** định nghĩa array trong component scope — không dùng enum | Nên là constant file riêng |
| 14 | `pos.service.ts` | 1268 | **`normalizeLookupKey` dùng `toLocaleLowerCase('vi-VN')`** — locale-dependent, có thể khác behaviour giữa các máy | Nên dùng `.toLowerCase()` |
| 15 | `pos.service.ts` | 1227-1235 | **`chunkArray` utility** defined trong service thay vì shared | Trùng lặp code sau này |

---

## 5. Refactor Đề Xuất

### CRITICAL — Cần làm ngay lập tức

| # | Đề xuất | Lý do | Cách làm |
|---|---------|-------|----------|
| R1 | **Implement Auth Module** | Security critical | JwtAuthGuard + JwtStrategy + AuthController (login) + RolesGuard. Tham khảo `@nestjs/jwt` + `bcrypt` |
| R2 | **Fix SalesOrderCode generation** | Bug concurrency | Dùng UUID / nanoid / Redis INCR / database SEQUENCE thay vì MAX(id)+1 |
| R3 | **Tách PosService** | God Object (1326 dòng) | → `ProductService` (search, resolve, units, import), `CheckoutService` (checkout, return), `DraftTabService` (CRUD tabs + items) |

### HIGH — Cần làm trong sprint 2

| # | Đề xuất | Lý do | Cách làm |
|---|---------|-------|----------|
| R4 | **Tách App.tsx** | Monolith (1133 dòng) | → `PosPage` (layout), `PosSearch` (search box + results), `PosCart` (item list), `PosCheckoutPanel` (summary + payment), `PosReceipt` (receipt modal + print) |
| R5 | **Import Excel trong transaction** | Data integrity risk | Wrap toàn bộ import logic trong `QueryRunner` / `transaction()` |
| R6 | **Thêm enum cho business constants** | Magic string everywhere | `SalesOrderStatus`, `PaymentMethod`, `SaleMode`, `TransactionType`, `OrderType`, `TabType` |
| R7 | **Fix `replaceDraftTabItems`** | Data loss risk | Wrap DELETE + INSERT trong transaction |
| R8 | **Thêm transaction cho checkout** | ✅ Đã có transaction — verify và đảm bảo rollback đúng flow | |

### MEDIUM — Sprint 3-4

| # | Đề xuất | Lý do | Cách làm |
|---|---------|-------|----------|
| R9 | **Thêm FULLTEXT index cho Products.Name** | Performance search | SQL: `CREATE FULLTEXT CATALOG...` + `CONTAINS(Name, @keyword)` |
| R10 | **Pagination cho draft tabs + product units** | Scale issue | Thêm `skip/take` hoặc `page/pageSize` |
| R11 | **Caching layer** | Performance | NestJS cache-manager + Redis hoặc in-memory cache cho product search |
| R12 | **File upload validation** | Security | Thêm `FileInterceptor(fileFilter)`, giới hạn size (max 10MB = 20000 rows) |
| R13 | **Config validation** | Hardcoded values | `.env` validation với `class-validator` + `ConfigModule.forRoot({ validationSchema })` |
| R14 | **CORS restrict + Helmet** | Security | `origin: ['http://localhost:5173', 'https://pos.yourdomain.com']` + `Helmet` middleware |

### LOW — Sprint 5+

| # | Đề xuất | Lý do | Cách làm |
|---|---------|-------|----------|
| R15 | **Shared types** | DRY | Tạo package `@poskios/types` hoặc copy type definitions sync script |
| R16 | **Logging** | Debug production | Winston / `@nestjs/common` Logger |
| R17 | **Unit tests** | Coverage | Jest + Test Bed cho service layer |
| R18 | **Error Boundary React** | UX | `react-error-boundary` hoặc custom wrapper |
| R19 | **Lazy load draft tab items** | UX | Chỉ load items khi tab được active |
| R20 | **React Router integration** | Navigation | Routes: /login, /pos, /dashboard, /products..., Layout component với Ant Design |

---

## 6. Kiến Trúc Đề Xuất Sau Refactor (Target State)

```
src/
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts       # POST /auth/login, POST /auth/refresh
│   │   ├── auth.service.ts
│   │   ├── strategies/
│   │   │   └── jwt.strategy.ts
│   │   └── guards/
│   │       ├── jwt-auth.guard.ts    # Global
│   │       └── roles.guard.ts       # @Roles('MANAGER')
│   │
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.controller.ts      # CRUD Staff/Manager
│   │   ├── users.service.ts
│   │   └── entities/user.entity.ts
│   │
│   ├── products/                    # ★ Tách từ PosService
│   │   ├── products.module.ts
│   │   ├── products.controller.ts   # CRUD + search + resolve + units + import
│   │   ├── products.service.ts
│   │   └── entities/ (shared với POS)
│   │
│   ├── sales/                       # ★ Tách từ PosService
│   │   ├── sales.module.ts
│   │   ├── sales.controller.ts      # POST /sales/checkout
│   │   ├── sales.service.ts
│   │   └── ...
│   │
│   ├── draft-tabs/                  # ★ Tách từ PosService
│   │   ├── draft-tabs.module.ts
│   │   ├── draft-tabs.controller.ts # CRUD
│   │   ├── draft-tabs.service.ts
│   │   └── ...
│   │
│   ├── returns/                     # ★ Tách từ PosService
│   │   ├── returns.module.ts
│   │   ├── returns.controller.ts
│   │   ├── returns.service.ts
│   │   └── ...
│   │
│   ├── invoices/
│   │   ├── invoices.module.ts
│   │   ├── invoices.controller.ts   # List, detail, cancel, receipt
│   │   └── invoices.service.ts
│   │
│   ├── categories/                  # CRUD Category + Brand + Unit
│   ├── suppliers/
│   ├── purchase-orders/
│   ├── inventory/
│   ├── reports/
│   └── settings/
│
├── common/
│   ├── enums/                       # PaymentMethod, SaleMode, OrderType...
│   ├── interfaces/                  # Shared interfaces
│   ├── decorators/                  # @CurrentUser(), @Roles()
│   └── utils/                       # pagination, chunkArray...
│
└── shared/                          # Cross-module entities
    └── entities/
        ├── product.entity.ts
        ├── product-unit.entity.ts
        ├── sales-order.entity.ts
        └── ...
```

---

## 7. Action Items Priority Matrix

```
              High Impact                    Low Impact
              ──────────────────────────────────────────
    Urgent   │  R1: Auth Module            R7: Fix replaceDraftTabItems
             │  R2: Fix order code         R6: Enum for constants
             │  R3: Tách PosService        R5: Import transaction
             │  #Bug1: MAX(id)+1           #Bug4: replaceDraftTabItems
             │  #Bug3: Import no TX
             │  #Sec1: No auth
             │  #Sec2: x-user-id
    ─────────┼──────────────────────────────────────────
    Later    │  R4: Tách App.tsx           R15-R20: Low priority
             │  R9: FULLTEXT index
             │  R10: Pagination
             │  R11: Caching
             │  R12: File validation
             │  #Perf1: LIKE search
             │  #Perf2: Import memory
```

---

## 8. Kết Luận

**Điểm mạnh:**
- Business logic checkout đúng (server-side calculation, transaction, inventory audit trail)
- Spec/documentation rất chi tiết (70% codebase là docs)
- Dùng đúng NestJS pattern: module/controller/service/entity/dto
- Ant Design + React 19 hiện đại

**Điểm yếu chính:**
- **Security "zero"** — không auth, không authorization, không rate limit
- **Monolith backend** — 1 service 1326 dòng, 1 module = tất cả
- **Monolith frontend** — 1 file App.tsx 1133 dòng
- **Concurrency bugs** — order code, tab code không an toàn
- **Performance với scale** — LIKE search, no index, memory-bound import

**Khuyến nghị:**
1. **Dừng phát triển feature mới** cho đến khi có Auth Module hoạt động
2. **Fix concurrency bugs** (order code, tab code) — có thể làm trong 1 ngày
3. **Tách PosService** thành 3-4 service nhỏ trước khi thêm module mới
4. **Tách App.tsx** thành component tree trước khi thêm pages
5. Sau đó mới phát triển các module còn lại theo spec
