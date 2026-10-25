# People (i-Educar legado)

> Unit do plano de extração do Reversa (`granularity = module`). Descreve o **QUE** o subsistema de cadastro de pessoas legado faz, com rastreabilidade ao código lido.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Visão Geral

O subsistema de pessoas do i-Educar mantém o cadastro civil de toda a rede municipal, compartilhado entre alunos, servidores, responsáveis e usuários do portal. Ele é composto por uma pessoa genérica (`cadastro.pessoa`), completada opcionalmente pela pessoa física (`cadastro.fisica`) ou pela pessoa jurídica (`cadastro.juridica`), e por tabelas auxiliares de documentos, telefones, raça, deficiências, endereços e fotos. 🟢

Problema que resolve: oferecer uma identidade única e reutilizável para cada cidadão da rede, evitando que o mesmo estudante, o mesmo professor-pai ou o mesmo servidor seja cadastrado várias vezes, e garantir que essa identidade possa ser reparada por meio da unificação de duplicatas. 🟢

O subsistema é responsável por: cadastrar e consultar a pessoa civil; registrar e qualificar a pessoa física; manter documento, telefone, endereço, raça, deficiência e filiação; validar nome, nome social, data de nascimento, localização diferenciada e CPF; garantir a unicidade do CPF; e executar a unificação de cadastros duplicados com trilha de log para reversão. 🟢

Observação estrutural: a pessoa é identificada por `idpes`, numérico e gerado por sequência do PostgreSQL, e o mesmo identificador é a chave estrangeira em `pmieducar.aluno`, `pmieducar.servidor`, `pmieducar.usuario` e `portal.funcionario`. A separação entre `cadastro.pessoa` e `cadastro.fisica` permite que a pessoa exista sem complementação física. 🟢

---

## Responsabilidades

- Registrar a pessoa com nome, tipo, situação, origem de gravação, operação e e-mail. 🟢 `database/migrations/legacy/2020_01_01_110000_create_cadastro_pessoa_table.php:22-40`
- Registrar e qualificar a pessoa física com data de nascimento, sexo, filiação, estado civil, nacionalidade, naturalidade, país de residência e marcadores do Censo Escolar. 🟢 `database/migrations/legacy/2020_01_01_110000_create_cadastro_fisica_table.php:17-70`
- Manter o documento civil da pessoa, com RG, certidão de nascimento, certidão de casamento, passaporte e dados de emissão. 🟢 `database/migrations/legacy/2020_01_01_110000_create_cadastro_documento_table.php`
- Manter os telefones da pessoa, com tipo, DDD e número. 🟢 `database/migrations/legacy/2020_01_01_110000_create_cadastro_fone_pessoa_table.php`
- Manter a vinculação da pessoa ao endereço, com a tipagem de endereço. 🟢 `app/Models/LegacyPerson.php:172`
- Manter a raça ou cor da pessoa, pelo vínculo `cadastro.fisica_raca`. 🟢 `app/Models/LegacyIndividual.php:113`
- Manter as deficiências e transtornos da pessoa, pelo vínculo `cadastro.fisica_deficiencia`. 🟢 `app/Models/LegacyIndividual.php:141`
- Consultar a pessoa por identificador ou por CPF, devolvendo o conjunto completo de dados e de documentos. 🟢 `ieducar/modules/Api/Views/PessoaController.php:59-303`
- Buscar pessoas por prefixo de identificador, de CPF, de RG ou por fragmento de nome, exibindo o nome social quando houver. 🟢 `PessoaController.php:375-459` e `:824-848`
- Validar o nome e o nome social, a data de nascimento, a localização diferenciada e o CPF antes de gravar. 🟢 `PessoaController.php:484-572`
- Garantir a unicidade do CPF entre as pessoas cadastradas. 🟢 `PessoaController.php:563-569`
- Gravar ou atualizar a pessoa, a pessoa física, os telefones, a raça e o endereço. 🟢 `PessoaController.php:579-688`
- Reativar pessoa inativa, religando o registro físico. 🟢 `PessoaController.php:726-733`
- Fornecer os dados comparativos de pessoas candidatas à unificação, com nome, nascimento, sexo, CPF, RG, nome da mãe e vínculos. 🟢 `PessoaController.php:735-797`
- Executar a unificação de pessoas duplicadas, migrando as chaves estrangeiras de todas as tabelas envolvidas e registrando o log dos dados anteriores. 🟢 `ieducar/lib/App/Unificacao/Base.php:42-55` e `Pessoa.php:213-218`
- Exibir o log de unificações de pessoa e o detalhe de cada unificação. 🟢 `app/Http/Controllers/PersonLogUnificationController.php:13-46`

