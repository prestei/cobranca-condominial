"use client";

import {
  forwardRef,
  useCallback,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { FileUp } from "lucide-react";
import { Button } from "@/components/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormSteps } from "@/components/form-steps";
import { Icon } from "@/components/icon";
import { FormField, Select } from "@/components/input";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetFooterForm,
  SheetForm,
  SheetHeader,
  SheetHeaderIcon,
  SheetHeaderLead,
  SheetHeaderText,
  SheetTitle,
} from "@/components/sheet";
import { useToast } from "@/components/toast";
import { useAuth } from "@/context/auth-context";
import { usePermissao } from "@/hooks/use-permissao";
import { agoraIso, type Debito, type Condominio, type Unidade, type Responsavel, type Vinculo } from "@/data/catalogo";
import type { PreviewImportacaoModulo, ResultadoConfirmacaoModulo } from "@/lib/importacoes/preview-importacao-modulo";
import {
  configWizardImportacao,
  MODULOS_WIZARD_IMPORTACAO,
  moduloWizardValido,
  type ModuloWizardImportacao,
} from "@/lib/importacoes/config-wizard-importacao";
import {
  LIMITES_ARQUIVO_IMPORTACAO,
  extensaoDoNome,
  formatoPorExtensaoConhecida,
  mensagemTamanhoMaximoArquivo,
  type ModuloImportacaoArquivo,
} from "@/lib/importacoes/limites";
import {
  aplicarImportacaoSalva,
  mesclarCondominiosImportacao,
  mesclarDebitosDoServidor,
  mesclarResponsaveisImportacao,
  mesclarUnidadesImportacao,
} from "@/lib/importacoes/sync-cliente";
import { ImportacaoPreVisualizacao } from "@/components/importacao-pre-visualizacao/importacao-pre-visualizacao";
import { ROTULO_MODULO_IMPORTACAO } from "@/components/importacao-pre-visualizacao/config-modulos";
import {
  ImportacaoAprovacao,
  podeEnviarAprovacaoImportacao,
} from "@/components/importacao-aprovacao/importacao-aprovacao";
import { ImportacaoResultado } from "@/components/importacao-aprovacao/importacao-resultado";
import type { DecisaoLinhaImportacao } from "@/lib/importacao-centro/detecao-duplicidades/types";
import { linhaSeraGravada } from "@/lib/importacao-centro/pre-visualizacao";
import { normalizarSituacaoImportacao } from "@/lib/importacao-centro/situacao-importacao";
import type { RetomadaImportacaoHistorico } from "@/lib/importacoes/historico-service";

const etapas = ["Arquivo", "Prévia", "Aprovação", "Resultado"] as const;

export type ImportacaoWizardHandle = {
  abrir: (modulo?: ModuloWizardImportacao) => void;
  retomar: (retomada: Extract<RetomadaImportacaoHistorico, { disponivel: true }>) => Promise<void>;
};

type Props = {
  moduloTravado?: boolean;
  moduloInicial?: ModuloWizardImportacao;
  onHistoricoAtualizado?: () => void;
  onConcluida?: () => void;
};

