# Spec: Shell do Módulo SYS-Educa no Frontend

## ADDED Requirements

### Requirement: Layout do Módulo e Navegação por Submódulos Licenciados
O sistema DEVE (MUST) prover um App Shell para o módulo SYS-Educa no `apps/web-client`, exibindo abas ou itens de navegação apenas para os submódulos licenciados e ativos no tenant, com seletor de contexto de escola e ano letivo.

#### Scenario: Operador acessa o módulo com licenças ativas
- **GIVEN** que o tenant possui a licença do submódulo `educa` (core) e `educa-secretaria` ativas
- **AND** que o usuário está autenticado e possui permissão de acesso
- **WHEN** o usuário acessa a rota `/educa`
- **THEN** o sistema exibe o layout do SYS-Educa com as abas "Gestão Acadêmica" e "Secretaria Escolar"
- **AND** as abas dos submódulos não contratados ou desativados permanecem ocultas
- **AND** o cabeçalho apresenta o seletor da escola municipal e do ano letivo ativo em `JetBrains Mono`

#### Scenario: Bloqueio de acesso a rota desativada
- **GIVEN** que o tenant não possui licença para o submódulo `educa-pedagogico`
- **WHEN** o operador tenta acessar diretamente a URL `/educa/pedagogico`
- **THEN** o `ModuleRouteGuard` intercepta a navegação e exibe a tela de acesso negado (`ForbiddenPage` com código 403)
