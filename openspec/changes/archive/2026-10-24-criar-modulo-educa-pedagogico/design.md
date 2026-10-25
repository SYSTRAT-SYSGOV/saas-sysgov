# Design Técnico: Submódulo Pedagógico (SYS-Educa)

## Context
O submódulo `pedagogico` implementa a operação do professor e da equipe pedagógica, orquestrando Diário de Classe, Registro de Frequência e Apuração de Notas/Médias. Ele consome diretamente os modelos de `core` (anos letivos, calendários e turmas) e `secretaria` (matrículas e enturmações ativas). Ver `proposal.md` para contexto de negócio.

## Goals / Non-Goals

**Goals:**
- Prover motor de avaliação aritmético seguro sem `eval()` (ADR 002), interpretando fórmulas declarativas de médias escolares.
- Garantir que nenhum registro de diário de classe seja lançado em dia não letivo.
- Permitir chamada e apuração de frequência com justificativa legal de faltas.
- Manter trilha imutável em todas as mutações via `AuditLogger::record('educa', ...)`.

**Non-Goals:**
- Não inclui neste momento a emissão do boletim gráfico em PDF nem a sincronização para o portal do aluno (previstos em add-on subsequente).
- Não inclui alocação de carga horária docente (escopo do submódulo `servidores` - Lei do Piso).

## Decisions

### D-01: Motor Declarativo de Avaliação sem `eval()` (ADR 002)
- **Decisão**: Criar a classe de domínio `Modules\Educa\Services\EvaluationFormulaEvaluator` utilizando tokenização e parsing de expressões (Shunting-yard algorithm ou parser recursivo descendente). A engine suporta variáveis de etapas (`E1`, `E2`, `E3`, `E4`, `REC`, `EX`), operadores aritméticos (`+`, `-`, `*`, `/`) e parênteses.
- **Alternativas consideradas**:
  - `eval()` do PHP: Rejeitado categoricamente por vulnerabilidade de segurança e injeção de código.
  - Symfony ExpressionLanguage: Boa alternativa, porém o parser próprio garante controle determinístico de arredondamentos, limites de notas e isolamento sem dependências externas adicionais.

### D-02: Vínculo de Assiduidade com Enturmações Ativas
- **Decisão**: A apuração de presenças e faltas vincula-se à `educa_class_enrollments`. Alunos transferidos ou remanejados antes da data da aula não aparecem na folha de chamada; alunos que entraram após a data da aula não recebem falta retroativa.
- **Alternativas consideradas**:
  - Vincular presença diretamente à matrícula: Rejeitado, pois turmas diferentes têm frequências e diários distintos.

### D-03: Validação de Dias Letivos do Calendário Escolar
- **Decisão**: Ao criar uma aula no diário (`educa_class_diaries`), o serviço consulta `educa_calendar_days` da escola/calendário associado. Se a data for feriado ou recesso escolar, a operação é rejeitada com erro 422 (`code=NON_SCHOOL_DAY`).

### D-04: Tabela de Arredondamento Parametrizada
- **Decisão**: O cálculo de notas armazena o valor decimal bruto apurado e o valor arredondado formal da regra municipal (`educa_grade_scales`), garantindo transparência em auditorias pedagógicas e conselhos de classe.

## Risks / Trade-offs

- **[Risco] Fórmulas mal-formadas cadastradas pelo gestor** → **Mitigação**: O serviço valida a sintaxe da fórmula no momento do cadastro da regra de avaliação, executando um teste com valores dummy antes de persistir.
- **[Risco] Lançamento de frequência em lote com concorrência** → **Mitigação**: O registro de presença usa transação atômica (`DB::transaction`) e `upsert` com chave composta `(tenant_id, class_diary_id, class_enrollment_id)`.
