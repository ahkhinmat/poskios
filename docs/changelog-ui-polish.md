# Changelog - UI Polish & Nâng cấp giao diện

## Tổng quan
Cải thiện giao diện người dùng toàn diện: animations, card-style, shadows, chuyển Modal sang Drawer.

## Thay đổi

### 1. CSS tổng thể (`styles.css`)
- Thêm CSS variables: `--pos-shadow-sm/md/lg`, `--pos-radius-sm/md/lg`, `--pos-transition`
- Thêm keyframe animations: `fadeIn`, `slideUp`, `scaleIn`, `slideInRight`, `shimmer`
- Nâng cấp shadows, border-radius, transitions cho toàn bộ component

### 2. LoginPage
- Background gradient đa lớp (3 radial gradients)
- Panel bo góc 12px, shadow lớn hơn
- Animation `slideUp` khi form hiện ra
- Input/Button `size="large"` cho trải nghiệm tốt hơn

### 3. PosPage (màn hình POS chính)
- **Topbar**: Gradient xanh lá (`#15803d → #16a34a`), box-shadow
- **Mode tabs**: Thêm icon cho từng mode (`ShoppingCartOutlined`, `SwapOutlined`, `ImportOutlined`, `AppstoreOutlined`, `BarChartOutlined`, `ContainerOutlined`)
- **Search results**: Highlight có border-left, stock màu xanh/đỏ, giá màu xanh lá

### 4. Sale rows
- Card-like với shadow, border-radius 8px
- Hover effect: border chuyển màu xanh, shadow nhẹ
- Animation `slideUp` khi render

### 5. CheckoutPanel
- Box-shadow trái (`-2px 0 8px`)
- Checkout header có border-bottom divider
- Summary section có border-top divider
- **Quick money buttons**: Border-radius 8px, hover translateY(-1px), exact button gradient
- **Print/Pay buttons**: Height 40px, border-radius 8px, hover translateY
- **Payment methods**: Dạng chip với border, checked state màu xanh

### 6. ProductManager — chuyển từ Modal sang Drawer
- Dùng `Drawer` với `width="100vw"` thay vì Modal
- Xóa bỏ CSS phức tạp cho Modal (`height: 100vh`, flex chain, wrapClassName)
- Drawer xử lý scroll mượt tự nhiên
- Fix lỗi không thanh cuộn dọc danh sách sản phẩm

### 7. CategoryManager — chuyển từ Modal sang Drawer
- Dùng `Drawer` width 640px thay vì Modal

### 8. Nâng cấp grid/table styles
- Overview grid rows: border-radius 6px, hover shadow, active state có outline
- Purchase table: background hover nhẹ, border màu nhẹ hơn
- Product grid: border-radius 6px, hover shadow
- Return search panel: border-radius 8px, shadow

### 9. Product detail (Drawer/Modal bên trong ProductManager)
- `PAGE_SIZE` tăng từ 10 → 30

### 10. Cấu hình động (Settings)
- **`productManagerPageSize`**: Số dòng QL SP — lấy từ API `/pos/settings`, mặc định 30
- **`searchDebounceMs`**: Delay tìm kiếm (ms) — áp dụng vào `useSearch.ts`, mặc định 250
- **`autoSaveDebounceMs`**: Delay tự lưu (ms) — áp dụng vào `useTabs.ts`, mặc định 500
- **`paymentMethods`**: Danh sách PT thanh toán (dấu phẩy) — parse động trong `PosPage.tsx`, mặc định `CASH,BANK_TRANSFER,CARD,EWALLET`
- Backend: entity, DTO, service updated
- Frontend: types, lang, SettingsPage UI updated
- Migration: `sqlserver-alter-settings-debounce-payment.sql`
