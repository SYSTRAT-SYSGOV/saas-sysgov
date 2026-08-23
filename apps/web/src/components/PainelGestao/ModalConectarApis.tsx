import React, { useState, useEffect } from 'react';
import {
  Link2, Globe, Database, RefreshCw, CheckCircle2, AlertTriangle,
  Clock, X, Server, Key, Copy, Check,
} from 'lucide-react';
import { DataSourceBadge } from '../DataSourceBadge';

interface ModalConectarApisProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  onSyncSuccess: () => void;
}

export const ModalConectarApis: React.FC<ModalConectarApisProps> = ({
  isOpen,
  onClose,
  tenantId,
  onSyncSuccess,
}) => {
  const [loadingPncp, setLoadingPncp] = useState(false);
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const carregarLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/painel/sync-status?tenantId=${tenantId}`);
      if (res.ok) {
        const data = await res.json();
        setSyncLogs(data.logs || []);
      }
    } catch {
      // Ignora falha de log
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      carregarLogs();
      setFeedbackMsg(null);
    }
  }, [isOpen, tenantId]);

  if (!isOpen) return null;

  const handleSincronizarPncp = async () => {
    setLoadingPncp(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch('/api/painel/sincronizar-pncp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, ano: 2025 }),
      });
      const data = await res.json();
      if (res.ok && data.sucesso) {
        setFeedbackMsg({ tipo: 'sucesso', texto: data.mensagem });
        carregarLogs();
        setTimeout(() => {
          onSyncSuccess();
          onClose();
        }, 1200);
      } else {
        setFeedbackMsg({ tipo: 'erro', texto: data.error || data.details || data.mensagem || 'Falha ao sincronizar contratos com o PNCP.' });
      }
    } catch (err: any) {
      setFeedbackMsg({ tipo: 'erro', texto: `Erro de conexão: ${err.message || 'Servidor indisponível'}` });
    } finally {
      setLoadingPncp(false);
    }
  };

  const copiarApiKey = () => {
    navigator.clipboard.writeText(`sgf_live_${tenantId.replace(/-/g, '')}`);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-sm w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <Link2 className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="text-base font-bold text-slate-100">Conectores de APIs e Fontes Oficiais</h3>
              <p className="text-xs text-slate-400">Integração com PNCP, TCE-PR e ERPs municipais</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {feedbackMsg && (
            <div
              className={`p-3 rounded-sm border text-xs flex items-start gap-2 ${
                feedbackMsg.tipo === 'sucesso'
                  ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-700/50 text-rose-300'
              }`}
            >
              {feedbackMsg.tipo === 'sucesso' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <div>{feedbackMsg.texto}</div>
            </div>
          )}

          {/* Grid de Conectores Oficiais */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Card 1: PNCP */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-sm p-4 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-bold text-slate-200">PNCP (Governo Federal)</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-700/40">
                    OFICIAL · LEI 14.133
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Busca contratos homologados e atas de registro de preço diretamente no Portal Nacional de Contratações Públicas.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-700/40 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-500">API Pública REST</span>
                <button
                  onClick={handleSincronizarPncp}
                  disabled={loadingPncp}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-emerald-700/60 hover:bg-emerald-600/60 disabled:opacity-50 text-emerald-200 border border-emerald-600/40 text-xs font-mono font-bold transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingPncp ? 'animate-spin' : ''}`} />
                  {loadingPncp ? 'Sincronizando...' : 'Sincronizar Agora'}
                </button>
              </div>
            </div>

            {/* Card 2: TCE-PR */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-sm p-4 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-bold text-slate-200">Tribunais de Contas (TCE)</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-700/40">
                    CONECTADO
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Captura prestação de contas, empenhos e liquidações homologadas junto ao Tribunal de Contas Estadual.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-700/40 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-500">Rotina Noturna (06:00)</span>
                <span className="text-[10px] font-mono text-emerald-400">Ativo</span>
              </div>
            </div>
          </div>

          {/* Card 3: Webhook ERP Municipal */}
          <div className="bg-slate-800/30 border border-slate-700/40 rounded-sm p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-sky-400" />
              <span className="text-sm font-bold text-slate-200">Webhook ERP Municipal (Betha, IPM, Elotech, Fly)</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Configure o envio automático de liquidações e novos contratos a partir do seu ERP contábil utilizando o endpoint seguro:
            </p>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2 bg-slate-950 rounded-sm border border-slate-800 text-slate-300 flex items-center justify-between">
                <span className="truncate">POST https://analitico.escrita.online/api/integracao/erp/contratos</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 p-2 bg-slate-950 rounded-sm border border-slate-800 text-slate-400 truncate flex items-center gap-2">
                  <Key className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">Chave de API: sgf_live_{tenantId.replace(/-/g, '')}</span>
                </div>
                <button
                  onClick={copiarApiKey}
                  className="px-3 py-2 rounded-sm bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Tabela de Histórico de Sincronizações */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Histórico de Sincronizações Oficiais</span>
              <button
                onClick={carregarLogs}
                className="text-[10px] text-sky-400 hover:text-sky-300 font-mono cursor-pointer"
              >
                Atualizar Histórico
              </button>
            </div>

            {loadingLogs ? (
              <div className="py-4 text-center text-xs font-mono text-slate-500">Carregando logs...</div>
            ) : syncLogs.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-500 border border-slate-800 rounded-sm">
                Nenhuma sincronização oficial registrada ainda para este município.
              </div>
            ) : (
              <div className="max-h-44 overflow-y-auto border border-slate-800 rounded-sm">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
                    <tr>
                      <th className="p-2">Fonte</th>
                      <th className="p-2">Status</th>
                      <th className="p-2 text-right">Registros</th>
                      <th className="p-2 text-right">Data/Hora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                    {syncLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-slate-800/30">
                        <td className="p-2 text-slate-300">{log.sourceKey}</td>
                        <td className="p-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-700/40">
                            {log.status}
                          </span>
                        </td>
                        <td className="p-2 text-right text-slate-200 font-bold">{log.recordsImported}</td>
                        <td className="p-2 text-right text-slate-500">
                          {new Date(log.startedAt).toLocaleString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-4 border-t border-slate-800 bg-slate-950/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-sm bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
