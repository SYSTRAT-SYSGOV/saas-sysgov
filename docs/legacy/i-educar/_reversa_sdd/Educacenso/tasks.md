# Educacenso (i-Educar legado), Tarefas de Implementação

> Sequência de tarefas executáveis para reimplementar a unit de exportação do Censo Escolar a partir do legado, com rastreabilidade ao código original.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Pré-requisitos

- [ ] Dependências da unit listadas em `design.md` estão disponíveis: escola, instituição, pessoas, servidores, matrícula, enturmação, turma, curso, alocação docente e componente curricular.
- [ ] Schema e migrations do banco compatíveis com as tabelas `educa_censo_*` descritas em `_reversa_sdd/Educacenso/legacy-mapping.md`, com `tenant_id` em todas as entidades.
- [ ] Catálogos de valores do INEP (etapas, disciplinas, tipos de atendimento, cargos, critérios de acesso, tipos de vínculo) carregados em tabelas de referência versionáveis, e não em classes de código.
- [ ] De/para de etapas e de disciplinas do INEP configurado para o tenant, com cobertura verificada sobre cursos, séries e componentes em uso.
- [ ] Data de referência do Censo configurada por tenant e por ano letivo, com a regra da última quarta-feira de maio documentada.
- [ ] Fila assíncrona e armazenamento de objetos configurados, conforme o ADR-005.
- [ ] Contrato do pacote `@sysgov/sdk` definido para lote, pendência, mapeamento e referência INEP.

---

## Tarefas

> Cada tarefa referencia o arquivo do legado de onde o comportamento foi extraído.

- [ ] T-01, Modelar o lote de exportação com tenant, escola, ano letivo, data de referência, tipo de lote, situação, caminho do arquivo e hash de integridade
  - Origem no legado: fluxo de exportação em `ieducar/modules/Api/Views/EducacensoExportController.php:118-147`
  - Critério de pronto: tabela `educa_censo_batches` criada, com `tenant_id`, situação controlada por máquina de estados e teste de transição inválida
  - Confiança: 🟡

- [ ] T-02, Modelar a configuração de infraestrutura escolar do Censo por escola e por ano, com os arrays de abastecimento, energia, esgoto, lixo, dependências, acessibilidade, equipamentos, internet, profissionais e instrumentos
  - Origem no legado: `src/Modules/Educacenso/Data/Registro10.php:33-221`
  - Critério de pronto: tabela `educa_censo_school_configs` criada, com validação de que os arrays de flags são disjuntos e teste de recusa de valores fora do catálogo
  - Confiança: 🟡

- [ ] T-03, Modelar o catálogo de etapas de ensino do INEP e o de/para de cursos e séries da rede municipal
  - Origem no legado: `database/migrations/legacy/2020_01_01_110000_create_modules_etapas_curso_educacenso_table.php:18-24` e `src/Modules/Educacenso/Data/Registro20.php:94`
  - Critério de pronto: tabelas `educa_censo_stages` e `educa_censo_course_stages` criadas, com teste de recusa de de/para duplicado por curso e série
  - Confiança: 🟡

- [ ] T-04, Modelar o catálogo de disciplinas do INEP e o de/para com os componentes curriculares da rede
  - Origem no legado: `src/Modules/Educacenso/Data/Registro20.php:109-135` e `app/Repositories/EducacensoRepository.php:368-388`
  - Critério de pronto: tabela `educa_censo_disciplines` criada, com teste que detecta componente curricular sem mapeamento
  - Confiança: 🟡

- [ ] T-05, Modelar o repositório central de códigos INEP atribuídos pelo órgão federal, por tipo de entidade
  - Origem no legado: `database/migrations/legacy/2020_01_01_110000_create_modules_educacenso_cod_aluno_table.php:11-27`
  - Critério de pronto: tabela `educa_censo_inep_references` criada, com unicidade por tenant, tipo e entidade, e teste de preservação de histórico de fontes
  - Confiança: 🟡

