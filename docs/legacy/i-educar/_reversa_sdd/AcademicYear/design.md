# AcademicYear (i-Educar legado) — Design

> Estrutura do subsistema de ano letivo, fluxos, dependências e riscos.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Interface

### Entidades e componentes

| Componente | Papel | Fonte |
|----------|-------|-------|
| `AcademicYearService` | Serviço central (68 métodos: validações, criação, cópia, lote, open/close) | 🟢 `app/Services/AcademicYearService.php:31-1442` |
| `LegacySchoolAcademicYear` | `escola_ano_letivo`: escola+ano+`andamento` 0/1/2+flags de cópia | 🟢 `app/Models/LegacySchoolAcademicYear.php:26-69` |
| `LegacyAcademicYearStage` | `ano_letivo_modulo`: etapa por escola/ano com sequencial, tipo, datas, dias letivos e FK `escola_ano_letivo_id` | 🟢 `app/Models/LegacyAcademicYearStage.php:14-43` |
| `LegacyStageType` | `pmieducar.modulo`: tipo de etapa (nome, número de etapas) por instituição | 🟢 `app/Models/LegacyStageType.php:13-45` |
| `LegacySchoolYearLock` | `bloqueio_ano_letivo`: janela por instituição/ano (PK composta) | 🟢 `app/Models/LegacySchoolYearLock.php:12-30` |
| `AcademicYearBatchController` | API HTTP do lote (`create/open/close`) com telas de admin e respostas JSON | 🟢 `app/Controllers/AcademicYearBatchController.php:15-274` |
| `ResourceSchoolAcademicYearController` | Resource API de consulta (index apenas) | 🟢 `ResourceSchoolAcademicYearController.php:10-16` |
| `AcademicYearServiceException` | Erro de regra com mensagem pt-BR | 🟢 `app/Exceptions/AcademicYearServiceException.php` |

### Tabelas

| Tabela | Fonte usando `anos_letivos` array | Confiança |
|---|---|---|
| `pmieducar.escola_curso` | `anos_letivos smallint[] default '{}'` | 🟢 migração |
| `pmieducar.escola_serie` | array | 🟢 |
| `pmieducar.escola_serie_disciplina` | array | 🟢 |
| `componente_curricular_ano_escolar` | array (via EXISTS cross) | 🟢 |
| `pmieducar.escola_ano_letivo` | escola+ano, `andamento`, `ativo`, flags | 🟢 migração |
| `pmieducar.ano_letivo_modulo` | etapas | 🟢 |
| `pmieducar.bloqueio_ano_letivo` | janela por instituição/ano | 🟢 migração |

### Rotas

| Rota | Papel | Confiança |
|---------|-------|-----------|
| `GET /ano-letivo-em-lote` + POST `processar` + GET `status` (can: ACADEMIC_YEAR_IMPORT 9999120) | Lote de admin | 🟢 `routes/web.php` |
| `intranet/educar_ano_letivo_modulo_cad.php` (561) | Etapas por escola/ano | 🟢 |
| `intranet/educar_bloqueio_ano_letivo_{cad,det,lst}.php` (21251) | Janela de bloqueio | 🟢 |
| Resource API (por referência) | Consulta de anos letivos | 🟢 |

---

## Fluxo Principal

**Criação por escola (tela legada).**

1. Admin abre tela de etapas do ano com escola e ano; busca ano anterior e mostra etapa template com datas ajustadas e nota de bissexto (29/02→28/02). 🟢 `educar_ano_letivo_modulo_cad.php:88-158`
2. Seleciona o tipo de etapa (módulo); o número de etapas informado deve conferir com o catálogo (validação pelo service). 🟢 `:455-460`, `:121-132`
3. POST `Novo`: valida conflito de datas (outros anos) e chama `createAcademicYearForSchool` com bandeiras de cópia. 🟢 `:375-411`, `AcademicYearService.php:138-158`
4. O serviço: copia turmas/disciplinas/etapas/professores/alocações (idempotente, sem duplicar), estende arrays `anos_letivos`, copia regras por série para o novo ano, insere/atualiza `escola_ano_letivo` (upsert de flags), insere etapas e ativa o ano. 🟢 `:808-898`, `:178-228`
5. Mensagem de resultado com contador de cópia por tipo. 🟢 `:1182-1242`

**Ação em lote (Laravel), Open/Close.**

1. Dois payload: `ano` + `escola[]` (valid); in `close`: escaneia `andamento` e `hasActiveEnrollments`; em `open`: escaneia `andamento`.
2. `executeActionForValidatedSchools` atualiza `andamento` para 1 ou 2 (em uma única transação), por escola; todo o antigo e novo relatório com `detail` por escola. 🟢 `:1390-1424`

---

## Fluxos Alternativos

