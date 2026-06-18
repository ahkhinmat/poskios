import { useState } from 'react';
import {
  AppstoreOutlined,
  BarChartOutlined,
  ContainerOutlined,
  ImportOutlined,
  PushpinFilled,
  PushpinOutlined,
  ShoppingCartOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { Tooltip } from 'antd';
import { Can } from './Can';
import { LANG } from '../lang';
import { PERMISSIONS } from '../permissions';
import type { Permission } from '../permissions';

type ModuleKey = 'SALE' | 'RETURN' | 'PURCHASE' | 'CATEGORY' | 'OVERVIEW' | 'SETTINGS';

type ModuleNavigationProps = {
  activeModule: ModuleKey | null;
  onSelectSale: () => void;
  onSelectReturn: () => void;
  onSelectPurchase: () => void;
  onOpenCategory: () => void;
  onOpenOverview: () => void;
  onOpenSettings: () => void;
};

const modules: { key: ModuleKey; icon: React.ReactNode; label: string; permission?: Permission }[] = [
  { key: 'SALE', icon: <ShoppingCartOutlined />, label: LANG.modeSale },
  { key: 'RETURN', icon: <SwapOutlined />, label: LANG.modeReturn },
  { key: 'PURCHASE', icon: <ImportOutlined />, label: LANG.modeImport, permission: PERMISSIONS.PURCHASE_CREATE },
  { key: 'CATEGORY', icon: <AppstoreOutlined />, label: LANG.modeCategory, permission: PERMISSIONS.CATEGORIES_MANAGE },
  { key: 'OVERVIEW', icon: <BarChartOutlined />, label: LANG.modeOverview, permission: PERMISSIONS.OVERVIEW_VIEW },
  { key: 'SETTINGS', icon: <ContainerOutlined />, label: LANG.settingsTitle, permission: PERMISSIONS.SETTINGS_MANAGE },
];

export function ModuleNavigation({
  activeModule,
  onSelectSale,
  onSelectReturn,
  onSelectPurchase,
  onOpenCategory,
  onOpenOverview,
  onOpenSettings,
}: ModuleNavigationProps) {
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const expanded = pinned || hovered;

  const handleClick = (key: ModuleKey) => {
    switch (key) {
      case 'SALE': onSelectSale(); break;
      case 'RETURN': onSelectReturn(); break;
      case 'PURCHASE': onSelectPurchase(); break;
      case 'CATEGORY': onOpenCategory(); break;
      case 'OVERVIEW': onOpenOverview(); break;
      case 'SETTINGS': onOpenSettings(); break;
    }
  };

  const renderItem = (mod: typeof modules[number]) => {
    const btn = (
      <button
        type="button"
        className={`module-nav-item${activeModule === mod.key ? ' is-active' : ''}`}
        onClick={() => handleClick(mod.key)}
      >
        <span className="module-nav-item-icon">{mod.icon}</span>
        {expanded && <span className="module-nav-item-label">{mod.label}</span>}
      </button>
    );

    const wrapped = <Tooltip key={mod.key} title={mod.label} placement="right">{btn}</Tooltip>;
    if (mod.permission) {
      return <Can key={mod.key} check={{ permission: mod.permission, denyReason: '' }}>{wrapped}</Can>;
    }
    return wrapped;
  };

  return (
    <nav
      className={`module-nav${expanded ? ' is-expanded' : ''}${pinned ? ' is-pinned' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="module-nav-items">
        {modules.map(renderItem)}
      </div>
      <button
        type="button"
        className="module-nav-pin"
        onClick={() => setPinned((v) => !v)}
        title={pinned ? 'Bỏ ghim' : 'Ghim sidebar'}
      >
        {pinned ? <PushpinFilled /> : <PushpinOutlined />}
      </button>
    </nav>
  );
}
