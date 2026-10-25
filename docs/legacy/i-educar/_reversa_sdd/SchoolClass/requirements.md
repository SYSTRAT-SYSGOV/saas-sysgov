# SchoolClass (i-Educar legado)

> Unit do plano de extração do Reversa (`granularity = module`). Descreve o **QUE** o módulo de turmas legado faz, com rastreabilidade ao código lido.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Visão Geral

O módulo SchoolClass do i-Educar mantém a turma: a unidade física, espacial e temporal onde o processo pedagógico acontece. Uma turma amarra escola, ano letivo, curso, série, turno, horários, lotação máxima, tipo de atendimento, calendário e o corpo docente alocado, e é o alvo de todas as operações de matrícula, de diário de classe e de exportação do Censo Escolar. 🟢

Problema que resolve: garantir que exista uma alocação física coerente para cada série ofertada em cada escola e turno, com lotação controlada, com série única ou múltipla explicitada, com corpo docente responsável e com o calendário letivo correto para cada caso. 🟢

O módulo é composto por: a entidade de turma (`pmieducar.turma`), o vínculo de séries da turma multisseriada (`pmieducar.turma_serie`), o vínculo de corpo docente (`modules.professor_turma`) e o código INEP da turma (`modules.educacenso_cod_turma`). Um conjunto de dez regras de validação governa a criação, a edição e a exclusão. 🟢

Observação estrutural: o turno é um código numérico de 1 a 4, com o valor 4 reservado ao turno integral, e é esse mesmo código que identifica o turno parcial de uma enturmação dentro de uma turma integral. 🟢 `src/Modules/SchoolClass/Period.php:8-11`

---

## Responsabilidades

- Registrar a turma com escola, série, curso, nome, sigla, ano letivo, lotação máxima, turno, horários e intervalo. 🟢 `app/Models/LegacySchoolClass.php:86-163`
- Registrar a multisseriada, vinculando as séries e o boletim de cada uma. 🟢 `app/Models/LegacySchoolClassGrade.php:9-27`
- Registrar o corpo docente alocado, com função exercida, tipo de vínculo, período de vigência e permissão de lançamento de faltas. 🟢 `app/Models/LegacySchoolClassTeacher.php:11-28`
- Registrar as disciplinas ministradas por cada docente na turma. 🟢 `app/Models/LegacySchoolClassTeacher.php:74-77`
- Registrar o código INEP da turma, com a distinção entre o código geral e os códigos dos turnos parciais de uma turma integral. 🟢 `app/Services/SchoolClassInepService.php:13-92`
- Controlar a lotação efetiva da turma, descontando as matrículas de dependência. 🟢 `app/Models/LegacySchoolClass.php:269-276`
- Impedir a exclusão de turma com enturmações ativas, exclusão essa sendo lógica. 🟢 `app/Rules/CanDeleteTurma.php:16-24`
- Impedir a criação de turma quando a série habilitada na escola mantém vagas em aberto em turmas do mesmo turno. 🟢 `app/Rules/CanCreateSchoolClass.php:18-61`
- Impedir a alteração da série de uma turma com matrículas vinculadas. 🟢 `app/Rules/CanAlterSchoolClassGrade.php`
- Impedir a remoção de séries da turma multisseriada que tenham matrículas vinculadas. 🟢 `app/Rules/ExistsEnrollmentsInSchoolClassGrades.php`
- Impedir a adição de séries repetidas na turma multisseriada. 🟢 `app/Rules/DuplicateMultiGrades.php`
- Impedir a mudança de uma turma simples para multisseriada quando a série original tem matrículas. 🟢 `app/Rules/IncompatibleChangeToMultiGrades.php`
- Garantir a unicidade do nome da turma por escola, curso, série e ano letivo. 🟢 `app/Rules/CheckSchoolClassExistsByName.php`
- Impedir a alteração do turno de turma integral que contenha estudantes parciais com código INEP de turno parcial. 🟢 `app/Http/Controllers/SchoolClassController.php:50-62`
- Resolver o calendário letivo da turma, distinguindo o calendário padrão da rede do calendário próprio. 🟢 `app/Models/LegacySchoolClass.php:278-311` e `:391-399`
- Resolver a regra de avaliação aplicável, considerando o sinalizador de regra diferenciada da escola. 🟢 `app/Models/LegacySchoolClass.php:648-661`
- Resolver as disciplinas da turma, com três caminhos de resolução conforme a multisseriada e a oferta de componente. 🟢 `app/Models/LegacySchoolClass.php:612-640`
- Informar se a turma permite a carga horária integralizada do aluno. 🟢 `app/Models/LegacySchoolClass.php:686-693`

