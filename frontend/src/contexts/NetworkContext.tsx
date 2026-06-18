import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useIsFetching } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { resetCircuit } from '../services/api';

type NetworkStatus = 'online' | 'offline' | 'reconnecting';

interface NetworkContextType {
  status: NetworkStatus;
  isOnline: boolean;
  checkHealth: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<NetworkStatus>(navigator.onLine ? 'online' : 'offline');
  const isFetching = useIsFetching();

  // "Reconnecting..." stays visible until the app is "Connected properly" (queries finish)
  useEffect(() => {
    if (status === 'reconnecting' && isFetching === 0) {
      // Small buffer to prevent flicker on rapid success
      const timer = setTimeout(() => {
        if (queryClient.isFetching() === 0) {
          setStatus('online');
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [status, isFetching]);

  const triggerReconnect = useCallback(async () => {
    setStatus('reconnecting');
    resetCircuit();
    queryClient.resumePausedMutations();
    
    // Proactively trigger a refetch of active queries to verify connectivity
    await queryClient.invalidateQueries({ refetchType: 'active' });
  }, []);

  const checkHealth = useCallback(async () => {
    await triggerReconnect();
  }, [triggerReconnect]);

  useEffect(() => {
    const handleOnline = () => {
      // Transition through "reconnecting" to verify data parity
      triggerReconnect();
    };

    const handleOffline = () => {
      setStatus('offline');
    };

    const handleVisibilityChange = () => {
      // We keep refetchOnWindowFocus: false in queryClient to prevent jumps,
      // but we still want to clear the circuit breaker on return.
      if (document.visibilityState === 'visible') {
        resetCircuit();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [triggerReconnect]);

  return (
    <NetworkContext.Provider value={{ status, isOnline: status !== 'offline', checkHealth }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useConnectivity = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useConnectivity must be used within a NetworkProvider');
  }
  return context;
};
