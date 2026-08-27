/**
 * Real-time synchronization service & BroadcastChannel coordinator
 * Manages inter-tab synchronization and provides event bus for live updates.
 */

type SyncEventListener = (payload?: any) => void;

class SyncManager {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<SyncEventListener> = new Set();

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('mcm_realtime_sync');
        this.channel.onmessage = (event) => {
          this.notifyListeners(event.data);
        };
      } catch (err) {
        console.warn('BroadcastChannel not supported or restricted in this environment:', err);
      }
    }
  }

  /**
   * Broadcast an update event to all other open tabs/windows
   */
  broadcast(action: string, data?: any): void {
    const payload = { action, data, timestamp: Date.now() };
    if (this.channel) {
      try {
        this.channel.postMessage(payload);
      } catch (err) {
        console.warn('Failed to broadcast sync event:', err);
      }
    }
    // Also notify local listeners in the current tab
    this.notifyListeners(payload);
  }

  /**
   * Subscribe to sync events
   */
  subscribe(listener: SyncEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(data: any): void {
    this.listeners.forEach((listener) => {
      try {
        listener(data);
      } catch (err) {
        console.error('Error in sync listener:', err);
      }
    });
  }
}

export const syncService = new SyncManager();
