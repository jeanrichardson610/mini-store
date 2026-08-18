import { useEffect, useRef, useState } from "react";
import type { StoreApi } from "../../src/index";
import { Panel } from "./Panel";
import { theme } from "./theme";

interface LogLine {
  id: string;
  time: string;
  changedKeys: string[];
}

const MAX_LINES = 40;
const c = theme.color;

/**
 * LogPanel
 * --------
 * Subscribes to the store directly and renders one line per notified
 * update — the same information the `logger` middleware already prints
 * to devtools, but on the page, where a visitor who never opens the
 * console can actually see it happen. Skips function-valued keys (the
 * actions) so the diff only shows real state.
 */
export function LogPanel<T extends Record<string, unknown>>({
  store,
  title = "dispatch log",
}: {
  store: StoreApi<T>;
  title?: string;
}) {
  const [lines, setLines] = useState<LogLine[]>([]);
  const prevRef = useRef<T>(store.getState());
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return store.subscribe(() => {
      const prev = prevRef.current;
      const next = store.getState();
      const changedKeys = (Object.keys(next) as (keyof T)[])
        .filter((k) => typeof next[k] !== "function")
        .filter((k) => !Object.is(prev[k], next[k]))
        .map(String);

      prevRef.current = next;
      if (changedKeys.length === 0) return;

      setLines((ls) => {
        const next = [
          ...ls,
          {
            id: `${Date.now()}-${Math.random()}`,
            time: new Date().toLocaleTimeString(undefined, { hour12: false }),
            changedKeys,
          },
        ];
        return next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next;
      });
    });
  }, [store]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [lines]);

  return (
    <Panel title={title} status={lines.length > 0 ? "active" : "idle"} readout={`${lines.length} entries`}>
      <div
        ref={listRef}
        style={{
          height: 160,
          overflowY: "auto",
          fontSize: 12,
          lineHeight: 1.7,
          color: c.textDim,
        }}
      >
        {lines.length === 0 && (
          <div style={{ color: c.textFaint }}>-- waiting for a dispatch --</div>
        )}
        {lines.map((line) => (
          <div key={line.id} style={{ whiteSpace: "nowrap" }}>
            <span style={{ color: c.textFaint }}>{line.time}</span>{" "}
            <span style={{ color: c.teal }}>setState</span>{" "}
            <span style={{ color: c.textFaint }}>changed</span>{" "}
            <span style={{ color: c.amber }}>[{line.changedKeys.join(", ")}]</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
