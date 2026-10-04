import { DesignSystemPanel, DesignSystemShowcase } from "@/design-system/showcase-layout";
import { Alert } from "@/components/alert";

const alertSamples = [
  {
    variant: "info" as const,
    title: "Sincronização agendada",
    body: "Os dados do condomínio serão atualizados automaticamente às 22h.",
  },
  {
    variant: "success" as const,
    title: "Cobrança registrada",
    body: "O pagamento foi confirmado e a unidade saiu da fila de pendências.",
  },
  {
    variant: "warning" as const,
    title: "Prazo próximo",
    body: "Há boletos que vencem nos próximos três dias úteis.",
  },
  {
    variant: "error" as const,
    title: "Falha na integração",
    body: "Não foi possível enviar os dados para o Superlógica. Tente novamente.",
  },
] as const;

export function AlertsShowcase() {
  return (
    <DesignSystemShowcase id="alertas" title="Alertas">
      <DesignSystemPanel className="flex flex-col gap-md">
        <p className="text-body-sm text-on-surface-variant">
          Mensagens de feedback com ícone da{" "}
          <code className="text-body-sm text-on-surface">lucide-react</code> mapeado por variante.
        </p>
        {alertSamples.map((sample) => (
          <Alert key={sample.variant} variant={sample.variant} title={sample.title}>
            {sample.body}
          </Alert>
        ))}
      </DesignSystemPanel>
    </DesignSystemShowcase>
  );
}
