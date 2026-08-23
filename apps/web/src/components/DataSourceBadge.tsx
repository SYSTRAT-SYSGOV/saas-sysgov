/**
 * Fase 4 — DataSourceBadge evoluído + DataProvenancePanel
 *
 * Sistema de rastreabilidade de dados: mostra ao usuário a origem
 * de cada dado (SICONFI oficial vs estimativa/LOA), data da última
 * sincronização, nível de confiança e histórico.
 */
import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Clock,
  Database,
  Info,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { DataSourceMetadata } from '../types/fiscal';

// ===========================================================================
// TIPOS
// ===========================================================================

export type ConfidenceLevel =
  | 'OFICIAL_HOMOLOGADO'
  | 'ESTIMATIVA_ALTA_CONFIANCA'
  | 'PROJECAO_PREDITIVA';

interface SyncHistoryEntry {
  date: string;
  status: 'success' | 'error' | 'pending';
  source: string;
  records?: number;
}

// ===========================================================================
// BADGE COMPACTO — usa em cada card/widget de dado
// ===========================================================================
interface DataSourceBadgeProps {
  dataSource?: DataSourceMetadata;
  size?: 'xs' | 'sm' | 'md';
  showDetails?: boolean;
  showSyncDate?: boolean;
  className?: string;
}

export const DataSourceBadge: React.FC<DataSourceBadgeProps> = ({
  dataSource,
  size = 'sm',
  showDetails = false,
  showSyncDate = false,
  className = '',
}) => {
  const meta: DataSourceMetadata = dataSource || {
    origin: 'DEMONSTRACAO',
    source: 'Motor Preditivo & Estimativa LOA',
    collectedAt: 'Base de Simulação Municipal',
    confidence: 'ESTIMATIVA_ALTA_CONFIANCA',
  };

  const isOficial = meta.origin === 'OFICIAL';

  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.5 gap-1',
    sm: 'text-[10px] px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-2',
  };

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
  };

  const confidenceLabel: Record<ConfidenceLevel, string> = {
    OFICIAL_HOMOLOGADO: 'Homologado',
    ESTIMATIVA_ALTA_CONFIANCA: 'Alta Confiança',
    PROJECAO_PREDITIVA: 'Projeção',
  };

  const label = isOficial ? '[OFICIAL]' : '[DEMONSTRAÇÃO]';

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <span
        title={
          isOficial
            ? `Dado Oficial: ${meta.source}${meta.collectedAt ? ` • Atualizado: ${meta.collectedAt}` : ''}`
            : `Estimativa / Demonstração: ${meta.source}`
        }
        className={`inline-flex items-center font-mono font-bold uppercase tracking-wider rounded-md border transition-all select-none shadow-xs badge-text ${
          sizeClasses[size]
        } ${
          isOficial
            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 dark:bg-emerald-950/40 hover:bg-emerald-500/20'
            : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 dark:bg-amber-950/40 hover:bg-amber-500/20'
        }`}
      >
        {isOficial ? (
          <ShieldCheck className={`${iconSizes[size]} text-emerald-600 dark:text-emerald-400 shrink-0`} />
        ) : (
          <AlertTriangle className={`${iconSizes[size]} text-amber-600 dark:text-amber-400 shrink-0`} />
        )}
        <span>{label}</span>
        {showDetails && (
          <span className="opacity-80 font-normal normal-case border-l border-current/20 pl-1.5 truncate max-w-[200px]">
            {meta.source}
          </span>
        )}
      </span>

      {showSyncDate && meta.collectedAt && (
        <span className="inline-flex items-center gap-0.5 text-[9px] text-gray-400 dark:text-gray-500 font-mono">
          <Clock className="w-2.5 h-2.5" />
          {meta.collectedAt}
        </span>
      )}

      {meta.confidence && isOficial && (
        <span className="text-[9px] text-emerald-600/70 dark:text-emerald-400/60 font-mono">
          {confidenceLabel[meta.confidence as ConfidenceLevel]}
        </span>
      )}
    </div>
  );
};

// ===========================================================================
// PAINEL DE PROVENIÊNCIA — exibe em página de configurações ou sidebar
// ===========================================================================
interface DataProvenancePanelProps {
  sources: Array<{
    label: string;
    dataSource: DataSourceMetadata;
    lastSync?: string;
    records?: number;
    syncHistory?: SyncHistoryEntry[];
    url?: string;
  }>;
  className?: string;
}

