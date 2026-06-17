import { useState, useCallback } from 'react';

export type SessionState = {
  startedAt: string | null;
  endedAt: string | null;
  totalSales: number;
  totalReturns: number;
  totalInvoices: number;
  totalCash: number;
  totalTransfer: number;
};

const emptySession: SessionState = {
  startedAt: null,
  endedAt: null,
  totalSales: 0,
  totalReturns: 0,
  totalInvoices: 0,
  totalCash: 0,
  totalTransfer: 0,
};

export function useSession() {
  const [session, setSession] = useState<SessionState>(() => {
    try {
      const saved = localStorage.getItem('pos_session');
      if (saved) {
        const parsed = JSON.parse(saved) as SessionState;
        if (parsed.startedAt && !parsed.endedAt) return parsed;
      }
    } catch { /* ignore */ }
    return emptySession;
  });

  const persist = (s: SessionState) => {
    localStorage.setItem('pos_session', JSON.stringify(s));
  };

  const startSession = useCallback(() => {
    const newSession: SessionState = {
      startedAt: new Date().toISOString(),
      endedAt: null,
      totalSales: 0,
      totalReturns: 0,
      totalInvoices: 0,
      totalCash: 0,
      totalTransfer: 0,
    };
    setSession(newSession);
    persist(newSession);
  }, []);

  const endSession = useCallback(() => {
    setSession((prev) => {
      const updated = { ...prev, endedAt: new Date().toISOString() };
      persist(updated);
      return updated;
    });
  }, []);

  const recordPayment = useCallback((amount: number, method: string) => {
    setSession((prev) => {
      if (!prev.startedAt || prev.endedAt) return prev;
      const updated = {
        ...prev,
        totalSales: prev.totalSales + (method === 'RETURN' ? 0 : amount),
        totalReturns: prev.totalReturns + (method === 'RETURN' ? amount : 0),
        totalInvoices: prev.totalInvoices + 1,
        totalCash: prev.totalCash + (method === 'CASH' ? amount : 0),
        totalTransfer: prev.totalTransfer + (method !== 'CASH' && method !== 'RETURN' ? amount : 0),
      };
      persist(updated);
      return updated;
    });
  }, []);

  const isRunning = session.startedAt !== null && session.endedAt === null;

  return { session, isRunning, startSession, endSession, recordPayment };
}
