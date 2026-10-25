# DiarioClasse (i-Educar legado), Tarefas

> Tarefas de recriação do subsistema diário de classe e frequência no modelo novo, com a origem no legado e o critério de pronto de cada uma.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Pré-requisitos

- Modelo de regras de avaliação (unit `RegraAvaliacao`), pois o regime de apuração (`tipoPresenca`) e o parecer dependem dela. 🟢 `_reversa_sdd/RegraAvaliacao/`
- Modelo de matrículas e enturmações (unit `Enrollments`), pois a grade lista as últimas enturmações ativas. 🟢 `_reversa_sdd/Enrollments/`
- Modelo de escolas e anos letivos (units `School` e `AcademicYear`), para as bandeiras e os anos encerrados. 🟢 `_reversa_sdd/School/`
- Configurações de bloqueios (unit `Configuracao`), para reaproveitar a janela institucional e os períodos de lançamento com exceção por permissão. 🟢 `_reversa_sdd/Configuracao/`
- Modelo de quadro de horários (unit `QuadroHorario`), para o vínculo futuro das aulas com os slots. 🟡 `_reversa_sdd/DiarioClasse/legacy-mapping.md:39`
- Decisão documentada da substituição do lançamento consolidado pelo diário atômico, com o de/para das consolidações legadas. 🔴 `_reversa_sdd/DiarioClasse/legacy-mapping.md:20`

---

## Tarefas

| ID | Tarefa | Origem no legado | Critério de pronto | Confiança |
|----|--------|------------------|--------------------|-----------|
| T-01 | Criar `educa_stage_absence_summaries` com de/para fiel de `modules.falta_aluno`/`falta_geral`/`falta_componente_curricular` | `_reversa_sdd/DiarioClasse/legacy-mapping.md:147-156` | Carga com contagens batendo por etapa | 🟢 |
| T-02 | Tratar a etapa especial 'Rc' na conversão varchar → número, mapeando para o código de recuperação | `FaltaController.php:128` 🟢 e `legacy-mapping.md:152` 🔴 | Carga sem falha com 'Rc' | 🔴 |
| T-03 | Criar `educa_class_lessons` com conteúdo, metodologia, BNCC, horário, tipo de aula e status | `legacy-mapping.md:33-59` (requisito novo) 🔴 | CRUD completo da aula | 🔴 |
| T-04 | Criar `educa_attendance_records` com chamada atômica por aula, única por aula e matrícula | `legacy-mapping.md:94-113` (requisito novo) 🔴 | Chamada idempotente por aula | 🔴 |
| T-05 | Criar `educa_absence_justifications` com vigência, abono, CID, anexo e status | `legacy-mapping.md:64-89` (requisito novo) 🔴 | Justifica e abona retroativamente | 🔴 |
| T-06 | Implementar `AttendanceService.recordLessonWithAttendance` transacional com chamada em lote | `legacy-mapping.md:186-295` 🔴 | Aula + chamadas na mesma transação | 🔴 |
| T-07 | Implementar a sincronização das consolidações por etapa com percentual e nível de alerta | `legacy-mapping.md:313-376` (cálculo equivalente ao legado) 🔴 | Consolidação recalculada na gravação | 🔴 |
| T-08 | Implantar as travas em camadas no lançamento: permissão, bandeira escolar, janela institucional, período de lançamento e exceção 999849 | `DiarioApiController.php:37-72`, `:287-309`, `:1880-1887` 🟢 | Cada trava com mensagem equivalente | 🟢 |
| T-09 | Implementar a grade de matrículas com última enturmação ativa e corte pela data base de remanejamento | `DiarioApiController.php:810-929` 🟢 | Mesma lista do legado | 🟢 |
| T-10 | Implementar a ordenação por sequencial de fechamento e nome | `DiarioApiController.php:885-892` 🟢 | Ordem estável | 🟢 |
| T-11 | Implementar a recusa de falta sem anteriores e a remoção escada-invertida com a etapa bloqueadora | `DiarioApiController.php:135`, `:252-274`, `:379-384` 🟢 | Mensagem igual do legado | 🟢 |
| T-12 | Unificar o cap de quantidade (tela 0–100, API livre no legado) em uma única validação | `FaltaController.php:135` e `DiarioApiController.php:1082-1091` 🟡 | Uma regra única documentada | 🟡 |
| T-13 | Migrar `ReleasePeriod`/`release_period_schools`/`release_period_dates` com o sem-vínculo-libera e o resolvedor de 'Rc'/'An' para a etapa máxima | `ReleasePeriodService.php:22-53` 🟢 | Janelas equivalentes | 🟢 |
| T-14 | Recriar as funções de frequência como serviço, com o truncamento a uma casa e os fallbacks de carga e hora falta | `modules.frequencia_da_matricula.sql` e `modules.frequencia_por_componente.sql` 🟢 | Valores idênticos aos do banco | 🟢 |
| T-15 | Parametrizar a consulta de frequência exposta pela API (corrige a interpolação de SQL) | `MatriculaController.php:497-503` 🔴 | Sem interpolação de entrada | 🔴 |
| T-16 | Migrar falta/atraso e compensação do servidor para o modelo do pessoal (unit `Servidores` por referência) | telas do processo 635 🟢 | Sem interferência nas faltas do aluno | 🟢 |
| T-17 | Implementar a auditoria de lançamentos e do abono de período (autor, instante, valor anterior) | ausente no legado 🔴 | Trilha consultável | 🔴 |

---

## Tarefas de Teste

