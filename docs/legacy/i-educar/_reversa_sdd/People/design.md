# People (i-Educar legado), Design Técnico

> Descreve o **COMO** o subsistema de cadastro de pessoas legado é construído, com base no código lido.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Interface

### Entidades do domínio legado

| Entidade | Chave | Atributos observados | Fonte |
|----------|-------|----------------------|-------|
| Pessoa | `idpes` | nome, tipo `F` ou `J`, situação, origem de gravação, operação, e-mail, autor de cadastro, autor de revisão, data de cadastro, data de revisão, url | `database/migrations/legacy/2020_01_01_110000_create_cadastro_pessoa_table.php:22-40` |
| Pessoa física | `idpes` | data de nascimento, sexo, filiação por `idpes_mae`, `idpes_pai`, `idpes_responsavel` e `idpes_con`, estado civil, naturalidade, nacionalidade, país estrangeiro, data de chegada, nome da mãe, do pai, do cônjuge e do responsável, CPF, NIS, SUS, ocupação, falecido, ativo, zona de localização do Censo, localização diferenciada, nome social, país de residência | `database/migrations/legacy/2020_01_01_110000_create_cadastro_fisica_table.php:17-70` |
| Documento | `idpes` | RG, data e unidade federativa de emissão, órgão emissor, tipo de certidão civil, termo, livro, folha, cartório, certidão de nascimento, certidão de casamento, passaporte, comprovante de residência, título de eleitor, certidão de trabalho | `database/migrations/legacy/2020_01_01_110000_create_cadastro_documento_table.php` |
| Telefone | `idpes`, `tipo` | tipo de 1 a 4, DDD, número, autor de cadastro, autor de revisão | `database/migrations/legacy/2020_01_01_110000_create_cadastro_fone_pessoa_table.php` |
| Raça | `ref_idpes`, `ref_cod_raca` | vínculo da pessoa à raça ou cor | `database/migrations/legacy/2020_01_01_110000_create_cadastro_fisica_raca_table.php` |
| Deficiência | `ref_idpes`, `ref_cod_deficiencia` | vínculo da pessoa à deficiência ou transtorno, com código do Censo Escolar | `database/migrations/legacy/2020_01_01_110000_create_cadastro_fisica_deficiencia_table.php` |
| Pessoa e endereço | `person_id`, `place_id`, `type` | vínculo tipado entre a pessoa e o endereço | `app/Models/PersonHasPlace.php` |
| Pessoa jurídica | `idpes` | razão social, CNPJ, fantasia | `database/migrations/legacy/2020_01_01_110000_create_cadastro_juridica_table.php` |
| Log de unificação | `id` | tipo, `main_id`, `duplicates_id`, `duplicates_name`, autor de cadastro, autor de revisão, ativo | `app/Models/LogUnification.php:20-30` |
| Log de dados anteriores | `unification_id` | tabela, chaves em JSON, dados anteriores em JSON | `app/Models/LogUnificationOldData.php:13-35` |

### Domínio do tipo de pessoa

| Valor | Constante | Rótulo |
|-------|-----------|--------|
| 1 | `INDIVIDUAL` | Pessoa Física |
| 2 | `ORGANIZATION` | Pessoa Jurídica |

Fonte: `app/Models/PersonType.php:7-24`. A tabela legada `cadastro.pessoa` usa o par de caracteres `F` e `J`. 🟢

### Endpoints HTTP

