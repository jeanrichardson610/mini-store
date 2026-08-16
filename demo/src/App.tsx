import { useRef } from "react";
import { useStore, shallowEqual } from "../../src/index";
import { store, type Todo } from "./store";

function useRenderCount() {
  const count = useRef(0);
  count.current += 1;
  return count.current;
}

function RenderBadge({ n }: { n: number }) {
  return (
    <span style={{ fontSize: 11, opacity: 0.6, marginLeft: 8 }}>
      renders: {n}
    </span>
  );
}

// Selects ONLY `count`. Typing in the todo input or toggling a todo will
// change the store's state object every time, but this component should
// NOT re-render for those — proving the selector + Object.is bailout in
// useStore's getSnapshot actually works.
function Counter() {
  const count = useStore(store, (s) => s.count);
  const renders = useRenderCount();
  return (
    <div style={{ border: "1px solid #ccc", padding: 12, marginBottom: 12 }}>
      <h3>
        Counter <RenderBadge n={renders} />
      </h3>
      <p>count: {count}</p>
      <button onClick={() => store.getState().increment()}>+1</button>
      <button onClick={() => store.getState().decrement()} style={{ marginLeft: 8 }}>
        -1
      </button>
    </div>
  );
}

// Selects a derived object { total, done } via a shallow-equal selector.
// Toggling a todo changes `done`'s count so this SHOULD re-render; typing
// in the add-todo input or clicking the counter should NOT.
function TodoStats() {
  const stats = useStore(
    store,
    (s) => ({ total: s.todos.length, done: s.todos.filter((t) => t.done).length }),
    shallowEqual
  );
  const renders = useRenderCount();
  return (
    <div style={{ border: "1px solid #ccc", padding: 12, marginBottom: 12 }}>
      <h3>
        Todo stats <RenderBadge n={renders} />
      </h3>
      <p>
        {stats.done} / {stats.total} done
      </p>
    </div>
  );
}

function TodoItem({ todo }: { todo: Todo }) {
  const renders = useRenderCount();
  return (
    <li>
      <label style={{ textDecoration: todo.done ? "line-through" : "none" }}>
        <input
          type="checkbox"
          checked={todo.done}
          onChange={() => store.getState().toggleTodo(todo.id)}
        />{" "}
        {todo.text}
      </label>
      <RenderBadge n={renders} />
    </li>
  );
}

function TodoList() {
  const todos = useStore(store, (s) => s.todos);
  const loading = useStore(store, (s) => s.loading);
  const renders = useRenderCount();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div style={{ border: "1px solid #ccc", padding: 12 }}>
      <h3>
        Todos <RenderBadge n={renders} />
      </h3>
      <input ref={inputRef} placeholder="new todo" />
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
      <button
        onClick={() => store.getState().fetchTodosSlowly()}
        style={{ marginLeft: 8 }}
      >
        {loading ? "fetching..." : "fetch todo (thunk demo)"}
      </button>
      <ul>
        {todos.map((t) => (
          <TodoItem key={t.id} todo={t} />
        ))}
      </ul>
    </div>
  );
}

export default function App() {
  return (
    <div style={{ maxWidth: 480, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h2>mini-store demo</h2>
      <p style={{ fontSize: 13, opacity: 0.75 }}>
        Open the console to see the logger middleware output. Watch the render
        counters: incrementing the counter should not re-render the todo list,
        and adding/toggling todos should not re-render the counter.
      </p>
      <Counter />
      <TodoStats />
      <TodoList />
    </div>
  );
}
