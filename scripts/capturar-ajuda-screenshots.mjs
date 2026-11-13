/**
 * Gera capturas reais das telas para o manual em /ajuda.
 * Uso: npx playwright install chromium && node scripts/capturar-ajuda-screenshots.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "public", "ajuda", "capturas");
const baseUrl = process.env.AJUDA_CAPTURE_URL ?? "http://localhost:3000";

/** Telas da administradora (Usuário Teste / 12345). */
const telasAdmin = [
  { id: "ajuda", path: "/ajuda" },
  { id: "inicio", path: "/" },
  { id: "atendimentos", path: "/atendimentos" },
  { id: "inadimplencia", path: "/debitos" },
  { id: "negociacoes", path: "/negociacoes" },
  { id: "juridico", path: "/juridico" },
  { id: "condominios", path: "/condominios" },
  { id: "unidades", path: "/unidades" },
  { id: "relatorios", path: "/relatorios" },
  { id: "importacoes", path: "/importacoes" },
  { id: "colaboradores", path: "/usuarios" },
  { id: "cargos", path: "/cargos" },
  { id: "auditoria", path: "/auditoria" },
  { id: "notificacoes", path: "/notificacoes" },
  { id: "conta", path: "/conta" },
];

const telasAtendente = [{ id: "agenda", path: "/minha-agenda" }];

async function login(page, codigo, senha) {
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.locator('input[name="codigo"]').waitFor({ state: "visible", timeout: 30_000 });
  await page.locator('input[name="codigo"]').fill(codigo);
  await page.locator('input[name="password"]').fill(senha);
  await page.getByRole("button", { name: /^Entrar$/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 });
  await page.waitForTimeout(800);
}

async function capturar(page, telas) {
  for (const tela of telas) {
    await page.goto(`${baseUrl}${tela.path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    const file = path.join(outDir, `${tela.id}.png`);
    await page.screenshot({
      path: file,
      fullPage: false,
      animations: "disabled",
    });
    console.log("OK", tela.id, "→", path.relative(root, file));
  }
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const viewport = { width: 1440, height: 900 };
  const deviceScaleFactor = 1;

  const adminContext = await browser.newContext({ viewport, deviceScaleFactor });
  const admin = await adminContext.newPage();
  await login(admin, "12345", "12345");
  await capturar(admin, telasAdmin);
  await adminContext.close();

  const atendenteContext = await browser.newContext({ viewport, deviceScaleFactor });
  const atendente = await atendenteContext.newPage();
  await login(atendente, "RAQUEL", "12345");
  await capturar(atendente, telasAtendente);
  await atendenteContext.close();

  await browser.close();
  console.log("Capturas concluídas em", outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
