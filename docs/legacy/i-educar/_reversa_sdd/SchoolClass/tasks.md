# SchoolClass (i-Educar legado), Tarefas de Implementação

> Sequência de tarefas executáveis para reimplementar a unit de turmas a partir do legado, com rastreabilidade ao código original.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Pré-requisitos

- [ ] Dependências da unit listadas em `design.md` estão disponíveis: escola, série, curso, oferta de série da escola, série da turma, enturmação, matrícula, componente curricular, oferta de disciplina, corpo docente, código INEP, etapas do ano letivo e regra de avaliação.
- [ ] Schema e migrations do banco compatíveis com as tabelas `educa_school_classes`, `educa_class_grades`, `educa_class_teachers` e `educa_class_teacher_subjects` descritas em `_reversa_sdd/SchoolClass/legacy-mapping.md`, com `tenant_id` em todas as entidades.
- [ ] Catálogo de turnos modelado como entidade, com os quatro valores do legado: matutino, vespertino, noturno e integral.
- [ ] Catálogos de tipo de atendimento, de mediação didático-pedagógica, de organização curricular, de formas de organização da turma, de tipo de itinerário e de tipo de AEE carregados em tabelas de referência.
- [ ] Catálogos de tipo de vínculo docente, de função exercida e de disciplina carregados.
- [ ] Contrato do pacote `@sysgov/sdk` definido para turma, série vinculada, corpo docente e código INEP.

---

## Tarefas

> Cada tarefa referencia o arquivo do legado de onde o comportamento foi extraído.

- [ ] T-01, Modelar a turma com tenant, escola, ano letivo, curso, série principal, turno, nome, sigla, lotação máxima, horários, intervalo e dias da semana
  - Origem no legado: `app/Models/LegacySchoolClass.php:86-163` e `database/migrations/legacy/2020_01_01_110000_create_pmieducar_turma_table.php`
  - Critério de pronto: tabela `educa_school_classes` criada, com os dias da semana como lista tipada, e teste de recusa de turno fora do catálogo
  - Confiança: 🟡

- [ ] T-02, Modelar a marcação de multisseriada e as séries vinculadas, com boletim individual por série
  - Origem no legado: `app/Models/LegacySchoolClassGrade.php:9-27` e `app/Models/LegacySchoolClass.php:318-321`
  - Critério de pronto: tabela `educa_class_grades` criada, com unicidade por turma e por série
  - Confiança: 🟡

- [ ] T-03, Modelar o corpo docente alocado na turma, com função, tipo de vínculo, vigência, turno e permissão de lançamento
  - Origem no legado: `app/Models/LegacySchoolClassTeacher.php:11-28`
  - Critério de pronto: tabela `educa_class_teachers` criada, com o rótulo do tipo de vínculo resolvido na camada de apresentação
  - Confiança: 🟡

- [ ] T-04, Modelar as disciplinas ministradas por docente na turma
  - Origem no legado: `app/Models/LegacySchoolClassTeacherDiscipline.php` e `app/Models/LegacySchoolClass.php:566-581`
  - Critério de pronto: tabela `educa_class_teacher_subjects` criada, com unicidade por alocação e por disciplina
  - Confiança: 🟡

- [ ] T-05, Modelar o código INEP da turma, com a distinção entre o código geral e os códigos dos turnos parciais
  - Origem no legado: `app/Models/SchoolClassInep.php:11-22` e `app/Services/SchoolClassInepService.php`
  - Critério de pronto: o código geral é gravado sem turno, e os códigos de matutino e de vespertino são gravados com o turno correspondente
  - Confiança: 🟢

- [ ] T-06, Modelar as etapas do calendário próprio da turma
  - Origem no legado: `app/Models/LegacySchoolClassStage.php` e `app/Services/SchoolClassStageService.php`
  - Critério de pronto: tabela `educa_school_class_stages` criada, com data de início, de fim e sequencial
  - Confiança: 🟡

- [ ] T-07, Implementar o cálculo da lotação efetiva, excluindo as matrículas de dependência
  - Origem no legado: `app/Models/LegacySchoolClass.php:269-276`
  - Critério de pronto: a contagem considera apenas as enturmações ativas com matrícula não dependente, com teste para a matrícula de dependência
  - Confiança: 🟢

- [ ] T-08, Implementar o cálculo das vagas, sem resultado negativo
  - Origem no legado: `app/Models/LegacySchoolClass.php:254-263`
  - Critério de pronto: as vagas são o saldo da lotação e nunca são negativas, com teste para a turma superlotada
  - Confiança: 🟢

