-- POS Kiosk Initial Schema for PostgreSQL
-- Drop everything first (order matters for FK)
DROP TABLE IF EXISTS "LoyaltyPointTransactions" CASCADE;
DROP TABLE IF EXISTS "Customers" CASCADE;
DROP TABLE IF EXISTS "InventoryTransactions" CASCADE;
DROP TABLE IF EXISTS "PosDraftTabItems" CASCADE;
DROP TABLE IF EXISTS "PosDraftTabs" CASCADE;
DROP TABLE IF EXISTS "SalesOrderItems" CASCADE;
DROP TABLE IF EXISTS "SalesOrders" CASCADE;
DROP TABLE IF EXISTS "PurchaseOrderItems" CASCADE;
DROP TABLE IF EXISTS "PurchaseOrders" CASCADE;
DROP TABLE IF EXISTS "ProductImages" CASCADE;
DROP TABLE IF EXISTS "ProductUnits" CASCADE;
DROP TABLE IF EXISTS "Products" CASCADE;
DROP TABLE IF EXISTS "Suppliers" CASCADE;
DROP TABLE IF EXISTS "Brands" CASCADE;
DROP TABLE IF EXISTS "Units" CASCADE;
DROP TABLE IF EXISTS "Categories" CASCADE;
DROP TABLE IF EXISTS "Users" CASCADE;
DROP TABLE IF EXISTS "Roles" CASCADE;
DROP TABLE IF EXISTS "Settings" CASCADE;
DROP TABLE IF EXISTS "PrintTemplates" CASCADE;

CREATE TABLE "Roles" (
    "Id" SERIAL PRIMARY KEY,
    "Code" VARCHAR(50) NOT NULL,
    "Name" VARCHAR(100) NOT NULL,
    "Description" VARCHAR(255),
    "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT "UQ_Roles_Code" UNIQUE ("Code"),
    CONSTRAINT "UQ_Roles_Name" UNIQUE ("Name")
);

CREATE TABLE "Users" (
    "Id" SERIAL PRIMARY KEY,
    "RoleId" INT NOT NULL,
    "Username" VARCHAR(100) NOT NULL,
    "PasswordHash" VARCHAR(255) NOT NULL,
    "FullName" VARCHAR(150) NOT NULL,
    "PhoneNumber" VARCHAR(30),
    "Email" VARCHAR(150),
    "LastLoginAt" TIMESTAMP,
    "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT "FK_Users_RoleId" FOREIGN KEY ("RoleId") REFERENCES "Roles"("Id"),
    CONSTRAINT "UQ_Users_Username" UNIQUE ("Username")
);

CREATE TABLE "Categories" (
    "Id" SERIAL PRIMARY KEY,
    "ParentId" INT,
    "Code" VARCHAR(50),
    "Name" VARCHAR(150) NOT NULL,
    "SortOrder" INT NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT "FK_Categories_ParentId" FOREIGN KEY ("ParentId") REFERENCES "Categories"("Id")
);

CREATE TABLE "Brands" (
    "Id" SERIAL PRIMARY KEY,
    "Code" VARCHAR(50),
    "Name" VARCHAR(150) NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT "UQ_Brands_Name" UNIQUE ("Name")
);

CREATE TABLE "Units" (
    "Id" SERIAL PRIMARY KEY,
    "Code" VARCHAR(50),
    "Name" VARCHAR(100) NOT NULL,
    "IsBaseUnit" BOOLEAN NOT NULL DEFAULT TRUE,
    "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT "UQ_Units_Name" UNIQUE ("Name")
);

