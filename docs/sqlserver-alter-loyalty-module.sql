IF OBJECT_ID('dbo.Customers', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Customers
    (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        PhoneNumber NVARCHAR(30) NOT NULL,
        FullName NVARCHAR(150) NULL,
        CurrentPoints DECIMAL(18,4) NOT NULL CONSTRAINT DF_Customers_CurrentPoints DEFAULT (0),
        IsActive BIT NOT NULL CONSTRAINT DF_Customers_IsActive DEFAULT (1)
    );

    CREATE UNIQUE INDEX UX_Customers_PhoneNumber
        ON dbo.Customers(PhoneNumber);
END;
GO

IF OBJECT_ID('dbo.LoyaltyPointTransactions', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.LoyaltyPointTransactions
    (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        CustomerId INT NOT NULL,
        SalesOrderId INT NULL,
        TransactionType NVARCHAR(30) NOT NULL,
        PointsChange DECIMAL(18,4) NOT NULL,
        BalanceAfter DECIMAL(18,4) NOT NULL,
        AmountBasis DECIMAL(18,2) NULL,
        ExpireAt DATETIME2 NULL,
        Notes NVARCHAR(255) NULL,
        TransactionAt DATETIME2 NOT NULL CONSTRAINT DF_LoyaltyPointTransactions_TransactionAt DEFAULT (SYSDATETIME()),
        CONSTRAINT FK_LoyaltyPointTransactions_Customers
            FOREIGN KEY (CustomerId) REFERENCES dbo.Customers(Id),
        CONSTRAINT FK_LoyaltyPointTransactions_SalesOrders
            FOREIGN KEY (SalesOrderId) REFERENCES dbo.SalesOrders(Id)
    );

    CREATE INDEX IX_LoyaltyPointTransactions_CustomerId_TransactionAt
        ON dbo.LoyaltyPointTransactions(CustomerId, TransactionAt DESC);
END;
GO

IF COL_LENGTH('dbo.Settings', 'LoyaltyEarnAmountPerPoint') IS NULL
BEGIN
    ALTER TABLE dbo.Settings
        ADD LoyaltyEarnAmountPerPoint DECIMAL(18,2) NULL;
END;
GO

IF COL_LENGTH('dbo.Settings', 'LoyaltyRedeemAmountPerPoint') IS NULL
BEGIN
    ALTER TABLE dbo.Settings
        ADD LoyaltyRedeemAmountPerPoint DECIMAL(18,2) NULL;
END;
GO

IF COL_LENGTH('dbo.Settings', 'LoyaltyMinimumRedeemPoints') IS NULL
BEGIN
    ALTER TABLE dbo.Settings
        ADD LoyaltyMinimumRedeemPoints DECIMAL(18,4) NULL;
END;
GO

IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.Settings')
      AND name = 'LoyaltyMinimumRedeemPoints'
      AND system_type_id IN (56, 52, 48, 127)
)
BEGIN
    ALTER TABLE dbo.Settings
        ALTER COLUMN LoyaltyMinimumRedeemPoints DECIMAL(18,4) NULL;
END;
GO

IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.Customers')
      AND name = 'CurrentPoints'
      AND system_type_id IN (56, 52, 48, 127)
)
BEGIN
    DECLARE @dfCustomersCurrentPoints NVARCHAR(128);
    DECLARE @sqlCustomersCurrentPoints NVARCHAR(MAX);

    SELECT @dfCustomersCurrentPoints = dc.name
    FROM sys.default_constraints dc
    INNER JOIN sys.columns c
        ON c.object_id = dc.parent_object_id
       AND c.column_id = dc.parent_column_id
    WHERE dc.parent_object_id = OBJECT_ID('dbo.Customers')
      AND c.name = 'CurrentPoints';

    IF @dfCustomersCurrentPoints IS NOT NULL
    BEGIN
        SET @sqlCustomersCurrentPoints =
            N'ALTER TABLE dbo.Customers DROP CONSTRAINT ' + QUOTENAME(@dfCustomersCurrentPoints) + N';';
        EXEC sp_executesql @sqlCustomersCurrentPoints;
    END;

    ALTER TABLE dbo.Customers
        ALTER COLUMN CurrentPoints DECIMAL(18,4) NOT NULL;

    ALTER TABLE dbo.Customers
        ADD CONSTRAINT DF_Customers_CurrentPoints DEFAULT (0) FOR CurrentPoints;
