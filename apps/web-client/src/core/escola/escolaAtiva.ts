/**
 * Escola de trabalho dos módulos de educação (change educacao-multiescola-e-cadastro-pessoas).
 * Guardada por tenant no navegador e enviada pelo apiClient no cabeçalho `X-Escola-ID` só nas
 * rotas desses módulos. O servidor confere se o usuário pode acessar a escola — aqui é só a
 * preferência de tela.
 */

/** Prefixos de rota (relativos à base da API) que exigem escola de trabalho. */
export const ROTAS_COM_ESCOLA = ['/escola', '/pedagogico', '/formatura', '/passeio', '/portfolio'];

/** Rotas do Escola que NÃO dependem da escola (é por elas que a escola é escolhida). */
const ROTAS_SEM_ESCOLA = ['/escola/escolas'];

export const EVENTO_ESCOLA_ALTERADA = 'sysgov:escola-alterada';

function chave(): string {
  return `sysgov_escola_ativa:${localStorage.getItem('sysgov_active_tenant_id') ?? 'sem-tenant'}`;
}

export function obterEscolaAtiva(): number | null {
  try {
    const valor = Number(localStorage.getItem(chave()));
    return Number.isInteger(valor) && valor > 0 ? valor : null;
  } catch {
    return null;
  }
}

export function definirEscolaAtiva(id: number | null): void {
  try {
    if (id === null) localStorage.removeItem(chave());
    else localStorage.setItem(chave(), String(id));
  } catch {
    // Navegador sem armazenamento: a escola vale só para esta tela.
  }
  window.dispatchEvent(new CustomEvent(EVENTO_ESCOLA_ALTERADA, { detail: id }));
}

/** A rota precisa do cabeçalho de escola? (url relativa à base da API, com ou sem query) */
export function precisaEscola(url: string | undefined): boolean {
  if (!url) return false;
  const caminho = url.split('?')[0];
  if (ROTAS_SEM_ESCOLA.some((r) => caminho === r || caminho.startsWith(`${r}/`))) return false;
  return ROTAS_COM_ESCOLA.some((r) => caminho === r || caminho.startsWith(`${r}/`));
}
