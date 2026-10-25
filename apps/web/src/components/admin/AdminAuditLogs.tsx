import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  Search,
  Download,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Code2,
  Terminal,
  RefreshCw,
} from 'lucide-react';
import { AuditLogEntry } from '../../types/admin';
import { ScreenState, ScreenStateType } from '../ui/ScreenState';
import type { ColumnDef } from '@tanstack/react-table';
import api from '../../api/client';
import { Card, Modal, Button, DataTable } from '@sysgov/ui';

interface AdminAuditLogsProps {
  onAddToast?: (toast: { type: 'success' | 'info' | 'warning' | 'error'; title: string; message: string }) => void;
}

interface RawAuditLog {
  id: number | string;
  tenant_id?: number | string | null;
  user_id?: number | string | null;
  module?: string;
  action?: string;
  resource?: string;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  ip?: string;
  user_agent?: string;
  hash?: string;
  prev_hash?: string;
  created_at?: string;
}

const DEFAULT_PER_PAGE = 50;

interface AuditLogsPage {
  data?: RawAuditLog[];
  last_page?: number;
  total?: number;
}

export const AdminAuditLogs: React.FC<AdminAuditLogsProps> = ({ onAddToast }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [screenState, setScreenState] = useState<ScreenStateType>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [serviceFilter, setServiceFilter] = useState<string>('ALL');
  const [selectedPayloadLog, setSelectedPayloadLog] = useState<AuditLogEntry | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [lastPage, setLastPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  const fetchLogs = useCallback(async () => {
    setScreenState('loading');
    setErrorMessage('');
    try {
      const res = await api.get<AuditLogsPage | RawAuditLog[]>(`/api/admin/audit-logs?page=${page}&per_page=${perPage}`);
      const rawList = Array.isArray(res) ? res : res.data || [];
      if (!Array.isArray(res)) {
        setLastPage(res.last_page ?? 1);
        setTotalLogs(res.total ?? rawList.length);
      }

      if (rawList.length === 0) {
        // Sem fallback para dados de exemplo: lista vazia mostra o estado vazio.
        setLogs([]);
        setScreenState('empty');
        return;
      }

      const mapped: AuditLogEntry[] = rawList.map((item) => {
        const actionStr = item.action || 'system.event';
        let level: AuditLogEntry['level'] = 'INFO';
        if (actionStr.includes('fail') || actionStr.includes('error') || actionStr.includes('delete')) {
          level = actionStr.includes('delete') ? 'WARN' : 'ERROR';
        } else if (actionStr.includes('create') || actionStr.includes('update') || actionStr.includes('login') || actionStr.includes('register')) {
          level = 'SUCCESS';
        }

        return {
          id: String(item.id),
          timestamp: item.created_at ? new Date(item.created_at).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR'),
          level,
          service: item.module || 'Plataforma',
          actor: {
            id: String(item.user_id || 'system'),
            name: item.user_id ? `Usuário #${item.user_id}` : 'Operador do Sistema',
            email: '',
            ipAddress: item.ip || '127.0.0.1',
          },
          event: actionStr,
          targetResource: item.resource || 'sysgov_core',
          payload: {
            ...(item.before ? { before: item.before } : {}),
            ...(item.after ? { after: item.after } : {}),
            ...(item.hash ? { hmac_hash: item.hash, prev_hash: item.prev_hash } : {}),
          },
          statusCode: 200,
        };
      });

      setLogs(mapped);
      setScreenState('ready');
    } catch (err: any) {
      setLogs([]);
      setErrorMessage(err.message || 'Falha ao conectar ao servidor de auditoria.');
      setScreenState('error');
    }
  }, [page, perPage]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const services = useMemo(() => Array.from(new Set(logs.map((l) => l.service))), [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        log.event.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.actor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.actor.ipAddress.includes(searchQuery) ||
        log.targetResource.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesLevel = levelFilter === 'ALL' || log.level === levelFilter;
      const matchesService = serviceFilter === 'ALL' || log.service === serviceFilter;

      return matchesSearch && matchesLevel && matchesService;
    });
  }, [logs, searchQuery, levelFilter, serviceFilter]);

  const handleExportLogsJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    onAddToast?.({
      type: 'success',
      title: 'Logs Exportados em JSON',
      message: `${filteredLogs.length} eventos de auditoria baixados com sucesso.`,
    });
  };

  const getLevelBadge = (level: AuditLogEntry['level']) => {
    switch (level) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
            <CheckCircle2 className="w-3 h-3" /> SUCCESS
          </span>
        );
      case 'INFO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/30">
            <Info className="w-3 h-3" /> INFO
          </span>
        );
      case 'WARN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-status-warning/10 text-status-warning border border-status-warning-border">
            <AlertTriangle className="w-3 h-3" /> WARN
          </span>
        );
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-destructive/10 text-status-danger border border-status-danger-border">
            <XCircle className="w-3 h-3" /> ERROR
          </span>
        );
    }
  };

  const columns: ColumnDef<AuditLogEntry>[] = [
    { id: 'timestamp', header: 'Timestamp', accessorFn: (l) => l.timestamp, cell: ({ row }) => <span className="font-mono tabular-nums text-[11px] text-muted-foreground whitespace-nowrap">{row.original.timestamp}</span> },
    { id: 'level', header: 'Nível', accessorFn: (l) => l.level, cell: ({ row }) => getLevelBadge(row.original.level) },
    { id: 'service', header: 'Serviço', accessorFn: (l) => l.service, cell: ({ row }) => <span className="font-semibold text-foreground">{row.original.service}</span> },
    { id: 'event', header: 'Evento executado', accessorFn: (l) => l.event, cell: ({ row }) => <span className="font-mono font-semibold text-primary">{row.original.event}</span> },
    {
      id: 'autor', header: 'Autor e IP', accessorFn: (l) => `${l.actor.name} (${l.actor.ipAddress})`,
      cell: ({ row }) => (
        <div>
          <span className="font-semibold text-foreground block">{row.original.actor.name}</span>
          <span className="text-[11px] font-mono tabular-nums text-muted-foreground">{row.original.actor.ipAddress}</span>
        </div>
      ),
    },
    { id: 'recurso', header: 'Recurso alvo', accessorFn: (l) => l.targetResource, cell: ({ row }) => <span className="text-muted-foreground font-mono text-[11px]">{row.original.targetResource}</span> },
    { id: 'status', header: 'Status', accessorFn: (l) => l.statusCode || 200, cell: ({ row }) => <span className="font-mono tabular-nums text-xs font-bold text-foreground">{row.original.statusCode || 200}</span> },
    {
      id: 'payload', header: 'Payload', enableSorting: false, meta: { exportIgnore: true },
      cell: ({ row }) => {
        const log = row.original;
        return log.payload && Object.keys(log.payload).length > 0 ? (
          <button
            onClick={() => setSelectedPayloadLog(log)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-muted hover:bg-accent text-foreground text-[11px] font-mono transition-colors"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>
        ) : (
          <span className="text-muted-foreground text-[11px]">-</span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-6 rounded-2xl border border-border  shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-status-danger" />
            Trilha de Auditoria & Logs de Segurança
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Registro imutável de eventos administrativos, autenticação, mutações de dados e integridade HMAC.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLogs}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-muted hover:bg-accent text-foreground  transition-colors"
            title="Atualizar logs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Atualizar</span>
          </button>
          <button
            onClick={handleExportLogsJSON}
            disabled={filteredLogs.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition-all shadow-sm disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar JSON de Logs</span>
          </button>
        </div>
      </div>

      <ScreenState
        state={screenState}
        loadingMessage="Carregando trilha de auditoria do servidor..."
        errorMessage={errorMessage}
        errorAction={{ label: 'Tentar novamente', onClick: fetchLogs }}
        emptyMessage="Nenhum log de auditoria registrado até o momento."
      >
        {/* Filter and Search Bar */}
        <Card className="p-4 flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por evento, usuário, endereço IP ou recurso afetado..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-lg bg-muted border border-border  text-foreground  placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg bg-muted border border-border  text-foreground  focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="ALL">Todas as Severidades</option>
              <option value="INFO">INFO</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="WARN">WARN</option>
              <option value="ERROR">ERROR</option>
            </select>

            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg bg-muted border border-border  text-foreground  focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="ALL">Todos os Serviços</option>
              {services.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </Card>

        {/* Logs: grade padrão, paginação no servidor */}
        <DataTable<AuditLogEntry, unknown>
          columns={columns}
          data={filteredLogs}
          emptyText="Nenhum log localizado para os filtros informados."
          pageSizeOptions={[25, 50, 100]}
          paginationState={{
            currentPage: page,
            totalPages: lastPage,
            onPageChange: setPage,
            total: totalLogs,
            perPage,
            onPerPageChange: (n) => { setPerPage(n); setPage(1); },
          }}
        />
      </ScreenState>

      {/* JSON Payload Modal */}
      <Modal
        open={!!selectedPayloadLog}
        onClose={() => setSelectedPayloadLog(null)}
        title={`Payload: ${selectedPayloadLog?.event ?? ''}`}
        icon={<Terminal className="w-4 h-4 text-primary" />}
        footer={<Button variant="outline" onClick={() => setSelectedPayloadLog(null)}>Fechar</Button>}
      >
        {selectedPayloadLog && (
          <pre className="p-4 bg-gov-alternative text-primary font-mono text-xs rounded-xl overflow-x-auto border border-white/20 leading-relaxed">
            {JSON.stringify(selectedPayloadLog.payload, null, 2)}
          </pre>
        )}
      </Modal>
    </div>
  );
};

export default AdminAuditLogs;
