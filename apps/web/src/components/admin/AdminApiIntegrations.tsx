import React, { useState } from 'react';
import {
  Plug,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Zap,
  Globe,
  Database,
  Plus,
  ArrowUpRight,
  Clock,
  ShieldCheck,
  X,
} from 'lucide-react';
import { INITIAL_API_CONNECTORS } from '../../services/adminMockData';
import { ApiConnector } from '../../types/admin';

interface AdminApiIntegrationsProps {
  onAddToast: (toast: { type: 'success' | 'info' | 'warning' | 'error'; title: string; message: string }) => void;
}

export const AdminApiIntegrations: React.FC<AdminApiIntegrationsProps> = ({ onAddToast }) => {
  const [connectors, setConnectors] = useState<ApiConnector[]>(INITIAL_API_CONNECTORS);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Webhook/API form
  const [formData, setFormData] = useState<{
    name: string;
    endpoint: string;
    type: ApiConnector['type'];
  }>({
    name: '',
    endpoint: '',
    type: 'REST',
  });

  const handleTestPing = (conn: ApiConnector) => {
    setSyncingId(conn.id);
    setTimeout(() => {
      setSyncingId(null);
      setConnectors((prev) =>
        prev.map((c) =>
          c.id === conn.id
            ? {
                ...c,
                lastSyncAt: 'Agora mesmo',
                latencyMs: Math.floor(Math.random() * 80) + 70,
              }
            : c
        )
      );
      onAddToast({
        type: 'success',
        title: 'Ping Concluído com Sucesso',
        message: `${conn.name} respondeu em ${conn.latencyMs}ms com HTTP 200 OK.`,
      });
    }, 800);
  };

  const handleCreateConnector = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.endpoint.trim()) {
      onAddToast({
        type: 'error',
        title: 'Campos Obrigatórios',
        message: 'Preencha o nome e o endpoint do conector.',
      });
      return;
    }

    const newConn: ApiConnector = {
      id: `api-${Date.now()}`,
      name: formData.name,
      endpoint: formData.endpoint,
      type: formData.type,
      status: 'operational',
      uptimePercent: 100.0,
      latencyMs: 95,
      lastSyncAt: 'Recém-adicionado',
      requests24h: 0,
      errorRatePercent: 0.0,
    };

    setConnectors((prev) => [newConn, ...prev]);
    setIsModalOpen(false);
    onAddToast({
      type: 'success',
      title: 'Integração Configurada',
      message: `Conector ${formData.name} foi adicionado à esteira de monitoramento.`,
    });
  };

  const getStatusBadge = (status: ApiConnector['status']) => {
    switch (status) {
      case 'operational':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Operacional
          </span>
        );
      case 'degraded':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" />
            Degradado
          </span>
        );
      case 'down':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" />
            Fora do Ar
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-500 border border-slate-500/20">
            Manutenção
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
            <Plug className="w-5 h-5 text-indigo-500" />
            Monitor de APIs, Webhooks & Integrações
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Status em tempo real de provedores externos, latência média, volume de requisições e conectores.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md hover:shadow-indigo-600/30"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Adicionar Nova Integração</span>
        </button>
      </div>

      {/* Connectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {connectors.map((conn) => {
          const isSyncing = syncingId === conn.id;
          return (
            <div
              key={conn.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {conn.name}
                    </h3>
                    <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold uppercase block mt-0.5">
                      Protocolo: {conn.type}
                    </span>
                  </div>
                  {getStatusBadge(conn.status)}
                </div>

                <div className="text-xs bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg font-mono text-slate-500 dark:text-slate-400 truncate mb-4 border border-slate-100 dark:border-slate-800">
                  {conn.endpoint}
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg">
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                      Latência Média
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                      {conn.latencyMs} ms
                    </span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg">
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                      Disponibilidade (SLA)
                    </span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {conn.uptimePercent}%
                    </span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg">
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                      Reqs últimas 24h
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                      {conn.requests24h.toLocaleString('pt-BR')}
                    </span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg">
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                      Taxa de Erro
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                      {conn.errorRatePercent}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer: Last Sync & Actions */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono">
                  Sincronizado: {conn.lastSyncAt}
                </span>

                <button
                  onClick={() => handleTestPing(conn)}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-500' : ''}`} />
                  <span>Testar Ping</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add Connector */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plug className="w-4 h-4 text-indigo-500" />
                Nova Integração / Webhook
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateConnector} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Conector *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Gateway de Pagamentos / Webhook CRM"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Endpoint URL *
                </label>
                <input
                  type="url"
                  required
                  value={formData.endpoint}
                  onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                  placeholder="https://api.empresa.com/v1/webhook"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tipo de Integração
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="REST">REST API</option>
                  <option value="WEBHOOK">Webhook Receiver / Dispatcher</option>
                  <option value="GRAPHQL">GraphQL Gateway</option>
                  <option value="DATABASE">Direct Database Connection</option>
                  <option value="OAUTH">OAuth 2.0 Provider</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all shadow-md"
                >
                  Salvar Integração
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
