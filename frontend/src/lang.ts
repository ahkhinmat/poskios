export const LANG = {
  // Store
  storeNameSale: 'KA MARK',
  storeNameReceipt: 'KA MART',
  storeAddress: '62 Nguyễn Phong Sắc, Khuê Trung, Cẩm Lệ, ĐN',
  storePhoneNumber: '0783231774',
  cashier: 'Thu ngân',

  // Payment
  cash: 'Tiền mặt',
  bankTransfer: 'Chuyển khoản',
  card: 'Thẻ',
  ewallet: 'Ví',
  paymentMethod: 'Phương thức thanh toán',

  // Sale/Return tabs
  tabSale: 'Hóa đơn',
  tabReturn: 'Trả hàng',
  modeSale: 'Bán hàng',
  modeReturn: 'Trả hàng',
  modeImport: 'Nhập hàng',
  modeCategory: 'Danh mục',
  modeOverview: 'Tổng quan',
  categoryTitle: 'Danh mục hàng hóa',
  categoryCode: 'Mã danh mục',
  categoryName: 'Tên danh mục',
  categoryDescription: 'Mô tả',
  categoryParent: 'Danh mục cha',
  categoryProducts: 'Sản phẩm',
  categoryActions: 'Hành động',
  addCategory: 'Thêm danh mục',
  editCategory: 'Chỉnh sửa',
  deleteCategory: 'Xóa',
  saveCategory: 'Lưu',
  cancel: 'Hủy',
  searchCategories: 'Tìm kiếm danh mục...',
  noCategoriesFound: 'Không tìm thấy danh mục nào',
  confirmDelete: 'Bạn có chắc muốn xóa danh mục này?',
  selectParentCategory: 'Chọn danh mục cha',
  rootCategory: 'Danh mục gốc',
  categoryDescriptionPlaceholder: 'Nhập mô tả danh mục...',

  // Search
  placeholderSearch: 'Quét mã vạch hoặc nhập mã hàng, tên hàng',
  productUnitSep: '·',
  stockLabel: 'Tồn',
  select: 'Chọn',

  // Invoice search (return)
  searchTypeInvoiceCode: 'Số hóa đơn',
  searchTypeProductCode: 'Mã hàng',
  placeholderInvoiceCode: 'Nhập mã hóa đơn...',
  placeholderProductCode: 'Nhập mã hàng...',
  placeholderFromDate: 'Từ ngày',
  placeholderToDate: 'Đến ngày',
  searchBtn: 'Tìm',
  foundInvoiceNote: 'Chọn hóa đơn để tải danh sách hàng cần trả, sau đó quét mã vạch ở ô tìm kiếm phía trên',
  searchInvoiceHint: 'Nhập thông tin tìm kiếm hoặc chọn khoảng ngày',

  // Summary labels
  subtotalReturn: 'Tiền trả hàng',
  subtotalSale: 'Tổng tiền hàng',
  discount: 'Giảm giá',
  returnFee: 'Phí trả hàng',
  refund: 'Hoàn tiền',
  customerPay: 'Khách cần trả',
  customerPaid: 'Khách thanh toán',
  totalReturn: 'Tổng trả',
  totalPayment: 'Thanh toán',
  changeAmount: 'Tiền thối',
  customerGiven: 'Khách đưa',

  // Buttons
  print: 'IN',
  completeReturn: 'HOÀN TẤT TRẢ HÀNG',
  completePayment: 'THANH TOÁN',
  close: 'Đóng',
  printInvoice: 'In hóa đơn',

  // Tabs
  saving: 'Đang lưu',
  synced: 'Đã đồng bộ',

  // Note
  orderNote: 'Ghi chú đơn hàng',
  customer: 'Khách hàng',
  placeholderCustomer: 'Tìm khách hàng',

  // Empty state
  emptyCart: 'Chưa có sản phẩm trong tab này',
  emptyCartCheckout: 'Giỏ hàng đang trống',

  // Messages - success
  loadedInvoice: (code: string) => `Đã tải hóa đơn ${code}`,
  returnCreated: (code: string) => `Đã trả hàng - ${code}`,
  saleCreated: (code: string) => `Đã tạo ${code}`,

  // Messages - error
  errLoadTab: 'Không tải được tab POS',
  errSaveTab: 'Không lưu được tab tạm',
  errCreateTab: 'Không tạo được tab mới',
  errCreateReturnTab: 'Không tạo được tab trả hàng',
  errCloseTab: 'Không đóng được tab',
  errProductNotFound: 'Không tìm thấy sản phẩm',
  errInvoiceNotFound: 'Không tìm thấy hóa đơn',
  errLoadInvoice: 'Lỗi tra cứu hóa đơn',
  errLoadInvoiceDetail: 'Không tải được chi tiết hóa đơn',
  errReturnFailed: 'Trả hàng thất bại',
  errPaymentFailed: 'Thanh toán thất bại',
  errFeatureDev: 'Chức năng đang phát triển',
  errPrintWindow: 'Không mở được cửa sổ in',

  // Messages - warning
  warnNeedTab: 'Cần ít nhất một tab POS',

  // Receipt (HTML print)
  receiptTitle: 'HÓA ĐƠN TẠM TÍNH',
  receiptCode: 'Số HĐ',
  receiptUnitPrice: 'Đơn giá',
  receiptQty: 'SL',
  receiptTotal: 'Thành tiền',
  receiptFooter: 'Cảm ơn và hẹn gặp lại!',
  receiptPoweredBy: 'Powered by KIOTVIET',

  // Receipt (modal)
  receiptInvoice: 'Hóa đơn',
  receiptDate: 'Ngày',
  receiptProductTotal: 'Tiền hàng',
};

export type LangKeys = keyof typeof LANG;