- **Edição (`Editar`):** valida datas + módulos, depois `updateAcademicYearStages` (delete todas e recriar; ativa se inativo). 🟢 `:259-276`
- **Exclusão (`Excluir`):** banco marca `andamento=2, ativo=0` e apaga etapas; tela tem bug: o retorno de delete não é capturado (`$excluiu` indefinida) — mensagem "Exclusão não realizada." é sempre printada, mas a remoção realmente acontece. 🟢 `:281-298` + `educar_ano_letivo_modulo_cad.php:499-515`
- **Bloqueio (21251):** Uma janela por instituição/ano; criar/editar/remover; labels "Data inicial permitida / Data final permitida". 🟢 `educar_bloqueio_ano_letivo_cad.php:74-144`
- **Ignorar no lote:** escolas que já possuem ano letivo anual ficam na lista "skipped" com message "Ano letivo X já está aberto". 🟢 `:1007-1043`

---

## Dependências

| Dependência | Uso | Fonte |
|-------------|-----|-------|
| `School` / `SchoolClass` / `Enrollments` (`matricula`) | Turmas copiadas, matrículas no fechamento | 🟢 |
| `ComponenteCurricular` | Disciplinas por escola/série/turma e componentes por ano | 🟢 |
| `RegraAvaliacao` | Cópia de vínculo série/regra ano a ano (`LegacyEvaluationRuleGradeYear`) | 🟢 |
| `Servidores` (`EmployeeAllocation`) | Cópia de alocação, professor `analyst` separado; datas de alocação/vínculo em branco | 🟢 |
| `Calendario` | Referência de dias letivos/dias do calendário por etapa | 🟡 |
| `iDiarioService` (novo_educacao) | Verificação de lançamento no diário online externo na redução de etapas | 🟢 `:753-768` |
| `DiarioClasse`/`Avaliacao` | Corte real de lançamento via `ReleasePeriodService` + `POST_OUT_PERIOD` (por referência) | 🟢 |
| `Usuario` | user auditoria (`ref_usuario_cad/exc`), permissões por processo | 🟢 |

---

## Decisões de design identificadas

| Decisão | Evidência | Confiança |
|---------|-----------|-----------|
| Etapas fisicamente em tabela própria + PK `escola_ano_letivo_id` (FK referenciando) e `ref_ano/ref_ref_cod_escola` duplicando chave. | modelo + createAcademicYearStages | 🟢 |
| Cópia idempotente identificada por nome de turma e par de chaves. | `schoolClassExists`, `allocationExists` | 🟢 |
| Atualização em conjunto: um único comando `array_append` por tabela para todo o ano, em vez de linha por ano. | `executeCopyAcademicYears` | 🟢 |
| processo administrativo antigo e lote novo (REST pelo controller Laravel) coexiste. | telas 561/21251 vs 9999120 | 🟢 |
| Datas copiadas em texto (str_replace ano na data) e ajuste de bissexto explicito. | `adjustDateForYear` e processo de tela | 🟢 |
| Bloqueio separado do ano letivo (janela por instituição), sem indicação clara de aplicação. | bloqueio_ano_letivo | 🟡 |

---

## Estado interno

- `escola_ano_letivo`: flags `turmas_por_ano`, `copia_turmas`, `copia_dados_professor`, `copia_dados_demais_servidores` registradas pelo service e reutilizadas pela tela como pré-seleção. 🟢
- Caches do lote: contagem por escola na execução (turmas, aloc. professores, aloc. servidores, vínculos) para construir mensagem informativa. 🟢
- Sem cache ou trilha própria de auditoria (não é escrita delta diff).

---

## Observabilidade

Mensagens de exceção e relatário por escola no lote; nenhum log técnico próprio; não rastreia tempo, ator por evento do lote além do flash session da resposta. 🟢/🔴

---

## Riscos e lacunas

| Risco | Descrição | Evidência | Confiança |
|-------|-----------|-----------|-----------|
| Arrays do PostgreSQL | `smallint[]` com `ANY`/`array_append` inline (SQL raw) — migração para outro SGBD exige reframing relacional. | `:189-225`, migração | 🔴 |
| Janela de bloqueio sem consumer | `bloqueio_ano_letivo` só tem telas de CRUD; nenhum código aplica a janela. | busca sem resultados | 🔴 |
| Fechamento com matrículas | Regra real: `aprovado=3` + `ultima_matricula=1` + exclusão por atividade complementar — bastão sugere "qualquer situação final faltando". | `:1426-1441` | 🟡 |
| Transação única de lote | commit único em todo o lote; exceção no meio aborta por responsabilidade do Laravel (sem rollback explicit) — impacto: pode falhar silenciosamente. | `:1113-1129` | 🟡 |
| Conflito de datas intra-envio | Não valida etapas sobrepostas dentro do mesmo envio. | `:697-709` | 🟡 |
| Divida de exclusão | `deleteAcademicYear` muda `andamento=2` finalizado — não distingue "cancelado" de "finalizado". | `:281-298` | 🟡 |
| Bug de mensagem na exclusão | `$excluiu` indefinida na tela — mensagem toujours "Exclusão não realizada." | `educar_ano_letivo_modulo_cad.php:499-515` | 🟢 |
