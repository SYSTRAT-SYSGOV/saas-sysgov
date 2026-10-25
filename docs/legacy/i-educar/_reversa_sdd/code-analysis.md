# Análise Técnica do Código-Fonte — I-Educar (SDD)

> Gerado pelo Reversa Archaeologist (doc_level: completo) em 2026-10-12

---

## 1. Módulo: `AcademicYear` (Ano Letivo)

### 1.1 Visão Geral e Responsabilidades
O módulo de **Ano Letivo** gerencia a periodicidade acadêmica das unidades escolares, delimitando a vigência das turmas, a temporalidade das matrículas e o calendário de etapas avaliativas (bimestres, trimestres, semestres). É a espinha dorsal temporal do sistema de gestão escolar.

- **Caminho Principal:** `app/Services/AcademicYearService.php`
- **Modelos:**
  - `app/Models/LegacySchoolAcademicYear.php` (`pmieducar.escola_ano_letivo`)
  - `app/Models/LegacyAcademicYearStage.php` (`pmieducar.escola_ano_letivo_modulo`)
  - `app/Models/LegacySchoolYearLock.php` (`pmieducar.escola_ano_letivo_travamento`)
- **Controladores / APIs:**
  - `app/Http/Controllers/Api/Resource/SchoolAcademicYear/ResourceSchoolAcademicYearController.php`
  - Rotas legadas em `ieducar/intranet/educar_ano_letivo_modulo_cad.php`

---

### 1.2 Métodos e Fluxos de Controle Principais

#### `create(array $data): LegacySchoolAcademicYear`
- **Entrada:** `escola_id`, `ano`, `etapas` (array com datas e módulos), `copiar_dados` (booleano), `ano_origem` (opcional).
- **Regras de Negócio:**
  - Valida se o ano já existe e está ativo na escola (`validateAcademicYearExists`).
  - Cria o registro em `pmieducar.escola_ano_letivo` com `andamento = 0` (Não iniciado).
  - Itera sobre as etapas criando `pmieducar.escola_ano_letivo_modulo`.
  - Dispara a replicação estrutural caso `copiar_dados == true`.
- **Nível de Confiança:** 🟢 CONFIRMADO

#### `open(int $schoolId, int $year): bool`
- **Entrada:** ID da escola e ano letivo.
- **Regras de Negócio:**
  - Verifica se o ano está no status `0` (`STATUS_NOT_STARTED`).
  - Bloqueia se o status for diferente de 0 (lança exceção caso já esteja em andamento ou finalizado).
  - Altera `andamento` para `1` (`STATUS_IN_PROGRESS`).
  - Registra auditoria/evento de abertura.
- **Nível de Confiança:** 🟢 CONFIRMADO

#### `close(int $schoolId, int $year): bool`
- **Entrada:** ID da escola e ano letivo.
- **Regras de Negócio:**
  - Verifica se o ano está no status `1` (`STATUS_IN_PROGRESS`). Se não estiver, bloqueia.
  - Consulta matrículas ativas da escola no ano (`LegacyEnrollment`).
  - **Trava de Integridade Acadêmica:** Bloqueia o encerramento se houver alunos com `aprovado = 3` (Em andamento) que não sejam apenas de turmas do tipo "Atividade Complementar" ou "AEE".
  - Altera `andamento` para `2` (`STATUS_FINISHED`).
- **Nível de Confiança:** 🟢 CONFIRMADO

#### `delete(int $schoolId, int $year): bool`
- **Entrada:** ID da escola e ano letivo.
- **Regras de Negócio:**
  - Não permite exclusão física; aplica soft-delete (`ativo = 0`, preenche `data_exc` e `ref_usuario_exc`).
  - Bloqueia exclusão caso existam turmas vinculadas ao ano com matrículas realizadas.
- **Nível de Confiança:** 🟢 CONFIRMADO

---

### 1.3 Algoritmos de Replicação / Cópia de Dados entre Anos

O método `performDataCopy` / `executeCopyAcademicYears` contém lógica de alta complexidade:

1. **Atualização de Arrays PostgreSQL (`smallint[]`):**
   - O i-Educar legado utiliza colunas do tipo array nativo do PostgreSQL (`anos_letivos`) em tabelas de relacionamento, como `pmieducar.escola_curso`, `pmieducar.escola_serie`, `pmieducar.disciplina_ano_letivo` e `pmieducar.regra_avaliacao_serie_ano`.
   - O algoritmo lê o array do ano anterior, verifica se o novo ano já está presente e faz o `array_append(anos_letivos, novo_ano)`.
2. **Clonagem de Turmas (`replicateSchoolClass`):**
   - Para cada turma ativa no ano anterior que permite replicação, cria uma nova turma no novo ano mantendo:
     - Curso, Série, Turno e Tipo de Atendimento.
     - Horários de início e término.
     - Vínculos com matriz curricular.
3. **Clonagem de Alocações Docentes (`EmployeeAllocation`):**
   - Replica a matriz de lotação dos professores por disciplina na turma.

---

### 1.4 Tratamento de Erros e Exceções Notáveis
- `BusinessException`: Lançada para violações de integridade acadêmica (ex: tentar fechar ano com matrículas abertas).
- `ValidationException`: Conflito ou sobreposição de datas de etapas.
- Transações: Todas as operações de criação e cópia utilizam `DB::transaction()` garantindo rollback total em caso de inconsistência.

---

## 2. Módulo: `Addressing` (Endereçamento e Geografia)

### 2.1 Visão Geral e Responsabilidades
O módulo de **Addressing** é a camada geoespacial e cadastral do sistema. Provê a taxonomia territorial completa (Países -> Estados -> Municípios -> Distritos/Bairros) e os endereços físicos (`Place`), conectando-os polimorficamente a pessoas físicas (alunos, professores, responsáveis) e jurídicas (escolas, secretarias de educação).

- **Caminho dos Modelos:** `app/Models/` (`Country.php`, `State.php`, `City.php`, `District.php`, `Place.php`, `PersonHasPlace.php`)
- **Controladores REST:**
  - `app/Http/Controllers/Api/CountryController.php`
  - `app/Http/Controllers/Api/StateController.php`
  - `app/Http/Controllers/Api/CityController.php`
  - `app/Http/Controllers/Api/DistrictController.php`
- **Regras de Negócio e Validação:**
  - `app/Rules/Addressing/AddressingCountryRule.php`
  - `app/Rules/Addressing/AddressingStateRule.php`
  - `app/Rules/Addressing/AddressingCityPlaceRule.php`
  - `app/Rules/Addressing/AddressingCityDistrictRule.php`
  - `app/Rules/CityRestrictOperationRule.php`

---

### 2.2 Métodos e Fluxos de Controle Principais

#### `City::queryFindByName(string $name): Builder`
- **Algoritmo de Normalização Fonética:**
  - Utiliza função PostgreSQL `translate()` encadeada com `upper()` para desconsiderar acentuação e caracteres especiais na busca de cidades:
  ```sql
  translate(upper(name), 'ÅÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇÝÑ', 'AAAAAAEEEEIIIIOOOOOUUUUCYN') 
  LIKE translate(upper('%termo%'), 'ÅÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇÝÑ', 'AAAAAAEEEEIIIIOOOOOUUUUCYN')
  ```
- **Nível de Confiança:** 🟢 CONFIRMADO

#### Travas de Exclusão Referencial
- **`AddressingCityDistrictRule`**: Bloqueia a exclusão de uma cidade se houver qualquer distrito vinculado (`city->districts()->doesntExist()`).
- **`AddressingCityPlaceRule`**: Bloqueia a exclusão de uma cidade se houver endereços (`places`) vinculados (`city->places()->doesntExist()`).
- **`AddressingStateRule` / `AddressingCountryRule`**: Cascata de integridade referencial que impede órfãos geográficos.
- **Nível de Confiança:** 🟢 CONFIRMADO

#### Controle de Acesso e Permissões
- Ações no controlador de cidades (`CityController`) verificam o processo `755` e aplicam `CityRestrictOperationRule` com base no nível de permissão do usuário autenticado (`request->user()->getLevel()`).
- **Nível de Confiança:** 🟢 CONFIRMADO

---

## 3. Módulo Avaliacao (Regras de Avaliação, Notas e Frequência)

