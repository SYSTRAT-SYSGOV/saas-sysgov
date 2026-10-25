# Stages (i-Educar legado), Fluxos

> Fluxos da unit de estrutura acadêmica que não cabem no `design.md`.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## 1. Fluxo de verificação de faixa etária na matrícula

**Gatilho:** a secretaria informa a data de nascimento do estudante e a série pretendida.

1. A requisição é aceita somente com instituição, série e data de nascimento. 🟢 `ieducar/modules/Api/Views/SerieController.php:248-251`
2. A série é carregada e a sua faixa etária é lida. 🟢 `SerieController.php:261-262`
3. A verificação de corte etário é executada com a data de nascimento e o ano de referência. 🟢 `SerieController.php:264`
4. A data base de matrícula da instituição é recuperada; quando ela não existe, a verificação é liberada. 🟢 `ieducar/intranet/include/pmieducar/clsPmieducarSerie.inc.php`
5. A data de corte é montada com o ano de referência e o mês e o dia da data base de matrícula. 🟢 `clsPmieducarSerie.inc.php`
6. A idade do estudante é calculada em anos completos, por diferença entre a data de nascimento e a data de corte. 🟢 `clsPmieducarSerie.inc.php`
7. A idade é comparada com o intervalo de idades aceitas, gerado a partir da idade inicial e da idade final da série. 🟢 `clsPmieducarSerie.inc.php`
8. Quando a idade é aceita, o resultado devolve bloqueio falso e mensagem vazia. 🟢 `SerieController.php:269-270`
9. Quando a idade é recusada e a série define alerta ou bloqueio, o resultado devolve a mensagem de faixa etária e o indicador de bloqueio corresponde ao sinalizador da série. 🟢 `SerieController.php:271-277`

---

## 2. Fluxo de gravação do calendário de etapas da turma

**Gatilho:** a secretaria define as etapas de calendário de uma turma de curso com calendário próprio.

1. A requisição traz o módulo de referência, as datas de início e de fim e os dias letivos de cada etapa. 🟢 `app/Http/Controllers/SchoolClassController.php:29-32`
2. A gravação só ocorre quando há ao menos uma data de início e uma de fim. 🟢 `SchoolClassController.php:116`
3. A validação é executada contra a existência de notas e de faltas na etapa, no diário local e no iDiário. 🟢 `app/Services/SchoolClassStageService.php:28-42`
4. As etapas anteriores da turma são apagadas. 🟢 `SchoolClassStageService.php:16`
5. As novas etapas são construídas, com o sequencial a partir de 1, a turma, o módulo, as datas convertidas e os dias letivos. 🟢 `SchoolClassStageService.php:44-64`
6. Cada etapa é gravada individualmente. 🟢 `SchoolClassStageService.php:66-71`

---

## 3. Fluxo de cópia do calendário por mudança de padrão do curso

**Gatilho:** a secretaria altera o padrão de calendário de um curso.

1. A transação é aberta. 🟢 `app/Services/SchoolClassStageService.php:85`
2. As etapas de todas as turmas do curso, no ano informado, são apagadas. 🟢 `SchoolClassStageService.php:93-100`
3. Quando o curso passa a usar o calendário não padrão, as etapas do ano letivo da escola são copiadas para as turmas. 🟢 `SchoolClassStageService.php:89` e `:102-121`
4. A cópia é feita por junção entre a turma e as etapas do ano letivo, extraindo turma, módulo, sequencial, datas e dias letivos. 🟢 `SchoolClassStageService.php:102-111`
5. A inserção é feita em bloco, sem passar pelo modelo. 🟢 `SchoolClassStageService.php:101-121`
6. A transação é confirmada. 🟢 `SchoolClassStageService.php:91`

---

## 4. Fluxo de resolução do calendário da turma

**Gatilho:** o sistema precisa do início e do fim do período de uma turma.

1. A turma é consultada, com as suas etapas e o curso a que pertence. 🟢 `app/Services/SchoolClass/SchoolClassService.php:89-99`
2. Se o curso segue o calendário padrão, o início é o da primeira etapa do ano letivo da escola e o fim é o da última. 🟢 `app/Models/LegacySchoolClass.php:278-311`
3. Se o curso tem calendário próprio, o início é o da primeira etapa da turma e o fim é o da última. 🟢 `app/Models/LegacySchoolClass.php:391-399`

---

## 5. Fluxo de listagem de séries da rede

