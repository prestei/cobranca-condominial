"use client";

import { useSyncExternalStore } from "react";
import { getCadastros, getCadastrosServerSnapshot, subscribeCadastros } from "@/data/catalogo";

export function useCadastros() {
  return useSyncExternalStore(subscribeCadastros, getCadastros, getCadastrosServerSnapshot);
}
