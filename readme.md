Hãy xây dựng hệ thống Web App bán hàng siêu thị mini/POS cho mô hình cửa hàng nhỏ từ 1–2 quầy thu ngân.

Công nghệ sử dụng:

* Frontend: React + Ant Design
* Backend: NestJS
* Database: SQL Server
* ORM: TypeORM
* Authentication: JWT
* Authorization: RBAC với 2 vai trò chính: Staff và Manager
* Deploy: Windows Server + PM2
* In hóa đơn: HTML/CSS print, hỗ trợ máy in nhiệt 80mm
* Quét mã vạch: máy scan USB hoạt động như bàn phím

Mục tiêu hệ thống:
Xây dựng hệ thống quản lý bán hàng cho siêu thị mini, hỗ trợ quản lý sản phẩm, danh mục hàng hóa, nhập hàng, bán hàng tại quầy, in hóa đơn, quản lý tồn kho, quản lý hóa đơn, phân quyền người dùng và báo cáo doanh thu. Hệ thống chạy trên trình duyệt, phù hợp triển khai nội bộ tại cửa hàng.

Phân quyền người dùng:

1. Staff - Nhân viên

* Đăng nhập hệ thống
* Bán hàng tại quầy POS
* Quét mã vạch sản phẩm
* Tìm kiếm sản phẩm
* Tạo hóa đơn bán hàng
* In hóa đơn
* Xem danh sách hóa đơn
* Xem chi tiết hóa đơn
* Không được sửa giá bán
* Không được xóa sản phẩm
* Không được xem báo cáo lợi nhuận
* Không được quản lý tài khoản người dùng

2. Manager - Quản lý

* Có toàn bộ quyền của Staff
* Quản lý sản phẩm
* Thêm/sửa/xóa sản phẩm
* Import danh mục sản phẩm từ Excel
* Quản lý danh mục, thương hiệu, đơn vị tính
* Quản lý nhà cung cấp
* Quản lý nhập hàng
* Quản lý tồn kho
* Xem báo cáo doanh thu
* Xem báo cáo sản phẩm bán chạy
* Xem báo cáo tồn kho
* Quản lý nhân viên
* Cấu hình hệ thống

Các module chính:

1. Auth Module

* Đăng nhập
* Đăng xuất
* JWT Access Token
* Bảo vệ API bằng JwtAuthGuard
* Bảo vệ quyền bằng RolesGuard
* Mã hóa mật khẩu bằng bcrypt

2. User Module

* Quản lý tài khoản nhân viên
* Tạo tài khoản
* Cập nhật thông tin
* Khóa/mở tài khoản
* Gán vai trò Staff hoặc Manager

3. Product Module

* Quản lý sản phẩm
* Mã hàng
* Mã vạch
* Tên sản phẩm
* Nhóm hàng
* Thương hiệu
* Đơn vị tính
* Giá vốn
* Giá bán
* Tồn kho
* Tồn tối thiểu
* Tồn tối đa
* Hình ảnh
* Trạng thái đang kinh doanh
* Cho phép bán trực tiếp
* Import sản phẩm từ Excel

4. Category / Brand / Unit Module

* Quản lý nhóm hàng
* Quản lý thương hiệu
* Quản lý đơn vị tính

5. Supplier Module

* Quản lý nhà cung cấp
* Tên nhà cung cấp
* Số điện thoại
* Địa chỉ
* Ghi chú

6. Purchase Order Module

* Tạo phiếu nhập hàng
* Chọn nhà cung cấp
* Thêm sản phẩm bằng tìm kiếm hoặc quét mã vạch
* Nhập số lượng
* Nhập giá vốn
* Cập nhật tồn kho sau khi xác nhận nhập hàng
* Lưu lịch sử nhập hàng

7. POS / Sales Module

* Màn hình bán hàng tại quầy
* Tìm sản phẩm theo tên, mã hàng hoặc mã vạch
* Quét mã vạch để thêm sản phẩm vào giỏ hàng
* Tăng/giảm số lượng
* Tính tổng tiền
* Giảm giá hóa đơn nếu có
* Thanh toán tiền mặt/chuyển khoản
* Tạo hóa đơn
* Trừ tồn kho sau khi bán
* In hóa đơn 80mm

8. Invoice Module

* Danh sách hóa đơn
* Xem chi tiết hóa đơn
* Tìm kiếm theo mã hóa đơn, ngày bán, nhân viên
* In lại hóa đơn
* Hủy hóa đơn theo quyền Manager

9. Inventory Module

