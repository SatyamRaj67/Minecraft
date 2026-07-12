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

  //   TODO: Add tests
});
