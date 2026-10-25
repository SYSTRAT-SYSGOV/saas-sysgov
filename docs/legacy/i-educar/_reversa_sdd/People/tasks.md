# People (i-Educar legado), Tarefas de Implementação

> Sequência de tarefas executáveis para reimplementar a unit de cadastro de pessoas a partir do legado, com rastreabilidade ao código original.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Pré-requisitos

- [ ] Dependências da unit listadas em `design.md` estão disponíveis: aluno, servidor, usuário, portal, documento, telefone, raça, deficiência, endereço e módulo de endereçamento.
- [ ] Schema e migrations do banco compatíveis com as tabelas `people`, `individuals` e `person_has_place` descritas em `_reversa_sdd/People/legacy-mapping.md`, com `tenant_id` em todas as entidades.
- [ ] Chave de identidade civil definida para o modelo novo, com a política de CPF único por tenant e o catálogo de motivos de ausência de documento.
- [ ] Catálogos de tipo de pessoa, de país de residência, de nacionalidade, de estado civil, de raça e de deficiência carregados em tabelas de referência.
- [ ] Catálogo de vínculos de unificação mantido em configuração versionada, e não em classes de código.
- [ ] Contrato do pacote `@sysgov/sdk` definido para pessoa, pessoa física, documento, contato, endereço e unificação.

---

## Tarefas

> Cada tarefa referencia o arquivo do legado de onde o comportamento foi extraído.

- [ ] T-01, Modelar a pessoa com tenant, identificador, nome, nome social, tipo, situação, origem de registro, contatos e vínculos
  - Origem no legado: `database/migrations/legacy/2020_01_01_110000_create_cadastro_pessoa_table.php:22-40`
  - Critério de pronto: tabela `people` criada, com tipo e situação restringidos ao catálogo, e teste de recusa de valor fora do domínio
  - Confiança: 🟡

- [ ] T-02, Modelar a pessoa física com data de nascimento, sexo, filiação, estado civil, nacionalidade, naturalidade, país de residência e marcadores do Censo Escolar
  - Origem no legado: `database/migrations/legacy/2020_01_01_110000_create_cadastro_fisica_table.php:17-70`
  - Critério de pronto: tabela `individuals` criada, com o mesmo identificador da pessoa, e teste de recusa de sexo fora do domínio
  - Confiança: 🟡

- [ ] T-03, Modelar o documento civil da pessoa, com RG, certidão de nascimento, certidão de casamento, passaporte e dados de emissão
  - Origem no legado: `database/migrations/legacy/2020_01_01_110000_create_cadastro_documento_table.php`
  - Critério de pronto: tabela `person_documents` criada, com teste de gravação e leitura de todos os campos migrados
  - Confiança: 🟡

- [ ] T-04, Modelar os contatos da pessoa, com tipo, DDD e número
  - Origem no legado: `database/migrations/legacy/2020_01_01_110000_create_cadastro_fone_pessoa_table.php`
  - Critério de pronto: tabela `person_phones` criada, com restrição de tipo ao catálogo e teste de remoção pelo número vazio
  - Confiança: 🟡

- [ ] T-05, Modelar os vínculos tipados da pessoa: endereço, raça, deficiência, filiação e fotografia
  - Origem no legado: `app/Models/LegacyPerson.php:172`, `app/Models/LegacyIndividual.php:113` e `:141`
  - Critério de pronto: tabelas de vínculo criadas, com teste de desvinculação da raça e de substituição do endereço
  - Confiança: 🟡

- [ ] T-06, Implementar a validação do nome e do nome social, com o validador de nome
  - Origem no legado: `ieducar/modules/Api/Views/PessoaController.php:484-510`
  - Critério de pronto: nome inválido e nome social inválido são recusados com a mensagem do validador, com teste para cada caso
  - Confiança: 🟢

- [ ] T-07, Implementar a validação da data de nascimento, com conversão de formato na borda
  - Origem no legado: `ieducar/modules/Api/Views/PessoaController.php:512-527`
  - Critério de pronto: data inválida é recusada e data válida é gravada no formato de armazenamento, com teste de ida e volta
  - Confiança: 🟢

