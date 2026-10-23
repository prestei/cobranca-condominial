/** Dados fictícios para preencher gráficos e tabelas em demonstração (layout e telas de exemplo). */

export type LinhaCruzamento = {
  unidade: string;
  condominio: string;
  contatos: number;
  resultado: string;
};

export type LinhaContagem = {
  nome: string;
  quantidade: number;
  percentual: number;
};

export type LinhaSerie = {
  nome: string;
  quantidade: number;
};

export type LinhaMeio = LinhaContagem & { resposta: number };

export type LinhaResumoCondominio = {
  nome: string;
  quantidade: number;
  resposta: number;
  unidades: number;
  ultimo: string;
};

export type LinhaStatsUnidade = {
  unidadeId: number;
  nome: string;
  condominio: string;
  contatos: number;
  resposta: number;
  valorAberto: number;
  dias: number;
  cobrancas: number;
  ultimo: string;
};

export type CelulaCalor = { x: number; y: number; v: number };

export function exemploCruzamento(): LinhaCruzamento[] {
  return [
    { unidade: "Azaleias - 102", condominio: "Azaleias", contatos: 5, resultado: "Pagou no mês seguinte" },
    { unidade: "Green Village - Sala 3", condominio: "Green Village", contatos: 3, resultado: "Acordo no mês seguinte" },
    { unidade: "Pedra de Aleluia - 12", condominio: "Pedra de Aleluia", contatos: 2, resultado: "Sem resultado no mês seguinte" },
    { unidade: "Azaleias - 101", condominio: "Azaleias", contatos: 4, resultado: "Pagou no mês seguinte" },
    { unidade: "Morada Imperial - 304", condominio: "Morada Imperial", contatos: 2, resultado: "Acordo no mês seguinte" },
  ];
}

export function exemploSerieAtendimentos(): LinhaSerie[] {
  return [
    { nome: "29/09", quantidade: 4 },
    { nome: "30/09", quantidade: 7 },
    { nome: "01/10", quantidade: 5 },
    { nome: "02/10", quantidade: 9 },
    { nome: "03/10", quantidade: 6 },
    { nome: "04/10", quantidade: 8 },
    { nome: "05/10", quantidade: 11 },
  ];
}

export function exemploRespondeuGrupo(): LinhaContagem[] {
  return [
    { nome: "Sim", quantidade: 18, percentual: 62 },
    { nome: "Não", quantidade: 11, percentual: 38 },
  ];
}

export function exemploPorMotivo(): LinhaContagem[] {
  return [
    { nome: "Dificuldade financeira", quantidade: 8, percentual: 32 },
    { nome: "Esqueceu o vencimento", quantidade: 5, percentual: 20 },
    { nome: "Aguarda proposta de acordo", quantidade: 4, percentual: 16 },
    { nome: "Não recebeu o boleto", quantidade: 3, percentual: 12 },
    { nome: "Já pagou (enviar comprovante)", quantidade: 2, percentual: 8 },
  ];
}

export function exemploMeios(): LinhaMeio[] {
  return [
    { nome: "WhatsApp", quantidade: 14, percentual: 48, resposta: 71 },
    { nome: "Ligação", quantidade: 9, percentual: 31, resposta: 55 },
    { nome: "E-mail", quantidade: 4, percentual: 14, resposta: 50 },
    { nome: "Presencial", quantidade: 2, percentual: 7, resposta: 100 },
  ];
}

export function exemploResumoCondominio(): LinhaResumoCondominio[] {
  return [
    { nome: "Azaleias", quantidade: 12, resposta: 58, unidades: 8, ultimo: "05/10/2026" },
    { nome: "Green Village", quantidade: 7, resposta: 43, unidades: 5, ultimo: "04/10/2026" },
    { nome: "Pedra de Aleluia", quantidade: 5, resposta: 40, unidades: 4, ultimo: "03/10/2026" },
    { nome: "Morada Imperial", quantidade: 4, resposta: 75, unidades: 3, ultimo: "02/10/2026" },
  ];
}

export function exemploPorAtendente(): Array<{ nome: string; quantidade: number; resposta: number; unidades: number; atrasados: number }> {
  return [
    { nome: "Raquel", quantidade: 14, resposta: 64, unidades: 11, atrasados: 1 },
    { nome: "Tássia", quantidade: 11, resposta: 55, unidades: 9, atrasados: 0 },
    { nome: "Atendente nº 3", quantidade: 8, resposta: 50, unidades: 6, atrasados: 2 },
  ];
}

