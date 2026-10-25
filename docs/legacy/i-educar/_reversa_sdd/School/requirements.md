# School (i-Educar legado)

> Unit do plano de extração do Reversa (`granularity = module`). Descreve o **QUE** o módulo de escolas e estrutura pedagógica legado faz, com rastreabilidade ao código lido.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Visão Geral

O módulo School do i-Educar mantém a rede de ensino municipal: as unidades escolares, os cursos e séries que a rede oferece, a matriz de oferta habilitada em cada escola, o ano letivo de cada unidade e os parâmetros institucionais que regulam o funcionamento da rede. 🟢

Problema que resolve: dar à secretaria de educação uma visão única da rede, com a identificação oficial de cada unidade escolar frente ao INEP, a oferta curricular efetivamente habilitada em cada escola e as regras que governam vagas, matrículas e o corte de cada ano letivo. 🟢

A escola é uma entidade peculiar: o registro de `pmieducar.escola` traz o identificador, a instituição mantenedora, a situação de funcionamento e a caracterização escolar, mas o **nome** vem da pessoa jurídica associada em `cadastro.juridica`, e os dados de infraestrutura, equipamentos, profissionais e respondentes do Censo Escolar estão em mais de cem colunas da própria tabela. 🟢

Observação estrutural: a configuração da rede — datas base, obrigatoriedade de campos do Censo, exigência de CPF, permissão de matrícula fora do período letivo — é **institucional**, não escolar, e é lida por praticamente todos os módulos. 🟢 `app/Models/LegacyInstitution.php:61-78`

---

## Responsabilidades

- Registrar a unidade escolar com instituição mantenedora, sigla, nome herdado da pessoa jurídica, situação de funcionamento, dependência administrativa, zona e localização diferenciada. 🟢 `database/migrations/legacy/2020_01_01_110000_create_pmieducar_escola_table.php`
- Manter a caracterização escolar para o Censo Escolar, com mantenedora, categoria de escola privada, conveniação, CNPJ, regulamentação, esfera administrativa, órgão vinculado, IES e prédio compartilhado. 🟢 `pmieducar.escola:50-140`
- Manter a infraestrutura escolar, com dependências, áreas, salas, laboratórios, banheiros, dormitórios, recursos de acessibilidade e áreas externas. 🟢 `pmieducar.escola:30-60` e `:120-150`
- Manter os equipamentos, o uso de internet, a rede local e as quantidades de computadores. 🟢 `pmieducar.escola:96-118` e `:140-160`
- Manter os quantitativos de profissionais da escola, do secretário escolar ao bombeiro. 🟢 `pmieducar.escola:130-145`
- Manter o código INEP da escola, com nome no INEP e fonte da informação. 🟢 `app/Models/SchoolInep.php:11-24`
- Manter os gestores escolares da unidade, com cargo, critério de acesso, tipo de vínculo e indicação do gestor principal. 🟢 `app/Models/SchoolManager.php:12-32`
- Manter os espaços físicos da unidade, com nome e tamanho. 🟢 `app/Models/SchoolSpace.php:9-21`
- Habilitar cursos na escola, com autorização e anos letivos. 🟢 `app/Models/LegacySchoolCourse.php:16-30`
- Habilitar séries na escola, com anos letivos, horários padrão, trava de enturmação sem vagas e trava de abertura de turma com vagas em aberto. 🟢 `app/Models/LegacySchoolGrade.php:18-33`
- Controlar o ano letivo de cada escola, com situação de andamento e indicação de cópia de dados do ano anterior. 🟢 `app/Models/LegacySchoolAcademicYear.php:16-40`
- Bloquear o ano letivo por período, impedindo operações fora da janela. 🟢 `app/Models/LegacySchoolYearLock.php:10-20`
- Manter a configuração institucional da rede, com as datas base e as flags operacionais. 🟢 `app/Models/LegacyInstitution.php:61-83`
- Expor a lista de escolas para seleção, filtrada por usuário ou por instituição, conforme o nível de acesso. 🟢 `ieducar/modules/Api/Views/EscolaController.php:544-584`
- Expor os parâmetros das escolas com filtro por data de alteração, para sincronização incremental. 🟢 `EscolaController.php:598-612`
- Expor a matriz de séries e disciplinas por escola, com os anos letivos e as etapas utilizadas. 🟢 `EscolaController.php:637-696`
- Calcular a fila de espera e a capacidade total de matrícula por turno. 🟢 `EscolaController.php:280-397`

