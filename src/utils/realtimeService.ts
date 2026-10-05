import { SyncEventType, SyncMessage, ConnectedPeer, AuthUser } from '../types';

type SyncCallback = (message: SyncMessage) => void;
type PresenceCallback = (peers: ConnectedPeer[], onlineCount: number) => void;
type ConnectionStateCallback = (connected: boolean) => void;

class RealtimeSyncManager {
  private ws: WebSocket | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private reconnectTimeout: any = null;
  private pingInterval: any = null;
  private isConnected = false;
  private clientId: string;
  private listeners = new Set<SyncCallback>();
  private presenceListeners = new Set<PresenceCallback>();
  private connectionListeners = new Set<ConnectionStateCallback>();
  private currentUser: AuthUser | null = null;
  private reconnectAttempts = 0;
  private outgoingQueue: SyncMessage[] = [];

  constructor() {
    this.clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    this.initBroadcastChannel();
    this.initWindowLifecycleListeners();
    this.connect();
  }

  private initBroadcastChannel() {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel('attend_mesh_sync_v2');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.senderId !== this.clientId) {
            this.notifyListeners(event.data);
          }
        };
      }
    } catch (err) {
      console.warn('BroadcastChannel not supported in this browser context:', err);
    }
  }

  private initWindowLifecycleListeners() {
    if (typeof window === 'undefined') return;

    // Instantly reconnect when device comes online or tab becomes visible again
    window.addEventListener('online', () => {
      this.reconnectAttempts = 0;
      this.connect();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          this.connect();
        } else {
          this.sendPing();
        }
      }
    });

    window.addEventListener('focus', () => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        this.connect();
      }
    });
  }

  public setUserContext(user: AuthUser | null) {
    this.currentUser = user;
    this.sendPing();
  }

  public connect() {
    if (typeof window === 'undefined') return;

    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.notifyConnectionListeners(true);
        this.sendPing();
        this.startPingHeartbeat();
        this.flushQueue();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: SyncMessage = JSON.parse(event.data);
          if (message.type === 'PRESENCE_STATE') {
            const { peers, onlineCount } = message.payload || {};
            this.notifyPresenceListeners(peers || [], onlineCount || 1);
          } else if (message.senderId !== this.clientId) {
            this.notifyListeners(message);
          }
        } catch (err) {
          console.error('Error parsing sync message from server:', err);
        }
      };

      this.ws.onclose = () => {
        this.handleDisconnect();
      };

      this.ws.onerror = () => {
        this.handleDisconnect();
      };
    } catch (err) {
      console.warn('WebSocket setup failed, falling back to BroadcastChannel:', err);
      this.handleDisconnect();
    }
  }

  private handleDisconnect() {
    this.stopPingHeartbeat();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectAttempts++;
    this.isConnected = false;
    this.notifyConnectionListeners(false);

    // Continuous reconnection with fast initial attempts (500ms, 1000ms, max 3000ms)
    const delay = Math.min(3000, Math.max(500, this.reconnectAttempts * 800));
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private startPingHeartbeat() {
    this.stopPingHeartbeat();
    this.pingInterval = setInterval(() => {
      this.sendPing();
    }, 10000); // 10s heartbeat
  }

  private stopPingHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public sendPing() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const user = this.currentUser;
    const pingMessage = {
      type: 'PRESENCE_PING',
      senderId: this.clientId,
      senderName: user ? (user.nameKh || user.nameEn || user.username) : 'Terminal Node',
      senderRole: user?.role || 'employee',
      senderBranchId: user?.branchId || '',
      timestamp: new Date().toISOString(),
    };

    try {
      this.ws.send(JSON.stringify(pingMessage));
    } catch (_) {
      // ignore
    }
  }

  private flushQueue() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    while (this.outgoingQueue.length > 0) {
      const msg = this.outgoingQueue.shift();
      if (msg) {
        try {
          this.ws.send(JSON.stringify(msg));
        } catch (_) {
          break;
        }
      }
    }
  }

  public emit<T = any>(type: SyncEventType, payload: T) {
    const user = this.currentUser;
    const message: SyncMessage<T> = {
      type,
      payload,
      senderId: this.clientId,
      senderName: user ? (user.nameKh || user.nameEn || user.username) : 'User Terminal',
      senderRole: user?.role || 'employee',
      senderBranchId: user?.branchId || '',
      timestamp: new Date().toISOString(),
    };

    // 1. Send via WebSocket if open, or queue if connecting
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (err) {
        console.warn('Failed to send over WebSocket:', err);
      }
    } else {
      if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
        this.outgoingQueue.push(message);
      }
    }

    // 2. ALWAYS dispatch over REST to ensure server database persists immediately and forwards
    try {
      fetch('/api/sync/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
        keepalive: true,
      }).catch(() => {});
    } catch (_) {}

    // 3. Instant local broadcast to all other open tabs on this device (0ms delay)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(message);
      } catch (_) {}
    }
  }

  public subscribe(callback: SyncCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  public subscribePresence(callback: PresenceCallback): () => void {
    this.presenceListeners.add(callback);
    return () => {
      this.presenceListeners.delete(callback);
    };
  }

  public subscribeConnection(callback: ConnectionStateCallback): () => void {
    this.connectionListeners.add(callback);
    callback(this.isConnected);
    return () => {
      this.connectionListeners.delete(callback);
    };
  }

  private notifyListeners(message: SyncMessage) {
    this.listeners.forEach((cb) => {
      try {
        cb(message);
      } catch (err) {
        console.error('Error in realtime listener callback:', err);
      }
    });
  }

  private notifyPresenceListeners(peers: ConnectedPeer[], onlineCount: number) {
    this.presenceListeners.forEach((cb) => {
      try {
        cb(peers, onlineCount);
      } catch (err) {
        console.error('Error in presence listener callback:', err);
      }
    });
  }

  private notifyConnectionListeners(connected: boolean) {
    this.connectionListeners.forEach((cb) => {
      try {
        cb(connected);
      } catch (err) {
        console.error('Error in connection listener callback:', err);
      }
    });
  }

  public getClientId(): string {
    return this.clientId;
  }

  public isSocketConnected(): boolean {
    return this.isConnected && Boolean(this.ws && this.ws.readyState === WebSocket.OPEN);
  }
}

export const realtimeService = new RealtimeSyncManager();
