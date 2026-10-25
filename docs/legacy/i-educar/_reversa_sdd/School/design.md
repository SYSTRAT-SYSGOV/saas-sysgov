# School (i-Educar legado), Design Técnico

> Descreve o **COMO** o módulo de escolas e estrutura pedagógica legado é construído, com base no código lido.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Interface

### Entidades do domínio legado

| Entidade | Chave | Atributos observados | Fonte |
|----------|-------|----------------------|-------|
| Escola | `cod_escola` | instituição, pessoa jurídica, sigla, situação de funcionamento, dependência administrativa, regulamentação, zona, localização diferenciada, esfera administrativa, órgão vinculado, IES, escola sede INEP, código INEP da escola compartilhada, prédio compartilhado, gestor, secretário escolar, cargo do gestor, e-mail do gestor, latitude, longitude, Coordinates geográficas, escola sem funcionários para funções, formas de contratação, poder público em convênio, quantitativos de profissionais, áreas e dependências, arrays de abastecimento, energia, esgoto, lixo, salas, banheiros, laboratórios, dormitórios, atividades, áreas externas, recursos de acessibilidade, equipamentos, uso de internet, rede local, e a lista completa de dependências de infraestrutura | `database/migrations/legacy/2020_01_01_110000_create_pmieducar_escola_table.php` |
| Instituição | `cod_instituicao` | nome, órgão regional, endereço, responsável, telefone, data base de remanejamento, de transferência, de matrícula, de fechamento e de expiração de reserva de vaga, data de corte do Censo Escolar, obrigatoriedade dos campos do Censo, exigência de CPF, matrícula fora do período letivo | `app/Models/LegacyInstitution.php:61-78` |
| Oferta de curso | `ref_cod_escola`, `ref_cod_curso` | ativo, autorização, anos letivos | `app/Models/LegacySchoolCourse.php:16-28` |
| Oferta de série | `ref_cod_escola`, `ref_cod_serie` | ativo, anos letivos, hora inicial, hora final, hora de início e de fim do intervalo, bloquear enturmação sem vagas, bloquear cadastro de turma para série com vagas | `app/Models/LegacySchoolGrade.php:18-33` |
| Ano letivo da escola | `ref_cod_escola`, `ano` | andamento, ativo, turmas por ano, copiar dados de professor, copiar dados de demais servidores, copiar turmas | `app/Models/LegacySchoolAcademicYear.php:19-28` |
| Bloqueio de ano letivo | instituição, ano | data de início, data de fim | `app/Models/LegacySchoolYearLock.php:10-20` |
| Gestor escolar | `employee_id`, `school_id` | cargo, critério de acesso, descrição do critério, tipo de vínculo, gestor principal | `app/Models/SchoolManager.php:12-21` |
| Código INEP da escola | `cod_escola`, `cod_escola_inep` | nome no INEP, fonte | `app/Models/SchoolInep.php:11-20` |
| Espaço da escola | `school_id` | nome, tamanho | `app/Models/SchoolSpace.php:9-14` |
| Aviso da escola | `school_id` | instituição, usuário, título, descrição, data, hora, local, processo 1027 | `app/Models/SchoolNotice.php:12-24` |
| Série e disciplina da escola | escola, série, disciplina | anos letivos, etapas utilizadas | `ieducar/modules/Api/Views/EscolaController.php:647-684` |
| Dados da escola | `cod_escola` | nome, endereço, telefones, CEP | `app/Models/View/SchoolData.php:8-46` |

### Domínio do andamento do ano letivo

| Valor | Constante | Significado |
|-------|-----------|-------------|
| 0 | `NOT_INITIALIZED` | Não inicializado |
| 1 | `IN_PROGRESS` | Em andamento |
| 2 | `FINALIZED` | Finalizado |

Fonte: `app/Models/LegacySchoolAcademicYear.php:13-15`. 🟢

### Endpoints HTTP

