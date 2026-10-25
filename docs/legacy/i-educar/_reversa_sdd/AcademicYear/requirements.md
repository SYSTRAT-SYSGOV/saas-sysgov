# AcademicYear (i-Educar legado)

> Unit do plano de extração do Reversa (`granularity = module`). Ano letivo por escola: etapas (módulos), statuses de andamento, criação em lote com cópia do ano anterior, abertura/fechamento e bloqueio de janela por instituição.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Visão Geral

O ciclo do ano letivo é governado por `pmieducar.escola_ano_letivo` (uma linha por escola/ano com `andamento` 0/1/2 e flags de cópia), por `pmieducar.ano_letivo_modulo` (as etapas com datas e dias letivos) e por `anos_letivos::smallint[]` — coluna array do PostgreSQL presente em `escola_curso`, `escola_serie`, `escola_serie_disciplina` e `componente_curricular_ano_escolar`. A lógica central vive no `AcademicYearService` (68 métodos, 1443 linhas) usado por uma tela procedural antiga (processo 561) e por um controller de lote para admin (processo `ACADEMIC_YEAR_IMPORT = 9999120`). 🟢 `app/Services/AcademicYearService.php:31-1442`, `app/Http/Controllers/AcademicYearBatchController.php:15-274`

Há também um travamento separado e independente: `pmieducar.bloqueio_ano_letivo` (uma janela de datas permitidas por instituição/ano, PK composta), gerenciado por telas próprias (processo 21251). 🟢 `app/Models/LegacySchoolYearLock.php:19`, `ieducar/intranet/educar_bloqueio_ano_letivo_cad.php`

> ⚠️ Contra o bastão: o bastão chama o travamento de "etapa para o diário (`escola_ano_letivo_travamento`)". A tabela real é `bloqueio_ano_letivo` por instituição/ano e **não há nenhum consumidor que a aplique no lançamento de notas/faltas** neste snapshot — o corte real do lançamento usa `ReleasePeriodService` + privilégio `Process::POST_OUT_PERIOD` (unit `DiarioClasse`, por referência). 🔴

---

## Responsabilidades

- Validar datas das etapas contra anos letivos **diferentes** da mesma escola (data dentro do período de outro ano = erro). 🟢 `AcademicYearService.php:49-62`, `:697-709`
- Validar redução do número de etapas: bloca se existir nota/falta nas etapas removidas (local ou no diário online externo via `iDiarioService`). 🟢 `:82-102`, `:719-768`
- Conferir o número de etapas informado com `modulo.num_etapas`. 🟢 `:121-132`
- Criar ano letivo por escola com cópia: turmas do ano anterior, disciplinas da turma, etapas por turma, turmas multisseriadas, professores (com vínculos e disciplinas), alocações de servidores/professores; datas copiadas em branco e datas de etapas por turma ajustadas pelo ano (com correção de bissexto 29/02→28/02). 🟢 `:138-158`, `:300-419`, `:611-687`
- Extender `anos_letivos` (arrays do Postgres) de cursos, séries, disciplinas e componentes para o novo ano a partir do ano anterior mais recente, e replicar vínculos série↔regra de avaliação (`LegacyEvaluationRuleGradeYear`). 🟢 `:178-228`, `:770-806`
- Criar/atualizar/remover o registro do ano letivo e recolocar as etapas (edição apaga todas e recria via `insert`). 🟢 `:259-298`, `:821-898`
- Processar em lote: `createAcademicYearBatch`, `openAcademicYearBatch` e `closeAcademicYearBatch` com validação prévia de todas as escolas e resposta detalhada (processadas/ignoradas/erros). 🟢 `:234-253`, `:1244-1271`
- Aplicar status: `andamento` 0 (não iniciado), 1 (em andamento), 2 (finalizado); abertura exige não-iniciado/andamento=0... e fechamento exige em andamento + nenhuma matrícula ativa em andamento (exceto atividades complementares). 🟢 `:1367-1388`, `:1426-1441`
- Tela de bloqueio: cadastrar/editar/excluir janela de datas permitidas por instituição/ano (campos "Data inicial permitida" e "Data final permitida"). 🟢 `educar_bloqueio_ano_letivo_cad.php:24-151`

---

## Regras de Negócio

### Statuses e transições do `andamento`
- Abertura (`ACTION_OPEN`): é barrado se `andamento` já é 1 (em andamento) ou 2 (finalizado). Fechamento (`ACTION_CLOSE`): é barrado se já finalizado ou se ainda não iniciado (0). 🟢 `:1369-1385`
- Fechamento exige zero matrículas com `aprovado = 3` (em andamento), `ativo = 1`, `ultima_matricula = 1`, exceto cursos de `tipo_ensino.atividade_complementar` verdadeiro (bastão fala "qualquer aluno sem situação final"; a exceção de atividade complementar não está no bastão). 🟢 `:1426-1441`
- Remover/desativar o ano letivo define `andamento = 2`, `ativo = 0` e apaga as etapas (não registra data de exclusão além de `ref_usuario_cad`; a coluna `data_exclusao` não é preenchida aqui). 🟢 `:281-298`

