import { DollarOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { LANG } from '../lang';

type BottomNavProps = {
  activeView: 'transaction' | 'checkout';
  onViewChange: (view: 'transaction' | 'checkout') => void;
};

export function BottomNav({ activeView, onViewChange }: BottomNavProps) {
  return (
    <div className="bottom-nav">
      <button
        type="button"
        className={`bottom-nav-btn${activeView === 'transaction' ? ' is-active' : ''}`}
        onClick={() => onViewChange('transaction')}
      >
        <ShoppingCartOutlined />
        <span>{LANG.modeSale}</span>
      </button>
      <button
        type="button"
        className={`bottom-nav-btn${activeView === 'checkout' ? ' is-active' : ''}`}
        onClick={() => onViewChange('checkout')}
      >
        <DollarOutlined />
        <span>{LANG.totalPayment}</span>
      </button>
    </div>
  );
}