CREATE TABLE "Suppliers" (
    "Id" SERIAL PRIMARY KEY,
    "Code" VARCHAR(50),
    "Name" VARCHAR(150) NOT NULL,
    "PhoneNumber" VARCHAR(30),
    "Address" VARCHAR(255),
    "Notes" VARCHAR(500),
    "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "Products" (
    "Id" SERIAL PRIMARY KEY,
    "CategoryId" INT NOT NULL,
    "BrandId" INT,
    "UnitId" INT NOT NULL,
    "ProductType" VARCHAR(30) NOT NULL DEFAULT 'HANG_HOA',
    "ProductCode" VARCHAR(50) NOT NULL,
    "Barcode" VARCHAR(50),
    "Name" VARCHAR(255) NOT NULL,
    "VariantGroupCode" VARCHAR(100),
    "CostPrice" NUMERIC(18,2) NOT NULL DEFAULT 0,
    "SalePrice" NUMERIC(18,2) NOT NULL DEFAULT 0,
    "StockOnHand" NUMERIC(18,3) NOT NULL DEFAULT 0,
    "MinStock" NUMERIC(18,3) NOT NULL DEFAULT 0,
    "MaxStock" NUMERIC(18,3) NOT NULL DEFAULT 0,
    "Weight" NUMERIC(18,3),
    "Description" VARCHAR(1000),
    "NoteTemplate" VARCHAR(500),
    "Location" VARCHAR(150),
    "TrackBatchExpiry" BOOLEAN NOT NULL DEFAULT FALSE,
    "AllowDirectSale" BOOLEAN NOT NULL DEFAULT TRUE,
    "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "ImportedCreatedAt" TIMESTAMP,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT "FK_Products_CategoryId" FOREIGN KEY ("CategoryId") REFERENCES "Categories"("Id"),
    CONSTRAINT "FK_Products_BrandId" FOREIGN KEY ("BrandId") REFERENCES "Brands"("Id"),
    CONSTRAINT "FK_Products_UnitId" FOREIGN KEY ("UnitId") REFERENCES "Units"("Id"),
    CONSTRAINT "UQ_Products_ProductCode" UNIQUE ("ProductCode"),
    CONSTRAINT "CK_Products_CostPrice" CHECK ("CostPrice" >= 0),
    CONSTRAINT "CK_Products_SalePrice" CHECK ("SalePrice" >= 0),
    CONSTRAINT "CK_Products_MinStock" CHECK ("MinStock" >= 0),
    CONSTRAINT "CK_Products_MaxStock" CHECK ("MaxStock" >= 0)
);

CREATE TABLE "ProductImages" (
    "Id" SERIAL PRIMARY KEY,
    "ProductId" INT NOT NULL,
    "ImageUrl" VARCHAR(1000) NOT NULL,
    "SortOrder" INT NOT NULL DEFAULT 0,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT "FK_ProductImages_ProductId" FOREIGN KEY ("ProductId") REFERENCES "Products"("Id")
);

CREATE TABLE "ProductUnits" (
    "Id" SERIAL PRIMARY KEY,
    "ProductId" INT NOT NULL,
    "UnitId" INT NOT NULL,
    "Barcode" VARCHAR(50),
    "ConversionValue" NUMERIC(18,3) NOT NULL DEFAULT 1,
    "CostPrice" NUMERIC(18,2) NOT NULL DEFAULT 0,
    "SalePrice" NUMERIC(18,2) NOT NULL DEFAULT 0,
    "AllowDirectSale" BOOLEAN NOT NULL DEFAULT TRUE,
    "IsDefaultForPos" BOOLEAN NOT NULL DEFAULT FALSE,
    "IsSmallestUnit" BOOLEAN NOT NULL DEFAULT FALSE,
    "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT "FK_ProductUnits_ProductId" FOREIGN KEY ("ProductId") REFERENCES "Products"("Id"),
    CONSTRAINT "FK_ProductUnits_UnitId" FOREIGN KEY ("UnitId") REFERENCES "Units"("Id"),
    CONSTRAINT "CK_ProductUnits_ConversionValue" CHECK ("ConversionValue" > 0),
    CONSTRAINT "CK_ProductUnits_CostPrice" CHECK ("CostPrice" >= 0),
    CONSTRAINT "CK_ProductUnits_SalePrice" CHECK ("SalePrice" >= 0)
);

