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
  RotateCcw,
  Scale,
  ScrollText,
  Shield,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { Checkbox, CheckboxField } from "@/components/input";
import {
  MODULOS_PERMISSAO,
  type AcaoPermissao,
  type ModuloPermissao,
  type PermissoesCargo,
} from "@/lib/permissions/modulos";
import { listarModulosPermitidos } from "@/lib/permissions/parse";

const ICONE_MODULO: Record<ModuloPermissao, LucideIcon> = {
  dashboard: LayoutDashboard,
  atendimentos: ClipboardList,
  debitos: Receipt,
  juridico: Scale,
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
  onRestaurarPadrao?: () => void;
  onDesmarcarTudo?: () => void;
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

export function MatrizPermissoesCargo({
  formId,
  permissoes,
  onChange,
  onRestaurarPadrao,
  onDesmarcarTudo,
}: MatrizPermissoesCargoProps) {
  const modulosAtivos = listarModulosPermitidos(permissoes);
  const modulosAtivosIds = new Set(modulosAtivos.map((item) => item.modulo));
  const totalModulos = MODULOS_PERMISSAO.length;
  const modulosComAcesso = modulosAtivos.length;
  const progresso = totalModulos > 0 ? (modulosComAcesso / totalModulos) * 100 : 0;

  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-col gap-sm">
        <div className="flex flex-wrap items-end justify-between gap-sm">
          <p className="text-label-sm font-semibold uppercase tracking-wide text-on-surface-variant">
            Módulos com acesso
          </p>
          <p className="text-label-md font-semibold tabular-nums text-primary-container">
            {modulosComAcesso}/{totalModulos}
          </p>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-surface-subtle"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={totalModulos}
          aria-valuenow={modulosComAcesso}
          aria-label={`${modulosComAcesso} de ${totalModulos} módulos com permissão`}
        >
          <div
            className="h-full rounded-full bg-primary-container transition-[width] duration-300 ease-out"
            style={{ width: `${progresso}%` }}
          />
        </div>
        {onRestaurarPadrao || onDesmarcarTudo ? (
          <div className="flex flex-wrap justify-end gap-sm pt-xs">
            {onRestaurarPadrao ? (
              <Button type="button" variant="ghost" size="sm" onClick={onRestaurarPadrao}>
                <Icon icon={RotateCcw} size="sm" />
                Restaurar padrão
              </Button>
            ) : null}
            {onDesmarcarTudo ? (
              <Button type="button" variant="outline" size="sm" onClick={onDesmarcarTudo}>
                Desmarcar tudo
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <ul className="m-0 flex list-none flex-col gap-sm p-0">
        {MODULOS_PERMISSAO.map((modulo) => {
          const ModuloIcon = ICONE_MODULO[modulo.id];
          const acoesDisponiveis = modulo.acoes;
          const moduloAtivo = modulosAtivosIds.has(modulo.id);

          return (
            <li key={modulo.id}>
              <article
                className={[
                  "flex flex-col gap-md rounded-xl border bg-surface-card px-sm py-sm shadow-card min-[768px]:px-md min-[768px]:py-md",
                  moduloAtivo ? "border-primary-fixed-dim/50" : "border-border-subtle",
                ].join(" ")}
              >
                <div className="flex min-w-0 gap-sm">
                  <span
                    className={[
                      "flex size-10 shrink-0 items-center justify-center rounded-lg border",
                      moduloAtivo
                        ? "border-primary-fixed-dim/40 bg-primary-fixed/40 text-primary-container"
                        : "border-border-subtle bg-surface-subtle text-on-surface-variant",
                    ].join(" ")}
                    aria-hidden="true"
                  >
                    <Icon icon={ModuloIcon} size="sm" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-label-md font-semibold uppercase tracking-wide text-on-surface">
                      {modulo.label}
                    </p>
                    <p className="mt-xs text-body-sm leading-snug text-on-surface-variant">{modulo.description}</p>
                  </div>
                </div>

                <div className="grid w-full grid-cols-2 gap-x-md gap-y-sm border-t border-border-subtle/70 pt-md min-[768px]:grid-cols-4">
                  {acoesDisponiveis.map((acao) => {
                    const inputId = `${formId}-${modulo.id}-${acao}`;
                    const checked = permissoes[modulo.id]?.[acao] === true;
                    return (
                      <CheckboxField key={acao} className="min-w-0" label={LABEL_ACAO_LEIGO[acao]} htmlFor={inputId}>
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
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
