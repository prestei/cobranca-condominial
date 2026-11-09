export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;

  const [{ hidratarCatalogoPersistido }, { substituirEstadoCatalogo }] = await Promise.all([
    import("@/lib/catalogo/persistencia-disco"),
    import("@/data/catalogo"),
  ]);

  await hidratarCatalogoPersistido(substituirEstadoCatalogo);
}
