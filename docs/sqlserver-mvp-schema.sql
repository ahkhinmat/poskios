SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/*
  POS Kiosk MVP schema for SQL Server
  Scope:
  - Auth + RBAC
  - Product catalog
  - Supplier + purchase order
  - Sales order + invoice
  - Inventory transaction ledger
  - Basic settings
*/

IF OBJECT_ID('dbo.InventoryTransactions', 'U') IS NOT NULL DROP TABLE dbo.InventoryTransactions;
IF OBJECT_ID('dbo.PrintTemplates', 'U') IS NOT NULL DROP TABLE dbo.PrintTemplates;
IF OBJECT_ID('dbo.PosDraftTabItems', 'U') IS NOT NULL DROP TABLE dbo.PosDraftTabItems;
IF OBJECT_ID('dbo.PosDraftTabs', 'U') IS NOT NULL DROP TABLE dbo.PosDraftTabs;
IF OBJECT_ID('dbo.SalesOrderItems', 'U') IS NOT NULL DROP TABLE dbo.SalesOrderItems;
IF OBJECT_ID('dbo.SalesOrders', 'U') IS NOT NULL DROP TABLE dbo.SalesOrders;
IF OBJECT_ID('dbo.PurchaseOrderItems', 'U') IS NOT NULL DROP TABLE dbo.PurchaseOrderItems;
IF OBJECT_ID('dbo.PurchaseOrders', 'U') IS NOT NULL DROP TABLE dbo.PurchaseOrders;
IF OBJECT_ID('dbo.ProductImages', 'U') IS NOT NULL DROP TABLE dbo.ProductImages;
IF OBJECT_ID('dbo.ProductUnits', 'U') IS NOT NULL DROP TABLE dbo.ProductUnits;
IF OBJECT_ID('dbo.Products', 'U') IS NOT NULL DROP TABLE dbo.Products;
IF OBJECT_ID('dbo.Suppliers', 'U') IS NOT NULL DROP TABLE dbo.Suppliers;
IF OBJECT_ID('dbo.Brands', 'U') IS NOT NULL DROP TABLE dbo.Brands;
IF OBJECT_ID('dbo.Units', 'U') IS NOT NULL DROP TABLE dbo.Units;
IF OBJECT_ID('dbo.Categories', 'U') IS NOT NULL DROP TABLE dbo.Categories;
IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL DROP TABLE dbo.Users;
IF OBJECT_ID('dbo.Roles', 'U') IS NOT NULL DROP TABLE dbo.Roles;
IF OBJECT_ID('dbo.Settings', 'U') IS NOT NULL DROP TABLE dbo.Settings;
GO

CREATE TABLE dbo.Roles (
    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Code NVARCHAR(50) NOT NULL,
    Name NVARCHAR(100) NOT NULL,
    Description NVARCHAR(255) NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_Roles_IsActive DEFAULT (1),
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Roles_CreatedAt DEFAULT (SYSDATETIME()),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Roles_UpdatedAt DEFAULT (SYSDATETIME()),
    CONSTRAINT UQ_Roles_Code UNIQUE (Code),
    CONSTRAINT UQ_Roles_Name UNIQUE (Name)
);
GO

CREATE TABLE dbo.Users (
    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    RoleId INT NOT NULL,
    Username NVARCHAR(100) NOT NULL,
    PasswordHash NVARCHAR(255) NOT NULL,
    FullName NVARCHAR(150) NOT NULL,
    PhoneNumber NVARCHAR(30) NULL,
    Email NVARCHAR(150) NULL,
    LastLoginAt DATETIME2(0) NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT (1),
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT (SYSDATETIME()),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Users_UpdatedAt DEFAULT (SYSDATETIME()),
    CONSTRAINT FK_Users_RoleId FOREIGN KEY (RoleId) REFERENCES dbo.Roles(Id),
    CONSTRAINT UQ_Users_Username UNIQUE (Username)
);
GO

