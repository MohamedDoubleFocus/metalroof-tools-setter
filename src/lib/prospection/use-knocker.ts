"use client";

import { useCallback, useEffect, useState } from "react";
import { KNOCKERS, getKnockerById, type Knocker } from "./knockers";

const STORAGE_KEY = "prospection.knockerId";

/**
 * React hook giving the current knocker (from localStorage), plus setters
 * and a "ready" flag (true once we've read localStorage at least once).
 *
 * On the very first paint, `knocker` is null. After hydration it becomes
 * either the persisted knocker or null (in which case the page should
 * show the KnockerGate modal).
 */
export function useKnocker(): {
  ready: boolean;
  knocker: Knocker | null;
  setKnocker: (id: string) => void;
  clearKnocker: () => void;
} {
  const [knocker, setKnockerState] = useState<Knocker | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const found = getKnockerById(stored);
        if (found) setKnockerState(found);
      }
    } catch {
      // localStorage unavailable
    }
    setReady(true);
  }, []);

  const setKnocker = useCallback((id: string) => {
    const found = getKnockerById(id);
    if (!found) return;
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
    setKnockerState(found);
  }, []);

  const clearKnocker = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setKnockerState(null);
  }, []);

  return { ready, knocker, setKnocker, clearKnocker };
}

export { KNOCKERS };
