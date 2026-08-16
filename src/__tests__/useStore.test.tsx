import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createStore } from "../core/createStore";
import { useStore } from "../react/useStore";
import { shallowEqual } from "../core/shallow";

interface State {
  count: number;
  other: number;
  todos: { id: number; done: boolean }[];
  increment: () => void;
  bumpOther: () => void;
  toggleFirstTodo: () => void;
}

function makeStore() {
  return createStore<State>((set) => ({
    count: 0,
    other: 0,
    todos: [{ id: 1, done: false }],
    increment: () => set((s) => ({ count: s.count + 1 })),
    bumpOther: () => set((s) => ({ other: s.other + 1 })),
    toggleFirstTodo: () =>
      set((s) => ({
        todos: s.todos.map((t) => (t.id === 1 ? { ...t, done: !t.done } : t)),
      })),
  }));
}

describe("useStore", () => {
  it("returns the selected slice and updates when it changes", async () => {
    const store = makeStore();
    const user = userEvent.setup();

    function Counter() {
      const count = useStore(store, (s) => s.count);
      return <button onClick={() => store.getState().increment()}>count:{count}</button>;
    }

    render(<Counter />);
    expect(screen.getByText("count:0")).toBeInTheDocument();

    await user.click(screen.getByRole("button"));
    expect(screen.getByText("count:1")).toBeInTheDocument();
  });

  it("does NOT re-render a component subscribed to an unrelated slice", () => {
    const store = makeStore();
    let renderCount = 0;

    function OnlyCount() {
      const count = useStore(store, (s) => s.count);
      renderCount++;
      return <div>count:{count}</div>;
    }

    render(<OnlyCount />);
    expect(renderCount).toBe(1);

    act(() => {
      store.getState().bumpOther(); // unrelated slice
    });

    // still 1 render — the count selector's snapshot didn't change
    expect(renderCount).toBe(1);
  });

  it("bails out via a shallow-equal derived selector", () => {
    const store = makeStore();
    let renderCount = 0;

    function Stats() {
      // new object every call, but shallow-equal across unrelated updates
      const stats = useStore(
        store,
        (s) => ({ total: s.todos.length, done: s.todos.filter((t) => t.done).length }),
        shallowEqual
      );
      renderCount++;
      return (
        <div>
          {stats.done}/{stats.total}
        </div>
      );
    }

    render(<Stats />);
    expect(renderCount).toBe(1);

    act(() => {
      store.getState().bumpOther(); // doesn't touch todos at all
    });
    expect(renderCount).toBe(1); // still bailed out

    act(() => {
      store.getState().toggleFirstTodo(); // this DOES change `done`
    });
    expect(renderCount).toBe(2);
    expect(screen.getByText("1/1")).toBeInTheDocument();
  });

  it("defaults to the whole state when no selector is passed", () => {
    const store = makeStore();

    function Whole() {
      const state = useStore(store);
      return <div>count:{state.count}</div>;
    }

    render(<Whole />);
    expect(screen.getByText("count:0")).toBeInTheDocument();

    act(() => {
      store.getState().increment();
    });
    expect(screen.getByText("count:1")).toBeInTheDocument();
  });
});