---

## Regras de Negócio

- O nome da escola é o nome fantasia da pessoa jurídica vinculada, e não um campo da própria escola; a listagem faz junção com `cadastro.juridica` para ordenar e filtrar. 🟢 `app/Models/LegacySchool.php:101-106` e `app/Models/Builders/LegacySchoolBuilder.php:14-24`
- A busca por nome da escola ignora acentuação, com comparação por expressão regular sem distinção de maiúsculas sobre a forma desaccentuada. 🟢 `LegacySchoolBuilder.php:16-19`
- A listagem de escolas para seleção só inclui as escolas do usuário quando o nível de acesso é escola ou biblioteca; nos demais níveis, inclui todas as escolas da instituição. 🟢 `ieducar/modules/Api/Views/EscolaController.php:544-572`
- A listagem sem filtro por usuário é restrita à instituição informada na requisição. 🟢 `EscolaController.php:574-584`
- O ano letivo em andamento da escola é o único com `andamento = 1` e `ativo = 1`, e a consulta devolve o primeiro registro. 🟢 `EscolaController.php:503-513`
- O andamento do ano letivo admite três estados: não inicializado, em andamento e finalizado. 🟢 `app/Models/LegacySchoolAcademicYear.php:13-15`
- A chave do ano letivo é composta por escola e ano, e a tabela guarda a indicação de copiar dados de professor, de demais servidores e de turmas do ano anterior. 🟢 `database/migrations/legacy/2020_01_01_110000_create_pmieducar_escola_ano_letivo_table.php` e `app/Models/LegacySchoolAcademicYear.php:19-28`
- A oferta de curso na escola registra a autorização e o conjunto de anos letivos em que o curso é oferecido. 🟢 `app/Models/LegacySchoolCourse.php:16-28`
- A oferta de série na escola registra os anos letivos, o horário padrão de início e fim, o intervalo, a trava de enturmação sem vagas e a trava de abertura de turma para série com vagas. 🟢 `app/Models/LegacySchoolGrade.php:18-33`
- A fila de espera de matrícula conta as matrículas em pré-matrícula, filtradas por ano, escola, curso, série e turno. 🟢 `EscolaController.php:280-300`
- A capacidade de matrícula por turno é a soma da lotação máxima declarada nas turmas ativas do curso, da série, da escola e do turno. 🟢 `EscolaController.php:344-397`
- A dependência administrativa da escola é consultada isoladamente, para a regra de anulação de campos do Registro 00 do Censo Escolar. 🟢 `EscolaController.php:515-527`
- O código INEP da escola é apagado e recriado a cada gravação, e a ausência do identificador na requisição remove o código. 🟢 `EscolaController.php:26-51`
- O nome no INEP é gravado com o valor literal de traço, o que indica campo desativado. 🟢 `EscolaController.php:38`
- Os parâmetros das escolas são expostos com o identificador, a indicação de uso de regra diferenciada e a data de alteração, e a consulta string `modified` limita o conjunto devolvido. 🟢 `EscolaController.php:598-612`
- A matriz de séries e disciplinas por escola é agregada em JSON, com os anos letivos e as etapas utilizadas por disciplina. 🟢 `EscolaController.php:647-684`
- O endereço da escola é resolvido pelo vínculo da pessoa jurídica com o endereço, e não por coluna própria da escola. 🟢 `EscolaController.php:619-635` e `app/Models/LegacySchool.php:222-231`
- A escola pode utilizar regra de avaliação diferenciada, sinalizador que habilita a adaptação curricular para alunos com AEE. 🟢 `pmieducar.escola:105`
- A instituição define as datas base de remanejamento, de transferência, de matrícula, de fechamento e de expiração de reserva de vaga, e a data de corte do Censo Escolar. 🟢 `app/Models/LegacyInstitution.php:61-78`
- A instituição define a obrigatoriedade dos campos do Censo Escolar, que ativa a verificação de conflito de horário na enturmação. 🟢 `LegacyInstitution.php:136-139` e `app/Services/EnrollmentService.php:219`
- A instituição define a exigência de CPF, que torna o CPF obrigatório no cadastro de pessoa. 🟢 `ieducar/modules/Api/Views/PessoaController.php:545`
- A instituição define a permissão de matrícula fora do período letivo, que isenta a enturmação da validação de ano letivo. 🟢 `LegacyInstitution.php:148-153` e `app/Services/EnrollmentService.php:136`
- A data base de remanejamento da instituição é convertida para o formato de armazenamento de data, e o serviço de remanejamento compõe o ano a partir da data de enturmação. 🟢 `LegacyInstitution.php:200-203` e `app/Services/RelocationDate/RelocationDateService.php:16-35`
- O bloqueio de ano letivo é definido por instituição e por ano, com data de início e data de fim da janela bloqueada. 🟢 `app/Models/LegacySchoolYearLock.php:10-20`
- A escola é referenciada por `ref_idpes` em dois papéis distintos: o vínculo principal com a pessoa jurídica e o gestor escolar em `ref_idpes_gestor`. 🟢 `pmieducar.escola:24` e `:36`
- Não existe, no legado, capacidade máxima de matrícula declarada na escola, e sim a soma das lotações declaradas nas turmas. 🔴
- Não existe, no legado, registro de auditoria das alterações de parâmetros da escola, e o filtro por data expõe apenas a coluna de atualização. 🔴
- Não existe, no legado, vínculo formal entre a escola e a matrícula, e a listagem de matrículas filtra por escola na própria consulta. 🔴
- A consulta da matriz de séries e disciplinas interpola a data de alteração e o identificador da escola diretamente no SQL. 🔴

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | O sistema deve registrar a unidade escolar com instituição mantenedora, sigla, nome, situação de funcionamento e dependência administrativa. | Must | Dado uma escola válida, quando cadastrada, então o nome herdado da pessoa jurídica e a instituição mantenedora ficam gravados. |
| RF-02 | O sistema deve listar as escolas ordenadas pelo nome fantasia da pessoa jurídica, ignorando acentuação na busca. | Must | Dado duas escolas com nomes acentuados, quando a busca for feita por fragmento sem acento, então ambas são encontradas. |
| RF-03 | O sistema deve restringir a lista de escolas ao usuário, quando o nível de acesso for escola ou biblioteca. | Must | Dado um usuário de nível escola, quando a lista for solicitada, então somente as escolas vinculadas ao usuário são devolvidas. |
| RF-04 | O sistema deve listar as escolas da instituição, quando o nível de acesso não for escola ou biblioteca. | Must | Dado um usuário institucional, quando a lista for solicitada, então todas as escolas da instituição são devolvidas. |
| RF-05 | O sistema deve manter o código INEP da escola, com nome no INEP e fonte, e permitir removê-lo. | Must | Dado uma escola com código INEP, quando o código for removido, então o vínculo deixa de existir e a exportação do Censo passa a ser recusada. |
| RF-06 | O sistema deve manter a matriz de cursos habilitados na escola, com autorização e anos letivos. | Must | Dado um curso habilitado, quando a matriz for consultada, então o curso aparece com os anos letivos registrados. |
| RF-07 | O sistema deve manter a matriz de séries habilitadas na escola, com anos letivos, horários e travas. | Must | Dado uma série habilitada, quando a matriz for consultada, então a série aparece com horário de início, de fim e de intervalo. |
| RF-08 | O sistema deve permitir bloquear a enturmação sem vagas, por série habilitada na escola. | Must | Dado a trava ativa e uma turma lotada, quando a enturmação for tentada, então a operação é recusada. |
| RF-09 | O sistema deve permitir bloquear a abertura de nova turma para série que ainda tenha vagas em turmas existentes. | Must | Dado a trava ativa e uma série com turma com vaga, quando a abertura de turma for tentada, então a operação é recusada. |
| RF-10 | O sistema deve controlar o ano letivo de cada escola, com os estados não inicializado, em andamento e finalizado. | Must | Dado um ano letivo em andamento, quando a escola for consultada, então o ano em andamento é devolvido. |
| RF-11 | O sistema deve permitir bloquear um ano letivo por período, por instituição. | Must | Dado um ano bloqueado, quando uma operação do ano for tentada dentro da janela, então a operação é impedida. |
| RF-12 | O sistema deve manter a configuração institucional da rede, com as datas base e as flags operacionais. | Must | Dado a data de corte do Censo configurada, quando a exportação for analisada, então a data é usada como referência. |
| RF-13 | O sistema deve permitir tornar obrigatórios os campos do Censo Escolar na enturmação. | Must | Dado a flag ativa, quando houver conflito de horário na enturmação, então a operação é recusada. |
| RF-14 | O sistema deve permitir exigir o CPF no cadastro de pessoa. | Must | Dado a exigência ativa, quando uma pessoa sem CPF for gravada, então a operação é recusada. |
| RF-15 | O sistema deve permitir matricular fora do período letivo. | Must | Dado a permissão ativa, quando a enturmação ocorrer antes do início do ano letivo, então a operação é permitida. |
| RF-16 | O sistema deve manter os gestores escolares da unidade, com cargo, critério de acesso, tipo de vínculo e indicação do gestor principal. | Must | Dado dois gestores e um deles marcado como principal, quando a lista for consultada, então a marcação de principal é preservada. |
| RF-17 | O sistema deve manter os espaços físicos da unidade, com nome e tamanho. | Must | Dado um espaço cadastrado, quando a unidade for consultada, então o espaço aparece vinculado à escola. |
| RF-18 | O sistema deve manter os quantitativos de profissionais da escola e a infraestrutura, para o Registro 10 do Censo Escolar. | Must | Dado uma escola com infraestrutura registrada, quando o Registro 10 for gerado, então os campos correspondentes são preenchidos. |
| RF-19 | O sistema deve calcular a fila de espera de matrícula por turno, contando as matrículas em pré-matrícula. | Must | Dado três matrículas em pré-matrícula no turno, quando a fila for calculada, então o resultado é três. |
| RF-20 | O sistema deve calcular a capacidade de matrícula por turno, somando a lotação das turmas ativas. | Must | Dado duas turmas com lotação 30 e 25, quando a capacidade for calculada, então o resultado é 55. |
| RF-21 | O sistema deve expor os parâmetros das escolas com filtro por data de alteração, para sincronização incremental. | Must | Dado uma escola alterada depois da data informada, quando os parâmetros forem solicitados, então a escola é devolvida. |
| RF-22 | O sistema deve expor a matriz de séries e disciplinas por escola, com os anos letivos e as etapas utilizadas. | Must | Dado uma escola com duas séries e disciplinas, quando a matriz for solicitada, então o resultado traz as duas séries com as disciplinas. |
| RF-23 | O sistema deve resolver o endereço da escola pelo vínculo da pessoa jurídica. | Must | Dado uma escola com pessoa jurídica Endereçada, quando o endereço for solicitado, então o endereço é devolvido. |
| RF-24 | O sistema deve permitir publicar avisos vinculados à instituição, à escola e ao usuário. | Must | Dado um aviso publicado, quando a listagem for feita, então o aviso aparece com escola, título, data e local. |

