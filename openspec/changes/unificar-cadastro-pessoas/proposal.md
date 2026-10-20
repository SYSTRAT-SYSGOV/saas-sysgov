# Proposal

## Why

O cadastro central de pessoas (MDM) existe e já é consumido por vários módulos, mas a adoção é parcial:
muitos módulos ainda guardam uma **cópia própria** dos dados civis (CPF, nome, nascimento, filiação,
e-mail, telefone), alguns nem têm `pessoa_id`, e os que têm mantêm a cópia "espelhada" (ex.: `escola_alunos`,
`capd_servidores`, `campanha_*`, `cemetery_operators`). O resultado é dado duplicado que diverge, cadastros
repetidos da mesma pessoa em módulos diferentes e validações de CPF/CNPJ paralelas. Além disso, o MDM exige
documento (`documento` obrigatório, único por tenant), o que impede cadastrar quem não tem CPF (crianças,
beneficiários, eleitores) e empurra esses módulos para guardar tudo localmente.

Esta change é o **guarda-chuva** da unificação: define o contrato único de consumo, resolve a pessoa sem CPF
no próprio MDM e estabelece as regras comuns (backfill, divergências, compatibilidade e rollback) que as
changes de cada fase vão seguir. Esta change entrega também a **Fase 0 (Fundação)**, que é o que há de comum
a todos os módulos. A adoção em cada módulo (Fases 1 a 5) fica em changes próprias, criadas a partir daqui.

## What Changes

- Permite **pessoa com documento pendente** no MDM: pessoa física sem CPF informado, marcada como
  `documento_pendente`, que pode ser regularizada depois sem perder o histórico nem os vínculos.
- Exige, para pessoa com documento pendente e menor de idade, um **responsável** (pessoa física do mesmo
  tenant) — o campo `responsavel_id` já existe e passa a ser regra de negócio para menores.
- Define o **contrato de consumo** que todo módulo cumpre: referenciar a pessoa por `pessoa_id`, não manter
  colunas civis próprias, ler os dados civis do MDM e gravar alterações civis no MDM.
- Centraliza a **validação de documento** (CPF/CNPJ) no MDM e elimina as cópias de `Support/Documento`
  nos módulos.
- Define o processo de **backfill e conciliação** das cópias existentes: resolver por documento, nunca
  sobrescrever o cadastro mestre, registrar divergências para revisão humana e só depois remover colunas.
- Divide a adoção em **fases**, cada uma como change própria: Fundação (Fase 0), Escola (1), CAPD (2),
  Cemitérios/Campanha/Cursos/Multiprofissional (3), Inservível/Passeio/Procurement (4) e encerramento (5).
- **BREAKING (apenas na Fase 5, por change própria)**: remoção das colunas civis duplicadas nas tabelas dos
  módulos, depois do backfill concluído e validado.

## Capabilities

### New Capabilities
- `pessoas/unificacao-dados`: regras de conciliação das cópias de dados civis dos módulos com o cadastro
  central — resolução por documento, registro e revisão de divergências, ordem de remoção das colunas
  duplicadas e relatório de adoção por módulo.

### Modified Capabilities
- `pessoas`: o cadastro único passa a admitir pessoa física com documento pendente (e regularização
  posterior), exige responsável para menor sem documento e fixa a validação de documento como
  responsabilidade do MDM.
- `pessoas/mdm-consumo`: formaliza o contrato de consumo (referência por `pessoa_id`, sem cópia civil nos
  módulos, escrita civil direcionada ao MDM) e o cadastro rápido de pessoa com documento pendente.

## Impact

- **Backend (`apps/api/Modules/Pessoas`)**: `Pessoa` (documento anulável com estado pendente, índice de
  unicidade ajustado), `ResolucaoPessoaService` (resolução sem CPF), `Documento` (validação única),
  Form Requests e Resources de pessoa, exportação e importação.
- **Módulos consumidores** (nas fases seguintes): Escola, Capd, Cemitérios, Campanha, Cursos,
  Multiprofissional, Inservível, Passeio e Procurement — migrations de backfill e, na Fase 5, remoção de
  colunas.
- **Frontend**: `PessoaPicker`, `PessoaFormModal` e `PessoaCard` em `@sysgov/ui`, SDK `@sysgov/sdk` e as
  telas de cadastro de cada módulo.
- **Dados**: produção tem um único tenant e poucos registros hoje; o backfill deve ser idempotente e
  reversível por fase.
- **LGPD**: pessoa sem documento e dados de menores exigem tratamento restrito (exibição mascarada,
  auditoria e acesso por permissão).