- [ ] T-06, Modelar o log de inconsistências do pré-validador, com severidade, registro afetado, entidade, campo, código de problema e dica de correção
  - Origem no legado: `ieducar/modules/Api/Views/EducacensoAnaliseController.php:101-110`
  - Critério de pronto: tabela `educa_censo_validation_issues` criada, com severidade bloqueante e aviso, e teste de listagem por tenant e por lote
  - Confiança: 🟡

- [ ] T-07, Implementar o motor de regras de exportação com contrato comum e uma classe por contexto de anulação
  - Origem no legado: `src/Modules/Educacenso/ExportRule/EducacensoExportRule.php:7-10` e as 17 classes em `src/Modules/Educacenso/ExportRule/`
  - Critério de pronto: as 17 regras legadas portadas com teste unitário para cada gatilho de anulação e para o caso sem anulação
  - Confiança: 🟢

- [ ] T-08, Implementar a regra do registro 00 que anula mantenedora e CNPJ em escola não privada e a regra que anula o ano letivo em escola fora de atividade
  - Origem no legado: `src/Modules/Educacenso/ExportRule/DependenciaAdministrativa.php:16-33` e `SituacaoFuncionamento.php:16-38`
  - Critério de pronto: escola pública e escola extinta produzem os campos vazios esperados, com teste para cada uma das duas situações
  - Confiança: 🟢

- [ ] T-09, Implementar a regra do registro 60 que anula a carga horária integralizada fora das etapas e das turmas com itinerário técnico e profissional
  - Origem no legado: `src/Modules/Educacenso/ExportRule/CargaHorariaIntegralizada.php:16-36`
  - Critério de pronto: valor nulo fora do contexto e valor zero dentro do contexto, com teste para cada uma das duas etapas de retorno
  - Confiança: 🟢

- [ ] T-10, Implementar a regra do registro 60 que anula a tipologia de veículo e o poder público responsável na ausência de transporte público
  - Origem no legado: `src/Modules/Educacenso/ExportRule/VeiculoTransporte.php:16-34` e `PoderPublicoResponsavelTransporte.php:16-25`
  - Critério de pronto: aluno sem transporte produz os onze campos vazios, com teste de aluno com e sem transporte
  - Confiança: 🟢

- [ ] T-11, Implementar a serialização posicional delimitada por pipe, com apara das pontas e recusa de segmento vazio indevido
  - Origem no legado: `src/Modules/Educacenso/ArrayToCenso.php:7-10`
  - Critério de pronto: a linha gerada tem exatamente o número de campos do tipo de registro, com teste de contagem por tipo
  - Confiança: 🟢

- [ ] T-12, Implementar a montagem do registro 00 com a truncagem do código INEP em 8 dígitos e a normalização do endereço
  - Origem no legado: `src/Modules/Educacenso/Data/Registro00.php:60-146`
  - Critério de pronto: código com mais de oito dígitos é truncado e o endereço é exportado sem acento e sem caractere fora do catálogo
  - Confiança: 🟢

- [ ] T-13, Implementar a montagem do registro 10 com os 187 campos de infraestrutura e as anulações condicionais de sala, equipamento, cota e profissional
  - Origem no legado: `src/Modules/Educacenso/Data/Registro10.php:33-221`
  - Critério de pronto: campo condicional vazio quando a precondição não é satisfeita, com teste para o agrupamento de dependências, equipamentos, cotas e profissionais
  - Confiança: 🟢

- [ ] T-14, Implementar a montagem do registro 20 com a exportação das áreas do conhecimento por presença da disciplina
  - Origem no legado: `src/Modules/Educacenso/Data/Registro20.php:64` e `:143-150`
  - Critério de pronto: área oferecida vale 1 e área não oferecida vale 0, com teste para turma curricular de etapa 1, que não deve exportar áreas
  - Confiança: 🟢

- [ ] T-15, Implementar a expansão de turma de turno integral em uma linha por período atendido
  - Origem no legado: `src/Modules/Educacenso/Data/Registro20.php:185-221`
  - Critério de pronto: turma com estudantes em dois períodos gera duas linhas com código, nome e horários distintos, e turma sem estudantes em período gera uma linha
  - Confiança: 🟢