CREATE TABLE dbo.Categories (
    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    ParentId INT NULL,
    Code NVARCHAR(50) NULL,
    Name NVARCHAR(150) NOT NULL,
    SortOrder INT NOT NULL CONSTRAINT DF_Categories_SortOrder DEFAULT (0),
    IsActive BIT NOT NULL CONSTRAINT DF_Categories_IsActive DEFAULT (1),
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Categories_CreatedAt DEFAULT (SYSDATETIME()),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Categories_UpdatedAt DEFAULT (SYSDATETIME()),
    CONSTRAINT FK_Categories_ParentId FOREIGN KEY (ParentId) REFERENCES dbo.Categories(Id)
);
GO

CREATE TABLE dbo.Brands (
    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Code NVARCHAR(50) NULL,
    Name NVARCHAR(150) NOT NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_Brands_IsActive DEFAULT (1),
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Brands_CreatedAt DEFAULT (SYSDATETIME()),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Brands_UpdatedAt DEFAULT (SYSDATETIME()),
    CONSTRAINT UQ_Brands_Name UNIQUE (Name)
);
GO

CREATE TABLE dbo.Units (
    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Code NVARCHAR(50) NULL,
    Name NVARCHAR(100) NOT NULL,
    IsBaseUnit BIT NOT NULL CONSTRAINT DF_Units_IsBaseUnit DEFAULT (1),
    IsActive BIT NOT NULL CONSTRAINT DF_Units_IsActive DEFAULT (1),
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Units_CreatedAt DEFAULT (SYSDATETIME()),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Units_UpdatedAt DEFAULT (SYSDATETIME()),
    CONSTRAINT UQ_Units_Name UNIQUE (Name)
);
GO

CREATE TABLE dbo.Suppliers (
    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Code NVARCHAR(50) NULL,
    Name NVARCHAR(150) NOT NULL,
    PhoneNumber NVARCHAR(30) NULL,
    Address NVARCHAR(255) NULL,
    Notes NVARCHAR(500) NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_Suppliers_IsActive DEFAULT (1),
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Suppliers_CreatedAt DEFAULT (SYSDATETIME()),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Suppliers_UpdatedAt DEFAULT (SYSDATETIME())
);
GO

CREATE TABLE dbo.Products (
    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    CategoryId INT NOT NULL,
    BrandId INT NULL,
    UnitId INT NOT NULL,
    ProductType NVARCHAR(30) NOT NULL CONSTRAINT DF_Products_ProductType DEFAULT (N'HANG_HOA'),
    ProductCode NVARCHAR(50) NOT NULL,
    Barcode NVARCHAR(50) NULL,
    Name NVARCHAR(255) NOT NULL,
    CostPrice DECIMAL(18,2) NOT NULL CONSTRAINT DF_Products_CostPrice DEFAULT (0),
    SalePrice DECIMAL(18,2) NOT NULL CONSTRAINT DF_Products_SalePrice DEFAULT (0),
    StockOnHand DECIMAL(18,3) NOT NULL CONSTRAINT DF_Products_StockOnHand DEFAULT (0),
    MinStock DECIMAL(18,3) NOT NULL CONSTRAINT DF_Products_MinStock DEFAULT (0),
    MaxStock DECIMAL(18,3) NOT NULL CONSTRAINT DF_Products_MaxStock DEFAULT (0),
    Weight DECIMAL(18,3) NULL,
    Description NVARCHAR(1000) NULL,
    NoteTemplate NVARCHAR(500) NULL,
    Location NVARCHAR(150) NULL,
    TrackBatchExpiry BIT NOT NULL CONSTRAINT DF_Products_TrackBatchExpiry DEFAULT (0),
    AllowDirectSale BIT NOT NULL CONSTRAINT DF_Products_AllowDirectSale DEFAULT (1),
    IsActive BIT NOT NULL CONSTRAINT DF_Products_IsActive DEFAULT (1),
    ImportedCreatedAt DATETIME2(0) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Products_CreatedAt DEFAULT (SYSDATETIME()),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Products_UpdatedAt DEFAULT (SYSDATETIME()),
    CONSTRAINT FK_Products_CategoryId FOREIGN KEY (CategoryId) REFERENCES dbo.Categories(Id),
    CONSTRAINT FK_Products_BrandId FOREIGN KEY (BrandId) REFERENCES dbo.Brands(Id),
    CONSTRAINT FK_Products_UnitId FOREIGN KEY (UnitId) REFERENCES dbo.Units(Id),
    CONSTRAINT UQ_Products_ProductCode UNIQUE (ProductCode),
    CONSTRAINT CK_Products_CostPrice CHECK (CostPrice >= 0),
    CONSTRAINT CK_Products_SalePrice CHECK (SalePrice >= 0),
    CONSTRAINT CK_Products_MinStock CHECK (MinStock >= 0),
    CONSTRAINT CK_Products_MaxStock CHECK (MaxStock >= 0)
);
GO

