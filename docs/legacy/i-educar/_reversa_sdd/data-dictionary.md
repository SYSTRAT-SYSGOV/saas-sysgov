# Dicionário de Dados — I-Educar (SDD)

> Gerado pelo Reversa Archaeologist (doc_level: completo) em 2026-10-12

---

## Módulo: AcademicYear (Ano Letivo)

### 1. Tabela: `pmieducar.escola_ano_letivo`
Entidade que representa a vigência do ano letivo por unidade escolar.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `ref_cod_escola` | `integer` | Sim | - | FK para a escola (`pmieducar.escola`) | 🟢 CONFIRMADO |
| `ano` | `smallint` | Sim | - | Ano civil de referência (ex: 2026) | 🟢 CONFIRMADO |
| `andamento` | `smallint` | Sim | `0` | Status do ano: `0` (Não iniciado), `1` (Em andamento), `2` (Finalizado) | 🟢 CONFIRMADO |
| `ativo` | `smallint` | Sim | `1` | Situação do registro (`1` = Ativo, `0` = Inativo/Excluído) | 🟢 CONFIRMADO |
| `ref_usuario_cad` | `integer` | Sim | - | FK do usuário que realizou o cadastro | 🟢 CONFIRMADO |
| `ref_usuario_exc` | `integer` | Não | `null` | FK do usuário que inativou o registro | 🟢 CONFIRMADO |
| `data_cad` | `timestamp` | Sim | `NOW()` | Data/hora de criação do registro | 🟢 CONFIRMADO |
| `data_exc` | `timestamp` | Não | `null` | Data/hora de exclusão lógica | 🟢 CONFIRMADO |

- **Chave Primária Composta:** `(ref_cod_escola, ano)`
- **Relacionamentos:**
  - Pertence a `Escola` (1:N inverso)
  - Possui várias Etapas / Módulos (`pmieducar.ano_letivo_modulo` / `pmieducar.escola_ano_letivo_modulo`) (1:N)
  - Possui várias Turmas (`pmieducar.turma`) (1:N)

---

### 2. Tabela: `pmieducar.escola_ano_letivo_modulo` / `pmieducar.ano_letivo_modulo`
Define as etapas/períodos avaliativos do ano letivo (Bimestres, Trimestres, Semestres).

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `ref_cod_escola` | `integer` | Sim | - | FK para a escola | 🟢 CONFIRMADO |
| `ref_ano` | `smallint` | Sim | - | FK para o ano letivo | 🟢 CONFIRMADO |
| `sequencial` | `smallint` | Sim | - | Ordem da etapa (1º bimestre = 1, 2º = 2, etc.) | 🟢 CONFIRMADO |
| `ref_cod_modulo` | `integer` | Sim | - | FK para o tipo de módulo (`pmieducar.modulo`) | 🟢 CONFIRMADO |
| `data_inicio` | `date` | Sim | - | Data de início do período avaliativo | 🟢 CONFIRMADO |
| `data_fim` | `date` | Sim | - | Data de encerramento do período avaliativo | 🟢 CONFIRMADO |
| `dias_letivos` | `integer` | Não | `0` | Quantidade de dias letivos computados na etapa | 🟢 CONFIRMADO |

- **Chave Primária Composta:** `(ref_cod_escola, ref_ano, sequencial)`
- **Restrições de Negócio:**
  - `data_fim >= data_inicio`
  - Não sobreposição de datas entre etapas consecutivas
  - Redução do número de etapas é bloqueada caso haja notas lançadas em etapas superiores

---

### 3. Tabela: `pmieducar.escola_ano_letivo_travamento`
Registros de bloqueio/travamento de alterações retroativas por etapa ou data limite.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `integer` | Sim (PK) | Auto-inc | Identificador único da trava | 🟢 CONFIRMADO |
| `ref_cod_escola` | `integer` | Sim | - | FK para a escola | 🟢 CONFIRMADO |
| `ano` | `smallint` | Sim | - | Ano letivo de referência | 🟢 CONFIRMADO |
| `data_limite` | `timestamp` | Não | `null` | Data limite para lançamentos retroativos | 🟢 CONFIRMADO |
| `etapa` | `smallint` | Não | `null` | Etapa específica bloqueada | 🟢 CONFIRMADO |
| `bloqueado` | `boolean` | Sim | `false` | Indicador se o lançamento está travado para professores | 🟢 CONFIRMADO |

---

## Módulo: Addressing (Endereçamento e Geografia)

### 1. Tabela: `countries`
Cadastro internacional de países com códigos IBGE.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `integer` | Sim (PK) | Auto-inc | Identificador único do país (Brasil = 45) | 🟢 CONFIRMADO |
| `name` | `string` | Sim | - | Nome oficial do país | 🟢 CONFIRMADO |
| `ibge_code` | `integer` | Não | `null` | Código numérico padronizado pelo IBGE | 🟢 CONFIRMADO |

---

### 2. Tabela: `states`
Unidades Federativas (UF) vinculadas a um país.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `integer` | Sim (PK) | Auto-inc | Identificador único do estado | 🟢 CONFIRMADO |
| `country_id` | `integer` | Sim | - | FK para o país (`countries.id`) | 🟢 CONFIRMADO |
| `name` | `string` | Sim | - | Nome completo do estado (ex: Santa Catarina) | 🟢 CONFIRMADO |
| `abbreviation` | `string(2)` | Sim | - | Sigla da UF (ex: SC, SP, RJ) | 🟢 CONFIRMADO |
| `ibge_code` | `integer` | Não | `null` | Código IBGE do estado (ex: 42 para SC) | 🟢 CONFIRMADO |

---

### 3. Tabela: `cities`
Municípios vinculados a um estado da federação.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `integer` | Sim (PK) | Auto-inc | Identificador único do município | 🟢 CONFIRMADO |
| `state_id` | `integer` | Sim | - | FK para o estado (`states.id`) | 🟢 CONFIRMADO |
| `name` | `string` | Sim | - | Nome do município | 🟢 CONFIRMADO |
| `ibge_code` | `integer` | Não | `null` | Código IBGE com 7 dígitos do município | 🟢 CONFIRMADO |

- **Restrições:** `unique(state_id, name)` — Não podem existir dois municípios com mesmo nome no mesmo estado.

---

### 4. Tabela: `districts`
Distritos ou subdivisões municipais.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `integer` | Sim (PK) | Auto-inc | Identificador único do distrito | 🟢 CONFIRMADO |
| `city_id` | `integer` | Sim | - | FK para o município (`cities.id`) | 🟢 CONFIRMADO |
| `name` | `string` | Sim | - | Nome do distrito | 🟢 CONFIRMADO |
| `ibge_code` | `integer` | Não | `null` | Código IBGE do distrito | 🟢 CONFIRMADO |

---

### 5. Tabela: `places`
Endereços físicos / logradouros normalizados.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `integer` | Sim (PK) | Auto-inc | Identificador único do endereço | 🟢 CONFIRMADO |
| `city_id` | `integer` | Sim | - | FK para o município (`cities.id`) | 🟢 CONFIRMADO |
| `address` | `string` | Sim | - | Nome da rua/avenida/logradouro | 🟢 CONFIRMADO |
| `number` | `string` | Não | `null` | Número predial ou 'S/N' | 🟢 CONFIRMADO |
| `complement` | `string` | Não | `null` | Complemento (bloco, sala, apto) | 🟢 CONFIRMADO |
| `neighborhood` | `string` | Não | `null` | Bairro | 🟢 CONFIRMADO |
| `postal_code` | `string(8)` | Não | `null` | CEP numérico formatado ou limpo | 🟢 CONFIRMADO |
| `latitude` | `decimal` | Não | `null` | Coordenada geográfica de latitude | 🟢 CONFIRMADO |
| `longitude` | `decimal` | Não | `null` | Coordenada geográfica de longitude | 🟢 CONFIRMADO |

---

### 6. Tabela: `person_has_places`
Tabela pivot que associa pessoas (físicas ou jurídicas/escolas) a seus endereços.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `integer` | Sim (PK) | Auto-inc | Identificador único do vínculo | 🟢 CONFIRMADO |
| `person_id` | `integer` | Sim | - | FK da pessoa (`cadastro.pessoa` / `persons.id`) | 🟢 CONFIRMADO |
| `place_id` | `integer` | Sim | - | FK do endereço (`places.id`) | 🟢 CONFIRMADO |
| `type` | `smallint` | Sim | `1` | Tipo do endereço (Residencial, Comercial, Cobrança) | 🟢 CONFIRMADO |

---

## Módulo: Avaliacao (Regras de Avaliação, Notas e Frequência)

### 7. Tabela: `modules.regra_avaliacao`
Parâmetros e diretrizes pedagógicas de aprovação, médias, presenças e recuperação.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `integer` | Sim (PK) | Auto-inc | Identificador único da regra de avaliação | 🟢 CONFIRMADO |
| `instituicao_id` | `integer` | Sim | - | FK da instituição mantenedora | 🟢 CONFIRMADO |
| `nome` | `varchar(100)` | Sim | - | Descrição/nome da regra (ex: 'Ensino Fundamental Regular') | 🟢 CONFIRMADO |
| `tipo_nota` | `smallint` | Sim | `1` | Tipo de nota: 1 = Numérica, 2 = Conceitual | 🟢 CONFIRMADO |
| `tipo_progressao` | `smallint` | Sim | `1` | Tipo de progressão: Continuada, Não continuada | 🟢 CONFIRMADO |
| `media` | `numeric(5,2)` | Sim | - | Média mínima anual para aprovação direta (ex: 7.00 ou 6.00) | 🟢 CONFIRMADO |
| `media_recuperacao` | `numeric(5,2)` | Não | `null` | Média mínima necessária após exame/recuperação final | 🟢 CONFIRMADO |
| `porcentagem_presenca` | `numeric(5,2)` | Sim | `75.00` | Percentual mínimo de presença exigido pela LDB (0 a 100) | 🟢 CONFIRMADO |
| `tipo_presenca` | `smallint` | Sim | `1` | 1 = Geral (dias letivos), 2 = Por Componente (horas/aula) | 🟢 CONFIRMADO |
| `parecer_descritivo` | `smallint` | Sim | `0` | 0 = Não usa, 1 = Anual Geral, 2 = Etapa Geral, 3 = Etapa/Componente | 🟢 CONFIRMADO |
| `formula_media_id` | `integer` | Não | `null` | FK para a fórmula matemática de cálculo de média | 🟢 CONFIRMADO |
| `formula_recuperacao_id` | `integer` | Não | `null` | FK para a fórmula matemática de recálculo pós-exame | 🟢 CONFIRMADO |
| `tabela_arredondamento_id` | `integer` | Não | `null` | FK para tabela de regras de arredondamento de notas | 🟢 CONFIRMADO |
| `qtd_disciplinas_dependencia`| `smallint` | Não | `0` | Número máximo de disciplinas com dependência permitidas | 🟢 CONFIRMADO |

---

### 8. Tabela: `modules.nota_aluno`
Cabeçalho agregador das notas de uma matrícula escolar.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `integer` | Sim (PK) | Auto-inc | Identificador único do registro de notas do aluno | 🟢 CONFIRMADO |
| `matricula_id` | `integer` | Sim | - | FK única para a matrícula do aluno (`pmieducar.matricula.cod_matricula`) | 🟢 CONFIRMADO |

---

### 9. Tabela: `modules.nota_componente_curricular`
Notas lançadas para cada disciplina por etapa do ano letivo.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `integer` | Sim (PK) | Auto-inc | Identificador único da nota por componente | 🟢 CONFIRMADO |
| `nota_aluno_id` | `integer` | Sim | - | FK para `modules.nota_aluno.id` | 🟢 CONFIRMADO |
| `componente_curricular_id` | `integer` | Sim | - | FK para a disciplina/componente curricular | 🟢 CONFIRMADO |
| `etapa` | `varchar(10)` | Sim | - | Identificador da etapa (1, 2, 3, 4 ou 'Rc' para recuperação) | 🟢 CONFIRMADO |
| `nota` | `numeric(5,2)` | Não | `null` | Nota decimal bruta informada | 🟢 CONFIRMADO |
| `nota_arredondada` | `numeric(5,2)` | Não | `null` | Nota pós-processada pela regra de arredondamento | 🟢 CONFIRMADO |
| `nota_recuperacao` | `numeric(5,2)` | Não | `null` | Nota obtida em recuperação paralela da etapa | 🟢 CONFIRMADO |

---

### 10. Tabela: `modules.nota_componente_curricular_media`
Média consolidada calculada por disciplina e situação de aprovação.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `integer` | Sim (PK) | Auto-inc | Identificador único da média calculada | 🟢 CONFIRMADO |
| `nota_aluno_id` | `integer` | Sim | - | FK para `modules.nota_aluno.id` | 🟢 CONFIRMADO |
| `componente_curricular_id` | `integer` | Sim | - | FK para a disciplina/componente curricular | 🟢 CONFIRMADO |
| `media` | `numeric(5,2)` | Não | `null` | Média final matemática calculada | 🟢 CONFIRMADO |
| `media_arredondada` | `numeric(5,2)` | Não | `null` | Média final após aplicação da tabela de arredondamento | 🟢 CONFIRMADO |
| `situacao` | `smallint` | Sim | `1` | 1=Em Andamento, 2=Em Exame, 3=Reprovado, 4=Aprovado após Exame, 5=Aprovado | 🟢 CONFIRMADO |

---

### 11. Tabela: `modules.falta_aluno` e `modules.falta_componente_curricular`
Registro de controle de frequência do estudante.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `integer` | Sim (PK) | Auto-inc | Identificador único do registro de faltas | 🟢 CONFIRMADO |
| `falta_aluno_id` | `integer` | Sim | - | FK para o cabeçalho `modules.falta_aluno.id` | 🟢 CONFIRMADO |
| `componente_curricular_id` | `integer` | Não | `null` | FK da disciplina (nulo quando falta_geral) | 🟢 CONFIRMADO |
| `etapa` | `varchar(10)` | Sim | - | Etapa letiva do registro | 🟢 CONFIRMADO |
| `quantidade` | `integer` | Sim | `0` | Quantidade de faltas registradas no período | 🟢 CONFIRMADO |

---

### 12. Tabela: `pmieducar.aluno`
Registro do educando e vínculo com a pessoa física.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `cod_aluno` | `integer` | Sim (PK) | Auto-inc | Identificador único do aluno | 🟢 CONFIRMADO |
| `ref_idpes` | `integer` | Sim | - | FK para a pessoa física (`cadastro.pessoa` / `cadastro.fisica`) | 🟢 CONFIRMADO |
| `tipo_responsavel` | `char(1)` | Não | `null` | 'm'=Mãe, 'p'=Pai, 'r'=Responsável, 'a'=Ambos | 🟢 CONFIRMADO |
| `codigo_sistema` | `varchar(20)` | Não | `null` | Código legível de matrícula ou identificador estadual/municipal | 🟢 CONFIRMADO |
| `ativo` | `smallint` | Sim | `1` | 1=Ativo, 0=Inativo/Unificado | 🟢 CONFIRMADO |
| `data_cadastro` | `timestamp` | Sim | `now()` | Data de criação do registro | 🟢 CONFIRMADO |

---

### 13. Tabela: `cadastro.fisica_deficiencia`
Vínculo de deficiências e necessidades especiais do aluno (AEE).

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `ref_idpes` | `integer` | Sim (PK) | - | FK para a pessoa (`cadastro.fisica`) | 🟢 CONFIRMADO |
| `ref_cod_deficiencia` | `integer` | Sim (PK) | - | FK para a deficiência cadastrada | 🟢 CONFIRMADO |

---

### 14. Tabela: `pmieducar.servidor_alocacao`
Lotação de carga horária e alocação do servidor docente nas unidades escolares.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `cod_servidor_alocacao` | `integer` | Sim (PK) | Auto-inc | Identificador único da alocação | 🟢 CONFIRMADO |
| `ref_cod_servidor` | `integer` | Sim | - | FK para o funcionário (`portal.funcionario`) | 🟢 CONFIRMADO |
| `ref_cod_escola` | `integer` | Sim | - | FK para a escola de atuação | 🟢 CONFIRMADO |
| `ano` | `integer` | Sim | - | Ano letivo da alocação | 🟢 CONFIRMADO |
| `dia_semana` | `smallint` | Sim | - | Dia da semana (1=Domingo .. 7=Sábado) | 🟢 CONFIRMADO |
| `hora_inicial` | `time` | Sim | - | Horário de início do turno | 🟢 CONFIRMADO |
| `hora_final` | `time` | Sim | - | Horário de término do turno | 🟢 CONFIRMADO |
| `carga_horaria` | `varchar(5)` | Sim | - | Total de horas semanais alocadas | 🟢 CONFIRMADO |
| `hora_atividade` | `varchar(5)` | Não | `null` | Horas reservadas para hora-atividade docente (Lei 11.738) | 🟢 CONFIRMADO |
| `ativo` | `smallint` | Sim | `1` | 1=Ativo, 0=Encerrado | 🟢 CONFIRMADO |

---

### 15. Tabela: `pmieducar.log_unificacao`
Auditoria e rastreamento de fusões de alunos duplicados.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `integer` | Sim (PK) | Auto-inc | Identificador único da unificação | 🟢 CONFIRMADO |
| `aluno_id_principal` | `integer` | Sim | - | FK do aluno mantido ativo (mestre) | 🟢 CONFIRMADO |
| `aluno_id_secundario` | `integer` | Sim | - | FK do aluno desativado e fundido | 🟢 CONFIRMADO |
| `ativo` | `boolean` | Sim | `true` | `true` se fusão vigente; `false` se foi revertida (`undo`) | 🟢 CONFIRMADO |
| `created_by` | `integer` | Sim | - | ID do usuário operador da unificação | 🟢 CONFIRMADO |
| `updated_by` | `integer` | Não | `null` | ID do usuário que efetuou a reversão | 🟢 CONFIRMADO |

---

## Módulo: Calendario (Calendário Escolar e Dias Letivos)

