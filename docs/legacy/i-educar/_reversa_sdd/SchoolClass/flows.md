# SchoolClass (i-Educar legado), Fluxos

> Fluxos da unit de turmas que não cabem no `design.md`.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## 1. Fluxo de cadastro de turma

**Gatilho:** a secretaria cadastra uma nova turma.

1. A tela de cadastro é aberta e os campos da escola, da série, do curso, do ano, do nome, do turno, dos horários e da lotação são preenchidos. 🟢 `ieducar/intranet/educar_turma_cad.php`
2. A requisição é montada com os componentes, a carga horária, os docentes vinculados, as etapas utilizadas, os códigos INEP e as datas das etapas. 🟢 `app/Http/Controllers/SchoolClassController.php:29-43`
3. O estado original da turma, para fins de comparação, é lido antes de qualquer gravação. 🟢 `SchoolClassController.php:44-45` e `:362-388`
4. A transação é aberta. 🟢 `SchoolClassController.php:48`
5. O turno atual da turma é lido, para a verificação de turno integral com estudantes parciais. 🟢 `SchoolClassController.php:50`
6. Os arrays são normalizados em string entre chaves, a carga horária é convertida em inteiro e os campos dependentes da etapa são anulados. 🟢 `SchoolClassController.php:164-294`
7. As cinco regras de validação são aplicadas e a turma é gravada. 🟢 `SchoolClassController.php:65` e `app/Services/SchoolClass/SchoolClassService.php:135-149`
8. Quando a turma é multisseriada, as séries são gravadas com o boletim individual e os componentes anteriores da turma são removidos. 🟢 `SchoolClassController.php:73-91`
9. Quando não é multisseriada, os componentes são regravados em lote e as séries vinculadas são removidas. 🟢 `SchoolClassController.php:92-106`
10. Os códigos INEP são gravados, com o código geral e os dos turnos parciais. 🟢 `SchoolClassController.php:108-114`
11. Quando o curso não segue o calendário padrão, as etapas próprias da turma são gravadas. 🟢 `SchoolClassController.php:116-124`
12. A transação é confirmada e a mensagem de sucesso é devolvida na resposta e na sessão. 🟢 `SchoolClassController.php:126-136`

---

## 2. Fluxo de exclusão de turma

**Gatilho:** a secretaria exclui uma turma.

1. A requisição traz o identificador da turma e a transação é aberta. 🟢 `app/Http/Controllers/SchoolClassController.php:144-146`
2. A turma é carregada e validada contra a regra de enturmações ativas. 🟢 `SchoolClassController.php:147` e `app/Services/SchoolClass/SchoolClassService.php:117-124`
3. Quando há enturmação ativa, a validação falha, a transação é revertida e a mensagem é devolvida com status 422. 🟢 `SchoolClassController.php:149-152`
4. Quando não há enturmação ativa, a atividade, a visibilidade e a data de exclusão são gravadas. 🟢 `app/Services/SchoolClass/SchoolClassService.php:126-129`
5. A transação é confirmada e a mensagem de sucesso é devolvida. 🟢 `SchoolClassController.php:156-158`

---

## 3. Fluxo de recusa de criação com vagas em aberto

**Gatilho:** a secretaria cria uma turma em uma série com a trava ativa.

1. A regra verifica se é criação, e não edição, e se a oferta de série define a trava de abertura de turma com vagas. 🟢 `app/Rules/CanCreateSchoolClass.php:24` e `:31`
2. As turmas ativas da mesma série, escola, turno e ano são listadas, restrito ao ano letivo em andamento. 🟢 `CanCreateSchoolClass.php:32-46`
3. Para cada turma, a lotação efetiva e a lotação máxima são lidas. 🟢 `CanCreateSchoolClass.php:49-50`
4. Quando o saldo é positivo, a validação falha com a quantidade de vagas e o nome da turma. 🟢 `CanCreateSchoolClass.php:51-56`
5. A falha interrompe a gravação antes de qualquer alteração, porque a validação precede o `save`. 🟢 `app/Services/SchoolClass/SchoolClassService.php:106-113`

---

## 4. Fluxo de cadastro de turma multisseriada

**Gatilho:** a secretaria define as séries de uma turma multisseriada.

1. A seleção traz as séries e, para cada uma, o boletim e o boletim diferenciado. 🟢 `app/Http/Controllers/SchoolClassController.php:74-78`
2. A validação exige no mínimo duas séries, sem repetição, e sem série com matrícula que esteja sendo removida. 🟢 `app/Services/SchoolClass/MultiGradesService.php:24-38`
3. A mudança para multisseriada é verificada: quando a turma era simples, a série original precisa permanecer entre as novas, salvo se não houver enturmação ativa. 🟢 `app/Rules/IncompatibleChangeToMultiGrades.php`
4. As séries que saíram são apagadas e as novas são gravadas com o boletim individual. 🟢 `app/Services/SchoolClass/MultiGradesService.php:60-65` e `:84-115`
5. Os componentes curriculares da turma são removidos, porque a oferta passa a ser resolvida pelas séries vinculadas. 🟢 `app/Http/Controllers/SchoolClassController.php:91`

---

## 5. Fluxo de remoção de série da turma multisseriada

**Gatilho:** a secretaria remove uma das séries vinculadas.