CREATE TABLE dbo.ProductImages (
    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    ProductId INT NOT NULL,
    ImageUrl NVARCHAR(1000) NOT NULL,
    SortOrder INT NOT NULL CONSTRAINT DF_ProductImages_SortOrder DEFAULT (0),
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_ProductImages_CreatedAt DEFAULT (SYSDATETIME()),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_ProductImages_UpdatedAt DEFAULT (SYSDATETIME()),
    CONSTRAINT FK_ProductImages_ProductId FOREIGN KEY (ProductId) REFERENCES dbo.Products(Id)
);
GO

CREATE TABLE dbo.ProductUnits (
    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    ProductId INT NOT NULL,
    UnitId INT NOT NULL,
    Barcode NVARCHAR(50) NULL,
    ConversionValue DECIMAL(18,3) NOT NULL CONSTRAINT DF_ProductUnits_ConversionValue DEFAULT (1),
    CostPrice DECIMAL(18,2) NOT NULL CONSTRAINT DF_ProductUnits_CostPrice DEFAULT (0),
    SalePrice DECIMAL(18,2) NOT NULL CONSTRAINT DF_ProductUnits_SalePrice DEFAULT (0),
    AllowDirectSale BIT NOT NULL CONSTRAINT DF_ProductUnits_AllowDirectSale DEFAULT (1),
    IsDefaultForPos BIT NOT NULL CONSTRAINT DF_ProductUnits_IsDefaultForPos DEFAULT (0),
    IsSmallestUnit BIT NOT NULL CONSTRAINT DF_ProductUnits_IsSmallestUnit DEFAULT (0),
    IsActive BIT NOT NULL CONSTRAINT DF_ProductUnits_IsActive DEFAULT (1),
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_ProductUnits_CreatedAt DEFAULT (SYSDATETIME()),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_ProductUnits_UpdatedAt DEFAULT (SYSDATETIME()),
    CONSTRAINT FK_ProductUnits_ProductId FOREIGN KEY (ProductId) REFERENCES dbo.Products(Id),
    CONSTRAINT FK_ProductUnits_UnitId FOREIGN KEY (UnitId) REFERENCES dbo.Units(Id),
    CONSTRAINT CK_ProductUnits_ConversionValue CHECK (ConversionValue > 0),
    CONSTRAINT CK_ProductUnits_CostPrice CHECK (CostPrice >= 0),
    CONSTRAINT CK_ProductUnits_SalePrice CHECK (SalePrice >= 0)
);
GO

