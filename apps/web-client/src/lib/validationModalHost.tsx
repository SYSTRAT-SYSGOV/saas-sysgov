import React, { useEffect, useState } from 'react';
import { ValidationErrorModal } from '@/components/ui/ValidationErrorModal';
import { getApiValidationErrors, type ApiFieldError } from '@/lib/apiErrors';
import { camposObrigatoriosVazios, type CampoObrigatorio } from '@/lib/useFormValidationModal';

type Ouvinte = (erros: ApiFieldError[]) => void;
const ouvintes = new Set<Ouvinte>();

/**
 * Se `err` for um 422 de validação, abre a modal padrão (montada uma vez no `AppShell`) e devolve `true`.
 * Devolve `false` para outros erros — ou se a modal global não está montada — e o chamador cai no
 * tratamento que já tinha. É a porta de entrada para hooks compartilhados (ex.: `useAcao`) que não
 * renderizam JSX; telas com formulário próprio usam `useFormValidationModal`.
 */
export function tratarErroValidacaoGlobal(err: unknown): boolean {
  const erros = getApiValidationErrors(err);
  if (erros === null || ouvintes.size === 0) return false;
  ouvintes.forEach((ouvir) => ouvir(erros));
  return true;
}

/** Abre a modal global com problemas já conhecidos no cliente (ex.: confirmação de senha diferente). */
export function invalidarGlobal(problemas: Array<[campo: string, mensagem: string]>): void {
  const erros = problemas.map(([field, message]) => ({ field, message }));
  ouvintes.forEach((ouvir) => ouvir(erros));
}

/** Como `validar` do `useFormValidationModal`, para quem não tem JSX próprio: `true` quando tudo está preenchido. */
export function validarObrigatoriosGlobal(campos: CampoObrigatorio[]): boolean {
  const faltando = camposObrigatoriosVazios(campos);
  if (faltando.length > 0) ouvintes.forEach((ouvir) => ouvir(faltando));
  return faltando.length === 0;
}

/** Modal global de erros de validação: montar uma única vez, no layout autenticado. */
export const ValidationModalHost: React.FC = () => {
  const [erros, setErros] = useState<ApiFieldError[] | null>(null);

  useEffect(() => {
    const ouvir: Ouvinte = (lista) => setErros(lista);
    ouvintes.add(ouvir);
    return () => {
      ouvintes.delete(ouvir);
    };
  }, []);

  return <ValidationErrorModal open={erros !== null} onClose={() => setErros(null)} errors={erros ?? []} />;
};