- [ ] T-08, Implementar a validação da localização diferenciada em conjunto com a zona de localização do Censo Escolar
  - Origem no legado: `ieducar/modules/Api/Views/PessoaController.php:529-540`
  - Critério de pronto: a combinação inválida é recusada, com teste para a combinação aceita e para a recusada
  - Confiança: 🟢

- [ ] T-09, Implementar a validação do CPF por módulo 11, com obrigatoriedade configurável pela instituição
  - Origem no legado: `ieducar/modules/Api/Views/PessoaController.php:542-560`
  - Critério de pronto: CPF inválido é recusado, e a ausência de CPF é recusada apenas quando a instituição exige, com teste para os dois regimes
  - Confiança: 🟢

- [ ] T-10, Implementar a unicidade do CPF por índice no banco, com recusa de gravação e mensagem idêntica à do legado
  - Origem no legado: `ieducar/modules/Api/Views/PessoaController.php:563-569`
  - Critério de pronto: índice único por tenant e por CPF, e a gravação concorrente é recusada em vez de gerar duplicidade
  - Confiança: 🟡

- [ ] T-11, Implementar a gravação da pessoa e da pessoa física em transação única, com a anulação do país estrangeiro para nacionalidade brasileira
  - Origem no legado: `ieducar/modules/Api/Views/PessoaController.php:579-645`
  - Critério de pronto: a gravação é atômica entre as duas entidades e a pessoa brasileira fica sem país de origem estrangeiro
  - Confiança: 🟡

- [ ] T-12, Implementar a consulta da pessoa por identificador e por CPF, com o resumo de posse de documento
  - Origem no legado: `ieducar/modules/Api/Views/PessoaController.php:59-303` e `:461-482`
  - Critério de pronto: a consulta por CPF remove os caracteres não numéricos, recusa CPF sem dígitos e devolve o indicador de posse de documento
  - Confiança: 🟢

- [ ] T-13, Implementar a busca de pessoas por fragmento de nome, por prefixo de identificador, de CPF e de RG, com o nome social exibido à frente
  - Origem no legado: `ieducar/modules/Api/Views/PessoaController.php:375-459` e `:824-848`
  - Critério de pronto: a busca exclui pessoa inativa, limita o resultado e exibe o nome social junto do nome de registro
  - Confiança: 🟢

- [ ] T-14, Implementar a gravação do endereço da pessoa, com tipagem de endereço e normalização pelo serviço de CEP
  - Origem no legado: `ieducar/modules/Api/Views/PessoaController.php:677-688` e `src/Modules/Addressing/LegacyAddressingFields.php`
  - Critério de pronto: o endereço é gravado com o tipo correto e a mudança de endereço não duplica o registro anterior
  - Confiança: 🟢

- [ ] T-15, Implementar a reativação de pessoa, com verificação de vínculos e de dependências antes da reativação
  - Origem no legado: `ieducar/modules/Api/Views/PessoaController.php:726-733`
  - Critério de pronto: a pessoa é reativada e a operação é recusada quando existe vínculo ativo conflitante
  - Confiança: 🟡

- [ ] T-16, Implementar a comparação de dados das pessoas candidatas à unificação, com nome, nascimento, sexo, CPF, RG, nome da mãe e vínculos
  - Origem no legado: `ieducar/modules/Api/Views/PessoaController.php:735-797`
  - Critério de pronto: a comparação classifica o vínculo como aluno, responsável, servidor, usuário ou sem vínculo, com teste para cada classificação
  - Confiança: 🟢

- [ ] T-17, Implementar o motor de unificação com os três grupos de chaves: propriedade, referência e exclusão
  - Origem no legado: `ieducar/lib/App/Unificacao/Base.php:9-146`
  - Critério de pronto: as três rotinas de repontuação existem e cada uma tem teste com fixture de pessoa, aluno e servidor
  - Confiança: 🟢

- [ ] T-18, Implementar o catálogo de chaves de unificação em configuração versionada, com as 45 tabelas do legado
  - Origem no legado: `ieducar/lib/App/Unificacao/Pessoa.php:5-197` e `Servidor.php`
  - Critério de pronto: o catálogo é carregado de configuração ou de tabela, e a adição de uma tabela nova não exige alterar código
  - Confiança: 🟡

