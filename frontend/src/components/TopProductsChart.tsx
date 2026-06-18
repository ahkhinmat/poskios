import { Empty, Skeleton } from 'antd';
import { LANG } from '../lang';
import type { TopProduct } from '../types';

type TopProductsChartProps = {
  products: TopProduct[];
  loading: boolean;
};

const BAR_MAX_PCT = 70;

function TopProductsChart({ products, loading }: TopProductsChartProps) {
  const maxRevenue = products.length ? Math.max(...products.map((p) => p.totalRevenue)) : 0;

  if (loading) {
    return (
      <div className="top-products-chart">
        <div className="top-products-chart-title">{LANG.overviewTopProducts}</div>
        <Skeleton active paragraph={{ rows: 5 }} />
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="top-products-chart">
        <div className="top-products-chart-title">{LANG.overviewTopProducts}</div>
        <Empty description={LANG.overviewEmpty} />
      </div>
    );
  }

  return (
    <div className="top-products-chart">
      <div className="top-products-chart-title">{LANG.overviewTopProducts}</div>
      <div className="top-products-chart-table">
        <div className="top-products-chart-head">
          <div className="top-products-chart-cell top-products-chart-rank">{LANG.overviewTopRank}</div>
          <div className="top-products-chart-cell top-products-chart-name">{LANG.overviewTopProduct}</div>
          <div className="top-products-chart-cell top-products-chart-qty">{LANG.overviewTopQuantity}</div>
          <div className="top-products-chart-cell top-products-chart-rev">{LANG.overviewTopRevenue}</div>
        </div>
        <div className="top-products-chart-body">
          {products.map((product, index) => {
            const barPct = maxRevenue > 0 ? (product.totalRevenue / maxRevenue) * BAR_MAX_PCT : 0;
            return (
              <div key={product.productId} className="top-products-chart-row">
                <div className="top-products-chart-cell top-products-chart-rank">
                  <span className={`top-products-chart-badge${index < 3 ? ' top-products-chart-badge-top' : ''}`}>
                    {index + 1}
                  </span>
                </div>
                <div className="top-products-chart-cell top-products-chart-name">
                  <span className="top-products-chart-product-name">{product.productName}</span>
                  <span className="top-products-chart-bar" style={{ width: `${barPct}%` }} />
                </div>
                <div className="top-products-chart-cell top-products-chart-qty">{product.totalQuantity.toLocaleString('vi-VN')}</div>
                <div className="top-products-chart-cell top-products-chart-rev">{product.totalRevenue.toLocaleString('vi-VN')}{LANG.currencySuffix}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { TopProductsChart };