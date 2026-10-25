# Mapeamento do Legado: Regras de Avaliação, Fórmulas de Média e Arredondamento (SYS-Educa / SYSGOV)

Este documento detalha as especificações técnicas, regras de cálculo, fórmulas matemáticas, tabelas de arredondamento e progressão escolar do módulo legado do i-Educar (`RegraAvaliacao`, `FormulaMedia`, `TabelaArredondamento`) para o novo módulo **SYS-Educa** integrado à plataforma multi-tenant **SYSGOV**.

---

## 1. Contexto do Módulo e Regras de Negócio

O sistema de avaliação do i-Educar foi projetado para atender à flexibilidade da LDB (Lei de Diretrizes e Bases da Educação Nacional nº 9.394/1996), suportando desde redes de ensino com notas decimais tradicionais (0 a 10), notas conceituais (A, B, C, D / Pleno, Suficiente), até regimes de progressão continuada baseados exclusivamente em pareceres descritivos e ciclos de aprendizagem.

### 1.1. Fórmulas de Média (`FormulaMedia`)
- O cálculo da média anual/semestral não é estático; ele é expresso por uma fórmula matemática configurável por instituição/série.
- **Tokens Suportados:**
  - `Se`: Soma de todas as notas das etapas regulares ($E_1 + E_2 + \dots + E_n$).
  - `Et`: Total de etapas do período letivo da turma (ex: 4 bimestres, 3 trimestres, 2 semestres).
  - `E1` a `E10`: Nota de cada etapa individual.
  - `Rc`: Nota do exame de recuperação final.
  - `RSP1` a `RSP10`: Nota da recuperação paralela da etapa respectiva.
  - `RSPS1` a `RSPS10`: Soma das notas da etapa e recuperação paralela.
  - `RSPM1` a `RSPM10`: Média entre a etapa e a recuperação paralela.
  - `C1` a `C10`: Carga horária ou pesos de cada etapa.
  - Operadores matemáticos e lógicos: `+`, `-`, `*`, `/`, `(`, `)`, `>`, `<`, `? :` (operador ternário condicional).
- **Substituição de Menor Nota (`substitui_menor_nota_rc`):**
  - Se habilitado, a nota da recuperação final `Rc` substitui a menor nota de etapa $E_i$ caso $Rc > \min(E_1, \dots, E_n)$, recalculando a média final automaticamente.

### 1.2. Segurança Crítica na Avaliação de Expressões (Superação do Legado)
- **Vulnerabilidade no Legado:** O i-Educar executava expressões através de `eval('?><?php $result = ' . $code . '; ?>')` em `FormulaMedia_Model_Formula::_exec`. Isso representava uma vulnerabilidade grave de Remote Code Execution (RCE).
- **Padrão SYSGOV (Laravel 13 / PHP 8.4):**
  - **PROIBIDO** o uso de `eval()` ou construtos nativos inseguros.
  - Utilização mandatória de um avaliador de expressões seguro baseado em AST sandbox (`symfony/expression-language` ou parser matemático próprio via lexer/tokenizer), sem acesso a variáveis de ambiente, chamadas de sistema ou reflexão do PHP.
  - Validação estrita da fórmula em tempo de criação/edição contra AST tokens permitidos.

### 1.3. Recuperação Paralela (`RegraRecuperacao`)
- **Modalidades:**
  1. `Nenhum` ($0$): Não há recuperação paralela durante o ano letivo.
  2. `Por Etapa` ($1$): A cada etapa encerrada com nota abaixo da média estipulada, realiza-se uma prova de recuperação paralela.
  3. `Por Etapas Específicas` ($2$): A recuperação abrange grupos de etapas (ex: etapas 1 e 2 juntas, etapas 3 e 4 juntas).
- **Critérios de Cálculo da Nota com Paralela:**
  1. `Substitui se Maior`: Se a nota da recuperação paralela for maior que a nota da etapa, assume o novo valor.
  2. `Média Aritmética`: A nova nota da etapa é a média entre a nota original e a nota de recuperação: $E_n = \frac{E_n + RSP_n}{2}$.
  3. `Soma de Pontos`: A nota de recuperação soma pontos adicionais à etapa, limitada à nota máxima da etapa.

### 1.4. Tabela de Arredondamento e Notas Conceituais (`TabelaArredondamento`)
- Permite normalizar notas numéricas decimais para regras municipais de arredondamento:
  - **Ações:**
    - `0`: Não arredondar.
    - `1`: Arredondar para o inteiro imediatamente inferior (piso / `floor`).
    - `2`: Arredondar para o inteiro imediatamente superior (teto / `ceil`).
    - `3`: Arredondar para casa decimal específica (ex: valores entre $5.75$ e $6.24$ viram $6.0$).
