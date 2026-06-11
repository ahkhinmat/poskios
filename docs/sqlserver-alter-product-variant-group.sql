IF COL_LENGTH('dbo.Products', 'VariantGroupCode') IS NULL
BEGIN
    ALTER TABLE dbo.Products
    ADD VariantGroupCode NVARCHAR(100) NULL;
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_Products_VariantGroupCode'
      AND object_id = OBJECT_ID('dbo.Products')
)
BEGIN
    CREATE INDEX IX_Products_VariantGroupCode
    ON dbo.Products (VariantGroupCode);
END;
GO

UPDATE dbo.Products
SET VariantGroupCode = ProductCode
WHERE VariantGroupCode IS NULL OR LTRIM(RTRIM(VariantGroupCode)) = '';
GO
