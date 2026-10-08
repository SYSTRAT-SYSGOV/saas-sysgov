import React, { useEffect, useMemo, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, Input, StatCard } from '@sysgov/ui';
import { ScreenState } from '@/components/ui/ScreenState';
import { EmptyState } from '@/components/ui/EmptyState';
import { BarChart3, Map as MapIcon } from 'lucide-react';
import { vistoriaApi } from '../api';
import type { PainelIndicadoresResponse, PainelMapaResponse, PainelProdutividadeResponse } from '../api';

const BRASILIA: [number, number] = [-15.78, -47.93];

const ROTULO_TIPO_DOCUMENTO: Record<string, string> = {
  auto_infracao: 'Auto de Infração',
  notificacao: 'Notificação',
  termo_embargo: 'Termo de Embargo',
  termo_apreensao: 'Termo de Apreensão',
};

function formatarPercentual(valor: number | null): string {
  return valor === null ? '—' : `${(valor * 100).toFixed(1)}%`;
}

function formatarDias(valor: number | null): string {
  return valor === null ? '—' : `${valor.toFixed(1)} dias`;
}

/**
 * Painel gerencial da Secretaria de Agricultura: mapa das vistorias
 * pendentes/realizadas, produtividade por fiscal e indicadores (autuações por
 * tipo, taxa de regularização, tempo médio de conclusão do processo
 * sancionatório), todos filtráveis por período.
 */
export const PainelGerencialView: React.FC = () => {
  const hoje = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const trintaDiasAtras = useMemo(() => new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), []);

  const [dataInicio, setDataInicio] = useState(trintaDiasAtras);
  const [dataFim, setDataFim] = useState(hoje);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mapa, setMapa] = useState<PainelMapaResponse | null>(null);
  const [produtividade, setProdutividade] = useState<PainelProdutividadeResponse | null>(null);
  const [indicadores, setIndicadores] = useState<PainelIndicadoresResponse | null>(null);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    setErro(null);

    const filtros = { data_inicio: dataInicio, data_fim: dataFim };

    Promise.all([
      vistoriaApi.obterPainelMapa(filtros),
      vistoriaApi.obterPainelProdutividade(filtros),
      vistoriaApi.obterPainelIndicadores(filtros),
    ])
      .then(([mapaRes, produtividadeRes, indicadoresRes]) => {
        if (cancelado) return;
        setMapa(mapaRes.data);
        setProdutividade(produtividadeRes.data);
        setIndicadores(indicadoresRes.data);
      })
      .catch(() => {
        if (!cancelado) setErro('Não foi possível carregar o painel gerencial.');
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [dataInicio, dataFim]);

  const totalPendentes = useMemo(
    () => mapa?.features.filter((f) => f.properties.situacao === 'pendente').length ?? 0,
    [mapa],
  );
  const totalRealizadas = useMemo(
    () => mapa?.features.filter((f) => f.properties.situacao === 'realizada').length ?? 0,
    [mapa],
  );

  const dadosProdutividade = useMemo(
    () => (produtividade?.fiscais ?? []).map((f) => ({ nome: f.fiscal_nome ?? `Fiscal #${f.fiscal_id}`, total: f.total_concluidas })),
    [produtividade],
  );

  const dadosAutuacoes = useMemo(
    () =>
      Object.entries(indicadores?.autuacoes_por_tipo ?? {}).map(([tipo, total]) => ({
        tipo: ROTULO_TIPO_DOCUMENTO[tipo] ?? tipo,
        total,
      })),
    [indicadores],
  );

  const centro = mapa && mapa.features.length > 0
    ? ([mapa.features[0].geometry.coordinates[1], mapa.features[0].geometry.coordinates[0]] as [number, number])
    : BRASILIA;

  if (carregando) {
    return <ScreenState type="loading" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-3">
        <Input type="date" label="De" value={dataInicio} max={dataFim} onChange={(e) => setDataInicio(e.target.value)} />
        <Input type="date" label="Até" value={dataFim} min={dataInicio} max={hoje} onChange={(e) => setDataFim(e.target.value)} />
      </div>

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
        <StatCard label="Vistorias Pendentes" value={totalPendentes} accentClassName="border-l-warning" />
        <StatCard label="Vistorias Realizadas" value={totalRealizadas} accentClassName="border-l-success" />
        <StatCard
          label="Taxa de Regularização"
          value={formatarPercentual(indicadores?.taxa_regularizacao ?? null)}
          caption="Reinspeções com regularização constatada"
          accentClassName="border-l-primary"
        />
        <StatCard
          label="Tempo Médio de Conclusão"
          value={formatarDias(indicadores?.tempo_medio_dias_vistoria_ate_conclusao_processo ?? null)}
          caption="Da vistoria até a conclusão do processo"
          accentClassName="border-l-primary"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4 text-primary" />
              Produtividade por Fiscal
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dadosProdutividade.length === 0 ? (
              <EmptyState icon={<BarChart3 className="h-8 w-8" />} title="Sem vistorias concluídas no período" />
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosProdutividade} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                    <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="total" name="Vistorias concluídas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4 text-primary" />
              Autuações por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dadosAutuacoes.length === 0 ? (
              <EmptyState icon={<BarChart3 className="h-8 w-8" />} title="Sem autuações no período" />
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosAutuacoes} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                    <XAxis dataKey="tipo" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="total" name="Documentos emitidos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <MapIcon className="h-4 w-4 text-primary" />
            Mapa de Vistorias
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!mapa || mapa.features.length === 0 ? (
            <EmptyState icon={<MapIcon className="h-8 w-8" />} title="Sem vistorias georreferenciadas no período" />
          ) : (
            <div className="h-[420px] w-full overflow-hidden rounded-lg">
              <MapContainer center={centro} zoom={11} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {mapa.features.map((feature) => (
                  <CircleMarker
                    key={feature.id}
                    center={[feature.geometry.coordinates[1], feature.geometry.coordinates[0]]}
                    radius={8}
                    pathOptions={{
                      color: feature.properties.situacao === 'realizada' ? 'hsl(var(--success))' : 'hsl(var(--warning))',
                      fillColor: feature.properties.situacao === 'realizada' ? 'hsl(var(--success))' : 'hsl(var(--warning))',
                      fillOpacity: 0.8,
                    }}
                  >
                    <Popup>
                      <strong>{feature.properties.local_nome}</strong>
                      <br />
                      {feature.properties.tipo_acao} · {feature.properties.situacao === 'realizada' ? 'Realizada' : 'Pendente'}
                      <br />
                      {feature.properties.data_prevista}
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PainelGerencialView;