CREATE TABLE dbo.PurchaseOrders (
    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    SupplierId INT NULL,
    CreatedByUserId INT NOT NULL,
    ApprovedByUserId INT NULL,
    PurchaseOrderCode NVARCHAR(50) NOT NULL,
    SupplierNameSnapshot NVARCHAR(150) NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_PurchaseOrders_Status DEFAULT (N'DRAFT'),
    Notes NVARCHAR(500) NULL,
    SubtotalAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_PurchaseOrders_SubtotalAmount DEFAULT (0),
    DiscountAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_PurchaseOrders_DiscountAmount DEFAULT (0),
    TotalAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_PurchaseOrders_TotalAmount DEFAULT (0),
    OrderedAt DATETIME2(0) NOT NULL CONSTRAINT DF_PurchaseOrders_OrderedAt DEFAULT (SYSDATETIME()),
    ConfirmedAt DATETIME2(0) NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_PurchaseOrders_IsActive DEFAULT (1),
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_PurchaseOrders_CreatedAt DEFAULT (SYSDATETIME()),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_PurchaseOrders_UpdatedAt DEFAULT (SYSDATETIME()),
    CONSTRAINT FK_PurchaseOrders_SupplierId FOREIGN KEY (SupplierId) REFERENCES dbo.Suppliers(Id),
    CONSTRAINT FK_PurchaseOrders_CreatedByUserId FOREIGN KEY (CreatedByUserId) REFERENCES dbo.Users(Id),
    CONSTRAINT FK_PurchaseOrders_ApprovedByUserId FOREIGN KEY (ApprovedByUserId) REFERENCES dbo.Users(Id),
    CONSTRAINT UQ_PurchaseOrders_PurchaseOrderCode UNIQUE (PurchaseOrderCode),
    CONSTRAINT CK_PurchaseOrders_SubtotalAmount CHECK (SubtotalAmount >= 0),
    CONSTRAINT CK_PurchaseOrders_DiscountAmount CHECK (DiscountAmount >= 0),
    CONSTRAINT CK_PurchaseOrders_TotalAmount CHECK (TotalAmount >= 0)
);
GO

CREATE TABLE dbo.PurchaseOrderItems (
    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    PurchaseOrderId INT NOT NULL,
    ProductId INT NOT NULL,
    ProductUnitId INT NOT NULL,
    ProductCodeSnapshot NVARCHAR(50) NOT NULL,
    ProductNameSnapshot NVARCHAR(255) NOT NULL,
    UnitNameSnapshot NVARCHAR(100) NULL,
    ConversionValue DECIMAL(18,3) NOT NULL CONSTRAINT DF_PurchaseOrderItems_ConversionValue DEFAULT (1),
    Quantity DECIMAL(18,3) NOT NULL,
    CostPrice DECIMAL(18,2) NOT NULL,
    LineTotal DECIMAL(18,2) NOT NULL,
    Notes NVARCHAR(255) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_PurchaseOrderItems_CreatedAt DEFAULT (SYSDATETIME()),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_PurchaseOrderItems_UpdatedAt DEFAULT (SYSDATETIME()),
    CONSTRAINT FK_PurchaseOrderItems_PurchaseOrderId FOREIGN KEY (PurchaseOrderId) REFERENCES dbo.PurchaseOrders(Id),
    CONSTRAINT FK_PurchaseOrderItems_ProductId FOREIGN KEY (ProductId) REFERENCES dbo.Products(Id),
    CONSTRAINT FK_PurchaseOrderItems_ProductUnitId FOREIGN KEY (ProductUnitId) REFERENCES dbo.ProductUnits(Id),
    CONSTRAINT CK_PurchaseOrderItems_Quantity CHECK (Quantity > 0),
    CONSTRAINT CK_PurchaseOrderItems_ConversionValue CHECK (ConversionValue > 0),
    CONSTRAINT CK_PurchaseOrderItems_CostPrice CHECK (CostPrice >= 0),
    CONSTRAINT CK_PurchaseOrderItems_LineTotal CHECK (LineTotal >= 0)
);
GO

