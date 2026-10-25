# Cadastro (i-Educar legado), Fluxos

> Fluxos da unit de cadastro de aluno que completam os flows do `design.md`.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## 1. Fluxo de abertura do formulário de cadastro

**Gatilho:** o usuário abre a rota de cadastro do aluno, sem identificador ou com a pessoa informada.

1. O texto do menu é definido pelo identificador: "Cadastrar aluno" sem `id`. 🟢 `ieducar/modules/Cadastro/Views/AlunoController.php:297-304`
2. A justificativa obrigatória da falta de documentação provém da configuração da instituição, e o campo oculto é repassado quando exigida. 🟢 `Cadastro/Views/AlunoController.php:320-326`
3. Com a pessoa informada pela query `person`, o identificador da pessoa fica no formulário; com `id` do aluno, a pessoa é obtida pela base. 🟢 `Cadastro/Views/AlunoController.php:328-337`
4. Os documentos da pessoa são carregados para a pré-composição dos campos. 🟢 `Cadastro/Views/AlunoController.php:339-342`
5. O formulário exibe as seções de identidade, família, INEP, transporte, deficiências, ficha médica, moradia, projetos, benefícios e histórico. 🟡 `Cadastro/Views/AlunoController.php:316-1330`

---

## 2. Fluxo de criação do aluno (post)

**Gatilho:** o formulário é enviado para `module/Api/Aluno/post`.

1. A validação de criação é executada: unicidade por pessoa e bloco comum de validações. 🟢 `Api/Views/AlunoController.php:222-243`
2. A transação é aberta e o aluno é gravado pela classe legada. 🟢 `Api/Views/AlunoController.php:1712-1713`
3. Os pais são gravados na pessoa física; com falha, a resposta vazia é devolvida com a transação deixada aberta. 🟢 `Api/Views/AlunoController.php:1716-1718` 🔴
4. Os subsistemas de apoio são gravados em sequência: benefícios, responsável, SUS, educacenso, deficiências, ficha médica, moradia, projetos, histórico, transporte, documentos, pessoa e laudos. 🟢 `Api/Views/AlunoController.php:1720-1733`
5. A transação é confirmada e o identificador devolve. 🟢 `Api/Views/AlunoController.php:1739-1742`

---

## 3. Fluxo de edição do aluno (put)

**Gatilho:** o formulário é enviado para `module/Api/Aluno/put`.

1. Os pais são gravados antes da abertura da transação. 🟢 `Api/Views/AlunoController.php:1745-1754`
2. A transação é aberta e a validação de edição é executada. 🟢 `Api/Views/AlunoController.php:1754-1755`
3. O aluno e os subsistemas de apoio são regravados em sequência. 🟢 `Api/Views/AlunoController.php:1756-1768`
4. A transação é confirmada mesmo em falha de validação. 🟢 `Api/Views/AlunoController.php:1772-1774` 🟡

---

## 4. Fluxo de gravação do registro do aluno

**Gatilho:** a gravação de aluno é acionada em `createOrUpdateAluno`.

1. O tipo de responsável é convertido das palavras para as letras da base. 🟢 `Api/Views/AlunoController.php:598-637`
2. O código estadual é normalizado e ganha máscara por quantidade de dígitos. 🟢 `Api/Views/AlunoController.php:603-614`
3. O identificador da pessoa só é atribuído na criação, e nunca muda depois. 🟢 `Api/Views/AlunoController.php:627-630`
4. A semântica do alfabetizado é invertida: marcado grava um registro de não analfabeto. 🟢 `Api/Views/AlunoController.php:632-634`
5. A foto é validada e gravada antes da gravação do aluno, e a imagem não salva avisa na página. 🟢 `Api/Views/AlunoController.php:659-673` e `:1856-1876`
6. O transporte é convertido pelo prestador, e a rota e o uso rural são gravadas. 🟢 `Api/Views/AlunoController.php:677-679`
7. A criação chama `cadastra()`; a edição chama `edita()` e o estado antigo é consultado antes da troca. 🟢 `Api/Views/AlunoController.php:681-689`

---

## 5. Fluxo de gravação da família

**Gatilho:** a requisição parte com os pais e o responsável.

1. A mesma pessoa como pai e mãe é recusada com a mensagem. 🟢 `Api/Views/AlunoController.php:1593-1597`
2. A pessoa física do aluno recebe os identificadores da mãe e do pai e as três restrições judiciais lançadas pelo formulário. 🟢 `Api/Views/AlunoController.php:1599-1608`
3. O responsável é escolhido conforme o tipo: quando o tipo é pai ou mãe, o responsável é a própria pessoa da família. 🟢 `Api/Views/AlunoController.php:549-580`

---

## 6. Fluxo de gravação dos subsistemas de apoio

**Gatilho:** o aluno gravado entra na sequência de apoio.

1. A ficha médica é gravada com os booleanos de "S"/"N" e os descritivos por `updateOrCreate`. 🟢 `Api/Views/AlunoController.php:436-476`
2. A moradia é gravada com a renda normalizada pelo caractere e os registros tecnológicos em JSON por `updateOrInsert`, descartando campos nulos. 🟢 `Api/Views/AlunoController.php:478-515` 🟡
3. O educacenso do aluno é destruído e recriado com a presença do código INEP. 🟢 `Api/Views/AlunoController.php:525-546`
4. As deficiências e os transtornos são sincronizados, e os códigos mudados recebem atualização de instante. 🟢 `Api/Views/AlunoController.php:582-594`
5. Os benefícios, os projetos e o histórico de altura e peso são apagados e regravados por lista da requisição. 🟢 `Api/Views/AlunoController.php:1617-1629` e `:1636-1684` e `:1686-1707`
6. Os documentos e o SUS são gravados pela pessoa física, e os laudos pelo serviço de arquivos. 🟢 `Api/Views/AlunoController.php:1929-1975` e `:428-434` e `:1901-1928`
7. O transporte da pessoa é gravado pela classe legada com a presença do modelo de classe. 🟢 `Api/Views/AlunoController.php:1779-1800`

