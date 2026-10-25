# Educacenso (i-Educar legado)

> Unit do plano de extração do Reversa (`granularity = module`). Descreve o **QUE** o módulo de exportação do Censo Escolar legado faz, com rastreabilidade ao código lido.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Visão Geral

O módulo Educacenso do i-Educar produz o arquivo de exportação do Censo Escolar da Educação Básica, instrumento oficial do INEP/MEC que condiciona o repasse do FUNDEB, do PNAE, do PNATE e do PNLD. Ele é composto por quatro camadas encadeadas: a **análise prévia** dos registros, que detecta inconsistências cadastrais antes da geração; o **motor de exportação**, que monta cada registro posicional delimitado por pipe; o **catálogo de regras** que anula campos não aplicáveis; e o **conjunto de validadores** reutilizado tanto pela análise quanto pela camada de cadastro. 🟢

Problema que resolve: entregar ao município um arquivo no layout do INEP sem imperfeição, com a garantia de que nenhum aluno matriculado fique de fora e de que as inconsistências cadastrais sejam corrigidas antes do envio, e não depois do erro no portal do INEP. 🟢

A saída é um arquivo de texto único, com uma linha por registro, no formato `tipo|campo1|campo2|...`, codificado em ISO-8859-1 e nomeado `{codigo_inep_escola}_{ddmm_HHii}.txt`. 🟢 `ieducar/intranet/educar_exportacao_educacenso.php:44-53`

Observação estrutural: o módulo legado está implementado em PHP procedural sobre classes legadas de intranet, com controllers AJAX deprecated (`@deprecated Essa versão da API pública será descontinuada`), e sem qualquer fila, job ou streaming determinístico. A decisão de modernização está registrada em `_reversa_sdd/adrs/005-educacenso-censo-escolar-stateless-batch-export.md`. 🟢

---

## Responsabilidades

- Validar a existência da data de referência do Educacenso na instituição antes de qualquer análise. 🟢 `ieducar/modules/Api/Views/EducacensoAnaliseController.php:2233-2238`
- Auditar os registros 00, 10, 20, 30, 40, 50, 60 (e 89, 90, 91 na segunda fase), apontando a tela de cadastro a corrigir. 🟢 `ieducar/modules/Api/Views/EducacensoAnaliseController.php:2244-2263`
- Emitir o registro 00 com identificação, endereço e caracterização da escola. 🟢 `src/Modules/Educacenso/Data/Registro00.php:60-124`
- Emitir o registro 10 com a infraestrutura escolar: prédio, água, energia, esgotamento, lixo, dependências, acessibilidade, equipamentos, internet, profissionais e instrumentos pedagógicos. 🟢 `src/Modules/Educacenso/Data/Registro10.php:33-221`
- Emitir o registro 20 com turmas, horários, dias da semana, etapa de ensino e áreas do conhecimento. 🟢 `src/Modules/Educacenso/Data/Registro20.php:62-137`
- Emitir o registro 30 com os dados pessoais de gestores, docentes e alunos. 🟢 `ieducar/modules/Api/Views/EducacensoExportController.php:259-370`
- Emitir o registro 40 com o vínculo de cargo, critério de acesso e tipo de vínculo do gestor escolar. 🟢 `ieducar/modules/Api/Views/EducacensoExportController.php:395-403`
- Emitir o registro 50 com a alocação do docente na turma, os componentes curriculares e o itinerário formativo. 🟢 `ieducar/modules/Api/Views/EducacensoExportController.php:432-451`
- Emitir o registro 60 com a matrícula do aluno na turma, o atendimento educacional especializado, o transporte escolar e a escolarização em outro espaço. 🟢 `ieducar/modules/Api/Views/EducacensoExportController.php:479-513`
- Anular, por regra de negócio, todo campo que não se aplica ao contexto do registro. 🟢 `src/Modules/Educacenso/ExportRule/`
- Manter os códigos INEP de escola, docente, aluno e turma, recebidos do INEP no retorno da exportação. 🟢 `database/migrations/legacy/2020_01_01_110000_create_modules_educacenso_cod_escola_table.php:11-27`
- Permitir a consulta paginada dos registros já produzidos, para conferência. 🟢 `app/Http/Controllers/EducacensoController.php:41-118`

---

## Regras de Negócio

