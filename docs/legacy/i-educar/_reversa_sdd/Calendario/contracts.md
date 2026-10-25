# Calendario (i-Educar legado), Contratos

> Contratos externos observados no legado para a unit de calendário escolar. Serve de entrada para o `openapi/` do modelo novo.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## 1. Contrato de tela: listagem e grade mensal do calendário

| Elemento | Formato | Observação |
|----------|---------|------------|
| Título | "Calendários" | 🟢 `ieducar/intranet/educar_calendario_ano_letivo_lst.php:66-68` |
| Acesso | Bloqueia usuário acima do nível sete | 🟢 `educar_calendario_ano_letivo_lst.php:45-64` |
| Estado de navegação | Sessão com calendário, instituição, escola, ano e mês | 🟢 `educar_calendario_ano_letivo_lst.php:84-89` |
| Grade | `MonthCalendar` com a largura de seiscentos e a troca de ano permitida | 🟢 `educar_calendario_ano_letivo_lst.php:190-193` |
| Cores | Fins de semana rosa; letras de dias letivos azul claro; não letivos verde escuro; extra letivos laranja escuro; início e término amarelos | 🟢 `educar_calendario_ano_letivo_lst.php:194-197` e `:238-370` |
| Descrição do dia | Tipo, motivo, descrição, turmas marcadas e botão de anotações | 🟢 `educar_calendario_ano_letivo_lst.php:261-274` |
| Processo | 620 | 🟢 `educar_calendario_ano_letivo_lst.php` (`Formular`) |

---

## 2. Contrato de telas de marcação

| Elemento | Formato | Observação |
|----------|---------|------------|
| Cabeçalho | Instituição, escola e ano com a lista de anos da escola ausentes em andamento | 🟢 `educar_calendario_ano_letivo_cad.php:87-104` |
| Marcação de dia | Dia em rótulo, motivo opcional, descrição obrigatória e turmas em caixas com o selecionador de todas | 🟢 `educar_calendario_dia_cad.php:168-220` |
| Redirecionamento da marcação | Para a listagem de anotações do dia | 🟢 `educar_calendario_dia_cad.php:256-268` |
| Anotação | Nome com até duzentos e cinquenta e cinco caracteres obrigatório e descrição opcional | 🟢 `educar_calendario_anotacao_cad.php:80-90` |
| Botões da listagem de anotações | "Dia Extra/Não Letivo" e "Calendário" | 🟢 `educar_calendario_anotacao_lst.php:107-108` |
| Processo | 620 | 🟢 cada tela (`Formular`) |

---

## 3. Contrato de tela: motivos dos dias

| Elemento | Formato | Observação |
|----------|---------|------------|
| Campos | Motivo até 255 obrigatório, sigla até 15 obrigatória, descrição opcional, tipo com as opções extra e não-letivo | 🟢 `educar_calendario_dia_motivo_cad.php:80-85` |
| Escopo | Instituição e escola | 🟢 `educar_calendario_dia_motivo_cad.php:79` |
| Exclusão | Direta, sem verificação de vínculos | 🔴 `educar_calendario_dia_motivo_cad.php:131-144` |
| Processo | 576 | 🟢 `educar_calendario_dia_motivo_cad.php:149` |

---

## 4. Contrato de persistência

| Tabela legada | Chave | Colunas relevantes | Fonte |
|---------------|-------|--------------------|-------|
| `pmieducar.calendario_ano_letivo` | `cod_calendario_ano_letivo` | escola, ano, usuário de cadastro e exclusão, ativo | 🟢 `app/Models/LegacyCalendarYear.php:16-34` |
| `pmieducar.calendario_dia` | calendário + mês + dia | motivo, descrição, usuário, ativo | 🟢 `app/Models/LegacyCalendarDay.php:21-34` |
| `pmieducar.calendario_dia_motivo` | `cod_calendario_dia_motivo` | escola, sigla, descrição, tipo, nome | 🟢 `app/Models/LegacyCalendarDayReason.php:24-26` |
| `pmieducar.calendario_anotacao` | `cod_calendario_anotacao` | nome, descrição, usuário, ativo | 🟢 `app/Models/LegacyCalendarNote.php` |
| `pmieducar.calendario_dia_anotacao` | vínculo composto | dia, mês, calendário, anotação | 🟢 `app/Models/LegacyCalendarDayNote.php:12` |
| `modules.calendario_turma` | chave composta de calendário, ano, mês, dia e turma | — | 🟢 `ieducar/modules/Calendario/Model/TurmaDataMapper.php:7-25` |

