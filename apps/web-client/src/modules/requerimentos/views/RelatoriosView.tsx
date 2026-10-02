import React, { useEffect, useState } from 'react';
import { Card, CardContent, Select } from '@sysgov/ui';
import type { SelectOption } from '@sysgov/ui';
import { PageHeader } from '@/components/ui/PageHeader';
import { ScreenState } from '@/components/ui/ScreenState';
import { EmptyState } from '@/components/ui/EmptyState';
import { MiniKpiCard, statusConfig } from '../components';
import type { StatusProposicao } from '../components';
import { requerimentosApi } from '../api';
import type {
  RelatorioQuantitativo,
  RelatorioTempoMedio,
  RelatorioCumprimentoPrazos,
} from '../api';
import { BarChart3, FileText } from 'lucide-react';

type TipoRelatorio = 'quantitativo' | 'tempo-medio' | 'cumprimento-prazos';

const VARIANT_BAR_CLASS: Record<string, string> = {
  default: 'bg-muted-foreground/40',
  success: 'bg-status-success',
  warning: 'bg-status-warning',
  danger: 'bg-status-danger',
  info: 'bg-status-info',
};

/** Barra horizontal simples (rótulo + valor sempre em texto, cor nunca é a única pista). */
const BarraPercentual: React.FC<{
  label: React.ReactNode;
  valor: number;
  maximo: number;
  corClasse?: string;
  sufixo?: string;
}> = ({ label, valor, maximo, corClasse = 'bg-primary', sufixo = '' }) => {
  const pct = maximo > 0 ? Math.round((valor / maximo) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="min-w-0 truncate">{label}</span>
        <span className="font-mono tabular-nums text-muted-foreground shrink-0">
          {valor}
          {sufixo}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${corClasse}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const RelatorioQuantitativoView: React.FC<{ dados: RelatorioQuantitativo }> = ({ dados }) => {
  const maxTipo = Math.max(1, ...dados.por_tipo.map((t) => t.total));
  const maxArea = Math.max(1, ...dados.por_area.map((a) => a.total));
  const maxAutor = Math.max(1, ...dados.por_autor.map((a) => a.total));
  const statusEntries = Object.entries(dados.por_status);
  const maxStatus = Math.max(1, ...statusEntries.map(([, total]) => total));

  return (
    <div className="space-y-6">
      <MiniKpiCard title="Total de Proposições" value={dados.total} icon={<FileText className="h-5 w-5" />} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold">Por Status</h3>
            {statusEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados no período.</p>
            ) : (
              statusEntries.map(([status, total]) => {
                const config = statusConfig[status as StatusProposicao];
                return (
                  <BarraPercentual
                    key={status}
                    label={config?.label ?? status}
                    valor={total}
                    maximo={maxStatus}
                    corClasse={VARIANT_BAR_CLASS[config?.variant ?? 'default']}
                  />
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold">Por Tipo de Instrumento</h3>
            {dados.por_tipo.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados no período.</p>
            ) : (
              dados.por_tipo
                .slice()
                .sort((a, b) => b.total - a.total)
                .map((t) => (
                  <BarraPercentual key={t.slug ?? t.tipo} label={t.tipo ?? '—'} valor={t.total} maximo={maxTipo} />
                ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold">Por Área Temática</h3>
            {dados.por_area.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma proposição com área temática informada.</p>
            ) : (
              dados.por_area.map((a) => (
                <BarraPercentual key={a.area_tematica} label={a.area_tematica} valor={a.total} maximo={maxArea} />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold">Por Autor (top 20)</h3>
            {dados.por_autor.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados no período.</p>
            ) : (
              dados.por_autor.map((a, i) => (
                <BarraPercentual key={`${a.autor}-${i}`} label={a.autor ?? '—'} valor={a.total} maximo={maxAutor} />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const RelatorioTempoMedioView: React.FC<{ dados: RelatorioTempoMedio }> = ({ dados }) => {
  if (dados.por_tipo.length === 0) {
    return (
      <EmptyState
        icon={<BarChart3 className="h-10 w-10" />}
        title="Sem tramitações concluídas"
        description={`Nenhuma tramitação com recebimento registrado no exercício ${dados.exercicio}.`}
      />
    );
  }

  const maxMedia = Math.max(1, ...dados.por_tipo.map((t) => t.media_dias));

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <h3 className="text-sm font-semibold">Tempo médio de tramitação — exercício {dados.exercicio}</h3>
        <div className="space-y-4">
          {dados.por_tipo.map((t) => (
            <div key={t.slug} className="space-y-1.5 pb-3 border-b border-border last:border-0 last:pb-0">
              <BarraPercentual
                label={t.tipo}
                valor={t.media_dias}
                maximo={maxMedia}
                sufixo={t.media_dias === 1 ? ' dia' : ' dias'}
              />
              <div className="flex gap-4 text-xs text-muted-foreground pl-0.5 font-mono tabular-nums">
                <span>{t.total} tramitação(ões)</span>
                <span>mediana: {t.mediana_dias}d</span>
                <span>desvio padrão: {t.desvio_padrao}d</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const RelatorioCumprimentoPrazosView: React.FC<{ dados: RelatorioCumprimentoPrazos }> = ({ dados }) => {
  if (dados.por_tipo.length === 0) {
    return (
      <EmptyState
        icon={<BarChart3 className="h-10 w-10" />}
        title="Sem tramitações"
        description={`Nenhuma tramitação registrada no exercício ${dados.exercicio}.`}
      />
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-semibold">Cumprimento de prazos — exercício {dados.exercicio}</h3>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-status-success" />No prazo</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-status-warning" />Em alerta</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-status-danger" />Vencido</span>
          </div>
        </div>

        <div className="space-y-4">
          {dados.por_tipo.map((t) => (
            <div key={t.slug} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span>{t.tipo}</span>
                <span className="font-mono tabular-nums text-muted-foreground">{t.total} tramitação(ões)</span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden flex">
                {t.no_prazo_pct > 0 && (
                  <div className="h-full bg-status-success" style={{ width: `${t.no_prazo_pct}%` }} />
                )}
                {t.em_alerta_pct > 0 && (
                  <div className="h-full bg-status-warning" style={{ width: `${t.em_alerta_pct}%` }} />
                )}
                {t.vencido_pct > 0 && (
                  <div className="h-full bg-status-danger" style={{ width: `${t.vencido_pct}%` }} />
                )}
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground font-mono tabular-nums">
                <span>{t.no_prazo} no prazo ({t.no_prazo_pct}%)</span>
                <span>{t.em_alerta} em alerta ({t.em_alerta_pct}%)</span>
                <span>{t.vencido} vencido ({t.vencido_pct}%)</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export const RelatoriosView: React.FC = () => {
  const [tipoRelatorio, setTipoRelatorio] = useState<TipoRelatorio>('quantitativo');
  const [dados, setDados] = useState<RelatorioQuantitativo | RelatorioTempoMedio | RelatorioCumprimentoPrazos | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      setErro(null);
      try {
        switch (tipoRelatorio) {
          case 'tempo-medio':
            setDados((await requerimentosApi.getRelatorioTempoMedio()).data);
            break;
          case 'cumprimento-prazos':
            setDados((await requerimentosApi.getRelatorioCumprimentoPrazos()).data);
            break;
          default:
            setDados((await requerimentosApi.getRelatorioQuantitativo()).data);
        }
      } catch (err: unknown) {
        setErro(err instanceof Error ? err.message : 'Erro ao gerar o relatório');
        setDados(null);
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, [tipoRelatorio]);

  const tipoOptions: SelectOption[] = [
    { value: 'quantitativo', label: 'Quantitativo' },
    { value: 'tempo-medio', label: 'Tempo Médio de Tramitação' },
    { value: 'cumprimento-prazos', label: 'Cumprimento de Prazos' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<BarChart3 className="h-6 w-6" />}
        title="Relatórios Gerenciais"
        subtitle="Indicadores e estatísticas de proposições e tramitações"
      />

      <div className="w-64">
        <Select
          value={tipoRelatorio}
          onChange={(val) => setTipoRelatorio(val as TipoRelatorio)}
          options={tipoOptions}
        />
      </div>

      {loading ? (
        <ScreenState type="loading" title="Gerando relatório..." />
      ) : erro || !dados ? (
        <ScreenState type="error" title="Erro" description={erro ?? 'Não foi possível gerar o relatório.'} />
      ) : tipoRelatorio === 'quantitativo' ? (
        <RelatorioQuantitativoView dados={dados as RelatorioQuantitativo} />
      ) : tipoRelatorio === 'tempo-medio' ? (
        <RelatorioTempoMedioView dados={dados as RelatorioTempoMedio} />
      ) : (
        <RelatorioCumprimentoPrazosView dados={dados as RelatorioCumprimentoPrazos} />
      )}
    </div>
  );
};
