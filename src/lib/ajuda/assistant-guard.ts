export type AvaliacaoPerguntaAssistente =
  | { permitida: true }
  | { permitida: false; resposta: string };

const RECUSA_GENERICA =
  "Não posso atender a esse pedido. O assistente ajuda no uso do painel e em dados da sua sessão, respeitando suas permissões — sem senhas, segredos do sistema nem informações de outras pessoas. Em caso de dúvida, fale com a administradora.";

const PADROES_BLOQUEIO: { re: RegExp; resposta?: string }[] = [
  {
    re: /\b(senha|password|credencial|token|api[_\s-]?key|chave\s+api|openrouter|\.env|vari[aá]vel\s+de\s+ambiente)\b/i,
    resposta:
      "Por segurança, não trato de senhas, tokens nem configuração interna do servidor. Peça à administradora se precisar disso.",
  },
  {
    re: /\b(c[oó]digo[-\s]?fonte|source\s*code|typescript|javascript|prisma|migrate|sql\s+(select|insert|update|delete)|query\s+sql)\b/i,
    resposta: "Não forneço código, SQL nem detalhes técnicos de implementação. O foco é uso do sistema e regras de negócio.",
  },
  {
    re: /\b(burlar|contornar|sem\s+permiss[aã]o|elevar\s+permiss[aã]o|acessar\s+como\s+admin|ver\s+tudo\s+de\s+todos)\b/i,
    resposta: "Não oriento a contornar permissões. Cada colaborador vê só o que o cargo permite; ajustes passam pela administradora.",
  },
  {
    re: /\b(cpf|rne|rg\b|dados\s+pessoais\s+de|e-?mail\s+de\s+(outro|todos)|telefone\s+de\s+(outro|cliente)|endere[cç]o\s+residencial)\b/i,
    resposta:
      "Não exponho dados pessoais sensíveis nem informações de terceiros fora do que já aparece na sua carteira no painel.",
  },
  {
    re: /\b(carteira\s+de\s+(outro|outra)|atendente\s+.+\s+d[eé]bitos|sal[aá]rio|remunerac[aã]o)\b/i,
    resposta: RECUSA_GENERICA,
  },
  {
    re: /\b(hackear|invadir|expl[oó]it|vulnerabilidade|injection|xss)\b/i,
    resposta: "Não ajudo com tentativas de invasão ou exploração do sistema.",
  },
];

/** Sinais de pergunta fora do produto (economiza chamada ao modelo). */
const FORA_DO_PRODUTO =
  /\b(quem\s+ganhou|elei[cç][aã]o|bolsa\s+de\s+valores|receita\s+de\s+bolo|piada|futebol|hor[oó]scopo|clima\s+em)\b/i;

/**
 * Bloqueia pedidos invasivos ou fora do escopo antes de consultar dados ou o modelo.
 */
export function avaliarPerguntaAssistente(pergunta: string): AvaliacaoPerguntaAssistente {
  const texto = pergunta.trim();
  if (!texto) {
    return { permitida: false, resposta: "Escreva uma pergunta sobre o sistema ou seus indicadores." };
  }

  for (const { re, resposta } of PADROES_BLOQUEIO) {
    if (re.test(texto)) {
      return { permitida: false, resposta: resposta ?? RECUSA_GENERICA };
    }
  }

  if (FORA_DO_PRODUTO.test(texto)) {
    return {
      permitida: false,
      resposta:
        "Só respondo sobre o painel de cobrança condominial e seus dados com suas permissões. Para outros assuntos, use outro canal.",
    };
  }

  return { permitida: true };
}