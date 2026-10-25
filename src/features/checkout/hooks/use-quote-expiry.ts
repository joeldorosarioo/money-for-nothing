import { useEffect, useState } from "react";

export function useQuoteExpiry (id: string | undefined, expiresAt: number | undefined) {
  const [expiredId, setExpiredId] = useState<string | undefined>()

  useEffect(() => {
    if (!id || !expiresAt) return
    const timer = setTimeout(() => { setExpiredId(id) }, Math.max(0, expiresAt - Date.now()))
    return () => { clearTimeout(timer) }
  }, [id, expiresAt])

  return Boolean(id && expiredId === id)
}
