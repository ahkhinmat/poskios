import { Tooltip } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { LANG } from '../lang';
import type { PosDraftTab } from '../types';

type WorkspaceTabsProps = {
  tabs: PosDraftTab[];
  activeTabId: number | null;
  setActiveTabId: (id: number) => void;
  handleCreateTab: () => Promise<void>;
  handleCloseTab: (id: number) => Promise<void>;
};

export function WorkspaceTabs({
  tabs,
  activeTabId,
  setActiveTabId,
  handleCreateTab,
  handleCloseTab,
}: WorkspaceTabsProps) {
  if (!tabs.length) return null;

  return (
    <div className="workspace-tabs">
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
  );
}
