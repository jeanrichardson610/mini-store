# mini-store vs Redux Toolkit vs Zustand

`mini-store` is a ~200-line state manager built to answer one question honestly:
**what does a state management library actually have to solve?** Four things,
in order of how much they're glossed over in day-to-day use:

1. Hold state outside React, and notify subscribers on change.
2. Only notify when something *actually* changed (referential-equality bailout),
   or every update re-renders everything subscribed.
3. Let cross-cutting concerns (logging, async orchestration, devtools) wrap
   the update path without the store or the components knowing.
4. Bind to React in a way that doesn't tear under concurrent rendering.

Below is where mini-store lands on each, and honestly, where it doesn't.

## 1. Update model: no reducers, no action types

Redux Toolkit centers on `dispatch(action) -> reducer(state, action) -> newState`.
That indirection buys you: a serializable log of *every* state transition (great
for time-travel debugging and RTK Query's cache invalidation), and a single
funnel every update passes through, which is what makes Redux DevTools' replay
possible without cooperation from feature code.

mini-store (like Zustand) skips the action layer: `set(partial)` merges directly,
the same way `this.setState` does. You lose the serializable-action audit log.
You gain: no boilerplate, and `set` can be called from anywhere — an event
handler, a promise callback, another store — without funneling through a
dispatch table. For a portfolio-scale or small-to-mid app, this is almost
always the better trade; Redux's funnel earns its cost mainly in large
codebases with many teams touching the same store, where a forced, inspectable
choke point actually prevents bugs.

## 2. Referential-equality bailout: shallow, opt-in, on the selector

This is the part that's easy to build wrong. mini-store's `setState` skips
notifying listeners if a shallow key-by-key check finds nothing changed
(`createStore.ts`), and the React binding caches the last *selected* value so
`useSyncExternalStore`'s own `Object.is` check sees "no change" when a
selector's output is equal under a supplied `equalityFn` — even though the
top-level state object changed.

Zustand does exactly this: selector + optional `equalityFn` (their
`shallow` helper is the same shallow-compare mini-store ships). Redux Toolkit
leaves this to `reselect` / `createSelector`'s memoization instead of baking it
into the store or the `useSelector` hook — functionally similar, but it's a
separate library and a separate mental model (memoized selector factories with
their own cache-invalidation rules) rather than one parameter on the hook.

Where mini-store is weaker: no automatic deep-equality option, and the
selector cache is a single last-value slot — call the same selector from two
components and each gets its own cache, which is correct but means no
cross-component memoization the way `reselect` can share.

## 3. Middleware: closures wrapping `set`, not a dispatch pipeline

Redux's middleware signature — `store => next => action => ...` — exists
*because* dispatch is a single funnel; middleware composes around that funnel.
mini-store has no such funnel, so `logger` and `withThunk` (`middleware.ts`)
instead wrap the `set`/`get` pair passed into the state creator before the
user's code ever sees them. It's a smaller idea doing the same job: intercept
the write path, do something on either side of it, pass through.

The honest gap: Redux's `dispatch(action)` model means *any* middleware can
inspect the action before it reaches the reducer and conditionally short-circuit,
rewrite, or delay it — that's what makes `redux-saga`'s complex async
choreography possible. mini-store's `set` has no "action" to inspect, only a
resulting state patch, so middleware can wrap the effect of a call but can't
easily intercept *intent* before it happens. This is the same limitation
Zustand's middleware has, and it's a real one if you ever need saga-style
"cancel this in-flight update because a newer one superseded it" logic —
you'd hand-roll it, not get it from the middleware layer.

Thunks specifically: RTK's `thunk` middleware exists because Redux's dispatch
only accepts plain action objects by default; the middleware special-cases
functions so `dispatch(fn)` can call `fn(dispatch, getState)`. mini-store's
`set`/`get` are just closures already, so any async function can call them
directly with zero middleware — `withThunk` in this repo is closer to
scaffolding/documentation of that convention than a runtime requirement.
That's a real simplification, not a workaround.

## 4. React binding: `useSyncExternalStore`, matching both

Both Redux (`react-redux` v8+) and Zustand rebuilt their React bindings on
`useSyncExternalStore` when it landed in React 18, for the same reason
mini-store uses it: pre-18, a `useState` + `useEffect` subscription can read a
stale snapshot during a concurrent render pass that gets thrown away and
retried against newer store state — "tearing" — because the effect that would
resync only runs *after* commit. `useSyncExternalStore` moves the snapshot
read into render itself and forces a sync re-render if it detects a mismatch,
which is a guarantee userland code can't replicate.

mini-store's `useStore` is structurally the same shape as Zustand's `useStore`:
`(store, selector, equalityFn) => selected`. The difference is entirely in
what's *behind* the store, not in the binding itself.

## Where mini-store just loses

- **DevTools.** Redux DevTools' time-travel and action-log replay assume a
  serializable action stream; mini-store has no such stream, so there's
  nothing to plug in without adding one.
- **Async data fetching.** RTK Query solves cache invalidation, request
  dedup, and refetch-on-focus as a first-class layer. mini-store has none of
  that — `fetchTodosSlowly` in the demo is a plain async closure, which is
  fine for one call site and not a substitute for a query cache.
- **Ecosystem.** Persist middleware, Immer integration, devtools bridges —
  Zustand ships these as optional middleware; mini-store would need them
  hand-written.

## Where it's a fair trade

For the actual surface area most small-to-mid apps use — subscribe, a merge-style
update, a couple of cross-cutting concerns, and a concurrent-safe React
binding — mini-store does the same job Zustand does, in less code, because it
skips the parts (persist, devtools bridge, `create` sugar for slices) that
exist for scale mini-store isn't trying to reach. Redux Toolkit's action
funnel is the one piece that's a genuine architectural choice rather than
just "more code" — it's worth reaching for specifically when you need an
inspectable, replayable log of every transition, not by default.
