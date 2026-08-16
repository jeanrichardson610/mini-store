import type { GetState, Listener, SetState, StateCreator, StoreApi, Unsubscribe } from "./types";

/**
 * createStore
 * -----------
 * The entire "what does a state library actually do" answer lives here:
 *
 * 1. Hold a single mutable `state` reference in closure (not React state).
 * 2. `setState` computes the next state, and — this is the part people skip —
 *    only notifies listeners if the reference actually changed. Objects are
 *    immutable-by-convention; if nothing changed, don't touch the reference,
 *    so downstream referential-equality checks (selectors, React) can bail out.
 * 3. `subscribe` maintains a Set of listeners. Dispatch === setState here;
 *    there's no separate action/reducer step because merge-style updates
 *    cover the Redux "reducer" use case too (see middleware.ts for how you'd
 *    layer an action/reducer pattern back on top via middleware).
 * 4. Listeners are called synchronously and in isolation: if one listener
 *    throws, the others still run. Redux does this; it matters for concurrent
 *    subscribers that shouldn't be able to break each other.
 */
export function createStore<T extends object>(createState: StateCreator<T>): StoreApi<T> {
  let state: T;
  const listeners = new Set<Listener>();

  const getState: GetState<T> = () => state;

  const setState: SetState<T> = (partial, replace = false) => {
    const nextPartial = typeof partial === "function" ? (partial as (s: T) => Partial<T>)(state) : partial;

    // Reference-equality short circuit: if the "next" partial is the exact
    // same object already on state for every key, skip the notify entirely.
    // This is the same trick Zustand uses to avoid redundant renders when a
    // middleware or effect calls setState with an unchanged slice.
    if (nextPartial === state) return;

    const nextState = replace
      ? (nextPartial as T)
      : ({ ...state, ...nextPartial } as T);

    if (Object.is(nextState, state)) return;

    // Shallow check: if every key on nextState is reference-equal to the
    // current state, nothing actually changed — don't notify.
    let changed = replace;
    if (!replace) {
      for (const key of Object.keys(nextPartial as object) as (keyof T)[]) {
        if (!Object.is(nextState[key], state[key])) {
          changed = true;
          break;
        }
      }
    }

    state = nextState;
    if (changed) {
      listeners.forEach((listener) => {
        try {
          listener();
        } catch (err) {
          // isolate listener failures — one bad subscriber shouldn't break others
          console.error("[mini-store] listener threw:", err);
        }
      });
    }
  };

  const subscribe = (listener: Listener): Unsubscribe => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const api: StoreApi<T> = {
    getState,
    setState,
    subscribe,
    getInitialState: () => state,
  };

  // The creator function receives (set, get, api) — same signature Zustand
  // uses — so middleware can intercept `set`/`get` before the user's state
  // creator ever sees them (see middleware.ts).
  state = createState(setState, getState, api);

  return api;
}
