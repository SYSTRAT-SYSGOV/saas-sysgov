# Modelo de Domínio e Regras de Negócio — SYS-Educa (i-Educar Reengineering)

> **Documento Gerado pelo Agente Detective (`reversa-detective`) — Reversa Framework**  
> **Nível de Documentação:** `completo`  
> **Sistema Alvo:** SYSGOV — Módulo de Gestão Educacional Municipal (`SYS-Educa`)  
> **Status de Confiança:** 🟢 CONFIRMADO (regras validadas no código legado e legislação MEC/INEP) | 🟡 INFERIDO (otimizações e convenções arquiteturais)

---

## 1. Glossário de Termos do Domínio Educacional

| Termo | Definição no Domínio Brasileiro (LDB/MEC) | Entidade / Tabela SYSGOV | Status |
| :--- | :--- | :--- | :--- |
| **Mantenedora / Rede de Ensino** | Órgão governamental responsável pela gestão da rede pública (Secretaria Municipal ou Estadual de Educação). No sistema multi-tenant, cada mantenedora constitui um `tenant`. | `tenants`, `institutions` | 🟢 |
| **Escola / Unidade Escolar** | Estabelecimento físico ou conveniado onde ocorrem as atividades letivas e administrativas de ensino. | `schools` | 🟢 |
| **Ano Letivo** | Período legal correspondente a no mínimo 200 dias de trabalho escolar efetivo e 800 horas anuais (Lei nº 9.394/1996 - LDB, art. 24, I). | `academic_years` | 🟢 |
| **Etapa de Ensino** | Nível de formação conforme a LDB: Educação Infantil (Creche e Pré-escola), Ensino Fundamental (Anos Iniciais e Anos Finais), Ensino Médio e Educação de Jovens e Adultos (EJA). | `education_stages` | 🟢 |
| **Curso** | Estruturação pedagógica adotada pela rede de ensino que agrupa séries/etapas sob um mesmo projeto pedagógico. | `courses` | 🟢 |
| **Série / Ano Escolar** | Subdivisão sequencial de um curso ou ciclo (ex.: 1º Ano, 2º Ano, etc.). | `series` | 🟢 |
| **Matriz Curricular** | Conjunto estruturado de disciplinas e componentes curriculares distribuídos por carga horária obrigatória para um curso/série. | `curricular_matrices`, `matrix_disciplines` | 🟢 |
| **Componente Curricular / Disciplina** | Matéria ou área de conhecimento lecionada (ex.: Língua Portuguesa, Matemática, História). | `disciplines`, `knowledge_areas` | 🟢 |
| **Turma Escolar** | Agrupamento de alunos para atendimento pedagógico em determinado turno, sala, ano letivo e etapa. Pode ser uniseriada ou multisseriada. | `school_classes` | 🟢 |
| **Matrícula** | Vínculo formal e jurídico do educando com a rede de ensino e com o ano letivo. | `enrollments` | 🟢 |
| **Enturmação** | Alocação da matrícula de um aluno em uma turma específica com respectivo número de chamada. | `class_enrollments` | 🟢 |
| **Regra de Avaliação** | Conjunto normativo de cálculo de notas, tipo de nota (numérica 0-10, conceitual A-E, descritiva), peso por período e critérios de promoção/retenção. | `evaluation_rules` | 🟢 |
| **Fórmula de Média** | Expressão matemática que define como as notas dos períodos/etapas são consolidadas em média parcial, anual e final. | `media_formulas` | 🟢 |
| **Tabela de Arredondamento** | Mapeamento regulamentado de faixas de decimais para arredondamento de notas finais ou parciais (ex.: 5.75 vira 6.0). | `rounding_tables`, `rounding_rules` | 🟢 |
| **Diário de Classe** | Instrumento oficial e legal onde o professor registra diariamente os conteúdos lecionados e a frequência dos alunos (presença/falta). | `daily_records`, `daily_attendance` | 🟢 |
| **Falta Globalizada** | Modalidade de cômputo de faltas por dia letivo integral (comum nos Anos Iniciais do Fundamental e Infantil), em contraste com faltas por disciplina/hora-aula. | `enrollment_discipline_summaries` | 🟢 |
| **Falta Justificada** | Falta abonada mediante atestado médico ou comprovação legal aceita pelo regimento escolar. Não anula a falta histórica, mas pode impedir reprovação direta se amparada por lei. | `attendance_excuses` | 🟢 |
| **Censo Escolar / Educacenso** | Levantamento estatístico anual obrigatório coordenado pelo INEP/MEC para coleta de dados da educação básica brasileira (Primeira Fase: Matrícula Inicial; Segunda Fase: Situação do Aluno). | `censo_exports`, `censo_batches` | 🟢 |
| **Histórico Escolar** | Documento oficial permanente que registra a trajetória escolar, aproveitamento de estudos, notas e carga horária cumprida pelo aluno em cada ano/série. | `school_histories`, `school_history_disciplines` | 🟢 |
| **Transporte Escolar** | Serviço público de transporte de alunos da zona rural ou áreas de difícil acesso, compreendendo rotas, itinerários, veículos e motoristas vinculados. | `transport_routes`, `transport_passengers` | 🟢 |