---

## Regras de Negócio

- A pessoa física é criada com o tipo `F` e a pessoa jurídica com o tipo `J`, e a coluna tem restrição de domínio para esses dois valores. 🟢 `database/migrations/legacy/2020_01_01_110000_create_cadastro_pessoa_table.php:34` e `:39`
- A situação da pessoa admite os valores `A`, `I` e `P`, e a origem de gravação admite `M`, `U`, `C` e `O`, com restrição de domínio no banco. 🟢 `cadastro.pessoa:36-38`
- A pessoa física é identificada pelo mesmo `idpes` da pessoa, e a pessoa pode existir sem registro físico. 🟢 `database/migrations/legacy/2020_01_01_110000_create_cadastro_fisica_table.php:18`
- A pessoa física inativa é marcada pelo campo `ativo`, e a reativação é feita reescrevendo esse campo. 🟢 `cadastro.fisica:59` e `ieducar/modules/Api/Views/PessoaController.php:726-733`
- A pessoa física registra a filiação por `idpes_mae`, `idpes_pai` e `idpes_responsavel`, e o nome do pai e da mãe é resolvido com coalescência entre a pessoa cadastrada e o texto herdado do cadastro do aluno. 🟢 `cadastro.fisica:20-22` e `PessoaController.php:102-106`
- O CPF é gravado como número de 11 dígitos, e a gravação só ocorre quando o valor informado é não vazio. 🟢 `ieducar/modules/Api/Views/PessoaController.php:640-643`
- O CPF é validado pelo algoritmo de módulo 11 antes da gravação, e a mensagem de erro é específica. 🟢 `PessoaController.php:557-560`
- O CPF é obrigatório quando a instituição está configurada para exigi-lo, e dispensável caso contrário. 🟢 `PessoaController.php:545-555`
- O CPF não pode estar em uso por outra pessoa, e o erro identifica o identificador da pessoa que já o utiliza. 🟢 `PessoaController.php:563-569`
- O nome e o nome social são validados pelo validador de nome, e o nome social é validado apenas quando informado. 🟢 `PessoaController.php:484-510`
- A data de nascimento é validada apenas quando informada, e o valor é convertido do formato brasileiro para o do banco. 🟢 `PessoaController.php:512-527`
- A localização diferenciada é validada em conjunto com a zona de localização do Censo Escolar. 🟢 `PessoaController.php:529-540`
- A pessoa física brasileira não pode ter país de origem estrangeiro: ao gravar nacionalidade brasileira, o país estrangeiro é anulado. 🟢 `PessoaController.php:625-627`
- O povo indígena do Censo Escolar é gravado em campo próprio e, quando ausente na requisição, é anulado. 🟢 `PessoaController.php:634-638`
- A raça é gravada por sincronização do vínculo, e a ausência do valor desvincula todas as raças da pessoa. 🟢 `PessoaController.php:647-652`
- Os telefones são gravados pelo serviço de telefone, com tipo distinto para linha fixa e celular, e a gravação ocorre mesmo quando o número está vazio, o que remove o telefone anterior. 🟢 `PessoaController.php:654-674`
- A consulta por CPF remove os caracteres não numéricos e recusa o CPF sem dígitos. 🟢 `PessoaController.php:77-92`
- A busca por identificador ou CPF só considera pessoas físicas ativas, e a busca por nome considera nome social e nome de registro concatenados. 🟢 `PessoaController.php:380-403` e `:828-848`
- A busca textual é limitada a 15 resultados e a busca por RG e por prefixo de identificador também. 🟢 `PessoaController.php:402` e `:429`
- A pessoa é considerada sem documentação quando não possui CPF, NIS e certidão de nascimento. 🟢 `PessoaController.php:150-154`
- A unificação exige ao menos duas pessoas e exatamente uma pessoa principal. 🟢 `ieducar/intranet/educar_unifica_pessoa.php:87-108`
- A unificação recusa a seleção de cadastros duplicados, isto é, a mesma pessoa repetida na seleção. 🟢 `educar_unifica_pessoa.php:110-114`
- A unificação recusa a operação quando há mais de uma pessoa vinculada a alunos ativos, e orienta a unificar os alunos antes. 🟢 `ieducar/lib/App/Unificacao/Pessoa.php:220-228`
- Na unificação de pessoa, os vínculos de propriedade do registro são mantidos apenas na pessoa principal, e os registros das duplicadas são removidos antes da repontuação. 🟢 `ieducar/lib/App/Unificacao/Base.php:111-146`
- Na unificação de pessoa, os vínculos de referência, como filiação e alocação docente, são repontados para a pessoa principal, preservando todos os vínculos. 🟢 `Base.php:89-109`
- A unificação de pessoa repontua 12 tabelas com vínculo de propriedade, entre elas `cadastro.pessoa`, `cadastro.fisica`, `cadastro.documento`, `cadastro.fone_pessoa` e `pmieducar.aluno`. 🟢 `ieducar/lib/App/Unificacao/Pessoa.php:5-54`
- A unificação de pessoa repontua 33 tabelas com vínculo de referência, entre elas `cadastro.fisica.idpes_mae`, `pmieducar.servidor_alocacao` e `public.school_managers`. 🟢 `Pessoa.php:56-197`
- A unificação desabilita os gatilhos de todas as tabelas envolvidas antes de operar e os reabilita ao final, exceto os gatilhos necessários. 🟢 `Base.php:42-55` e `:160-185`
- A unificação de pessoa executa primeiro a unificação de servidor, e só depois a da pessoa. 🟢 `Pessoa.php:213-218`
- A unificação de servidor mantém a propriedade do registro de servidor e do código INEP do docente apenas no servidor principal, repontua as alocações, faltas, afastamentos e funções, e remove os cursos ministrados e as disciplinas do servidor duplicado. 🟢 `ieducar/lib/App/Unificacao/Servidor.php`
- A unificação de aluno repontua o histórico escolar e o histórico de disciplinas, com deslocamento do sequencial, repontua as matrículas, desativa os alunos duplicados e reativa o aluno principal. 🟢 `ieducar/lib/App/Unificacao/Aluno.php`
- Cada unificação grava o snapshot dos dados anteriores de cada tabela alterada, com as chaves e o conteúdo em JSON, para permitir a reversão. 🟢 `Base.php:205-221` e `app/Services/UnificationService.php:11-19`
- O log de unificação guarda o tipo, o identificador principal, os identificadores duplicados, os nomes das duplicadas e o usuário responsável. 🟢 `ieducar/intranet/educar_unifica_pessoa.php:170-182`
- A reversão da unificação é implementada para o aluno, com verificação de que a unificação está ativa, de que a pessoa principal existe e de que o usuário tem permissão. 🟢 `app/Services/StudentUnificationService.php:27-51`
- A reversão da unificação de pessoa está declarada no contrato de tipo, mas o corpo do método é vazio, o que impede o desfeito. 🟢 `src/Modules/Unification/PersonLogUnification.php:28-30`
- A reversão da unificação é permitida ao usuário de nível escolar somente quando há escola em comum com o autor da unificação, e ao usuário institucional quando o autor é do mesmo nível ou de nível escolar. 🟢 `StudentUnificationService.php:56-107`
- A unificação de pessoa exige a permissão de processo 9998878 com nível de acesso 7. 🟢 `ieducar/intranet/educar_unifica_pessoa.php:31-40`
- Não existe, no legado, unificação automática por similaridade de nome ou de documento: a seleção das pessoas é manual. 🔴
- Não existe, no legado, verificação de que a pessoa duplicada e a principal têm documentos compatíveis antes da unificação. 🔴
- Não existe, no legado, transação de banco que envolva a desativação de gatilhos, a repontuação e o log: o commit é feito apenas após a operação, e a operação de gatilhos ocorre fora do escopo transacional do `clsBanco`. 🔴
- Não existe, no legado, o conceito de pessoa unificada com ponteiro para o cadastro principal: a duplicada é removida ou repontada, e o vínculo é reconstruído apenas pelo log. 🔴

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | O sistema deve registrar a pessoa com nome, tipo, situação, origem de gravação e e-mail. | Must | Dado um nome válido, quando a pessoa for criada, então o registro traz identificador, tipo `F` e autor de cadastro. |
| RF-02 | O sistema deve registrar e qualificar a pessoa física com data de nascimento, sexo, filiação, estado civil, nacionalidade, naturalidade, país de residência, zona de localização e localização diferenciada. | Must | Dado um payload completo de pessoa física, quando for gravado, então os campos são persistidos e relidos no mesmo formato. |
| RF-03 | O sistema deve manter o documento civil da pessoa, com RG, dados de emissão, certidão de nascimento, certidão de casamento e passaporte. | Must | Dado uma pessoa com certidão de nascimento, quando consultada, então o documento é devolvido com os demais campos de identificação. |
| RF-04 | O sistema deve manter os telefones da pessoa, com tipo, DDD e número, permitindo a remoção pelo envio de número vazio. | Must | Dado uma pessoa com telefone fixo, quando o número for enviado vazio, então o telefone é removido. |
| RF-05 | O sistema deve manter a vinculação da pessoa ao endereço, com tipagem de endereço. | Must | Dado um endereço com CEP, município e logradouro, quando gravado, então o endereço é vinculado à pessoa e devolvido na consulta. |
| RF-06 | O sistema deve manter a raça ou cor da pessoa e permitir a desvinculação. | Must | Dado uma pessoa com raça registrada, quando a raça for enviada vazia, então o vínculo é removido. |
| RF-07 | O sistema deve manter as deficiências e transtornos da pessoa e devolvê-los na consulta. | Must | Dado uma pessoa com duas deficiências, quando consultada, então a lista de deficiências traz as duas com identificador e nome. |
| RF-08 | O sistema deve consultar a pessoa por identificador ou por CPF, devolvendo dados civis, documentos, contatos, deficiências e vínculos. | Must | Dado um CPF válido de pessoa existente, quando a consulta for feita, então a pessoa e seus detalhes são devolvidos. |
| RF-09 | O sistema deve buscar pessoas por prefixo de identificador, de CPF, de RG e por fragmento de nome, mostrando o nome social quando houver. | Must | Dado um nome social cadastrado, quando a busca for feita pelo nome de registro, então o resultado exibe o nome social com o nome de registro ao lado. |
| RF-10 | O sistema deve validar o nome e o nome social antes da gravação. | Must | Dado um nome inválido, quando a gravação for tentada, então a operação é recusada com a mensagem do validador. |
| RF-11 | O sistema deve validar a data de nascimento antes da gravação e convertê-la para o formato do banco. | Must | Dado uma data de nascimento inválida, quando a gravação for tentada, então a operação é recusada. |
| RF-12 | O sistema deve validar a localização diferenciada em conjunto com a zona de localização do Censo Escolar. | Must | Dado uma localização diferenciada incompatível com a zona informada, quando a gravação for tentada, então a operação é recusada. |
| RF-13 | O sistema deve validar o CPF por módulo 11 e recusar o CPF em uso por outra pessoa. | Must | Dado um CPF válido já cadastrado em outra pessoa, quando a gravação for tentada, então a operação é recusada identificando a pessoa que o utiliza. |
| RF-14 | O sistema deve tornar o CPF obrigatório quando a instituição assim o configurar, e dispensável caso contrário. | Must | Dado uma instituição com CPF obrigatório e uma pessoa sem CPF, quando a gravação for tentada, então a operação é recusada. |
| RF-15 | O sistema deve anular o país de origem estrangeiro quando a nacionalidade for brasileira. | Must | Dado uma pessoa brasileira com país estrangeiro informado, quando gravada, então o país estrangeiro fica nulo. |
| RF-16 | O sistema deve reativar pessoa inativa, religando o registro físico. | Must | Dado uma pessoa inativa, quando a reativação for solicitada, então o registro passa a ativo. |
| RF-17 | O sistema deve apresentar os dados comparativos das pessoas candidatas à unificação, com nome, nascimento, sexo, CPF, RG, nome da mãe e vínculos. | Must | Dado um conjunto de pessoas selecionadas, quando a comparação for solicitada, então cada linha traz o vínculo como aluno, responsável, servidor ou usuário. |
| RF-18 | O sistema deve unificar pessoas duplicadas, repontando as chaves estrangeiras de todas as tabelas envolvidas para a pessoa principal. | Must | Dado uma pessoa duplicada com telefone, documento e aluno vinculados, quando a unificação for executada, então os vínculos passam a apontar para a pessoa principal. |
| RF-19 | O sistema deve remover, na unificação, os registros de propriedade das duplicadas que não podem coexistir com o da principal. | Must | Dado uma duplicada com registro de pessoa física, quando a unificação for executada, então resta apenas um registro físico entre as duas pessoas. |
| RF-20 | O sistema deve preservar todos os vínculos de referência das duplicadas, sem removê-los. | Must | Dado um estudante que é filho de uma das duplicadas, quando a unificação for executada, então a filiação passa a apontar para a pessoa principal. |
| RF-21 | O sistema deve registrar o snapshot dos dados anteriores de cada tabela alterada na unificação, com as chaves e o conteúdo. | Must | Dado uma unificação executada, quando o log for consultado, então há um registro por tabela alterada com os dados anteriores. |
| RF-22 | O sistema deve registrar no log de unificação o tipo, a pessoa principal, as duplicadas, os nomes das duplicadas e o usuário responsável. | Must | Dado uma unificação executada, quando o log for consultado, então o registro traz a pessoa principal e os nomes das duplicadas. |
| RF-23 | O sistema deve permitir desfazer a unificação de aluno, com verificação de permissão por nível de usuário. | Must | Dado um usuário de nível escolar sem escola em comum com o autor da unificação, quando o desfeito for solicitado, então a operação é recusada. |
| RF-24 | O sistema deve permitir consultar o log de unificações de pessoa, com filtro por nome e por CPF, e o detalhe de cada unificação. | Must | Dado um CPF unificado, quando a consulta for feita, então o registro correspondente é encontrado. |
| RF-25 | O sistema deve recusar a unificação de pessoa quando houver mais de uma pessoa vinculada a alunos ativos. | Must | Dado duas pessoas vinculadas a alunos ativos, quando a unificação for tentada, então a operação é recusada com a orientação de unificar os alunos antes. |
| RF-26 | O sistema deve exigir a indicação de exatamente uma pessoa principal e de ao menos duas pessoas na unificação. | Must | Dado uma seleção com duas pessoas principais, quando a unificação for tentada, então a operação é recusada. |
| RF-27 | O sistema deve unificar o servidor antes da pessoa, para que a alocação docente e o código INEP sejam preservados. | Must | Dado um servidor duplicado, quando a unificação de pessoa for executada, então o registro de servidor e o código INEP do docente permanecem únicos. |

