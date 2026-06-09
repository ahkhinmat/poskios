# Phan tich docs: danh muc hang hoa va man hinh MVP

Tai lieu nay tong hop 2 nguon trong thu muc `docs/`:

- File du lieu mau: `DanhSachSanPham_KaMax.xlsx`
- Anh chup mo phong quy trinh van hanh tai quay va giao dien tham chieu

Muc tieu la rut ra:

- Mapping tu file Excel sang model du lieu cua he thong POS
- Danh sach man hinh/UI can co cho MVP
- Cac rang buoc thuc te can uu tien khi thiet ke backend va frontend

## 1. Tong quan file Excel danh muc

Nguon: `docs/DanhSachSanPham_KaMax.xlsx`

Thong tin chinh:

- So dong du lieu: `6346`
- So cot: `31`
- So nhom hang duy nhat: `73`
- So don vi tinh duy nhat: `76`
- So ban ghi co ma vach: `882`
- So ban ghi co don vi tinh: `6274`
- So ban ghi co hinh anh: `390`
- So ban ghi co thuong hieu: `0`
- So ban ghi dang kinh doanh: `6346`
- So ban ghi duoc ban truc tiep: `6345`

Nhan xet:

- File nay phu hop de dung lam nguon import san pham ban dau cho cua hang.
- Truong `Thuong hieu` trong file hien dang de trong, vi vay module import khong duoc coi day la truong bat buoc.
- Khong phai tat ca san pham deu co `Ma vach`, nen he thong phai ho tro tim theo ca `Ma hang` va `Ten hang`.
- Hinh anh ton tai nhung khong phai du lieu cot loi. Import co the xu ly sau hoac xu ly tuy chon.

## 2. Cau truc cot Excel va mapping de xuat

### 2.1 Cot cot loi cho bang `Products`

| Cot Excel | Vai tro nghiep vu | Mapping de xuat |
| --- | --- | --- |
| `Loai hang` | Loai doi tuong | `Products.ProductType` |
| `Mã hàng` | Ma noi bo cua san pham | `Products.ProductCode` |
| `Mã vạch` | Ma barcode de scan | `Products.Barcode` |
| `Tên hàng` | Ten hien thi | `Products.Name` |
| `Giá bán` | Gia ban le | `Products.SalePrice` |
| `Giá vốn` | Gia von | `Products.CostPrice` |
| `Tồn nhỏ nhất` | Nguong canh bao | `Products.MinStock` |
| `Tồn lớn nhất` | Nguong tham chieu | `Products.MaxStock` |
| `ĐVT` | Don vi tinh chinh | `Products.UnitId` |
| `Hình ảnh (url1,url2...)` | Anh san pham | `Products.ImageUrls` hoac bang con `ProductImages` |
| `Đang kinh doanh` | Trang thai hoat dong | `Products.IsActive` |
| `Được bán trực tiếp` | Duoc phep ban tai POS | `Products.AllowDirectSale` |
| `Mô tả` | Mo ta ngan | `Products.Description` |
| `Mẫu ghi chú` | Ghi chu mac dinh khi ban | `Products.NoteTemplate` |
| `Vị trí` | Vi tri de hang | `Products.Location` |
| `Trọng lượng` | Khoi luong neu can | `Products.Weight` |
| `Thời gian tạo` | Du lieu import lich su | `Products.ImportedCreatedAt` |

### 2.2 Cot lien quan den phan loai

| Cot Excel | Vai tro nghiep vu | Mapping de xuat |
| --- | --- | --- |
| `Nhóm hàng(3 Cấp)` | Nhom hang | `Categories.Name` |
| `Thương hiệu` | Thuong hieu | `Brands.Name` |
| `ĐVT` | Don vi tinh | `Units.Name` |

Bo sung theo mockup POS:

- San pham can ho tro nhieu don vi tinh/quy cach.
- Moi san pham phai co `don vi quy doi nho nhat` de dung khi quet ma va tinh so luong tai quay.
- Gia ban su dung tren POS uu tien lay theo don vi quy doi nho nhat va gia tuong ung da khai bao trong danh muc hang hoa.
- Khi quet trung san pham:
  - Tang so luong tren cung 1 dong
  - Khong tach dong
  - Giu theo don vi dang ap dung cho dong do