### 16. Tabela: `pmieducar.calendario_ano_letivo`
Cabeçalho do calendário anual por escola ou padrão da rede municipal.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `cod_calendario_ano_letivo` | `integer` | Sim (PK) | Auto-inc | Identificador único do calendário | 🟢 CONFIRMADO |
| `ref_cod_escola` | `integer` | Não | `null` | FK da escola (nulo se for matriz da rede SME) | 🟢 CONFIRMADO |
| `ano` | `integer` | Sim | - | Ano letivo de vigência (ex: 2026) | 🟢 CONFIRMADO |
| `data_inicio` | `date` | Sim | - | Data de início do ano letivo | 🟢 CONFIRMADO |
| `data_fim` | `date` | Sim | - | Data de término do ano letivo | 🟢 CONFIRMADO |
| `dias_letivos` | `integer` | Sim | `200` | Quantidade planejada de dias letivos (mín. 200 LDB) | 🟢 CONFIRMADO |
| `ativo` | `smallint` | Sim | `1` | 1=Ativo, 0=Inativo | 🟢 CONFIRMADO |

---

### 17. Tabela: `pmieducar.calendario_dia`
Detalhamento dia a dia do calendário com classificação de dia letivo vs não-letivo.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `ref_cod_calendario_ano_letivo`| `integer` | Sim (PK) | - | FK para `pmieducar.calendario_ano_letivo` | 🟢 CONFIRMADO |
| `mes` | `smallint` | Sim (PK) | - | Mês do calendário (1 a 12) | 🟢 CONFIRMADO |
| `dia` | `smallint` | Sim (PK) | - | Dia do mês (1 a 31) | 🟢 CONFIRMADO |
| `tipo` | `char(1)` | Sim | `'l'` | Tipo do dia: 'l'=Letivo, 'e'=Extra/Sábado letivo, 'f'=Feriado, 'r'=Recesso | 🟢 CONFIRMADO |
| `ref_cod_calendario_motivo_fechamento` | `integer` | Não | `null` | FK para justificativa/motivo do fechamento | 🟢 CONFIRMADO |
| `descricao` | `varchar(255)`| Não | `null` | Descrição pontual do evento no dia | 🟢 CONFIRMADO |

---

### 18. Tabela: `pmieducar.calendario_motivo_fechamento`
Catálogo de motivos para suspensão de aula ou dias não letivos.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `cod_motivo` | `integer` | Sim (PK) | Auto-inc | Identificador único do motivo | 🟢 CONFIRMADO |
| `ref_cod_instituicao` | `integer` | Sim | - | FK da instituição mantenedora | 🟢 CONFIRMADO |
| `nm_motivo` | `varchar(100)` | Sim | - | Nome da ocorrência (ex: 'Feriado Municipal', 'Conselho de Classe') | 🟢 CONFIRMADO |
| `tipo` | `char(1)` | Sim | `'f'` | Classificação do motivo ('f'=Feriado, 'r'=Recesso, 'p'=Planejamento) | 🟢 CONFIRMADO |

---

## Módulo: ComponenteCurricular (BNCC, Disciplinas e Matriz)

### 19. Tabela: `modules.area_conhecimento`
Áreas de conhecimento padronizadas pela BNCC e pela Secretaria de Educação.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `integer` | Sim (PK) | Auto-inc | Identificador único da área | 🟢 CONFIRMADO |
| `instituicao_id` | `integer` | Sim (PK) | - | FK da instituição | 🟢 CONFIRMADO |
| `nome` | `varchar(60)` | Sim | - | Nome da área (ex: 'Linguagens', 'Matemática') | 🟢 CONFIRMADO |
| `secao` | `varchar(50)` | Não | `null` | Seção temática de agrupamento | 🟢 CONFIRMADO |
| `ordenamento_ac` | `integer` | Não | `0` | Posição ordinal nos relatórios e boletins | 🟢 CONFIRMADO |
| `agrupar_descritores` | `boolean` | Não | `false` | Se agrupa descritores nos relatórios de avaliação | 🟢 CONFIRMADO |

---

### 20. Tabela: `modules.componente_curricular`
Catálogo de disciplinas curriculares da rede.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `integer` | Sim (PK) | Auto-inc | Identificador único da disciplina | 🟢 CONFIRMADO |
| `instituicao_id` | `integer` | Sim (PK) | - | FK da instituição mantenedora | 🟢 CONFIRMADO |
| `area_conhecimento_id` | `integer` | Sim | - | FK para `modules.area_conhecimento.id` | 🟢 CONFIRMADO |
| `nome` | `varchar(200)` | Sim | - | Nome oficial da disciplina | 🟢 CONFIRMADO |
| `abreviatura` | `varchar(15)` | Sim | - | Abreviatura para grades de horário | 🟢 CONFIRMADO |
| `tipo_base` | `smallint` | Sim | `1` | 1=BNCC Comum, 2=Diversificada, 3=Profissional, 4=Ensino Religioso | 🟢 CONFIRMADO |
| `codigo_educacenso` | `integer` | Não | `null` | Código oficial do componente na tabela do INEP | 🟢 CONFIRMADO |
| `ordenamento` | `integer` | Sim | `99999` | Ordenamento de exibição | 🟢 CONFIRMADO |
| `desconsidera_para_progressao` | `boolean` | Sim | `false` | Se reprovação na disciplina não retém o aluno | 🟢 CONFIRMADO |
| `color` | `varchar(7)` | Não | `'#FFFFFF'` | Cor hexadecimal para visualização gráfica da grade | 🟢 CONFIRMADO |

---

### 21. Tabela: `modules.componente_curricular_ano_escolar`
Matriz curricular por série/ano escolar com definição de carga horária anual e tipo de nota.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `componente_curricular_id`| `integer` | Sim (PK) | - | FK para `modules.componente_curricular.id` | 🟢 CONFIRMADO |
| `ano_escolar_id` | `integer` | Sim (PK) | - | FK para a série (`pmieducar.serie.cod_serie`) | 🟢 CONFIRMADO |
| `carga_horaria` | `numeric(7,2)` | Sim | - | Carga horária anual exigida da disciplina | 🟢 CONFIRMADO |
| `tipo_nota` | `smallint` | Não | `1` | 1=Nota Numérica (0-10), 2=Conceitual/Parecer | 🟢 CONFIRMADO |
| `anos_letivos` | `text` | Não | `null` | String/JSON delimitando anos letivos com esta regra | 🟢 CONFIRMADO |

---

### 22. Tabela: `modules.componente_curricular_turma`
Aplicação da disciplina na turma operacional, com alocação do docente responsável.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `componente_curricular_id`| `integer` | Sim (PK) | - | FK para `modules.componente_curricular.id` | 🟢 CONFIRMADO |
| `turma_id` | `integer` | Sim (PK) | - | FK para a turma (`pmieducar.turma.cod_turma`) | 🟢 CONFIRMADO |
| `ano_escolar_id` | `integer` | Não | `null` | Desnormalização da série | 🟢 CONFIRMADO |
| `escola_id` | `integer` | Não | `null` | Desnormalização da escola | 🟢 CONFIRMADO |
| `carga_horaria` | `numeric(7,2)` | Não | `null` | Sobrescrita de carga horária para a turma | 🟢 CONFIRMADO |
| `docente_vinculado` | `integer` | Não | `null` | FK para o servidor docente (`pmieducar.servidor.cod_servidor`) | 🟢 CONFIRMADO |
| `etapas_especificas` | `smallint` | Não | `0` | Se disciplina ocorre em bimestres específicos | 🟢 CONFIRMADO |
| `etapas_utilizadas` | `text` | Não | `null` | Bimestres/etapas ativas | 🟢 CONFIRMADO |





---

## Módulos: `School` e `SchoolClass` (Estrutura Escolar e Turmas)

### 23. Tabela: `pmieducar.escola`
Unidade de ensino da rede municipal. No SYSGOV, modelada como extensão 1:1 de `OrgUnit` (`educa_schools`).

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `cod_escola` | `integer` | Sim (PK) | Auto-inc | Identificador único da escola no i-Educar | 🟢 CONFIRMADO |
| `ref_cod_instituicao` | `integer` | Sim | - | FK da instituição/SME mantenedora | 🟢 CONFIRMADO |
| `ref_idpes` | `integer` | Sim | - | FK da pessoa jurídica (`cadastro.juridica`) / `OrgUnit` no SYSGOV | 🟢 CONFIRMADO |
| `sigla` | `varchar(20)` | Não | `null` | Sigla da unidade escolar | 🟢 CONFIRMADO |
| `bloquear_lancamento_diario_anos_letivos_encerrados` | `smallint` | Sim | `1` | Trava que impede alterações no diário após encerramento do ano | 🟢 CONFIRMADO |
| `ativo` | `smallint` | Sim | `1` | Flag de status (1=Ativo, 0=Inativo/Excluído) | 🟢 CONFIRMADO |

---

### 24. Tabela: `pmieducar.curso`
Cursos ofertados na rede (ex: Educação Infantil, Ensino Fundamental Anos Iniciais/Finais, EJA, Ensino Médio).

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `cod_curso` | `integer` | Sim (PK) | Auto-inc | Identificador único do curso | 🟢 CONFIRMADO |
| `ref_cod_instituicao` | `integer` | Sim | - | FK da instituição/SME mantenedora | 🟢 CONFIRMADO |
| `ref_cod_nivel_ensino` | `integer` | Sim | - | Nível de ensino (Infantil, Fundamental, Médio) | 🟢 CONFIRMADO |
| `ref_cod_tipo_ensino` | `integer` | Sim | - | Tipo de ensino (Regular, Especial, EJA) | 🟢 CONFIRMADO |
| `nm_curso` | `varchar(255)` | Sim | - | Nome descritivo do curso | 🟢 CONFIRMADO |
| `sgl_curso` | `varchar(15)` | Não | `null` | Sigla do curso | 🟢 CONFIRMADO |
| `qtd_etapas` | `smallint` | Sim | `4` | Quantidade padrão de etapas letivas (ex: 4 bimestres) | 🟢 CONFIRMADO |
| `frequencia_obrigatoria` | `numeric(5,2)`| Sim | `75.00` | Percentual mínimo legal de frequência exigida (LDB) | 🟢 CONFIRMADO |
| `padrao_ano_escolar` | `smallint` | Sim | `1` | 1=Série/Ano escolar anual, 0=Semestral/Módulo | 🟢 CONFIRMADO |
| `ativo` | `smallint` | Sim | `1` | Flag de status (1=Ativo, 0=Inativo) | 🟢 CONFIRMADO |

---

### 25. Tabela: `pmieducar.serie`
Séries / anos escolares pertencentes a um curso (ex: 1º Ano EF, 2º Ano EF).

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `cod_serie` | `integer` | Sim (PK) | Auto-inc | Identificador único da série | 🟢 CONFIRMADO |
| `ref_cod_curso` | `integer` | Sim | - | FK para `pmieducar.curso.cod_curso` | 🟢 CONFIRMADO |
| `ref_cod_instituicao` | `integer` | Sim | - | FK da instituição/SME mantenedora | 🟢 CONFIRMADO |
| `nm_serie` | `varchar(255)` | Sim | - | Nome oficial da série/ano | 🟢 CONFIRMADO |
| `etapa_curso` | `smallint` | Sim | `1` | Ordem ordinal da etapa dentro do curso | 🟢 CONFIRMADO |
| `concluinte` | `smallint` | Sim | `0` | 1 se a série conclui a etapa/ciclo educacional | 🟢 CONFIRMADO |
| `carga_horaria` | `numeric(7,2)`| Sim | `800.00` | Carga horária total anual da série | 🟢 CONFIRMADO |
| `dias_letivos` | `smallint` | Sim | `200` | Quantidade mínima de dias letivos | 🟢 CONFIRMADO |
| `idade_ideal` | `smallint` | Não | `null` | Idade de referência para cálculo de distorção idade-série | 🟢 CONFIRMADO |
| `regra_avaliacao_id` | `integer` | Não | `null` | FK para a regra de avaliação e notas padrão da série | 🟢 CONFIRMADO |
| `ativo` | `smallint` | Sim | `1` | Flag de status (1=Ativo, 0=Inativo) | 🟢 CONFIRMADO |

---

### 26. Tabela: `pmieducar.escola_curso`
Habilitação de oferta de cursos em uma unidade escolar específica e anos autorizados.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `ref_cod_escola` | `integer` | Sim (PK) | - | FK para `pmieducar.escola.cod_escola` | 🟢 CONFIRMADO |
| `ref_cod_curso` | `integer` | Sim (PK) | - | FK para `pmieducar.curso.cod_curso` | 🟢 CONFIRMADO |
| `ativo` | `smallint` | Sim | `1` | Flag de status do vínculo | 🟢 CONFIRMADO |
| `anos_letivos` | `smallint[]` | Não | `null` | Array de anos letivos com oferta autorizada | 🟢 CONFIRMADO |

---

### 27. Tabela: `pmieducar.escola_serie`
Parametrização operacional da série na escola, incluindo travas de vagas.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `ref_cod_escola` | `integer` | Sim (PK) | - | FK para `pmieducar.escola.cod_escola` | 🟢 CONFIRMADO |
| `ref_cod_serie` | `integer` | Sim (PK) | - | FK para `pmieducar.serie.cod_serie` | 🟢 CONFIRMADO |
| `ativo` | `smallint` | Sim | `1` | Flag de status do vínculo | 🟢 CONFIRMADO |
| `anos_letivos` | `smallint[]` | Não | `null` | Array de anos letivos com oferta da série na escola | 🟢 CONFIRMADO |
| `bloquear_cadastro_turma_para_serie_com_vagas` | `smallint` | Sim | `0` | Se 1, bloqueia criar turma se outra da mesma série tiver vagas | 🟢 CONFIRMADO |
| `bloquear_matricula_serie_com_vagas` | `smallint` | Sim | `0` | Se 1, impede matricular além do teto físico | 🟢 CONFIRMADO |

---

### 28. Tabela: `pmieducar.turma_turno`
Definição dos turnos de funcionamento da rede (Matutino, Vespertino, Noturno, Integral).

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `integer` | Sim (PK) | Auto-inc | Identificador único do turno | 🟢 CONFIRMADO |
| `ref_cod_instituicao` | `integer` | Sim | - | FK da instituição/SME mantenedora | 🟢 CONFIRMADO |
| `nome` | `varchar(255)` | Sim | - | Nome descritivo (ex: Matutino, Vespertino, Integral) | 🟢 CONFIRMADO |
| `hora_inicial` | `time` | Sim | - | Horário padrão de entrada | 🟢 CONFIRMADO |
| `hora_final` | `time` | Sim | - | Horário padrão de saída | 🟢 CONFIRMADO |
| `ativo` | `smallint` | Sim | `1` | Flag de status | 🟢 CONFIRMADO |

---

### 29. Tabela: `pmieducar.turma`
Turma física operacional onde ocorrem as aulas e enturmações de estudantes.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `cod_turma` | `integer` | Sim (PK) | Auto-inc | Identificador único da turma | 🟢 CONFIRMADO |
| `ref_ref_cod_escola` | `integer` | Sim | - | FK para `pmieducar.escola.cod_escola` | 🟢 CONFIRMADO |
| `ref_ref_cod_serie` | `integer` | Não | `null` | FK da série principal (null em turmas multisseriadas) | 🟢 CONFIRMADO |
| `ref_cod_curso` | `integer` | Sim | - | FK para `pmieducar.curso.cod_curso` | 🟢 CONFIRMADO |
| `ref_cod_turma_turno` | `integer` | Sim | - | FK para `pmieducar.turma_turno.id` | 🟢 CONFIRMADO |
| `ano` | `smallint` | Sim | - | Ano letivo de operação da turma | 🟢 CONFIRMADO |
| `nm_turma` | `varchar(255)` | Sim | - | Nome da turma (ex: 1º Ano A, Turma Multietapa 01) | 🟢 CONFIRMADO |
| `sgl_turma` | `varchar(15)` | Não | `null` | Sigla da turma | 🟢 CONFIRMADO |
| `max_aluno` | `smallint` | Sim | `30` | Capacidade máxima de vagas físicas de alunos | 🟢 CONFIRMADO |
| `multiseriada` | `smallint` | Sim | `0` | 1 se a turma atende múltiplas séries/anos | 🟢 CONFIRMADO |
| `tipo_atendimento` | `smallint` | Sim | `0` | 0=Regular, 1=AEE/Contraturno, 2=Ativ. Complementar | 🟢 CONFIRMADO |
| `hora_inicial` | `time` | Não | `null` | Horário de início efetivo da turma | 🟢 CONFIRMADO |
| `hora_final` | `time` | Não | `null` | Horário de encerramento efetivo da turma | 🟢 CONFIRMADO |
| `dias_semana` | `smallint[]` | Não | `null` | Array de dias com aula (1=Dom, 2=Seg, ..., 6=Sex, 7=Sáb) | 🟢 CONFIRMADO |
| `bloquear_enturmacao_sem_vagas` | `smallint` | Sim | `1` | Impede enturmar acima da lotação máxima | 🟢 CONFIRMADO |
| `ativo` | `smallint` | Sim | `1` | Flag de status (1=Ativo, 0=Excluído) | 🟢 CONFIRMADO |

---

### 30. Tabela: `pmieducar.turma_serie`
Detalhamento de séries vinculadas a turmas multisseriadas com seus respectivos modelos de boletim.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `cod_turma_serie` | `integer` | Sim (PK) | Auto-inc | Identificador único do vínculo turma-série | 🟢 CONFIRMADO |
| `ref_cod_turma` | `integer` | Sim | - | FK para `pmieducar.turma.cod_turma` | 🟢 CONFIRMADO |
| `ref_cod_serie` | `integer` | Sim | - | FK para `pmieducar.serie.cod_serie` | 🟢 CONFIRMADO |
| `ref_cod_escola` | `integer` | Sim | - | FK para `pmieducar.escola.cod_escola` | 🟢 CONFIRMADO |
| `boletim_id` | `integer` | Não | `null` | Modelo de boletim para os alunos desta série na turma | 🟢 CONFIRMADO |
| `boletim_diferenciado_id` | `integer` | Não | `null` | Modelo de parecer/boletim diferenciado para AEE | 🟢 CONFIRMADO |
| `ativo` | `smallint` | Sim | `1` | Flag de status | 🟢 CONFIRMADO |

---

