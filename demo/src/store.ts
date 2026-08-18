import { createStore, logger, withThunk, compose } from "../../src/index";
import type { StoreApi } from "../../src/index";

export interface Todo {
  id: number;
  text: string;
  done: boolean;
}

export interface AppState {
  count: number;
  increment: () => void;
  decrement: () => void;
  todos: Todo[];
  addTodo: (text: string) => void;
  toggleTodo: (id: number) => void;
  // simulates a network call, exercising the thunk-equivalent pattern
  fetchTodosSlowly: () => Promise<void>;
  loading: boolean;
}

export const store: StoreApi<AppState> = createStore<AppState>(
  compose<AppState>(logger, withThunk)((set, get) => ({
    count: 0,
    increment: () => set((s) => ({ count: s.count + 1 })),
    decrement: () => set((s) => ({ count: s.count - 1 })),

    todos: [],
    addTodo: (text) =>
      set((s) => ({
        todos: [...s.todos, { id: Date.now(), text, done: false }],
      })),
    toggleTodo: (id) =>
      set((s) => ({
        todos: s.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
      })),

    loading: false,
    // No middleware "thunk type" needed — this is just an async closure
    // over set/get, same as it would be in any Zustand action.
    fetchTodosSlowly: async () => {
      set({ loading: true });
      await new Promise((r) => setTimeout(r, 900));
      set((s) => ({
        todos: [...s.todos, { id: Date.now(), text: "fetched from the void", done: false }],
        loading: false,
      }));
    },
  }))
);