Nhan xet:

- File hien tai dang the hien `Nhóm hàng(3 Cấp)` theo dang chuoi phang, vi du `Bánh`, `Sữa`, `Tẩy Rửa`.
- Neu sau nay can category 3 cap dung nghia, schema nen chuan bi `ParentId` cho `Categories`, nhung MVP co the nhap truoc dang 1 cap.

### 2.3 Cot lien quan ton kho va giao dich

| Cot Excel | Vai tro nghiep vu | Cach xu ly de xuat |
| --- | --- | --- |
| `Tồn kho` | So luong ton hien tai | Dung lam so du khoi tao khi import lan dau |
| `KH đặt` | So luong khach dat | Chua uu tien cho MVP |
| `Dự kiến hết hàng` | Gia tri tham khao | Khong nen luu truc tiep, nen tinh toan tu giao dich |
| `Lô 1` | Ma lo | Chi mo neu bat module lo/han su dung |
| `Hạn sử dụng 1` | Han su dung | Chi mo neu bat module lo/han su dung |
| `Tồn 1` | Ton theo lo | Chi mo neu bat module lo/han su dung |
| `Quản lý lô-hạn sử dụng` | Bat/tat quan ly lo | `Products.TrackBatchExpiry` |

Nhan xet:

- `Ton kho` trong file import nen duoc xu ly qua mot giao dich khoi tao, khong ghi de truc tiep ma khong co lich su.
- MVP nen co bang `InventoryTransactions` va khi import san pham lan dau co ton, tao giao dich `INITIAL_IMPORT`.

### 2.4 Cot co the de ngoai MVP

| Cot Excel | Ly do |
| --- | --- |
| `Mã ĐVT Cơ bản` | Chua can neu moi san pham chi co 1 DVT |
| `Quy đổi` | Can cho san pham nhieu quy cach, co the lam phase sau |
| `Thuộc tính` | Chua can cho MVP |
| `Mã HH Liên quan` | Chua ro nghiep vu, de phase sau |
| `Hàng thành phần` | Chi can neu ho tro combo/assembly |

### 2.5 Bo sung model quy doi don vi

Chi tu file Excel thi chua du, nhung theo rule nghiep vu da chot can bo sung:

- `ProductUnits`
  - Moi dong la 1 don vi cua san pham
  - Co `ConversionValue` so voi don vi co ban
  - Co `SalePrice`
  - Co `Barcode` rieng neu can
  - Co co `IsDefaultForPos`
  - Co co `IsSmallestUnit`

Ket luan:

- POS khong nen doc truc tiep tu `Products.UnitId` duy nhat.
- POS nen lay don vi mac dinh tu `ProductUnits` voi uu tien:
  - `IsDefaultForPos = true`
  - neu khong co, lay `IsSmallestUnit = true`

## 3. Du lieu thuc te rut ra de thiet ke

Top nhom hang:

- `Bánh`: 888
- `Sữa`: 585
- `Tẩy Rửa`: 549
- `Kẹo`: 446
- `Gia Vị`: 424
- `Mì Tôm`: 251
- `Dầu gội`: 240
- `Giải Khát`: 229

Top don vi tinh:

- `Gói`: 2019
- `Chai`: 1094
- `Hộp`: 693
- `Lốc`: 403
- `Túi`: 279
- `Hủ`: 216
- `Cây`: 209
- `Thùng`: 206

Ket luan thiet ke:

- Tim kiem POS phai toi uu cho ten hang, ma hang, ma vach.
- Bang san pham phai co index toi thieu cho `ProductCode`, `Barcode`, va nen co them index cho `Name`.
- Don vi tinh nen la bang rieng, khong hardcode.
- Category phai la bang rieng va duoc dung bo loc tren danh sach san pham.

## 4. Phan tich mockup man hinh tu anh chup

Anh tham chieu:

- `docs/0ec846b2897708295166.jpg`
- `docs/2a3ff2453d80bcdee591.jpg`
- `docs/48f192945d51dc0f8540.jpg`
- `docs/949557ef982a1974403b.jpg`
- `docs/9c5293285cedddb384fc.jpg`
- `docs/ac8e3bf4f431756f2c20.jpg`
- `docs/b60ddc7713b292eccba3.jpg`
- `docs/d837fd4d3288b3d6ea99.jpg`