---

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Segurança | A listagem de escolas para seleção é filtrada pelo usuário e pelo nível de acesso. | `ieducar/modules/Api/Views/EscolaController.php:544-572` | 🟢 |
| Segurança | A API de recurso de escola usa processo 561 e a de instituição usa processo 753, mas ambas dispensam a autorização na indexação. | `app/Http/Controllers/Api/SchoolController.php:16-26` e `InstitutionController.php:16-20` | 🟢 |
| Integridade | A gravação do código INEP apaga o registro anterior e cria o novo, o que evita duplicidade. | `ieducar/modules/Api/Views/EscolaController.php:26-51` | 🟢 |
| Integridade | A chave do ano letivo é composta por escola e ano, com restrição de chave primária no banco. | `database/migrations/legacy/2020_01_01_110000_create_pmieducar_escola_ano_letivo_table.php` | 🟢 |
| Integridade | A listagem de escolas exclui as inativas por filtro explícito. | `app/Models/Builders/LegacySchoolBuilder.php:38-41` | 🟢 |
| Performance | A listagem de escolas faz junção com a pessoa jurídica para ordenar por nome, o que impede o uso de índice sobre a coluna de nome. | `LegacySchoolBuilder.php:26-30` | 🟢 |
| Performance | A matriz de séries e disciplinas é agregada em JSON no banco, evitando o transporte de linhas intermediárias. | `ieducar/modules/Api/Views/EscolaController.php:647-684` | 🟢 |
| Performance | O cálculo da capacidade de matrícula percorre a lista legada de turmas e soma as lotações em memória. | `EscolaController.php:344-397` | 🟢 |
| Integridade | A consulta da matriz interpola a data de alteração e o identificador da escola diretamente no SQL, sem parametrização. | `EscolaController.php:644` e `:682` | 🟢 |
| Isolamento | O legado opera em base municipal única; a migração para o SYSGOV exige `tenant_id` em escolas, ofertas, anos letivos e gestores. | `database/migrations/legacy/2020_01_01_110000_create_pmieducar_escola_table.php` | 🟡 |
| Compatibilidade | A ordenação da lista de seleção usa a forma em maiúsculas, com prefixo de dois sinais de sublinhado no identificador. | `EscolaController.php:558` e `:568` | 🟢 |
| Observabilidade | A gravação da escola informa sucesso ou falha no mensageiro, com mensagem específica. | `EscolaController.php:72` e `:75-79` | 🟢 |
| Auditabilidade | A escola registra o autor do cadastro e o da exclusão, mas não há trilha de alteração de conteúdo. | `pmieducar.escola:19` e `:21` | 🔴 |

