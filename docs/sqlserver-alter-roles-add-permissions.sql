ALTER TABLE [dbo].[Roles]
  ADD [Permissions] NVARCHAR(1000) NULL;

-- Gán quyền mặc định cho MANAGER (toàn quyền)
UPDATE [dbo].[Roles]
SET [Permissions] = 'products.view,products.manage,categories.view,categories.manage,units.view,suppliers.view,suppliers.manage,sales.create,sales.return,purchase.create,purchase.complete,overview.view,loyalty.configure,settings.manage,products.import,sales.cancel'
WHERE [Code] = 'MANAGER';

-- Gán quyền mặc định cho STAFF
UPDATE [dbo].[Roles]
SET [Permissions] = 'products.view,categories.view,units.view,suppliers.view,sales.create,sales.return'
WHERE [Code] = 'STAFF';
