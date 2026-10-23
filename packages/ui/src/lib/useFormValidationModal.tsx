import React, { useCallback, useState } from 'react';
import { ValidationErrorModal } from '../components/ValidationErrorModal';
import { getApiValidationErrors, type ApiFieldError } from './apiErrors';

/** Campo obrigatório a conferir: rótulo mostrado ao usuário e o valor digitado. */
export type CampoObrigatorio = [rotulo: string, valor: unknown];

function vazio(valor: unknown): boolean {
  if (valor === null || valor === undefined) return true;
  if (typeof valor === 'string') return valor.trim() === '';
  if (Array.isArray(valor)) return valor.length === 0;
  return false;
}

/** Erros "O campo X é obrigatório." para cada campo vazio (lista vazia = tudo preenchido). */
export function camposObrigatoriosVazios(campos: CampoObrigatorio[]): ApiFieldError[] {
  return campos
    .filter(([, valor]) => vazio(valor))
    .map(([rotulo]) => ({ field: rotulo, message: `O campo ${rotulo} é obrigatório.` }));
}

/**
 * Padrão de validação de formulários do portal (mesmo do Licita): erro de
 * campo — obrigatório vazio ou 422 do backend — aparece na `ValidationErrorModal`,
 * um item por campo. Nunca no balão nativo do navegador (`required` HTML) nem
 * como mensagem crua do Laravel.
 *
 * ```tsx
 * const { modal, validar, tratarErro } = useFormValidationModal();
 * const salvar = async () => {
 *   if (!validar([['Nome', nome], ['E-mail', email]])) return;
 *   try { await api.salvar(...); }
 *   catch (err) { if (!tratarErro(err)) notify(getApiErrorMessage(err)); }
 * };
 * return <>{modal} ...</>;
 * ```
 */
export function useFormValidationModal() {
  const [erros, setErros] = useState<ApiFieldError[] | null>(null);

  /** Abre a modal para os campos vazios; devolve `true` quando todos estão preenchidos. */
  const validar = useCallback((campos: CampoObrigatorio[]): boolean => {
    const faltando = camposObrigatoriosVazios(campos);
    setErros(faltando.length > 0 ? faltando : null);
    return faltando.length === 0;
  }, []);

  /** Abre a modal com problemas já conhecidos no cliente (ex.: confirmação de senha diferente). */
  const invalidar = useCallback((problemas: Array<[campo: string, mensagem: string]>) => {
    setErros(problemas.map(([field, message]) => ({ field, message })));
  }, []);

  /** Abre a modal se o erro for um 422 de validação; devolve `false` para outros erros (o chamador cuida deles). */
  const tratarErro = useCallback((err: unknown): boolean => {
    const deCampo = getApiValidationErrors(err);
    if (deCampo) setErros(deCampo);
    return deCampo !== null;
  }, []);

  const limpar = useCallback(() => setErros(null), []);

  const modal = (
    <ValidationErrorModal open={erros !== null} onClose={limpar} errors={erros ?? []} />
  );

  return { modal, validar, invalidar, tratarErro, limpar };
}