Datas de início e término do ano letivo: derivadas das etapas de ano letivo (`data_inicio` mínima e `data_fim` máximas da escola no ano). 🟢 `educar_calendario_ano_letivo_cad.php:112-113`

---

## 5. Contrato de domínio da marcação de dia

| Conceito | Semântica | Fonte |
|----------|-----------|-------|
| Dia extra letivo | Motivo do tipo 'e'; computa como letivo para as turmas marcadas | 🟢 `educar_calendario_dia_motivo_cad.php:84` e `educar_calendario_ano_letivo_lst.php:278-280` |
| Dia não letivo | Motivo do tipo 'n'; não computa | 🟢 `educar_calendario_dia_motivo_cad.php:84` e `educar_calendario_ano_letivo_lst.php:281-283` |
| Dia marcado sem motivo | Aparece na grade com a descrição e o botão de anotações | 🟢 `educar_calendario_ano_letivo_lst.php:287-297` |
| Turmas marcadas | A variação de dias extra letivos por turma, com a chave composta | 🟢 `TurmaDataMapper.php:19-25` |
| Dias fora do ano letivo | Fora do intervalo das etapas, aparecem como não letivos | 🟢 `educar_calendario_ano_letivo_lst.php:305-362` |
| Anotação | Registro textual do dia, com vínculo N:N | 🟢 `educar_calendario_anotacao_cad.php:92-137` |

---

## 6. Contratos planejados para o modelo novo

Derivados de `_reversa_sdd/Calendario/legacy-mapping.md`:

### Endpoints REST (prefixo `/api/v1/educa/academic-calendars`)

| Método | Caminho | Deriva de |
|--------|---------|-----------|
| GET | `/api/v1/educa/academic-calendars` | Listagem por tenant, ano e escola 🟢 `educar_calendario_ano_letivo_lst.php:111-138` |
| POST | `/api/v1/educa/academic-calendars` | Criação com a validação das etapas 🟢 `educar_calendario_ano_letivo_cad.php:107-165` |
| GET | `/api/v1/educa/academic-calendars/{id}` | Detalhe com dias e motivos 🟢 `educar_calendario_ano_letivo_lst.php:190-303` |
| PUT | `/api/v1/educa/academic-calendars/{id}` | Atualização 🟢 `educar_calendario_ano_letivo_cad.php:167-196` |
| POST | `/api/v1/educa/academic-calendars/{id}/publish` | Publicação com a validação dos 200 dias 🔴 |
| POST | `/api/v1/educa/academic-calendars/{id}/days` | Marcação de dias com motivo e turmas 🟢 `educar_calendario_dia_cad.php:222-356` |
| GET/POST | `/api/v1/educa/calendar-day-reasons` | Motivos 🟢 `educar_calendario_dia_motivo_cad.php:88-129` |
| GET/POST | `/api/v1/educa/calendar-events` | Eventos e anotações 🟢 `educar_calendario_anotacao_cad.php:92-137` |
| POST | `/api/v1/educa/academic-calendars/import-network` | Importação do calendário da rede 🔴 |

### Tipos TypeScript (`packages/sdk/src/types/educa/calendars.ts`)

Tipos previstos: `CalendarStatus`, `DayReasonType` (com `is_school_day` e `color_hex`), `CalendarDay`, `CalendarDayReason`, `CalendarEvent`, `AcademicCalendar`, com a data ISO e as bandeiras da grade. 🟢 `_reversa_sdd/Calendario/legacy-mapping.md:33-70`

### De/para das tabelas

`pmieducar.calendario_ano_letivo` a `educa_academic_calendars`; `pmieducar.calendario_dia` a `educa_calendar_days`; `pmieducar.calendario_dia_motivo` a `educa_calendar_day_reasons`; `pmieducar.calendario_anotacao` a `educa_calendar_events`; `pmieducar.calendario_dia_anotacao` como tabela pivô do evento; `modules.calendario_turma` a `educa_class_calendars`. 🟢 `_reversa_sdd/Calendario/legacy-mapping.md:22-29`
