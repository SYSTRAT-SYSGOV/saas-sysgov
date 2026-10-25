# Educacenso (i-Educar legado), Fluxos

> Fluxos da unit de exportação do Censo Escolar que não cabem no `design.md`. O fluxo de ciclo completo está em `_reversa_sdd/flowcharts/educacenso.md`.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## 1. Fluxo de exportação do Censo Escolar

**Gatilho:** a secretaria escolar abre a tela de exportação e dispara a análise.

1. A tela valida a instituição e, se a data de referência existir, escolhe a lista de registros a auditar conforme a escola estar ou não em andamento. 🟢 `public/vendor/legacy/Educacenso/Assets/Javascripts/Educacenso.js:88-100`
2. A análise roda registro a registro, com uma requisição HTTP por tipo, e cada resposta traz o título da seção e a lista de pendências. 🟢 `Educacenso.js:103-124`
3. Cada pendência é transformada em item de relatório com o texto, o caminho do campo e o link de correção. 🟢 `Educacenso.js:164-188`
4. Se nenhuma pendência for impeditiva, a tela solicita a exportação ao endpoint de exportação. 🟢 `Educacenso.js:157-161` e `:202-214`
5. O backend monta os registros na ordem 00, 10, 20, 30, 40, 50, 60 e 99, aplicando as regras de anulação de cada tipo antes de serializar. 🟢 `ieducar/modules/Api/Views/EducacensoExportController.php:129-146`
6. O conteúdo é devolvido em uma única string JSON, transferida ao navegador. 🟢 `EducacensoExportController.php:115`
7. O navegador cria um formulário com o conteúdo em campo oculto e submete para a página de exportação. 🟢 `Educacenso.js:245-265`
8. A página converte o conteúdo para ISO-8859-1 e entrega o arquivo como anexo. 🟢 `ieducar/intranet/educar_exportacao_educacenso.php:41-53`

---

## 2. Fluxo de análise com pendência impeditiva

**Gatilho:** uma das análises devolve mensagem com `fail = true`.

1. A tela registra a ocorrência na flag `falhaAnalise` e continua a percorrer os demais registros, para acumular o relatório completo. 🟢 `Educacenso.js:183` e `:186`
2. Ao final da análise, o relatório HTML é escrito na página, substituindo a interface de download. 🟢 `Educacenso.js:157-159`
3. O relatório apresenta cada pendência com o caminho do campo e o link para a tela de correção, o que permite corrigir e reexecutar a análise. 🟢 `Educacenso.js:173-184`
4. O arquivo do Censo não é gerado nem baixado. 🟢 `Educacenso.js:157-162`

---

## 3. Fluxo de exportação com aviso não impeditivo

**Gatilho:** uma das análises devolve mensagem com `fail = false`.

1. A mensagem é exibida no relatório, mas não habilita a flag `falhaAnalise`. 🟢 `Educacenso.js:183`
2. A exportação prossegue normalmente e o arquivo é entregue, com a pendência apenas documentada no relatório. 🟢 `Educacenso.js:157-161`
3. O caso de referência é o aluno de etapa 67 a 74 sem CPF, cuja mensagem é explicitamente formatada como aviso que informa a exportação com o campo vazio. 🟢 `src/Modules/Educacenso/Analysis/Register30StudentDataAnalysis.php:37-51`

---

## 4. Fluxo de supressão por escola fora de atividade

**Gatilho:** a escola está com situação de funcionamento extinta ou paralisada.

1. Na análise, a lista de registros auditados é reduzida a 00, 30 e 40, e a tela de aviso informa que a funcionalidade está suspensa. 🟢 `Educacenso.js:12-16` e `:94`
2. Na exportação, a flag `continuaExportacao` é desligada logo após a montagem do registro 00. 🟢 `EducacensoExportController.php:129` e `:197`
3. Os registros 10, 20, 50 e 60 não são gerados, enquanto 00, 30, 40 e 99 são mantidos. 🟢 `EducacensoExportController.php:131-146`
4. As regras do registro 00 também anulam o ano letivo, a regulamentação e os campos de mantenedora para a mesma situação. 🟢 `src/Modules/Educacenso/ExportRule/SituacaoFuncionamento.php:16-38`

---

## 5. Fluxo de instituição sem data de referência

**Gatilho:** a instituição não possui o campo `data_educacenso` preenchido.

1. A chamada de validação devolve `valid = false` e a análise não começa. 🟢 `ieducar/modules/Api/Views/EducacensoAnaliseController.php:2233-2238`
2. A tela monta o aviso de instituição inválida, explicando que a data de referência corresponde normalmente à última quarta-feira de maio. 🟢 `Educacenso.js:190-200`
3. O relatório é exibido e nenhum arquivo é gerado. 🟢 `Educacenso.js:96-99` e `:157-159`

---

## 6. Fluxo de exportação de turma de turno integral

**Gatilho:** a turma tem turno integral e os estudantes se distribuem em mais de um período.

1. A classe de dados do registro 20 identifica a turma como de turno integral e consulta os períodos dos estudantes. 🟢 `src/Modules/Educacenso/Data/Registro20.php:185-198`
2. Quando há estudantes em mais de um período, a turma é clonada em uma linha por período. 🟢 `Registro20.php:199-217`
3. Cada clone recebe sufixo no código da turma e sufixo no nome, com o nome do período. 🟢 `Registro20.php:203-204`
4. O clone do período da manhã recebe os horários matutinos e o da tarde os vespertinos, e o turno da linha é atualizado. 🟢 `Registro20.php:206-214`
5. A área do conhecimento continua exportada por turma, sem distinção de período. 🟢 `Registro20.php:109-135`

---

## 7. Fluxo de exportação de pessoa do Registro 30

