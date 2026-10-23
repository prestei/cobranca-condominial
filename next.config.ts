import type { NextConfig } from "next";

/** URLs antigas em inglês → rotas em português. */
const legacyRedirects = [
  ["/access-denied", "/acesso-negado"],
  ["/service-tickets", "/atendimentos"],
  ["/audit", "/auditoria"],
  ["/roles", "/cargos"],
  ["/condominiums", "/condominios"],
  ["/debts", "/debitos"],
  ["/imports", "/importacoes"],
  ["/reports", "/relatorios"],
  ["/units", "/unidades"],
  ["/users", "/usuarios"],
] as const;

const nextConfig: NextConfig = {
  async redirects() {
    return legacyRedirects.map(([source, destination]) => ({
      source,
      destination,
      permanent: false,
    }));
  },
};

export default nextConfig;
