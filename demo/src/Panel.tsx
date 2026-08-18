import { type CSSProperties, type ReactNode } from "react";
import { theme } from "./theme";

export type PanelStatus = "idle" | "active";

interface PanelProps {
  title: string;
  status?: PanelStatus;
  /** Small monospace readout in the header, e.g. "renders: 3" */
  readout?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
}

const c = theme.color;

/**
 * Panel
 * -----
 * The one shell every demo in the family reuses: dark card, corner
 * brackets, a status dot (teal = idle, amber = just fired), and a
 * monospace header. The amber border glow is driven entirely by the
 * `status` prop so any panel can flash on its own trigger (a render,
 * a dispatch, a subscription firing) without Panel knowing why.
 */
export function Panel({ title, status = "idle", readout, children, style }: PanelProps) {
  const active = status === "active";
  return (
    <div
      style={{
        position: "relative",
        background: c.panel,
        border: `1px solid ${active ? c.amberDim : c.border}`,
        padding: "14px 16px 16px",
        fontFamily: theme.font.mono,
        color: c.text,
        transition: "border-color 320ms ease",
        ...style,
      }}
    >
      <Corner pos="tl" active={active} />
      <Corner pos="tr" active={active} />
      <Corner pos="bl" active={active} />
      <Corner pos="br" active={active} />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Dot active={active} />
          <span
            style={{
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: active ? c.amber : c.textDim,
              transition: "color 320ms ease",
            }}
          >
            {title}
          </span>
        </div>
        {readout !== undefined && (
          <span style={{ fontSize: 11, color: c.textFaint }}>{readout}</span>
        )}
      </div>

      {children}
    </div>
  );
}

function Dot({ active }: { active: boolean }) {
  return (
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: active ? c.amber : c.tealDim,
        boxShadow: active ? `0 0 6px 1px ${c.amber}` : "none",
        transition: "background 320ms ease, box-shadow 320ms ease",
        flexShrink: 0,
      }}
    />
  );
}

const CORNER = 10;
function Corner({ pos, active }: { pos: "tl" | "tr" | "bl" | "br"; active: boolean }) {
  const color = active ? c.amber : c.borderStrong;
  const base: CSSProperties = {
    position: "absolute",
    width: CORNER,
    height: CORNER,
    transition: "border-color 320ms ease",
    pointerEvents: "none",
  };
  const edges: Record<typeof pos, CSSProperties> = {
    tl: { top: -1, left: -1, borderTop: `1px solid ${color}`, borderLeft: `1px solid ${color}` },
    tr: { top: -1, right: -1, borderTop: `1px solid ${color}`, borderRight: `1px solid ${color}` },
    bl: { bottom: -1, left: -1, borderBottom: `1px solid ${color}`, borderLeft: `1px solid ${color}` },
    br: { bottom: -1, right: -1, borderBottom: `1px solid ${color}`, borderRight: `1px solid ${color}` },
  };
  return <span style={{ ...base, ...edges[pos] }} />;
}
