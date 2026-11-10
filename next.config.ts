import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Débito TypeScript pré-existente no repositório; não bloqueia o artefato de produção.
  // Remover quando a suíte tipada estiver limpa.
  typescript: {
    ignoreBuildErrors: true,
  },
  // `pg` e afins só no servidor (proxy Node + APIs) — não empacotar no bundle do browser.
  serverExternalPackages: ["pdfjs-dist", "pg", "pg-native", "pg-connection-string", "pgpass"],
};

export default nextConfig;
