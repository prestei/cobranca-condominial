import assert from "node:assert/strict";
import test from "node:test";

const RE_NUMERO_INICIAL = 10_000;

function formatarCodigoRe(numero) {
  return `RE-${String(numero).padStart(5, "0")}`;
}

function numeroDoCodigoRe(codigo) {
  if (!codigo?.trim()) return null;
  const match = codigo.trim().toUpperCase().match(/^RE-(\d{5})$/);
  if (!match) return null;
  const numero = Number(match[1]);
  if (!Number.isInteger(numero) || numero < RE_NUMERO_INICIAL) return null;
  return numero;
}

function proximoNumeroReDisponivel(usuarios) {
  let max = RE_NUMERO_INICIAL - 1;
  for (const item of usuarios) {
    const numero = numeroDoCodigoRe(item.codigoRe);
    if (numero !== null) max = Math.max(max, numero);
  }
  return max + 1;
}

function migrarCodigosReUsuarios(usuarios, cargoAtendenteId) {
  const atendentes = usuarios
    .filter((item) => item.cargoId === cargoAtendenteId)
    .sort((a, b) => a.id - b.id);

  const reservados = new Set();
  const atribuicoes = new Map();
  let proximoLivre = RE_NUMERO_INICIAL;

  function reservarProximo() {
    while (reservados.has(formatarCodigoRe(proximoLivre))) {
      proximoLivre += 1;
    }
    const codigo = formatarCodigoRe(proximoLivre);
    reservados.add(codigo);
    proximoLivre += 1;
    return codigo;
  }

  for (const item of atendentes) {
    const numero = numeroDoCodigoRe(item.codigoRe);
    if (numero !== null) {
      const codigo = formatarCodigoRe(numero);
      if (!reservados.has(codigo)) {
        reservados.add(codigo);
        proximoLivre = Math.max(proximoLivre, numero + 1);
        continue;
      }
    }
    atribuicoes.set(item.id, reservarProximo());
  }

  return usuarios.map((item) => {
    if (item.cargoId !== cargoAtendenteId) {
      if (!item.codigoRe) return item;
      const { codigoRe, ...resto } = item;
      return resto;
    }
    const atribuido = atribuicoes.get(item.id);
    if (!atribuido) return item;
    if (item.codigoRe && item.codigoRe.trim().toUpperCase() === atribuido) return item;
    return { ...item, codigoRe: atribuido };
  });
}

test("primeiro atendente migrado recebe RE-10000", () => {
  const ATD = 2;
  const migrados = migrarCodigosReUsuarios(
    [
      { id: 1, cargoId: 1 },
      { id: 5, cargoId: ATD, codigoRe: "RE-001" },
    ],
    ATD,
  );
  assert.equal(migrados.find((u) => u.id === 5)?.codigoRe, "RE-10000");
});

test("sequência RE-10000, RE-10001 na migração por id", () => {
  const ATD = 2;
  const migrados = migrarCodigosReUsuarios(
    [
      { id: 10, cargoId: ATD, codigoRe: "RE-003" },
      { id: 8, cargoId: ATD, codigoRe: "RE-001" },
      { id: 9, cargoId: ATD },
    ],
    ATD,
  );
  assert.equal(migrados.find((u) => u.id === 8)?.codigoRe, "RE-10000");
  assert.equal(migrados.find((u) => u.id === 9)?.codigoRe, "RE-10001");
  assert.equal(migrados.find((u) => u.id === 10)?.codigoRe, "RE-10002");
});

test("advogado não recebe RE na migração", () => {
  const ATD = 2;
  const migrados = migrarCodigosReUsuarios([{ id: 3, cargoId: 3, codigoRe: "RE-99999" }], ATD);
  assert.equal(migrados[0].codigoRe, undefined);
});

test("proximoNumeroReDisponivel após RE-10002 retorna 10003", () => {
  const usuarios = [
    { id: 1, codigoRe: "RE-10000" },
    { id: 2, codigoRe: "RE-10001" },
    { id: 3, codigoRe: "RE-10002" },
  ];
  assert.equal(proximoNumeroReDisponivel(usuarios), 10_003);
});

test("códigos desativados não são reutilizados na sequência", () => {
  const usuarios = [{ id: 1, codigoRe: "RE-10000" }];
  assert.equal(proximoNumeroReDisponivel(usuarios), 10_001);
});

let cadeiaReservaRe = Promise.resolve();

async function reservarCodigoRe(usuarios, alocar) {
  let liberar;
  const portao = new Promise((resolve) => {
    liberar = resolve;
  });
  const anterior = cadeiaReservaRe;
  cadeiaReservaRe = anterior.then(() => portao);
  await anterior;
  try {
    const codigoRe = formatarCodigoRe(proximoNumeroReDisponivel(usuarios));
    return await alocar(codigoRe);
  } finally {
    liberar();
  }
}

test("reservas concorrentes geram RE distintos", async () => {
  cadeiaReservaRe = Promise.resolve();
  const usuarios = [{ id: 1, codigoRe: "RE-10000" }];
  const alocados = [];

  await Promise.all(
    Array.from({ length: 5 }, () =>
      reservarCodigoRe(usuarios, async (codigoRe) => {
        alocados.push(codigoRe);
        usuarios.push({ id: usuarios.length + 1, codigoRe });
      }),
    ),
  );

  assert.equal(alocados.length, 5);
  assert.equal(new Set(alocados).size, 5);
  assert.deepEqual(
    [...alocados].sort(),
    ["RE-10001", "RE-10002", "RE-10003", "RE-10004", "RE-10005"],
  );
});
