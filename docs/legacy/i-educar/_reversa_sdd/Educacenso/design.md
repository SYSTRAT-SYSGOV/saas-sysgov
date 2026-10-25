# Educacenso (i-Educar legado), Design Técnico

> Descreve o **COMO** o módulo de exportação do Censo Escolar legado é construído, com base no código lido.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Interface

### Entidades do domínio legado

| Entidade | Chave | Atributos observados | Fonte |
|----------|-------|----------------------|-------|
| Escola (registro 00) | `cod_escola` | nome, código INEP, situação de funcionamento, endereço normalizado, órgão regional, zona, localização diferenciada, dependência administrativa, órgãos vinculados, mantenedora, poder público conveniado, formas de contratação, CNPJ, regulamentação, esfera administrativa, IES | `src/Modules/Educacenso/Data/Registro00.php:60-124` |
| Infraestrutura escolar (registro 10) | `cod_escola` | prédio escolar, forma de ocupação, compartilhamento, água, energia, esgoto, lixo, dependências, acessibilidade, salas, equipamentos, internet, profissionais, instrumentos pedagógicos, língua indígena, exame de seleção, cotas, órgãos colegiados, PPP, ações ambientais | `src/Modules/Educacenso/Data/Registro10.php:33-221` |
| Turma (registro 20) | `cod_turma` | nome, ano, horários, dias da semana, tipo de atendimento, atividades complementares, etapa agregada, etapa do INEP, carga horária, formas de organização, organização curricular, áreas do conhecimento, classe especial, Libras | `src/Modules/Educacenso/Data/Registro20.php:62-137` |
| Pessoa (registro 30) | `idpes` | papel, código INEP, CPF, nome, nascimento, filiação, sexo, raça, povo indígena, nacionalidade, país, município de nascimento, deficiências, transtornos, recursos de prova, NIS, certidão, endereço, escolaridade, formação, pós-graduação, formação continuada, e-mail | `app/Models/Educacenso/Registro30.php:17-216` |
| Gestor (registro 40) | `employee_id` | cargo, critério de acesso, tipo de vínculo, dependência administrativa, situação de funcionamento | `database/sqls/views/public.educacenso_record40.sql:2-14` |
| Alocação docente (registro 50) | `idAlocacao` | docente, turma, função, tipo de vínculo, 25 componentes curriculares, área de itinerário formativo | `ieducar/modules/Api/Views/EducacensoExportController.php:432-451` |
| Matrícula do aluno (registro 60) | `enturmacaoId` | aluno, turma, etapa, carga horária integralizada, 11 tipos de AEE, escolarização em outro espaço, transporte público, poder público responsável, 10 flags de veículo | `ieducar/modules/Api/Views/EducacensoExportController.php:479-513` |
| Código INEP | `cod_*` + `cod_*_inep` | nome no INEP, fonte | `database/migrations/legacy/2020_01_01_110000_create_modules_educacenso_cod_escola_table.php:11-27` |
| Lote de importação | `educacenso_imports.id` | ano, escola, usuário, finalizada, data de entrada das matrículas | `app/Models/EducacensoImport.php:11-41` |

### Catálogos de valores do INEP

`src/Modules/Educacenso/Model/` reúne mais de cem classes de catálogo, cada uma expondo as constantes e o rótulo usado na exportação. Exemplos: `SituacaoFuncionamento`, `DependenciaAdministrativaEscola`, `SchoolManagerRole`, `SchoolManagerAccessCriteria`, `TipoAtendimentoTurma`, `TipoMediacaoDidaticoPedagogico`, `OrganizacaoCurricular`, `EstruturaCurricular`, `EtapaEnsino`, `EtapaAgregada`, `Escolaridade`, `Nacionalidade`, `PaisResidencia`, `Transtornos`, `TipoItinerarioFormativo`. 🟢 `src/Modules/Educacenso/Model/`

### Endpoints HTTP

