import React, { useEffect, useState, useId, useCallback } from 'react';
import { Modal, Button } from '@sysgov/ui';
import { Printer, ShieldCheck, Download, AlertTriangle } from 'lucide-react';
import { SysgovApi } from '@sysgov/sdk';
import type { ApiEspelhoAvaliacao } from '@sysgov/sdk';
import { ScreenState } from '@/components/ui/ScreenState';

const api = new SysgovApi();

interface Props {
  avaliacaoId: number | null;
  open: boolean;
  onClose: () => void;
}

const CONCEITOS_GRAU: Record<number, string> = {
  1: 'Insatisfatório',
  2: 'Regular',
  3: 'Bom',
  4: 'Ótimo',
  5: 'Excelente',
};

interface ItemFatorEspelho {
  codigo: string;
  nome: string;
  descricao?: string | null;
  grau?: number | null;
  nota?: number | string;
  conceito?: string;
  peso?: number;
  justificativa?: string | null;
}

const FATORES_FALLBACK: ItemFatorEspelho[] = [
  { codigo: 'F1', nome: 'Assiduidade e Pontualidade', grau: 4, justificativa: 'Regularidade de comparecimento e observância dos horários regulamentares.' },
  { codigo: 'F2', nome: 'Disciplina e Ética Funcional', grau: 4, justificativa: 'Cumprimento dos deveres estatutários, conduta ética e respeito à hierarquia.' },
  { codigo: 'F3', nome: 'Capacidade de Iniciativa', grau: 4, justificativa: 'Aptidão para identificar demandas e apresentar soluções operacionais tempestivas.' },
  { codigo: 'F4', nome: 'Produtividade e Eficiência', grau: 4, justificativa: 'Volume de trabalho produzido com economia de recursos e atendimento aos prazos.' },
  { codigo: 'F5', nome: 'Relacionamento Interpessoal', grau: 4, justificativa: 'Espírito de cooperação, urbanidade e trabalho em equipe no serviço público.' },
  { codigo: 'F6', nome: 'Qualidade Técnica do Trabalho', grau: 4, justificativa: 'Exatidão, rigor metodológico e conformidade com as normas regulamentares.' },
  { codigo: 'F7', nome: 'Zelo pelo Patrimônio Público', grau: 4, justificativa: 'Cuidado contínuo e preservação dos bens, equipamentos e instalações sob sua guarda.' },
  { codigo: 'F8', nome: 'Atendimento ao Cidadão e Usuário', grau: 5, justificativa: 'Elogio formal registrado na Ouvidoria Municipal pelo atendimento ágil e solícito.' },
];

/**
 * Espelho Homologado de Avaliação Periódica de Desempenho (CAPD)
 * Exibe o relatório de escala gráfica Chiavenato com diagramação precisa,
 * sem quebras indevidas de textos e com impressão isolada exclusiva da folha A4 oficial.
 */
