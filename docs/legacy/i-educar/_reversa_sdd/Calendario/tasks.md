# Calendario (i-Educar legado), Tarefas

> Tarefas de recriação do subsistema de calendário escolar no modelo novo, com a origem no legado e o critério de pronto de cada uma.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Pré-requisitos

- Estratégia de tenant definida (ADR-001), com `tenant_id` obrigatório. 🟢 `_reversa_sdd/adrs/001-multi-tenancy-schema-isolation.md`
- Modelo de escolas e de turmas do SYS-Educa (units `School` e `SchoolClass`), pois o calendário é por escola e as marcações por turma. 🟢 `_reversa_sdd/School/` e `_reversa_sdd/SchoolClass/`
- Modelo de etapas do ano letivo definido (unit `Stages`), pois o início e o término derivam das etapas. 🟢 `_reversa_sdd/Stages/`
- Diário de classe definido (unit `DiarioClasse`), para o bloqueio de lançamento em dias não letivos. 🟡

---

## Tarefas

| ID | Tarefa | Origem no legado | Critério de pronto | Confiança |
|----|--------|------------------|--------------------|-----------|
| T-01 | Criar `educa_academic_calendars` com o calendário por escola e ano, admitindo a escola nula para o calendário padrão da rede, e o status de rascunho, publicado e travado | `_reversa_sdd/Calendario/legacy-mapping.md:24` e `:35-46` e `educar_calendario_ano_letivo_cad.php:107-165` | CRUD completo e a unicidade por tenant, ano e escola | 🟢 |
| T-02 | Criar `educa_calendar_day_reasons` com o enumerado tipado previsto no modelo novo e a bandeira de dia letivo | `educar_calendario_dia_motivo_cad.php:88-129` e `_reversa_sdd/Calendario/legacy-mapping.md:48-57` | Enumerado tipado com as cores | 🟡 |
| T-03 | Criar `educa_calendar_days` com a data ISO, o dia da semana e a bandeira de dia letivo denormalizada | `app/Models/LegacyCalendarDay.php:23-34` e `_reversa_sdd/Calendario/legacy-mapping.md:59-70` | Substituição do triplo de inteiros por data única, com a migração correta | 🟢 |
| T-04 | Migrar o binário do motivo ('e' e 'n') para o enumerado tipado do modelo novo | `educar_calendario_dia_motivo_cad.php:84-85` e `_reversa_sdd/Calendario/legacy-mapping.md:54` | Conversão sem perda de semântica | 🟡 |
| T-05 | Implementar o cômputo dos dias letivos por calendário e a validação dos 200 dias na publicação | ausente no legado, previsto 🔴 `_reversa_sdd/Calendario/legacy-mapping.md:76-81` | Publicação recusada com o diagnóstico | 🔴 |
| T-06 | Implementar o bloqueio de lançamento de frequência e de conteúdo em dias não letivos | ausente no legado, previsto 🔴 `_reversa_sdd/Calendario/legacy-mapping.md:85-87` | Integração com o diário de classe validada | 🔴 |
| T-07 | Implementar a importação do calendário da rede pela escola, com a cópia atômica dos dias | ausente no legado, previsto 🔴 `_reversa_sdd/Calendario/legacy-mapping.md:89-91` | Teste de importação com a preservação das próprias marcações | 🔴 |
| T-08 | Implementar a grade mensal do modelo novo com as cores por classe de dia e as legendas de marcação | `educar_calendario_ano_letivo_lst.php:190-370` | Paridade visual da grade | 🟢 |
| T-09 | Implementar as marcações de dia com motivo, descrição e turmas, com a sincronização idempotente de turmas | `educar_calendario_dia_cad.php:222-356` | Gravação única do dia, sem duplicação | 🟢 |
| T-10 | Corrigir a dupla gravação do dia da criação, com gravação única | `educar_calendario_dia_cad.php:240-242` 🔴 | Nenhum registro dobrado | 🟢 |
| T-11 | Implementar as anotações por dia, com a criação do dia inexistente e o vínculo N:N | `educar_calendario_anotacao_cad.php:92-137` | Paridade com os eventos do modelo novo | 🟢 |
| T-12 | Implementar a verificação de vínculos nas exclusões de motivos, de cabeçalhos e de dias | ausente no legado, previsto 🔴 | Exclusões recusadas com a lista de vínculos | 🔴 |
| T-13 | Implementar a trilha de auditoria das marcações do calendário | ausente no legado, previsto no modelo novo 🔴 | Trilha consultável por dia | 🔴 |
| T-14 | Passar as seleções dinâmicas e a navegação por parâmetros explícitos, em vez da sessão | `educar_calendario_ano_letivo_lst.php:84-89` | Navegação auditável e restituível | 🟡 |