- [ ] T-09, Implementar a leitura da trava de enturmação sem vagas na oferta de série da escola
  - Origem no legado: `app/Models/LegacySchoolClass.php:534-545`
  - Critério de pronto: a ausência de oferta ou de parâmetro mantém o bloqueio ativo, com teste para os três casos
  - Confiança: 🟢

- [ ] T-10, Implementar a trava de exclusão de turma com enturmações ativas
  - Origem no legado: `app/Rules/CanDeleteTurma.php:16-24`
  - Critério de pronto: a exclusão é recusada antes de qualquer alteração, com mensagem de que a turma possui enturmações ativas
  - Confiança: 🟢

- [ ] T-11, Implementar a exclusão lógica da turma, com desligamento de atividade, de visibilidade e datagem
  - Origem no legado: `app/Services/SchoolClass/SchoolClassService.php:126-129`
  - Critério de pronto: a turma permanece no banco com os três campos alterados, e as enturmações históricas são preservadas
  - Confiança: 🟢

- [ ] T-12, Implementar a trava de criação de turma com vagas em aberto
  - Origem no legado: `app/Rules/CanCreateSchoolClass.php:18-61`
  - Critério de pronto: a criação é recusada apenas na criação, apenas com a trava ativa, e a mensagem informa as vagas e a turma
  - Confiança: 🟢

- [ ] T-13, Implementar a verificação de habilitação da série e do curso na escola
  - Origem no legado: ausência de verificação no legado, evidenciada por `app/Services/SchoolClass/SchoolClassService.php:135-149`
  - Critério de pronto: a criação é recusada quando a série não está habilitada na escola, com teste para a série habilitada e a não habilitada
  - Confiança: 🟡

- [ ] T-14, Implementar a unicidade do nome da turma por escola, curso, série e ano letivo
  - Origem no legado: `app/Rules/CheckSchoolClassExistsByName.php`
  - Critério de pronto: a duplicidade é recusada entre turmas visíveis e ativas, e a edição da própria turma é permitida
  - Confiança: 🟢

- [ ] T-15, Implementar a trava de alteração da série de turma com matrícula vinculada
  - Origem no legado: `app/Rules/CanAlterSchoolClassGrade.php`
  - Critério de pronto: a alteração é recusada quando existe enturmação ativa com matrícula da série antiga, e permitida nos demais casos
  - Confiança: 🟢

- [ ] T-16, Implementar a validação da multisseriada, com mínimo de duas séries, séries únicas e recusa de remoção com matrícula
  - Origem no legado: `app/Services/SchoolClass/MultiGradesService.php:20-38` e `app/Rules/DuplicateMultiGrades.php` e `app/Rules/ExistsEnrollmentsInSchoolClassGrades.php`
  - Critério de pronto: as três recusas são testadas, com mensagem específica para cada uma
  - Confiança: 🟢

- [ ] T-17, Implementar a trava de conversão de turma simples para multisseriada
  - Origem no legado: `app/Rules/IncompatibleChangeToMultiGrades.php`
  - Critério de pronto: a conversão é recusada quando a série original tem matrículas e não está entre as novas séries
  - Confiança: 🟢

- [ ] T-18, Implementar a gravação da multisseriada, preservando a série principal e o boletim individual
  - Origem no legado: `app/Services/SchoolClass/MultiGradesService.php:60-115`
  - Critério de pronto: as séries são gravadas e as removidas são apagadas, e a série principal é preservada na remoção em bloco
  - Confiança: 🟢

- [ ] T-19, Implementar a gravação dos três códigos INEP da turma, com a remoção dos conflitantes
  - Origem no legado: `app/Services/SchoolClassInepService.php:13-92`
  - Critério de pronto: o código geral, o de matutino e o de vespertino são gravados ou apagados de forma independente
  - Confiança: 🟢

- [ ] T-20, Implementar a detecção de estudantes parciais, a partir dos turnos dos enturmados
  - Origem no legado: `app/Services/SchoolClass/SchoolClassService.php:151-181`
  - Critério de pronto: a detecção considera a turma integral com estudantes em turno parcial, e o resultado é cacheado com validade curta
  - Confiança: 🟢

- [ ] T-21, Implementar a trava de alteração do turno de turma integral com estudantes parciais
  - Origem no legado: `app/Http/Controllers/SchoolClassController.php:50-62`
  - Critério de pronto: a alteração é recusada antes da gravação, com o nome do turno atual na mensagem
  - Confiança: 🟢

