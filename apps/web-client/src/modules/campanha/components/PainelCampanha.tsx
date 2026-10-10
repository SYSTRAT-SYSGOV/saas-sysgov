import React, { useState } from 'react';
import { CalendarDays, Landmark, Map as MapIcon, Megaphone, QrCode, Target, UserCog, Users, Wallet } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertCard, Button, Card, CardContent, CardHeader, CardTitle, KpiCard, Skeleton } from '@sysgov/ui';
import { formatarCentavos } from '@/lib/formatacao';
import { useCarga } from '../../escola/useCarga';
import { campanhaApi, type Camada } from '../api';
import { ROTULO_CAMADA, ROTULO_SITUACAO, SITUACOES, formatarNumero } from '../formato';
import type { PropsAba } from '../ModuloCampanhaMain';
import { MapaCampanha } from './MapaCampanha';
import { ProximosCompromissos } from './AgendaCampanha';

const CAMADAS: Camada[] = ['situacao', 'apoio_prefeito', 'meta_votos', 'mapa_calor'];

/** Painel da campanha: indicadores, mapa interativo com as três camadas e gráficos (spec: Mapa interativo). */
export const PainelCampanha: React.FC<PropsAba> = ({ campanha, abrirMunicipio, versao, permissoes }) => {
  const [camada, setCamada] = useState<Camada>('situacao');
  const dados = useCarga(async () => {
    const [pontos, painel, calor, indicadores] = await Promise.all([campanhaApi.mapa(), campanhaApi.painel(), campanhaApi.mapaCalor(), campanhaApi.indicadoresEleitores()]);
    const captados = Object.fromEntries(indicadores.por_municipio.map((m) => [m.codigo_ibge, m.total]));
    // O saldo só é pedido por quem vê o financeiro (o servidor responderia 403 aos demais).
    const caixa = permissoes.financeiroVer ? await campanhaApi.resumoFinanceiro() : null;
    return { pontos, painel, calor, indicadores, captados, caixa };
  }, [campanha.id, versao, permissoes.financeiroVer]);

  if (dados.erro) return <AlertCard priority="danger" title="Não foi possível carregar o painel" description={dados.erro} actionLabel="Tentar novamente" onAction={() => void dados.recarregar()} />;
  if (!dados.dados) return <Skeleton className="h-[640px] w-full" />;
  const { pontos, painel, calor, indicadores, captados, caixa } = dados.dados;
  const pizza = SITUACOES.map((s) => ({ nome: ROTULO_SITUACAO[s], valor: painel.por_situacao[s], cor: campanha.cores[s] })).filter((p) => p.valor > 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <KpiCard title="Municípios" value={formatarNumero(painel.municipios)} subtitle={`${formatarNumero(painel.eleitores)} eleitores`} icon={<MapIcon className="h-5 w-5" />} className="font-mono tabular-nums" />
        <KpiCard title="Meta de votos" value={formatarNumero(painel.meta_total)} subtitle={painel.meta_global ? `meta global ${formatarNumero(painel.meta_global)}` : 'soma dos municípios'} icon={<Target className="h-5 w-5" />} className="font-mono tabular-nums" />
        <KpiCard title="Coordenadores" value={formatarNumero(painel.coordenadores)} icon={<UserCog className="h-5 w-5" />} className="font-mono tabular-nums" />
        <KpiCard title="Cabos eleitorais" value={formatarNumero(painel.cabos_eleitorais)} icon={<Megaphone className="h-5 w-5" />} className="font-mono tabular-nums" />
        <KpiCard title="Prefeitos aliados" value={formatarNumero(painel.prefeitos_aliados)} icon={<Landmark className="h-5 w-5" />} className="font-mono tabular-nums" />
        <KpiCard title="Vereadores aliados" value={formatarNumero(painel.vereadores_aliados)} icon={<Users className="h-5 w-5" />} className="font-mono tabular-nums" />
        <KpiCard title="Eleitores captados" value={formatarNumero(indicadores.total)} subtitle={`${formatarNumero(indicadores.ultimos_7_dias)} nos últimos 7 dias`} icon={<QrCode className="h-5 w-5" />} className="font-mono tabular-nums" />
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="flex items-center gap-2"><MapIcon className="h-5 w-5 text-primary" />Divisão política — {campanha.uf}</CardTitle>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Camada do mapa">
            {CAMADAS.map((c) => (
              <Button key={c} size="sm" variant={camada === c ? 'primary' : 'outline'} aria-pressed={camada === c} onClick={() => setCamada(c)}>{ROTULO_CAMADA[c]}</Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <MapaCampanha uf={campanha.uf} pontos={pontos} camada={camada} cores={campanha.cores} faixas={campanha.faixas} onSelecionar={abrirMunicipio} calor={calor} captados={captados} />
        </CardContent>
      </Card>

      <div className={`grid gap-4 ${caixa ? 'lg:grid-cols-[2fr_1fr]' : ''}`}>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" />Próximos compromissos</CardTitle></CardHeader>
          <CardContent><ProximosCompromissos campanhaId={campanha.id} versao={versao} /></CardContent>
        </Card>
        {caixa && (
          <KpiCard title="Saldo em caixa" value={formatarCentavos(caixa.saldo_centavos)} subtitle={`receitas ${formatarCentavos(caixa.receitas_centavos)} · despesas ${formatarCentavos(caixa.despesas_centavos)}`} icon={<Wallet className="h-5 w-5" />} className="font-mono tabular-nums" />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <Card>
          <CardHeader><CardTitle>Situação dos municípios</CardTitle></CardHeader>
          <CardContent className="h-72 text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pizza} dataKey="valor" nameKey="nome" innerRadius="55%" outerRadius="85%" paddingAngle={1}>
                  {pizza.map((p) => <Cell key={p.nome} fill={p.cor} />)}
                </Pie>
                <Tooltip formatter={(v) => formatarNumero(Number(v))} contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Meta de votos e eleitores por região</CardTitle></CardHeader>
          <CardContent className="h-72 text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={painel.por_regiao} margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="regiao" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis yAxisId="meta" tick={{ fontSize: 11 }} tickFormatter={(v) => formatarNumero(Number(v))} width={70} />
                <YAxis yAxisId="eleitores" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => formatarNumero(Number(v))} width={80} />
                <Tooltip formatter={(v) => formatarNumero(Number(v))} contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="meta" dataKey="meta_votos" name="Meta de votos" fill={campanha.cores.em_andamento} />
                <Bar yAxisId="eleitores" dataKey="eleitores" name="Eleitores" fill={campanha.cores.sem_atuacao} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
