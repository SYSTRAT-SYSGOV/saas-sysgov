import type { LegalDocumento, TipoLegalDocumento } from '@sysgov/sdk';

const TIPO_LABEL: Record<TipoLegalDocumento, string> = {
  lei: 'Lei',
  decreto: 'Decreto',
  instrucao_normativa: 'Instrução Normativa',
  jurisprudencia: 'Jurisprudência',
  outro: 'Outro',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Monta o HTML de impressão de um documento da Biblioteca de Legislação e
 * escreve na janela já aberta (ver `abrirJanelaPdf` em gerarDfdPdf.ts,
 * reaproveitada aqui), disparando a caixa de diálogo de impressão do
 * navegador (o usuário escolhe "Salvar como PDF") — mesmo padrão já usado
 * para o PDF do DFD.
 *
 * `texto_completo` já chega sanitizado (allowlist HTML) do backend antes
 * de persistir (ver HtmlSanitizer no LegalDocumentoService) — mesma
 * confiança já dada à justificativa/campos_extras do DFD ao embutir HTML
 * rico direto no template.
 */
export function gerarLegislacaoPdf(janela: Window, documento: LegalDocumento, tenantNome: string): void {
  const escopoLabel = documento.tenant_id === null ? 'GLOBAL' : 'ÓRGÃO';
  const orgaoExibido = documento.tenant_id === null ? 'SYSTRAT — Biblioteca de Legislação' : tenantNome;

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(documento.titulo)}</title>
<style>
  @page { size: A4; margin: 20mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; font-size: 12px; line-height: 1.5; margin: 0; }
  header { text-align: center; border-bottom: 2px solid #1351B4; padding-bottom: 12px; margin-bottom: 20px; }
  header .orgao { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #444; }
  header h1 { font-size: 16px; margin: 6px 0 2px; color: #1351B4; }
  header .subtitulo { font-size: 12px; color: #555; }
  .meta { display: flex; justify-content: center; align-items: center; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }
  .badge-escopo-global { background: #e8eefc; color: #1351B4; }
  .badge-escopo-orgao { background: #eceff1; color: #444; }
  .badge-tipo { background: #f5f6f8; color: #444; }
  section { margin-bottom: 16px; }
  h2 { font-size: 13px; color: #1351B4; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin: 0 0 8px; }
  .campo .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: #777; display: block; margin-bottom: 2px; }
  .campo .valor { white-space: pre-wrap; }
  .rich { border-left: 3px solid #e0e0e0; padding-left: 10px; }
  footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 9.5px; color: #888; text-align: center; }
  @media print {
    a[href]::after { content: none !important; }
  }
</style>
</head>
<body>
  <header>
    <div class="orgao">${escapeHtml(orgaoExibido)}</div>
    <h1>${escapeHtml(documento.titulo)}</h1>
    ${documento.numero ? `<div class="subtitulo">${escapeHtml(documento.numero)}</div>` : ''}
  </header>

  <div class="meta">
    <span class="badge ${documento.tenant_id === null ? 'badge-escopo-global' : 'badge-escopo-orgao'}">${escopoLabel}</span>
    <span class="badge badge-tipo">${TIPO_LABEL[documento.tipo]}</span>
  </div>

  ${documento.ementa ? `
  <section>
    <h2>Ementa</h2>
    <div class="campo valor">${escapeHtml(documento.ementa)}</div>
  </section>` : ''}

  <section>
    <h2>Texto Completo</h2>
    <div class="rich">${documento.texto_completo}</div>
  </section>

  <footer>
    Documento gerado pelo SYSGOV em ${new Date().toLocaleString('pt-BR')} a partir da Biblioteca de Legislação do Licita.
  </footer>
</body>
</html>`;

  janela.document.open();
  janela.document.write(html);
  janela.document.close();

  janela.onload = () => {
    janela.focus();
    janela.print();
  };
}

export default gerarLegislacaoPdf;