| Método | Caminho | Entrada | Saída | Observação |
|--------|---------|---------|-------|------------|
| GET | `/module/Api/Escola?escola` | `id` | Código INEP da escola | 🟢 `ieducar/modules/Api/Views/EscolaController.php:53-63` |
| PUT | `/module/Api/Escola?escola` | `id`, `escola_inep_id` | `{ "id": 123 }` com mensagem de sucesso | 🟢 `EscolaController.php:65-83` |
| GET | `/module/Api/Escola?escola-search` | `tipo`, `valor` | Lista de até 8 escolas | 🟢 `EscolaController.php:106-111` |
| GET | `/module/Api/Escola?escolas-para-selecao` | `instituicao` | `{ "options": {...} }` filtrada por usuário | 🟢 `EscolaController.php:544-572` |
| GET | `/module/Api/Escola?escolas-para-selecao-sem-filtro-por-usuario` | `instituicao` | `{ "options": {...} }` | 🟢 `EscolaController.php:574-584` |
| GET | `/module/Api/Escola?escolas-usuario` | `id` | `{ "escolas": [...] }` | 🟢 `EscolaController.php:529-542` |
| GET | `/module/Api/Escola?escola-ano-letivo` | `escola_id` | Ano letivo em andamento | 🟢 `EscolaController.php:503-513` |
| GET | `/module/Api/Escola?escola-dependencia-administrativa` | `escola_id` | Dependência administrativa | 🟢 `EscolaController.php:515-527` |
| GET | `/module/Api/Escola?parametros-escolas` | `modified` | `{ "escolas": [...] }` | 🟢 `EscolaController.php:598-612` |
| GET | `/module/Api/Escola?endereco-escola` | `escola_id` | País, estado, município e identificadores | 🟢 `EscolaController.php:619-635` |
| GET | `/module/Api/Escola?escola-serie-disciplinas-anos-letivos` | `escola`, `modified` | `{ "escolas": [...] }` com agregação JSON | 🟢 `EscolaController.php:637-696` |
| GET | `/module/Api/Escola?etapas-por-escola` | `instituicao_id` | Etapas do ano por escola | 🟢 `EscolaController.php:116-186` |
| GET | `/module/Api/Escola?etapas-da-escola-por-ano` | `ano`, `instituicao_id` | Etapas por ano | 🟢 `EscolaController.php:220-230` |
| GET | `/module/Api/Escola?info-escolas` | filtros | Escolas com endereço e telefones | 🟢 `EscolaController.php:399-463` |
| GET | `/module/Api/Escola?escolas-multiple-search` | filtros | Busca múltipla de escolas | 🟢 `EscolaController.php:465-501` |
| GET | `/api/schools` | filtros de paginação | Coleção paginada de escolas | Processo 561 🟢 `app/Http/Controllers/Api/SchoolController.php:16-26` |
| GET | `/api/institutions` | filtros de paginação | Coleção paginada de instituições | Processo 753 🟢 `app/Http/Controllers/Api/InstitutionController.php:16-20` |
| GET | `/api/resource/schools` | filtros | Coleção simples de escola | 🟢 `app/Http/Controllers/Api/Resource/School/ResourceSchoolController.php:11-14` |
| GET | `/api/resource/school-academic-years` | filtros | Coleção simples de ano letivo | 🟢 `app/Http/Controllers/Api/Resource/SchoolAcademicYear/ResourceSchoolAcademicYearController.php:11-14` |

### Funções e classes

