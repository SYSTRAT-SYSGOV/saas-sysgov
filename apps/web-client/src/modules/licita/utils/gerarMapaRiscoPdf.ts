import type { AlocacaoRisco, CampoConfig, FaseRisco, MapaRisco, Processo, Tenant } from '@sysgov/sdk';
import { CSS_CABECALHO_ORGAO, escapeHtml, renderCabecalhoOrgao } from './pdfCabecalho';
import { classificarRisco, CLASSIFICACAO_CORES, CLASSIFICACAO_LABEL, nivelRisco } from './classificacaoRisco';

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

const STATUS_LABEL: Record<MapaRisco['status'], string> = {
  rascunho: 'Rascunho',
  aprovado: 'Aprovado',
};

const FASE_LABEL: Record<FaseRisco, string> = {
  planejamento: 'Planejamento',
  selecao_fornecedor: 'Seleção de Fornecedor',
  gestao_contratual: 'Gestão Contratual',
};

const ALOCACAO_LABEL: Record<AlocacaoRisco, string> = {
  contratante: 'Contratante',
  contratada: 'Contratada',
  compartilhado: 'Compartilhado',
};

function formatarDataHora(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR');
}

/** Célula da matriz de referência (probabilidade 5→1 nas linhas, impacto 1→5 nas colunas) — mesmo layout do modelo usado pela prefeitura. */
function celulaMatrizReferencia(probabilidade: number, impacto: number): string {
  const nivel = nivelRisco(probabilidade, impacto);
  const cor = CLASSIFICACAO_CORES[classificarRisco(probabilidade, impacto)];
  return `<td style="background:${cor.bg};color:${cor.text};text-align:center;font-weight:700">${nivel}</td>`;
}

/** Mesma matriz, mas plotando os IDs dos riscos que caem em cada célula (heatmap) — só entra na página quando há riscos cadastrados. */
function celulaHeatmap(probabilidade: number, impacto: number, riscosPorCelula: Map<string, number[]>): string {
  const ids = riscosPorCelula.get(`${probabilidade}-${impacto}`) ?? [];
  const cor = CLASSIFICACAO_CORES[classificarRisco(probabilidade, impacto)];
  const texto = ids.length > 0 ? ids.map((i) => `R${i}`).join(', ') : '';
  return `<td style="background:${cor.bg};color:${cor.text};text-align:center;font-size:10px">${texto}</td>`;
}

/**
 * Monta o HTML de impressão de um Mapa de Riscos e escreve na janela já
 * aberta (ver `abrirJanelaPdf` em gerarDfdPdf.ts, reaproveitado aqui também)
 * — mesma estratégia de "imprimir para PDF" do DFD/ETP. Layout inspirado no
 * modelo de referência já usado pela prefeitura fora do SYSGOV: matriz de
 * referência, tabela resumo, detalhamento por risco, heatmap e assinaturas.
 */