### 31. Tabela: `modules.professor_turma`
Alocação docente e responsabilidade de regência na turma.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `integer` | Sim (PK) | Auto-inc | Identificador único da alocação | 🟢 CONFIRMADO |
| `servidor_id` | `integer` | Sim | - | FK para `pmieducar.servidor.cod_servidor` | 🟢 CONFIRMADO |
| `turma_id` | `integer` | Sim | - | FK para `pmieducar.turma.cod_turma` | 🟢 CONFIRMADO |
| `ano_letivo` | `smallint` | Sim | - | Ano letivo da regência | 🟢 CONFIRMADO |
| `tipo_vinculo` | `smallint` | Sim | `1` | 1=Efetivo/Concursado, 2=Temporário/ACT, 3=CLT | 🟢 CONFIRMADO |
| `funcao` | `smallint` | Sim | `1` | 1=Docente Titular, 2=Docente Auxiliar, 3=Mediador AEE | 🟢 CONFIRMADO |
| `permite_lancar_faltas_componente` | `boolean` | Sim | `false` | Se pode lançar frequência avulsa por matéria no diário | 🟢 CONFIRMADO |

---

### 32. Tabela: `modules.professor_turma_disciplina`
Associação específica entre o docente alocado e os componentes curriculares que leciona na turma.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `integer` | Sim (PK) | Auto-inc | Identificador do vínculo professor-disciplina | 🟢 CONFIRMADO |
| `professor_turma_id` | `integer` | Sim | - | FK para `modules.professor_turma.id` | 🟢 CONFIRMADO |
| `componente_curricular_id` | `integer` | Sim | - | FK para `modules.componente_curricular.id` | 🟢 CONFIRMADO |

---

## Módulo: Registration & Enrollments (Matrículas e Enturmações)

### 33. Tabela: `pmieducar.matricula`
Contrato acadêmico formal do aluno com a escola, ano letivo, curso e série. Controla todo o histórico de aprovação, reprovação e situação anual.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `cod_matricula` | `integer` | Sim (PK) | Auto-inc | Identificador único da matrícula no sistema | 🟢 CONFIRMADO |
| `ref_cod_aluno` | `integer` | Sim | - | FK para o aluno (`pmieducar.aluno.cod_aluno`) | 🟢 CONFIRMADO |
| `ref_ref_cod_escola` | `integer` | Sim | - | FK para a escola (`pmieducar.escola.cod_escola`) | 🟢 CONFIRMADO |
| `ref_ref_cod_serie` | `integer` | Sim | - | FK para a série (`pmieducar.serie.cod_serie`) | 🟢 CONFIRMADO |
| `ref_cod_curso` | `integer` | Sim | - | FK para o curso (`pmieducar.curso.cod_curso`) | 🟢 CONFIRMADO |
| `ano` | `smallint` | Sim | - | Ano letivo de vigência da matrícula | 🟢 CONFIRMADO |
| `aprovado` | `smallint` | Sim | `3` | Situação pedagógica (1=Aprovado, 2=Reprovado, 3=Em Andamento, 4=Transferido, 5=Reclassificado, 6=Abandono, 7=Em Exame, 8=Aprovado após Exame, 11=Pré-matrícula, 12=Aprov. Dependência, 13=Aprov. Conselho, 14=Reprov. Faltas, 15=Falecido) | 🟢 CONFIRMADO |
| `data_matricula` | `date` | Sim | `CURRENT_DATE` | Data de formalização da matrícula na escola | 🟢 CONFIRMADO |
| `data_cancel` | `date` | Não | `null` | Data em que a matrícula foi cancelada ou encerrada por saída | 🟢 CONFIRMADO |
| `formando` | `smallint` | Sim | `0` | Se o aluno é formando (concluinte do nível/etapa) | 🟢 CONFIRMADO |
| `dependencia` | `boolean` | Sim | `false` | Se a matrícula refere-se a regime de dependência de disciplina | 🟢 CONFIRMADO |
| `ref_cod_abandono_tipo` | `integer` | Não | `null` | FK para o motivo de abandono/evasão (`pmieducar.abandono_tipo`) | 🟢 CONFIRMADO |
| `observacao_desligamento` | `text` | Não | `null` | Justificativa detalhada de cancelamento, evasão ou falecimento | 🟢 CONFIRMADO |
| `ativo` | `smallint` | Sim | `1` | Flag de status (1=Ativo, 0=Cancelado/Excluído) | 🟢 CONFIRMADO |
| `data_cadastro` | `timestamp` | Sim | `NOW()` | Timestamp de inclusão | 🟢 CONFIRMADO |

- **Restrições de Negócio:**
  - Um aluno não pode ter mais de uma matrícula ativa com `aprovado = 3` no mesmo ano letivo para o mesmo tipo de ensino regular.
  - O cancelamento da matrícula exige obrigatoriamente a desenturmação prévia ou concomitante em `pmieducar.matricula_turma`.

---

### 34. Tabela: `pmieducar.matricula_turma`
Alocação física do estudante em uma turma específica, controlando frequência, número de chamada e movimentação de remanejamento.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `integer` | Sim (PK) | Auto-inc | Identificador único da enturmação | 🟢 CONFIRMADO |
| `ref_cod_matricula` | `integer` | Sim | - | FK para `pmieducar.matricula.cod_matricula` | 🟢 CONFIRMADO |
| `ref_cod_turma` | `integer` | Sim | - | FK para `pmieducar.turma.cod_turma` | 🟢 CONFIRMADO |
| `sequencial` | `smallint` | Não | `null` | Número de chamada do estudante no diário de classe | 🟢 CONFIRMADO |
| `data_enturmacao` | `date` | Sim | `CURRENT_DATE` | Data em que o aluno começou a frequentar a turma | 🟢 CONFIRMADO |
| `data_desenturmacao` | `date` | Não | `null` | Data em que o aluno deixou a turma (saída ou remanejamento) | 🟢 CONFIRMADO |
| `ativo` | `smallint` | Sim | `1` | 1=Enturmação Ativa, 0=Histórico/Remanejado/Saída | 🟢 CONFIRMADO |
| `remanejado` | `boolean` | Sim | `false` | Indica se o encerramento ocorreu por remanejamento entre turmas | 🟢 CONFIRMADO |
| `transferido` | `boolean` | Sim | `false` | Indica se o encerramento ocorreu por transferência escolar | 🟢 CONFIRMADO |
| `reclassificado` | `boolean` | Sim | `false` | Indica se a saída decorreu de processo de reclassificação | 🟢 CONFIRMADO |

- **Restrições de Negócio:**
  - Não pode exceder a capacidade máxima (`max_aluno`) da turma quando a trava estiver habilitada.
  - Ao remanejar, o registro atual tem `ativo` setado para `0` com `data_desenturmacao` preenchida, e uma nova linha é criada para a turma de destino.

---

### 35. Tabela: `pmieducar.transferencia_solicitacao`
Controle formal das solicitações de transferência do aluno (internas entre escolas da rede municipal ou externas).

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `cod_transferencia_solicitacao` | `integer` | Sim (PK) | Auto-inc | Identificador único do protocolo de transferência | 🟢 CONFIRMADO |
| `ref_cod_matricula` | `integer` | Sim | - | FK para a matrícula de origem | 🟢 CONFIRMADO |
| `ref_cod_transferencia_tipo` | `integer` | Sim | - | FK para o tipo de transferência (`pmieducar.transferencia_tipo`) | 🟢 CONFIRMADO |
| `ref_cod_escola_origem` | `integer` | Sim | - | FK para a escola de origem | 🟢 CONFIRMADO |
| `ref_cod_escola_destino` | `integer` | Não | `null` | FK para a escola de destino na rede (nulo se externa) | 🟢 CONFIRMADO |
| `escola_destino_externa` | `varchar(255)` | Não | `null` | Nome da instituição de ensino de destino fora da rede | 🟢 CONFIRMADO |
| `data_solicitacao` | `date` | Sim | `CURRENT_DATE` | Data de abertura do pedido pelo responsável | 🟢 CONFIRMADO |
| `data_conclusao` | `date` | Não | `null` | Data em que a guia foi assinada e concluída | 🟢 CONFIRMADO |
| `ativo` | `smallint` | Sim | `1` | 1=Solicitação Aberta/Vigente, 0=Cancelada | 🟢 CONFIRMADO |
| `observacao` | `text` | Não | `null` | Justificativa pedagógica ou administrativa | 🟢 CONFIRMADO |

---

### 36. Tabela: `pmieducar.transferencia_tipo`
Catálogo de motivos legais e operacionais de transferência escolar.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `cod_transferencia_tipo` | `integer` | Sim (PK) | Auto-inc | Identificador único do tipo | 🟢 CONFIRMADO |
| `nm_tipo` | `varchar(255)` | Sim | - | Descrição do motivo (ex: Mudança de Domicílio, Conveniência) | 🟢 CONFIRMADO |
| `ativo` | `smallint` | Sim | `1` | Flag de status | 🟢 CONFIRMADO |

---

### 37. Tabela: `pmieducar.abandono_tipo`
Catálogo de causas e justificativas de evasão/abandono escolar para monitoramento e Censo.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `cod_abandono_tipo` | `integer` | Sim (PK) | Auto-inc | Identificador do motivo de evasão | 🟢 CONFIRMADO |
| `nome` | `varchar(255)` | Sim | - | Descrição (ex: Trabalho Infantil, Falta de Transporte, Doença) | 🟢 CONFIRMADO |
| `ativo` | `smallint` | Sim | `1` | Flag de status | 🟢 CONFIRMADO |

---

### 38. Tabela: `pmieducar.reclassificacao`
Atos oficiais de reclassificação de alunos (avanço de série por proficiência ou readequação por histórico).

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `cod_reclassificacao` | `integer` | Sim (PK) | Auto-inc | Identificador da reclassificação | 🟢 CONFIRMADO |
| `ref_cod_matricula_origem` | `integer` | Sim | - | FK para a matrícula original do aluno | 🟢 CONFIRMADO |
| `ref_cod_matricula_destino` | `integer` | Sim | - | FK para a nova matrícula gerada na série de destino | 🟢 CONFIRMADO |
| `ref_cod_serie_origem` | `integer` | Sim | - | FK para a série de onde o aluno saiu | 🟢 CONFIRMADO |
| `ref_cod_serie_destino` | `integer` | Sim | - | FK para a série para onde o aluno avançou | 🟢 CONFIRMADO |
| `data_reclassificacao` | `date` | Sim | `CURRENT_DATE` | Data do ato administrativo de reclassificação | 🟢 CONFIRMADO |
| `parecer` | `text` | Sim | - | Parecer da comissão pedagógica / Ata comprobatória | 🟢 CONFIRMADO |
| `ativo` | `smallint` | Sim | `1` | Flag de status | 🟢 CONFIRMADO |

---

### 39. Tabela: `pmieducar.historico_escolar`
Registro mestre de assentamento do histórico escolar do aluno (vida pregressa em escolas externas ou fechamento anual de matrículas concluídas no sistema).

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `integer` | Sim (PK) | Auto-inc | Identificador único do registro de histórico | 🟢 CONFIRMADO |
| `ref_cod_aluno` | `integer` | Sim | - | FK para `pmieducar.aluno.cod_aluno` | 🟢 CONFIRMADO |
| `sequencial` | `smallint` | Sim | - | Ordem cronológica da série/etapa na vida do aluno | 🟢 CONFIRMADO |
| `ano` | `smallint` | Sim | - | Ano civil letivo cursado | 🟢 CONFIRMADO |
| `carga_horaria` | `integer` | Não | `null` | Carga horária total da série cumprida pelo aluno | 🟢 CONFIRMADO |
| `dias_letivos` | `smallint` | Não | `null` | Total de dias letivos cumpridos | 🟢 CONFIRMADO |
| `escola` | `varchar(255)` | Sim | - | Nome da escola (interna ou externa à rede) | 🟢 CONFIRMADO |
| `escola_cidade` | `varchar(150)` | Não | `null` | Cidade da escola cursada | 🟢 CONFIRMADO |
| `escola_uf` | `varchar(2)` | Não | `null` | Unidade federativa da escola cursada | 🟢 CONFIRMADO |
| `ref_cod_escola` | `integer` | Não | `null` | FK para `pmieducar.escola` (preenchido se da rede) | 🟢 CONFIRMADO |
| `ref_cod_matricula` | `integer` | Não | `null` | FK para `pmieducar.matricula` (se gerado via sistema) | 🟢 CONFIRMADO |
| `nm_curso` | `varchar(255)` | Não | `null` | Nome do curso cursado | 🟢 CONFIRMADO |
| `nm_serie` | `varchar(255)` | Sim | - | Nome da série/ano/etapa | 🟢 CONFIRMADO |
| `historico_grade_curso_id` | `integer` | Não | `null` | FK para `pmieducar.historico_grade_curso` (1=Série, 2=Ano, 3=EJA) | 🟢 CONFIRMADO |
| `posicao` | `smallint` | Não | `null` | Coluna no formulário impresso do histórico (1º ao 9º) | 🟢 CONFIRMADO |
| `aprovado` | `smallint` | Sim | - | Situação final (1=Aprovado, 2=Reprovado, 3=Em Andamento, 4=Transferido, 12=Aprov. Dependência) | 🟢 CONFIRMADO |
| `frequencia` | `numeric(5,2)` | Não | `null` | Percentual global de presença (0 a 100) | 🟢 CONFIRMADO |
| `faltas_globalizadas` | `smallint` | Não | `null` | Faltas totais da série (se modelo de falta geral) | 🟢 CONFIRMADO |
| `origem` | `smallint` | Sim | `1` | Origem do registro (0=externo/manual, 1=processado pelo sistema) | 🟢 CONFIRMADO |
| `extra_curricular` | `smallint` | Sim | `0` | Indica se é componente/atividade extracurricular | 🟢 CONFIRMADO |
| `aceleracao` | `smallint` | Sim | `0` | Indica se cursado em programa de aceleração de estudos | 🟢 CONFIRMADO |
| `dependencia` | `boolean` | Sim | `false` | Indica se a etapa refere-se a regime de dependência | 🟢 CONFIRMADO |
| `registro` | `varchar(50)` | Não | `null` | Número de assentamento no livro/arquivo da escola | 🟢 CONFIRMADO |
| `livro` | `varchar(50)` | Não | `null` | Número do Livro de Registros Notariais da secretaria | 🟢 CONFIRMADO |
| `folha` | `varchar(50)` | Não | `null` | Número da folha do livro | 🟢 CONFIRMADO |
| `observacao` | `text` | Não | `null` | Observações legais e pedagógicas da etapa | 🟢 CONFIRMADO |
| `ativo` | `smallint` | Sim | `1` | 1=Registro Ativo, 0=Excluído | 🟢 CONFIRMADO |
| `data_cadastro` | `timestamp` | Sim | `now()` | Data de lançamento | 🟢 CONFIRMADO |
| `data_exclusao` | `timestamp` | Não | `null` | Data da exclusão lógica | 🟢 CONFIRMADO |

---

### 40. Tabela: `pmieducar.historico_disciplinas`
Armazena as disciplinas, notas, faltas e carga horária cursadas na respectiva etapa do histórico escolar.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `integer` | Sim (PK) | Auto-inc | Identificador único do item de disciplina | 🟢 CONFIRMADO |
| `historico_escolar_id` | `integer` | Sim | - | FK para `pmieducar.historico_escolar.id` | 🟢 CONFIRMADO |
| `ref_ref_cod_aluno` | `integer` | Sim | - | FK para o aluno (chave composta legada) | 🟢 CONFIRMADO |
| `ref_sequencial` | `smallint` | Sim | - | Sequencial da etapa do histórico (chave legada) | 🟢 CONFIRMADO |
| `sequencial` | `smallint` | Sim | - | Ordem da disciplina dentro do histórico do aluno | 🟢 CONFIRMADO |
| `nm_disciplina` | `varchar(255)` | Sim | - | Nome da disciplina (ou 'Média Geral') | 🟢 CONFIRMADO |
| `tipo_base` | `smallint` | Sim | `1` | 1=Base Nacional Comum, 2=Parte Diversificada | 🟢 CONFIRMADO |
| `nota` | `varchar(255)` | Não | `null` | Nota final ('8.5', 'A', 'Disp' para dispensada, '-' para média) | 🟢 CONFIRMADO |
| `faltas` | `smallint` | Não | `null` | Quantidade de faltas na disciplina | 🟢 CONFIRMADO |
| `carga_horaria_disciplina`| `integer` | Não | `null` | Carga horária específica da disciplina | 🟢 CONFIRMADO |
| `ordenamento` | `smallint` | Não | `null` | Ordem de exibição na grade do histórico | 🟢 CONFIRMADO |
| `dependencia` | `boolean` | Sim | `false` | Indica se a disciplina foi cursada em dependência | 🟢 CONFIRMADO |

---

### 41. Tabela: `pmieducar.historico_grade_curso`
Catálogo das estruturas de grade curricular que organizam as etapas dos históricos escolares.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `integer` | Sim (PK) | Auto-inc | Identificador da estrutura de grade | 🟢 CONFIRMADO |
| `descricao_etapa` | `varchar(255)` | Sim | - | Descrição (ex: Ensino Fundamental 8 Anos - Séries, 9 Anos, EJA) | 🟢 CONFIRMADO |
| `quantidade_etapas` | `smallint` | Sim | - | Quantidade de etapas da grade (ex: 8, 9, 4) | 🟢 CONFIRMADO |
| `ativo` | `smallint` | Sim | `1` | 1=Ativo, 0=Inativo | 🟢 CONFIRMADO |

---

### 42. Tabela: `modules.empresa_transporte_escolar`
Cadastro das empresas terceirizadas prestadoras de serviço de transporte escolar ou órgãos públicos que operam frotas escolares.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `cod_empresa_transporte_escolar` | `integer` | Sim (PK) | Auto-inc | Identificador único da empresa de transporte | 🟢 CONFIRMADO |
| `ref_idpes` | `integer` | Não | `null` | FK para `cadastro.pessoa` (dados de razão social / CNPJ) | 🟢 CONFIRMADO |
| `nome` | `varchar(255)` | Sim | - | Nome fantasia / denominação social da empresa | 🟢 CONFIRMADO |
| `observacao` | `text` | Não | `null` | Informações cadastrais e contratuais adicionais | 🟢 CONFIRMADO |
| `ativo` | `smallint` | Sim | `1` | 1=Ativo, 0=Inativo | 🟢 CONFIRMADO |

---

