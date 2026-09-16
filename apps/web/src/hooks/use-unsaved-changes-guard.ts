import { useEffect } from "react";
import { useBlocker } from "react-router-dom";

/**
 * Blocks in-app navigation (via react-router) and tab close/refresh while
 * `isDirty` is true, so unsaved settings changes aren't silently lost.
 * Returns the react-router blocker — render <UnsavedChangesDialog blocker={...} />
 * to let the user save, discard, or stay when navigation is blocked.
 */
export function useUnsavedChangesGuard(isDirty: boolean) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  return blocker;
}
