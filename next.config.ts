import type { NextConfig } from "next";

const legacyRedirects = [
  ["/acesso-negado", "/access-denied"],
  ["/atendimentos", "/service-tickets"],
  ["/auditoria", "/audit"],
  ["/cargos", "/roles"],
  ["/condominios", "/condominiums"],
  ["/debitos", "/debts"],
  ["/importacoes", "/imports"],
  ["/relatorios", "/reports"],
  ["/unidades", "/units"],
  ["/usuarios", "/users"],
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
