"use client";

import type {
  ChangeEvent,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { forwardRef, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, isValidElement, Children } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { Icon } from "@/components/icon";

const checkboxClassName = [
  "size-3.5 shrink-0 cursor-pointer appearance-none rounded-sm border border-border-strong bg-surface-card bg-center bg-no-repeat",
  "transition-[background-color,border-color,box-shadow] duration-150",
  "checked:border-primary-container checked:bg-primary-container checked:bg-[length:0.625rem]",
  "checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20viewBox%3D%270%200%2010%2010%27%20fill%3D%27none%27%3E%3Cpath%20d%3D%27M2%205.25%204.25%207.5%208%202.75%27%20stroke%3D%27%23ffffff%27%20stroke-width%3D%271.35%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27/%3E%3C/svg%3E')]",
  "focus-visible:border-brass focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brass/20",
  "disabled:cursor-not-allowed disabled:opacity-60",
  "aria-invalid:border-status-critical aria-invalid:focus-visible:border-status-critical aria-invalid:focus-visible:ring-status-critical/20",
].join(" ");

const radioClassName = [
  "size-3.5 shrink-0 cursor-pointer appearance-none rounded-full border border-border-strong bg-surface-card",
  "transition-[background-color,border-color,box-shadow] duration-150",
  "checked:border-primary-container checked:bg-primary-container checked:shadow-[inset_0_0_0_2px_var(--color-surface-card)]",
  "focus-visible:border-brass focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brass)_20%,transparent)]",
  "checked:focus-visible:shadow-[inset_0_0_0_2px_var(--color-surface-card),0_0_0_3px_color-mix(in_srgb,var(--color-brass)_20%,transparent)]",
  "disabled:cursor-not-allowed disabled:opacity-60",
  "aria-invalid:border-status-critical",
].join(" ");

const switchTrackClassName = [
  "relative inline-flex h-[1.375rem] w-11 shrink-0 rounded-full border border-border-strong bg-surface-container",
  "transition-[background-color,border-color,box-shadow] duration-150",
  "has-[:checked]:border-primary-container has-[:checked]:bg-primary-container",
  "has-[:focus-visible]:border-brass has-[:focus-visible]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brass)_20%,transparent)]",
  "has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60",
  "has-[input[aria-invalid=true]]:border-status-critical",
].join(" ");

const switchInputClassName =
  "peer absolute inset-0 z-10 m-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed";

const switchThumbClassName = [
  "pointer-events-none absolute top-0.5 left-0.5 size-[1.125rem] rounded-full bg-surface-card",
  "shadow-[0_1px_2px_rgb(32_51_71/14%)] transition-[transform,background-color,box-shadow] duration-150 ease-out",
  "peer-checked:translate-x-[1.375rem] peer-checked:bg-on-primary peer-checked:shadow-none",
].join(" ");

export const formControlClassName =
  "h-input w-full rounded-md border bg-surface-card pl-[calc(var(--spacing-md)-5px)] text-body-md text-on-surface transition-colors duration-150 placeholder:text-on-surface-variant focus-visible:border-brass focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brass/20 disabled:cursor-not-allowed disabled:opacity-60";

function controlStateClass(invalid?: boolean) {
  return invalid
    ? "border-status-critical focus-visible:border-status-critical focus-visible:ring-status-critical/20"
    : "border-border-strong";
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export function Input({ className, invalid, ...props }: InputProps) {
  return (
    <input
      className={`${formControlClassName} pr-md ${controlStateClass(invalid)} ${className ?? ""}`}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export function Textarea({ className, invalid, rows = 3, ...props }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      className={`${formControlClassName} min-h-[calc(var(--spacing-input)*2)] resize-y py-sm pr-md ${controlStateClass(invalid)} ${className ?? ""}`}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
};

type OpcaoSelect = {
  value: string;
  label: string;
  disabled: boolean;
};

function textoDoNo(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textoDoNo).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textoDoNo(node.props.children);
  return "";
}

function opcoesDoSelect(children: ReactNode) {
  const opcoes: OpcaoSelect[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement<{ value?: string | number; disabled?: boolean; children?: ReactNode }>(child)) return;
    if (child.type === "optgroup") {
      opcoes.push(...opcoesDoSelect(child.props.children));
      return;
    }
    if (child.type !== "option") return;
    opcoes.push({
      value: child.props.value === undefined ? textoDoNo(child.props.children) : String(child.props.value),
      label: textoDoNo(child.props.children),
      disabled: Boolean(child.props.disabled),
    });
  });
  return opcoes;
}

function useCliente() {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}

export function Select({
  className,
  invalid,
  children,
  value,
  defaultValue,
  onChange,
  disabled,
  id,
  name,
  required,
}: SelectProps) {
  const gerado = useId();
  const listaId = `${id ?? gerado}-lista`;
  const buscaId = `${id ?? gerado}-busca`;
  const raizRef = useRef<HTMLSpanElement>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);
  const cliente = useCliente();
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [interno, setInterno] = useState(defaultValue === undefined ? "" : String(defaultValue));
  const [painelPai, setPainelPai] = useState<HTMLElement | null>(null);
  const valor = value === undefined ? interno : String(value);
  const opcoes = opcoesDoSelect(children);
  const selecionada = opcoes.find((item) => item.value === valor);
  const consulta = busca.trim().toLocaleLowerCase("pt-BR");
  const visiveis = consulta
    ? opcoes.filter((item) => item.label.toLocaleLowerCase("pt-BR").includes(consulta))
    : opcoes;

  function fechar() {
    setAberto(false);
    setBusca("");
  }

  function escolher(opcao: OpcaoSelect) {
    if (opcao.disabled) return;
    if (value === undefined) setInterno(opcao.value);
    onChange?.({
      target: { value: opcao.value, name: name ?? "" },
      currentTarget: { value: opcao.value, name: name ?? "" },
    } as ChangeEvent<HTMLSelectElement>);
    fechar();
  }

  function abrir() {
    if (disabled) return;
    setPainelPai((botaoRef.current?.closest("dialog") as HTMLElement | null) ?? document.body);
    setAberto(true);
  }

  useLayoutEffect(() => {
    if (!aberto) return;
    const botao = botaoRef.current;
    const painel = painelRef.current;
    if (!botao || !painel) return;

    function posicionar() {
      if (!botao || !painel) return;
      const rect = botao.getBoundingClientRect();
      const folga = 4;
      const espacoAbaixo = window.innerHeight - rect.bottom;
      const abrirParaCima = espacoAbaixo < 220 && rect.top > espacoAbaixo;
      const altura = Math.min(320, (abrirParaCima ? rect.top : espacoAbaixo) - 16);
      painel.style.width = `${rect.width}px`;
      painel.style.left = `${rect.left}px`;
      painel.style.maxHeight = `${Math.max(160, altura)}px`;
      if (abrirParaCima) {
        painel.style.top = "auto";
        painel.style.bottom = `${window.innerHeight - rect.top + folga}px`;
      } else {
        painel.style.bottom = "auto";
        painel.style.top = `${rect.bottom + folga}px`;
      }
    }

    posicionar();
    window.addEventListener("resize", posicionar);
    window.addEventListener("scroll", posicionar, true);
    return () => {
      window.removeEventListener("resize", posicionar);
      window.removeEventListener("scroll", posicionar, true);
    };
  }, [aberto]);

  useLayoutEffect(() => {
    if (!aberto) return;
    painelRef.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, [aberto]);

  useLayoutEffect(() => {
    if (!aberto) return;
    function fecharSeFora(event: MouseEvent) {
      const alvo = event.target as Node;
      if (raizRef.current?.contains(alvo) || painelRef.current?.contains(alvo)) return;
      fechar();
    }
    function fecharComEscape(event: KeyboardEvent) {
      if (event.key === "Escape") fechar();
    }
    document.addEventListener("mousedown", fecharSeFora);
    document.addEventListener("keydown", fecharComEscape);
    return () => {
      document.removeEventListener("mousedown", fecharSeFora);
      document.removeEventListener("keydown", fecharComEscape);
    };
  }, [aberto]);

  const painel = (
    <div
      ref={painelRef}
      id={listaId}
      className="fixed z-50 flex min-h-0 flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface-card shadow-popover"
    >
      <div className="shrink-0 border-b border-border-subtle p-sm">
        <Input
          id={buscaId}
          value={busca}
          placeholder="Buscar"
          aria-label="Buscar"
          onChange={(event) => setBusca(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            const primeira = visiveis.find((item) => !item.disabled);
            if (primeira) escolher(primeira);
          }}
        />
      </div>
      <div role="listbox" aria-label="Opções" className="min-h-0 flex-1 overflow-y-auto py-xs">
        {visiveis.length === 0 ? (
          <p className="px-md py-sm text-body-sm text-on-surface-variant">Nenhum resultado</p>
        ) : (
          visiveis.map((item) => (
            <button
              key={`${item.value}-${item.label}`}
              type="button"
              role="option"
              aria-selected={item.value === valor}
              disabled={item.disabled}
              className={`block w-full px-md py-sm text-left text-body-md text-on-surface hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-60 ${item.value === valor ? "bg-surface-subtle font-semibold" : ""}`}
              onClick={() => escolher(item)}
            >
              {item.label}
            </button>
          ))
        )}
      </div>
    </div>
  );

  return (
    <span ref={raizRef} className="relative block w-full">
      <button
        ref={botaoRef}
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={aberto ? listaId : undefined}
        aria-required={required || undefined}
        aria-invalid={invalid || undefined}
        className={`${formControlClassName} peer flex cursor-pointer items-center pr-[calc(var(--spacing-md)+1rem+var(--spacing-sm))] text-left ${controlStateClass(invalid)} ${className ?? ""}`}
        onClick={() => (aberto ? fechar() : abrir())}
      >
        <span className={`truncate ${selecionada ? "" : "text-on-surface-variant"}`}>{selecionada?.label ?? "Selecione"}</span>
      </button>
      {name ? <input type="hidden" name={name} value={valor} /> : null}
      <Icon
        icon={ChevronDown}
        size="sm"
        className="pointer-events-none absolute top-1/2 right-md -translate-y-1/2 text-on-surface-variant peer-disabled:opacity-60"
      />
      {aberto && cliente && painelPai ? createPortal(painel, painelPai) : null}
    </span>
  );
}

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  invalid?: boolean;
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className, invalid, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={`${checkboxClassName} ${className ?? ""}`}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
});

type RadioProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  invalid?: boolean;
};

export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { className, invalid, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type="radio"
      className={`${radioClassName} ${className ?? ""}`}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
});

type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  invalid?: boolean;
};

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { className, invalid, role = "switch", ...props },
  ref,
) {
  return (
    <span className={`${switchTrackClassName} ${className ?? ""}`}>
      <input
        ref={ref}
        type="checkbox"
        role={role}
        className={switchInputClassName}
        aria-invalid={invalid || undefined}
        {...props}
      />
      <span className={switchThumbClassName} aria-hidden="true" />
    </span>
  );
});

type ChoiceFieldProps = {
  label: string;
  htmlFor: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function CheckboxField({ label, htmlFor, description, children, className }: ChoiceFieldProps) {
  return (
    <div className={`flex flex-col gap-xs ${className ?? ""}`}>
      <label htmlFor={htmlFor} className="inline-flex cursor-pointer items-start gap-sm">
        {children}
        <span className="text-body-md text-on-surface">{label}</span>
      </label>
      {description ? <p className="pl-[calc(0.875rem+var(--spacing-sm))] text-body-sm text-on-surface-variant">{description}</p> : null}
    </div>
  );
}

export function RadioField({ label, htmlFor, description, children, className }: ChoiceFieldProps) {
  return (
    <div className={`flex flex-col gap-xs ${className ?? ""}`}>
      <label htmlFor={htmlFor} className="inline-flex cursor-pointer items-start gap-sm">
        {children}
        <span className="text-body-md text-on-surface">{label}</span>
      </label>
      {description ? <p className="pl-[calc(0.875rem+var(--spacing-sm))] text-body-sm text-on-surface-variant">{description}</p> : null}
    </div>
  );
}

export function SwitchField({ label, htmlFor, description, children, className }: ChoiceFieldProps) {
  return (
    <div className={`flex flex-col gap-xs ${className ?? ""}`}>
      <label htmlFor={htmlFor} className="inline-flex cursor-pointer items-center gap-sm">
        {children}
        <span className="text-body-md text-on-surface">{label}</span>
      </label>
      {description ? <p className="pl-[calc(2.75rem+var(--spacing-sm))] text-body-sm text-on-surface-variant">{description}</p> : null}
    </div>
  );
}

type FormFieldProps = {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
  className?: string;
};

export function FormField({ label, htmlFor, required, error, children, className }: FormFieldProps) {
  const invalid = Boolean(error);

  return (
    <div className={`flex flex-col gap-xs ${className ?? ""}`}>
      <label
        htmlFor={htmlFor}
        className={`text-label-lg ${invalid ? "text-status-critical" : "text-primary-container"}`}
      >
        {label}
        {required ? <span className="text-status-critical"> *</span> : null}
      </label>
      {children}
      {error ? <p className="text-body-sm leading-none text-status-critical">{error}</p> : null}
    </div>
  );
}