CREATE TABLE "PurchaseOrders" (
    "Id" SERIAL PRIMARY KEY,
    "SupplierId" INT,
    "CreatedByUserId" INT NOT NULL,
    "ApprovedByUserId" INT,
    "PurchaseOrderCode" VARCHAR(50) NOT NULL,
    "SupplierNameSnapshot" VARCHAR(150),
    "Status" VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    "Notes" VARCHAR(500),
    "SubtotalAmount" NUMERIC(18,2) NOT NULL DEFAULT 0,
    "DiscountAmount" NUMERIC(18,2) NOT NULL DEFAULT 0,
    "TotalAmount" NUMERIC(18,2) NOT NULL DEFAULT 0,
    "OrderedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "ConfirmedAt" TIMESTAMP,
    "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT "FK_PurchaseOrders_SupplierId" FOREIGN KEY ("SupplierId") REFERENCES "Suppliers"("Id"),
    CONSTRAINT "FK_PurchaseOrders_CreatedByUserId" FOREIGN KEY ("CreatedByUserId") REFERENCES "Users"("Id"),
    CONSTRAINT "FK_PurchaseOrders_ApprovedByUserId" FOREIGN KEY ("ApprovedByUserId") REFERENCES "Users"("Id"),
    CONSTRAINT "UQ_PurchaseOrders_PurchaseOrderCode" UNIQUE ("PurchaseOrderCode"),
    CONSTRAINT "CK_PurchaseOrders_SubtotalAmount" CHECK ("SubtotalAmount" >= 0),
    CONSTRAINT "CK_PurchaseOrders_DiscountAmount" CHECK ("DiscountAmount" >= 0),
    CONSTRAINT "CK_PurchaseOrders_TotalAmount" CHECK ("TotalAmount" >= 0)
);

CREATE TABLE "PurchaseOrderItems" (
    "Id" SERIAL PRIMARY KEY,
    "PurchaseOrderId" INT NOT NULL,
    "ProductId" INT NOT NULL,
    "ProductUnitId" INT NOT NULL,
    "ProductCodeSnapshot" VARCHAR(50) NOT NULL,
    "ProductNameSnapshot" VARCHAR(255) NOT NULL,
    "UnitNameSnapshot" VARCHAR(100),
    "ConversionValue" NUMERIC(18,3) NOT NULL DEFAULT 1,
    "Quantity" NUMERIC(18,3) NOT NULL,
    "CostPrice" NUMERIC(18,2) NOT NULL,
    "LineTotal" NUMERIC(18,2) NOT NULL,
    "Notes" VARCHAR(255),
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT "FK_PurchaseOrderItems_PurchaseOrderId" FOREIGN KEY ("PurchaseOrderId") REFERENCES "PurchaseOrders"("Id"),
    CONSTRAINT "FK_PurchaseOrderItems_ProductId" FOREIGN KEY ("ProductId") REFERENCES "Products"("Id"),
    CONSTRAINT "FK_PurchaseOrderItems_ProductUnitId" FOREIGN KEY ("ProductUnitId") REFERENCES "ProductUnits"("Id"),
    CONSTRAINT "CK_PurchaseOrderItems_Quantity" CHECK ("Quantity" > 0),
    CONSTRAINT "CK_PurchaseOrderItems_ConversionValue" CHECK ("ConversionValue" > 0),
    CONSTRAINT "CK_PurchaseOrderItems_CostPrice" CHECK ("CostPrice" >= 0),
    CONSTRAINT "CK_PurchaseOrderItems_LineTotal" CHECK ("LineTotal" >= 0)
);

CREATE TABLE "Customers" (
    "Id" SERIAL PRIMARY KEY,
    "PhoneNumber" VARCHAR(30) NOT NULL,
    "FullName" VARCHAR(150),
    "CurrentPoints" NUMERIC(18,4) NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT "UQ_Customers_PhoneNumber" UNIQUE ("PhoneNumber")
);

