import type { CampoConfig, CriterioJulgamentoTr, Edital, Processo, Tenant } from '@sysgov/sdk';
import { CSS_CABECALHO_ORGAO, escapeHtml, renderCabecalhoOrgao } from './pdfCabecalho';

const STATUS_LABEL: Record<Edital['status'], string> = {
  rascunho: 'Rascunho',
  aprovado: 'Aprovado',
};

const CRITERIO_JULGAMENTO_LABEL: Record<CriterioJulgamentoTr, string> = {
  menor_preco: 'Menor Preço',
  maior_desconto: 'Maior Desconto',
  melhor_tecnica: 'Melhor Técnica ou Conteúdo Artístico',
  tecnica_e_preco: 'Técnica e Preço',
  maior_lance: 'Maior Lance (leilão)',
};

function formatarDataHora(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR');
}

function formatarValorCampoExtra(campo: CampoConfig, valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return '—';

  switch (campo.tipo) {
    case 'booleano':
      return valor ? 'Sim' : 'Não';
    case 'numero':
      return typeof valor === 'number' ? valor.toLocaleString('pt-BR') : escapeHtml(String(valor));
    case 'texto_longo':
      return typeof valor === 'string' ? valor : '';
    default:
      return escapeHtml(String(valor));
  }
}

interface SecaoRica {
  titulo: string;
  valor: string | null;
}

/**
 * Monta o HTML de impressão de um Edital e escreve na janela já aberta (ver
 * `abrirJanelaPdf` em gerarDfdPdf.ts, reaproveitado aqui também) — mesma
 * estratégia de "imprimir para PDF" das demais fases. Cada seção só entra
 * no PDF se tiver conteúdo preenchido, mesmo espírito do gerarTrPdf.
 */
