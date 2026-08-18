import type { StoreApi } from "../../src/index";
import { useStore } from "../../src/index";
import { Panel } from "./Panel";
import { theme } from "./theme";

const c = theme.color;

/** Live `JSON.stringify(getState())` readout, functions stripped. */
export function StateTreePanel<T extends Record<string, unknown>>({
  store,
  title = "state tree",
}: {
  store: StoreApi<T>;
  title?: string;
}) {
  const state = useStore(store);
  const serializable = Object.fromEntries(
    Object.entries(state as Record<string, unknown>).filter(([, v]) => typeof v !== "function")
  );

  return (
    <Panel title={title}>
      <pre
        style={{
          margin: 0,
          fontSize: 12,
          lineHeight: 1.6,
          color: c.text,
          maxHeight: 160,
          overflowY: "auto",
        }}
      >
        {JSON.stringify(serializable, null, 2)}
      </pre>
    </Panel>
  );
}
