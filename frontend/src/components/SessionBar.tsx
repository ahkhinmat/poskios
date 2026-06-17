import { useEffect, useState } from 'react';
import { Button, Modal, Tooltip } from 'antd';
import { PlayCircleOutlined, StopOutlined, FieldTimeOutlined, FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons';
import { LANG } from '../lang';
import type { SessionState } from '../hooks/useSession';

type SessionBarProps = {
  session: SessionState;
  isRunning: boolean;
  onStart: () => void;
  onEnd: () => void;
};

export function SessionBar({ session, isRunning, onStart, onEnd }: SessionBarProps) {
  const [fullscreen, setFullscreen] = useState(() => !!document.fullscreenElement);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      setFullscreen(false);
    } else {
      void document.documentElement.requestFullscreen();
      setFullscreen(true);
    }
  };

  const handleEnd = () => {
    Modal.confirm({
      title: LANG.sessionEndTitle,
      content: LANG.sessionEndConfirm,
      okText: LANG.sessionEnd,
      cancelText: LANG.cancel,
      onOk: () => {
        onEnd();
        Modal.info({
          title: LANG.sessionSummary,
          width: 420,
          content: (
            <div style={{ marginTop: 16 }}>
              <div className="session-summary-row">
                <span>{LANG.sessionStartedAt}</span>
                <span>{session.startedAt ? new Date(session.startedAt).toLocaleTimeString('vi-VN') : '-'}</span>
              </div>
              <div className="session-summary-row">
                <span>{LANG.sessionTotalInvoices}</span>
                <span>{session.totalInvoices}</span>
              </div>
              <div className="session-summary-row">
                <span>{LANG.sessionTotalSales}</span>
                <span>{session.totalSales.toLocaleString('vi-VN')}{LANG.currencySuffix}</span>
              </div>
              <div className="session-summary-row">
                <span>{LANG.sessionTotalCash}</span>
                <span>{session.totalCash.toLocaleString('vi-VN')}{LANG.currencySuffix}</span>
              </div>
              <div className="session-summary-row">
                <span>{LANG.sessionTotalTransfer}</span>
                <span>{session.totalTransfer.toLocaleString('vi-VN')}{LANG.currencySuffix}</span>
              </div>
            </div>
          ),
          okText: LANG.close,
        });
      },
    });
  };

  const handleStart = () => {
    Modal.confirm({
      title: LANG.sessionStart,
      content: LANG.sessionStartConfirm,
      okText: LANG.sessionStart,
      cancelText: LANG.cancel,
      onOk: onStart,
    });
  };

  // Listen for fullscreen changes via Esc key
  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  return (
    <div className="session-bar">
      <FieldTimeOutlined />
      {isRunning ? (
        <>
          <span className="session-dot" />
          <span>
            {LANG.sessionRunning} · {new Date(session.startedAt!).toLocaleTimeString('vi-VN')}
          </span>
          <Tooltip title={LANG.sessionEnd}>
            <Button size="small" danger icon={<StopOutlined />} onClick={handleEnd}>
              {LANG.sessionEnd}
            </Button>
          </Tooltip>
        </>
      ) : (
        <>
          <span style={{ color: '#6b7280' }}>{LANG.sessionInactive}</span>
          <Tooltip title={LANG.sessionStart}>
            <Button size="small" type="primary" icon={<PlayCircleOutlined />} onClick={handleStart}>
              {LANG.sessionStart}
            </Button>
          </Tooltip>
        </>
      )}
      <div style={{ marginLeft: 'auto' }}>
        <Tooltip title={fullscreen ? LANG.fullscreenExit : LANG.fullscreenEnter}>
          <Button size="small" icon={fullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />} onClick={toggleFullscreen} />
        </Tooltip>
      </div>
    </div>
  );
}
