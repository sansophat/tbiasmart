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

  constructor() {
    this.clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    this.initBroadcastChannel();
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

      this.ws.onerror = (err) => {
        console.warn('WebSocket connection error:', err);
        this.handleDisconnect();
      };
    } catch (err) {
      console.warn('WebSocket setup failed, falling back to BroadcastChannel:', err);
      this.handleDisconnect();
    }
  }

  private handleDisconnect() {
    this.isConnected = false;
    this.notifyConnectionListeners(false);
    this.stopPingHeartbeat();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    // Exponential backoff reconnect
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private startPingHeartbeat() {
    this.stopPingHeartbeat();
    this.pingInterval = setInterval(() => {
      this.sendPing();
    }, 20000);
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
      senderName: user ? (user.nameKh || user.nameEn || user.username) : 'Guest Terminal',
      senderRole: user?.role || 'guest',
      senderBranchId: user?.branchId || '',
      timestamp: new Date().toISOString(),
    };

    try {
      this.ws.send(JSON.stringify(pingMessage));
    } catch (err) {
      console.warn('Failed to send presence ping:', err);
    }
  }

  /**
   * Broadcast an action/event to WebSocket server and cross-tab BroadcastChannel
   */
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

    // 1. Send via WebSocket if open
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (err) {
        console.warn('Failed to send over WebSocket:', err);
      }
    } else {
      // Fallback: send via REST endpoint so server knows and can forward
      fetch('/api/sync/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      }).catch(() => {});
    }

    // 2. Also broadcast to other local tabs via BroadcastChannel
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
        console.error('Error in sync subscriber:', err);
      }
    });
  }

  private notifyPresenceListeners(peers: ConnectedPeer[], onlineCount: number) {
    this.presenceListeners.forEach((cb) => {
      try {
        cb(peers, onlineCount);
      } catch (err) {
        console.error('Error in presence subscriber:', err);
      }
    });
  }

  private notifyConnectionListeners(connected: boolean) {
    this.connectionListeners.forEach((cb) => {
      try {
        cb(connected);
      } catch (err) {
        console.error('Error in connection subscriber:', err);
      }
    });
  }

  public getClientId(): string {
    return this.clientId;
  }

  public getStatus() {
    return {
      connected: this.isConnected,
      clientId: this.clientId,
    };
  }
}

// Global instance
export const realtimeService = new RealtimeSyncManager();