- [ ] T-19, Implementar o snapshot dos dados anteriores de cada tabela alterada, com chaves e conteúdo em JSON
  - Origem no legado: `ieducar/lib/App/Unificacao/Base.php:205-221` e `app/Services/UnificationService.php:11-19`
  - Critério de pronto: para cada tabela alterada há um registro com o conteúdo anterior, e a reversão é possível a partir dele
  - Confiança: 🟢

- [ ] T-20, Implementar a unificação de pessoa dentro de transação atômica, com a desativação de gatilhos dentro do escopo transacional
  - Origem no legado: `ieducar/lib/App/Unificacao/Base.php:42-55` e `:160-185`
  - Critério de pronto: uma falha intermediária reverte todos os dados e não deixa gatilho desabilitado
  - Confiança: 🟡

- [ ] T-21, Implementar a unificação de servidor antes da unificação de pessoa, preservando a alocação docente e o código INEP do docente
  - Origem no legado: `ieducar/lib/App/Unificacao/Pessoa.php:213-218` e `ieducar/lib/App/Unificacao/Servidor.php`
  - Critério de pronto: após a unificação há um único registro de servidor e um único código INEP de docente, com as alocações preservadas
  - Confiança: 🟢

- [ ] T-22, Implementar a recusa de unificação quando houver mais de uma pessoa vinculada a alunos ativos
  - Origem no legado: `ieducar/lib/App/Unificacao/Pessoa.php:220-228`
  - Critério de pronto: a operação é recusada antes de qualquer alteração, com a orientação de unificar os alunos
  - Confiança: 🟢

- [ ] T-23, Implementar a validação da seleção de unificação, com ao menos duas pessoas, exatamente uma principal e sem cadastros repetidos
  - Origem no legado: `ieducar/intranet/educar_unifica_pessoa.php:87-114` e `app/Services/ValidationDataService.php`
  - Critério de pronto: cada uma das três recusas é testada, com mensagem específica
  - Confiança: 🟢

- [ ] T-24, Implementar a unificação de aluno, com deslocamento de sequencial do histórico escolar e do histórico de disciplinas
  - Origem no legado: `ieducar/lib/App/Unificacao/Aluno.php`
  - Critério de pronto: os históricos ficam vinculados ao aluno principal com sequencial contínuo, e o aluno duplicado é desativado
  - Confiança: 🟢

- [ ] T-25, Implementar o desfeito da unificação de aluno, com verificação de atividade, de existência da principal e de permissão
  - Origem no legado: `app/Services/StudentUnificationService.php:27-107`
  - Critério de pronto: o desfeito restaura os vínculos originais e o log é marcado como inativo, com teste para a falta de permissão de escola
  - Confiança: 🟢

- [ ] T-26, Implementar o desfeito da unificação de pessoa, que está declarado no contrato do legado e sem implementação
  - Origem no legado: `src/Modules/Unification/PersonLogUnification.php:28-30`
  - Critério de pronto: o desfeito restaura a pessoa duplicada e seus vínculos, a partir do snapshot, e o log é marcado como inativo
  - Confiança: 🟡

- [ ] T-27, Implementar a consulta do log de unificações, com filtro por nome, por CPF e por escola, e o detalhe de cada unificação
  - Origem no legado: `app/Http/Controllers/PersonLogUnificationController.php:13-46` e `StudentLogUnificationController.php:13-65`
  - Critério de pronto: a listagem é paginada, o filtro por CPF encontra a unificação e o detalhe exibe o snapshot das tabelas alteradas
  - Confiança: 🟢

- [ ] T-28, Implementar a API do módulo com as rotas de consulta, gravação, busca, endereço, responsável e reativação
  - Origem no legado: `ieducar/modules/Api/Views/PessoaController.php:799-822`
  - Critério de pronto: contrato OpenAPI gerado, com paginação e filtro por tenant em todas as listagens
  - Confiança: 🟡

- [ ] T-29, Implementar o contrato TypeScript da unit no pacote `@sysgov/sdk`
  - Origem no legado: `app/Models/PersonType.php:7-24` e `app/Models/LogUnification.php`
  - Critério de pronto: tipos `Person`, `PersonIndividual`, `PersonDocument`, `PersonPhone`, `PersonGuardian` e `PersonUnification` publicados e consumidos por um cliente de teste
  - Confiança: 🟡

