/** Barreira de reexportação — implementação em `request-catalog-state` (sem `server-only`, usável em testes Node). */
export {
  disableTestCatalog,
  enableTestCatalog,
  getRequestCatalog,
  mutateRequestCatalog,
  runWithCatalog,
  runWithCatalogAsync,
  tryGetRequestCatalog,
} from "@/lib/db/request-catalog-state";
