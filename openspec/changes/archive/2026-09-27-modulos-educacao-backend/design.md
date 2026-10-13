# Design

## Context

- Motivação e escopo: ver `proposal.md`. Requisitos: `specs/{escola,pedagogico,formatura,passeio}/spec.md`.
- Os frontends dos três módulos (`apps/web-client/src/modules/{pedagogico,formatura,passeio}`) guardam tudo em
  `localStorage`, com identificadores numéricos gerados no navegador e `tenant_id` textual (`'tenant-01'`).
- `apps/api/Modules/Formatura` e `Passeio` contêm apenas `module.json`; `Escola` e `Pedagogico` não existem.
- Referência de implementação na base: módulo `Cursos` (tabelas com prefixo do módulo, `Enums/`, policies com o
  trait de permissão por tenant, `*RbacSeeder` com perfis-modelo clonados pelo `ModuleRoleProvisioner`, testes de
  isolamento e de estrutura).
- O ambiente roda no Docker único (`docker-compose.yml`), com MySQL 8.4 persistente; a API só executa lá
  (PHP 8.4). O preparo da aplicação no boot fica em `apps/api/docker-entrypoint.sh`.

## Goals / Non-Goals

**Goals:**
- Backend completo e testado dos quatro módulos, no padrão do Coding Standard (checklist da seção 7).
- Um único cadastro de alunos/turmas por tenant, consumido pelos três módulos de negócio.
- Contratos de API estáveis o bastante para a Fase 2 (frontend) consumir sem retrabalho.

**Non-Goals:**
- Ligar os frontends às APIs (Fase 2) e migrar dados do `localStorage` ou do sistema PHP antigo.
- Portal de responsáveis/alunos, notificações por e-mail/WhatsApp, geração de PDF no servidor.
- Reescrever os componentes de UI para `@sysgov/ui` (tratado na Fase 2).

## Decisions

### D1 — Módulo base `Escola` com `requires`
`Pedagogico`, `Formatura` e `Passeio` declaram `"requires": ["Admin", "Escola"]` e referenciam as tabelas
`escola_*` por chave estrangeira. *Alternativa:* cadastro próprio por módulo — rejeitada (mesmo aluno em três
lugares, divergência já observada entre os frontends). *Custo:* os três passam a depender da habilitação do Escola.

### D2 — Geração pelos comandos oficiais
`Escola` e `Pedagogico` são criados com `php artisan make:module`. Para `Formatura` e `Passeio`, os diretórios
atuais (só `module.json`) são removidos e regenerados pelo mesmo comando, reaplicando título, ícone e menu dos
`module.json` antigos. Os artefatos de exemplo gerados (`{Nome}Item`, `{alias}_items`) são substituídos pelas
entidades reais.

### D3 — Modelo de dados (prefixo do módulo, `tenant_id` primeiro)
Todas as tabelas: `id`, `tenant_id` (FK `tenants`, `cascadeOnDelete`), `timestamps`, índices compostos iniciados
por `tenant_id`; entidades de negócio com `softDeletes()`.

| Módulo | Tabelas |
|---|---|
| Escola | `escola_unidades`, `escola_turnos`, `escola_turmas`, `escola_alunos`, `escola_aluno_contatos`, `escola_materias`, `escola_turma_materias` (com `professor_user_id` → `users`), `escola_trimestres`, `escola_categorias_ocorrencia` |
| Pedagogico | `pedagogico_notas`, `pedagogico_ocorrencias`, `pedagogico_pre_conselhos`, `pedagogico_pre_conselho_alunos`, `pedagogico_cronogramas`, `pedagogico_atas`, `pedagogico_frequencias` |
| Formatura | `formatura_configuracoes`, `formatura_participacoes`, `formatura_pagamentos` |
| Passeio | `passeio_passeios`, `passeio_inscricoes`, `passeio_veiculos`, `passeio_assentos` |

Estados e listas fechadas (situação do aluno, severidade, estados da ata, situação do passeio, tipo de cálculo,
formas de pagamento) são `Enums` PHP em `Modules/{Nome}/Enums`, gravados como `string`.

### D4 — Unicidade com exclusão lógica
Um índice único simples impediria recriar um registro excluído logicamente (o antigo continua na tabela), e
incluir `deleted_at` no índice não resolve, porque o MySQL aceita vários `NULL`. Por isso:
- Tabelas **sem** soft delete (notas, frequências, participações, assentos, vínculos turma × matéria, inscrições
  por passeio × aluno): unicidade garantida por índice único no banco.
- Tabelas **com** soft delete (turmas, matérias, categorias, trimestres, CGM do aluno): unicidade validada no
  Form Request com `Rule::unique(...)->where('tenant_id', …)->whereNull('deleted_at')` e reforçada no Service
  dentro da transação com `lockForUpdate`.

### D5 — Comparação de nomes sem acento e maiúsculas
Matérias e categorias guardam `nome_normalizado` (minúsculas, sem acentos, espaços colapsados), preenchido no
model; a unicidade (D4) usa essa coluna. *Alternativa:* collation `utf8mb4_0900_ai_ci` na coluna — rejeitada por
depender do servidor e não cobrir o SQLite dos testes.

