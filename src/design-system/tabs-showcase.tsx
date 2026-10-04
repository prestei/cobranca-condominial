"use client";

import { DesignSystemPanel, DesignSystemShowcase } from "@/design-system/showcase-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs";

export function TabsShowcase() {
  return (
    <DesignSystemShowcase id="navegacao" title="Navegação (tabs)">
      <DesignSystemPanel>
        <Tabs defaultValue="areas">
          <TabsList>
            <TabsTrigger value="areas">Áreas de atuação</TabsTrigger>
            <TabsTrigger value="sobre">Quem somos</TabsTrigger>
            <TabsTrigger value="equipe">Nossa equipe</TabsTrigger>
          </TabsList>
          <div className="mt-lg">
            <TabsContent value="areas">
              Conteúdo da aba selecionada com espaçamento adequado.
            </TabsContent>
            <TabsContent value="sobre">História e valores do escritório.</TabsContent>
            <TabsContent value="equipe">Advogados e especialidades.</TabsContent>
          </div>
        </Tabs>
      </DesignSystemPanel>
    </DesignSystemShowcase>
  );
}