- [ ] T-22, Implementar a normalização dos campos dependentes da etapa do Censo Escolar
  - Origem no legado: `app/Http/Controllers/SchoolClassController.php:203-269`
  - Critério de pronto: o eixo de curso profissional é anulado fora das etapas 67, 68, 73 e 75, e o curso profissional é anulado fora das etapas 39, 40, 64 e 74
  - Confiança: 🟢

- [ ] T-23, Implementar a normalização dos arrays de valores, com conversão entre lista e formato de armazenamento
  - Origem no legado: `app/Http/Controllers/SchoolClassController.php:186-195` e `app/Models/LegacySchoolClass.php:445-468`
  - Critério de pronto: os arrays são gravados e lidos sem perda, com teste de ida e volta
  - Confiança: 🟢

- [ ] T-24, Implementar a anulação das atividades complementares e da classe especial conforme o tipo de atendimento
  - Origem no legado: `app/Http/Controllers/SchoolClassController.php:227-242`
  - Critério de pronto: as atividades complementares são anuladas sem tipo complementar, e a classe especial é anulada sem tipo curricular
  - Confiança: 🟢

- [ ] T-25, Implementar a resolução do calendário letivo da turma, conforme o curso seguir ou não o calendário padrão
  - Origem no legado: `app/Models/LegacySchoolClass.php:278-311` e `:391-399`
  - Critério de pronto: a turma de curso padrão usa as etapas do ano letivo, e a de curso próprio usa as etapas da turma
  - Confiança: 🟢

- [ ] T-26, Implementar a resolução da regra de avaliação da turma, com a regra diferenciada da escola
  - Origem no legado: `app/Models/LegacySchoolClass.php:648-661`
  - Critério de pronto: a regra diferenciada prevalece quando a escola a utiliza e a série a possui, com teste para os dois regimes
  - Confiança: 🟢

- [ ] T-27, Implementar a resolução das disciplinas da turma, com os três caminhos em cascata
  - Origem no legado: `app/Models/LegacySchoolClass.php:612-640`
  - Critério de pronto: a multisseriada usa a oferta das séries vinculadas, a turma simples usa o componente alocado e, na ausência dele, a oferta da série
  - Confiança: 🟢

- [ ] T-28, Implementar a permissão de carga horária integralizada da turma
  - Origem no legado: `app/Models/LegacySchoolClass.php:686-693`
  - Critério de pronto: a permissão é verdadeira para itinerário de formação técnica e profissional ou para etapa que admite a carga
  - Confiança: 🟢

- [ ] T-29, Implementar a listagem de turmas por escola, com a regra de avaliação de cada série e filtro por atualização
  - Origem no legado: `ieducar/modules/Api/Views/TurmaController.php:209-291`
  - Critério de pronto: a listagem traz o identificador, o nome, o ano, a escola, o turno, a lotação, as séries com as regras e a data de exclusão
  - Confiança: 🟢

- [ ] T-30, Implementar a parametrização da listagem de turmas, sem interpolação de valores da requisição
  - Origem no legado: `ieducar/modules/Api/Views/TurmaController.php:221` e `:268`
  - Critério de pronto: a lista de escolas e o turno são vinculados como parâmetros, com teste de injeção
  - Confiança: 🟡

- [ ] T-31, Implementar os filtros de turma por série, curso, turno, escola, ano em andamento, dia da semana e escola do usuário
  - Origem no legado: `app/Models/Builders/LegacySchoolClassBuilder.php:56-208`
  - Critério de pronto: cada filtro é testado, incluindo a turma multisseriada na busca por série e por curso
  - Confiança: 🟢

- [ ] T-32, Implementar a busca por nome de turma sem acento, com remoção de trechos entre parênteses
  - Origem no legado: `app/Models/Builders/LegacySchoolClassBuilder.php:192-197`
  - Critério de pronto: a busca por fragmento sem acento encontra a turma, e o trecho entre parênteses é ignorado
  - Confiança: 🟢

- [ ] T-33, Implementar a listagem das séries da turma, com o curso e o indicador de calendário padrão
  - Origem no legado: `ieducar/modules/Api/Views/TurmaController.php:329-341`
  - Critério de pronto: a listagem traz a série, o curso e o indicador de calendário padrão de cada série
  - Confiança: 🟢

- [ ] T-34, Implementar a gravação dos componentes curriculares da turma em lote
  - Origem no legado: `app/Http/Controllers/SchoolClassController.php:296-339`
  - Critério de pronto: os componentes são apagados e regravados com carga horária, vínculo docente, etapas específicas e etapas utilizadas
  - Confiança: 🟡