END;
GO

IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.LoyaltyPointTransactions')
      AND name = 'PointsChange'
      AND system_type_id IN (56, 52, 48, 127)
)
BEGIN
    ALTER TABLE dbo.LoyaltyPointTransactions
        ALTER COLUMN PointsChange DECIMAL(18,4) NOT NULL;
END;
GO

IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.LoyaltyPointTransactions')
      AND name = 'BalanceAfter'
      AND system_type_id IN (56, 52, 48, 127)
)
BEGIN
    ALTER TABLE dbo.LoyaltyPointTransactions
        ALTER COLUMN BalanceAfter DECIMAL(18,4) NOT NULL;
END;
GO

IF COL_LENGTH('dbo.Settings', 'LoyaltyPointsExpiryDays') IS NULL
BEGIN
    ALTER TABLE dbo.Settings
        ADD LoyaltyPointsExpiryDays INT NULL;
END;
GO

UPDATE dbo.Settings
SET
    LoyaltyEarnAmountPerPoint = ISNULL(LoyaltyEarnAmountPerPoint, 10000),
    LoyaltyRedeemAmountPerPoint = ISNULL(LoyaltyRedeemAmountPerPoint, 1000),
    LoyaltyMinimumRedeemPoints = ISNULL(LoyaltyMinimumRedeemPoints, 10);
GO

IF COL_LENGTH('dbo.SalesOrders', 'CustomerId') IS NULL
BEGIN
    ALTER TABLE dbo.SalesOrders
        ADD CustomerId INT NULL;
END;
GO

IF COL_LENGTH('dbo.SalesOrders', 'RedeemedPoints') IS NULL
BEGIN
    ALTER TABLE dbo.SalesOrders
        ADD RedeemedPoints DECIMAL(18,4) NULL;
END;
GO

IF COL_LENGTH('dbo.SalesOrders', 'EarnedPoints') IS NULL
BEGIN
    ALTER TABLE dbo.SalesOrders
        ADD EarnedPoints DECIMAL(18,4) NULL;
END;
GO

IF COL_LENGTH('dbo.SalesOrders', 'LoyaltyDiscountAmount') IS NULL
BEGIN
    ALTER TABLE dbo.SalesOrders
        ADD LoyaltyDiscountAmount DECIMAL(18,2) NULL;
END;
GO

IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.SalesOrders')
      AND name = 'RedeemedPoints'
      AND system_type_id IN (56, 52, 48, 127)
)
BEGIN
    ALTER TABLE dbo.SalesOrders
        ALTER COLUMN RedeemedPoints DECIMAL(18,4) NULL;
END;
GO

IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.SalesOrders')
      AND name = 'EarnedPoints'
      AND system_type_id IN (56, 52, 48, 127)
)
BEGIN
    ALTER TABLE dbo.SalesOrders
        ALTER COLUMN EarnedPoints DECIMAL(18,4) NULL;
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_SalesOrders_Customers_CustomerId'
)
BEGIN
    ALTER TABLE dbo.SalesOrders
        ADD CONSTRAINT FK_SalesOrders_Customers_CustomerId
        FOREIGN KEY (CustomerId) REFERENCES dbo.Customers(Id);
END;
GO

IF COL_LENGTH('dbo.PosDraftTabs', 'CustomerId') IS NULL
BEGIN
    ALTER TABLE dbo.PosDraftTabs
        ADD CustomerId INT NULL;
END;
GO

IF COL_LENGTH('dbo.PosDraftTabs', 'RedeemedPoints') IS NULL
BEGIN
    ALTER TABLE dbo.PosDraftTabs
        ADD RedeemedPoints DECIMAL(18,4) NULL;
END;
GO

IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.PosDraftTabs')
      AND name = 'RedeemedPoints'
      AND system_type_id IN (56, 52, 48, 127)
)
BEGIN
    ALTER TABLE dbo.PosDraftTabs
        ALTER COLUMN RedeemedPoints DECIMAL(18,4) NULL;
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_PosDraftTabs_Customers_CustomerId'
)
BEGIN
    ALTER TABLE dbo.PosDraftTabs
        ADD CONSTRAINT FK_PosDraftTabs_Customers_CustomerId
        FOREIGN KEY (CustomerId) REFERENCES dbo.Customers(Id);
END;
GO
