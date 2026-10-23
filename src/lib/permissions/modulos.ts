export const ACOES_PERMISSAO = [
  { id: "ler", label: "Ver" },
  { id: "criar", label: "Criar" },
  { id: "editar", label: "Editar" },
  { id: "excluir", label: "Excluir" },
  { id: "exportar", label: "Exportar" },
] as const;

export type AcaoPermissao = (typeof ACOES_PERMISSAO)[number]["id"];

export const MODULOS_PERMISSAO = [
  {
    id: "dashboard",
    label: "Início",
    description: "Tela inicial com números e avisos importantes.",
    acoes: ["ler"] as const,
  },
  {
    id: "atendimentos",
    label: "Atendimentos",
    description: "Registrar e consultar palitagem e retornos.",
    acoes: ["ler", "criar", "editar", "excluir"] as const,
  },
  {
    id: "debitos",
    label: "Inadimplência",
    description: "Consultar e gerenciar débitos das unidades.",
    acoes: ["ler", "criar", "editar", "excluir"] as const,
  },
  {
    id: "condominios",
    label: "Condomínios",
    description: "Cadastro da carteira de condomínios.",
    acoes: ["ler", "criar", "editar", "excluir"] as const,
  },
  {
    id: "unidades",
    label: "Unidades",
    description: "Unidades, responsáveis e vínculos.",
    acoes: ["ler", "criar", "editar", "excluir"] as const,
  },
  {
    id: "relatorios",
    label: "Relatórios",
    description: "Gráficos e números para acompanhar a operação.",
    acoes: ["ler", "exportar"] as const,
  },
  {
    id: "importacoes",
    label: "Importações",
    description: "Enviar e acompanhar arquivos de débitos e cadastros.",
    acoes: ["ler", "criar", "editar", "excluir"] as const,
  },
  {
    id: "usuarios",
    label: "Colaboradores",
    description: "Quem acessa o sistema e o cargo de cada um.",
    acoes: ["ler", "criar", "editar", "excluir"] as const,
  },
  {
    id: "cargos",
    label: "Cargos",
    description: "Perfis e matriz de permissões por módulo.",
    acoes: ["ler", "criar", "editar", "excluir"] as const,
  },
  {
    id: "auditoria",
    label: "Auditoria",
    description: "Histórico de alterações no sistema.",
    acoes: ["ler"] as const,
  },
] as const;

export type ModuloPermissao = (typeof MODULOS_PERMISSAO)[number]["id"];

export type PermissoesCargo = {
  [K in ModuloPermissao]?: Partial<Record<AcaoPermissao, boolean>>;
};

export const ROTAS_MODULO: Array<{ prefix: string; modulo: ModuloPermissao }> = [
  { prefix: "/api/users", modulo: "usuarios" },
  { prefix: "/api/roles", modulo: "cargos" },
  { prefix: "/api/unidades", modulo: "unidades" },
  { prefix: "/atendimentos", modulo: "atendimentos" },
  { prefix: "/debitos", modulo: "debitos" },
  { prefix: "/condominios", modulo: "condominios" },
  { prefix: "/unidades", modulo: "unidades" },
  { prefix: "/relatorios", modulo: "relatorios" },
  { prefix: "/importacoes", modulo: "importacoes" },
  { prefix: "/usuarios", modulo: "usuarios" },
  { prefix: "/cargos", modulo: "cargos" },
  { prefix: "/auditoria", modulo: "auditoria" },
];

export function moduloDaRota(pathname: string): ModuloPermissao {
  if (pathname === "/" || pathname.startsWith("/?")) return "dashboard";
  const match = ROTAS_MODULO.find((item) => pathname === item.prefix || pathname.startsWith(`${item.prefix}/`));
  return match?.modulo ?? "dashboard";
}

export function acoesDoModulo(modulo: ModuloPermissao): readonly AcaoPermissao[] {
  const found = MODULOS_PERMISSAO.find((item) => item.id === modulo);
  return found?.acoes ?? ["ler"];
}
