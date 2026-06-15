# Auth JWT + RBAC & Tai cau truc code

## Them module Auth

- `backend/src/modules/auth/` — 13 files
  - `auth.controller.ts`, `auth.service.ts`, `auth.module.ts`
  - `auth.config.ts` — JWT expiresIn tu .env
  - `entities/user.entity.ts`, `entities/role.entity.ts`
  - `dto/login.dto.ts`
  - `guards/jwt-auth.guard.ts` (global)
  - `guards/roles.guard.ts`
  - `decorators/public.decorator.ts`
  - `decorators/roles.decorator.ts`
  - `decorators/current-user.decorator.ts`
  - `types/authenticated-user.type.ts`

- `backend/.env.example` — them `JWT_SECRET`, `JWT_EXPIRES_IN`
- `backend/src/app.module.ts` — global JwtAuthGuard + RolesGuard; import AuthModule
- `backend/src/modules/pos/pos.controller.ts` — bo `x-user-id` header, dung `@CurrentUser()`
- `backend/src/modules/pos/returns.controller.ts` — bo `x-user-id` header, dung `@CurrentUser()`
- `docs/sqlserver-seed-test-users.sql` — them `manager01 / staff01`

### API endpoints moi

| Method | Endpoint | Public | Mo ta |
|--------|----------|--------|-------|
| POST | `/api/v1/auth/login` | Co | Dang nhap, tra ve JWT + user |
| GET | `/api/v1/auth/me` | Khong | Thong tin user hien tai |

### RBAC

- `STAFF` — ban hang, tra hang
- `MANAGER` — tat ca quyen + nhap hang, quan ly danh muc, tong quan, cau hinh tich diem

## Tai cau truc backend (service split)

`pos.service.ts` (~2800 dong) giam xuong con ~120 dong, delegate sang 7 service moi:

| Service | File | Chuc nang |
|---------|------|-----------|
| ProductService | `services/product.service.ts` | Tim kiem, resolve, CRUD san pham + product unit |
| SalesOrderService | `services/sales-order.service.ts` | Checkout ban hang, tra hang, tim hoa don |
| DraftTabService | `services/draft-tab.service.ts` | CRUD draft tab tam |
| PurchaseOrderService | `services/purchase-order.service.ts` | Checkout nhap hang |
| CustomerLoyaltyService | `services/customer-loyalty.service.ts' | Khach hang, tich diem, settings |
| OverviewService | `services/overview.service.ts` | Dashboard tong quan |
| CategorySupplierService | `services/category-supplier.service.ts` | Danh muc, nha cung cap, don vi tinh |

`pos.module.ts` — dang ky tat ca services + entities.

## Tai cau truc frontend (routing)

- `auth-context.tsx` — AuthProvider + useAuth hook
- `pages/LoginPage.tsx` — Trang dang nhap
- `pages/PosPage.tsx` — Trang POS chinh (da tach khoi App.tsx)
- `App.tsx` — Giam tu 2539 dong xuong ~40 dong; dung BrowserRouter + /login, /* routes
- `main.tsx` — Khong doi

### Frontend routing

| Route | Component | Mo ta |
|-------|-----------|-------|
| `/login` | LoginPage | Trang dang nhap (redirect ve / neu da auth) |
| `/*` | ProtectedRoute > PosPage | Trang POS (redirect ve /login neu chua auth) |

## Unit tests

| File | Tests |
|------|-------|
| `auth.service.spec.ts` | 4 tests — login fail (wrong user, inactive role, wrong pass), login success |
| `sales-order.service.spec.ts` | 2 tests — empty cart checkout, empty cart return |
| `product.service.spec.ts` | 1 test — service defined |

`npm test` — 7 passed, 3 suites.

## Logging

- `AuthService` — warn khi login that bai, log khi login thanh cong
- `PosService` (facade) — log checkout/purchase checkout voi so luong items

## VSCode settings

- `.vscode/settings.json` — formatOnSave, prettier default, single quote, UTF-8 LF

## Xoa `as any` — type safety

4 occurrences da duoc thay the bang kieu chinh xac:

| File | Dòng | Truoc | Sau |
|------|------|-------|-----|
| `sales-order.service.spec.ts` | 38, 46 | `as any` | `as unknown as PosCheckoutDto` / `ReturnCheckoutDto` |
| `usePosPage.ts` | 1248, 1303 | `{ data: ..., ... } as any` | `{ ...receiptData, ... }` (spread) |
- Khong con `as any` nao trong codebase

## Consolidate `getOrCreateSetting()`

- Tao `SettingService` moi (`services/setting.service.ts`) — `@Injectable()` voi `@InjectRepository(Setting)`
- `CustomerLoyaltyService` — inject `SettingService`, xoa method `getOrCreateSetting()` duplicate
- `PurchaseOrderService` — inject `SettingService`, xoa method `getOrCreateSetting()` duplicate
- `PosService` — inject `SettingService`, dung thay cho `customerLoyaltyService.getOrCreateSetting()`
- `pos.module.ts` — them `SettingService` vao SERVICES array

## Tach components tu PosPage (943 → 446 dong)

| Component | File | JSX dong | Chuc nang |
|-----------|------|----------|-----------|
| SaleList | `components/SaleList.tsx` | 96 | Danh sach items ban hang |
| PurchaseTable | `components/PurchaseTable.tsx` | 97 | Bang nhap hang |
| OverviewView | `components/OverviewView.tsx` | 92 | Dashboard tong quan |
| ReturnSearchPanel | `components/ReturnSearchPanel.tsx` | 73 | Tim hoa don tra hang |
| PosModals | `components/PosModals.tsx` | 215 | 8 modal dialogs (close tab, receipt, lich su tich diem, ten KH, cau hinh tich diem, SupplierManager, ProductManager, password) |

Moi component nhan props kieu dinh (typed props), khong con phu thuoc vao object `p` tu `usePosPage`.

## Code-split route-level (React.lazy)

- `LoginPage` va `PosPage` duoc lazy-load rieng (chunk rieng)
- `App.tsx` dung `Suspense` voi `PageLoading` fallback
- Kich thuoc chunk: LoginPage **3.5 KB**, PosPage **501 KB** (giam tu ~1.14 MB)

## Integration tests (e2e)

| File | Tests | Mo ta |
|------|-------|-------|
| `test/pos-checkout.e2e-spec.ts` | 3 | Empty cart reject, empty return reject, checkout validation |
| `test/app.e2e-spec.ts` | 1 | Sua test cho response format moi |

`npm run test:e2e` — 3 passed, `npm test` — 7 passed.
