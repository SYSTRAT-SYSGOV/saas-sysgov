# Proposal

## Why

O documento de visão do Módulo de Cadastro de Pessoas (v1.0, 29/09/2026) formaliza dois requisitos que o código atual não cumpre: (1) a exclusão de uma pessoa deve ser lógica ("soft delete"), preservando o histórico para fins de auditoria e LGPD — hoje `PessoaController::destroy()` apaga a linha de verdade, e como as tabelas filhas (`pessoas_vinculos`, `pessoas_documentos`, `pessoas_enderecos`, `pessoas_contatos`, `pessoas_usuarios`) têm `cascadeOnDelete()` na FK `pessoa_id`, todo o histórico da pessoa é destruído junto; (2) o documento lista atributos principais das tabelas do módulo que não existem hoje no schema: `matricula` em `pessoas_vinculos`, `uf_emissao`/`data_emissao` em `pessoas_documentos`, e `autoriza_notificacoes` em `pessoas_contatos`. Esta mudança fecha essas duas divergências entre o comportamento real e o documento de referência do módulo.

## What Changes

- **BREAKING (comportamento)**: `Pessoa::destroy()` (via API `DELETE /api/pessoas/{pessoa}`) deixa de apagar a linha definitivamente — passa a ser um soft delete (`deleted_at`), no mesmo padrão já usado em outros módulos do SYSGOV (Cemitérios, Capd, Licita, OrgChart). A pessoa some das listagens/buscas padrão, mas o registro e todo o seu histórico relacionado (vínculos, documentos, endereços, contatos, promoção a usuário) permanecem intactos no banco.
- Novo campo `matricula` (nullable) em `pessoas_vinculos`, exposto no formulário de adicionar/editar vínculo.
- Novos campos `uf_emissao` e `data_emissao` (nullable) em `pessoas_documentos`, expostos no formulário de adicionar documento.
- Novo campo `autoriza_notificacoes` (boolean, default `true`) em `pessoas_contatos`, exposto no formulário de adicionar contato.
- Fora de escopo desta mudança (decisão explícita do usuário): notificação por e-mail na promoção a usuário; qualquer fluxo de restauração/reativação de pessoa soft-deletada; reuso de CPF de uma pessoa soft-deletada por um novo cadastro (o índice único `(tenant_id, cpf_hash)` continua bloqueando o CPF mesmo após soft delete).

## Capabilities

### New Capabilities
(nenhuma — evolui a capability `pessoas` já existente)

### Modified Capabilities
- `pessoas`: nenhum requisito atual do spec principal descreve explicitamente exclusão (hard ou soft) — este delta adiciona esse requisito pela primeira vez, e estende "Documentos, endereços e contatos multivalorados" e "Vínculos de papel modelados em tabela própria" para cobrir os novos campos.

## Impact

- **Backend** (`apps/api/Modules/Pessoas`): migrations para `deleted_at` em `pessoas` e para as 3 colunas novas; `use SoftDeletes` no model `Pessoa`; `PessoaVinculo`/`PessoaDocumento`/`PessoaContato` ganham os novos campos (guarded/validation); `PessoaController` sem mudança de código no `destroy()` (o cast para soft delete é transparente via trait), mas os testes de exclusão precisam validar que o registro e o histórico permanecem no banco.
- **Frontend** (`apps/web-client/src/modules/pessoas`): formulários de vínculo/documento/contato ganham os novos campos.
- **SDK** (`packages/sdk/src/modules/pessoas`): tipos `PessoaVinculo`/`PessoaDocumento`/`PessoaContato` e seus inputs ganham os novos campos.
- Nenhum impacto em outros módulos.
