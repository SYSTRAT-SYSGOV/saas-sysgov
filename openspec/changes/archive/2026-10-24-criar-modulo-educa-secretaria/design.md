# Design

## Context

O submódulo `secretaria` do SYS-Educa gerencia a vida escolar dos estudantes. Fontes de referência: engenharia reversa do i-Educar (`docs/legacy/i-educar/_reversa_sdd/Enrollments`, `Cadastro`, `People`), [`AGENTS.md`](file:///c:/laragon/www/saas-sysgov/AGENTS.md) e contratos já aprovados do submódulo `core` (`EducaSchool`, `EducaSchoolClass`, `EducaAcademicYear`, `EducaGrade`).

## Goals / Non-Goals

**Goals:**
- Separar o vínculo acadêmico geral (**matrícula**) da alocação física na turma (**enturmação**).
- Integrar 100% dos dados civis de estudantes e responsáveis ao módulo canônico `Pessoas` (MDM/LGPD), com busca determinística via `documento_hash`.
- Garantir atomicidade na contagem e reserva de vagas em turmas, prevenindo race conditions e sobrelotação.
- Registrar trilha de auditoria completa em `AuditLogger` para todas as mutações e transições de situação de matrícula.

**Non-Goals:**
- Lançamento de notas, frequências diárias e diário de classe (escopo do submódulo `pedagogico`).
- Gestão de quadro de professores e lotação docente (escopo do submódulo `servidores`).
- Roteirização de frotas e linhas (escopo do submódulo `transporte`).

## Decisions

### D-01 — Separação entre Matrícula (`educa_enrollments`) e Enturmação (`educa_class_enrollments`)
- *Decisão*: Uma matrícula representa a inscrição do estudante em uma série e escola para o ano letivo. A enturmação física representa a alocação na sala de aula (`educa_school_classes`), permitindo remanejamentos ao longo do ano sem perder o histórico ou cancelar a matrícula.
- *Alternativa descartada*: Manter turma diretamente na tabela de matrículas como chave única (inviabilizava histórico de remanejamento e enturmações no contraturno AEE).

### D-02 — Vínculo estrito com Pessoas MDM (`aluno_pessoa_id`)
- *Decisão*: O cadastro de aluno referencia `Modules\Pessoas\Models\Pessoa`. É terminantemente proibido duplicar colunas de nome, CPF, RG, data de nascimento e filiação na tabela educacional.
- *Benefício*: Atendimento imediato ao Pilar nº 2 do SYSGOV e conformidade com a LGPD.

### D-03 — Código de Matrícula Atômico (`YYYY-NNNNNN`)
- *Decisão*: O identificador legível da matrícula é sequencial por tenant e ano letivo, gerado com concorrência segura (`DB::transaction` com locking na tabela de controle de sequenciais).

### D-04 — Trava Concorrente de Vagas (`lockForUpdate`)
- *Decisão*: No momento da enturmação, a verificação da lotação máxima e o incremento de `lotacao_efetiva` em `educa_school_classes` executam sob `lockForUpdate()`, impedindo que dois operadores ocupem a última vaga restante da turma simultaneamente.

### D-05 — Licenciamento via Entitlement `educa-secretaria`
- *Decisão*: Registro do módulo `educa-secretaria` no catálogo `Module` com middleware `module-access:educa-secretaria`, exigindo `educa` (core) como dependência ativa obrigatória.

## Risks / Trade-offs

- **[Risco: Aluno sem CPF ou documento civil]** → *Mitigação*: O módulo `Pessoas` suporta cadastro com flag provisória de documento pendente, permitindo matricular o aluno no SYS-Educa e emitindo alerta na ficha cadastral para saneamento posterior com a certidão de nascimento.
- **[Risco: Remanejamento de turma no meio do ano letivo]** → *Mitigação*: A enturmação de origem é encerrada registrando `data_saida`, e uma nova enturmação é aberta na turma de destino registrando `data_entrada`, preservando a rastreabilidade exigida pelo Censo Escolar/INEP.