| Método | Caminho | Entrada | Saída | Permissão |
|--------|---------|---------|-------|-----------|
| GET | `/module/Api/Pessoa?pessoa` | `id` ou `cpf` | Pessoa com detalhes, documentos, contatos e deficiências | Leitura |
| GET | `/module/Api/Pessoa?pessoa-search` | `tipo`, `valor` | Lista de até 15 pessoas | Leitura |
| POST | `/module/Api/Pessoa?pessoa` | `pessoa_id`, `nome`, `nome_social`, `datanasc`, `sexo`, `cpf`, `estadocivil`, `naturalidade`, `pais_residencia`, `tipo_nacionalidade`, `pais_origem_id`, `zona_localizacao_censo`, `localizacao_diferenciada`, `cor_raca`, `falecido`, telefones | `pessoa_id` | Leitura |
| POST | `/module/Api/Pessoa?pessoa-endereco` | `person_id`, `postal_code`, `address`, `number`, `complement`, `neighborhood`, `city_id` | Endereço gravado | Leitura |
| GET | `/module/Api/Pessoa?pessoa-parent` | `id` | Dados do responsável: nome, estado civil, nascimento, sexo, falecido, CPF | Leitura |
| GET | `/module/Api/Pessoa?reativarPessoa` | `id` | Pessoa reativada | Leitura |
| GET | `/module/Api/Pessoa?dadosUnificacaoPessoa` | `pessoas_ids` | Dados comparativos das pessoas candidatas | Leitura |
| GET | `/module/Api/Pessoa?info-servidor` | `servidor_id` | Código INEP e deficiências do servidor | Leitura |
| GET | `/module/Api/Pessoa?exist-servidor` | `servidor_id` | Existência, identificador, instituição e nome do servidor | Leitura |
| GET | `/intranet/educar_unifica_pessoa.php` | `pessoas` em JSON | Tela de unificação de pessoas | Processo 9998878, nível 7 |
| GET | `/unificacao-pessoa` | `name`, `cpf` | Log de unificações de pessoa, paginado | Leitura |
| GET | `/unificacao-pessoa/{unification}` | — | Detalhe da unificação | Leitura |

### Funções e classes

| Símbolo | Assinatura | Retorno | Observação |
|---------|-----------|---------|------------|
| `PessoaController::get` | `()` | `array` | Carrega a pessoa por identificador ou por CPF e mescla os detalhes 🟢 `ieducar/modules/Api/Views/PessoaController.php:461-482` |
| `PessoaController::loadDetails` | `(?int $pessoaId)` | `array` | Consulta única com as subconsultas de documentos, telefones e filiação 🟢 `PessoaController.php:94-303` |
| `PessoaController::loadPessoaByCpf` | `(?string $cpf)` | `array` | Remove os caracteres não numéricos e recusa CPF sem dígitos 🟢 `PessoaController.php:77-92` |
| `PessoaController::validateCpf` | `()` | `bool` | Valida módulo 11, obrigatoriedade e unicidade 🟢 `PessoaController.php:542-572` |
| `PessoaController::createOrUpdatePessoa` | `(?int $pessoaId)` | `int` | Cria ou atualiza a pessoa genérica 🟢 `PessoaController.php:590-611` |
| `PessoaController::createOrUpdatePessoaFisica` | `(int $pessoaId)` | `void` | Grava a pessoa física, a raça e os telefones 🟢 `PessoaController.php:613-675` |
| `PessoaController::dadosUnificacaoPessoa` | `()` | `array` | Consulta comparativa com junções laterais de vínculo 🟢 `PessoaController.php:735-797` |
| `PessoaController::reativarPessoa` | `()` | `mixed` | Religa o registro físico por SQL direto 🟢 `PessoaController.php:726-733` |
| `App_Unificacao_Base::unifica` | `()` | `void` | Orquestra desativação de gatilhos, três grupos de repontuação e reativação 🟢 `ieducar/lib/App/Unificacao/Base.php:42-55` |
| `App_Unificacao_Base::processaChavesManterPrimeiroVinculo` | `()` | `void` | Remove os registros das duplicadas e repontua para a principal 🟢 `Base.php:111-146` |
| `App_Unificacao_Base::processaChavesManterTodosVinculos` | `()` | `void` | Repontua os vínculos de referência, preservando todos 🟢 `Base.php:89-109` |
| `App_Unificacao_Base::processaChavesDeletarDuplicados` | `()` | `void` | Remove os registros duplicados ou os repontua, conforme a existência 🟢 `Base.php:57-87` |
| `App_Unificacao_Base::storeLogOldDataByKeys` | `(array $oldKeys, string $table, string $columnKey)` | `void` | Grava o snapshot dos dados anteriores 🟢 `Base.php:205-221` |
| `App_Unificacao_Pessoa::unifica` | `()` | `void` | Executa primeiro a unificação de servidor e depois a de pessoa 🟢 `ieducar/lib/App/Unificacao/Pessoa.php:213-218` |
| `App_Unificacao_Pessoa::validaParametros` | `()` | `void` | Recusa a unificação com mais de uma pessoa vinculada a alunos 🟢 `Pessoa.php:220-228` |
| `App_Unificacao_Aluno::unifica` | `(int $codAlunoPrincipal, array $codAlunos, int $codPessoa, clsBanco $db, $unificationId)` | `bool` | Repontua histórico e matrículas, desativa os duplicados 🟢 `ieducar/lib/App/Unificacao/Aluno.php` |
| `UnificationService::storeLogOldData` | `($unificationId, $table, $keys, $oldData)` | `LogUnificationOldData` | Grava o snapshot em JSON 🟢 `app/Services/UnificationService.php:11-19` |
| `StudentUnificationService::undo` | `(LogUnification $unification)` | `void` | Desfaz a unificação e desativa o registro do log 🟢 `app/Services/StudentUnificationService.php:27-38` |
| `StudentUnificationService::canUndo` | `(LogUnification $unification)` | `void` | Verifica atividade, existência da principal e permissão 🟢 `StudentUnificationService.php:40-51` |
| `ValidationDataService::verifyQuantityByKey` | `($data, $key, $quantity)` | `bool` | Verifica a quantidade de itens com a chave verdadeira 🟢 `app/Services/ValidationDataService.php` |
| `ValidationDataService::verifyDataContainsDuplicatesByKey` | `($data, $key)` | `bool` | Verifica se há identificadores repetidos na seleção 🟢 `ValidationDataService.php` |
| `LegacyIndividual::findByCpf` | `(string $cpf)` | `?LegacyIndividual` | Localiza a pessoa física pelo CPF 🟢 `app/Models/LegacyIndividual.php` |
| `PersonLogUnification::undo` | `(LogUnification $logUnification)` | `void` | Corpo vazio: o desfeito de pessoa não é implementado 🟢 `src/Modules/Unification/PersonLogUnification.php:28-30` |

