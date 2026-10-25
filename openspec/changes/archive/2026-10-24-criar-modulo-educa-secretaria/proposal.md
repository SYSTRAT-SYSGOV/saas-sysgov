# Proposal

## Why

A gestão da vida escolar dos estudantes municipais exige uma separação rigorosa entre o vínculo acadêmico com a escola (**matrícula**) e a alocação física em sala de aula (**enturmação**). O legado i-Educar (`docs/legacy/i-educar/_reversa_sdd/Enrollments`) confirma que a falta de controle determinístico gerava concorrência em número de chamada, enturmações sem vagas e inconsistência em transferências e remanejamentos.

Além disso, conforme o Pilar Fundacional nº 2 do SYSGOV (`AGENTS.md` §1.1 e `docs/architecture/pilares-fundacionais-sysgov.md`), é **estritamente proibido** duplicar o cadastro de pessoas em tabelas próprias (`alunos`). Todo estudante, responsável e servidor municipal deve ser obrigatoriamente unificado no módulo transversal `Pessoas` (MDM & LGPD) com hash determinístico de documento (`documento_hash`).

Esta change implementa o submódulo vertical **`secretaria`** do **SYS-Educa**, estabelecendo o ciclo de vida completo de matrículas, enturmações com controle de vagas e horários, fichas individuais dos alunos e histórico de transferências escolares.

## What Changes

- **Integração com Pessoas (MDM)**: Estudantes e responsáveis vinculam-se como `pessoa_id` apontando para `Modules\Pessoas\Models\Pessoa`.
- **Matrícula Escolar (`educa_enrollments`)**: Vínculo do aluno com a escola, curso, série e ano letivo, com gerador atômico de número de matrícula e ciclo de vida (`ativa`, `remanejada`, `transferida`, `cancelada`, `concluida`, `abandonada`, `falecida`).
- **Enturmação do Estudante (`educa_class_enrollments`)**: Alocação na turma física (`educa_school_classes`), controle de vagas em tempo real, validação de choque de horários (exceto AEE/contraturno) e ordenação automática do número de chamada.
- **Ficha Cadastral e Complementar do Aluno (`educa_student_profiles`)**: Dados de certidão civil (termo, folha, livro, cartório), NIS, SUS, Bolsa Família, necessidades educacionais especiais (AEE/laudo) e opção por transporte escolar público.
- **Vínculo de Responsáveis Legais (`educa_student_guardians`)**: Mapeamento de parentesco (`mae`, `pai`, `responsavel_legal`, etc.) entre pessoas físicas cadastradas no MDM.
- **Transferências e Remanejamentos (`educa_transfers`)**: Processo de transferência interna (remanejamento entre turmas), transferência para fora da rede municipal e recebimento de alunos de outras redes com emissão de guia e ficha individual.
- **RBAC**: Permissões granulares no formato `educa.secretaria.{recurso}.{acao}` e ativação sob o entitlement `module-access:educa-secretaria`.

## Capabilities

### New Capabilities
- `educa-secretaria-matriculas`: Ciclo de vida da matrícula do estudante, geração sequencial de código de matrícula e histórico acadêmico anual.
- `educa-secretaria-enturmamento`: Alocação do aluno em turmas com controle de vagas, prevenção de sobreposição de horário e atribuição sequencial do número de chamada.
- `educa-secretaria-ficha-aluno`: Ficha cadastral e pedagógica do aluno integrada ao MDM de Pessoas, dados de certidão civil, benefícios sociais e responsáveis legais.

### Modified Capabilities
<!-- Nenhuma capability existente tem seus requisitos alterados. -->

## Impact

- **Backend**: Módulo `Modules/Educa/Submodules/Secretaria` (ou estruturação direta em `Modules/Educa/`), consumindo `Modules/Pessoas` e os contratos do submódulo `core` (`EducaSchool`, `EducaGrade`, `EducaSchoolClass`, `EducaAcademicYear`).
- **Segurança & Multi-Tenant**: Isolamento lógico obrigatório com `tenant_id` bigint (`tenants.id`), PKs em UUID (`HasUuids`) e auditoria imutável via `AuditLogger`.
- **Frontend**: Componentes no `web-client` reutilizarão `<PessoaPicker>` do `@sysgov/ui` para seleção de estudantes e responsáveis.