- O arquivo é montado na ordem fixa dos tipos de registro 00, 10, 20, 30, 40, 50, 60 e 99, e cada linha é serializada com `implode('|', $array)` seguida de `trim()`. 🟢 `ieducar/modules/Api/Views/EducacensoExportController.php:129-146` e `src/Modules/Educacenso/ArrayToCenso.php:7-10`
- O registro 99 é um literal fixo `99|`, sem totalizadores de linha. 🟢 `ieducar/modules/Api/Views/EducacensoExportController.php:539-542`
- Se a escola não estiver em atividade, a exportação dos registros 10, 20, 50 e 60 é suprimida, mas os registros 00, 30 e 40 e o fechamento 99 são mantidos. 🟢 `ieducar/modules/Api/Views/EducacensoExportController.php:129-146` e `:197`
- O código INEP da escola é truncado nos 8 primeiros caracteres antes da exportação. 🟢 `src/Modules/Educacenso/Data/Registro00.php:129`
- A exportação só prossegue quando a escola possui código INEP; caso contrário, a operação retorna `error = true` com a mensagem que aponta para endereço normalizado, código do INEP e dados do gestor. 🟢 `ieducar/modules/Api/Views/EducacensoExportController.php:192-195`
- A análise prévia roda sequencialmente sobre a lista de registros, e a lista depende de a escola estar em andamento: `['00','10','20','30','40','50','60']` quando está, `['00','30','40']` quando não está. 🟢 `public/vendor/legacy/Educacenso/Assets/Javascripts/Educacenso.js:2-16` e `:94`
- Qualquer mensagem de análise marcada com `fail = true` impede a exportação e substitui o download por um relatório HTML com os links de correção. 🟢 `public/vendor/legacy/Educacenso/Assets/Javascripts/Educacenso.js:157-186`
- A análise do Registro 30 é executada por seis classes de papel: comum, gestor, docente, aluno, docente e gestor, docente e aluno. 🟢 `src/Modules/Educacenso/Analysis/`
- No Registro 30, o identificador INEP da pessoa é o do aluno quando a pessoa é estudante e o do servidor nos demais papéis. 🟢 `app/Models/Educacenso/Registro30.php:247-254`
- No Registro 30, a justificativa de falta de documentação só é mantida quando a pessoa não tem CPF, NIS nem certidão de nascimento. 🟢 `app/Models/Educacenso/Registro30.php:242-245` e `src/Modules/Educacenso/ExportRule/RegrasGeraisRegistro30.php`
- A deficiência múltipla é marcada quando há mais de uma das oito deficiências de marcação combinável (cegueira, baixa visão, surdez, auditiva, surdocegueira, física, intelectual, monocular). 🟢 `app/Models/Educacenso/Registro30.php:259-280`
- A análise do Registro 30 exige nome, data de nascimento, sexo, raça, nacionalidade e naturalidade, e rejeita data de nascimento posterior à data de referência do Educacenso da instituição. 🟢 `src/Modules/Educacenso/Analysis/Register30CommonDataAnalysis.php:29-99`
- O povo indígena só é aceito quando a raça é a 5, e é rejeitado quando a raça não é a 5. 🟢 `src/Modules/Educacenso/Analysis/Register30CommonDataAnalysis.php:100-128`
- Pessoa estrangeira exige o país de nacionalidade, e esse país não pode ser o Brasil, representado pelo código 76. 🟢 `src/Modules/Educacenso/Analysis/Register30CommonDataAnalysis.php:129-158`
- O CPF é obrigatório para gestor e docente, exceto para pessoa estrangeira; para aluno, é aviso não impeditivo nas etapas 67, 69, 70, 71, 72, 73 e 74. 🟢 `src/Modules/Educacenso/Analysis/Register30ManagerDataAnalysis.php:26-37`, `Register30TeacherDataAnalysis.php:26-37` e `Register30StudentDataAnalysis.php:37-51`
- O e-mail é obrigatório apenas para o gestor escolar. 🟢 `src/Modules/Educacenso/Analysis/Register30ManagerDataAnalysis.php:38-49`
- Aluno em turma de AEE ou em curso de educação especial exige ao menos uma deficiência registrada; aluno em turma de classe especial exige ao menos um transtorno registrado. 🟢 `src/Modules/Educacenso/Analysis/Register30StudentDataAnalysis.php:52-84`
- Aluno com deficiência ou transtorno exige ao menos um recurso de realização de provas, e a combinação de recursos e deficiências é validada por `InepExamValidator`. 🟢 `src/Modules/Educacenso/Analysis/Register30StudentDataAnalysis.php:85-108`
- A certidão de nascimento no formato novo deve ter 32 dígitos, com ano de registro entre o ano de nascimento e o ano corrente. 🟢 `src/Modules/Educacenso/Analysis/Register30StudentDataAnalysis.php:109-147`
- Para docente e gestor, a escolaridade é obrigatória; ensino médio exige o tipo de ensino médio cursado; e a pós-graduação exige área e ano de conclusão. 🟢 `src/Modules/Educacenso/Analysis/Register30TeacherAndManagerDataAnalysis.php:26-77`
- Para docente e gestor, a formação continuada é obrigatória, e a marcação de "nenhum" é rejeitada quando há mais de um curso informado. 🟢 `src/Modules/Educacenso/Analysis/Register30TeacherAndManagerDataAnalysis.php:78-103`
- Para docente e gestor com escolaridade de ensino superior, curso, ano de conclusão e instituição são obrigatórios, o ano de conclusão deve estar entre 1940 e o ano corrente, e o curso não pode ser um dos extintos no Censo de 2020. 🟢 `src/Modules/Educacenso/Analysis/Register30TeacherAndManagerDataAnalysis.php:104-167`
- Para docente e aluno residentes no Brasil, a zona de residência é obrigatória, e localização diferenciada de assentamento é rejeitada em zona urbana. 🟢 `src/Modules/Educacenso/Analysis/Register30TeacherAndStudentDataAnalysis.php:26-51`
- O registro 00 anula o início e o fim do ano letivo, a regulamentação, a unidade vinculada e todos os campos de mantenedora e de CNPJ quando a escola não está em atividade. 🟢 `src/Modules/Educacenso/ExportRule/SituacaoFuncionamento.php:16-38`
- O registro 00 anula os campos de mantenedora, categoria de escola privada, poder público conveniado e CNPJ quando a dependência administrativa não é privada. 🟢 `src/Modules/Educacenso/ExportRule/DependenciaAdministrativa.php:16-33`
- O registro 00 anula a esfera administrativa quando o validador de domínio administrativo reprova o par esfera e dependência com o município. 🟢 `src/Modules/Educacenso/ExportRule/EsferaAdministrativa.php:16-29`
- No registro 40, o critério de acesso é anulado quando o cargo do gestor é "outro" ou quando a escola não está em atividade. 🟢 `src/Modules/Educacenso/ExportRule/CargoGestor.php:16-25` e `CriterioAcessoGestor.php:16-25`
- No registro 40, o tipo de vínculo é anulado quando a escola não está em atividade ou quando a dependência administrativa é privada. 🟢 `src/Modules/Educacenso/ExportRule/TipoVinculoGestor.php:16-25` e `CargoGestor.php:16-25`
- No registro 50, o tipo de vínculo é anulado quando a escola é privada ou quando a função exercida não é de docente, docente titular de EAD ou docente tutor de EAD. 🟢 `src/Modules/Educacenso/ExportRule/TipoVinculoServidor.php:16-31`
- No registro 50, os componentes curriculares são anulados quando a função não é docente, quando a etapa é 1, 2 ou 3, ou quando a turma não possui atendimento curricular. 🟢 `src/Modules/Educacenso/ExportRule/ComponentesCurriculares.php:16-39`
- No registro 50, as unidades curriculares e a área do itinerário formativo são anuladas fora das funções de docente e fora das organizações curriculares de itinerário formativo e de itinerário de aprofundamento. 🟢 `src/Modules/Educacenso/ExportRule/UnidadesCurricularesServidor.php:16-35` e `AreaItinerarioFormativo.php:16-33`
- No registro 20, as áreas do conhecimento só são exportadas quando a turma é curricular e a etapa não é 1, 2 ou 3. 🟢 `src/Modules/Educacenso/Data/Registro20.php:64`
- No registro 20, cada área do conhecimento vale 1 quando a turma oferece a disciplina e 0 quando não oferece; o vínculo de docente não altera o valor exportado. 🟢 `src/Modules/Educacenso/Data/Registro20.php:143-150`
- No registro 20, a carga horária total só é exportada em turmas de itinerário de formação técnica e profissional ou nas etapas que a permitem. 🟢 `src/Modules/Educacenso/Data/Registro20.php:97`
- No registro 20, turma de turno integral com estudantes distribuídos em mais de um período é duplicada em uma linha por período, com sufixo no código e sufixo no nome e troca dos horários de manhã e de tarde. 🟢 `src/Modules/Educacenso/Data/Registro20.php:185-221`
- No registro 60, a etapa do aluno é anulada quando a etapa da turma não está na lista 3, 22, 23, 72, 56 e 64. 🟢 `src/Modules/Educacenso/ExportRule/TurmaMulti.php:16-27`
- No registro 60, a carga horária integralizada é anulada quando não há itinerário de formação técnica e profissional e a etapa não permite carga integralizada; quando permitida e vazia, vale zero. 🟢 `src/Modules/Educacenso/ExportRule/CargaHorariaIntegralizada.php:16-36`
- No registro 60, os onze campos de atendimento educacional especializado são anulados quando a turma não possui o tipo de atendimento AEE. 🟢 `src/Modules/Educacenso/ExportRule/TiposAee.php:16-36`
- No registro 60, o campo de escolarização em outro espaço é anulado quando a turma não é curricular, quando a mediação não é presencial ou quando o local de funcionamento não é o esperado. 🟢 `src/Modules/Educacenso/ExportRule/RecebeEscolarizacaoOutroEspaco.php:16-28`
- No registro 60, a declaração de transporte público é anulada quando a turma não é curricular, quando a mediação não é presencial nem semipresencial, ou quando o aluno não reside no Brasil. 🟢 `src/Modules/Educacenso/ExportRule/TransporteEscolarPublico.php:16-29`
- No registro 60, as dez flags de tipologia de veículo são anuladas quando não há transporte público, e o poder público responsável é anulado quando o transporte público é zero. 🟢 `src/Modules/Educacenso/ExportRule/VeiculoTransporte.php:16-34` e `PoderPublicoResponsavelTransporte.php:16-25`
- No registro 30, os campos de recurso de prova, NIS e certidão são anulados para quem não é aluno; os campos de endereço de residência são anulados para o gestor que não é docente; os campos de formação são anulados para o aluno; a complementação pedagógica é anulada para quem não é docente; e o e-mail é anulado para quem não é gestor. 🟢 `src/Modules/Educacenso/ExportRule/RegrasEspecificasRegistro30.php:16-97`
- No registro 30, município de nascimento é anulado para estrangeiro e naturalizado brasileiro; os campos de deficiência, de transtorno, de recurso de prova e de endereço são anulados conforme as condições de nacionalidade, deficiência, transtorno, país de residência e escolaridade. 🟢 `src/Modules/Educacenso/ExportRule/RegrasGeraisRegistro30.php:16-118`
- Os servidores exportados no registro 30 são os servidores ativos vinculados a turma ativa do ano, sem alocação com data de admissão posterior ao fim do período, e com ao menos uma matrícula ativa no período. 🟢 `ieducar/modules/Api/Views/EducacensoExportController.php:154-183`
- A exclusão do registro 60 depende da data de referência da instituição: considera a enturmação anterior e a exclusão posterior ou igual à data de referência, e desempata pela enturmação mais antiga. 🟢 `database/sqls/views/public.educacenso_record60.sql:70-95`
- O registro 60 exclui turmas marcadas como "não informar no Educacenso". 🟢 `database/sqls/views/public.educacenso_record60.sql:67`
- O download é bloqueado quando a configuração `legacy.educacenso.enable_export` está desligada, com mensagem de que o INEP está atualizando as regras do Censo Escolar de 2026. 🟢 `public/vendor/legacy/Educacenso/Assets/Javascripts/Educacenso.js:47-52` e `:226-234`
- O arquivo exportado é convertido de UTF-8 para ISO-8859-1 e nomeado com o código INEP da escola e a data e hora da geração. 🟢 `ieducar/intranet/educar_exportacao_educacenso.php:44-53`
- A exportação exige a permissão do processo de menu 846 com nível de acesso 7, e redireciona para `educar_index.php` quando o usuário não a possui. 🟢 `ieducar/modules/Api/Views/EducacensoExportController.php:120-127` e `ieducar/intranet/educar_exportacao_educacenso.php:23-31`
- Não existe, no legado, hash de integridade do arquivo exportado, rastreabilidade de quem exportou, nem registro do histórico de exportações. 🔴

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | O sistema deve validar a existência da data de referência do Educacenso na instituição antes de iniciar a análise. | Must | Dado uma instituição sem `data_educacenso`, quando a análise for iniciada, então a resposta indica instituição inválida e nenhuma exportação é executada. |
| RF-02 | O sistema deve auditar os registros do Censo Escolar por tipo, devolvendo para cada inconsistência o texto, o caminho do cadastro e o vínculo direto com a tela de correção. | Must | Dado uma pessoa sem data de nascimento, quando o registro 30 for auditado, então a resposta contém mensagem com `fail = true`, o caminho do campo e o link para a ficha da pessoa. |
| RF-03 | O sistema deve bloquear a exportação quando a análise produzir ao menos uma mensagem impeditiva, exibindo o relatório de pendências no lugar do arquivo. | Must | Dado uma análise com mensagem `fail = true`, quando a exportação for solicitada, então o arquivo não é baixado e o relatório HTML é apresentado. |
| RF-04 | O sistema deve manter a ordem de emissão dos tipos de registro 00, 10, 20, 30, 40, 50, 60 e 99 no arquivo gerado. | Must | Dado uma escola em atividade com turmas e matrículas, quando o arquivo for gerado, então as linhas aparecem agrupadas por tipo na ordem crescente e a última linha é `99|`. |
| RF-05 | O sistema deve serializar cada registro como linha posicional delimitada pelo caractere pipe. | Must | Dado um registro com 53 campos, quando for serializado, então a linha contém exatamente 53 segmentos separados por `|`. |
| RF-06 | O sistema deve suprimir os registros 10, 20, 50 e 60 quando a escola não estiver em atividade, mantendo os registros 00, 30, 40 e 99. | Must | Dado uma escola extinta, quando o arquivo for gerado, então não há linha de tipo 10, 20, 50 ou 60 e há linha de tipo 00, 30, 40 e 99. |
| RF-07 | O sistema deve recusar a exportação quando a escola não possuir código INEP, indicando os dados faltantes. | Must | Dado uma escola sem código INEP, quando a exportação for solicitada, então a resposta traz `error = true` e mensagem sobre endereço normalizado, código do INEP e dados do gestor. |
| RF-08 | O sistema deve emitir o registro 00 com a identificação, o endereço e a caracterização da escola, truncando o código INEP em 8 dígitos. | Must | Dado um código INEP com mais de 8 dígitos, quando o registro 00 for gerado, então o campo exportado contém os 8 primeiros dígitos. |
| RF-09 | O sistema deve emitir o registro 10 com a infraestrutura escolar, anulando os campos de mantenedora e de CNPJ em escola não privada. | Must | Dado uma escola pública, quando o registro 10 for gerado, então os campos de mantenedora, categoria de escola privada e CNPJ ficam vazios. |
| RF-10 | O sistema deve emitir o registro 20 com uma linha por turma, expandindo turmas de turno integral em uma linha por período atendido. | Must | Dado uma turma integral com estudantes de manhã e de tarde, quando o registro 20 for gerado, então há duas linhas com códigos distintos e horários correspondentes ao período. |
| RF-11 | O sistema deve exportar as áreas do conhecimento do registro 20 apenas para turmas curriculares de etapa diferente de 1, 2 e 3, com valor 1 quando a disciplina é oferecida e 0 quando não é. | Must | Dado uma turma curricular de etapa 14 que oferece matemática, quando o registro 20 for gerado, então o campo de matemática vale 1 e o de química vale 0. |
| RF-12 | O sistema deve emitir o registro 30 para gestores, docentes e alunos, com o identificador INEP correspondente ao papel da pessoa. | Must | Dado um aluno com código INEP e um docente com código INEP, quando o registro 30 for gerado, então cada linha traz o código INEP do seu próprio papel. |
| RF-13 | O sistema deve anular, no registro 30, os campos que não se aplicam ao papel da pessoa, conforme as regras geral e específica do registro. | Must | Dado um aluno, quando o registro 30 for gerado, então o campo de escolaridade e o de formação continuada ficam vazios; dado um gestor que não é docente, então o CEP fica vazio. |
| RF-14 | O sistema deve exigir CPF do gestor e do docente, exceto para pessoa estrangeira, e emitir aviso não impeditivo quando o aluno de etapa 67 a 74 não tiver CPF. | Must | Dado um docente brasileiro sem CPF, quando o registro 30 for auditado, então a mensagem é impeditiva; dado um aluno de etapa 72 sem CPF, então a mensagem é de aviso. |
| RF-15 | O sistema deve exigir ao menos uma deficiência ou transtorno para aluno em AEE, em educação especial ou em classe especial, e ao menos um recurso de prova quando houver deficiência. | Must | Dado um aluno em turma de AEE sem deficiência registrada, quando o registro 30 for auditado, então a mensagem é impeditiva apontando o campo de deficiências. |
| RF-16 | O sistema deve validar a certidão de nascimento no formato novo quanto ao tamanho de 32 dígitos e à coerência do ano de registro. | Must | Dado uma certidão com 20 dígitos, quando o registro 30 for auditado, então a mensagem é impeditiva informando a exigência de 32 dígitos. |
| RF-17 | O sistema deve emitir o registro 40 com cargo, critério de acesso e tipo de vínculo do gestor, anulando o critério de acesso e o tipo de vínculo conforme a situação da escola. | Must | Dado um gestor com cargo "outro", quando o registro 40 for gerado, então o campo de critério de acesso fica vazio. |
| RF-18 | O sistema deve emitir o registro 50 com a alocação do docente na turma, os 25 campos de componente curricular e as flags de itinerário formativo. | Must | Dado um docente alocado em turma de etapa 14, quando o registro 50 for gerado, então a linha tem 38 campos e os componentes da etapa são preenchidos. |
| RF-19 | O sistema deve emitir o registro 60 com a matrícula do aluno na turma, os campos de AEE, de transporte escolar e de escolarização em outro espaço. | Must | Dado um aluno matriculado em turma com AEE, quando o registro 60 for gerado, então os campos de atendimento educacional especializado são preenchidos e a etapa do aluno segue a regra de turma multi. |
| RF-20 | O sistema deve suprimir as flags de tipologia de veículo e o poder público responsável quando o aluno não utilizar transporte escolar público. | Must | Dado um aluno sem transporte público, quando o registro 60 for gerado, então as dez flags de veículo e o poder público responsável ficam vazios. |
| RF-21 | O sistema deve manter e consultar os códigos INEP de escola, docente, aluno e turma atribuídos pelo INEP. | Must | Dado o retorno do INEP, quando for processado, então o código fica vinculado à entidade correspondente e aparece no registro exportado. |
| RF-22 | O sistema deve oferecer consulta paginada dos registros de turma, gestor, docente e aluno produzidos para a escola e o ano informados. | Must | Dado uma escola com turmas no ano, quando a consulta de registro 20 for feita, então a resposta traz as turmas ordenadas por nome e código, paginadas. |
| RF-23 | O sistema deve expor validação pontual de nome, data de nascimento e certidão de nascimento para uso no formulário de cadastro. | Must | Dado um nome inválido, quando a validação for chamada, então a resposta traz `success = false` e a mensagem do validador. |
| RF-24 | O sistema deve permitir desligar a exportação por configuração, mantendo a explicação da indisponibilidade para o usuário. | Must | Dado `enable_export` desligado, quando a exportação for concluída, então o usuário recebe a mensagem de indisponibilidade e o arquivo não é baixado. |

