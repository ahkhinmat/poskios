# Settings Page - Cấu hình hệ thống

## Backend
- `GET /api/v1/pos/settings` — lấy toàn bộ cấu hình (store, receipt, loyalty)
- `PUT /api/v1/pos/settings` — cập nhật (MANAGER only)
- `UpdateSettingsDto` validation
- `SettingService.getAllSettings()` / `updateSettings()` xử lý mapping
- PosService + PosController delegate endpoints

## Frontend
- `SettingsPage.tsx` — iOS-style grouped settings modal (3 section: CỬA HÀNG, HÓA ĐƠN, TÍCH ĐIỂM)
  - Row hiển thị label + value + dấu `>`, tap mở modal edit
  - Edit bằng Input / InputNumber / Input.TextArea tuỳ loại
  - Lưu từng field riêng qua `PUT /pos/settings`
- Button `⚙` ở thanh mode (MANAGER only)
- CSS: bo góc 14px, section header uppercase, row hover/active

## Cập nhật real-time
- `usePosPage` gọi `GET /pos/settings` khi khởi tạo → `appSettings` state
- `buildDraftReceipt()` dùng `appSettings` (fallback LANG)
- Khi đóng SettingsPage, gọi `p.loadAppSettings()` refresh
- Backend dùng `getOrCreateSetting()` → checkout mới dùng giá trị mới ngay

## Tham số
| Section | Field | Type |
|---------|-------|------|
| CỬA HÀNG | Tên, Địa chỉ, SĐT | text |
| HÓA ĐƠN | Header, Footer | text |
| TÍCH ĐIỂM | Số tiền/1 điểm, Giá trị 1 điểm, Điểm tối thiểu, Ngày hết hạn | number |
