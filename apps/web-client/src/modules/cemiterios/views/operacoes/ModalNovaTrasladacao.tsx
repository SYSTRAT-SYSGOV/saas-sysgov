import React, { useEffect, useState } from 'react';
import {
  ArrowRightLeft,
  Calendar,
  Clock,
  FileText,
  MapPin,
  Building2,
  Truck,
  User,
  ShieldCheck,
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
  type Jazigo,
} from '../../api';
import { ErroBox, Mono, useAcao } from '../comum';

interface ModalNovaTrasladacaoProps {
  aberto: boolean;
  cemiterioAtivo?: Cemiterio | null;
  cemiterioAtivoId?: number | null;
  onFechar: () => void;
  onSucesso: () => Promise<void>;
}

export const ModalNovaTrasladacao: React.FC<ModalNovaTrasladacaoProps> = ({
  aberto,
  cemiterioAtivo,
  cemiterioAtivoId,
  onFechar,
  onSucesso,
}) => {
  const { erro, enviando, executar, setErro } = useAcao();

  const [tipoDestino, setTipoDestino] = useState<'interno' | 'externo'>('interno');

  const [inumações, setInumacoes] = useState<Inumacao[]>([]);
  const [carregandoInumacoes, setCarregandoInumacoes] = useState(false);
  const [burialId, setBurialId] = useState<string>('');

  // Destino interno
  const [jazigos, setJazigos] = useState<Jazigo[]>([]);
  const [carregandoJazigos, setCarregandoJazigos] = useState(false);
  const [plotDestinoId, setPlotDestinoId] = useState<string>('');

  // Destino externo
  const [destinoExterno, setDestinoExterno] = useState('');
  const [documentoDestino, setDocumentoDestino] = useState('');

  // Agendamento
  const [agendadaPara, setAgendadaPara] = useState('');

  useEffect(() => {
    if (aberto) {
      setErro(null);
      setBurialId('');
      setPlotDestinoId('');
      setDestinoExterno('');
      setDocumentoDestino('');
      setAgendadaPara('');
      setTipoDestino('interno');

      // Carregar inumações do cemitério
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

      // Carregar jazigos disponíveis para destino interno
      if (cemiterioAtivoId) {
        setCarregandoJazigos(true);
        cemiteriosApi
          .jazigos({ park_id: cemiterioAtivoId, per_page: 100 })
          .then((res) => {
            setJazigos(res.data ?? []);
          })
          .catch(() => {
            setJazigos([]);
          })
          .finally(() => {
            setCarregandoJazigos(false);
          });
      }
    }
  }, [aberto, cemiterioAtivoId, setErro]);

  const opcoesInumacao = inumações.map((i) => ({
    value: String(i.id),
    label: `${i.falecido?.nome ?? 'Falecido'} — Jazigo: ${i.jazigo?.codigo ?? '—'} (Sepultado em: ${formatarData(i.sepultado_em)})`,
  }));

  const opcoesJazigosDestino = jazigos.map((j) => ({
    value: String(j.id),
    label: `${j.codigo} — Setor: ${j.setor?.descricao || j.setor?.codigo || 'Geral'} · Tipo: ${j.tipo} (${j.estado})`,
  }));

  const inumacaoOrigem = inumações.find((i) => String(i.id) === burialId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!burialId) {
      return;
    }

    const payload: Record<string, unknown> = {
      burial_id: Number(burialId),
      agendada_para: agendadaPara || undefined,
    };

    if (tipoDestino === 'interno') {
      if (!plotDestinoId) return;
      payload.plot_destino_id = Number(plotDestinoId);
    } else {
      if (!destinoExterno || !documentoDestino) return;
      payload.destino_externo = destinoExterno;
      payload.documento_destino = documentoDestino;
    }

    const resultado = await executar(async () => {
      return await cemiteriosApi.trasladar(payload);
    });

    if (resultado) {
      await onSucesso();
      onFechar();
    }
  };

  const formId = 'form-nova-trasladacao';

  return (
    <Modal
      open={aberto}
      onClose={onFechar}
      size="2xl"
      title="Trasladação de Restos Mortais"
      description="Transferência de despojos mortais entre sepulturas da necrópole ou para outro município."
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            <span className="text-destructive font-bold">*</span> Campos obrigatórios.
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" type="button" onClick={onFechar} disabled={enviando}>
              Cancelar
            </Button>
            <Button type="submit" form={formId} disabled={enviando}>
              {enviando ? 'Registrando…' : 'Confirmar Trasladação'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <form id={formId} onSubmit={handleSubmit} className="space-y-5">
          {/* ── 1. Sepultamento de Origem ── */}
          <div className="rounded-xl border border-border bg-card/50 p-4 space-y-3.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b pb-2">
              <User className="h-4 w-4 text-primary" />
              <span>1. Sepultamento de Origem</span>
            </div>

            <div className="grid grid-cols-1 gap-3.5">
              <Field
                label="Falecido / Registro de Sepultamento"
                required
                hint={
                  inumacaoOrigem
                    ? `Falecido: ${inumacaoOrigem.falecido?.nome} · Jazigo Atual: ${inumacaoOrigem.jazigo?.codigo}`
                    : 'Selecione o registro de inumação a ser trasladado'
                }
                error={erro?.campos?.burial_id?.[0]}
              >
                {opcoesInumacao.length > 0 ? (
                  <Select
                    value={burialId}
                    onChange={(v) => setBurialId(v ?? '')}
                    options={opcoesInumacao}
                    placeholder={carregandoInumacoes ? 'Carregando inumações…' : 'Selecione a inumação de origem…'}
                  />
                ) : (
                  <Input
                    type="number"
                    placeholder="Informe o ID numérico da inumação"
                    className="font-mono tabular-nums"
                    value={burialId}
                    onChange={(e) => setBurialId(e.target.value)}
                    required
                  />
                )}
              </Field>
            </div>

            {inumacaoOrigem && (
              <div className="flex flex-wrap items-center gap-4 rounded-lg bg-muted/30 p-3 text-xs">
                <div>
                  <span className="text-muted-foreground block">Falecido:</span>
                  <span className="font-semibold text-foreground">
                    {inumacaoOrigem.falecido?.nome}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Jazigo Origem:</span>
                  <span className="font-mono font-bold text-primary">
                    {inumacaoOrigem.jazigo?.codigo ?? '—'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Sepultado em:</span>
                  <span className="font-mono tabular-nums text-foreground">
                    {formatarData(inumacaoOrigem.sepultado_em)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ── 2. Modalidade de Destino ── */}
          <div className="rounded-xl border border-border bg-card/50 p-4 space-y-3.5">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                <span>2. Modalidade e Local de Destino</span>
              </div>
              <Tabs
                items={[
                  { key: 'interno', label: 'Destino Interno (Mesmo Cemitério)' },
                  { key: 'externo', label: 'Destino Externo (Outro Município)' },
                ]}
                value={tipoDestino}
                onChange={(v) => setTipoDestino(v as 'interno' | 'externo')}
              />
            </div>

            {tipoDestino === 'interno' ? (
              <div className="grid grid-cols-1 gap-3.5">
                <Field
                  label="Jazigo / Gaveta de Destino (Interno)"
                  required
                  hint="Selecione a sepultura de destino dentro da mesma necrópole"
                  error={erro?.campos?.plot_destino_id?.[0]}
                >
                  {opcoesJazigosDestino.length > 0 ? (
                    <Select
                      value={plotDestinoId}
                      onChange={(v) => setPlotDestinoId(v ?? '')}
                      options={opcoesJazigosDestino}
                      placeholder={carregandoJazigos ? 'Carregando jazigos…' : 'Selecione o jazigo de destino…'}
                    />
                  ) : (
                    <Input
                      type="number"
                      placeholder="Informe o ID numérico do jazigo de destino"
                      className="font-mono tabular-nums"
                      value={plotDestinoId}
                      onChange={(e) => setPlotDestinoId(e.target.value)}
                      required
                    />
                  )}
                </Field>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Field
                  label="Destino Externo (Município / Necrópole)"
                  required
                  hint="Ex.: Cemitério Municipal da Paz, Curitiba/PR"
                  error={erro?.campos?.destino_externo?.[0]}
                >
                  <Input
                    placeholder="Cidade / Estado / Cemitério receptor"
                    value={destinoExterno}
                    onChange={(e) => setDestinoExterno(e.target.value)}
                    required
                  />
                </Field>

                <Field
                  label="Documento Sanitário / Guia de Traslado"
                  required
                  hint="Nº da autorização sanitária ou guia de transporte interestadual"
                  error={erro?.campos?.documento_destino?.[0]}
                >
                  <Input
                    placeholder="Ex.: Guia Sanitária VISA nº 2026/0491"
                    className="font-mono tabular-nums"
                    value={documentoDestino}
                    onChange={(e) => setDocumentoDestino(e.target.value)}
                    required
                  />
                </Field>
              </div>
            )}
          </div>

          {/* ── 3. Agendamento ── */}
          <div className="rounded-xl border border-border bg-card/50 p-4 space-y-3.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b pb-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span>3. Agendamento da Transferência</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Field
                label="Data e Hora Agendada"
                hint="Momento previsto para a remoção e transporte"
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
        </form>

        <ErroBox erro={erro} />
      </div>
    </Modal>
  );
};