### 43. Tabela: `modules.motorista`
Cadastro dos condutores habilitados para a condução de transporte escolar municipal.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `cod_motorista` | `integer` | Sim (PK) | Auto-inc | Identificador único do condutor | 🟢 CONFIRMADO |
| `ref_idpes` | `integer` | Sim | - | FK para `cadastro.pessoa` (dados civis e CPF do motorista) | 🟢 CONFIRMADO |
| `cnh` | `varchar(20)` | Sim | - | Número de registro da Carteira Nacional de Habilitação | 🟢 CONFIRMADO |
| `categoria_cnh` | `varchar(5)` | Sim | - | Categoria da CNH (exige 'D' ou 'E' conf. CTB Art. 138) | 🟢 CONFIRMADO |
| `vencimento_cnh` | `date` | Não | `null` | Data limite de validade da habilitação | 🟢 CONFIRMADO |
| `observacao` | `text` | Não | `null` | Anotações sobre certidões de antecedentes ou cursos | 🟢 CONFIRMADO |
| `ativo` | `smallint` | Sim | `1` | 1=Ativo, 0=Inativo | 🟢 CONFIRMADO |

---

### 44. Tabela: `modules.veiculo`
Frota de veículos escolares (ônibus, micro-ônibus, vans, embarcações, tração animal).

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `cod_veiculo` | `integer` | Sim (PK) | Auto-inc | Identificador único do veículo | 🟢 CONFIRMADO |
| `ref_cod_empresa_transporte_escolar` | `integer` | Não | `null` | FK para `modules.empresa_transporte_escolar` | 🟢 CONFIRMADO |
| `ref_cod_motorista` | `integer` | Não | `null` | FK para `modules.motorista` (condutor principal) | 🟢 CONFIRMADO |
| `descricao` | `varchar(255)` | Sim | - | Identificação/Prefixo do veículo (ex: 'Ônibus Escolar 04') | 🟢 CONFIRMADO |
| `placa` | `varchar(10)` | Não | `null` | Placa do veículo automotor (padrão Mercosul / antigo) | 🟢 CONFIRMADO |
| `renavam` | `varchar(20)` | Não | `null` | Registro Nacional de Veículos Automotores | 🟢 CONFIRMADO |
| `chassi` | `varchar(30)` | Não | `null` | Número de identificação do chassi (VIN) | 🟢 CONFIRMADO |
| `marca` | `varchar(100)` | Não | `null` | Marca do fabricante (Mercedes-Benz, Volkswagen, etc.) | 🟢 CONFIRMADO |
| `ano_fabricacao` | `integer` | Não | `null` | Ano de fabricação do veículo | 🟢 CONFIRMADO |
| `ano_modelo` | `integer` | Não | `null` | Ano do modelo do veículo | 🟢 CONFIRMADO |
| `limite_passageiros` | `integer` | Sim | `0` | Capacidade máxima de lotação autorizada | 🟢 CONFIRMADO |
| `tipo` | `smallint` | Sim | `1` | 1=Próprio, 2=Terceirizado | 🟢 CONFIRMADO |
| `tipo_veiculo` | `smallint` | Sim | `1` | 1=Ônibus, 2=Micro-ônibus, 3=Van/Kombi, 4=Bicicleta/Tração, 5=Embarcação | 🟢 CONFIRMADO |
| `adaptado_necessidades_especiais` | `boolean` | Sim | `false` | Acessibilidade PCD (elevador / rampa) | 🟢 CONFIRMADO |
| `ativo` | `smallint` | Sim | `1` | 1=Ativo, 0=Inativo | 🟢 CONFIRMADO |

---

### 45. Tabela: `modules.ponto_transporte_escolar`
Pontos de embarque, desembarque e paradas intermediárias dos itinerários escolares.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `cod_ponto_transporte_escolar` | `integer` | Sim (PK) | Auto-inc | Identificador único do ponto | 🟢 CONFIRMADO |
| `descricao` | `varchar(255)` | Sim | - | Nome/referência do ponto (ex: 'Esquina Posto de Saúde') | 🟢 CONFIRMADO |
| `latitude` | `numeric(10,8)` | Não | `null` | Coordenada geográfica de latitude (WGS84) | 🟢 CONFIRMADO |
| `longitude` | `numeric(11,8)` | Não | `null` | Coordenada geográfica de longitude (WGS84) | 🟢 CONFIRMADO |
| `observacao` | `text` | Não | `null` | Instruções operacionais e referências | 🟢 CONFIRMADO |
| `ativo` | `smallint` | Sim | `1` | 1=Ativo, 0=Inativo | 🟢 CONFIRMADO |

---

### 46. Tabela: `modules.rota_transporte_escolar`
Linhas e trajetos de transporte escolar com quilometragem e pontos de parada.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `cod_rota_transporte_escolar` | `integer` | Sim (PK) | Auto-inc | Identificador único da rota | 🟢 CONFIRMADO |
| `ref_cod_empresa_transporte_escolar` | `integer` | Não | `null` | FK para `modules.empresa_transporte_escolar` | 🟢 CONFIRMADO |
| `descricao` | `varchar(255)` | Sim | - | Nome do itinerário (ex: 'Linha Rural 02 - Assentamento') | 🟢 CONFIRMADO |
| `ano` | `integer` | Sim | - | Ano de vigência operacional do itinerário | 🟢 CONFIRMADO |
| `tipo_rota` | `varchar(1)` | Sim | `'U'` | 'U'=Urbana, 'R'=Rural | 🟢 CONFIRMADO |
| `km_pavimentada` | `numeric(8,2)` | Não | `0.00` | Extensão em km de vias com asfalto/calçamento | 🟢 CONFIRMADO |
| `km_nao_pavimentada` | `numeric(8,2)` | Não | `0.00` | Extensão em km de estradas de chão/terra | 🟢 CONFIRMADO |
| `observacao` | `text` | Não | `null` | Observações operacionais da rota | 🟢 CONFIRMADO |
| `ativo` | `smallint` | Sim | `1` | 1=Ativo, 0=Inativo | 🟢 CONFIRMADO |

---

### 47. Tabela: `modules.pessoa_transporte`
Vínculo de atendimento individual do estudante ao transporte escolar e seus pontos de embarque/desembarque.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `cod_pessoa_transporte` | `integer` | Sim (PK) | Auto-inc | Identificador único do atendimento | 🟢 CONFIRMADO |
| `ref_cod_aluno` | `integer` | Sim | - | FK para `pmieducar.aluno.cod_aluno` | 🟢 CONFIRMADO |
| `ref_cod_rota_transporte_escolar` | `integer` | Sim | - | FK para `modules.rota_transporte_escolar` | 🟢 CONFIRMADO |
| `ref_cod_ponto_transporte_escolar`| `integer` | Não | `null` | FK para o ponto de embarque principal | 🟢 CONFIRMADO |
| `ref_cod_ponto_destino` | `integer` | Não | `null` | FK para o ponto de desembarque | 🟢 CONFIRMADO |
| `turno` | `smallint` | Sim | `1` | 1=Matutino, 2=Vespertino, 3=Noturno, 4=Integral | 🟢 CONFIRMADO |
| `ano` | `integer` | Sim | - | Ano letivo do atendimento | 🟢 CONFIRMADO |
| `ativo` | `smallint` | Sim | `1` | 1=Ativo, 0=Inativo | 🟢 CONFIRMADO |

---

### 48. Tabela: modules.educacenso_cod_escola
Mapeamento do código oficial de 8 dígitos do INEP atribuído a cada unidade escolar do município.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| cod_escola | integer | Sim (PK) | - | FK para pmieducar.escola.cod_escola | 🟢 CONFIRMADO |
| cod_escola_inep | 
umeric(8,0) | Sim (UQ) | - | Código oficial do INEP (8 dígitos) | 🟢 CONFIRMADO |
| 
ome_inep | archar(255) | Não | 
ull | Nome da escola cadastrado no cadastro do MEC | 🟢 CONFIRMADO |
| onte | archar(50) | Não | 'IMPORTACAO' | Origem do registro ('MANUAL', 'IMPORTACAO') | 🟢 CONFIRMADO |
| created_at | 	imestamp | Sim | 
ow() | Data/hora de vinculação do código | 🟢 CONFIRMADO |

---

### 49. Tabela: modules.educacenso_cod_turma
Identificador unificado de 8 ou 10 dígitos do INEP gerado e retornado após a migração do Censo Escolar.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| cod_turma | integer | Sim (PK) | - | FK para pmieducar.turma.cod_turma | 🟢 CONFIRMADO |
| cod_turma_inep | 
umeric(12,0) | Sim (UQ) | - | Identificador único da turma retornado pelo INEP | 🟢 CONFIRMADO |
| 
ome_inep | archar(255) | Não | 
ull | Descrição da turma no sistema do Censo | 🟢 CONFIRMADO |
| created_at | 	imestamp | Sim | 
ow() | Data/hora de sincronização do código | 🟢 CONFIRMADO |

---

### 50. Tabela: modules.educacenso_cod_aluno
Código de identificação única do estudante no Censo Escolar nacional (ID INEP do Aluno de 12 dígitos).

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| cod_aluno | integer | Sim (PK) | - | FK para pmieducar.aluno.cod_aluno | 🟢 CONFIRMADO |
| cod_aluno_inep | 
umeric(12,0) | Sim (UQ) | - | Código individual do aluno atribuído pelo INEP (12 dígitos) | 🟢 CONFIRMADO |
| onte | archar(50) | Não | 'IMPORTACAO' | Origem do identificador | 🟢 CONFIRMADO |
| created_at | 	imestamp | Sim | 
ow() | Data/hora de gravação | 🟢 CONFIRMADO |

---

### 51. Tabela: modules.educacenso_cod_docente
Código de identificação única nacional do profissional docente / servidor da educação atribuído pelo INEP.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| cod_servidor | integer | Sim (PK) | - | FK para pmieducar.servidor.cod_servidor | 🟢 CONFIRMADO |
| cod_docente_inep | 
umeric(12,0) | Sim (UQ) | - | Código individual do docente no INEP (12 dígitos) | 🟢 CONFIRMADO |
| onte | archar(50) | Não | 'IMPORTACAO' | Origem da carga do código | 🟢 CONFIRMADO |
| created_at | 	imestamp | Sim | 
ow() | Data/hora de gravação | 🟢 CONFIRMADO |

---

### 52. Tabela: modules.etapas_educacenso
Tabela de catálogo oficial das Etapas de Ensino padronizadas pelo INEP (Anexo II do Censo Escolar).

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| codigo | integer | Sim (PK) | - | Código numérico da etapa no INEP (ex: 1, 2, 14, 15, 25, 41) | 🟢 CONFIRMADO |
| 
ome | archar(255) | Sim | - | Nomenclatura oficial da etapa no Censo Escolar | 🟢 CONFIRMADO |
| tivo | smallint | Sim | 1 | 1=Vigente, 0=Revogado em portaria | 🟢 CONFIRMADO |

---

### 53. Tabela: modules.etapas_curso_educacenso
Mapeamento De/Para entre os cursos/séries da rede municipal e as etapas normativas do Educacenso.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| id | integer | Sim (PK) | Auto-inc | Identificador único do de/para | 🟢 CONFIRMADO |
| curso_id | integer | Sim | - | FK para pmieducar.curso.cod_curso | 🟢 CONFIRMADO |
| serie_id | integer | Não | 
ull | FK para pmieducar.serie.cod_serie (quando a etapa varia por série) | 🟢 CONFIRMADO |
| tapa_educacenso_id | integer | Sim | - | FK para modules.etapas_educacenso.codigo | 🟢 CONFIRMADO |

---

### 54. Tabela: modules.educacenso_curso_superior
Tabela de referência dos cursos superiores, licenciaturas e instituições de ensino superior (IES) reconhecidas.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| codigo | integer | Sim (PK) | - | Código oficial do curso superior no banco e-MEC / INEP | 🟢 CONFIRMADO |
| 
ome | archar(255) | Sim | - | Nome da graduação / licenciatura / bacharelado | 🟢 CONFIRMADO |
| grau_academico | smallint | Não | 
ull | 1=Licenciatura, 2=Bacharelado, 3=Tecnólogo | 🟢 CONFIRMADO |


---

### 55. Tabela: modules.formula_media
Catálogo de fórmulas matemáticas parametrizadas para cálculo de médias bimestrais, trimestrais, semestrais e anuais.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| id | integer | Sim (PK) | Auto-inc | Identificador único da fórmula de média | 🟢 CONFIRMADO |
| instituicao_id | integer | Sim (FK) | - | FK para pmieducar.instituicao.cod_instituicao | 🟢 CONFIRMADO |
| nome | varchar(255) | Sim | - | Nome descritivo da fórmula (ex: Média Aritmética 4 Bimestres) | 🟢 CONFIRMADO |
| formula_media | varchar(255) | Sim | - | Expressão matemática (tokens: Se, Et, E1..E10, Rc, RSP1..RSP10, +, -, *, /, ?, :) | 🟢 CONFIRMADO |
| tipo_formula | smallint | Sim | 1 | 1=Média Final, 2=Média para Recuperação | 🟢 CONFIRMADO |
| substitui_menor_nota_rc | boolean | Sim | false | Se true, substitui a menor nota de etapa pela nota do exame final Rc caso Rc > menor nota | 🟢 CONFIRMADO |

---

### 56. Tabela: modules.tabela_arredondamento
Tabelas de definição de regras de arredondamento de notas numéricas e escalas conceituais.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| id | integer | Sim (PK) | Auto-inc | Identificador único da tabela de arredondamento | 🟢 CONFIRMADO |
| instituicao_id | integer | Sim (FK) | - | FK para pmieducar.instituicao.cod_instituicao | 🟢 CONFIRMADO |
| nome | varchar(255) | Sim | - | Nome descritivo da tabela de arredondamento | 🟢 CONFIRMADO |
| tipo_nota | smallint | Sim | 1 | 1=Numérica, 2=Conceitual, 3=Numérica e Conceitual | 🟢 CONFIRMADO |
| arredondar_nota | boolean | Sim | true | Se true, ativa o arredondamento nas etapas | 🟢 CONFIRMADO |
| normalizar_media | boolean | Sim | true | Se true, aplica arredondamento na média final | 🟢 CONFIRMADO |

---

### 57. Tabela: modules.tabela_arredondamento_valor
Intervalos numéricos, faixas conceituais e ações de arredondamento.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| id | integer | Sim (PK) | Auto-inc | Identificador único do valor/faixa | 🟢 CONFIRMADO |
| tabela_arredondamento_id | integer | Sim (FK) | - | FK para modules.tabela_arredondamento.id | 🟢 CONFIRMADO |
| nome | varchar(50) | Sim | - | Rótulo exibido do conceito ou valor arredondado (ex: A, B, C ou 7.0) | 🟢 CONFIRMADO |
| descricao | varchar(255) | Não | null | Descrição pedagógica (ex: Aprendizagem Plena) | 🟢 CONFIRMADO |
| valor_minimo | numeric(5,3) | Sim | - | Limite inferior da faixa inclusiva | 🟢 CONFIRMADO |
| valor_maximo | numeric(5,3) | Sim | - | Limite superior da faixa inclusiva | 🟢 CONFIRMADO |
| acao | smallint | Sim | 0 | 0=Não arredondar, 1=Arredondar para inteiro inferior, 2=Arredondar para inteiro superior, 3=Arredondar para casa decimal específica | 🟢 CONFIRMADO |
| casa_decimal_exata | numeric(5,3) | Não | null | Valor fixo atribuído quando acao = 3 | 🟢 CONFIRMADO |
| observacao | varchar(255) | Não | null | Notas adicionais | 🟢 CONFIRMADO |

---

### 58. Tabela: modules.regra_avaliacao
Entidade mestra que centraliza as políticas de avaliação, frequência, recuperação, progressão e dependência.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| id | integer | Sim (PK) | Auto-inc | Identificador único da regra de avaliação | 🟢 CONFIRMADO |
| instituicao_id | integer | Sim (FK) | - | FK para pmieducar.instituicao.cod_instituicao | 🟢 CONFIRMADO |
| nome | varchar(255) | Sim | - | Nome descritivo da regra | 🟢 CONFIRMADO |
| tipo_nota | smallint | Sim | 1 | 0=Nenhum, 1=Numérica, 2=Conceitual, 3=Numérica e Conceitual | 🟢 CONFIRMADO |
| tipo_progressao | smallint | Sim | 2 | 1=Continuada, 2=Não-continuada (Média/Presença), 3=Não-continuada (Só Média), 4=Manual, 5=Manual Ciclo | 🟢 CONFIRMADO |
| tabela_arredondamento_id | integer | Não (FK) | null | FK para modules.tabela_arredondamento.id (Numérica) | 🟢 CONFIRMADO |
| tabela_arredondamento_id_conceitual | integer | Não (FK) | null | FK para modules.tabela_arredondamento.id (Conceitual) | 🟢 CONFIRMADO |
| formula_media_id | integer | Não (FK) | null | FK para modules.formula_media.id (Média Final) | 🟢 CONFIRMADO |
| formula_recuperacao_id | integer | Não (FK) | null | FK para modules.formula_media.id (Recuperação Final) | 🟢 CONFIRMADO |
| media | numeric(5,3) | Não | 6.000 | Média mínima anual exigida para aprovação direta | 🟢 CONFIRMADO |
| media_recuperacao | numeric(5,3) | Não | 5.000 | Média mínima exigida após o exame de recuperação | 🟢 CONFIRMADO |
| porcentagem_presenca | numeric(5,2) | Não | 75.00 | Percentual mínimo de frequência exigido (LDB 75%) | 🟢 CONFIRMADO |
| desconsiderar_lancamento_frequencia | boolean | Sim | false | Se true, desconsidera presença na apuração do resultado | 🟢 CONFIRMADO |
| parecer_descritivo | smallint | Sim | 0 | 0=Nenhum, 2=Etapa/Componente, 3=Etapa/Geral, 5=Anual/Componente, 6=Anual/Geral | 🟢 CONFIRMADO |
| tipo_presenca | smallint | Sim | 2 | 1=Geral Unificada, 2=Por Componente Curricular | 🟢 CONFIRMADO |
| tipo_recuperacao_paralela | smallint | Sim | 0 | 0=Não usar, 1=Por Etapa, 2=Por Etapas Específicas | 🟢 CONFIRMADO |
| tipo_calculo_recuperacao_paralela | smallint | Sim | 1 | 1=Substitui se maior, 2=Média com etapa, 3=Soma pontos | 🟢 CONFIRMADO |
| media_recuperacao_paralela | numeric(5,3) | Não | null | Média de corte para convocação de recuperação paralela | 🟢 CONFIRMADO |
| nota_maxima_geral | numeric(5,3) | Sim | 10.000 | Nota máxima possível na etapa | 🟢 CONFIRMADO |
| nota_minima_geral | numeric(5,3) | Sim | 0.000 | Nota mínima possível na etapa | 🟢 CONFIRMADO |
| nota_maxima_exame_final | numeric(5,3) | Sim | 10.000 | Nota máxima permitida no exame final | 🟢 CONFIRMADO |
| qtd_casas_decimais | smallint | Sim | 1 | Precisão decimal das notas (0 a 3 casas) | 🟢 CONFIRMADO |
| nota_geral_por_etapa | smallint | Sim | 0 | 1=Nota única para todas as disciplinas da etapa | 🟢 CONFIRMADO |
| qtd_disciplinas_dependencia | smallint | Sim | 0 | Quantidade máxima de disciplinas permitidas em regime de dependência | 🟢 CONFIRMADO |
| qtd_matriculas_dependencia | smallint | Sim | 0 | Limite de matrículas concomitantes de dependência | 🟢 CONFIRMADO |
| reprovacao_automatica | boolean | Sim | true | Se true, encerra o aluno como Reprovado automaticamente sem conselho | 🟢 CONFIRMADO |
| reprovar_automaticamente_apos_dependencias | boolean | Sim | true | Se true, reprova se o total de matérias pendentes exceder o limite | 🟢 CONFIRMADO |
| aprova_media_disciplina | boolean | Sim | true | Se true, aprovação independe de média global | 🟢 CONFIRMADO |
| regra_diferenciada_id | integer | Não (FK) | null | FK para modules.regra_avaliacao.id (Regra adaptada para PCD) | 🟢 CONFIRMADO |
| pontos | boolean | Sim | false | Se true, avalia por acúmulo de pontos anuais em vez de média | 🟢 CONFIRMADO |

