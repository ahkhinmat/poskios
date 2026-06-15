-- Thêm cột cấu hình mở rộng cho Settings
ALTER TABLE dbo.Settings ADD
    CurrencySuffix NVARCHAR(10) NOT NULL CONSTRAINT DF_Settings_CurrencySuffix DEFAULT N'đ',
    Locale NVARCHAR(10) NOT NULL CONSTRAINT DF_Settings_Locale DEFAULT N'vi-VN',
    ReceiptPaperWidth NVARCHAR(10) NOT NULL CONSTRAINT DF_Settings_ReceiptPaperWidth DEFAULT N'76mm',
    ReceiptPoweredBy NVARCHAR(200) NOT NULL CONSTRAINT DF_Settings_ReceiptPoweredBy DEFAULT N'Powered by KIOTVIET',
    DefaultPaymentMethod NVARCHAR(20) NOT NULL CONSTRAINT DF_Settings_DefaultPaymentMethod DEFAULT N'CASH',
    QuickPayAmount1 DECIMAL(18,0) NOT NULL CONSTRAINT DF_Settings_QuickPayAmount1 DEFAULT 100000,
    QuickPayAmount2 DECIMAL(18,0) NOT NULL CONSTRAINT DF_Settings_QuickPayAmount2 DEFAULT 200000,
    QuickPayAmount3 DECIMAL(18,0) NOT NULL CONSTRAINT DF_Settings_QuickPayAmount3 DEFAULT 500000,
    SalesOrderPrefix NVARCHAR(10) NOT NULL CONSTRAINT DF_Settings_SalesOrderPrefix DEFAULT N'HD',
    ReturnOrderPrefix NVARCHAR(10) NOT NULL CONSTRAINT DF_Settings_ReturnOrderPrefix DEFAULT N'TH',
    PurchaseOrderPrefix NVARCHAR(10) NOT NULL CONSTRAINT DF_Settings_PurchaseOrderPrefix DEFAULT N'PNH',
    ProductSearchMaxResults INT NOT NULL CONSTRAINT DF_Settings_ProductSearchMaxResults DEFAULT 8,
    InvoiceSearchMaxResults INT NOT NULL CONSTRAINT DF_Settings_InvoiceSearchMaxResults DEFAULT 20,
    CustomerSearchMaxResults INT NOT NULL CONSTRAINT DF_Settings_CustomerSearchMaxResults DEFAULT 10,
    DefaultAddQuantity DECIMAL(18,2) NOT NULL CONSTRAINT DF_Settings_DefaultAddQty DEFAULT 1,
    OverviewPassword NVARCHAR(50) NOT NULL CONSTRAINT DF_Settings_OverviewPassword DEFAULT N'11111',
    CashierLabel NVARCHAR(50) NOT NULL CONSTRAINT DF_Settings_CashierLabel DEFAULT N'Thu ngân';
