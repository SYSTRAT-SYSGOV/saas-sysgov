# Tarefas de Engenharia Reversa e Reconstrução — Servidores

> Plano executável de migração e reconstrução do módulo de Servidores e Corpo Docente no SYS-Educa (SYSGOV).
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Pré-requisitos

- Módulo canônico `People` consolidado no SYSGOV Core (`App\Models\Person`).
- Módulo `School` implementado com suporte a multi-tenancy e chaves primárias UUID v7.
- Tabela de catálogo de vínculos funcionais (`educa_bond_types`) e funções de servidores (`educa_employee_roles`).
- Infraestrutura de banco de dados compatível com PostgreSQL ou MySQL 8.0+ LTS.

---

## Tarefas

### T-01 — Entidade Canônica de Servidor (`core_employees`)
- **Origem no legado:** `app/Models/Employee.php`, `pmieducar.servidor`.
- **Descrição:** Implementar a entidade de domínio `Employee` estendendo `Person` via `person_id`, contemplando carga horária máxima semanal, escolaridade formal e flags regulatórias (multi-seriado, complementação pedagógica).
- **Critério de pronto:** Migration criada com campos tipados, chave estrangeira para `tenants` e `people`, e modelo Eloquent com métodos de conveniência.

### T-02 — Múltiplas Funções e Matrículas Funcionais (`core_employee_roles`)
- **Origem no legado:** `app/Models/LegacyEmployeeRole.php`, `pmieducar.servidor_funcao`.
- **Descrição:** Criar entidade associativa para permitir que o servidor possua múltiplos cargos/funções na rede municipal, com matrícula funcional independente para cada papel.
- **Critério de pronto:** Suporte a acúmulo legal de cargos validado por regras de negócio e bloqueio de matrículas duplicadas no mesmo tenant.

### T-03 — Motor de Lotação e Alocação Escolar Semanal (`educa_teacher_allocations`)
- **Origem no legado:** `app/Models/EmployeeAllocation.php`, `pmieducar.servidor_alocacao`, `educar_servidor_alocacao_cad.php`.
- **Descrição:** Desenvolver o subsistema de alocação de servidores em escolas por ano letivo, separando as horas de regência em sala, horas de atividade pedagógica e horas excedentes semanais.
- **Critério de pronto:** Validação transacional de que a soma das horas alocadas não ultrapassa o teto contratual do servidor, e garantia de que pelo menos 1/3 da jornada é preservada para hora-atividade.

### T-04 — Catálogo de Habilitações Curriculares Docentes (`educa_teacher_qualifications`)
- **Origem no legado:** `pmieducar.servidor_disciplina`, `Portabilis_Business_Professor.php:306-341`.
- **Descrição:** Estruturar tabela de mapeamento entre o servidor docente e os componentes curriculares que ele possui habilitação acadêmica para ministrar.
- **Critério de pronto:** Associação funcional permitindo filtrar professores aptos para cada disciplina durante a alocação em turmas e horários.

### T-05 — Módulo de Afastamentos e Licenças com Auditoria (`educa_teacher_withdrawals`)
- **Origem no legado:** `app/Models/EmployeeWithdrawal.php`, `pmieducar.servidor_afastamento`.
- **Descrição:** Criar controle de histórico de afastamentos médicos, licenças e suspensões temporárias, substituindo o sequenciador manual `MAX()+1` por chave primária UUID e bloqueio de concorrência.
- **Critério de pronto:** Registro de afastamento desativa temporariamente a regência em sala do docente e abre vaga formal para indicação de substituto.

### T-06 — Registro e Auditoria de Faltas e Atrasos Funcionais (`educa_employee_absences`)
- **Origem no legado:** `pmieducar.falta_atraso`, `ieducar/intranet/educar_falta_atraso_cad.php`.
- **Descrição:** Implementar registro de ocorrências de frequência do servidor com distinção entre falta justificada/injustificada, cômputo de horas/minutos e armazenamento seguro de atestado médico.
- **Critério de pronto:** Upload sanitizado de atestados com URL temporária e integração com o relatório de assiduidade funcional.

### T-07 — Formação Acadêmica e Integração Censo Escolar INEP
- **Origem no legado:** `EmployeeGraduation.php`, `EmployeePosgraduate.php`, `modules.educacenso_cod_docente`.
- **Descrição:** Estruturar armazenamento de cursos de nível superior, faculdades, ano de conclusão e código único do docente no INEP para exportação do Censo.
- **Critério de pronto:** Validação estrita do código INEP de 12 dígitos e integração sem inconsistências com o exportador do Educacenso.

---

## Tarefas de Teste

### TT-01 — Teste Unitário de Validação de Carga Horária Semanal
- Validar se a tentativa de alocação que excede a carga horária contratual declarada dispara exceção de domínio impeditiva.

### TT-02 — Teste de Validação da Proporção da Lei do Piso (1/3 Hora-Atividade)
- Testar se alocações docentes respeitam o teto de 2/3 em sala de aula e exigem o mínimo de 1/3 em horas extraclasse.

### TT-03 — Teste de Concorrência na Emissão de Afastamentos
- Simular duas requisições paralelas de afastamento para o mesmo servidor e confirmar a ausência de colisões de chave primária ou sequencial.

### TT-04 — Teste de Consulta AJAX de Servidores Habilitados
- Executar requisições de busca por escola/ano/disciplina e verificar se apenas docentes ativos com a flag de professor e habilitação ativa são retornados.

---

## Tarefas de Migração de Dados

### TM-01 — Migração de Servidores e Funções
- Extrair `pmieducar.servidor` e `pmieducar.servidor_funcao` gerando UUIDs canônicos vinculados ao `person_id` correspondente do SYSGOV Core.

### TM-02 — Migração Histórica de Alocações Escolares
- Migrar `pmieducar.servidor_alocacao` convertendo os campos de horários em formato ISO time e mapeando os IDs de escolas e períodos para seus respectivos UUIDs.

### TM-03 — Migração de Histórico de Afastamentos e Faltas
- Migrar `pmieducar.servidor_afastamento` e `pmieducar.falta_atraso`, preservando as datas originais de concessão e o histórico de justificativas.

---

## Ordem Sugerida

1. `T-01` (Entidade Canônica de Servidor)
2. `T-02` (Múltiplas Funções e Matrículas Funcionais)
3. `T-04` (Catálogo de Habilitações Curriculares Docentes)
4. `T-03` (Motor de Lotação e Alocação Escolar Semanal)
5. `T-05` (Módulo de Afastamentos e Licenças)
6. `T-06` (Registro de Faltas e Atrasos)
7. `T-07` (Formação Acadêmica e Educacenso)
8. `TT-01` a `TT-04` (Bateria de Testes Automatizados)
9. `TM-01` a `TM-03` (Carga e Validação de Migração Histórica)

**Bloqueios:** `T-03` depende da conclusão de `T-01` e `T-02`. `TT-02` depende da conclusão de `T-03`.

---

## Lacunas Pendentes (🔴)

- 🔴 **Auditoria de Substituição Docente:** Falta modelagem formal de vínculo de substituição com intervalo de vigência fechado (`substitute_teacher_allocations`).
- 🔴 **Tratamento de Dados Médicos Sensíveis (LGPD):** Motivos de afastamento por Classificação Internacional de Doenças (CID) e atestados anexados carecem de criptografia e controle de acesso restrito no legado.
- 🔴 **Inconsistência de Tipos de Carga Horária:** No legado, a coluna `carga_horaria` alterna entre representação como inteiro em horas, string e tipo `time`/`interval` nas queries brutas.
