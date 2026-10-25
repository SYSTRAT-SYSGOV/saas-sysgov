# Proposal

## Why

O Licita valida formulários com um padrão único: o usuário tenta salvar, o backend devolve 422 e a `ValidationErrorModal` lista, um item por campo, o que precisa ser corrigido. Fora dele o comportamento é inconsistente. Auditoria do `apps/web-client` (106 telas com formulário e gravação): só 12 usam a modal (Licita 9, Vistoria 2, Requerimentos 1). As outras ~94 mostram mensagem crua do Laravel num alerta inline ou toast, ou são barradas pelo balão nativo do navegador (`required` HTML) antes de chegar ao handler, de modo que a modal nunca aparece.

## What Changes

- Adotar a `ValidationErrorModal` + `getApiValidationErrors` como **único** padrão de erro de validação em todos os módulos do portal do cliente.
- Campo obrigatório vazio passa a abrir a modal (nada de balão nativo): formulários migrados usam `noValidate` e a obrigatoriedade é conferida no cliente (lista dos campos vazios, mesma modal) e garantida pelo backend (422).
- Criar um helper/hook compartilhado (`useFormValidationModal`) que concentra: estado dos erros, checagem de obrigatórios no cliente, tratamento do catch (422 → modal; outros erros → mensagem única) e render da modal. Os formulários do Licita passam a usá-lo sem mudança de comportamento.
- Migrar os módulos por onda, um PR por módulo (ordem na `tasks.md`).
- Documentar o padrão em `docs/web-client.md` e cobrir com teste.

## Capabilities

### New Capabilities
- `validacao-formularios`: padrão de validação de formulários do portal (modal de erros de campo, obrigatórios no cliente, tratamento de 422).

### Modified Capabilities
- Nenhuma capacidade de negócio muda; só a apresentação dos erros.

## Impact

- **Frontend**: `apps/web-client/src/components/ui/ValidationErrorModal.tsx` (mantido), novo hook em `apps/web-client/src/lib/` e ~94 telas distribuídas em 19 módulos (lista na `tasks.md`).
- **Backend**: nenhuma mudança esperada; apenas conferir que os endpoints dos módulos migrados validam via FormRequest e devolvem 422 com mensagens pt-BR.
- **Risco**: telas que hoje confiam no `required` nativo precisam passar a validar no cliente (ou no 422), senão o campo vazio seguiria até a API sem aviso adequado.
