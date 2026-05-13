import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { HubConnectionBuilder, HubConnection, LogLevel, HubConnectionState } from '@microsoft/signalr';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface RealtimeEvent {
  id: string;
  type: string;
  tenantId: string;
  occurredAt: string;
  payload: any;
}

interface SignalRContextType {
  isConnected: boolean;
  subscribeToJob: (jobId: string) => void;
  unsubscribeFromJob: (jobId: string) => void;
}

const SignalRContext = createContext<SignalRContextType>({
  isConnected: false,
  subscribeToJob: () => {},
  unsubscribeFromJob: () => {},
});

export function useSignalRContext() {
  return useContext(SignalRContext);
}

export function SignalRProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const connectionRef = useRef<HubConnection | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('[SignalR] No token found, skipping connection');
      return;
    }

    const hubUrl = 'https://api-retailfixit-dev.redplant-5c8db0a0.eastus.azurecontainerapps.io/hubs/ops';

    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token,
      })
      .configureLogging(LogLevel.Warning)
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .build();

    connectionRef.current = connection;

    connection.on('event', (evt: RealtimeEvent) => {
      console.log('[SignalR] Event:', evt.type, evt.payload);
      
      switch (evt.type) {
        case 'job.created':
          queryClient.invalidateQueries({ queryKey: ['jobs'] });
          toast.info(`New job: ${evt.payload.reference || evt.payload.jobId}`);
          break;
          
        case 'job.assigned':
          queryClient.invalidateQueries({ queryKey: ['jobs'] });
          queryClient.invalidateQueries({ queryKey: ['job', evt.payload.jobId] });
          queryClient.invalidateQueries({ queryKey: ['assignments'] });
          toast.success(`Job assigned to ${evt.payload.vendorName || 'vendor'}`);
          break;
          
        case 'ai.recommendation.ready':
          queryClient.invalidateQueries({ queryKey: ['recommendation', evt.payload.jobId] });
          toast.info(`AI ready for job ${evt.payload.jobId}`);
          break;
          
        case 'assignment.accepted':
          queryClient.invalidateQueries({ queryKey: ['assignments'] });
          toast.success('Vendor accepted assignment');
          break;
          
        case 'assignment.declined':
          queryClient.invalidateQueries({ queryKey: ['assignments'] });
          toast.warning('Vendor declined assignment');
          break;
      }
    });

    connection.onreconnecting(() => {
      console.log('[SignalR] Reconnecting...');
      setIsConnected(false);
    });

    connection.onreconnected(() => {
      console.log('[SignalR] Reconnected');
      setIsConnected(true);
    });

    connection.onclose(() => {
      console.log('[SignalR] Closed');
      setIsConnected(false);
    });

    connection
      .start()
      .then(() => {
        console.log('[SignalR] Connected');
        setIsConnected(true);
      })
      .catch((err: Error) => {
        console.error('[SignalR] Connection error:', err.message);
      });

    return () => {
      connection.stop();
    };
  }, [queryClient]);

  const subscribeToJob = useCallback((jobId: string) => {
    const connection = connectionRef.current;
    if (connection?.state === HubConnectionState.Connected) {
      connection.invoke('SubscribeJob', jobId).catch((err: Error) => {
        console.error('[SignalR] Subscribe error:', err.message);
      });
    }
  }, []);

  const unsubscribeFromJob = useCallback((jobId: string) => {
    const connection = connectionRef.current;
    if (connection?.state === HubConnectionState.Connected) {
      connection.invoke('UnsubscribeJob', jobId).catch((err: Error) => {
        console.error('[SignalR] Unsubscribe error:', err.message);
      });
    }
  }, []);

  return (
    <SignalRContext.Provider value={{ isConnected, subscribeToJob, unsubscribeFromJob }}>
      {children}
    </SignalRContext.Provider>
  );
}