---

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Segurança | A unificação de pessoa exige a permissão de processo 9998878 com nível de acesso 7. | `ieducar/intranet/educar_unifica_pessoa.php:31-40` | 🟢 |
| Segurança | O desfeito da unificação é restrito por nível de usuário e por escola em comum. | `app/Services/StudentUnificationService.php:56-107` | 🟢 |
| Integridade | A gravação de pessoa registra o autor do cadastro e o autor da revisão. | `ieducar/modules/Api/Views/PessoaController.php:600-610` | 🟢 |
| Integridade | A unicidade do CPF é verificada antes da gravação, e não por índice único no banco. | `PessoaController.php:563-569` | 🟢 |
| Integridade | A pessoa física é gravada com `saveOrFail`, de modo que a falha interrompe a operação. | `PessoaController.php:645` | 🟢 |
| Performance | A consulta de detalhes da pessoa resolve documentos, telefones, filiação e naturalidade por subconsultas correlacionadas, o que produz uma consulta por pessoa. | `PessoaController.php:98-146` | 🟢 |
| Performance | A busca de pessoas é limitada a 15 resultados por consulta. | `PessoaController.php:402` e `:847` | 🟢 |
| Performance | A unificação percorre tabela por tabela, executando uma consulta de leitura e uma de escrita para cada chave declarada. | `ieducar/lib/App/Unificacao/Base.php:57-146` | 🟢 |
| Integridade | A unificação desabilita e reabilita gatilhos de banco por comando DDL, fora da transação da aplicação. | `Base.php:160-185` | 🟢 |
| Integridade | A unificação concatena os identificadores na consulta SQL, sem parametrização. | `Base.php:65-80` e `:99-106` | 🟢 |
| Isolamento | O legado opera em base municipal única; a migração para o SYSGOV exige `tenant_id` nas pessoas, nos vínculos e no log de unificação. | `database/migrations/legacy/2020_01_01_110000_create_cadastro_pessoa_table.php:22-40` | 🟡 |
| Compatibilidade | As datas trafegam no formato brasileiro e são convertidas na borda. | `ieducar/modules/Api/Views/PessoaController.php:300` e `:617` | 🟢 |
| Observabilidade | O log de unificação preserva o snapshot dos dados anteriores, permitindo auditoria e reversão. | `app/Services/UnificationService.php:11-19` | 🟢 |
| Auditabilidade | A pessoa registra o autor do cadastro, o autor da revisão e a operação realizada, mas não há trilha das alterações de conteúdo. | `database/migrations/legacy/2020_01_01_110000_create_cadastro_pessoa_table.php:26-34` | 🟡 |
| Disponibilidade | A reativação de pessoa é executada por SQL direto, sem validação de vínculos ou de dependências. | `ieducar/modules/Api/Views/PessoaController.php:726-733` | 🔴 |