> Inferido a partir do código. Validar com equipe de operações.

---

## Critérios de Aceitação

```gherkin
Dado uma escola cadastrada com nome acentuado
Quando a busca de escolas for feita pelo nome sem acento
Então a escola é encontrada

Dado um usuário de nível escola vinculado a duas escolas
Quando a lista de escolas para seleção for solicitada
Então somente as duas escolas vinculadas são devolvidas

Dado uma escola com ano letivo em andamento
Quando o ano letivo da escola for consultado
Então o ano em andamento é devolvido

Dado um curso habilitado na escola com autorização e dois anos letivos
Quando a matriz de cursos for consultada
Então o curso aparece com a autorização e os dois anos letivos

Dado uma série habilitada com a trava de enturmação sem vagas ativa
E uma turma sem vaga
Quando a enturmação for tentada
Então a operação é recusada

Dado duas turmas ativas do mesmo turno com lotação 30 e 25
Quando a capacidade de matrícula do turno for calculada
Então o resultado é 55

Dado três matrículas em pré-matrícula no mesmo turno
Quando a fila de espera for calculada
Então o resultado é três

Dado o código INEP de uma escola
Quando o código for removido
Então o vínculo é apagado e a exportação do Censo Escolar passa a ser recusada por ausência de código INEP
```