### Cópia do ano anterior
- A cópia de turmas é idempotente (`schoolClassExists` por nome) e a de professores/alocações é por conjunto de chaves atual; a alocação copiada nasce com `data_admissao/data_saida` nulas e o vínculo de professor com `data_inicial/data_fim` nulas. 🟢 `:329-609`
- Reparar datas de etapas por turma com substituição textual do ano na string (`str_replace`) — correção manual de 29/02 para anos não bissextos, mesma regra exibida na tela legada. 🟢 `:664-687`, `educar_ano_letivo_modulo_cad.php:142-158`
- Extensão do array `anos_letivos`: todas as linhas que contêm o ano anterior e não contêm o novo recebem `array_append`. Para componentes curriculares, via `EXISTS` cruzando `escola_serie_disciplina`. 🟢 `:189-225`

### Datas das etapas
- Conflito de datas só contra **outros anos** (`ref_ano != ano`); não há conflito intra-envio entre etapas do mesmo formulário. 🟡 `:697-709`
- Etapas definidas em `d/m/Y` e gravadas com `dataToBanco`; por etapa `sequencial`, tipo (`ref_cod_modulo`) e dias letivos opcionais. 🟢 `:855-891`

### Lote (processo 9999120)
- Admin pode abrir `/ano-letivo-em-lote`; validação prévia valida datas, módulos e situação de cada escola; em `create`, se alguma escola falhar na validação, **nada é gravado**; em execução, todas as escolas processadas com `DB::beginTransaction/commit` único e controle de falha no meio implícito (sem catch dentro do loop). 🟢 `AcademicYearBatchController.php:24-128`, `AcademicYearService.php:1097-1129`
- Não-admin: copiar turmas é fixo true; checkboxes de alocação/vínculo por request; e alocações de professores dependem de cópia de turmas na tela (JS). 🟢 `AcademicYearBatchController.php:155-174`, `educar_ano_letivo_modulo_cad.php:251-361`

### Dados legados e melhoria
- `turmas_por_ano`, `copia_turmas`, `copia_dados_professor`, `copia_dados_demais_servidores` persistidos na tabela do ano letivo. 🟢 `LegacySchoolAcademicYear.php:37-49`
- Telas: `educar_ano_letivo_modulo_cad.php` (processo 561, nível 7) chama o serviço; bloqueio 21251 com telas cad/det/lst; Resource API JSON: `ResourceSchoolAcademicYearController` (somente index). 🟢 `ResourceSchoolAcademicYearController.php:10-16`

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| AY-01 | O sistema deve validar datas de etapas sem sobreposição com outros anos letivos da escola. | Must | 🟢 `validateAcademicYearDates`. |
| AY-02 | O sistema deve impedir redução de etapas com notas/faltas lançadas (na base local e no diário online externo). | Must | 🟢 `validateAcademicYearModules`. |
| AY-03 | O sistema deve criar etapas do ano letivo a partir de módulo (tipo) e período por etapa (data início/fim/dias letivos). | Must | 🟢 `createAcademicYearStages`. |
| AY-04 | O sistema deve copiar do ano anterior: turmas, disciplinas, etapas por turma, multisseriadas, professores (vínculo+disciplinas) e alocações, opt-in por bandeira. | Must | 🟢 `performDataCopy`. |
| AY-05 | O sistema deve estender `anos_letivos` nas tabelas associadas e replicar vínculo série-regra de avaliação para o novo ano. | Must | 🟢 `executeCopyAcademicYears` + `copyEvaluationRulesForNewYear` (unit `RegraAvaliacao`). |
| AY-06 | O sistema deve iniciar/finalizar ano letivo por escola em lote, com validação prévia e relatório por escola. | Must | 🟢 `createAcademicYearBatch`/`openAcademicYearBatch`/`closeAcademicYearBatch`. |
| AY-07 | O sistema deve recusar fechamento do ano com matrículas em andamento (exceto atividades complementares). | Must | 🟢 `hasActiveEnrollments`. |
| AY-08 | O sistema deve suportar edição das etapas (delete+recriar). | Must | 🟢 `updateAcademicYearStages`. |
| AY-09 | O sistema deve permitir desativar/excluir o ano letivo por escola. | Must | 🟢 `deleteAcademicYear` (com bug de mensagem na tela — R-AY). |
| AY-10 | O sistema deve permitir cadastro de janela de bloqueio por instituição/ano. | Should | 🟢 telas 21251. |
| AY-11 | O sistema deve aplicar a janela de bloqueio ao lançamento de notas/faltas. | Must | 🔴 Sem consumer no snapshot (corte real via `ReleasePeriodService`). |
| AY-12 | O sistema deve expor Resource API de consulta de anos letivos. | Should | 🟢 `ResourceSchoolAcademicYearController`. |

