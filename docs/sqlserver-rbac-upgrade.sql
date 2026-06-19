-- ============================================================
-- RBAC Migration
-- 1. Thêm Roles.ParentId (kế thừa permissions)
-- 2. Tạo bảng UserRoles (many-to-many User ↔ Role)
-- 3. Migrate dữ liệu User.RoleId -> UserRoles
-- ============================================================

BEGIN TRANSACTION;

-- 1. Thêm cột ParentId vào Roles (self-referencing FK)
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('dbo.Roles') AND name = 'ParentId'
)
BEGIN
  ALTER TABLE [dbo].[Roles]
    ADD [ParentId] INT NULL;

  ALTER TABLE [dbo].[Roles]
    ADD CONSTRAINT [FK_Roles_ParentId]
    FOREIGN KEY ([ParentId]) REFERENCES [dbo].[Roles]([Id]);
END;

-- 2. Tạo bảng UserRoles (join table)
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID('dbo.UserRoles'))
BEGIN
  CREATE TABLE [dbo].[UserRoles] (
      [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
      [UserId] INT NOT NULL,
      [RoleId] INT NOT NULL,
      [CreatedAt] DATETIME2(0) NOT NULL
          CONSTRAINT [DF_UserRoles_CreatedAt] DEFAULT (SYSDATETIME()),
      CONSTRAINT [FK_UserRoles_UserId]
          FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]),
      CONSTRAINT [FK_UserRoles_RoleId]
          FOREIGN KEY ([RoleId]) REFERENCES [dbo].[Roles]([Id]),
      CONSTRAINT [UQ_UserRoles_UserId_RoleId]
          UNIQUE ([UserId], [RoleId])
  );
END;

-- 3. Migrate dữ liệu từ Users.RoleId -> UserRoles
--    (đảm bảo không duplicate)
INSERT INTO [dbo].[UserRoles] ([UserId], [RoleId])
SELECT u.[Id], u.[RoleId]
FROM [dbo].[Users] u
WHERE u.[RoleId] IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM [dbo].[UserRoles] ur
    WHERE ur.[UserId] = u.[Id] AND ur.[RoleId] = u.[RoleId]
  );

PRINT 'RBAC migration completed successfully.';

COMMIT TRANSACTION;
