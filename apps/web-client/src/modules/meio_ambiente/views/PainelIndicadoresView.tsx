import React, { useEffect, useMemo, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, Input, StatCard } from '@sysgov/ui';
import { ScreenState } from '@/components/ui/ScreenState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Flame, Map as MapIcon, Recycle } from 'lucide-react';
import { meioAmbienteApi, type IndicadoresAmbientais, type PainelMapaAmbiental } from '../api';

const BRASILIA: [number, number] = [-15.78, -47.93];

function formatarCentavos(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarNumero(valor: number, casas = 2): string {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas });
}

/** 'YYYY-MM' → 'MM/YYYY' para o eixo dos gráficos. */
function rotuloMes(mes: string): string {
  const [ano, m] = mes.split('-');
  return `${m}/${ano}`;
}

/**
 * Painel de indicadores ambientais da chefia: licenças emitidas, multas aplicadas
 * x arrecadadas, evolução da área queimada e da coleta seletiva, e mapa de
 * queimadas/licenças do período. Padrão do ano corrente até hoje (o backend usa o
 * mesmo padrão quando nenhum período é informado).
 */
export const PainelIndicadoresView: React.FC = () => {
  const hoje = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const inicioDoAno = useMemo(() => `${hoje.slice(0, 4)}-01-01`, [hoje]);

  const [dataInicio, setDataInicio] = useState(inicioDoAno);
  const [dataFim, setDataFim] = useState(hoje);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [indicadores, setIndicadores] = useState<IndicadoresAmbientais | null>(null);
  const [mapa, setMapa] = useState<PainelMapaAmbiental | null>(null);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    setErro(null);

    const filtros = { data_inicio: dataInicio, data_fim: dataFim };

    Promise.all([meioAmbienteApi.obterIndicadoresAmbientais(filtros), meioAmbienteApi.obterMapaPainelAmbiental(filtros)])
      .then(([indicadoresRes, mapaRes]) => {
        if (cancelado) return;
        setIndicadores(indicadoresRes);
        setMapa(mapaRes);
      })
      .catch(() => {
        if (!cancelado) setErro('Não foi possível carregar o painel de indicadores.');
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [dataInicio, dataFim]);

  const evolucaoQueimadas = useMemo(
    () => (indicadores?.queimadas.evolucao_mensal ?? []).map((p) => ({ mes: rotuloMes(p.mes), area_km2: p.area_km2 })),
    [indicadores],
  );
  const evolucaoColeta = useMemo(
    () => (indicadores?.coleta_seletiva.evolucao_mensal ?? []).map((p) => ({ mes: rotuloMes(p.mes), toneladas: p.toneladas })),
    [indicadores],
  );

  const centro = mapa && mapa.features.length > 0
    ? ([mapa.features[0].geometry.coordinates[1], mapa.features[0].geometry.coordinates[0]] as [number, number])
    : BRASILIA;

  if (carregando) {
    return <ScreenState type="loading" />;
  }

  const multas = indicadores?.multas;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-3">
        <Input type="date" label="De" value={dataInicio} max={dataFim} onChange={(e) => setDataInicio(e.target.value)} />
        <Input type="date" label="Até" value={dataFim} min={dataInicio} max={hoje} onChange={(e) => setDataFim(e.target.value)} />
      </div>

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
        <StatCard
          label="Licenças Emitidas"
          value={indicadores?.licencas_emitidas.total ?? 0}
          caption="Processos deferidos no período"
          accentClassName="border-l-success"
        />
        <StatCard
          label="Multas Aplicadas x Arrecadadas"
          value={multas ? formatarCentavos(multas.valor_aplicado_centavos) : '—'}
          caption={multas ? `Arrecadado: ${formatarCentavos(multas.valor_arrecadado_centavos)}` : undefined}
          accentClassName="border-l-warning"
        />
        <StatCard
          label="Área Queimada"
          value={`${formatarNumero(indicadores?.queimadas.area_queimada_km2 ?? 0, 4)} km²`}
          caption={`${indicadores?.queimadas.ocorrencias ?? 0} ocorrência(s)`}
          accentClassName="border-l-destructive"
        />
        <StatCard
          label="Coleta Seletiva"
          value={`${formatarNumero(indicadores?.coleta_seletiva.coleta_seletiva_toneladas ?? 0, 3)} t`}
          caption="Toneladas coletadas no período"
          accentClassName="border-l-primary"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Flame className="h-4 w-4 text-primary" />
              Evolução da Área Queimada (km²)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(indicadores?.queimadas.ocorrencias ?? 0) === 0 ? (
              <EmptyState icon={<Flame className="h-8 w-8" />} title="Sem ocorrências de queimada no período" />
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={evolucaoQueimadas} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="area_km2" name="Área queimada (km²)" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Recycle className="h-4 w-4 text-primary" />
              Cobertura da Coleta Seletiva (t)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(indicadores?.coleta_seletiva.coleta_seletiva_toneladas ?? 0) === 0 ? (
              <EmptyState icon={<Recycle className="h-8 w-8" />} title="Sem coleta seletiva no período" />
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={evolucaoColeta} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="toneladas" name="Coleta seletiva (t)" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
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
            Mapa de Queimadas e Licenças Emitidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!mapa || mapa.features.length === 0 ? (
            <EmptyState icon={<MapIcon className="h-8 w-8" />} title="Sem queimadas ou licenças georreferenciadas no período" />
          ) : (
            <div className="h-[420px] w-full overflow-hidden rounded-lg">
              <MapContainer center={centro} zoom={11} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {mapa.features.map((feature) => {
                  const cor = feature.properties.camada === 'queimada' ? 'hsl(var(--destructive))' : 'hsl(var(--success))';
                  return (
                    <CircleMarker
                      key={feature.id}
                      center={[feature.geometry.coordinates[1], feature.geometry.coordinates[0]]}
                      radius={8}
                      pathOptions={{ color: cor, fillColor: cor, fillOpacity: 0.8 }}
                    >
                      <Popup>
                        {feature.properties.camada === 'queimada' ? (
                          <>
                            <strong>Queimada</strong>
                            <br />
                            {feature.properties.data_ocorrencia}
                            {feature.properties.area_queimada_ha !== null && ` · ${formatarNumero(feature.properties.area_queimada_ha)} ha`}
                          </>
                        ) : (
                          <>
                            <strong>Licença {feature.properties.numero}</strong>
                            <br />
                            {feature.properties.fase}
                            {feature.properties.empreendimento && ` · ${feature.properties.empreendimento}`}
                          </>
                        )}
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PainelIndicadoresView;