CREATE TABLE dbo.SalesOrders (
    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    CreatedByUserId INT NOT NULL,
    CancelledByUserId INT NULL,
    SourceSalesOrderId INT NULL,
    SalesOrderCode NVARCHAR(50) NOT NULL,
    OrderType NVARCHAR(30) NOT NULL CONSTRAINT DF_SalesOrders_OrderType DEFAULT (N'SALE'),
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_SalesOrders_Status DEFAULT (N'COMPLETED'),
    SaleMode NVARCHAR(30) NOT NULL CONSTRAINT DF_SalesOrders_SaleMode DEFAULT (N'QUICK_SALE'),
    PaymentMethod NVARCHAR(30) NOT NULL,
    CustomerName NVARCHAR(150) NULL,
    CustomerPhone NVARCHAR(30) NULL,
    Notes NVARCHAR(500) NULL,
    SubtotalAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_SalesOrders_SubtotalAmount DEFAULT (0),
    DiscountAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_SalesOrders_DiscountAmount DEFAULT (0),
    ReturnFeeAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_SalesOrders_ReturnFeeAmount DEFAULT (0),
    TotalAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_SalesOrders_TotalAmount DEFAULT (0),
    CustomerPaidAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_SalesOrders_CustomerPaidAmount DEFAULT (0),
    ChangeAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_SalesOrders_ChangeAmount DEFAULT (0),
    SoldAt DATETIME2(0) NOT NULL CONSTRAINT DF_SalesOrders_SoldAt DEFAULT (SYSDATETIME()),
    CancelledAt DATETIME2(0) NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_SalesOrders_IsActive DEFAULT (1),
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_SalesOrders_CreatedAt DEFAULT (SYSDATETIME()),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_SalesOrders_UpdatedAt DEFAULT (SYSDATETIME()),
    CONSTRAINT FK_SalesOrders_CreatedByUserId FOREIGN KEY (CreatedByUserId) REFERENCES dbo.Users(Id),
    CONSTRAINT FK_SalesOrders_CancelledByUserId FOREIGN KEY (CancelledByUserId) REFERENCES dbo.Users(Id),
    CONSTRAINT FK_SalesOrders_SourceSalesOrderId FOREIGN KEY (SourceSalesOrderId) REFERENCES dbo.SalesOrders(Id),
    CONSTRAINT UQ_SalesOrders_SalesOrderCode UNIQUE (SalesOrderCode),
    CONSTRAINT CK_SalesOrders_SubtotalAmount CHECK (SubtotalAmount >= 0),
    CONSTRAINT CK_SalesOrders_DiscountAmount CHECK (DiscountAmount >= 0),
    CONSTRAINT CK_SalesOrders_ReturnFeeAmount CHECK (ReturnFeeAmount >= 0),
    CONSTRAINT CK_SalesOrders_TotalAmount CHECK (TotalAmount >= 0),
    CONSTRAINT CK_SalesOrders_CustomerPaidAmount CHECK (CustomerPaidAmount >= 0),
    CONSTRAINT CK_SalesOrders_ChangeAmount CHECK (ChangeAmount >= 0)
);
GO

CREATE TABLE dbo.SalesOrderItems (
    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    SalesOrderId INT NOT NULL,
    ProductId INT NOT NULL,
    ProductUnitId INT NOT NULL,
    ProductCodeSnapshot NVARCHAR(50) NOT NULL,
    BarcodeSnapshot NVARCHAR(50) NULL,
    ProductNameSnapshot NVARCHAR(255) NOT NULL,
    UnitNameSnapshot NVARCHAR(100) NULL,
    ConversionValue DECIMAL(18,3) NOT NULL CONSTRAINT DF_SalesOrderItems_ConversionValue DEFAULT (1),
    Quantity DECIMAL(18,3) NOT NULL,
    CostPrice DECIMAL(18,2) NOT NULL,
    UnitPrice DECIMAL(18,2) NOT NULL,
    DiscountAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_SalesOrderItems_DiscountAmount DEFAULT (0),
    LineTotal DECIMAL(18,2) NOT NULL,
    Notes NVARCHAR(255) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_SalesOrderItems_CreatedAt DEFAULT (SYSDATETIME()),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_SalesOrderItems_UpdatedAt DEFAULT (SYSDATETIME()),
    CONSTRAINT FK_SalesOrderItems_SalesOrderId FOREIGN KEY (SalesOrderId) REFERENCES dbo.SalesOrders(Id),
    CONSTRAINT FK_SalesOrderItems_ProductId FOREIGN KEY (ProductId) REFERENCES dbo.Products(Id),
    CONSTRAINT FK_SalesOrderItems_ProductUnitId FOREIGN KEY (ProductUnitId) REFERENCES dbo.ProductUnits(Id),
    CONSTRAINT CK_SalesOrderItems_Quantity CHECK (Quantity > 0),
    CONSTRAINT CK_SalesOrderItems_ConversionValue CHECK (ConversionValue > 0),
    CONSTRAINT CK_SalesOrderItems_CostPrice CHECK (CostPrice >= 0),
    CONSTRAINT CK_SalesOrderItems_UnitPrice CHECK (UnitPrice >= 0),
    CONSTRAINT CK_SalesOrderItems_DiscountAmount CHECK (DiscountAmount >= 0),
    CONSTRAINT CK_SalesOrderItems_LineTotal CHECK (LineTotal >= 0)
);
GO