---

## Fluxo Principal

1. A secretaria escolar busca a pessoa pelo nome, pelo RG ou por prefixo de identificador, e a seleção devolve até 15 resultados. 🟢 `ieducar/modules/Api/Views/PessoaController.php:375-459`
2. A pessoa selecionada é carregada com seus detalhes civis, documentos, telefones, filiação e deficiências. 🟢 `PessoaController.php:461-482`
3. Na gravação, o nome, o nome social, a data de nascimento, a localização diferenciada e o CPF são validados em sequência. 🟢 `PessoaController.php:574-577`
4. A pessoa genérica é criada ou atualizada, com o tipo `F` e o autor do cadastro ou da revisão. 🟢 `PessoaController.php:590-611`
5. A pessoa física é gravada com `saveOrFail`, com a data convertida e o país estrangeiro anulado quando a nacionalidade é brasileira. 🟢 `PessoaController.php:613-645`
6. A raça é sincronizada ou desvinculada, e os telefones são gravados pelo serviço de telefone. 🟢 `PessoaController.php:647-674`
7. O endereço é gravado pelo helper de endereçamento, com a tipagem de endereço da pessoa. 🟢 `PessoaController.php:677-688`

---

## Fluxos Alternativos

- **Consulta por CPF:** os caracteres não numéricos são removidos e, se não restar dígito, a operação é interrompida com mensagem específica. 🟢 `PessoaController.php:79-83`
- **CPF em uso:** a gravação é recusada com o identificador da pessoa que já utiliza o CPF. 🟢 `PessoaController.php:563-569`
- **CPF obrigatório:** a instituição com a configuração ativa recusa a gravação de pessoa sem CPF. 🟢 `PessoaController.php:545-555`
- **Nacionalidade brasileira:** o país de origem estrangeiro é anulado na gravação. 🟢 `PessoaController.php:625-627`
- **Raça ausente:** todos os vínculos de raça da pessoa são desvinculados. 🟢 `PessoaController.php:650-652`
- **Telefone vazio:** o serviço de telefone é chamado mesmo com o número vazio, o que remove o contato anterior. 🟢 `PessoaController.php:659-674`
- **Nome social na busca:** o resultado exibe o nome social com o nome de registro entre parênteses textuais. 🟢 `PessoaController.php:383-388`
- **Pessoa sem documentação:** o detalhe expõe o indicador de posse de documento, falso quando não há CPF, NIS e certidão. 🟢 `PessoaController.php:150-154`
- **Responsável sem cadastro:** o nome do pai e da mãe é resolvido por coalescência com o texto herdado do cadastro do aluno. 🟢 `PessoaController.php:102-106`
- **Reativação de pessoa:** o registro físico é religado por SQL direto, sem validação de dependências. 🟢 `PessoaController.php:726-733`
- **Unificação com mais de um aluno ativo:** a operação é recusada antes de qualquer alteração, com a orientação de unificar os alunos. 🟢 `ieducar/lib/App/Unificacao/Pessoa.php:220-228`
- **Unificação sem pessoa principal ou com duas principais:** a operação é recusada na validação da tela. 🟢 `ieducar/intranet/educar_unifica_pessoa.php:98-108`
- **Unificação com cadastro repetido na seleção:** a operação é recusada pela verificação de duplicidade. 🟢 `educar_unifica_pessoa.php:110-114`
- **Falha durante a unificação:** a transação é revertida e a mensagem da exceção é apresentada ao operador. 🟢 `educar_unifica_pessoa.php:124-132`
- **Desfeito sem permissão:** o desfeito da unificação é recusado por falta de escola em comum ou por nível de usuário. 🟢 `app/Services/StudentUnificationService.php:80-107`