---

## Regras de Negócio

- O turno tem quatro valores: matutino, vespertino, noturno e integral. 🟢 `src/Modules/SchoolClass/Period.php:8-11`
- A lotação efetiva da turma conta as enturmações ativas cujas matrículas não são de dependência. 🟢 `app/Models/LegacySchoolClass.php:269-276`
- As vagas da turma são a lotação máxima menos a lotação efetiva, e nunca são negativas. 🟢 `app/Models/LegacySchoolClass.php:254-263`
- O bloqueio de enturmação sem vagas é lido na oferta de série da escola; quando a oferta não existe ou não tem o parâmetro definido, o bloqueio é considerado ativo. 🟢 `app/Models/LegacySchoolClass.php:534-545`
- A exclusão de turma é recusada quando a turma possui enturmações ativas. 🟢 `app/Rules/CanDeleteTurma.php:18-21`
- A exclusão de turma é lógica: a atividade é desligada, a visibilidade é desligada e a data de exclusão é gravada. 🟢 `app/Services/SchoolClass/SchoolClassService.php:126-129`
- A verificação de enturmações ativas considera a matrícula do ano da turma, nas situações aprovada, retida e cursando, e ordena pelo sequencial de fechamento. 🟢 `app/Models/LegacySchoolClass.php:471-489`
- O cancelamento em lote de matrícula considera apenas as matrículas ativas, em andamento, do ano da turma e sem solicitação de transferência ativa. 🟢 `app/Models/LegacySchoolClass.php:503-517`
- O bloqueio de criação de turma só é avaliado na criação, e somente quando a oferta de série define a trava. 🟢 `app/Rules/CanCreateSchoolClass.php:24` e `:31`
- A trava de criação de turma varre as turmas ativas da mesma série, escola, turno e ano, com o ano letivo em andamento, e bloqueia quando alguma delas tem vaga em aberto. 🟢 `CanCreateSchoolClass.php:32-57`
- A mensagem de bloqueio de criação informa a quantidade de vagas em aberto e o nome da turma que as contém. 🟢 `CanCreateSchoolClass.php:53`
- O nome da turma deve ser único por escola, curso, série e ano letivo, entre as turmas visíveis e ativas. 🟢 `app/Rules/CheckSchoolClassExistsByName.php:21-40`
- A alteração da série é livre na criação, em turma multisseriada e quando a série não muda. 🟢 `app/Rules/CanAlterSchoolClassGrade.php`
- A alteração da série é bloqueada quando a turma tem enturmação ativa cuja matrícula pertence à série antiga. 🟢 `CanAlterSchoolClassGrade.php`
- A turma multisseriada exige no mínimo duas séries, não repetidas. 🟢 `app/Services/SchoolClass/MultiGradesService.php:24-27` e `app/Rules/DuplicateMultiGrades.php`
- A remoção de uma série da turma multisseriada é bloqueada quando há matrícula ativa naquela série e no ano da turma. 🟢 `app/Rules/ExistsEnrollmentsInSchoolClassGrades.php`
- A mudança de uma turma simples para multisseriada é bloqueada quando a série original não está entre as novas séries e há enturmações ativas. 🟢 `app/Rules/IncompatibleChangeToMultiGrades.php`
- Cada série da turma multisseriada pode ter o seu próprio boletim e o seu próprio boletim diferenciado. 🟢 `app/Models/LegacySchoolClassGrade.php:9-16`
- O turno de uma turma integral não pode ser alterado quando a turma contém estudantes parciais e há códigos INEP de turno parcial informados. 🟢 `app/Http/Controllers/SchoolClassController.php:50-62`
- A turma integral com estudantes parciais pode ter três códigos INEP: o geral, o do matutino e o do vespertino. 🟢 `app/Services/SchoolClassInepService.php:44-92`
- O código INEP geral da turma é gravado sem turno quando a turma não é integral ou quando não há estudantes parciais. 🟢 `SchoolClassInepService.php:45-52`
- Ao gravar um código INEP, os registros anteriores com o mesmo código e outro turno são removidos. 🟢 `SchoolClassInepService.php:13-23`
- A carga horária total da turma só é mantida quando o valor é informado e não vazio. 🟢 `app/Http/Controllers/SchoolClassController.php:198-201`
- O eixo de curso profissional só é mantido quando a etapa do Censo Escolar é uma das etapas de eixo, 67, 68, 73 e 75. 🟢 `SchoolClassController.php:203-211`
- O curso profissional só é mantido quando a etapa do Censo Escolar é uma das etapas técnicas, 39, 40, 64 e 74. 🟢 `SchoolClassController.php:250-255`
- As atividades complementares são anuladas quando o tipo de atendimento da turma não inclui nenhum tipo com atividade complementar. 🟢 `SchoolClassController.php:227-232`
- A marcação de classe especial é anulada quando o tipo de atendimento da turma não inclui nenhum tipo curricular. 🟢 `SchoolClassController.php:228` e `:234-236`
- A turma é marcada como não informada no Censo Escolar por um campo dedicado, e o turno da turma pode ser mantido sem registro. 🟢 `SchoolClassController.php:285-287`
- A exclusão lógica da turma é complementada pela exclusão das séries vinculadas, com regras de incompatibilidade de tipo de ausência, de parecer descritivo e de tipo de recuperação. 🟢 `app/Services/SchoolClass/MultiGradesService.php:26-30`
- O calendário letivo da turma provém do ano letivo da escola quando o curso segue o calendário padrão, e das etapas próprias da turma quando não. 🟢 `app/Models/LegacySchoolClass.php:278-311` e `:391-399`
- A regra de avaliação aplicável é resolvida por série e por ano letivo, e a regra diferenciada prevalece quando a escola a utiliza. 🟢 `app/Models/LegacySchoolClass.php:648-661`
- As disciplinas da turma multisseriada vêm da oferta de disciplina da escola para as séries vinculadas; as demais turmas usam primeiro o componente curricular alocado e, na ausência dele, a oferta de disciplina da série. 🟢 `app/Models/LegacySchoolClass.php:612-640`
- A carga horária da turma é a diferença, em horas, entre o horário de início e o de fim. 🟢 `app/Models/LegacySchoolClass.php:552-561`
- A turma que atende de segunda a sexta é rotulada como tal, e os demais dias são rotulados pela sigla do dia. 🟢 `app/Models/LegacySchoolClass.php:227-245`
- A turma permite carga horária integralizada quando tem itinerário de formação técnica e profissional ou quando está em etapa que a admite. 🟢 `app/Models/LegacySchoolClass.php:686-693`
- A existência de estudantes parciais é determinada a partir da visão do Registro 60 do Censo Escolar, e o resultado é cacheado por cinco minutos. 🟢 `app/Services/SchoolClass/SchoolClassService.php:151-181`
- A listagem de turmas por escola filtra por instituição, ano, escola e turno, e agrega por série com a regra de avaliação aplicável. 🟢 `ieducar/modules/Api/Views/TurmaController.php:209-291`
- A listagem de turmas por escola interpola a lista de escolas e o turno diretamente na consulta. 🟢 `TurmaController.php:221` e `:268`
- A busca por nome da turma ignora acentuação e remove os trechos entre parênteses antes da comparação. 🟢 `app/Models/Builders/LegacySchoolClassBuilder.php:192-197`
- O filtro por série considera a série principal da turma e as séries vinculadas de uma multisseriada. 🟢 `LegacySchoolClassBuilder.php:56-64`
- O filtro por curso considera o curso principal da turma e o curso das séries vinculadas. 🟢 `LegacySchoolClassBuilder.php:117-127`
- A listagem de turmas por escola ordena por atualização, por escola e por nome. 🟢 `ieducar/modules/Api/Views/TurmaController.php:277`
- Não existe, no legado, verificação de que a série habilitada da escola está em acordo com o curso da turma. 🔴
- Não existe, no legado, verificação de que a lotação máxima é compatível com a capacidade da sala ou do tipo de atendimento. 🔴
- Não existe, no legado, registro de auditoria das alterações de turma, e a exclusão lógica não guarda o motivo. 🔴
- Não existe, no legado, verificação de que a escola da turma está habilitada para a série, na ausência de linha de oferta. 🔴

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | O sistema deve registrar a turma com escola, série, curso, nome, sigla, ano letivo, turno, horários, intervalo, lotação máxima e tipo de atendimento. | Must | Dado uma turma válida, quando cadastrada, então todos os campos ficam gravados e são relidos no mesmo formato. |
| RF-02 | O sistema deve calcular a lotação efetiva da turma, descontando as matrículas de dependência. | Must | Dado uma turma com lotação máxima 30 e 25 enturmações ativas, sendo uma de dependência, quando a lotação efetiva for calculada, então o resultado é 24. |
| RF-03 | O sistema deve calcular as vagas da turma, sem resultado negativo. | Must | Dado uma turma lotada acima da capacidade, quando as vagas forem calculadas, então o resultado é zero. |
| RF-04 | O sistema deve permitir bloquear a enturmação sem vagas por série habilitada na escola. | Must | Dado a trava ativa e uma turma sem vaga, quando a enturmação for tentada, então a operação é recusada. |
| RF-05 | O sistema deve recusar a exclusão de turma com enturmações ativas. | Must | Dado uma turma com três enturmações ativas, quando a exclusão for tentada, então a operação é recusada. |
| RF-06 | O sistema deve excluir a turma de forma lógica, desligando atividade, visibilidade e gravando a data de exclusão. | Must | Dado uma turma sem enturmações, quando a exclusão for executada, então a turma fica inativa, invisível e com data de exclusão. |
| RF-07 | O sistema deve impedir a criação de turma quando a série habilitada mantém vagas em aberto em turmas do mesmo turno. | Must | Dado a trava ativa e uma turma existente com 5 vagas, quando a criação for tentada, então a operação é recusada informando as vagas e o nome da turma. |
| RF-08 | O sistema deve permitir a criação de turma quando a trava de vagas em aberto não está ativa na série. | Must | Dado a trava inativa e uma turma existente com vagas, quando a criação for tentada, então a operação é permitida. |
| RF-09 | O sistema deve garantir a unicidade do nome da turma por escola, curso, série e ano letivo. | Must | Dado uma turma ativa e visível com o mesmo nome, quando outra for criada com o mesmo nome no mesmo contexto, então a operação é recusada. |
| RF-10 | O sistema deve permitir o mesmo nome de turma em séries, cursos ou anos diferentes. | Must | Dado uma turma de outra série, quando uma turma com o mesmo nome for criada, então a operação é permitida. |
| RF-11 | O sistema deve permitir a alteração da série de turma sem matrícula vinculada. | Must | Dado uma turma sem enturmação ativa, quando a série for alterada, então a alteração é gravada. |
| RF-12 | O sistema deve impedir a alteração da série de turma com matrícula vinculada à série antiga. | Must | Dado uma turma com enturmação ativa, quando a série for alterada, então a operação é recusada. |
| RF-13 | O sistema deve permitir vincular mais de uma série à turma, com boletim individual por série. | Must | Dado uma turma multisseriada com duas séries, quando as séries forem salvas, então cada uma tem o seu boletim. |
| RF-14 | O sistema deve exigir no mínimo duas séries na turma multisseriada e recusar séries repetidas. | Must | Dado uma seleção de uma série ou com séries repetidas, quando a gravação for tentada, então a operação é recusada. |
| RF-15 | O sistema deve impedir a remoção de série da turma multisseriada com matrícula vinculada. | Must | Dado uma série removida com matrícula ativa, quando a remoção for tentada, então a operação é recusada nomeando as séries. |
| RF-16 | O sistema deve impedir a mudança de turma simples para multisseriada quando a série original tem matrículas. | Must | Dado uma turma simples com enturmações ativas, quando a conversão for tentada, então a operação é recusada. |
| RF-17 | O sistema deve manter o código INEP da turma, com código geral e códigos dos turnos parciais de turma integral. | Must | Dado uma turma integral com estudantes parciais, quando os três códigos forem informados, então os três registros são gravados. |
| RF-18 | O sistema deve impedir a alteração do turno de turma integral com estudantes parciais e códigos INEP de turno parcial. | Must | Dado uma turma integral com estudantes parciais, quando o turno for alterado, então a operação é recusada com o nome do turno atual. |
| RF-19 | O sistema deve manter o corpo docente alocado, com função, tipo de vínculo, vigência e permissão de lançamento. | Must | Dado um docente alocado, quando a alocação for consultada, então o rótulo do tipo de vínculo é devolvido. |
| RF-20 | O sistema deve manter as disciplinas ministradas por cada docente na turma. | Must | Dado um docente alocado com duas disciplinas, quando a alocação for consultada, então as duas disciplinas são devolvidas. |
| RF-21 | O sistema deve resolver o calendário letivo da turma conforme o calendário do curso. | Must | Dado um curso com calendário padrão, quando o início do ano letivo da turma for consultado, então a primeira etapa do ano da escola é devolvida. |
| RF-22 | O sistema deve resolver a regra de avaliação da turma, com a regra diferenciada quando a escola a utiliza. | Must | Dado uma escola com regra diferenciada, quando a regra for resolvida, então a regra diferenciada é devolvida. |
| RF-23 | O sistema deve resolver as disciplinas da turma conforme a multisseriada e a oferta de componente. | Must | Dado uma turma multisseriada, quando as disciplinas forem resolvidas, então a oferta das séries vinculadas é devolvida. |
| RF-24 | O sistema deve informar se a turma permite carga horária integralizada. | Must | Dado uma turma com itinerário de formação técnica e profissional, quando a permissão for consultada, então a resposta é verdadeira. |
| RF-25 | O sistema deve listar as turmas por escola, ano, turno e escola, com a regra de avaliação de cada série. | Must | Dado uma escola com turmas no ano, quando a listagem for feita, então as turmas são devolvidas com as séries e as regras. |
| RF-26 | O sistema deve filtrar turmas por série e por curso, considerando as séries vinculadas da multisseriada. | Must | Dado uma turma multisseriada, quando filtrada por uma das séries vinculadas, então ela é encontrada. |
| RF-27 | O sistema deve filtrar turmas por dia da semana, turno, escola do usuário e ano em andamento. | Must | Dado uma turma de terça-feira, quando filtrada por dia da semana, então ela é encontrada. |
| RF-28 | O sistema deve permitir a ordenação da lista de turmas por nome, sem acento. | Must | Dado duas turmas com nomes acentuados, quando a busca por fragmento sem acento for feita, então ambas são encontradas. |

