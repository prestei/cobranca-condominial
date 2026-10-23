"use client";

import type { LucideIcon } from "lucide-react";
import {
  Building2,
  ClipboardList,
  DoorOpen,
  FileBarChart,
  FileUp,
  LayoutDashboard,
  Receipt,
  ScrollText,
  Shield,
  UserRound,
} from "lucide-react";
import { Icon } from "@/components/icon";
import { Checkbox, CheckboxField } from "@/components/input";
import { SheetPanel } from "@/components/sheet";
import {
  MODULOS_PERMISSAO,
  type AcaoPermissao,
  type ModuloPermissao,
  type PermissoesCargo,
} from "@/lib/permissions/modulos";
const ICONE_MODULO: Record<ModuloPermissao, LucideIcon> = {
  dashboard: LayoutDashboard,
  atendimentos: ClipboardList,
  debitos: Receipt,
  condominios: Building2,
  unidades: DoorOpen,
  relatorios: FileBarChart,
  importacoes: FileUp,
  usuarios: UserRound,
  cargos: Shield,
  auditoria: ScrollText,
};

const LABEL_ACAO_LEIGO: Record<AcaoPermissao, string> = {
  ler: "Consultar",
  criar: "Cadastrar",
  editar: "Alterar",
  excluir: "Excluir",
  exportar: "Exportar dados",
};

type MatrizPermissoesCargoProps = {
  formId: string;
  permissoes: PermissoesCargo;
  onChange: (permissoes: PermissoesCargo) => void;
};

function alterarPermissao(
  atual: PermissoesCargo,
  modulo: ModuloPermissao,
  acao: AcaoPermissao,
  ativo: boolean,
): PermissoesCargo {
  const next: PermissoesCargo = { ...atual, [modulo]: { ...atual[modulo] } };
  const acoes = next[modulo] ?? {};
  if (ativo) acoes[acao] = true;
  else delete acoes[acao];
  if (Object.keys(acoes).length === 0) delete next[modulo];
  else next[modulo] = acoes;
  return next;
}

export function MatrizPermissoesCargo({ formId, permissoes, onChange }: MatrizPermissoesCargoProps) {
  return (
    <div className="flex flex-col">
      <h3 className="text-label-lg text-on-surface mb-xs">Permissões por área</h3>

      <ul className="flex list-none flex-col gap-sm p-0 m-0">
        {MODULOS_PERMISSAO.map((modulo) => {
          const ModuloIcon = ICONE_MODULO[modulo.id];
          const acoesDisponiveis = modulo.acoes;

          return (
            <li key={modulo.id}>
              <SheetPanel className="flex flex-col gap-md">
                <div className="flex min-w-0 gap-sm">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border-subtle bg-surface-card text-primary-container"
                    aria-hidden="true"
                  >
                    <Icon icon={ModuloIcon} size="sm" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-label-md font-medium text-on-surface">{modulo.label}</p>
                    <p className="mt-xs text-body-sm leading-snug text-on-surface-variant">{modulo.description}</p>
                  </div>
                </div>

                <div
                  className="grid w-full grid-cols-2 gap-x-md gap-y-sm border-t border-border-subtle/70 pt-md min-[768px]:grid-cols-4"
                >
                    {acoesDisponiveis.map((acao) => {
                      const inputId = `${formId}-${modulo.id}-${acao}`;
                      const checked = permissoes[modulo.id]?.[acao] === true;
                      return (
                        <CheckboxField
                          key={acao}
                          className="min-w-0"
                          label={LABEL_ACAO_LEIGO[acao]}
                          htmlFor={inputId}
                        >
                          <Checkbox
                            id={inputId}
                            checked={checked}
                            onChange={(event) =>
                              onChange(alterarPermissao(permissoes, modulo.id, acao, event.target.checked))
                            }
                          />
                        </CheckboxField>
                      );
                    })}
                </div>
              </SheetPanel>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