export const ImportacaoWizardSheet = forwardRef<ImportacaoWizardHandle, Props>(function ImportacaoWizardSheet(
  { moduloTravado = false, moduloInicial = "debitos", onHistoricoAtualizado, onConcluida },
  ref,
) {
  const { toast } = useToast();
  const { user: sessao } = useAuth();
  const { pode } = usePermissao();
  const podeAprovarImportacao = pode("importacoes", "editar");
  const podeCorrigirPrevia = pode("importacoes", "editar");
  const formId = useId();
  const arquivoRef = useRef<HTMLInputElement>(null);
  const wizardFormId = `${formId}-wizard-form`;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [origem, setOrigem] = useState("");
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [processoId, setProcessoId] = useState("");
  const [hashRecebimento, setHashRecebimento] = useState("");
  const [moduloWizard, setModuloWizard] = useState<ModuloWizardImportacao>(moduloInicial);
  const [preview, setPreview] = useState<PreviewImportacaoModulo | null>(null);
  const [dataHoraPrevia, setDataHoraPrevia] = useState("");
  const [resultado, setResultado] = useState<ResultadoConfirmacaoModulo | null>(null);
  const [processando, setProcessando] = useState(false);
  const [erroOrigem, setErroOrigem] = useState("");
  const [erroArquivo, setErroArquivo] = useState("");
  const [confirmacaoMarcada, setConfirmacaoMarcada] = useState(false);
  const [cienciaParcial, setCienciaParcial] = useState(false);
  const [confirmacaoJaEnviada, setConfirmacaoJaEnviada] = useState(false);
  const [linhasIgnoradas, setLinhasIgnoradas] = useState<number[]>([]);
  const [decisoesLinha, setDecisoesLinha] = useState<DecisaoLinhaImportacao[]>([]);

  const configModulo = useMemo(() => configWizardImportacao(moduloWizard), [moduloWizard]);

  const mapaDecisoesConfirmacao = useMemo(
    () => new Map(decisoesLinha.map((item) => [item.linha, item.acao])),
    [decisoesLinha],
  );
  const conjuntoIgnoradas = useMemo(() => new Set(linhasIgnoradas), [linhasIgnoradas]);

  function resetWizardForModulo(modulo: ModuloWizardImportacao) {
    setModuloWizard(modulo);
    setStep(0);
    const cfg = configWizardImportacao(modulo);
    setOrigem(cfg.origemPadraoCarteira);
    setNomeArquivo("");
    setProcessoId("");
    setHashRecebimento("");
    setPreview(null);
    setDataHoraPrevia("");
    setResultado(null);
    setErroOrigem("");
    setErroArquivo("");
    setConfirmacaoMarcada(false);
    setLinhasIgnoradas([]);
    setDecisoesLinha([]);
    setCienciaParcial(false);
    setConfirmacaoJaEnviada(false);
    setProcessando(false);
  }

  function resetWizard() {
    resetWizardForModulo(moduloWizard);
  }

  const closeSheet = useCallback(() => {
    if (step === 3 && resultado) {
      setSheetOpen(false);
      resetWizardForModulo(moduloWizard);
      return;
    }
    if (step > 0 || origem || nomeArquivo) {
      setLeaveConfirmOpen(true);
      return;
    }
    setSheetOpen(false);
  }, [step, resultado, origem, nomeArquivo, moduloWizard]);

  function concluirWizardImportacao() {
    setSheetOpen(false);
    resetWizard();
    onConcluida?.();
  }

  function confirmLeave() {
    setLeaveConfirmOpen(false);
    setSheetOpen(false);
    resetWizard();
  }

  useImperativeHandle(ref, () => ({
    abrir(modulo = moduloInicial) {
      resetWizardForModulo(moduloTravado ? moduloInicial : modulo);
      setSheetOpen(true);
    },
    async retomar(retomada) {
      if (!moduloWizardValido(retomada.modulo)) return;
      const modulo = moduloTravado ? moduloInicial : retomada.modulo;
      const cfg = configWizardImportacao(modulo);
      setModuloWizard(modulo);
      setOrigem(retomada.origem);
      setNomeArquivo(retomada.arquivo);
      setProcessoId(retomada.processoId);
      setHashRecebimento(retomada.hashArquivo);
      setPreview(null);
      setResultado(null);
      setConfirmacaoMarcada(false);
      setLinhasIgnoradas([]);
      setDecisoesLinha([]);
      setCienciaParcial(false);
      setConfirmacaoJaEnviada(false);
      setErroOrigem("");
      setErroArquivo("");
      setProcessando(true);
      setSheetOpen(true);
      try {
        const response = await fetch(`${cfg.apiBase}/preview`, {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origem: retomada.origem,
            arquivo: retomada.arquivo,
            processoId: retomada.processoId,
            hashArquivo: retomada.hashArquivo,
          }),
        });
        const body = (await response.json()) as {
          preview?: PreviewImportacaoModulo;
          condominios?: Condominio[];
          unidades?: Unidade[];
          responsaveis?: Responsavel[];
          vinculos?: Vinculo[];
          error?: string;
        };
        if (!response.ok || !body.preview) {
          toast({
            variant: "error",
            title: "Não foi possível retomar",
            description: body.error ?? "Valide o arquivo novamente.",
          });
          return;
        }
        if (body.condominios) mesclarCondominiosImportacao(body.condominios, sessao?.userId);
        if (body.unidades) mesclarUnidadesImportacao(body.unidades, sessao?.userId);
        if (body.responsaveis || body.vinculos) {
          mesclarResponsaveisImportacao(body.responsaveis ?? [], body.vinculos ?? []);
        }
        setPreview(body.preview);
        setDataHoraPrevia(agoraIso());
        setStep(1);
      } catch {
        toast({ variant: "error", title: "Erro de rede", description: "Não foi possível retomar a conferência." });
      } finally {
        setProcessando(false);
      }
    },
  }));

  async function handleArquivoSelecionado(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    event.target.value = "";
    if (!arquivo) return;
    setErroArquivo("");
    if (arquivo.size > LIMITES_ARQUIVO_IMPORTACAO.tamanhoMaximoBytes) {
      setErroArquivo(mensagemTamanhoMaximoArquivo());
      setProcessoId("");
      setHashRecebimento("");
      setNomeArquivo("");
      return;
    }
    const extensao = extensaoDoNome(arquivo.name);
    if (!extensao || !formatoPorExtensaoConhecida(extensao)) {
      setErroArquivo("Formato não autorizado. Use CSV, XLSX, XLS ou PDF.");
      setProcessoId("");
      setHashRecebimento("");
      setNomeArquivo("");
      return;
    }
    setProcessando(true);
    try {
      const formData = new FormData();
      formData.set("modulo", moduloWizard);
      formData.set("arquivo", arquivo);
      const response = await fetch("/api/importacoes/arquivo", {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });
      const body = (await response.json()) as {
        recebimento?: {
          processoId: string;
          nomeArquivo: string;
          hashArquivo: string;
          moduloEfetivo?: ModuloImportacaoArquivo;
          moduloCorrigido?: boolean;
          mensagemModulo?: string;
        };
        error?: string;
      };
      if (!response.ok || !body.recebimento) {
        setErroArquivo(body.error ?? "Não foi possível validar o arquivo.");
        setProcessoId("");
        setHashRecebimento("");
        setNomeArquivo("");
        return;
      }
      const efetivo = body.recebimento.moduloEfetivo;
      // O conteúdo manda: mesmo com módulo “travado” na UI, processamos no destino certo.
      if (efetivo && moduloWizardValido(efetivo) && efetivo !== moduloWizard) {
        setModuloWizard(efetivo);
      }
      if (body.recebimento.moduloCorrigido && body.recebimento.mensagemModulo) {
        toast({
          variant: "warning",
          title: "Destino ajustado pelo arquivo",
          description: body.recebimento.mensagemModulo,
        });
      }
      setProcessoId(body.recebimento.processoId);
      setHashRecebimento(body.recebimento.hashArquivo);
      setNomeArquivo(body.recebimento.nomeArquivo);
    } catch {
      setErroArquivo("Não foi possível enviar o arquivo.");
      setProcessoId("");
      setHashRecebimento("");
      setNomeArquivo("");
    } finally {
      setProcessando(false);
    }
  }

  const gravacaoNaPrevia = useMemo(() => {
    if (!preview) return 0;
    return preview.linhas.filter((item) => linhaSeraGravada(item, conjuntoIgnoradas, mapaDecisoesConfirmacao))
      .length;
  }, [preview, conjuntoIgnoradas, mapaDecisoesConfirmacao]);

  const avancoPrevia = useMemo(() => {
    if (!preview?.resumoAprovacao) {
      return {
        pode: false,
        motivo: "Valide o arquivo novamente para gerar o resumo de aprovação.",
      };
    }
    if (!podeAprovarImportacao) {
      return {
        pode: false,
        motivo:
          "Seu cargo não inclui permissão para aprovar importações (alterar em Importações). Peça ao administrador para ajustar em Cargos.",
      };
    }
    if (confirmacaoJaEnviada) {
      return { pode: false, motivo: "Aguarde o término da gravação em andamento." };
    }
    const resumo = preview.resumoAprovacao;
    if (resumo.errosBloqueantes.length > 0) {
      return {
        pode: false,
        motivo: resumo.motivoBloqueio ?? resumo.errosBloqueantes[0] ?? "Corrija os erros do arquivo antes de continuar.",
      };
    }
    if (resumo.podeConfirmar || preview.arquivoJaImportado) {
      return { pode: true, motivo: undefined };
    }
    return {
      pode: false,
      motivo:
        resumo.motivoBloqueio ??
        "Nenhum registro será gravado nesta operação. Corrija as linhas com erro ou cancele a importação.",
    };
  }, [preview, podeAprovarImportacao, confirmacaoJaEnviada]);

  async function validarArquivo() {
    const errosOrigem = !origem ? "Selecione a origem dos dados." : "";
    const errosArquivo = !processoId
      ? `Selecione um arquivo válido para ${ROTULO_MODULO_IMPORTACAO[moduloWizard] ?? "importação"}.`
      : "";
    setErroOrigem(errosOrigem);
    setErroArquivo(errosArquivo);
    if (errosOrigem || errosArquivo) return;

    setProcessando(true);
    try {
      const response = await fetch(`${configModulo.apiBase}/preview`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origem,
          arquivo: nomeArquivo,
          processoId,
          hashArquivo: hashRecebimento,
        }),
      });
      const body = (await response.json()) as {
        preview?: PreviewImportacaoModulo;
        condominios?: Condominio[];
        unidades?: Unidade[];
        responsaveis?: Responsavel[];
        vinculos?: Vinculo[];
        error?: string;
      };
      if (!response.ok || !body.preview) {
        toast({
          variant: "error",
          title: "Validação falhou",
          description: body.error ?? "Verifique o cabeçalho e o formato do arquivo.",
        });
        return;
      }
      if (body.condominios) mesclarCondominiosImportacao(body.condominios, sessao?.userId);
      if (body.unidades) mesclarUnidadesImportacao(body.unidades, sessao?.userId);
      if (body.responsaveis || body.vinculos) {
        mesclarResponsaveisImportacao(body.responsaveis ?? [], body.vinculos ?? []);
      }
      setPreview(body.preview);
      setLinhasIgnoradas([]);
      setDecisoesLinha([]);
      setDataHoraPrevia(agoraIso());
      setStep(1);
    } catch {
      toast({ variant: "error", title: "Erro de rede", description: "Não foi possível validar o arquivo." });
    } finally {
      setProcessando(false);
    }
  }

  async function executarImportacao() {
    if (!preview?.resumoAprovacao) return;
    setProcessando(true);
    setConfirmacaoJaEnviada(true);
    try {
      const response = await fetch(`${configModulo.apiBase}/confirmar`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origem: preview.origem,
          arquivo: preview.arquivo,
          processoId,
          hashArquivo: preview.hashArquivo,
          confirmacaoExplicita: true,
          cienciaImportacaoParcial: preview.resumoAprovacao.importacaoParcial ? cienciaParcial : undefined,
          linhasIgnoradas: linhasIgnoradas.length > 0 ? linhasIgnoradas : undefined,
          decisoesLinha: decisoesLinha.length > 0 ? decisoesLinha : undefined,
        }),
      });
      const body = (await response.json()) as {
        resultado?: ResultadoConfirmacaoModulo;
        debitos?: Debito[];
        condominios?: Condominio[];
        unidades?: Unidade[];
        responsaveis?: Responsavel[];
        vinculos?: Vinculo[];
        error?: string;
      };
      if (!response.ok || !body.resultado) {
        setConfirmacaoJaEnviada(false);
        toast({
          variant: "error",
          title: "Importação não concluída",
          description: body.error ?? "Tente validar o arquivo novamente.",
        });
        return;
      }
      if (body.debitos) mesclarDebitosDoServidor(body.debitos);
      if (body.condominios) mesclarCondominiosImportacao(body.condominios, sessao?.userId);
      if (body.unidades) mesclarUnidadesImportacao(body.unidades, sessao?.userId);
      if (body.responsaveis || body.vinculos) {
        mesclarResponsaveisImportacao(body.responsaveis ?? [], body.vinculos ?? []);
      }
      aplicarImportacaoSalva(body.resultado.importacao);
      setResultado(body.resultado);
      setStep(3);
      onHistoricoAtualizado?.();
      const sitFinal = normalizarSituacaoImportacao(body.resultado.importacao.status);
      const parcialFinal = sitFinal === "Concluida parcialmente";
      toast({
        variant: parcialFinal ? "warning" : "success",
        title: preview.arquivoJaImportado
          ? "Arquivo já importado"
          : parcialFinal
            ? "Importação gravada parcialmente"
            : "Importação concluída",
        description: preview.arquivoJaImportado
          ? "Nenhum registro duplicado foi gravado."
          : `${body.resultado.novos} novo(s), ${body.resultado.atualizados} atualizado(s).`,
      });
    } catch {
      toast({ variant: "error", title: "Erro de rede", description: "Não foi possível gravar a importação." });
      setConfirmacaoJaEnviada(false);
    } finally {
      setProcessando(false);
    }
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === 0) {
      void validarArquivo();
      return;
    }
    if (step === 1) {
      if (!podeAprovarImportacao) {
        toast({
          variant: "error",
          title: "Sem permissão",
          description: "Você não pode aprovar importações. Solicite a permissão de alterar no módulo Importações.",
        });
        return;
      }
      if (!avancoPrevia.pode) {
        toast({
          variant: "error",
          title: "Não é possível seguir",
          description: avancoPrevia.motivo ?? "Revise a prévia antes de continuar.",
        });
        return;
      }
      setConfirmacaoMarcada(false);
      setCienciaParcial(false);
      setConfirmacaoJaEnviada(false);
      setStep(2);
      if (processoId) {
        void fetch(`/api/importacoes/processo/${encodeURIComponent(processoId)}/aprovacao`, {
          method: "POST",
          credentials: "same-origin",
        }).then(() => onHistoricoAtualizado?.());
      }
      return;
    }
    if (step === 2) {
      if (
        !preview?.resumoAprovacao ||
        !podeEnviarAprovacaoImportacao(preview.resumoAprovacao, confirmacaoMarcada, cienciaParcial, {
          processando,
          confirmacaoJaEnviada,
          permissaoAprovar: podeAprovarImportacao,
        })
      ) {
        return;
      }
      void executarImportacao();
      return;
    }
    if (step === 3) {
      concluirWizardImportacao();
    }
  }

  return (
    <>
      <input
        ref={arquivoRef}
        type="file"
        accept={configModulo.accept}
        className="sr-only"
        onChange={handleArquivoSelecionado}
      />
      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          if (open) setSheetOpen(true);
          else closeSheet();
        }}
      >
        <SheetContent
          size={step === 0 ? "default" : "xl"}
          aria-labelledby={`${formId}-title`}
          aria-describedby={`${formId}-desc`}
        >
          <SheetForm id={wizardFormId} onSubmit={handleFormSubmit}>
            <SheetHeader>
              <SheetHeaderLead>
                <SheetHeaderIcon>
                  <Icon icon={FileUp} size="md" />
                </SheetHeaderIcon>
                <SheetHeaderText>
                  <SheetTitle id={`${formId}-title`}>{configModulo.tituloSheet}</SheetTitle>
                  <SheetDescription id={`${formId}-desc`}>
                    Formato {configModulo.formato}. Quem executa é o login atual ({sessao?.nome ?? "—"}).
                  </SheetDescription>
                </SheetHeaderText>
              </SheetHeaderLead>
              <SheetClose />
            </SheetHeader>
            <SheetBody>
              <FormSteps steps={etapas} current={step} />
              {step === 0 ? (
                <>
                  <FormField label="O que importar" htmlFor={`${formId}-modulo`} required>
                    <Select
                      id={`${formId}-modulo`}
                      value={moduloWizard}
                      onChange={(event) => {
                        const valor = event.target.value;
                        if (moduloWizardValido(valor)) resetWizardForModulo(valor);
                      }}
                    >
                      {MODULOS_WIZARD_IMPORTACAO.map((item) => (
                        <option key={item} value={item}>
                          {ROTULO_MODULO_IMPORTACAO[item] ?? item}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Origem dos dados" htmlFor={`${formId}-origem`} required error={erroOrigem}>
                    <Select
                      id={`${formId}-origem`}
                      value={origem}
                      invalid={Boolean(erroOrigem)}
                      onChange={(event) => setOrigem(event.target.value)}
                    >
                      <option value="">Selecione</option>
                      {configModulo.origens.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Arquivo" required error={erroArquivo}>
                    <div className="flex flex-col gap-sm">
                      <Button type="button" variant="secondary" size="sm" onClick={() => arquivoRef.current?.click()}>
                        Escolher arquivo
                      </Button>
                      <p className="text-body-sm text-on-surface-variant">
                        {nomeArquivo ? nomeArquivo : configModulo.descricaoArquivo}
                      </p>
                    </div>
                  </FormField>
                </>
              ) : null}

              {step === 1 && preview ? (
                <ImportacaoPreVisualizacao
                  cabecalho={{
                    nomeArquivo: preview.arquivo,
                    moduloDestino: preview.moduloDestino,
                    moduloRotulo: ROTULO_MODULO_IMPORTACAO[preview.moduloDestino] ?? "Inadimplência",
                    usuarioResponsavel: sessao?.nome ?? "—",
                    dataHoraImportacao: dataHoraPrevia,
                    origem: preview.origem,
                    quantidadeRegistros: preview.quantidadeRegistros,
                    contagens: preview.contagensPrevia,
                    arquivoJaImportado: preview.arquivoJaImportado,
                  }}
                  linhas={preview.linhas}
                  sessaoPreviaId={preview.sessaoPreviaId ?? processoId}
                  hashArquivo={preview.hashArquivo}
                  onPreviewAtualizado={(proximo) => {
                    setPreview(proximo);
                    setDecisoesLinha([]);
                  }}
                  onVoltarArquivo={() => {
                    setStep(0);
                    setPreview(null);
                    setDataHoraPrevia("");
                    setLinhasIgnoradas([]);
                    setDecisoesLinha([]);
                  }}
                  onCancelar={closeSheet}
                  onLinhasIgnoradasChange={setLinhasIgnoradas}
                  decisoesLinha={decisoesLinha}
                  onDecisoesLinhaChange={setDecisoesLinha}
                  permissaoCorrigir={configModulo.suportaCorrecaoPrevia && podeCorrigirPrevia}
                  permissaoDecidirConflito={podeAprovarImportacao}
                  gravacaoPrevista={gravacaoNaPrevia}
                  podeContinuarAprovacao={avancoPrevia.pode}
                  motivoBloqueioContinuar={avancoPrevia.motivo}
                  processandoContinuar={processando}
                  wizardFormId={wizardFormId}
                />
              ) : null}

              {step === 2 && preview?.resumoAprovacao ? (
                <ImportacaoAprovacao
                  resumo={preview.resumoAprovacao}
                  usuarioResponsavel={sessao?.nome ?? "—"}
                  confirmacaoMarcada={confirmacaoMarcada}
                  onConfirmacaoMarcadaChange={setConfirmacaoMarcada}
                  cienciaParcial={cienciaParcial}
                  onCienciaParcialChange={setCienciaParcial}
                  confirmacaoJaEnviada={confirmacaoJaEnviada}
                />
              ) : null}

              {step === 3 && resultado ? (
                <ImportacaoResultado
                  resultado={resultado}
                  moduloDestino={moduloWizard}
                  exibirManualProtegido={moduloWizard === "debitos"}
                />
              ) : null}
            </SheetBody>
            {step === 3 ? (
              <SheetFooter>
                <Button type="button" onClick={concluirWizardImportacao}>
                  Fechar
                </Button>
              </SheetFooter>
            ) : (
              <SheetFooterForm
                onClose={closeSheet}
                onBack={
                  step === 1
                    ? () => setStep(0)
                    : step === 2
                      ? () => {
                          setStep(1);
                          setConfirmacaoMarcada(false);
                          setCienciaParcial(false);
                          setConfirmacaoJaEnviada(false);
                        }
                      : undefined
                }
                saveLabel={
                  step === 0
                    ? processando
                      ? "Validando…"
                      : "Validar arquivo"
                    : step === 1
                      ? "Revisar aprovação"
                      : processando
                        ? "Gravando…"
                        : "Confirmar e gravar"
                }
                saveDisabled={
                  processando ||
                  confirmacaoJaEnviada ||
                  (step === 1 && !avancoPrevia.pode) ||
                  (step === 2 &&
                    preview?.resumoAprovacao !== undefined &&
                    !podeEnviarAprovacaoImportacao(preview.resumoAprovacao, confirmacaoMarcada, cienciaParcial, {
                      processando,
                      confirmacaoJaEnviada,
                      permissaoAprovar: podeAprovarImportacao,
                    }))
                }
              />
            )}
          </SheetForm>
        </SheetContent>
      </Sheet>
      <ConfirmDialog
        open={leaveConfirmOpen}
        onOpenChange={setLeaveConfirmOpen}
        title="Tem certeza que quer sair?"
        description="As informações preenchidas serão perdidas."
        confirmLabel="Sair"
        cancelLabel="Permanecer"
        confirmVariant="critical"
        onConfirm={confirmLeave}
      />
    </>
  );
});