---

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Cadastro da unidade escolar | Must | Entidade central da rede e base de todos os lançamentos |
| Identificação oficial com código INEP | Must | Condiciona o repasse do FUNDEB e o Censo Escolar |
| Matriz de cursos e séries habilitadas | Must | Define o que a escola pode matricular |
| Trava de enturmação sem vagas | Must | Protege a lotação e a matrícula |
| Trava de abertura de turma com vagas em aberto | Must | Evita oferta duplicada de vagas |
| Ano letivo por escola, com andamento | Must | delimita o período operacional de matrículas e diário |
| Configuração institucional com datas base | Must | Governa remanejamento, transferência, fechamento e Censo |
| Caracterização escolar para o Censo Escolar | Must | Alimenta o Registro 00 e o Registro 10 |
| Gestores escolares com cargo e vínculo | Must | Alimenta o Registro 40 e a responsabilização da unidade |
| Capacidade de matrícula por turno | Must | É o indicador de vaga usado na decisão de matrícula |
| Fila de espera por turno | Must | É o indicador de demanda usado na decisão de abertura de turma |
| Endereço da escola | Must | Identifica a unidade no Registro 00 e nos relatórios |
| Bloqueio de ano letivo por período | Should | Existe no legado e é alternável pela rede |
| Exigência de CPF e obrigatoriedade dos campos do Censo | Should | Flags institucionais que alteram a validação de outros módulos |
| Matriz de séries e disciplinas por escola | Should | Alimenta a oferta de disciplinas e a etapa utilizada |
| Espaços físicos da unidade | Should | Usados em relatórios e no planejamento de turmas |
| Publicação de avisos por escola | Should | Existe no legado e é usado pela secretaria |
| Auditoria de alterações de parâmetros da escola | Could | Ausente no legado |
| Capacidade máxima de matrícula declarada na escola | Could | Ausente no legado, que soma as lotações das turmas |
| Vinculação formal entre a escola e a matrícula | Could | Ausente no legado, que filtra por coluna na consulta |