Nhung gi the hien ro trong mockup:

- Giao dien theo mo hinh backoffice POS, menu ngang cap 1.
- Co dashboard tong quan doanh thu ngay.
- Co danh sach hoa don voi bo loc thoi gian, trang thai.
- Co man nhap hang co tim kiem nhanh bang ma hang/ten hang/barcode.
- Co popup tao hang hoa nhanh.
- Co chuc nang them san pham tu file Excel.
- Moi truong su dung la may tinh tai quay, man hinh ngang, thao tac nhanh bang ban phim va may scan.
- Co may in nhiet `Xprinter`, phu hop voi yeu cau hoa don 80mm.

## 5. Danh sach man hinh/UI can co cho MVP

### 5.1 Auth

- Login page
- Tu dong chuyen vao dashboard hoac POS sau dang nhap
- Xu ly token het han va logout

### 5.2 Dashboard

Can co:

- Doanh thu hom nay
- So hoa don hom nay
- Doanh thu thuan
- So sanh voi hom qua hoac ky truoc
- Bieu do tong quan don gian theo ngay

Muc tieu:

- Cho Manager xem nhanh tinh hinh cua hang.

### 5.3 Danh muc hang hoa

Can co:

- Bang danh sach san pham
- Tim kiem theo ten, ma hang, ma vach
- Bo loc theo nhom hang, trang thai, cho phep ban truc tiep
- Hien thi ton kho, gia ban, don vi tinh
- Nut tao moi, sua, khoa mo mem
- Nut import Excel
- Nut xuat file
- Hien thi hinh anh san pham
- Hien thi ton kho am neu co
- Bo loc `Du kien het hang`
- Bo loc `Thoi gian tao`

UI uu tien:

- Table co search va filter o phan dau
- Cho phep scan barcode vao o search de ra san pham ngay

### 5.4 Popup tao/sua hang hoa

Rut ra tu mockup:

- Tao/sua bang modal thay vi dieu huong sang trang rieng
- Tab `Thong tin` va `Mo ta`
- Truong cot loi:
  - Ma hang
  - Ma vach
  - Ten hang
  - Nhom hang
  - Thuong hieu
  - Gia von
  - Gia ban
  - Don vi tinh
  - Anh
  - Ban truc tiep
  - Dang kinh doanh

Luu y nghiep vu:

- `Nhom hang` nen la bat buoc
- `Ma hang` nen unique
- `Ma vach` unique neu co gia tri

Bo sung tu `docs/mockup/hanghoachitiet.jpg` va `docs/mockup/hanghoachitiet-edit.jpg`:

- Man chi tiet hang hoa co cac tab:
  - `Thong tin`
  - `Mo ta, ghi chu`
  - `The kho`
  - `Ton kho`
  - `Hang hoa cung loai`
  - `Lien ket kenh ban`
- Man sua hang hoa co khu vuc `Quan ly theo don vi tinh va thuoc tinh`
- San pham co:
  - don vi co ban
  - nhieu don vi quy doi
  - gia tri quy doi theo don vi co ban
  - gia ban rieng cho tung don vi
  - co `Ban truc tiep` theo tung don vi
- Form sua/them san pham can co them cac truong:
  - `Vi tri`
  - `Trong luong`
  - `Thuoc tinh`
  - `Hang cung loai`
- Man chi tiet san pham can co them thao tac:
  - `Sao chep`
  - `In tem ma`

Rule du lieu can chot:

- Moi san pham phai co 1 `don vi co ban`
- Co the co nhieu `don vi quy doi`
- Moi `don vi quy doi` co:
  - `UnitName`
  - `ConversionValue`
  - `SalePrice`
  - `AllowDirectSale`
- POS uu tien don vi co `quy doi nho nhat` va gia tuong ung

### 5.5 Import san pham tu Excel

Can co:

- Man hinh hoac modal upload file
- Hien link tai file mau
- Chon file `.xlsx`
- Validate cot bat buoc truoc khi import
- Che do import:
  - Tao moi san pham chua ton tai
  - Cap nhat san pham da ton tai theo `ProductCode` hoac `Barcode`