- [ ] T-30, Implementar a trilha de auditoria das alterações da pessoa, com ator, instante e valores anteriores e posteriores
  - Origem no legado: ausência de auditoria de conteúdo no legado, evidenciada por `database/migrations/legacy/2020_01_01_110000_create_cadastro_pessoa_table.php:26-34`
  - Critério de pronto: toda alteração de conteúdo da pessoa gera registro de auditoria consultável por tenant e por pessoa
  - Confiança: 🟡

- [ ] T-31, Implementar a unificação assistida por similaridade de nome e de documento
  - Origem no legado: ausência de assistência no legado, evidenciada por `ieducar/intranet/educar_unifica_pessoa.php:139-152`
  - Critério de pronto: a tela sugere pares candidatos com grau de similaridade, e a seleção continua sendo confirmada pelo operador
  - Confiança: 🟡

- [ ] T-32, Implementar a verificação de compatibilidade de documentos antes da unificação
  - Origem no legado: ausência de verificação no legado, evidenciada por `ieducar/lib/App/Unificacao/Pessoa.php:220-228`
  - Critério de pronto: a unificação é bloqueada quando os documentos de origem e destino são incompatíveis, com relatório do conflito
  - Confiança: 🟡

---

## Tarefas de Teste

- [ ] TT-01, Teste do happy path do fluxo principal de cadastro de pessoa (ver `requirements.md`, Critérios de Aceitação)
- [ ] TT-02, Teste do caso de erro principal: CPF já utilizado por outra pessoa
- [ ] TT-03, Teste da obrigatoriedade do CPF conforme a configuração da instituição
- [ ] TT-04, Teste da anulação do país estrangeiro para nacionalidade brasileira
- [ ] TT-05, Teste da gravação com nome, nome social, data de nascimento e localização inválidos, uma validação por vez
- [ ] TT-06, Teste da remoção de telefone pelo envio de número vazio e da desvinculação da raça
- [ ] TT-07, Teste da busca por nome com nome social, por RG e por prefixo de identificador, com limite de 15 resultados
- [ ] TT-08, Teste da unificação com pessoa, aluno e servidor, verificando a repontuação de todos os vínculos
- [ ] TT-09, Teste da recusa de unificação com mais de uma pessoa vinculada a alunos ativos
- [ ] TT-10, Teste da recusa de unificação com seleção sem principal, com dois principais ou com cadastro repetido
- [ ] TT-11, Teste do desfeito da unificação de aluno, com restauração dos vínculos originais
- [ ] TT-12, Teste da recusa de desfeito por usuário de nível escolar sem escola em comum
- [ ] TT-13, Teste de atomicidade da unificação, com falha intermediária e verificação de rollback completo
- [ ] TT-14, Teste do snapshot das tabelas alteradas, com conferência de cobertura de todas as tabelas do catálogo
- [ ] TT-15, Teste da reativação de pessoa com vínculo ativo conflitante
- [ ] TT-16, Teste de isolamento por tenant em todas as consultas e vínculos
- [ ] TT-17, Teste da classificação de vínculo na comparação de candidatos à unificação, para aluno, responsável, servidor, usuário e sem vínculo
- [ ] TT-18, Teste da unicidade do CPF sob concorrência de gravação

---

## Tarefas de Migração de Dados (se aplicável)

- [ ] TM-01, Migrar as pessoas de `cadastro.pessoa` para `people`, preservando tipo, situação, origem de gravação e autoria
- [ ] TM-02, Migrar as pessoas físicas de `cadastro.fisica` para `individuals`, preservando filiação, nacionalidade, naturalidade e marcadores do Censo Escolar
- [ ] TM-03, Migrar os documentos de `cadastro.documento` para `person_documents`, com a conversão das datas e dos campos de emissão
- [ ] TM-04, Migrar os telefones de `cadastro.fone_pessoa` para `person_phones`, preservando tipo, DDD e número
- [ ] TM-05, Migrar os vínculos de raça de `cadastro.fisica_raca` e de deficiência de `cadastro.fisica_deficiencia`, preservando os códigos do Censo Escolar
- [ ] TM-06, Migrar os vínculos de endereço de `public.person_has_place` para o modelo novo, com a tipagem preservada
- [ ] TM-07, Migrar os logs de unificação de `log_unifications` e de `log_unification_old_data` para o modelo novo, com a conversão do tipo polimórfico
- [ ] TM-08, Migrar as referências de pessoa em `pmieducar.aluno`, `pmieducar.servidor`, `pmieducar.usuario` e `portal.funcionario` para o novo identificador
- [ ] TM-09, Gerar o relatório de divergências da carga, com o total de registros marcados por tipo de inconsistência
- [ ] TM-10, Detectar candidatos à unificação por CPF duplicado, por nome normalizado e por data de nascimento, e gerar a lista de pares candidatos