- [ ] T-16, Implementar a composição do registro 30 por papel da pessoa, com a identificação INEP correspondente e a anulação dos campos inaplicáveis
  - Origem no legado: `ieducar/modules/Api/Views/EducacensoExportController.php:259-370` e `src/Modules/Educacenso/ExportRule/RegrasEspecificasRegistro30.php:16-97`
  - Critério de pronto: gestor, docente e aluno geram linhas com o conjunto correto de campos, com teste para cada papel
  - Confiança: 🟢

- [ ] T-17, Implementar as regras geral e específica do registro 30, com anulação por nacionalidade, deficiência, transtorno, país de residência e escolaridade
  - Origem no legado: `src/Modules/Educacenso/ExportRule/RegrasGeraisRegistro30.php:16-118` e `RegrasEspecificasRegistro30.php:16-97`
  - Critério de pronto: as dezoito anulações de cada regra têm teste unitário individual
  - Confiança: 🟢

- [ ] T-18, Implementar as seis análises de consistência do registro 30, com mensagem impeditiva e mensagem de aviso
  - Origem no legado: `src/Modules/Educacenso/Analysis/`
  - Critério de pronto: as seis classes reproduzem as mensagens legadas, com teste para a distinção entre `fail` verdadeiro e falso
  - Confiança: 🟢

- [ ] T-19, Implementar a validação de CPF obrigatório para gestor e docente, com exceção para pessoa estrangeira, e o aviso de CPF para aluno nas etapas 67 a 74
  - Origem no legado: `src/Modules/Educacenso/Analysis/Register30ManagerDataAnalysis.php:26-37`, `Register30TeacherDataAnalysis.php:26-37` e `Register30StudentDataAnalysis.php:37-51`
  - Critério de pronto: docente sem CPF bloqueia a exportação e aluno de etapa 72 sem CPF gera apenas aviso
  - Confiança: 🟢

- [ ] T-20, Implementar a validação da certidão de nascimento no formato novo, com 32 dígitos e coerência do ano de registro
  - Origem no legado: `src/Modules/Educacenso/Analysis/Register30StudentDataAnalysis.php:109-147`
  - Critério de pronto: certidão com tamanho errado e certidão com ano incoerente geram mensagem impeditiva
  - Confiança: 🟢

- [ ] T-21, Implementar a validação de formação do docente e do gestor, com escolaridade, tipo de ensino médio, pós-graduação, formação continuada e curso superior
  - Origem no legado: `src/Modules/Educacenso/Analysis/Register30TeacherAndManagerDataAnalysis.php:26-167`
  - Critério de pronto: ano de conclusão fora do intervalo de 1940 até o ano corrente é recusado, e curso extinto no Censo de 2020 é recusado
  - Confiança: 🟢

- [ ] T-22, Implementar a validação de consistência entre a lista de áreas do conhecimento oferecidas e a lista de disciplinas sem docente vinculado
  - Origem no legado: `src/Modules/Educacenso/Data/Registro20.php:143-150` e `:153-156`
  - Critério de pronto: disciplina oferecida sem docente vinculado gera pendência na pré-validação, e o valor exportado continua sendo a presença da disciplina
  - Confiança: 🟡

- [ ] T-23, Implementar a montagem do registro 40 com cargo, critério de acesso e tipo de vínculo do gestor
  - Origem no legado: `ieducar/modules/Api/Views/EducacensoExportController.php:395-403` e `src/Modules/Educacenso/ExportRule/CargoGestor.php:16-25`
  - Critério de pronto: cargo "outro" e escola fora de atividade anulam o campo esperado, com teste para cada caso
  - Confiança: 🟢

- [ ] T-24, Implementar a montagem do registro 50 com a alocação docente, os 25 campos de componente curricular e as flags de itinerário formativo
  - Origem no legado: `ieducar/modules/Api/Views/EducacensoExportController.php:432-451`
  - Critério de pronto: a linha tem 38 campos e os componentes só são preenchidos para docente em turma curricular
  - Confiança: 🟢