---

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Segurança | A exportação exige a permissão de processo 846 com nível de acesso 7 e redireciona o usuário sem permissão para a página inicial. | `ieducar/modules/Api/Views/EducacensoExportController.php:120-127` | 🟢 |
| Segurança | A consulta de registros e a validação pontual exigem autenticação de sessão do intranet. | `ieducar/intranet/educar_exportacao_educacenso.php:23-31` | 🟡 |
| Performance | A geração é totalmente síncrona e em memória: todo o conteúdo do arquivo é montado como uma string única e devolvido no corpo JSON. | `ieducar/modules/Api/Views/EducacensoExportController.php:101-115` | 🟢 |
| Performance | As análises são disparadas em requisições HTTP sequenciais, uma por registro, com espera do retorno de cada uma. | `public/vendor/legacy/Educacenso/Assets/Javascripts/Educacenso.js:103-124` | 🟢 |
| Performance | As listas de registros são consultadas por paginação de banco, com ordenação determinística em dois níveis. | `app/Http/Controllers/EducacensoController.php:55-108` | 🟢 |
| Integridade | A ordem de emissão das linhas é determinada pelo código de registro, sem ordenação explícita por chave de negócio. | `ieducar/modules/Api/Views/EducacensoExportController.php:129-146` | 🟡 |
| Isolamento | O legado opera em base municipal única; a migração para o SYSGOV exige `tenant_id` em lotes, mapeamentos e Issues de validação. | `app/Repositories/EducacensoRepository.php:8-20` | 🟡 |
| Compatibilidade | O arquivo é entregue em ISO-8859-1, exigido pelo portal do INEP. | `ieducar/intranet/educar_exportacao_educacenso.php:44-46` | 🟢 |
| Compatibilidade | O layout do INEP muda por portaria anual; o legado mantém o formato de 2020 em migrations de migração de layout. | `src/Modules/Educacenso/Migrations/UpdateEducacensoInstitutionToLayout2020.php` e `UpdateSchoolClassToLayout2020.php` | 🟢 |
| Auditabilidade | A única rastreabilidade da exportação é o usuário executor, herdado da sessão; não há registro de arquivo gerado. | `ieducar/intranet/educar_exportacao_educacenso.php:23-31` | 🔴 |
| Disponibilidade | Não há repetição, degradação nem circuit breaker no caminho de exportação. | ausência de evidência no código lido | 🔴 |
| Observabilidade | As mensagens de análise carregam texto, caminho do campo e link de correção, e a falha é sinalizada por `fail`. | `ieducar/modules/Api/Views/EducacensoAnaliseController.php:101-110` | 🟢 |

