# Changelog

## [Unreleased] — proV1

### Added
- **Render deployment guide**: `RENDER_DEPLOYMENT.md` — chi tiết deploy PostgreSQL, backend, frontend
- **receiptPoweredBy**: in chữ cuối hóa đơn (VD: "Powered by KIOTVIET") từ cấu hình Settings
- **Permissions column**: thêm cột Permissions vào Roles, seed data (MANAGER: 17 quyền, STAFF: 6 quyền)

### Changed
- **Database**: SQL Server → PostgreSQL (Docker + Render), init schema tại `docs/postgres-init.sql`
- **Docker Compose**: thêm service postgres:16-alpine, init SQL tự động
- **Receipt title**: "HÓA ĐƠN TẠM TÍNH" → "HÓA ĐƠN BÁN HÀNG" (đã thanh toán)
- **Backend CORS**: linh hoạt qua env var CORS_ORIGIN (hỗ trợ nhiều origin)
- **Frontend API base**: dùng VITE_API_BASE_URL cho Render, fallback `/api/v1`

### Fixed
- **Draft tab 404**: persistDraftTab tự động xóa tab cũ nếu backend trả 404 (tab đã bị xóa từ thiết bị khác)
- **Role entity merge**: giữ `varchar` từ proV1 + cột `Permissions` từ main
- **Keyboard shortcuts**: F8 thanh toán, Ctrl+F tìm kiếm, F1 tab mới, Escape xóa search
- **Auto-focus search**: focus ô tìm kiếm khi chuyển tab
- **Fullscreen**: nút toggle toàn màn hình trong SessionBar
- **Panel resize**: drag-to-resize handle giữa 2 panel (20%-80%)
- **Collapse/expand**: nút thu gọn checkout panel trên header (mọi màn hình)
- **CSS variables**: 14 token màu (`--pos-danger`, `--pos-warning`, `--pos-info`, `--pos-text-*`, `--pos-bg-*`, `--pos-border-*`)
- **Custom scrollbar**: 5px bo tròn cho sale-list, overview-grid, product-grid, checkout-form, settings-list
- **Button press feedback**: `:active` scale(0.97) trên print/pay, quick-money, sale-mode, checkout-collapse-btn
- **Loading skeleton**: `<Skeleton>` cho overview detail khi đang tải
- **LANG keys**: 10 keys mới (cancel + fullscreen)
- **Overview 50/50**: tổng quan luôn chia đôi 2 panel

### Changed
- **Print button**: từ xám → nền subtle + viền, hover/active xanh
- **Process bar**: dot 6→10px, label 10→12px, gap 8px, pulse mượt hơn
- **Overview grid**: font 10→12px, padding 3→5px
- **Checkout total**: font 24→28px, weight 800, letter-spacing
- **Settings chevron**: từ ký tự `>` → mũi tên CSS
- **Checkout panel shadow**: từ custom → `--pos-shadow-md`
- **Row hover elevation**: sale/purchase/overview hover lên `--pos-shadow-md`
- **Summary section**: inset shadow + padding lớn hơn
- **Compact items**: sale-row (padding 6→2px, min-height 36→28px), purchase-table (42→28px), return-search (padding 10→6px), found-invoice-row (padding 8→4px)
- **Bỏ MoreOutlined**: xóa nút placeholder "đang phát triển" + update grid 8→7 cột

### Fixed
- **Bỏ password tổng quan**: handleOpenOverview vào thẳng overview
- **Nested `<button>`**: SettingsPage dòng 345-350
- **Hardcoded strings**: OverviewView dùng LANG keys thay text thuần
