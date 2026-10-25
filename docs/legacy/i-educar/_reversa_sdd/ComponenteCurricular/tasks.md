# ComponenteCurricular (i-Educar legado), Tarefas

> Tarefas de recriação do subsistema de matriz curricular no modelo novo, com a origem no legado e o critério de pronto de cada uma.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Pré-requisitos

- Estratégia de tenant definida (ADR-001), com `tenant_id` obrigatório no lugar de `instituicao_id`. 🟢 `_reversa_sdd/adrs/001-multi-tenancy-schema-isolation.md`
- Modelo de séries e turmas do SYS-Educa (units `Stages` e `SchoolClass`), pois a matriz referencia séries e os vínculos referem turmas. 🟢 `_reversa_sdd/Stages/` e `_reversa_sdd/SchoolClass/`
- Modelo do diário eletrônico (unit `DiarioClasse`), para as travas de desvinculação. 🟡
- Decisão sobre a sobreposição com `Unification` (unit 20): o mapa `MigratedDiscipline` pertence a essa unit; aqui só a referência. 🟡
- Definição dos códigos INEP atualizados do Educacenso, pois o enumerador do legado pode estar defasado. 🟡

---

## Tarefas

| ID | Tarefa | Origem no legado | Critério de pronto | Confiança |
|----|--------|------------------|--------------------|-----------|
| T-01 | Criar `educa_knowledge_areas` com nome, seção, ordenamento, agrupador e status | `_reversa_sdd/ComponenteCurricular/legacy-mapping.md:28-40` e `Area.php` | CRUD com a unicidade por tenant e nome | 🟢 |
| T-02 | Criar `educa_curricular_components` com nome, abreviação, base, área, código INEP, ordenamento, bandeira de progressão e cor | `legacy-mapping.md:44-59` e `Componente.php` | CRUD com os validadores do legado | 🟢 |
| T-03 | Criar `educa_course_matrix_disciplines` com carga, tipo de nota, anos letivos e **horas por falta** (coluna `hora_falta` ausente no mapeamento do bastão) | `legacy-mapping.md:63-71` e `app/Models/LegacyDisciplineAcademicYear.php:46-55` | Coluna adicionada ao contrato com critério de pronto | 🟡 |
| T-04 | Criar `educa_class_disciplines` com carga própria, docente, etapas específicas e etapas utilizadas | `legacy-mapping.md:75-84` e `TurmaDataMapper.php:21-35` | Vínculo por turma com a chave composta lógica | 🟢 |
| T-05 | Criar a habilitação componente por escola e série, ausente no desenho do bastão, com anos letivos | `pmieducar.escola_serie_disciplina` 🟢 `LegacySchoolGradeDiscipline.php` | Tabela com a migração correta | 🔴 |
| T-06 | Implementar o enumerador tipado da base curricular (comum, diversificada, profissional, religiosa) | `TipoBase.php:5-20` | Enumerado com a migração 1 a 4 | 🟢 |
| T-07 | Implementar o enumerador tipado do tipo de nota (numérica, conceitual) | `TipoNotaComponenteSerie.php:3-20` | Enumerado com a migração 1 e 2 | 🟢 |
| T-08 | Implementar o enumerador e a sincronização do código INEP do Educacenso | `CodigoEducacenso.php` | Tabela padronizada com a versão vigente | 🟢 |
| T-09 | Implementar a atualização em massa dos componentes da turma com o diff de três operações | `TurmaDataMapper.php:68-126` | Sincronização idempotente e trava ativa | 🟢 |
| T-10 | Implementar a trava de desvinculação com lançamentos no diário, por turma e por série | `TurmaDataMapper.php:108-121` e `ComponentesSerieController.php:50-126` | Recusa com a lista de erros | 🟢 |
| T-11 | Corrigir o bypass: a gravação da turma deve travar antes do apagamento em massa | `SchoolClassController.php:307-346` 🔴 | Trava avaliada no caminho novo | 🔴 |
| T-12 | Implementar a exclusão em massa de componentes da série com as mesmas travas da gravação | `ComponentesSerieController.php:257-295` 🔴 | Recusa com lançamentos | 🔴 |
| T-13 | Implementar a replicação de componentes na habilitação escola e série com união de anos | `ComponentesSerieController.php:152-183` | União idempotente por escola | 🟢 |
| T-14 | Implementar o diff de anos letivos da matriz como coluna JSONB com validação de remoção por ano | `ComponentesSerieController.php:448-495` | Remoção travada com lançamentos no ano | 🟢 |
| T-15 | Implementar as consultas de dispensas e dependências antes das remoções | `ComponentesSerieController.php:297-357` | Resposta com matrícula e aluno | 🟢 |
| T-16 | Implementar a exclusão de área com verificação de componentes vinculados | `EditController.php (Área):169-181` | Recusa citando os vínculos | 🟢 |
| T-17 | Corrigir a injeção SQL da busca por nome e do arranjo de anos | `ComponenteDataMapper.php:104-111` e `ComponentesSerieController.php:523-525` 🔴 | Ligações parametrizadas | 🟢 |
| T-18 | Implementar a validação legal da soma da carga horária na homologação da matriz | ausente no legado, previsto 🔴 `legacy-mapping.md:98-101` | Alerta ou bloqueio com o diagnóstico | 🔴 |
| T-19 | Unificar os processos de permissão divergentes (580 e 946) | `educar_componente_curricular_lst.php:141-144` 🟡 | Permissão única consultada | 🟡 |
| T-20 | Implementar a trilha de auditoria das trocas de matriz | ausente no legado 🔴 | Trilha consultável por componente | 🔴 |