CREATE TABLE "SalesOrders" (
    "Id" SERIAL PRIMARY KEY,
    "CreatedByUserId" INT NOT NULL,
    "CancelledByUserId" INT,
    "SourceSalesOrderId" INT,
    "CustomerId" INT,
    "SalesOrderCode" VARCHAR(50) NOT NULL,
    "OrderType" VARCHAR(30) NOT NULL DEFAULT 'SALE',
    "Status" VARCHAR(30) NOT NULL DEFAULT 'COMPLETED',
    "SaleMode" VARCHAR(30) NOT NULL DEFAULT 'QUICK_SALE',
    "PaymentMethod" VARCHAR(30) NOT NULL,
    "CustomerName" VARCHAR(150),
    "CustomerPhone" VARCHAR(30),
    "RedeemedPoints" NUMERIC(18,4),
    "EarnedPoints" NUMERIC(18,4),
    "LoyaltyDiscountAmount" NUMERIC(18,2),
    "Notes" VARCHAR(500),
    "SubtotalAmount" NUMERIC(18,2) NOT NULL DEFAULT 0,
    "DiscountAmount" NUMERIC(18,2) NOT NULL DEFAULT 0,
    "ReturnFeeAmount" NUMERIC(18,2) NOT NULL DEFAULT 0,
    "TotalAmount" NUMERIC(18,2) NOT NULL DEFAULT 0,
    "CustomerPaidAmount" NUMERIC(18,2) NOT NULL DEFAULT 0,
    "ChangeAmount" NUMERIC(18,2) NOT NULL DEFAULT 0,
    "SoldAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "CancelledAt" TIMESTAMP,
    "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT "FK_SalesOrders_CreatedByUserId" FOREIGN KEY ("CreatedByUserId") REFERENCES "Users"("Id"),
    CONSTRAINT "FK_SalesOrders_CancelledByUserId" FOREIGN KEY ("CancelledByUserId") REFERENCES "Users"("Id"),
    CONSTRAINT "FK_SalesOrders_SourceSalesOrderId" FOREIGN KEY ("SourceSalesOrderId") REFERENCES "SalesOrders"("Id"),
    CONSTRAINT "FK_SalesOrders_Customers_CustomerId" FOREIGN KEY ("CustomerId") REFERENCES "Customers"("Id"),
    CONSTRAINT "UQ_SalesOrders_SalesOrderCode" UNIQUE ("SalesOrderCode"),
    CONSTRAINT "CK_SalesOrders_SubtotalAmount" CHECK ("SubtotalAmount" >= 0),
    CONSTRAINT "CK_SalesOrders_DiscountAmount" CHECK ("DiscountAmount" >= 0),
    CONSTRAINT "CK_SalesOrders_ReturnFeeAmount" CHECK ("ReturnFeeAmount" >= 0),
    CONSTRAINT "CK_SalesOrders_TotalAmount" CHECK ("TotalAmount" >= 0),
    CONSTRAINT "CK_SalesOrders_CustomerPaidAmount" CHECK ("CustomerPaidAmount" >= 0),
    CONSTRAINT "CK_SalesOrders_ChangeAmount" CHECK ("ChangeAmount" >= 0)
);

