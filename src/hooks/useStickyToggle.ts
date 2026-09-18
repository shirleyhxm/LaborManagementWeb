import { useCallback, useState } from "react";

/**
 * Keys are namespaced so a preference can never collide with auth or business state, which
 * share this storage.
 */
const storageKey = (key: string) => `ui:${key}`;

/**
 * Reads and writes are guarded: storage throws in private browsing on some browsers, and a
 * view preference is never worth failing a render - or a button press - over.
 */
export function readStickyToggle(key: string, defaultValue: boolean): boolean {
  try {
    const stored = window.localStorage.getItem(storageKey(key));
    return stored === null ? defaultValue : stored === "true";
  } catch {
    return defaultValue;
  }
}

export function writeStickyToggle(key: string, value: boolean): void {
  try {
    window.localStorage.setItem(storageKey(key), String(value));
  } catch {
    // Preference lost for this session, which beats breaking the interaction.
  }
}

/**
 * A boolean the user set, remembered across unmounts and reloads.
 *
 * For view preferences rather than navigation: whether a panel is folded away is a choice
 * about how someone likes to read a page, so it should survive leaving the page and coming
 * back. Component state cannot - switching tabs unmounts the component and the choice is
 * silently undone - and the URL is the wrong home for it, since a link shared with a
 * colleague should not carry which sections the sender had collapsed.
 */
export function useStickyToggle(
  key: string,
  defaultValue = false
): [boolean, (next: boolean | ((current: boolean) => boolean)) => void] {
  const [value, setValue] = useState<boolean>(() => readStickyToggle(key, defaultValue));

  const set = useCallback(
    (next: boolean | ((current: boolean) => boolean)) => {
      setValue((current) => {
        const resolved = typeof next === "function" ? next(current) : next;
        writeStickyToggle(key, resolved);
        return resolved;
      });
    },
    [key]
  );

  return [value, set];
}