---

### 59. Tabela: modules.regra_avaliacao_recuperacao
Parâmetros de recuperação paralela para regras configuradas com etapas específicas/agrupadas.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| id | integer | Sim (PK) | Auto-inc | Identificador único da configuração | 🟢 CONFIRMADO |
| regra_avaliacao_id | integer | Sim (FK) | - | FK para modules.regra_avaliacao.id | 🟢 CONFIRMADO |
| descricao | varchar(255) | Sim | - | Descrição pedagógica (ex: Recuperação 1º Semestre) | 🟢 CONFIRMADO |
| etapas_recuperadas | varchar(255) | Sim | - | Lista de etapas abrangidas separadas por vírgula (ex: 1,2) | 🟢 CONFIRMADO |
| substitui_menor_nota | boolean | Sim | true | Se true, substitui a menor nota do grupo de etapas | 🟢 CONFIRMADO |
| media | numeric(5,3) | Não | null | Média mínima esperada | 🟢 CONFIRMADO |
| nota_maxima | numeric(5,3) | Sim | 10.000 | Nota teto da prova de recuperação | 🟢 CONFIRMADO |

---

### 60. Tabela: modules.regra_avaliacao_serie_ano
Vínculo N:N parametrizado entre a Série/Ano Escolar e a Regra de Avaliação vigente para o Ano Letivo.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| serie_id | integer | Sim (PK, FK) | - | FK para pmieducar.serie.cod_serie | 🟢 CONFIRMADO |
| ano_letivo | integer | Sim (PK) | - | Ano Letivo de vigência da regra (ex: 2026) | 🟢 CONFIRMADO |
| regra_avaliacao_id | integer | Sim (FK) | - | FK para modules.regra_avaliacao.id (Regra padrão) | 🟢 CONFIRMADO |
| regra_avaliacao_diferenciada_id | integer | Não (FK) | null | FK para modules.regra_avaliacao.id (Regra adaptada para PCD) | 🟢 CONFIRMADO |

---

### 61. Tabela: \pmieducar.quadro_horarioCabeçalho do quadro de horários da turma para um determinado ano letivo.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| \cod_quadro_horario\ | \integer\ | Sim (PK) | Auto-inc | Identificador único do quadro de horários | 🟢 CONFIRMADO |
| ef_cod_turma\ | \integer\ | Sim (FK) | - | FK para \pmieducar.turma.cod_turma\ | 🟢 CONFIRMADO |
| \no\ | \integer\ | Sim | - | Ano letivo de vigência do quadro | 🟢 CONFIRMADO |
| ef_usuario_cad\ | \integer\ | Sim | - | Usuário que cadastrou o quadro | 🟢 CONFIRMADO |
| ef_usuario_exc\ | \integer\ | Não | ull\ | Usuário que desativou o quadro | 🟢 CONFIRMADO |
| \data_cadastro\ | \	imestamp\ | Sim | ow()\ | Data e hora de criação | 🟢 CONFIRMADO |
| \data_exclusao\ | \	imestamp\ | Não | ull\ | Data de cancelamento/exclusão lógica | 🟢 CONFIRMADO |
| \tivo\ | \smallint\ | Sim | \ | 1=Ativo/Publicado, 0=Inativo | 🟢 CONFIRMADO |

---

### 62. Tabela: \pmieducar.quadro_horario_horariosSlots e aulas semanais que compõem a grade horária da turma.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| ef_cod_quadro_horario\ | \integer\ | Sim (PK, FK) | - | FK para \pmieducar.quadro_horario.cod_quadro_horario\ | 🟢 CONFIRMADO |
| \sequencial\ | \smallint\ | Sim (PK) | - | Sequencial ordinal do horário dentro da grade da turma | 🟢 CONFIRMADO |
| ef_cod_disciplina\ | \integer\ | Sim (FK) | - | FK para \pmieducar.disciplina.cod_disciplina\ | 🟢 CONFIRMADO |
| ef_cod_escola\ | \integer\ | Sim (FK) | - | FK para \pmieducar.escola.cod_escola\ | 🟢 CONFIRMADO |
| ef_cod_serie\ | \integer\ | Sim (FK) | - | FK para \pmieducar.serie.cod_serie\ | 🟢 CONFIRMADO |
| ef_servidor\ | \integer\ | Sim (FK) | - | FK para o servidor docente titular alocado | 🟢 CONFIRMADO |
| ef_servidor_substituto\ | \integer\ | Não (FK) | ull\ | FK para o servidor docente substituto eventual | 🟢 CONFIRMADO |
| \dia_semana\ | \smallint\ | Sim | - | Dia da semana: 1=Domingo, 2=Segunda, ..., 7=Sábado | 🟢 CONFIRMADO |
| \hora_inicial\ | \	ime\ | Sim | - | Horário de início da aula (\HH:MM:SS\) | 🟢 CONFIRMADO |
| \hora_final\ | \	ime\ | Sim | - | Horário de término da aula (\HH:MM:SS\) | 🟢 CONFIRMADO |
| \tivo\ | \smallint\ | Sim | \ | 1=Slot Ativo, 0=Excluído | 🟢 CONFIRMADO |

---

### 63. Tabela: \pmieducar.servidor_alocacaoAlocação administrativa e jornada de trabalho contratual do servidor na unidade escolar.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| \cod_servidor_alocacao\ | \integer\ | Sim (PK) | Auto-inc | Identificador único da alocação | 🟢 CONFIRMADO |
| ef_cod_servidor\ | \integer\ | Sim (FK) | - | FK para \pmieducar.servidor.cod_servidor\ | 🟢 CONFIRMADO |
| ef_cod_escola\ | \integer\ | Sim (FK) | - | FK para \pmieducar.escola.cod_escola\ | 🟢 CONFIRMADO |
| \no\ | \integer\ | Sim | - | Ano letivo de vigência da alocação | 🟢 CONFIRMADO |
| \carga_horaria\ | \archar(10)\ | Sim | - | Carga horária semanal dedicada a sala de aula (\HH:MM\) | 🟢 CONFIRMADO |
| \hora_atividade\ | \archar(10)\ | Não | ull\ | Carga horária semanal de hora-atividade / planejamento | 🟢 CONFIRMADO |
| \horas_excedentes\ | \archar(10)\ | Não | ull\ | Horas suplementares autorizadas | 🟢 CONFIRMADO |
| \periodo\ | \smallint\ | Não | ull\ | Turno de exercício (1=Matutino, 2=Vespertino, 3=Noturno) | 🟢 CONFIRMADO |
| \dia_semana\ | \smallint\ | Não | ull\ | Dia da semana de alocação específica (se restrito) | 🟢 CONFIRMADO |
| \hora_inicial\ | \	ime\ | Não | ull\ | Início da jornada do servidor | 🟢 CONFIRMADO |
| \hora_final\ | \	ime\ | Não | ull\ | Término da jornada do servidor | 🟢 CONFIRMADO |
| \data_admissao\ | \date\ | Sim | - | Data de início das atividades na escola | 🟢 CONFIRMADO |
| \data_saida\ | \date\ | Não | ull\ | Data de encerramento das atividades na escola | 🟢 CONFIRMADO |
| ef_cod_servidor_funcao\| \integer\ | Não (FK) | ull\ | Cargo/função desempenhada na unidade | 🟢 CONFIRMADO |
| \tivo\ | \smallint\ | Sim | \ | 1=Alocação Vigente, 0=Inativa | 🟢 CONFIRMADO |

---

### 64. Tabela: \pmieducar.servidor_disciplinaHabilitações formais do docente para lecionar disciplinas específicas por curso.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| ef_cod_servidor\ | \integer\ | Sim (PK, FK) | - | FK para \pmieducar.servidor.cod_servidor\ | 🟢 CONFIRMADO |
| ef_cod_disciplina\ | \integer\ | Sim (PK, FK) | - | FK para \pmieducar.disciplina.cod_disciplina\ | 🟢 CONFIRMADO |
| ef_cod_curso\ | \integer\ | Sim (PK, FK) | - | FK para \pmieducar.curso.cod_curso\ | 🟢 CONFIRMADO |
| ef_ref_cod_instituicao\| \integer\ | Sim (PK, FK) | - | FK para \pmieducar.instituicao.cod_instituicao\ | 🟢 CONFIRMADO |

---

### 65. Tabela: \pmieducar.quadro_horario_horarios_auxTabela temporária de staging/sessão para manipulação interativa da grade horária antes de efetivação.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| \identificador\ | \archar(255)\ | Sim (PK) | - | Hash/Identificador da sessão do usuário na tela | 🟢 CONFIRMADO |
| \sequencial\ | \smallint\ | Sim (PK) | - | Ordem do horário na montagem da grade | 🟢 CONFIRMADO |
| ef_cod_disciplina\ | \integer\ | Sim | - | Componente curricular em edição | 🟢 CONFIRMADO |
| ef_servidor\ | \integer\ | Sim | - | Professor titular em edição | 🟢 CONFIRMADO |
| \dia_semana\ | \smallint\ | Sim | - | Dia da semana (1..7) | 🟢 CONFIRMADO |
| \hora_inicial\ | \	ime\ | Sim | - | Horário de início | 🟢 CONFIRMADO |
| `hora_final` | `time` | Sim | - | Horário de término | 🟢 CONFIRMADO |

---

## Módulo: DailyRecord & Attendance (Diário de Classe e Frequência)

### 66. Tabela: `modules.falta_aluno`
Registro mestre de apuração de faltas por matrícula, definindo o regime (Geral vs. Por Componente).

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `integer` | Sim (PK) | Auto-inc | Identificador único do registro de falta | 🟢 CONFIRMADO |
| `matricula_id` | `integer` | Sim (FK, Unique) | - | FK para `pmieducar.matricula.cod_matricula` | 🟢 CONFIRMADO |
| `tipo_falta` | `integer` | Sim | - | Regime de presença: `1` = Global / Geral, `2` = Por Componente Curricular | 🟢 CONFIRMADO |

- **Chave Primária:** `id`
- **Índices:** `idx_falta_aluno_matricula_id`, `idx_falta_aluno_matricula_id_tipo`

---

### 67. Tabela: `modules.falta_geral`
Lançamento totalizado de faltas por etapa para turmas em regime de frequência diária global.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `falta_aluno_id` | `integer` | Sim (PK, FK) | - | FK para `modules.falta_aluno.id` | 🟢 CONFIRMADO |
| `etapa` | `varchar(2)` | Sim (PK) | - | Etapa avaliativa (ex: '1', '2', '3', '4') | 🟢 CONFIRMADO |
| `quantidade` | `integer` | Sim | - | Total de faltas acumuladas pelo aluno na etapa | 🟢 CONFIRMADO |

- **Chave Primária Composta:** `(falta_aluno_id, etapa)`

---

### 68. Tabela: `modules.falta_componente_curricular`
Lançamento totalizado de faltas por componente curricular e etapa para turmas em regime por disciplina.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `falta_aluno_id` | `integer` | Sim (PK, FK) | - | FK para `modules.falta_aluno.id` | 🟢 CONFIRMADO |
| `componente_curricular_id` | `integer` | Sim (PK, FK) | - | FK para `modules.componente_curricular.id` | 🟢 CONFIRMADO |
| `etapa` | `varchar(2)` | Sim (PK) | - | Etapa avaliativa (ex: '1', '2', '3', '4') | 🟢 CONFIRMADO |
| `quantidade` | `integer` | Sim | - | Total de horas-aula faltadas na matéria e etapa | 🟢 CONFIRMADO |

- **Chave Primária Composta:** `(falta_aluno_id, componente_curricular_id, etapa)`

---

### 69. Tabela: `pmieducar.falta_atraso` & `pmieducar.falta_atraso_compensado`
Registro de controle de frequência, faltas, atrasos e reposição de horas de servidores docentes e administrativos.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `cod_falta_atraso` | `integer` | Sim (PK) | Auto-inc | Identificador único do registro de ocorrência | 🟢 CONFIRMADO |
| `ref_cod_escola` | `integer` | Sim (FK) | - | FK para a unidade escolar de exercício | 🟢 CONFIRMADO |
| `ref_cod_servidor` | `integer` | Sim (FK) | - | FK para o servidor docente ou técnico | 🟢 CONFIRMADO |
| `data_falta_atraso`| `timestamp` | Sim | - | Data e hora da falta ou atraso | 🟢 CONFIRMADO |
| `qtd_horas` | `time` | Sim | - | Quantidade de horas e minutos do atraso/ausência | 🟢 CONFIRMADO |
| `tipo` | `smallint` | Sim | - | Tipo de ocorrência (`1` = Falta, `2` = Atraso) | 🟢 CONFIRMADO |
| `justificada` | `boolean` | Sim | `false` | Indica se a ausência foi aceita/abonada pela chefia | 🟢 CONFIRMADO |

---

## Módulo: Reports & Official Documents (Relatórios e Documentos Oficiais)

### 70. Tabela: `educa_document_templates` (Legado: Arquivos Jasper `.jrxml` / `config/legacy.php`)
Modelos parametrizáveis e layouts de cabeçalho, corpo e rodapé de documentos oficiais no SYSGOV.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `char(36)` | Sim (PK) | UUID | Identificador único do template de documento | 🟢 CONFIRMADO |
| `tenant_id` | `char(36)` | Sim (FK) | - | Tenant isolador do município | 🟢 CONFIRMADO |
| `school_id` | `char(36)` | Não (FK) | `null` | Se preenchido, customização exclusiva da escola | 🟢 CONFIRMADO |
| `document_type` | `varchar(32)` | Sim | - | Tipo de documento: `REPORT_CARD`, `ENROLLMENT_CERTIFICATE`, `FINAL_GRADE_SHEET`, etc. | 🟢 CONFIRMADO |
| `name` | `varchar(150)` | Sim | - | Nome descritivo do modelo de layout | 🟢 CONFIRMADO |
| `header_layout` | `json` | Sim | - | Configuração de brasão, mantenedora, secretaria e escola | 🟢 CONFIRMADO |
| `body_template` | `mediumtext` | Sim | - | Estrutura de template Blade com campos dinâmicos | 🟢 CONFIRMADO |
| `footer_layout` | `json` | Sim | - | Texto de rodapé, decretos de autorização e avisos | 🟢 CONFIRMADO |
| `page_orientation` | `varchar(10)`| Sim | `'PORTRAIT'` | Orientação da página: `'PORTRAIT'` ou `'LANDSCAPE'` | 🟢 CONFIRMADO |
| `paper_size` | `varchar(10)` | Sim | `'A4'` | Formato do papel: `'A4'`, `'LETTER'`, `'LEGAL'` | 🟢 CONFIRMADO |
| `show_qr_code` | `tinyint(1)` | Sim | `1` | Habilita impressão do QR Code de validação pública | 🟢 CONFIRMADO |
| `validity_days` | `integer` | Não | `null` | Prazo padrão de validade da certidão em dias (ex: 30) | 🟢 CONFIRMADO |
| `is_default` | `tinyint(1)` | Sim | `0` | Indica se é o modelo padrão da rede | 🟢 CONFIRMADO |
| `is_active` | `tinyint(1)` | Sim | `1` | 1=Ativo, 0=Inativo | 🟢 CONFIRMADO |

- **Chave Primária:** `id`
- **Índices:** `idx_doc_templates_tenant_type`, `idx_doc_templates_school`

---

