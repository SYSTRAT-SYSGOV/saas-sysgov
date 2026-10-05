# Design

## Context

Ver `proposal.md` — Why. Estado atual relevante (lido diretamente do código em
`apps/api/Modules/Pessoas`):

- `pessoas` tem `cpf`/`cpf_hash` (cast `encrypted`), unique `(tenant_id, cpf_hash)`, accessor
  `cpf_mascarado` via `$appends`. `Support\Documento` só valida CPF.
- `PessoaVinculo::TIPOS` é uma constante `array` de strings no model (não existe uma classe/enum
  `TipoVinculoPessoa` no backend — esse nome só existe hoje no SDK TypeScript como union type).
- `PromocaoUsuarioService` e `PessoaPolicy::promote` não têm nenhuma restrição por tipo de pessoa.
- `ImportacaoPessoaService` e `GenericHttpPessoaImportAdapter` operam exclusivamente sobre `cpf`.
- `PessoaPickerOption` e o componente `PessoaPicker` vivem em `packages/ui/src/components/` (design
  system compartilhado), com `cpf_mascarado` como campo obrigatório — e são consumidos hoje por
  `apps/web-client/src/modules/cemiterios/*` (via `usePessoaPicker`), não só por `modules/pessoas`.
  Qualquer mudança no formato de `PessoaPickerOption` tem blast radius além do módulo Pessoas.
- O banco de produção é MySQL; os testes rodam em SQLite `:memory:` (`phpunit.xml`). O projeto está
  em Laravel 13, que suporta `renameColumn()` nativamente (sem `doctrine/dbal`, que não está no
  `composer.json`) em ambos os drivers.

## Goals / Non-Goals

**Goals**: ver `proposal.md` — What Changes.

**Non-Goals** (nível de design, além do já listado em "Fora de Escopo" na proposta):
- Não alterar a interface `PessoaImportAdapterInterface::buscarPorCpf` nem o adapter HTTP genérico
  para suportar CNPJ nesta mudança — nenhum sistema de prefeitura integrado hoje envia pessoa
  jurídica; a criação de jurídica ocorre via API/UI ou importação em lote com `tipo` explícito.
- Não introduzir uma constraint de banco para "ao menos um representante legal" — ver Open Questions.
- Não reescrever `PessoaPicker.tsx` — a generalização visa reaproveitar o campo `nome` e o alias
  `cpf_mascarado` já existentes (ver Decisão 6).

## Decisions

### 1. Coluna `tipo` com backfill automático via DEFAULT, não via UPDATE em lote
Adicionar `tipo` como `string`/enum `NOT NULL DEFAULT 'fisica'` faz o próprio `ALTER TABLE` (MySQL e
SQLite) preencher o valor em todas as linhas existentes no momento da migração — não é necessário um
`UPDATE` manual. **Alternativa descartada**: coluna nullable seguida de `UPDATE ... SET tipo='fisica'
WHERE tipo IS NULL` em uma segunda etapa — desnecessariamente mais complexo e com uma janela onde a
coluna é nullable sem necessidade.

### 2. A migração de unicidade é estruturalmente livre de duplicidade latente
A unicidade atual é `(tenant_id, cpf_hash)`. Como `tipo` nasce com o mesmo valor (`'fisica'`) para
*todas* as linhas existentes e `documento_hash` é a mesma coluna que já era `cpf_hash` (só
renomeada), a nova tupla `(tenant_id, tipo, documento_hash)` tem exatamente a mesma cardinalidade que
a antiga para os dados pré-existentes — não há cenário em que o backfill introduza duplicidade. A
migration ainda SHALL rodar uma checagem defensiva (`COUNT(*) GROUP BY tenant_id, tipo, documento_hash
HAVING COUNT(*) > 1`) e abortar com erro claro antes de criar o índice, cobrindo o caso de dados
corrompidos ou uma migração fora de ordem — mas o caminho feliz não depende de limpeza de dados.

### 3. Rename de coluna via `renameColumn()`, não coluna nova + coluna antiga
`cpf`→`documento` e `cpf_hash`→`documento_hash` usam `Schema::table()->renameColumn()`, suportado
nativamente pelo Laravel 13 tanto em MySQL quanto em SQLite (sem `doctrine/dbal`). **Alternativa
descartada**: criar colunas novas e migrar dados com um comando Artisan — mais trabalho e uma janela
de inconsistência sem necessidade, já que o rename nativo preserva os dados atomicamente.