export function exemploPorAdvogado(): LinhaContagem[] {
  return [
    { nome: "Dra. Thamires", quantidade: 11, percentual: 38 },
    { nome: "Dra. Jullyane", quantidade: 10, percentual: 34 },
    { nome: "Dr. João", quantidade: 8, percentual: 28 },
  ];
}

export function exemploStatsPorUnidade(): LinhaStatsUnidade[] {
  return [
    {
      unidadeId: -1,
      nome: "Azaleias - 102",
      condominio: "Azaleias",
      contatos: 5,
      resposta: 60,
      valorAberto: 1272,
      dias: 148,
      cobrancas: 2,
      ultimo: "05/10/2026",
    },
    {
      unidadeId: -2,
      nome: "Green Village - Sala 3",
      condominio: "Green Village",
      contatos: 3,
      resposta: 33,
      valorAberto: 890,
      dias: 60,
      cobrancas: 1,
      ultimo: "04/10/2026",
    },
    {
      unidadeId: -3,
      nome: "Pedra de Aleluia - 12",
      condominio: "Pedra de Aleluia",
      contatos: 2,
      resposta: 50,
      valorAberto: 2150,
      dias: 95,
      cobrancas: 3,
      ultimo: "03/10/2026",
    },
    {
      unidadeId: -4,
      nome: "Morada Imperial - 304",
      condominio: "Morada Imperial",
      contatos: 4,
      resposta: 75,
      valorAberto: 714,
      dias: 45,
      cobrancas: 1,
      ultimo: "02/10/2026",
    },
  ];
}

export function exemploCalor(): CelulaCalor[] {
  const horas = [9, 10, 11, 14, 15, 16, 17];
  const dias = [1, 2, 3, 4, 5];
  const celulas: CelulaCalor[] = [];
  for (const y of dias) {
    for (const x of horas) {
      celulas.push({ x, y, v: 1 + ((x + y) % 4) });
    }
  }
  return celulas;
}

export function exemploRetornosTabela(): string[][] {
  return [
    ["06/10/2026", "Azaleias", "Azaleias - 102", "Raquel", "Confirmar pagamento", "Hoje"],
    ["07/10/2026", "Green Village", "Green Village - Sala 3", "Tássia", "Enviar boleto", "Próximos 7 dias"],
    ["04/10/2026", "Pedra de Aleluia", "Pedra de Aleluia - 12", "Raquel", "Retorno combinado", "Atrasado"],
  ];
}

export function exemploListaAtendimentos(): string[][] {
  return [
    ["05/10/2026", "Azaleias", "Azaleias - 102", "Raquel", "WhatsApp", "Sim", "Dificuldade financeira"],
    ["04/10/2026", "Green Village", "Green Village - Sala 3", "Tássia", "Ligação", "Não", "—"],
    ["03/10/2026", "Pedra de Aleluia", "Pedra de Aleluia - 12", "Raquel", "WhatsApp", "Sim", "Aguarda proposta de acordo"],
  ];
}

export function exemploRetornosSituacao(): LinhaContagem[] {
  return [
    { nome: "Atrasado", quantidade: 2, percentual: 40 },
    { nome: "Hoje", quantidade: 1, percentual: 20 },
    { nome: "Próximos 7 dias", quantidade: 2, percentual: 40 },
  ];
}

export function exemploRetornosPorAtendente(): LinhaContagem[] {
  return [
    { nome: "Raquel", quantidade: 3, percentual: 60 },
    { nome: "Tássia", quantidade: 2, percentual: 40 },
  ];
}

/** Grade 7×13 (dom–sáb, 7h–19h) com pico em dias úteis. */
export function exemploCalorCompleto(horas: number[]): CelulaCalor[] {
  const celulas: CelulaCalor[] = [];
  for (let dia = 0; dia < 7; dia += 1) {
    for (const hora of horas) {
      const util = dia >= 1 && dia <= 5 && hora >= 9 && hora <= 17;
      celulas.push({ x: hora, y: dia, v: util ? 1 + ((hora + dia) % 4) : 0 });
    }
  }
  return celulas;
}