| Símbolo | Assinatura | Retorno | Observação |
|---------|-----------|---------|------------|
| `LegacySchool::name` | `()` | `string` | Nome da pessoa jurídica, com fallback para a pessoa 🟢 `app/Models/LegacySchool.php:101-106` |
| `LegacySchool::courses` | `()` | `BelongsToMany` | Oferta de cursos, com o pivô de ativo e anos letivos 🟢 `LegacySchool.php:140-148` |
| `LegacySchool::grades` | `()` | `BelongsToMany` | Oferta de séries, com o pivô de travas de vagas 🟢 `LegacySchool.php:169-177` |
| `LegacySchool::addresses` | `()` | `BelongsToMany` | Endereço resolvido pelo vínculo da pessoa jurídica 🟢 `LegacySchool.php:222-231` |
| `LegacySchoolBuilder::whereName` | `(string $name)` | `self` | Busca sem acento sobre a pessoa jurídica 🟢 `app/Models/Builders/LegacySchoolBuilder.php:16-19` |
| `LegacySchoolBuilder::orderByName` | `(string $direction = 'asc')` | `self` | Ordena pela razão social, com junção 🟢 `LegacySchoolBuilder.php:21-24` |
| `LegacySchoolBuilder::getResource` | `(array $filters)` | `Collection` | Lista o recurso excluindo a pessoa jurídica 🟢 `LegacySchoolBuilder.php:10-14` |
| `LegacyInstitution::isMandatoryCensoFields` | `()` | `bool` | Obrigatoriedade dos campos do Censo 🟢 `app/Models/LegacyInstitution.php:136-139` |
| `LegacyInstitution::allowRegistrationOutAcademicYear` | `()` | `bool` | Permissão de matrícula fora do período letivo 🟢 `LegacyInstitution.php:148-153` |
| `LegacyInstitution::getRelocationDate` | `()` | `?string` | Data base de remanejamento formatada 🟢 `LegacyInstitution.php:200-203` |
| `EscolaController::createUpdateOrDestroyEducacensoEscola` | `($escolaId)` | `mixed` | Apaga e recria o código INEP da escola 🟢 `ieducar/modules/Api/Views/EscolaController.php:26-51` |
| `EscolaController::getEscolaAnoLetivo` | `()` | `int` | Ano letivo em andamento da escola 🟢 `EscolaController.php:503-513` |
| `EscolaController::getEscolasSelecao` | `()` | `array` | Lista filtrada por nível de acesso 🟢 `EscolaController.php:544-572` |
| `EscolaController::getParametrosEscolas` | `()` | `array` | Parâmetros com filtro por data de alteração 🟢 `EscolaController.php:598-612` |
| `EscolaController::getEscolaSerieDisciplinasAnosLetivos` | `()` | `array` | Agregação JSON da matriz de séries e disciplinas 🟢 `EscolaController.php:637-696` |
| `EscolaController::_getQtdAlunosFila` | `($escolaId)` | `int` | Contagem da fila de pré-matrícula 🟢 `EscolaController.php:280-300` |
| `EscolaController::_getMaxAlunoTurno` | `($escolaId)` | `int` | Capacidade de matrícula do turno 🟢 `EscolaController.php:344-397` |
| `EscolaController::getSchoolAddress` | `()` | `array\|false` | Endereço pelo vínculo da pessoa jurídica 🟢 `EscolaController.php:619-635` |
| `SchoolManager::isChief` | `()` | `bool` | Indica o gestor principal 🟢 `app/Models/SchoolManager.php:53-56` |

---

## Fluxo Principal

1. A secretaria acessa a rede escolar e a lista de escolas é carregada, ordenada pela razão social da pessoa jurídica. 🟢 `app/Models/Builders/LegacySchoolBuilder.php:21-24`
2. A listagem para seleção é filtrada conforme o nível de acesso do usuário: escolas e biblioteca veem apenas as suas escolas; os demais níveis veem todas as escolas da instituição. 🟢 `ieducar/modules/Api/Views/EscolaController.php:544-572`
3. O ano letivo operacional da escola é resolvido pelo único registro com andamento e atividade ativos. 🟢 `EscolaController.php:503-513`
4. A matriz de oferta é consultada, com os cursos e as séries habilitados, os anos letivos, os horários e as travas de vagas. 🟢 `app/Models/LegacySchool.php:140-177`
5. A lotação é confrontada com a demanda: a capacidade do turno é a soma das lotações das turmas ativas, e a fila é a contagem das matrículas em pré-matrícula. 🟢 `EscolaController.php:280-397`
6. O código INEP da escola é mantido por recreação, para que a identificação oficial seja sempre uma só. 🟢 `EscolaController.php:26-51`

---

## Fluxos Alternativos

