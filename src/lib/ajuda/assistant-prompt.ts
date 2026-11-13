import type { PacoteConhecimento } from "@/lib/ajuda/assistant-knowledge";
import type { SessionUser } from "@/lib/auth/types";
import type { PerfilOperacional } from "@/lib/perfil-operacional";

export type MensagemHistorico = { role: "user" | "assistant"; content: string };

export function montarMensagensAssistente(input: {
  user: SessionUser;
  perfil: PerfilOperacional;
  pathname: string;
  contextoTela: string | null;
  pergunta: string;
  historico: MensagemHistorico[];
  conhecimento: PacoteConhecimento;
}): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  const perfilLabel =
    input.perfil === "administradora"
      ? "Administradora / gestão"
      : input.perfil === "advogado"
        ? "Advogado"
        : "Atendente";

  const system = [
    "Você é o assistente de ajuda do Painel jurídico de cobrança condominial (sistema interno do escritório).",
    "Público: usuário final operando o sistema no navegador — não é desenvolvedor.",
    "",
    "## Regras obrigatórias",
    "- Responda sempre em português do Brasil, tom claro e objetivo.",
    `- O colaborador é ${input.user.nome} (perfil operacional: ${perfilLabel}).`,
    "- Use APENAS informações do manual, da documentação do módulo e do resumo da tela fornecidos abaixo.",
    "- NÃO invente botões, campos, fluxos ou permissões que não constem no contexto.",
    "- NÃO explique telas, ações ou dados de módulos em que o colaborador não tem permissão (matriz abaixo).",
    "- NÃO dê instruções técnicas: código-fonte, SQL, APIs, variáveis de ambiente, deploy, integrações internas ou configuração de servidor.",
    "- NÃO oriente a burlar permissões, acessar dados de outras carteiras ou compartilhar credenciais.",
    "- Se a pergunta pedir algo fora do escopo do cargo ou da tela, diga que não pode orientar e indique falar com a administradora ou o manual em /ajuda.",
    "- Se não souber com base no contexto, diga honestamente e sugira o manual ou o suporte interno.",
    "- Foque em *como usar* a tela atual: onde clicar, o que cada área significa, próximos passos.",
    "",
    `## Rota atual: ${input.pathname} (módulo: ${input.conhecimento.modulo})`,
    "",
    "## Permissões deste colaborador (matriz)",
    input.conhecimento.matrizPermissoes,
    "",
    "## Guias do manual liberados para este perfil",
    input.conhecimento.indiceGuias || "(nenhum guia visível)",
  ];

  if (input.conhecimento.guiaAtual) {
    system.push("", "## Guia da tela atual (manual)", input.conhecimento.guiaAtual);
  }

  if (input.conhecimento.docModulo) {
    system.push("", "## Documentação funcional do módulo", input.conhecimento.docModulo);
  }

  if (input.contextoTela) {
    system.push(
      "",
      "## Resumo do que parece visível na tela agora (captura do navegador — pode estar incompleto)",
      input.contextoTela,
    );
  }

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: system.join("\n") },
  ];

  const historicoLimitado = input.historico.slice(-8);
  for (const msg of historicoLimitado) {
    messages.push({ role: msg.role, content: msg.content });
  }

  messages.push({ role: "user", content: input.pergunta.trim() });
  return messages;
}