1. As séries atuais e as novas são comparadas e a diferença é calculada. 🟢 `app/Services/SchoolClass/MultiGradesService.php:117-127`
2. A validação procura enturmações ativas com matrícula do ano da turma e da série removida. 🟢 `app/Rules/ExistsEnrollmentsInSchoolClassGrades.php`
3. Havendo matrícula, a validação falha com o nome das séries. 🟢 `ExistsEnrollmentsInSchoolClassGrades.php`
4. Não havendo matrícula, a série é removida. 🟢 `MultiGradesService.php:106-113`

---

## 6. Fluxo de conversão de turma simples em multisseriada

**Gatilho:** a secretaria converte uma turma simples em multisseriada.

1. O estado original da turma, com a marca de multisseriada e a série principal, é lido antes da gravação. 🟢 `app/Http/Controllers/SchoolClassController.php:44-45` e `:362-388`
2. A regra compara a marca original, a presença da série original na nova seleção e a lotação efetiva da turma. 🟢 `app/Rules/IncompatibleChangeToMultiGrades.php`
3. Quando a turma era simples, a série original não está entre as novas e há enturmações ativas, a validação falha. 🟢 `IncompatibleChangeToMultiGrades.php`
4. A falha interrompe a gravação, com a transação revertida. 🟢 `app/Http/Controllers/SchoolClassController.php:127-130`

---

## 7. Fluxo de gravação dos códigos INEP da turma

**Gatilho:** a secretaria informa os códigos INEP da turma.

1. Quando há código geral, ele é gravado sem turno, exceto se a turma for integral e tiver estudantes parciais. 🟢 `app/Services/SchoolClassInepService.php:45-53`
2. Antes de gravar, os registros com o mesmo código e outro turno são removidos. 🟢 `SchoolClassInepService.php:14-23`
3. Quando há código do matutino, ele é gravado com o turno da manhã; quando não há, o registro do matutino é removido. 🟢 `SchoolClassInepService.php:57-70`
4. O mesmo procedimento é aplicado ao código do vespertino. 🟢 `SchoolClassInepService.php:71-84`
5. Quando não há código geral, o registro sem turno é removido. 🟢 `SchoolClassInepService.php:54-56`

---

## 8. Fluxo de recusa de alteração do turno

**Gatilho:** a secretaria altera o turno de uma turma integral.

1. O turno atual da turma é lido do banco. 🟢 `app/Http/Controllers/SchoolClassController.php:50`
2. A verificação exige código INEP informado, turno diferente do atual, destino não integral e existência de estudantes parciais. 🟢 `SchoolClassController.php:51-55`
3. Quando as condições se verificam, o nome do turno atual é obtido e a validação falha antes da gravação. 🟢 `SchoolClassController.php:57-62`
4. A transação é revertida e a mensagem é devolvida com status 422. 🟢 `SchoolClassController.php:127-130`

---

## 9. Fluxo de detecção de estudantes parciais

**Gatilho:** o sistema precisa saber se a turma integral tem estudantes em turno parcial.

1. O resultado é procurado no cache, com validade de cinco minutos. 🟢 `app/Services/SchoolClass/SchoolClassService.php:153`
2. Na ausência de cache, os turnos dos estudantes são lidos da visão do Registro 60 do Censo Escolar, com o turno nulo tratado como integral. 🟢 `SchoolClassService.php:167-171`
3. Os turnos são desduplicados e ordenados pela ordem de precedência, integral, manhã, tarde e noite. 🟢 `SchoolClassService.php:172-180`
4. A turma tem estudantes parciais quando há mais de um turno distinto ou quando o único turno não é o integral. 🟢 `SchoolClassService.php:156`

---

## 10. Fluxo de listagem de turmas por escola

**Gatilho:** o cliente sincroniza as turmas de uma rede.

1. A requisição traz a instituição, o ano, a lista de escolas, o turno e a data de alteração. 🟢 `ieducar/modules/Api/Views/TurmaController.php:212-216`
2. A lista de escolas é convertida em lista separada por vírgula e o turno é concatenado na cláusula. 🟢 `TurmaController.php:220-226`
3. Quando há data de alteração, o filtro é aplicado sobre a turma e sobre as regras de avaliação. 🟢 `TurmaController.php:228-231`
4. A consulta agrega as séries da turma, com a regra de avaliação aplicável conforme o sinalizador da escola. 🟢 `TurmaController.php:259-265`
5. O resultado é agrupado por turma e ordenado por atualização, por escola e por nome. 🟢 `TurmaController.php:271-277`
6. As séries são decodificadas do JSON e a resposta é montada. 🟢 `TurmaController.php:282-289`

---

## 11. Fluxos ausentes no legado

Os fluxos abaixo aparecem no desenho do modelo novo, em `_reversa_sdd/SchoolClass/legacy-mapping.md`, e não têm implementação correspondente no código lido. Devem ser tratados como requisito novo, e não como reimplementação. 🔴

- Resource de cálculo de vagas em tempo real, com capacidade total, enturmados e saldo. 🔴
- Resource de verificação de disponibilidade de horário antes da confirmação da enturmação. 🔴
- Resource de descalocação docente, com a verificação de diário e de notas lançadas. 🔴
- Verificação de que a série e o curso estão habilitados na escola. 🔴
- Verificação de compatibilidade entre a lotação máxima e a sala ou o tipo de atendimento. 🔴
- Trilha de auditoria das alterações e das exclusões de turma, com o motivo da exclusão. 🔴
- Invalidação do cache de estudantes parciais quando a enturmação ou o turno muda. 🔴
