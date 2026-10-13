import React, { useState, useEffect } from 'react';
import {
  KpiCard,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Input,
  Button,
  Badge,
} from '@sysgov/ui';
import type { ProtocoloSdk } from '@sysgov/sdk';
import { protocoloApi } from '../api';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  AlertCircle,
  FolderOpen,
  Calendar,
  Filter,
} from 'lucide-react';

export function DashboardView() {
  const [dashboardData, setDashboardData] = useState<ProtocoloSdk.DashboardData | null>(null);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregarDashboard = () => {
    setLoading(true);
    setErro(null);

    protocoloApi.obterDashboard({
      data_inicio: dataInicio || undefined,
      data_fim: dataFim || undefined,
    })
      .then(setDashboardData)
      .catch((err: any) => {
        if (err.response?.status === 403) {
          setErro('Você não possui permissão para visualizar relatórios e indicadores do Protocolo.');
        } else {
          setErro('Falha ao carregar métricas do dashboard.');
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    carregarDashboard();
  }, []);

  if (erro) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-3">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <span className="font-medium text-sm">{erro}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtro de Período */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <span className="font-semibold text-sm text-foreground">Filtrar por Período de Abertura</span>
          </div>

          <div className="flex items-center gap-3">
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="max-w-[160px]"
            />
            <span className="text-muted-foreground text-xs">até</span>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="max-w-[160px]"
            />
            <Button size="sm" onClick={carregarDashboard} isLoading={loading}>
              <Filter className="w-4 h-4 mr-1.5" />
              Filtrar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards Superiores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total de Processos"
          value={dashboardData?.total_processos ?? 0}
          icon={<FolderOpen className="w-5 h-5" />}
          subtitle="Processos cadastrados no período"
        />
        <KpiCard
          title="Processos Concluídos"
          value={dashboardData?.por_status.concluido ?? 0}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          subtitle={`${dashboardData?.por_status.em_tramitacao ?? 0} em tramitação`}
        />
        <KpiCard
          title="Tempo Médio de Tramitação"
          value={
            dashboardData?.tempo_medio_tramitacao_dias !== null && dashboardData?.tempo_medio_tramitacao_dias !== undefined
              ? `${dashboardData.tempo_medio_tramitacao_dias} dias`
              : 'Indisponível'
          }
          icon={<Clock className="w-5 h-5 text-sky-600" />}
          subtitle="Média até conclusão formal"
        />
        <KpiCard
          title="Prazos Excedidos"
          value={dashboardData?.total_prazos_excedidos ?? 0}
          icon={<AlertCircle className="w-5 h-5 text-rose-600" />}
          subtitle="Andamentos com atraso regimental"
        />
      </div>

      {/* Distribuição por Status e Origem */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Distribuição por Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboardData && Object.entries(dashboardData.por_status).map(([status, total]) => (
              <div key={status} className="flex items-center justify-between p-2 rounded bg-muted/20 text-sm">
                <span className="capitalize font-medium text-foreground">{status.replace('_', ' ')}</span>
                <span className="font-mono tabular-nums font-bold text-foreground">{total}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Distribuição por Origem
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded bg-muted/20 text-sm">
              <span className="font-medium text-foreground">Iniciativa Interna (Órgão)</span>
              <span className="font-mono tabular-nums font-bold text-foreground text-base">
                {dashboardData?.por_origem.interna ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded bg-muted/20 text-sm">
              <span className="font-medium text-foreground">Demanda Externa (Cidadão / Empresa)</span>
              <span className="font-mono tabular-nums font-bold text-foreground text-base">
                {dashboardData?.por_origem.externa ?? 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribuição de Processos por Órgão Atual */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuição de Processos por Órgão Atual</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Órgão / Secretaria</TableHead>
                <TableHead>Sigla</TableHead>
                <TableHead className="text-right">Processos em Posse</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(dashboardData?.por_orgao || []).map((org) => (
                <TableRow key={org.orgao_id}>
                  <TableCell className="font-medium text-foreground">{org.orgao_nome}</TableCell>
                  <TableCell className="font-mono text-xs">{org.orgao_sigla || '-'}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums font-bold text-foreground">
                    {org.total}
                  </TableCell>
                </TableRow>
              ))}
              {(!dashboardData?.por_orgao || dashboardData.por_orgao.length === 0) && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                    Nenhum órgão com processos registrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Permanência Média por Órgão */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tempo Médio de Permanência por Órgão</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Órgão</TableHead>
                <TableHead>Andamentos Concluídos</TableHead>
                <TableHead className="text-right">Permanência Média (Dias)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(dashboardData?.tempo_permanencia_por_orgao || []).map((perm) => (
                <TableRow key={perm.orgao_id}>
                  <TableCell className="font-medium text-foreground">{perm.orgao_nome}</TableCell>
                  <TableCell className="font-mono tabular-nums text-xs">{perm.total_andamentos}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums font-bold text-foreground">
                    {perm.tempo_medio_dias} dias
                  </TableCell>
                </TableRow>
              ))}
              {(!dashboardData?.tempo_permanencia_por_orgao || dashboardData.tempo_permanencia_por_orgao.length === 0) && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                    Nenhum andamento encerrado no período para cálculo de permanência.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
