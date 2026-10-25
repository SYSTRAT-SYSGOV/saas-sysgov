# Spec Delta

## Purpose
Controla a apuração da frequência diária e por aula dos estudantes enturmados, permitindo cômputo de faltas, justificativas legais e acompanhamento do percentual de assiduidade exigido pela LDB.

## ADDED Requirements

### Requirement: Registro de frequência por estudante enturmado
O sistema SHALL registrar a presença (`presente`), falta simples (`falta`) ou falta justificada (`falta_justificada`) para cada estudante com enturmação ativa na turma na data da aula.

#### Scenario: Chamada diária realizada com sucesso
- **WHEN** o docente registra as presenças e faltas da turma para uma aula
- **THEN** os registros individuais de assiduidade são salvos e vinculados aos alunos e à aula

### Requirement: Justificativa legal e abono de faltas
O sistema SHALL permitir o registro de justificativas de faltas com anexo comprobatório (atestado médico ou declaração legal), recalculando o percentual de faltas abonadas para fins de conselho de classe e auditoria.

#### Scenario: Justificativa de falta médica
- **WHEN** a secretaria ou coordenação lança um atestado médico para abonar faltas de um período
- **THEN** o status das faltas correspondentes é alterado para "falta_justificada" e a justificativa fica registrada

### Requirement: Cálculo acumulado de percentual de presença
O sistema SHALL calcular a taxa de frequência acumulada de cada estudante por componente curricular e total geral, emitindo alerta quando a frequência for inferior a 75% da carga horária prevista na LDB.

#### Scenario: Aluno atingindo percentual crítico de infrequência
- **WHEN** o total de faltas do estudante atinge mais de 25% das aulas dadas
- **THEN** o sistema sinaliza alerta de risco de reprovação por infrequência