| Método | Caminho | Entrada | Saída | Status codes |
|--------|---------|---------|-------|--------------|
| GET | `/module/Api/EducacensoAnalise?valida-instituicao` | `instituicao` | `{ "valid": true }` | 200 |
| GET | `/module/Api/EducacensoAnalise?registro-{00,10,20,30,40,50,60,89,90,91}` | `escola`, `ano` | `{ "title", "mensagens[]" }` | 200 |
| GET | `/module/Api/EducacensoAnalise?school-is-active` | `school_id` | `{ "active": true }` | 200 |
| GET | `/module/Api/EducacensoExport?educacenso-export` | `escola`, `ano`, `data_ini`, `data_fim` | `{ "conteudo" }` ou `{ "error", "mensagem" }` | 200 |
| GET | `/educacenso/consulta` | `record`, `ref_cod_escola`, `year` | Página HTML de consulta paginada | 200 |
| GET | `/educacenso/validar/{validator}` | `values[]` ou `value` | `{ "success": true }` ou `{ "success": false, "error" }` | 200, 422 |
| POST | `/intranet/educar_exportacao_educacenso.php` | `exportacao`, `escola` | Arquivo `.txt` em ISO-8859-1 | 200 |
| GET | `/intranet/educar_educacenso_index.php` | — | Página de entrada do módulo | 200 |

### Funções e classes

| Símbolo | Assinatura | Retorno | Observação |
|---------|-----------|---------|------------|
| `EducacensoExportRule::handle` | `(RegistroEducacenso $registro): RegistroEducacenso` | `RegistroEducacenso` | Contrato comum das 17 regras de anulação 🟢 `src/Modules/Educacenso/ExportRule/EducacensoExportRule.php:7-10` |
| `AnalysisInterface::run` / `getMessages` | `()` | `void` / `array` | Contrato comum das 6 análises do registro 30 🟢 `src/Modules/Educacenso/Analysis/AnalysisInterface.php:8-12` |
| `AbstractRegistro::hydrateModel` | `(array $data)` | `RegistroEducacenso` | Copia apenas os campos existentes no modelo 🟢 `src/Modules/Educacenso/Data/AbstractRegistro.php:26-33` |
| `ArrayToCenso::format` | `(array $array, string $glue = '\|')` | `string` | Serializa e apara as pontas 🟢 `src/Modules/Educacenso/ArrayToCenso.php:7-10` |
| `Registro30::getInep` | `()` | `mixed` | Código INEP do aluno ou do servidor, conforme o papel 🟢 `app/Models/Educacenso/Registro30.php:247-254` |
| `Registro30::deficienciaMultipla` | `()` | `int\|null` | Marca deficiência múltipla quando há mais de uma tipo combinável 🟢 `app/Models/Educacenso/Registro30.php:259-280` |
| `Registro30::semDocumentacao` | `()` | `bool` | Verdadeiro quando não há CPF, NIS nem certidão 🟢 `app/Models/Educacenso/Registro30.php:242-245` |
| `Registro30::cursosDeFormacaoSuperiorExtintos` | `()` | `array` | Nove cursos removidos no Censo de 2020 🟢 `app/Models/Educacenso/Registro30.php:285-297` |
| `Formatters::convertStringToCenso` | `(string $string)` | `string` | Maiúsculas, sem acento, apenas letras, números, espaço, hífen e Degree sign 🟢 `src/Modules/Educacenso/Formatters.php:73-92` |
| `Formatters::cpfToCenso` / `cnpjToCenso` | `(string $value)` | `string\|null` | Remove pontuação e devolve nulo para a sequência de zeros 🟢 `src/Modules/Educacenso/Formatters.php:9-21` |
| `addLeadingZero` | `(int $num, int $digitos = 2)` | `string` | Helper global usado para o código de distrito 🟢 `ieducar/intranet/include/funcoes.inc.php:10` |
| `EducacensoExportController::exportaDadosCensoPorEscola` | `(int $escolaId, int $ano, string $data_ini, string $data_fim)` | `string` | Orquestra os oito blocos de registro e decide a supressão por situação 🟢 `ieducar/modules/Api/Views/EducacensoExportController.php:118-147` |
| `EducacensoAnaliseController::Gerar` | `()` | `void` | Roteia a ação pela chave da requisição 🟢 `ieducar/modules/Api/Views/EducacensoAnaliseController.php:2240-2269` |
| `EducacensoRepository::getCommonDataForRecord30` | `(array $arrayPersonId, int $schoolId)` | `array` | SQL dos dados comuns de pessoa, com junções laterais de deficiências 🟢 `app/Repositories/EducacensoRepository.php:404-525` |
| `EducacensoRepository::getEmployeeDataForRecord30` | `(array $arrayEmployeeId)` | `array` | SQL de formação, pós-graduação e formação continuada do servidor 🟢 `app/Repositories/EducacensoRepository.php:527-596` |
| `EducacensoRepository::getStudentDataForRecord30` | `(array $arrayStudentId)` | `array` | SQL de NIS, certidão e recursos de prova do aluno 🟢 `app/Repositories/EducacensoRepository.php:598-634` |

