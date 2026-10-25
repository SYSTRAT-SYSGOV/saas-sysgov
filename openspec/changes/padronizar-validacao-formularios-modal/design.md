# Design

## Padrão de referência (Licita)
`DfdForm`, `ProcessoFormModal` e demais: `try { await api… } catch (err) { const erros = getApiValidationErrors(err); if (erros) { setValidationErrors(erros); return; } setSaveError(getApiErrorMessage(err)); }` e `<ValidationErrorModal open={validationErrors !== null} … />`. O `required` HTML é removido de propósito, porque o balão nativo impede a modal de aparecer.

## Decisões
1. **Um hook, não 94 cópias.** `useFormValidationModal<T>()` em `apps/web-client/src/lib/useFormValidationModal.tsx` devolve `{ modal, validar(regras), tratarErro(err), limpar() }`. `modal` é o elemento pronto para renderizar. Mantém `ValidationErrorModal` e `apiErrors.ts` como estão (compatível com Licita, Vistoria e Requerimentos).
2. **Obrigatórios no cliente.** `validar([{ campo: 'Nome', valor: nome }, …])` devolve `false` e abre a modal com "O campo X é obrigatório." para cada vazio. É conveniência de UX; a fonte da verdade continua sendo o backend (422), que cai na mesma modal.
3. **`noValidate` nos `<form>` migrados** e remoção de `required` nativo nos inputs (o asterisco visual `*` permanece).
4. **Erros que não são 422** (403, 500, regra de negócio) continuam como mensagem única inline/toast, como no Licita.
5. **Escopo**: formulários de criação/edição que gravam na API. Filtros e buscas ficam fora. Telas públicas (portais, check-in, validar certificado) entram na última onda.
6. **Migração incremental**: um PR por módulo; cada PR converte as telas do módulo e seus testes. Sem big bang.

## Alternativas descartadas
- Manter `required` nativo: balão fora do padrão visual e inconsistente entre navegadores.
- Erro inline por campo em vez de modal: contraria o padrão já definido pelo usuário (Licita).