### 4. Campo de entrada na API: mantém `cpf` para física, adiciona `cnpj` para jurídica
Para não quebrar nenhum consumidor existente, `StorePessoaRequest`/`UpdatePessoaRequest` continuam
aceitando a chave `cpf` quando `tipo=fisica` (comportamento inalterado) e passam a aceitar a chave
`cnpj` quando `tipo=juridica`; ambas mapeiam internamente para a coluna `documento` antes de persistir.
Documentado aqui porque é uma decisão de contrato de API, não apenas de implementação interna.
**Alternativa descartada**: um campo genérico `documento` para os dois tipos — mais "correto" no
papel, mas forçaria todo consumidor de física a migrar o nome do campo sem necessidade.

### 5. Máscara e validação por tipo inferidos por quantidade de dígitos
`Support\Documento::mascarar()` decide o formato (CPF `***.456.789-**` vs. CNPJ
`00.000.000/0000-00`) pela contagem de dígitos (11 vs. 14) após sanitização — CPF e CNPJ nunca têm o
mesmo tamanho, então não é necessário passar `tipo` como parâmetro só para mascarar. `valido()` passa
a receber o `tipo` explicitamente (`Documento::valido(string $valor, string $tipo)`), pois validação
é sempre acionada a partir de um contexto que já sabe o tipo (Form Request), e manter o algoritmo
correto por tipo é mais importante do que inferir por tamanho nesse caso (uma entrada malformada de
10 dígitos não deve "quase passar" como CPF por engano de tamanho).

### 6. `PessoaPickerOption`/`PessoaPicker` não mudam de forma — o backend assume a diferença
Em vez de redesenhar o componente compartilhado em `@sysgov/ui` para aceitar `razao_social` e exibir
rótulos dinâmicos, o endpoint de busca compacta (`compact=true` em `PessoaResource`) passa a devolver
`nome` já resolvido para `razao_social` quando `tipo=juridica` (a pessoa física continua devolvendo
`nome` como está hoje), e `cpf_mascarado` continua sempre preenchido com o documento mascarado correto
(CPF ou CNPJ). Isso cobre o cenário de busca/seleção descrito na proposta sem tocar em
`packages/ui/src/components/PessoaPicker.tsx` nem quebrar nenhum dos consumidores atuais em
Cemitérios. Como melhoria incremental **não-obrigatória** para esta mudança, `PessoaPickerOption` pode
ganhar um campo opcional `tipo?: 'fisica' | 'juridica'` para permitir um badge visual futuro — isso é
aditivo e não bloqueia a v1. **Alternativa descartada**: generalizar `cpf_mascarado` para
`documento_mascarado` no tipo e em todos os consumidores — maior superfície de mudança no design
system para o mesmo resultado observável.

### 7. Quadro societário: unicidade de sócio ativo validada na aplicação, não por índice de banco
`pessoa_socios` não terá um índice único de banco em `(pessoa_id, socio_pessoa_id)`, porque um sócio
pode legitimamente sair e reingressar no quadro societário mais tarde (nova linha com `data_entrada`
posterior à `data_saida` anterior). A unicidade de vínculo **ativo** (sem `data_saida`) é garantida no
`SocioService`, na mesma transação de escrita — mesmo padrão já usado para contato principal único em
`PessoaService::adicionarContato`. **Alternativa descartada**: índice único parcial — não é portável
entre MySQL e SQLite da forma que o projeto precisa.

### 8. Novo `SocioService` e métodos em `PessoaController`, seguindo o padrão de sub-entidades
Quadro societário segue exatamente o padrão arquitetural já usado para vínculos/documentos/
endereços/contatos: um Service dedicado (`SocioService`: `adicionar`, `atualizar`, `encerrar`),
Form Requests dedicados (`StoreSocioRequest`, `UpdateSocioRequest`, `EncerrarSocioRequest`), rotas
`POST/PUT /{pessoa}/socios[/{socio}]` e `POST /{pessoa}/socios/{socio}/encerrar` em
`PessoaController`, e `socios` carregado via `whenLoaded` em `PessoaResource` (mesmo mecanismo de
`vinculos`/`documentos`). Não há endpoint de listagem separado, assim como não há para as demais
sub-entidades — a lista vem embutida no `show()` da pessoa jurídica.

