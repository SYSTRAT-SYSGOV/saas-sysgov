## ADDED Requirements

### Requirement: Parecer Descritivo como submódulo da Educação

O sistema SHALL oferecer o módulo Parecer Descritivo como o sétimo submódulo da Educação, em `/educacao/parecer`, com o rótulo "Parecer Descritivo", visível apenas a quem tem a permissão `parecer.view`, no mesmo agrupador, página inicial e barra de navegação dos demais submódulos. O alias, as permissões, a API (`/api/parecer`) e as tabelas do módulo SHALL continuar próprios.

#### Scenario: Usuário com acesso ao Parecer abre a Educação
- **GIVEN** um usuário com `parecer.view` e o módulo `parecer` habilitado no tenant
- **WHEN** ele abre `/educacao`
- **THEN** a página inicial lista "Parecer Descritivo" entre os submódulos permitidos, com link para `/educacao/parecer`
- **AND** a barra de submódulos mostra o item, destacado quando ele estiver na tela do Parecer

#### Scenario: Usuário sem acesso ao Parecer
- **GIVEN** um usuário sem `parecer.view` (ou com o módulo desabilitado no tenant)
- **WHEN** ele abre `/educacao`
- **THEN** "Parecer Descritivo" não aparece na página inicial, na barra nem no menu

#### Scenario: Rota antiga redireciona
- **WHEN** alguém abre `/parecer?aba=notas#topo`
- **THEN** o navegador é levado a `/educacao/parecer?aba=notas#topo`, preservando *query string* e *hash*

#### Scenario: Menu na ordem existente
- **GIVEN** um tenant com os seis itens atuais sob "Educação"
- **WHEN** o módulo `parecer` é registrado
- **THEN** o item "Parecer Descritivo" entra como filho de "Educação" depois do "Transporte Escolar"
- **AND** nenhum item existente muda de ordem, rota ou permissão

#### Scenario: Escola de trabalho
- **WHEN** o web-client chama uma rota `/parecer/*` da API
- **THEN** o cabeçalho `X-Escola-ID` é enviado com a escola ativa, como nos demais submódulos que dependem da escola
