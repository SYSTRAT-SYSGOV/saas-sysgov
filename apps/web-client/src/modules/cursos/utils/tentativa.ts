/** Mesmo limite do servidor (TentativaService::TEXTO_MAX). */
export const TEXTO_MAX_RESPOSTA = 20000;

/** Espera entre a última digitação e o salvamento da dissertativa. */
export const ESPERA_AUTOSAVE_MS = 800;

/**
 * Diferença entre o relógio do servidor e o do navegador, medida quando a
 * tentativa chega. O cronômetro usa `Date.now() + diferença`, então relógio
 * adiantado ou atrasado no computador não muda o prazo real.
 */
export function diferencaDoServidor(servidorAgora: string, agoraLocal = Date.now()): number {
  return Date.parse(servidorAgora) - agoraLocal;
}

/** Milissegundos que faltam para o prazo (nulo se a tentativa não tem prazo). */
export function restanteAtePrazo(prazoEm: string | null, diferenca: number, agoraLocal = Date.now()): number | null {
  return prazoEm === null ? null : Date.parse(prazoEm) - (agoraLocal + diferenca);
}
