# Extended Settings + LANG Migration

## Cấu hình mở rộng (17 tham số mới)

### Backend
- Entity `Setting`: 17 cột mới (CurrencySuffix, Locale, ReceiptPaperWidth...)
- `UpdateSettingsDto`: validation cho tất cả field mới
- `SettingService.getOrCreateSetting()`: defaults cho field mới
- `SettingService.getAllSettings()` / `updateSettings()`: map đầy đủ
- SQL migration: `docs/sqlserver-alter-settings-extended.sql`

### Services wiring
- `SalesOrderService`: dùng `setting.salesOrderPrefix/returnOrderPrefix/defaultPaymentMethod/invoiceSearchMaxResults`
- `PurchaseOrderService`: dùng `setting.purchaseOrderPrefix`
- `CustomerLoyaltyService`: dùng `setting.customerSearchMaxResults`
- `DraftTabService`: inject `SettingService`, dùng `defaultPaymentMethod`

### Frontend
- `AppSettings` type: thêm 17 field
- `SettingsPage.tsx`: 7 section (CỬA HÀNG, HÓA ĐƠN, THANH TOÁN, MÃ TỰ ĐỘNG, TÌM KIẾM, KHÁC, TÍCH ĐIỂM)
  - InputType: text-short (Input), text (TextArea), number, phone, number-nullable
  - Bố cục iOS-style, edit từng field qua modal riêng
- `usePosPage.ts`: dùng `appSettings` cho `defaultPaymentMethod`, `defaultAddQuantity`, `productSearchMaxResults`
- `CheckoutPanel.tsx`: nút tiền nhanh dùng `quickPayAmount1/2/3` + locale từ settings

## LANG Migration
- 42 keys mới trong lang.ts
- LoginPage: 10 hardcoded → LANG
- usePosPage: 6 permission warnings + logout → LANG
- PosPage: logout tooltip → LANG
- CheckoutPanel: NK/TH/BH badges → LANG
- OverviewView: .replace(' nhập', '') → LANG.purchaseTableQtyShort
- SettingsPage: 3 messages + 'ngày' → LANG
- ProductManager: 19 strings → LANG

## UI tweaks
- Bỏ nút "Cấu hình tích điểm" khỏi CheckoutPanel (vẫn có trong Settings ⚙)
- Chuyển nút "Lịch sử điểm" ra cạnh nút "+" thêm số điện thoại
- Dọn props `canManage`, `onSetLoyaltySettingsOpen` không dùng