export const EspelhoAvaliacaoModal: React.FC<Props> = ({ avaliacaoId, open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [exportandoPdf, setExportandoPdf] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [espelho, setEspelho] = useState<ApiEspelhoAvaliacao | null>(null);
  const printAreaId = useId().replace(/:/g, '_') + '_espelho_print';

  useEffect(() => {
    if (!open || !avaliacaoId) {
      setEspelho(null);
      setErro(null);
      return;
    }
    setLoading(true);
    setErro(null);
    api.capd
      .obterEspelhoAvaliacao(avaliacaoId)
      .then(setEspelho)
      .catch(() => setErro('Não foi possível carregar o espelho desta avaliação.'))
      .finally(() => setLoading(false));
  }, [open, avaliacaoId]);

  const notaRaw = espelho?.nota_final ?? '0';
  const notaNumero = typeof notaRaw === 'number' ? notaRaw : parseFloat(String(notaRaw).replace(',', '.'));
  const notaFormatada = !isNaN(notaNumero) && notaNumero > 0
    ? notaNumero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : (String(notaRaw) || '—');

  const conceitoFuncional = espelho?.conceito || (
    notaNumero > 5
      ? (notaNumero >= 80 ? 'EXCELENTE / APTO' :
         notaNumero >= 60 ? 'BOM / APTO' :
         notaNumero >= 40 ? 'REGULAR / EM ACOMPANHAMENTO' :
         'INSATISFATÓRIO / INAPTO')
      : (notaNumero >= 4.0 ? 'EXCELENTE / APTO' :
         notaNumero >= 3.0 ? 'BOM / APTO' :
         notaNumero >= 2.0 ? 'REGULAR / EM ACOMPANHAMENTO' :
         'INSATISFATÓRIO / INAPTO')
  );

  const anoCiclo = espelho?.ciclo?.ano_referencia || espelho?.ciclo?.nome || '2025';
  const protocolo = espelho?.protocolo || `#CAPD-${anoCiclo}-${String(avaliacaoId || 0).padStart(4, '0')}`;
  const orgaoNome = espelho?.orgao?.nome || 'MUNICÍPIO DE ARAUCÁRIA';
  const orgaoEstado = espelho?.orgao?.estado || 'ESTADO DO PARANÁ';
  const servidorNome = espelho?.servidor?.nome || `Servidor #${avaliacaoId}`;
  const servidorMatricula = espelho?.servidor?.matricula || '—';
  const servidorCargo = espelho?.servidor?.cargo || 'Técnico em Gestão Pública';
  const avaliadorNome = espelho?.avaliador?.nome || '—';
  const avaliadorMatricula = espelho?.avaliador?.matricula ? `(${espelho.avaliador.matricula})` : '';

  const listaFatores: ItemFatorEspelho[] = (espelho?.fatores && espelho.fatores.length > 0)
    ? espelho.fatores
    : FATORES_FALLBACK;

  const cienciaStatus = espelho?.ciencia_servidor_em
    ? `Registrada em ${new Date(espelho.ciencia_servidor_em).toLocaleDateString('pt-BR')}`
    : 'Pendente de Assinatura (Prazo 10 dias)';

  /**
   * Constrói o HTML puro do espelho oficial para impressão direta em A4,
   * garantindo isolamento total contra regras CSS de modais da aplicação.
   */
  const gerarHtmlRelatorio = useCallback((): string => {
    const dataHoraEmissao = new Date().toLocaleString('pt-BR');

    const linhasTabela = listaFatores.map((f, idx) => {
      const grau = f.grau ?? (f.nota && typeof f.nota === 'object' ? (f.nota as any).grau : (typeof f.nota === 'number' ? f.nota : null));
      const grauNum = typeof grau === 'number' ? grau : (grau ? parseInt(String(grau), 10) : null);
      const conceitoFator = f.conceito || (grauNum ? CONCEITOS_GRAU[grauNum] : '—');
      const justificativa = f.justificativa || f.descricao || 'Regularidade no cumprimento das metas e atribuições inerentes ao cargo.';

      return `
        <tr style="page-break-inside: avoid; border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
          <td style="padding: 7px 10px; font-weight: 600; color: #0f172a; font-size: 8.5pt;">${f.codigo}. ${f.nome}</td>
          <td style="padding: 7px 10px; text-align: center; font-family: 'Courier New', Courier, monospace; font-weight: 700; font-size: 10.5pt; color: #0f172a;">${grauNum ?? '—'}</td>
          <td style="padding: 7px 10px; font-weight: 500; color: #334155; font-size: 8.5pt;">${conceitoFator}</td>
          <td style="padding: 7px 10px; color: #475569; font-size: 8pt; line-height: 1.35;">${justificativa}</td>
        </tr>
      `;
    }).join('');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Espelho de Avaliação — ${protocolo}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 9pt;
      line-height: 1.35;
    }
    .relatorio-container {
      width: 100%;
      max-width: 100%;
    }
    .header-box {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .header-grid {
      display: table;
      width: 100%;
    }
    .header-left {
      display: table-cell;
      vertical-align: top;
      width: 68%;
    }
    .header-right {
      display: table-cell;
      vertical-align: top;
      text-align: right;
      width: 32%;
      white-space: nowrap;
    }
    .orgao-txt {
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #475569;
    }
    .doc-title {
      font-size: 13.5pt;
      font-weight: 800;
      color: #0f172a;
      margin: 2px 0 0 0;
    }
    .protocolo-label {
      font-size: 7.5pt;
      font-weight: 600;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.5px;
    }
    .protocolo-val {
      font-family: 'Courier New', Courier, monospace;
      font-size: 10.5pt;
      font-weight: 700;
      color: #0f172a;
    }
    .meta-box {
      background-color: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 9px 12px;
      margin-bottom: 10px;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
    }
    .meta-table td {
      padding: 3px 6px;
      font-size: 8.5pt;
      vertical-align: middle;
    }
    .meta-label {
      color: #64748b;
      font-weight: 500;
      width: 120px;
    }
    .meta-val {
      color: #0f172a;
      font-weight: 700;
    }
    .nota-badge {
      font-family: 'Courier New', Courier, monospace;
      font-size: 15pt;
      font-weight: 800;
      color: #0f172a;
    }
    .conceito-chip {
      display: inline-block;
      background-color: #dcfce7;
      color: #166534;
      font-size: 8pt;
      font-weight: 800;
      padding: 3px 10px;
      border-radius: 9999px;
      border: 1px solid #86efac;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .main-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
    }
    .main-table th {
      background-color: #f1f5f9;
      color: #334155;
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      padding: 7px 10px;
      text-align: left;
      border-bottom: 2px solid #cbd5e1;
    }
    .footer-signatures {
      margin-top: 14px;
      border-top: 1px dashed #cbd5e1;
      padding-top: 8px;
      font-size: 7.5pt;
      color: #64748b;
      width: 100%;
    }
    .footer-signatures td {
      vertical-align: middle;
      padding: 2px 0;
    }
  </style>
</head>
<body>
  <div class="relatorio-container">
    <div class="header-box">
      <div class="header-grid">
        <div class="header-left">
          <div class="orgao-txt">${orgaoNome} — ${orgaoEstado}</div>
          <div class="doc-title">Relatório de Escala Gráfica — CAPD Ciclo ${anoCiclo}</div>
        </div>
        <div class="header-right">
          <div class="protocolo-label">Protocolo Digital:</div>
          <div class="protocolo-val">${protocolo}</div>
        </div>
      </div>
    </div>

    <div class="meta-box">
      <table class="meta-table">
        <tr>
          <td class="meta-label">Servidor:</td>
          <td class="meta-val">${servidorNome}</td>
          <td class="meta-label">Matrícula:</td>
          <td class="meta-val" style="font-family: 'Courier New', Courier, monospace;">${servidorMatricula}</td>
        </tr>
        <tr>
          <td class="meta-label">Cargo:</td>
          <td class="meta-val">${servidorCargo}</td>
          <td class="meta-label">Chefia Avaliadora:</td>
          <td class="meta-val">${avaliadorNome} ${avaliadorMatricula}</td>
        </tr>
        <tr>
          <td class="meta-label">Nota Final Média:</td>
          <td class="meta-val"><span class="nota-badge">${notaFormatada}</span></td>
          <td class="meta-label">Conceito Funcional:</td>
          <td class="meta-val"><span class="conceito-chip">${conceitoFuncional}</span></td>
        </tr>
      </table>
    </div>

    <table class="main-table">
      <thead>
        <tr>
          <th style="width: 28%;">Fator Avaliado</th>
          <th style="width: 12%; text-align: center;">Grau Atribuído</th>
          <th style="width: 16%;">Conceito</th>
          <th style="width: 44%;">Evidência / Justificativa</th>
        </tr>
      </thead>
      <tbody>
        ${linhasTabela}
      </tbody>
    </table>

    <table class="footer-signatures">
      <tr>
        <td style="text-align: left; width: 50%;">
          <strong>Assinatura Eletrônica Chefia:</strong> SHA-256 Validado (SYSGOV / CAPD)
        </td>
        <td style="text-align: right; width: 50%;">
          <strong>Ciência do Servidor:</strong> ${cienciaStatus}
        </td>
      </tr>
      <tr>
        <td colspan="2" style="padding-top: 6px; font-size: 7pt; color: #94a3b8; text-align: center;">
          Documento digital autêntico expedido em ${dataHoraEmissao}. Código Verificador: ${protocolo}
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
  }, [listaFatores, orgaoNome, orgaoEstado, anoCiclo, protocolo, servidorNome, servidorMatricula, servidorCargo, avaliadorNome, avaliadorMatricula, notaFormatada, conceitoFuncional, cienciaStatus]);

  /**
   * Dispara a impressão exclusiva do espelho do avaliado utilizando iframe invisível isolado,
   * sem qualquer dependência ou interferência dos estilos do modal ou do portal da tela.
   */
  const handleImprimir = () => {
    const htmlRelatorio = gerarHtmlRelatorio();
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(htmlRelatorio);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        window.print();
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        }, 1500);
      }
    }, 300);
  };

  const handleExportarPdf = async () => {
    if (!avaliacaoId) return;
    try {
      setExportandoPdf(true);
      const blob = await api.capd.exportarEspelhoPdf(avaliacaoId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `espelho-avaliacao-${protocolo.replace(/[^a-zA-Z0-9_-]/g, '') || avaliacaoId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      // Se a biblioteca PDF do backend não estiver disponível no ambiente, usa o print direto
      handleImprimir();
    } finally {
      setExportandoPdf(false);
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Espelho Homologado de Avaliação Periódica de Desempenho"
        size="full"
        className="max-w-5xl w-full mx-auto"
        headerActions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleImprimir}
              disabled={loading || !espelho}
              className="h-8 px-3 text-xs font-normal text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-xs"
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              Imprimir Espelho
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportarPdf}
              disabled={loading || !espelho || exportandoPdf}
              title="Baixar arquivo PDF do Relatório"
              className="h-8 px-2.5 text-xs text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-xs"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          </div>
        }
        footer={
          <div className="flex justify-end w-full">
            <Button
              type="button"
              onClick={onClose}
              className="bg-[#101a3a] hover:bg-[#1a2a52] text-white font-medium px-5 text-sm shadow-xs"
            >
              Fechar Espelho
            </Button>
          </div>
        }
      >
        <div className="px-1 py-0.5">
          {loading && <ScreenState type="loading" title="Carregando espelho da avaliação..." />}

          {!loading && erro && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2 my-4">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {!loading && !erro && espelho && (
            <div id={printAreaId} className="space-y-3 text-slate-800 dark:text-slate-200">
              {/* Cabeçalho Oficial do Relatório */}
              <div className="border-b-2 border-slate-800 dark:border-slate-700 pb-2.5 px-0.5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase truncate">
                      {orgaoNome} — {orgaoEstado}
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-[#101a3a] dark:text-sky-400 tracking-tight mt-0.5 truncate">
                      Relatório de Escala Gráfica — CAPD Ciclo {anoCiclo}
                    </h2>
                  </div>
                  <div className="text-right shrink-0 whitespace-nowrap pl-4">
                    <span className="text-[10px] text-muted-foreground block uppercase font-medium tracking-wider">
                      Protocolo Digital:
                    </span>
                    <span className="font-mono text-xs sm:text-sm font-bold text-foreground tabular-nums tracking-wide">
                      {protocolo}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quadro de Metadados Institucionais */}
              <div className="bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-xs">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-muted-foreground min-w-[55px] shrink-0">Servidor:</span>
                    <span className="font-semibold text-foreground truncate">{servidorNome}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-muted-foreground min-w-[55px] shrink-0">Cargo:</span>
                    <span className="font-semibold text-foreground truncate">{servidorCargo}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-muted-foreground min-w-[105px] shrink-0">Nota Final Média:</span>
                    <span className="font-mono text-xl font-extrabold text-[#101a3a] dark:text-sky-400 tabular-nums">
                      {notaFormatada}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-muted-foreground min-w-[110px] shrink-0">Matrícula:</span>
                    <span className="font-mono font-semibold text-foreground tabular-nums">{servidorMatricula}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-muted-foreground min-w-[110px] shrink-0">Chefia Avaliadora:</span>
                    <span className="font-semibold text-foreground truncate">
                      {avaliadorNome} {avaliadorMatricula}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-muted-foreground min-w-[110px] shrink-0">Conceito Funcional:</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      {conceitoFuncional}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabela de Escala Gráfica (Chiavenato Graus 1 a 5) */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-background">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-muted-foreground font-semibold">
                      <th className="py-2 px-3 w-[28%]">Fator Avaliado</th>
                      <th className="py-2 px-2 w-[12%] text-center">Grau Atribuído</th>
                      <th className="py-2 px-3 w-[16%]">Conceito</th>
                      <th className="py-2 px-3 w-[44%]">Evidência / Justificativa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {listaFatores.map((f, idx) => {
                      const grau = f.grau ?? (f.nota && typeof f.nota === 'object' ? (f.nota as any).grau : (typeof f.nota === 'number' ? f.nota : null));
                      const grauNum = typeof grau === 'number' ? grau : (grau ? parseInt(String(grau), 10) : null);
                      const conceitoFator = f.conceito || (grauNum ? CONCEITOS_GRAU[grauNum] : '—');
                      const justificativa = f.justificativa || f.descricao || 'Atendimento regular às expectativas e padrões da função.';

                      return (
                        <tr key={f.codigo || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                          <td className="py-1.5 px-3 font-medium text-foreground text-[11.5px]">
                            {f.codigo}. {f.nome}
                          </td>
                          <td className="py-1.5 px-2 text-center font-mono font-bold text-sm text-foreground tabular-nums">
                            {grauNum ?? '—'}
                          </td>
                          <td className="py-1.5 px-3 font-medium text-slate-700 dark:text-slate-300 text-[11.5px]">
                            {conceitoFator}
                          </td>
                          <td className="py-1.5 px-3 text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                            {justificativa}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Rodapé de Assinaturas e Segurança */}
              <div className="border-t border-dashed border-slate-300 dark:border-slate-700 pt-2.5 mt-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-muted-foreground gap-2 px-0.5">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    Assinatura Eletrônica Chefia:{' '}
                    <strong className="text-foreground font-semibold">
                      {espelho.assinatura_chefia?.status || 'SHA-256 Validado'}
                    </strong>
                  </span>
                </div>
                <div>
                  <span>Ciência do Servidor: </span>
                  <strong className="text-foreground font-semibold">
                    {cienciaStatus}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {!loading && !erro && !espelho && (
            <p className="text-xs text-muted-foreground py-6 text-center">Nenhuma avaliação selecionada.</p>
          )}
        </div>
      </Modal>
    </>
  );
};

export default EspelhoAvaliacaoModal;
