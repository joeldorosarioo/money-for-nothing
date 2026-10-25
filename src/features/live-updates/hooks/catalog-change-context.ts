import { createContext, useContext } from "react";

import { type LiveEvent } from "../types/live-event";

export const CatalogChangeContext = createContext<LiveEvent | null>(null)

export function useCatalogChange () {
  return useContext(CatalogChangeContext)
}
