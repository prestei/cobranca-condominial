import { respostaErroBanco } from "@/lib/api/db-error";
import { findUsuarioPorCredenciais } from "@/lib/auth/credentials";
import { createSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const codigo = typeof record.codigo === "string" ? record.codigo : "";
  const password = typeof record.password === "string" ? record.password : "";

  if (!codigo.trim() || !password) {
    return Response.json({ error: "Informe o código e a senha." }, { status: 400 });
  }

  let usuario;
  try {
    usuario = await findUsuarioPorCredenciais(codigo, password);
  } catch (error) {
    return respostaErroBanco(error);
  }
  if (!usuario) {
    return Response.json({ error: "Código ou senha incorretos." }, { status: 401 });
  }

  await createSession({
    userId: usuario.id,
    email: usuario.email,
    nome: usuario.nome,
    cargoId: usuario.cargoId,
  });

  return Response.json({
    user: {
      userId: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      cargoId: usuario.cargoId,
    },
  });
}
