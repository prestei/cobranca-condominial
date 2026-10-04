"use client";

import { useState } from "react";
import {
  Checkbox,
  CheckboxField,
  Radio,
  RadioField,
  Switch,
  SwitchField,
} from "@/components/input";

export function FormControlsDemo() {
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [situation, setSituation] = useState<"ativo" | "pendente">("ativo");
  const [notifications, setNotifications] = useState(false);

  return (
    <div className="flex flex-col gap-lg border-t border-border-subtle pt-lg">
      <div>
        <h3 className="text-label-lg text-on-surface">Seleção</h3>
        <p className="mt-xs text-body-sm text-on-surface-variant">
          Checkbox, radio e switch com estilo primário navy e foco brass.
        </p>
      </div>

      <div className="flex flex-col gap-md">
        <CheckboxField label="Aceito receber comunicações sobre a carteira" htmlFor="ds-terms">
          <Checkbox
            id="ds-terms"
            checked={termsAccepted}
            onChange={(event) => setTermsAccepted(event.target.checked)}
          />
        </CheckboxField>

        <fieldset className="flex flex-col gap-sm">
          <legend className="text-label-lg text-primary-container">Situação do condomínio</legend>
          <RadioField label="Ativo na carteira" htmlFor="ds-situation-active">
            <Radio
              id="ds-situation-active"
              name="ds-situation"
              value="ativo"
              checked={situation === "ativo"}
              onChange={() => setSituation("ativo")}
            />
          </RadioField>
          <RadioField label="Pendente de regularização" htmlFor="ds-situation-pending">
            <Radio
              id="ds-situation-pending"
              name="ds-situation"
              value="pendente"
              checked={situation === "pendente"}
              onChange={() => setSituation("pendente")}
            />
          </RadioField>
        </fieldset>

        <SwitchField
          label="Notificações por e-mail"
          htmlFor="ds-notifications"
          description="Avisos de vencimento e alterações na integração."
        >
          <Switch
            id="ds-notifications"
            checked={notifications}
            onChange={(event) => setNotifications(event.target.checked)}
          />
        </SwitchField>

        <div className="flex flex-wrap items-center gap-lg rounded-lg border border-border-subtle bg-surface-subtle/50 p-md">
          <label className="inline-flex items-center gap-sm text-body-sm text-on-surface-variant">
            <Checkbox disabled checked aria-label="Checkbox desabilitado marcado" />
            Desabilitado
          </label>
          <label className="inline-flex items-center gap-sm text-body-sm text-on-surface-variant">
            <Radio disabled name="ds-disabled-radio" aria-label="Radio desabilitado" />
            Radio off
          </label>
          <label className="inline-flex items-center gap-sm text-body-sm text-on-surface-variant">
            <Switch disabled aria-label="Switch desabilitado" />
            Switch off
          </label>
        </div>
      </div>
    </div>
  );
}
