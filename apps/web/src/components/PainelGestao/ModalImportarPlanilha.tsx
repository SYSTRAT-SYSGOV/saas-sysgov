import React, { useState, useRef } from 'react';
import {
  Upload, FileSpreadsheet, Download, CheckCircle2, AlertTriangle,
  X, RefreshCw, ChevronRight, Eye, ShieldCheck,
} from 'lucide-react';
import { DataSourceBadge } from '../DataSourceBadge';

interface ModalImportarPlanilhaProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  onImportSuccess: () => void;
}

export const ModalImportarPlanilha: React.FC<ModalImportarPlanilhaProps> = ({
  isOpen,
  onClose,
  tenantId,
  onImportSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState<string>('');
  const [preview, setPreview] = useState<any | null>(null);
  const [validando, setValidando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setErro(null);
    setSucessoMsg(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      setCsvText(content);
      validarConteudo(content);
    };
    reader.readAsText(selected, 'UTF-8');
  };

  const validarConteudo = async (content: string) => {
    setValidando(true);
    setErro(null);
    try {
      const res = await fetch('/api/painel/validar-planilha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent: content }),
      });
      const data = await res.json();
      setPreview(data);
      if (!data.valid) {
        setErro(data.erros?.[0]?.mensagem || 'A planilha contém inconsistências.');
      }
    } catch (err: any) {
      setErro('Erro ao processar validação da planilha.');
    } finally {
      setValidando(false);
    }
  };

  const handleConfirmarImportacao = async () => {
    if (!csvText || !preview?.valid) return;
    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch('/api/painel/importar-planilha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvContent: csvText,
          tenantId,
          userNome: 'Gestor Municipal',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSucessoMsg(data.message);
        setTimeout(() => {
          onImportSuccess();
          onClose();
        }, 1800);
      } else {
        setErro(data.error || 'Falha ao salvar contratos da planilha.');
      }
    } catch (err: any) {
      setErro('Erro de conexão ao salvar contratos.');
    } finally {
      setSalvando(false);
    }
  };

  const fmtBRL = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-sm w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header do Modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-base font-bold text-slate-100">Importador de Contratos Oficiais</h3>
              <p className="text-xs text-slate-400">Upload de planilha CSV/Excel para atualização da base oficial</p>
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
          {/* Caixa de ação para download do template */}
          <div className="flex items-center justify-between p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-sm flex-wrap gap-3">
            <div className="text-xs text-slate-300">
              <strong>Passo 1:</strong> Utilize o modelo padrão de planilha com as colunas pré-formatadas.
            </div>
            <a
              href="/api/painel/template-planilha"
              download="modelo_contratos_municipais.csv"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm bg-emerald-700/60 hover:bg-emerald-600/60 text-emerald-200 border border-emerald-600/40 text-xs font-mono font-bold transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar Modelo (.CSV)
            </a>
          </div>

          {/* Área de Drag & Drop / Seleção de Arquivo */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-sm p-6 text-center cursor-pointer transition bg-slate-950/30 hover:bg-slate-800/20"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
            <div className="text-sm font-bold text-slate-200">
              {file ? file.name : 'Clique para selecionar a planilha de contratos'}
            </div>
            <p className="text-xs text-slate-500 mt-1">Suporta arquivos .CSV com codificação UTF-8 ou delimitador ponto-e-vírgula (;)</p>
          </div>

          {/* Feedback de Validação / Erro */}
          {validando && (
            <div className="flex items-center justify-center py-4 gap-2 text-xs font-mono text-emerald-400">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Validando colunas e consistência financeira...
            </div>
          )}

          {erro && (
            <div className="p-3 bg-rose-950/40 border border-rose-700/50 rounded-sm flex items-start gap-2 text-xs text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Atenção:</strong> {erro}
              </div>
            </div>
          )}

          {sucessoMsg && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-700/50 rounded-sm flex items-start gap-2 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Sucesso:</strong> {sucessoMsg}
              </div>
            </div>
          )}

          {/* Pré-visualização (Preview) */}
          {preview && preview.linhasValidas?.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-200">
                    Pré-visualização da Base Oficial ({preview.linhasValidas.length} contratos válidos)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-slate-400">Total:</span>
                  <span className="text-emerald-300 font-bold">{fmtBRL(preview.resumoFinanceiro.valorTotal)}</span>
                </div>
              </div>

              {/* Tabela de Preview */}
              <div className="max-h-60 overflow-y-auto border border-slate-800 rounded-sm">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
                    <tr>
                      <th className="p-2">Nº</th>
                      <th className="p-2">Secretaria</th>
                      <th className="p-2">Fornecedor</th>
                      <th className="p-2">Objeto</th>
                      <th className="p-2 text-right">Valor Total</th>
                      <th className="p-2 text-right">Liquidado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                    {preview.linhasValidas.slice(0, 10).map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-800/30">
                        <td className="p-2 text-slate-300 font-bold">{row.numero}</td>
                        <td className="p-2 text-slate-400">{row.secretaria_codigo}</td>
                        <td className="p-2 text-slate-300 truncate max-w-[150px]">{row.empresa}</td>
                        <td className="p-2 text-slate-400 truncate max-w-[200px]">{row.objeto}</td>
                        <td className="p-2 text-right text-emerald-400">{fmtBRL(row.valor_total)}</td>
                        <td className="p-2 text-right text-amber-400">{fmtBRL(row.valor_liquidado)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {preview.linhasValidas.length > 10 && (
                <div className="text-[11px] text-slate-500 font-mono text-center">
                  + {preview.linhasValidas.length - 10} outros contratos prontos para carga oficial.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer do Modal */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-800 bg-slate-950/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-sm border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition cursor-pointer"
          >
            Cancelar
          </button>

          <button
            onClick={handleConfirmarImportacao}
            disabled={!preview?.valid || salvando}
            className="flex items-center gap-2 px-5 py-2 rounded-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold transition cursor-pointer"
          >
            {salvando ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Gravando na Base Oficial...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Confirmar Carga e Virar para [OFICIAL]
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
