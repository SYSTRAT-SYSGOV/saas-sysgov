# educa-frontend-servidores Specification

## Purpose
TBD - created by archiving change criar-modulo-educa-frontend. Update Purpose after archive.

## Requirements

### Requirement: Medidor Visual da Lei do Piso Nacional (1/3 Hora-Atividade)
O painel de lotação docente DEVE (MUST) calcular e exibir graficamente a proporção entre horas em sala de aula (interação com educandos) e horas de trabalho pedagógico (planejamento), alertando violações à Lei Federal 11.738/2008.

#### Scenario: Alocação docente em conformidade com a Lei do Piso
- **GIVEN** um professor com jornada contratual de 40 horas semanais
- **WHEN** o gestor aloca 26 horas em sala de aula e 14 horas em planejamento
- **THEN** o medidor percentual exibe `35.0%` de horas-atividade em `JetBrains Mono` com status verde "Em conformidade com a Lei do Piso (≥ 33.3%)"

#### Scenario: Alocação com excesso de horas em sala de aula
- **GIVEN** um professor com jornada contratual de 40 horas semanais
- **WHEN** o gestor tenta alocar 30 horas em sala de aula (restando apenas 10 horas de atividade)
- **THEN** o medidor percentual exibe `25.0%` em `JetBrains Mono` com alerta vermelho e bloqueio visual de submissão
