## 2026-06-18 — UI Overview: cleanup & top products chart

### Changed
- **OverviewGrid** (`frontend/src/components/OverviewGrid.tsx`):
  - Fragment `<>` → `<div className="overview-grid-wrapper">` to fix grid layout issue
  - Removed "Thu ngân" user column from header, row cells, and footer
  - Changed time format: `DD/MM/YYYY HH:mm` → `DD/MM HH:mm`
- **OverviewView** (`frontend/src/components/OverviewView.tsx`):
  - Removed 5 mode-switching buttons (Bán hàng, Trả hàng, Nhập hàng, Danh mục, Tổng quan)
  - Removed unused props: `ensureTabOfType`, `focusSearchInput`, `openProductManager`
  - Removed unused import: `Tooltip`
- **TransactionPanel** (`frontend/src/components/TransactionPanel.tsx`):
  - Removed `ensureTabOfType`, `focusSearchInput`, `openProductManager` from `<OverviewView>` call
  - Added `TopProductsChart` below `<OverviewView>` inside overview mode section
  - Imported `TopProductsChart`
- **PosPage** (`frontend/src/pages/PosPage.tsx`):
  - Removed unused `TopProductsChart` import (now rendered inside TransactionPanel)
- **usePosPage** (`frontend/src/hooks/usePosPage.ts`):
  - Exposed `topProducts`, `topProductsLoading`, `loadTopProducts` from overviewHook

### Added
- **TopProductsChart** (`frontend/src/components/TopProductsChart.tsx`):
  - Horizontal bar chart showing Top 10 best-selling products (rank, product name with revenue bar, quantity, total revenue)
  - Loading and empty states
- **Backend API** (`backend/src/modules/pos/`):
  - `GET /pos/overview/top-products?fromDate=&toDate=` endpoint
  - `overview.service.ts`: `getTopProducts()` — query SalesOrders (SALE only, not CANCELLED) grouped by product, ordered by total revenue DESC, top 10
  - `pos.service.ts`: passthrough `getTopProducts()`
  - `pos.controller.ts`: route + handler
- **Type** (`frontend/src/types.ts`): `TopProduct` type
- **Lang keys** (`frontend/src/lang.ts`): `overviewTopProducts`, `overviewTopRank`, `overviewTopProduct`, `overviewTopQuantity`, `overviewTopRevenue`
- **CSS** (`frontend/src/styles.css`):
  - `.overview-grid-wrapper` — flex column layout for the grid container
  - `.overview-grid-head` / `.overview-grid-foot` — added `overflow-x: auto` + scrollbar styles
  - `.overview-grid-body > .overview-grid-row` — specificity fix for `overview-grid-hide-profit`
  - `.overview-grid-row` — `width: 100%` → `min-width: max-content`
  - `.purchase-row-overview` — `min-width: max-content` to prevent column collapse
  - All `grid-template-columns` rules updated: removed user column (reduced from 3 explicit cols + repeat(N) to 2 explicit cols + repeat(N))
  - Full `.top-products-chart-*` styles

### Trigger
- `loadOverview()` now also calls `loadTopProducts()` with the same date range