export function gerarEditalPdf(janela: Window, processo: Processo, tenant: Tenant, camposConfig: CampoConfig[] = []): void {
  const edital = processo.edital;
  if (!edital) {
    janela.close();
    return;
  }

  const equipe = edital.equipe_planejamento ?? [];
  const camposOrdenados = [...camposConfig].sort((a, b) => a.ordem - b.ordem);
  const camposComValor = camposOrdenados.filter((c) => edital.campos_extras && c.key in edital.campos_extras);

  let numeroSecao = 0;
  const proximoNumero = () => ++numeroSecao;
  const tituloSecao = (texto: string) => `<span class="num">${proximoNumero()}</span> ${texto}`;

  const secoesRicas: SecaoRica[] = [
    { titulo: 'Preâmbulo', valor: edital.preambulo },
    { titulo: 'Objeto', valor: edital.objeto },
    { titulo: 'Condições de Participação', valor: edital.condicoes_participacao },
    { titulo: 'Requisitos de Habilitação', valor: edital.requisitos_habilitacao },
    { titulo: 'Procedimento da Sessão Pública', valor: edital.procedimento_sessao_publica },
    { titulo: 'Prazo e Forma de Recursos', valor: edital.prazo_recursal },
    { titulo: 'Sanções Administrativas', valor: edital.sancoes_administrativas },
    { titulo: 'Disposições Gerais', valor: edital.disposicoes_gerais },
  ].filter((s): s is { titulo: string; valor: string } => !!s.valor);

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Edital ${escapeHtml(processo.numero)}/${processo.ano}</title>
<style>
  @page { size: A4; margin: 22mm 18mm; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    color: #1a1a1a;
    font-size: 12px;
    line-height: 1.6;
    margin: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  header { text-align: center; border-bottom: 2px solid #1351B4; padding-bottom: 14px; margin-bottom: 22px; }
  ${CSS_CABECALHO_ORGAO}
  header h1 { font-size: 17px; margin: 8px 0 2px; color: #1351B4; letter-spacing: 0.01em; }
  header .subtitulo { font-size: 11.5px; color: #555; }
  .meta {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 20px; flex-wrap: wrap; gap: 8px;
    background: #f8f9fb; border: 1px solid #e5e7eb; border-radius: 6px;
    padding: 10px 14px;
    page-break-inside: avoid;
  }
  .status { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }
  .status-aprovado { background: #e6f4ea; color: #1e7e34; }
  .status-rascunho { background: #eceff1; color: #444; }
  .assinaturas { font-size: 11px; color: #555; text-align: right; line-height: 1.5; }
  section { margin-bottom: 18px; }
  h2 {
    display: flex; align-items: baseline; gap: 8px;
    font-size: 12.5px; color: #0d2f6b; text-transform: uppercase; letter-spacing: 0.03em;
    border-bottom: 1.5px solid #1351B4; padding-bottom: 5px; margin: 0 0 10px;
    page-break-after: avoid;
  }
  .num {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 18px; height: 18px; padding: 0 4px;
    background: #1351B4; color: #fff; border-radius: 4px;
    font-size: 10.5px; font-weight: 700; letter-spacing: normal; text-transform: none;
  }
  .campo { margin-bottom: 9px; page-break-inside: avoid; }
  .campo .label { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.05em; color: #777; display: block; margin-bottom: 3px; }
  .campo-extra .label { font-size: 12.5px; text-transform: none; letter-spacing: normal; color: #1351B4; font-weight: 600; margin-bottom: 5px; }
  .rich {
    background: #fbfbfc;
    padding: 10px 14px;
    text-align: justify;
    -webkit-hyphens: auto;
    hyphens: auto;
  }
  .rich p { margin: 0 0 8px; }
  .rich p:last-child { margin-bottom: 0; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; page-break-inside: auto; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th, td { border: 1px solid #ddd; padding: 7px 9px; text-align: left; }
  th { background: #eef1f8; color: #0d2f6b; font-weight: 600; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.03em; }
  tbody tr:nth-child(even) { background: #fafafa; }
  footer { margin-top: 34px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 9px; color: #888; text-align: center; }
  @media print {
    a[href]::after { content: none !important; }
  }
</style>
</head>
<body>
  <header>
    ${renderCabecalhoOrgao(tenant)}
    <h1>Edital</h1>
    <div class="subtitulo">Processo ${escapeHtml(processo.numero)}/${processo.ano} — Lei nº 14.133/2021, art. 25</div>
  </header>

  <div class="meta">
    <span class="status status-${edital.status}">${STATUS_LABEL[edital.status]}</span>
    <div class="assinaturas">
      Elaborado por <strong>${escapeHtml(edital.elaborador?.name ?? '—')}</strong>
      ${edital.aprovador ? `<br/>Aprovado por <strong>${escapeHtml(edital.aprovador.name)}</strong> em ${formatarDataHora(edital.aprovado_em)}` : ''}
    </div>
  </div>

  ${secoesRicas.map((s) => `
  <section>
    <h2>${tituloSecao(s.titulo)}</h2>
    <div class="rich">${s.valor}</div>
  </section>`).join('')}

  ${edital.criterio_julgamento ? `
  <section>
    <h2>${tituloSecao('Critério de Julgamento')}</h2>
    <div class="campo"><span class="label">Critério de Julgamento</span>${CRITERIO_JULGAMENTO_LABEL[edital.criterio_julgamento]}</div>
  </section>` : ''}

  ${equipe.length > 0 ? `
  <section>
    <h2>${tituloSecao('Equipe de Planejamento')}</h2>
    <table>
      <thead><tr><th>Nome</th><th>Cargo</th><th>Matrícula</th></tr></thead>
      <tbody>
        ${equipe.map((m) => `<tr><td>${escapeHtml(m.nome)}</td><td>${escapeHtml(m.cargo)}</td><td>${escapeHtml(m.matricula)}</td></tr>`).join('')}
      </tbody>
    </table>
  </section>` : ''}

  ${camposComValor.length > 0 ? `
  <section>
    ${camposComValor.map((c) => `
      <div class="campo campo-extra">
        <span class="label"><span class="num">${proximoNumero()}</span> ${escapeHtml(c.label)}</span>
        <span class="valor${c.tipo === 'texto_longo' ? ' rich' : ''}">${formatarValorCampoExtra(c, edital.campos_extras?.[c.key])}</span>
      </div>
    `).join('')}
  </section>` : ''}

  <footer>
    Documento gerado pelo SYSGOV em ${new Date().toLocaleString('pt-BR')} — válido como registro do Edital conforme dados cadastrados no sistema.
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
