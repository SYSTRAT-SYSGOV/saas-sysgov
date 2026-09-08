/**
 * Template de tipos para novos módulos no SDK do SYSGOV.
 * Copie esta pasta para `packages/sdk/src/modules/<alias>` ao criar um novo módulo.
 */

export interface ExampleModuleItem {
  id: number;
  tenant_id: number;
  code?: string;
  title: string;
  amount_cents: number;
  status: string;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateExampleModuleItemInput {
  code?: string;
  title: string;
  amount_cents: number;
  status?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateExampleModuleItemInput {
  title?: string;
  amount_cents?: string | number;
  status?: string;
  metadata?: Record<string, unknown>;
}