---

## Fluxo Principal

1. A secretaria escolar abre a tela do Educacenso e informa a escola e o ano. 🟢 `ieducar/intranet/educar_exportacao_educacenso.php:64-69`
2. A tela dispara a validação da instituição e, se a data de referência existir, inicia a análise sequencial dos registros. 🟢 `public/vendor/legacy/Educacenso/Assets/Javascripts/Educacenso.js:88-100`
3. Para cada tipo de registro, a análise devolve título e lista de mensagens com texto, caminho do campo e link de correção. 🟢 `public/vendor/legacy/Educacenso/Assets/Javascripts/Educacenso.js:103-124`
4. Se nenhuma mensagem for impeditiva, a tela solicita a exportação e recebe o conteúdo completo do arquivo. 🟢 `public/vendor/legacy/Educacenso/Assets/Javascripts/Educacenso.js:157-161` e `:202-214`
5. O controlador monta os registros na ordem 00, 10, 20, 30, 40, 50, 60 e 99, suprimindo 10, 20, 50 e 60 quando a escola não está em atividade. 🟢 `ieducar/modules/Api/Views/EducacensoExportController.php:129-146`
6. Cada registro é hydrate no modelo, recebe as regras de anulação do seu tipo e é serializado em uma linha delimitada por pipe. 🟢 `ieducar/modules/Api/Views/EducacensoExportController.php:199` e `:372`
7. O arquivo é convertido para ISO-8859-1 e entregue como anexo com o nome `{codigo_inep}_{ddmm_HHii}.txt`. 🟢 `ieducar/intranet/educar_exportacao_educacenso.php:44-53`
8. A secretaria submete o arquivo no portal do INEP e, no retorno, os códigos INEP atribuídos são lançados nas tabelas `modules.educacenso_cod_*`. 🟢 `database/migrations/legacy/2020_01_01_110000_create_modules_educacenso_cod_aluno_table.php:11-20`

---

## Fluxos Alternativos

- **Instituição sem data de referência:** a análise não começa, e a tela exibe o aviso com o caminho do campo na aba de parâmetros da instituição. 🟢 `public/vendor/legacy/Educacenso/Assets/Javascripts/Educacenso.js:92-99` e `:190-200`
- **Escola fora de atividade na análise:** a lista de registros auditados é reduzida a 00, 30 e 40. 🟢 `public/vendor/legacy/Educacenso/Assets/Javascripts/Educacenso.js:12-16` e `:94`
- **Pendência impeditiva na análise:** o download é substituído por um relatório HTML com todas as mensagens e os links de correção. 🟢 `public/vendor/legacy/Educacenso/Assets/Javascripts/Educacenso.js:157-186`
- **Aviso não impeditivo:** a mensagem é exibida no relatório, mas a exportação prossegue; o caso do CPF do aluno em etapas 67 a 74 é o exemplo. 🟢 `src/Modules/Educacenso/Analysis/Register30StudentDataAnalysis.php:37-51`
- **Escola sem código INEP:** a exportação é interrompida com `error = true` e a mensagem que aponta endereço normalizado, código do INEP e dados do gestor. 🟢 `ieducar/modules/Api/Views/EducacensoExportController.php:192-195`
- **Exportação desligada por configuração:** o arquivo é gerado, mas a tela informa que a funcionalidade está suspensa por atualização do layout do INEP. 🟢 `public/vendor/legacy/Educacenso/Assets/Javascripts/Educacenso.js:226-234`
- **Escola extinta ou paralisada na exportação:** os registros de infraestrutura, turmas, alunos e matrículas são omitidos, mas o arquivo continua válido com os registros 00, 30, 40 e 99. 🟢 `ieducar/modules/Api/Views/EducacensoExportController.php:129-146`
- **Turma de turno integral com dois períodos:** a turma é duplicada em uma linha por período, com sufixo no código e no nome e com os horários do período. 🟢 `src/Modules/Educacenso/Data/Registro20.php:185-221`
- **Aluno sem transporte público:** as flags de veículo e o poder público responsável são anulados pela regra de exportação. 🟢 `src/Modules/Educacenso/ExportRule/VeiculoTransporte.php:16-34`
- **Usuário sem permissão de exportação:** a chamada redireciona para a página inicial do sistema. 🟢 `ieducar/modules/Api/Views/EducacensoExportController.php:120-127`

