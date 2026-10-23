/**
 * Erro de requisição com o mesmo formato (`response.status` / `response.data`) que o `getApiValidationErrors`
 * de `@sysgov/ui` entende — assim um 422 do Laravel cai na modal padrão de validação em qualquer cliente HTTP do admin.
 */
export class ApiRequestError extends Error {
  response: { status: number; data: any };

  constructor(message: string, status: number, data: any) {
    super(message);
    this.name = 'ApiRequestError';
    this.response = { status, data };
  }
}