---

## Ordem Sugerida

1. T-01, T-02, T-03, T-04 e T-05 primeiro, porque definem o esquema sobre o qual operam as validações, a busca e a unificação.
2. T-06, T-07, T-08, T-09 e T-10 em seguida, porque as validações protegem a entrada de dado inconsistente e a duplicidade de CPF.
3. T-11, T-12, T-13 e T-14 depois, porque são a gravação, a consulta e a busca, que dependem do esquema e das validações.
4. T-15 e T-16 depois, porque a reativação e a comparação de candidatos são operações de apoio à decisão do operador.
5. T-17, T-18, T-19 e T-20 em seguida, porque são o núcleo da unificação e exigem o esquema completo.
6. T-21, T-22 e T-23 logo após, porque a ordem da unificação de servidor e as recusas de validação são pré-requisitos do fluxo.
7. T-24, T-25 e T-26 depois, porque a unificação de aluno e o desfeito dependem do log e do snapshot.
8. T-27, T-28, T-29 e T-30 por último entre as de domínio, porque expõem o que já está validado.
9. T-31 e T-32 no fim, porque são requisitos novos, ausentes no legado.
10. TM-01 a TM-10 somente depois de T-28 estar em ambiente de homologação, para que a carga possa ser conferida pela API nova.
11. Bloqueios: T-10 depende de T-01; T-11 depende de T-01 e T-02; T-13 depende de T-01; T-14 depende de T-01 e T-05; T-16 depende de T-01; T-18 depende de T-17; T-19 depende de T-17; T-20 depende de T-17 e T-19; T-21 depende de T-18; T-24 depende de T-19; T-25 e T-26 dependem de T-19; T-31 e T-32 dependem de T-16.

---

## Lacunas Pendentes (🔴)

- O desfeito da unificação de pessoa está declarado no contrato de tipo do legado, mas o corpo do método é vazio. É preciso decidir se a reversão é requisito do modelo novo e, em caso positivo, qual é o escopo de dados recuperado.
- A unificação concatena os identificadores nas consultas SQL e executa comandos de desativação de gatilho fora da transação da aplicação. Antes de migrar, é preciso definir a estratégia de transação e de parametrização no modelo novo.
- A unificação de pessoa reponta a linha da duplicada para a pessoa principal em `cadastro.pessoa`, o que produz duas linhas apontando para o mesmo identificador. É preciso definir a regra de remoção da pessoa duplicada no modelo novo.
- A unicidade do CPF é verificada apenas na aplicação, sem índice único no banco. É preciso decidir a política de CPF único por tenant e o catálogo de motivos de ausência de documento, com a justificativa regulamentada.
- A reativação de pessoa é feita por SQL direto, sem verificação de vínculos. É preciso definir o que impede a reativação de uma pessoa com vínculos conflitantes.
- A lista de tabelas da unificação é mantida em classes de código, com 45 entradas para a pessoa e 14 para o servidor. É preciso decidir se ela vira configuração versionada ou tabela, e como passa a ser mantida a cada tabela nova do modelo.
- A pessoa e a pessoa física são gravadas em tabelas diferentes sem transação que as amarre, o que permite divergência. É preciso definir a atomicidade da gravação no modelo novo.
- A busca de pessoas concatena nome social e nome de registro em texto, o que impede ordenação e filtro separados. É preciso definir a chave de busca do modelo novo.
- A comparação de candidatos à unificação é manual e não verifica compatibilidade de documentos. É preciso decidir se a verificação de compatibilidade é impeditiva ou informativa.
- Não há no legado verificação de identidade por biometria ou por prova de vínculo, e o modelo novo não descreve esse mecanismo. É preciso confirmar se a unificação manual é aceitável para a rede.
- A reativação de pessoa e a unificação não registram trilha de auditoria de conteúdo, apenas autoria de cadastro e de revisão. É preciso decidir o que é retido e por quanto tempo, em conformidade com a LGPD.