---

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Integridade | A exclusão de turma é transacionada, com rollback em caso de falha. | `app/Http/Controllers/SchoolClassController.php:145-155` | 🟢 |
| Integridade | A gravação da turma e das suas séries, dos componentes e do código INEP é transacionada. | `SchoolClassController.php:48-126` | 🟢 |
| Integridade | A gravação da turma é validada por cinco regras antes de ser persistida. | `app/Services/SchoolClass/SchoolClassService.php:135-149` | 🟢 |
| Integridade | A gravação das séries da turma multisseriada é validada por sete regras. | `app/Services/SchoolClass/MultiGradesService.php:20-38` | 🟢 |
| Integridade | A exclusão lógica mantém o registro, o que preserva as enturmações e as matrículas históricas. | `app/Services/SchoolClass/SchoolClassService.php:126-129` | 🟢 |
| Performance | A verificação de estudantes parciais é cacheada por cinco minutos, por turma. | `app/Services/SchoolClass/SchoolClassService.php:151-158` | 🟢 |
| Performance | A listagem de turmas por escola agrega por série em uma única consulta. | `ieducar/modules/Api/Views/TurmaController.php:233-278` | 🟢 |
| Performance | A verificação de vagas em aberto percorre as turmas do turno e conta as matrículas de cada uma. | `app/Rules/CanCreateSchoolClass.php:48-57` | 🟡 |
| Integridade | A listagem de turmas por escola interpola a lista de escolas e o turno na consulta, sem parametrização. | `ieducar/modules/Api/Views/TurmaController.php:221` e `:268` | 🟢 |
| Integridade | Os arrays de PostgreSQL são gravados como string entre chaves, e a leitura faz a conversão inversa. | `app/Http/Controllers/SchoolClassController.php:186-195` e `app/Models/LegacySchoolClass.php:445-468` | 🟢 |
| Isolamento | O legado opera em base municipal única; a migração para o SYSGOV exige `tenant_id` em turmas, séries, alocações e códigos INEP. | `database/migrations/legacy/2020_01_01_110000_create_pmieducar_turma_table.php` | 🟡 |
| Observabilidade | A gravação e a exclusão devolvem mensagem de sucesso ou de erro, com status 422 na recusa de validação e 500 na falha inesperada. | `app/Http/Controllers/SchoolClassController.php:127-136` e `:149-158` | 🟢 |
| Observabilidade | A API de recurso de turma dispensa a autorização na indexação, como as demais listas de recurso. | `app/Http/Controllers/Api/SchoolClassController.php:16-21` | 🟢 |
| Auditabilidade | A turma registra o autor do cadastro e o da última alteração, mas não há trilha de conteúdo nem de exclusão. | `app/Models/LegacySchoolClass.php:87-88` | 🔴 |

