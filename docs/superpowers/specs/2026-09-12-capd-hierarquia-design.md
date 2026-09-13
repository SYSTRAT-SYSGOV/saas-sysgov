# CAPD — Resolução Hierárquica do Avaliador (Melhoria 1)

Data: 2026-09-12
Módulo: `apps/api/Modules/Capd`, com integração em `apps/api/Modules/OrgChart`
Status: aprovado em brainstorming, pendente de plano de implementação

## 1. Contexto e problema

O módulo CAPD avalia servidores por meio de um `Avaliacao` preenchido pelo
`avaliador_id` (FK para `users`). Hoje esse avaliador é apenas um campo
gravado no registro — não há nada que garanta que a pessoa logada que submete
a avaliação seja de fato o superior imediato do servidor avaliado, e não há
noção de "superior imediato" derivada da estrutura organizacional real.

`capd_servidores` não tem nenhum vínculo com `org_units` (OrgChart); a
"lotação" é hoje um campo de texto livre (`orgao_lotacao`). O único vínculo
hierárquico existente é o autorreferencial `chefia_imediata_id`, que exige
manutenção manual e não é parametrizável por tenant.

Esta melhoria substitui essa lacuna por uma resolução real, subindo a árvore
de `org_units` (já existente e usada para ABAC no OrgChart), parametrizável
por tenant, com tratamento de afastamentos, licenças longas, transferências
no meio do ciclo, e uma fila de exceção para casos que a árvore não resolve
sozinha.

Fora de escopo deste spec (tratados como sub-projetos separados, já
combinados com o usuário): cadastro dinâmico de perguntas (Melhoria 2), motor
de regras 100% configurável (Melhoria 3) e migração do `RhIntegrationService`
para o padrão Outbox (Melhoria 5.1).

## 2. Descobertas do código existente relevantes ao design

- `OrgUnit` (`Modules/OrgChart/Models/OrgUnit.php`) modela a árvore real via
  `parent_id` + `path`/`level` materializados, com `getAncestorPaths()` para
  subir a árvore.
- `OrgUnit::responsibles()` (linha 133-136) já retorna os `User` com papel
  `responsavel` na unidade, via pivot `org_unit_user` — que tem `valid_from`/
  `valid_to` para validade temporal e `is_primary`.
- `capd_servidores.user_id` já referencia `users` (migração
  `2026_09_12_000003_create_capd_servidores_and_integrations_tables.php:15`).
- `capd_avaliacoes.servidor_id` e `.avaliador_id` são FKs para `users`, não
  para `capd_servidores` (`2026_09_12_000001_create_capd_core_tables.php:114-115`).
  Logo, a resolução do avaliador deve produzir um `user_id`, comparável
  diretamente com `avaliador_id`.
- `capd_servidor_afastamentos` já tem `suspende_avaliacao` (boolean) e
  período (`data_inicio`/`data_fim`), mas nenhuma ligação com substituição de
  competência de avaliação.
- `capd_impedimentos` já modela conflito de interesse entre um membro de
  comissão e um servidor-alvo, mas não cobre subordinação direta fora do
  contexto de comissão.
- O padrão de referência para um serviço que manipula a árvore e publica
  eventos é `OrgTreeService` (usa `OutboxPublisher::publish` e `AuditLogger`
  em toda mutação).

## 3. Modelo de dados

### 3.1 Alteração em `capd_servidores`

Nova migração adicionando:
- `org_unit_id` (FK nullable → `org_units`, `nullOnDelete`), índice
  `['tenant_id', 'org_unit_id']`.
- `orgao_lotacao` permanece intacto (histórico/fallback e para tenants que
  ainda não migraram para OrgChart).

Backfill: não é feito automaticamente neste spec (fora de escopo — depende
de dados que só o tenant tem); o campo nasce nullable e a UI de cadastro de
servidor passa a exigir a seleção da unidade para novos registros.

