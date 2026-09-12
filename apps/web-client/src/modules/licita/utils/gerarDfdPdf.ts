import type { CampoConfig, Dfd, ItemDfd, Processo, Tenant } from '@sysgov/sdk';
import { CSS_CABECALHO_ORGAO, escapeHtml, renderCabecalhoOrgao } from './pdfCabecalho';

const TIPO_ITEM_LABEL: Record<ItemDfd['tipo'], string> = {
  material: 'Material',
  servico: 'Serviço',
};

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const STATUS_LABEL: Record<Dfd['status'], string> = {
  rascunho: 'Rascunho',
  em_revisao: 'Em Revisão',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
};

const GRAU_PRIORIDADE_LABEL: Record<Dfd['grau_prioridade'], string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  critica: 'Crítica',
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

function formatarValorCampoExtra(campo: CampoConfig, valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return '—';

  switch (campo.tipo) {
    case 'booleano':
      return valor ? 'Sim' : 'Não';
    case 'data':
      return formatarData(typeof valor === 'string' ? valor : null);
    case 'numero':
      return typeof valor === 'number' ? valor.toLocaleString('pt-BR') : escapeHtml(String(valor));
    case 'texto_longo':
      // já sanitizado no backend (allowlist HTML) antes de persistir.
      return typeof valor === 'string' ? valor : '';
    default:
      return escapeHtml(String(valor));
  }
}

/**
 * Abre a aba de destino do PDF — precisa ser chamado de forma SÍNCRONA
 * dentro do handler de clique (antes de qualquer await), senão o
 * navegador não associa o `window.open` ao gesto do usuário e bloqueia o
 * popup silenciosamente (fica só uma aba em branco). Os dados do DFD são
 * buscados depois, de forma assíncrona, e escritos nessa janela já aberta
 * por `gerarDfdPdf`.
 *
 * NÃO passar 'noopener'/'noreferrer' aqui: pedem ao navegador para não
 * devolver a referência da janela (justamente para impedir que a página
 * aberta acesse `window.opener` — proteção contra tabnabbing ao navegar
 * para uma URL de terceiros). Como não navegamos a lugar nenhum — o
 * conteúdo é gerado por nós via document.write — não há terceiro a se
 * proteger, e com esses flags o Chrome chega a devolver `null` mesmo sem
 * o usuário ter bloqueado nada, quebrando a escrita do conteúdo depois.
 */
export function abrirJanelaPdf(): Window | null {
  return window.open('', '_blank');
}

/**
 * Monta o HTML de impressão de um DFD e escreve na janela já aberta
 * (ver `abrirJanelaPdf`), disparando a caixa de diálogo de impressão do
 * navegador (o usuário escolhe "Salvar como PDF") — mesma estratégia já
 * usada em outros relatórios do SYSGOV (ex.: RelatorioConsolidadoModal
 * no Admin Suite), sem exigir biblioteca de geração de PDF no backend.
 */
