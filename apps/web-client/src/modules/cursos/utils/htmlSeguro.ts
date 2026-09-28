import DOMPurify from 'dompurify';

/**
 * HTML vindo do servidor (enunciados, instruções, textos de material) passa
 * pelo DOMPurify antes de ser exibido: o backend já sanitiza ao salvar, e o
 * front sanitiza de novo como defesa em profundidade.
 */
export function sanitizarHtml(html: string | null | undefined): string {
  return DOMPurify.sanitize(html ?? '', { USE_PROFILES: { html: true } });
}

/** Texto puro de um trecho de HTML (prévia em listas). */
export function htmlParaTexto(html: string | null | undefined, limite = 140): string {
  const texto = DOMPurify.sanitize(html ?? '', { ALLOWED_TAGS: [], KEEP_CONTENT: true }).replace(/\s+/g, ' ').trim();
  return texto.length > limite ? `${texto.slice(0, limite - 1).trimEnd()}…` : texto;
}
