# School (i-Educar legado), Tarefas de Implementação

> Sequência de tarefas executáveis para reimplementar a unit de escolas e estrutura pedagógica a partir do legado, com rastreabilidade ao código original.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Pré-requisitos

- [ ] Dependências da unit listadas em `design.md` estão disponíveis: pessoa jurídica, pessoa, instituição, turma, matrícula, série e disciplina, usuário e escola, servidor, módulo do Censo Escolar e módulo de enturmação.
- [ ] Schema e migrations do banco compatíveis com as tabelas `educa_schools`, `educa_courses`, `educa_grades`, `educa_school_courses` e `educa_school_grades` descritas em `_reversa_sdd/School/legacy-mapping.md`, com `tenant_id` em todas as entidades.
- [ ] Vínculo da escola com a unidade organizacional corporativa resolvido, conforme o padrão `OrgUnit` do SYSGOV.
- [ ] Catálogos de situação de funcionamento, de dependência administrativa, de zona, de localização diferenciada, de esfera administrativa, de cargo de gestor, de critério de acesso e de tipo de vínculo carregados em tabelas de referência.
- [ ] Catálogos do Censo Escolar para infraestrutura, equipamentos, profissionais, abastecimento, energia, esgoto, lixo, salas, banheiros, laboratórios, dormitórios, atividades, áreas externas, recursos de acessibilidade, equipamentos e uso de internet carregados.
- [ ] Configuração institucional migrada, com as datas base e as flags operacionais, conforme a unit de Configuração.

---

## Tarefas

> Cada tarefa referencia o arquivo do legado de onde o comportamento foi extraído.

- [ ] T-01, Modelar a escola com tenant, unidade organizacional, instituição, pessoa jurídica, sigla, nome, situação de funcionamento e dependência administrativa
  - Origem no legado: `app/Models/LegacySchool.php:38-92` e `database/migrations/legacy/2020_01_01_110000_create_pmieducar_escola_table.php`
  - Critério de pronto: tabela `educa_schools` criada, com situação e dependência restringidas ao catálogo, e teste de recusa de valor fora do domínio
  - Confiança: 🟡

- [ ] T-02, Modelar a caracterização escolar do Censo Escolar, com mantenedora, categoria de escola privada, conveniação, CNPJ, regulamentação, esfera administrativa, órgão vinculado, IES e escola sede
  - Origem no legado: `database/migrations/legacy/2020_01_01_110000_create_pmieducar_escola_table.php:50-140`
  - Critério de pronto: a caracterização é gravada em estrutura própria, e não em colunas da escola, com teste de ida e volta de todos os campos
  - Confiança: 🟡

- [ ] T-03, Modelar a infraestrutura escolar, com dependências, áreas, salas, laboratórios, banheiros, dormitórios, recursos de acessibilidade e áreas externas
  - Origem no legado: `database/migrations/legacy/2020_01_01_110000_create_pmieducar_escola_table.php:30-60` e `:120-150`
  - Critério de pronto: os arrays do legado são convertidos em listas com referência a catálogo, e o Registro 10 é preenchido a partir delas
  - Confiança: 🟡

- [ ] T-04, Modelar os equipamentos, o uso de internet, a rede local e as quantidades de computadores da escola
  - Origem no legado: `database/migrations/legacy/2020_01_01_110000_create_pmieducar_escola_table.php:96-118` e `:140-160`
  - Critério de pronto: os equipamentos são gravados com referência a catálogo, e a validação recusa valor fora do catálogo
  - Confiança: 🟡

- [ ] T-05, Modelar os quantitativos de profissionais da escola, do secretário escolar ao bombeiro
  - Origem no legado: `database/migrations/legacy/2020_01_01_110000_create_pmieducar_escola_table.php:130-145`
  - Critério de pronto: os quantitativos são gravados e exportados no Registro 10, com teste de conferência de contagem
  - Confiança: 🟡

- [ ] T-06, Modelar o código INEP da escola, com nome no INEP e fonte, e o repositório de códigos INEP
  - Origem no legado: `app/Models/SchoolInep.php:11-24` e `database/migrations/legacy/2020_01_01_110000_create_modules_educacenso_cod_escola_table.php`
  - Critério de pronto: o código é único por tenant e por escola, e a remoção do código reprova a exportação do Censo Escolar
  - Confiança: 🟢