> Inferido a partir do código. Validar com equipe de operações.

---

## Critérios de Aceitação

```gherkin
Dado um nome válido e uma data de nascimento válida
Quando a pessoa for gravada
Então o identificador é gerado e o nome é devolvido na consulta

Dado um CPF válido já cadastrado em outra pessoa
Quando a gravação for tentada
Então a operação é recusada identificando a pessoa que utiliza o CPF

Dado uma instituição que exige CPF
Quando uma pessoa sem CPF for gravada
Então a operação é recusada pedindo o preenchimento do CPF

Dado uma pessoa brasileira com país de origem estrangeiro informado
Quando a pessoa for gravada
Então o país de origem estrangeiro fica nulo

Dado uma pessoa com nome social cadastrado
Quando a busca for feita pelo nome de registro
Então o resultado exibe o nome social junto do nome de registro

Dado um telefone fixo de uma pessoa
Quando a gravação for feita com o número vazio
Então o telefone é removido

Dado duas pessoas com telefones, documentos e alunos vinculados
Quando a unificação for executada
Então os vínculos passam a apontar para a pessoa principal e os nomes das duplicadas são registrados no log

Dado duas pessoas vinculadas a alunos ativos
Quando a unificação for tentada
Então a operação é recusada com a orientação de unificar os alunos antes

Dado um usuário de nível escolar sem escola em comum com o autor da unificação
Quando o desfeito da unificação for solicitado
Então a operação é recusada por falta de permissão
```