---

## Dependências

- **Cadastro de escola (`pmieducar.escola`):** fonte dos dados de identificação, infraestrutura, mantenedora e caracterização da escola. 🟢 `app/Repositories/EducacensoRepository.php:190-200`
- **Cadastro de instituição (`pmieducar.instituicao`):** fornece a data de referência do Educacenso, usada no corte de matrículas e na análise de nascimentos. 🟢 `database/sqls/views/public.educacenso_record60.sql:70-95` e `src/Modules/Educacenso/Analysis/Register30CommonDataAnalysis.php:64-66`
- **Cadastro de pessoas (`cadastro.pessoa`, `cadastro.fisica`, `cadastro.juridica`):** base dos registros 00, 30 e 40. 🟢 `app/Repositories/EducacensoRepository.php:192-193`
- **Cadastro de servidores (`pmieducar.servidor`):** fonte do registro 30 docente e do registro 40. 🟢 `app/Repositories/EducacensoRepository.php:570-573`
- **Matrícula e enturmação (`pmieducar.matricula`, `pmieducar.matricula_turma`):** fonte do registro 60 e do filtro de servidores. 🟢 `database/sqls/views/public.educacenso_record60.sql:67-95`
- **Turma e curso (`pmieducar.turma`, `pmieducar.curso`):** fonte do registro 20 e de várias regras do registro 60. 🟢 `database/sqls/views/public.educacenso_record20.sql:3-30`
- **Alocação docente (`modules.professor_turma`):** fonte do registro 50 e do filtro de servidores. 🟢 `ieducar/modules/Api/Views/EducacensoExportController.php:156-160`
- **Componente curricular (`modules.componente_curricular`):** origem dos códigos INEP de disciplina exportados nos registros 20 e 50. 🟢 `src/Modules/Educacenso/Data/Registro20.php:109-135`
- **Tabelas de código INEP (`modules.educacenso_cod_escola`, `educacenso_cod_docente`, `educacenso_cod_aluno`, `educacenso_cod_turma`):** identificadores atribuídos pelo INEP. 🟢 `app/Repositories/EducacensoRepository.php:194` e `:573`
- **De/para de etapas (`modules.etapas_curso_educacenso`):** liga curso municipal à etapa do INEP. 🟢 `database/migrations/legacy/2020_01_01_110000_create_modules_etapas_curso_educacenso_table.php:18-24`
- **Catálogos do módulo (`src/Modules/Educacenso/Model/`):** fonte de todos os domínios de valor usados nas regras. 🟢 `src/Modules/Educacenso/ExportRule/`
- **Validadores do módulo (`src/Modules/Educacenso/Validator/`):** reaproveitados pela análise e expostos no cadastro. 🟢 `app/Http/Controllers/Educacenso/ValidatorController.php:10-14`
- **jQuery e `getResourceUrlBuilder`:** base da orquestração do módulo no navegador. 🟢 `public/vendor/legacy/Educacenso/Assets/Javascripts/Educacenso.js:88-124`
- **Permissões legadas (`clsPermissoes`):** controle de acesso ao processo de menu 846. 🟢 `ieducar/intranet/educar_exportacao_educacenso.php:23-31`