CREATE TABLE "SalesOrderItems" (
    "Id" SERIAL PRIMARY KEY,
    "SalesOrderId" INT NOT NULL,
    "ProductId" INT NOT NULL,
    "ProductUnitId" INT NOT NULL,
    "ProductCodeSnapshot" VARCHAR(50) NOT NULL,
    "BarcodeSnapshot" VARCHAR(50),
    "ProductNameSnapshot" VARCHAR(255) NOT NULL,
    "UnitNameSnapshot" VARCHAR(100),
    "ConversionValue" NUMERIC(18,3) NOT NULL DEFAULT 1,
    "Quantity" NUMERIC(18,3) NOT NULL,
    "CostPrice" NUMERIC(18,2) NOT NULL,
    "UnitPrice" NUMERIC(18,2) NOT NULL,
    "DiscountAmount" NUMERIC(18,2) NOT NULL DEFAULT 0,
    "LineTotal" NUMERIC(18,2) NOT NULL,
    "Notes" VARCHAR(255),
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT "FK_SalesOrderItems_SalesOrderId" FOREIGN KEY ("SalesOrderId") REFERENCES "SalesOrders"("Id"),
    CONSTRAINT "FK_SalesOrderItems_ProductId" FOREIGN KEY ("ProductId") REFERENCES "Products"("Id"),
    CONSTRAINT "FK_SalesOrderItems_ProductUnitId" FOREIGN KEY ("ProductUnitId") REFERENCES "ProductUnits"("Id"),
    CONSTRAINT "CK_SalesOrderItems_Quantity" CHECK ("Quantity" > 0),
    CONSTRAINT "CK_SalesOrderItems_ConversionValue" CHECK ("ConversionValue" > 0),
    CONSTRAINT "CK_SalesOrderItems_CostPrice" CHECK ("CostPrice" >= 0),
    CONSTRAINT "CK_SalesOrderItems_UnitPrice" CHECK ("UnitPrice" >= 0),
    CONSTRAINT "CK_SalesOrderItems_DiscountAmount" CHECK ("DiscountAmount" >= 0),
    CONSTRAINT "CK_SalesOrderItems_LineTotal" CHECK ("LineTotal" >= 0)
);

CREATE TABLE "InventoryTransactions" (
    "Id" SERIAL PRIMARY KEY,
    "ProductId" INT NOT NULL,
    "PurchaseOrderId" INT,
    "SalesOrderId" INT,
    "CreatedByUserId" INT,
    "TransactionType" VARCHAR(30) NOT NULL,
    "ReferenceCode" VARCHAR(50),
    "QuantityChange" NUMERIC(18,3) NOT NULL,
    "StockBefore" NUMERIC(18,3) NOT NULL,
    "StockAfter" NUMERIC(18,3) NOT NULL,
    "UnitCost" NUMERIC(18,2),
    "Notes" VARCHAR(500),
    "BatchNumber" VARCHAR(100),
    "ExpiryDate" DATE,
    "TransactionAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT "FK_InventoryTransactions_ProductId" FOREIGN KEY ("ProductId") REFERENCES "Products"("Id"),
    CONSTRAINT "FK_InventoryTransactions_PurchaseOrderId" FOREIGN KEY ("PurchaseOrderId") REFERENCES "PurchaseOrders"("Id"),
    CONSTRAINT "FK_InventoryTransactions_SalesOrderId" FOREIGN KEY ("SalesOrderId") REFERENCES "SalesOrders"("Id"),
    CONSTRAINT "FK_InventoryTransactions_CreatedByUserId" FOREIGN KEY ("CreatedByUserId") REFERENCES "Users"("Id")
);

CREATE TABLE "PosDraftTabs" (
    "Id" SERIAL PRIMARY KEY,
    "CreatedByUserId" INT NOT NULL,
    "TabCode" VARCHAR(50) NOT NULL,
    "TabType" VARCHAR(30) NOT NULL,
    "Title" VARCHAR(100) NOT NULL,
    "SaleMode" VARCHAR(30) NOT NULL DEFAULT 'QUICK_SALE',
    "CustomerName" VARCHAR(150),
    "CustomerPhone" VARCHAR(30),
    "CustomerId" INT,
    "RedeemedPoints" NUMERIC(18,4),
    "Note" VARCHAR(500),
    "PaymentMethod" VARCHAR(30) NOT NULL DEFAULT 'CASH',
    "CustomerPaidAmount" NUMERIC(18,2) NOT NULL DEFAULT 0,
    "DiscountAmount" NUMERIC(18,2) NOT NULL DEFAULT 0,
    "SourceSalesOrderId" INT,
    "ImportDate" DATE,
    "PurchaseOrderCode" VARCHAR(50),
    "SupplierId" INT,
    "SupplierOrderCode" VARCHAR(50),
    "SupplierInvoiceCode" VARCHAR(50),
    "PurchaseStatus" VARCHAR(30),
    "SupplierPaidAmount" NUMERIC(18,2) DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "LastTouchedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT "FK_PosDraftTabs_CreatedByUserId" FOREIGN KEY ("CreatedByUserId") REFERENCES "Users"("Id"),
    CONSTRAINT "FK_PosDraftTabs_SourceSalesOrderId" FOREIGN KEY ("SourceSalesOrderId") REFERENCES "SalesOrders"("Id"),
    CONSTRAINT "FK_PosDraftTabs_Customers_CustomerId" FOREIGN KEY ("CustomerId") REFERENCES "Customers"("Id"),
    CONSTRAINT "UQ_PosDraftTabs_TabCode" UNIQUE ("TabCode")
);