- Bao cao ket qua:
  - Tong so dong
  - So dong thanh cong
  - So dong loi
  - Chi tiet dong loi

De xuat ky thuat:

- Import theo batch
- Log lai lich su import
- Neu co `Ton kho` trong file, tao giao dich khoi tao kho thay vi update truc tiep khong lich su

### 5.6 POS ban hang

Can co:

- O tim kiem lon, uu tien scan barcode
- Them nhanh san pham vao gio hang
- Tang giam so luong
- Chinh sua gia chi Manager moi duoc phep
- Giam gia toan hoa don
- Tinh tong tien real-time
- Chon phuong thuc thanh toan
- Hoan tat don va in hoa don

UI uu tien:

- Toi uu cho ban phim + may quet USB
- Focus mac dinh vao o tim kiem
- Sau moi lan them hang, giu ngu canh ban hang, khong mo qua nhieu popup

### 5.6.1 Man hinh uu tien so 1

Anh tham chieu bo sung:

- `docs/image.png`

Day la man hinh quan trong nhat va can hoan thanh truoc de dua he thong vao chay thu.

Cau truc man hinh theo anh chup:

- Thanh tim kiem san pham o tren cung ben trai
- Tabs don hang:
  - `Hoa don 1`
  - `Hoa don 2`
  - Nut them tab don moi
- Danh sach dong hang o ben trai
- Cum thanh toan o ben phai
- O ghi chu don hang o cuoi danh sach
- Che do ban hang o day man hinh:
  - `Ban nhanh`
  - `Ban thuong`
  - `Ban giao hang`

### 5.6.2 Truong du lieu bat buoc tren dong hang POS

Moi dong san pham trong gio hang can co:

- `ProductId`
- `ProductUnitId`
- `ProductCode`
- `Barcode`
- `ProductName`
- `UnitId`
- `UnitName`
- `ConversionValue`
- `Quantity`
- `UnitPrice`
- `LineTotal`
- `AllowDirectSale`
- `IsPriceEditable`
- `IsDeleted`
- `SortOrder`

Theo anh chup, nhung truong dang hien thi truc tiep tren UI la:

- STT dong
- Nut xoa dong
- Ma hang hoac ma vach
- Ten hang
- Don vi tinh
- So luong
- Don gia
- Thanh tien
- Nut thao tac nhanh
- Menu thao tac dong

### 5.6.3 Truong du lieu bat buoc o muc hoa don

Theo man hinh thanh toan ben phai, hoa don can co:

- `SalesOrderCode`
- `CashierUserId`
- `CashierName`
- `CustomerId` hoac thong tin khach le
- `CustomerName`
- `OrderNote`
- `SaleMode`
- `SubtotalAmount`
- `DiscountAmount`
- `TotalAmount`
- `CustomerPaidAmount`
- `ChangeAmount`
- `PaymentMethod`
- `SoldAt`
- `Status`

Gia tri/hanh vi dang the hien tren UI:

- Tong tien hang
- So luong mat hang
- Giam gia hoa don
- Khach can tra
- Khach thanh toan
- Phuong thuc thanh toan:
  - `Tien mat`
  - `Chuyen khoan`
  - `The`
  - `Vi`
- Cac muc tien goi y de bam nhanh
- Nut `IN`
- Nut `THANH TOAN`

### 5.6.4 Hanh vi nghiep vu can dung dung nhu POS thuc te

- O tim kiem phai nhan input tu may scan USB nhu ban phim.
- Tim kiem phai uu tien theo thu tu:
  - `ProductUnits.Barcode` exact match
  - `Products.Barcode` exact match
  - `ProductCode` exact match
  - `Name` contains
- Khi quet trung san pham da co trong gio:
  - Tang `Quantity` len 1
  - Khong tao dong moi