### 3.2 Nova tabela `capd_niveis_hierarquia`

```
tenant_id                 FK tenants
nivel                     unsignedSmallInteger   -- 0 = mais próximo do servidor, cresce subindo
nome                      string(100)            -- ex.: "Departamento", "Secretaria"
cargo_referencia          string(120) nullable   -- metadado informativo, não usado na resolução
regra_substituicao        enum('substituto_legal','superior_hierarquico')
is_topo                   boolean default false
avaliador_topo_user_id    FK users nullable
avaliador_topo_role       string(60) nullable    -- papel RBAC alternativo ao user fixo
ativo                     boolean default true
timestamps
unique(tenant_id, nivel)
```

Regra de negócio: no máximo um registro por tenant pode ter `is_topo = true`.
Validado no `HierarquiaService`/`FormRequest`, não em constraint de banco
(SQLite do phpunit não suporta partial unique index de forma portátil).

### 3.3 Nova tabela `capd_pendencias_hierarquia`

```
tenant_id            FK tenants
servidor_id          FK capd_servidores
ciclo_id             FK capd_ciclos nullable
tipo_pendencia       enum('sem_superior','afastamento_sem_substituto','topo_sem_config')
motivo               text
status               enum('aberta','resolvida') default 'aberta'
avaliador_designado_id  FK users nullable   -- preenchido quando o DRH resolve manualmente
resolvido_por        FK users nullable
resolvido_em         timestamp nullable
timestamps
index(tenant_id, status)
index(tenant_id, servidor_id)
```

### 3.4 Alteração em `capd_avaliacoes` (suporte a avaliação parcial)

Nova migração adicionando:
- `periodo_inicio` (date nullable), `periodo_fim` (date nullable)
- `dias_exercicio` (unsignedSmallInteger nullable)
- `avaliacao_consolidada_id` (FK nullable → `capd_avaliacoes`, `nullOnDelete`)
  — quando preenchido, esta linha é uma avaliação **parcial** que pertence à
  avaliação consolidada apontada; quando nulo, é uma avaliação normal (fluxo
  atual, sem transferência) **ou** a própria linha consolidada.
- `tipo_avaliacao` (enum `'integral'|'parcial'|'consolidada'`, default
  `'integral'`) para diferenciar os três casos sem ambiguidade.

A constraint `unique(tenant_id, ciclo_id, servidor_id)` existente **não pode
ser mantida como está** quando há parciais (duas linhas para o mesmo
`servidor_id`+`ciclo_id`). Ela é substituída por
`unique(tenant_id, ciclo_id, servidor_id, tipo_avaliacao, periodo_inicio)`
— preserva a unicidade para o caso comum (`periodo_inicio` nulo é distinto
por natureza do SQL apenas se o banco tratar NULL como não-igual, o que é o
comportamento padrão tanto em MySQL quanto SQLite) e permite múltiplas
parciais com períodos diferentes.

## 4. `HierarquiaService`

Novo arquivo `Modules/Capd/Services/HierarquiaService.php`, tenant-aware,
seguindo o padrão de `OrgTreeService` (usa `AuditLogger` em toda gravação e
`OutboxPublisher` ao criar pendência, para permitir notificação assíncrona
sem chamada externa síncrona).

### 4.1 `resolverAvaliador(Servidor $servidor, Carbon $data): ResolvedAvaliador`

DTO de retorno `ResolvedAvaliador { ?int $userId, int $nivelUsado, bool $viaTopo, bool $pendente }`.

Algoritmo:
1. Se `$servidor->org_unit_id` é nulo → cria/atualiza pendência
   `sem_superior` e retorna `pendente = true`.
2. Carrega `capd_niveis_hierarquia` ativos do tenant, ordenados por `nivel`
   crescente.
3. Sobe a árvore a partir da unidade do servidor via
   `OrgUnit::getAncestorPaths()`, avançando um nível hierárquico configurado
   por "salto" na árvore ancestral.