---

## Dependências

- **Cadastro de aluno (`pmieducar.aluno`):** principal consumidor da pessoa, e fonte dos nomes de pai e mãe herdados. 🟢 `ieducar/modules/Api/Views/PessoaController.php:103-105`
- **Cadastro de servidor (`pmieducar.servidor`):** segundo consumidor da pessoa, e origem do vínculo de docência. 🟢 `PessoaController.php:761`
- **Cadastro de usuário (`pmieducar.usuario`):** terceiro consumidor da pessoa, pelo mesmo identificador. 🟢 `PessoaController.php:763`
- **Portal (`portal.funcionario`, `portal.acesso`, `portal.agenda`):** quarto consumidor, no esquema de acesso do portal. 🟢 `ieducar/lib/App/Unificacao/Pessoa.php:162-189`
- **Documento (`cadastro.documento`):** guarda a identidade civil e a certidão de nascimento. 🟢 `PessoaController.php:107-124`
- **Telefone (`cadastro.fone_pessoa`):** guarda os contatos, com tipo e DDD. 🟢 `PessoaController.php:137-140`
- **Raça e deficiência (`cadastro.fisica_raca`, `cadastro.fisica_deficiencia`):** vínculos da pessoa física. 🟢 `app/Models/LegacyIndividual.php:113` e `:141`
- **Endereço (`public.person_has_place` e `addresses`):** endereço da pessoa, com tipagem. 🟢 `app/Models/LegacyPerson.php:172`
- **Censo Escolar (`src/Modules/Educacenso/`):** consome nome, nascimento, sexo, raça, filiação, naturalidade, país, endereço, NIS e certidão no Registro 30. 🟢 `app/Repositories/EducacensoRepository.php:411-524`
- **Módulo de endereço (`src/Modules/Addressing/LegacyAddressingFields.php`):** gravação do endereço da pessoa. 🟢 `ieducar/modules/Api/Views/PessoaController.php:677-688`
- **Serviço de telefone (`app/Services/PhoneService.php`):** gravação dos contatos. 🟢 `PessoaController.php:660-673`
- **Validadores do Censo Escolar (`NameValidator`, `BirthDateValidator`, `DifferentiatedLocationValidator`):** reusados na validação da pessoa. 🟢 `PessoaController.php:484-540`
- **Instituição (`LegacyInstitution`):** define a obrigatoriedade do CPF. 🟢 `PessoaController.php:545`
- **Módulo de transporte escolar (`modules.*`):** referencia a pessoa em empresa, motorista, rota e pessoa de transporte. 🟢 `ieducar/lib/App/Unificacao/Pessoa.php:110-141`
- **Gestores escolares (`public.school_managers`):** referencia a pessoa pelo identificador do servidor. 🟢 `Pessoa.php:194-196`

