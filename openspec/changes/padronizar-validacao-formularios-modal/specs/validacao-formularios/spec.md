# Spec Delta

## ADDED Requirements

### Requirement: Modal padrão de validação de formulários
<!-- id: client.validacao-formularios.modal -->
<!-- entities: ValidationErrorModal, getApiValidationErrors -->
Todo formulário do portal do cliente que grava dados na API SHALL exibir erros de validação (campo obrigatório vazio ou resposta 422) na `ValidationErrorModal`, listando um item por campo, e SHALL NOT usar balão nativo do navegador, alerta inline com a mensagem crua do Laravel nem toast para esse tipo de erro.

#### Scenario: Campo obrigatório vazio
- **WHEN** o usuário tenta salvar um formulário com campo obrigatório em branco
- **THEN** o sistema abre a modal "Verifique os campos destacados" com uma linha para cada campo obrigatório vazio e não envia a requisição

#### Scenario: Erro 422 do backend
- **WHEN** a API responde 422 com `errors` por campo
- **THEN** a modal lista cada mensagem em pt-BR e o formulário permanece aberto com os dados preenchidos

#### Scenario: Erro que não é de validação
- **WHEN** a API responde 403, 500 ou erro de regra de negócio sem `errors`
- **THEN** o sistema mostra a mensagem única de erro já usada na tela, sem a modal de campos

### Requirement: Obrigatoriedade sem balão nativo
<!-- id: client.validacao-formularios.sem-nativo -->
Formulários migrados SHALL usar `noValidate` e SHALL NOT depender do atributo HTML `required` para impedir o envio, mantendo o indicador visual `*` nos rótulos.

#### Scenario: Envio com campo vazio
- **WHEN** o usuário aciona "Salvar" com um campo marcado com `*` vazio
- **THEN** nenhum balão nativo do navegador aparece e a modal padrão é exibida
