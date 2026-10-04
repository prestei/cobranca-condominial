import { AlertsShowcase } from "@/design-system/alerts-showcase";
import { BadgesShowcase } from "@/design-system/badges-showcase";
import { ButtonsShowcase } from "@/design-system/buttons-showcase";
import { CardMetricShowcase } from "@/design-system/card-metric-showcase";
import { ColorsShowcase } from "@/design-system/colors-showcase";
import { EmptyStateShowcase } from "@/design-system/empty-state-showcase";
import { FormsShowcase } from "@/design-system/forms-showcase";
import { IconsShowcase } from "@/design-system/icons-showcase";
import { LayoutShowcase } from "@/design-system/layout-showcase";
import { OverlaysShowcase } from "@/design-system/overlays-showcase";
import { SheetShowcase } from "@/design-system/sheet-showcase";
import { DesignSystemCatalogShell } from "@/design-system/showcase-layout";
import { TableShowcase } from "@/design-system/table-showcase";
import { TabsShowcase } from "@/design-system/tabs-showcase";
import { TypographyShowcase } from "@/design-system/typography-showcase";

export function DesignSystemCatalog() {
  return (
    <DesignSystemCatalogShell>
      <ColorsShowcase />
      <TypographyShowcase />
      <LayoutShowcase />
      <IconsShowcase />
      <ButtonsShowcase />
      <FormsShowcase />
      <TabsShowcase />
      <BadgesShowcase />
      <AlertsShowcase />
      <OverlaysShowcase />
      <SheetShowcase />
      <TableShowcase />
      <EmptyStateShowcase />
      <CardMetricShowcase />
    </DesignSystemCatalogShell>
  );
}
