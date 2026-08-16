export type Listener = () => void;
export type Unsubscribe = () => void;

/** A reducer-free store: state is just whatever `setState` merges/replaces. */
export type StateCreator<T> = (
  set: SetState<T>,
  get: GetState<T>,
  api: StoreApi<T>
) => T;

export type SetState<T> = (
  partial: Partial<T> | ((state: T) => Partial<T>),
  replace?: boolean
) => void;

export type GetState<T> = () => T;

export interface StoreApi<T> {
  getState: GetState<T>;
  setState: SetState<T>;
  subscribe: (listener: Listener) => Unsubscribe;
  /** Snapshot used by useSyncExternalStore's getServerSnapshot */
  getInitialState: () => T;
}

/** Middleware wraps a StateCreator, the same shape Zustand/Redux middleware use. */
export type Middleware<T> = (config: StateCreator<T>) => StateCreator<T>;

/** Equality function used by selector subscriptions to bail out of re-renders. */
export type EqualityFn<S> = (a: S, b: S) => boolean;