- Khi quet vao POS, mac dinh dung `don vi tinh nho nhat`
- `UnitPrice` mac dinh luon lay theo `don vi tinh nho nhat` va gia tuong ung trong danh muc hang hoa
- Cho phep sua gia ban
- Cho phep am kho
- Khong cho thanh toan neu gio hang rong
- Khong cho so luong <= 0
- Cho phep giam gia tren tung dong hang
- Cho phep giam gia tren tong hoa don
- Sau khi thanh toan thanh cong:
  - Tao `SalesOrder`
  - Tao `SalesOrderItems`
  - Tao `InventoryTransactions` cho tung dong
  - Cap nhat `Products.StockOnHand`
  - Cho phep in hoa don ngay

### 5.6.5 Luu tab hoa don tam

- Tab hoa don tam phai duoc luu lai.
- Khi tat trinh duyet hoac mo lai he thong, cac tab tam van phai con.
- MVP nen luu tab tam vao database, khong chi luu o local storage.
- Moi tab tam can co:
  - `TabCode`
  - `TabType`
  - `CreatedByUserId`
  - `CustomerName`
  - `Note`
  - `SaleMode`
  - `ItemsJson` hoac bang chi tiet rieng
  - `IsActive`
  - `LastTouchedAt`

### 5.6.6 Tra hang

Anh tham chieu bo sung:

- `docs/trahang.jpg`
- `docs/trahangchitiet.jpg`

Tra hang la nghiep vu uu tien cao va co giao dien gan nhu POS ban hang.

Nhung gi mockup the hien ro:

- Co popup chon hoa don tra hang
- Tim kiem hoa don theo:
  - Ma hoa don
  - Ma van don ban
  - Lo, han su dung
  - Khach hang hoac dien thoai
  - Ma hang
  - Ten hang
- Co bo loc thoi gian hoa don
- Sau khi chon hoa don, mo tab `Tra hang`
- Man hinh `Tra hang` co:
  - Danh sach hang tra
  - O tim hang doi
  - Giam gia
  - Phi tra hang
  - Can tra khach
  - Tien tra khach
  - Phuong thuc thanh toan
  - Nut `IN`
  - Nut `TRA HANG`

Rule nghiep vu da chot:

- Tra hang cho phep sua gia
- Nghiep vu xu ly tuong tu ban hang
- Quet trung san pham thi tang so luong, khong tach dong

### 5.6.7 Truong can co trong API de phuc vu man nay

Product search result can tra du:

- `id`
- `productCode`
- `barcode`
- `name`
- `unitId`
- `unitName`
- `salePrice`
- `stockOnHand`
- `allowDirectSale`
- `isActive`

Payload thanh toan POS toi thieu:

- `saleMode`
- `customerId`
- `customerName`
- `customerPhone`
- `note`
- `discountAmount`
- `paymentMethod`
- `customerPaidAmount`
- `items[]`

Moi phan tu `items[]` can co:

- `productId`
- `quantity`
- `unitPrice`
- `discountAmount`
- `note`

Response sau thanh toan can tra du:

- `salesOrderId`
- `salesOrderCode`
- `soldAt`
- `totalAmount`
- `customerPaidAmount`
- `changeAmount`
- `cashierName`
- `items`
- `receiptData`

### 5.6.8 Nhung truong can uu tien trong schema

Tu man hinh nay, cac cot schema khong duoc thieu la:

- `Products.ProductCode`
- `Products.Barcode`
- `Products.Name`
- `Products.StockOnHand`
- `Products.AllowDirectSale`
- `Products.IsActive`
- `ProductUnits.ProductId`
- `ProductUnits.UnitId`
- `ProductUnits.ConversionValue`
- `ProductUnits.SalePrice`
- `ProductUnits.Barcode`
- `ProductUnits.IsDefaultForPos`
- `ProductUnits.IsSmallestUnit`
- `SalesOrders.PaymentMethod`
- `SalesOrders.CustomerPaidAmount`
- `SalesOrders.ChangeAmount`
- `SalesOrders.DiscountAmount`
- `SalesOrders.TotalAmount`
- `SalesOrders.SoldAt`
- `SalesOrderItems.Quantity`
- `SalesOrderItems.UnitPrice`
- `SalesOrderItems.DiscountAmount`
- `SalesOrderItems.LineTotal`
- `InventoryTransactions.QuantityChange`
- `InventoryTransactions.StockBefore`
- `InventoryTransactions.StockAfter`

