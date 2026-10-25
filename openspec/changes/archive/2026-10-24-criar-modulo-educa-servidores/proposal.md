# Proposta: Submódulo Servidores da Educação (Lotação Docente e Lei do Piso 11.738/2008)

## Why
Com o núcleo acadêmico (`core`), gestão de matrículas (`secretaria`) e o diário de classe/avaliações (`pedagogico`) já estruturados, a rede municipal de educação necessita gerenciar a vida funcional do seu corpo docente e servidores escolares: o submódulo **Servidores da Educação**.

O município precisa administrar o cadastro funcional dos profissionais (professores, diretores, coordenadores e apoio), suas matrículas funcionais e lotações nas escolas da rede (`educa_schools`), com estrita observância à **Lei Federal nº 11.738/2008 (Lei do Piso Salarial Profissional Nacional do Magistério)**, que determina que no máximo **2/3** da jornada semanal seja exercida em regência de classe (interação com educandos) e no mínimo **1/3** seja resguardado para horas-atividade (planejamento pedagógico, estudos e avaliação). Além disso, o sistema deve registrar habilitações curriculares por disciplina, afastamentos temporários (licenças) que inativem alocações e ocorrências de faltas e atrasos para fechamento de folha e auditoria funcional.

## What Changes
- **Extensão Funcional de Servidor Escolar (`Pessoas` MDM)**:
  - Vínculo direto com `Modules\Pessoas\Models\Pessoa` (`pessoa_id`), proibindo duplicação de cadastros civis.
  - Atribuição de funções profissionais (Professor, Diretor, Coordenador Pedagógico, Agente Escolar) e matrículas funcionais distintas.
  - Dados acadêmicos de formação superior e pós-graduação com código identificador único do docente no INEP para o Educacenso.
- **Lotação Escolar e Gestão de Jornada (Lei do Piso 11.738/2008)**:
  - Alocação do docente por unidade escolar (`educa_schools`), ano letivo, turno e dia da semana.
  - Validação estrita de jornada: a soma de horas alocadas não pode exceder a carga horária contratual do servidor.
  - **Trava Legal da Lei do Piso**: Cálculo e fiscalização da proporção de no máximo 2/3 em sala de aula (regência) e no mínimo 1/3 em hora-atividade pedagógica extraclasse.
- **Habilitação Curricular Docente**:
  - Mapeamento dos componentes curriculares (`educa_curriculum_components`) que o professor está apto a ministrar na rede municipal.
- **Afastamentos Temporários e Ocorrências**:
  - Registro de licenças médicas, maternidade e prêmio, com suspensão automática das alocações ativas durante o período do afastamento.
  - Registro de faltas e atrasos funcionais diários com indicação de justificativa legal.

## Capabilities

### New Capabilities
- `educa-servidores-cadastral`: Extensão funcional do servidor sobre o MDM de Pessoas, papéis/funções profissionais, matrículas e dados acadêmicos/INEP.
- `educa-servidores-lotacao-jornada`: Lotação escolar semanal, rateio de carga horária e conformidade com a proporção de 1/3 de hora-atividade da Lei Federal nº 11.738/2008.
- `educa-servidores-afastamentos-faltas`: Gestão de afastamentos e licenças funcionais com desativação temporária de lotações e apuração de faltas/atrasos.

### Modified Capabilities
Nenhuma alteração de requisitos em capacidades existentes.

## Impact
- **Backend (`apps/api/Modules/Educa`)**:
  - Novas migrations para `educa_employees`, `educa_employee_roles`, `educa_employee_allocations`, `educa_teacher_qualifications`, `educa_employee_withdrawals` e `educa_employee_absences`.
  - Novos Models Eloquent com `TenantAware`, `HasUuids` e `SoftDeletes`.
  - Novos serviços de domínio: `EmployeeService`, `AllocationService` (com validação da Lei do Piso) e `WithdrawalService`.
  - Rotas sob `/api/educa/servidores/*` protegidas pelo middleware `module-access:educa-servidores` e permissões `educa.servidores.*`.
  - Registro de auditoria obrigatória em todas as mutações via `AuditLogger::record('educa', ...)`.
- **Integração com Pilares**:
  - `Pessoas`: Cada servidor referencia `pessoa_id`.
  - `OrgChart`: Escolas referenciadas através da relação entre `educa_schools` e `OrgUnit`.
- **Contratos & BDD**:
  - Contrato OpenAPI 3.1 em `apps/api/Modules/Educa/openspec/contracts/servidores.openapi.yaml`.
  - Cenários BDD Gherkin em `apps/api/Modules/Educa/openspec/scenarios/servidores-lotacao-jornada.feature`.