---

## 2. Regras de Negócio Implícitas Consolidadas

### 2.1. Regras do Núcleo de Matrículas e Enturmações (`Enrollment`)

1. **Unicidade de Matrícula Ativa no Mesmo Ano Letivo:**
   - *Regra:* Um aluno não pode possuir duas matrículas em situação `CURSANDO` no mesmo ano letivo para o mesmo tipo de escolarização regular na mesma rede municipal.
   - *Exceção Regulamentar:* Matrículas do tipo AEE (Atendimento Educacional Especializado) ou Atividades Complementares no contraturno são permitidas como matrículas secundárias concomitantes.
   - *Status:* 🟢 CONFIRMADO (`pmieducar.matricula.matricula_dupla_mesmo_ano`).

2. **Corte Etário Obrigatório (MEC / CNE):**
   - *Regra:* Para ingresso na Educação Infantil (Pré-Escola) ou no 1º Ano do Ensino Fundamental, a data de nascimento do aluno deve atender ao corte de **31 de março** do ano de vigência da matrícula (Resolução CNE/CEB nº 2/2018).
   - *Status:* 🟢 CONFIRMADO (validações encontradas nos scripts de matrícula e no validador do Censo Escolar).

3. **Fluxo de Transferência e Bloqueio de Notas:**
   - *Regra:* Ao registrar uma transferência (`TRANSFERIDO`), a vaga na turma é liberada imediatamente para nova enturmação, porém todas as notas e presenças lançadas até a data do desligamento tornam-se somente-leitura e devem compor a Declaração de Transferência Oficial.
   - *Status:* 🟢 CONFIRMADO.