export function gerarMapaRiscoPdf(janela: Window, processo: Processo, tenant: Tenant, camposConfig: CampoConfig[] = []): void {
  const mapaRisco = processo.mapa_risco;
  if (!mapaRisco) {
    janela.close();
    return;
  }

  const riscos = mapaRisco.riscos ?? [];
  const equipe = mapaRisco.equipe_planejamento ?? [];
  const camposOrdenados = [...camposConfig].sort((a, b) => a.ordem - b.ordem);
  const camposComValor = camposOrdenados.filter((c) => mapaRisco.campos_extras && c.key in mapaRisco.campos_extras);

  const riscosPorCelula = new Map<string, number[]>();
  riscos.forEach((r, i) => {
    const chave = `${r.probabilidade}-${r.impacto}`;
    const lista = riscosPorCelula.get(chave) ?? [];
    lista.push(i + 1);
    riscosPorCelula.set(chave, lista);
  });

  const linhasMatrizReferencia = [5, 4, 3, 2, 1]
    .map((p) => `<tr><td style="font-weight:700;text-align:center">${p}</td>${[1, 2, 3, 4, 5].map((i) => celulaMatrizReferencia(p, i)).join('')}</tr>`)
    .join('');

  const linhasHeatmap = [5, 4, 3, 2, 1]
    .map((p) => `<tr><td style="font-weight:700;text-align:center">${p}</td>${[1, 2, 3, 4, 5].map((i) => celulaHeatmap(p, i, riscosPorCelula)).join('')}</tr>`)
    .join('');

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Mapa de Riscos ${escapeHtml(processo.numero)}/${processo.ano}</title>
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
  .matriz-ref td, .heatmap td { padding: 10px 8px; }
  .risco-card { border: 1px solid #ddd; border-radius: 6px; margin-bottom: 12px; page-break-inside: avoid; overflow: hidden; }
  .risco-card .titulo { background: #0d2f6b; color: #fff; padding: 8px 12px; font-weight: 700; font-size: 11.5px; }
  .risco-card .grid { display: grid; grid-template-columns: repeat(4, 1fr); border-bottom: 1px solid #eee; }
  .risco-card .grid > div { padding: 8px 12px; border-right: 1px solid #eee; }
  .risco-card .grid > div:last-child { border-right: none; }
  .risco-card .label { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.05em; color: #777; display: block; margin-bottom: 2px; }
  .risco-card .bloco { padding: 8px 12px; border-bottom: 1px solid #eee; }
  .risco-card .bloco:last-child { border-bottom: none; }
  .risco-card .bloco-2col { display: grid; grid-template-columns: 1fr 1fr; }
  .risco-card .bloco-2col > div { padding: 8px 12px; }
  .risco-card .bloco-2col > div:first-child { border-right: 1px solid #eee; }
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
    <h1>Mapa de Riscos da Contratação</h1>
    <div class="subtitulo">Processo ${escapeHtml(processo.numero)}/${processo.ano} — Lei nº 14.133/2021, art. 22</div>
  </header>

  <div class="meta">
    <span class="status status-${mapaRisco.status}">${STATUS_LABEL[mapaRisco.status]}</span>
    <div class="assinaturas">
      Elaborado por <strong>${escapeHtml(mapaRisco.elaborador?.name ?? '—')}</strong>
      ${mapaRisco.aprovador ? `<br/>Aprovado por <strong>${escapeHtml(mapaRisco.aprovador.name)}</strong> em ${formatarDataHora(mapaRisco.aprovado_em)}` : ''}
    </div>
  </div>

  <section>
    <h2>Matriz de Probabilidade x Impacto (Referência)</h2>
    <table class="matriz-ref">
      <thead><tr><th>P \\ I</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th></tr></thead>
      <tbody>${linhasMatrizReferencia}</tbody>
    </table>
  </section>

  ${riscos.length > 0 ? `
  <section>
    <h2>Identificação e Análise dos Riscos</h2>
    <table>
      <thead><tr><th>ID</th><th>Descrição</th><th>Fase</th><th>P</th><th>I</th><th>Nível</th></tr></thead>
      <tbody>
        ${riscos.map((r, i) => {
          const nivel = nivelRisco(r.probabilidade, r.impacto);
          const cor = CLASSIFICACAO_CORES[classificarRisco(r.probabilidade, r.impacto)];
          return `<tr>
            <td>R${i + 1}</td>
            <td>${escapeHtml(r.descricao)}</td>
            <td>${FASE_LABEL[r.fase]}</td>
            <td style="text-align:center">${r.probabilidade}</td>
            <td style="text-align:center">${r.impacto}</td>
            <td style="background:${cor.bg};color:${cor.text};text-align:center;font-weight:700">${nivel} (${CLASSIFICACAO_LABEL[classificarRisco(r.probabilidade, r.impacto)]})</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </section>

  <section>
    <h2>Avaliação e Tratamento dos Riscos</h2>
    ${riscos.map((r, i) => {
      const nivel = nivelRisco(r.probabilidade, r.impacto);
      const classificacao = classificarRisco(r.probabilidade, r.impacto);
      return `<div class="risco-card">
        <div class="titulo">R${i + 1}: ${escapeHtml(r.descricao)}</div>
        <div class="grid">
          <div><span class="label">Probabilidade</span>${r.probabilidade}</div>
          <div><span class="label">Impacto</span>${r.impacto}</div>
          <div><span class="label">Nível</span>${nivel} (${CLASSIFICACAO_LABEL[classificacao]})</div>
          <div><span class="label">Alocação</span>${ALOCACAO_LABEL[r.alocacao]}</div>
        </div>
        <div class="bloco"><span class="label">Causa</span>${escapeHtml(r.causa || '—')}</div>
        <div class="bloco"><span class="label">Dano</span>${escapeHtml(r.dano || '—')}</div>
        <div class="bloco bloco-2col">
          <div><span class="label">Ação Preventiva</span>${escapeHtml(r.acao_preventiva || '—')}</div>
          <div><span class="label">Responsável Prevenção</span>${escapeHtml(r.responsavel_prevencao || '—')}</div>
        </div>
        <div class="bloco bloco-2col">
          <div><span class="label">Ação de Contingência</span>${escapeHtml(r.acao_contingencia || '—')}</div>
          <div><span class="label">Responsável Contingência</span>${escapeHtml(r.responsavel_contingencia || '—')}</div>
        </div>
      </div>`;
    }).join('')}
  </section>

  <section>
    <h2>Mapa de Riscos (Heatmap)</h2>
    <table class="heatmap">
      <thead><tr><th>P \\ I</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th></tr></thead>
      <tbody>${linhasHeatmap}</tbody>
    </table>
  </section>` : '<section><p>Nenhum risco cadastrado.</p></section>'}

  ${camposComValor.length > 0 ? `
  <section>
    ${camposComValor.map((c) => `
      <div class="bloco">
        <span class="label" style="font-size:12.5px;text-transform:none;letter-spacing:normal;color:#1351B4;font-weight:600">${escapeHtml(c.label)}</span><br/>
        <span>${formatarValorCampoExtra(c, mapaRisco.campos_extras?.[c.key])}</span>
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

  ${mapaRisco.versoes.length > 0 ? `
  <section>
    <h2>Histórico de Revisões</h2>
    <table>
      <thead><tr><th>Data</th><th>V</th><th>Autor</th><th>Ação</th></tr></thead>
      <tbody>
        ${[...mapaRisco.versoes].map((v) => `<tr>
          <td>${formatarDataHora(v.created_at)}</td>
          <td>${v.versao}</td>
          <td>${escapeHtml(v.usuario?.name ?? '—')}</td>
          <td>${escapeHtml(v.acao)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </section>` : ''}

  <footer>
    Documento gerado pelo SYSGOV em ${new Date().toLocaleString('pt-BR')} — válido como registro do Mapa de Riscos conforme dados cadastrados no sistema.
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