export function gerarDfdPdf(janela: Window, processo: Processo, tenant: Tenant, camposConfig: CampoConfig[] = []): void {
  const dfd = processo.dfd;
  if (!dfd) {
    janela.close();
    return;
  }

  const equipe = dfd.equipe_planejamento ?? [];
  const itens = dfd.itens ?? [];
  const valorTotalItens = itens.reduce((soma, item) => soma + item.quantidade * item.valor_unitario, 0);
  const camposOrdenados = [...camposConfig].sort((a, b) => a.ordem - b.ordem);
  const camposComValor = camposOrdenados.filter((c) => dfd.campos_extras && c.key in dfd.campos_extras);

  // Numeração sequencial dos títulos azuis — calculada aqui, não fixa no
  // HTML, porque "Equipe de Planejamento" e os campos extras são seções
  // condicionais (só aparecem se houver conteúdo). Fixar "1.", "2." etc.
  // direto no template deixava os campos extras sem número (paravam no 4,
  // que era o último título fixo) e quebraria a sequência se alguma seção
  // fixa sumisse (ex.: DFD sem equipe cadastrada).
  let numeroSecao = 0;
  const proximoNumero = () => ++numeroSecao;
  /** Título de seção com o número em "pílula" azul (ver `.num` no CSS). */
  const tituloSecao = (texto: string) => `<span class="num">${proximoNumero()}</span> ${texto}`;

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>DFD ${escapeHtml(processo.numero)}/${processo.ano}</title>
<style>
  @page { size: A4; margin: 22mm 18mm; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    color: #1a1a1a;
    font-size: 12px;
    line-height: 1.6;
    margin: 0;
    /* -webkit-print-color-adjust é o que faz o Chrome respeitar as cores de
       fundo (badges, cabeçalho da tabela) no "Salvar como PDF" — sem isso
       ele imprime tudo em preto e branco por padrão. */
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
  section { margin-bottom: 18px; }
  /* Título de seção numerado — o número ganha uma "pílula" azul em vez de
     ser só um algarismo solto na frente do texto, para ler mais como um
     documento oficial impresso do que uma lista qualquer. */
  h2 {
    display: flex; align-items: baseline; gap: 8px;
    font-size: 12.5px; color: #0d2f6b; text-transform: uppercase; letter-spacing: 0.03em;
    border-bottom: 1.5px solid #1351B4; padding-bottom: 5px; margin: 0 0 10px;
    page-break-after: avoid;
  }
  /* Não escopado em "h2 .num" de propósito: os títulos de campo extra
     (".campo-extra .label") usam a mesma pílula numerada, fora de um h2. */
  .num {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 18px; height: 18px; padding: 0 4px;
    background: #1351B4; color: #fff; border-radius: 4px;
    font-size: 10.5px; font-weight: 700; letter-spacing: normal; text-transform: none;
  }
  .campo { margin-bottom: 9px; page-break-inside: avoid; }
  .campo .label { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.05em; color: #777; display: block; margin-bottom: 3px; }
  .campo .valor { white-space: pre-wrap; }
  /* Campos extras do órgão: sem um <h2> de seção agrupando-os (cada campo
     usa o próprio nome como título), então o nome de cada um leva o mesmo
     azul e peso visual dos títulos numerados acima. */
  .campo-extra .label { font-size: 12.5px; text-transform: none; letter-spacing: normal; color: #1351B4; font-weight: 600; margin-bottom: 5px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  /* Texto rico (justificativa, campos extras texto_longo): justificado e
     com hifenização automática, como um documento redigido de verdade —
     texto alinhado só à esquerda ("em farrapo") lê como rascunho, não como
     documento oficial. */
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
  thead { display: table-header-group; } /* repete o cabeçalho da tabela em cada página, se ela quebrar */
  tr { page-break-inside: avoid; }
  th, td { border: 1px solid #ddd; padding: 7px 9px; text-align: left; }
  th { background: #eef1f8; color: #0d2f6b; font-weight: 600; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.03em; }
  tbody tr:nth-child(even) { background: #fafafa; }
  td.numero { font-variant-numeric: tabular-nums; text-align: right; }
  tfoot td { background: #f5f6f8; }
  footer { margin-top: 34px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 9px; color: #888; text-align: center; }
  @media print {
    a[href]::after { content: none !important; }
  }
</style>
</head>
<body>
  <header>
    ${renderCabecalhoOrgao(tenant)}
    <h1>Documento de Formalização de Demanda (DFD)</h1>
    <div class="subtitulo">Processo ${escapeHtml(processo.numero)}/${processo.ano} — Lei nº 14.133/2021</div>
  </header>

  <div class="meta">
    <span class="status status-${dfd.status}">${STATUS_LABEL[dfd.status]}</span>
    <div class="assinaturas">
      Elaborado por <strong>${escapeHtml(dfd.elaborador?.name ?? '—')}</strong>
      ${dfd.aprovador ? `<br/>Aprovado por <strong>${escapeHtml(dfd.aprovador.name)}</strong> em ${formatarDataHora(dfd.aprovado_em)}` : ''}
    </div>
  </div>

  <section>
    <h2>${tituloSecao('Objeto')}</h2>
    <div class="campo valor">${escapeHtml(dfd.objeto)}</div>
  </section>

  <section>
    <h2>${tituloSecao('Justificativa')}</h2>
    <div class="rich">${dfd.justificativa}</div>
  </section>

  <section>
    <h2>${tituloSecao('Dados do Planejamento')}</h2>
    <div class="grid-2">
      <div class="campo"><span class="label">Data Prevista da Contratação</span><span class="valor">${formatarData(dfd.data_previsao)}</span></div>
      <div class="campo"><span class="label">Grau de Prioridade</span><span class="valor">${GRAU_PRIORIDADE_LABEL[dfd.grau_prioridade]}</span></div>
      <div class="campo"><span class="label">Previsão no PCA</span><span class="valor">${dfd.previsao_pca ? `Sim${dfd.numero_pca ? ` — ${escapeHtml(dfd.numero_pca)}` : ''}` : 'Não'}</span></div>
      <div class="campo"><span class="label">Área Requisitante</span><span class="valor">${escapeHtml(dfd.area_requisitante ?? '—')}</span></div>
    </div>
  </section>

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

  ${itens.length > 0 ? `
  <section>
    <h2>${tituloSecao('Itens (Materiais e Serviços)')}</h2>
    <table>
      <thead><tr><th>Tipo</th><th>Código</th><th>Descrição</th><th>Unid.</th><th>Qtd.</th><th>Valor Unit.</th><th>Valor Total</th></tr></thead>
      <tbody>
        ${itens.map((item) => `<tr>
          <td>${TIPO_ITEM_LABEL[item.tipo]}</td>
          <td>${escapeHtml(item.codigo)}</td>
          <td>${escapeHtml(item.descricao)}</td>
          <td>${escapeHtml(item.unidade_medida)}</td>
          <td class="numero">${item.quantidade.toLocaleString('pt-BR')}</td>
          <td class="numero">${formatarMoeda(item.valor_unitario)}</td>
          <td class="numero">${formatarMoeda(item.quantidade * item.valor_unitario)}</td>
        </tr>`).join('')}
      </tbody>
      <tfoot><tr><td colspan="6" style="text-align:right"><strong>Valor Total Estimado</strong></td><td class="numero"><strong>${formatarMoeda(valorTotalItens)}</strong></td></tr></tfoot>
    </table>
  </section>` : ''}

  ${camposComValor.length > 0 ? `
  <section>
    ${camposComValor.map((c) => `
      <div class="campo campo-extra">
        <span class="label"><span class="num">${proximoNumero()}</span> ${escapeHtml(c.label)}</span>
        <span class="valor${c.tipo === 'texto_longo' ? ' rich' : ''}">${formatarValorCampoExtra(c, dfd.campos_extras?.[c.key])}</span>
      </div>
    `).join('')}
  </section>` : ''}

  <footer>
    Documento gerado pelo SYSGOV em ${new Date().toLocaleString('pt-BR')} — válido como registro do DFD conforme dados cadastrados no sistema.
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
