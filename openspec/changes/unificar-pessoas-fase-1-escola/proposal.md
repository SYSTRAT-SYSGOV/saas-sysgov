# Proposal

## Why

Fase 1 da unificação do cadastro de pessoas (guarda-chuva: `unificar-cadastro-pessoas`). O Cadastro Escolar
é o módulo com maior volume e o caso mais claro de dado civil duplicado: `escola_alunos` guarda CPF, data de
nascimento, nome da mãe e do pai próprios, e `escola_aluno_contatos` guarda telefones. A ligação com o
cadastro de pessoas (`AlunoPessoaService`) é opcional e feita por CPF, então alunos sem CPF — a maioria na
rede de ensino infantil e fundamental — ficam fora do MDM e só existem como cópia local.

## What Changes

- Todo aluno passa a ter `pessoa_id` obrigatório: com CPF, resolve a pessoa existente; sem CPF, cria pessoa
  com **documento pendente** e responsável (a mãe, o pai ou outro responsável) conforme a Fase 0.
- Nome, nascimento, filiação e contatos do aluno passam a ser lidos da pessoa; editar esses dados na tela
  do aluno grava na pessoa (generaliza o padrão atual do `AlunoPessoaService`).
- O cadastro e a importação de alunos por CSV passam a usar a resolução do MDM, com sugestão de pessoa
  existente por nome e nascimento antes de criar.
- Equipe gestora e professores (`escola_equipe`) mantêm a referência a `pessoa_id`; sem cópia de nome.
- Conciliação dos alunos existentes com `pessoas:conciliar escola`, com `--dry-run` e relatório antes de
  gravar; divergências vão para revisão.
- As colunas civis duplicadas de `escola_alunos` e `escola_aluno_contatos` permanecem como leitura
  de fallback até a Fase 5.

## Capabilities

### New Capabilities
<!-- Nenhuma. -->

### Modified Capabilities
- `escola`: aluno passa a ser vinculado obrigatoriamente a uma pessoa do cadastro central, inclusive sem CPF.

## Impact

- **Backend**: `Modules/Escola` (`AlunoService`, `AlunoPessoaService`, importação CSV, `AlunoResource`),
  migration de backfill e comando de conciliação.
- **Frontend**: tela de alunos e cadastro rápido (`PessoaPicker`/`PessoaFormModal`), importação CSV.
- **Dependências**: exige a Fase 0 (`unificar-cadastro-pessoas`) entregue.
- **Dados**: produção tem 400 alunos de demonstração sem CPF — serve de teste do backfill de pessoa pendente.
- **LGPD**: alunos são, em sua maioria, menores; seguem as regras de dado restrito da Fase 0.
