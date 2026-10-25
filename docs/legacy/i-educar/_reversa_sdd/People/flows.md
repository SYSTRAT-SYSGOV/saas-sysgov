# People (i-Educar legado), Fluxos

> Fluxos da unit de cadastro de pessoas que não cabem no `design.md`.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## 1. Fluxo de cadastro de pessoa física

**Gatilho:** a secretaria escolar cadastra um aluno, um servidor ou um responsável.

1. A interface busca a pessoa já existente, por nome, RG ou prefixo de identificador, para evitar duplicidade. 🟢 `ieducar/modules/Api/Views/PessoaController.php:375-459`
2. A pessoa selecionada é carregada com o detalhe completo, para que o formulário venha preenchido. 🟢 `PessoaController.php:461-482`
3. O formulário é submetido e as validações são executadas em sequência: nome, nome social, data de nascimento, localização diferenciada e CPF. 🟢 `PessoaController.php:574-577`
4. A pessoa genérica é criada com o tipo `F` e o autor do cadastro, ou atualizada com o autor da revisão. 🟢 `PessoaController.php:590-611`
5. A pessoa física é gravada, com a data de nascimento convertida e o país estrangeiro anulado quando a nacionalidade é brasileira. 🟢 `PessoaController.php:613-645`
6. A raça é sincronizada ou desvinculada. 🟢 `PessoaController.php:647-652`
7. Os telefones são gravados pelo serviço de telefone, com chamada mesmo quando o número está vazio, para permitir a remoção. 🟢 `PessoaController.php:654-674`
8. O endereço é gravado pelo helper de endereçamento. 🟢 `PessoaController.php:677-688`
9. A resposta traz o identificador da pessoa, que é usado pelo cadastro de aluno ou de servidor. 🟢 `PessoaController.php:586`

---

## 2. Fluxo de unificação de pessoas duplicadas

**Gatilho:** a secretaria escolar identifica dois ou mais cadastros da mesma pessoa.

1. A tela de unificação exige a permissão de processo 9998878 com nível de acesso 7. 🟢 `ieducar/intranet/educar_unifica_pessoa.php:31-40`
2. A seleção é validada: é preciso haver ao menos duas pessoas, exatamente uma pessoa principal e nenhum identificador repetido. 🟢 `educar_unifica_pessoa.php:87-114`
3. A pessoa principal e as duplicadas são extraídas da seleção. 🟢 `educar_unifica_pessoa.php:154-168`
4. A transação é aberta e o log de unificação é criado, com o tipo, o identificador principal, os identificadores duplicados, os nomes das duplicadas e o usuário responsável. 🟢 `educar_unifica_pessoa.php:119-121` e `:170-182`
5. A unificação de servidor é executada primeiro, quando a pessoa é também servidor, o que preserva o registro de servidor, o código INEP do docente, as alocações, as faltas, os afastamentos e as funções. 🟢 `ieducar/lib/App/Unificacao/Pessoa.php:213-218` e `Servidor.php`
6. Os gatilhos de todas as tabelas envolvidas são desabilitados, exceto os necessários. 🟢 `ieducar/lib/App/Unificacao/Base.php:167-185`
7. Os registros de propriedade das duplicadas são removidos ou repontados para a pessoa principal. 🟢 `Base.php:111-146`
8. Os vínculos de referência são repontados para a pessoa principal, preservando todos os vínculos. 🟢 `Base.php:89-109`
9. Antes de cada operação, o snapshot dos dados anteriores da tabela é gravado, com as chaves e o conteúdo em JSON. 🟢 `Base.php:205-221` e `app/Services/UnificationService.php:11-19`
10. Os gatilhos são reabilitados e a transação é confirmada, ou revertida em caso de exceção. 🟢 `Base.php:51` e `educar_unifica_pessoa.php:124-132`
11. A mensagem de sucesso é apresentada ao operador. 🟢 `educar_unifica_pessoa.php:134`

---

## 3. Fluxo de recusa de unificação com alunos ativos

**Gatilho:** uma das pessoas selecionadas está vinculada a mais de um aluno ativo.

1. A validação de parâmetros conta os alunos ativos vinculados ao conjunto de pessoas selecionadas. 🟢 `ieducar/lib/App/Unificacao/Pessoa.php:220-224`
2. Quando a contagem é maior que um, a operação é interrompida com a orientação de unificar os alunos primeiro. 🟢 `Pessoa.php:225-227`
3. Nenhuma alteração é feita, porque a validação precede a desativação de gatilhos e a repontuação. 🟢 `ieducar/lib/App/Unificacao/Base.php:45-48`
4. A exceção é convertida na mensagem de suporte pelo tratamento do erro. 🟢 `Base.php:52-54`

---

## 4. Fluxo de unificação de aluno

**Gatilho:** a secretaria escolar precisa fundir dois cadastros de aluno.

1. Os parâmetros são validados: identificador principal numérico, lista de duplicados não vazia e usuário executor numérico. 🟢 `ieducar/lib/App/Unificacao/Aluno.php`
2. O snapshot dos históricos, das matrículas e dos alunos duplicados é gravado. 🟢 `Aluno.php`
3. Para cada aluno duplicado, o maior sequencial do histórico do aluno principal é calculado, e o histórico escolar e o histórico de disciplinas são repontados, com o deslocamento do sequencial. 🟢 `Aluno.php`
4. As matrículas dos duplicados são repontadas para o aluno principal. 🟢 `Aluno.php`
5. O aluno principal é reativado, com a data de exclusão anulada. 🟢 `Aluno.php`
6. Os alunos duplicados são desativados, com a data de exclusão e o usuário executor. 🟢 `Aluno.php`