* Theo dõi tồn kho
* Lịch sử nhập/xuất kho
* Cảnh báo sản phẩm sắp hết hàng
* Kiểm kê kho
* Điều chỉnh tồn kho bởi Manager

10. Report Module

* Báo cáo doanh thu theo ngày
* Báo cáo doanh thu theo tháng
* Báo cáo số lượng hóa đơn
* Báo cáo sản phẩm bán chạy
* Báo cáo tồn kho
* Báo cáo nhập xuất tồn cơ bản

11. Setting Module

* Thông tin cửa hàng
* Tên cửa hàng
* Địa chỉ
* Số điện thoại
* Mẫu hóa đơn
* Cấu hình in hóa đơn

Database SQL Server cần thiết kế các bảng chính:

* Roles
* Users
* Categories
* Brands
* Units
* Suppliers
* Products
* PurchaseOrders
* PurchaseOrderItems
* SalesOrders
* SalesOrderItems
* InventoryTransactions
* Settings

Yêu cầu thiết kế database:

* Sử dụng Id INT IDENTITY làm khóa chính
* Có CreatedAt, UpdatedAt cho các bảng chính
* Có IsActive để khóa mềm dữ liệu
* Không xóa cứng dữ liệu quan trọng như hóa đơn, phiếu nhập, giao dịch kho
* Sử dụng DECIMAL(18,2) cho giá tiền
* Sử dụng NVARCHAR cho dữ liệu tiếng Việt
* Mã sản phẩm và mã vạch phải có index để tìm kiếm nhanh

API Backend NestJS:

* Dùng cấu trúc module/controller/service/entity/dto
* Dùng TypeORM kết nối SQL Server
* Dùng DTO validate dữ liệu đầu vào
* Dùng class-validator
* API trả về JSON thống nhất
* Có phân quyền bằng decorator @Roles('STAFF', 'MANAGER')
* Các API quản lý chỉ cho Manager truy cập
* Các API bán hàng cho Staff và Manager truy cập

Frontend React:

* Dùng React Router
* Dùng Ant Design cho UI
* Dùng Axios gọi API
* Có layout đăng nhập riêng
* Có layout dashboard sau đăng nhập
* Có menu theo quyền người dùng
* Staff chỉ thấy menu POS, hóa đơn, tra cứu sản phẩm
* Manager thấy toàn bộ menu quản trị
* Lưu JWT token trong localStorage hoặc cookie
* Tự động logout khi token hết hạn

Các màn hình cần có:

* Login
* Dashboard
* POS bán hàng
* Danh sách sản phẩm
* Tạo/sửa sản phẩm
* Import sản phẩm Excel
* Danh mục hàng hóa
* Thương hiệu
* Đơn vị tính
* Nhà cung cấp
* Phiếu nhập hàng
* Danh sách hóa đơn
* Chi tiết hóa đơn
* Tồn kho
* Báo cáo
* Quản lý nhân viên
* Cấu hình cửa hàng

Yêu cầu in hóa đơn:

* Hóa đơn HTML/CSS khổ 80mm
* In bằng window.print()
* Có thông tin cửa hàng
* Có mã hóa đơn
* Có ngày giờ bán
* Có nhân viên bán hàng
* Có danh sách sản phẩm
* Có số lượng, đơn giá, thành tiền
* Có tổng tiền
* Có tiền khách đưa, tiền thối nếu dùng tiền mặt
* Có lời cảm ơn cuối hóa đơn

Yêu cầu deploy:

* Backend NestJS chạy trên Windows Server bằng PM2
* Frontend React build ra static file
* Có thể dùng IIS hoặc Nginx for Windows để serve frontend
* SQL Server cài trên cùng server hoặc server riêng
* Có file .env cấu hình database, JWT secret, port
* Có hướng dẫn backup database SQL Server

Ưu tiên triển khai MVP theo thứ tự:

1. Database schema
2. Auth JWT + RBAC
3. User/Role
4. Product/Category/Brand/Unit
5. Import Excel sản phẩm
6. POS bán hàng
7. Hóa đơn + in hóa đơn
8. Nhập hàng
9. Tồn kho
10. Báo cáo
11. Deploy Windows Server

Mục tiêu kết quả:
Tạo ra một hệ thống POS siêu thị mini chạy ổn định cho 1–2 quầy thu ngân, dữ liệu khoảng 6.000–10.000 sản phẩm, thao tác nhanh, dễ bảo trì, có phân quyền rõ ràng giữa nhân viên và quản lý.