---

## 7. Fluxo de gravação dos projetos com validações

**Gatilho:** a lista de projetos é parte da requisição.

1. Os projetos do aluno são apagados antes da regra. 🟢 `Api/Views/AlunoController.php:1636-1638`
2. O código do projeto é recolhido do texto composto do formulário. 🟢 `Api/Views/AlunoController.php:1640-1643`
3. Com a data de inclusão e o turno ausentes, a mensagem de dados mínima é adicionada. 🟢 `Api/Views/AlunoController.php:1679-1681`
4. O turno do projeto é conferido com a matrícula atual do aluno, com a recusa por turnos iguais. 🟢 `Api/Views/AlunoController.php:402-421` e `:1676-1678`
5. A duplicidade do projeto ativo é recusada, e a data de inclusão posterior ao desligamento anterior é conferida. 🟢 `Api/Views/AlunoController.php:1650-1674`
6. Os projetos válidos são gravados, e as mensagens de violação não interrompem a gravação nem o commit. 🟡 `Api/Views/AlunoController.php:1664-1683`

---

## 8. Fluxo de desativação do aluno

**Gatilho:** `module/Api/Aluno/delete` com o identificador do aluno.

1. A existência de matrícula ativa é conferida pela consulta da matrícula ativa. 🟢 `Api/Views/AlunoController.php:1822-1846` e `:1848-1853`
2. Com matrícula ativa, a mensagem de bloqueio é devolvida. 🟢 `Api/Views/AlunoController.php:1841-1843`
3. Sem matrícula ativa, o registro é marcado como inativo com o autor autenticado, pela classe legada. 🟢 `Api/Views/AlunoController.php:1827-1839`
4. A reativação marca o registro como ativo. 🟢 `Api/Views/AlunoController.php:1802-1820`

---

## 9. Fluxo de busca de alunos

**Gatilho:** a busca por código ou por nome é acionada.

1. Sem escola informada, a busca por código abrange todas as escolas, com alunos com e sem matrícula. 🟢 `Api/Views/AlunoController.php:929-959`
2. Com escola informada, a busca por código prioriza a matrícula ativa da escola. 🟢 `Api/Views/AlunoController.php:961-1001`
3. A busca por texto devolve o nome com o nome social prevalecente na exibição. 🟢 `Api/Views/AlunoController.php:1002-1078`
4. Os resultados limitam a quinze por consulta. 🟢 `Api/Views/AlunoController.php:957` 🟡

---

## 10. Fluxo de ocorrências disciplinares

**Gatilho:** a consulta de ocorrências do aluno é acionada.

1. A validação exige o aluno. 🟢 `Api/Views/AlunoController.php:372-377`
2. A consulta entra pelas matrículas das escolas informadas, com o filtro de ano. 🟢 `Api/Views/AlunoController.php:830-902`
3. Somente as ocorrências de alunos matriculados nas escolas informadas e visíveis aos pais entram na devolução. 🟢 `Api/Views/AlunoController.php:879-882`
4. Os identificadores de escola são interpolados diretamente na consulta, com o risco de injeção. 🟢 `Api/Views/AlunoController.php:881` 🔴

---

## 11. Fluxo de listagem completa de todos os alunos

**Gatilho:** a consulta de todos os alunos das escolas e ano é acionada, para aplicativos de terceiros.

1. As escolas e o ano são exigidos. 🟢 `Api/Views/AlunoController.php:190-193`
2. A consulta une dois conjuntos: os alunos com matrícula nas escolas e os alunos excluídos. 🟢 `Api/Views/AlunoController.php:1324-1427`
3. A devolução traz a data de exclusão quando o aluno sai da base ativa. 🟢 `Api/Views/AlunoController.php:1368-1427`

---

## 12. Fluxo de consulta por CPF de responsável

**Gatilho:** a consulta de alunos por cuidador é acionada.

1. O CPF é convertido em identificador da pessoa física. 🟢 `Api/Views/AlunoController.php:1427-1482`
2. O vínculo de guardião é conferido entre o responsável e o aluno. 🟢 `Api/Views/AlunoController.php:1434-1448`
3. Os alunos vinculados são devolvidos com a situação de responsabilidade por tipo. 🟡

---

## 13. Fluxos ausentes no legado

Os fluxos abaixo aparecem no desenho do modelo novo e não têm implementação correspondente no código lido. Devem ser tratados como requisito novo, e não como reimplementação. 🔴

- API REST JSON de manutenção do cadastro do estudante com autenticação e validação por tenant. 🔴
- Trilha de auditoria das mudanças do cadastro, com autor, instante, valor anterior e novo valor. 🔴
- Eliminação das interpolações SQL por consultas preparadas. 🔴
- Controle transacional sem estado aberto na falha de gravação de família. 🔴
- Validadores de domínio com mensagens localizadas e indicação de campo. 🔴
- Consistência dos campos limpos da ficha médica, da moradia e dos demais subsistemas por atualização estruturada. 🔴
