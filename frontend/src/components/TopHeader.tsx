import { Input, Spin, Tag, Tooltip } from 'antd';
import type { InputRef } from 'antd';
import {
  KeyOutlined,
  LeftOutlined,
  LogoutOutlined,
  RightOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { SessionBar } from './SessionBar';
import { LANG } from '../lang';
import type { SessionState } from '../hooks/useSession';

type TopHeaderProps = {
  searchInputRef: React.RefObject<InputRef | null>;
  searchValue: string;
  setSearchValue: (v: string) => void;
  searching: boolean;
  searchResults: unknown[];
  setHighlightedSearchIndex: (fn: (current: number) => number) => void;
  handleResolveProduct: () => Promise<void>;

  session: SessionState;
  isRunning: boolean;
  startSession: () => void;
  endSession: () => void;

  lastScannedProductName: string | null;
  userName: string;
  onLogout: () => void;
  onOpenChangePassword: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
};

export function TopHeader({
  searchInputRef,
  searchValue,
  setSearchValue,
  searching,
  searchResults,
  setHighlightedSearchIndex,
  handleResolveProduct,

  session,
  isRunning,
  startSession,
  endSession,

  lastScannedProductName,
  userName,
  onLogout,
  onOpenChangePassword,
  collapsed,
  onToggleCollapse,
}: TopHeaderProps) {
  return (
    <header className="top-header">
      <div className="top-header-row1">
        <div className="search-box">
          <Input
            ref={searchInputRef}
            size="middle"
            prefix={<SearchOutlined />}
            suffix={searching ? <Spin size="small" /> : <span style={{ fontSize: 11, color: '#9ca3af', opacity: 0.6 }}>Esc</span>}
            placeholder={`${LANG.placeholderSearch} (Ctrl+F)`}
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            onKeyDown={(event) => {
              if (!searchResults.length) return;
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setHighlightedSearchIndex((current) =>
                  Math.min(current < 0 ? 0 : current + 1, searchResults.length - 1),
                );
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                setHighlightedSearchIndex((current) =>
                  Math.max(current <= 0 ? 0 : current - 1, 0),
                );
              }
            }}
            onPressEnter={() => void handleResolveProduct()}
          />
        </div>

        <div className="top-header-right">
          {lastScannedProductName ? (
            <Tag color="green" style={{ marginRight: 4, flexShrink: 0 }}>{LANG.scannedLabel} {lastScannedProductName}</Tag>
          ) : null}

          <SessionBar session={session} isRunning={isRunning} onStart={startSession} onEnd={endSession} />

          <span className="top-header-user">{userName}</span>

          <Tooltip title={LANG.changePassword}>
            <button type="button" className="top-header-btn" onClick={onOpenChangePassword}>
              <KeyOutlined />
            </button>
          </Tooltip>

          <Tooltip title={LANG.logoutTooltip}>
            <button type="button" className="top-header-btn top-header-btn-logout" onClick={onLogout}>
              <LogoutOutlined />
            </button>
          </Tooltip>

          <button type="button" className="top-header-collapse" onClick={onToggleCollapse}>
            {collapsed ? <LeftOutlined /> : <RightOutlined />}
          </button>
        </div>
      </div>
    </header>
  );
}
