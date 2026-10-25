# Mapeamento do Legado: Pessoas, Alunos, Servidores e Unificação (`People`, `Cadastro`, `Servidores`, `Unification`)

> Mapeamento de Engenharia Reversa para Reconstrução no Módulo `SYS-Educa` (SaaS SYSGOV)
> Padrão: JetBrains Mono para termos técnicos e tabelas.

---

## 1. Visão Geral e Fronteiras com o SYSGOV Core

No I-Educar legado, o subsistema de pessoas era fragmentado em 3 schemas PostgreSQL distintos (`cadastro.*`, `portal.*`, `pmieducar.*`), gerando duplicidade extrema de campos para pessoas físicas, jurídicas, documentos e funcionários.

No **SYSGOV**, o cadastro básico de pessoa é um **serviço corporativo compartilhado** (`App\Models\Person`), unificando o cidadão entre Secretarias (Saúde, Educação, Fazenda, Assistência Social).
O **SYS-Educa** atua estritamente estendendo as especificidades escolares do educando e a vida funcional pedagógica do docente.

---

## 2. Inventário de Tabelas Legadas vs Modelo Canônico SYSGOV

| Tabela Legada I-Educar | Schema Legado | Destino no SYSGOV | Observações de Migração / Reconstrução |
| :--- | :--- | :--- | :--- |
| `cadastro.pessoa` | `cadastro` | `App\Models\Person` (SYSGOV Core) | Nome, tipo (Física/Jurídica), data de cadastro. |
| `cadastro.fisica` | `cadastro` | `App\Models\Person` (SYSGOV Core) | Sexo, data de nascimento, nome social, estado civil, nacionalidade, naturalidade. |
| `cadastro.documento` | `cadastro` | `App\Models\Person` (SYSGOV Core) | CPF, RG, Órgão Emissor, Data de Emissão, Título de Eleitor, Certidões. |
| `cadastro.fisica_deficiencia` | `cadastro` | `educa_student_special_needs` | Necessidades educacionais especiais (AEE) e laudos médicos. |
| `pmieducar.aluno` | `pmieducar` | `educa_students` | Perfil educacional: código INEP, NIS, tipo de responsável, chave para `person_id`. |
| `pmieducar.aluno_beneficio` | `pmieducar` | `educa_student_social_benefits` | Programas sociais (Bolsa Família, Auxílio Brasil). |
| `pmieducar.quadro_horario` | `pmieducar` | `educa_student_medical_records` | Ficha médica escolar, alergias, medicações e restrições. |
| `portal.funcionario` | `portal` | `App\Models\User` + `educa_teachers` | Credenciais vão para `User` (Sanctum). Dados docentes vão para `educa_teachers`. |
| `pmieducar.servidor_alocacao` | `pmieducar` | `educa_teacher_allocations` | Lotação do professor, dias da semana, horários, hora-aula e hora-atividade. |
| `pmieducar.log_unificacao` | `pmieducar` | `educa_student_unifications` | Registro de auditoria e snapshot de fusão de alunos duplicados. |
| `pmieducar.log_unificacao_old_data` | `pmieducar` | Coluna `json` em `educa_student_unifications` | Payload serializado para suporte a rollback completo da fusão. |

---

## 3. Regras de Negócio e Algoritmos Críticos Extraídos

### 3.1. Resolução do Responsável Legal (`tipo_responsavel`)
- No legado (`LegacyStudent::getGuardianName` e `getGuardianCpf`), o educando possui vínculos familiares diretos:
  - `'m'` = Mãe (prioritária no Censo Escolar e no Bolsa Família)
  - `'p'` = Pai
  - `'r'` = Responsável Legal formal (com guarda judicial / tutela)
  - `'a'` = Ambos os pais conjuntamente
- **Regra SYSGOV:** Se menor de 18 anos, a matrícula escolar exige a indicação de ao menos um responsável legal válido com CPF cadastrado no `Person`. Se não possuir registro paterno na certidão, o sistema aceita a declaração de "Pai não registrado" sem travar o cadastro.

### 3.2. Carga Horária Docente e Hora-Atividade (Lei Federal 11.738/2008)
- No legado (`pmieducar.servidor_alocacao`), a alocação do professor discrimina:
  - `hora_inicial` / `hora_final` e `dia_semana` (1 a 7).
  - `hora_atividade` e `horas_excedentes`.
- **Regra SYSGOV:** 
  - A carga horária total do professor em sala de aula não pode ultrapassar 2/3 (66,6%) da sua jornada contratual.
  - No mínimo 1/3 (33,3%) da jornada deve ser reservada para `hora_atividade` (preparação de aulas, correção de avaliações, reuniões pedagógicas).
  - O sistema emite alerta caso uma escola tente alocar o docente além do teto em sala de aula.

### 3.3. Unificação de Alunos Duplicados com Capacidade de Rollback
- No legado (`StudentUnificationService` e `UnificationService`), ao fundir o Aluno B (secundário) no Aluno A (mestre):
  - Todas as foreign keys de tabelas dependentes (`pmieducar.matricula`, `pmieducar.nota_aluno`, `pmieducar.falta_aluno`, `pmieducar.historico_escolar`) são atualizadas para apontar para o Aluno A.
  - Os IDs e registros alterados são persistidos em formato JSON no log de unificação.
  - O Aluno B é marcado como inativo.
  - A reversão (`undo`) reverte cada registro alterado ao seu ponteiro anterior.
- **Regra SYSGOV:** 
  - Implementar o comando `StudentUnificationService::merge(Student $master, Student $duplicate, User $actor, string $reason)` dentro de uma transação de banco de dados (`DB::transaction`).
  - Gravação do snapshot diferencial completo (`before_state`) e registro obrigatório via `AuditLogger` em `audit_logs`.
  - Reversão permitida apenas para perfis com permissão `educa.alunos.unify_undo`.

---

## 4. Especificações para o Módulo `SYS-Educa`

### 4.1. Migrations Recomendadas para o Laravel 13
```php
// database/migrations/create_educa_students_table.php
Schema::create('educa_students', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->uuid('tenant_id')->index();
    $table->uuid('person_id')->index();
    $table->string('inep_code', 12)->nullable()->index();
    $table->string('nis', 11)->nullable()->index();
    $table->string('registration_number', 20)->unique(); // Código de matrícula da rede
    $table->boolean('active')->default(true);
    $table->timestamps();
    $table->softDeletes();

    $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
    $table->foreign('person_id')->references('id')->on('people')->cascadeOnDelete();
    $table->unique(['tenant_id', 'registration_number']);
});
```

### 4.2. Contratos TypeScript para o `@sysgov/sdk`
```typescript
export interface EducaStudent {
  id: string;
  tenantId: string;
  personId: string;
  person: PersonSummary;
  inepCode: string | null;
  nis: string | null;
  registrationNumber: string;
  active: boolean;
  guardians: EducaGuardian[];
  specialNeeds: EducaSpecialNeed[];
}

export interface EducaGuardian {
  id: string;
  personId: string;
  relationshipType: 'mother' | 'father' | 'legal_guardian' | 'other';
  isPrimaryContact: boolean;
  hasCustody: boolean;
}
```