---

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---------|---------------------|-----------|
| Serialização posicional por pipe, com `implode` seguido de `trim` | `src/Modules/Educacenso/ArrayToCenso.php:7-10` | 🟢 |
| Construção do arquivo como uma única string em memória, devolvida no corpo JSON | `ieducar/modules/Api/Views/EducacensoExportController.php:101-115` | 🟢 |
| Anulação de campos inaplicáveis feita por classes de regra estáticas, uma por contexto | `src/Modules/Educacenso/ExportRule/EducacensoExportRule.php:7-10` | 🟢 |
| Coleta de dados feita por SQL em visões de banco, com builders do Laravel | `app/Repositories/EducacensoRepository.php:15-54` | 🟢 |
| Visões de banco versionadas por data, com cópia datada no repositório | `database/sqls/views/public.educacenso_record60.sql` e `public.educacenso_record60-2026-06-17.sql` | 🟢 |
| Análise de consistência separada da exportação, com mensagem por inconsistência e link de correção | `ieducar/modules/Api/Views/EducacensoAnaliseController.php:101-110` | 🟢 |
| Regras de consistência separadas por papel da pessoa no registro 30 | `src/Modules/Educacenso/Analysis/` | 🟢 |
| Bloqueio da exportação por mensagem impeditiva, com relatório HTML no lugar do arquivo | `public/vendor/legacy/Educacenso/Assets/Javascripts/Educacenso.js:157-186` | 🟢 |
| Entrega do arquivo em ISO-8859-1, exigência do portal do INEP | `ieducar/intranet/educar_exportacao_educacenso.php:44-46` | 🟢 |
| Normalização de texto livre por filtragem de caracteres aceitos, e não por validação de domínio | `src/Modules/Educacenso/Formatters.php:73-92` | 🟢 |
| Expansão de turma de turno integral em uma linha por período, no momento da exportação | `src/Modules/Educacenso/Data/Registro20.php:185-221` | 🟢 |
| Chave composta (código local, código INEP) nas tabelas de identificação, preservando histórico de fontes | `database/migrations/legacy/2020_01_01_110000_create_modules_educacenso_cod_aluno_table.php:20-22` | 🟢 |
| Suspensão da exportação por chave de configuração, sem alteração de código | `ieducar/intranet/educar_exportacao_educacenso.php:65` e `public/vendor/legacy/Educacenso/Assets/Javascripts/Educacenso.js:47-52` | 🟢 |
| Camadas de regra, análise e validação com contratos próprios, sobre um modelo de registro por tipo | `src/Modules/Educacenso/ExportRule/EducacensoExportRule.php`, `Analysis/AnalysisInterface.php` e `Data/AbstractRegistro.php` | 🟢 |
| Consulta de conferência por paginação de banco, separada do arquivo final | `app/Http/Controllers/EducacensoController.php:55-108` | 🟢 |

---

## Estado Interno

O módulo legado é **sem estado próprio**: o status da exportação vive apenas na sessão do navegador, e nenhum registro em banco descreve os lotes gerados. 🟢 `public/vendor/legacy/Educacenso/Assets/Javascripts/Educacenso.js:132-140`

Campos de estado observados:

- `data_educacenso` da instituição, que é a data de referência e corta a elegibilidade das matrículas. 🟢 `database/migrations/educacenso/2026_05_26_110204_alter_date_educacenso_2026.php:12`
- `situacao_funcionamento` da escola, que decide a supressão dos registros 10, 20, 50 e 60 e a anulação de campos do registro 00. 🟢 `ieducar/modules/Api/Views/EducacensoExportController.php:197`
- `escola_em_andamento`, que decide a lista de registros auditados. 🟢 `public/vendor/legacy/Educacenso/Assets/Javascripts/Educacenso.js:94`
- `falhaAnalise`, flag de sessão no navegador que acumula a ocorrência de mensagem impeditiva. 🟢 `public/vendor/legacy/Educacenso/Assets/Javascripts/Educacenso.js:66`
- `enable_export`, chave de configuração que suspende o download do arquivo. 🟢 `ieducar/intranet/educar_exportacao_educacenso.php:65`
- `finished` da tabela `educacenso_imports`, que indica se uma importação de retorno terminou. 🟢 `app/Models/EducacensoImport.php:16-20`