---

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---------|---------------------|-----------|
| Separação entre pessoa genérica e pessoa física, com o mesmo identificador como chave | `database/migrations/legacy/2020_01_01_110000_create_cadastro_fisica_table.php:18` | 🟢 |
| Um único identificador `idpes` compartilhado por pessoa, aluno, servidor e usuário | `app/Models/LegacyPerson.php:29` e `app/Models/LegacyIndividual.php:38` | 🟢 |
| Identificador numérico gerado por sequência do PostgreSQL, e não por uuid | `database/migrations/legacy/2020_01_01_110000_create_cadastro_pessoa_table.php:16-20` | 🟢 |
| Validação de CPF por módulo 11 na aplicação, e não por índice único no banco | `ieducar/modules/Api/Views/PessoaController.php:557-569` | 🟢 |
| Recusa de unificação quando há mais de uma pessoa vinculada a alunos ativos | `ieducar/lib/App/Unificacao/Pessoa.php:220-228` | 🟢 |
| Unificação de pessoa precedida pela unificação de servidor, para preservar a docência | `ieducar/lib/App/Unificacao/Pessoa.php:213-218` | 🟢 |
| Classificação das chaves de unificação em três grupos: propriedade, referência e exclusão | `ieducar/lib/App/Unificacao/Base.php:9-15` | 🟢 |
| Desativação de gatilhos de banco durante a unificação, com reativação ao final | `Base.php:160-185` | 🟢 |
| Snapshot dos dados anteriores de cada tabela alterada, com chaves e conteúdo em JSON | `Base.php:205-221` e `app/Services/UnificationService.php:11-19` | 🟢 |
| Unificação registrada em log polimórfico, com adapter por tipo | `app/Models/LogUnification.php:100-133` e `src/Modules/Unification/LogUnificationTypeInterface.php` | 🟢 |
| Desfeito modelado por adapter, com o contrato declarado e a implementação de pessoa vazia | `src/Modules/Unification/PersonLogUnification.php:28-30` | 🟢 |
| Permissão de desfeito de unificação avaliada por nível de usuário e por escola em comum | `app/Services/StudentUnificationService.php:56-107` | 🟢 |
| Busca limitada a 15 resultados, com nome social exibido à frente do nome de registro | `ieducar/modules/Api/Views/PessoaController.php:383-402` | 🟢 |
| Validadores do Censo Escolar reutilizados na camada de cadastro de pessoa | `PessoaController.php:484-540` | 🟢 |
| Telefone gravado com a mesma chamada mesmo quando vazio, para permitir a remoção | `PessoaController.php:659-674` | 🟢 |

---

## Estado Interno

O subsistema é **sem estado próprio**: o estado da pessoa é espalhado entre a pessoa genérica, a pessoa física e as tabelas de vínculo, sem consolidate único. 🟢

Campos de estado observados:

- `situacao` na pessoa, que admite `A`, `I` e `P`. 🟢 `database/migrations/legacy/2020_01_01_110000_create_cadastro_pessoa_table.php:36`
- `origem_gravacao` e `operacao` na pessoa, que registram a origem e a natureza da última escrita. 🟢 `cadastro.pessoa:37-38`
- `ativo` na pessoa física, que marca a inativação lógica. 🟢 `database/migrations/legacy/2020_01_01_110000_create_cadastro_fisica_table.php:59`
- `falecido` na pessoa física, propagado a partir da situação de falecimento da matrícula. 🟢 `ieducar/modules/Api/Views/PessoaController.php:623`
- `nome_social` na pessoa física, exibido à frente do nome de registro na busca. 🟢 `PessoaController.php:631`
- `zona_localizacao_censo` e `localizacao_diferenciada` na pessoa física, que alimentam o Registro 30. 🟢 `PessoaController.php:629-630`
- `pais_residencia` na pessoa física, que decide a anulação do endereço na exportação. 🟢 `PessoaController.php:622`
- `tipo` na pessoa, que distingue pessoa física de pessoa jurídica. 🟢 `cadastro.pessoa:34`
- `ativo` no log de unificação, que marca a unificação como reversível. 🟢 `app/Services/StudentUnificationService.php:35`
- `idpes_cad` e `idpes_rev` em todas as tabelas de cadastro, que registram a autoria. 🟢 `cadastro.pessoa:24` e `:33`

