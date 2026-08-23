import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Download,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Code2,
  Terminal,
  X,
  Clock,
  User,
  Globe,
} from 'lucide-react';
import { INITIAL_AUDIT_LOGS } from '../../services/adminMockData';
import { AuditLogEntry } from '../../types/admin';

interface AdminAuditLogsProps {
  onAddToast: (toast: { type: 'success' | 'info' | 'warning' | 'error'; title: string; message: string }) => void;
}

export const AdminAuditLogs: React.FC<AdminAuditLogsProps> = ({ onAddToast }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [serviceFilter, setServiceFilter] = useState<string>('ALL');
  const [selectedPayloadLog, setSelectedPayloadLog] = useState<AuditLogEntry | null>(null);

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

    onAddToast({
      type: 'success',
      title: 'Logs Exportados em JSON',
      message: `${filteredLogs.length} eventos de auditoria baixados.`,
    });
  };

  const getLevelBadge = (level: AuditLogEntry['level']) => {
    switch (level) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> SUCCESS
          </span>
        );
      case 'INFO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Info className="w-3 h-3" /> INFO
          </span>
        );
      case 'WARN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" /> WARN
          </span>
        );
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" /> ERROR
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-500" />
            Trilha de Auditoria & Logs de Segurança
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Registro imutável de eventos administrativos, autenticação, mutações de dados e falhas de serviço.
          </p>
        </div>

        <button
          onClick={handleExportLogsJSON}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-all shadow-sm"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar JSON de Logs</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por evento, usuário, endereço IP ou recurso afetado..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
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
            className="px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="ALL">Todos os Serviços</option>
            {services.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Nível</th>
                <th className="py-3.5 px-4">Serviço</th>
                <th className="py-3.5 px-4">Evento Executado</th>
                <th className="py-3.5 px-4">Autor (Actor) & IP</th>
                <th className="py-3.5 px-4">Recurso Alvo</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    Nenhum log localizado para os filtros informados.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {log.timestamp}
                    </td>

                    <td className="py-3.5 px-4">{getLevelBadge(log.level)}</td>

                    <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {log.service}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                      {log.event}
                    </td>

                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white block">
                          {log.actor.name}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {log.actor.ipAddress}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {log.targetResource}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                        {log.statusCode || 200}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {log.payload ? (
                        <button
                          onClick={() => setSelectedPayloadLog(log)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-mono transition-colors"
                        >
                          <Code2 className="w-3.5 h-3.5" />
                          <span>JSON</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>
            Exibindo <strong className="text-slate-900 dark:text-white font-mono">{filteredLogs.length}</strong> logs de auditoria
          </span>
          <span className="text-[11px] font-mono">audit-ledger-immutable</span>
        </div>
      </div>

      {/* JSON Payload Modal */}
      {selectedPayloadLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-500" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                  Payload: {selectedPayloadLog.event}
                </h2>
              </div>
              <button
                onClick={() => setSelectedPayloadLog(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4">
              <pre className="p-4 bg-slate-950 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto border border-slate-800 leading-relaxed">
                {JSON.stringify(selectedPayloadLog.payload, null, 2)}
              </pre>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedPayloadLog(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
