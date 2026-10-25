# Mapeamento do Legado: Calendário Escolar e Dias Letivos (`Calendario`)

> Mapeamento de Engenharia Reversa para Reconstrução no Módulo `SYS-Educa` (SaaS SYSGOV)
> Padrão: JetBrains Mono para termos técnicos e tabelas.

---

## 1. Visão Geral e Contexto de Domínio

O módulo de **Calendário Escolar** governa a temporalidade operacional das escolas da rede pública municipal. Ele é o responsável por garantir que as exigências da Lei de Diretrizes e Bases da Educação Nacional (Lei Federal nº 9.394/1996 - LDB, art. 24, inciso I) sejam rigorosamente cumpridas:
1. Mínimo de **200 (duzentos) dias de efetivo trabalho escolar**;
2. Carga horária mínima anual de **800 (oitocentas) horas** de aula.

No I-Educar legado, o calendário era disperso entre scripts procedurais PHP em `ieducar/intranet/educar_calendario_*` e tabelas no schema `pmieducar` (`calendario_ano_letivo`, `calendario_dia`, `calendario_dia_motivo`, `calendario_anotacao`), com pouca automação na checagem dos 200 dias e validações manuais na virada do ano letivo.

No **SYS-Educa**, o calendário escolar é transformado em um motor central de governança escolar, conectado diretamente ao diário de classe eletrônico, impedindo lançamentos de falta em dias não-letivos e exigindo a comprovação das 200 diárias para a emissão do termo de encerramento do ano letivo da escola.

---

## 2. Inventário de Tabelas Legadas vs Modelo Canônico SYSGOV

| Tabela Legada I-Educar | Schema Legado | Destino no SYSGOV | Observações de Migração / Reconstrução |
| :--- | :--- | :--- | :--- |
| `pmieducar.calendario_ano_letivo` | `pmieducar` | `educa_academic_calendars` | Cabeçalho do calendário por escola e ano letivo. No SYSGOV, suporta também `school_id = null` para o Calendário Padrão da Secretaria (matriz da rede). |
| `pmieducar.calendario_dia` | `pmieducar` | `educa_calendar_days` | Cada dia do ano com flag explícita `is_school_day` (boolean), referência ao motivo, data ISO `YYYY-MM-DD`. Substitui a separação legada `dia` e `mes` inteiros. |
| `pmieducar.calendario_dia_motivo` | `pmieducar` | `educa_calendar_day_reasons` | Tipificação de dias: feriado nacional/municipal, recesso escolar, planejamento pedagógico, conselho de classe, sábado letivo. Enum tipado `type`. |
| `pmieducar.calendario_anotacao` | `pmieducar` | `educa_calendar_events` | Eventos escolares (feiras, formaturas, reuniões). No SYSGOV ganha `target_audience` e integração com notificações. |
| `pmieducar.calendario_dia_anotacao` | `pmieducar` | Pivot em `educa_calendar_events` | Vínculo N:N entre eventos e datas do calendário. |
| `modules.calendario_turma` | `modules` | `educa_class_calendars` | Variação de calendário por turma específica (ex.: turmas modulares do EJA ou cursos técnicos integrados). |

---

## 3. Estrutura de Tabelas Alvo no SYSGOV (`apps/api`)

### 3.1. `educa_academic_calendars`
- `id`: `bigint unsigned` (PK)
- `tenant_id`: `uuid` (FK indexada para `tenants.id`, padrão obrigatório SYSGOV)
- `school_id`: `bigint unsigned nullable` (FK para `educa_schools.id`. `null` indica modelo da Secretaria Municipal de Educação)
- `year`: `smallint unsigned` (ex.: `2026`)
- `name`: `varchar(150)` (ex.: "Calendário Escolar Padrão da Rede Municipal 2026")
- `status`: `enum('draft', 'published', 'locked')` (default `'draft'`)
- `total_school_days`: `smallint unsigned` (calculado e mantido via trigger/service, default `0`)
- `total_school_hours`: `decimal(6,2)` (default `800.00`)
- `created_at`, `updated_at`, `deleted_at`
- **Índices:**
  - `idx_educa_acad_cal_tenant_year`: `[tenant_id, year, school_id]` (unique composto)

### 3.2. `educa_calendar_day_reasons`
- `id`: `bigint unsigned` (PK)
- `tenant_id`: `uuid` (FK indexada)
- `school_id`: `bigint unsigned nullable` (pode ser global da rede ou da escola)
- `code`: `varchar(20)` (ex.: `FERIADO_NACIONAL`, `SABADO_LETIVO`, `RECESSO`, `PLANEJAMENTO`)
- `name`: `varchar(100)` (ex.: "Feriado Municipal - Padroeiro da Cidade")
- `type`: `enum('regular_school_day', 'extra_school_day', 'holiday', 'recess', 'pedagogical_planning')`
- `is_school_day`: `boolean` (se conta para o cômputo dos 200 dias)
- `color_hex`: `varchar(7)` (ex.: `#2563EB` para letivo, `#DC2626` para feriado, `#F59E0B` para reposição)
- `created_at`, `updated_at`

### 3.3. `educa_calendar_days`
- `id`: `bigint unsigned` (PK)
- `tenant_id`: `uuid` (FK indexada)
- `calendar_id`: `bigint unsigned` (FK indexada para `educa_academic_calendars.id`)
- `date`: `date` (`YYYY-MM-DD`)
- `day_of_week`: `tinyint unsigned` (`1` = Domingo, `7` = Sábado)
- `reason_id`: `bigint unsigned nullable` (FK para `educa_calendar_day_reasons.id`)
- `is_school_day`: `boolean` (denormalizado para rapidez de queries no diário eletrônico)
- `description`: `varchar(255) nullable`
- `created_at`, `updated_at`
- **Índices:**
  - `idx_educa_cal_days_tenant_cal_date`: `[tenant_id, calendar_id, date]` (unique composto)

---

## 4. Regras de Negócio e Algoritmos Críticos Extraídos

### 4.1. Validação Legal dos 200 Dias Letivos (LDB 9.394/96)
- **Fórmula de Cômputo:**
  $$\text{Dias Letivos Totais} = \sum (\text{Dias de Segunda a Sexta sem motivo não-letivo}) + \sum (\text{Dias Extras / Sábados Letivos})$$
- **Validação de Publicação (`status = 'published'`):**
  - O sistema impede a publicação de um calendário escolar caso $\text{Dias Letivos Totais} < 200$.
  - Se inferior a 200, exibe o diagnóstico indicando quantos dias faltam e sugerindo inclusão de sábados letivos de planejamento/reposição.
- **Validação de Fechamento do Ano (`closeYear`):**
  - Ao executar o fechamento do ano letivo na escola, o serviço de auditoria verifica se todos os 200 dias planejados foram homologados (com aulas registradas ou justificativas de suspensão abonadas por decreto municipal).

### 4.2. Integração com o Diário de Classe Eletrônico (Frequência)
- O diário de classe só permite chamada e registro de conteúdo pedagógico em datas que possuam `is_school_day = true` em `educa_calendar_days`.
- Tentativas de salvar frequência em feriados ou recessos retornam erro de validação: `"Data não letiva segundo o Calendário Escolar vigente"`.

### 4.3. Clonagem / Matriz da Rede para as Escolas
- A Secretaria Municipal de Educação (SME) monta o calendário base da rede.
- As escolas podem clicar em "Importar Calendário da Rede", o que realiza uma cópia atômica dos dias e feriados para a escola, permitindo que a unidade escolar adicione apenas seus feriados locais ou eventos específicos sem descaracterizar as datas centrais.