CREATE TABLE dbo.InventoryTransactions (
    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    ProductId INT NOT NULL,
    PurchaseOrderId INT NULL,
    SalesOrderId INT NULL,
    CreatedByUserId INT NULL,
    TransactionType NVARCHAR(30) NOT NULL,
    ReferenceCode NVARCHAR(50) NULL,
    QuantityChange DECIMAL(18,3) NOT NULL,
    StockBefore DECIMAL(18,3) NOT NULL,
    StockAfter DECIMAL(18,3) NOT NULL,
    UnitCost DECIMAL(18,2) NULL,
    Notes NVARCHAR(500) NULL,
    BatchNumber NVARCHAR(100) NULL,
    ExpiryDate DATE NULL,
    TransactionAt DATETIME2(0) NOT NULL CONSTRAINT DF_InventoryTransactions_TransactionAt DEFAULT (SYSDATETIME()),
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_InventoryTransactions_CreatedAt DEFAULT (SYSDATETIME()),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_InventoryTransactions_UpdatedAt DEFAULT (SYSDATETIME()),
    CONSTRAINT FK_InventoryTransactions_ProductId FOREIGN KEY (ProductId) REFERENCES dbo.Products(Id),
    CONSTRAINT FK_InventoryTransactions_PurchaseOrderId FOREIGN KEY (PurchaseOrderId) REFERENCES dbo.PurchaseOrders(Id),
    CONSTRAINT FK_InventoryTransactions_SalesOrderId FOREIGN KEY (SalesOrderId) REFERENCES dbo.SalesOrders(Id),
    CONSTRAINT FK_InventoryTransactions_CreatedByUserId FOREIGN KEY (CreatedByUserId) REFERENCES dbo.Users(Id)
);
GO

CREATE TABLE dbo.PosDraftTabs (
    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    CreatedByUserId INT NOT NULL,
    TabCode NVARCHAR(50) NOT NULL,
    TabType NVARCHAR(30) NOT NULL,
    Title NVARCHAR(100) NOT NULL,
    SaleMode NVARCHAR(30) NOT NULL CONSTRAINT DF_PosDraftTabs_SaleMode DEFAULT (N'QUICK_SALE'),
    CustomerName NVARCHAR(150) NULL,
    CustomerPhone NVARCHAR(30) NULL,
    Note NVARCHAR(500) NULL,
    PaymentMethod NVARCHAR(30) NOT NULL CONSTRAINT DF_PosDraftTabs_PaymentMethod DEFAULT (N'CASH'),
    CustomerPaidAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_PosDraftTabs_CustomerPaidAmount DEFAULT (0),
    DiscountAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_PosDraftTabs_DiscountAmount DEFAULT (0),
    SourceSalesOrderId INT NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_PosDraftTabs_IsActive DEFAULT (1),
    LastTouchedAt DATETIME2(0) NOT NULL CONSTRAINT DF_PosDraftTabs_LastTouchedAt DEFAULT (SYSDATETIME()),
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_PosDraftTabs_CreatedAt DEFAULT (SYSDATETIME()),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_PosDraftTabs_UpdatedAt DEFAULT (SYSDATETIME()),
    CONSTRAINT FK_PosDraftTabs_CreatedByUserId FOREIGN KEY (CreatedByUserId) REFERENCES dbo.Users(Id),
    CONSTRAINT FK_PosDraftTabs_SourceSalesOrderId FOREIGN KEY (SourceSalesOrderId) REFERENCES dbo.SalesOrders(Id),
    CONSTRAINT UQ_PosDraftTabs_TabCode UNIQUE (TabCode)
);
GO

