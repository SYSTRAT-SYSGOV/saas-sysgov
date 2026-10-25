# Fluxos — Servidores (i-Educar legado)

> Fluxos operacionais e transacionais do módulo de Servidores e Corpo Docente.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

### Fluxo 1 — Cadastro Inicial do Servidor na Rede Municipal
- **Gatilho:** Gestor municipal cadastra a admissão de um novo servidor na Secretaria de Educação.
- **Passos:**
  1. O usuário acessa `ieducar/intranet/educar_servidor_cad.php` informando o `idpes` de pessoa física pré-existente. 🟢 `educar_servidor_cad.php:77-80`
  2. O sistema verifica as permissões de cadastro para o processo `635` em nível institucional. 🟢 `educar_servidor_cad.php:86-91`
  3. O usuário preenche a carga horária global contratada, nível de escolaridade (`ref_idesco`) e dados de formação continuada. 🟢 `educar_servidor_cad.php:97-109`
  4. O usuário adiciona uma ou mais funções (`ref_cod_funcao`) e suas respectivas matrículas funcionais (`matricula[]`). 🟢 `educar_servidor_cad.php:57-60`
  5. O sistema grava o registro mestre em `pmieducar.servidor` e as funções em `pmieducar.servidor_funcao`. 🟢
  6. É disparado o evento `EmployeeCreated`. 🟢 `educar_servidor_cad.php:3`

---

### Fluxo 2 — Alocação de Horário Semanal do Professor na Escola
- **Gatilho:** Diretor ou secretário escolar aloca os períodos semanais de aula de um professor na unidade.
- **Passos:**
  1. O usuário abre `ieducar/intranet/educar_servidor_alocacao_cad.php` passando `ref_cod_servidor` e `ref_cod_escola`. 🟢 `educar_servidor_alocacao_cad.php:68-71`
  2. O formulário carrega os períodos da escola e calcula a carga horária semanal já comprometida pelo servidor no ano letivo. 🟢 `educar_servidor_cad.php:133-146`
  3. O usuário seleciona o vínculo (`ref_cod_funcionario_vinculo`), função, dia da semana, hora inicial e hora final. 🟢 `educar_servidor_alocacao_cad.php:81-93`
  4. O usuário discrimina as horas em sala de aula, horas de planejamento (`hora_atividade`) e horas extras (`horas_excedentes`). 🟢 `educar_servidor_alocacao_cad.php:42-46`
  5. O sistema verifica se a nova alocação respeita o teto contratual e a proporção da Lei do Piso Nacional. 🟢
  6. O registro é persistido em `pmieducar.servidor_alocacao` com `ativo = 1`. 🟢

---

### Fluxo 3 — Atribuição de Componentes Curriculares Habilitados
- **Gatilho:** Coordenador pedagógico registra as disciplinas que o docente tem habilitação legal para lecionar.
- **Passos:**
  1. O usuário navega para a tela de habilitações do servidor.
  2. O sistema consulta as disciplinas cadastradas na matriz curricular da instituição. 🟢 `Employee.php:178-184`
  3. O usuário marca as disciplinas autorizadas para o curso e função do docente. 🟢 `educar_servidor_det.php:392`
  4. O sistema insere os registros na tabela associativa `pmieducar.servidor_disciplina`. 🟢 `educar_pesquisa_servidor_lst.php:499-518`
  5. A lista de disciplinas habilitadas passa a ser exibida no detalhamento do servidor e no filtro de turmas. 🟢

---

### Fluxo 4 — Concessão de Afastamento ou Licença Temporária
- **Gatilho:** Servidor apresenta laudo para licença médica ou requer licença-prêmio.
- **Passos:**
  1. O operador da Secretaria acessa o formulário de afastamentos do servidor.
  2. O operador seleciona o motivo catalogado (`ref_cod_motivo_afastamento`), data de início (`data_saida`) e previsão de retorno (`data_retorno`). 🟢 `EmployeeWithdrawal.php:25-32`
  3. O model `EmployeeWithdrawal` intercepta a gravação no evento `creating` e calcula o sequencial via `MAX(sequencial) + 1`. 🟢 `EmployeeWithdrawal.php:62-64`
  4. O registro é salvo em `pmieducar.servidor_afastamento`. 🟢
  5. As alocações ativas do docente são sinalizadas como afastadas durante o intervalo de vigência. 🟡

---

