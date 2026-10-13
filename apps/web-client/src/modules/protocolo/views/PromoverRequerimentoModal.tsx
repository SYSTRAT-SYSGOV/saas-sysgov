import React, { useState, useEffect } from 'react';
import { Modal, Button, Select, Textarea, Card, CardContent } from '@sysgov/ui';
import type { ProtocoloSdk } from '@sysgov/sdk';
import { protocoloApi } from '../api';
import { apiClient } from '@/core/api/client';
import { ArrowUpRight, AlertCircle, CheckCircle2 } from 'lucide-react';

interface PromoverRequerimentoModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (processo: ProtocoloSdk.Processo) => void;
}

interface RequerimentoItem {
  id: number;
  numero: string;
  ementa: string;
  autor_nome?: string;
  vinculacao_processo_id?: number | null;
}

export function PromoverRequerimentoModal({
  open,
  onClose,
  onSuccess,
}: PromoverRequerimentoModalProps) {
  const [requerimentos, setRequerimentos] = useState<RequerimentoItem[]>([]);
  const [selectedReqId, setSelectedReqId] = useState<string>('');
  const [orgaos, setOrgaos] = useState<{ value: string; label: string }[]>([]);
  const [orgaoDestinoId, setOrgaoDestinoId] = useState<string>('');
  const [tiposTramitacao, setTiposTramitacao] = useState<{ value: string; label: string }[]>([]);
  const [tipoTramitacaoId, setTipoTramitacaoId] = useState<string>('');
  const [despachoInicial, setDespachoInicial] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLoading(true);
      setErro(null);

      // Carregar proposições/requerimentos elegíveis
      apiClient.get<{ data: RequerimentoItem[] }>('/requerimentos/proposicoes')
        .then((res) => {
          const list = (res.data?.data || []).filter((r) => !r.vinculacao_processo_id);
          setRequerimentos(list);
          if (list.length > 0) {
            setSelectedReqId(String(list[0].id));
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));

      // Carregar órgãos
      apiClient.get<{ id: number; name: string; code?: string }[]>('/org/units')
        .then((res) => {
          const list = (res.data || []).map((o) => ({
            value: String(o.id),
            label: o.code ? `[${o.code}] ${o.name}` : o.name,
          }));
          setOrgaos(list);
          if (list.length > 0) {
            setOrgaoDestinoId(list[0].value);
          }
        })
        .catch(() => {});

      // Carregar tipos de tramitação
      protocoloApi.listarTiposTramitacao()
        .then((lista) => {
          const list = lista.filter((t) => t.ativo).map((t) => ({
            value: String(t.id),
            label: t.nome,
          }));
          setTiposTramitacao(list);
          if (list.length > 0) {
            setTipoTramitacaoId(list[0].value);
          }
        })
        .catch(() => {});
    }
  }, [open]);

  const reqSelecionado = requerimentos.find((r) => String(r.id) === selectedReqId);

  const handlePromover = async () => {
    if (!selectedReqId) {
      setErro('Selecione um requerimento para promover.');
      return;
    }

    setErro(null);
    setSubmitting(true);

    try {
      const processo = await protocoloApi.promoverRequerimento({
        requerimento_id: Number(selectedReqId),
        orgao_destino_id: orgaoDestinoId ? Number(orgaoDestinoId) : undefined,
        tipo_tramitacao_id: tipoTramitacaoId ? Number(tipoTramitacaoId) : undefined,
        despacho_inicial: despachoInicial.trim() || undefined,
      });

      onSuccess(processo);
      onClose();
    } catch (err: any) {
      if (err.response?.status === 409) {
        setErro('Este requerimento já foi promovido anteriormente ou possui processo de origem vinculado.');
      } else {
        setErro(err.response?.data?.message || 'Falha ao promover requerimento a processo administrativo.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Promover Requerimento a Processo Administrativo"
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={handlePromover}
            isLoading={submitting}
            disabled={!selectedReqId || loading}
          >
            <ArrowUpRight className="w-4 h-4 mr-1.5" />
            Confirmar Promoção
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {erro && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-md flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          A promoção converte uma proposição ou demanda legislativa em um processo administrativo autônomo,
          criando um vínculo bidirecional de origem rastreável.
        </p>

        <Select
          label="Selecione o Requerimento / Proposição *"
          value={selectedReqId}
          onChange={setSelectedReqId}
          options={requerimentos.map((r) => ({
            value: String(r.id),
            label: `${r.numero} - ${r.ementa.slice(0, 70)}...`,
          }))}
          disabled={loading || requerimentos.length === 0}
        />

        {requerimentos.length === 0 && !loading && (
          <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded border border-amber-200">
            Nenhum requerimento pendente de promoção encontrado.
          </p>
        )}

        {reqSelecionado && (
          <Card className="bg-muted/30">
            <CardContent className="p-3 space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground font-mono tabular-nums">
                  {reqSelecionado.numero}
                </span>
                {reqSelecionado.autor_nome && (
                  <span className="text-xs text-muted-foreground">
                    Autor: {reqSelecionado.autor_nome}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {reqSelecionado.ementa}
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select
            label="Órgão de Destino Inicial"
            value={orgaoDestinoId}
            onChange={setOrgaoDestinoId}
            options={orgaos}
          />
          <Select
            label="Tipo de Tramitação"
            value={tipoTramitacaoId}
            onChange={setTipoTramitacaoId}
            options={tiposTramitacao}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground block mb-1">
            Despacho Inaugural de Promoção
          </label>
          <Textarea
            value={despachoInicial}
            onChange={(e) => setDespachoInicial(e.target.value)}
            rows={3}
            placeholder="Ex: Convertido em processo para análise técnica da Secretaria..."
          />
        </div>
      </div>
    </Modal>
  );
}