### 9. Bloqueio de promoção em duas camadas (Policy + Service)
`PessoaPolicy::promote()` retorna `false` para `tipo=juridica` (bloqueio na borda HTTP, HTTP 403) e
`PromocaoUsuarioService::promover()` lança `RegraNegocioException` se `$pessoa->tipo === 'juridica'`
(defesa em profundidade caso o service seja chamado fora do fluxo HTTP, ex.: de um comando Artisan ou
de um job). Mesmo padrão de dupla guarda já usado em `delete()` para vínculos ativos.

## Risks / Trade-offs

- **[Risco] Rename de coluna em produção MySQL com tabela grande pode causar lock/baixa performance.**
  → Mitigação: `pessoas` ainda é uma tabela nova (criada em 2026-09-29) e de porte pequeno por tenant;
  mesmo assim, a migração SHALL rodar em janela de manutenção coordenada, não em deploy automático
  silencioso, e SHALL ser testada antes contra um dump realista do ambiente de staging.
- **[Risco] Consumidores diretos de `PessoaExportService::exportCsv()`/`exportJson()` que leem a
  coluna "CPF" por posição fixa quebram ao ver uma coluna "Tipo"/"Documento" nova.** → Mitigação:
  cabeçalho CSV SHALL manter a ordem de colunas existente e apenas acrescentar colunas novas ao final
  (tipo, razão social, etc.), nunca reordenar ou renomear colunas já publicadas.
- **[Trade-off] `SocioService` sem índice único de banco para sócio ativo abre uma janela de corrida
  entre duas requisições concorrentes adicionando o mesmo sócio.** → Mitigação: a checagem e a
  inserção ocorrem na mesma transação (`DB::transaction`), mesmo padrão de baixo risco já aceito para
  contato principal único; risco residual aceitável pelo volume de escrita esperado (cadastro
  administrativo, não transacional de alto volume).

## Migration Plan

1. Migration: renomear `cpf`→`documento`, `cpf_hash`→`documento_hash` (dados preservados pelo rename).
2. Migration: adicionar `tipo` (`NOT NULL DEFAULT 'fisica'`) — backfill automático, ver Decisão 1.
3. Migration: adicionar colunas de jurídica (`razao_social`, `nome_fantasia`, `inscricao_estadual`,
   `inscricao_municipal`, `porte`, `natureza_juridica`, `responsavel_id` FK nullable → `pessoas.id`).
4. Migration: checagem defensiva de duplicidade (ver Decisão 2) + drop do unique antigo
   `(tenant_id, cpf_hash)` + create do novo unique `(tenant_id, tipo, documento_hash)`.
5. Migration: criar tabela `pessoa_socios`.
6. Código: `Support\Documento` (CNPJ), `Model Pessoa` (casts, accessors, relação `socios`), Form
   Requests condicionais, `PessoaResource` (documento mascarado dinâmico), `PessoaVinculo::TIPOS`
   (novos valores), `PromocaoUsuarioService`/`PessoaPolicy`, `PessoaService::listar` (filtro `tipo`,
   busca por CNPJ/razão social), `ImportacaoPessoaService`, `PessoaExportService`, novo
   `Models\PessoaSocio` + `Services\SocioService` + Form Requests + rotas + `PessoaController`.
7. SDK (`packages/sdk/src/modules/pessoas`): `types.ts` e `client.ts`.
8. Frontend cliente: `NovaPessoaWizard` (passo de tipo), `PessoaDetailView` (seção de quadro
   societário para jurídica), `api.ts`.
9. Reversão: cada migration tem `down()` simétrico (drop de colunas/tabela, rename reverso,
   recriação do índice antigo); como o rename preserva dados, o rollback de uma migration isolada não
   perde informação, desde que executado antes da migration seguinte ter sido aplicada em produção.

## Open Questions

- Validação online de CNPJ (Receita Federal/API pública) é desejada para uma versão futura? Caso sim,
  SHALL seguir o padrão Outbox + cache já estabelecido no projeto (nunca chamada síncrona em
  controller) — registrado como fora de escopo da v1.
- A regra "pelo menos um representante legal para jurídica ativa" é obrigatória (bloqueante) ou apenas
  uma recomendação exibida na UI? Esta mudança não implementa nenhuma constraint de banco ou
  validação de Form Request para essa regra até a resposta ser confirmada.
- Há exigência legal municipal/estadual específica sobre composição do quadro societário que deva ser
  parametrizável por tenant (ex.: percentual mínimo, papéis obrigatórios)? Nenhuma parametrização por
  tenant é implementada nesta mudança além do já especificado.