Não há, no legado, registro de lote de exportação, contagem de linhas por tipo, hash do arquivo, autor da exportação nem data de geração persistida. 🔴

---

## Observabilidade

- A análise emite uma mensagem por inconsistência, com texto descritivo, caminho do campo no cadastro e link direto para a tela de correção. 🟢 `ieducar/modules/Api/Views/EducacensoAnaliseController.php:101-110`
- A severidade é expressa pelo booleano `fail`, que distingue pendência impeditiva de aviso. 🟢 `public/vendor/legacy/Educacenso/Assets/Javascripts/Educacenso.js:183`
- O erro fatal da exportação é devolvido no corpo JSON e apresentado por `alert` ao usuário. 🟢 `public/vendor/legacy/Educacenso/Assets/Javascripts/Educacenso.js:216-221`
- A ausência de código INEP é reportada com a lista dos dados faltantes na mensagem. 🟢 `ieducar/modules/Api/Views/EducacensoExportController.php:193`
- O nome do arquivo gerado carrega o código INEP da escola e o instante da geração, servindo de evidência mínima de rastreio. 🟢 `ieducar/intranet/educar_exportacao_educacenso.php:48`
- Não há log estruturado, métrica, rastreamento distribuído nem notificação de conclusão no legado. 🔴

---

## Riscos e Lacunas

- 🔴 A exportação é inteiramente síncrona e em memória. Em rede com grande volume, o string acumulado e o tempo de resposta podem estourar o limite do servidor web, o que é a causa raiz registrada no ADR-005.
- 🔴 A análise prévia é disparada por requisições HTTP sequenciais, uma por tipo de registro, o que torna a pré-validação lenta exatamente onde a rede é mais frágil.
- 🔴 Não há hash, nem registro de auditoria, nem histórico de lotes. Uma vez baixado, o arquivo não é rastreável.
- 🔴 A ordenação das linhas dentro de cada tipo de registro não é determinística no código de exportação; a consulta de conferência ordena por nome e código, mas a exportação não. 🟡
- 🔴 O Registro 99 é literal `99|`, sem totalizadores. O layout do INEP prevê totalizadores por tipo de registro, e a ausência pode gerar rejeição do arquivo.
- 🔴 A regra `getCensoValueForDiscipline` ignora o vínculo de docente ao decidir a exportação da área do conhecimento, apesar de o repositório expor a consulta de disciplinas sem docente vinculado. 🟢 `src/Modules/Educacenso/Data/Registro20.php:143-150` e `:153-156`
- 🔴 O código INEP é truncado em 8 caracteres sem validação de formato, o que aceita valores não numéricos. 🟢 `src/Modules/Educacenso/Data/Registro00.php:129`
- 🔴 A lista de cursos superiores extintos no Censo de 2020 está fixa no código do modelo e envelhece a cada portaria. 🟢 `app/Models/Educacenso/Registro30.php:285-297`
- 🔴 O modelo novo prevê a importação do arquivo de retorno do INEP com atualização massiva de identificadores, mas no legado existe apenas a tabela `educacenso_imports` e a tela de listagem, sem controller que as use. 🟢 `app/Models/EducacensoImport.php:11-41` e `resources/views/educacenso/import/index.blade.php`
- 🟡 A de/para de etapa do INEP é mantida em `modules.etapas_curso_educacenso`, chaveada por curso, o que não expressa o vínculo por série nem o vínculo por etapa agregada.
- 🟡 A regra de corte da matrícula desempata pela data de enturmação mais antiga do mesmo aluno no ano, o que é correto para a data de referência, mas não está explícito no código do módulo e depende do filtro da visão.
- 🟡 O Registro 10 tem 187 campos, o que torna qualquer alteração no layout do INEP um risco de regressão silenciosa em campo não coberto por teste.
- 🟡 Os catálogos de valor do INEP estão embutidos em classes do código, e não em tabelas de referência consultáveis e versionáveis.
