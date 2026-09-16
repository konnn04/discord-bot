import { useEffect, useRef, useState } from "react";

/** Structural equality for plain JSON-like settings objects (arrays, nested objects, primitives). */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (
    typeof a !== "object" ||
    typeof b !== "object" ||
    a === null ||
    b === null
  ) {
    return false;
  }
  const aRecord = a as Record<string, unknown>;
  const bRecord = b as Record<string, unknown>;
  const aKeys = Object.keys(aRecord);
  const bKeys = Object.keys(bRecord);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((k) => deepEqual(aRecord[k], bRecord[k]));
}

interface UseSettingsDraftOptions<T> {
  /** The last-saved value (e.g. a slice of GuildSettings from outlet context). */
  value: T;
  /** Persists the draft. Throw to keep the draft (and dirty state) on failure. */
  onSave: (draft: T) => Promise<void>;
}

/**
 * Staged-editing draft for a settings form: edits accumulate locally and are
 * only persisted on explicit save, mirroring the chatbot settings page's
 * save-bar UX. `value` is re-synced into the draft whenever it changes
 * upstream (initial load, or after this hook's own successful save).
 */
export function useSettingsDraft<T>({
  value,
  onSave,
}: UseSettingsDraftOptions<T>) {
  const [draft, setDraft] = useState<T>(value);
  const [isSaving, setIsSaving] = useState(false);
  const lastSyncedValue = useRef(value);

  // Deep-equal (not reference) comparison: `value` may be a composite object a
  // caller rebuilds every render (e.g. `{ ...data.welcome, x: data.features.x }`),
  // so a reference check would clobber in-progress edits on every keystroke.
  useEffect(() => {
    if (!deepEqual(value, lastSyncedValue.current)) {
      lastSyncedValue.current = value;
      setDraft(value);
    }
  }, [value]);

  const isDirty = !deepEqual(draft, value);

  const save = async () => {
    setIsSaving(true);
    try {
      await onSave(draft);
      lastSyncedValue.current = draft;
    } finally {
      setIsSaving(false);
    }
  };

  const discard = () => setDraft(value);

  return { draft, setDraft, isDirty, isSaving, save, discard };
}