Não há, no legado, indicador de pessoa unificada, histórico de alterações de conteúdo da pessoa, nem estado de revisão cadastral. 🔴

---

## Observabilidade

- As mensagens de validação são anexadas ao mensageiro e devolvidas na resposta, com texto específico por regra violada. 🟢 `ieducar/modules/Api/Views/PessoaController.php:489` e `:503`
- A pessoa duplicada é identificada na mensagem de recusa do CPF, com o identificador da pessoa que o utiliza. 🟢 `PessoaController.php:566`
- A unificação registra a mensagem de sucesso ou o texto da exceção, com rollback em caso de falha. 🟢 `ieducar/intranet/educar_unifica_pessoa.php:127-134`
- O log de unificação guarda o nome das pessoas duplicadas, o que permite a identificação posterior sem consultar o log de dados antigos. 🟢 `educar_unifica_pessoa.php:178`
- O log de dados anteriores guarda o snapshot completo de cada tabela alterada, o que permite auditoria e reversão. 🟢 `app/Services/UnificationService.php:11-19`
- A falha de desfeito da unificação é devolvida como erro de validação, com o texto da exceção. 🟢 `app/Http/Controllers/StudentLogUnificationController.php:36-45`
- Não há log estruturado, métrica ou rastreamento distribuído no subsistema. 🔴

---

## Riscos e Lacunas

- 🔴 A unificação concatena os identificadores nas consultas SQL, sem parametrização, e o identificador vem da seleção feita na interface.
- 🔴 A unificação executa comandos DDL de desativação e reativação de gatilhos fora da transação da aplicação, de modo que uma falha intermediária pode deixar gatilhos desabilitados. 🟢 `ieducar/lib/App/Unificacao/Base.php:167-185`
- 🔴 A unificação de pessoa não remove o registro da pessoa duplicada em `cadastro.pessoa`: a linha é repontada para a principal, o que produz duas linhas apontando para o mesmo identificador em tabelas que referenciam `idpes`. 🟢 `Base.php:111-146`
- 🔴 O desfeito da unificação de pessoa está declarado no contrato, mas o corpo do método é vazio, o que torna a operação irreversível. 🟢 `src/Modules/Unification/PersonLogUnification.php:28-30`
- 🔴 A reativação de pessoa é feita por SQL direto, sem verificar dependências, vínculos ativos ou a situação da pessoa no cadastro. 🟢 `ieducar/modules/Api/Views/PessoaController.php:726-733`
- 🔴 A unicidade do CPF é verificada na aplicação, sem índice único no banco, o que permite duplicidade por concorrência ou por escrita fora da API.
- 🔴 A consulta de detalhes da pessoa resolve cada documento, telefone e vínculo por subconsulta correlacionada, o que produz uma consulta por pessoa consultada.
- 🔴 A unificação de pessoa repontua 45 tabelas por comando UPDATE, e a lista é mantida em código, o que exige atualização manual a cada tabela nova. 🟢 `ieducar/lib/App/Unificacao/Pessoa.php:5-197`
- 🟡 A filiação é resolvida por coalescência entre a pessoa cadastrada e o texto herdado do cadastro do aluno, o que pode produzir nome divergente entre as duas fontes.
- 🟡 A pessoa física e a pessoa genérica podem divergir, porque a API atualiza campos em tabelas diferentes sem transação que as amarre.
- 🟡 O indicador de posse de documento é calculado a partir de três campos, e não é persistido, o que impede a geração de relatórios de pendência sem recálculo.
- 🟡 A busca de pessoas usa o nome social concatenado ao nome de registro em texto, o que impede a ordenação e o filtro por cada um dos nomes separadamente.
- 🟡 A pessoa não tem vínculo de fotografia no subsistema de pessoa, apenas em `cadastro.fisica_foto`, o que exige consulta adicional para exibição.
