import React, { useState } from 'react';
import {
  Database,
  Play,
  Copy,
  Check,
  Code,
  Layers,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Server,
  Terminal,
  ShieldCheck,
  Clock,
  HardDrive,
} from 'lucide-react';
import { querySiconfiProxy } from '../services/api';
import { SiconfiApiStatus } from '../types/fiscal';

interface ModuleSiconfiExplorerProps {
  siconfiStatus: SiconfiApiStatus | null;
  ano: number;
  activeTenant?: any;
}

export const ModuleSiconfiExplorer: React.FC<ModuleSiconfiExplorerProps> = ({
  siconfiStatus,
  ano,
  activeTenant,
}) => {
  const [endpoint, setEndpoint] = useState<string>('rreo');
  const [selectedAnexo, setSelectedAnexo] = useState<string>('RREO-Anexo 01');
  const [periodo, setPeriodo] = useState<string>('6');
  const [loading, setLoading] = useState<boolean>(false);
  const [responseJson, setResponseJson] = useState<any>(null);
  const [sourceUrl, setSourceUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dbMeta, setDbMeta] = useState<{ fromDb?: boolean; totalDbRecords?: number; lastSyncedAt?: string; warning?: string } | null>(null);

  const codigoIbge = activeTenant?.codigoIbge || '4101804';
  const cidadeNome = activeTenant?.cidade || 'Araucária';
  const ufNome = activeTenant?.uf || 'PR';

  const predefinedQueries = [
    {
      label: `RREO Anexo 01 — Balanço Orçamentário (${cidadeNome}/${ufNome})`,
      endpoint: 'rreo',
      anexo: 'RREO-Anexo 01',
      periodo: '6',
      co_tipo_demonstrativo: 'RREO',
    },
    {
      label: `RREO Anexo 02 — Despesas por Função / Subfunção (${cidadeNome})`,
      endpoint: 'rreo',
      anexo: 'RREO-Anexo 02',
      periodo: '6',
      co_tipo_demonstrativo: 'RREO',
    },
    {
      label: `RGF Anexo 01 — Despesa com Pessoal (Executivo ${cidadeNome})`,
      endpoint: 'rgf',
      anexo: 'RGF-Anexo 01',
      periodo: '3',
      co_tipo_demonstrativo: 'RGF',
      in_periodicidade: 'Q',
      co_poder: 'E',
    },
    {
      label: 'RREO Anexo 08 — Manutenção e Desenvolvimento do Ensino (MDE)',
      endpoint: 'rreo',
      anexo: 'RREO-Anexo 08',
      periodo: '6',
      co_tipo_demonstrativo: 'RREO',
    },
    {
      label: 'RREO Anexo 12 — Ações e Serviços Públicos de Saúde (ASPS)',
      endpoint: 'rreo',
      anexo: 'RREO-Anexo 12',
      periodo: '6',
      co_tipo_demonstrativo: 'RREO',
    },
    {
      label: `Entes — Metadados Oficiais de ${cidadeNome} (IBGE ${codigoIbge})`,
      endpoint: 'entes',
      anexo: '',
      periodo: '',
    },
  ];

  const handleExecuteQuery = async (paramsOverride?: any, force = false) => {
    setLoading(true);
    setErrorMsg(null);

    const queryParams: Record<string, string> = {
      an_exercicio: ano.toString(),
      id_ente: codigoIbge,
      codigoIbge: codigoIbge,
      tenantId: activeTenant?.id || 'tenant-araucaria',
      ...(force ? { force: 'true' } : {}),
      ...(paramsOverride || {
        no_anexo: selectedAnexo,
        nr_periodo: periodo,
        co_tipo_demonstrativo: endpoint.toUpperCase(),
      }),
    };

    try {
      const result = await querySiconfiProxy(endpoint, queryParams);
      setResponseJson(result.data);
      setSourceUrl(result.sourceUrl);
      setDbMeta({
        fromDb: result.fromDb,
        totalDbRecords: result.totalDbRecords,
        lastSyncedAt: result.lastSyncedAt,
        warning: result.warning,
      });
      if (result.error && (!result.data || !result.data.items?.length)) {
        setErrorMsg(result.error);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao consultar dados fiscais do Siconfi');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPreset = (preset: (typeof predefinedQueries)[0]) => {
    setEndpoint(preset.endpoint);
    setSelectedAnexo(preset.anexo);
    setPeriodo(preset.periodo);
    const params: any = {};
    if (preset.anexo) params.no_anexo = preset.anexo;
    if (preset.periodo) params.nr_periodo = preset.periodo;
    if (preset.co_tipo_demonstrativo) params.co_tipo_demonstrativo = preset.co_tipo_demonstrativo;
    if ((preset as any).in_periodicidade) params.in_periodicidade = (preset as any).in_periodicidade;
    if ((preset as any).co_poder) params.co_poder = (preset as any).co_poder;
    handleExecuteQuery(params);
  };

  const handleCopyJson = () => {
    if (responseJson) {
      navigator.clipboard.writeText(JSON.stringify(responseJson, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white dark:bg-navy-950 border border-slate-200/90 dark:border-navy-800/80 rounded-sm p-4 shadow-sm font-sans">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider bg-[#0a1128] text-white border border-navy-700 flex items-center gap-1 font-sans">
                <Database className="w-3 h-3 text-emerald-400" />
                Tesouro Nacional Data Lake API & MySQL Local
              </span>
              <span className="text-[10px] text-slate-500 font-bold font-mono">IBGE: {codigoIbge} ({cidadeNome}/{ufNome})</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-slate-950 dark:text-white font-sans">
              Console & Inspetor de Dados Abertos do Siconfi
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed font-medium">
              Consulte e inspecione diretamente os demonstrativos e registros contábeis persistidos no banco da prefeitura e na API do Tesouro Nacional.
              Acesso aos relatórios fiscais oficiais (RREO, RGF, DCA e MSC) com cache inteligente e sincronização incremental.
            </p>
          </div>

          {/* Connection Status Box */}
          <div className="bg-slate-50 dark:bg-navy-900/60 border border-slate-200 dark:border-navy-800 rounded-sm p-3.5 shrink-0 text-xs space-y-1.5 font-sans">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500 text-[10px] uppercase font-bold">Status Servidor:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {siconfiStatus?.online ? 'Online (Conectado)' : 'Banco MySQL Ativo'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500 text-[10px] uppercase font-bold">Latência API:</span>
              <span className="text-slate-800 dark:text-slate-200 font-bold tabular-nums font-mono">{siconfiStatus?.latencyMs || 0} ms</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500 text-[10px] uppercase font-bold">Ente Ativo:</span>
              <span className="font-bold text-slate-900 dark:text-white font-mono">{cidadeNome} ({codigoIbge})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Preset Queries Buttons */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-emerald-500" />
            <span>CONSULTAS PRÉ-CONFIGURADAS DO SICONFI (CLIQUE PARA EXECUTAR)</span>
          </h3>
          <span className="text-[10px] font-mono text-slate-400">DATA LAKE TESOURO NACIONAL</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {predefinedQueries.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleApplyPreset(q)}
              className="text-left p-3 rounded-sm border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 bg-slate-50 dark:bg-slate-800/40 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-xs font-medium text-slate-800 dark:text-slate-200 transition group font-mono"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition font-sans text-xs">
                  {q.label}
                </span>
                <Play className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:text-emerald-500 shrink-0 ml-1 transition" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Query Customizer & Terminal Output */}
      <div className="bg-slate-950 border border-slate-800 rounded-sm overflow-hidden shadow-sm">
        {/* Terminal Top Bar */}
        <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            <span className="text-[11px] font-mono text-slate-400 ml-2">
              GET /ords/siconfi/tt/{endpoint}?an_exercicio={ano}&id_ente={codigoIbge}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {dbMeta?.fromDb && (
              <span className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 px-2 py-1 rounded-sm bg-emerald-950/40 border border-emerald-800/80">
                <HardDrive className="w-3 h-3 text-emerald-400" />
                <span>Persistido no MySQL ({dbMeta.totalDbRecords || 0} reg)</span>
              </span>
            )}
            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 hover:underline px-2 py-1 rounded-sm bg-slate-800 border border-slate-700"
              >
                <span>URL Tesouro</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <button
              onClick={handleCopyJson}
              disabled={!responseJson}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wider rounded-sm bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition disabled:opacity-40 border border-slate-700"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copiado!' : 'Copiar JSON'}</span>
            </button>
            <button
              onClick={() => handleExecuteQuery(undefined, true)}
              disabled={loading}
              title="Força nova sincronização e salva novos dados no banco"
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wider rounded-sm bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 transition disabled:opacity-40 border border-slate-700"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              <span>Sincronizar Novos</span>
            </button>
            <button
              onClick={() => handleExecuteQuery()}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider rounded-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition disabled:opacity-50"
            >
              <Play className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Consultando...' : 'Executar'}</span>
            </button>
          </div>
        </div>

        {/* JSON Output Viewer */}
        <div className="p-4 max-h-96 overflow-y-auto font-mono text-xs text-emerald-400 bg-slate-950 scrollbar-thin scrollbar-thumb-slate-700">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400 space-x-2 font-mono">
              <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
              <span>Carregando dados fiscais (MySQL / Siconfi Data Lake)...</span>
            </div>
          ) : errorMsg ? (
            <div className="text-rose-400 py-4 font-mono">
              Erro: {errorMsg}
            </div>
          ) : responseJson ? (
            <pre className="whitespace-pre-wrap leading-relaxed font-mono">
              {JSON.stringify(responseJson, null, 2)}
            </pre>
          ) : (
            <div className="text-slate-500 py-8 text-center font-mono">
              Selecione uma das consultas acima ou clique em "Executar" para inspecionar os registros contábeis de {cidadeNome}/{ufNome}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