### 71. Tabela: `educa_issued_documents` (Legado: `pmieducar.report_counts` e endpoints Jasper)
Registro auditável e imutável de cada via de documento oficial emitida, com código verificador e hash SHA-256.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `char(36)` | Sim (PK) | UUID | Identificador único da emissão documental | 🟢 CONFIRMADO |
| `tenant_id` | `char(36)` | Sim (FK) | - | Tenant do município | 🟢 CONFIRMADO |
| `school_id` | `char(36)` | Sim (FK) | - | Escola expedidora do documento | 🟢 CONFIRMADO |
| `student_id` | `char(36)` | Não (FK) | `null` | Aluno titular do documento emitido | 🟢 CONFIRMADO |
| `enrollment_id` | `char(36)` | Não (FK) | `null` | Matrícula de referência vinculada | 🟢 CONFIRMADO |
| `school_class_id`| `char(36)` | Não (FK) | `null` | Turma vinculada (para Atas ou Boletins de Turma) | 🟢 CONFIRMADO |
| `template_id` | `char(36)` | Não (FK) | `null` | Modelo de template utilizado na emissão | 🟢 CONFIRMADO |
| `document_type` | `varchar(32)` | Sim | - | Tipo do documento oficial expedido | 🟢 CONFIRMADO |
| `verification_code` | `varchar(32)` | Sim (Unique) | - | Código alfanumérico público (ex: `AUTH-2026-F9D2-8B1A`) | 🟢 CONFIRMADO |
| `document_hash` | `char(64)` | Sim | - | Hash criptográfico SHA-256 do payload do documento | 🟢 CONFIRMADO |
| `document_data_snapshot` | `json` | Sim | - | Dados acadêmicos e cadastrais congelados na emissão | 🟢 CONFIRMADO |
| `pdf_storage_path` | `varchar(255)`| Não | `null` | Caminho do arquivo PDF/A assinado no Object Storage S3 | 🟢 CONFIRMADO |
| `issued_by_user_id`| `char(36)` | Sim (FK) | - | Operador/secretário responsável pela emissão | 🟢 CONFIRMADO |
| `purpose` | `varchar(200)` | Não | `null` | Finalidade informada na expedição | 🟢 CONFIRMADO |
| `issued_at` | `timestamp` | Sim | `now()` | Data e hora oficial da expedição | 🟢 CONFIRMADO |
| `expires_at` | `timestamp` | Não | `null` | Data limite de validade da certidão | 🟢 CONFIRMADO |
| `status` | `varchar(15)` | Sim | `'ACTIVE'` | Situação jurídica: `'ACTIVE'`, `'EXPIRED'`, `'REVOKED'` | 🟢 CONFIRMADO |
| `verification_views_count` | `integer` | Sim | `0` | Acessos registrados ao portal público de validação | 🟢 CONFIRMADO |

- **Chave Primária:** `id`
- **Índices:** `uk_issued_doc_code`, `idx_issued_doc_hash`, `idx_issued_doc_student`, `idx_issued_doc_enrollment`

---

### 72. Tabela: `educa_document_signatures` (Inovação SYSGOV)
Assinaturas eletrônicas e digitais vinculadas ao documento escolar emitido (Lei 14.063/2020 / ICP-Brasil).

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `char(36)` | Sim (PK) | UUID | Identificador único da assinatura | 🟢 CONFIRMADO |
| `tenant_id` | `char(36)` | Sim (FK) | - | Tenant do município | 🟢 CONFIRMADO |
| `issued_document_id`| `char(36)`| Sim (FK) | - | Documento oficial vinculado | 🟢 CONFIRMADO |
| `signatory_user_id` | `char(36)` | Sim (FK) | - | Usuário signatário no SYSGOV | 🟢 CONFIRMADO |
| `signatory_role` | `varchar(30)` | Sim | - | Cargo/Função: `'PRINCIPAL'`, `'SECRETARY'`, etc. | 🟢 CONFIRMADO |
| `signatory_name` | `varchar(150)`| Sim | - | Nome civil do signatário | 🟢 CONFIRMADO |
| `signatory_cpf` | `char(11)` | Sim | - | CPF do signatário | 🟢 CONFIRMADO |
| `signature_type` | `varchar(30)` | Sim | `'ELECTRONIC'` | Tipo: `'ELECTRONIC'` ou `'DIGITAL_ICP_BRASIL'` | 🟢 CONFIRMADO |
| `signature_hash` | `varchar(512)`| Sim | - | Hash criptográfico do pacote assinado | 🟢 CONFIRMADO |
| `timestamp_token` | `text` | Não | `null` | Carimbo de tempo da Autoridade Certificadora | 🟢 CONFIRMADO |
| `signed_at` | `timestamp` | Sim | `now()` | Data e hora exata da aposição da assinatura | 🟢 CONFIRMADO |

- **Chave Primária:** `id`
- **Índices:** `idx_doc_signatures_document`, `idx_doc_signatures_user`

---

### 73. Tabela: `educa_final_grade_records` (Legado: `pmieducar.historico_escolar` parcial & consolidação em runtime)
Ata consolidada e congelada de rendimento escolar de encerramento do ano letivo por turma.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `char(36)` | Sim (PK) | UUID | Identificador único do registro de ata | 🟢 CONFIRMADO |
| `tenant_id` | `char(36)` | Sim (FK) | - | Tenant do município | 🟢 CONFIRMADO |
| `school_class_id`| `char(36)` | Sim (FK) | - | Turma vinculada | 🟢 CONFIRMADO |
| `academic_year_id` | `char(36)`| Sim (FK) | - | Ano letivo de referência | 🟢 CONFIRMADO |
| `student_id` | `char(36)` | Sim (FK) | - | Aluno constante na ata | 🟢 CONFIRMADO |
| `enrollment_id` | `char(36)` | Sim (FK) | - | Matrícula do aluno | 🟢 CONFIRMADO |
| `order_in_class` | `integer` | Sim | `1` | Número de chamada na relação da turma | 🟢 CONFIRMADO |
| `student_name` | `varchar(200)`| Sim | - | Nome do aluno congelado | 🟢 CONFIRMADO |
| `student_registration_code` | `varchar(50)` | Sim | - | Código de matrícula congelado | 🟢 CONFIRMADO |
| `discipline_scores` | `json` | Sim | - | Array com notas, médias e situação por componente | 🟢 CONFIRMADO |
| `total_absences` | `integer` | Sim | `0` | Total anual de faltas acumuladas | 🟢 CONFIRMADO |
| `attendance_percentage` | `decimal(5,2)` | Sim | `100.00` | Percentual global de presença apurado | 🟢 CONFIRMADO |
| `final_situation` | `varchar(30)` | Sim | - | Situação final: `'APPROVED'`, `'RETAINED_BY_SCORE'`, etc. | 🟢 CONFIRMADO |
| `is_closed` | `tinyint(1)` | Sim | `0` | 1=Ata Homologada/Travada, 0=Em Aberto | 🟢 CONFIRMADO |
| `closed_by_user_id` | `char(36)` | Não (FK) | `null` | Gestor que homologou o fechamento da ata | 🟢 CONFIRMADO |
| `closed_at` | `timestamp` | Não | `null` | Data e hora da homologação da ata | 🟢 CONFIRMADO |

- **Chave Primária:** `id`
- **Índices:** `uk_final_grade_enrollment`, `idx_final_grade_class_order`



---

### 74. Tabela: `educa_network_configurations` (Legado: `pmieducar.instituicao` & `pmieducar.configuracoes_gerais`)
Parâmetros centrais da mantenedora municipal, diretrizes CNE, corte etário de 31 de março e exigências cadastrais.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `char(36)` | Sim (PK) | UUID | Identificador da configuração da rede | 🟢 CONFIRMADO |
| `tenant_id` | `char(36)` | Sim (FK) | - | Tenant do município (1:1) | 🟢 CONFIRMADO |
| `entity_name` | `varchar(180)` | Sim | - | Nome da mantenedora (ex: Secretaria Municipal de Educação) | 🟢 CONFIRMADO |
| `acronym` | `varchar(30)` | Não | `null` | Sigla oficial da mantenedora | 🟢 CONFIRMADO |
| `cnpj` | `char(14)` | Sim | - | CNPJ da mantenedora (apenas dígitos) | 🟢 CONFIRMADO |
| `state_code` | `char(2)` | Sim | - | Sigla da UF do município | 🟢 CONFIRMADO |
| `city_ibge_code` | `char(7)` | Sim | - | Código IBGE do município sede | 🟢 CONFIRMADO |
| `city_name` | `varchar(100)` | Sim | - | Nome do município | 🟢 CONFIRMADO |
| `education_board_name` | `varchar(150)` | Não | `null` | Nome do Conselho de Educação | 🟢 CONFIRMADO |
| `standard_coat_of_arms_url` | `varchar(255)` | Não | `null` | URL do brasão oficial do município | 🟢 CONFIRMADO |
| `standard_logo_url` | `varchar(255)` | Não | `null` | URL do logotipo padrão da Secretaria | 🟢 CONFIRMADO |
| `official_journal_name` | `varchar(120)` | Não | `null` | Nome do Diário Oficial | 🟢 CONFIRMADO |
| `cne_cutoff_day` | `tinyint unsigned` | Sim | `31` | Dia de corte etário CNE (Resolução nº 2/2018) | 🟢 CONFIRMADO |
| `cne_cutoff_month` | `tinyint unsigned`| Sim | `3` | Mês de corte etário CNE (3 = Março) | 🟢 CONFIRMADO |
| `allow_cutoff_exceptions` | `tinyint(1)` | Sim | `0` | 1=Permite exceção judicial ao corte etário | 🟢 CONFIRMADO |
| `require_student_cpf` | `tinyint(1)` | Sim | `1` | 1=Exige CPF obrigatório para o aluno | 🟢 CONFIRMADO |
| `require_parent_cpf` | `tinyint(1)` | Sim | `1` | 1=Exige CPF do responsável legal | 🟢 CONFIRMADO |
| `require_birth_certificate` | `tinyint(1)` | Sim | `1` | 1=Exige certidão de nascimento civil | 🟢 CONFIRMADO |
| `require_sus_card` | `tinyint(1)` | Sim | `0` | 1=Exige número do cartão SUS | 🟢 CONFIRMADO |
| `require_nis` | `tinyint(1)` | Sim | `0` | 1=Exige NIS/CadÚnico | 🟢 CONFIRMADO |
| `require_medical_report_for_aee` | `tinyint(1)` | Sim | `1` | 1=Exige laudo médico para AEE | 🟢 CONFIRMADO |
| `max_disciplinary_dependencies` | `tinyint unsigned` | Sim | `2` | Máximo de dependências em progressão parcial | 🟢 CONFIRMADO |
| `allow_duplicate_enrollment_same_network` | `tinyint(1)` | Sim | `0` | 1=Permite matrículas ativas simultâneas na rede | 🟢 CONFIRMADO |
| `enable_automatic_student_id` | `tinyint(1)` | Sim | `1` | 1=Gera código de identificação único automaticamente | 🟢 CONFIRMADO |
| `student_id_prefix` | `varchar(10)` | Não | `'ALU'` | Prefixo do código de identificação discente | 🟢 CONFIRMADO |
| `student_id_sequence_length` | `tinyint unsigned` | Sim | `8` | Tamanho da sequência numérica | 🟢 CONFIRMADO |
| `created_at` | `timestamp` | Sim | `now()` | Criação do registro | 🟢 CONFIRMADO |
| `updated_at` | `timestamp` | Sim | `now()` | Última atualização | 🟢 CONFIRMADO |

- **Chave Primária:** `id`
- **Índices:** `uk_network_config_tenant` (UNIQUE: `tenant_id`)

---

### 75. Tabela: `educa_calendar_locks` (Legado: `pmieducar.bloqueio_ano_letivo`)
Motor granular de bloqueio de prazos por operação (notas, frequências, planos, matrículas, histórico) e escopo (rede, etapa, escola).

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `char(36)` | Sim (PK) | UUID | Identificador do bloqueio | 🟢 CONFIRMADO |
| `tenant_id` | `char(36)` | Sim (FK) | - | Tenant do município | 🟢 CONFIRMADO |
| `academic_year_id` | `char(36)`| Sim (FK) | - | Ano letivo de vigência | 🟢 CONFIRMADO |
| `operation_type` | `varchar(30)` | Sim | - | `'GRADE_POSTING'`, `'ATTENDANCE_POSTING'`, etc. | 🟢 CONFIRMADO |
| `stage_id` | `char(36)` | Não (FK) | `null` | Etapa de avaliação restrita (bimestre/trimestre) | 🟢 CONFIRMADO |
| `scope_type` | `varchar(20)` | Sim | `'NETWORK'` | Escopo: `'NETWORK'`, `'STAGE'`, `'SCHOOL'` | 🟢 CONFIRMADO |
| `school_id` | `char(36)` | Não (FK) | `null` | Escola específica caso escopo seja `'SCHOOL'` | 🟢 CONFIRMADO |
| `course_stage_id` | `char(36)` | Não (FK) | `null` | Etapa escolar caso escopo seja `'STAGE'` | 🟢 CONFIRMADO |
| `lock_start_at` | `datetime` | Sim | - | Início da vigência do travamento | 🟢 CONFIRMADO |
| `lock_end_at` | `datetime` | Não | `null` | Fim da vigência (null = definitivo) | 🟢 CONFIRMADO |
| `retroactive_tolerance_days` | `smallint unsigned` | Sim | `0` | Dias de retroatividade tolerados | 🟢 CONFIRMADO |
| `description` | `varchar(255)`| Sim | - | Motivo/identificação do fechamento | 🟢 CONFIRMADO |
| `is_active` | `tinyint(1)` | Sim | `1` | 1=Bloqueio Ativo/Vigente | 🟢 CONFIRMADO |
| `created_by` | `char(36)` | Sim (FK) | - | Usuário da SME instituidor | 🟢 CONFIRMADO |
| `created_at` | `timestamp` | Sim | `now()` | Data de instituição | 🟢 CONFIRMADO |
| `updated_at` | `timestamp` | Sim | `now()` | Atualização | 🟢 CONFIRMADO |

- **Chave Primária:** `id`
- **Índices:** `idx_calendar_locks_lookup`, `idx_calendar_locks_school`

---

### 76. Tabela: `educa_lock_exceptions` (Inovação SYSGOV: Exceções e Prorrogações Auditadas)
Concessão auditada e temporária de reabertura de prazos para servidores específicos, com protocolo administrativo e prazo limite.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `char(36)` | Sim (PK) | UUID | Identificador da exceção de prazo | 🟢 CONFIRMADO |
| `tenant_id` | `char(36)` | Sim (FK) | - | Tenant do município | 🟢 CONFIRMADO |
| `lock_id` | `char(36)` | Sim (FK) | - | Bloqueio de referência | 🟢 CONFIRMADO |
| `user_id` | `char(36)` | Sim (FK) | - | Usuário beneficiário (professor/secretário) | 🟢 CONFIRMADO |
| `school_class_id` | `char(36)` | Não (FK) | `null` | Turma restrita (se aplicável) | 🟢 CONFIRMADO |
| `discipline_id` | `char(36)` | Não (FK) | `null` | Componente restrito (se aplicável) | 🟢 CONFIRMADO |
| `school_id` | `char(36)` | Não (FK) | `null` | Escola restrita (se aplicável) | 🟢 CONFIRMADO |
| `expires_at` | `datetime` | Sim | - | Data e hora exatas de expiração da tolerância | 🟢 CONFIRMADO |
| `protocol_number` | `varchar(60)` | Sim | - | Número de memorando ou processo da liberação | 🟢 CONFIRMADO |
| `reason` | `text` | Sim | - | Justificativa legal/administrativa fundamentada | 🟢 CONFIRMADO |
| `granted_by` | `char(36)` | Sim (FK) | - | Usuário gestor autorizador | 🟢 CONFIRMADO |
| `is_revoked` | `tinyint(1)` | Sim | `0` | 1=Revogada antes do prazo | 🟢 CONFIRMADO |
| `revoked_at` | `datetime` | Não | `null` | Data da revogação antecipada | 🟢 CONFIRMADO |
| `revocation_reason` | `varchar(255)`| Não | `null` | Motivo da revogação | 🟢 CONFIRMADO |
| `created_at` | `timestamp` | Sim | `now()` | Concessão da exceção | 🟢 CONFIRMADO |
| `updated_at` | `timestamp` | Sim | `now()` | Atualização | 🟢 CONFIRMADO |

- **Chave Primária:** `id`
- **Índices:** `idx_lock_exceptions_validation`, `idx_lock_exceptions_target`

---

### 77. Tabela: `educa_system_parameters` (Legado: `public.settings` & `public.settings_categories`)
Dicionário dinâmico de parâmetros tipados por tenant, com suporte a valores encriptados (AES-256) e cache no Redis.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `char(36)` | Sim (PK) | UUID | Identificador do parâmetro | 🟢 CONFIRMADO |
| `tenant_id` | `char(36)` | Sim (FK) | - | Tenant do município | 🟢 CONFIRMADO |
| `group_name` | `varchar(60)` | Sim | - | Grupo de contexto (`MESSAGING`, `SECURITY`, etc.) | 🟢 CONFIRMADO |
| `param_key` | `varchar(100)`| Sim | - | Chave única identificadora do parâmetro | 🟢 CONFIRMADO |
| `data_type` | `varchar(20)` | Sim | `'STRING'` | Tipo: `'STRING'`, `'INTEGER'`, `'DECIMAL'`, `'BOOLEAN'`, `'JSON'`, `'ENCRYPTED'` | 🟢 CONFIRMADO |
| `param_value` | `mediumtext` | Não | `null` | Valor em texto puro ou JSON | 🟢 CONFIRMADO |
| `encrypted_value` | `blob` | Não | `null` | Valor criptografado com AES-256 | 🟢 CONFIRMADO |
| `description` | `varchar(255)`| Sim | - | Descrição amigável para a interface | 🟢 CONFIRMADO |
| `is_system_reserved` | `tinyint(1)`| Sim | `0` | 1=Parâmetro de sistema protegido | 🟢 CONFIRMADO |
| `created_at` | `timestamp` | Sim | `now()` | Criação do parâmetro | 🟢 CONFIRMADO |
| `updated_at` | `timestamp` | Sim | `now()` | Atualização do parâmetro | 🟢 CONFIRMADO |

- **Chave Primária:** `id`
- **Índices:** `uk_sys_params_tenant_key` (UNIQUE: `tenant_id`, `param_key`), `idx_sys_params_tenant_group`

---

## Módulo: Stages (Etapas de Ensino, Ciclos e Séries Escolares)

