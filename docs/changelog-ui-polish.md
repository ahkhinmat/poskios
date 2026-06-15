# UI Polish & Cải thiện giao diện

## Thay đổi

### Components
- **SaleList.tsx**: Fix MoreOutlined (thêm onClick `errFeatureDev`)
- **CheckoutPanel.tsx**:
  - Quick-amount buttons: 100k, 200k, 500k, Tiền thừa
  - customerPaidAmount editable cho sale tabs + hiển thị tiền thừa (màu xanh dương)
  - Thêm process-bar (chấm động + label) thay cho Tag saving/synced ở topbar
  - Chuyển thông tin tích điểm lên Form.Item label, gom action buttons
- **SupplierManager.tsx**: address → Input.TextArea, thêm validation phone VN
- **PosModals.tsx**: transactionType (EARN/REDEEM/...) → tiếng Việt

### CSS
- **Selects rộng hơn**: sale-unit-select 60→80px, purchase-unit column 64→76px
- **:focus-visible**: green outline cho keyboard accessibility
- **Responsive PurchaseTable**: media queries 1024px (ẩn stock), 768px (compact)
- **Tăng cỡ chữ**: sale-product-name 13→14px, sale-total/sale-code 12→13px, purchase-row 12→13px, summary-row 12→13px, purchase total 16→18px
- **Skeleton**: overview loading thay vì text plain
- **Process-bar**: hiệu ứng pulse dot
- **Xoá duplicate**: Tag saving/synced ở topbar (giữ process-bar ở panel)

### Khác
- Thêm LANG keys: `change`, `exactChange`, `errSupplierPhoneInvalid`, `checkingOut`, `pointsUnit`, `transactionEarn/Redeem/...`