- [ ] T-35, Implementar a API do módulo de turma, com as rotas de gravação, exclusão, listagem, calendários, etapas e séries
  - Origem no legado: `app/Http/Controllers/SchoolClassController.php:22-159` e `app/Http/Controllers/Api/SchoolClassController.php:16-53`
  - Critério de pronto: contrato OpenAPI gerado, com paginação e filtro por tenant em todas as listagens
  - Confiança: 🟡

- [ ] T-36, Implementar o contrato TypeScript da unit no pacote `@sysgov/sdk`
  - Origem no legado: `app/Models/LegacySchoolClass.php:86-163` e `src/Modules/SchoolClass/Period.php`
  - Critério de pronto: tipos `SchoolClass`, `SchoolClassGrade`, `ClassTeacher`, `ClassTeacherSubject` e `SchoolClassInep` publicados e consumidos por um cliente de teste
  - Confiança: 🟡

- [ ] T-37, Implementar a trilha de auditoria das alterações e exclusões de turma, com ator, instante e motivo
  - Origem no legado: ausência de auditoria no legado, evidenciada por `app/Services/SchoolClass/SchoolClassService.php:126-129`
  - Critério de pronto: toda alteração e toda exclusão geram registro de auditoria, com o motivo da exclusão
  - Confiança: 🟡

- [ ] T-38, Implementar a verificação de compatibilidade entre a lotação máxima e a sala ou o tipo de atendimento
  - Origem no legado: ausência de verificação no legado, evidenciada por `app/Models/LegacySchoolClass.php:552-561`
  - Critério de pronto: a criação é recusada ou produce aviso quando a lotação excede a capacidade declarada, com o relatório do conflito
  - Confiança: 🟡

---

## Tarefas de Teste

- [ ] TT-01, Teste do happy path do fluxo principal de cadastro de turma (ver `requirements.md`, Critérios de Aceitação)
- [ ] TT-02, Teste do caso de erro principal: exclusão de turma com enturmações ativas
- [ ] TT-03, Teste do cálculo da lotação efetiva, com e sem matrícula de dependência
- [ ] TT-04, Teste do cálculo das vagas, com turma lotada e superlotada
- [ ] TT-05, Teste da trava de criação com vagas em aberto, na criação e na edição
- [ ] TT-06, Teste da unicidade do nome, entre turmas do mesmo contexto e de contextos distintos
- [ ] TT-07, Teste da alteração de série com e sem matrícula vinculada
- [ ] TT-08, Teste da multisseriada, com mínimo de séries, séries repetidas e remoção com matrícula
- [ ] TT-09, Teste da conversão de turma simples para multisseriada, nos dois casos
- [ ] TT-10, Teste da gravação dos três códigos INEP, com gravação e remoção isoladas
- [ ] TT-11, Teste da alteração do turno de turma integral com estudantes parciais
- [ ] TT-12, Teste da normalização dos campos dependentes da etapa do Censo Escolar
- [ ] TT-13, Teste da resolução do calendário, para curso padrão e para curso próprio
- [ ] TT-14, Teste da resolução da regra de avaliação, com e sem regra diferenciada
- [ ] TT-15, Teste da resolução das disciplinas, para multisseriada, com componente alocado e sem componente
- [ ] TT-16, Teste da listagem de turmas por escola, com filtro por atualização
- [ ] TT-17, Teste de injeção de SQL na listagem de turmas por escola
- [ ] TT-18, Teste dos filtros de série, curso, turno, dia da semana e escola do usuário
- [ ] TT-19, Teste de isolamento por tenant em todas as listagens e vínculos
- [ ] TT-20, Teste de atomicidade da gravação, com falha intermediária e verificação de rollback

---

## Tarefas de Migração de Dados (se aplicável)

- [ ] TM-01, Migrar as turmas de `pmieducar.turma` para `educa_school_classes`, preservando horários, turno, lotação e marcações do Censo Escolar
- [ ] TM-02, Migrar as séries das turmas de `pmieducar.turma_serie` para `educa_class_grades`, com os boletins individuais
- [ ] TM-03, Migrar as alocações docentes de `modules.professor_turma` para `educa_class_teachers`, com função, vínculo, vigência e permissão de lançamento
- [ ] TM-04, Migrar as disciplinas dos docentes de `modules.professor_turma_disciplina` para `educa_class_teacher_subjects`
- [ ] TM-05, Migrar os códigos INEP de `modules.educacenso_cod_turma` para a estrutura nova, preservando a distinção de turno
- [ ] TM-06, Migrar as etapas próprias das turmas de `pmieducar.turma_modulo` para `educa_school_class_stages`
- [ ] TM-07, Migrar os tipos de turma de `pmieducar.turma_tipo` para o catálogo de tipos de turma
- [ ] TM-08, Migrar os turnos de `pmieducar.turma_turno` para `educa_periods`, com os quatro valores do legado
- [ ] TM-09, Gerar o relatório de divergências da carga, com o total de registros marcados por tipo de inconsistência
- [ ] TM-10, Conferir a soma das lotações por turno, contra a capacidade calculada antes e depois da migração

