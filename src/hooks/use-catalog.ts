"use client";

import { useSyncExternalStore } from "react";
import { getCadastros, getCadastrosServerSnapshot, subscribeCadastros } from "@/lib/catalog";

export function useCatalog() {
  return useSyncExternalStore(subscribeCadastros, getCadastros, getCadastrosServerSnapshot);
}
