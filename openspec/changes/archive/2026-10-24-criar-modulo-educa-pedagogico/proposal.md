# Proposta: Submódulo Pedagógico (Diário de Classe, Frequência e Avaliação sem eval)

## Why
Com o núcleo acadêmico (`core`) e a gestão de matrículas/enturmações (`secretaria`) implementados e consolidados, o SYS-Educa necessita da sua camada operacional docente: o submódulo **Pedagógico**. 

Os professores e coordenadores pedagógicos necessitam registrar diariamente os conteúdos ministrados, apurar a frequência dos alunos enturmados e lançar notas/conceitos avaliativos por etapa letiva. Além disso, as regras do legado i-Educar e as diretrizes do SYSGOV exigem um motor de cálculo de médias estritamente seguro, eliminando o uso de `eval()` (ADR 002) por meio de um avaliador declarativo de fórmulas aritméticas e regras de arredondamento.

## What Changes
- **Diário de Classe**: Registro formal de aulas ministradas por turma, componente curricular e data, validando se a data é um dia letivo oficial cadastrado no calendário escolar (`calendar_days.is_school_day = true`).
- **Registro de Frequência Escolar**: Lançamento de presenças e faltas por aula/dia letivo para os estudantes com enturmação ativa na turma (`educa_class_enrollments`), com suporte ao abono de faltas justificadas com amparo legal.
- **Motor de Avaliação Declarativo (Sem `eval`)**:
  - Configuração de regras de avaliação por curso/série (tipo de nota: numérica 0-10, conceitual A-D ou parecer descritivo).
  - Fórmulas de cálculo de média das etapas (bimestrais/trimestrais), recuperação paralela e exame final interpretadas de forma declarativa e segura por analisador léxico/sintático em AST, sem execução dinâmica de código.
  - Tabela de arredondamento com regras de piso, teto e intervalos decimais oficiais da rede municipal.
- **Boletim Escolar e Rendimento**: Consolidação de médias e apuração de situação final (Aprovado, Reprovado por Nota, Reprovado por Frequência segundo a regra dos 75% da LDB).

## Capabilities

### New Capabilities
- `educa-pedagogico-diario-classe`: Registro de aulas dadas, objetivos de aprendizagem BNCC e conteúdos ministrados vinculados a dias letivos válidos.
- `educa-pedagogico-frequencia`: Apuração de frequência e faltas por estudante enturmado, cálculo de percentual de frequência e abono de faltas.
- `educa-pedagogico-avaliacao`: Motor declarativo de notas, regras de avaliação, fórmulas de média sem eval e arredondamento oficial.

### Modified Capabilities
Nenhuma alteração de requisitos em especificações existentes (o submódulo consome os dados de enturmação da `secretaria` e dias letivos do `core`).

## Impact
- **Backend (`apps/api/Modules/Educa`)**:
  - Novas migrations para `educa_class_diaries`, `educa_attendance_records`, `educa_evaluation_rules`, `educa_evaluation_formulas`, `educa_grade_scales` e `educa_student_grades`.
  - Novos modelos Eloquent com `TenantAware`, `HasUuids` e `SoftDeletes`.
  - Novo serviço de avaliação com parser declarativo de fórmulas aritméticas (`EvaluationFormulaEvaluator`).
  - Rotas sob `/api/educa/pedagogico/*` protegidas pelo middleware `module-access:educa-pedagogico` e RBAC `educa.pedagogico.*`.
- **Contratos & BDD**:
  - Contrato OpenAPI 3.1 em `apps/api/Modules/Educa/openspec/contracts/pedagogico.openapi.yaml`.
  - Cenários BDD Gherkin em `apps/api/Modules/Educa/openspec/scenarios/pedagogico-diario-avaliacao.feature`.