---

## Tarefas de Teste

| ID | Teste | Origem no legado | Critério de pronto | Confiança |
|----|-------|------------------|--------------------|-----------|
| TT-01 | Cabeçalho recusado sem etapas datadas | `educar_calendario_ano_letivo_cad.php:112-164` | Mensagem equivalente | 🟢 |
| TT-02 | Turmas desmarcadas são apagadas na edição do dia | `educar_calendario_dia_cad.php:321-336` | Sincronização correta | 🟢 |
| TT-03 | Anotação em dia inexistente cria o dia | `educar_calendario_anotacao_cad.php:97-129` | Dia reproduzido com descrição vazia | 🟢 |
| TT-04 | A criação do dia grava uma única vez | `educar_calendario_dia_cad.php:240-242` 🔴 | Nenhum registro dobrado | 🟢 |
| TT-05 | Publicação recusada com menos de 200 dias letivos | `_reversa_sdd/Calendario/legacy-mapping.md:79-81` 🔴 | Diagnóstico com a quantidade faltante | 🔴 |
| TT-06 | Lançamento de frequência recusado em dia não letivo | `_reversa_sdd/Calendario/legacy-mapping.md:85-87` 🔴 | Recusa com a mensagem prevista | 🔴 |
| TT-07 | Importação do calendário da rede preserva as marcações próprias da escola | `_reversa_sdd/Calendario/legacy-mapping.md:89-91` 🔴 | Cópia atômica verificada | 🔴 |
| TT-08 | A grade reproduz as cores do legado por classe de dia | `educar_calendario_ano_letivo_lst.php:238-370` | Paridade visual | 🟢 |
| TT-09 | A exclusão de motivo em uso é recusada | ausente no legado, previsto 🔴 | Recusa com vínculos listados | 🔴 |

---

## Tarefas de Migração de Dados

| ID | Tarefa | Origem no legado | Critério de pronto | Confiança |
|----|--------|------------------|--------------------|-----------|
| TM-01 | Migrar `pmieducar.calendario_ano_letivo` para `educa_academic_calendars`, com UUID, `tenant_id` e o status | `_reversa_sdd/Calendario/legacy-mapping.md:24` | Contagens batem, anos e escolas preservados | 🟢 |
| TM-02 | Migrar `pmieducar.calendario_dia` para `educa_calendar_days`, convertendo o triplo de inteiros em data e preenchendo a bandeira de letivo | `app/Models/LegacyCalendarDay.php:30-31` | Datas únicas e corretas, dias da semana calculados | 🟡 |
| TM-03 | Migrar os motivos com a conversão do binário para o enumerado tipado e as cores | `educar_calendario_dia_motivo_cad.php:84-85` | Sem perda de semântica, dias referidos válidos | 🟡 |
| TM-04 | Migrar anotações e o vínculo de dias | `app/Models/LegacyCalendarDayNote.php` | Vínculos coerentes após a conversão de datas | 🟡 |
| TM-05 | Migrar `modules.calendario_turma` para as marcações por turma do modelo novo | `ieducar/modules/Calendario/Model/TurmaDataMapper.php:19-25` | Turmas preservadas por dia | 🟢 |
| TM-06 | Duplicidade de classes de dia por turma na base real, armadilha da baixa governança das marcações | busca de consumo | Relatório de inconsistências curado | 🟡 |

---

## Ordem Sugerida

1. T-01 (calendário)
2. T-02 e T-03 (motivos e dias)
3. T-04 e TM-02 e TM-03 (conversões)
4. T-09 e T-10 e T-11 (marcações, correção e anotações)
5. T-05 (cômputo e validação dos 200 dias)
6. T-06 (bloqueio no diário)
7. T-08 e T-14 (grade e navegação)
8. T-07 (importação)
9. T-12 e T-13 (exclusões e auditoria)
10. TM-01 a TM-06 (migração)

**Bloqueios:**

- T-01, T-02 e T-03 bloqueiam todas as marcações.
- T-05 bloqueia T-06 e a publicação.
- T-06 depende do diário de classe (unit `DiarioClasse`).
- TM-02 depende da definição do ano letivo das etapas da base real.
- T-07 depende da definição do calendário padrão da rede.

---

## Lacunas Pendentes (🔴)

- Sem cômputo dos dias letivos e sem a validação dos 200 dias no legado. 🔴
- Sem integração com o diário de classe e sem o bloqueio de lançamento no legado. 🔴
- Exclusões sem verificação de vínculos no legado. 🔴
- A sessão de navegação como insumo das telas precisa da confirmação de copy com a rede de como as telas são usadas em conjunto. 🟡
- O mapper e a entidade de turma são usados somente nas telas de calendário. 🟡