---

## 5. Fluxo de desfeito da unificação de aluno

**Gatilho:** a secretaria escolar precisa reverter uma unificação de aluno.

1. A rota é acionada e o serviço de desfeito é invocado. 🟢 `app/Http/Controllers/StudentLogUnificationController.php:53-58`
2. O serviço verifica se a unificação está ativa e, em caso contrário, recusa a operação. 🟢 `app/Services/StudentUnificationService.php:42-44`
3. O serviço verifica se a pessoa principal ainda existe e, em caso contrário, recusa a operação. 🟢 `StudentUnificationService.php:46-48`
4. A permissão é verificada: o usuário de nível escolar precisa ter escola em comum com o autor da unificação, e o usuário institucional precisa ser do mesmo nível ou de nível escolar. 🟢 `StudentUnificationService.php:56-107`
5. O adapter do tipo executa o desfeito, com base no snapshot gravado. 🟢 `StudentUnificationService.php:31-33` e `src/Modules/Unification/StudentLogUnification.php`
6. O log é marcado como inativo e o usuário da reversão é registrado. 🟢 `StudentUnificationService.php:35-37`
7. O usuário é redirecionado ao log de unificações, com a mensagem de sucesso. 🟢 `StudentLogUnificationController.php:63`

---

## 6. Fluxo de consulta do log de unificações de pessoa

**Gatilho:** a secretaria escolar audita as unificações realizadas.

1. A listagem carrega o log com a pessoa principal, filtrando pelo tipo de unificação de pessoa. 🟢 `app/Http/Controllers/PersonLogUnificationController.php:15-18`
2. O filtro por nome busca no nome da pessoa principal e nos nomes das duplicadas, em operação sem distinção de maiúsculas. 🟢 `PersonLogUnificationController.php:19-25`
3. O filtro por CPF busca no CPF da pessoa física principal, com os pontos e hifens removidos. 🟢 `PersonLogUnificationController.php:26-33`
4. O resultado é paginado em 20 registros e apresentado na tela de log. 🟢 `PersonLogUnificationController.php:34`

---

## 7. Fluxo de consulta da pessoa

**Gatilho:** a interface solicita os dados de uma pessoa.

1. A requisição é aceita somente com identificador ou com CPF. 🟢 `ieducar/modules/Api/Views/PessoaController.php:19-31`
2. Com identificador, a pessoa é carregada de `cadastro.pessoa`; com CPF, a busca é feita sobre `cadastro.pessoa` e `cadastro.fisica`, com os caracteres não numéricos removidos. 🟢 `PessoaController.php:59-92`
3. O identificador do aluno vinculado é resolvido, para permitir o fallback do nome do pai e da mãe. 🟢 `PessoaController.php:45-57`
4. Os detalhes são carregados em uma única consulta, com subconsultas para documento, telefones, filiação, naturalidade, país e raça. 🟢 `PessoaController.php:98-148`
5. As datas são convertidas para o formato brasileiro. 🟢 `PessoaController.php:295-300`
6. O indicador de posse de documento é calculado. 🟢 `PessoaController.php:150-154`
7. As deficiências são carregadas e devolvidas como mapa de identificador para nome. 🟢 `PessoaController.php:324-340` e `:478`

---

## 8. Fluxo de reativação de pessoa

**Gatilho:** a secretaria escolar precisa reativar um cadastro inativo.

1. A requisição traz o identificador da pessoa. 🟢 `ieducar/modules/Api/Views/PessoaController.php:728`
2. A pessoa física é religada por atualização direta do campo de atividade. 🟢 `PessoaController.php:729-731`
3. A resposta traz o resultado da atualização, sem qualquer verificação de vínculos ou de dependências. 🟢 `PessoaController.php:732`

---

## 9. Fluxo de comparação de candidatos à unificação

**Gatilho:** o operador precisa decidir quais cadastros são a mesma pessoa.

1. A requisição traz a lista de identificadores das pessoas selecionadas. 🟢 `ieducar/modules/Api/Views/PessoaController.php:737`
2. A consulta junta pessoa, pessoa física, documento, aluno, servidor, pessoa da mãe e usuário, e classifica o vínculo pela existência de cada um. 🟢 `PessoaController.php:739-770`
3. A ausência de vínculo é substituída pelo texto `Sem vínculo`. 🟢 `PessoaController.php:788-792`
4. A resposta traz, por pessoa, o identificador, o vínculo, o nome, a data de nascimento, o sexo, o CPF, o RG e o nome da mãe. 🟢 `PessoaController.php:775-797`

---

## 10. Fluxos ausentes no legado

Os fluxos abaixo aparecem no desenho do modelo novo, em `_reversa_sdd/People/legacy-mapping.md` e no ADR-003, e não têm implementação correspondente no código lido. Devem ser tratados como requisito novo, e não como reimplementação. 🔴

- Unificação assistida por similaridade fonética de nome e de documentos, com sugestão de pares candidatos. 🔴
- Verificação de compatibilidade de documentos antes da unificação, com relatório de conflito. 🔴
- Desfeito da unificação de pessoa, hoje declarado no contrato e sem corpo implementado. 🔴
- Indicação de pessoa unificada com ponteiro para o cadastro principal, no lugar da remoção da duplicada. 🔴
- Motivo de ausência de CPF, regulamentado e persistido, para permitir o CPF nulo com justificativa. 🔴
- Trilha de auditoria de conteúdo da pessoa, com valores anteriores e posteriores de cada alteração. 🔴
- Verificação de identidade por biometria ou por prova de vínculo. 🔴
