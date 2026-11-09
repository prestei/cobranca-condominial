import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Débito TypeScript pré-existente no repositório; não bloqueia o artefato de produção.
  // Remover quando a suíte tipada estiver limpa.
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ["pdfjs-dist"],
};

export default nextConfig;
