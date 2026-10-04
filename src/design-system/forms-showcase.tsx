import { DesignSystemPanel, DesignSystemShowcase } from "@/design-system/showcase-layout";
import { FormControlsDemo } from "@/design-system/form-controls-demo";
import { FormField, Input, Select, Textarea } from "@/components/input";

export function FormsShowcase() {
  return (
    <DesignSystemShowcase id="formularios" title="Formulários">
      <DesignSystemPanel>
        <form className="flex flex-col gap-lg">
          <div className="grid grid-cols-1 gap-lg min-[768px]:grid-cols-2">
            <FormField label="Nome completo" htmlFor="ds-name" required>
              <Input id="ds-name" name="name" placeholder="Seu nome completo" />
            </FormField>
            <FormField label="E-mail" htmlFor="ds-email" required>
              <Input id="ds-email" name="email" type="email" placeholder="seu@email.com" />
            </FormField>
          </div>
          <FormField label="Área de interesse" htmlFor="ds-subject">
            <Select id="ds-subject" name="subject" defaultValue="">
              <option value="" disabled>Selecione</option>
              <option value="civil">Direito civil</option>
              <option value="empresarial">Direito empresarial</option>
            </Select>
          </FormField>
          <FormField label="Mensagem" htmlFor="ds-message">
            <Textarea id="ds-message" name="message" placeholder="Escreva sua mensagem..." />
          </FormField>
          <FormField label="Estado de erro" htmlFor="ds-error" error="Este campo é obrigatório.">
            <Input id="ds-error" name="error" defaultValue="Dado inválido" invalid />
          </FormField>
          <FormControlsDemo />
        </form>
      </DesignSystemPanel>
    </DesignSystemShowcase>
  );
}