---

## Ordem Sugerida

1. T-01, T-02, T-03, T-04, T-05 e T-06 primeiro, porque definem o esquema da turma e dos seus vínculos.
2. T-07, T-08 e T-09 em seguida, porque determinam a lotação, as vagas e o bloqueio de enturmação.
3. T-10 e T-11 depois, porque a exclusão é a operação destrutiva e precisa estar definida antes das demais.
4. T-12 e T-13 logo após, porque são as travas da criação, que é a operação de maior risco de duplicidade de oferta.
5. T-14, T-15, T-16, T-17 e T-18 em seguida, porque são as validações da gravação e da multisseriada.
6. T-19, T-20 e T-21 depois, porque os códigos INEP e a trava de turno dependem da detecção de estudantes parciais.
7. T-22, T-23 e T-24 logo após, porque a normalização do payload é a preparação da gravação.
8. T-25, T-26, T-27 e T-28 em seguida, porque são as resoluções de calendário, de regra e de disciplinas, que alimentam o diário e a exportação.
9. T-29, T-30, T-31, T-32 e T-33 por último entre as de domínio, porque expõem o que já está validado.
10. T-34, T-35 e T-36 em seguida, porque adicionam a gravação em lote, o contrato e a API.
11. T-37 e T-38 no fim, porque são requisitos novos, ausentes no legado.
12. TM-01 a TM-10 somente depois de T-35 estar em ambiente de homologação, para que a carga possa ser conferida pela API nova.
13. Bloqueios: T-08 depende de T-07; T-09 depende da unit School; T-12 depende de T-08 e da unit School; T-13 depende de T-12; T-15 depende de T-08; T-16 depende de T-02; T-17 depende de T-15; T-18 depende de T-16; T-19 depende de T-05 e T-20; T-20 depende da unit Educacenso; T-25 depende da unit Calendario; T-26 depende da unit RegraAvaliacao; T-27 depende da unit ComponenteCurricular; T-34 depende de T-27; T-38 depende de T-08 e da unit de espaços da escola.

---

## Lacunas Pendentes (🔴)

- A listagem de turmas por escola interpola a lista de escolas e o turno no SQL. Antes de migrar, é preciso verificar a confiabilidade desses valores e definir a estratégia de parametrização no modelo novo.
- A API de recurso de turma dispensa a autorização na indexação, expondo a listagem de turmas da rede. É preciso definir o nível de acesso exigido.
- A verificação de vagas em aberto percorre as turmas do turno e conta as matrículas de cada uma. É preciso decidir se o modelo novo adota consulta agregada, capacidade declarada ou contador persistido.
- O cache de estudantes parciais tem cinco minutos de validade, o que permite a alteração do turno de uma turma que passou a ter estudantes parciais. É preciso definir a invalidação do cache.
- A exclusão lógica não registra o motivo nem o usuário responsável. É preciso decidir o que é retido e por quanto tempo.
- A regra de exclusão de série compara a contagem do array com zero, e não a presença de itens, o que é frágil. É preciso confirmar o comportamento correto quando a busca devolve chaves nulas.
- Não há verificação de que a série está habilitada na escola, nem de que o curso está habilitado, na criação da turma. É preciso decidir se a verificação é impeditiva ou informativa.
- A carga horária em horas é a diferença bruta entre o início e o fim, sem descontar o intervalo nem as horas noturnas. É preciso definir o cálculo correto, que é consumido pelo diário e pela exportação.
- O turno é um código numérico sem entidade própria na aplicação, e a tabela de turnos do legado não foi localizada no código lido. É preciso confirmar a origem da tabela `pmieducar.turma_turno`.
- A regra de incompatibilidade de tipo de ausência, de parecer descritivo e de tipo de recuperação acopla a turma ao modelo de avaliação, e essas regras não foram lidas nesta extração. É preciso completá-las na unit de RegraAvaliacao.
- A turma tem mais de sessenta campos, dos quais grande parte é marcação do Censo Escolar. É preciso definir a estratégia de separação entre o dado operacional da turma e o dado de exportação.
- Não há trilha de auditoria das alterações de turma. É preciso decidir o que é retido, por quem e por quanto tempo.