- [ ] T-07, Modelar os gestores escolares da unidade, com cargo, critério de acesso, tipo de vínculo e indicação do gestor principal
  - Origem no legado: `app/Models/SchoolManager.php:12-32` e `database/migrations/legacy/2020_01_01_110000_create_school_managers_table.php`
  - Critério de pronto: a tabela `educa_school_managers` criada, com o gestor principal identificável por consulta
  - Confiança: 🟡

- [ ] T-08, Modelar os espaços físicos da unidade, com nome e tamanho
  - Origem no legado: `app/Models/SchoolSpace.php:9-21` e `database/migrations/table/2024_04_05_195833_create_school_spaces_table.php`
  - Critério de pronto: a tabela `educa_school_spaces` criada, com vínculo com a escola e exclusão lógica
  - Confiança: 🟡

- [ ] T-09, Modelar o curso da rede, com nome, sigla, etapas, carga horária, fração de hora para falta, calendário padrão, multisseriado e modalidade
  - Origem no legado: `_reversa_sdd/School/legacy-mapping.md`, seção 3.2, e `app/Models/LegacyCourse.php`
  - Critério de pronto: tabela `educa_courses` criada, com teste de recusa de etapas fora do intervalo
  - Confiança: 🟡

- [ ] T-10, Modelar a série da rede, com nome, ordem no curso, conclusividade, carga horária, dias letivos, faixa etária, trava de faixa etária e regras de avaliação
  - Origem no legado: `_reversa_sdd/School/legacy-mapping.md`, seção 3.3, e `app/Models/LegacySchoolGrade.php`
  - Critério de pronto: tabela `educa_grades` criada, com as duas regras de avaliação vinculadas
  - Confiança: 🟡

- [ ] T-11, Modelar a oferta de curso na escola, com autorização e anos letivos
  - Origem no legado: `app/Models/LegacySchoolCourse.php:16-28` e `app/Models/LegacySchool.php:140-148`
  - Critério de pronto: tabela `educa_school_courses` criada, com unicidade por escola e por curso
  - Confiança: 🟡

- [ ] T-12, Modelar a oferta de série na escola, com anos letivos, horários padrão e intervalo
  - Origem no legado: `app/Models/LegacySchoolGrade.php:18-33` e `app/Models/LegacySchool.php:169-177`
  - Critério de pronto: tabela `educa_school_grades` criada, com unicidade por escola e por série
  - Confiança: 🟡

- [ ] T-13, Implementar a trava de enturmação sem vagas, lida na oferta de série
  - Origem no legado: `app/Models/LegacySchoolGrade.php:26` e `app/Services/EnrollmentService.php:193-195`
  - Critério de pronto: a enturmação em turma sem vaga é recusada quando a trava está ativa na série e na escola, com teste para a trava ativa e inativa
  - Confiança: 🟢

- [ ] T-14, Implementar a trava de abertura de turma para série com vagas em aberto
  - Origem no legado: `app/Models/LegacySchoolGrade.php:27`
  - Critério de pronto: a abertura de turma é recusada quando a série habilitada tem turma com vaga no mesmo turno, com teste para o caso bloqueado e o liberado
  - Confiança: 🟡

- [ ] T-15, Modelar o ano letivo da escola, com chave composta por escola e ano e os três estados de andamento
  - Origem no legado: `app/Models/LegacySchoolAcademicYear.php:13-28` e `database/migrations/legacy/2020_01_01_110000_create_pmieducar_escola_ano_letivo_table.php`
  - Critério de pronto: tabela `educa_school_academic_years` criada, com a indicação de cópia de dados de professor, de servidores e de turmas
  - Confiança: 🟡

- [ ] T-16, Implementar a resolução do ano letivo em andamento da escola, com tratamento de conjunto vazio
  - Origem no legado: `ieducar/modules/Api/Views/EscolaController.php:503-513`
  - Critério de pronto: o ano em andamento é devolvido quando existe, e nulo quando não existe, sem erro de acesso a índice
  - Confiança: 🟡

- [ ] T-17, Modelar o bloqueio de ano letivo, por instituição e por ano, com janela de datas
  - Origem no legado: `app/Models/LegacySchoolYearLock.php:10-20`
  - Critério de pronto: tabela `educa_academic_year_locks` criada, com verificação de operação dentro da janela bloqueada
  - Confiança: 🟡

- [ ] T-18, Implementar a listagem de escolas com ordenação por razão social e busca sem acento
  - Origem no legado: `app/Models/Builders/LegacySchoolBuilder.php:10-30`
  - Critério de pronto: a ordenação usa o nome da pessoa jurídica, e a busca por fragmento sem acento encontra a escola, com teste para nome acentuado
  - Confiança: 🟢