### Visão Geral da Arquitetura
O módulo `Avaliacao` constitui o motor de cálculo pedagógico do i-Educar. Sua peça central é a classe [`Avaliacao_Service_Boletim`](file:///d:/SYSTRAT/I-Educar/ieducar/modules/Avaliacao/Service/Boletim.php) (3.542 linhas), responsável por carregar o histórico de notas, faltas e pareceres de uma matrícula, computar as médias por etapa e finais via fórmulas matemáticas configuráveis e determinar a situação acadêmica do aluno (Aprovado, Em Exame, Reprovado por Nota, Reprovado por Falta, Aprovado com Dependência).

### Regras de Negócio Críticas Extraídas

#### 1. Fórmulas de Cálculo de Média (`FormulaMedia`)
- O cálculo da média anual não é fixo: ele é avaliado dinamicamente pela fórmula vinculada à [`RegraAvaliacao_Model_Regra`](file:///d:/SYSTRAT/I-Educar/ieducar/modules/RegraAvaliacao/Model/Regra.php).
- Exemplos de fórmulas suportadas pelo motor:
  - Média Aritmética Simples: `(Et1 + Et2 + Et3 + Et4) / 4`
  - Média Ponderada: `(Et1*1 + Et2*2 + Et3*3 + Et4*4) / 10`
  - Somatório de Pontos: `Et1 + Et2 + Et3 + Et4`
- **Nível de Confiança:** 🟢 CONFIRMADO

#### 2. Fluxo de Exame Final e Recuperação
- Se a média final for inferior à `media` mínima da regra, mas igual ou superior à `media_recuperacao` mínima para direito a exame:
  - A matrícula entra na situação transitória `EM_EXAME` (`App_Model_MatriculaSituacao::EM_EXAME`).
  - Ao lançar a nota de exame (`nota_recuperacao`), o sistema executa a fórmula de recálculo (`formulaRecuperacao`), como por exemplo: `(MediaAnual + Exame) / 2`.
  - Se a nova média for `>= media_recuperacao`: status torna-se `APROVADO_APOS_EXAME`. Caso contrário, `REPROVADO`.
- **Nível de Confiança:** 🟢 CONFIRMADO

#### 3. Regra de Frequência e Reprovação por Falta
- O sistema calcula a frequência de acordo com o `tipoPresenca`:
  - `Geral`: compara o total de faltas com o total de `dias_letivos` do ano.
  - `Por Componente`: compara as faltas de cada disciplina com a carga horária (`horas_faltas` x carga horária da disciplina).
- Se a porcentagem de presença apurada for inferior à `porcentagemPresenca` (padrão LDB de 75%), o estudante é sumariamente `REPROVADO_POR_FALTA`, prevalecendo sobre a nota obtida.
- **Nível de Confiança:** 🟢 CONFIRMADO

#### 4. Progressão Parcial e Aprovação com Dependência
- Se o estudante for reprovado em um número de disciplinas menor ou igual a `qtdDisciplinasDependencia` (configurado na regra de avaliação da instituição), o sistema permite a situação `APROVADO_COM_DEPENDENCIA`.
- As disciplinas pendentes são herdadas na matrícula do ano subsequente como componentes em dependência.
- **Nível de Confiança:** 🟢 CONFIRMADO

---

## Módulos: `Cadastro`, `People`, `Servidores` e `Unification`

### Visão Geral da Arquitetura
Este conjunto de módulos gerenciava o ciclo de vida de pessoas físicas e jurídicas no I-Educar (`LegacyPerson`, `LegacyIndividual`, `LegacyStudent`, `LegacyEmployee`). No ecossistema monolítico original, o sistema acumulava dados gerais de cidadãos com dados estritamente escolares.
No **SYSGOV**, o cadastro básico de pessoa física (`App\Models\Person`), credenciais de acesso (`App\Models\User`) e estrutura departamental (`App\Models\OrgUnit`) são responsabilidade dos **módulos comuns do SaaS**.
O **SYS-Educa** foca exclusivamente em:
1. `LegacyStudent` -> `educa_students`: Extensão educacional (NIS, Código INEP, tipo de responsável, laudos AEE, restrições alimentares, benefícios sociais).
2. `LegacyEmployee` / `EmployeeAllocation` -> `educa_teachers` & `educa_teacher_allocations`: Gestão de atribuição de aulas e cumprimento da Lei Federal 11.738 (1/3 de hora-atividade).
3. `StudentUnificationService` -> `educa_student_unifications`: Fusão de duplicidades cadastrais com auditoria e capacidade de desfazimento (`undo`).

### Regras de Negócio Críticas Extraídas

#### 1. Tipologia de Responsabilidade do Estudante (`guardianType`)
- O modelo [`LegacyStudent`](file:///d:/SYSTRAT/I-Educar/app/Models/LegacyStudent.php) mapeia a responsabilidade formal:
  - `'m'`: Mãe (titular primária padrão para cruzamento com o Cadastro Único / Bolsa Família).
  - `'p'`: Pai.
  - `'r'`: Responsável legal com documentação comprobatória (tutela, termo de guarda).
  - `'a'`: Ambos os genitores.
- **Nível de Confiança:** 🟢 CONFIRMADO

#### 2. Proteção de Dados de AEE e Ficha Médica
- O aluno pode possuir múltiplas deficiências vinculadas em `cadastro.fisica_deficiencia` com exigência de laudo comprobatório (`medicalReports`).
- No SYS-Educa, o perfil AEE desencadeia automaticamente:
  - Liberação de vaga em sala de recurso multifuncional.
  - Alerta de necessidade de profissional de apoio escolar (cuidador/mediador).
  - Flags de exportação prioritária no Censo Escolar INEP.
- **Nível de Confiança:** 🟢 CONFIRMADO

#### 3. Regra de Limitação de Alocação Docente (Hora-Atividade)
- A classe [`EmployeeAllocation`](file:///d:/SYSTRAT/I-Educar/app/Models/EmployeeAllocation.php) controla a carga horária semanal do professor por escola e dia da semana.
- A regra de negócio garante que a jornada do professor seja dividida entre:
  - Horas de sala de aula (máximo 66,6%).
  - Horas de atividade pedagógica e planejamento (mínimo 33,3%).
- **Nível de Confiança:** 🟢 CONFIRMADO

#### 4. Motor de Fusão e Desfazimento de Alunos Duplicados
- O serviço [`StudentUnificationService`](file:///d:/SYSTRAT/I-Educar/app/Services/StudentUnificationService.php) e [`UnificationService`](file:///d:/SYSTRAT/I-Educar/app/Services/UnificationService.php) implementam uma máquina de estados segura para lidar com cadastros duplicados de estudantes:
  - Gravação de log detalhado com chaves antigas em JSON (`LogUnificationOldData`).
  - Atualização atômica das chaves estrangeiras em matrículas, notas, presenças e históricos para o registro mestre.
  - Capacidade de reversão (`undo`) restrita a usuários institucionais ou da mesma escola.
  - No SYS-Educa, esse fluxo é amarrado no `AuditLogger` corporativo do SYSGOV sob a permissão `educa.alunos.unify`.
- **Nível de Confiança:** 🟢 CONFIRMADO

---

## Módulo: `Calendario` (Calendário Escolar e Dias Letivos)

### Visão Geral da Arquitetura
O módulo `Calendario` é responsável por parametrizar o calendário escolar do município e de cada unidade escolar, estruturando o cumprimento da LDB 9.394/1996 e garantindo integridade com o Diário de Classe eletrônico.
- Modelos legados: `clsPmieducarCalendarioAnoLetivo`, `clsPmieducarCalendarioDia`, `clsPmieducarCalendarioMotivoFechamento`.
- Modelos SYSGOV: `AcademicCalendar`, `CalendarDay`, `CalendarDayReason` em `App\Modules\Educa\Models`.

### Regras de Negócio Críticas Extraídas

#### 1. Matriz Padrão da Rede e Herança por Unidade Escolar
- A Secretaria Municipal de Educação (SME) cadastra um calendário mestre com `ref_cod_escola = null`.
- Ao criar uma escola ou abrir o ano letivo, o sistema permite clonar a matriz padrão da rede ou personalizar feriados locais/municipais e recessos escolares mantendo a conformidade.
- **Nível de Confiança:** 🟢 CONFIRMADO

#### 2. Trava Legal de 200 Dias Letivos (LDB 9.394/1996, Art. 24, I)
- O calendário só pode ser homologado se a soma dos dias marcados com `tipo = 'l'` (letivo normal) e `tipo = 'e'` (sábado/dia extra letivo) totalizar no mínimo 200 dias letivos.
- Dias com motivo de fechamento (`tipo = 'f'` feriado, `'r'` recesso, `'p'` planejamento) não contam para o cômputo dos 200 dias.
- **Nível de Confiança:** 🟢 CONFIRMADO

#### 3. Validação Cruzada com o Diário de Classe
- O Diário de Classe eletrônico consulta diretamente a tabela `educa_calendar_days`.
- Se um professor tentar registrar frequência ou aula em uma data não letiva (`is_school_day = false`), o sistema bloqueia o registro com erro: *"Não é permitido lançar aulas ou chamadas em dias não letivos ou feriados"*.
- **Nível de Confiança:** 🟢 CONFIRMADO

---

## Módulo: `ComponenteCurricular` (BNCC, Disciplinas e Matriz Curricular)

### Visão Geral da Arquitetura
O módulo organiza os saberes pedagógicos em Áreas do Conhecimento (`modules.area_conhecimento`), Componentes Curriculares (`modules.componente_curricular`), Matriz Curricular por Série (`modules.componente_curricular_ano_escolar`) e Alocação por Turma (`modules.componente_curricular_turma`).

### Regras de Negócio Críticas Extraídas

#### 1. Categorização BNCC e Integração INEP/Educacenso
- Disciplinas possuem classificação em `tipo_base`:
  - `1`: Base Nacional Comum (BNCC obrigatória).
  - `2`: Base Diversificada.
  - `3`: Base Profissionalizante.
  - `4`: Art. 33 (Ensino Religioso).
- O atributo `codigo_educacenso` mapeia os códigos oficiais do Censo Escolar para a emissão correta dos arquivos do Educacenso.
- **Nível de Confiança:** 🟢 CONFIRMADO

#### 2. Mínimo Legal de 800 Horas Anuais da Matriz Curricular
- A parametrização dos componentes curriculares por ano escolar (`modules.componente_curricular_ano_escolar`) estabelece a carga horária de cada matéria na série.
- A soma de todas as cargas horárias dos componentes da matriz deve perfazer no mínimo 800 horas anuais, garantindo paridade com a exigência dos 200 dias letivos.
- **Nível de Confiança:** 🟢 CONFIRMADO

#### 3. Componentes com Progressão Facultativa (`desconsidera_para_progressao`)
- Disciplinas com `desconsidera_para_progressao = true` (ex: Ensino Religioso, Atividades Complementares) não são consideradas no cálculo de retenção ou reprovação do aluno, permitindo avanço de ano mesmo se a média ou frequência for insatisfatória.
- **Nível de Confiança:** 🟢 CONFIRMADO

#### 4. Proteção de Dados do Diário Eletrônico (`HasDataInDiario`)
- A exclusão ou desvinculação de um componente curricular de uma turma (`ComponenteCurricular_Model_TurmaDataMapper::bulkUpdate`) é rigidamente bloqueada se já houver qualquer registro de nota, falta, conteúdo lecionado ou parecer descritivo cadastrado.
- Evita corrupção de histórico escolar e perda de registros de fechamento bimestral.
- **Nível de Confiança:** 🟢 CONFIRMADO





---

## Módulo: `School` (Escolas, Cursos e Séries)

### Visão Geral da Arquitetura
O módulo `School` estrutura a organização pedagógica e a malha física da rede municipal de ensino. Ele estabelece a hierarquia:
**SME (Instituição Mantenedora)** $\rightarrow$ **Escolas (`educa_schools` / `OrgUnit`)** $\rightarrow$ **Cursos (`educa_courses`)** $\rightarrow$ **Séries/Anos (`educa_grades`)**.
No i-Educar legado, o cadastro de escolas era vinculado a `cadastro.juridica`. No **SYSGOV**, cada unidade escolar é modelada como uma `OrgUnit` com `type = 'SCHOOL'` subordinada à Secretaria de Educação (`OrgUnit` com `type = 'SECRETARIAT'`), eliminando redundância e centralizando auditoria e hierarquia orçamentária/administrativa.

- **Modelos Legados:**
  - `app/Models/LegacySchool.php` (`pmieducar.escola`)
  - `app/Models/LegacyCourse.php` (`pmieducar.curso`)
  - `app/Models/LegacyGrade.php` (`pmieducar.serie`)
  - `app/Models/LegacySchoolCourse.php` (`pmieducar.escola_curso`)
  - `app/Models/LegacySchoolGrade.php` (`pmieducar.escola_serie`)
- **Controladores / Endpoints:**
  - `app/Http/Controllers/Api/SchoolController.php`
  - `app/Http/Controllers/Api/CourseController.php`
  - `app/Http/Controllers/Api/GradeController.php`
  - Formulários legados em `ieducar/intranet/educar_escola_cad.php`, `educar_curso_cad.php`, `educar_serie_cad.php`.

### Regras de Negócio Críticas Extraídas

#### 1. Extensão de `OrgUnit` e Unicidade do Código INEP
- No SYSGOV, a escola não duplica endereço ou razão social. Ela estende `App\Models\OrgUnit` através da tabela `educa_schools` com chave `org_unit_id` (1:1).
- O código INEP (`inep_code`, 8 dígitos numéricos) é validado com constraint de unicidade por tenant.
- A escola possui parametrização de bloqueio: `bloquear_lancamento_diario_anos_letivos_encerrados` impede que professores ou secretários alterem notas ou frequências após o encerramento formal do ano letivo pela SME.
- **Nível de Confiança:** 🟢 CONFIRMADO

#### 2. Herança de Oferta e Autorização por Ano Letivo (`anos_letivos`)
- Cursos e Séries não são disponibilizados automaticamente em todas as escolas. Cada unidade precisa de autorização explícita em `pmieducar.escola_curso` e `pmieducar.escola_serie`.
- No modelo legado, essa vigência é controlada por um array PostgreSQL (`smallint[] anos_letivos`).
- No SYSGOV, a relação é normalizada em `educa_school_courses` e `educa_school_grades`, contendo o atributo `academic_year`, garantindo integridade referencial com `educa_academic_years`.
- **Nível de Confiança:** 🟢 CONFIRMADO

#### 3. Parâmetros Legais da LDB e Distorção Idade-Série
- O curso define `frequencia_obrigatoria` (padrão LDB de 75,00%), `qtd_etapas` (tipicamente 4 bimestres) e `padrao_ano_escolar` (anual vs semestral).
- A série estabelece `carga_horaria` (mínimo de 800h anuais) e `dias_letivos` (mínimo de 200 dias).
- A série define `idade_ideal` (ex: 6 anos para o 1º Ano do EF). O sistema utiliza esse marco para gerar os indicadores automáticos de distorção idade-série exigidos nos relatórios do MEC/Censo.
- **Nível de Confiança:** 🟢 CONFIRMADO

#### 4. Regra de Avaliação Padrão e Vínculo Curricular
- A série referencia `regra_avaliacao_id` (`modules.regra_avaliacao`), definindo a tabela de arredondamento, média de aprovação e fórmula de cálculo.
- A série é a âncora da matriz curricular: `modules.componente_curricular_ano_escolar` amarra quais disciplinas pertencem à série e suas cargas horárias específicas.
- **Nível de Confiança:** 🟢 CONFIRMADO

#### 5. Travas de Exclusão Referencial (`CanDelete`)
- O sistema bloqueia a inativação ou exclusão de um curso ou série se houver:
  - Turmas cadastradas em anos letivos vigentes ou históricos.
  - Alunos matriculados ou com histórico escolar vinculado.
- **Nível de Confiança:** 🟢 CONFIRMADO

---

## Módulo: `SchoolClass` (Turmas, Turnos e Regência Docente)

### Visão Geral da Arquitetura
O módulo `SchoolClass` é o centro operacional da escola. Ele concretiza a enturmação dos estudantes, organiza os horários de entrada e saída por turno e gerencia a alocação e regência dos professores.
- **Modelos Legados:**
  - `app/Models/LegacySchoolClass.php` (`pmieducar.turma`)
  - `app/Models/LegacyPeriod.php` (`pmieducar.turma_turno`)
  - `app/Models/LegacySchoolClassGrade.php` (`pmieducar.turma_serie`)
  - `app/Models/LegacyTeacherClass.php` (`modules.professor_turma`)
  - `app/Models/LegacyTeacherClassSubject.php` (`modules.professor_turma_disciplina`)
- **Services e Regras Legadas:**
  - `app/Services/CanCreateSchoolClass.php` (Trava de vagas antes de criar turma)
  - `app/Services/CanDeleteTurma.php` (Integridade de exclusão de turma)
  - `app/Services/AvailableTimeService.php` (Detector de choque de horários)
  - `app/Http/Controllers/Api/SchoolClassController.php`

### Regras de Negócio Críticas Extraídas

#### 1. Trava de Criação de Turma para Série com Vagas Ociosas (`CanCreateSchoolClass`)
- Localização: [`app/Services/CanCreateSchoolClass.php`](file:///d:/SYSTRAT/I-Educar/app/Services/CanCreateSchoolClass.php).
- **Regra de Otimização da Rede Pública:** Se a escola estiver configurada com `bloquear_cadastro_turma_para_serie_com_vagas == 1` na série correspondente (`pmieducar.escola_serie`), o sistema impede a abertura de uma nova turma se qualquer outra turma existente da mesma escola, série, ano e turno ainda possuir vagas livres ($max\_aluno - total\_matriculas > 0$).
- **Objetivo da Regra:** Evitar dispersão de turmas e custo desnecessário com contratação de professores e salas ociosas na rede pública.
- **Nível de Confiança:** 🟢 CONFIRMADO

#### 2. Algoritmo de Choque de Horários (`AvailableTimeService`)
- Localização: [`app/Services/AvailableTimeService.php`](file:///d:/SYSTRAT/I-Educar/app/Services/AvailableTimeService.php).
- **Validação Temporal:**
  - Confronta os dias da semana (`dias_semana`) da turma proposta com as turmas ativas do aluno ou do professor.
  - Verifica sobreposição de intervalos:
    $$\text{Início}_A \le \text{Término}_B \quad \text{e} \quad \text{Término}_A \ge \text{Início}_B$$
  - **Turno Integral:** Se o turno for Integral (`Period::FULLTIME`), o algoritmo desdobra os intervalos considerando os períodos matutino e vespertino para detectar sobreposições parciais.
  - **Exceção Legal de AEE:** Alunos com deficiência podem ter duas matrículas ativas simultâneas no mesmo ano letivo (uma turma regular de escolarização e uma turma de AEE no contraturno). O sistema autoriza essa coexistência desde que não haja colisão de horários físicos.
- **Nível de Confiança:** 🟢 CONFIRMADO

#### 3. Suporte Completo a Turmas Multisseriadas (`multiseriada == 1`)
- Em escolas rurais ou de pequeno porte, uma única sala física agrega estudantes de séries diferentes.
- A tabela `pmieducar.turma_serie` permite associar múltiplas séries a uma mesma `pmieducar.turma`.
- **Boletins Independentes:** Cada série vinculada pode ter um modelo de avaliação distinto (`boletim_id`) e um modelo diferenciado (`boletim_diferenciado_id`), permitindo que a avaliação de um aluno de 1º ano seja por parecer descritivo enquanto o de 4º ano na mesma sala receba notas numéricas de 0 a 10.
- **Nível de Confiança:** 🟢 CONFIRMADO

#### 4. Regência Docente e Habilitação do Diário Eletrônico
- O vínculo do professor com a turma é formalizado em `modules.professor_turma` com discriminação de `tipo_vinculo` (Efetivo, Contrato Temporário, CLT) e `funcao` (Titular, Auxiliar, Mediador AEE).
- A tabela `modules.professor_turma_disciplina` amarra quais disciplinas específicas da matriz o docente tem autorização para lecionar.
- A flag `permite_lancar_faltas_componente` habilita a interface do Diário de Classe para lançamento individualizado de faltas por disciplina ou de forma global para a turma (nos anos iniciais).
- **Nível de Confiança:** 🟢 CONFIRMADO

#### 5. Trava de Exclusão de Turma (`CanDeleteTurma`)
- Localização: [`app/Services/CanDeleteTurma.php`](file:///d:/SYSTRAT/I-Educar/app/Services/CanDeleteTurma.php).
- Bloqueia a exclusão da turma caso:
  - Exista qualquer matrícula ativa, cancelada, transferida ou histórica vinculada.
  - Exista qualquer registro de frequência, notas, conteúdos lecionados ou pareceres lançados.
- Se houver apenas dependências de configuração (vínculo de disciplinas ou alocação docente sem dados pedagógicos lançados), o sistema realiza a limpeza em cascata antes de inativar a turma.
- **Nível de Confiança:** 🟢 CONFIRMADO

---

## Módulo: Registration & Enrollments (Matrículas, Enturmações e Transferências)

### Arquivos Inspecionados
- **Modelos Eloquent Legados:**
  - `app/Models/LegacyRegistration.php` (`pmieducar.matricula`)
  - `app/Models/LegacyEnrollment.php` (`pmieducar.matricula_turma`)
  - `app/Models/LegacyTransferRequest.php` (`pmieducar.transferencia_solicitacao`)
  - `ieducar/lib/App/Model/MatriculaSituacao.php` (Enum das 15 situações de matrícula)
- **Services e Lógicas de Negócio:**
  - `app/Services/RegistrationService.php` (Ciclo de vida, fechamento e cancelamento)
  - `app/Services/EnrollmentService.php` (Validações de capacidade, datas e alocação física)
  - `app/Services/TransferRegistrationDataService.php` (Portabilidade atômica de notas e faltas)
  - `app/Services/CopyScoreService.php` (Cópia de notas por componente/etapa)
  - `app/Services/CopyAbsenceService.php` (Cópia de faltas consolidadas)
  - `app/Services/CopyDescriptiveOpinionService.php` (Cópia de pareceres descritivos)
  - `app/Http/Controllers/EnrollmentController.php` (Ações de enturmar, desenturmar e remanejar)

### Regras de Negócio Críticas Extraídas

#### 1. Máquina de Estados da Matrícula (`MatriculaSituacao`)
- Localização: [`ieducar/lib/App/Model/MatriculaSituacao.php`](file:///d:/SYSTRAT/I-Educar/ieducar/lib/App/Model/MatriculaSituacao.php) e [`app/Services/RegistrationService.php`](file:///d:/SYSTRAT/I-Educar/app/Services/RegistrationService.php).
- A situação da matrícula rege o acesso do aluno ao diário de classe e aos boletins:
  - `PRE_ENROLLED` (11): Matrícula aguardando confirmação documental. Não consome vaga física nem permite lançamento de notas.
  - `ACTIVE` (3): Matrícula regular em curso (`EM_ANDAMENTO`).
  - `IN_EXAM` (7): Estudante em recuperação final após o término do calendário regular.
  - `APPROVED` (1) / `APPROVED_AFTER_EXAM` (8) / `APPROVED_DEPENDENCY` (12) / `APPROVED_COUNCIL` (13): Conclusão com aprovação escolar.
  - `REPROVED` (2) / `REPROVED_ABSENCE` (14): Conclusão com retenção por rendimento ou por faltas excedentes (> 25%).
  - `TRANSFERRED` (4): Matrícula encerrada por expedição de guia de transferência.
  - `RECLASSIFIED` (5): Encerramento da matrícula original decorrente de promoção/avanço de série pela equipe pedagógica.
  - `DROPOUT` (6): Encerramento por abandono escolar declarado.
  - `DECEASED` (15): Encerramento por óbito do estudante.
- **Nível de Confiança:** 🟢 CONFIRMADO

#### 2. Travas Rígidas do Algoritmo de Enturmação (`EnrollmentService`)
- Localização: [`app/Services/EnrollmentService.php`](file:///d:/SYSTRAT/I-Educar/app/Services/EnrollmentService.php).
- A inclusão do aluno em uma turma física (`pmieducar.matricula_turma`) depende da verificação sequencial:
  1. **Capacidade Máxima:** Se a turma estiver com `bloquear_enturmacao_sem_vagas == 1`, compara o número de enturmações ativas (`active = true`) com `max_aluno`. Se a capacidade for atingida, lança `NoVacancyException`.
  2. **Datas Limite do Ano Letivo:** A data de início da enturmação deve estar rigorosamente dentro do intervalo de datas do ano letivo da escola (`ano_letivo.data_inicio` a `ano_letivo.data_fim`).
  3. **Validação Temporal de Saída:** A data de saída/desenturmação não pode ser cronologicamente anterior à data de entrada.
  4. **Choque de Turmas Regulares:** Impede que o aluno tenha duas enturmações regulares ativas no mesmo turno e horário.
- **Nível de Confiança:** 🟢 CONFIRMADO

#### 3. Portabilidade Atômica de Avaliações na Transferência (`TransferRegistrationDataService`)
- Localização: [`app/Services/TransferRegistrationDataService.php`](file:///d:/SYSTRAT/I-Educar/app/Services/TransferRegistrationDataService.php).
- Ao realizar transferência interna de um aluno entre escolas municipais com a mesma série:
  - O sistema executa o método `hasSameStages` comparando a regra avaliativa da escola de origem com a de destino.
  - Se ambas utilizarem o mesmo modelo de etapas (ex: 4 bimestres):
    - `CopyScoreService` copia todas as notas parciais lançadas para a nova matrícula.
    - `CopyAbsenceService` clona o montante de faltas e dias letivos computados.
    - `CopyDescriptiveOpinionService` preserva pareceres e observações pedagógicas.
  - Se houver divergência no formato das etapas (ex: 3 trimestres versus 4 bimestres), o sistema suspende a clonagem automática e emite alerta de **Adaptação Curricular Obrigatória** para a coordenação pedagógica da escola de destino.
- **Nível de Confiança:** 🟢 CONFIRMADO

#### 4. Recálculo Automático de Chamada (`SequencialEnturmacao`)
- A ordenação e numeração de chamada dos alunos no diário de classe é mantida dinamicamente:
  - Quando um aluno novo é enturmado ou remanejado antes da data-base do Censo Escolar, a lista é reordenada alfabeticamente pelo nome do estudante.
  - Quando um aluno é transferido ou desenturmado, o sistema disponibiliza opção de renumeração sequencial ou congelamento dos números originais para manter coerência com impressões físicas do diário.
- **Nível de Confiança:** 🟢 CONFIRMADO

#### 5. Remanejamento Interno de Turma (`relocate`)
- Localização: [`app/Http/Controllers/EnrollmentController.php`](file:///d:/SYSTRAT/I-Educar/app/Http/Controllers/EnrollmentController.php).
- Quando um aluno muda de turma dentro da mesma escola e série (ex: do 3º Ano A para o 3º Ano B):
  - A matrícula acadêmica (`pmieducar.matricula`) permanece ativa e não sofre alteração.
  - O registro antigo de `pmieducar.matricula_turma` tem `ativo` alterado para `0`, `remanejado` para `true` e `data_desenturmacao = data_remanejamento`.
  - Um novo registro de `pmieducar.matricula_turma` é gerado para a turma B com `data_enturmacao = data_remanejamento` e novo número sequencial de chamada.
- **Nível de Confiança:** 🟢 CONFIRMADO

---

### Módulo: HistoricoEscolar (Vida Pregressa e Histórico Escolar Oficial)

#### 1. Arquitetura Dual: Vida Pregressa Manual vs Fechamento Anual Automático
- Localização: [`app/Models/LegacySchoolHistory.php`](file:///d:/SYSTRAT/I-Educar/app/Models/LegacySchoolHistory.php), [`app/Services/SchoolHistoryService.php`](file:///d:/SYSTRAT/I-Educar/app/Services/SchoolHistoryService.php), [`ieducar/modules/HistoricoEscolar/Views/ProcessamentoApiController.php`](file:///d:/SYSTRAT/I-Educar/ieducar/modules/HistoricoEscolar/Views/ProcessamentoApiController.php).
- O módulo lida com dois ciclos operacionais distintos que convergem na mesma estrutura de dados:
  1. **Vida Pregressa (Origem Manual `origem = 0` / Cadastro Externo):** Permite à secretaria escolar digitar as etapas anteriores cursadas em outras redes ou anos anteriores à informatização do município. Não exige vínculo com matrícula do sistema (`ref_cod_matricula` pode ser nulo) e aceita nomes de escolas externas, municípios do IBGE e séries em formatos históricos.
  2. **Fechamento e Processamento Anual (Origem Automática `origem = 1`):** Executado ao encerramento do ano letivo pela direção/secretaria (`att = 'processamento'`). Lê as notas finais consolidadas do boletim escolar (`Avaliacao_Model_NotaComponenteDataMapper`), as faltas apuradas e o percentual de frequência, congelando-os imutavelmente em `pmieducar.historico_escolar` e `pmieducar.historico_disciplinas`.
- **Nível de Confiança:** 🟢 CONFIRMADO

#### 2. Regras de Cálculo e Injeção da Média Geral Ponderada
- Localização: [`app/Services/SchoolHistoryService.php`](file:///d:/SYSTRAT/I-Educar/app/Services/SchoolHistoryService.php#L66-L89), [`app/Services/GlobalAverageService.php`](file:///d:/SYSTRAT/I-Educar/app/Services/GlobalAverageService.php).
- Quando o parâmetro `processar_media_geral` está ativo na instituição ou na requisição de fechamento:
  - O serviço calcula a média de todos os componentes curriculares com base no peso e tipo da regra avaliativa vinculada à matrícula (`GlobalAverageService::getGlobalAverage`).
  - O valor resultante é arredondado de acordo com a tabela de arredondamento da regra (`tabelaArredondamento->round($grade, 2)`).
  - É inserida uma linha especial de disciplina em `pmieducar.historico_disciplinas` com o nome textual literal `'Média Geral'`.
  - Caso a regra de avaliação utilize avaliação global por etapa (sem notas numéricas individuais por disciplina), os componentes individuais recebem `'-'` e apenas a Média Geral ou conceito consolidado é registrado.
- **Nível de Confiança:** 🟢 CONFIRMADO

#### 3. Tratamento de Amparo Legal e Dispensa de Disciplinas
- Localização: [`ieducar/modules/HistoricoEscolar/Views/ProcessamentoApiController.php`](file:///d:/SYSTRAT/I-Educar/ieducar/modules/HistoricoEscolar/Views/ProcessamentoApiController.php#L717-L719).
- Disciplinas dispensadas por amparo legal (ex: Educação Física dispensada por lei federal para trabalhadores noturnos ou serviço militar obrigatório):
  - O sistema detecta a dispensa através do método `clsPmieducarTurma::verificaDisciplinaDispensada($turmaId, $componenteId)`.
  - A nota gravada na tabela de disciplinas recebe o valor textual literal `'Disp'` (`$DISCIPLINA_DISPENSADA = 'Disp'`).
  - Disciplinas com valor `'Disp'` são automaticamente expurgadas do divisor de cálculo da média geral para não penalizar o aluno.
- **Nível de Confiança:** 🟢 CONFIRMADO

#### 4. Estrutura de Agrupamento Curricular (BNCC vs Parte Diversificada)
- Localização: [`app/Models/LegacySchoolHistoryDiscipline.php`](file:///d:/SYSTRAT/I-Educar/app/Models/LegacySchoolHistoryDiscipline.php#L92-L96).
- Para atendimento aos padrões oficiais de emissão de histórico escolar:
  - As disciplinas possuem o campo `tipo_base`:
    - `tipo_base = 1`: **Base Nacional Comum Curricular (BNCC)** — Língua Portuguesa, Matemática, História, Geografia, Ciências, etc.
    - `tipo_base = 2`: **Parte Diversificada** — Língua Estrangeira Moderna (Inglês/Espanhol), Robótica, Cultura Local, etc.
  - A emissão oficial do documento organiza os blocos visuais separando as médias das disciplinas comuns das diversificadas.
- **Nível de Confiança:** 🟢 CONFIRMADO

#### 5. Assentamento Notarial Escolar (Livro, Folha, Registro de Arquivo)
- Localização: [`ieducar/intranet/educar_historico_escolar_cad.php`](file:///d:/SYSTRAT/I-Educar/ieducar/intranet/educar_historico_escolar_cad.php#L247-L250).
- Cada registro anual no histórico permanente possui três campos notariais da secretaria da escola:
  - `registro`: Código alfanumérico do assentamento arquivístico da pasta física do aluno.
  - `livro`: Identificador do Livro de Registros da Escola onde o termo foi lavrado.
  - `folha`: Número da página/folha do livro físico.
- No SYSGOV, esses campos serão enriquecidos com assinatura digital ICP-Brasil e carimbo do tempo (timestamping) para garantir validade jurídica das certidões expedidas em PDF.
- **Nível de Confiança:** 🟢 CONFIRMADO


---

### Módulo: Transporte Escolar (Transport)

#### 1. Dimensionamento de Rotas e Controle de Lotação de Passageiros
- Localização: [`ieducar/modules/TransporteEscolar/`](file:///d:/SYSTRAT/I-Educar/ieducar/modules/TransporteEscolar/).
- O sistema gerencia a relação entre frota cadastrada (`modules.veiculo`), itinerários (`modules.rota_transporte_escolar`) e a demanda de estudantes (`modules.pessoa_transporte`).
- Regra de Lotação:
  - Cada veículo possui uma capacidade homologada (`limite_passageiros`).
  - No legado, a associação de estudantes à rota não realizava o bloqueio rígido por limite de passageiros em tempo real, permitindo superlotação não monitorada.
  - No `SYS-Educa`, a alocação em rotas/veículos calcula em tempo real o percentual de ocupação, emitindo alertas visuais amarelos a partir de 90% e impedindo novas alocações após 100% da capacidade homologada.

#### 2. Fiscalização de Condutores e Segurança Viária (CTB Arts. 136-138)
- Localização: [`ieducar/modules/TransporteEscolar/Views/MotoristaController.php`](file:///d:/SYSTRAT/I-Educar/ieducar/modules/TransporteEscolar/Views/MotoristaController.php).
- Requisitos Mandatórios do Condutor:
  - Idade mínima de 21 anos e habilitação nas categorias **D** ou **E** (`categoria_cnh`).
  - Controle de vencimento de CNH (`vencimento_cnh`).
  - No `SYS-Educa`, o sistema acopla validações automáticas com jobs diários de checagem de vencimento de habilitação (30, 15 e 0 dias de antecedência), desabilitando a escalação do motorista para rotas ativas caso a CNH expire.

#### 3. Rastreamento de Quilometragem e Prestação de Contas (PNATE / FNDE)
- Localização: [`ieducar/modules/TransporteEscolar/Views/RotaController.php`](file:///d:/SYSTRAT/I-Educar/ieducar/modules/TransporteEscolar/Views/RotaController.php).
- Estrutura de Vias e Trajetos:
  - Separação mandatória entre extensão pavimentada (`km_pavimentada`) e não pavimentada (`km_nao_pavimentada`).
  - As estradas de terra/vicinais rurais recebem ponderação diferenciada nos repasses do Programa Nacional de Apoio ao Transporte do Escolar (PNATE).
  - Vínculo do aluno: mapeamento de estudantes residentes em área rural atendidos por transporte municipal, permitindo prestação de contas automatizada ao SIOPE e FNDE.

#### 4. Integração com o Censo Escolar (Educacenso - Registro 60)
- Localização: [`ieducar/modules/Educacenso/Model/ExportacaoRegistro60.php`](file:///d:/SYSTRAT/I-Educar/ieducar/modules/Educacenso/Model/ExportacaoRegistro60.php).
- Regras de Preenchimento do Aluno:
  - Campo `utiliza_transporte_escolar`: booleano indicando se o estudante depende de transporte público.
  - `poder_publico_responsavel`: 1=Estadual, 2=Municipal, 3=Em regime de colaboração (Estadual + Municipal).
  - `tipo_veiculo_transporte`: código INEP categorizado por modalidade (Ônibus urbano/rural, Micro-ônibus, Vans/Kombi, Embarcação de até 5 alunos, 5 a 15, 15 a 35 e mais de 35 alunos, ou Tração animal/bicicleta).
  - O `SYS-Educa` sincroniza bidirecionalmente a vinculação da rota escolar com as variáveis declaratórias do Censo na ficha cadastral do aluno (`pmieducar.aluno`).

---

### Módulo: Educacenso (Exportações Regulatórias MEC/Inep)

#### 1. Data de Referência e Regra de Corte Oficial do Censo Escolar
- Localização: [`ieducar/modules/Educacenso/Model/Exportacao.php`](file:///d:/SYSTRAT/I-Educar/ieducar/modules/Educacenso/Model/Exportacao.php).
- Regra de Corte:
  - O Censo Escolar Fase 1 (Matrícula Inicial) tem como data oficial de corte a **última quarta-feira do mês de maio** do respectivo ano letivo (estipulada anualmente por Portaria Ministerial do MEC).
  - Alunos matriculados ou enturmados após essa data são automaticamente omitidos do arquivo da 1ª Fase, exceto no Censo Fase 2 (Situação do Aluno), onde todo o fluxo escolar do ano é declarado.
  - Alunos transferidos ou falecidos antes da data de referência não geram o Registro 60 (vínculo aluno/turma).
- No `SYS-Educa`:
  - O cálculo da data de referência é automático (`Carbon::parse("$year-05-31")->previous(Carbon::WEDNESDAY)`), mas parametrizável por tenant municipal caso haja prorrogações extraordinárias publicadas pelo INEP em Diário Oficial.
- **Nível de Confiança:** 🟢 CONFIRMADO

#### 2. Matriz de Consistência e Regras Impeditivas de Validação (Bloqueadores vs Avisos)
- Localização: [`ieducar/modules/Educacenso/Model/Validador.php`](file:///d:/SYSTRAT/I-Educar/ieducar/modules/Educacenso/Model/Validador.php).
- O i-Educar legado executava validações pontuais em PHP durante a montagem das linhas do arquivo, causando interrupção de processo e lentidão de memória em redes municipais com mais de 10.000 alunos.
- Tipos de Inconsistências:
  - **Bloqueadores (Fatal Errors):** Escola sem código INEP (8 dígitos), Gestor escolar sem CPF válido, Turma sem etapa do INEP vinculada, Docente de sala sem Registro 30 ou sem escolaridade declarada, Aluno sem certidão de nascimento ou CPF cadastrado.
  - **Avisos (Warnings):** Estudante fora da faixa etária média da série/etapa (ex: aluno com mais de 18 anos no ensino fundamental regular), Turma sem nenhum docente vinculado, Escola sem declaração de coleta de lixo ou saneamento.
- No `SYS-Educa`:
  - A auditoria prévia executa em background via job assíncrono no Laravel 13 (`ValidateCensoBatchJob`), persistindo inconsistências na tabela `educa_censo_validation_issues` do **MySQL 8.0+**, permitindo correção pontual com links diretos aos cadastros no painel administrativo React.
- **Nível de Confiança:** 🟢 CONFIRMADO

#### 3. Pipeline de Geração e Streaming dos Registros 00 a 99
- Localização: [`ieducar/modules/Educacenso/Model/ArrayToCenso.php`](file:///d:/SYSTRAT/I-Educar/ieducar/modules/Educacenso/Model/ArrayToCenso.php).
- Formatação Estrita do INEP:
  - O arquivo é texto puro formatado com delimitador pipe (`|`), sem cabeçalhos e finalizado por quebra de linha Windows (`\r\n`).
  - Caracteres especiais acentuados são normalizados para ASCII padrão (sem cedilha, sem til, sem acentos gráficos) em conformidade com as regras de importação do software local do Censo (Educacenso Web / Módulo de Migração).
  - Cada linha inicia com o número do registro (ex: `00|`, `10|`, `20|`, `30|`, `40|`, `50|`, `60|`, `99|`).
  - O Registro 99 fecha o arquivo totalizando numericamente a quantidade exata de linhas geradas para cada um dos registros precedentes.
- No `SYS-Educa`:
  - Utilização de Generator / Cursor Lazy Collections do Laravel e gravação em stream direto para o storage de arquivos com cálculo simultâneo de hash SHA-256 para comprovação jurídica de envio ao MEC.
- **Nível de Confiança:** 🟢 CONFIRMADO

#### 4. Importação e Conciliação do Arquivo de Retorno do INEP
- Localização: [`ieducar/modules/Educacenso/Model/Importacao.php`](file:///d:/SYSTRAT/I-Educar/ieducar/modules/Educacenso/Model/Importacao.php).
- Fluxo de Retorno:
  - Após o processamento da remessa no ambiente do Educacenso, o MEC disponibiliza um arquivo de retorno contendo os identificadores únicos definitivos de Escolas, Turmas, Docentes e Alunos (ID INEP de 12 dígitos).
  - O parser de retorno lê o arquivo, identifica os pares correspondentes via CPF/Certidão/Código Interno e atualiza os mapeamentos correspondentes (`educacenso_cod_escola`, `educacenso_cod_turma`, `educacenso_cod_aluno`, `educacenso_cod_docente`).
  - Identificadores atribuídos pelo INEP tornam-se imutáveis e passam a compor obrigatoriamente as exportações subsequentes dos anos seguintes.
- **Nível de Confiança:** 🟢 CONFIRMADO


---

## 10. Regras de Avaliação, Fórmulas de Média e Arredondamento (`EvaluationRules` / `FormulaMedia`)

### 10.1 Arquitetura e Modelagem do Legado
O subsistema de avaliação do i-Educar é estruturado em torno das regras de avaliação (`modules.regra_avaliacao`), que vinculam séries e anos letivos a fórmulas matemáticas de cálculo de média (`modules.formula_media`), tabelas de arredondamento de notas (`modules.tabela_arredondamento`) e regras de recuperação paralela/específica (`modules.regra_avaliacao_recuperacao`).

#### Componentes Centrais no Legado:
- `RegraAvaliacao_Model_Regra`: Entidade agregadora que define tipo de nota (numérica/conceitual), tipo de progressão (continuada, média e presença, manual, ciclo), fórmula de média final e fórmula de exame final, além de controle de dependência (`qtd_disciplinas_dependencia`).
- `FormulaMedia_Model_Formula`: Entidade que armazena a expressão matemática da média (`formula_media`), parâmetros de etapas (`tipo_formula`: 1=Geral, 2=Recuperação Final) e configuração de substituição de menor nota (`substitui_menor_nota_rc`).
- `FormulaMedia_Model_Formula::_exec()`: **Vulnerabilidade Crítica de Segurança** no legado. O i-Educar executava fórmulas via `eval('?><?php $result = ' . $code . '; ?>')`, permitindo potencial Remote Code Execution (RCE) se fórmulas fossem inseridas com payloads arbitrários.
- `TabelaArredondamento_Model_Tabela` e `TabelaArredondamento_Model_TabelaValor`: Mapeiam intervalos de notas numéricas para casas decimais arredondadas ou notas conceituais (`nome`, `descricao`, `valor_minimo`, `valor_maximo`).
- `RegraAvaliacao_Model_RegraRecuperacao`: Define recuperação paralela com 3 tipos de cálculo (`substitui_menor_se_maior`, `media_com_etapa`, `soma_pontos`).

---

### 10.2 Migração para SYSGOV / SYS-Educa (MySQL 8.0+ / Laravel 13)

#### 1. Eliminação do `eval()` e Adoção de AST Engine Seguro
No SYSGOV, a execução de fórmulas via PHP `eval()` foi estritamente banida. Em seu lugar, foi especificado o `AverageCalculationEngine` baseado no `Symfony\Component\ExpressionLanguage\ExpressionLanguage` em sandbox hermético com validação de tokens (`Se`, `Et`, `E1..E10`, `Rc`, `RSP1..RSP10`, `min`, `max`, `round`).

#### 2. DDL em MySQL 8.0+
- `educa_formula_averages`: Armazena expressões matemáticas parametrizadas, tokens aceitos e validação de sintaxe.
- `educa_rounding_tables` e `educa_rounding_table_values`: Tabelas de arredondamento e conversão de notas conceituais em intervalos numéricos com precisão `DECIMAL(5,3)`.
- `educa_evaluation_rules`: Regras agregadoras com tipo de nota (`numeric`, `conceptual`, `none`), progressão (`continued`, `average_attendance`, `only_average`, `manual`, `cycle`), tipo de presença (`general`, `by_discipline`), e regras de dependência.
- `educa_evaluation_rule_remedials`: Configuração de recuperação paralela por etapa com substituição ou média ponderada.
- `educa_evaluation_rule_series`: Vinculação de regras de avaliação a séries curriculares por ano letivo.

#### 3. Frontend & SDK (@sysgov/ui + @sysgov/sdk)
- Contratos de tipos TypeScript definidos em `@sysgov/sdk` para regras, fórmulas, arredondamento e resultados de simulação.
- Componente `AverageSimulator` em React 19 + Tailwind v4 + `@sysgov/ui` para simulação em tempo real e visualização gráfica de notas de etapas, recuperação paralela, exame final e veredito escolar.

---

## 11. Quadro de Horários e Alocação Docente (\Timetable\ / \Servidores / Alocação\)

### 11.1 Arquitetura e Modelagem do Legado
No i-Educar legado, a alocação de professores e a gestão de horários de aula distribuíam-se entre rotinas legadas em PHP procedural e classes DAO:
- **Quadro de Horários da Turma:** Entidade \pmieducar.quadro_horario\ vinculada à turma (ef_cod_turma\) e ao ano letivo (\no\).
- **Slots Semanais de Aulas:** Tabela \pmieducar.quadro_horario_horarios\, mapeando \dia_semana\ (1=Dom .. 7=Sáb), intervalo (\hora_inicial\ a \hora_final\), componente curricular (ef_cod_disciplina\), escola, série e servidor docente titular (ef_servidor\) e substituto eventual (ef_servidor_substituto\).
- **Tabela Auxiliar Transitória:** \pmieducar.quadro_horario_horarios_aux\ utilizada como buffer de staging durante a montagem interativa da grade no formulário legado (\ducar_quadro_horario_horarios_cad.php\).
- **Alocação Administrativa:** \pmieducar.servidor_alocacao\ registra a jornada semanal do docente na unidade de ensino, repartindo carga horária em sala de aula (\carga_horaria\), hora-atividade para planejamento (\hora_atividade\) e horas suplementares/excedentes (\horas_excedentes\).
- **Habilitação de Disciplinas:** \pmieducar.servidor_disciplina\ valida se o docente está qualificado a lecionar determinada matéria curricular por curso.
- **Detecção de Choques no Legado:** Realizada via método \clsPmieducarQuadroHorarioHorarios::retornaHorario()\ e busca no índice \quadro_horario_horarios_busca_horarios_idx\. No entanto, a consulta ocorria de forma restrita e vulnerável a concorrência sem bloqueio transacional ou abrangência multi-escola municipal.

---

### 11.2 Migração para SYSGOV / SYS-Educa (MySQL 8.0+ / Laravel 13)

#### 1. Algoritmo Transacional de Prevenção de Choques
- O serviço \ScheduleConflictDetectorService\ no monólito Laravel 13 (\pps/api\) executa detecção determinística de sobreposição temporal de intervalos:
  	ext{Slot A} \cap 	ext{Slot B} 
eq \emptyset \iff (H_{	ext{inicio}, A} < H_{	ext{fim}, B}) \land (H_{	ext{fim}, A} > H_{	ext{inicio}, B})
- Duas verificações obrigatórias:
  1. **Choque na Turma:** Impede que a mesma turma tenha duas aulas simultâneas.
  2. **Choque no Professor (Global no Tenant):** Impede que um docente tenha duas aulas simultâneas em quaisquer turmas ou escolas pertencentes ao mesmo município contratante.

#### 2. DDL em MySQL 8.0+
- \duca_timetables\: Cabeçalho do quadro de horários com controle de versões e ciclo de vida (\DRAFT\, \PUBLISHED\, \ARCHIVED\).
- \duca_timetable_slots\: Aulas da grade semanal com dia da semana (1..7), horários (\TIME\), disciplina e professor titular.
- \duca_teacher_allocations\: Vínculo administrativo na escola discriminando horas de sala de aula, horas de planejamento e regime contratual.
- \duca_teacher_qualifications\: Habilitações docentes registradas por componente curricular.
- \duca_teacher_substitutions\: Rastreabilidade de substituições com período de vigência, justificativa e validação de choque do substituto.

#### 3. Frontend & SDK (@sysgov/ui + @sysgov/sdk)
- Contratos TypeScript padronizados em \@sysgov/sdk\ (\Timetable\, \TimetableSlot\, \DayOfWeek\, \ConflictValidationResult\, \TeacherAllocationSummary\).
- Componente \TimetableGrid\ em React 19 + Tailwind v4 + \@sysgov/ui\ com visualização semanal em matriz, badges de status, slots configuráveis e alertas visuais imediatos de conflito de choques de professores e turmas.

---

## 12. Diário de Classe / Frequência e Conteúdos Ministrados (`DailyRecord` / `Frequencia` / `LancamentoAulas`)

### 12.1 Arquitetura e Modelagem do Legado
No i-Educar legado original:
- **Ausência de Diário Atômico:** O i-Educar legado não mantinha registros atômicos de cada aula diária (data, conteúdo lecionado, habilidades, tarefas de casa) em seu banco central, armazenando apenas faltas consolidadas por etapa letiva.
- **Tabelas de Faltas Agregadas:**
  - `modules.falta_aluno`: Tabela mestre associada à matrícula (`matricula_id`) e ao tipo de falta (`tipo_falta`: 1 para Geral, 2 para Por Componente Curricular).
  - `modules.falta_geral`: Total acumulado de faltas do aluno em uma etapa (`etapa`), independentemente da disciplina.
  - `modules.falta_componente_curricular`: Faltas acumuladas do aluno por componente curricular específico (`componente_curricular_id`) em uma etapa.
- **Limitações do Legado:**
  - Impossibilidade de auditoria da presença aula a aula ou de reconstituição do diário diário do professor.
  - Ausência de registro estruturado de conteúdos ministrados e alinhamento com a Base Nacional Comum Curricular (BNCC).
  - Inexistência de controle de atestados médicos com data inicial, data final e CID, obrigando o lançamento manual direto como falta abonada/justificada genérica.
  - Falta de alertas preditivos automatizados de infrequência e risco de evasão escolar (LDB art. 12, VIII / FICAI).

---

### 12.2 Migração para SYSGOV / SYS-Educa (MySQL 8.0+ / Laravel 13)

#### 1. DDL Normalizado em MySQL 8.0+
- `educa_class_lessons`: Registro atômico de aulas com chave estrangeira para turma, componente curricular, professor, data da aula (`DATE`), quantidade de aulas/slots (`order_index`, `slots_count`) e conteúdos lecionados/habilidades BNCC em formato estruturado (`JSON`).
- `educa_attendance_records`: Chamada atômica vinculada à aula e ao aluno enturmado, com status enum (`PRESENT`, `ABSENT`, `JUSTIFIED_ABSENT`), motivo e vínculo ao atestado.
- `educa_absence_justifications`: Gestão de atestados médicos e licenças legais, com período de vigência (`start_date`, `end_date`), CID-10/11, profissional emissor/registro de conselho e flag de abono legal (`is_excused`).
- `educa_stage_absence_summaries`: Tabela de consolidação de faltas por etapa letiva sincronizada via triggers/serviço assíncrono para rápida alimentação de boletins e históricos sem agregação em tempo real.

#### 2. Serviço de Frequência e Alertas de Evasão (`AttendanceService`)
- Monólito Laravel 13 (`apps/api`) gerencia o lançamento em lote transacional (`recordRollCall`).
- Validação automática de bloqueio de etapas fechadas (`lock_date` e `is_closed` do calendário).
- Detecção em tempo de chamada de atestados médicos ativos para pré-preenchimento ou marcação automática de `JUSTIFIED_ABSENT`.
- Disparo de eventos e alertas de evasão escolar (LDB / Lei Federal 13.803/2019):
  - **Atenção:** Infrequência > 15% (frequência < 85%).
  - **Crítico (Risco de Evasão / Conselho Tutelar):** Infrequência > 25% (frequência < 75%) ou 5 faltas consecutivas sem justificativa.

#### 3. Frontend & SDK (@sysgov/ui + @sysgov/sdk)
- Contratos TypeScript padronizados em `@sysgov/sdk` (`ClassLesson`, `AttendanceRecord`, `AttendanceStatus`, `AbsenceJustification`, `StageAbsenceSummary`, `RollCallBatchPayload`).
- Componente `DailyRollCall` em React 19 + Tailwind v4 + `@sysgov/ui` oferecendo:
  - Cabeçalho com data, turma, disciplina, quantidade de horários e botões rápidos ("Marcar Todos Presentes", "Inverter").
  - Grade de alunos com fotos, crachá de frequência acumulada, status visual (`PRESENT`, `ABSENT`, `JUSTIFIED_ABSENT`) e campo para justificativa/anexo.
  - Abas integradas para registro de Conteúdos Ministrados, Metodologia e Habilidades BNCC.

---

## 13. Reports / Relatórios e Documentos Oficiais (`Reports` / `DocumentosOficiais` / `Certidões`)

### 13.1 Arquitetura e Modelagem do Legado
No i-Educar legado original:
- **Motor Externo JasperReports (.jrxml):** Toda a geração de PDFs dependia de templates Jasper compilados processados por um servidor Java externo (JasperServer ou daemon `ReportFactoryPHPJasper`). Isso gerava problemas crônicos de desempenho, falhas de conexão de socket e impossibilidade de customização ágil de templates pelos municípios.
- **Ausência de Autenticidade e Rastreabilidade:** Os endpoints de relatórios (`ReportController` e `ReportCoreController`) geravam o documento e o devolviam como fluxo de bytes para download imediato. Não havia persistência de metadados das certidões emitidas, código de verificação ou QR Code para validação pública.
- **Contadores Triviais:** Apenas a tabela `report_counts` incrementava um contador numérico rudimentar de impressões por escola/relatório, sem registrar para qual aluno o atestado fora expedido, quem o assinou ou se ainda era válido.
- **Fragilidade em Inspeções Escolares:** As Atas Finais de Resultados e Históricos Escolares eram recalculadas em tempo de execução através de queries complexas, sujeitas a discrepâncias caso regras de avaliação ou notas fossem alteradas retroativamente.

---

### 13.2 Migração para SYSGOV / SYS-Educa (MySQL 8.0+ / Laravel 13)

#### 1. DDL Normalizado em MySQL 8.0+
- `educa_document_templates`: Modelos de layout com parametrização de brasão, mantenedora, secretaria, dados da escola, corpo em Blade e rodapé com decretos e portarias oficiais (`document_type`, `header_layout`, `body_template`, `footer_layout`, `page_orientation`, `paper_size`, `show_qr_code`, `validity_days`).
- `educa_issued_documents`: Registro auditável de cada via oficial expedida com código alfanumérico público único (`AUTH-2026-XXXX-YYYY`), hash criptográfico SHA-256 do payload, snapshot JSON integral congelado dos dados acadêmicos no momento da emissão, caminho do PDF/A no Object Storage (S3/MinIO), operador emissor, finalidade e status (`ACTIVE`, `EXPIRED`, `REVOKED`).
- `educa_document_signatures`: Vínculo com assinaturas eletrônicas ou digitais ICP-Brasil de gestores e secretários escolares, em conformidade com a Lei Federal nº 14.063/2020 e carimbo de tempo.
- `educa_final_grade_records`: Ata consolidada e congelada pós-fechamento do ano letivo por turma, armazenando o rendimento por componente curricular (`discipline_scores`), faltas, frequência global e situação final (`APPROVED`, `APPROVED_BY_EXAM`, `RETAINED_BY_SCORE`, `RETAINED_BY_ABSENCE`, `TRANSFERRED`), com flag de homologação e trava de segurança (`is_closed`).

#### 2. Serviços de Emissão, Autenticidade e PDF/A (`apps/api`)
- **Renderização Nativa:** Templates desenvolvidos em Blade e Tailwind v4 com CSS Paged Media (`@page`), renderizados via Chromium Headless (Gotenberg ou Browsershot) em formato arquivístico **PDF/A** de alta fidelidade visual.
- **Autenticidade e QR Code:** O `DocumentSecurityService` gera o código verificador e o QR Code direcionando para a rota pública do tenant (`/valida-documento?codigo=...`), permitindo que cartórios, outras escolas e órgãos públicos consultem o espelho oficial e confirmem a autenticidade instantaneamente.
- **Ata Final Homologada:** O `FinalGradeSheetService` congela a relação nominal e o rendimento escolar na conclusão do ano letivo, impedindo adulterações e atendendo rigorosamente às exigências de inspeção dos Conselhos Estaduais e Municipais de Educação.

#### 3. Frontend & SDK (@sysgov/ui + @sysgov/sdk)
- Contratos TypeScript padronizados em `@sysgov/sdk` (`DocumentType`, `DocumentStatus`, `IssueDocumentPayload`, `IssuedDocumentResponse`, `PublicDocumentVerificationResult`, `FinalGradeRecord`).
- Componentes React 19 + Tailwind v4 + `@sysgov/ui`:
  - `DocumentIssuanceModal`: Interface intuitiva para seleção do documento oficial (Atestado de Matrícula, Atestado de Frequência, Boletim Escolar, Ficha Individual, Declaração de Transferência), definição de finalidade, pré-visualização, geração com barra de progresso e download imediato do PDF/A autenticado.
  - `PublicDocumentValidator`: Página pública institucional com busca por código verificador ou leitura de QR Code, exibindo badge de autenticidade (Válido / Revogado / Inexistente), espelho dos dados escolares e download seguro da via arquivística.



---

## 14. Configuracao / Parametrizações Globais da Rede de Ensino e Bloqueio de Prazos (`Configuracao` / `ParametrizacaoRede`)

### 14.1 Arquitetura e Modelagem do Legado
No i-Educar legado original:
- **Dispersão e Despadronização:** As configurações institucionais da rede e do sistema ficavam divididas entre `pmieducar.instituicao` (dados da mantenedora, datas de corte e regras de matrícula), `pmieducar.configuracoes_gerais` (branding e relatórios), `pmieducar.bloqueio_ano_letivo` (datas limites de lançamento) e `public.settings` (pares chave-valor globais sem separação de tenant).
- **Insegurança Estrutural em `settings`:** A tabela `settings` armazenava até credenciais de banco e senhas em texto puro de forma global, sem isolamento por tenant ou suporte nativo a criptografia.
- **Bloqueio Rígido e Inflexível:** A tabela `bloqueio_ano_letivo` implementava um intervalo fechado `[data_inicio, data_fim]` imposto a toda a rede municipal, sem diferenciação por tipo de ação (lançamento de notas vs. chamada/frequência vs. movimentação de matrícula) e sem suporte a escopos por etapa ou escola.
- **Inexistência de Gestão de Exceções:** Quando um professor precisava de reabertura de prazo por motivo justificado (ex: atestado médico), a SME era forçada a reabrir o bloqueio para todo o município, comprometendo a integridade dos dados e o cumprimento de prazos.

---

### 14.2 Migração para SYSGOV / SYS-Educa (MySQL 8.0+ / Laravel 13)

#### 1. DDL Normalizado em MySQL 8.0+
- `educa_network_configurations`: Parâmetros institucionais centrais da mantenedora municipal (`entity_name`, `acronym`, `cnpj`, `state_code`, `city_ibge_code`, `cne_cutoff_day`, `cne_cutoff_month`, flags de obrigatoriedade cadastral de CPF, certidão, SUS, laudo de AEE e limites de dependência disciplinar).
- `educa_calendar_locks`: Motor de bloqueio granular de prazos por ano letivo, tipo de operação (`GRADE_POSTING`, `ATTENDANCE_POSTING`, `LESSON_PLAN`, `ENROLLMENT_MODIFICATION`, `ACADEMIC_HISTORY`), escopo (`NETWORK`, `STAGE`, `SCHOOL`), janela temporal (`lock_start_at`, `lock_end_at`) e tolerância retroativa em dias.
- `educa_lock_exceptions`: Concessão auditada de exceções e prorrogações extraordinárias de prazo direcionadas a um usuário/professor específico, turma, disciplina ou escola, com prazo limite improrrogável (`expires_at`), número de protocolo/processo administrativo e justificativa fundamentada.
- `educa_system_parameters`: Dicionário chave-valor dinâmico e tipado (`STRING`, `INTEGER`, `DECIMAL`, `BOOLEAN`, `JSON`, `ENCRYPTED`) com isolamento multi-tenant, encriptação AES-256 para segredos e invalidação de cache atômica.

#### 2. Serviços de Governança, Interceptor de Bloqueio e Cache (`apps/api`)
- **Interceptor de Bloqueio em Tempo Real (`CalendarLockManagerService`):** Middleware acionado em qualquer tentativa de mutação no diário, lançamento de notas ou secretaria escolar. Valida se a data/hora atual está contida em janela de bloqueio ativa e verifica automaticamente a existência de exceções individuais válidas e não revogadas antes de vetar a operação (lançando `CalendarLockedException` / HTTP 423 Locked).
- **Cache Distribuído de Parâmetros (`SystemParameterService`):** Armazenamento em memória Redis com tags por tenant (`tenant:{tenant_id}`, `system_params`), garantindo resolução de parâmetros de rede em menos de 1ms e recarga instantânea na alteração de configurações.

#### 3. Frontend & SDK (@sysgov/ui + @sysgov/sdk)
- Contratos TypeScript padronizados em `@sysgov/sdk` (`NetworkConfigurationDTO`, `CalendarLockDTO`, `LockExceptionDTO`, `SystemParameterDTO`, `CalendarOperationType`, `LockScopeType`).
- Componentes React 19 + Tailwind v4 + `@sysgov/ui`:
  - `CalendarLockManager`: Painel administrativo com visualização em abas dos bloqueios ativos da rede e das prorrogações concedidas em tempo real, com crachás de operação, status de vigência e controle de reativação/revogação.
  - `NetworkSettingsTabs`: Interface unificada para configuração dos parâmetros da mantenedora, diretrizes de corte etário CNE (31/03), regras de dependência, documentos obrigatórios e identidades visuais da Secretaria.
---

## 15. Stages (Etapas de Ensino, Ciclos e Séries Escolares) (`Stages` / `CiclosSeries`)

### 15.1 Arquitetura e Modelagem do Legado
No i-Educar legado original:
- **Dispersão e Acoplamento em `pmieducar.curso` e `pmieducar.serie`:** Cursos e séries concentravam regras heterogêneas de avaliação, calendário, limites etários e regras de censo misturadas diretamente no registro estrutural da etapa.
- **Inflexibilidade de Ciclos e Progressão Continuada:** No Brasil, o bloco pedagógico de alfabetização (1º e 2º anos, conforme Resolução CNE/CEB nº 7/2010) adota o regime de progressão continuada (sem reprovação por notas). No legado, isso era contornado por artifícios de código PHP ou fórmulas de avaliação especiais, sem uma abstração nativa de ciclos.
- **Restrição da Matriz de Sequência (`pmieducar.sequencia_serie`):** O modelo legado limitava-se a vínculos lineares 1:1, inviabilizando trajetórias de aceleração de aprendizagem (correção de fluxo para distorção idade-série), dependência parcial disciplinar e transições entre modalidades regulares e EJA.
- **Autorização de Cursos por Escola sem Histórico Normativo:** A tabela `pmieducar.escola_curso` guardava apenas a ligação física escola-curso sem registrar número da portaria/resolução do Conselho de Educação nem o histórico temporal de vigência da oferta.

---

### 15.2 Migração para SYSGOV / SYS-Educa (MySQL 8.0+ / Laravel 13)

#### 1. DDL Normalizado em MySQL 8.0+
- `educa_education_levels`: Níveis e modalidades nacionais de ensino (`code`, `name`, `inep_level_code`, `stage_modality`, `display_order`), mapeando Educação Infantil, Ensino Fundamental Anos Iniciais/Finais, Ensino Médio, EJA e Educação Especial.
- `educa_courses`: Matriz de cursos mantidos pela rede municipal (`education_level_id`, `evaluation_rule_id`, `code`, `name`, `regime_type`, `inep_course_code`, `minimum_workload_hours`, `minimum_school_days`, `total_stages`, `stage_division_type`).
- `educa_grades`: Séries escolares, anos e etapas de ciclos (`course_id`, `name`, `order_index`, `stage_code_inep`, `workload_hours`, `school_days`, `target_age`, `min_age`, `max_age`, `cutoff_day`, `cutoff_month`, `is_graduating_stage`, `cycle_name`, `is_continuous_progression`).
- `educa_grade_sequences`: Matriz relacional de transição entre séries (`origin_grade_id`, `destination_grade_id`, `transition_type`, `requires_board_approval`), suportando `REGULAR_PROMOTION`, `CYCLE_CONTINUATION`, `PARTIAL_DEPENDENCY`, `ACCELERATION_JUMP` e `INTER_COURSE_TRANSITION`.
- `educa_course_school_offers`: Habilitação e autorização da oferta de cursos por unidade escolar (`school_id`, `course_id`, `authorization_act_number`, `authorization_date`, `start_year`, `end_year`).

#### 2. Serviços de Estrutura Curricular e Motor de Progressão (`apps/api`)
- **Gestão de Cursos e Séries (`AcademicStructureService`):** Validação estrita de diretrizes da LDB (mínimo de 200 dias letivos e 800 horas para cursos anuais), geração da árvore hierárquica completa de ensino e autorização da oferta nas escolas municipais.
- **Motor da Matriz de Progressão (`GradeProgressionMatrixService`):** Resolução automatizada da série de destino na virada de ano letivo com base na situação final do aluno (`APPROVED`, `CONTINUOUS_CYCLE`, `FAILED`, `ACCELERATED`), respeitando regras de ciclo continuado e exigências deliberativas do Conselho de Classe.

#### 3. Frontend & SDK (@sysgov/ui + @sysgov/sdk)
- Contratos TypeScript padronizados em `@sysgov/sdk` (`EducationLevelDTO`, `CourseDTO`, `GradeDTO`, `GradeSequenceDTO`, `CourseSchoolOfferDTO`, `TransitionType`, `StageDivisionType`).
- Componentes React 19 + Tailwind v4 + `@sysgov/ui`:
  - `CurriculumStructureTree`: Visualizador hierárquico interativo de Níveis -> Cursos -> Séries -> Ciclos, com badges de conformidade LDB/INEP, carga horária e indicadores de etapas concluintes.
  - `GradeSequenceMatrixBuilder`: Construtor visual em tabela e formulário reativo para criação e auditoria de regras de transição entre séries (promoção, ciclos, dependência e aceleração).

---

## 16. Usuario (Perfis de Acesso, Autenticação e Permissões) (`Usuario` / `AuthRBAC`)

### 16.1 Arquitetura e Modelagem do Legado
No i-Educar legado original:
- **Dispersão e Bifurcação de Credenciais:** As credenciais de acesso (login, e-mail e hash da senha) eram armazenadas na tabela legada `portal.funcionario`, enquanto o registro operacional do usuário existia em `pmieducar.usuario`, ligados pela chave estrangeira `ref_cod_pessoa_fj` / `cod_usuario`. Essa dissociação gerava inconsistências cadastrais e dificultava a unificação de contas.
- **Autorização Acoplada a Menus de Interface (`pmieducar.menu_tipo_usuario`):** As permissões eram definidas diretamente sobre itens de menu do template antigo, utilizando colunas ternárias (`visualiza`, `cadastra`, `exclui`). Essa modelagem deixava rotas de API e endpoints HTTP expostos a execuções diretas caso o programador esquecesse de invocar a checagem procedural no topo do script PHP legado.
- **Hierarquias Rígidas em Constantes Inteiras (`pmieducar.tipo_usuario`):** Os níveis de acesso eram definidos por constantes fixas (`1 - Poli-institucional`, `2 - Institucional`, `4 - Escola`, `8 - Biblioteca`). Faltava flexibilidade para criar perfis customizados ou atribuir responsabilidades mistas (ex.: servidor atuando como Coordenador Pedagógico em uma escola e Professor em outra).
- **Inexistência de Segundo Fator (MFA) e Identidade Federada:** O sistema não possuía suporte a TOTP (Google/Microsoft Authenticator) nem integração com o padrão federal **Gov.br (OIDC)**, indispensável para sistemas de gestão pública no Brasil, além de não auditar de forma centralizada as tentativas falhas de login para prevenção de ataques de força bruta.

---

### 16.2 Migração para SYSGOV / SYS-Educa (MySQL 8.0+ / Laravel 13)

#### 1. DDL Normalizado em MySQL 8.0+
- `core_users`: Identidade central unificada de servidores e gestores municipais (`tenant_id`, `cpf`, `name`, `email`, `phone`, `password_hash` com Argon2id, `status`, `email_verified_at`, `mfa_enabled`, `mfa_secret` AES-256, `mfa_type`, `govbr_subject_id`, `failed_login_attempts`, `locked_until`, `last_login_at`, `last_login_ip`, `deleted_at`).
- `core_roles`: Perfis e papéis funcionais dinâmicos (`name`, `slug`, `description`, `hierarchy_level`, `scope_type`, `is_system_preset`, `is_active`).
- `core_permissions`: Catálogo global de permissões atômicas padronizadas em `recurso.subrecurso.acao` (`module`, `action`, `slug`, `name`, `description`).
- `core_role_permissions`: Tabela de junção N:N associando perfis de acesso a permissões concedidas (`role_id`, `permission_id`, `granted_at`, `granted_by`).
- `educa_user_school_scopes`: Lotação escolar dinâmica permitindo atribuição multi-escola com papéis distintos por unidade escolar, controle de lotação principal (`is_primary`) e datas de vigência (`valid_from`, `valid_until`).

#### 2. Serviços de Autenticação, RBAC e Escopos Escolares (`apps/api`)
- **Serviço de Autenticação e MFA (`AuthenticationService`):** Suporte nativo a login por CPF institucional com hashing seguro em Argon2id, controle de tentativas falhas com bloqueio progressivo temporário (15 minutos após 5 falhas), desafio de segundo fator via TOTP com segredo criptografado e emissão de tokens JWT stateless com claims de tenant, usuário e escopos escolares.
- **Serviço de Autorização RBAC Contextual (`AuthorizationRbacService`):** Motor de avaliação de permissões com caching distribuído no Redis. Valida permissões em dois níveis: permissões globais da mantenedora municipal e permissões restritas ao escopo da escola em que o usuário está atuando na requisição ativa.
- **Gestão de Lotação Escolar (`UserSchoolScopeService`):** Atribuição e revogação de vínculos funcionais em unidades escolares, validação de limites de lotação principal e expiração automática de designações temporárias.

#### 3. Frontend & SDK (@sysgov/ui + @sysgov/sdk)
- Contratos TypeScript padronizados em `@sysgov/sdk` (`CoreUserDTO`, `CoreRoleDTO`, `CorePermissionDTO`, `UserSchoolScopeDTO`, `AuthSessionResponse`, `UserStatus`, `MfaType`, `ScopeType`).
- Componentes React 19 + Tailwind v4 + `@sysgov/ui`:
  - `UserProfileAccessManager`: Painel de administração de usuários com visão geral de credenciais, status cadastral, indicador de MFA ativo e gestão completa de lotações e escopos escolares em modais com seletores reativos.
  - `RolePermissionMatrix`: Matriz visual interativa de concessão de permissões por perfil de acesso, agrupada por módulos funcionais, com busca em tempo real e atualização assíncrona com feedback de estado otimista.


---

## 17. Módulos de Suporte: ErrorTracking, Navigation e Notifications (`SupportModules`)

### 17.1 Arquitetura e Modelagem do Legado
No i-Educar legado:
- **ErrorTracking Acoplado e Síncrono (`Modules/ErrorTracking/`):** A captura de falhas era baseada na fábrica `TrackerFactory`, que instanciava implementações pontuais como `HoneyBadgerTracker` ou `EmailTracker`. O `EmailTracker` utilizava `FlattenException` e disparava e-mails síncronos no meio do ciclo de vida da requisição HTTP, contendo trechos brutos de código e variáveis de ambiente em HTML cru. Essa abordagem apresentava sérios riscos de vazamento de senhas, chaves de API e dados pessoais de estudantes e servidores (não conformidade com a LGPD), além de causar travamentos na experiência do usuário em caso de lentidão no servidor SMTP. Não havia retenção estruturada dos erros em banco de dados local com correlacionamento distribuído (TraceID).
- **Navigation Procedural e Acoplada a Permissões Legadas (`app/Menu.php` / `portal.menu_menu`):** A navegação lateral e os breadcrumbs eram montados por scripts legados que consultavam tabelas relacionais antigas vinculadas diretamente a IDs numéricos de processos (`process_id`). Não existia um catálogo centralizado e declarativo de nós de navegação desacoplado das regras de autorização, nem suporte a atalhos rápidos de teclado, busca unificada ou Command Palette (`Ctrl + K`).
- **Notifications Fragmentadas e Monocanal (`public.notifications`, `messages`, `announcements`):** O sistema possuía múltiplas tabelas dispersas com propósitos sobrepostos para mensagens entre usuários e avisos escolares. As notificações eram estritamente in-app ou baseadas em transmissões simples de WebSocket, sem suporte a uma esteira unificada de mensageria omnichannel (E-mail transacional, Web Push, SMS, WhatsApp). Não havia um mecanismo formal para comunicados institucionais compulsórios da Secretaria de Educação (com exigência de leitura obrigatória e bloqueio de tela pré-login para auditabilidade jurídica).

---

### 17.2 Migração para SYSGOV / SYS-Educa (MySQL 8.0+ / Laravel 13)

#### 1. DDL Normalizado em MySQL 8.0+ (Tabelas 88 a 94)
- `core_system_errors`: Registro centralizado de incidentes e falhas não tratadas (`tenant_id`, `trace_id` OpenTelemetry, `environment`, `severity`, `exception_class`, `message` sanitizada, `file`, `line`, `stack_trace`, `http_method`, `request_uri`, `request_payload_sanitized`, `client_ip`, `user_agent`, `resolved_at`, `resolved_by_user_id`).
- `core_audit_logs`: Trilha imutável de auditoria e conformidade LGPD (`tenant_id`, `user_id`, `school_id`, `action`, `auditable_type`, `auditable_id`, `old_values` JSON, `new_values` JSON, `ip_address`, `user_agent`).
- `core_navigation_nodes`: Árvore hierárquica e declarativa de rotas e itens de menu (`parent_id`, `code`, `title`, `route`, `icon`, `permission_slug`, `order_index`, `is_visible`, `is_command_palette`, `badge_text`).
- `core_user_navigation_favorites`: Atalhos e telas fixadas personalizadas por usuário (`tenant_id`, `user_id`, `navigation_node_id`, `order_index`).
- `core_notifications`: Hub central de notificações omnichannel para usuários (`tenant_id`, `recipient_user_id`, `category`, `priority`, `title`, `body`, `action_url`, `metadata` JSON, `channel`, `read_at`, `sent_at`).
- `core_announcements`: Comunicados, circulares e decretos institucionais da mantenedora (`tenant_id`, `school_id`, `title`, `content`, `type`, `priority`, `target_audience`, `requires_ack`, `valid_from`, `valid_until`, `is_published`, `author_user_id`).
- `core_announcement_reads`: Auditoria comprobatória de leitura e termo de ciência com IP e timestamp (`tenant_id`, `announcement_id`, `user_id`, `read_at`, `acknowledged_at`, `ip_address`).

#### 2. Serviços de Suporte e Infraestrutura (`apps/api`)
- **Rastreamento de Incidentes (`ErrorTrackingService`):** Captura global via middleware e interceptor de exceções, geração de TraceID padrão W3C/OpenTelemetry, mascaramento automático de campos sensíveis (senhas, CPFs, tokens, cartões) conforme diretrizes da LGPD, persistência assíncrona na tabela `core_system_errors` via fila (RabbitMQ/Redis) e notificação automática de incidentes críticos para canais de engenharia (Sentry/Slack).
- **Serviço de Navegação e Menu Inteligente (`NavigationTreeService`):** Montagem recursiva da árvore de navegação com cache multi-camada no Redis com TTL longo e invalidação por tags. Filtra dinamicamente os nós com base nos slugs de permissão RBAC do usuário ativo e indexa rotas e ações para consumo instantâneo pela paleta de comandos.
- **Hub de Notificações e Comunicados Compulsórios (`NotificationHubService`):** Roteamento inteligente de notificações para múltiplos canais (WebSockets via Laravel Reverb, Web Push, E-mail com templates padronizados e WhatsApp via API oficial), com controle de leitura e marcação em lote. Implementa barreira de bloqueio no login quando existem comunicados com `requires_ack = 1` pendentes de confirmação de ciência pelo servidor.

#### 3. Frontend & SDK (@sysgov/ui + @sysgov/sdk)
- Contratos TypeScript padronizados em `@sysgov/sdk` (`SystemErrorDTO`, `AuditLogDTO`, `NavigationNodeDTO`, `UserNavigationFavoriteDTO`, `NotificationDTO`, `AnnouncementDTO`, `AnnouncementReadDTO`, `ErrorSeverity`, `NotificationChannel`, `AnnouncementType`).
- Componentes React 19 + Tailwind v4 + `@sysgov/ui`:
  - `CommandPaletteModal`: Paleta de comandos global acionada via atalho de teclado `Ctrl + K` / `Cmd + K`, com busca fuzzy reativa sobre a árvore de rotas, histórico de acessos recentes, navegação por setas do teclado e suporte a atalhos diretos.
  - `NotificationDrawer`: Painel lateral deslizante com abas de categorização de alertas, indicador de contagem não lida em tempo real via WebSocket, ações de marcação individual ou em massa e navegação por deep links contextuais.
  - `MandatoryAnnouncementDialog`: Modal compulsório com backdrop bloqueante exibido no primeiro acesso após a publicação de um comunicado oficial, exigindo leitura e clique explícito de confirmação de ciência com registro do termo de leitura.