CREATE TABLE "PosDraftTabItems" (
    "Id" SERIAL PRIMARY KEY,
    "PosDraftTabId" INT NOT NULL,
    "ProductId" INT NOT NULL,
    "ProductUnitId" INT NOT NULL,
    "ProductCodeSnapshot" VARCHAR(50) NOT NULL,
    "BarcodeSnapshot" VARCHAR(50),
    "ProductNameSnapshot" VARCHAR(255) NOT NULL,
    "UnitId" INT NOT NULL,
    "UnitNameSnapshot" VARCHAR(100) NOT NULL,
    "ConversionValue" NUMERIC(18,3) NOT NULL DEFAULT 1,
    "Quantity" NUMERIC(18,3) NOT NULL,
    "UnitPrice" NUMERIC(18,2) NOT NULL,
    "DiscountAmount" NUMERIC(18,2) NOT NULL DEFAULT 0,
    "LineTotal" NUMERIC(18,2) NOT NULL,
    "Note" VARCHAR(255),
    "SortOrder" INT NOT NULL DEFAULT 0,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT "FK_PosDraftTabItems_PosDraftTabId" FOREIGN KEY ("PosDraftTabId") REFERENCES "PosDraftTabs"("Id"),
    CONSTRAINT "FK_PosDraftTabItems_ProductId" FOREIGN KEY ("ProductId") REFERENCES "Products"("Id"),
    CONSTRAINT "FK_PosDraftTabItems_ProductUnitId" FOREIGN KEY ("ProductUnitId") REFERENCES "ProductUnits"("Id"),
    CONSTRAINT "FK_PosDraftTabItems_UnitId" FOREIGN KEY ("UnitId") REFERENCES "Units"("Id"),
    CONSTRAINT "CK_PosDraftTabItems_Quantity" CHECK ("Quantity" > 0),
    CONSTRAINT "CK_PosDraftTabItems_ConversionValue" CHECK ("ConversionValue" > 0),
    CONSTRAINT "CK_PosDraftTabItems_UnitPrice" CHECK ("UnitPrice" >= 0),
    CONSTRAINT "CK_PosDraftTabItems_DiscountAmount" CHECK ("DiscountAmount" >= 0),
    CONSTRAINT "CK_PosDraftTabItems_LineTotal" CHECK ("LineTotal" >= 0)
);

CREATE TABLE "PrintTemplates" (
    "Id" SERIAL PRIMARY KEY,
    "Code" VARCHAR(50) NOT NULL,
    "Name" VARCHAR(150) NOT NULL,
    "TemplateType" VARCHAR(30) NOT NULL,
    "PaperSize" VARCHAR(20) NOT NULL,
    "HtmlContent" TEXT NOT NULL,
    "HeaderContent" TEXT,
    "FooterContent" TEXT,
    "IsDefault" BOOLEAN NOT NULL DEFAULT FALSE,
    "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT "UQ_PrintTemplates_Code" UNIQUE ("Code")
);