- **Busca por nome:** a comparação é feita sobre a forma desaccentuada, com expressão regular sem distinção de maiúsculas. 🟢 `app/Models/Builders/LegacySchoolBuilder.php:16-19`
- **Escola inativa:** a listagem pública exclui as escolas com atividade inativa. 🟢 `LegacySchoolBuilder.php:38-41`
- **Ano letivo inexistente:** a consulta do ano em andamento devolve o primeiro registro do conjunto vazio, sem tratamento de erro. 🟢 `ieducar/modules/Api/Views/EscolaController.php:512`
- **Remoção do código INEP:** a ausência do identificador na requisição apaga o registro, sem gravar nada em seu lugar. 🟢 `EscolaController.php:30-31`
- **Escola sem endereço:** a consulta do endereço devolve falso quando não há vínculo. 🟢 `EscolaController.php:634`
- **Escola sem CNPJ de mantenedora:** o valor gravado é normalizado na atribuição do atributo. 🟢 `app/Models/LegacySchool.php:108-111`
- **Nome da escola:** quando não há pessoa jurídica, o nome é recuperado da pessoa vinculada. 🟢 `LegacySchool.php:104`
- **Filtro incremental de parâmetros:** quando a data é informada, apenas as escolas alteradas a partir dela são devolvidas. 🟢 `EscolaController.php:600-606`
- **Nível de acesso biblioteca:** o usuário de biblioteca também fica restrito às suas escolas. 🟢 `EscolaController.php:550-553`
- **Gravações com autorização dispensada:** a API de recurso de escola e a de instituição dispensam a autorização na indexação. 🟢 `app/Http/Controllers/Api/SchoolController.php:20-24`

---

## Dependências

- **Pessoa jurídica (`cadastro.juridica`):** origem do nome da escola e da razão social usada na ordenação. 🟢 `app/Models/LegacySchoolBuilder.php:26-30`
- **Pessoa (`cadastro.pessoa`):** origem alternativa do nome da escola e do endereço, por vínculo. 🟢 `app/Models/LegacySchool.php:104` e `:222-231`
- **Instituição (`pmieducar.instituicao`):** mantenedora da rede e fonte das datas base e das flags operacionais. 🟢 `app/Models/LegacyInstitution.php:61-78`
- **Turma (`pmieducar.turma`):** origem da lotação usada no cálculo de capacidade. 🟢 `ieducar/modules/Api/Views/EscolaController.php:344-397`
- **Matrícula (`pmieducar.matricula`):** origem da fila de pré-matrícula. 🟢 `EscolaController.php:282-289`
- **Série e disciplina (`pmieducar.escola_serie_disciplina`):** origem da matriz de séries e disciplinas. 🟢 `EscolaController.php:676`
- **Usuário e escola (`pmieducar.escola_usuario`):** origem do filtro de escolas por usuário. 🟢 `app/Models/LegacySchool.php:190-193`
- **Servidor (`pmieducar.servidor`):** origem do vínculo do gestor escolar, por pessoa. 🟢 `app/Models/SchoolManager.php:45-48`
- **Censo Escolar (`src/Modules/Educacenso/`):** consome a caracterização e a infraestrutura da escola nos Registros 00 e 10. 🟢 `src/Modules/Educacenso/Data/Registro00.php:60-124` e `Data/Registro10.php:33-221`
- **Módulo de enturmação (`app/Services/EnrollmentService.php`):** consumidor das travas de vagas e da configuração institucional. 🟢 `EnrollmentService.php:193-223`
- **Módulo de cadastro de pessoa (`ieducar/modules/Api/Views/PessoaController.php`):** consumidor da exigência institucional de CPF. 🟢 `PessoaController.php:545`
- **View de dados da escola (`relatorio.view_dados_escola`):** fonte consolidada de nome, endereço e telefones para relatórios. 🟢 `app/Models/View/SchoolData.php:8-46`
- **Endereços (`addresses` e `person_has_place`):** fonte do endereço da escola. 🟢 `EscolaController.php:624-629`

