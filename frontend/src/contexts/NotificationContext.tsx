import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'loading' | 'custom';
  timestamp: Date;
  read: boolean;
}

// 1. STATE CONTEXT
interface NotificationStateContextType {
  notifications: Notification[];
  unreadCount: number;
}
const NotificationStateContext = createContext<NotificationStateContextType | undefined>(undefined);

// 2. DISPATCH CONTEXT
interface NotificationDispatchContextType {
  addNotification: (message: string, type: Notification['type']) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}
const NotificationDispatchContext = createContext<NotificationDispatchContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Dispatch functions inside useCallback
  const addNotification = useCallback((message: string, type: Notification['type']) => {
    const newNotification: Notification = {
      id: `notif-${Date.now()}-${Math.random()}`,
      message,
      type,
      timestamp: new Date(),
      read: false,
    };
    setNotifications(prev => [newNotification, ...prev]);
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Compute state value
  const unreadCount = notifications.filter(n => !n.read).length;
  
  const stateValue = useMemo(() => ({
    notifications,
    unreadCount
  }), [notifications, unreadCount]);

  // Compute dispatch value
  const dispatchValue = useMemo(() => ({
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll
  }), [addNotification, markAsRead, markAllAsRead, clearAll]);

  return (
    <NotificationDispatchContext.Provider value={dispatchValue}>
      <NotificationStateContext.Provider value={stateValue}>
        {children}
      </NotificationStateContext.Provider>
    </NotificationDispatchContext.Provider>
  );
}

// Hook to access full state (triggers re-render on *any* notification change)
export function useNotificationState() {
  const context = useContext(NotificationStateContext);
  if (!context) throw new Error('useNotificationState must be used within NotificationProvider');
  return context;
}

// Hook to access dispatch operations ONLY (does NOT trigger re-render on notification change)
export function useNotificationDispatch() {
  const context = useContext(NotificationDispatchContext);
  if (!context) throw new Error('useNotificationDispatch must be used within NotificationProvider');
  return context;
}

// Custom toast wrapper that ONLY uses the dispatch context (SAFE FOR GLOBAL USAGE)
export function useToast() {
  const { addNotification } = useNotificationDispatch();

  return useMemo(() => ({
    success: (message: string, options?: any) => {
      addNotification(message, 'success');
      return toast.success(message, options);
    },
    error: (message: string, options?: any) => {
      addNotification(message, 'error');
      return toast.error(message, options);
    },
    loading: (message: string, options?: any) => {
      addNotification(message, 'loading');
      return toast.loading(message, options);
    },
  }), [addNotification]);
}