CREATE TABLE "Settings" (
    "Id" SERIAL PRIMARY KEY,
    "StoreName" VARCHAR(150) NOT NULL,
    "StoreAddress" VARCHAR(255),
    "StorePhoneNumber" VARCHAR(30),
    "ReceiptHeader" VARCHAR(500),
    "ReceiptFooter" VARCHAR(500),
    "ReceiptPrinterWidthMm" INT NOT NULL DEFAULT 80,
    "CurrencyCode" VARCHAR(10) NOT NULL DEFAULT 'VND',
    "TimezoneId" VARCHAR(100) NOT NULL DEFAULT 'Asia/Saigon',
    "CurrencySuffix" VARCHAR(10) NOT NULL DEFAULT 'đ',
    "Locale" VARCHAR(10) NOT NULL DEFAULT 'vi-VN',
    "ReceiptPaperWidth" VARCHAR(10) NOT NULL DEFAULT '76mm',
    "ReceiptPoweredBy" VARCHAR(200) NOT NULL DEFAULT 'Powered by KIOTVIET',
    "DefaultPaymentMethod" VARCHAR(20) NOT NULL DEFAULT 'CASH',
    "QuickPayAmount1" NUMERIC(18,0) NOT NULL DEFAULT 100000,
    "QuickPayAmount2" NUMERIC(18,0) NOT NULL DEFAULT 200000,
    "QuickPayAmount3" NUMERIC(18,0) NOT NULL DEFAULT 500000,
    "SalesOrderPrefix" VARCHAR(10) NOT NULL DEFAULT 'HD',
    "ReturnOrderPrefix" VARCHAR(10) NOT NULL DEFAULT 'TH',
    "PurchaseOrderPrefix" VARCHAR(10) NOT NULL DEFAULT 'PNH',
    "ProductSearchMaxResults" INT NOT NULL DEFAULT 8,
    "InvoiceSearchMaxResults" INT NOT NULL DEFAULT 20,
    "CustomerSearchMaxResults" INT NOT NULL DEFAULT 10,
    "DefaultAddQuantity" NUMERIC(18,2) NOT NULL DEFAULT 1,
    "OverviewPassword" VARCHAR(50) NOT NULL DEFAULT '11111',
    "CashierLabel" VARCHAR(50) NOT NULL DEFAULT 'Thu ngân',
    "ProductManagerPageSize" INT DEFAULT 30,
    "SearchDebounceMs" INT DEFAULT 250,
    "AutoSaveDebounceMs" INT DEFAULT 500,
    "PaymentMethods" VARCHAR(500),
    "LoyaltyEarnAmountPerPoint" NUMERIC(18,2),
    "LoyaltyRedeemAmountPerPoint" NUMERIC(18,2),
    "LoyaltyMinimumRedeemPoints" NUMERIC(18,4),
    "LoyaltyPointsExpiryDays" INT,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "LoyaltyPointTransactions" (
    "Id" SERIAL PRIMARY KEY,
    "CustomerId" INT NOT NULL,
    "SalesOrderId" INT,
    "TransactionType" VARCHAR(30) NOT NULL,
    "PointsChange" NUMERIC(18,4) NOT NULL,
    "BalanceAfter" NUMERIC(18,4) NOT NULL,
    "AmountBasis" NUMERIC(18,2),
    "ExpireAt" TIMESTAMP,
    "Notes" VARCHAR(255),
    "TransactionAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT "FK_LoyaltyPointTransactions_Customers" FOREIGN KEY ("CustomerId") REFERENCES "Customers"("Id"),
    CONSTRAINT "FK_LoyaltyPointTransactions_SalesOrders" FOREIGN KEY ("SalesOrderId") REFERENCES "SalesOrders"("Id")
);

-- Indexes
CREATE UNIQUE INDEX "UX_Products_Barcode_NotNull" ON "Products" ("Barcode") WHERE "Barcode" IS NOT NULL;
CREATE UNIQUE INDEX "UX_ProductUnits_Barcode_NotNull" ON "ProductUnits" ("Barcode") WHERE "Barcode" IS NOT NULL;
CREATE UNIQUE INDEX "UX_Categories_Code_NotNull" ON "Categories" ("Code") WHERE "Code" IS NOT NULL;
CREATE UNIQUE INDEX "UX_Brands_Code_NotNull" ON "Brands" ("Code") WHERE "Code" IS NOT NULL;
CREATE UNIQUE INDEX "UX_Units_Code_NotNull" ON "Units" ("Code") WHERE "Code" IS NOT NULL;
CREATE UNIQUE INDEX "UX_Suppliers_Code_NotNull" ON "Suppliers" ("Code") WHERE "Code" IS NOT NULL;
CREATE INDEX "IX_Products_Name" ON "Products" ("Name");
CREATE INDEX "IX_Products_VariantGroupCode" ON "Products" ("VariantGroupCode");
CREATE INDEX "IX_ProductUnits_ProductId_IsActive" ON "ProductUnits" ("ProductId", "IsActive", "IsDefaultForPos", "IsSmallestUnit");
CREATE INDEX "IX_Products_CategoryId_IsActive" ON "Products" ("CategoryId", "IsActive");
CREATE INDEX "IX_Products_AllowDirectSale_IsActive" ON "Products" ("AllowDirectSale", "IsActive");
CREATE INDEX "IX_PurchaseOrders_SupplierId_Status" ON "PurchaseOrders" ("SupplierId", "Status");
CREATE INDEX "IX_PurchaseOrders_OrderedAt" ON "PurchaseOrders" ("OrderedAt");
CREATE INDEX "IX_SalesOrders_SoldAt" ON "SalesOrders" ("SoldAt");
CREATE INDEX "IX_SalesOrders_Status_SoldAt" ON "SalesOrders" ("Status", "SoldAt");
CREATE INDEX "IX_SalesOrders_OrderType_SoldAt" ON "SalesOrders" ("OrderType", "SoldAt");
CREATE INDEX "IX_InventoryTransactions_ProductId_TransactionAt" ON "InventoryTransactions" ("ProductId", "TransactionAt" DESC);
CREATE INDEX "IX_PosDraftTabs_CreatedByUserId_IsActive" ON "PosDraftTabs" ("CreatedByUserId", "IsActive", "LastTouchedAt" DESC);
CREATE INDEX "IX_LoyaltyPointTransactions_CustomerId_TransactionAt" ON "LoyaltyPointTransactions" ("CustomerId", "TransactionAt" DESC);

-- ===== Seed Data =====

INSERT INTO "Roles" ("Code", "Name", "Description")
VALUES
    ('MANAGER', 'Manager', 'Quan ly cua hang'),
    ('STAFF', 'Staff', 'Nhan vien ban hang');

INSERT INTO "Settings" ("StoreName", "StoreAddress", "StorePhoneNumber", "ReceiptHeader", "ReceiptFooter")
VALUES ('POS Kiosk', NULL, NULL, 'Cam on quy khach', 'Hen gap lai');

INSERT INTO "Users" ("RoleId", "Username", "PasswordHash", "FullName", "IsActive", "CreatedAt", "UpdatedAt")
SELECT r."Id", 'manager01', '$2b$10$8YWUg7w2cVCneu/gAb1VAeLiSc9oZCD554zyGUZ.oo16INXlzIT3a', 'Manager Test', TRUE, NOW(), NOW()
FROM "Roles" r WHERE r."Code" = 'MANAGER'
AND NOT EXISTS (SELECT 1 FROM "Users" u WHERE u."Username" = 'manager01');

INSERT INTO "Users" ("RoleId", "Username", "PasswordHash", "FullName", "IsActive", "CreatedAt", "UpdatedAt")
SELECT r."Id", 'staff01', '$2b$10$tCI/yf0zWIJkE.YCaxB/t.ODFTrCo7yTzWYtzE3xROxq5hPDvmyzS', 'Staff Test', TRUE, NOW(), NOW()
FROM "Roles" r WHERE r."Code" = 'STAFF'
AND NOT EXISTS (SELECT 1 FROM "Users" u WHERE u."Username" = 'staff01');