---

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---------|---------------------|-----------|
| Nome da escola herdado da pessoa jurídica, e não armazenado na escola | `app/Models/LegacySchool.php:101-106` e `LegacySchoolBuilder.php:26-30` | 🟢 |
| Ordenação e busca por nome sobre a pessoa jurídica, com junção obrigatória | `LegacySchoolBuilder.php:16-30` | 🟢 |
| Busca textual com a função de desaccentuação do banco, em expressão regular | `LegacySchoolBuilder.php:17` | 🟢 |
| Oferta curricular modelada como tabela de ligação com pivô de regras, e não como atributo da escola | `app/Models/LegacySchool.php:140-177` | 🟢 |
| Travas de lotação na oferta de série, e não na turma | `app/Models/LegacySchoolGrade.php:26-27` | 🟢 |
| Ano letivo como entidade da escola, com chave composta por escola e ano | `app/Models/LegacySchoolAcademicYear.php:19` e `database/migrations/legacy/2020_01_01_110000_create_pmieducar_escola_ano_letivo_table.php` | 🟢 |
| Três estados de andamento do ano letivo, como constante na classe | `app/Models/LegacySchoolAcademicYear.php:13-15` | 🟢 |
| Configuração da rede concentrada na instituição, e não na escola | `app/Models/LegacyInstitution.php:61-78` | 🟢 |
| Código INEP recreado a cada gravação, em vez de atualizado | `ieducar/modules/Api/Views/EscolaController.php:26-51` | 🟢 |
| Capacidade de matrícula derivada das turmas, e não declarada na escola | `ieducar/modules/Api/Views/EscolaController.php:344-397` | 🟢 |
| Fila de espera medida por matrículas em pré-matrícula, e não por inscription ativa | `EscolaController.php:282-289` | 🟢 |
| Agregação em JSON no banco para a matriz de séries e disciplinas | `EscolaController.php:647-684` | 🟢 |
| Endereço da escola resolvido pelo vínculo da pessoa jurídica | `app/Models/LegacySchool.php:222-231` | 🟢 |
| Lista de seleção com chaves prefixadas por dois sinais de sublinhado e nome em maiúsculas | `EscolaController.php:558` e `:568` | 🟢 |
| Caracterização escolar do Censo Escolar armazenada em colunas da própria escola, em vez de tabela de referência | `database/migrations/legacy/2020_01_01_110000_create_pmieducar_escola_table.php` | 🟢 |

---

## Estado Interno

O módulo é **sem estado próprio**: o estado da rede é distribuído entre a escola, a instituição, a oferta curricular, o ano letivo e o bloqueio de ano. 🟢

Campos de estado observados:

- `situacao_funcionamento` na escola, que define a emissão dos registros no Censo Escolar e a lista de registros auditados. 🟢 `pmieducar.escola:22`
- `dependencia_administrativa` na escola, que decide a anulação dos campos de mantenedora. 🟢 `pmieducar.escola:23`
- `regulamentacao` na escola, que é anulada quando a escola não está em atividade. 🟢 `pmieducar.escola:24`
- `zona_localizacao` e `localizacao_diferenciada` na escola, que alimentam o Registro 00. 🟢 `pmieducar.escola:130` e `:73`
- `utiliza_regra_diferenciada` na escola, que habilita a adaptação curricular. 🟢 `pmieducar.escola:105`
- `bloquear_enturmacao_sem_vagas` na oferta de série, que bloqueia a enturmação. 🟢 `app/Models/LegacySchoolGrade.php:26`
- `bloquear_cadastro_turma_para_serie_com_vagas` na oferta de série, que bloqueia a abertura de turma. 🟢 `LegacySchoolGrade.php:27`
- `andamento` no ano letivo, com três estados. 🟢 `app/Models/LegacySchoolAcademicYear.php:13-15`
- `data_inicio` e `data_fim` no bloqueio de ano letivo, que delimitam a janela bloqueada. 🟢 `app/Models/LegacySchoolYearLock.php:14-15`
- `obrigar_campos_censo` na instituição, que ativa a verificação de conflito de horário. 🟢 `app/Models/LegacyInstitution.php:136-139`
- `obrigar_cpf` na instituição, que torna o CPF obrigatório. 🟢 `ieducar/modules/Api/Views/PessoaController.php:545`
- `permitir_matricula_fora_periodo_letivo` na instituição, que isenta a enturmação da validação de ano. 🟢 `LegacyInstitution.php:148-153`
- `data_base_remanejamento`, `data_base_transferencia`, `data_base_matricula`, `data_fechamento`, `data_expiracao_reserva_vaga` e `data_educacenso` na instituição. 🟢 `LegacyInstitution.php:61-78`
- `chief` no gestor escolar, que indica o gestor principal. 🟢 `app/Models/SchoolManager.php:20`
- `anos_letivos` na oferta de curso e de série, que delimita a vigência da oferta. 🟢 `app/Models/LegacySchoolCourse.php:26` e `LegacySchoolGrade.php:23`

