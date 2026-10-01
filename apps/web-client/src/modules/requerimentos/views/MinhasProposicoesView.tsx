import React, { useEffect, useState } from 'react';
import { Card, CardContent, Button } from '@sysgov/ui';
import { ScreenState } from '@/components/ui/ScreenState';
import { EmptyState } from '@/components/ui/EmptyState';
import { MiniKpiCard } from '../components';
import { StatusBadgeProposicao } from '../components/StatusBadgeProposicao';
import type { StatusProposicao } from '../components/StatusBadgeProposicao';
import { requerimentosApi } from '../api';
import type { Proposicao, KpiAutor } from '../api';
import { FileText, Eye, AlertTriangle, CheckCircle2, RefreshCw, ArrowRight } from 'lucide-react';

export const MinhasProposicoesView: React.FC = () => {
  const [kpis, setKpis] = useState<KpiAutor | null>(null);
  const [proposicoes, setProposicoes] = useState<Proposicao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const res = await requerimentosApi.getMinhasProposicoes({ per_page: 50 });
      setKpis(res.data.kpis);
      setProposicoes(res.data.proposicoes.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  if (loading) return <ScreenState variant="loading" title="Carregando..." />;
  if (error) return <ScreenState variant="error" title="Erro" message={error} onRetry={carregar} />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Minhas Proposições</h2>

      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MiniKpiCard title="Total" value={kpis.total} icon={<FileText className="h-5 w-5" />} variant="default" />
          <MiniKpiCard title="Em Tramitação" value={kpis.em_tramitacao} icon={<RefreshCw className="h-5 w-5" />} variant="info" />
          <MiniKpiCard title="Respondidas" value={kpis.respondidas} icon={<CheckCircle2 className="h-5 w-5" />} variant="success" />
          <MiniKpiCard title="Vencidas" value={kpis.vencidas} icon={<AlertTriangle className="h-5 w-5" />} variant="danger" />
        </div>
      )}

      {proposicoes.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-10 w-10" />}
          title="Nenhuma proposição de sua autoria"
          description="Suas proposições aparecerão aqui."
        />
      ) : (
        <div className="space-y-3">
          {proposicoes.map((p) => (
            <Card key={p.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-bold">{p.numero}</span>
                      <StatusBadgeProposicao status={p.status as StatusProposicao} />
                    </div>
                    <p className="text-sm font-medium mt-1">{p.ementa}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {p.tipo_instrumento?.nome} • Área: {p.area_tematica || 'não informada'} •{' '}
                      {new Date(p.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <a href={`#proposicoes`}>
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};