### 5.6.9 Thu tu implementation uu tien moi

Vi `docs/image.png` la man hinh quan trong nhat, thu tu MVP nen dieu chinh thanh:

1. Auth login co role `Staff` va `Manager`
2. Product search API phuc vu POS
3. Man hinh POS ban hang
4. Thanh toan va tao hoa don
5. In hoa don 80mm
6. Sau do moi mo rong CRUD san pham, import Excel, nhap hang va dashboard

### 5.7 Nhap hang

Rut ra tu anh chup:

- Man hinh nhap hang gan giong POS nhung de nhap so luong va gia von
- Co tim hang nhanh theo ma/ten/barcode
- Co khu vuc thong tin nha cung cap va trang thai phieu nhap
- Co nut import tu Excel la mot option, nhung khong bat buoc cho MVP

Can co:

- Tao phieu nhap
- Chon nha cung cap
- Them dong san pham
- Nhap so luong, gia von
- Co ma phieu nhap tu dong
- Co ma dat hang nhap
- Co so hoa don dau vao
- Co tinh vao cong no nha cung cap
- Tinh tong tien
- Luu tam
- Xac nhan phieu nhap va cong ton

### 5.10 Quan ly mau in

Rut ra tu `docs/mockup/quanlymauin.png`:

- He thong can co quan ly mau in cho:
  - Hoa don
  - Tam tinh
  - Dat hang
  - Tra hang
  - Thu/Chi
- Co ho tro:
  - Them moi mau in
  - Sua noi dung mau in
  - Da mau theo kho giay `K80` va `A4/A5`
  - Lua chon mau in khi in tai man hinh giao dich
  - In lai tu lich su giao dich

MVP toi thieu nen co:

- 1 mau in `K80` mac dinh cho hoa don ban hang
- 1 mau in `K80` mac dinh cho tra hang
- Co cau hinh header/footer

### 5.8 Hoa don

Can co:

- Danh sach hoa don
- Bo loc thoi gian
- Bo loc trang thai
- Tim theo ma hoa don
- Xem chi tiet hoa don
- In lai hoa don
- Huy hoa don chi danh cho Manager

### 5.9 In hoa don 80mm

Anh chup cho thay may in nhiet `Xprinter` dang duoc dung thuc te.

Do do MVP nen:

- In HTML/CSS kho giay 80mm
- Kich thuoc va font phai toi uu de in duoc tieng Viet ro rang
- Goi in qua `window.print()`
- Mau hoa don can toi gian, de doc

Noi dung hoa don:

- Ten cua hang
- Dia chi / so dien thoai
- Ma hoa don
- Thoi gian ban
- Nhan vien
- Danh sach san pham
- So luong / don gia / thanh tien
- Tong tien
- Tien khach dua
- Tien thoi
- Loi cam on

## 6. Rang buoc nghiep vu can chot som

- San pham co the khong co barcode, vi vay `ProductCode` la khoa tim kiem bat buoc.
- `Brand` khong nen bat buoc do du lieu hien tai khong co.
- `Category` va `Unit` la bat buoc cho UI quan tri, nhung importer nen co che do tu dong tao neu chua ton tai.
- Khong xoa cung san pham da phat sinh giao dich. Dung `IsActive`.
- Ton kho ban dau khi import phai co lich su giao dich.

## 7. Thu tu trien khai thuc te de xuat

1. Thiet ke schema bang `Categories`, `Units`, `Brands`, `Products`, `InventoryTransactions`
2. Dung CRUD danh muc san pham va popup tao/sua san pham
3. Dung import Excel san pham
4. Dung POS ban hang
5. Dung hoa don va in hoa don 80mm
6. Dung nhap hang va cap nhat ton kho
7. Dung dashboard va bao cao co ban

## 8. Ket luan

Thu muc `docs/` cho thay he thong can duoc thiet ke theo huong POS van hanh thuc te tai quay:

- Du lieu san pham lon hon 6000 ban ghi
- Co scan barcode nhung khong duoc phu thuoc hoan toan vao barcode
- Giao dien can uu tien toc do thao tac
- Module san pham, import Excel, POS, hoa don, nhap hang va in hoa don la cac hang muc MVP ro nhat