**Gatilho:** o cliente sincroniza as séries habilitadas na rede.

1. A requisição traz a instituição, a lista de escolas, o ano, a lista de cursos, o indicador de atividade e a data de alteração. 🟢 `ieducar/modules/Api/Views/SerieController.php:15-20`
2. As listas de escola e de curso são convertidas em listas separadas por vírgula. 🟢 `SerieController.php:22-28`
3. A consulta base exige a instituição, o curso ativo e a oferta de série ativa na escola. 🟢 `SerieController.php:52-59`
4. Os filtros de escola, de curso, de ano e de atividade são aplicados, com concatenação direta na cláusula. 🟢 `SerieController.php:61-75`
5. Quando há data de alteração, o filtro é aplicado sobre a série e sobre a oferta, com parâmetro vinculado. 🟢 `SerieController.php:77-80`
6. A ordenação é por atualização e por nome da série. 🟢 `SerieController.php:82`
7. O nome é montado com a descrição e convertido para maiúsculas. 🟢 `SerieController.php:86-89`
8. A data de exclusão é devolvida nula para a série ativa. 🟢 `SerieController.php:46-51`

---

## 6. Fluxo de progressão do estudante

**Gatilho:** a secretaria promove o estudante ao ano seguinte.

1. O serviço de promoção monta uma requisição sintética com a matrícula, a instituição, o ano, a escola, o curso, a série e a turma da enturmação. 🟢 `app/Services/PromotionService.php:24-38`
2. A API de promoção legada é instanciada e recebe a requisição. 🟢 `PromotionService.php:39-41`
3. A promoção é executada, e a série de destino é determinada pela sequência de séries cadastrada. 🟢 `PromotionService.php:42-43` e `app/Models/LegacyGradeSequence.php:27-30`
4. Qualquer exceção da API legada é silenciada. 🟢 `PromotionService.php:44-46`

---

## 7. Fluxo de cadastro de sequência de séries

**Gatilho:** a secretaria define a progressão entre duas séries.

1. A permissão de processo 587 com nível de acesso 3 é verificada. 🟢 `ieducar/intranet/educar_sequencia_serie_cad.php:50`
2. O curso de origem e o de destino são deduzidos das séries escolhidas. 🟢 `educar_sequencia_serie_cad.php:57-61`
3. As séries são selecionadas em cascata, primeiro o curso e depois a série dentro do curso. 🟢 `educar_sequencia_serie_cad.php:130-160`
4. A duplicidade do par origem e destino é verificada antes da gravação. 🟢 `educar_sequencia_serie_cad.php:173-174`
5. As séries originais são preservadas em campos ocultos, para permitir a edição. 🟢 `educar_sequencia_serie_cad.php:92-93`

---

## 8. Fluxo de listagem de séries sem componentes vinculados

**Gatilho:** a secretaria prepara a carga de componentes de uma série.

1. A consulta busca as séries ativas do curso informado. 🟢 `ieducar/modules/Api/Views/SerieController.php:110-113`
2. As séries que já têm componente curricular de ano escolar são excluídas por subconsulta. 🟢 `SerieController.php:114-115`
3. O resultado é ordenado por nome da série, com o nome convertido para maiúsculas. 🟢 `SerieController.php:116` e `:122-124`

---

## 9. Fluxos ausentes no legado

Os fluxos abaixo aparecem no desenho do modelo novo, em `_reversa_sdd/Stages/legacy-mapping.md`, e não têm implementação correspondente no código lido. Devem ser tratados como requisito novo, e não como reimplementação. 🔴

- Árvore da estrutura acadêmica do tenant, com níveis, cursos e séries em hierarquia. 🔴
- Validação da carga horária e dos dias letivos do curso contra o mínimo da LDB. 🔴
- Resolução da série de destino com tipo de transição, com a permanência na série em caso de retenção e a regra de progressão continuada. 🔴
- Ciclo de aprendizagem, com nome e progressão continuada na série. 🔴
- Aceleração de fluxo, com transição entre séries não adjacentes. 🔴
- Ato de autorização do conselho municipal na oferta do curso, com número e data. 🔴
- Exigência de parecer do conselho na regra de progressão. 🔴
- Regra de progressão que exige decisão do conselho para transição não regular. 🔴
- Data de corte etário própria da série, independente da data base de matrícula da instituição. 🔴
- Integração da promoção com o modelo novo, sem a requisição sintética contra a API legada. 🔴
