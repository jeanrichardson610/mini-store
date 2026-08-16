import { describe, it, expect, vi } from "vitest";
import { createStore } from "../core/createStore";
import { logger, withThunk, compose } from "../core/middleware";

interface CounterState {
  count: number;
  increment: () => void;
  fetchAndSet: () => Promise<void>;
}

describe("logger middleware", () => {
  it("does not alter the resulting state, only observes it", () => {
    const spy = vi.spyOn(console, "groupCollapsed").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "groupEnd").mockImplementation(() => {});

    const store = createStore<CounterState>(
      logger((set) => ({
        count: 0,
        increment: () => set((s) => ({ count: s.count + 1 })),
        fetchAndSet: async () => {},
      }))
    );

    store.getState().increment();

    expect(store.getState().count).toBe(1);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("does not log when a set call doesn't actually change state", () => {
    const spy = vi.spyOn(console, "groupCollapsed").mockImplementation(() => {});

    const store = createStore<{ count: number }>(
      logger((set, get) => ({
        count: 0,
      }))
    );

    store.setState({ count: store.getState().count });

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("withThunk middleware", () => {
  it("allows an async action to call set/get across an await boundary", async () => {
    const store = createStore<CounterState>(
      withThunk((set, get) => ({
        count: 0,
        increment: () => set((s) => ({ count: s.count + 1 })),
        fetchAndSet: async () => {
          set({ count: get().count + 1 });
          await Promise.resolve();
          set((s) => ({ count: s.count + 1 }));
        },
      }))
    );

    await store.getState().fetchAndSet();

    expect(store.getState().count).toBe(2);
  });

  it("exposes a runThunk helper on the wrapped api", async () => {
    let capturedApi: any;
    const store = createStore<CounterState>(
      withThunk((set, get, api) => {
        capturedApi = api;
        return {
          count: 0,
          increment: () => set((s) => ({ count: s.count + 1 })),
          fetchAndSet: async () => {},
        };
      })
    );

    expect(typeof capturedApi.runThunk).toBe("function");
    await capturedApi.runThunk(async (set: any) => set({ count: 5 }));
    expect(store.getState().count).toBe(5);
  });
});

describe("compose", () => {
  it("applies middleware left-to-right, matching Redux's compose order", () => {
    const calls: string[] = [];

    const trackA =
      (config: any) =>
      (set: any, get: any, api: any) => {
        calls.push("a-init");
        return config(set, get, api);
      };
    const trackB =
      (config: any) =>
      (set: any, get: any, api: any) => {
        calls.push("b-init");
        return config(set, get, api);
      };

    createStore<{ count: number }>(
      compose<{ count: number }>(trackA, trackB)((set) => {
        calls.push("base-init");
        return { count: 0 };
      })
    );

    // trackA wraps trackB wraps base, so outer (a) runs first
    expect(calls).toEqual(["a-init", "b-init", "base-init"]);
  });

  it("composed logger + thunk both apply to the same store", async () => {
    const spy = vi.spyOn(console, "groupCollapsed").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "groupEnd").mockImplementation(() => {});

    const store = createStore<CounterState>(
      compose<CounterState>(logger, withThunk)((set, get) => ({
        count: 0,
        increment: () => set((s) => ({ count: s.count + 1 })),
        fetchAndSet: async () => {
          set({ count: get().count + 1 });
        },
      }))
    );

    await store.getState().fetchAndSet();

    expect(store.getState().count).toBe(1);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
