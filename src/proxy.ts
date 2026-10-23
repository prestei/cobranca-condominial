import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { readSessionToken } from "@/lib/auth/jwt";
import { moduloDaRota } from "@/lib/permissions/modulos";
import { podeAcessarRota } from "@/lib/permissions/check";
import { permissoesDaSessao } from "@/lib/roles/server-permissions";

const PUBLIC_PREFIXES = ["/login", "/api/auth/", "/design-system", "/acesso-negado"];

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

  const modulo = moduloDaRota(pathname);
  let permissoes;
  try {
    permissoes = await permissoesDaSessao(session);
  } catch {
    const destino = new URL("/acesso-negado", request.url);
    destino.searchParams.set("modulo", modulo);
    return NextResponse.redirect(destino);
  }
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