### 78. Tabela: `educa_education_levels` (Legado: `pmieducar.nivel_ensino`)
Níveis e modalidades nacionais de ensino ofertados pela rede municipal (base MEC/Censo Escolar).

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `char(36)` | Sim (PK) | UUID | UUID v4 do nível de ensino | 🟢 CONFIRMADO |
| `tenant_id` | `char(36)` | Sim (FK) | - | UUID do município / órgão gestor | 🟢 CONFIRMADO |
| `code` | `varchar(30)` | Sim | - | Código canônico (`EARLY_CHILDHOOD`, `PRIMARY_ELEMENTARY`, etc.) | 🟢 CONFIRMADO |
| `name` | `varchar(150)`| Sim | - | Nome de exibição oficial do nível | 🟢 CONFIRMADO |
| `inep_level_code` | `varchar(10)`| Não | `null` | Código correspondente no Censo Escolar/INEP | 🟢 CONFIRMADO |
| `stage_modality` | `varchar(40)` | Sim | `'REGULAR'` | Modalidade: `REGULAR`, `SPECIAL`, `EJA`, `INDIGENOUS`, `VOCATIONAL` | 🟢 CONFIRMADO |
| `description` | `text` | Não | `null` | Diretrizes pedagógicas e base legal do nível | 🟢 CONFIRMADO |
| `display_order` | `smallint unsigned` | Sim | `1` | Ordem de apresentação nas listagens | 🟢 CONFIRMADO |
| `is_active` | `tinyint(1)` | Sim | `1` | 1=Ativo, 0=Inativo | 🟢 CONFIRMADO |
| `created_at` | `timestamp` | Sim | `now()` | Data de criação | 🟢 CONFIRMADO |
| `updated_at` | `timestamp` | Sim | `now()` | Data de atualização | 🟢 CONFIRMADO |

- **Chave Primária:** `id`
- **Índices:** `uk_level_tenant_code` (UNIQUE: `tenant_id`, `code`), `idx_level_tenant`, `idx_level_inep`

---

### 79. Tabela: `educa_courses` (Legado: `pmieducar.curso`)
Cursos mantidos pela rede municipal com especificação de regime, dias letivos, carga horária e divisão de etapas.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `char(36)` | Sim (PK) | UUID | UUID v4 do curso | 🟢 CONFIRMADO |
| `tenant_id` | `char(36)` | Sim (FK) | - | UUID do município / órgão gestor | 🟢 CONFIRMADO |
| `education_level_id` | `char(36)` | Sim (FK) | - | FK para o nível de ensino (`educa_education_levels`) | 🟢 CONFIRMADO |
| `evaluation_rule_id` | `char(36)` | Não (FK) | `null` | FK para a regra padrão de avaliação (`educa_evaluation_rules`) | 🟢 CONFIRMADO |
| `code` | `varchar(50)` | Sim | - | Código interno do curso | 🟢 CONFIRMADO |
| `name` | `varchar(200)`| Sim | - | Nome completo oficial do curso | 🟢 CONFIRMADO |
| `short_name` | `varchar(50)` | Não | `null` | Sigla ou abreviação | 🟢 CONFIRMADO |
| `regime_type` | `varchar(30)` | Sim | `'ANNUAL'` | Regime: `ANNUAL`, `SEMESTER`, `MODULAR`, `CYCLIC` | 🟢 CONFIRMADO |
| `inep_course_code` | `varchar(20)` | Não | `null` | Código de homologação no Educacenso/INEP | 🟢 CONFIRMADO |
| `minimum_workload_hours`| `smallint unsigned`| Sim | `800` | Carga horária total mínima regulamentar | 🟢 CONFIRMADO |
| `minimum_school_days`| `smallint unsigned`| Sim | `200` | Mínimo de dias letivos anuais (LDB) | 🟢 CONFIRMADO |
| `total_stages` | `tinyint unsigned` | Sim | `9` | Quantidade de etapas/séries que compõem o curso | 🟢 CONFIRMADO |
| `stage_division_type`| `varchar(30)` | Sim | `'BIMESTER'`| Divisão das etapas: `BIMESTER`, `TRIMESTER`, `SEMESTER`, `ANNUAL` | 🟢 CONFIRMADO |
| `is_active` | `tinyint(1)` | Sim | `1` | 1=Ativo, 0=Inativo | 🟢 CONFIRMADO |
| `created_at` | `timestamp` | Sim | `now()` | Data de criação | 🟢 CONFIRMADO |
| `updated_at` | `timestamp` | Sim | `now()` | Data de atualização | 🟢 CONFIRMADO |

- **Chave Primária:** `id`
- **Índices:** `uk_course_tenant_code` (UNIQUE: `tenant_id`, `code`), `idx_course_tenant`, `idx_course_level`, `idx_course_rule`

---

### 80. Tabela: `educa_grades` (Legado: `pmieducar.serie`)
Séries, anos escolares ou etapas de ciclos com limites etários de corte, dias letivos, carga horária e códigos INEP.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `char(36)` | Sim (PK) | UUID | UUID v4 da série escolar | 🟢 CONFIRMADO |
| `tenant_id` | `char(36)` | Sim (FK) | - | UUID do município / órgão gestor | 🟢 CONFIRMADO |
| `course_id` | `char(36)` | Sim (FK) | - | FK para o curso (`educa_courses`) | 🟢 CONFIRMADO |
| `evaluation_rule_id`| `char(36)` | Não (FK) | `null` | Sobrescrita de regra de avaliação específica da série | 🟢 CONFIRMADO |
| `name` | `varchar(150)`| Sim | - | Nome da série/ano (ex: 1º Ano, 2º Ano) | 🟢 CONFIRMADO |
| `order_index` | `tinyint unsigned`| Sim | - | Posição sequencial numérica no curso (1, 2, 3...) | 🟢 CONFIRMADO |
| `stage_code_inep`| `varchar(10)` | Sim | - | Código oficial da etapa no Censo Escolar/INEP | 🟢 CONFIRMADO |
| `workload_hours`| `smallint unsigned`| Sim | `800` | Carga horária anual da série | 🟢 CONFIRMADO |
| `school_days` | `smallint unsigned`| Sim | `200` | Quantidade mínima de dias letivos | 🟢 CONFIRMADO |
| `target_age` | `tinyint unsigned` | Não | `null` | Idade ideal esperada do estudante | 🟢 CONFIRMADO |
| `min_age` | `tinyint unsigned` | Não | `null` | Idade mínima para matrícula | 🟢 CONFIRMADO |
| `max_age` | `tinyint unsigned` | Não | `null` | Idade máxima antes de caracterizar distorção idade-série | 🟢 CONFIRMADO |
| `cutoff_day` | `tinyint unsigned` | Não | `31` | Dia da data de corte etário | 🟢 CONFIRMADO |
| `cutoff_month` | `tinyint unsigned` | Não | `3` | Mês da data de corte etário (Março) | 🟢 CONFIRMADO |
| `is_graduating_stage`| `tinyint(1)` | Sim | `0` | 1=Etapa concluinte do curso/nível | 🟢 CONFIRMADO |
| `cycle_name` | `varchar(100)`| Não | `null` | Nome do ciclo pedagógico (ex: Bloco de Alfabetização) | 🟢 CONFIRMADO |
| `is_continuous_progression`| `tinyint(1)`| Sim | `0` | 1=Progressão continuada (sem retenção por nota) | 🟢 CONFIRMADO |
| `is_active` | `tinyint(1)` | Sim | `1` | 1=Ativo, 0=Inativo | 🟢 CONFIRMADO |
| `created_at` | `timestamp` | Sim | `now()` | Data de criação | 🟢 CONFIRMADO |
| `updated_at` | `timestamp` | Sim | `now()` | Data de atualização | 🟢 CONFIRMADO |

- **Chave Primária:** `id`
- **Índices:** `uk_grade_course_order` (UNIQUE: `course_id`, `order_index`), `idx_grade_tenant`, `idx_grade_course`, `idx_grade_inep`

---

### 81. Tabela: `educa_grade_sequences` (Legado: `pmieducar.sequencia_serie`)
Matriz de transição, progressão continuada, avanço por aceleração e dependência parcial entre séries e ciclos.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `char(36)` | Sim (PK) | UUID | UUID v4 da regra de transição | 🟢 CONFIRMADO |
| `tenant_id` | `char(36)` | Sim (FK) | - | UUID do município / órgão gestor | 🟢 CONFIRMADO |
| `origin_grade_id`| `char(36)` | Sim (FK) | - | FK para a série de origem (`educa_grades`) | 🟢 CONFIRMADO |
| `destination_grade_id`| `char(36)` | Sim (FK) | - | FK para a série de destino (`educa_grades`) | 🟢 CONFIRMADO |
| `transition_type`| `varchar(40)` | Sim | `'REGULAR_PROMOTION'`| `REGULAR_PROMOTION`, `CYCLE_CONTINUATION`, `PARTIAL_DEPENDENCY`, `ACCELERATION_JUMP`, `INTER_COURSE_TRANSITION` | 🟢 CONFIRMADO |
| `description` | `varchar(255)`| Não | `null` | Detalhamento normativo da transição | 🟢 CONFIRMADO |
| `requires_board_approval`| `tinyint(1)`| Sim | `0` | 1=Exige parecer formal do Conselho de Classe | 🟢 CONFIRMADO |
| `is_active` | `tinyint(1)` | Sim | `1` | 1=Regra ativa na matriz | 🟢 CONFIRMADO |
| `created_at` | `timestamp` | Sim | `now()` | Data de criação | 🟢 CONFIRMADO |
| `updated_at` | `timestamp` | Sim | `now()` | Data de atualização | 🟢 CONFIRMADO |

- **Chave Primária:** `id`
- **Índices:** `uk_sequence_transition` (UNIQUE: `origin_grade_id`, `destination_grade_id`, `transition_type`), `idx_seq_tenant`, `idx_seq_origin`, `idx_seq_dest`

---

### 82. Tabela: `educa_course_school_offers` (Legado: `pmieducar.escola_curso`)
Habilitação e autorização da oferta de cursos por unidade escolar, com rastreabilidade de ato normativo e vigência.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `char(36)` | Sim (PK) | UUID | UUID v4 da oferta autorizada | 🟢 CONFIRMADO |
| `tenant_id` | `char(36)` | Sim (FK) | - | UUID do município / órgão gestor | 🟢 CONFIRMADO |
| `school_id` | `char(36)` | Sim (FK) | - | FK para a unidade escolar (`educa_schools`) | 🟢 CONFIRMADO |
| `course_id` | `char(36)` | Sim (FK) | - | FK para o curso ofertado (`educa_courses`) | 🟢 CONFIRMADO |
| `authorization_act_number`| `varchar(100)`| Não | `null` | Número da Portaria ou Resolução do CME/CEE | 🟢 CONFIRMADO |
| `authorization_date`| `date` | Não | `null` | Data de publicação do ato regulatório | 🟢 CONFIRMADO |
| `start_year` | `smallint unsigned`| Sim | - | Ano letivo de início da oferta na escola | 🟢 CONFIRMADO |
| `end_year` | `smallint unsigned`| Não | `null` | Ano letivo de encerramento da oferta | 🟢 CONFIRMADO |
| `is_active` | `tinyint(1)` | Sim | `1` | 1=Oferta vigente, 0=Inativa | 🟢 CONFIRMADO |
| `created_at` | `timestamp` | Sim | `now()` | Data de criação | 🟢 CONFIRMADO |
| `updated_at` | `timestamp` | Sim | `now()` | Data de atualização | 🟢 CONFIRMADO |

- **Chave Primária:** `id`
- **Índices:** `uk_offer_school_course` (UNIQUE: `school_id`, `course_id`), `idx_offer_tenant`, `idx_offer_school`, `idx_offer_course`

---

### 83. Tabela: `core_users` (Legado: `pmieducar.usuario`, `portal.funcionario`, `portal.acesso`)
Identidade central, credenciais unificadas, conformidade com LGPD, MFA (TOTP) e autenticação federada (Gov.br/OIDC) para o monólito SYSGOV.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `char(36)` | Sim (PK) | UUID | UUID v4 do usuário | 🟢 CONFIRMADO |
| `tenant_id` | `char(36)` | Sim (FK) | - | UUID do município / órgão gestor | 🟢 CONFIRMADO |
| `person_id` | `char(36)` | Não (FK) | `null` | FK para dados civis da pessoa física (`educa_pessoas`) | 🟢 CONFIRMADO |
| `cpf` | `varchar(14)` | Sim | - | CPF do usuário formatado (000.000.000-00) | 🟢 CONFIRMADO |
| `name` | `varchar(255)` | Sim | - | Nome completo do usuário | 🟢 CONFIRMADO |
| `email` | `varchar(191)` | Sim | - | Endereço de e-mail institucional ou pessoal | 🟢 CONFIRMADO |
| `phone` | `varchar(20)` | Não | `null` | Telefone de contato com DDD | 🟢 CONFIRMADO |
| `password_hash` | `varchar(255)` | Sim | - | Hash de senha com Argon2id ou Bcrypt | 🟢 CONFIRMADO |
| `status` | `enum` | Sim | `'PENDING_ACTIVATION'` | `ACTIVE`, `INACTIVE`, `SUSPENDED`, `PENDING_ACTIVATION` | 🟢 CONFIRMADO |
| `email_verified_at` | `timestamp` | Não | `null` | Data e hora de confirmação de e-mail | 🟢 CONFIRMADO |
| `mfa_enabled` | `tinyint(1)` | Sim | `0` | 1=MFA ativado, 0=MFA desativado | 🟢 CONFIRMADO |
| `mfa_secret` | `varchar(255)` | Não | `null` | Segredo TOTP criptografado com AES-256-GCM | 🟢 CONFIRMADO |
| `mfa_type` | `enum` | Sim | `'NONE'` | `NONE`, `TOTP`, `EMAIL_OTP`, `SMS_OTP`, `GOV_BR` | 🟢 CONFIRMADO |
| `govbr_subject_id` | `varchar(191)` | Não | `null` | Subject ID do Login Único Gov.br (OIDC) | 🟢 CONFIRMADO |
| `last_login_at` | `timestamp` | Não | `null` | Data e hora do último acesso bem-sucedido | 🟢 CONFIRMADO |
| `last_login_ip` | `varchar(45)` | Não | `null` | Endereço IP do último login efetuado | 🟢 CONFIRMADO |
| `failed_login_attempts` | `int unsigned` | Sim | `0` | Contador de falhas consecutivas de autenticação | 🟢 CONFIRMADO |
| `locked_until` | `timestamp` | Não | `null` | Bloqueio temporário por excesso de falhas de login | 🟢 CONFIRMADO |
| `password_changed_at` | `timestamp` | Não | `null` | Data da última alteração de senha | 🟢 CONFIRMADO |
| `created_at` | `timestamp` | Sim | `now()` | Data de criação | 🟢 CONFIRMADO |
| `updated_at` | `timestamp` | Sim | `now()` | Data de atualização | 🟢 CONFIRMADO |
| `deleted_at` | `timestamp` | Não | `null` | Soft delete para conformidade com a LGPD | 🟢 CONFIRMADO |

- **Chave Primária:** `id`
- **Índices:** `uk_users_tenant_cpf` (UNIQUE: `tenant_id`, `cpf`), `uk_users_tenant_email` (UNIQUE: `tenant_id`, `email`), `uk_users_tenant_govbr` (UNIQUE: `tenant_id`, `govbr_subject_id`), `idx_users_tenant`, `idx_users_person`, `idx_users_status`

---

### 84. Tabela: `core_roles` (Legado: `pmieducar.tipo_usuario`)
Catálogo de perfis e papéis de acesso funcionais da rede municipal e das unidades escolares.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `char(36)` | Sim (PK) | UUID | UUID v4 do papel/perfil | 🟢 CONFIRMADO |
| `tenant_id` | `char(36)` | Sim (FK) | - | UUID do município / órgão gestor | 🟢 CONFIRMADO |
| `name` | `varchar(100)` | Sim | - | Nome do perfil (ex: Diretor Escolar, Professor Titular) | 🟢 CONFIRMADO |
| `slug` | `varchar(60)` | Sim | - | Slug canônico (ex: `school_director`, `teacher`) | 🟢 CONFIRMADO |
| `description` | `text` | Não | `null` | Detalhamento das responsabilidades do perfil | 🟢 CONFIRMADO |
| `hierarchy_level` | `tinyint unsigned`| Sim | `10` | Nível hierárquico (1=SuperAdmin, 2=SecrMun, 3=Diretor...) | 🟢 CONFIRMADO |
| `scope_type` | `enum` | Sim | `'SCHOOL_UNIT'` | `GLOBAL_NETWORK`, `MUNICIPAL_SECRETARIAT`, `SCHOOL_UNIT`, `PORTAL_PARENT_STUDENT` | 🟢 CONFIRMADO |
| `is_system_preset`| `tinyint(1)` | Sim | `0` | 1=Perfil padrão de fábrica do sistema | 🟢 CONFIRMADO |
| `is_active` | `tinyint(1)` | Sim | `1` | 1=Perfil ativo, 0=Inativo | 🟢 CONFIRMADO |
| `created_at` | `timestamp` | Sim | `now()` | Data de criação | 🟢 CONFIRMADO |
| `updated_at` | `timestamp` | Sim | `now()` | Data de atualização | 🟢 CONFIRMADO |

- **Chave Primária:** `id`
- **Índices:** `uk_roles_tenant_slug` (UNIQUE: `tenant_id`, `slug`), `idx_roles_tenant`, `idx_roles_level`

---

### 85. Tabela: `core_permissions` (Legado: `pmieducar.menu_tipo_usuario`)
Catálogo global de permissões atômicas do sistema em padrão `recurso.subrecurso.acao`.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `char(36)` | Sim (PK) | UUID | UUID v4 da permissão | 🟢 CONFIRMADO |
| `module` | `varchar(50)` | Sim | - | Módulo funcional (ex: `evaluations`, `daily_record`, `users`) | 🟢 CONFIRMADO |
| `action` | `varchar(50)` | Sim | - | Ação autorizada (ex: `view`, `create`, `update`, `post`, `approve`) | 🟢 CONFIRMADO |
| `slug` | `varchar(100)` | Sim | - | Slug único (ex: `evaluations.grades.post`, `daily_record.attendance.register`) | 🟢 CONFIRMADO |
| `name` | `varchar(150)` | Sim | - | Nome legível da permissão | 🟢 CONFIRMADO |
| `description` | `text` | Não | `null` | Detalhamento dos efeitos da permissão | 🟢 CONFIRMADO |
| `created_at` | `timestamp` | Sim | `now()` | Data de criação | 🟢 CONFIRMADO |
| `updated_at` | `timestamp` | Sim | `now()` | Data de atualização | 🟢 CONFIRMADO |