> Inferido a partir do código. Validar com equipe de operações.

---

## Critérios de Aceitação

```gherkin
Dado uma turma com lotação máxima 30 e 25 enturmações ativas, sendo uma de dependência
Quando a lotação efetiva for calculada
Então o resultado é 24

Dado uma turma lotada acima da capacidade
Quando as vagas forem calculadas
Então o resultado é zero

Dado uma turma com três enturmações ativas
Quando a exclusão for tentada
Então a operação é recusada com a mensagem de que a turma possui enturmações ativas

Dado uma turma sem enturmações
Quando a exclusão for executada
Então a turma fica inativa, invisível e com data de exclusão registrada

Dado a trava de vagas em aberto ativa na série e uma turma existente com 5 vagas no mesmo turno
Quando a criação de uma nova turma for tentada
Então a operação é recusada informando as 5 vagas e o nome da turma existente

Dado uma turma ativa e visível com o mesmo nome, no mesmo curso, série, escola e ano
Quando outra turma com o mesmo nome for criada
Então a operação é recusada

Dado uma turma com enturmação ativa cuja matrícula pertence à série atual
Quando a série for alterada
Então a operação é recusada

Dado uma turma multisseriada com uma série removida que possui matrícula ativa
Quando a remoção for tentada
Então a operação é recusada nomeando a série

Dado uma turma integral com estudantes parciais e códigos INEP de turno parcial
Quando o turno da turma for alterado
Então a operação é recusada com o nome do turno atual

Dado uma turma de terça-feira
Quando a listagem for filtrada por dia da semana
Então a turma é encontrada
```

