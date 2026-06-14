IF COL_LENGTH('dbo.PosDraftTabs', 'ImportDate') IS NULL
BEGIN
    ALTER TABLE dbo.PosDraftTabs
    ADD ImportDate DATE NULL;
END;
GO

IF COL_LENGTH('dbo.PosDraftTabs', 'PurchaseOrderCode') IS NULL
BEGIN
    ALTER TABLE dbo.PosDraftTabs
    ADD PurchaseOrderCode NVARCHAR(50) NULL;
END;
GO

IF COL_LENGTH('dbo.PosDraftTabs', 'SupplierId') IS NULL
BEGIN
    ALTER TABLE dbo.PosDraftTabs
    ADD SupplierId INT NULL;
END;
GO

IF COL_LENGTH('dbo.PosDraftTabs', 'SupplierOrderCode') IS NULL
BEGIN
    ALTER TABLE dbo.PosDraftTabs
    ADD SupplierOrderCode NVARCHAR(50) NULL;
END;
GO

IF COL_LENGTH('dbo.PosDraftTabs', 'SupplierInvoiceCode') IS NULL
BEGIN
    ALTER TABLE dbo.PosDraftTabs
    ADD SupplierInvoiceCode NVARCHAR(50) NULL;
END;
GO

IF COL_LENGTH('dbo.PosDraftTabs', 'PurchaseStatus') IS NULL
BEGIN
    ALTER TABLE dbo.PosDraftTabs
    ADD PurchaseStatus NVARCHAR(30) NULL;
END;
GO

IF COL_LENGTH('dbo.PosDraftTabs', 'SupplierPaidAmount') IS NULL
BEGIN
    ALTER TABLE dbo.PosDraftTabs
    ADD SupplierPaidAmount DECIMAL(18,2) NULL
        CONSTRAINT DF_PosDraftTabs_SupplierPaidAmount DEFAULT (0);
END;
GO

UPDATE dbo.PosDraftTabs
SET
    PurchaseStatus = ISNULL(PurchaseStatus, N'Phiếu tạm'),
    SupplierPaidAmount = ISNULL(SupplierPaidAmount, 0)
WHERE TabType = N'PURCHASE';
GO