### Fluxo 5 — Registro de Falta ou Atraso com Atestado
- **Gatilho:** Unidade escolar registra a ausência ou atraso do servidor no expediente.
- **Passos:**
  1. O secretário escolar acessa `ieducar/intranet/educar_falta_atraso_cad.php`. 🟢 `educar_falta_atraso_cad.php:47-51`
  2. O sistema valida a permissão no processo `635`. 🟢 `educar_falta_atraso_cad.php:53-58`
  3. O usuário informa o tipo de ocorrência (falta ou atraso), data, quantidade de horas/minutos e se a falta é justificada. 🟢 `educar_falta_atraso_cad.php:25-34`
  4. Caso haja atestado médico ou documento comprobatório, é feito o upload via `FileService`. 🟢 `educar_falta_atraso_cad.php:5-6`
  5. Os dados são persistidos em `pmieducar.falta_atraso`. 🟢

---

### Fluxo 6 — Consulta Rápida de Docente para Alocação em Diário
- **Gatilho:** Módulo de Diário de Classe ou Quadro de Horários solicita a lista de professores da escola.
- **Passos:**
  1. O frontend efetua chamada AJAX para `GET /module/Api/servidores-disciplinas-turmas`. 🟢 `ServidorController.php:118-125`
  2. O controller valida a presença obrigatória de `instituicao_id`, `ano` e `escola`. 🟢 `ServidorController.php:23-29`
  3. O controller executa query com joins em `modules.professor_turma`, `pmieducar.turma` e `modules.componente_curricular_ano_escolar`. 🟢 `ServidorController.php:147-193`
  4. Agrega disciplinas via `string_agg` e serializa em array JSON estruturado com IDs e séries. 🟢 `ServidorController.php:226-255`
  5. Retorna o conjunto estruturado de vínculos docentes ativos para montagem da tela. 🟢

---

### Fluxo 7 — Atualização e Cadastro de Formação para o Educacenso
- **Gatilho:** Período de preenchimento dos dados do Censo Escolar anual pelo município.
- **Passos:**
  1. O usuário edita a ficha do servidor em `educar_servidor_cad.php`. 🟢 `educar_servidor_cad.php:92-100`
  2. Informa código INEP do docente (`modules.educacenso_cod_docente`). 🟢 `educar_servidor_cad.php:63`
  3. Cadastra os cursos superiores de licenciatura/graduação cursados via `EmployeeGraduationService`. 🟢 `educar_servidor_cad.php:14-22`
  4. Cadastra pós-graduações e especializações via `EmployeePosgraduateService`. 🟢 `educar_servidor_cad.php:15-20`
  5. Os dados são normalizados e integrados para posterior exportação no registro 30/40 do Educacenso. 🟢

---

### Fluxo 8 — Encerramento de Alocação por Transferência Escolar
- **Gatilho:** Servidor é remanejado de uma escola municipal para outra dentro da rede.
- **Passos:**
  1. O gestor abre a alocação existente na escola de origem.
  2. Informa a `data_saida` no registro de `pmieducar.servidor_alocacao` e marca `ativo = 0`. 🟢 `EmployeeAllocation.php:47-48`
  3. O sistema recalcula o saldo de horas disponíveis do servidor no ano letivo. 🟢 `educar_servidor_cad.php:133-146`
  4. O gestor cadastra uma nova alocação na escola de destino vinculando a nova carga horária. 🟢

---

### Fluxo 9 — Bloqueio de Exclusão de Vínculo Funcional com Dependência
- **Gatilho:** Administrador tenta excluir um tipo de vínculo funcional que ainda possui alocações vinculadas.
- **Passos:**
  1. O usuário submete formulário em `ieducar/intranet/funcionario_vinculo_cad.php`.
  2. O sistema executa query: `SELECT COUNT(*) FROM pmieducar.servidor_alocacao WHERE ref_cod_funcionario_vinculo = $cod_vinculo`. 🟢 `funcionario_vinculo_cad.php:90`
  3. Identificando dependências ativas (`count > 0`), a transação é abortada com mensagem de erro impeditiva. 🟢
  4. A integridade do histórico funcional das alocações é preservada. 🟢

---

## Fluxos Ausentes no Legado (🔴)

- 🔴 **Substituição Docente com Trilha de Auditoria:** O legado não possui fluxo formal para designar professor substituto com registro de período fechado e espelhamento automático das permissões de lançamento no diário de classe.
- 🔴 **Validação Automática de Choque de Horários Entre Escolas:** O sistema valida a carga horária total, mas não valida se o mesmo servidor foi alocado no mesmo dia da semana e mesmo horário (`hora_inicial` a `hora_final`) em duas escolas geograficamente distintas.
- 🔴 **Homologação e Validação de Licença Médica:** Ausência de fluxo de perícia médica municipal integrada para deferimento ou indeferimento formal de afastamentos por laudo.
