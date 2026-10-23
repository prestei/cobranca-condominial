export function respostaErroBanco(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("DATABASE_URL")) {
    return Response.json(
      { error: "Banco de dados não configurado. Defina DATABASE_URL e execute npm run db:migrate." },
      { status: 503 },
    );
  }
  console.error(error);
  return Response.json({ error: "Falha ao acessar o banco de dados." }, { status: 503 });
}
