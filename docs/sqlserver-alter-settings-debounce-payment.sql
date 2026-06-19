IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Settings') AND name = 'SearchDebounceMs')
  ALTER TABLE [dbo].[Settings] ADD [SearchDebounceMs] INT NULL DEFAULT 250;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Settings') AND name = 'AutoSaveDebounceMs')
  ALTER TABLE [dbo].[Settings] ADD [AutoSaveDebounceMs] INT NULL DEFAULT 500;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Settings') AND name = 'PaymentMethods')
  ALTER TABLE [dbo].[Settings] ADD [PaymentMethods] NVARCHAR(500) NULL;
