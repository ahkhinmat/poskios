# Changelog

## [Unreleased] — feature/ui-permissions

### Added
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