export const DataProvenancePanel: React.FC<DataProvenancePanelProps> = ({
  sources,
  className = '',
}) => {
  const [expanded, setExpanded] = useState<string | null>(null);

  const officialCount = sources.filter(s => s.dataSource.origin === 'OFICIAL').length;
  const demoCount = sources.length - officialCount;

  return (
    <div className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Rastreabilidade de Dados
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {officialCount} oficial{officialCount !== 1 ? 'is' : ''}
          </span>
          {demoCount > 0 && (
            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              {demoCount} estimativa{demoCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Lista de fontes */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {sources.map((src) => {
          const isOficial = src.dataSource.origin === 'OFICIAL';
          const isExpanded = expanded === src.label;

          return (
            <div key={src.label} className="transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
                onClick={() => setExpanded(isExpanded ? null : src.label)}
              >
                {/* Status icon */}
                <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                  isOficial
                    ? 'bg-emerald-100 dark:bg-emerald-950'
                    : 'bg-amber-100 dark:bg-amber-950'
                }`}>
                  {isOficial ? (
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {src.label}
                    </span>
                    <DataSourceBadge dataSource={src.dataSource} size="xs" />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {src.dataSource.source}
                  </p>
                </div>

                {/* Meta */}
                <div className="flex-shrink-0 text-right">
                  {src.records !== undefined && (
                    <div className="text-xs font-mono text-gray-600 dark:text-gray-400">
                      {src.records.toLocaleString('pt-BR')} registros
                    </div>
                  )}
                  {src.lastSync && (
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-0.5 justify-end mt-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {src.lastSync}
                    </div>
                  )}
                </div>

                {/* Expand toggle */}
                <div className="flex-shrink-0 text-gray-400">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {/* Expanded: histórico de sincronizações */}
              {isExpanded && (
                <div className="px-4 pb-3 pt-0">
                  <div className="ml-10 space-y-2">
                    {src.dataSource.anexo && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-medium">Anexo:</span> {src.dataSource.anexo}
                      </div>
                    )}
                    {src.dataSource.confidence && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-medium">Confiança:</span>{' '}
                        <span className={isOficial ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                          {src.dataSource.confidence.replace(/_/g, ' ')}
                        </span>
                      </div>
                    )}
                    {src.url && (
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Acessar fonte original
                      </a>
                    )}
                    {src.syncHistory && src.syncHistory.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                          Histórico de sincronização:
                        </div>
                        <div className="space-y-1">
                          {src.syncHistory.map((entry, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              {entry.status === 'success' ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                              ) : entry.status === 'error' ? (
                                <XCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                              ) : (
                                <RefreshCw className="w-3 h-3 text-blue-500 flex-shrink-0 animate-spin" />
                              )}
                              <span className="text-gray-500 dark:text-gray-400 font-mono">{entry.date}</span>
                              <span className="text-gray-700 dark:text-gray-300">{entry.source}</span>
                              {entry.records !== undefined && (
                                <span className="text-gray-400">({entry.records.toLocaleString('pt-BR')} registros)</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 bg-gray-50/50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2">
        <Info className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-[10px] text-gray-500 dark:text-gray-400">
          Dados marcados como [DEMONSTRAÇÃO] são estimativas estatísticas baseadas na LOA aprovada e histórico do SICONFI.
          Dados [OFICIAL] foram obtidos diretamente de APIs governamentais homologadas.
        </span>
      </div>
    </div>
  );
};

// ===========================================================================
// INLINE INDICATOR — versão mínima para tabelas e listas
// ===========================================================================
interface DataSourceDotProps {
  origin: 'OFICIAL' | 'DEMONSTRACAO';
  title?: string;
}

export const DataSourceDot: React.FC<DataSourceDotProps> = ({ origin, title }) => {
  const isOficial = origin === 'OFICIAL';
  return (
    <span
      title={title || (isOficial ? 'Dado Oficial (API governamental)' : 'Estimativa / Demonstração')}
      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
        isOficial ? 'bg-emerald-500' : 'bg-amber-400'
      }`}
    />
  );
};

// ===========================================================================
// SYNC STATUS INDICATOR — exibe estado da última sincronização
// ===========================================================================
interface SyncStatusProps {
  status: 'online' | 'offline' | 'syncing' | 'error';
  lastSync?: string;
  className?: string;
}

export const SyncStatusIndicator: React.FC<SyncStatusProps> = ({ status, lastSync, className = '' }) => {
  const configs = {
    online: {
      icon: <Wifi className="w-3 h-3" />,
      label: 'Conectado',
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500',
    },
    syncing: {
      icon: <RefreshCw className="w-3 h-3 animate-spin" />,
      label: 'Sincronizando...',
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-500',
    },
    offline: {
      icon: <WifiOff className="w-3 h-3" />,
      label: 'Offline',
      color: 'text-gray-500 dark:text-gray-400',
      bg: 'bg-gray-400',
    },
    error: {
      icon: <XCircle className="w-3 h-3" />,
      label: 'Erro de conexão',
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-500',
    },
  };

  const cfg = configs[status];

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className={`relative flex h-2 w-2`}>
        {status === 'online' && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${cfg.bg} opacity-60`} />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${cfg.bg}`} />
      </span>
      <span className={`text-[10px] font-medium ${cfg.color} flex items-center gap-1`}>
        {cfg.label}
        {lastSync && <span className="text-gray-400 font-normal">• {lastSync}</span>}
      </span>
    </div>
  );
};

export default DataSourceBadge;