| ID | Teste | Origem no legado | Critério de pronto | Confiança |
|----|-------|------------------|--------------------|-----------|
| TT-01 | POST de falta por componente exige o componente | `DiarioApiController.php:613-615` 🟢 | Recusa | 🟢 |
| TT-02 | Falta sem registro na etapa anterior é recusada | `DiarioApiController.php:135` 🟢 | Recusa | 🟢 |
| TT-03 | Remoção com faltas em etapasposteriores lista as etapas | `DiarioApiController.php:252-274` 🟢 | Mensagem igual | 🟢 |
| TT-04 | Remoção de registro inexistente devolve aviso | `DiarioApiController.php:746-747` 🟢 | Aviso sem erro | 🟢 |
| TT-05 | Operador 999849 lança fora da janela; operador comum não | `DiarioApiController.php:287-309` 🟢 | Dois comportamentos | 🟢 |
| TT-06 | Sem períodos definidos, `canPostNow` libera | `ReleasePeriodService.php:45-47` 🟢 | Libera | 🟢 |
| TT-07 | Frequência geral = (dias letivos − faltas) × 100 ÷ dias letivos, truncada | `modules.frequencia_da_matricula.sql:31-40` 🟢 | Valor idêntico | 🟢 |
| TT-08 | Frequência por componente com fallback triplo de carga e o somatório por componente | `modules.frequencia_por_componente.sql:22-88` 🟢 | Valor idêntico | 🟢 |
| TT-09 | Ano encerrado com bandeira bloqueia a grade | `DiarioApiController.php:45-52` 🟢 | Bloqueia | 🟢 |
| TT-10 | Aula geminada gera dupla falta na ausência | `legacy-mapping.md:693-694` 🔴 | Duas faltas | 🔴 |
| TT-11 | Atestado com abono retir a faltas do intervalo do cômputo | `legacy-mapping.md:690-692` 🔴 | Sem acréscimo | 🔴 |
| TT-12 | Percentuais abaixo de 75% emitem alerta crítico de evasão | `legacy-mapping.md:351-357` 🔴 | Alerta crítico | 🔴 |
| TT-13 | Migração de `falta_geral.etapa` com valor especial 'Rc' | `FaltaController.php:128` 🟢 | Sem falha de conversão | 🔴 |

---

## Tarefas de Migração de Dados

| ID | Tarefa | Origem no legado | Critério de pronto | Confiança |
|----|--------|------------------|--------------------|-----------|
| TM-01 | Migrar `modules.falta_aluno` → mestre de consolidações com o regime preservado (`tipo_falta` → `presence_type`) | `_reversa_sdd/DiarioClasse/legacy-mapping.md:149-151` 🟢 | Regime mantido por matrícula | 🟢 |
| TM-02 | Migrar `modules.falta_geral` → consolidações de regime geral, com etapa 'Rc' mapeada | `legacy-mapping.md:152-153` e `FaltaController.php:128` 🔴 | Totais e etapa preservados | 🔴 |
| TM-03 | Migrar `modules.falta_componente_curricular` → consolidações por componente com o UUID do de/para | `legacy-mapping.md:154-156` 🟢 | Totais por componente preservados | 🟢 |
| TM-04 | Recalcular os percentuais de frequência na carga para conferir com as funções do legado | funções SQL 🟢 | Divergência zero em amostra | 🟢 |
| TM-05 | Migrar os períodos de lançamento (`release_periods` e datas por escola) | `ReleasePeriodService.php` 🟢 | Janelas equivalentes | 🟢 |
| TM-06 | Migrar as faltas/atrasos e compensações do servidor para o modelo de pessoal | telas do processo 635 🟢 | Sem interferência no aluno | 🟢 |
| TM-07 | Documentar o que não migra: aulas atômicas, atestados de aluno, alertas (izados como novos) | busca 🔴 | Registro no roadmap | 🔴 |
| TM-08 | Corrigir o bastão da unit 14: exceção de período por permissão 999849 e períodos opt-in já existem | `DiarioApiController.php:287-299` e `app/Process.php:71` 🔴 | Specs da unit 14 anotadas | 🔴 |

---

## Ordem Sugerida

1. T-01 e T-02 (modelo de consolidações com a etapa especial)
2. T-08, T-09, T-10, T-11 (travas e grade equivalentes ao legado)
3. T-13, T-14 (períodos e frequência)
4. T-15, T-16 (segurança e servidor)
5. T-03, T-04, T-05 (diário atômico novo)
6. T-06, T-07 (serviço transacional e consolidação com alerta)
7. TM-01 a TM-08 (migração)
8. T-17 e TT-12/T-13 (auditoria e testes finais)

**Bloqueios:**

- T-01 bloqueia T-07 e TM-02/TM-03.
- T-03 e T-04 bloqueiam TT-10.
- T-05 bloqueia TT-11.
- T-08 depende das units `School`, `Configuracao` e `AcademicYear`.
- T-14 depende da carga de `TabelaArredondamento`? Não — depende de `RegraAvaliacao` (`tipoPresenca`) e da carga de dias letivos da série (`Stages`).

---

## Lacunas Pendentes (🔴 e 🟡)

- Diário atômico, chamada por aula, atestados de aluno e alertas de evasão: requisitos novos sem base legada. 🔴
- Etapa 'Rc' na conversão de etapa para inteiro. 🔴
- Cap divergente entre tela e API. 🟡
- Auditoria ausente nos lançamentos e no abono de período. 🔴
- SQL interpolado na frequência da API. 🔴
- Regime fixo na mestre sem migração quando a regra muda. 🟡
