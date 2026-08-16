import { describe, it, expect, vi } from "vitest";
import { createStore } from "../core/createStore";

interface TestState {
  count: number;
  nested: { a: number };
  increment: () => void;
  noop: () => void;
}

function makeStore() {
  return createStore<TestState>((set, get) => ({
    count: 0,
    nested: { a: 1 },
    increment: () => set((s) => ({ count: s.count + 1 })),
    // calls set with a partial that's identical to current state —
    // should NOT notify listeners
    noop: () => set({ count: get().count, nested: get().nested }),
  }));
}

describe("createStore", () => {
  it("getState returns the current state", () => {
    const store = makeStore();
    expect(store.getState().count).toBe(0);
  });

  it("setState merges partial state and notifies listeners on change", () => {
    const store = makeStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.getState().increment();

    expect(store.getState().count).toBe(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does not notify listeners when the patch is reference-equal to current values", () => {
    const store = makeStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.getState().noop();

    expect(listener).not.toHaveBeenCalled();
  });

  it("does not notify when setState is called with the exact same state object", () => {
    const store = makeStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.setState(store.getState());

    expect(listener).not.toHaveBeenCalled();
  });

  it("unsubscribe stops further notifications", () => {
    const store = makeStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.getState().increment();
    unsubscribe();
    store.getState().increment();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("replace mode swaps the whole state instead of merging", () => {
    const store = makeStore();
    const before = store.getState();

    store.setState(
      { count: 99, nested: { a: 2 }, increment: before.increment, noop: before.noop },
      true
    );

    expect(store.getState().count).toBe(99);
    expect(store.getState().nested.a).toBe(2);
  });

  it("isolates listener errors so other listeners still run", () => {
    const store = makeStore();
    const bad = vi.fn(() => {
      throw new Error("boom");
    });
    const good = vi.fn();
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    store.subscribe(bad);
    store.subscribe(good);
    store.getState().increment();

    expect(bad).toHaveBeenCalledTimes(1);
    expect(good).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("getInitialState reflects the current state (used as SSR snapshot)", () => {
    const store = makeStore();
    store.getState().increment();
    expect(store.getInitialState().count).toBe(1);
  });
});
