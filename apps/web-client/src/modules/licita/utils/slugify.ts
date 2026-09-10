/**
 * Converte um texto livre (rótulo digitado pelo usuário, com acentos,
 * espaços, maiúsculas etc.) na "chave" técnica em snake_case usada como
 * identificador do campo extra — remove a necessidade de o usuário
 * preencher isso manualmente e evita erros comuns (acentuação, esquecer
 * o underline, deixar espaço).
 *
 * "Responsável Técnico" -> "responsavel_tecnico"
 * "Valor Estimado (R$)" -> "valor_estimado_r"
 */
export function slugify(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos/diacriticos (forma decomposta do NFD)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_') // qualquer sequência não alfanumérica vira "_"
    .replace(/^_+|_+$/g, ''); // remove "_" nas pontas
}
