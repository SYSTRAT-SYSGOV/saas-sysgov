import type { Tenant } from '@sysgov/sdk';

/**
 * Compartilhado entre os geradores de PDF do Licita (gerarDfdPdf.ts,
 * gerarLegislacaoPdf.ts) — cada um continua dono do resto do próprio
 * template (a duplicação do layout geral é deliberada, ver comentário em
 * gerarDfdPdf.ts), mas o cabeçalho com logo/nome/dados institucionais do
 * órgão é o mesmo nos dois, então fica num lugar só.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** CSS do bloco `.cabecalho-orgao` — colar dentro do `<style>` de cada template. */
export const CSS_CABECALHO_ORGAO = `
  .cabecalho-orgao { display: flex; align-items: center; justify-content: center; gap: 12px; }
  .cabecalho-orgao .logo { height: 48px; width: auto; max-width: 140px; object-fit: contain; }
  .cabecalho-orgao .info { text-align: left; }
  .cabecalho-orgao .nome { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #444; }
  .cabecalho-orgao .dados { font-size: 9.5px; color: #777; margin-top: 2px; }
`;

/**
 * Monta o `<div class="cabecalho-orgao">` com a logo (se o órgão tiver
 * enviado uma em Configurações), o nome do tenant e uma linha com CNPJ /
 * endereço / telefone (só os campos preenchidos) — substitui o antigo
 * `<div class="orgao">{tenantNome}</div>` sozinho no topo do PDF.
 */
export function renderCabecalhoOrgao(tenant: Tenant): string {
  const logoUrl = tenant.settings?.customLogoUrl;
  const info = tenant.settings?.documentInfo ?? {};

  const localizacao = [info.cidade, info.uf].filter(Boolean).join('/');
  const linhaDados = [
    info.cnpj ? `CNPJ ${info.cnpj}` : null,
    info.endereco,
    localizacao || null,
    info.cep,
    info.telefone,
  ]
    .filter((parte): parte is string => Boolean(parte))
    .join(' — ');

  return `
  <div class="cabecalho-orgao">
    ${logoUrl ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="" />` : ''}
    <div class="info">
      <div class="nome">${escapeHtml(tenant.name)}</div>
      ${linhaDados ? `<div class="dados">${escapeHtml(linhaDados)}</div>` : ''}
    </div>
  </div>`;
}
