-- Thêm cột ProductManagerPageSize cho Settings
ALTER TABLE dbo.Settings ADD
    ProductManagerPageSize INT NULL CONSTRAINT DF_Settings_ProductManagerPageSize DEFAULT 30;
GO
UPDATE dbo.Settings SET ProductManagerPageSize = 30 WHERE ProductManagerPageSize IS NULL;