---

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Cadastro da turma com horários, turno e lotação | Must | Entidade central do módulo e base de matrícula e diário |
| Cálculo de lotação efetiva e de vagas | Must | Governa o bloqueio de enturmação |
| Exclusão lógica com recusa quando há enturmações ativas | Must | Preserva a integridade da matrícula |
| Trava de criação com vagas em aberto | Must | Evita oferta duplicada de vagas na rede |
| Unicidade do nome da turma | Must | Necessária para a operação diária da secretaria |
| Multisseriada com séries, boletins e travas | Must | Usada em zonas rurais e em turmas de progressão |
| Corpo docente alocado e disciplinas | Must | Base do diário de classe e do Registro 50 |
| Código INEP da turma e dos turnos parciais | Must | Condiciona a exportação do Censo Escolar |
| Impedimento de alteração de série com matrícula | Must | Protege a coerência entre matrícula e turma |
| Resolução do calendário letivo da turma | Must | Determina as etapas de avaliação |
| Resolução da regra de avaliação | Must | Determina o boletim e a progressão |
| Resolução das disciplinas da turma | Must | Alimenta a matriz de componentes e o Registro 20 |
| Permissão de carga horária integralizada | Must | Alimenta o Registro 60 |
| Listagem de turmas por escola, com regras por série | Must | Sincronização e conferência |
| Filtros de série, curso, turno, dia e escola do usuário | Must | Navegação em todos os formulários |
| Proibição de alteração do turno de turma integral com parciais | Should | Regra específica do Censo Escolar, presente no legado |
| Verificação de habilitação da série na escola | Could | Ausente no legado |
| Verificação de compatibilidade entre lotação e sala | Could | Ausente no legado |
| Trilha de auditoria das alterações e exclusões de turma | Could | Ausente no legado |

