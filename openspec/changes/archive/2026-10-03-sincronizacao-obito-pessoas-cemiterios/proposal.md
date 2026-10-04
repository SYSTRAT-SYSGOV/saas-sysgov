# Proposal: Sincronização de Situação Vital (Óbito) entre MDM de Pessoas e Módulo de Cemitérios

## Why

Atualmente, o SYSGOV opera com o cadastro mestre de pessoas (MDM) como fonte única de verdade para munícipes, servidores e fornecedores em todos os módulos. No entanto, no módulo de Cemitérios, ao registrar que um titular concessionário faleceu ou ao lavrar um óbito/sepultamento de pessoa física, essa informação ficava restrita ao domínio cemiterial ou dependia de atualização manual redundante. Da mesma forma, o módulo de Pessoas não dispunha de campos formais de situação vital (indicador de óbito, data de falecimento, número e cartório da certidão de óbito).

Com a evolução da integração entre Cemitérios e MDM, é fundamental que o falecimento registrado em qualquer ponta (seja na Ficha Cadastral do MDM ou nos procedimentos do Cemitério como falecimento de titular ou inumação) reflita imediatamente no cadastro único da pessoa, prevenindo fraudes, inconsistências cadastrais e retrabalho de operadores municipais.

## What Changes

- **Cadastro Mestre de Pessoas (MDM)**:
  - Adição dos atributos de situação vital à tabela `pessoas`: `falecido` (booleano), `data_falecimento` (data), `certidao_obito_numero` (string opcional), `cartorio_obito` (string opcional) e `observacao_obito` (texto opcional).
  - Regras de validação e API (`PessoaRequest`, `PessoaResource`, `PessoaService`): quando `falecido` for verdadeiro, exige data de falecimento coerente com a data de nascimento e atualiza o status vital para identificação imediata.
  - Interface do MDM (`PessoaFormModal`, `NovaPessoaWizard`, `PessoaDetailView`, `PessoasListView`, `PessoaPicker`):
    - Seção visual "Situação Vital / Óbito" com alternador "Pessoa Falecida" e campos complementares.
    - Badges claros de óbito ("Falecido(a)") nas listagens, seletores (`PessoaPicker`) e na ficha detalhada.
- **Módulo de Cemitérios & Sincronização Automática**:
  - **Titular Concessionário**:
    - Ao atualizar o concessionário com `titular_falecido = true` e data de falecimento, caso exista `pessoa_id` vinculado, sincroniza automaticamente os campos `falecido` e `data_falecimento` na model `Pessoa` correspondente.
    - Ao selecionar uma pessoa no `PessoaPicker` na tela de titular, se ela já constar como falecida no MDM, pré-marca automaticamente `titular_falecido = true` e preenche a data de falecimento no formulário.
  - **Registro de Falecidos / Inumação**:
    - Ao cadastrar/atualizar registro de falecido (`Falecido`) associado a uma `Pessoa` (`pessoa_id`), atualiza a pessoa no MDM com data do falecimento, número de certidão e cartório.
- **Auditoria e Rastreabilidade**:
  - Toda alteração de situação vital gera log de auditoria no `AuditLogger`, registrando a origem da sincronização (MDM direto ou Módulo Cemitérios).

## Capabilities

### Modified Capabilities
- `pessoas`: Adição dos requisitos de controle de situação vital (óbito), validação de certidão/data de falecimento e sincronização intermodular no MDM.
- `cemiterio/regras-concessao-sucessao`: Adição do requisito de sincronização bidirecional do status de falecimento do titular concessionário com a pessoa mestre vinculada.
- `cemiterio/inventario`: Adição do requisito de pré-preenchimento automático do status e data de óbito ao selecionar titular previamente falecido no MDM.

## Impact

- **Backend (`apps/api`)**:
  - Migration para adicionar colunas de óbito na tabela `pessoas`.
  - Atualização de `Pessoa.php`, `PessoaService.php`, `PessoaRequest.php`, `PessoaResource.php`.
  - Atualização do `Concessionario.php` e `ConcessaoController.php` para sincronizar `Pessoa` no evento de atualização de titular.
  - Atualização de `Falecido.php` e serviços pertinentes em `Modules/Cemiterios`.
- **Frontend (`packages/ui` e `apps/web-client`)**:
  - Atualização de tipos do SDK/API de Pessoas (`Pessoa`, `CreatePessoaDTO`, etc.).
  - Componentes de UI: `PessoaPicker`, `PessoaCard`, `PessoaFormModal`.
  - Telas do MDM: `PessoaDetailView`, `PessoasListView`, `NovaPessoaWizard`.
  - Telas de Cemitério: `ModalDetalheJazigo` (aba de concessões e titulares).