- [ ] T-25, Implementar a montagem do registro 60 com matrícula, AEE, escolarização em outro espaço e transporte escolar
  - Origem no legado: `ieducar/modules/Api/Views/EducacensoExportController.php:479-513`
  - Critério de pronto: a linha tem 33 campos e o corte de matrícula pela data de referência da instituição é respeitado
  - Confiança: 🟢

- [ ] T-26, Implementar o filtro de servidores elegíveis ao registro 30, por alocação ativa, ano, admissão e matrícula ativa no período
  - Origem no legado: `ieducar/modules/Api/Views/EducacensoExportController.php:154-183`
  - Critério de pronto: servidor admitido depois do fim do período é excluído, e servidor sem matrícula ativa no período é excluído
  - Confiança: 🟢

- [ ] T-27, Implementar a supressão dos registros 10, 20, 50 e 60 quando a escola não está em atividade
  - Origem no legado: `ieducar/modules/Api/Views/EducacensoExportController.php:129-146` e `:197`
  - Critério de pronto: escola extinta produz arquivo com quatro tipos de registro e sem os suprimidos
  - Confiança: 🟢

- [ ] T-28, Implementar a emissão do registro 99 com os totalizadores por tipo de registro
  - Origem no legado: `ieducar/modules/Api/Views/EducacensoExportController.php:539-542`, que emite apenas `99|`
  - Critério de pronto: o registro 99 traz a contagem de linhas de cada tipo, com teste de conferência entre o totalizador e as linhas emitidas
  - Confiança: 🟡

- [ ] T-29, Implementar a ordenação determinística das linhas dentro de cada tipo de registro, com desempate por identificador
  - Origem no legado: ausência de ordenação na exportação, evidenciada por `ieducar/modules/Api/Views/EducacensoExportController.php:129-146`
  - Critério de pronto: duas execuções sobre a mesma base produzem arquivos byte a byte idênticos
  - Confiança: 🟡

- [ ] T-30, Implementar a geração assíncrona do arquivo, com streaming, compactação, hash SHA-256 e notificação de conclusão
  - Origem no legado: ausência de fila no legado, evidenciada por `ieducar/modules/Api/Views/EducacensoExportController.php:101-115`
  - Critério de pronto: o job processa em chunks, o arquivo compactado é gravado no storage com hash conferido no download
  - Confiança: 🟡

- [ ] T-31, Implementar o motor de regras versionado por ano do Censo, com a regra de 2026 derivada do layout vigente
  - Origem no legado: `src/Modules/Educacenso/Migrations/UpdateEducacensoInstitutionToLayout2020.php` e `UpdateSchoolClassToLayout2020.php`
  - Critério de pronto: a versão do conjunto de regras é gravada no lote e a validação usa a versão do ano correspondente
  - Confiança: 🟡

- [ ] T-32, Implementar a API do módulo de Censo com criação de lote, validação, listagem de pendências, geração, download e importação de retorno
  - Origem no legado: `ieducar/modules/Api/Views/EducacensoExportController.php:544-551` e `app/Http/Controllers/EducacensoController.php:41-118`
  - Critério de pronto: contrato OpenAPI gerado, com paginação e filtro por tenant em todas as listagens
  - Confiança: 🟡

- [ ] T-33, Implementar a importação do arquivo de retorno do INEP, com atualização dos códigos INEP de escola, docente, aluno e turma
  - Origem no legado: `app/Models/EducacensoImport.php:11-41` e `resources/views/educacenso/import/index.blade.php`, sem controller que os use
  - Critério de pronto: o retorno vincula o código INEP à entidade correspondente e o lote passa para a situação de retorno importado
  - Confiança: 🟡

- [ ] T-34, Implementar a trilha de auditoria de lote, com ator, instante, situação transicionada e hash do arquivo gerado
  - Origem no legado: ausência de auditoria no legado, evidenciada por `ieducar/intranet/educar_exportacao_educacenso.php:23-31`
  - Critério de pronto: todo lote gerado tem registro de auditoria consultável por tenant e por usuário
  - Confiança: 🟡