> Inferido a partir do código. Validar com equipe de operações.

---

## Critérios de Aceitação

```gherkin
Dado uma instituição sem data de referência do Educacenso
Quando o usuário iniciar a análise da exportação
Então o sistema informa que a instituição é inválida e nenhuma exportação é executada

Dado uma pessoa física sem data de nascimento vinculada à escola
Quando a análise do registro 30 for executada
Então o sistema devolve mensagem impeditiva com o caminho do campo e o link da ficha da pessoa

Dado uma escola extinta no ano corrente
Quando a exportação for gerada
Então o arquivo não contém linhas dos registros 10, 20, 50 e 60 e contém a linha de fechamento 99

Dado uma escola em atividade com turmas, docentes e matrículas
Quando a exportação for gerada
Então o arquivo é entregue em ISO-8859-1 com nome formado pelo código INEP e pela data e hora da geração

Dado uma turma integral com estudantes de manhã e de tarde
Quando o registro 20 for gerado
Então a turma aparece em duas linhas, com horários de manhã e de tarde respectivamente

Dado um aluno matriculado em turma de etapa 14 que oferece matemática
Quando o registro 20 for gerado
Então o campo de matemática vale 1 e o campo de química vale 0

Dado um aluno sem transporte escolar público
Quando o registro 60 for gerado
Então as flags de tipologia de veículo e o poder público responsável do transporte ficam vazios

Dado um docente brasileiro sem CPF
Quando a análise do registro 30 for executada
Então a mensagem sobre o CPF é impeditiva e impede a exportação

Dado um aluno de etapa 72 sem CPF
Quando a análise do registro 30 for executada
Então a mensagem sobre o CPF é de aviso e não impede a exportação

Dado uma escola pública
Quando o registro 00 for gerado
Então os campos de mantenedora, categoria de escola privada e CNPJ ficam vazios

Dado a configuração de exportação desligada
Quando a exportação for concluída com sucesso
Então o usuário recebe a mensagem de indisponibilidade da funcionalidade e o arquivo não é baixado
```

