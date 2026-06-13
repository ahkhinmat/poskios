USE [POS]
GO

/****** Object:  Table [dbo].[Products]    Script Date: 13/06/26 10:19:52 CH ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[Products](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[CategoryId] [int] NOT NULL,
	[BrandId] [int] NULL,
	[UnitId] [int] NOT NULL,
	[ProductType] [nvarchar](30) NOT NULL,
	[ProductCode] [nvarchar](50) NOT NULL,
	[Barcode] [nvarchar](50) NULL,
	[Name] [nvarchar](255) NOT NULL,
	[CostPrice] [decimal](18, 2) NOT NULL,
	[SalePrice] [decimal](18, 2) NOT NULL,
	[StockOnHand] [decimal](18, 3) NOT NULL,
	[MinStock] [decimal](18, 3) NOT NULL,
	[MaxStock] [decimal](18, 3) NOT NULL,
	[Weight] [decimal](18, 3) NULL,
	[Description] [nvarchar](1000) NULL,
	[NoteTemplate] [nvarchar](500) NULL,
	[Location] [nvarchar](150) NULL,
	[TrackBatchExpiry] [bit] NOT NULL,
	[AllowDirectSale] [bit] NOT NULL,
	[IsActive] [bit] NOT NULL,
	[ImportedCreatedAt] [datetime2](0) NULL,
	[CreatedAt] [datetime2](0) NOT NULL,
	[UpdatedAt] [datetime2](0) NOT NULL,
	[VariantGroupCode] [nvarchar](100) NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_Products_ProductCode] UNIQUE NONCLUSTERED 
(
	[ProductCode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

ALTER TABLE [dbo].[Products] ADD  CONSTRAINT [DF_Products_ProductType]  DEFAULT (N'HANG_HOA') FOR [ProductType]
GO

ALTER TABLE [dbo].[Products] ADD  CONSTRAINT [DF_Products_CostPrice]  DEFAULT ((0)) FOR [CostPrice]
GO

ALTER TABLE [dbo].[Products] ADD  CONSTRAINT [DF_Products_SalePrice]  DEFAULT ((0)) FOR [SalePrice]
GO

ALTER TABLE [dbo].[Products] ADD  CONSTRAINT [DF_Products_StockOnHand]  DEFAULT ((0)) FOR [StockOnHand]
GO

ALTER TABLE [dbo].[Products] ADD  CONSTRAINT [DF_Products_MinStock]  DEFAULT ((0)) FOR [MinStock]
GO

ALTER TABLE [dbo].[Products] ADD  CONSTRAINT [DF_Products_MaxStock]  DEFAULT ((0)) FOR [MaxStock]
GO

ALTER TABLE [dbo].[Products] ADD  CONSTRAINT [DF_Products_TrackBatchExpiry]  DEFAULT ((0)) FOR [TrackBatchExpiry]
GO

ALTER TABLE [dbo].[Products] ADD  CONSTRAINT [DF_Products_AllowDirectSale]  DEFAULT ((1)) FOR [AllowDirectSale]
GO

ALTER TABLE [dbo].[Products] ADD  CONSTRAINT [DF_Products_IsActive]  DEFAULT ((1)) FOR [IsActive]
GO

ALTER TABLE [dbo].[Products] ADD  CONSTRAINT [DF_Products_CreatedAt]  DEFAULT (sysdatetime()) FOR [CreatedAt]
GO

ALTER TABLE [dbo].[Products] ADD  CONSTRAINT [DF_Products_UpdatedAt]  DEFAULT (sysdatetime()) FOR [UpdatedAt]
GO

ALTER TABLE [dbo].[Products]  WITH CHECK ADD  CONSTRAINT [FK_Products_BrandId] FOREIGN KEY([BrandId])
REFERENCES [dbo].[Brands] ([Id])
GO

ALTER TABLE [dbo].[Products] CHECK CONSTRAINT [FK_Products_BrandId]
GO

ALTER TABLE [dbo].[Products]  WITH CHECK ADD  CONSTRAINT [FK_Products_CategoryId] FOREIGN KEY([CategoryId])
REFERENCES [dbo].[Categories] ([Id])
GO

ALTER TABLE [dbo].[Products] CHECK CONSTRAINT [FK_Products_CategoryId]
GO

ALTER TABLE [dbo].[Products]  WITH CHECK ADD  CONSTRAINT [FK_Products_UnitId] FOREIGN KEY([UnitId])
REFERENCES [dbo].[Units] ([Id])
GO

ALTER TABLE [dbo].[Products] CHECK CONSTRAINT [FK_Products_UnitId]
GO

ALTER TABLE [dbo].[Products]  WITH CHECK ADD  CONSTRAINT [CK_Products_CostPrice] CHECK  (([CostPrice]>=(0)))
GO

ALTER TABLE [dbo].[Products] CHECK CONSTRAINT [CK_Products_CostPrice]
GO

ALTER TABLE [dbo].[Products]  WITH CHECK ADD  CONSTRAINT [CK_Products_MaxStock] CHECK  (([MaxStock]>=(0)))
GO

ALTER TABLE [dbo].[Products] CHECK CONSTRAINT [CK_Products_MaxStock]
GO

ALTER TABLE [dbo].[Products]  WITH CHECK ADD  CONSTRAINT [CK_Products_MinStock] CHECK  (([MinStock]>=(0)))
GO

ALTER TABLE [dbo].[Products] CHECK CONSTRAINT [CK_Products_MinStock]
GO

ALTER TABLE [dbo].[Products]  WITH CHECK ADD  CONSTRAINT [CK_Products_SalePrice] CHECK  (([SalePrice]>=(0)))
GO

ALTER TABLE [dbo].[Products] CHECK CONSTRAINT [CK_Products_SalePrice]
GO


