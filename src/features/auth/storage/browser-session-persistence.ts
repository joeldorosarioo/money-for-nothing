import { z } from "zod";

import { type StoredSession } from "../types/session";

const storedSessionSchema = z.object({
  token: z.string().min(1),
  pendingMergeId: z.string().nullable()
});

const storageKey = "kurio.session.v1"

export const browserSessionPersistence = {
  read () {
    const serialized = localStorage.getItem(storageKey);
    if (!serialized) return null

    try {
      const parsed = storedSessionSchema.safeParse(JSON.parse(serialized));
      return parsed.success ? parsed.data : null
    } catch {
      return null
    }
  },

  write (value: StoredSession | null) {
    if (value) localStorage.setItem(storageKey, JSON.stringify(value));
    else localStorage.removeItem(storageKey);
  },
}
