# School (i-Educar legado), Fluxos

> Fluxos da unit de escolas e estrutura pedagógica que não cabem no `design.md`.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## 1. Fluxo de seleção de escola

**Gatilho:** a secretaria escolhe a unidade escolar em uma tela de lançamento.

1. A interface solicita a lista de escolas para seleção, informando a instituição. 🟢 `ieducar/modules/Api/Views/EscolaController.php:564`
2. O controlador calcula o nível de acesso do usuário por meio da classe legada de permissões. 🟢 `EscolaController.php:546-548`
3. Para usuário de nível escola ou biblioteca, as escolas do usuário são recuperadas e devolvidas em maiúsculas, com o identificador prefixado por dois sinais de sublinhado. 🟢 `EscolaController.php:550-561`
4. Para os demais níveis, todas as escolas da instituição são devolvidas, com o mesmo tratamento de chave e valor. 🟢 `EscolaController.php:564-571`
5. A interface usa o mapa de opções para montar o seletor. 🟢 `EscolaController.php:572`

---

## 2. Fluxo de resolução do ano letivo da escola

**Gatilho:** o sistema precisa do ano operacional da unidade.

1. A consulta busca o ano da escola com andamento e atividade ativos. 🟢 `EscolaController.php:505-509`
2. O primeiro registro do conjunto é devolvido. 🟢 `EscolaController.php:512`
3. Quando a escola não tem ano em andamento, o conjunto é vazio e o acesso ao primeiro elemento falha, sem tratamento. 🟢 `EscolaController.php:512`

---

## 3. Fluxo de manutenção do código INEP da escola

**Gatilho:** a secretaria informa o código INEP da unidade.

1. A requisição traz o identificador da escola e, opcionalmente, o código INEP. 🟢 `EscolaController.php:67`
2. O registro anterior é apagado, de forma incondicional. 🟢 `EscolaController.php:30`
3. Quando há código na requisição, o registro é criado ou recuperado e recebe o código, a fonte, o nome no INEP como traço e a data de criação. 🟢 `EscolaController.php:31-47`
4. O resultado da gravação é devolvido e a interface exibe a mensagem de sucesso. 🟢 `EscolaController.php:70-72`
5. Quando não há código na requisição, nada é gravado e o código da escola deixa de existir. 🟢 `EscolaController.php:30-31`

---

## 4. Fluxo de cálculo da capacidade de matrícula por turno

**Gatilho:** a secretaria consulta a lotação disponível em um turno.

1. As turmas ativas da série, da escola, do curso e do turno são listadas, com o ano e o identificador do turno da requisição. 🟢 `EscolaController.php:349-388`
2. A lotação declarada de cada turma é somada em memória. 🟢 `EscolaController.php:390-394`
3. O total é devolvido como capacidade do turno. 🟢 `EscolaController.php:396`

---

## 5. Fluxo de cálculo da fila de espera por turno

**Gatilho:** a secretaria consulta a demanda reprimida em um turno.

1. As matrículas em pré-matrícula do ano, da escola, do curso, da série e do turno são contadas. 🟢 `EscolaController.php:282-289`
2. O total é devolvido como fila de espera. 🟢 `EscolaController.php:291-299`

---

## 6. Fluxo de listagem incremental dos parâmetros da escola

**Gatilho:** o cliente sincroniza os parâmetros alterados da rede.

1. A requisição pode trazer a data de alteração no parâmetro `modified`. 🟢 `EscolaController.php:600`
2. Quando a data é informada, apenas as escolas com alteração a partir dela são devolvidas. 🟢 `EscolaController.php:604-606`
3. O resultado traz, por escola, o identificador, a indicação de uso de regra diferenciada e a data de alteração. 🟢 `EscolaController.php:602-603` e `:609-611`

---

## 7. Fluxo de consulta da matriz de séries e disciplinas

**Gatilho:** o cliente consulta a oferta de disciplinas por escola.

1. A requisição traz o identificador da escola e, opcionalmente, a data de alteração. 🟢 `EscolaController.php:639-640`
2. A consulta interna agrupa por escola e por série, agregando as disciplinas com os anos letivos e as etapas utilizadas. 🟢 `EscolaController.php:662-681`
3. O agrupamento externo por escola produz a lista final com as duas agregações. 🟢 `EscolaController.php:682-683`
4. As agregações são decodificadas do JSON para a resposta. 🟢 `EscolaController.php:690-693`
5. O resultado traz o identificador da escola, as séries com as disciplinas e os anos letivos, e as séries com as etapas utilizadas. 🟢 `EscolaController.php:687` e `:695`

---

## 8. Fluxo de resolução do endereço da escola

**Gatilho:** uma tela exibe o endereço da unidade.

1. A requisição traz o identificador da escola, e a ausência do parâmetro impede a consulta. 🟢 `EscolaController.php:614-617` e `:621`
2. A consulta junta a escola, o vínculo de pessoa com endereço e o endereço, pela pessoa jurídica da escola. 🟢 `EscolaController.php:624-629`
3. O município é devolvido em maiúsculas, com os identificadores de país e de estado. 🟢 `EscolaController.php:625`
4. Quando não há vínculo, a consulta devolve falso. 🟢 `EscolaController.php:634`

---

## 9. Fluxo de listagem de escolas por API de recurso

**Gatilho:** um formulário precisa do catálogo de escolas.

1. A requisição é recebida pelo controlador de recurso, que não aplica autorização. 🟢 `app/Http/Controllers/Api/Resource/School/ResourceSchoolController.php:11-13`
2. A consulta exclui as escolas inativas e ordena pela razão social. 🟢 `app/Models/Builders/LegacySchoolBuilder.php:11`
3. O recurso devolve somente o identificador e o nome, com a pessoa jurídica excluída. 🟢 `LegacySchoolBuilder.php:13`

---

## 10. Fluxo de aplicação da trava de enturmação sem vagas

**Gatilho:** a secretaria tenta matricular um estudante em uma turma lotada.

1. A trava é lida na oferta de série da escola, e não na turma. 🟢 `app/Models/LegacySchoolGrade.php:26`
2. A enturmação consulta a lotação disponível da turma. 🟢 `app/Services/EnrollmentService.php:193`
3. Quando a lotação está esgotada e a trava está ativa, a operação é recusada com a exceção de falta de vaga. 🟢 `EnrollmentService.php:193-195`
4. Quando a trava está inativa, a enturmação prossegue mesmo com a turma lotada. 🟢 `EnrollmentService.php:193`

---

## 11. Fluxos ausentes no legado

Os fluxos abaixo aparecem no desenho do modelo novo, em `_reversa_sdd/School/legacy-mapping.md`, e não têm implementação correspondente no código lido. Devem ser tratados como requisito novo, e não como reimplementação. 🔴

- Capacidade máxima de matrícula declarada na escola, e não derivada da soma das turmas. 🔴
- Fila de espera como recurso de primeira classe, com a inscrição ativa do estudante. 🔴
- Trilha de auditoria das alterações de parâmetros da escola e da configuração institucional. 🔴
- Vínculo formal entre a escola e a matrícula, e listagem paginada por escola. 🔴
- Bloqueio de ano letivo aplicado de forma efetiva às operações, com a verificação de uso fora da janela bloqueada. 🔴
- Consulta dos dados de caracterização do Censo Escolar como recurso da escola, e não como colunas da tabela. 🔴
- Sincronização incremental da matriz de séries e disciplinas, com o filtro por data de alteração parametrizado. 🔴
