import type { CampoConfig, Dfd, Processo } from '@sysgov/sdk';

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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
export function gerarDfdPdf(janela: Window, processo: Processo, tenantNome: string, camposConfig: CampoConfig[] = []): void {
  const dfd = processo.dfd;
  if (!dfd) {
    janela.close();
    return;
  }

  const equipe = dfd.equipe_planejamento ?? [];
  const camposOrdenados = [...camposConfig].sort((a, b) => a.ordem - b.ordem);
  const camposComValor = camposOrdenados.filter((c) => dfd.campos_extras && c.key in dfd.campos_extras);

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>DFD ${escapeHtml(processo.numero)}/${processo.ano}</title>
<style>
  @page { size: A4; margin: 20mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; font-size: 12px; line-height: 1.5; margin: 0; }
  header { text-align: center; border-bottom: 2px solid #1351B4; padding-bottom: 12px; margin-bottom: 20px; }
  header .orgao { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #444; }
  header h1 { font-size: 16px; margin: 6px 0 2px; color: #1351B4; }
  header .subtitulo { font-size: 12px; color: #555; }
  .meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; flex-wrap: wrap; gap: 8px; }
  .status { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }
  .status-aprovado { background: #e6f4ea; color: #1e7e34; }
  .status-rejeitado { background: #fdecea; color: #b3261e; }
  .status-em_revisao { background: #fff4e5; color: #a15c00; }
  .status-rascunho { background: #eceff1; color: #444; }
  .assinaturas { font-size: 11px; color: #555; text-align: right; }
  section { margin-bottom: 16px; }
  h2 { font-size: 13px; color: #1351B4; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin: 0 0 8px; }
  .campo { margin-bottom: 8px; }
  .campo .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: #777; display: block; margin-bottom: 2px; }
  .campo .valor { white-space: pre-wrap; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .rich { border-left: 3px solid #e0e0e0; padding-left: 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
  th { background: #f5f6f8; font-weight: 600; }
  footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 9.5px; color: #888; text-align: center; }
  @media print {
    a[href]::after { content: none !important; }
  }
</style>
</head>
<body>
  <header>
    <div class="orgao">${escapeHtml(tenantNome)}</div>
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
    <h2>1. Objeto</h2>
    <div class="campo valor">${escapeHtml(dfd.objeto)}</div>
  </section>

  <section>
    <h2>2. Justificativa</h2>
    <div class="rich">${dfd.justificativa}</div>
  </section>

  <section>
    <h2>3. Dados do Planejamento</h2>
    <div class="grid-2">
      <div class="campo"><span class="label">Data Prevista da Contratação</span><span class="valor">${formatarData(dfd.data_previsao)}</span></div>
      <div class="campo"><span class="label">Grau de Prioridade</span><span class="valor">${GRAU_PRIORIDADE_LABEL[dfd.grau_prioridade]}</span></div>
      <div class="campo"><span class="label">Previsão no PCA</span><span class="valor">${dfd.previsao_pca ? `Sim${dfd.numero_pca ? ` — ${escapeHtml(dfd.numero_pca)}` : ''}` : 'Não'}</span></div>
      <div class="campo"><span class="label">Área Requisitante</span><span class="valor">${escapeHtml(dfd.area_requisitante ?? '—')}</span></div>
    </div>
  </section>

  ${equipe.length > 0 ? `
  <section>
    <h2>4. Equipe de Planejamento</h2>
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
      <div class="campo">
        <span class="label">${escapeHtml(c.label)}</span>
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
