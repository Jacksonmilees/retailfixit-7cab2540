import { useEffect, useRef, useState, useCallback } from 'react';
import { HubConnectionBuilder, HubConnection, LogLevel } from '@microsoft/signalr';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface RealtimeEvent {
  id: string;
  type: string;
  tenantId: string;
  occurredAt: string;
  payload: any;
}

export function useSignalR() {
  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();
  const reconnectAttempts = useRef(0);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const hubUrl = import.meta.env.VITE_API_URL 
      ? `${import.meta.env.VITE_API_URL}/hubs/ops`
      : 'https://api-retailfixit-dev.redplant-5c8db0a0.eastus.azurecontainerapps.io/hubs/ops';

    const newConnection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token,
      })
      .configureLogging(LogLevel.Information)
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .build();

    newConnection.on('event', (evt: RealtimeEvent) => {
      console.log('[SignalR] Event received:', evt.type, evt);
      
      switch (evt.type) {
        case 'job.created':
          queryClient.invalidateQueries({ queryKey: ['jobs'] });
          toast.info(`New job created: ${evt.payload.reference || evt.payload.jobId}`);
          break;
          
        case 'job.assigned':
          queryClient.invalidateQueries({ queryKey: ['jobs'] });
          queryClient.invalidateQueries({ queryKey: ['job', evt.payload.jobId] });
          queryClient.invalidateQueries({ queryKey: ['assignments'] });
          toast.success(`Job ${evt.payload.jobId} assigned to ${evt.payload.vendorName}`);
          break;
          
        case 'ai.recommendation.ready':
          queryClient.invalidateQueries({ queryKey: ['recommendation', evt.payload.jobId] });
          toast.info(`AI recommendations ready for job ${evt.payload.jobId}`);
          break;
          
        case 'assignment.accepted':
          queryClient.invalidateQueries({ queryKey: ['assignments'] });
          queryClient.invalidateQueries({ queryKey: ['jobs'] });
          toast.success(`Vendor accepted job assignment`);
          break;
          
        case 'assignment.declined':
          queryClient.invalidateQueries({ queryKey: ['assignments'] });
          queryClient.invalidateQueries({ queryKey: ['jobs'] });
          toast.warning(`Vendor declined job assignment`);
          break;
          
        case 'ops.health.changed':
          queryClient.invalidateQueries({ queryKey: ['health'] });
          break;
          
        default:
          console.log('[SignalR] Unhandled event type:', evt.type);
      }
    });

    newConnection.onreconnecting(() => {
      console.log('[SignalR] Reconnecting...');
      setIsConnected(false);
    });

    newConnection.onreconnected(() => {
      console.log('[SignalR] Reconnected');
      setIsConnected(true);
      reconnectAttempts.current = 0;
    });

    newConnection.onclose(() => {
      console.log('[SignalR] Connection closed');
      setIsConnected(false);
    });

    // Start connection
    newConnection
      .start()
      .then(() => {
        console.log('[SignalR] Connected');
        setIsConnected(true);
        setConnection(newConnection);
      })
      .catch((err) => {
        console.error('[SignalR] Connection error:', err);
        setIsConnected(false);
      });

    return () => {
      newConnection.stop();
    };
  }, [queryClient]);

  const subscribeToJob = useCallback((jobId: string) => {
    if (connection?.state === 'Connected') {
      connection.invoke('SubscribeJob', jobId);
    }
  }, [connection]);

  const unsubscribeFromJob = useCallback((jobId: string) => {
    if (connection?.state === 'Connected') {
      connection.invoke('UnsubscribeJob', jobId);
    }
  }, [connection]);

  return {
    connection,
    isConnected,
    subscribeToJob,
    unsubscribeFromJob,
  };
}