CREATE TABLE dbo.PosDraftTabItems (
    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    PosDraftTabId INT NOT NULL,
    ProductId INT NOT NULL,
    ProductUnitId INT NOT NULL,
    ProductCodeSnapshot NVARCHAR(50) NOT NULL,
    BarcodeSnapshot NVARCHAR(50) NULL,
    ProductNameSnapshot NVARCHAR(255) NOT NULL,
    UnitId INT NOT NULL,
    UnitNameSnapshot NVARCHAR(100) NOT NULL,
    ConversionValue DECIMAL(18,3) NOT NULL CONSTRAINT DF_PosDraftTabItems_ConversionValue DEFAULT (1),
    Quantity DECIMAL(18,3) NOT NULL,
    UnitPrice DECIMAL(18,2) NOT NULL,
    DiscountAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_PosDraftTabItems_DiscountAmount DEFAULT (0),
    LineTotal DECIMAL(18,2) NOT NULL,
    Note NVARCHAR(255) NULL,
    SortOrder INT NOT NULL CONSTRAINT DF_PosDraftTabItems_SortOrder DEFAULT (0),
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_PosDraftTabItems_CreatedAt DEFAULT (SYSDATETIME()),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_PosDraftTabItems_UpdatedAt DEFAULT (SYSDATETIME()),
    CONSTRAINT FK_PosDraftTabItems_PosDraftTabId FOREIGN KEY (PosDraftTabId) REFERENCES dbo.PosDraftTabs(Id),
    CONSTRAINT FK_PosDraftTabItems_ProductId FOREIGN KEY (ProductId) REFERENCES dbo.Products(Id),
    CONSTRAINT FK_PosDraftTabItems_ProductUnitId FOREIGN KEY (ProductUnitId) REFERENCES dbo.ProductUnits(Id),
    CONSTRAINT FK_PosDraftTabItems_UnitId FOREIGN KEY (UnitId) REFERENCES dbo.Units(Id),
    CONSTRAINT CK_PosDraftTabItems_Quantity CHECK (Quantity > 0),
    CONSTRAINT CK_PosDraftTabItems_ConversionValue CHECK (ConversionValue > 0),
    CONSTRAINT CK_PosDraftTabItems_UnitPrice CHECK (UnitPrice >= 0),
    CONSTRAINT CK_PosDraftTabItems_DiscountAmount CHECK (DiscountAmount >= 0),
    CONSTRAINT CK_PosDraftTabItems_LineTotal CHECK (LineTotal >= 0)
);
GO

CREATE TABLE dbo.PrintTemplates (
    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Code NVARCHAR(50) NOT NULL,
    Name NVARCHAR(150) NOT NULL,
    TemplateType NVARCHAR(30) NOT NULL,
    PaperSize NVARCHAR(20) NOT NULL,
    HtmlContent NVARCHAR(MAX) NOT NULL,
    HeaderContent NVARCHAR(MAX) NULL,
    FooterContent NVARCHAR(MAX) NULL,
    IsDefault BIT NOT NULL CONSTRAINT DF_PrintTemplates_IsDefault DEFAULT (0),
    IsActive BIT NOT NULL CONSTRAINT DF_PrintTemplates_IsActive DEFAULT (1),
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_PrintTemplates_CreatedAt DEFAULT (SYSDATETIME()),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_PrintTemplates_UpdatedAt DEFAULT (SYSDATETIME()),
    CONSTRAINT UQ_PrintTemplates_Code UNIQUE (Code)
);
GO