- [ ] T-19, Implementar o filtro de escolas por nível de acesso do usuário, para escola, biblioteca e demais níveis
  - Origem no legado: `ieducar/modules/Api/Views/EscolaController.php:544-584`
  - Critério de pronto: o usuário de nível escola e o de biblioteca veem apenas as suas escolas, e os demais veem todas as escolas da instituição, com teste para cada nível
  - Confiança: 🟢

- [ ] T-20, Implementar a listagem incremental dos parâmetros das escolas, com filtro por data de alteração
  - Origem no legado: `ieducar/modules/Api/Views/EscolaController.php:598-612`
  - Critério de pronto: apenas as escolas alteradas a partir da data informada são devolvidas, com teste de incrementalidade
  - Confiança: 🟢

- [ ] T-21, Implementar o cálculo da capacidade de matrícula por turno, com soma das lotações das turmas ativas
  - Origem no legado: `ieducar/modules/Api/Views/EscolaController.php:344-397`
  - Critério de pronto: a capacidade é a soma das lotações, e a consulta não carrega a lista completa de turmas em memória
  - Confiança: 🟡

- [ ] T-22, Implementar o cálculo da fila de espera por turno, contando as matrículas em pré-matrícula
  - Origem no legado: `ieducar/modules/Api/Views/EscolaController.php:280-300`
  - Critério de pronto: a fila conta apenas as matrículas em pré-matrícula do ano, da escola, do curso, da série e do turno
  - Confiança: 🟢

- [ ] T-23, Implementar a resolução do endereço da escola pelo vínculo da pessoa jurídica
  - Origem no legado: `ieducar/modules/Api/Views/EscolaController.php:619-635` e `app/Models/LegacySchool.php:222-231`
  - Critério de pronto: o endereço é devolvido com país, estado e município, e a ausência de vínculo devolve vazio e não erro
  - Confiança: 🟢

- [ ] T-24, Implementar a manutenção do código INEP da escola, com gravação e remoção
  - Origem no legado: `ieducar/modules/Api/Views/EscolaController.php:26-51`
  - Critério de pronto: a gravação substitui o código anterior e a remoção o apaga, com teste para os dois casos
  - Confiança: 🟢

- [ ] T-25, Implementar a matriz de séries e disciplinas por escola, com agregação dos anos letivos e das etapas utilizadas
  - Origem no legado: `ieducar/modules/Api/Views/EscolaController.php:637-696`
  - Critério de pronto: o resultado traz, por escola, a lista de séries com as disciplinas e as etapas utilizadas, com teste de agregação
  - Confiança: 🟢

- [ ] T-26, Implementar a parametrização da consulta da matriz, sem interpolação de valores da requisição
  - Origem no legado: `ieducar/modules/Api/Views/EscolaController.php:644` e `:682`
  - Critério de pronto: a data de alteração e o identificador da escola são vinculados como parâmetros, com teste de injeção
  - Confiança: 🟡

- [ ] T-27, Implementar a autorização de leitura das listas de escola e de instituição
  - Origem no legado: `app/Http/Controllers/Api/SchoolController.php:20-24` e `InstitutionController.php:20-24`
  - Critério de pronto: a listagem exige o processo correspondente e a devolução é restrita ao tenant, com teste de negação
  - Confiança: 🟡

- [ ] T-28, Implementar a API do módulo de escola, com as rotas de consulta, código INEP, seleção, parâmetros, matriz e endereço
  - Origem no legado: `ieducar/modules/Api/Views/EscolaController.php:698-733`
  - Critério de pronto: contrato OpenAPI gerado, com paginação e filtro por tenant em todas as listagens
  - Confiança: 🟡

- [ ] T-29, Implementar o contrato TypeScript da unit no pacote `@sysgov/sdk`
  - Origem no legado: `app/Models/LegacySchool.php:38-92` e `app/Models/LegacyInstitution.php:61-78`
  - Critério de pronto: tipos `School`, `SchoolCourse`, `SchoolGrade`, `SchoolAcademicYear`, `SchoolManager` e `InstitutionSettings` publicados e consumidos por um cliente de teste
  - Confiança: 🟡