---

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Cadastro da pessoa e da pessoa física | Must | Base de todo o sistema e identidade única da rede |
| Documento, telefone, endereço, raça e deficiência | Must | Caracterizam a pessoa e alimentam o Censo Escolar |
| Validações de nome, nome social, data de nascimento e localização | Must | Bloqueiam entrada de dado inconsistente no cadastro |
| Validação e unicidade do CPF | Must | É a chave de identidade civil e de dedupe |
| Consulta por identificador e por CPF | Must | É o acesso mais usado pelo cadastro de aluno e de servidor |
| Busca por nome, RG e prefixo de identificador | Must | É o mecanismo de seleção de pessoa em todas as telas |
| Unificação de pessoas com repontuação de chaves | Must | Único mecanismo de reparo de duplicidade no legado |
| Log de unificação com snapshot dos dados anteriores | Must | É o que torna a operação auditável e reversível |
| Unificação de servidor antes da pessoa | Must | Preserva a alocação docente e o código INEP do docente |
| Desfeito da unificação de aluno | Must | Existe no legado e é exigido pela secretaria escolar |
| Recusa de unificação com mais de um aluno ativo | Must | Protege a integridade da matrícula |
| Reativação de pessoa inativa | Should | Existe no legado e é usada para recuperar cadastro |
| Desfeito da unificação de pessoa | Should | O contrato existe, mas a implementação está vazia no legado |
| Comparação de dados das pessoas candidatas | Should | Apoia a decisão manual do operador, sem automatizar |
| Unificação automática por similaridade de nome ou documento | Could | Ausente no legado e tratada como componente futuro no modelo novo |
| Validação de compatibilidade de documentos antes da unificar | Could | Ausente no legado e tratada como componente futuro no modelo novo |
| Verificação de identidade por biometria ou prova de vínculo | Could | Ausente no legado |

