DECLARE @ManagerRoleId INT;
DECLARE @StaffRoleId INT;

SELECT @ManagerRoleId = Id FROM dbo.Roles WHERE Code = N'MANAGER';
SELECT @StaffRoleId = Id FROM dbo.Roles WHERE Code = N'STAFF';

IF @ManagerRoleId IS NULL OR @StaffRoleId IS NULL
BEGIN
    RAISERROR(N'Roles MANAGER/STAFF not found. Run schema seed first.', 16, 1);
    RETURN;
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Username = N'manager01')
BEGIN
    INSERT INTO dbo.Users
    (
        RoleId,
        Username,
        PasswordHash,
        FullName,
        PhoneNumber,
        Email,
        IsActive,
        CreatedAt,
        UpdatedAt
    )
    VALUES
    (
        (SELECT Id FROM dbo.Roles WHERE Code = N'MANAGER'),
        N'manager01',
        N'temp',
        N'Manager Test',
        NULL,
        NULL,
        1,
        SYSDATETIME(),
        SYSDATETIME()
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Username = N'staff01')
BEGIN
    INSERT INTO dbo.Users
    (
        RoleId,
        Username,
        PasswordHash,
        FullName,
        PhoneNumber,
        Email,
        IsActive,
        CreatedAt,
        UpdatedAt
    )
    VALUES
    (
        (SELECT Id FROM dbo.Roles WHERE Code = N'STAFF'),
        N'staff01',
        N'temp',
        N'Staff Test',
        NULL,
        NULL,
        1,
        SYSDATETIME(),
        SYSDATETIME()
    );
END
GO

SELECT Id, Username, FullName, RoleId, IsActive
FROM dbo.Users
WHERE Username IN (N'manager01', N'staff01')
ORDER BY Id;
GO