> Prioridade inferida por frequência de chamada e posição na cadeia de dependências.

---

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `ieducar/modules/Api/Views/EscolaController.php` | `get`, `put`, listas de seleção, parâmetros, matriz de séries e disciplinas, capacidade e fila | 🟢 |
| `app/Models/LegacySchool.php` | Entidade da escola e seus vínculos | 🟢 |
| `app/Models/Builders/LegacySchoolBuilder.php` | Filtros, junção com a pessoa jurídica e ordenação por nome | 🟢 |
| `app/Models/LegacyInstitution.php` | Configuração institucional e datas base | 🟢 |
| `app/Models/Builders/LegacyInstitutionBuilder.php` | Filtros da instituição | 🟡 |
| `app/Models/LegacySchoolCourse.php` | Oferta de curso na escola | 🟢 |
| `app/Models/LegacySchoolCourseBuilder.php` | Filtros da oferta de curso | 🟡 |
| `app/Models/LegacySchoolGrade.php` | Oferta de série na escola e travas de vagas | 🟢 |
| `app/Models/Builders/LegacySchoolGradeBuilder.php` | Filtros da oferta de série | 🟡 |
| `app/Models/LegacySchoolAcademicYear.php` | Ano letivo da escola | 🟢 |
| `app/Models/Builders/LegacySchoolAcademicYearBuilder.php` | Filtros do ano letivo | 🟡 |
| `app/Models/LegacySchoolYearLock.php` | Bloqueio de ano letivo | 🟢 |
| `app/Models/Builders/LegacySchoolYearLockBuilder.php` | Filtros do bloqueio por instituição e ano | 🟢 |
| `app/Models/SchoolManager.php` | Gestores escolares da unidade | 🟢 |
| `app/Models/Builders/SchoolManagerBuilder.php` | Filtros dos gestores | 🟡 |
| `app/Models/SchoolInep.php` | Código INEP da escola | 🟢 |
| `app/Models/SchoolSpace.php` | Espaços físicos da unidade | 🟢 |
| `app/Models/SchoolNotice.php` | Avisos por escola | 🟢 |
| `app/Models/View/SchoolData.php` | Visão com nome, endereço e telefones da escola | 🟢 |
| `app/Http/Controllers/Api/SchoolController.php` | API paginada de escolas, com processo 561 | 🟢 |
| `app/Http/Controllers/Api/InstitutionController.php` | API paginada de instituições, com processo 753 | 🟢 |
| `app/Http/Controllers/Api/Resource/School/ResourceSchoolController.php` | Recurso simples de escola | 🟢 |
| `app/Http/Controllers/Api/Resource/SchoolAcademicYear/ResourceSchoolAcademicYearController.php` | Recurso simples de ano letivo | 🟢 |
| `ieducar/modules/Api/Views/EscolaCursoController.php` | API de cursos da escola | 🟡 |
| `ieducar/modules/Educacenso/Model/Escola.php` | Modelo legado do Censo para a escola | 🟡 |
| `ieducar/modules/Educacenso/Model/EscolaDataMapper.php` | Mapper de dados do Censo para a escola | 🟡 |
| `app/Models/LegacySchoolClass.php` | Turmas da escola, com lotação e série | 🟢 |
| `app/Services/EnrollmentService.php` | Consumo das travas e da configuração institucional na enturmação | 🟢 |
| `app/Services/RelocationDate/RelocationDateService.php` | Data base de remanejamento da instituição | 🟢 |
| `database/migrations/legacy/2020_01_01_110000_create_pmieducar_escola_table.php` | Estrutura da escola | 🟢 |
| `database/migrations/legacy/2020_01_01_110000_create_pmieducar_escola_ano_letivo_table.php` | Estrutura do ano letivo | 🟢 |
| `database/migrations/legacy/2020_01_01_110000_create_school_managers_table.php` | Estrutura dos gestores | 🟢 |
| `database/migrations/table/2024_04_05_195833_create_school_spaces_table.php` | Estrutura dos espaços | 🟢 |
| `database/migrations/legacy/2020_01_01_110000_create_modules_educacenso_cod_escola_table.php` | Código INEP da escola | 🟢 |