---

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Geração do arquivo nos tipos 00 a 60 e 99 | Must | É o entregável do módulo e o insumo do repasse do FUNDEB |
| Auditoria prévia com bloqueio da exportação | Must | Evita o retrabalho de corrigir erros no portal do INEP |
| Regras de anulação por contexto de registro | Must | Sem elas o arquivo é rejeitado pelo INEP |
| Registro 30 com papel da pessoa | Must | Concentra a maior parte dos campos e das regras de consistência |
| Registro 60 com matrícula, AEE e transporte | Must | Carrega a identificação de transporte usada no PNATE |
| Registro 20 com turmas e áreas do conhecimento | Must | Descreve a oferta registrada e é base do FUNDEB |
| Registro 10 com infraestrutura | Must | Obrigatório no layout do INEP e hoje com 187 campos |
| Registro 40 com vínculo do gestor | Must | Obrigatório no layout do INEP |
| Registro 50 com alocação docente | Must | Obrigatório no layout do INEP |
| Manutenção dos códigos INEP por papel | Must | Sem o código INEP a pessoa não é identificada no arquivo |
| Consulta paginada dos registros | Should | Existe para conferência e não participa do arquivo final |
| Validação pontual exposta por HTTP | Should | Reutiliza os validadores no formulário de cadastro |
| Bloqueio da exportação por configuração | Should | Presente no legado para o ajuste do layout de 2026 |
| Exportação assíncrona com streaming e hash | Could | Ausente no legado e decidido no ADR-005 como arquitetura alvo |
| Importação do arquivo de retorno do INEP em lote | Could | Existe a tabela `educacenso_imports` e a tela de listagem, mas não há controller que a use |
| Totalizadores por tipo no registro 99 | Could | Ausente no legado, em que o registro 99 é literal |

