# Design

## Context

O módulo Pessoas já tem o modelo de dados e o pipeline completo de importação assíncrona (ver proposal.md - Why): `PessoaIntegracao` (config por tenant), `PessoaSyncLog` (histórico), `GenericHttpPessoaImportAdapter` (consumo HTTP configurável via `field_mappings`), publicados/consumidos via `OutboxPublisher`/`ImportarPessoaListener`. Hoje não existe nenhuma rota HTTP nem tela para `PessoaIntegracao` ou `PessoaSyncLog` — só são acessíveis por testes ou acesso direto ao banco. `ImportacaoController::importar()` já assume que existe uma `PessoaIntegracao` ativa (`firstOrFail()`), então sem uma forma de criá-la a ação "Importar por CPF" da UI nunca funciona na prática.

Achado relevante durante a investigação: `PessoaSyncLog` nunca persiste o CPF que foi pesquisado — nem em coluna própria, nem sempre em `detalhes` (só quando a importação teve sucesso, via `pessoa_id`). Isso inviabiliza reprocessar uma falha sem essa informação.

## Goals / Non-Goals

**Goals:**
- CRUD de `PessoaIntegracao` via API + tela, com token nunca retornado em texto plano.
- Listagem/filtro de `PessoaSyncLog` via API + painel.
- Reprocessamento manual de uma entrada de log com falha, reaproveitando o pipeline assíncrono já existente (Outbox → `ImportarPessoaListener` → `SincronizacaoPessoaService`), sem duplicar pessoa.
- Cifrar `api_token` em repouso (mesmo padrão de `Pessoa.cpf`/`Pessoa.nis`).

**Non-Goals:**
- Sincronização periódica/agendada (cron, polling automático) — a importação continua sendo sob demanda, disparada por um administrador ou por reprocessamento manual.
- Suporte a outros drivers além de `generic_rest` (CSV/SFTP em lote, SOAP) — o campo `driver` já existe no schema para isso, mas nenhum novo driver é implementado aqui.
- Editor visual de `field_mappings` (drag-and-drop, autodetecção de schema externo) — a edição continua sendo um campo de texto/JSON estruturado simples.

## Decisions

**Uma única permissão nova, `cadastros.pessoas.integracoes.manage`, cobre CRUD de integrações + consulta de histórico + reprocessamento.**
Alternativa considerada: permissões separadas (`...integracoes.view` vs `...integracoes.manage`). Rejeitada porque esta é uma área de configuração técnica (URL, token) destinada só a quem já administra a integração — não existe um caso de uso real de "ver mas não poder mexer" aqui, e adicionar uma permissão sem consumidor concreto é complexidade não pedida.

**`PessoaSyncLog` ganha uma coluna própria `cpf` (cast `encrypted`), preenchida em toda tentativa de sincronização — não só quando bem-sucedida.**
Necessário para o reprocessamento: sem guardar o CPF pesquisado, não há como disparar novamente a mesma consulta. Usar coluna cifrada dedicada, em vez de colocar o CPF em texto plano dentro do `detalhes` (JSON), mantém o mesmo padrão de proteção já usado para PII em `Pessoa`. Logs criados antes desta mudança (nenhum em produção, já que a funcionalidade nunca foi operável) não terão essa coluna preenchida e simplesmente não serão reprocessáveis — não há dado real a migrar.

**Reprocessamento reutiliza o mesmo `OutboxPublisher`/`ImportarPessoaListener::TIPO` já existente, com o `cpf` (decifrado do log) e `integracao_id` do log original.**
Alternativa considerada: criar um pipeline síncrono separado só para reprocessamento. Rejeitada — o objetivo explícito do design original é que toda chamada ao sistema externo passe pelo mesmo adapter isolado e assíncrono (spec: "Integração externa resiliente"); reprocessar não é uma exceção a essa regra.

**`api_token` passa a usar cast `encrypted` no model `PessoaIntegracao`; a coluna já é `TEXT`, então não é necessário alterar o tipo da coluna, só o cast.**
A leitura por `GenericHttpPessoaImportAdapter` (`$this->integracao->api_token`) continua funcionando sem alteração, porque o cast `encrypted` decifra de forma transparente no acesso ao atributo. A API sempre retorna o token mascarado (ex.: exibindo só os últimos 4 caracteres) ou omitido, nunca em texto plano — o mesmo padrão de `cpf_mascarado` em `Pessoa`.

**Rotas novas sob o mesmo grupo de middleware do módulo (`auth:sanctum` + `resolve.tenant` + `module-access:pessoas`), em `/api/pessoas/integracoes` (CRUD) e `/api/pessoas/sync-logs` (listar + reprocessar), controllers dedicados (`IntegracaoController`, `SyncLogController`).**
Mantém a convenção já usada pelo módulo (`PessoaController`, `PromocaoController`, `ImportacaoController`, todos com o trait `AutorizaPermissao`), em vez de sobrecarregar um controller existente com responsabilidades novas.

## Risks / Trade-offs

- [Risco] Migração do cast `encrypted` em `api_token` — se algum ambiente tiver dados reais nessa coluna hoje, a leitura pós-migração falharia (valor não cifrado não decifra). → Mitigação: confirmado por inspeção do código que não existe nenhum caminho de produção (controller, seeder) que hoje cria `PessoaIntegracao` — só testes automatizados o fazem, e a suíte roda em SQLite `:memory:` isolado por execução. Ainda assim, a tarefa de implementação deve confirmar `SELECT count(*) FROM pessoas_integracoes` como 0 no ambiente de destino antes de aplicar a migração.
- [Risco] Reprocessamento manual repetido pelo administrador poderia gerar carga na fila/outbox. → Mitigação: já existe o mesmo controle usado pela importação manual hoje (permissão dedicada + fila assíncrona); nenhum novo limite de taxa é necessário nesta mudança, mas o botão de reprocessar na UI deve desabilitar-se enquanto a ação está em voo, evitando cliques duplicados acidentais.
- [Trade-off] Um `field_mappings` editado como JSON bruto na UI é menos amigável que um construtor visual, mas evita introduzir um componente novo no design system só para este caso de uso único; aceitável dado que quem configura uma integração é um administrador técnico do tenant.
