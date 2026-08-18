import { useEffect, useRef, useState } from "react";

/**
 * useFlashOnRender
 * -----------------
 * Returns true for a short window after any value in `deps` actually
 * changes. This is the visual proof that used to live only in a
 * "renders: N" badge — the panel lights up amber the instant its
 * watched data changes, so the bailout (a panel that DOESN'T flash on
 * an unrelated store update) is visible peripherally, not just read.
 *
 * IMPORTANT: this must depend on the *watched data* (deps), not run on
 * every render with no dependency array. Watching "every render" is a
 * feedback loop — this hook's own setFlashing(true)/setFlashing(false)
 * calls are themselves renders, so an effect with no deps array would
 * re-fire on its own state change and flash forever. Passing an
 * explicit deps array (the same way useEffect's does) means the effect
 * only reruns when the underlying selected value actually changes.
 */
export function useFlashOnRender(deps: readonly unknown[], durationMs = 420): boolean {
  const [flashing, setFlashing] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setFlashing(true);
    const t = setTimeout(() => setFlashing(false), durationMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return flashing;
}