- **Notas Conceituais:**
  - Mapeia faixas de notas numéricas para conceitos (ex: $9.0 \le x \le 10.0 \to \text{"A"}$, $7.0 \le x \le 8.99 \to \text{"B"}$).

### 1.5. Progressão e Apuração de Frequência
- **Tipos de Progressão:**
  - `1 - Continuada`: O aluno progride automaticamente para o próximo ano curricular (comum nos anos iniciais do Fundamental).
  - `2 - Não-continuada (Média e Presença)`: Exige cumprimento de média mínima e percentual mínimo de presença (padrão LDB: 75%).
  - `3 - Não-continuada (Somente Média)`: Exige apenas cumprimento da média acadêmica; faltas não reprovam diretamente no cálculo.
  - `4 - Não-continuada Manual`: O resultado final de aprovação/reprovação é inserido manualmente pela secretaria/conselho.
  - `5 - Não-continuada Manual por Ciclo`: Progressão continuada durante os anos do ciclo e avaliação formal deliberada no término do ciclo.
- **Apuração de Presença (`TipoPresenca`):**
  - `1 - Geral Unificada`: Total de faltas acumuladas em relação à carga horária total da série.
  - `2 - Por Componente Curricular`: Falta apurada individualmente por disciplina.
- **Regime de Dependência Curricular:**
  - Parâmetro `qtd_disciplinas_dependencia` permite que alunos reprovados em até $K$ disciplinas (ex: até 2 matérias) avancem de série cursando as matérias pendentes em regime de dependência no contraturno.

---

## 2. Modelagem DDL (MySQL 8.0+ / InnoDB)

Todas as tabelas são modeladas estritamente para **MySQL 8.0+**, utilizando UUID v4 (`CHAR(36)`), multi-tenancy nativo com `tenant_id`, tipos numéricos com ponto flutuante exato (`DECIMAL(5,3)`), constraints e índices de alta performance.

