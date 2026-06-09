IF EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = 'CK_Products_StockOnHand'
      AND parent_object_id = OBJECT_ID('dbo.Products')
)
BEGIN
    ALTER TABLE dbo.Products DROP CONSTRAINT CK_Products_StockOnHand;
END
GO