> Prioridade inferida por frequência de chamada e posição na cadeia de dependências.

---

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `app/Models/LegacySchoolClass.php` | Entidade da turma, lotação, vagas, séries, disciplinas, calendário e regra de avaliação | 🟢 |
| `app/Models/Builders/LegacySchoolClassBuilder.php` | Filtros de série, curso, turno, escola, ano e dia da semana | 🟢 |
| `app/Http/Controllers/SchoolClassController.php` | Gravação e exclusão da turma, com normalização dos arrays e dos códigos INEP | 🟢 |
| `app/Http/Controllers/Api/SchoolClassController.php` | API de recurso de turma, com processo 586, calendários e etapas | 🟢 |
| `app/Http/Controllers/Api/Resource/SchoolClass/ResourceSchoolClassController.php` | Recurso simples de turma | 🟢 |
| `app/Services/SchoolClass/SchoolClassService.php` | Gravação, exclusão, validação, calendários e estudantes parciais | 🟢 |
| `app/Services/SchoolClass/MultiGradesService.php` | Validação e gravação das séries da turma multisseriada | 🟢 |
| `app/Services/SchoolClassInepService.php` | Código INEP da turma e dos turnos parciais | 🟢 |
| `app/Services/SchoolClassStageService.php` | Etapas do calendário próprio da turma | 🟢 |
| `app/Rules/CanCreateSchoolClass.php` | Trava de criação com vagas em aberto | 🟢 |
| `app/Rules/CanDeleteTurma.php` | Trava de exclusão com enturmações ativas | 🟢 |
| `app/Rules/CanAlterSchoolClassGrade.php` | Trava de alteração da série | 🟢 |
| `app/Rules/CheckSchoolClassExistsByName.php` | Unicidade do nome da turma | 🟢 |
| `app/Rules/DuplicateMultiGrades.php` | Recusa de séries repetidas | 🟢 |
| `app/Rules/ExistsEnrollmentsInSchoolClassGrades.php` | Recusa de remoção de série com matrícula | 🟢 |
| `app/Rules/IncompatibleChangeToMultiGrades.php` | Recusa da conversão para multisseriada | 🟢 |
| `app/Models/LegacySchoolClassGrade.php` | Vínculo de séries da turma multisseriada | 🟢 |
| `app/Models/LegacySchoolClassTeacher.php` | Alocação docente na turma | 🟢 |
| `app/Models/LegacySchoolClassTeacherDiscipline.php` | Disciplinas ministradas na turma | 🟢 |
| `app/Models/LegacySchoolClassStage.php` | Etapas do calendário próprio da turma | 🟢 |
| `app/Models/LegacySchoolClassType.php` | Tipo de turma | 🟢 |
| `app/Models/SchoolClassInep.php` | Código INEP da turma | 🟢 |
| `src/Modules/SchoolClass/Period.php` | Domínio de turno | 🟢 |
| `ieducar/modules/Api/Views/TurmaController.php` | API de turma, listagem por escola, séries e alunos em exame | 🟢 |
| `ieducar/intranet/educar_turma_cad.php` | Tela de cadastro da turma | 🟡 |
| `ieducar/intranet/educar_turma_det.php` | Tela de detalhe da turma | 🟡 |
| `ieducar/intranet/educar_turma_tipo_cad.php` | Tela de cadastro do tipo de turma | 🟡 |
| `ieducar/intranet/include/pmieducar/clsPmieducarTurma.inc.php` | Classe legada de turma | 🟡 |
| `app/Console/Commands/UpdateSchoolClassGrade.php` | Comando de atualização da série da turma | 🟡 |
| `app/Console/Commands/UpdateSchoolClassPeriod.php` | Comando de atualização do turno da turma | 🟡 |
| `app/Http/Controllers/UpdateSchoolClassReportCardController.php` | Atualização do boletim da turma | 🟡 |
| `app/Http/Controllers/SchoolGradeBatchUpdateController.php` | Atualização em lote das séries | 🟡 |
| `ieducar/modules/ComponenteCurricular/Model/TurmaDataMapper.php` | Gravação em lote dos componentes da turma | 🟡 |
