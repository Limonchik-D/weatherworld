'use client';
import { useEffect, useRef, useState, createContext, useContext, useCallback } from 'react';

interface ToastContextValue {
  toast: (msg: string, type?: '' | 'err') => void;
}

const ToastCtx = createContext<ToastContextValue>({ toast: () => {} });
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ msg: string; type: '' | 'err'; show: boolean }>({
    msg: '', type: '', show: false,
  });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const toast = useCallback((msg: string, type: '' | 'err' = '') => {
    clearTimeout(timer.current);
    setState({ msg, type, show: true });
    timer.current = setTimeout(() => setState(s => ({ ...s, show: false })), 3200);
  }, []);

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div
        role="alert"
        aria-live="assertive"
        className={`toast${state.show ? ' show' : ''}${state.type === 'err' ? ' err' : ''}`}
      >
        {state.msg}
      </div>
    </ToastCtx.Provider>
  );
}
