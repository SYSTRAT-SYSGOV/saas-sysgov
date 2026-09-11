/**
 * Leitura padrão dos erros 422 (Laravel `ValidationException`) devolvidos
 * pelo `SysgovApi` (`packages/sdk`) — que sempre anexa `err.response.data`
 * no formato axios (ver `client.ts`). Centraliza aqui em vez de cada
 * formulário reimplementar seu próprio `err?.response?.data?.errors`,
 * pra toda tela reagir do mesmo jeito a erro de validação: uma
 * `ValidationErrorModal` com a lista dos campos, em vez de uma mensagem
 * genérica solta num toast/alerta inline.
 */

export interface ApiFieldError {
  /** Path técnico do campo como o backend devolveu (ex.: "campos.0.tipo"). */
  field: string;
  /** Mensagem de validação (já traduzida pt_BR pelo backend, ver lang/pt_BR/validation.php). */
  message: string;
}

interface LaravelErrorResponse {
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
}

interface ApiErrorLike {
  message?: string;
  response?: { status?: number; data?: LaravelErrorResponse };
}

/**
 * Extrai a lista de erros de campo de uma exceção de validação (422 com
 * `errors: { campo: string[] }`). Retorna `null` quando o erro não é desse
 * formato (ex.: 403, 500, DomainException de regra de negócio) — nesses
 * casos o chamador deve cair no tratamento genérico de erro já existente
 * (mensagem única, sem a modal de campos).
 */
export function getApiValidationErrors(err: unknown): ApiFieldError[] | null {
  const apiErr = err as ApiErrorLike;
  const data = apiErr?.response?.data;
  if (apiErr?.response?.status !== 422 || !data?.errors) {
    return null;
  }

  return Object.entries(data.errors).flatMap(([field, messages]) =>
    messages.map((message) => ({ field, message }))
  );
}

/** Mensagem de erro "achatada" pra exibição fora da modal (fallback de telas que ainda não migraram). */
export function getApiErrorMessage(err: unknown, fallback = 'Ocorreu um erro inesperado.'): string {
  const apiErr = err as ApiErrorLike;
  return apiErr?.response?.data?.error || apiErr?.response?.data?.message || apiErr?.message || fallback;
}
