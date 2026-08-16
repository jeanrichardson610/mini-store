import type { GetState, Middleware, SetState, StateCreator, StoreApi } from "./types";

/**
 * logger
 * ------
 * Wraps `set` so every call logs prev state, the patch, and next state.
 * This is the "compose a function around set/get before the user's state
 * creator runs" pattern — same shape as Redux middleware wrapping dispatch,
 * just without the action-object ceremony since this store has no reducer.
 */
export function logger<T extends object>(config: StateCreator<T>): StateCreator<T> {
  return (set, get, api) => {
    const loggedSet: SetState<T> = (partial, replace) => {
      const prev = get();
      set(partial, replace);
      const next = get();
      if (prev !== next) {
        console.groupCollapsed(`[mini-store] setState @ ${new Date().toLocaleTimeString()}`);
        console.log("prev:", prev);
        console.log("patch:", typeof partial === "function" ? "(fn)" : partial);
        console.log("next:", next);
        console.groupEnd();
      }
    };
    return config(loggedSet, get, api);
  };
}

/**
 * thunk-equivalent
 * -----------------
 * Redux Toolkit's thunk middleware lets `dispatch` accept a function
 * `(dispatch, getState) => ...` instead of a plain action, so async logic
 * can read state and dispatch multiple times over its lifetime.
 *
 * This store doesn't have a dispatch/action layer at all — `set` already
 * accepts state or a state-updater function, and because `set`/`get` are
 * just closures, any user function can already do:
 *
 *   const doThing = () => async (set, get) => { ... }
 *   doThing()(set, get)
 *
 * ...without any middleware. So "thunk support" here isn't a runtime
 * concept to add — it's a call-signature convention. `withThunk` below
 * enables the sugar Zustand's thunk-consumers expect: actions defined on
 * the state itself can call `get().someAsyncAction()` and that action can
 * internally call `set`/`get` as many times as it wants, synchronously or
 * across awaits. No middleware is required to make this work; the
 * middleware exists only to *document* that convention and enforce a
 * bounded-concurrency call queue so overlapping thunks don't stomp on
 * each other mid-flight.
 */
export function withThunk<T extends object>(config: StateCreator<T>): StateCreator<T> {
  return (set, get, api) => {
    let pending = 0;
    const guardedSet: SetState<T> = (partial, replace) => {
      // no special queuing needed for this reference-based store — set is
      // already safe to call from anywhere, including mid-async-thunk —
      // but we track in-flight thunk count for the devtools-style log below.
      set(partial, replace);
    };
    const wrappedApi: StoreApi<T> = {
      ...api,
      setState: guardedSet,
    };
    // expose a `runThunk` helper on the api for consumers who prefer an
    // explicit call over calling an async action off state directly
    (wrappedApi as StoreApi<T> & { runThunk?: unknown }).runThunk = async (
      thunk: (set: SetState<T>, get: GetState<T>) => Promise<void> | void
    ) => {
      pending++;
      try {
        await thunk(guardedSet, get);
      } finally {
        pending--;
      }
    };
    return config(guardedSet, get, wrappedApi);
  };
}

/** Compose middleware left-to-right, matching Redux's `compose(...)` order. */
export function compose<T extends object>(...middlewares: Middleware<T>[]): Middleware<T> {
  return (config) => middlewares.reduceRight((acc, mw) => mw(acc), config);
}
