import React, { useEffect, useState } from 'react';
import {
  Scale,
  Calendar,
  Clock,
  FileText,
  UploadCloud,
  FileCheck,
  X,
  AlertTriangle,
  User,
  MapPin,
  HelpCircle,
} from 'lucide-react';
import {
  Button,
  Field,
  Input,
  Modal,
  Select,
  Tabs,
  StatusChip,
} from '@/components/ui';
import {
  cemiteriosApi,
  formatarData,
  type Cemiterio,
  type Inumacao,
} from '../../api';
import { ErroBox, Mono, useAcao } from '../comum';

interface ModalNovaExumacaoProps {
  aberto: boolean;
  modoInicial?: 'ordinaria' | 'judicial';
  cemiterioAtivo?: Cemiterio | null;
  cemiterioAtivoId?: number | null;
  onFechar: () => void;
  onSucesso: () => Promise<void>;
}

export const ModalNovaExumacao: React.FC<ModalNovaExumacaoProps> = ({
  aberto,
  modoInicial = 'ordinaria',
  cemiterioAtivo,
  cemiterioAtivoId,
  onFechar,
  onSucesso,
}) => {
  const [tipo, setTipo] = useState<'ordinaria' | 'judicial'>(modoInicial);
  const { erro, enviando, executar, setErro } = useAcao();

  const [inumações, setInumacoes] = useState<Inumacao[]>([]);
  const [carregandoInumacoes, setCarregandoInumacoes] = useState(false);

  const [burialId, setBurialId] = useState<string>('');
  const [destino, setDestino] = useState('Ossuário Geral');
  const [agendadaPara, setAgendadaPara] = useState('');

  // Campos judiciais
  const [processo, setProcesso] = useState('');
  const [juizo, setJuizo] = useState('');
  const [dataDecisao, setDataDecisao] = useState('');
  const [mandadoArquivo, setMandadoArquivo] = useState<File | null>(null);

  useEffect(() => {
    if (aberto) {
      setTipo(modoInicial);
      setErro(null);
      setBurialId('');
      setDestino('Ossuário Geral');
      setAgendadaPara('');
      setProcesso('');
      setJuizo('');
      setDataDecisao('');
      setMandadoArquivo(null);

      // Carregar inumações disponíveis
      setCarregandoInumacoes(true);
      cemiteriosApi
        .inumacoes({
          park_id: cemiterioAtivoId ?? undefined,
          situacao: 'confirmada',
          per_page: 100,
        })
        .then((res) => {
          setInumacoes(res.data ?? []);
        })
        .catch(() => {
          setInumacoes([]);
        })
        .finally(() => {
          setCarregandoInumacoes(false);
        });
    }
  }, [aberto, modoInicial, cemiterioAtivoId, setErro]);

  const opcoesInumacao = inumações.map((i) => ({
    value: String(i.id),
    label: `${i.falecido?.nome ?? 'Falecido'} — Jazigo: ${i.jazigo?.codigo ?? '—'} (Sepultado em: ${formatarData(i.sepultado_em)})`,
  }));

  const inumacaoSelecionada = inumações.find((i) => String(i.id) === burialId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!burialId) {
      return;
    }

    const payload: Record<string, unknown> = {
      tipo,
      burial_id: Number(burialId),
      destino: destino || undefined,
      agendada_para: agendadaPara || undefined,
    };

    if (tipo === 'judicial') {
      payload.processo = processo;
      payload.juizo = juizo;
      payload.data_decisao = dataDecisao;
      if (mandadoArquivo) {
        payload.mandado = mandadoArquivo;
      }
    }

    const resultado = await executar(async () => {
      return await cemiteriosApi.exumar(payload);
    });

    if (resultado) {
      await onSucesso();
      onFechar();
    }
  };

  const formId = 'form-nova-exumacao';

  return (
    <Modal
      open={aberto}
      onClose={onFechar}
      size="2xl"
      title={tipo === 'judicial' ? 'Exumação por Determinação Judicial' : 'Exumação Ordinária'}
      description="Procedimento formal para retirada de restos mortais e destinação legal."
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            <span className="text-destructive font-bold">*</span> Campos obrigatórios.
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" type="button" onClick={onFechar} disabled={enviando}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form={formId}
              variant={tipo === 'judicial' ? 'destructive' : 'default'}
              disabled={enviando}
            >
              {enviando ? 'Processando…' : tipo === 'judicial' ? 'Autorizar Exumação Judicial' : 'Confirmar Exumação'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Alternância de Tipo */}
        <div className="flex items-center justify-between border-b pb-3">
          <Tabs
            items={[
              { key: 'ordinaria', label: 'Exumação Ordinária (Prazo Cumprido)' },
              { key: 'judicial', label: 'Exumação Judicial (Mandado / Perícia)' },
            ]}
            value={tipo}
            onChange={(v) => setTipo(v as 'ordinaria' | 'judicial')}
          />
          {tipo === 'judicial' && (
            <StatusChip label="Ordem Judicial" variant="danger" />
          )}
        </div>

        <form id={formId} onSubmit={handleSubmit} className="space-y-5">
          {/* ── 1. Seleção da Inumação ── */}
          <div className="rounded-xl border border-border bg-card/50 p-4 space-y-3.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b pb-2">
              <User className="h-4 w-4 text-primary" />
              <span>1. Sepultamento Objeto da Exumação</span>
            </div>

            <div className="grid grid-cols-1 gap-3.5">
              <Field
                label="Falecido / Inumação"
                required
                hint={
                  inumacaoSelecionada
                    ? `Falecido: ${inumacaoSelecionada.falecido?.nome} · Túmulo: ${inumacaoSelecionada.jazigo?.codigo} · Sepultado em: ${formatarData(inumacaoSelecionada.sepultado_em)}`
                    : 'Selecione o registro de sepultamento cadastrado na necrópole'
                }
                error={erro?.campos?.burial_id?.[0]}
              >
                {opcoesInumacao.length > 0 ? (
                  <Select
                    value={burialId}
                    onChange={(v) => setBurialId(v ?? '')}
                    options={opcoesInumacao}
                    placeholder={carregandoInumacoes ? 'Carregando inumações…' : 'Selecione o falecido/sepultamento…'}
                  />
                ) : (
                  <Input
                    type="number"
                    placeholder="Informe o ID numérico do sepultamento"
                    className="font-mono tabular-nums"
                    value={burialId}
                    onChange={(e) => setBurialId(e.target.value)}
                    required
                  />
                )}
              </Field>
            </div>

            {inumacaoSelecionada && (
              <div className="flex flex-wrap items-center gap-4 rounded-lg bg-muted/30 p-3 text-xs">
                <div>
                  <span className="text-muted-foreground block">Falecido:</span>
                  <span className="font-semibold text-foreground">
                    {inumacaoSelecionada.falecido?.nome}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Jazigo:</span>
                  <span className="font-mono font-bold text-primary">
                    {inumacaoSelecionada.jazigo?.codigo ?? '—'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Data Sepultamento:</span>
                  <span className="font-mono tabular-nums text-foreground">
                    {formatarData(inumacaoSelecionada.sepultado_em)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Carência Legal:</span>
                  <span className="font-mono tabular-nums text-foreground">
                    {formatarData(inumacaoSelecionada.carencia_desde)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ── 2. Dados Operacionais & Destino ── */}
          <div className="rounded-xl border border-border bg-card/50 p-4 space-y-3.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b pb-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span>2. Destino e Agendamento da Operação</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Field
                label="Destino dos Restos Mortais"
                hint="Local para onde as ossadas serão transferidas"
                error={erro?.campos?.destino?.[0]}
              >
                <Input
                  placeholder="Ex.: Ossuário Geral, Nicho Perpétuo nº 12..."
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                />
              </Field>

              <Field
                label="Data e Hora Agendada"
                hint="Data prevista para a abertura do túmulo"
                error={erro?.campos?.agendada_para?.[0]}
              >
                <Input
                  type="datetime-local"
                  className="font-mono tabular-nums"
                  value={agendadaPara}
                  onChange={(e) => setAgendadaPara(e.target.value)}
                />
              </Field>
            </div>
          </div>

          {/* ── 3. Determinação Judicial (Apenas se Judicial) ── */}
          {tipo === 'judicial' && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-rose-500 border-b border-rose-500/20 pb-2">
                <Scale className="h-4 w-4" />
                <span>3. Dados do Mandado Judicial</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Field
                  label="Número do Processo Judicial"
                  required
                  error={erro?.campos?.processo?.[0]}
                >
                  <Input
                    placeholder="0000000-00.0000.8.00.0000"
                    className="font-mono tabular-nums"
                    value={processo}
                    onChange={(e) => setProcesso(e.target.value)}
                    required
                  />
                </Field>

                <Field
                  label="Juízo / Vara Prolatora"
                  required
                  error={erro?.campos?.juizo?.[0]}
                >
                  <Input
                    placeholder="Ex.: 1ª Vara Cível da Comarca..."
                    value={juizo}
                    onChange={(e) => setJuizo(e.target.value)}
                    required
                  />
                </Field>

                <Field
                  label="Data da Decisão Judicial"
                  required
                  error={erro?.campos?.data_decisao?.[0]}
                >
                  <Input
                    type="date"
                    className="font-mono tabular-nums"
                    value={dataDecisao}
                    onChange={(e) => setDataDecisao(e.target.value)}
                    required
                  />
                </Field>

                {/* Upload do Mandado */}
                <div className="sm:col-span-2">
                  <Field
                    label="Cópia do Mandado / Ofício Judicial (PDF ou Imagem)"
                    required
                    hint="Anexe a ordem judicial com fé pública."
                    error={erro?.campos?.mandado?.[0]}
                  >
                    <div className="space-y-2">
                      <input
                        id="upload-mandado-arquivo"
                        type="file"
                        accept=".pdf,image/*"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          setMandadoArquivo(file);
                        }}
                        required={!mandadoArquivo}
                      />

                      {mandadoArquivo ? (
                        <div className="flex items-center justify-between rounded-lg border border-rose-500/40 bg-rose-500/10 p-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileCheck className="h-5 w-5 text-rose-500 shrink-0" />
                            <div className="min-w-0">
                              <span className="font-mono text-xs font-semibold text-foreground block truncate">
                                {mandadoArquivo.name}
                              </span>
                              <span className="text-[11px] text-muted-foreground block font-mono">
                                {(mandadoArquivo.size / 1024).toFixed(1)} KB · Mandado judicial anexado
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 ml-3">
                            <label
                              htmlFor="upload-mandado-arquivo"
                              className="cursor-pointer text-xs font-medium text-rose-500 hover:underline px-2 py-1 rounded bg-background border border-border"
                            >
                              Trocar
                            </label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setMandadoArquivo(null)}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <label
                          htmlFor="upload-mandado-arquivo"
                          className="flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border bg-muted/15 p-4 text-center cursor-pointer transition-colors hover:border-rose-500/50 hover:bg-muted/30"
                        >
                          <UploadCloud className="h-6 w-6 text-muted-foreground" />
                          <span className="text-xs font-semibold text-foreground">
                            Clique para anexar o mandado ou decisão judicial
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            Formato PDF ou Imagem legível (máx. 10MB)
                          </span>
                        </label>
                      )}
                    </div>
                  </Field>
                </div>
              </div>
            </div>
          )}
        </form>

        <ErroBox erro={erro} />
      </div>
    </Modal>
  );
};
