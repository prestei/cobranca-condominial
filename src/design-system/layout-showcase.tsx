import { DesignSystemShowcase } from "@/design-system/showcase-layout";
import { AppShellShowcase } from "@/design-system/app-shell-showcase";

export function LayoutShowcase() {
  return (
    <DesignSystemShowcase id="layout" title="Layout da aplicação">
      <p className="text-body-sm text-on-surface-variant">
        Barra lateral recolhível (264px / 84px), badge de carteira, header com busca, notificações e conta, faixa de
        página com breadcrumb e ações, e conteúdo com métricas e tabela. No smartphone, menu em drawer.
      </p>
      <AppShellShowcase embedded />
    </DesignSystemShowcase>
  );
}
