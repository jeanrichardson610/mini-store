import { useRef } from "react";
import { useStore, shallowEqual } from "../../src/index";
import { store, type Todo } from "./store";
import { theme } from "./theme";
import { Panel } from "./Panel";
import { LogPanel } from "./LogPanel";
import { StateTreePanel } from "./StateTreePanel";
import { useFlashOnRender } from "./useFlashOnRender";

const c = theme.color;

function useRenderCount() {
  const count = useRef(0);
  count.current += 1;
  return count.current;
}

// Selects ONLY `count`. Typing in the todo input or toggling a todo will
// change the store's state object every time, but this panel should NOT
// flash for those — proving the selector + Object.is bailout in
// useStore's getSnapshot actually works. Watch the border, not a number.
function Counter() {
  const count = useStore(store, (s) => s.count);
  const renders = useRenderCount();
  const flashing = useFlashOnRender([count]);

  return (
    <Panel title="counter" status={flashing ? "active" : "idle"} readout={`renders: ${renders}`}>
      <p style={{ fontSize: 28, margin: "4px 0 14px", color: c.text }}>{count}</p>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => store.getState().increment()}>+1</button>
        <button onClick={() => store.getState().decrement()}>-1</button>
      </div>
    </Panel>
  );
}

// Selects a derived object { total, done } via a shallow-equal selector.
// Toggling a todo changes `done`, so this SHOULD flash; typing in the
// add-todo input or clicking the counter should NOT.
function TodoStats() {
  const stats = useStore(
    store,
    (s) => ({ total: s.todos.length, done: s.todos.filter((t) => t.done).length }),
    shallowEqual
  );
  const renders = useRenderCount();
  const flashing = useFlashOnRender([stats]);

  return (
    <Panel title="todo stats" status={flashing ? "active" : "idle"} readout={`renders: ${renders}`}>
      <p style={{ fontSize: 28, margin: "4px 0 0", color: c.text }}>
        {stats.done}
        <span style={{ color: c.textFaint }}> / {stats.total}</span>
      </p>
      <p style={{ fontSize: 11, color: c.textDim, margin: "4px 0 0" }}>done</p>
    </Panel>
  );
}

function TodoItem({ todo }: { todo: Todo }) {
  const flashing = useFlashOnRender([todo]);
  return (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 0",
        borderBottom: `1px solid ${c.border}`,
        transition: "background 320ms ease",
        background: flashing ? "rgba(245, 166, 35, 0.06)" : "transparent",
      }}
    >
      <input
        type="checkbox"
        checked={todo.done}
        onChange={() => store.getState().toggleTodo(todo.id)}
      />
      <span
        style={{
          fontSize: 12,
          color: todo.done ? c.textFaint : c.text,
          textDecoration: todo.done ? "line-through" : "none",
        }}
      >
        {todo.text}
      </span>
    </li>
  );
}

function TodoList() {
  const todos = useStore(store, (s) => s.todos);
  const loading = useStore(store, (s) => s.loading);
  const renders = useRenderCount();
  const flashing = useFlashOnRender([todos, loading]);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Panel title="todos" status={flashing ? "active" : "idle"} readout={`renders: ${renders}`}>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input ref={inputRef} type="text" placeholder="new todo" style={{ flex: 1 }} />
        <button
          onClick={() => {
            const text = inputRef.current?.value.trim();
            if (text) {
              store.getState().addTodo(text);
              inputRef.current!.value = "";
            }
          }}
        >
          add
        </button>
      </div>
      <button
        onClick={() => store.getState().fetchTodosSlowly()}
        disabled={loading}
        style={{ width: "100%", marginBottom: 10 }}
      >
        {loading ? "fetching..." : "fetch todo (thunk demo)"}
      </button>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {todos.map((t) => (
          <TodoItem key={t.id} todo={t} />
        ))}
      </ul>
    </Panel>
  );
}

export default function App() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 20px 64px" }}>
      <header style={{ marginBottom: 28 }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.16em",
            color: c.teal,
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          mini-store // test bench
        </div>
        <p style={{ fontSize: 12, color: c.textDim, maxWidth: 520, lineHeight: 1.6, margin: 0 }}>
          Each panel's border flashes amber the instant it re-renders. Increment
          the counter and watch <em>only</em> the counter panel light up — todos
          and stats stay dark. That's the selector bailout, not a claim about it.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <Counter />
        <TodoStats />
      </div>

      <div style={{ marginBottom: 14 }}>
        <TodoList />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <LogPanel store={store as any} />
        <StateTreePanel store={store as any} />
      </div>
    </div>
  );
}