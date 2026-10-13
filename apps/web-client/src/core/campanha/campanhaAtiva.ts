/**
 * Campanha de trabalho do módulo Campanha Política (change campanha-politica-fundacao, D2). Guardada por
 * tenant no navegador e enviada pelo apiClient no cabeçalho `X-Campanha-ID` só nas rotas do módulo. O
 * servidor confere se o usuário pode acessá-la — aqui é só a preferência de tela.
 */

/** Rotas do módulo que NÃO dependem da campanha (é por elas que a campanha é escolhida e criada). */
const ROTAS_SEM_CAMPANHA = ['/campanha/campanhas', '/campanha/referencia'];

export const EVENTO_CAMPANHA_ALTERADA = 'sysgov:campanha-alterada';

function chave(): string {
  return `sysgov_campanha_ativa:${localStorage.getItem('sysgov_active_tenant_id') ?? 'sem-tenant'}`;
}

export function obterCampanhaAtiva(): number | null {
  try {
    const valor = Number(localStorage.getItem(chave()));
    return Number.isInteger(valor) && valor > 0 ? valor : null;
  } catch {
    return null;
  }
}

export function definirCampanhaAtiva(id: number | null): void {
  try {
    if (id === null) localStorage.removeItem(chave());
    else localStorage.setItem(chave(), String(id));
  } catch {
    // Navegador sem armazenamento: a campanha vale só para esta tela.
  }
  window.dispatchEvent(new CustomEvent(EVENTO_CAMPANHA_ALTERADA, { detail: id }));
}

/** A rota precisa do cabeçalho de campanha? (url relativa à base da API, com ou sem query) */
export function precisaCampanha(url: string | undefined): boolean {
  if (!url) return false;
  const caminho = url.split('?')[0];
  if (ROTAS_SEM_CAMPANHA.some((r) => caminho === r || caminho.startsWith(`${r}/`))) return false;
  return caminho === '/campanha' || caminho.startsWith('/campanha/');
}