**Gatilho:** a exportação monta a lista de pessoas do registro 30.

1. As três fontes são consultadas: dados comuns de pessoa, dados de servidor e dados de aluno, e o resultado é agregado por papel. 🟢 `ieducar/modules/Api/Views/EducacensoExportController.php:246-249`
2. A mesma pessoa pode ocupar mais de um papel, e o registro é montado com o conjunto de papéis acumulado. 🟢 `app/Models/Educacenso/Registro30.php:221-240`
3. O identificador INEP é escolhido conforme o papel dominante: o do aluno para estudante e o do servidor nos demais casos. 🟢 `Registro30.php:247-254`
4. A regra geral anula município de nascimento para estrangeiro, os campos de deficiência e transtorno na ausência do sinalizador, os campos de recurso de prova na ausência de deficiência, o endereço fora do Brasil e a formação superior fora do grau correspondente. 🟢 `src/Modules/Educacenso/ExportRule/RegrasGeraisRegistro30.php:16-118`
5. A regra específica anula os recursos de prova, o NIS e a certidão para quem não é aluno, o endereço de residência para o gestor que não é docente, a formação para o aluno, a complementação pedagógica para quem não é docente e o e-mail para quem não é gestor. 🟢 `src/Modules/Educacenso/ExportRule/RegrasEspecificasRegistro30.php:16-97`
6. A linha é serializada com 110 campos posicionais. 🟢 `EducacensoExportController.php:259-370`

---

## 8. Fluxo de análise do Registro 30 por papel

**Gatilho:** a análise do registro 30 é executada para uma pessoa.

1. A análise comum verifica nome, data de nascimento, filiação, sexo, raça, povo indígena, nacionalidade, país, naturalidade, endereço e deficiências. 🟢 `src/Modules/Educacenso/Analysis/Register30CommonDataAnalysis.php:29-192`
2. A análise do gestor exige CPF e e-mail. 🟢 `Register30ManagerDataAnalysis.php:26-49`
3. A análise do docente exige CPF. 🟢 `Register30TeacherDataAnalysis.php:26-37`
4. A análise do aluno exige deficiência ou transtorno conforme o tipo de turma, exige recurso de prova quando há deficiência e valida a certidão de nascimento. 🟢 `Register30StudentDataAnalysis.php:37-147`
5. A análise do docente e do gestor exige escolaridade, tipo de ensino médio, pós-graduação, formação continuada e curso superior. 🟢 `Register30TeacherAndManagerDataAnalysis.php:26-167`
6. A análise do docente e do aluno exige zona de residência e valida a localização diferenciada. 🟢 `Register30TeacherAndStudentDataAnalysis.php:26-51`
7. A pessoa com deficiência ou transtorno tem a justificativa de falta de documentação anulada quando possui ao menos um dos três documentos. 🟢 `src/Modules/Educacenso/ExportRule/RegrasGeraisRegistro30.php:74-76`

---

## 9. Fluxo de download do arquivo

**Gatilho:** a exportação termina com sucesso.

1. O navegador dispara o download quando a configuração de exportação está habilitada, ou exibe a mensagem de indisponibilidade quando não está. 🟢 `Educacenso.js:215-243`
2. A mensagem de indisponibilidade informa que o INEP está atualizando as regras do Censo Escolar de 2026. 🟢 `Educacenso.js:47-52`
3. O conteúdo do arquivo é colocado em campo oculto de um formulário com ação na página de exportação, junto do código da escola. 🟢 `Educacenso.js:245-265`
4. A página de exportação busca o código INEP da escola, monta o nome do arquivo, define os cabeçalhos de conteúdo e entrega o corpo convertido para ISO-8859-1. 🟢 `ieducar/intranet/educar_exportacao_educacenso.php:41-53`
5. Não há hash, nem registro de auditoria, nem notificação de conclusão. 🔴

---

## 10. Fluxo de consulta de conferência

**Gatilho:** a secretaria escolar abre a tela de consulta da primeira fase.

1. A tela exige o tipo de registro, a escola e o ano, e sem eles exibe apenas a estrutura vazia. 🟢 `app/Http/Controllers/EducacensoController.php:49-54`
2. O controller monta o builder da visão correspondente, aplica ordenação determinística e pagina o resultado. 🟢 `EducacensoController.php:55-108`
3. No registro 50, a lista de componentes é expandida em descrições legíveis de disciplina. 🟢 `EducacensoController.php:87-95`
4. A tela exibe a tabela paginada do registro escolhido. 🟢 `resources/views/educacenso/consult.blade.php`

---

## 11. Fluxos ausentes no legado

Os fluxos abaixo aparecem no desenho do modelo novo, em `_reversa_sdd/flowcharts/educacenso.md` e em `_reversa_sdd/Educacenso/legacy-mapping.md`, e não têm implementação correspondente no código lido. Devem ser tratados como requisito novo, e não como reimplementação. 🔴

- Geração assíncrona em fila, com streaming determinístico e sem estouro de memória. 🔴
- Compactação do arquivo em ZIP e armazenamento em storage de objetos. 🔴
- Cálculo e conferência do hash SHA-256 do arquivo gerado. 🔴
- Registro do lote de exportação, com autor, instante, situação e contagem de linhas por tipo. 🔴
- Totalizadores por tipo de registro no registro 99. 🔴
- Painel de pendências com separação entre bloqueadores e avisos, servido por API. 🔴
- Motor de regras versionado por ano do Censo, com migração do layout 2020 para o layout vigente. 🔴
- Importação do arquivo de retorno do INEP com atualização massiva dos códigos de escola, docente, aluno e turma. 🔴
- Notificação em tempo real da conclusão do lote ao operador. 🔴
- Verificação de divergência entre a área do conhecimento oferecida e o docente vinculado. 🔴
