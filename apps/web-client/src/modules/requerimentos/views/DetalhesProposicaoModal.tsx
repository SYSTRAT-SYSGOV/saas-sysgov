import React, { useEffect, useState } from 'react';
import { Modal, Card, CardContent, Badge, Button } from '@sysgov/ui';
import { Eye, Clock, Pencil, Send } from 'lucide-react';
import { ScreenState } from '@/components/ui/ScreenState';
import { StatusBadgeProposicao, AnexosList } from '../components';
import type { StatusProposicao } from '../components';
import { TimelineTramitacao } from '../components/TimelineTramitacao';
import type { TimelineEvent } from '../components/TimelineTramitacao';
import { requerimentosApi } from '../api';
import type { Anexo, Proposicao, TramitacaoPoderes } from '../api';

interface DetalhesProposicaoModalProps {
  id: number;
  onClose: () => void;
  /** Quando informado, mostra o botão "Editar" (só habilitado enquanto `status === 'protocolado'` — a API bloqueia edição após o encaminhamento). */
  onEdit?: () => void;
  /** Quando informado, mostra o botão "Encaminhar" (só enquanto `status === 'protocolado'`). Recebe a proposição já carregada. */
  onEncaminhar?: (proposicao: Proposicao) => void;
}

export const DetalhesProposicaoModal: React.FC<DetalhesProposicaoModalProps> = ({ id, onClose, onEdit, onEncaminhar }) => {
  const [proposicao, setProposicao] = useState<Proposicao | null>(null);
  const [tramitacoes, setTramitacoes] = useState<TramitacaoPoderes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await requerimentosApi.getHistorico(id);
        setProposicao(res.data.proposicao);
        setTramitacoes(res.data.tramitacoes_poderes);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar detalhes');
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, [id]);

  const handleUpload = async (arquivo: File) => {
    const resposta = await requerimentosApi.anexarNaProposicao(id, arquivo);
    setProposicao((atual) => (atual ? { ...atual, anexos: [...(atual.anexos ?? []), resposta.data] } : atual));
  };

  const handleExcluirAnexo = async (anexo: Anexo) => {
    await requerimentosApi.excluirAnexo(anexo.id);
    setProposicao((atual) =>
      atual ? { ...atual, anexos: (atual.anexos ?? []).filter((a) => a.id !== anexo.id) } : atual,
    );
  };

  if (loading) return <Modal open onClose={onClose} size="lg" title="Detalhes da Proposição" icon={<Eye className="h-5 w-5" />}><ScreenState type="loading" title="Carregando..." /></Modal>;
  if (error || !proposicao) return <Modal open onClose={onClose} size="lg" title="Detalhes da Proposição" icon={<Eye className="h-5 w-5" />}><ScreenState type="error" title="Erro" description={error ?? 'Proposição não encontrada'} /></Modal>;

  const timelineEvents: TimelineEvent[] = [
    // Evento de criação
    {
      id: 0,
      tipo: 'status_change',
      titulo: 'Proposição Protocolada',
      descricao: `Protocolada como ${proposicao.numero}`,
      data: new Date(proposicao.created_at).toLocaleString('pt-BR'),
      status: 'concluido',
    },
    // Tramitações
    ...tramitacoes.map((t, idx) => ({
      id: t.id + 1000,
      tipo: 'tramitacao_poderes' as const,
      titulo: t.status === 'encaminhado' ? `Encaminhado para ${t.poder_destino}` :
              t.status === 'recebido' ? `Recebido pelo ${t.poder_destino}` :
              t.status === 'respondido' ? 'Resposta enviada' :
              t.status === 'vencido' ? 'Prazo vencido' : t.status,
      descricao: t.observacao ?? `Tramitação ${t.poder_origem} → ${t.poder_destino}`,
      data: new Date(t.created_at).toLocaleString('pt-BR'),
      status: t.status === 'respondido' ? 'concluido' :
              t.status === 'vencido' ? 'atrasado' : 'concluido',
    })),
  ];

  return (
    <Modal
      open
      onClose={onClose}
      size="full"
      icon={<Eye className="h-5 w-5" />}
      title={proposicao.numero}
      description={proposicao.ementa}
      headerActions={
        proposicao.status === 'protocolado' ? (
          <div className="flex items-center gap-2">
            {onEncaminhar && (
              <Button variant="outline" size="sm" onClick={() => onEncaminhar(proposicao)}>
                <Send className="h-3.5 w-3.5 mr-1.5" />
                Encaminhar
              </Button>
            )}
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Editar
              </Button>
            )}
          </div>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {/* Metadados */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <StatusBadgeProposicao status={proposicao.status as StatusProposicao} />
          {proposicao.tipo_instrumento && (
            <Badge variant="info">{proposicao.tipo_instrumento.nome}</Badge>
          )}
          <span>Autor: <strong>{proposicao.autor_principal?.name}</strong></span>
          {proposicao.area_tematica && <span>• Área: <strong>{proposicao.area_tematica}</strong></span>}
          <span>• Poder: <strong>{proposicao.poder_origem}</strong></span>
        </div>

        {/* Grid: conteúdo + timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conteúdo da proposição */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-2">Justificativa</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {proposicao.justificativa || 'Não informada.'}
                </p>
              </CardContent>
            </Card>

            {proposicao.conteudo && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold mb-2">Texto Integral</h3>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap max-h-96 overflow-y-auto">
                    {proposicao.conteudo}
                  </div>
                </CardContent>
              </Card>
            )}

            {proposicao.dispositivos_legais && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold mb-2">Dispositivos Legais</h3>
                  <p className="text-sm text-muted-foreground">{proposicao.dispositivos_legais}</p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-4">
                <AnexosList
                  anexos={proposicao.anexos ?? []}
                  onUpload={handleUpload}
                  onDelete={handleExcluirAnexo}
                  podeAnexar
                />
              </CardContent>
            </Card>
          </div>

          {/* Timeline */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Histórico de Tramitação
                </h3>
                <TimelineTramitacao eventos={timelineEvents} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Modal>
  );
};