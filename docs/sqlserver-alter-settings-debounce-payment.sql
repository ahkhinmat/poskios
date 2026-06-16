ALTER TABLE [dbo].[Settings]
  ADD [SearchDebounceMs] INT NULL DEFAULT 250,
      [AutoSaveDebounceMs] INT NULL DEFAULT 500,
      [PaymentMethods] NVARCHAR(500) NULL;
