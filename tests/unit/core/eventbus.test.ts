import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventBus, EngineEvent } from "../../../src/core/events/EventBus";

describe("EventBus", () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  it("on + emit: listener is called", () => {
    const fn = vi.fn();
    bus.on(EngineEvent.KEY_DOWN, fn);
    bus.emit(EngineEvent.KEY_DOWN, { code: "KeyA", repeat: false });
    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith({ code: "KeyA", repeat: false });
  });

  it("on + emit: multiple listeners all receive event", () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    bus.on(EngineEvent.KEY_DOWN, fn1);
    bus.on(EngineEvent.KEY_DOWN, fn2);
    bus.emit(EngineEvent.KEY_DOWN, { code: "KeyA", repeat: false });
    expect(fn1).toHaveBeenCalledOnce();
    expect(fn2).toHaveBeenCalledOnce();
  });

  it("off: listener is not called after removal", () => {
    const fn = vi.fn();
    const token = bus.on(EngineEvent.KEY_DOWN, fn);
    bus.off(token);
    bus.emit(EngineEvent.KEY_DOWN, { code: "KeyA", repeat: false });
    expect(fn).not.toHaveBeenCalled();
  });

  it("off: other listeners on same event still fire", () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const t1 = bus.on(EngineEvent.KEY_DOWN, fn1);
    bus.on(EngineEvent.KEY_DOWN, fn2);
    bus.off(t1);
    bus.emit(EngineEvent.KEY_DOWN, { code: "KeyA", repeat: false });
    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).toHaveBeenCalledOnce();
  });

  it("different event types do not cross-fire", () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    bus.on(EngineEvent.KEY_DOWN, fn1);
    bus.on(EngineEvent.KEY_UP, fn2);
    bus.emit(EngineEvent.KEY_DOWN, { code: "KeyA", repeat: false });
    expect(fn1).toHaveBeenCalledOnce();
    expect(fn2).not.toHaveBeenCalled();
  });

  it("emit with no listeners does not throw", () => {
    expect(() =>
      bus.emit(EngineEvent.KEY_DOWN, { code: "KeyA", repeat: false }),
    ).not.toThrow();
  });

  it("re-entrant emit: event fined inside handler is deferred until after current dispatch", () => {
    const order: string[] = [];

    bus.on(EngineEvent.ENGINE_INIT, () => {
      order.push("INIT-HANDLER");

      bus.emit(EngineEvent.ENGINE_RESUME, {});
      order.push("AFTER-NESTED-EMIT");
    });

    bus.on(EngineEvent.ENGINE_RESUME, () => {
      order.push("RESUME-HANDLER");
    });

    bus.emit(EngineEvent.ENGINE_INIT, {});

    // The nested 'RESUME-HANDLER' should fire after 'AFTER-NESTED-EMIT'

    expect(order).toEqual([
      "INIT-HANDLER",
      "AFTER-NESTED-EMIT",
      "RESUME-HANDLER",
    ]);
  });

  it("Multiple re-entrant emits are all deferred in FIFO order", () => {
    const log: string[] = [];

    bus.on(EngineEvent.ENGINE_INIT, () => {
      bus.emit(EngineEvent.ENGINE_PAUSE, {});
      bus.emit(EngineEvent.ENGINE_RESUME, {});
    });
    bus.on(EngineEvent.ENGINE_PAUSE, () => {
      log.push("PAUSE");
    });
    bus.on(EngineEvent.ENGINE_RESUME, () => {
      log.push("RESUME");
    });

    bus.emit(EngineEvent.ENGINE_INIT, {});
    expect(log).toEqual(["PAUSE", "RESUME"]);
  });

  it("Clear: Removes all listeners", () => {
    const fn = vi.fn();
    bus.on(EngineEvent.KEY_DOWN, fn);
    bus.clear();
    bus.emit(EngineEvent.KEY_DOWN, { code: "KeyA", repeat: false });
    expect(fn).not.toHaveBeenCalled();
  });

  it("emit passes exact payload", () => {
    let received: unknown;
    bus.on(EngineEvent.MOUSE_MOVE, (payload) => {
      received = payload;
    });
    const payload = { dx: 42, dy: -17 };
    bus.emit(EngineEvent.MOUSE_MOVE, payload);
    expect(received).toEqual(payload);
  });

  it("Unsubscribing during dispatch does not affect current dispatch", () => {
    for (let i = 0; i < 100; i++) {
      const t = bus.on(EngineEvent.KEY_DOWN, () => {});
      bus.off(t);
    }

    const fn = vi.fn();
    bus.on(EngineEvent.KEY_DOWN, fn);
    bus.emit(EngineEvent.KEY_DOWN, { code: "KeyA", repeat: false });
    expect(fn).toHaveBeenCalledOnce();
  });

  it("listener count does not grow after repeated on+off cycles", () => {
    for (let i = 0; i < 100; i++) {
      const t = bus.on(EngineEvent.KEY_DOWN, () => {});
      bus.off(t);
    }

    const fn = vi.fn();
    bus.on(EngineEvent.KEY_DOWN, fn);
    bus.emit(EngineEvent.KEY_DOWN, { code: "KeyA", repeat: false });
    expect(fn).toHaveBeenCalledOnce();
  });
});