> Prioridade inferida por frequência de chamada e posição na cadeia de dependências.

---

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `ieducar/modules/Api/Views/EducacensoExportController.php` | `educacensoExport`, `exportaDadosCensoPorEscola` e um método por tipo de registro | 🟢 |
| `ieducar/modules/Api/Views/EducacensoAnaliseController.php` | Auditoria por registro, `validaInstituicao`, `schoolIsActive` | 🟢 |
| `public/vendor/legacy/Educacenso/Assets/Javascripts/Educacenso.js` | Orquestração da análise sequencial e do download | 🟢 |
| `ieducar/intranet/educar_exportacao_educacenso.php` | Tela de exportação, nome do arquivo, conversão de codificação | 🟢 |
| `src/Modules/Educacenso/Data/AbstractRegistro.php` | Hidratação do modelo de registro | 🟢 |
| `src/Modules/Educacenso/Data/Registro00.php` | Montagem do registro 00 | 🟢 |
| `src/Modules/Educacenso/Data/Registro10.php` | Montagem do registro 10 | 🟢 |
| `src/Modules/Educacenso/Data/Registro20.php` | Montagem do registro 20 e expansão por período | 🟢 |
| `src/Modules/Educacenso/Data/Registro30.php` | Composição do registro 30 por papel | 🟢 |
| `src/Modules/Educacenso/Data/Registro40.php` | Montagem do registro 40 | 🟢 |
| `src/Modules/Educacenso/Data/Registro50.php` | Montagem do registro 50 | 🟢 |
| `src/Modules/Educacenso/Data/Registro60.php` | Montagem do registro 60 | 🟢 |
| `src/Modules/Educacenso/ExportRule/EducacensoExportRule.php` | Contrato comum das regras de exportação | 🟢 |
| `src/Modules/Educacenso/ExportRule/` | Regras de anulação por tipo de registro | 🟢 |
| `src/Modules/Educacenso/Analysis/AnalysisInterface.php` | Contrato comum das classes de análise | 🟢 |
| `src/Modules/Educacenso/Analysis/` | Análises do registro 30 por papel | 🟢 |
| `src/Modules/Educacenso/Validator/` | Dezoito validadores de domínio | 🟢 |
| `src/Modules/Educacenso/Model/` | Catálogos de valores do INEP e das turmas | 🟢 |
| `src/Modules/Educacenso/ArrayToCenso.php` | Serialização posicional por pipe | 🟢 |
| `src/Modules/Educacenso/Formatters.php` | Normalização de texto, número e data | 🟢 |
| `src/Modules/Educacenso/Migrations/` | Migração do layout de 2020 | 🟢 |
| `app/Repositories/EducacensoRepository.php` | SQL de coleta e builders das visões de registro | 🟢 |
| `app/Models/Educacenso/RegistroEducacenso.php` | Interface comum dos registros | 🟢 |
| `app/Models/Educacenso/Registro30.php` | Papel da pessoa, identificação INEP, deficiências, cursos extintos | 🟢 |
| `app/Http/Controllers/EducacensoController.php` | Consulta paginada dos registros | 🟢 |
| `app/Http/Controllers/Educacenso/ValidatorController.php` | Exposição HTTP dos validadores pontuais | 🟢 |
| `resources/views/educacenso/consult.blade.php` | Tela de consulta da primeira fase | 🟢 |
| `resources/views/educacenso/import/index.blade.php` | Tela de listagem de importações | 🟡 |
| `database/sqls/views/public.educacenso_record20.sql` | Visão de turmas do registro 20 | 🟢 |
| `database/sqls/views/public.educacenso_record40.sql` | Visão de gestores do registro 40 | 🟢 |
| `database/sqls/views/public.educacenso_record50.sql` | Visão de alocação docente do registro 50 | 🟢 |
| `database/sqls/views/public.educacenso_record60.sql` | Visão de matrículas do registro 60 | 🟢 |
| `database/migrations/legacy/2020_01_01_110000_create_modules_educacenso_cod_escola_table.php` | Código INEP da escola | 🟢 |
| `database/migrations/legacy/2020_01_01_110000_create_modules_educacenso_cod_docente_table.php` | Código INEP do docente | 🟢 |
| `database/migrations/legacy/2020_01_01_110000_create_modules_educacenso_cod_aluno_table.php` | Código INEP do aluno | 🟢 |
| `database/migrations/legacy/2020_01_01_110000_create_modules_educacenso_cod_turma_table.php` | Código INEP da turma | 🟢 |
| `database/migrations/legacy/2020_01_01_110000_create_modules_etapas_curso_educacenso_table.php` | De/para de curso e etapa do INEP | 🟢 |
| `database/migrations/educacenso/2026_05_26_110204_alter_date_educacenso_2026.php` | Data de referência do Educacenso | 🟢 |
| `app/Models/EducacensoImport.php` | Registro de importação de arquivo de retorno | 🔴 |
| `ieducar/modules/Educacenso/Model/` | Modelos legados do Educacenso com mapper de dados | 🔴 |
| `ieducar/modules/Educacenso/Views/IesAjaxController.php` | Consulta de instituições de ensino superior | 🔴 |
