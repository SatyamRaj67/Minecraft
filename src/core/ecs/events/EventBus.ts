export enum EngineEvent {
  // Input
  KEY_DOWN = 0,
  KEY_UP = 1,
  MOUSE_MOVE = 2,
  MOUSE_BUTTON = 3,

  // World
  CHUNK_LOADED = 10,
  CHUNK_UNLOADED = 11,
  BLOCK_PLACED = 12,
  BLOCK_BROKEN = 13,

  // Player
  PLAYER_SPAWNED = 20,
  PLAYER_DIED = 21,
  PLAYER_DAMAGED = 22,

  // Engine lifecycle
  ENGINE_INIT = 30,
  ENGINE_PAUSE = 31,
  ENGINE_RESUME = 32,
  ENGINE_SHUTDOWN = 33,

  // Rendering
  SHADER_RELOADED = 40,
  RESOLUTION_CHANGED = 41,

  _COUNT = 50,
}

export interface EventPayloads {
  [EngineEvent.KEY_DOWN]: { code: string; repeat: boolean };
  [EngineEvent.KEY_UP]: { code: string };
  [EngineEvent.MOUSE_MOVE]: { dx: number; dy: number };
  [EngineEvent.MOUSE_BUTTON]: { button: number; pressed: boolean };
  [EngineEvent.CHUNK_LOADED]: { cx: number; cz: number };
  [EngineEvent.CHUNK_UNLOADED]: { cx: number; cz: number };
  [EngineEvent.BLOCK_PLACED]: {
    x: number;
    y: number;
    z: number;
    blockId: number;
  };
  [EngineEvent.BLOCK_BROKEN]: { x: number; y: number; z: number };
  [EngineEvent.PLAYER_SPAWNED]: { entityId: number };
  [EngineEvent.PLAYER_DIED]: Record<string, never>;
  [EngineEvent.PLAYER_DAMAGED]: { amount: number };
  [EngineEvent.ENGINE_INIT]: Record<string, never>;
  [EngineEvent.ENGINE_PAUSE]: Record<string, never>;
  [EngineEvent.ENGINE_RESUME]: Record<string, never>;
  [EngineEvent.ENGINE_SHUTDOWN]: Record<string, never>;
  [EngineEvent.SHADER_RELOADED]: { materialName: string };
  [EngineEvent.RESOLUTION_CHANGED]: { width: number; height: number };
  // Fallback: any other numeric key (e.g. _COUNT used internally) → unknown
  [key: number]: unknown;
}

// Helper type: resolve the payload for a given event, falling back to unknown.
export type EventPayload<E extends EngineEvent> = E extends keyof EventPayloads
  ? EventPayloads[E]
  : unknown;

type Listener<E extends EngineEvent> = (payload: EventPayload<E>) => void;

interface ListenerEntry {
  token: number;
  listener: (payload: unknown) => void;
}

export type EventToken = number;

interface PendingEvent {
  type: EngineEvent;
  payload: unknown;
}

export class EventBus {
  private listeners: Array<ListenerEntry[]> = Array.from(
    { length: EngineEvent._COUNT },
    () => [],
  );
  private nextToken = 1;
  private dispatching = false;
  private queue: PendingEvent[] = [];

  on<E extends EngineEvent>(type: E, listener: Listener<E>): EventToken {
    const token = this.nextToken++;
    const bucket = this.listeners[type];
    if (bucket) {
      bucket.push({ token, listener: listener as (p: unknown) => void });
    }
    return token;
  }

  off(token: EventToken): void {
    for (const bucket of this.listeners) {
      const idx = bucket.findIndex((e) => e.token === token);
      if (idx !== -1) {
        bucket.splice(idx, 1);
        return;
      }
    }
  }

  emit<E extends EngineEvent>(type: E, payload: EventPayload<E>): void {
    if (this.dispatching) {
      this.queue.push({ type, payload });
      return;
    }

    this.dispatching = true;
    const bucket = this.listeners[type];
    if (bucket) {
      for (const entry of bucket) {
        entry.listener(payload);
      }
    }
    this.dispatching = false;

    // Flush deferred events
    while (this.queue.length > 0) {
      const next = this.queue.shift()!;
      this.emit(
        next.type as EngineEvent,
        next.payload as EventPayload<EngineEvent>,
      );
    }
  }

  clear(): void {
    for (const bucket of this.listeners) bucket.length = 0;
    this.queue.length = 0;
  }
}

export const globalBus = new EventBus();
