import React, { useEffect, useState } from 'react';
import { Card, CardContent, Button, Badge, Modal, Input, Textarea } from '@sysgov/ui';
import { PageHeader } from '@/components/ui/PageHeader';
import { ScreenState } from '@/components/ui/ScreenState';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadgeProposicao } from '../components';
import type { StatusProposicao } from '../components';
import { requerimentosApi } from '../api';
import type { TramitacaoPoderes } from '../api';
import { ArrowLeftRight, CheckCircle2, Send, Eye, ClipboardCheck } from 'lucide-react';

export const TramitacoesView: React.FC = () => {
  const [tramitacoes, setTramitacoes] = useState<TramitacaoPoderes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTramitacao, setSelectedTramitacao] = useState<TramitacaoPoderes | null>(null);
  const [respostaTexto, setRepostaTexto] = useState('');
  const [enviandoResposta, setEnviandoResposta] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const res = await requerimentosApi.getTramitacoes({ per_page: 50 });
      setTramitacoes(res.data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const handleReceber = async (id: number) => {
    try {
      await requerimentosApi.registrarRecebimento(id);
      carregar();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar recebimento');
    }
  };

  const handleResponder = async () => {
    if (!selectedTramitacao || !respostaTexto.trim()) return;
    setEnviandoResposta(true);
    try {
      await requerimentosApi.criarResposta({
        tramitacao_id: selectedTramitacao.id,
        conteudo: respostaTexto,
        enviar_diretamente: true,
      });
      setSelectedTramitacao(null);
      setRepostaTexto('');
      carregar();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar resposta');
    } finally {
      setEnviandoResposta(false);
    }
  };

  const statusTramitacaoLabel: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' }> = {
    encaminhado: { label: 'Encaminhado', variant: 'warning' },
    recebido:    { label: 'Recebido',    variant: 'info' },
    respondido:  { label: 'Respondido',  variant: 'success' },
    vencido:     { label: 'Vencido',     variant: 'danger' },
  };

  if (loading) return <ScreenState type="loading" title="Carregando tramitações..." />;
  if (error) return <ScreenState type="error" title="Erro" description={error} actionLabel="Tentar novamente" onAction={carregar} />;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ArrowLeftRight className="h-6 w-6" />}
        title="Tramitações entre Poderes"
        subtitle="Acompanhe o fluxo de proposições entre Câmara e Prefeitura"
      />

      {tramitacoes.length === 0 ? (
        <EmptyState
          icon={<ArrowLeftRight className="h-10 w-10" />}
          title="Nenhuma tramitação registrada"
          description="As tramitações entre Poderes aparecerão aqui."
        />
      ) : (
        <div className="space-y-3">
          {tramitacoes.map((t) => {
            const st = statusTramitacaoLabel[t.status] ?? { label: t.status, variant: 'default' as const };
            return (
              <Card key={t.id} className="hover:border-primary/30">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-bold">
                          {t.proposicao?.numero ?? `#${t.proposicao_id}`}
                        </span>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </div>
                      <p className="text-sm mt-1">
                        {t.poder_origem} → {t.poder_destino}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                        <span>Encaminhado: {new Date(t.data_encaminhamento).toLocaleDateString('pt-BR')}</span>
                        {t.data_recebimento && (
                          <span>Recebido: {new Date(t.data_recebimento).toLocaleDateString('pt-BR')}</span>
                        )}
                        <span>Prazo: {new Date(t.data_limite_resposta).toLocaleDateString('pt-BR')}</span>
                      </div>
                      {t.proposicao?.ementa && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{t.proposicao.ementa}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {t.responsavel && (
                        <span className="text-xs text-muted-foreground">
                          Resp: {t.responsavel.name}
                        </span>
                      )}
                      {t.status === 'encaminhado' && (
                        <Button size="sm" onClick={() => handleReceber(t.id)}>
                          <ClipboardCheck className="h-4 w-4 mr-1" />
                          Registrar Recebimento
                        </Button>
                      )}
                      {t.status === 'recebido' && (
                        <Button size="sm" onClick={() => setSelectedTramitacao(t)}>
                          <Send className="h-4 w-4 mr-1" />
                          Responder
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de Resposta */}
      {selectedTramitacao && (
        <Modal
          open
          onClose={() => { setSelectedTramitacao(null); setRepostaTexto(''); }}
          size="md"
          icon={<Send className="h-5 w-5" />}
          title="Elaborar Resposta"
          description={`Proposição: ${selectedTramitacao.proposicao?.numero} — ${selectedTramitacao.proposicao?.ementa}`}
        >
          <div className="space-y-4">
            <Textarea
              value={respostaTexto}
              onChange={(e) => setRepostaTexto(e.target.value)}
              placeholder="Digite o conteúdo da resposta formal..."
              rows={8}
            />

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setSelectedTramitacao(null)}>
                Cancelar
              </Button>
              <Button onClick={handleResponder} disabled={!respostaTexto.trim() || enviandoResposta} loading={enviandoResposta}>
                <Send className="h-4 w-4 mr-2" />
                Enviar Resposta
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};