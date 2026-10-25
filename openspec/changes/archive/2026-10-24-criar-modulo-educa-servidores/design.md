# Design Técnico: Submódulo Servidores da Educação (SYS-Educa)

## Context
O submódulo `servidores` é responsável pela vida funcional dos educadores e profissionais da educação nas escolas municipais, orquestrando cadastro funcional, lotações escolares semanais, cumprimento da Lei do Piso Salarial Profissional Nacional do Magistério (Lei nº 11.738/2008), habilitações curriculares e controle de afastamentos. Ele consome diretamente os modelos de `core` (`educa_schools`, `educa_academic_years`, `educa_curriculum_components`) e integra-se aos pilares `Pessoas` e `OrgChart`. Ver `proposal.md` para contexto de negócio.

## Goals / Non-Goals

**Goals:**
- Estender `Modules\Pessoas\Models\Pessoa` sem duplicação de dados cadastrais de cidadãos municipais.
- Implementar validador determinístico da proporcionalidade de 1/3 de hora-atividade da Lei Federal nº 11.738/2008.
- Garantir que a carga horária semanal alocada não ultrapasse o contrato do servidor.
- Controlar afastamentos com suspensão automática de alocações ativas.
- Manter trilha imutável em todas as mutações via `AuditLogger::record('educa', ...)`.

**Non-Goals:**
- Não inclui folha de pagamento ou cálculo de vencimentos financeiros (escopo do módulo RH / Folha do SYSGOV).
- Não inclui montagem do algoritmo de geração automática de quadro de horários (quadro de horários consome as alocações em fase posterior).

## Decisions

### D-01: Extensão Funcional de Servidor sobre o Pilar Pessoas
- **Decisão**: A tabela `educa_employees` armazena exclusivamente os atributos funcionais escolares (`pessoa_id`, `carga_horaria_semanal`, `escolaridade`, `codigo_inep_docente`, `ativo`). A identidade civil, CPF, endereço e contatos residem exclusivamente em `pessoas`.
- **Alternativas consideradas**:
  - Criar tabela própria de professores com CPF e nome: Rejeitado categoricamente pelo Pilar 2 do SYSGOV (MDM Pessoas).

### D-02: Múltiplas Funções e Matrículas Funcionais
- **Decisão**: Criar a tabela `educa_employee_roles` permitindo que um servidor possua N vínculos/papéis (ex.: Professor 20h e Coordenador 20h), cada qual com matrícula funcional distinta e identificador booleano `is_docente`.
- **Alternativas consideradas**:
  - Guardar uma única matrícula na tabela de servidor: Rejeitado, pois é comum na rede municipal o mesmo servidor ter duas matrículas por concurso público ou função gratificada.

### D-03: Motor de Validação da Lei do Piso (Lei nº 11.738/2008)
- **Decisão**: O serviço `AllocationService` valida que, para qualquer alocação de servidor com função docente ativa, a carga horária extraclasse (`horas_atividade`) deve corresponder a no mínimo um terço (1/3) da jornada total alocada (`horas_regencia + horas_atividade`), aplicando a regra matemática:
  $$\text{horas\_atividade} \ge \text{round}\left(\frac{\text{horas\_regencia} + \text{horas\_atividade}}{3}, 2\right)$$
  Caso a regra seja violada, a requisição é rejeitada com erro HTTP 422 (`code = LEI_DO_PISO_VIOLATION`).
- **Alternativas consideradas**:
  - Deixar o controle de horas-atividade manual a critério do diretor: Rejeitado, pois gera passivos trabalhistas municipais e descumprimento de apontamentos do Tribunal de Contas (TCE).

### D-04: Suspensão Temporária de Alocações em Afastamentos
- **Decisão**: Ao cadastrar uma licença na tabela `educa_employee_withdrawals` (`data_inicio`, `data_fim`), o sistema marca o servidor com status `afastado` durante a vigência do afastamento, bloqueando o lançamento de aulas no diário de classe pelo docente afastado e liberando a vaga para professor substituto.

### D-05: RBAC e Isolamento Multi-Tenant
- **Decisão**: Todas as tabelas contêm `tenant_id` bigint (`foreignId`) e PK UUID (`HasUuids`). Permissões seguem `educa.servidores.{recurso}.{acao}` e rotas sob `/api/educa/servidores` com middleware `module-access:educa-servidores`.

## Risks / Trade-offs

- **[Risco] Servidor com horas alocadas fracionadas (ex: minutos)** → **Mitigação**: O modelo armazena horas decimais (`decimal(5,2)`) permitindo frações exatas de 50 minutos por hora-aula (ex: 5 aulas de 50 min = 4.17 horas).
- **[Risco] Afastamento retroativo cadastrado após início da licença** → **Mitigação**: O serviço permite lançamento com justificativa e recalcula o status das alocações correspondentes com auditoria detalhada no `AuditLogger`.
