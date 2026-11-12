"use client";

import { Mail, MessageCircle, UserRound } from "lucide-react";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { WhatsappIcon } from "@/components/icons/whatsapp-icon";
import { useToast } from "@/components/toast";
import { nomeCondominio } from "@/data/catalogo";
import { useCadastros } from "@/hooks/use-cadastros";
import {
  contatoResponsavelDaUnidade,
  hrefMailto,
  hrefWhatsApp,
  mensagemCobrancaWhatsApp,
  numeroWhatsAppPreferido,
  type CanalAtalhoContato,
} from "@/lib/contato-responsavel";

type AtalhosContatoAtendenteProps = {
  unidadeId: number;
  condominioId: number;
  identificacao: string;
  bloco?: string | null;
  compacto?: boolean;
  /** Botões horizontais grandes do mock da tela de Atendimentos. */
  operacao?: boolean;
  onIniciar: (canal: Extract<CanalAtalhoContato, "WhatsApp" | "E-mail">) => void;
};

function rotuloUnidade(identificacao: string, bloco?: string | null) {
  if (bloco) return `${identificacao} - ${bloco}`;
  return identificacao;
}

export function AtalhosContatoAtendente({
  unidadeId,
  condominioId,
  identificacao,
  bloco,
  compacto = false,
  operacao = false,
  onIniciar,
}: AtalhosContatoAtendenteProps) {
  const { toast } = useToast();
  const cadastros = useCadastros();
  const contato = contatoResponsavelDaUnidade(cadastros, unidadeId);
  const condominio = nomeCondominio(condominioId, cadastros);
  const unidade = rotuloUnidade(identificacao, bloco);
  const numeroWhats = numeroWhatsAppPreferido(contato);
  const linkWhats = numeroWhats
    ? hrefWhatsApp(
        numeroWhats,
        mensagemCobrancaWhatsApp({
          nomeTitular: contato.nome,
          condominio,
          unidade,
        }),
      )
    : null;
  const linkEmail = contato.email
    ? hrefMailto(
        contato.email,
        `Cobrança condominial — ${unidade} · ${condominio}`,
        `Olá${contato.nome ? `, ${contato.nome.split(" ")[0]}` : ""},\n\nEntramos em contato sobre o débito em aberto da unidade ${unidade} do ${condominio}.\n\nFicamos à disposição.`,
      )
    : null;

  function iniciarWhatsApp() {
    if (!linkWhats) {
      toast({
        title: "WhatsApp indisponível",
        description: "Cadastre telefone ou WhatsApp do responsável para usar o atalho.",
        variant: "warning",
      });
      return;
    }
    window.open(linkWhats, "_blank", "noopener,noreferrer");
    toast({
      title: "WhatsApp aberto",
      description: "Finalize o registro do atendimento no sheet.",
      variant: "success",
    });
    onIniciar("WhatsApp");
  }

  function iniciarEmail() {
    if (!linkEmail) {
      toast({
        title: "E-mail indisponível",
        description: "Cadastre o e-mail do responsável para usar o atalho.",
        variant: "warning",
      });
      return;
    }
    window.location.href = linkEmail;
    toast({
      title: "E-mail aberto",
      description: "Finalize o registro do atendimento no sheet.",
      variant: "success",
    });
    onIniciar("E-mail");
  }

  if (operacao) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="md"
          className="!size-11 shrink-0 !p-0"
          disabled={!linkWhats}
          onClick={iniciarWhatsApp}
          aria-label={`Abrir WhatsApp — ${unidade}`}
        >
          <WhatsappIcon className="size-5 shrink-0 text-[#25D366]" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="md"
          className="!size-11 shrink-0 !p-0"
          disabled={!linkEmail}
          onClick={iniciarEmail}
          aria-label={`Enviar e-mail — ${unidade}`}
        >
          <Icon icon={Mail} size="md" aria-hidden />
        </Button>
      </div>
    );
  }

  if (compacto) {
    return (
      <div className="inline-flex flex-wrap items-center gap-xs">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="min-h-9 px-sm"
          disabled={!linkWhats}
          onClick={iniciarWhatsApp}
          aria-label={`WhatsApp — ${unidade}`}
        >
          <Icon icon={MessageCircle} size="sm" aria-hidden />
          WhatsApp
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-9 border-brass px-sm text-brass hover:border-brass hover:bg-gold-subtle hover:text-brass"
          disabled={!linkEmail}
          onClick={iniciarEmail}
          aria-label={`E-mail — ${unidade}`}
        >
          <Icon icon={Mail} size="sm" aria-hidden />
          E-mail
        </Button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-brass/35 bg-gradient-to-br from-gold-subtle via-surface-card to-surface-subtle shadow-card">
      <div className="flex items-start gap-sm border-b border-brass/20 px-md py-sm">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-brass/15 text-brass">
          <Icon icon={UserRound} size="sm" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-label-sm uppercase tracking-wide text-brass">Titular</p>
          <p className="truncate text-body-md font-semibold text-on-surface">
            {contato.nome || "Responsável sem nome no cadastro"}
          </p>
          {!linkWhats && !linkEmail ? (
            <p className="mt-xs text-body-sm text-on-surface-variant">
              Sem WhatsApp ou e-mail cadastrado — registre o contato manualmente.
            </p>
          ) : (
            <p className="mt-xs text-body-sm text-on-surface-variant">
              Toque para abrir o canal e já seguir para o registro.
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-sm p-md">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="min-h-12 w-full flex-col gap-xs py-sm"
          disabled={!linkWhats}
          onClick={iniciarWhatsApp}
        >
          <Icon icon={MessageCircle} size="md" aria-hidden />
          <span>WhatsApp</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-12 w-full flex-col gap-xs border-brass py-sm text-brass hover:border-brass hover:bg-gold-subtle hover:text-brass"
          disabled={!linkEmail}
          onClick={iniciarEmail}
        >
          <Icon icon={Mail} size="md" aria-hidden />
          <span>E-mail</span>
        </Button>
      </div>
    </div>
  );
}
