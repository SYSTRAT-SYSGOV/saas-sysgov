# Proposal

## Why

Atualmente, módulos do ecossistema SYSGOV (como Cemitérios em Operadores e Empreiteiros, RH, Finance, etc.) gerenciam ou duplicam cadastros civis de pessoas em tabelas e interfaces isoladas, gerando inconsistências cadastrais, redundância de dados e fragilidade no cumprimento da LGPD. Com o módulo de Pessoas já estruturado no backend como repositório canônico de identidade civil, faz-se necessário transformar o cadastro de pessoas em Master Data Management (MDM) consumível de forma centralizada e padronizada por todos os módulos através de componentes reutilizáveis no `@sysgov/ui`, hooks compartilhados e SDK unificado, eliminando cadastros paralelos e estabelecendo o piloto no módulo Cemitérios.

## What Changes

- **Componentes Reutilizáveis de Domínio no `@sysgov/ui`**: Criação de `PessoaPicker` (combobox com debounce e paginação), `PessoaSearchInput`, `PessoaCard` / `PessoaSummary` (resumo de pessoa com nome e CPF mascarado), `PessoaFormModal` (cadastro rápido inline com validação estrita) e `PessoaVinculosBadge` para consumo transparente por qualquer módulo.
- **Camada de Contratos e SDK (`@sysgov/sdk`)**: Inclusão de métodos de lookup compacto e listagem enxuta no `PessoasClient` (`id`, `nome`, `cpf_mascarado`), garantindo proteção de dados sensíveis e conformidade LGPD.
- **Hooks e Estado Compartilhado (`apps/web-client`)**: Disponibilização de `usePessoas` e `usePessoaPicker` no módulo `pessoas` para busca, cache leve e orquestração do modal de cadastro rápido sem expor dados civis restritos.
- **Adoção Piloto no Módulo Cemitérios**: Substituição dos formulários de cadastro paralelo em `OperadoresView` e `EmpreiteirosView` pelo `PessoaPicker`, vinculando o registro à chave estrangeira `pessoa_id` (`[tenant_id, pessoa_id]`), mantendo compatibilidade com registros legados e exibindo resumo via `PessoaCard`.
- **Relação Pessoa ↔ Usuário no Módulo Users**: Exibição do vínculo civil com a pessoa correspondente em cada usuário no módulo `users` (resumo e link de navegação), mantendo estritamente a separação arquitetural de entidades sem unificação de formulários.
- **Migration Pontual em Cemitérios**: Adição de `pessoa_id` (nullable, consistente por tenant) na tabela `cemetery_contractors` (empreiteiros), pareando com a já existente em operadores.

## Capabilities

### New Capabilities
- `pessoas/mdm-consumo`: Componentes de UI reutilizáveis (`PessoaPicker`, `PessoaCard`, `PessoaFormModal`), hooks compartilhados e SDK de lookup para consumo de dados mestres de pessoas físicas entre os módulos do ecossistema SYSGOV sem exposição de dados sensíveis (LGPD).

### Modified Capabilities
- `cemiterio/cadastro-operadores`: Vinculação de operadores (coveiros e pedreiros) e empreiteiros ao cadastro único de pessoas físicas via `pessoa_id`, utilizando `PessoaPicker` em novos cadastros e exibindo resumo cadastral via `PessoaCard`.

## Impact

- **Pacotes Compartilhados**:
  - `packages/ui`: Novos componentes de domínio (`PessoaPicker`, `PessoaSearchInput`, `PessoaCard`, `PessoaFormModal`, `PessoaVinculosBadge`).
  - `packages/sdk`: Tipos e métodos de consulta enxuta (`lookup`) no cliente de pessoas.
- **Frontend (`apps/web-client`)**:
  - `modules/pessoas`: Exportação de hooks (`usePessoas`, `usePessoaPicker`) e suporte a lookup rápido.
  - `modules/cemiterios`: Atualização de `OperadoresView` e `EmpreiteirosView` para seleção via `PessoaPicker` e gravação de `pessoa_id`.
  - `modules/users`: Exibição visual do vínculo da pessoa associada ao usuário.
- **Backend (`apps/api`)**:
  - `Modules/Cemiterios`: Migration `add_pessoa_id_to_cemetery_contractors`, atualização do model `Contractor` e Form Request correspondente.
