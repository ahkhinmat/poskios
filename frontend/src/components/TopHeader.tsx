import { Input, Spin, Tag, Tooltip } from 'antd';
import type { InputRef } from 'antd';
import {
  KeyOutlined,
  LeftOutlined,
  LogoutOutlined,
  PlusOutlined,
  RightOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { SessionBar } from './SessionBar';
import { LANG } from '../lang';
import type { SessionState } from '../hooks/useSession';
import type { PosDraftTab } from '../types';

type TopHeaderProps = {
  searchInputRef: React.RefObject<InputRef | null>;
  searchValue: string;
  setSearchValue: (v: string) => void;
  searching: boolean;
  searchResults: unknown[];
  setHighlightedSearchIndex: (fn: (current: number) => number) => void;
  handleResolveProduct: () => Promise<void>;

  tabs: PosDraftTab[];
  activeTabId: number | null;
  setActiveTabId: (id: number) => void;
  handleCreateTab: () => Promise<void>;
  handleCloseTab: (id: number) => Promise<void>;

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
  handleCreateTab,
  handleCloseTab,

  tabs,
  activeTabId,
  setActiveTabId,

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

      <div className="top-header-row2">
        <div className="draft-strip">
          {tabs.map((tab) => (
            <Tooltip key={tab.id} title={`${LANG.openTab}: ${tab.title}`}>
              <button
                type="button"
                className={`draft-chip ${tab.id === activeTabId ? 'is-active' : ''}`}
                onClick={() => setActiveTabId(tab.id)}
              >
                <span>{tab.title}</span>
                {tabs.length > 1 && (
                  <Tooltip title={`${LANG.closeTab}: ${tab.title}`}>
                    <span
                      className="draft-chip-close"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleCloseTab(tab.id);
                      }}
                    >
                      {LANG.closeTabSymbol}
                    </span>
                  </Tooltip>
                )}
              </button>
            </Tooltip>
          ))}
          <Tooltip title={`${LANG.addTab} (F1)`}>
            <button
              type="button"
              className="draft-chip draft-chip-add"
              onClick={() => void handleCreateTab()}
            >
              <PlusOutlined />
            </button>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}
