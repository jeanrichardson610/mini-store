import { useCallback, useRef } from "react";
import { useSyncExternalStore } from "react";
import type { EqualityFn, StoreApi } from "../core/types";

/**
 * useStore
 * --------
 * Why useSyncExternalStore and not useState+useEffect:
 *
 * React 18's concurrent renderer can render a component multiple times for
 * one commit (or throw a render away entirely) while a *different* update
 * to the same external store happens in between. A useState/useEffect
 * subscription reads the store during render and re-syncs in an effect,
 * which is exactly the window where "tearing" happens — two components
 * reading the same store can end up rendering against two different
 * snapshots in the same commit.
 *
 * useSyncExternalStore closes that hole: React calls `getSnapshot()`
 * *during* render (possibly re-invoking it to check for tearing between
 * concurrent render passes) and forces a synchronous re-render if the
 * snapshot changed underneath it. That's the whole reason this hook exists
 * as a primitive instead of being userland-implementable pre-React 18.
 *
 * The selector + equalityFn layer on top is the referential-equality
 * bailout: getSnapshot must return a *cached* value when the selected
 * slice hasn't meaningfully changed, or useSyncExternalStore will treat
 * every store update as "changed" (via Object.is on the snapshot) even
 * when the component only cares about a slice that didn't move.
 */
export function useStore<T extends object, S = T>(
  api: StoreApi<T>,
  selector: (state: T) => S = (state) => state as unknown as S,
  equalityFn: EqualityFn<S> = Object.is
): S {
  // Cache the last selected value + its inputs so getSnapshot can return
  // the *same reference* when the selection is equal, instead of a fresh
  // object every call (which would make useSyncExternalStore think the
  // store changed on every render, defeating the whole point).
  const cache = useRef<{ state: T; selected: S } | null>(null);

  const getSnapshot = useCallback((): S => {
    const state = api.getState();
    const prev = cache.current;

    if (prev && prev.state === state) {
      return prev.selected;
    }

    const selected = selector(state);

    if (prev && equalityFn(prev.selected, selected)) {
      // state object changed, but the selected slice is equal under the
      // provided equality fn — keep returning the old reference so
      // useSyncExternalStore's Object.is check sees "no change".
      cache.current = { state, selected: prev.selected };
      return prev.selected;
    }

    cache.current = { state, selected };
    return selected;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, selector, equalityFn]);

  const getServerSnapshot = useCallback((): S => {
    return selector(api.getInitialState());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, selector]);

  return useSyncExternalStore(api.subscribe, getSnapshot, getServerSnapshot);
}

/** Convenience factory: bind a hook to one store, Zustand-style `useX()`. */
export function createUseStore<T extends object>(api: StoreApi<T>) {
  return function useBoundStore<S = T>(
    selector?: (state: T) => S,
    equalityFn?: EqualityFn<S>
  ): S {
    return useStore(api, selector, equalityFn);
  };
}