4. Em cada unidade ancestral candidata, busca
   `OrgUnit::responsibles()->wherePivot('valid_from', '<=', $data)-> (valid_to nulo ou >= $data)`.
   Se encontrar um responsável:
   - Verifica impedimento: subordinação direta preexistente
     (`chefia_imediata_id` apontando para o próprio candidato) ou registro em
     `capd_impedimentos` para aquele par. Se impedido, continua subindo.
   - Caso contrário, retorna esse `user_id`.
5. Se a subida esgotar os níveis parametrizados sem achar `is_topo`, usa o
   registro `is_topo = true`: retorna `avaliador_topo_user_id` (ou resolve
   `avaliador_topo_role` via Gate/roles, primeiro usuário ativo com aquele
   papel no tenant). Se nenhum estiver configurado, cria pendência
   `topo_sem_config`.
6. Se em nenhum passo houver resolução, cria pendência `sem_superior`.

### 4.2 `resolverSubstituicao(ServidorAfastamento $afastamento): void`

Chamado ao criar/atualizar um afastamento vigente durante um ciclo aberto:
- Calcula duração (`data_fim - data_inicio`, ou até hoje se em aberto).
- Se duração > 180 dias (ou `data_fim` ainda nula e já ultrapassou 180 dias
  desde `data_inicio`): marca a(s) `Avaliacao` do servidor no ciclo corrente
  como `situacao = 'suspensa_licenca'` (novo enum de status em `Avaliacao`,
  reaproveitando o campo `status` se existir, ou criando-o — a verificar no
  plano com base no schema real de `Avaliacao`) e agenda para o próximo
  ciclo (não cria automaticamente o registro do próximo ciclo — apenas marca
  para triagem, já que a criação de ciclos é fluxo manual do DRH).
- Caso contrário (afastamento curto), aplica `regra_substituicao` do nível
  do avaliador **do afastado** (não do servidor avaliado): se
  `substituto_legal`, busca o substituto formalmente registrado (campo a
  definir no plano — provavelmente `ServidorAfastamento.substituto_id`, novo
  campo); se `superior_hierarquico`, desloca a competência para o próximo
  nível acima na árvore.

### 4.3 `dividirPorTransferencia(Servidor $servidor, CicloAvaliacao $ciclo): void`

- Detecta mudança de `org_unit_id` dentro do período do ciclo. Requer
  histórico de lotação: nova tabela leve `capd_servidor_unit_history`
  (`tenant_id, servidor_id, org_unit_id, valido_de, valido_ate`), populada
  automaticamente sempre que `Servidor.org_unit_id` é alterado (observer no
  model).
- Se houver mais de um período de lotação dentro da janela do ciclo, cria
  duas (ou mais) `Avaliacao` com `tipo_avaliacao = 'parcial'`,
  `periodo_inicio`/`periodo_fim`/`dias_exercicio` preenchidos, cada uma com
  `avaliador_id` resolvido via `resolverAvaliador()` usando a data do meio do
  respectivo período, e uma `Avaliacao` "guarda-chuva"
  (`tipo_avaliacao = 'consolidada'`) sem nota própria.
- Quando todas as parciais de uma consolidada estiverem `homologada = true`,
  um listener (`AvaliacaoHomologada` já existe como evento) recalcula
  `nota_final` da consolidada como média ponderada por `dias_exercicio` e a
  homologa também.

### 4.4 Impedimento por hierarquia

`resolverAvaliador` já filtra subordinação direta e impedimentos declarados
(passo 4). Adicionalmente, `Modules/Capd/Services/ImpedimentoService`
(pode já existir uma classe equivalente; a verificar no plano) ganha um
método `existeImpedimentoHierarquico(int $candidatoUserId, int $servidorId): bool`
reutilizado tanto pela resolução quanto pela policy.

