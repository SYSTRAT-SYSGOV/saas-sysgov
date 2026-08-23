import React, { useState, useRef } from 'react';
import {
  Upload, FileSpreadsheet, Download, CheckCircle2, AlertTriangle,
  X, RefreshCw, ChevronRight, Eye, ShieldCheck, Globe, Database,
  Code, FileCode, Layers, Link2, Sparkles, Check
} from 'lucide-react';
import { DataSourceBadge } from '../DataSourceBadge';

interface ModalCentralImportacaoProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  cidade: string;
  uf: string;
  cnpj?: string;
  onImportSuccess: () => void;
}

export const ModalCentralImportacao: React.FC<ModalCentralImportacaoProps> = ({
  isOpen,
  onClose,
  tenantId,
  cidade,
  uf,
  cnpj,
  onImportSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'api' | 'planilha' | 'xml'>('api');

  // Estados API
  const [apiUrl, setApiUrl] = useState(`https://pncp.gov.br/api/consulta/v1/contratos?dataInicial=20250101&dataFinal=20251231&cnpjOrgao=${cnpj?.replace(/[^0-9]/g, '') || '76105535000199'}&pagina=1&tamanhoPagina=50`);
  const [apiNome, setApiNome] = useState('PNCP / Portal Nacional');
  const [apiAuth, setApiAuth] = useState('');
  const [loadingApi, setLoadingApi] = useState(false);
  const [loadingPncpDireto, setLoadingPncpDireto] = useState(false);
  const [loadingTodasFontes, setLoadingTodasFontes] = useState(false);

  // Estados Planilha
  const [filePlanilha, setFilePlanilha] = useState<File | null>(null);
  const [csvText, setCsvText] = useState<string>('');
  const [previewPlanilha, setPreviewPlanilha] = useState<any | null>(null);
  const [validandoPlanilha, setValidandoPlanilha] = useState(false);
  const [salvandoPlanilha, setSalvandoPlanilha] = useState(false);
  const filePlanilhaRef = useRef<HTMLInputElement>(null);

  // Estados XML
  const [fileXml, setFileXml] = useState<File | null>(null);
  const [xmlText, setXmlText] = useState<string>('');
  const [previewXml, setPreviewXml] = useState<any | null>(null);
  const [validandoXml, setValidandoXml] = useState(false);
  const [salvandoXml, setSalvandoXml] = useState(false);
  const fileXmlRef = useRef<HTMLInputElement>(null);

  // Feedback geral
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  if (!isOpen) return null;

  // --- Handlers Planilha ---
  const handlePlanilhaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFilePlanilha(selected);
    setFeedback(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      setCsvText(content);
      validarPlanilha(content);
    };
    reader.readAsText(selected, 'UTF-8');
  };

  const validarPlanilha = async (content: string) => {
    setValidandoPlanilha(true);
    try {
      const res = await fetch('/api/painel/validar-planilha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent: content }),
      });
      const text = await res.text();
      let data: any = {};
      try { data = JSON.parse(text); } catch { data = { valid: false, erros: [{ mensagem: text }] }; }
      
      setPreviewPlanilha(data);
      if (!data.valid) {
        setFeedback({ tipo: 'erro', texto: data.erros?.[0]?.mensagem || 'A planilha contém inconsistências.' });
      }
    } catch {
      setFeedback({ tipo: 'erro', texto: 'Erro ao processar validação da planilha.' });
    } finally {
      setValidandoPlanilha(false);
    }
  };

  const salvarPlanilha = async () => {
    if (!csvText || !previewPlanilha?.valid) return;
    setSalvandoPlanilha(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/painel/importar-planilha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent: csvText, tenantId, userNome: 'Gestor Municipal' }),
      });
      const text = await res.text();
      let data: any = {};
      try { data = JSON.parse(text); } catch { data = { success: false, error: text }; }

      if (data.success) {
        setFeedback({ tipo: 'sucesso', texto: data.message });
        setTimeout(() => {
          onImportSuccess();
          onClose();
        }, 1500);
      } else {
        setFeedback({ tipo: 'erro', texto: data.error || 'Falha ao salvar planilha.' });
      }
    } catch (e: any) {
      setFeedback({ tipo: 'erro', texto: `Erro de conexão: ${e.message}` });
    } finally {
      setSalvandoPlanilha(false);
    }
  };

  // --- Handlers XML ---
  const handleXmlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFileXml(selected);
    setFeedback(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      setXmlText(content);
      validarXml(content);
    };
    reader.readAsText(selected, 'UTF-8');
  };

  const validarXml = async (content: string) => {
    setValidandoXml(true);
    try {
      const res = await fetch('/api/painel/validar-xml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xmlContent: content }),
      });
      const text = await res.text();
      let data: any = {};
      try { data = JSON.parse(text); } catch { data = { valid: false, erros: [text] }; }

      setPreviewXml(data);
      if (!data.valid) {
        const errorMsg = data.erros?.[0] || data.mensagem || data.message || data.errorDetail || 'Arquivo XML inválido.';
        const allErrors = data.erros?.length > 1 ? `\n\nDetalhes:\n${data.erros.join('\n')}` : '';
        setFeedback({ tipo: 'erro', texto: errorMsg + allErrors });
      }
    } catch {
      setFeedback({ tipo: 'erro', texto: 'Erro ao validar XML.' });
    } finally {
      setValidandoXml(false);
    }
  };

  const salvarXml = async () => {
    if (!xmlText || !previewXml?.valid) return;
    setSalvandoXml(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/painel/importar-xml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xmlContent: xmlText, tenantId }),
      });
      const text = await res.text();
      let data: any = {};
      try { data = JSON.parse(text); } catch { data = { success: false, error: text }; }

      if (data.success) {
        setFeedback({ tipo: 'sucesso', texto: data.message });
        setTimeout(() => {
          onImportSuccess();
          onClose();
        }, 1500);
      } else {
        const errorMsg = data.error || data.erros?.[0] || data.mensagem || data.message || 'Erro ao importar XML.';
        setFeedback({ tipo: 'erro', texto: errorMsg });
      }
    } catch (e: any) {
      setFeedback({ tipo: 'erro', texto: `Erro de conexão: ${e.message}` });
    } finally {
      setSalvandoXml(false);
    }
  };

  // --- Handlers API ---
  const handleSincronizarPncpDireto = async () => {
    setLoadingPncpDireto(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/painel/sincronizar-pncp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, ano: 2025, cnpj: '76.105.535/0001-99' }),
      });
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = { mensagem: text };
      }

      if (res.ok && data.sucesso) {
        setFeedback({ tipo: 'sucesso', texto: data.mensagem || 'Sincronização com o PNCP concluída com sucesso!' });
        setTimeout(() => {
          onImportSuccess();
          onClose();
        }, 1500);
      } else {
        setFeedback({ tipo: 'erro', texto: data.error || data.details || data.mensagem || 'Falha na resposta da sincronização.' });
      }
    } catch (e: any) {
      setFeedback({ tipo: 'erro', texto: `Erro de conexão: ${e.message}` });
    } finally {
      setLoadingPncpDireto(false);
    }
  };

  const handleConectarApi = async () => {
    setLoadingApi(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/painel/conectar-api-generica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiUrl, authHeader: apiAuth, tenantId, nomeFonte: apiNome }),
      });
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: text };
      }

      if (res.ok && data.success) {
        setFeedback({ tipo: 'sucesso', texto: data.message });
        setTimeout(() => {
          onImportSuccess();
          onClose();
        }, 1500);
      } else {
        setFeedback({ tipo: 'erro', texto: data.error || 'Falha ao conectar API externa.' });
      }
    } catch (e: any) {
      setFeedback({ tipo: 'erro', texto: `Erro de conexão: ${e.message}` });
    } finally {
      setLoadingApi(false);
    }
  };

  const handleSincronizarTodasFontes = async () => {
    setLoadingTodasFontes(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/painel/sincronizar-todas-fontes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, cnpj: cnpj || '76.105.535/0001-99' }),
      });
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = { sucesso: false, error: text || 'Resposta vazia ou inválida do servidor.' };
      }

      if (res.ok && data.sucesso) {
        setFeedback({ tipo: 'sucesso', texto: data.mensagem || 'Todas as fontes oficiais foram sincronizadas com sucesso!' });
        setTimeout(() => {
          onImportSuccess();
          onClose();
        }, 1500);
      } else {
        setFeedback({ tipo: 'erro', texto: data.error || 'Erro ao sincronizar fontes governamentais.' });
      }
    } catch (e: any) {
      setFeedback({ tipo: 'erro', texto: `Erro de conexão: ${e.message}` });
    } finally {
      setLoadingTodasFontes(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200 font-sans">
      <div className="bg-white dark:bg-navy-950 border border-slate-200 dark:border-navy-800 rounded-sm shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#0a1128] text-white p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-xs border border-emerald-500/40">
                  CENTRAL DE INTEGRAÇÃO MULTI-FONTES
                </span>
                <span className="text-[10px] text-slate-400 font-bold">
                  {cidade.toUpperCase()} / {uf}
                </span>
              </div>
              <h3 className="text-base font-extrabold uppercase tracking-tight text-white mt-0.5">
                Importação e Conexão de Fontes de Dados
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-sm hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status de Sincronização Automática Contínua */}
        <div className="bg-[#101b3b] text-white px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs border-b border-navy-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-bold text-[11px] text-emerald-300 uppercase tracking-wider">
              Sincronização Contínua em Background Ativa (Ciclo 2h)
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            PNCP • Compras.gov.br • Banco de Preços • dados.gov.br
          </span>
        </div>

        {/* Abas */}
        <div className="flex border-b border-slate-200 dark:border-navy-800 bg-slate-100 dark:bg-navy-900 px-4 pt-2 gap-2 text-xs font-bold shrink-0">
          <button
            onClick={() => { setActiveTab('api'); setFeedback(null); }}
            className={`px-4 py-2.5 rounded-t-sm border-t-2 transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'api'
                ? 'bg-white dark:bg-navy-950 border-emerald-600 text-slate-900 dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4 text-emerald-600" />
            <span>APIs & Portais Oficiais</span>
          </button>

          <button
            onClick={() => { setActiveTab('planilha'); setFeedback(null); }}
            className={`px-4 py-2.5 rounded-t-sm border-t-2 transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'planilha'
                ? 'bg-white dark:bg-navy-950 border-emerald-600 text-slate-900 dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Planilhas (CSV / Excel)</span>
          </button>

          <button
            onClick={() => { setActiveTab('xml'); setFeedback(null); }}
            className={`px-4 py-2.5 rounded-t-sm border-t-2 transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'xml'
                ? 'bg-white dark:bg-navy-950 border-emerald-600 text-slate-900 dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4 text-emerald-600" />
            <span>Arquivos XML (TCE / Siconfi)</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className={`p-3 mx-4 mt-4 rounded-xs border text-xs font-bold flex items-center gap-2 shrink-0 ${
            feedback.tipo === 'sucesso'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700'
              : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700'
          }`}>
            {feedback.tipo === 'sucesso' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
            <span>{feedback.texto}</span>
          </div>
        )}

        {/* Conteúdo das Abas */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* ABA 1: APIs */}
          {activeTab === 'api' && (
            <div className="space-y-4">
              {/* Card Destaque: Sincronização em Lote de Todas as Fontes */}
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 p-4 rounded-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-700 text-white px-2 py-0.5 rounded-xs">
                    SINCRONIZAÇÃO AUTOMÁTICA EM TEMPO REAL
                  </span>
                  <h4 className="text-sm font-extrabold text-slate-950 dark:text-white uppercase mt-1">
                    Conectar e Atualizar Todas as Fontes Governamentais
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Executa em paralelo a sincronização com o <strong>PNCP</strong>, <strong>Compras.gov.br</strong>, <strong>Banco de Preços</strong> e <strong>dados.gov.br</strong> para {cidade} / {uf}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSincronizarTodasFontes}
                  disabled={loadingTodasFontes}
                  className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-sm transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingTodasFontes ? 'animate-spin' : ''}`} />
                  <span>{loadingTodasFontes ? 'Atualizando Fontes...' : 'Sincronizar Todas as Fontes'}</span>
                </button>
              </div>

              <div className="bg-slate-50 dark:bg-navy-900/60 p-4 rounded-sm border border-slate-200 dark:border-navy-800 space-y-4">
                <div>
                  <span className="text-xs font-bold text-slate-950 dark:text-white uppercase block">
                    Conectar APIs e Portais de Dados Abertos Oficiais
                  </span>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Selecione um template oficial pré-configurado do Governo Federal ou insira o endpoint personalizado do seu ERP/TCE:
                  </p>
                </div>

                {/* Templates Rápidos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setApiNome('PNCP Federal (Lei 14.133/2021)');
                      setApiUrl('https://pncp.gov.br/api/consulta/v1/contratos');
                    }}
                    className="p-2.5 bg-white dark:bg-navy-950 border border-slate-200 dark:border-navy-700 hover:border-[#0a1128] dark:hover:border-navy-400 rounded-sm text-left transition cursor-pointer flex items-center justify-between group"
                  >
                    <div>
                      <span className="text-[11px] font-bold text-slate-900 dark:text-white block group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                        🏛️ PNCP Federal (Lei 14.133/2021)
                      </span>
                      <span className="text-[10px] text-slate-500">API Oficial de Contratos Públicos</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200">Usar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setApiNome('Compras.gov.br (Dados Abertos Federal)');
                      setApiUrl('https://dadosabertos.compras.gov.br/modulo-contratacoes/1_consultarContratacoes');
                    }}
                    className="p-2.5 bg-white dark:bg-navy-950 border border-slate-200 dark:border-navy-700 hover:border-[#0a1128] dark:hover:border-navy-400 rounded-sm text-left transition cursor-pointer flex items-center justify-between group"
                  >
                    <div>
                      <span className="text-[11px] font-bold text-slate-900 dark:text-white block group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                        📦 Compras.gov.br (Contratações)
                      </span>
                      <span className="text-[10px] text-slate-500">Módulo Contratações & Comprasnet</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200">Usar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setApiNome('Compras.gov.br (Pesquisa de Preços Públicos)');
                      setApiUrl('https://dadosabertos.compras.gov.br/modulo-pesquisa-preco/1_consultarMaterialItem');
                    }}
                    className="p-2.5 bg-white dark:bg-navy-950 border border-slate-200 dark:border-navy-700 hover:border-[#0a1128] dark:hover:border-navy-400 rounded-sm text-left transition cursor-pointer flex items-center justify-between group"
                  >
                    <div>
                      <span className="text-[11px] font-bold text-slate-900 dark:text-white block group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                        🏷️ Banco de Preços Públicos
                      </span>
                      <span className="text-[10px] text-slate-500">Módulo Pesquisa de Preços de Referência</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200">Usar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setApiNome('Portal Brasileiro de Dados Abertos (Conecta GOV.BR)');
                      setApiUrl('https://dados.gov.br/api/publico/conjuntos-dados');
                    }}
                    className="p-2.5 bg-white dark:bg-navy-950 border border-slate-200 dark:border-navy-700 hover:border-[#0a1128] dark:hover:border-navy-400 rounded-sm text-left transition cursor-pointer flex items-center justify-between group"
                  >
                    <div>
                      <span className="text-[11px] font-bold text-slate-900 dark:text-white block group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                        🌐 Portal de Dados Abertos (dados.gov.br)
                      </span>
                      <span className="text-[10px] text-slate-500">Catálogo Conecta GOV.BR</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200">Usar</span>
                  </button>
                </div>

                <div className="space-y-3 pt-1 border-t border-slate-200 dark:border-navy-800">
                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-300 block mb-1">
                      Nome / Identificador da Fonte
                    </label>
                    <input
                      type="text"
                      value={apiNome}
                      onChange={e => setApiNome(e.target.value)}
                      placeholder="Ex: Compras.gov.br, PNCP Oficial, ERP Betha Saúde, etc."
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-navy-950 border border-slate-300 dark:border-navy-700 rounded-sm text-slate-900 dark:text-white focus:outline-none focus:border-navy-600"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-300 block mb-1">
                      Endpoint / URL da API (REST JSON)
                    </label>
                    <input
                      type="text"
                      value={apiUrl}
                      onChange={e => setApiUrl(e.target.value)}
                      placeholder="https://api.orgao.gov.br/contratos"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-navy-950 border border-slate-300 dark:border-navy-700 rounded-sm text-slate-900 dark:text-white focus:outline-none focus:border-navy-600"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-300 block mb-1">
                      Token de Autenticação / Authorization Header (Opcional)
                    </label>
                    <input
                      type="text"
                      value={apiAuth}
                      onChange={e => setApiAuth(e.target.value)}
                      placeholder="Bearer seu_token_aqui ou Basic ..."
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-navy-950 border border-slate-300 dark:border-navy-700 rounded-sm text-slate-900 dark:text-white focus:outline-none focus:border-navy-600"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleConectarApi}
                    disabled={loadingApi || !apiUrl}
                    className="px-5 py-2.5 bg-[#0a1128] hover:bg-[#1a2a52] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-sm transition cursor-pointer flex items-center gap-2 shadow-sm"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingApi ? 'animate-spin' : ''}`} />
                    <span>{loadingApi ? 'Conectando e Importando...' : 'Conectar e Atualizar Painéis'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: PLANILHA */}
          {activeTab === 'planilha' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 dark:border-navy-700 rounded-sm p-6 text-center bg-slate-50 dark:bg-navy-900/40 space-y-3">
                <input
                  type="file"
                  ref={filePlanilhaRef}
                  onChange={handlePlanilhaChange}
                  accept=".csv,.txt,.tsv"
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {filePlanilha ? filePlanilha.name : 'Selecione uma Planilha CSV ou TSV'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Colunas aceitas: numero, secretaria, empresa, objeto, valor_total, valor_liquidado, data_inicio, data_fim.
                  </p>
                </div>
                <button
                  onClick={() => filePlanilhaRef.current?.click()}
                  className="px-4 py-2 bg-slate-200 dark:bg-navy-800 hover:bg-slate-300 dark:hover:bg-navy-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-sm transition cursor-pointer"
                >
                  {filePlanilha ? 'Trocar Arquivo' : 'Buscar no Computador'}
                </button>
              </div>

              {previewPlanilha && previewPlanilha.valid && (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 p-4 rounded-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase">
                      ✓ Planilha Validada: {previewPlanilha.linhasValidas.length} contratos identificados
                    </span>
                    <button
                      onClick={salvarPlanilha}
                      disabled={salvandoPlanilha}
                      className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xs transition cursor-pointer shadow-xs"
                    >
                      {salvandoPlanilha ? 'Gravando no Banco...' : 'Confirmar e Cadastrar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ABA 3: XML */}
          {activeTab === 'xml' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 dark:border-navy-700 rounded-sm p-6 text-center bg-slate-50 dark:bg-navy-900/40 space-y-3">
                <input
                  type="file"
                  ref={fileXmlRef}
                  onChange={handleXmlChange}
                  accept=".xml"
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                  <FileCode className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {fileXml ? fileXml.name : 'Selecione um Arquivo XML (TCE-PR, Siconfi ou NF-e)'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    O parser inteligente identificará as tags de contratos, fornecedores e liquidações.
                  </p>
                </div>
                <button
                  onClick={() => fileXmlRef.current?.click()}
                  className="px-4 py-2 bg-slate-200 dark:bg-navy-800 hover:bg-slate-300 dark:hover:bg-navy-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-sm transition cursor-pointer"
                >
                  {fileXml ? 'Trocar Arquivo XML' : 'Buscar Arquivo XML'}
                </button>
              </div>

              {previewXml && previewXml.valid && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 p-4 rounded-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase">
                      ✓ XML Validado: {previewXml.totalContratos} contratos encontrados
                    </span>
                    <button
                      onClick={salvarXml}
                      disabled={salvandoXml}
                      className="px-4 py-1.5 bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold rounded-xs transition cursor-pointer shadow-xs"
                    >
                      {salvandoXml ? 'Gravando no Banco...' : 'Confirmar e Cadastrar XML'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