> Prioridade inferida por frequência de chamada e posição na cadeia de dependências.

---

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `ieducar/modules/Api/Views/PessoaController.php` | `get`, `post`, `loadDetails`, `createOrUpdatePessoaFisica`, validações e busca | 🟢 |
| `ieducar/modules/Api/Views/PessoajController.php` | API da pessoa jurídica | 🟡 |
| `ieducar/modules/Api/Views/AlunoController.php` | Gravação do aluno a partir da pessoa | 🟢 |
| `ieducar/lib/App/Unificacao/Base.php` | Mecanismo genérico de unificação, log de dados anteriores e gatilhos | 🟢 |
| `ieducar/lib/App/Unificacao/Pessoa.php` | Tabelas e colunas da unificação de pessoa | 🟢 |
| `ieducar/lib/App/Unificacao/Servidor.php` | Tabelas e colunas da unificação de servidor | 🟢 |
| `ieducar/lib/App/Unificacao/Aluno.php` | Unificação de aluno, com deslocamento de sequencial do histórico | 🟢 |
| `ieducar/intranet/educar_unifica_pessoa.php` | Tela de unificação de pessoa, validações e criação do log | 🟢 |
| `ieducar/intranet/scripts/extra/educar-unifica-pessoa.js` | Seleção das pessoas candidatas | 🟡 |
| `app/Services/UnificationService.php` | Gravação do log de dados anteriores | 🟢 |
| `app/Services/StudentUnificationService.php` | Desfeito da unificação e verificação de permissão | 🟢 |
| `app/Services/ValidationDataService.php` | Verificação de quantidade e de duplicidade na seleção | 🟢 |
| `app/Models/LogUnification.php` | Registro de unificação, com tipo polimórfico e nomes | 🟢 |
| `app/Models/LogUnificationOldData.php` | Snapshot dos dados anteriores, com chaves e conteúdo em JSON | 🟢 |
| `src/Modules/Unification/LogUnificationTypeInterface.php` | Contrato comum dos tipos de unificação | 🟢 |
| `src/Modules/Unification/PersonLogUnification.php` | Adaptador de unificação de pessoa, com desfeito vazio | 🟢 |
| `src/Modules/Unification/StudentLogUnification.php` | Adaptador de unificação de aluno | 🟢 |
| `app/Http/Controllers/PersonLogUnificationController.php` | Consulta do log de unificações de pessoa | 🟢 |
| `app/Http/Controllers/StudentLogUnificationController.php` | Consulta do log de unificações de aluno e desfeito | 🟢 |
| `app/Models/LegacyPerson.php` | Entidade da pessoa genérica e seus vínculos | 🟢 |
| `app/Models/LegacyIndividual.php` | Entidade da pessoa física e seus vínculos | 🟢 |
| `app/Models/Individual.php` | Entidade da pessoa física no modelo novo | 🟡 |
| `app/Models/Person.php` | Entidade da pessoa no SYSGOV Core, com tipo e origem de registro | 🟢 |
| `app/Models/PersonType.php` | Domínio de tipo de pessoa: física e jurídica | 🟢 |
| `app/Models/PersonHasPlace.php` | Vínculo de pessoa e endereço | 🟢 |
| `src/Modules/Addressing/LegacyAddressingFields.php` | Gravação de endereço da pessoa | 🟢 |
| `app/Services/PhoneService.php` | Gravação de telefone da pessoa | 🟢 |
| `database/migrations/legacy/2020_01_01_110000_create_cadastro_pessoa_table.php` | Estrutura da pessoa | 🟢 |
| `database/migrations/legacy/2020_01_01_110000_create_cadastro_fisica_table.php` | Estrutura da pessoa física | 🟢 |
| `database/migrations/legacy/2020_01_01_110000_create_cadastro_documento_table.php` | Estrutura do documento | 🟢 |
| `database/migrations/legacy/2020_01_01_110000_create_cadastro_fone_pessoa_table.php` | Estrutura do telefone | 🟢 |
| `database/migrations/legacy/2020_01_01_110000_create_cadastro_fisica_raca_table.php` | Vínculo de raça | 🟢 |
| `database/migrations/legacy/2020_01_01_110000_create_cadastro_fisica_deficiencia_table.php` | Vínculo de deficiência | 🟢 |
| `_reversa_sdd/adrs/003-unified-person-identity-and-deduplication.md` | Decisão arquitetural da identidade canônica | 🟢 |