---

## Requisitos Não Funcionais

| Tipo | Requisito | Evidência | Confiança |
|------|-----------|-----------|-----------|
| Portabilidade | `anos_letivos::smallint[]` (array PostgreSQL, default `'{ }'::smallint[]`) com chamadas `ANY`/`array_append` — não portável para MySQL. | migração `escola_curso`, `AcademicYearService.php:189-225` | 🔴 |
| Consistência | Transação única para todo o lote de criação (milhares de inserts em um commit). | `AcademicYearService.php:1113-1129` | 🟡 |
| Externo | Cópia de etapas verifica "diário online" via `iDiarioService` com URL/token de `legacy.config.url_novo_educacao`/`token_novo_educacao`. | `:753-768` | 🟢 |
| Erro/UX | Exceções de regra (`AcademicYearServiceException`) com mensagens em pt-BR na tela; em lote: mensagem por escola. | Passando pelo serviço | 🟢 |
| Segurança de acesso | Processos: 561 (etapas), 21251 (bloqueio), 9999120 (lote, admin). | telas e controller | 🟢 |

---

## Critérios de Aceitação

```gherkin
Dado escola com ano letivo 2024 aberto e turma A ativa
Quando criar 2025 com copiar turmas
Então A-2025 é criada com disciplinas/etapas/professores copiados e contadores no relatório 🟢

Dado ano letivo 2024 em andamento com matrícula em andamento
Quando fechar em lote 2024
Então a escola recebe erro "Existem matrículas em andamento" e nada é alterado 🟢

Dado etapa 1 de 2025 de 10/01 a 05/02 e existente 2024 com etapa entre 20/01 e 30/01
Quando salvar 2025
Então erro "data parte do período de outros anos letivos" 🟢

Dado linha de escola_curso com anos_letivos [2023,2024]
Quando criar 2025 a partir de 2024
Então anos_letivos vira [2023,2024,2025] via array_append 🟢

Dado ano letivo com etapa em 29/02 no ano bissexto de origem
Quando copiar para ano não bissexto
Então data ajustada para 28/02 e observação na tela 🟢

Dado janela de bloqueio cadastrada para instituição/ano
Quando professor lançar nota fora da janela
Então 🔴 legado NÃO bloqueia (sem consumer); alvo deve aplicar
```

---

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Etapas + validação de datas + redução | Must | Base do calendário letivo 🟢 |
| Cópia do ano anterior (turmas/vínculos/alocações) | Must | Operação anual crítica 🟢 |
| Abertura/fechamento com matrículas ativas | Must | Regra de fechamento 🟢/🔴 |
| Conceito normalizado de anos letivos (sem array PG) | Must | Portabilidade alvo 🔴 |
| Bloqueio de janela aplicado ao diário | Must | Paridade real (sem consumer hoje) 🔴 |
| Resource API | Should | Integração 🟢 |

---

## Rastreabilidade de Código

| Arquivo | Papel | Cobertura |
|---------|-------|-----------|
| `app/Services/AcademicYearService.php` | Toda regra de ano letivo | 🟢 |
| `app/Http/Controllers/AcademicYearBatchController.php` | Lote (create/open/close) + telas admin | 🟢 |
| `app/Models/LegacySchoolAcademicYear.php` | `pmieducar.escola_ano_letivo` | 🟢 |
| `app/Models/LegacyAcademicYearStage.php` | `pmieducar.ano_letivo_modulo` | 🟢 |
| `app/Models/LegacySchoolYearLock.php` | `pmieducar.bloqueio_ano_letivo` | 🟢 |
| `app/Models/LegacyStageType.php` | `pmieducar.modulo` (tipos de etapa) | 🟢 |
| `ieducar/intranet/educar_ano_letivo_modulo_cad.php` | Tela de etapas (561) | 🟢 |
| `ieducar/intranet/educar_bloqueio_ano_letivo_{cad,det,lst}.php` | Telas do bloqueio (21251) | 🟢 |
| `app/Http/Controllers/Api/Resource/SchoolAcademicYear/ResourceSchoolAcademicYearController.php` | Resource API | 🟢 |
| `app/Services/ReleasePeriodService.php` | Janela real de lançamento (por referência, unit `DiarioClasse`) | 🟢 |
| `database/migrations/legacy/...escola_ano_letivo/bloqueio_ano_letivo` | DDL | 🟢 |