- [ ] T-30, Implementar a trilha de auditoria das alterações de parâmetros da escola e da instituição
  - Origem no legado: ausência de auditoria no legado, evidenciada por `database/migrations/legacy/2020_01_01_110000_create_pmieducar_escola_table.php:19-21`
  - Critério de pronto: toda alteração de parâmetro gera registro de auditoria consultável por tenant e por escola
  - Confiança: 🟡

- [ ] T-31, Implementar a capacidade máxima de matrícula declarada na escola, com a soma das turmas como valor derivado
  - Origem no legado: ausência de capacidade declarada, evidenciada por `ieducar/modules/Api/Views/EscolaController.php:344-397`
  - Critério de pronto: a capacidade tem valor explícito quando declarada e valor derivado quando não, com teste para os dois casos
  - Confiança: 🟡

- [ ] T-32, Implementar o vínculo formal entre a escola e a matrícula, com a listagem por escola
  - Origem no legado: ausência de vínculo formal, evidenciada por `ieducar/modules/Api/Views/EscolaController.php:282-286`
  - Critério de pronto: a listagem de matrículas da escola usa o vínculo, e o relatório de matrículas por escola é paginado
  - Confiança: 🟡

---

## Tarefas de Teste

- [ ] TT-01, Teste do happy path do fluxo principal de rede escolar (ver `requirements.md`, Critérios de Aceitação)
- [ ] TT-02, Teste do caso de erro principal: escola sem código INEP é reprovada na exportação do Censo Escolar
- [ ] TT-03, Teste da ordenação por razão social e da busca por nome sem acento
- [ ] TT-04, Teste do filtro de escolas por nível de acesso, para escola, biblioteca, institucional e sem vínculo
- [ ] TT-05, Teste da trava de enturmação sem vagas, ativa e inativa
- [ ] TT-06, Teste da trava de abertura de turma para série com vagas em aberto
- [ ] TT-07, Teste da resolução do ano letivo em andamento, com e sem ano registrado
- [ ] TT-08, Teste do cálculo da capacidade de matrícula por turno, com turmas de lotações distintas
- [ ] TT-09, Teste do cálculo da fila de espera por turno, com matrículas em pré-matrícula e em outras situações
- [ ] TT-10, Teste da gravação e da remoção do código INEP da escola
- [ ] TT-11, Teste da agregação da matriz de séries e disciplinas, com escola sem matriz
- [ ] TT-12, Teste da listagem incremental de parâmetros, com alteração anterior e posterior à data de corte
- [ ] TT-13, Teste da resolução do endereço da escola, com e sem vínculo
- [ ] TT-14, Teste de isolamento por tenant em todas as listagens e vínculos
- [ ] TT-15, Teste de negação de autorização nas listagens de escola e de instituição
- [ ] TT-16, Teste de injeção de SQL na consulta da matriz de séries e disciplinas
- [ ] TT-17, Teste da conversão dos arrays do Censo Escolar em listas com catálogo

---

## Tarefas de Migração de Dados (se aplicável)

- [ ] TM-01, Migrar as escolas de `pmieducar.escola` para `educa_schools`, preservando a situação de funcionamento, a dependência administrativa e a caracterização
- [ ] TM-02, Migrar os códigos INEP de escola de `modules.educacenso_cod_escola` para o repositório de códigos INEP do modelo novo
- [ ] TM-03, Migrar a oferta de cursos de `pmieducar.escola_curso` para `educa_school_courses`, com autorização e anos letivos
- [ ] TM-04, Migrar a oferta de séries de `pmieducar.escola_serie` para `educa_school_grades`, com horários e travas de vagas
- [ ] TM-05, Migrar os anos letivos de `pmieducar.escola_ano_letivo` para `educa_school_academic_years`, com andamento e indicações de cópia
- [ ] TM-06, Migrar os bloqueios de ano letivo de `pmieducar.bloqueio_ano_letivo` para `educa_academic_year_locks`
- [ ] TM-07, Migrar os gestores escolares de `public.school_managers` para `educa_school_managers`, com cargo, critério e vínculo
- [ ] TM-08, Migrar os espaços de `school_spaces` para `educa_school_spaces`
- [ ] TM-09, Migrar a matriz de séries e disciplinas de `pmieducar.escola_serie_disciplina` para a estrutura nova, com anos letivos e etapas utilizadas
- [ ] TM-10, Migrar a configuração institucional de `pmieducar.instituicao` para a configuração por tenant, com as datas base e as flags
- [ ] TM-11, Gerar o relatório de divergências da carga, com o total de registros marcados por tipo de inconsistência
- [ ] TM-12, Conferir a soma das lotações das turmas por escola e por turno, contra a capacidade calculada antes e depois da migração