Não há, no legado, capacidade máxima declarada na escola, registro de auditoria de parâmetros, nem vínculo formal entre escola e matrícula. 🔴

---

## Observabilidade

- A gravação da escola informa sucesso ou falha no mensageiro, com mensagem específica em cada caso. 🟢 `ieducar/modules/Api/Views/EscolaController.php:72` e `:75-79`
- A consulta do ano letivo é silenciosa quando não há ano em andamento, o que produz erro na camada de apresentação. 🟢 `EscolaController.php:512`
- A busca de escola devolve no máximo 8 resultados, sinalização explícita de lista curta. 🟢 `EscolaController.php:111`
- A matriz de séries e disciplinas devolve o conjunto agregado por escola, com o identificador da escola em cada item. 🟢 `EscolaController.php:687-695`
- A capacidade e a fila são devolvidas como inteiros, calculados no servidor. 🟢 `EscolaController.php:291` e `:396`
- Não há log estruturado, métrica ou rastreamento distribuído no módulo. 🔴

---

## Riscos e Lacunas

- 🔴 A consulta da matriz de séries e disciplinas interpola a data de alteração e o identificador da escola diretamente no SQL, sem parametrização, e ambos vêm da requisição. 🟢 `ieducar/modules/Api/Views/EscolaController.php:644` e `:682`
- 🔴 A API de recurso de escola e a de instituição dispensam a autorização na indexação, o que expõe a listagem completa de escolas e instituições a qualquer usuário autenticado. 🟢 `app/Http/Controllers/Api/SchoolController.php:20-24` e `InstitutionController.php:20-24`
- 🔴 A tabela da escola tem mais de duzentas colunas, das quais a maioria é array de valores do Censo Escolar, o que torna qualquer alteração do layout do INEP um risco de regressão silenciosa.
- 🔴 A listagem de escolas para seleção depende do nível de acesso calculado por uma classe legada de permissões, e não pela autorização estruturada do SYSGOV. 🟢 `ieducar/modules/Api/Views/EscolaController.php:548`
- 🔴 A capacidade de matrícula depende de turmas ativas com lotação declarada, e o legado soma a lotação em memória após listar todas as turmas do turno, o que não escala para redes grandes. 🟢 `EscolaController.php:344-397`
- 🔴 A consulta do ano letivo em andamento devolve o primeiro elemento de um conjunto possivelmente vazio, sem verificação, o que produz erro do tipo de acesso a índice inexistente. 🟢 `EscolaController.php:512`
- 🟡 A ordenação por nome exige junção com a pessoa jurídica em toda listagem, o que impede o uso de índice sobre a coluna de nome da escola.
- 🟡 O código INEP é apagado e recriado a cada gravação, o que altera a chave primária composta e pode deixar o registro anterior órfão na camada de auditoria.
- 🟡 O nome no INEP é gravado com o literal de traço, sinalizando um campo desativado que o Registro 00 não usa.
- 🟡 A matriz de séries e disciplinas expõe as etapas utilizadas por disciplina, informação que é mantida fora do módulo de escola e não tem regra de validação aqui.
- 🟡 A exigência de CPF e a obrigatoriedade dos campos do Censo estão em colunas da instituição que não aparecem na lista de campos graváveis do modelo, o que limita a leitura programática.