### D6 — Professor = usuário do tenant
O professor é um `User` vinculado ao tenant (`tenant_user` ativo), sem tabela própria. O escopo do professor
(spec `pedagogico`) é aplicado nas Policies (autorização do objeto) e nos Services de listagem (filtro por
`escola_turma_materias.professor_user_id`). A antiga tela "Corpo Docente" passa a ser uma visão desses vínculos.

### D7 — Dinheiro em centavos
Colunas `*_centavos` `unsignedBigInteger`; entrada validada como `integer`; cálculos com `App\Support\Money`.
O cálculo do valor devido da Formatura fica numa classe de domínio pura (`CalculadoraValorDevido`), testada
em unidade, porque o frontend atual tem regras divergentes (valor fixo no código e base de 1 ou 2 pessoas).

### D8 — Arquivos (logo, foto do aluno, anexos de ocorrência)
Disco `local` (privado), nome aleatório (`Str::uuid()`), MIME verificado pelo conteúdo (`mimetypes:`), servidos
por rota autenticada do módulo que aplica a Policy do dono do arquivo. Nada em `public/`.

### D9 — Importações CSV síncronas
Leitura em streaming (`SplFileObject`), detecção de separador na 1ª linha, BOM removido, limite de 2 MB e 5.000
linhas. Cada linha é validada isoladamente; as válidas são gravadas em uma transação e as inválidas voltam na
resposta com número da linha e motivo. *Alternativa:* fila assíncrona — desnecessária para o volume de uma escola.

### D10 — Dados padrão por tenant (turnos e categorias)
Criados de forma idempotente pelo Service na primeira consulta do tenant (`garantirPadroes`), só quando o tenant
nunca teve registros (inclusive excluídos). *Alternativa:* seeder no provisionamento — rejeitada porque o
módulo pode ser habilitado depois do tenant existir e não há evento de "módulo habilitado" para dados de negócio.

### D11 — Perfis e permissões
Cada módulo tem `Database/Seeders/{Nome}RbacSeeder` no padrão do `CursosRbacSeeder` (perfis-modelo no tenant
`systrat`, clonados pelo `ModuleRoleProvisioner`). As chamadas são adicionadas ao `apps/api/docker-entrypoint.sh`,
junto da do Cursos. Permissões no formato `<modulo>.<recurso>.<acao>` e declaradas no `module.json`.

### D12 — Rotas, controllers e respostas
`Routes/api.php` de cada módulo sob `['auth:sanctum', 'tenant', 'bindings', 'module-access:{alias}']`, prefixo
`api/{alias}`, route model binding implícito (model `TenantAware` ⇒ registro de outro tenant vira 404).
Controllers `final`, só mediação HTTP, `JsonResponse` com `Http/Resources`; regras nos Services, sob
`DB::transaction()` com `AuditLogger::record()` e `OutboxPublisher::publish()`. Eventos no formato
`<modulo>.<recurso>.<acao-no-particípio>` (ex.: `escola.aluno.atualizado`). Erros de negócio viram 422 com
mensagem em pt-BR por um trait próprio de cada módulo, no mesmo formato do `RespondeErroDeNegocio` do Cursos
(sem importar código de outro módulo).

### D13 — Frontend nesta fase
Nenhum componente muda. Após criar os módulos, regenerar `moduleRegistry.generated.ts`
(`npm run generate:registry`) e conferir que as rotas atuais do web-client continuam resolvendo os mesmos
componentes.

## Risks / Trade-offs

- [Escopo grande (~23 tabelas, ~60 rotas)] → implementar e testar módulo a módulo, na ordem Escola →
  Pedagógico → Formatura → Passeio, com commit por módulo.
- [Contratos divergentes dos tipos atuais do frontend (ids numéricos x `tenant_id` textual, valores em reais x
  centavos)] → Resources documentados; a Fase 2 adapta os `types/*.ts`.
- [Unicidade com soft delete validada na aplicação (D4)] → `lockForUpdate` na transação e testes de concorrência
  simples para CGM e turma.
- [Dependência do Escola] → `module:register` já trata `requires`; teste de estrutura garante que cada módulo
  declara a dependência.
- [Regra de valor devido da Formatura diferente do frontend atual] → regra explícita na spec; a Fase 2 remove o
  cálculo do navegador.

## Migration Plan

1. Migrations aditivas; nenhum dado existente é alterado. O boot do Docker aplica tudo automaticamente.
2. Rollback: `php artisan migrate:rollback` das migrations dos quatro módulos e remoção dos diretórios; os demais
   módulos não são afetados.
3. Os frontends seguem no `localStorage` até a Fase 2; não há janela de indisponibilidade.

## Open Questions

- Limite de tamanho de foto do aluno (assumido 2 MB, igual ao logo) — ajustável sem mudar a spec de forma
  relevante.