```sql
-- =============================================================================
-- BANCO DE DADOS: MySQL 8.0+ (InnoDB / utf8mb4_unicode_ci)
-- MÓDULO: SYS-Educa / EvaluationRules (Regras de Avaliação, Fórmulas e Arredondamento)
-- =============================================================================

SET foreign_key_checks = 0;

-- -----------------------------------------------------------------------------
-- 1. Fórmulas de Cálculo de Médias (Fórmula Final e Recuperação)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `educa_formula_averages` (
    `id` CHAR(36) NOT NULL COMMENT 'Identificador único UUID v4',
    `tenant_id` CHAR(36) NOT NULL COMMENT 'Identificador do Tenant (Multi-tenant)',
    `institution_id` CHAR(36) NOT NULL COMMENT 'Identificador da Instituição/Rede de Ensino',
    `name` VARCHAR(120) NOT NULL COMMENT 'Nome descritivo da fórmula (ex: Média Aritmética 4 Bimestres)',
    `formula` VARCHAR(255) NOT NULL COMMENT 'Expressão matemática segura (ex: (E1+E2+E3+E4)/4 ou Se/Et)',
    `formula_type` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '1=Média Final, 2=Média para Recuperação',
    `replace_lowest_score_with_remedial` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1=Substitui menor nota de etapa pela nota da recuperação se maior',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_formula_tenant_inst` (`tenant_id`, `institution_id`),
    INDEX `idx_formula_type` (`tenant_id`, `formula_type`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Fórmulas matemáticas de cálculo de média do SYS-Educa';

-- -----------------------------------------------------------------------------
-- 2. Tabelas de Arredondamento e Conversão Conceitual
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `educa_rounding_tables` (
    `id` CHAR(36) NOT NULL COMMENT 'Identificador único UUID v4',
    `tenant_id` CHAR(36) NOT NULL COMMENT 'Identificador do Tenant (Multi-tenant)',
    `institution_id` CHAR(36) NOT NULL COMMENT 'Identificador da Instituição/Rede de Ensino',
    `name` VARCHAR(120) NOT NULL COMMENT 'Nome da tabela de arredondamento (ex: Arredondamento Padrão Municipal)',
    `note_type` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '1=Numérica, 2=Conceitual, 3=Numérica e Conceitual',
    `round_note` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1=Aplica arredondamento',
    `normalize_average` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1=Normaliza média final',
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_rounding_tenant_inst` (`tenant_id`, `institution_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabelas de arredondamento e réguas conceituais';

-- -----------------------------------------------------------------------------
-- 3. Faixas e Valores da Tabela de Arredondamento / Escala Conceitual
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `educa_rounding_table_values` (
    `id` CHAR(36) NOT NULL COMMENT 'Identificador único UUID v4',
    `tenant_id` CHAR(36) NOT NULL COMMENT 'Identificador do Tenant (Multi-tenant)',
    `rounding_table_id` CHAR(36) NOT NULL COMMENT 'Chave estrangeira para educa_rounding_tables',
    `name` VARCHAR(60) NOT NULL COMMENT 'Rótulo do conceito (ex: A, B, C ou 7.0)',
    `description` VARCHAR(255) NULL COMMENT 'Descrição pedagógica (ex: Aprendizagem Plena)',
    `min_value` DECIMAL(5,3) NOT NULL COMMENT 'Valor numérico mínimo da faixa inclusiva',
    `max_value` DECIMAL(5,3) NOT NULL COMMENT 'Valor numérico máximo da faixa inclusiva',
    `action` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '0=Não arredondar, 1=Arredondar para inteiro inferior, 2=Arredondar para inteiro superior, 3=Arredondar para casa decimal específica',
    `exact_decimal_place` DECIMAL(5,3) NULL COMMENT 'Valor exato de fixação decimal caso action=3',
    `observation` VARCHAR(255) NULL COMMENT 'Observações administrativas/legais',
    `order_index` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Ordem de exibição e avaliação',
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_rounding_val_table` (`tenant_id`, `rounding_table_id`),
    INDEX `idx_rounding_range` (`tenant_id`, `rounding_table_id`, `min_value`, `max_value`),
    CONSTRAINT `fk_rounding_val_table` FOREIGN KEY (`rounding_table_id`)
        REFERENCES `educa_rounding_tables` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Faixas de notas e valores conceituais da tabela de arredondamento';

-- -----------------------------------------------------------------------------
-- 4. Regras de Avaliação Acadêmica (Entidade Mestra)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `educa_evaluation_rules` (
    `id` CHAR(36) NOT NULL COMMENT 'Identificador único UUID v4',
    `tenant_id` CHAR(36) NOT NULL COMMENT 'Identificador do Tenant (Multi-tenant)',
    `institution_id` CHAR(36) NOT NULL COMMENT 'Identificador da Instituição/Rede de Ensino',
    `name` VARCHAR(120) NOT NULL COMMENT 'Nome da regra (ex: Ensino Fundamental II - Regular)',
    `note_type` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '0=Sem Nota, 1=Numérica, 2=Conceitual, 3=Numérica e Conceitual',
    `progression_type` TINYINT UNSIGNED NOT NULL DEFAULT 2 COMMENT '1=Continuada, 2=Não-continuada Média/Presença, 3=Não-continuada Só Média, 4=Não-continuada Manual, 5=Não-continuada Ciclo',
    `presence_type` TINYINT UNSIGNED NOT NULL DEFAULT 2 COMMENT '1=Geral Unificada, 2=Por Componente Curricular',
    `descriptive_opinion_type` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '0=Nenhum, 2=Etapa/Componente, 3=Etapa/Geral, 5=Anual/Componente, 6=Anual/Geral',
    `min_average` DECIMAL(5,3) NULL DEFAULT 6.000 COMMENT 'Média mínima anual para aprovação direta',
    `min_remedial_average` DECIMAL(5,3) NULL DEFAULT 5.000 COMMENT 'Média mínima após exame de recuperação',
    `formula_average_id` CHAR(36) NULL COMMENT 'Fórmula para cálculo da média final',
    `formula_remedial_id` CHAR(36) NULL COMMENT 'Fórmula para cálculo após exame de recuperação',
    `rounding_table_id` CHAR(36) NULL COMMENT 'Tabela de arredondamento numérica',
    `conceptual_rounding_table_id` CHAR(36) NULL COMMENT 'Tabela de arredondamento conceitual',
    `min_presence_percentage` DECIMAL(5,2) NOT NULL DEFAULT 75.00 COMMENT 'Percentual mínimo de presença (ex: 75.00%)',
    `ignore_presence_check` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1=Desconsidera faltas na aprovação',
    `parallel_remedial_type` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '0=Não usar, 1=Por Etapa, 2=Por Etapas Específicas',
    `parallel_remedial_calc_type` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '1=Substitui se maior, 2=Média com etapa, 3=Soma pontos',
    `min_parallel_remedial_average` DECIMAL(5,3) NULL COMMENT 'Média de corte para convocação de recuperação paralela',
    `calculate_parallel_remedial_average` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1=Calcula média da recuperação paralela',
    `max_general_score` DECIMAL(5,3) NOT NULL DEFAULT 10.000 COMMENT 'Nota máxima geral por etapa',
    `min_general_score` DECIMAL(5,3) NOT NULL DEFAULT 0.000 COMMENT 'Nota mínima geral por etapa',
    `max_final_exam_score` DECIMAL(5,3) NOT NULL DEFAULT 10.000 COMMENT 'Nota máxima permitida no exame final',
    `decimal_places` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Quantidade de casas decimais (0 a 3)',
    `general_score_per_stage` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1=Nota geral por etapa (sem divisão por disciplina)',
    `allow_course_dependency` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1=Permite progressão com dependência de disciplinas',
    `max_dependency_disciplines` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Quantidade máxima de disciplinas em dependência (ex: 2)',
    `max_dependency_enrollments` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Quantidade máxima de matrículas de dependência ativas',
    `auto_fail_after_dependencies` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1=Reprova se exceder limite de dependências',
    `automatic_reprobation` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1=Reprovação automática via sistema, 0=Requer conselho',
    `approve_by_presence_after_exam` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1=Aprova por frequência após atingir exame',
    `differentiated_rule_id` CHAR(36) NULL COMMENT 'Regra diferenciada para alunos com deficiência/PCD',
    `points_cumulative` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1=Sistema de acúmulo de pontos ao invés de média (ex: 100 pontos anuais)',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_evalrule_tenant_inst` (`tenant_id`, `institution_id`),
    INDEX `idx_evalrule_status` (`tenant_id`, `is_active`),
    CONSTRAINT `fk_evalrule_formula_avg` FOREIGN KEY (`formula_average_id`)
        REFERENCES `educa_formula_averages` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_evalrule_formula_rem` FOREIGN KEY (`formula_remedial_id`)
        REFERENCES `educa_formula_averages` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_evalrule_rounding` FOREIGN KEY (`rounding_table_id`)
        REFERENCES `educa_rounding_tables` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_evalrule_diff` FOREIGN KEY (`differentiated_rule_id`)
        REFERENCES `educa_evaluation_rules` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Regras gerais de avaliação acadêmica do SYS-Educa';

-- -----------------------------------------------------------------------------
-- 5. Regras de Recuperação Específicas / Paralelas Agrupadas
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `educa_evaluation_rule_remedials` (
    `id` CHAR(36) NOT NULL COMMENT 'Identificador único UUID v4',
    `tenant_id` CHAR(36) NOT NULL COMMENT 'Identificador do Tenant (Multi-tenant)',
    `evaluation_rule_id` CHAR(36) NOT NULL COMMENT 'Chave estrangeira para educa_evaluation_rules',
    `description` VARCHAR(120) NOT NULL COMMENT 'Descrição da recuperação (ex: Recuperação 1º Semestre)',
    `remedied_stages` VARCHAR(60) NOT NULL COMMENT 'Lista de etapas agrupadas separadas por vírgula (ex: 1,2)',
    `replace_lowest_score` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1=Substitui menor nota das etapas agrupadas',
    `average_cutoff` DECIMAL(5,3) NULL COMMENT 'Média de corte para necessidade da recuperação',
    `max_score` DECIMAL(5,3) NOT NULL DEFAULT 10.000 COMMENT 'Nota máxima permitida na recuperação',
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_remedial_eval_rule` (`tenant_id`, `evaluation_rule_id`),
    CONSTRAINT `fk_remedial_eval_rule` FOREIGN KEY (`evaluation_rule_id`)
        REFERENCES `educa_evaluation_rules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Configurações de recuperação paralela por etapas agrupadas';

-- -----------------------------------------------------------------------------
-- 6. Associação de Regra de Avaliação à Série e Ano Letivo
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `educa_evaluation_rule_series` (
    `id` CHAR(36) NOT NULL COMMENT 'Identificador único UUID v4',
    `tenant_id` CHAR(36) NOT NULL COMMENT 'Identificador do Tenant (Multi-tenant)',
    `series_id` CHAR(36) NOT NULL COMMENT 'Chave estrangeira para educa_series (Série/Ano Escolar)',
    `academic_year` SMALLINT UNSIGNED NOT NULL COMMENT 'Ano Letivo de aplicação (ex: 2026)',
    `evaluation_rule_id` CHAR(36) NOT NULL COMMENT 'Regra padrão para a série no ano',
    `differentiated_rule_id` CHAR(36) NULL COMMENT 'Regra diferenciada (ex: educação especial/PCD)',
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_eval_rule_series_year` (`tenant_id`, `series_id`, `academic_year`),
    INDEX `idx_eval_rule_lookup` (`tenant_id`, `evaluation_rule_id`),
    CONSTRAINT `fk_eval_rule_series` FOREIGN KEY (`evaluation_rule_id`)
        REFERENCES `educa_evaluation_rules` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_eval_rule_series_diff` FOREIGN KEY (`differentiated_rule_id`)
        REFERENCES `educa_evaluation_rules` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Vínculo de regras de avaliação por série e ano letivo';

SET foreign_key_checks = 1;
```

---

## 3. Matriz De/Para: Legado i-Educar vs SYS-Educa (SYSGOV)

| Objeto / Campo Legado (`PostgreSQL`) | Tabela / Campo SYSGOV (`MySQL 8.0+`) | Tipo MySQL | Descrição e Transformação |
| :--- | :--- | :--- | :--- |
| `modules.formula_media.id` | `educa_formula_averages.id` | `CHAR(36)` | UUID v4 substitui chave inteira serial |
| `instituicao_id` | `tenant_id` + `institution_id` | `CHAR(36)` | Isolamento multi-tenant + vínculo com rede |
| `nome` | `educa_formula_averages.name` | `VARCHAR(120)` | Nome descritivo da fórmula de média |
| `formula_media` | `educa_formula_averages.formula` | `VARCHAR(255)` | Sintaxe matemática validada por AST Parser |
| `tipo_formula` | `educa_formula_averages.formula_type` | `TINYINT UNSIGNED` | 1=Final, 2=Recuperação |
| `substitui_menor_nota_rc` | `replace_lowest_score_with_remedial` | `TINYINT(1)` | Flag booleana de substituição automática |
| `modules.tabela_arredondamento.id` | `educa_rounding_tables.id` | `CHAR(36)` | UUID v4 |
| `tipo_nota` | `educa_rounding_tables.note_type` | `TINYINT UNSIGNED` | 1=Numérica, 2=Conceitual, 3=Ambas |
| `arredondar_nota` | `educa_rounding_tables.round_note` | `TINYINT(1)` | Ativa cálculo de arredondamento |
| `modules.tabela_arredondamento_valor.id` | `educa_rounding_table_values.id` | `CHAR(36)` | UUID v4 |
| `valor_minimo` | `educa_rounding_table_values.min_value` | `DECIMAL(5,3)` | Valor inferior com 3 casas de precisão |
| `valor_maximo` | `educa_rounding_table_values.max_value` | `DECIMAL(5,3)` | Valor superior inclusivo |
| `acao` | `educa_rounding_table_values.action` | `TINYINT UNSIGNED` | 0=Nenhum, 1=Piso, 2=Teto, 3=Específica |
| `casa_decimal_exata` | `exact_decimal_place` | `DECIMAL(5,3)` | Casa de fixação para `action=3` |
| `modules.regra_avaliacao.id` | `educa_evaluation_rules.id` | `CHAR(36)` | UUID v4 da regra mestra de avaliação |
| `tipo_progressao` | `educa_evaluation_rules.progression_type` | `TINYINT UNSIGNED` | 1=Continuada, 2=Média/Presença, etc. |
| `tipo_presenca` | `educa_evaluation_rules.presence_type` | `TINYINT UNSIGNED` | 1=Geral unificada, 2=Por disciplina |
| `media` | `educa_evaluation_rules.min_average` | `DECIMAL(5,3)` | Média mínima anual para aprovação |
| `media_recuperacao` | `min_remedial_average` | `DECIMAL(5,3)` | Média exigida após prova de recuperação |
| `porcentagem_presenca` | `min_presence_percentage` | `DECIMAL(5,2)` | Percentual mínimo (ex: 75.00%) |
| `tipo_recuperacao_paralela` | `parallel_remedial_type` | `TINYINT UNSIGNED` | 0=Não, 1=Por etapa, 2=Etapas agrupadas |
| `tipo_calculo_recuperacao_paralela` | `parallel_remedial_calc_type` | `TINYINT UNSIGNED` | 1=Substitui, 2=Média, 3=Soma |
| `qtd_disciplinas_dependencia` | `max_dependency_disciplines` | `TINYINT UNSIGNED` | Quantidade de matérias permitidas |
| `modules.regra_avaliacao_serie_ano` | `educa_evaluation_rule_series` | Tabela | Chave primária composta trocada por UUID |

---

## 4. Motor Seguro de Avaliação Matemática (Laravel 13 - PHP 8.4)

Para erradicar a vulnerabilidade de `eval()` do i-Educar legado, o SYSGOV implementa um serviço especializado com a biblioteca `Symfony\Component\ExpressionLanguage\ExpressionLanguage` em sandbox fechado.

### 4.1. Implementação do `AverageCalculationEngine`
```php
<?php

namespace Modules\Educa\Services\EvaluationRules;

use Symfony\Component\ExpressionLanguage\ExpressionLanguage;
use InvalidArgumentException;

class AverageCalculationEngine
{
    protected ExpressionLanguage $language;

    /**
     * Tokens numéricos reconhecidos pelo motor de cálculo.
     */
    protected const VALID_TOKENS = [
        'Se', 'Et', 'Rc',
        'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10',
        'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10',
        'RSP1', 'RSP2', 'RSP3', 'RSP4', 'RSP5', 'RSP6', 'RSP7', 'RSP8', 'RSP9', 'RSP10',
        'RSPS1', 'RSPS2', 'RSPS3', 'RSPS4', 'RSPS5', 'RSPS6', 'RSPS7', 'RSPS8', 'RSPS9', 'RSPS10',
        'RSPM1', 'RSPM2', 'RSPM3', 'RSPM4', 'RSPM5', 'RSPM6', 'RSPM7', 'RSPM8', 'RSPM9', 'RSPM10'
    ];

    public function __construct()
    {
        // Sandbox fechado sem funções nativas do PHP
        $this->language = new ExpressionLanguage();
    }

    /**
     * Valida sintaticamente uma fórmula sem executar código perigoso.
     */
    public function validateFormula(string $formula): bool
    {
        try {
            // Teste sintático com valores neutros
            $sampleValues = [];
            foreach (self::VALID_TOKENS as $token) {
                $sampleValues[$token] = 1.0;
            }

            $this->language->evaluate($formula, $sampleValues);
            return true;
        } catch (\Throwable $e) {
            throw new InvalidArgumentException("Fórmula inválida: " . $e->getMessage());
        }
    }

    /**
     * Executa o cálculo seguro da média acadêmica.
     *
     * @param string $formula Expressão matemática configurada (ex: '(E1 + E2 + E3 + E4) / 4')
     * @param array<string, float> $stageScores Notas das etapas e recuperações
     * @param bool $replaceLowestScoreWithRemedial Se deve substituir a menor nota pela recuperação final
     * @return float Média calculada com precisão decimal
     */
    public function calculate(
        string $formula,
        array $stageScores,
        bool $replaceLowestScoreWithRemedial = false
    ): float {
        $variables = $stageScores;

        // Se configurado, substitui a menor nota de etapa caso a nota do exame final seja superior
        if ($replaceLowestScoreWithRemedial && isset($variables['Rc']) && is_numeric($variables['Rc'])) {
            $rc = (float) $variables['Rc'];
            $lowestKey = null;
            $lowestValue = PHP_FLOAT_MAX;

            for ($i = 1; $i <= 10; $i++) {
                $key = "E{$i}";
                if (isset($variables[$key]) && is_numeric($variables[$key])) {
                    if ((float) $variables[$key] < $lowestValue) {
                        $lowestValue = (float) $variables[$key];
                        $lowestKey = $key;
                    }
                }
            }

            if ($lowestKey !== null && $rc > $lowestValue) {
                $variables[$lowestKey] = $rc;
            }
        }

        // Calcula a soma (Se) e o total de etapas (Et) dinamicamente caso não fornecidos
        if (!isset($variables['Se']) || !isset($variables['Et'])) {
            $sum = 0.0;
            $count = 0;
            for ($i = 1; $i <= 10; $i++) {
                if (isset($variables["E{$i}"])) {
                    $sum += (float) $variables["E{$i}"];
                    $count++;
                }
            }
            $variables['Se'] = $variables['Se'] ?? $sum;
            $variables['Et'] = $variables['Et'] ?? ($count > 0 ? $count : 1);
        }

        $result = $this->language->evaluate($formula, $variables);

        return round((float) $result, 3);
    }
}
```

---

## 5. Endpoints RESTful no Laravel 13

Todos os endpoints operam sob o prefixo `/api/v1/educa/evaluation-rules` com autenticação via `Sanctum` e validação multi-tenant automática pelo `TenantScope`.

### 5.1. Tabela de Rotas
| Método | Endpoint | Ação / Controller | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/educa/evaluation-rules` | `EvaluationRuleController@index` | Lista regras de avaliação da instituição |
| `POST` | `/api/v1/educa/evaluation-rules` | `EvaluationRuleController@store` | Cadastra nova regra de avaliação acadêmica |
| `GET` | `/api/v1/educa/evaluation-rules/{id}` | `EvaluationRuleController@show` | Detalhes completos da regra, recuperações e fórmulas |
| `PUT` | `/api/v1/educa/evaluation-rules/{id}` | `EvaluationRuleController@update` | Atualiza parâmetros, médias e progressão |
| `DELETE` | `/api/v1/educa/evaluation-rules/{id}` | `EvaluationRuleController@destroy` | Soft-delete da regra (se sem matrículas ativas) |
| `POST` | `/api/v1/educa/evaluation-rules/simulate` | `EvaluationSimulatorController@simulate` | **Simulador de Médias**: Testa fórmulas e arredondamento |
| `GET` | `/api/v1/educa/formula-averages` | `FormulaAverageController@index` | Lista fórmulas de média disponíveis |
| `POST` | `/api/v1/educa/formula-averages` | `FormulaAverageController@store` | Cadastra e valida sintaxe de fórmula matemática |
| `GET` | `/api/v1/educa/rounding-tables` | `RoundingTableController@index` | Lista tabelas de arredondamento e réguas |
| `POST` | `/api/v1/educa/rounding-tables` | `RoundingTableController@store` | Cadastra tabela e faixas conceituais |
| `POST` | `/api/v1/educa/evaluation-rules/assign-series` | `EvaluationRuleSeriesController@assign` | Vincula regra de avaliação a séries e ano letivo |

---

## 6. Contratos de Tipagem TypeScript (`@sysgov/sdk`)

Localização: `packages/sdk/src/types/educa/evaluation-rules.ts`

```typescript
export enum NoteType {
  NONE = 0,
  NUMERIC = 1,
  CONCEPTUAL = 2,
  NUMERIC_AND_CONCEPTUAL = 3,
}

export enum ProgressionType {
  CONTINUOUS = 1,
  NON_CONTINUOUS_AVERAGE_AND_PRESENCE = 2,
  NON_CONTINUOUS_ONLY_AVERAGE = 3,
  NON_CONTINUOUS_MANUAL = 4,
  NON_CONTINUOUS_MANUAL_CYCLE = 5,
}

export enum PresenceType {
  GENERAL_UNIFIED = 1,
  BY_CURRICULUM_COMPONENT = 2,
}

export enum DescriptiveOpinionType {
  NONE = 0,
  STAGE_DESCRIPTOR = 1,
  STAGE_COMPONENT = 2,
  STAGE_GENERAL = 3,
  ANNUAL_DESCRIPTOR = 4,
  ANNUAL_COMPONENT = 5,
  ANNUAL_GENERAL = 6,
}

export enum ParallelRemedialType {
  NONE = 0,
  PER_STAGE = 1,
  PER_SPECIFIC_STAGES = 2,
}

export enum ParallelRemedialCalculationType {
  REPLACE_IF_HIGHER = 1,
  AVERAGE_WITH_STAGE = 2,
  SUM_POINTS = 3,
}

export enum RoundingActionType {
  DO_NOT_ROUND = 0,
  ROUND_DOWN = 1,
  ROUND_UP = 2,
  ROUND_TO_EXACT_DECIMAL = 3,
}

export interface RoundingTableValue {
  id: string;
  name: string; // Ex: "A", "B", "Excelente"
  description?: string;
  minValue: number;
  maxValue: number;
  action: RoundingActionType;
  exactDecimalPlace?: number;
  orderIndex: number;
}

export interface RoundingTable {
  id: string;
  name: string;
  noteType: NoteType;
  roundNote: boolean;
  normalizeAverage: boolean;
  values: RoundingTableValue[];
}

export interface FormulaAverage {
  id: string;
  name: string;
  formula: string; // Ex: "(E1 + E2 + E3 + E4) / 4"
  formulaType: 1 | 2; // 1=Final, 2=Recuperação
  replaceLowestScoreWithRemedial: boolean;
}

export interface EvaluationRule {
  id: string;
  institutionId: string;
  name: string;
  noteType: NoteType;
  progressionType: ProgressionType;
  presenceType: PresenceType;
  descriptiveOpinionType: DescriptiveOpinionType;
  minAverage: number;
  minRemedialAverage?: number;
  minPresencePercentage: number;
  ignorePresenceCheck: boolean;
  parallelRemedialType: ParallelRemedialType;
  parallelRemedialCalcType: ParallelRemedialCalculationType;
  minParallelRemedialAverage?: number;
  maxGeneralScore: number;
  minGeneralScore: number;
  decimalPlaces: number;
  allowCourseDependency: boolean;
  maxDependencyDisciplines: number;
  maxDependencyEnrollments: number;
  autoFailAfterDependencies: boolean;
  automaticReprobation: boolean;
  pointsCumulative: boolean;
  formulaAverage?: FormulaAverage;
  formulaRemedial?: FormulaAverage;
  roundingTable?: RoundingTable;
  conceptualRoundingTable?: RoundingTable;
}

export interface SimulationRequest {
  formula: string;
  scores: Record<string, number>; // { E1: 5.0, E2: 7.5, E3: 6.0, E4: 4.5, Rc: 7.0 }
  replaceLowestScoreWithRemedial?: boolean;
  roundingTableId?: string;
}

export interface SimulationResponse {
  rawCalculatedAverage: number;
  roundedAverage: number;
  conceptualLabel?: string;
  isApproved: boolean;
  appliedFormula: string;
  variablesUsed: Record<string, number>;
}
```

---

## 7. Componente de UI: Simulador de Fórmulas e Regras (`@sysgov/ui`)

Localização: `apps/web/src/modules/educa/components/EvaluationSimulator.tsx`  
Seguindo estritamente as regras de design do **SYSGOV** (Tailwind v4, tokens pré-definidos, e **`JetBrains Mono`** mandatória para todas as fórmulas, variáveis, notas e resultados numéricos).

```tsx
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@sysgov/ui/card';
import { Button } from '@sysgov/ui/button';
import { Input } from '@sysgov/ui/input';
import { Label } from '@sysgov/ui/label';
import { Badge } from '@sysgov/ui/badge';
import { Calculator, Play, CheckCircle2, XCircle } from 'lucide-react';
import type { SimulationResponse } from '@sysgov/sdk/educa/evaluation-rules';

export const EvaluationSimulator: React.FC = () => {
  const [formula, setFormula] = useState('(E1 + E2 + E3 + E4) / 4');
  const [e1, setE1] = useState('5.5');
  const [e2, setE2] = useState('6.0');
  const [e3, setE3] = useState('4.0');
  const [e4, setE4] = useState('7.5');
  const [rc, setRc] = useState('8.0');
  const [replaceLowest, setReplaceLowest] = useState(true);
  const [minAverage, setMinAverage] = useState('6.0');

  const [simulationResult, setSimulationResult] = useState<SimulationResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSimulate = async () => {
    setLoading(true);
    // Chamada à API /api/v1/educa/evaluation-rules/simulate
    setTimeout(() => {
      // Simulação ilustrativa
      const scores = { E1: parseFloat(e1), E2: parseFloat(e2), E3: parseFloat(e3), E4: parseFloat(e4) };
      let effectiveScores = { ...scores };
      if (replaceLowest && parseFloat(rc) > 4.0) {
        effectiveScores.E3 = parseFloat(rc); // substitui a menor (4.0 vira 8.0)
      }
      const raw = (effectiveScores.E1 + effectiveScores.E2 + effectiveScores.E3 + effectiveScores.E4) / 4;
      const rounded = Math.round(raw * 10) / 10;
      setSimulationResult({
        rawCalculatedAverage: raw,
        roundedAverage: rounded,
        conceptualLabel: rounded >= 7.0 ? 'Pleno (B)' : 'Suficiente (C)',
        isApproved: rounded >= parseFloat(minAverage),
        appliedFormula: formula,
        variablesUsed: { ...effectiveScores, Rc: parseFloat(rc) },
      });
      setLoading(false);
    }, 300);
  };

  return (
    <Card className="border-border/60 bg-card/95 shadow-lg backdrop-blur">
      <CardHeader className="border-b border-border/40 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold">Simulador de Fórmulas de Média e Arredondamento</CardTitle>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            SYS-Educa / Math Engine
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-5">
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Fórmula Matemática (AST Parser)</Label>
          <Input
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            className="font-mono text-sm tracking-wide bg-muted/40 font-semibold text-primary"
            placeholder="Ex: (E1 + E2 + E3 + E4) / 4"
          />
          <p className="text-[11px] text-muted-foreground">
            Tokens suportados: <code className="font-mono text-foreground">Se</code> (Soma), <code className="font-mono text-foreground">Et</code> (Total Etapas), <code className="font-mono text-foreground">E1..E10</code> (Notas), <code className="font-mono text-foreground">Rc</code> (Recuperação Final).
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Etapa 1 (E1)</Label>
            <Input value={e1} onChange={(e) => setE1(e.target.value)} className="font-mono text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Etapa 2 (E2)</Label>
            <Input value={e2} onChange={(e) => setE2(e.target.value)} className="font-mono text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Etapa 3 (E3)</Label>
            <Input value={e3} onChange={(e) => setE3(e.target.value)} className="font-mono text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Etapa 4 (E4)</Label>
            <Input value={e4} onChange={(e) => setE4(e.target.value)} className="font-mono text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-amber-500 font-medium">Recup. Final (Rc)</Label>
            <Input value={rc} onChange={(e) => setRc(e.target.value)} className="font-mono text-sm border-amber-500/40" />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/40 pt-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="subst-menor"
              checked={replaceLowest}
              onChange={(e) => setReplaceLowest(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <Label htmlFor="subst-menor" className="text-xs cursor-pointer">
              Substituir menor nota de etapa pela recuperação final caso Rc seja maior
            </Label>
          </div>
          <Button onClick={handleSimulate} disabled={loading} size="sm" className="gap-2">
            <Play className="h-4 w-4" />
            Executar Simulação
          </Button>
        </div>

        {simulationResult && (
          <div className="rounded-lg border border-border/70 bg-muted/20 p-4 space-y-3 animate-in fade-in-50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resultado do Cálculo</span>
              {simulationResult.isApproved ? (
                <Badge className="bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 border-emerald-600/30 gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Aprovado por Média
                </Badge>
              ) : (
                <Badge className="bg-rose-600/15 text-rose-600 dark:text-rose-400 border-rose-600/30 gap-1.5">
                  <XCircle className="h-3.5 w-3.5" /> Retido / Reprovado
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 font-mono text-sm pt-1">
              <div>
                <span className="text-[11px] text-muted-foreground block font-sans">Média Bruta</span>
                <span className="text-base font-bold text-foreground">{simulationResult.rawCalculatedAverage.toFixed(3)}</span>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block font-sans">Média Arredondada</span>
                <span className="text-base font-bold text-primary">{simulationResult.roundedAverage.toFixed(1)}</span>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block font-sans">Conceito Mapeado</span>
                <span className="text-base font-bold text-indigo-500">{simulationResult.conceptualLabel}</span>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block font-sans">Média Mínima Exigida</span>
                <span className="text-base font-bold text-muted-foreground">{minAverage}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
```
