import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { readSessionToken } from "@/lib/auth/jwt";
import { moduloDaRota } from "@/lib/permissions/modulos";
import { podeAcessarRota } from "@/lib/permissions/check";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";

const PUBLIC_PREFIXES = ["/login", "/api/auth/", "/design-system", "/acesso-negado"];

/** Atalhos legados → abas em /atendimentos (T08 integrado à palitagem). */
const REDIRECT_ROTAS_REMOVIDAS: Record<string, string> = {
  "/fila": "/atendimentos",
  "/distribuicao": "/atendimentos",
  "/retornos": "/atendimentos?retorno=hoje",
};

function isPublicPath(pathname: string) {
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    if (pathname === "/login" || pathname.startsWith("/login/")) {
      const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
      if (token) {
        const session = await readSessionToken(token);
        if (session) {
          return NextResponse.redirect(new URL("/", request.url));
        }
      }
    }
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  const session = await readSessionToken(token);
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  const destinoRemovido = REDIRECT_ROTAS_REMOVIDAS[pathname];
  if (destinoRemovido) {
    const url = new URL(destinoRemovido, request.url);
    if (!destinoRemovido.includes("?")) {
      url.search = request.nextUrl.search;
    }
    return NextResponse.redirect(url);
  }

  const modulo = moduloDaRota(pathname);
  const permissoes = permissoesDoUsuarioId(session.userId);
  if (!podeAcessarRota(permissoes, modulo)) {
    const destino = new URL("/acesso-negado", request.url);
    destino.searchParams.set("modulo", modulo);
    if (pathname !== "/") {
      destino.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(destino);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
