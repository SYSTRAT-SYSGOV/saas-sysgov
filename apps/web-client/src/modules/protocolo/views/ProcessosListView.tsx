import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Button,
  Input,
  Select,
  Badge,
} from '@sysgov/ui';
import type { ProtocoloSdk } from '@sysgov/sdk';
import { protocoloApi } from '../api';
import { ProcessoStatusBadge } from '../components/ProcessoStatusBadge';
import { apiClient } from '@/core/api/client';
import {
  Search,
  Plus,
  ArrowUpRight,
  Eye,
  Trash2,
  Filter,
  FileText,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react';

interface ProcessosListViewProps {
  onVerDetalhes: (processoId: number) => void;
  onNovoProcesso: () => void;
  onPromoverRequerimento: () => void;
}

export function ProcessosListView({
  onVerDetalhes,
  onNovoProcesso,
  onPromoverRequerimento,
}: ProcessosListViewProps) {
  const [processos, setProcessos] = useState<ProtocoloSdk.Processo[]>([]);
  const [paginacao, setPaginacao] = useState<ProtocoloSdk.Paginado<ProtocoloSdk.Processo> | null>(null);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [filtroOrigem, setFiltroOrigem] = useState<string>('');
  const [filtroTipoProcesso, setFiltroTipoProcesso] = useState<string>('');
  const [filtroOrgao, setFiltroOrgao] = useState<string>('');
  const [paginaAtual, setPaginaAtual] = useState(1);

  // Lista de órgãos
  const [orgaos, setOrgaos] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    apiClient.get<{ id: number; name: string; code?: string }[]>('/org/units')
      .then((res) => {
        const list = (res.data || []).map((o) => ({
          value: String(o.id),
          label: o.code ? `[${o.code}] ${o.name}` : o.name,
        }));
        setOrgaos(list);
      })
      .catch(() => {});
  }, []);

  const carregarProcessos = () => {
    setLoading(true);
    protocoloApi.listarProcessos({
      q: termoBusca.trim() || undefined,
      status: (filtroStatus as ProtocoloSdk.ProcessoStatus) || undefined,
      origem: (filtroOrigem as ProtocoloSdk.ProcessoOrigem) || undefined,
      tipo_processo: filtroTipoProcesso || undefined,
      orgao_id: filtroOrgao ? Number(filtroOrgao) : undefined,
      page: paginaAtual,
      per_page: 15,
    })
      .then((res) => {
        setProcessos(res.data);
        setPaginacao(res);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    carregarProcessos();
  }, [paginaAtual, filtroStatus, filtroOrigem, filtroTipoProcesso, filtroOrgao]);

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    setPaginaAtual(1);
    carregarProcessos();
  };

  const handleExportarCsv = () => {
    const url = protocoloApi.obterUrlExportacao({
      q: termoBusca.trim() || undefined,
      status: (filtroStatus as ProtocoloSdk.ProcessoStatus) || undefined,
      origem: (filtroOrigem as ProtocoloSdk.ProcessoOrigem) || undefined,
      tipo_processo: filtroTipoProcesso || undefined,
      orgao_id: filtroOrgao ? Number(filtroOrgao) : undefined,
    });
    window.open(url, '_blank');
  };

  const handleExcluir = async (id: number, numeroFormatado: string) => {
    if (!confirm(`Deseja excluir o processo ${numeroFormatado}?`)) return;
    try {
      await protocoloApi.excluirProcesso(id);
      carregarProcessos();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Falha ao excluir processo.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Barra de Ações Superiores */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={handleBuscar} className="flex items-center gap-2 flex-1 max-w-md">
          <Input
            placeholder="Buscar por número, CPF/CNPJ ou assunto..."
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
          />
          <Button type="submit" size="sm" variant="outline">
            <Search className="w-4 h-4" />
          </Button>
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportarCsv} title="Exportar dados em formato CSV estruturado">
            <Download className="w-4 h-4 mr-1.5" />
            Exportar CSV
          </Button>
          <Button variant="outline" size="sm" onClick={onPromoverRequerimento}>
            <ArrowUpRight className="w-4 h-4 mr-1.5" />
            Promover Requerimento
          </Button>
          <Button size="sm" onClick={onNovoProcesso}>
            <Plus className="w-4 h-4 mr-1.5" />
            Novo Processo
          </Button>
        </div>
      </div>

      {/* Filtros Avançados */}
      <Card className="bg-muted/20">
        <CardContent className="p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <Select
            label="Status"
            value={filtroStatus}
            onChange={(val) => {
              setFiltroStatus(val);
              setPaginaAtual(1);
            }}
            options={[
              { value: '', label: 'Todos os Status' },
              { value: 'aberto', label: 'Aberto' },
              { value: 'em_tramitacao', label: 'Em Tramitação' },
              { value: 'aguardando', label: 'Aguardando' },
              { value: 'concluido', label: 'Concluído' },
              { value: 'arquivado', label: 'Arquivado' },
            ]}
          />

          <Select
            label="Origem"
            value={filtroOrigem}
            onChange={(val) => {
              setFiltroOrigem(val);
              setPaginaAtual(1);
            }}
            options={[
              { value: '', label: 'Todas as Origens' },
              { value: 'interna', label: 'Iniciativa Interna' },
              { value: 'externa', label: 'Demanda Externa' },
            ]}
          />

          <Select
            label="Classificação / Tipo"
            value={filtroTipoProcesso}
            onChange={(val) => {
              setFiltroTipoProcesso(val);
              setPaginaAtual(1);
            }}
            options={[
              { value: '', label: 'Todas as Classificações' },
              { value: 'administrativo', label: 'Administrativo Comum' },
              { value: 'licitatorio', label: 'Licitatório / Contratação' },
              { value: 'financeiro', label: 'Financeiro / Pagamento' },
              { value: 'rh', label: 'Recursos Humanos / Pessoal' },
              { value: 'tributario', label: 'Tributário / Fiscal' },
              { value: 'obras', label: 'Obras & Infraestrutura' },
              { value: 'ouvidoria', label: 'Ouvidoria / Reclamação' },
            ]}
          />

          <Select
            label="Órgão Atual"
            value={filtroOrgao}
            onChange={(val) => {
              setFiltroOrgao(val);
              setPaginaAtual(1);
            }}
            options={[{ value: '', label: 'Todos os Órgãos' }, ...orgaos]}
          />
        </CardContent>
      </Card>

      {/* Tabela de Processos */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número do Processo</TableHead>
                <TableHead>Assunto</TableHead>
                <TableHead>Classificação</TableHead>
                <TableHead>Interessado</TableHead>
                <TableHead>Localização Atual</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data Abertura</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processos.map((proc) => (
                <TableRow key={proc.id}>
                  <TableCell className="font-mono tabular-nums font-bold text-foreground">
                    {proc.numero_formatado}
                    {proc.sigiloso && (
                      <span className="ml-1.5 text-[10px] bg-rose-100 text-rose-700 font-sans px-1 rounded">
                        Sigiloso
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium max-w-xs truncate" title={proc.assunto}>
                    {proc.assunto}
                  </TableCell>
                  <TableCell>
                    {proc.tipo_processo ? (
                      <Badge variant="indigo" className="text-[11px] capitalize">
                        {proc.tipo_processo.replace('_', ' ')}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {proc.interessado?.nome || 'Não vinculado'}
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-primary">
                    {proc.orgao_atual?.name || 'Em trânsito'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="neutral" className="capitalize text-[11px]">
                      {proc.origem}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ProcessoStatusBadge status={proc.status} />
                  </TableCell>
                  <TableCell className="font-mono tabular-nums text-xs text-muted-foreground">
                    {new Date(proc.data_abertura).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onVerDetalhes(proc.id)}
                      title="Ver detalhes e tramitar"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleExcluir(proc.id, proc.numero_formatado)}
                      className="text-rose-600 hover:text-rose-700"
                      title="Excluir processo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {processos.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                    <FileText className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                    Nenhum processo administrativo encontrado com os critérios selecionados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Paginação */}
      {paginacao && paginacao.last_page > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
          <span>
            Página <strong className="font-mono tabular-nums">{paginacao.current_page}</strong> de{' '}
            <strong className="font-mono tabular-nums">{paginacao.last_page}</strong> (
            <span className="font-mono tabular-nums">{paginacao.total}</span> processos no total)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={paginaAtual <= 1}
              onClick={() => setPaginaAtual((p) => p - 1)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={paginaAtual >= paginacao.last_page}
              onClick={() => setPaginaAtual((p) => p + 1)}
            >
              Próxima <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
