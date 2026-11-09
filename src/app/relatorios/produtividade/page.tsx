"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SkeletonListPage } from "@/components/skeleton";
import { WorkspaceShell } from "@/components/workspace-shell";

function RedirecionarProdutividade() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const qs = new URLSearchParams();
    if (params) {
      for (const [chave, valor] of params.entries()) {
        qs.set(chave, valor);
      }
    }
    qs.set("relatorio", "produtividade");
    router.replace(`/relatorios?${qs.toString()}`);
  }, [params, router]);

  return (
    <WorkspaceShell>
      <SkeletonListPage metrics={4} label="Carregando produtividade" />
    </WorkspaceShell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<SkeletonListPage metrics={4} label="Carregando produtividade" />}>
      <RedirecionarProdutividade />
    </Suspense>
  );
}
