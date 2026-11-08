"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Icon } from "@/components/icon";
import { Input } from "@/components/input";
import type { BuscaGlobalResultado } from "@/lib/dashboard/busca-global";

type Props = {
  className?: string;
};

export function DashboardBuscaGlobal({ className }: Props) {
  const listId = useId();
  const [termo, setTermo] = useState("");
  const [debounced, setDebounced] = useState("");
  const [resultado, setResultado] = useState<BuscaGlobalResultado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(termo.trim()), 320);
    return () => window.clearTimeout(timer);
  }, [termo]);

  const consultar = useCallback(async () => {
    if (debounced.length < 2) {
      setResultado(null);
      setErro(null);
      return;
    }
    setCarregando(true);
    setErro(null);
    try {
      const qs = new URLSearchParams({ q: debounced });
      const response = await fetch(`/api/dashboard/busca?${qs}`, { credentials: "same-origin" });
      const body = (await response.json()) as { busca?: BuscaGlobalResultado; error?: string };
      if (!response.ok) {
        setResultado(null);
        setErro(body.error ?? "Busca indisponível.");
        return;
      }
      setResultado(body.busca ?? null);
      setAberto(true);
    } catch {
      setResultado(null);
      setErro("Falha de comunicação na busca.");
    } finally {
      setCarregando(false);
    }
  }, [debounced]);

  useEffect(() => {
    void consultar();
  }, [consultar]);

  useEffect(() => {
    function aoClicarFora(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  const semResultados = debounced.length >= 2 && !carregando && !erro && resultado?.categorias.length === 0;

  return (
    <section
      ref={containerRef}
      className={`relative flex flex-col gap-sm rounded-xl border border-border-subtle bg-surface-card p-md shadow-card ${className ?? ""}`}
      aria-label="Busca global da carteira"
    >
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <h2 className="text-headline-sm text-on-surface">Busca global</h2>
        <p className="text-body-sm text-on-surface-variant">RE, condomínio, unidade ou atendimento</p>
      </div>
      <BuscaGlobalInput
        listId={listId}
        value={termo}
        onChange={setTermo}
        onFocus={() => {
          if (resultado && debounced.length >= 2) setAberto(true);
        }}
        carregando={carregando}
      />
      {erro ? <p className="text-body-sm text-status-critical">{erro}</p> : null}
      {semResultados ? (
        <p className="text-body-sm text-on-surface-variant">Nenhum registro autorizado corresponde à busca.</p>
      ) : null}
      {aberto && resultado && resultado.categorias.length > 0 ? (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-40 mt-xs max-h-[min(24rem,70vh)] overflow-y-auto rounded-xl border border-border-subtle bg-surface-card shadow-modal"
        >
          {resultado.categorias.map((categoria) => (
            <div key={categoria.id} className="border-b border-border-subtle last:border-b-0">
              <p className="sticky top-0 bg-surface-subtle px-md py-xs text-label-md font-semibold text-on-surface-variant">
                {categoria.rotulo}
              </p>
              <ul>
                {categoria.itens.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      role="option"
                      className="flex flex-col gap-[2px] px-md py-sm hover:bg-surface-subtle focus-visible:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brass"
                      onClick={() => setAberto(false)}
                    >
                      <span className="text-body-md font-semibold text-on-surface">{item.titulo}</span>
                      <span className="text-body-sm text-on-surface-variant">{item.subtitulo}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function BuscaGlobalInput({
  listId,
  value,
  onChange,
  onFocus,
  carregando,
}: {
  listId: string;
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  carregando: boolean;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant">
        <Icon icon={Search} size="sm" aria-hidden />
      </span>
      <Input
        id="dashboard-busca-global"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        placeholder="Digite RE, condomínio, unidade ou atendimento…"
        aria-controls={listId}
        aria-expanded={carregando || value.length >= 2}
        className="pl-10"
        autoComplete="off"
      />
      {carregando ? (
        <span className="pointer-events-none absolute right-md top-1/2 -translate-y-1/2 text-on-surface-variant">
          <Icon icon={Loader2} size="sm" className="animate-spin" aria-hidden />
        </span>
      ) : null}
    </div>
  );
}