CREATE TABLE dbo.Settings (
    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    StoreName NVARCHAR(150) NOT NULL,
    StoreAddress NVARCHAR(255) NULL,
    StorePhoneNumber NVARCHAR(30) NULL,
    ReceiptHeader NVARCHAR(500) NULL,
    ReceiptFooter NVARCHAR(500) NULL,
    ReceiptPrinterWidthMm INT NOT NULL CONSTRAINT DF_Settings_ReceiptPrinterWidthMm DEFAULT (80),
    CurrencyCode NVARCHAR(10) NOT NULL CONSTRAINT DF_Settings_CurrencyCode DEFAULT (N'VND'),
    TimezoneId NVARCHAR(100) NOT NULL CONSTRAINT DF_Settings_TimezoneId DEFAULT (N'Asia/Saigon'),
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Settings_CreatedAt DEFAULT (SYSDATETIME()),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Settings_UpdatedAt DEFAULT (SYSDATETIME())
);
GO

CREATE UNIQUE INDEX UX_Products_Barcode_NotNull
ON dbo.Products (Barcode)
WHERE Barcode IS NOT NULL;
GO

CREATE UNIQUE INDEX UX_ProductUnits_Barcode_NotNull
ON dbo.ProductUnits (Barcode)
WHERE Barcode IS NOT NULL;
GO

CREATE UNIQUE INDEX UX_Categories_Code_NotNull
ON dbo.Categories (Code)
WHERE Code IS NOT NULL;
GO

CREATE UNIQUE INDEX UX_Brands_Code_NotNull
ON dbo.Brands (Code)
WHERE Code IS NOT NULL;
GO

CREATE UNIQUE INDEX UX_Units_Code_NotNull
ON dbo.Units (Code)
WHERE Code IS NOT NULL;
GO

CREATE UNIQUE INDEX UX_Suppliers_Code_NotNull
ON dbo.Suppliers (Code)
WHERE Code IS NOT NULL;
GO

CREATE INDEX IX_Products_Name ON dbo.Products (Name);
GO

CREATE INDEX IX_ProductUnits_ProductId_IsActive
ON dbo.ProductUnits (ProductId, IsActive, IsDefaultForPos, IsSmallestUnit);
GO

CREATE INDEX IX_Products_CategoryId_IsActive ON dbo.Products (CategoryId, IsActive);
GO

CREATE INDEX IX_Products_AllowDirectSale_IsActive ON dbo.Products (AllowDirectSale, IsActive);
GO

CREATE INDEX IX_PurchaseOrders_SupplierId_Status ON dbo.PurchaseOrders (SupplierId, Status);
GO

CREATE INDEX IX_PurchaseOrders_OrderedAt ON dbo.PurchaseOrders (OrderedAt);
GO

CREATE INDEX IX_SalesOrders_SoldAt ON dbo.SalesOrders (SoldAt);
GO

CREATE INDEX IX_SalesOrders_Status_SoldAt ON dbo.SalesOrders (Status, SoldAt);
GO

CREATE INDEX IX_SalesOrders_OrderType_SoldAt ON dbo.SalesOrders (OrderType, SoldAt);
GO

CREATE INDEX IX_InventoryTransactions_ProductId_TransactionAt
ON dbo.InventoryTransactions (ProductId, TransactionAt DESC);
GO

CREATE INDEX IX_PosDraftTabs_CreatedByUserId_IsActive
ON dbo.PosDraftTabs (CreatedByUserId, IsActive, LastTouchedAt DESC);
GO

INSERT INTO dbo.Roles (Code, Name, Description)
VALUES
    (N'MANAGER', N'Manager', N'Quan ly cua hang'),
    (N'STAFF', N'Staff', N'Nhan vien ban hang');
GO

INSERT INTO dbo.Settings (
    StoreName,
    StoreAddress,
    StorePhoneNumber,
    ReceiptHeader,
    ReceiptFooter
)
VALUES (
    N'POS Kiosk',
    NULL,
    NULL,
    N'Cam on quy khach',
    N'Hen gap lai'
);
GO
