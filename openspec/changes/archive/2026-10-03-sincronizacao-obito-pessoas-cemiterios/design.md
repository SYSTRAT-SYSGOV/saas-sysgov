# Design: Sincronização de Situação Vital (Óbito) entre MDM de Pessoas e Cemitérios

## Context

O cadastro central de pessoas (MDM) atua como fonte da verdade de identidades civis no SYSGOV. O módulo de Cemitérios consome esses registros por meio de `pessoa_id`. Atualmente, dados de falecimento estavam restritos às tabelas do cemitério (`concession_holders.titular_falecido`, `deceased_records`). A necessidade de manter o MDM ciente da situação vital da pessoa exige que a model `Pessoa` ganhe atributos de óbito e que o fluxo de gravação no Cemitério sincronize de forma transacional e transparente com o MDM.

## Goals / Non-Goals

**Goals:**
- Adicionar colunas de situação vital na tabela `pessoas`: `falecido`, `data_falecimento`, `certidao_obito_numero`, `cartorio_obito`, `observacao_obito`.
- Expor a situação vital em `PessoaResource`, listagens compactas (`buscarCompacto`) e detalhadas.
- Prover interface no MDM (`PessoaFormModal`, `NovaPessoaWizard`, `PessoaDetailView`, `PessoasListView`) para registro e visualização de óbito.
- Exibir badge indicativo de óbito no `PessoaPicker` e em cartões de pessoa.
- Sincronizar automaticamente no backend quando um titular concessionário for gravado como falecido: se houver `pessoa_id`, atualizar a `Pessoa` no banco.
- Pré-carregar o formulário do titular concessionário com `titular_falecido = true` e data quando o operador vincular uma pessoa mestre já falecida no `PessoaPicker`.

**Non-Goals:**
- Não remover vínculos ou permissões de usuário automaticamente ao registrar óbito (processos de desligamento funcional seguem fluxo administrativo próprio).
- Não alterar a tabela `concession_holders` além da propagação dos dados já existentes nela para a tabela `pessoas`.

## Decisions

### Decisão 1: Atributos de Situação Vital em `pessoas`
- **Escolha**: Adicionar colunas dedicadas `falecido` (`boolean` NOT NULL DEFAULT false), `data_falecimento` (`date` NULL), `certidao_obito_numero` (`string(50)` NULL), `cartorio_obito` (`string(150)` NULL) e `observacao_obito` (`text` NULL).
- **Alternativas consideradas**:
  - *Usar apenas a coluna `status = 'falecido'`*: Rejeitado porque `status` pode ser `'ativo'`, `'inativo'`, etc., e o óbito requer data formal e número de certidão de registro civil.
  - *Criar uma tabela separada `pessoas_obitos`*: Rejeitado por complexidade desnecessária para uma relação estritamente 1:1 de dado civil elementar.

### Decisão 2: Sincronização Transacional no `ConcessaoController`
- **Escolha**: Ao executar `updateTitular()` ou `storeTitular()`, caso `$dados['titular_falecido']` seja verdadeiro e exista `pessoa_id`, o controller atualiza a `Pessoa` vinculada diretamente dentro da transação do banco ou via método dedicado no `PessoaService`.
- **Alternativas consideradas**:
  - *Eventos assíncronos via fila*: Rejeitado para este fluxo imediato porque o operador que acabou de vincular e marcar como falecido espera ver o status atualizado de imediato na Ficha Cadastral do MDM e na listagem.

### Decisão 3: Reatividade no `ModalDetalheJazigo.tsx`
- **Escolha**: Quando o operador escolhe uma pessoa no `PessoaPicker`, a função de callback inspeciona se `pessoa.falecido` é verdadeiro. Se for, atualiza o estado local do formulário preenchendo `titular_falecido: true` e `data_falecimento: pessoa.data_falecimento`. O operador ainda pode revisar ou complementar a data caso necessário.

## Risks / Trade-offs

- [Inconsistência de datas entre Cemitério e MDM] → Mitigação: se a pessoa já possui data de falecimento no MDM e o operador preenche outra no titular, prevalece a do formulário auditada pelo usuário, com registro no log de auditoria.
- [Data de falecimento futura ou anterior ao nascimento] → Mitigação: Validação no `PessoaRequest` e `validarTitular()` impedindo datas incoerentes.
- [Impacto em componentes compartilhados] → Mitigação: `@sysgov/ui` expõe dados nos padrões semânticos de tokens existentes (`bg-neutral-800 text-neutral-200 border-neutral-700` ou similar), mantendo tipografia JetBrains Mono nas datas.