## 5. `AvaliacaoPolicy`

O método responsável por autorizar a submissão/edição de uma `Avaliacao`
(hoje compara `avaliador_id === auth()->id()` direto do registro) passa a:

```php
$resolvido = $hierarquiaService->resolverAvaliador($servidorCapd, now());
return !$resolvido->pendente && $resolvido->userId === auth()->id();
```

Isso fecha o requisito de nunca confiar apenas no campo gravado — a policy
recalcula a resolução no momento da ação. Casos `pendente = true` são
negados (ninguém pode agir enquanto o DRH não resolve a pendência).

## 6. Testes novos (PHPUnit/Feature)

1. Resolução sobe a árvore corretamente até achar um responsável válido.
2. Resolução híbrida: nível configurado + responsável real da OrgUnit
   correspondente.
3. Bloqueio por impedimento/subordinação direta — pula para o próximo nível.
4. Substituição por afastamento curto (`regra_substituicao` aplicada).
5. Suspensão de avaliação por licença > 180 dias, com postergação de ciclo.
6. Split proporcional por transferência de unidade, com média ponderada por
   dias na consolidação.
7. Fila de pendência criada quando não há superior resolvível.
8. Avaliador do topo da hierarquia resolvido via configuração de tenant.
9. `AvaliacaoPolicy` nega submissão quando o usuário logado não é o
   resolvido pela árvore, mesmo que `avaliador_id` do registro esteja
   preenchido com o próprio usuário (tentativa de bypass).
10. Isolamento de tenant para `capd_niveis_hierarquia`,
    `capd_pendencias_hierarquia` e `capd_servidor_unit_history`.

## 7. Frontend (`apps/web-client/src/modules/capd`)

Duas telas novas, compostas exclusivamente com primitivos de `@sysgov/ui`
(Table, Dialog, Select, Switch, Badge, Form), atrás de gate de permissão
(admin_tenant / DRH):

1. **Configuração de hierarquia** — CRUD de `capd_niveis_hierarquia`
   (nível, nome, regra de substituição, configuração do topo).
2. **Fila de pendências (DRH)** — lista de `capd_pendencias_hierarquia`
   abertas, com ação de atribuir manualmente um avaliador
   (`avaliador_designado_id`) e marcar como resolvida.

Ambas seguem a paleta GOV.BR do web-client e usam `font-mono tabular-nums`
para qualquer dado numérico/técnico (datas, IDs de matrícula) conforme
`DESIGN_SYSTEM.md`.

## 8. Atualização do SDK (`packages/sdk/src/modules/capd`)

Novos tipos: `NivelHierarquia`, `PendenciaHierarquia`, `ResolvedAvaliador`,
e extensão do tipo `Avaliacao` existente com `periodoInicio`, `periodoFim`,
`diasExercicio`, `tipoAvaliacao`, `avaliacaoConsolidadaId`.

## 9. Riscos e premissas declaradas

- **Premissa**: o campo de status atual de `Avaliacao` (a verificar o nome
  exato da coluna no plano de implementação) comporta um novo valor
  `suspensa_licenca` sem quebrar o guard de imutabilidade pós-homologação já
  existente em `Avaliacao::booted()`.
- **Premissa**: `ServidorAfastamento` ganha um campo `substituto_id` (FK
  nullable → `capd_servidores`) para suportar `regra_substituicao =
  substituto_legal`; não existe hoje, será criado nesta melhoria.
- **Risco**: alterar a constraint única de `capd_avaliacoes` é uma migração
  sensível em produção (tabela já populada em outros tenants). O plano de
  implementação deve incluir uma migração reversível e idempotente.
- **Fora de escopo**: backfill automático de `capd_servidores.org_unit_id`
  para tenants já em produção — cada tenant faz essa associação manualmente
  via a tela de cadastro de servidor (não coberta por este spec, assume-se
  tela já existente é apenas estendida com o novo campo).
