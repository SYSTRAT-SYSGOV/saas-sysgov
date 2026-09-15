import type { CampoConfig, PesquisaPreco, Processo, Tenant } from '@sysgov/sdk';
import { CSS_CABECALHO_ORGAO, escapeHtml, renderCabecalhoOrgao } from './pdfCabecalho';
import { METODO_REFERENCIA_LABEL, cotacoesValidas, valorReferenciaItem } from './precoReferencia';

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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

const STATUS_LABEL: Record<PesquisaPreco['status'], string> = {
  rascunho: 'Rascunho',
  aprovado: 'Aprovado',
};

function formatarData(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.split('T')[0].split('-');
  if (!ano || !mes || !dia) return iso;
  return `${dia}/${mes}/${ano}`;
}

function formatarDataHora(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR');
}

/**
 * Monta o HTML de impressão de uma Pesquisa de Preços e escreve na janela já
 * aberta (ver `abrirJanelaPdf` em gerarDfdPdf.ts, reaproveitado aqui também)
 * — mesma estratégia de "imprimir para PDF" do DFD/ETP/Mapa de Riscos.
 */
export function gerarPesquisaPrecoPdf(janela: Window, processo: Processo, tenant: Tenant, camposConfig: CampoConfig[] = []): void {
  const pesquisaPreco = processo.pesquisa_preco;
  if (!pesquisaPreco) {
    janela.close();
    return;
  }

  const itens = pesquisaPreco.itens ?? [];
  const equipe = pesquisaPreco.equipe_planejamento ?? [];
  const camposOrdenados = [...camposConfig].sort((a, b) => a.ordem - b.ordem);
  const camposComValor = camposOrdenados.filter((c) => pesquisaPreco.campos_extras && c.key in pesquisaPreco.campos_extras);

  const valorTotalEstimado = itens.reduce((soma, item) => {
    const referencia = valorReferenciaItem(item.cotacoes, pesquisaPreco.metodo_referencia);
    return soma + (referencia ?? 0) * item.quantidade;
  }, 0);

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Pesquisa de Preços ${escapeHtml(processo.numero)}/${processo.ano}</title>
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
  .status-rejeitado { background: #fdecea; color: #b3261e; }
  .status-em_revisao { background: #fff4e5; color: #a15c00; }
  .status-rascunho { background: #eceff1; color: #444; }
  .assinaturas { font-size: 11px; color: #555; text-align: right; line-height: 1.5; }
  section { margin-bottom: 22px; page-break-inside: avoid; }
  h2 {
    display: flex; align-items: baseline; gap: 8px;
    font-size: 12.5px; color: #0d2f6b; text-transform: uppercase; letter-spacing: 0.03em;
    border-bottom: 1.5px solid #1351B4; padding-bottom: 5px; margin: 0 0 10px;
    page-break-after: avoid;
  }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
  th { background: #eef1f8; color: #0d2f6b; font-weight: 600; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.03em; }
  .item-card { border: 1px solid #ddd; border-radius: 6px; margin-bottom: 12px; page-break-inside: avoid; overflow: hidden; }
  .item-card .titulo { background: #0d2f6b; color: #fff; padding: 8px 12px; font-weight: 700; font-size: 11.5px; display: flex; justify-content: space-between; }
  .item-card .subtitulo { padding: 6px 12px; font-size: 10.5px; color: #555; border-bottom: 1px solid #eee; }
  .total-geral { text-align: right; font-size: 13px; font-weight: 700; color: #0d2f6b; padding: 10px 0; }
  .assinatura-bloco { display: inline-block; width: 45%; margin: 12px 2% 20px; text-align: center; vertical-align: top; }
  .assinatura-bloco .linha { border-top: 1px solid #333; margin-top: 32px; padding-top: 4px; }
  footer { margin-top: 34px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 9px; color: #888; text-align: center; }
  @media print {
    a[href]::after { content: none !important; }
  }
</style>
</head>
<body>
  <header>
    ${renderCabecalhoOrgao(tenant)}
    <h1>Pesquisa de Preços</h1>
    <div class="subtitulo">Processo ${escapeHtml(processo.numero)}/${processo.ano} — IN SEGES/ME nº 65/2021</div>
  </header>

  <div class="meta">
    <span class="status status-${pesquisaPreco.status}">${STATUS_LABEL[pesquisaPreco.status]}</span>
    <span>Método de referência: <strong>${METODO_REFERENCIA_LABEL[pesquisaPreco.metodo_referencia]}</strong></span>
    <div class="assinaturas">
      Elaborado por <strong>${escapeHtml(pesquisaPreco.elaborador?.name ?? '—')}</strong>
      ${pesquisaPreco.aprovador ? `<br/>Aprovado por <strong>${escapeHtml(pesquisaPreco.aprovador.name)}</strong> em ${formatarDataHora(pesquisaPreco.aprovado_em)}` : ''}
    </div>
  </div>

  ${pesquisaPreco.justificativa_metodo ? `<section><h2>Justificativa do Método</h2><p>${escapeHtml(pesquisaPreco.justificativa_metodo)}</p></section>` : ''}

  <section>
    <h2>Itens e Valores de Referência</h2>
    ${itens.length === 0 ? '<p>Nenhum item cadastrado.</p>' : itens.map((item) => {
      const validas = cotacoesValidas(item.cotacoes);
      const referencia = valorReferenciaItem(item.cotacoes, pesquisaPreco.metodo_referencia);
      return `<div class="item-card">
        <div class="titulo">
          <span>${escapeHtml(item.codigo)} — ${escapeHtml(item.descricao)}</span>
          <span>${referencia !== null ? formatarMoeda(referencia) : 'Sem cotações válidas'}</span>
        </div>
        <div class="subtitulo">${item.quantidade} ${escapeHtml(item.unidade_medida)} · ${validas.length} cotação(ões) válida(s)</div>
        <table>
          <thead><tr><th>Fonte</th><th>Fornecedor</th><th>Valor Unitário</th><th>Data</th><th>Referência</th></tr></thead>
          <tbody>
            ${item.cotacoes.map((c) => `<tr>
              <td>${escapeHtml(c.fonte)}</td>
              <td>${escapeHtml(c.fornecedor || '—')}</td>
              <td>${formatarMoeda(c.valor_unitario)}</td>
              <td>${formatarData(c.data_cotacao)}</td>
              <td>${escapeHtml(c.referencia || '—')}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    }).join('')}
    <div class="total-geral">Valor total estimado da contratação: ${formatarMoeda(valorTotalEstimado)}</div>
  </section>

  ${camposComValor.length > 0 ? `
  <section>
    ${camposComValor.map((c) => `
      <div>
        <span style="font-size:12.5px;color:#1351B4;font-weight:600">${escapeHtml(c.label)}</span><br/>
        <span>${formatarValorCampoExtra(c, pesquisaPreco.campos_extras?.[c.key])}</span>
      </div>
    `).join('')}
  </section>` : ''}

  ${equipe.length > 0 ? `
  <section>
    <h2>Folha de Assinaturas — Equipe de Planejamento (Elaboração)</h2>
    ${equipe.map((m) => `<div class="assinatura-bloco">
      <div class="linha">
        <strong>${escapeHtml(m.nome)}</strong><br/>
        Matrícula: ${escapeHtml(m.matricula)}<br/>
        ${escapeHtml(m.cargo)}
      </div>
    </div>`).join('')}
  </section>` : ''}

  ${pesquisaPreco.versoes.length > 0 ? `
  <section>
    <h2>Histórico de Revisões</h2>
    <table>
      <thead><tr><th>Data</th><th>V</th><th>Autor</th><th>Ação</th></tr></thead>
      <tbody>
        ${[...pesquisaPreco.versoes].map((v) => `<tr>
          <td>${formatarDataHora(v.created_at)}</td>
          <td>${v.versao}</td>
          <td>${escapeHtml(v.usuario?.name ?? '—')}</td>
          <td>${escapeHtml(v.acao)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </section>` : ''}

  <footer>
    Documento gerado pelo SYSGOV em ${new Date().toLocaleString('pt-BR')} — válido como registro da Pesquisa de Preços conforme dados cadastrados no sistema.
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