- [ ] T-35, Implementar o painel de pendências com separação entre bloqueadores e avisos e vínculo direto para a tela de correção
  - Origem no legado: `public/vendor/legacy/Educacenso/Assets/Javascripts/Educacenso.js:164-188`
  - Critério de pronto: a pendência exibe o caminho do campo e abre a tela de cadastro correspondente, com teste da construção do vínculo
  - Confiança: 🟢

- [ ] T-36, Implementar a consulta de conferência dos registros produzidos, paginada e ordenada
  - Origem no legado: `app/Http/Controllers/EducacensoController.php:55-108`
  - Critério de pronto: a listagem de turmas, gestores, docentes e alunos é paginada e ordenada por nome e por código
  - Confiança: 🟢

- [ ] T-37, Implementar o contrato TypeScript da unit no pacote `@sysgov/sdk`
  - Origem no legado: `ieducar/modules/Api/Views/EducacensoAnaliseController.php:101-110` e `app/Http/Controllers/Educacenso/ValidatorController.php:16-29`
  - Critério de pronto: tipos `CensoBatch`, `CensoValidationIssue`, `CensoStageMapping` e `CensoDisciplineMapping` publicados e consumidos por um cliente de teste
  - Confiança: 🟡

- [ ] T-38, Implementar a exposição dos validadores pontuais de nome, data de nascimento e certidão de nascimento no formulário de cadastro
  - Origem no legado: `app/Http/Controllers/Educacenso/ValidatorController.php:10-29`
  - Critério de pronto: o formulário valida no evento de perda de foco e exibe a mensagem do validador, com teste de resposta de sucesso e de erro
  - Confiança: 🟢

---

## Tarefas de Teste

- [ ] TT-01, Teste do happy path do fluxo principal de exportação (ver `requirements.md`, Critérios de Aceitação)
- [ ] TT-02, Teste do caso de erro principal: instituição sem data de referência impede a exportação
- [ ] TT-03, Teste da supressão dos registros 10, 20, 50 e 60 em escola fora de atividade
- [ ] TT-04, Teste da contagem de campos de cada tipo de registro na linha serializada
- [ ] TT-05, Teste de idempotência: duas execuções sobre a mesma base produzem o mesmo arquivo
- [ ] TT-06, Teste da expansão de turma de turno integral em uma linha por período
- [ ] TT-07, Teste da anulação dos campos de mantenedora em escola pública
- [ ] TT-08, Teste da anulação da tipologia de veículo e do poder público responsável em aluno sem transporte
- [ ] TT-09, Teste da anulação dos campos de formação em aluno e dos campos de endereço em gestor que não é docente
- [ ] TT-10, Teste da distinção entre pendência impeditiva e aviso no pré-validador
- [ ] TT-11, Teste da validação de CPF de docente, de gestor e de aluno por etapa
- [ ] TT-12, Teste da validação de certidão de nascimento com 32 dígitos e com ano de registro incoerente
- [ ] TT-13, Teste da validação de curso superior extinto e de ano de conclusão fora do intervalo
- [ ] TT-14, Teste do filtro de servidores por admissão e por matrícula ativa no período
- [ ] TT-15, Teste de isolamento por tenant em todas as listagens, lotes e pendências
- [ ] TT-16, Teste do totalizador do registro 99 contra a contagem real de linhas emitidas
- [ ] TT-17, Teste da deduplicação do de/para de etapa e de disciplina, com detecção de componente sem mapeamento
- [ ] TT-18, Teste da atualização dos códigos INEP a partir do arquivo de retorno

---

## Tarefas de Migração de Dados (se aplicável)

