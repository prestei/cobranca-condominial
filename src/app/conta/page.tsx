"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useContaProfile } from "@/context/conta-profile-context";

/** Atalho legado (/conta): abre o sheet e volta à rota atual sem trocar de página. */
export default function ContaPage() {
  const { openContaProfile } = useContaProfile();
  const router = useRouter();

  useEffect(() => {
    openContaProfile();
    router.replace("/");
  }, [openContaProfile, router]);

  return null;
}