---

## Ordem Sugerida

1. T-01, T-02, T-03, T-04 e T-05 primeiro, porque definem o esquema da escola e a caracterização consumida pelo Censo Escolar.
2. T-06, T-07 e T-08 em seguida, porque são os vínculos próprios da unidade, consumidos pelo Censo Escolar e pelos relatórios.
3. T-09 e T-10 depois, porque definem o catálogo curricular da rede, insumo da oferta.
4. T-11 e T-12 logo após, porque a oferta depende do catálogo e carrega as travas de vagas.
5. T-13 e T-14 em seguida, porque as travas são lidas pelo serviço de enturmação e pela abertura de turma.
6. T-15, T-16 e T-17 depois, porque o ano letivo e o bloqueio delimitam o período operacional.
7. T-18, T-19, T-20, T-23 e T-24 em seguida, porque são as consultas e a manutenção do código INEP.
8. T-21, T-22 e T-25 depois, porque são os cálculos derivados, que dependem das turmas, das matrículas e da matriz.
9. T-26 e T-27 logo após, porque corrigem a parametrização e a autorização das consultas anteriores.
10. T-28, T-29 e T-30 por último entre as de domínio, porque expõem o que já está validado.
11. T-31 e T-32 no fim, porque são requisitos novos, ausentes no legado.
12. TM-01 a TM-12 somente depois de T-28 estar em ambiente de homologação, para que a carga possa ser conferida pela API nova.
13. Bloqueios: T-03 e T-04 dependem de T-01; T-11 depende de T-09 e T-01; T-12 depende de T-10 e T-01; T-13 depende de T-12; T-14 depende de T-12 e da unit SchoolClass; T-15 depende de T-01; T-18 depende de T-01; T-19 depende de T-01 e da unit Usuario; T-21 e T-22 dependem da unit SchoolClass e da unit Enrollments; T-23 depende de T-01 e da unit People; T-24 depende de T-01; T-25 depende de T-12; T-26 depende de T-25; T-31 depende de T-21; T-32 depende de T-01 e da unit Enrollments.

---

## Lacunas Pendentes (🔴)

- A tabela da escola tem mais de duzentas colunas, das quais a maioria é array de valores do Censo Escolar. É preciso definir a estratégia de separação entre dado cadastral da escola e dado de caracterização para o Censo, e o processo de atualização a cada portaria do INEP.
- A API de recurso de escola e a de instituição dispensam a autorização na indexação. É preciso definir o nível de acesso exigido para a listagem de escolas da rede.
- A consulta da matriz de séries e disciplinas interpola a data de alteração e o identificador da escola diretamente no SQL. Antes de migrar, é preciso verificar se os valores presentes na carga histórica são confiáveis.
- A capacidade de matrícula é derivada das lotações das turmas, e o legado lista todas as turmas do turno em memória para somá-las. É preciso decidir se o modelo novo adota capacidade declarada na escola, soma materializada ou cálculo em consulta agregada.
- A listagem de escolas para seleção depende do nível de acesso calculado por uma classe legada de permissões. É preciso definir a regra equivalente na autorização do SYSGOV.
- A consulta do ano letivo em andamento acessa o primeiro elemento de um conjunto possivelmente vazio. É preciso definir o comportamento esperado quando a escola não tem ano letivo em andamento, que é a regra de negócio a ser explícita.
- A exigência de CPF e a obrigatoriedade dos campos do Censo estão em colunas da instituição que não constam da lista de campos graváveis do modelo legado. É preciso verificar se a leitura dessas flags é confiável e se há outros consumidores diretos das colunas.
- O código INEP da escola é apagado e recriado a cada gravação, com nome no INEP gravado como literal de traço. É preciso definir a política de atualização do código no modelo novo e se o histórico de fontes deve ser preservado.
- Não existe no legado capacidade máxima declarada na escola, nem vínculo formal entre escola e matrícula. É preciso decidir se a capacidade passa a ser declarada e se o vínculo deve existir.
- Não há trilha de auditoria das alterações de parâmetros da escola nem da configuração institucional. É preciso decidir o que é retido, por quem e por quanto tempo.
- A matriz de séries e disciplinas expõe as etapas utilizadas por disciplina, informação mantida fora do módulo de escola e sem regra de validação aqui. É preciso definir a propriedade dessa informação e sua validação.