- [ ] TM-01, Migrar os códigos INEP de escola, docente, aluno e turma de `modules.educacenso_cod_*` para `educa_censo_inep_references`, preservando o nome e a fonte de cada código
- [ ] TM-02, Migrar o de/para de etapas de `modules.etapas_curso_educacenso` para `educa_censo_course_stages`, preservando o vínculo por curso
- [ ] TM-03, Migrar a configuração de infraestrutura escolar de `pmieducar.escola` para `educa_censo_school_configs`, convertendo os arrays PostgreSQL em listas do catálogo
- [ ] TM-04, Migrar a data de referência do Educacenso de `pmieducar.instituicao.data_educacenso` para a configuração por tenant e por ano
- [ ] TM-05, Migrar os cursos superiores e as instituições de ensino superior de `modules.educacenso_curso_superior` e `modules.educacenso_ies` para o catálogo de cursos do INEP
- [ ] TM-06, Migrar os registros de `educacenso_imports` para o histórico de lotes do modelo novo, marcando os registros não finalizados
- [ ] TM-07, Gerar o relatório de divergências da carga, com o total de registros marcados por tipo de inconsistência
- [ ] TM-08, Reexportar o Censo do ano corrente no modelo novo e comparar linha a linha com o arquivo gerado pelo legado, marcando as diferenças

---

## Ordem Sugerida

1. T-01, T-11, T-29 e T-28 primeiro, porque definem a unidade de lote e a forma do arquivo, e qualquer erro de formato rejeita o arquivo no INEP.
2. T-07, T-08, T-09 e T-10 em seguida, porque são as regras de anulação que determinam o conteúdo de cada linha.
3. T-12, T-13, T-14, T-15, T-23, T-24, T-25 e T-26 depois das regras, porque são a montagem de cada tipo de registro sobre as regras já aplicadas.
4. T-16 e T-17 junto com T-18 a T-21, porque o registro 30 concentra a maior parte das regras de consistência e de anulação.
5. T-02, T-03, T-04 e T-05 antes de T-32, porque os mapeamentos e a infraestrutura são insumo dos registros e dos catálogos.
6. T-30, T-32, T-33, T-34, T-35, T-36, T-37 e T-38 por último, porque expõem o que já está validado.
7. T-22 logo após T-14, porque a divergência entre área oferecida e docente vinculado é a pendência de maior impacto pedagógico do lote.
8. TM-01 a TM-08 somente depois de T-32 estar em ambiente de homologação, para que a carga possa ser conferida pela API nova.
9. Bloqueios: T-12 depende de T-05; T-14 e T-22 dependem de T-04; T-16 depende de T-05; T-18 a T-21 não dependem de T-05; T-24 depende de T-04; T-33 depende de T-05; T-30 depende de T-28 e T-29.

---

## Lacunas Pendentes (🔴)

- O layout do INEP muda por portaria anual e o legado implementa a versão de 2020 com classes de migração. É preciso definir o calendário de atualização do motor de regras por ano e o processo de homologação com o portal.
- O Registro 99 do legado é literal `99|` e não traz totalizadores, ao contrário do layout do INEP. É preciso confirmar com o INEP se a ausência de totalizadores é aceita e, em caso negativo, em qual versão do layout ela passa a ser exigida.
- A ordenação das linhas dentro de cada tipo de registro não é determinística no legado. A regra de desempate a adotar precisa ser alinhada com a ordem de leitura esperada pelo INEP, que não está documentada no repositório.
- A lista de cursos superiores extintos está fixa no código do modelo legado e vale para o Censo de 2020. É preciso decidir entre tabela versionada e atualização por portaria.
- A exportação do ano corrente está suspensa por configuração, por ajuste do layout de 2026. É preciso confirmar a data de liberação e se o formato gerado no legado é aceito pelo INEP.
- Não há no legado um totalizador por tipo de registro nem a conferência entre o total e o conteúdo, o que impede detectar arquivo truncado antes do envio.
- A auditoria de geração, o autor e o histórico de lotes não existem no legado. A definição do que é retido e por quanto tempo é decisão de produto e de conformidade.
- A tabela `educacenso_imports` e a tela de importações existem sem controller que as use. É preciso confirmar se a importação de retorno do INEP foi entregue em outro repositório ou se nunca foi implementada.
- A área do conhecimento exportada no registro 20 ignora o vínculo de docente, enquanto o repositório expõe a consulta de disciplinas sem docente vinculado. É preciso decidir se a divergência vira pendência bloqueante, aviso ou se permanece fora do lote.