4. **Cancelamento de Matrícula em Lote:**
   - *Regra:* Matrículas não confirmadas no início do período letivo podem ser canceladas em lote pela Secretaria de Educação. Matrículas canceladas não geram histórico escolar e não são exportadas para a 1ª Fase do Censo Escolar.
   - *Status:* 🟢 CONFIRMADO (PR #1143 portabilis).

---

### 2.2. Regras do Motor de Avaliação, Médias e Frequência (`Evaluation`)

1. **Quórum Mínimo de Frequência para Promoção (LDB art. 24, VI):**
   - *Regra:* A exigência mínima para aprovação é de **75% de frequência** sobre o total de horas letivas ministradas. Alunos com frequência inferior a 75% são sumariamente reprovados por infrequência (`REPROVADO_POR_FALTA`), independentemente da média de notas obtida, salvo nos casos de Educação Infantil (onde não há reprovação) e amparo legal por regime domiciliar especial.
   - *Status:* 🟢 CONFIRMADO.

2. **Recuperação Paralela vs. Recuperação Final:**
   - *Regra:* O sistema deve permitir que notas de recuperação paralela substituam notas periódicas inferiores caso atinjam valor maior, conforme parâmetro da Regra de Avaliação (`nota_recuperacao > nota_etapa`). Na recuperação final, a média final é recalculada substituindo a média anual ou aplicando fórmula ponderada regulamentada.
   - *Status:* 🟢 CONFIRMADO.

3. **Mapeamento de Arredondamento Determinístico:**
   - *Regra:* O arredondamento de médias deve consultar estritamente a tabela de arredondamento vinculada à regra do curso. O cálculo não deve utilizar funções de arredondamento de float nativas do banco sem respeitar as faixas cadastradas pelo município (evitando discrepâncias entre casas decimais `0.05` vs `0.06`).
   - *Status:* 🟢 CONFIRMADO.

4. **Tratamento de Alunos com Dispensa Curricular:**
   - *Regra:* Quando um aluno obtém dispensa legal de um componente curricular (ex.: Educação Física para alunos que trabalham mais de 6h/dia, conforme LDB art. 26 §3º), o campo `situacao` da disciplina deve ser gravado como `DISPENSADO`. A disciplina não entra no cômputo da média global nem reprova por falta.
   - *Status:* 🟢 CONFIRMADO.

---

### 2.3. Regras do Diário de Classe e Lançamento de Aulas (`DailyRecord`)

1. **Bloqueio de Lançamento Retroativo por Calendário:**
   - *Regra:* Professores só podem realizar lançamentos de frequência e conteúdos dentro do período aberto da etapa letiva (Bimestre/Trimestre). Uma vez encerrada a etapa no calendário escolar ou decorrido o prazo limite de dias configurado pela rede (`dias_tolerancia_retroativa`), o diário entra em modo bloqueado (`LOCKED`).
   - *Status:* 🟢 CONFIRMADO.

2. **Auditoria de Retificação de Frequência:**
   - *Regra:* Qualquer retificação de frequência após a homologação da etapa requer autorização da Coordenação Pedagógica / Direção Escolar e deve gerar registro imutável em `daily_record_audit_logs` contendo o ID do usuário, data/hora, justificativa e valores anterior/novo.
   - *Status:* 🟢 CONFIRMADO (atende aos requisitos do TCE e Ministério Público).

3. **Distinção entre Falta Justificada e Abono de Faltas:**
   - *Regra:* A falta com atestado médico permanece contabilizada como ausência no diário, porém recebe o sinalizador `is_excused = TRUE`. No cálculo de encerramento do ano letivo, o conselho de classe utiliza o percentual de faltas justificadas para avaliar a promoção por deliberação do conselho.
   - *Status:* 🟢 CONFIRMADO.

---

### 2.4. Regras do Censo Escolar INEP (`Educacenso`)

1. **Data de Referência da Matrícula Inicial:**
   - *Regra:* A 1ª Fase do Educacenso coleta os dados de escolas, turmas, alunos e profissionais escolares existentes na data de referência fixada anualmente pelo MEC (tradicionalmente a **última quarta-feira do mês de maio**). Matrículas iniciadas após essa data não devem ser exportadas na 1ª fase.
   - *Status:* 🟢 CONFIRMADO.

2. **Compatibilidade de Idade e Etapa:**
   - *Regra:* O validador deve emitir advertência impeditiva caso a idade do educando esteja fora dos limites mínimos ou máximos previstos para a etapa do Censo (ex.: alunos menores de 4 anos em turmas de Pré-Escola ou maiores de 17 anos em anos iniciais sem modalidade EJA).
   - *Status:* 🟢 CONFIRMADO (commit `254d68688`).

3. **Desempate Determinístico na Numeração dos Registros:**
   - *Regra:* Para garantir integridade nos arquivos TXT de exportação por lotes (registros 00 a 60), a listagem de turmas, alunos e docentes deve possuir critério de ordenação com desempate explícito por chave primária UUID (`ORDER BY nome ASC, id ASC`), evitando duplicação ou omissão de registros entre páginas de exportação.
   - *Status:* 🟢 CONFIRMADO (commit `64b0773af`).

---

### 2.5. Regras de Multi-Tenancy e Segurança (`SYSGOV Foundation`)

1. **Isolamento Absoluto por `tenant_id`:**
   - *Regra:* Nenhuma consulta de dados de negócio (escolas, alunos, notas, turmas, usuários) pode ser executada sem a cláusula restritiva `tenant_id = :current_tenant_id`, assegurada via Global Scope no ORM e políticas RLS/Foreign Keys no banco de dados.
   - *Status:* 🟢 CONFIRMADO.

2. **Permissões de Vinculação Docente:**
   - *Regra:* Um professor só pode visualizar e registrar diários de classe para turmas e disciplinas às quais esteja expressamente alocado no ano letivo vigente. A permissão de vínculo de servidores à turma é prerrogativa exclusiva da Secretaria Escolar ou Direção.
   - *Status:* 🟢 CONFIRMADO (commit `b93f952e9`).