---

## Tarefas de Teste

| ID | Teste | Origem no legado | Critério de pronto | Confiança |
|----|-------|------------------|--------------------|-----------|
| TT-01 | Nome de componente fora da faixa é recusado | `Componente.php:60-61` | Recusa conforme validação | 🟢 |
| TT-02 | Exclusão de área com componentes é recusada | `EditController.php (Área):169-181` | Recusa citando os vínculos | 🟢 |
| TT-03 | Sincronização da matriz apaga séries desmarcadas | `AnoController.php:226-236` | Diferença aplicada | 🟢 |
| TT-04 | Desvinculação com lançamentos é recusada por turma e por série | `TurmaDataMapper.php:108-121` | Recusa com a lista | 🟢 |
| TT-05 | O caminho novo da turma trava com lançamentos (regressão do bypass) | `SchoolClassController.php:307-346` 🔴 | Trava ativa | 🔴 |
| TT-06 | A exclusão em massa trava com lançamentos (regressão) | `ComponentesSerieController.php:257-295` 🔴 | Recusa | 🔴 |
| TT-07 | Diff de anos letivos separa inseridos e removidos | `ComponentesSerieController.php:482-495` | Diff correto | 🟢 |
| TT-08 | Replicação une anos letivos sem duplicar vínculo | `ComponentesSerieController.php:152-183` | União idempotente | 🟢 |
| TT-09 | Consulta de dispensa devolve matrícula e nome do aluno | `ComponentesSerieController.php:328-342` | Resposta completa | 🟢 |
| TT-10 | Busca por nome não apresenta injeção SQL | `ComponenteDataMapper.php:104-111` 🔴 | Entrada parametrizada | 🟢 |

---

## Tarefas de Migração de Dados

| ID | Tarefa | Origem no legado | Critério de pronto | Confiança |
|----|--------|------------------|--------------------|-----------|
| TM-01 | Migrar `modules.area_conhecimento` para `educa_knowledge_areas` com UUID e tenant | `legacy-mapping.md:28-40` | Contagens batem, agrupadores preservados | 🟢 |
| TM-02 | Migrar `modules.componente_curricular` para `educa_curricular_components` com a conversão da base e da cor branco padrão | `legacy-mapping.md:44-59` e `Componente.php:15` | Códigos INEP válidos, sentinelas 99999 normalizadas | 🟢 |
| TM-03 | Migrar `modules.componente_curricular_ano_escolar` com carga, tipo de nota, anos letivos e horas por falta | `LegacyDisciplineAcademicYear.php:46-55` | Arranjos de anos convertidos em JSONB | 🟡 |
| TM-04 | Migrar `modules.componente_curricular_turma` com carga própria, docente e etapas | `TurmaDataMapper.php:21-35` | Etapas específicas com etapas referidas coerentes | 🟡 |
| TM-05 | Migrar `pmieducar.escola_serie_disciplina` para a habilitação do modelo novo (tabela ausente no desenho do bastão) | `LegacySchoolGradeDiscipline.php` 🔴 | União das ofertas por escola e série | 🔴 |
| TM-06 | Migrar `migrated_Disciplina` (tabela de mapa) para `Unification` na unit própria | `MigratedDiscipline.php` | Referência cruzada com a unit 20 | 🟡 |
| TM-07 | Normalizar duplicidade de componente por abreviação e nome similares, como reporte de cuidado de migração | `ComponenteDataMapper.php::findByName` | Relatório de candidatos à unificação | 🟡 |

---

## Ordem Sugerida

1. T-01 e T-02 e T-06 e T-07 e T-08 (áreas, componentes e enumeradores)
2. T-03 e T-04 e T-05 (tabelas de matriz e habilitação)
3. T-09 e T-10 e T-14 e T-15 (sincronização e travas)
4. T-11 e T-12 e T-16 (correções de trava)
5. T-17 (segurança das ligações)
6. T-13 (replicação)
7. T-18 e T-19 e T-20 (conformidade, permissão e auditoria)
8. TM-01 a TM-07 (migração)

**Bloqueios:**

- T-01 e T-02 bloqueiam todas as matrizes e vínculos.
- T-03 e T-05 dependem das séries (unit `Stages`).
- T-04 e T-09 dependem das turmas (unit `SchoolClass`).
- T-10 e T-11 dependem do diário eletrônico (unit `DiarioClasse`).
- TM-06 fica com a unit `Unification`.

---

## Lacunas Pendentes (🔴 e 🟡)

- Tabela de homologação escola e série fora do contrato do bastão, com coluna `anos_letivos` própria. 🔴
- Coluna `hora_falta` fora do contrato do bastão. 🟡
- Sem validação legal da soma de carga horária no legado. 🔴
- Processos de permissão divergentes nas telas. 🟡
- Sem trilha de auditoria no legado. 🔴
- Versão vigente dos códigos INEP exige confirmação com o Educacenso atual. 🟡