- **Chave Primária:** `id`
- **Índices:** `uk_permissions_slug` (UNIQUE: `slug`), `idx_permissions_module`

---

### 86. Tabela: `core_role_permissions` (Legado: `pmieducar.menu_tipo_usuario`)
Matriz de associação N:N entre perfis de acesso e permissões atômicas concedidas.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `char(36)` | Sim (PK) | UUID | UUID v4 da concessão | 🟢 CONFIRMADO |
| `tenant_id` | `char(36)` | Sim (FK) | - | UUID do município / órgão gestor | 🟢 CONFIRMADO |
| `role_id` | `char(36)` | Sim (FK) | - | FK para o perfil (`core_roles`) | 🟢 CONFIRMADO |
| `permission_id` | `char(36)` | Sim (FK) | - | FK para a permissão (`core_permissions`) | 🟢 CONFIRMADO |
| `granted_at` | `timestamp` | Sim | `now()` | Data e hora em que a permissão foi concedida | 🟢 CONFIRMADO |
| `granted_by` | `char(36)` | Não | `null` | UUID do usuário gestor que concedeu a permissão | 🟢 CONFIRMADO |

- **Chave Primária:** `id`
- **Índices:** `uk_role_permissions` (UNIQUE: `tenant_id`, `role_id`, `permission_id`), `idx_rp_tenant`, `idx_rp_role`, `idx_rp_perm`

---

### 87. Tabela: `educa_user_school_scopes` (Legado: `pmieducar.usuario_escola`)
Lotação escolar e escopos de acesso de usuários em unidades escolares com controle de vigência e papel específico por unidade.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `char(36)` | Sim (PK) | UUID | UUID v4 do escopo de lotação | 🟢 CONFIRMADO |
| `tenant_id` | `char(36)` | Sim (FK) | - | UUID do município / órgão gestor | 🟢 CONFIRMADO |
| `user_id` | `char(36)` | Sim (FK) | - | FK para o usuário (`core_users`) | 🟢 CONFIRMADO |
| `school_id` | `char(36)` | Sim (FK) | - | FK para a unidade escolar (`educa_schools`) | 🟢 CONFIRMADO |
| `role_id` | `char(36)` | Sim (FK) | - | FK para o perfil funcional exercido na escola (`core_roles`) | 🟢 CONFIRMADO |
| `is_primary` | `tinyint(1)` | Sim | `0` | 1=Lotação escolar principal do servidor | 🟢 CONFIRMADO |
| `status` | `enum` | Sim | `'ACTIVE'` | `ACTIVE`, `INACTIVE`, `REVOKED` | 🟢 CONFIRMADO |
| `valid_from` | `date` | Não | `null` | Data de início da designação na escola | 🟢 CONFIRMADO |
| `valid_until` | `date` | Não | `null` | Data final da designação (nulo se indeterminado) | 🟢 CONFIRMADO |
| `created_at` | `timestamp` | Sim | `now()` | Data de criação | 🟢 CONFIRMADO |
| `updated_at` | `timestamp` | Sim | `now()` | Data de atualização | 🟢 CONFIRMADO |

- **Chave Primária:** `id`
- **Índices:** `uk_user_school_role` (UNIQUE: `tenant_id`, `user_id`, `school_id`, `role_id`), `idx_scope_tenant`, `idx_scope_user`, `idx_scope_school`, `idx_scope_role`


---

### 88. Tabela: `core_system_errors` (Legado: `Modules/ErrorTracking/Tracker.php`, logs de aplicação)
Registro centralizado de incidentes, falhas técnicas e exceções não tratadas com OpenTelemetry TraceID e sanitização PII (LGPD).

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `char(36)` | Sim (PK) | UUID | UUID v4 do incidente de sistema | 🟢 CONFIRMADO |
| `tenant_id` | `char(36)` | Sim (FK) | - | Município / órgão gestor onde ocorreu a falha | 🟢 CONFIRMADO |
| `user_id` | `char(36)` | Não (FK) | `null` | Usuário logado no momento do disparo | 🟢 CONFIRMADO |
| `school_id` | `char(36)` | Não (FK) | `null` | Unidade escolar no contexto da requisição | 🟢 CONFIRMADO |
| `trace_id` | `varchar(64)` | Sim | - | Identificador distribuído de rastreamento (W3C/OTel) | 🟢 CONFIRMADO |
| `environment` | `enum` | Sim | `'production'` | `production`, `staging`, `development`, `testing` | 🟢 CONFIRMADO |
| `severity` | `enum` | Sim | `'error'` | `debug`, `info`, `warning`, `error`, `critical`, `emergency` | 🟢 CONFIRMADO |
| `exception_class` | `varchar(255)` | Sim | - | Nome da classe da exceção lançada | 🟢 CONFIRMADO |
| `message` | `text` | Sim | - | Mensagem descritiva do erro sanitizada (sem senhas/PII) | 🟢 CONFIRMADO |
| `file` | `varchar(255)` | Sim | - | Caminho relativo do arquivo fonte | 🟢 CONFIRMADO |
| `line` | `int unsigned` | Sim | - | Linha exata onde ocorreu o erro | 🟢 CONFIRMADO |
| `stack_trace` | `longtext` | Sim | - | Stack trace formatado para diagnóstico | 🟢 CONFIRMADO |
| `http_method` | `varchar(10)` | Não | `null` | Método HTTP da requisição (GET, POST, etc.) | 🟢 CONFIRMADO |
| `request_uri` | `varchar(2048)` | Não | `null` | URI da requisição associada à falha | 🟢 CONFIRMADO |
| `request_payload_sanitized` | `json` | Não | `null` | Payload HTTP recebido com dados mascarados | 🟢 CONFIRMADO |
| `client_ip` | `varchar(45)` | Não | `null` | IP de origem do cliente (IPv4 ou IPv6) | 🟢 CONFIRMADO |
| `user_agent` | `varchar(512)` | Não | `null` | Identificador do agente cliente/navegador | 🟢 CONFIRMADO |
| `resolved_at` | `timestamp` | Não | `null` | Data/hora em que a falha foi resolvida | 🟢 CONFIRMADO |
| `resolved_by_user_id` | `char(36)` | Não (FK) | `null` | Operador/engenheiro que resolveu o incidente | 🟢 CONFIRMADO |
| `created_at` | `timestamp` | Sim | `now()` | Data/hora da ocorrência do erro | 🟢 CONFIRMADO |
| `updated_at` | `timestamp` | Sim | `now()` | Data/hora da última alteração de status | 🟢 CONFIRMADO |

- **Chave Primária:** `id`
- **Índices:** `idx_syserrors_tenant`, `idx_syserrors_trace`, `idx_syserrors_env_sev`, `idx_syserrors_resolved`, `idx_syserrors_created`

---

### 89. Tabela: `core_audit_logs` (Legado: `portal.acesso` / logs implícitos)
Trilha imutável de auditoria de operações, conformidade LGPD e mutações de dados críticos e sensíveis.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `char(36)` | Sim (PK) | UUID | UUID v4 do registro de auditoria | 🟢 CONFIRMADO |
| `tenant_id` | `char(36)` | Sim (FK) | - | Município / órgão gestor da operação | 🟢 CONFIRMADO |
| `user_id` | `char(36)` | Não (FK) | `null` | Usuário responsável pela ação | 🟢 CONFIRMADO |
| `school_id` | `char(36)` | Não (FK) | `null` | Unidade escolar no contexto da operação | 🟢 CONFIRMADO |
| `action` | `enum` | Sim | - | `CREATE`, `UPDATE`, `DELETE`, `LOGIN`, `LOGOUT`, `EXPORT`, `VIEW_SENSITIVE` | 🟢 CONFIRMADO |
| `auditable_type` | `varchar(150)` | Sim | - | Entidade ou modelo auditado (ex: `Student`, `Enrollment`) | 🟢 CONFIRMADO |
| `auditable_id` | `char(36)` | Sim | - | Identificador único do registro auditado | 🟢 CONFIRMADO |
| `old_values` | `json` | Não | `null` | Snapshot dos dados anteriores à mutação | 🟢 CONFIRMADO |
| `new_values` | `json` | Não | `null` | Snapshot dos novos dados persistidos | 🟢 CONFIRMADO |
| `ip_address` | `varchar(45)` | Não | `null` | IP de origem da operação auditada | 🟢 CONFIRMADO |
| `user_agent` | `varchar(512)` | Não | `null` | User-agent do cliente | 🟢 CONFIRMADO |
| `created_at` | `timestamp` | Sim | `now()` | Timestamp da ocorrência do evento de auditoria | 🟢 CONFIRMADO |

- **Chave Primária:** `id`
- **Índices:** `idx_audit_tenant_created`, `idx_audit_user`, `idx_audit_entity` (`auditable_type`, `auditable_id`), `idx_audit_action`

---

### 90. Tabela: `core_navigation_nodes` (Legado: `portal.menu_menu`, `pmieducar.menu_tipo_usuario`, `app/Menu.php`)
Árvore hierárquica de menus, rotas e comandos da aplicação com suporte a Command Palette (`Ctrl + K`) e RBAC.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `char(36)` | Sim (PK) | UUID | UUID v4 do nó de navegação | 🟢 CONFIRMADO |
| `parent_id` | `char(36)` | Não (FK) | `null` | Nó pai para estrutura em árvore multinível | 🟢 CONFIRMADO |
| `code` | `varchar(60)` | Sim | - | Código mnemônico único (ex: `educa.students.enrollments`) | 🟢 CONFIRMADO |
| `title` | `varchar(100)` | Sim | - | Rótulo exibido no menu e breadcrumb | 🟢 CONFIRMADO |
| `route` | `varchar(255)` | Não | `null` | Rota no frontend SPA / URL da funcionalidade | 🟢 CONFIRMADO |
| `icon` | `varchar(50)` | Não | `null` | Identificador do ícone Lucide/Heroicons | 🟢 CONFIRMADO |
| `permission_slug` | `varchar(100)` | Não | `null` | Slug da permissão necessária para visualização | 🟢 CONFIRMADO |
| `order_index` | `int` | Sim | `0` | Posição ordinal no nível hierárquico | 🟢 CONFIRMADO |
| `is_visible` | `tinyint(1)` | Sim | `1` | 1=Exibido no menu lateral; 0=Oculto (apenas via rota/busca) | 🟢 CONFIRMADO |
| `is_command_palette` | `tinyint(1)` | Sim | `1` | 1=Indexado na busca global do Command Palette (`Ctrl+K`) | 🟢 CONFIRMADO |
| `badge_text` | `varchar(20)` | Não | `null` | Rótulo de destaque (ex: `Novo`, `Beta`) | 🟢 CONFIRMADO |
| `created_at` | `timestamp` | Sim | `now()` | Data de criação | 🟢 CONFIRMADO |
| `updated_at` | `timestamp` | Sim | `now()` | Data de atualização | 🟢 CONFIRMADO |

- **Chave Primária:** `id`
- **Índices:** `uk_nav_code` (UNIQUE: `code`), `idx_nav_parent`, `idx_nav_permission`, `idx_nav_order`

---

### 91. Tabela: `core_user_navigation_favorites` (Legado: Sem equivalente no i-Educar)
Atalhos personalizados e telas fixadas na barra superior / favoritos de cada operador no SYSGOV.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `char(36)` | Sim (PK) | UUID | UUID v4 do favorito | 🟢 CONFIRMADO |
| `tenant_id` | `char(36)` | Sim (FK) | - | Município do usuário | 🟢 CONFIRMADO |
| `user_id` | `char(36)` | Sim (FK) | - | Usuário proprietário do atalho | 🟢 CONFIRMADO |
| `navigation_node_id`| `char(36)` | Sim (FK) | - | Item de menu referenciado (`core_navigation_nodes`) | 🟢 CONFIRMADO |
| `order_index` | `int` | Sim | `0` | Posição de ordenação nos favoritos do usuário | 🟢 CONFIRMADO |
| `created_at` | `timestamp` | Sim | `now()` | Data de criação do favorito | 🟢 CONFIRMADO |

- **Chave Primária:** `id`
- **Índices:** `uk_user_nav_node` (UNIQUE: `tenant_id`, `user_id`, `navigation_node_id`), `idx_user_fav_order`

---

### 92. Tabela: `core_notifications` (Legado: `public.notifications`, `messages`)
Fila e repositório de notificações omnichannel para usuários com controle de leitura, prioridade e deep link.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `char(36)` | Sim (PK) | UUID | UUID v4 da notificação | 🟢 CONFIRMADO |
| `tenant_id` | `char(36)` | Sim (FK) | - | Município / órgão emissor | 🟢 CONFIRMADO |
| `recipient_user_id`| `char(36)` | Sim (FK) | - | Usuário destinatário (`core_users`) | 🟢 CONFIRMADO |
| `category` | `enum` | Sim | `'SYSTEM'` | `SYSTEM`, `ACADEMIC`, `ENROLLMENT`, `ALERT`, `SECURITY` | 🟢 CONFIRMADO |
| `priority` | `enum` | Sim | `'NORMAL'` | `LOW`, `NORMAL`, `HIGH`, `URGENT` | 🟢 CONFIRMADO |
| `title` | `varchar(150)` | Sim | - | Título conciso da notificação | 🟢 CONFIRMADO |
| `body` | `text` | Sim | - | Conteúdo ou resumo da notificação | 🟢 CONFIRMADO |
| `action_url` | `varchar(255)` | Não | `null` | URL de destino / deep link para redirecionamento | 🟢 CONFIRMADO |
| `metadata` | `json` | Não | `null` | Dados estruturados de suporte ao evento | 🟢 CONFIRMADO |
| `channel` | `enum` | Sim | `'IN_APP'` | `IN_APP`, `EMAIL`, `SMS`, `PUSH`, `WHATSAPP` | 🟢 CONFIRMADO |
| `read_at` | `timestamp` | Não | `null` | Data e hora em que a notificação foi visualizada | 🟢 CONFIRMADO |
| `sent_at` | `timestamp` | Não | `null` | Data e hora do envio pelo canal externo | 🟢 CONFIRMADO |
| `created_at` | `timestamp` | Sim | `now()` | Data de criação da notificação | 🟢 CONFIRMADO |

- **Chave Primária:** `id`
- **Índices:** `idx_notif_tenant_recipient`, `idx_notif_recipient_unread` (`recipient_user_id`, `read_at`), `idx_notif_created`

---

### 93. Tabela: `core_announcements` (Legado: `announcements`, `school_notices`)
Comunicados, informes e circulares institucionais emitidos pela Secretaria de Educação com bloqueio de tela opcional.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `char(36)` | Sim (PK) | UUID | UUID v4 do comunicado | 🟢 CONFIRMADO |
| `tenant_id` | `char(36)` | Sim (FK) | - | Município do comunicado | 🟢 CONFIRMADO |
| `school_id` | `char(36)` | Não (FK) | `null` | Unidade escolar específica (ou nulo para rede inteira) | 🟢 CONFIRMADO |
| `title` | `varchar(200)` | Sim | - | Título oficial do comunicado | 🟢 CONFIRMADO |
| `content` | `longtext` | Sim | - | Texto rico (Markdown / HTML sanitizado) do informe | 🟢 CONFIRMADO |
| `type` | `enum` | Sim | `'CIRCULAR'` | `CIRCULAR`, `DECREE`, `ALERT`, `MAINTENANCE`, `PEDAGOGIC` | 🟢 CONFIRMADO |
| `priority` | `enum` | Sim | `'NORMAL'` | `NORMAL`, `IMPORTANT`, `MANDATORY` | 🟢 CONFIRMADO |
| `target_audience` | `enum` | Sim | `'ALL'` | `ALL`, `TEACHERS`, `STUDENTS`, `MANAGERS`, `SECRETARIES` | 🟢 CONFIRMADO |
| `requires_ack` | `tinyint(1)` | Sim | `0` | 1=Exige clique de confirmação de ciência no login | 🟢 CONFIRMADO |
| `valid_from` | `datetime` | Sim | - | Início da vigência e publicação do comunicado | 🟢 CONFIRMADO |
| `valid_until` | `datetime` | Não | `null` | Expiração do comunicado | 🟢 CONFIRMADO |
| `is_published` | `tinyint(1)` | Sim | `1` | 1=Publicado; 0=Rascunho | 🟢 CONFIRMADO |
| `author_user_id` | `char(36)` | Sim (FK) | - | Usuário autor da publicação | 🟢 CONFIRMADO |
| `created_at` | `timestamp` | Sim | `now()` | Data de criação | 🟢 CONFIRMADO |
| `updated_at` | `timestamp` | Sim | `now()` | Data de atualização | 🟢 CONFIRMADO |

- **Chave Primária:** `id`
- **Índices:** `idx_ann_tenant_validity`, `idx_ann_school`, `idx_ann_author`, `idx_ann_ack`

---

### 94. Tabela: `core_announcement_reads` (Legado: Sem equivalente no i-Educar)
Registro e auditoria de confirmação de leitura e ciência de comunicados institucionais compulsórios.

| Campo | Tipo | Obrigatório | Padrão | Descrição | Confiança |
|---|---|---|---|---|---|
| `id` | `char(36)` | Sim (PK) | UUID | UUID v4 da leitura / confirmação | 🟢 CONFIRMADO |
| `tenant_id` | `char(36)` | Sim (FK) | - | Município do usuário | 🟢 CONFIRMADO |
| `announcement_id` | `char(36)` | Sim (FK) | - | Comunicado lido (`core_announcements`) | 🟢 CONFIRMADO |
| `user_id` | `char(36)` | Sim (FK) | - | Usuário que leu/confirmou (`core_users`) | 🟢 CONFIRMADO |
| `read_at` | `timestamp` | Sim | `now()` | Momento em que o usuário abriu o comunicado | 🟢 CONFIRMADO |
| `acknowledged_at`| `timestamp` | Não | `null` | Momento em que o usuário clicou no aceite obrigatório | 🟢 CONFIRMADO |
| `ip_address` | `varchar(45)` | Não | `null` | IP utilizado no momento da confirmação | 🟢 CONFIRMADO |

- **Chave Primária:** `id`
- **Índices:** `uk_user_announcement_read` (UNIQUE: `tenant_id`, `announcement_id`, `user_id`), `idx_ann_read_user`
