# Design

## Context

O módulo Pessoas hoje faz exclusão física: `PessoaController::destroy()` chama `$pessoa->delete()` sobre um model sem `SoftDeletes`, e as migrations das tabelas filhas (`pessoas_vinculos`, `pessoas_documentos`, `pessoas_enderecos`, `pessoas_contatos`, `pessoas_usuarios`) declaram `foreignId('pessoa_id')->constrained('pessoas')->cascadeOnDelete()`. Isso significa que excluir uma pessoa hoje apaga em cascata, de forma irreversível, todo o seu histórico — o oposto do que o documento de visão do módulo exige ("preservação do histórico de auditoria"). O índice único de negócio é `unique(['tenant_id', 'cpf_hash'])` em `pessoas` (ver proposal.md - Why).

Outros módulos do SYSGOV (Cemitérios, Capd, Licita, OrgChart) já usam `Illuminate\Database\Eloquent\SoftDeletes` com `$table->softDeletes()` — este design segue exatamente essa convenção já estabelecida, sem inventar um mecanismo próprio.

## Goals / Non-Goals

**Goals:**
- Trocar a exclusão física de `Pessoa` por soft delete, sem quebrar a API pública (`DELETE /api/pessoas/{pessoa}` continua existindo e respondendo do mesmo jeito).
- Preservar automaticamente todo o histórico relacionado (vínculos, documentos, endereços, contatos, vínculo de usuário) quando uma pessoa é excluída.
- Adicionar `matricula` (vínculos), `uf_emissao`/`data_emissao` (documentos) e `autoriza_notificacoes` (contatos), todos opcionais/com default seguro, sem quebrar nenhum registro existente.

**Non-Goals:**
- Restaurar (`restore()`) uma pessoa soft-deletada, ou qualquer endpoint/tela para isso — fora do pedido desta mudança.
- Permitir reuso do CPF de uma pessoa soft-deletada por um novo cadastro — o índice único permanece como está, cobrindo também linhas com `deleted_at` preenchido (comportamento padrão do MySQL/SQLite: o índice único não ignora `deleted_at` automaticamente).
- Soft delete nas tabelas filhas — elas não têm hoje nenhuma exclusão direta exposta via API (o `PessoaController` não tem `destroyDocumento`/`destroyEndereco`/etc.), então não há comportamento de exclusão a proteger nelas ainda.
- Envio de notificação por e-mail na promoção a usuário — decisão explícita do usuário de deixar fora desta mudança.

## Decisions

**`Pessoa` ganha `use SoftDeletes` (trait padrão do Laravel) + migration com `$table->softDeletes()`; nenhuma mudança é necessária em `PessoaController::destroy()`.**
`$pessoa->delete()` já chama automaticamente o soft delete quando o model usa a trait — o controller continua idêntico. `Route::model` binding do Laravel já exclui automaticamente registros soft-deletados por padrão (via `SoftDeletingScope`), então `GET/PUT /api/pessoas/{pessoa}` para uma pessoa excluída já retorna 404 sem nenhum código adicional.

**As tabelas filhas NÃO recebem soft delete nem mudam sua FK `cascadeOnDelete()`.**
Como `Pessoa::delete()` agora é soft delete, a query `DELETE FROM pessoas WHERE id = ?` nunca mais roda de fato pela aplicação (só rodaria em um `forceDelete()`, que não é exposto) — logo, a FK `cascadeOnDelete()` nunca dispara no fluxo normal, e as linhas filhas permanecem exatamente como estão hoje, sem precisar de nenhuma mudança de schema nelas para efeito de preservação de histórico.

**O índice único `(tenant_id, cpf_hash)` permanece sem alteração; uma pessoa soft-deletada continua bloqueando o CPF.**
Alternativa considerada: um índice único parcial que ignore `deleted_at IS NOT NULL` (permitindo reativar o CPF após exclusão). Rejeitada nesta mudança — reabrir esse CPF exigiria decidir entre criar uma pessoa nova (perdendo a ligação com o histórico antigo) ou restaurar a antiga (fora do escopo declarado), e nenhum dos dois foi pedido. Simplicidade deliberada: excluir uma pessoa por engano deve ser corrigido operacionalmente (acesso direto ou uma futura tela de restauração), não por meio de um novo cadastro com o mesmo CPF.

**`matricula`, `uf_emissao`, `data_emissao` e `autoriza_notificacoes` são todos opcionais (nullable ou com default), sem validação de formato além do tipo.**
O documento de visão não especifica formato ou regras de negócio para esses campos (ex.: máscara de matrícula varia por prefeitura); adicionar validação de formato sem uma regra concreta pedida seria inventar requisito. `autoriza_notificacoes` usa `default(true)` no banco, coerente com o cenário "Consentimento de notificação por contato" do spec (autorização concedida por padrão quando não informado).

## Risks / Trade-offs

- [Risco] Testes existentes que fazem `Pessoa::create(...)->delete()` e depois esperam `Pessoa::count() === 0` continuam funcionando (a query padrão do Eloquent já exclui soft-deletados do `count()`), mas qualquer teste que consulte `DB::table('pessoas')` diretamente (sem passar pelo Eloquent) continuaria vendo a linha. → Mitigação: nenhum teste atual do módulo consulta `DB::table('pessoas')` diretamente (confirmado por inspeção); o novo teste desta mudança verifica explicitamente `DB::table('pessoas')->find($id)` para provar que a linha sobrevive.
- [Trade-off] Sem soft delete nas tabelas filhas, uma futura funcionalidade de "excluir documento/endereço/contato individual" (hoje inexistente) precisará decidir separadamente se também deve ser lógica — não é uma lacuna desta mudança, mas fica registrado para quando esse endpoint for proposto.
