// src/ai/observabilityBus.js

/**
 * Observability Bus
 * -----------------
 * Κεντρικό event bus για ΟΛΟ το σύστημα.
 *
 * - routing
 * - bandits
 * - sticky
 * - fallback
 * - health
 *
 * Zero coupling:
 * Κανένα layer δεν ξέρει ποιος ακούει.
 */

class ObservabilityBus {
  constructor() {
    this.listeners = new Map();
    this.anyListeners = new Set();
  }

  /**
   * Subscribe to specific event
   */
  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(handler);

    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  /**
   * Subscribe to ALL events
   */
  onAny(handler) {
    this.anyListeners.add(handler);
    return () => this.anyListeners.delete(handler);
  }

  /**
   * Emit event
   */
  emitEvent(event, payload = {}) {
    // specific listeners
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const fn of handlers) {
        try {
          fn(payload);
        } catch (err) {
          // observability must NEVER break the system
          console.error("[observabilityBus] handler error:", err);
        }
      }
    }

    // global listeners
    for (const fn of this.anyListeners) {
      try {
        fn(event, payload);
      } catch (err) {
        console.error("[observabilityBus] any-handler error:", err);
      }
    }
  }
}

/**
 * Singleton instance
 */
export const observabilityBus = new ObservabilityBus();
