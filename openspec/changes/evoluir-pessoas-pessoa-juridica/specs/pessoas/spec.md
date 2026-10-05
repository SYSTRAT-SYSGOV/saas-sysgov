# Spec Delta

## ADDED Requirements

### Requirement: Pessoa jurídica no cadastro único por tipo
O sistema SHALL manter pessoa física e pessoa jurídica na mesma entidade `pessoa`, diferenciadas pelo campo `tipo` (`fisica` ou `juridica`, padrão `fisica`), sem criar tabela ou módulo separado. Para `tipo=juridica`, o sistema SHALL admitir os campos `razao_social` (obrigatório), `nome_fantasia`, `inscricao_estadual`, `inscricao_municipal`, `porte` e `natureza_juridica` (opcionais), além de um `responsavel_id` opcional referenciando uma pessoa física do mesmo tenant como representante legal/administrador.

#### Scenario: Cadastro único por tipo
- **WHEN** uma pessoa é cadastrada com `tipo=juridica`
- **THEN** o registro compartilha a mesma tabela e estrutura de documentos, endereços, contatos e vínculos usada para pessoa física, diferenciado apenas pelo campo `tipo`

#### Scenario: Razão social obrigatória para jurídica
- **WHEN** uma pessoa jurídica é salva sem `razao_social`
- **THEN** o sistema rejeita a requisição informando que razão social é obrigatória para pessoa jurídica

#### Scenario: Responsável legal referencia pessoa física do MDM
- **WHEN** uma pessoa jurídica é cadastrada informando `responsavel_id`
- **THEN** o sistema valida que o `responsavel_id` aponta para uma pessoa com `tipo=fisica` do mesmo tenant, sem duplicar os dados civis do responsável

### Requirement: Quadro societário de pessoa jurídica
O sistema SHALL registrar, para cada pessoa jurídica, um quadro societário em tabela própria, vinculando sócios que SHALL ser obrigatoriamente pessoas físicas cadastradas no mesmo tenant do cadastro central (MDM), com percentual de participação opcional, papel (sócio, sócio-administrador ou representante legal) e vigência (data de entrada e, quando aplicável, data de saída).

#### Scenario: Sócio como pessoa física do MDM
- **WHEN** um sócio é adicionado ao quadro societário de uma pessoa jurídica
- **THEN** o sistema referencia uma pessoa física existente do mesmo tenant, sem duplicar seus dados civis

#### Scenario: Pessoa jurídica rejeitada como sócia
- **WHEN** se tenta adicionar uma pessoa com `tipo=juridica` como sócia de outra pessoa jurídica
- **THEN** o sistema rejeita a operação informando que apenas pessoas físicas podem compor o quadro societário

#### Scenario: Sócia de outro tenant rejeitada
- **WHEN** se tenta adicionar como sócia uma pessoa física pertencente a outro tenant
- **THEN** o sistema rejeita a operação com erro de isolamento/autorização

#### Scenario: Pessoa jurídica não pode ser sócia de si mesma
- **WHEN** se tenta adicionar a própria pessoa jurídica como sócia de seu próprio quadro societário
- **THEN** o sistema rejeita a operação

### Requirement: Migração segura de unicidade de documento por tipo
Ao introduzir a unicidade composta `(tenant_id, tipo, documento_hash)` em substituição a `(tenant_id, cpf_hash)`, o sistema SHALL preencher automaticamente `tipo = 'fisica'` em todos os registros de pessoa já existentes e SHALL validar a ausência de duplicidade latente antes de criar o novo índice único, sem perda de dados.

#### Scenario: Backfill sem perda
- **WHEN** a migração de unicidade por tipo é executada em uma base com registros de pessoa já existentes
- **THEN** todos os registros existentes recebem `tipo = 'fisica'` e o novo índice único é criado apenas se não houver duplicidade latente de `(tenant_id, tipo, documento_hash)`

## MODIFIED Requirements

### Requirement: Cadastro único de pessoa física por tenant
O sistema SHALL manter um cadastro único de pessoas (físicas e jurídicas) por tenant, com o documento de identificação (CPF para física, CNPJ para jurídica) como chave de negócio única dentro do tenant e do tipo: um CPF é único entre as pessoas físicas do tenant, um CNPJ é único entre as pessoas jurídicas do tenant, e um CPF nunca colide com um CNPJ mesmo que compartilhem os mesmos dígitos numéricos.

#### Scenario: Cadastro único por tenant
- **WHEN** uma pessoa é cadastrada com CPF já existente no tenant
- **THEN** o sistema rejeita a duplicação e retorna erro de unicidade

#### Scenario: CNPJ duplicado rejeitado
- **WHEN** uma pessoa jurídica é cadastrada com um CNPJ já existente no tenant
- **THEN** o sistema rejeita a duplicação e retorna erro de unicidade

#### Scenario: Sem colisão entre CPF e CNPJ
- **WHEN** um CPF e um CNPJ possuem os mesmos dígitos numéricos, no mesmo tenant ou em tenants diferentes
- **THEN** o sistema os trata como documentos distintos por tipo, sem conflito de unicidade entre eles

### Requirement: Isolamento por tenant
O sistema SHALL isolar todos os dados do cadastro de pessoas por tenant, com a unicidade do documento (CPF ou CNPJ) aplicada apenas dentro do mesmo tenant e do mesmo tipo de pessoa.

#### Scenario: Isolamento por tenant
- **WHEN** duas prefeituras cadastram a mesma pessoa física
- **THEN** cada tenant mantém seu registro independente sem conflito de unicidade

#### Scenario: Isolamento por tenant para pessoa jurídica
- **WHEN** duas prefeituras cadastram uma pessoa jurídica com o mesmo CNPJ
- **THEN** cada tenant mantém seu registro independente sem conflito de unicidade

### Requirement: Vínculos de papel modelados em tabela própria
O sistema SHALL modelar cada papel que uma pessoa exerce como um vínculo em tabela própria, associado à pessoa, e não como um atributo fixo do cadastro da pessoa. Para pessoa física, os papéis incluem servidor de carreira, estagiário, comissionado, CLT, munícipe, contribuinte, aluno e paciente. Para pessoa jurídica, os papéis incluem fornecedor, contratada, concessionária, permissionária e credenciada. Cada vínculo SHALL admitir o registro opcional de uma matrícula funcional.

#### Scenario: Múltiplos vínculos
- **WHEN** uma pessoa é cadastrada como servidor de carreira e depois vinculada como munícipe
- **THEN** o sistema mantém um único cadastro de pessoa com dois vínculos, sem duplicar a pessoa

#### Scenario: Vínculo com vigência
- **WHEN** um vínculo é encerrado (ex.: exoneração de cargo comissionado)
- **THEN** o sistema registra a data de término do vínculo sem excluir o histórico nem a pessoa

#### Scenario: Matrícula funcional registrada no vínculo
- **WHEN** um vínculo de servidor de carreira é cadastrado com uma matrícula funcional
- **THEN** o sistema armazena a matrícula associada a esse vínculo específico, não ao cadastro da pessoa

#### Scenario: Fornecedor vinculado a pessoa jurídica
- **WHEN** uma pessoa jurídica recebe o vínculo `fornecedor`
- **THEN** o sistema trata a vigência e o histórico desse vínculo da mesma forma que qualquer outro vínculo de pessoa física

### Requirement: Busca e listagem de pessoas
O sistema SHALL permitir localizar pessoas por nome, razão social, CPF ou CNPJ, e filtrar a listagem por tipo de pessoa (física ou jurídica), por tipo de vínculo, por status da pessoa, por situação vital (falecido ou vivo, aplicável à física) e por faixa de data de nascimento e sexo (aplicável à física), combinando os filtros entre si. A listagem SHALL incluir os vínculos de cada pessoa retornada, sem exigir uma consulta adicional por pessoa, SHALL permitir ordenação pelas colunas nome, documento e status, e SHALL permitir a exportação, nos formatos CSV, XLSX e PDF, das linhas resultantes dos filtros aplicados.

#### Scenario: Busca por CPF
- **WHEN** o usuário busca por um CPF válido cadastrado no tenant
- **THEN** o sistema retorna a pessoa correspondente, mesmo que o CPF tenha sido digitado com máscara ou pontuação

#### Scenario: Filtro por tipo de vínculo
- **WHEN** o usuário filtra a listagem pelo vínculo "municipe"
- **THEN** o sistema retorna apenas pessoas com um vínculo desse tipo, incluindo as que também têm outros vínculos

#### Scenario: Listagem traz os vínculos de cada pessoa
- **WHEN** a listagem de pessoas é consultada
- **THEN** cada pessoa retornada inclui seus vínculos, permitindo exibi-los na própria listagem sem uma requisição por pessoa

#### Scenario: Filtro por situação vital
- **WHEN** o usuário filtra a listagem para exibir apenas pessoas falecidas
- **THEN** o sistema retorna somente pessoas com `falecido` igual a verdadeiro

#### Scenario: Filtro por faixa de data de nascimento
- **WHEN** o usuário informa uma data inicial e uma data final para filtrar por data de nascimento
- **THEN** o sistema retorna apenas pessoas cuja data de nascimento esteja dentro do intervalo informado, inclusive nos extremos

#### Scenario: Filtros combinados
- **WHEN** o usuário aplica simultaneamente busca textual, tipo de vínculo e situação vital
- **THEN** o sistema retorna apenas as pessoas que satisfazem todos os filtros aplicados ao mesmo tempo

#### Scenario: Ordenação por coluna
- **WHEN** o usuário clica no cabeçalho da coluna de nome, documento ou status na listagem
- **THEN** o sistema reordena as linhas exibidas de acordo com a coluna e o sentido (ascendente/descendente) escolhidos

#### Scenario: Exportação das linhas filtradas
- **WHEN** o usuário aciona a exportação da listagem com filtros aplicados
- **THEN** o sistema gera o arquivo no formato escolhido (CSV, XLSX ou PDF) contendo apenas as linhas que atendem aos filtros vigentes no momento da exportação

#### Scenario: Filtro por tipo de pessoa
- **WHEN** o usuário filtra a listagem para exibir apenas pessoas jurídicas
- **THEN** o sistema retorna somente pessoas com `tipo = 'juridica'`

### Requirement: Promoção a usuário por ação explícita e auditada
O sistema SHALL promover uma pessoa física a usuário apenas por ação explícita de um administrador com a permissão `cadastros.pessoas.promote`, nunca automaticamente a partir de cadastro ou importação. A ação de promover SHALL estar acessível tanto a partir do detalhe da pessoa quanto diretamente da listagem, para uma pessoa física que ainda não possui usuário vinculado. O sistema SHALL impedir a promoção de pessoa jurídica a usuário, mantendo a promoção exclusiva para pessoa física.

#### Scenario: Promoção a usuário
- **WHEN** um administrador promove uma pessoa física existente a usuário
- **THEN** o sistema cria a conta de acesso vinculada à pessoa por CPF, registra a ação em audit_logs e não cria uma segunda pessoa

#### Scenario: Promoção sem permissão
- **WHEN** um usuário sem a permissão `cadastros.pessoas.promote` tenta promover uma pessoa a usuário
- **THEN** o sistema rejeita a ação com erro de autorização e nenhuma conta é criada

#### Scenario: Pessoa já promovida
- **WHEN** um administrador tenta promover a usuário uma pessoa que já possui conta de acesso vinculada
- **THEN** o sistema rejeita a ação informando que a pessoa já possui usuário

#### Scenario: Promoção acessível pela listagem
- **WHEN** um administrador com a permissão de promover visualiza a listagem de pessoas
- **THEN** o sistema oferece a ação de promover diretamente em cada linha cuja pessoa física ainda não possui usuário vinculado, sem exigir abrir o detalhe da pessoa

#### Scenario: Jurídica não promovível
- **WHEN** uma tentativa de promoção a usuário é feita sobre uma pessoa com `tipo=juridica`
- **THEN** o sistema rejeita a ação com mensagem clara informando que apenas pessoa física pode ser promovida, e nenhuma conta é criada

### Requirement: Importação de pessoa com deduplicação por CPF
O sistema SHALL importar pessoas de sistemas de gestão da prefeitura de forma assíncrona, buscando pelo documento (CPF ou CNPJ) dentro do tipo e do tenant: se a pessoa já existir, o sistema SHALL atualizar/vincular o registro existente; se não existir, o sistema SHALL criar um novo registro. A importação SHALL NOT promover a pessoa a usuário.

#### Scenario: Importação com deduplicação
- **WHEN** uma pessoa chega da integração com CPF já existente no tenant
- **THEN** o sistema atualiza/vincula o registro existente em vez de criar duplicado

#### Scenario: Importação de pessoa nova
- **WHEN** uma pessoa chega da integração com CPF não cadastrado no tenant
- **THEN** o sistema cria um novo registro de pessoa sem conta de acesso associada

#### Scenario: Importação de pessoa jurídica por CNPJ
- **WHEN** uma pessoa jurídica chega da integração identificada por CNPJ já existente no tenant
- **THEN** o sistema atualiza/vincula o registro jurídico existente em vez de criar duplicado, deduplicando dentro do tipo `juridica`

### Requirement: Validação de ações de escrita via Form Requests dedicados
O sistema SHALL validar todas as ações de escrita do módulo por Form Requests dedicados, aplicando validação condicional por tipo: para pessoa física, nome e CPF obrigatórios com validação algorítmica de dígitos verificadores; para pessoa jurídica, razão social e CNPJ obrigatórios com validação algorítmica de dígitos verificadores, sendo nome fantasia, inscrições, porte e natureza jurídica opcionais. O sistema SHALL aplicar unicidade por tenant e tipo (desconsiderando o próprio registro no caso de atualização), vigência cronológica válida de vínculos (data de início menor ou igual à data de término) e conformidade de formatos para e-mail, telefone e CEP.

#### Scenario: CPF inválido rejeitado
- **WHEN** uma pessoa física é cadastrada com CPF cujos dígitos verificadores são matematicamente inválidos
- **THEN** o sistema rejeita a operação com erro de validação HTTP 422 e nenhum registro de pessoa é criado no banco de dados

#### Scenario: CNPJ inválido rejeitado
- **WHEN** uma pessoa jurídica é cadastrada com CNPJ cujos dígitos verificadores são matematicamente inválidos
- **THEN** o sistema rejeita a operação com erro de validação HTTP 422 e nenhum registro de pessoa é criado no banco de dados

#### Scenario: Atualização com mesmo CPF do próprio registro
- **WHEN** os dados de uma pessoa são atualizados mantendo o mesmo CPF já cadastrado para ela
- **THEN** o sistema aceita a requisição sem acusar conflito de unicidade de CPF no tenant

#### Scenario: Atualização com mesmo CNPJ do próprio registro
- **WHEN** os dados de uma pessoa jurídica são atualizados mantendo o mesmo CNPJ já cadastrado para ela
- **THEN** o sistema aceita a requisição sem acusar conflito de unicidade de CNPJ no tenant

#### Scenario: Vigência cronológica de vínculo inconsistente
- **WHEN** um vínculo é cadastrado informando data de término anterior à data de início
- **THEN** o sistema rejeita a requisição com erro de validação e não cria o vínculo

### Requirement: Serialização estrita via API Resources sem exposição de dados sensíveis
O sistema SHALL serializar todas as respostas da API contendo pessoas, vínculos, documentos, endereços e contatos por meio de API Resources dedicados, garantindo a proteção da privacidade e conformidade com a LGPD. Para usuários padrão e consultas gerais, o sistema SHALL retornar exclusivamente o documento mascarado no formato adequado ao tipo (`***.456.789-**` para CPF, `00.000.000/0000-00` para CNPJ), nunca expondo o documento em texto puro ou seu hash. Para usuários com perfil de administrador ou permissão explícita `cadastros.pessoas.view_sensitive`, o sistema SHALL admitir a visualização dos dados completos sob demanda, registrando auditoria de acesso.

#### Scenario: CPF nunca serializado
- **WHEN** a API retorna o detalhe ou a listagem de pessoas para requisições comuns sem privilégios administrativos
- **THEN** a resposta JSON contém apenas o campo `cpf_mascarado` (com formato mascarado), sem os campos `cpf` em texto puro ou `cpf_hash`

#### Scenario: Desmascaramento autorizado para administradores
- **WHEN** um usuário com permissão `cadastros.pessoas.view_sensitive` ou perfil de administrador solicita a visualização completa do registro de uma pessoa
- **THEN** a API disponibiliza os dados completos e registra no `audit_logs` a visualização do dado sensível

#### Scenario: Serialização consistente de sub-entidades
- **WHEN** a API retorna documentos, endereços ou contatos vinculados a uma pessoa
- **THEN** a resposta é formatada pelos respectivos API Resources garantindo tipos padronizados e omissão de chaves internas desnecessárias

#### Scenario: CNPJ mascarado para jurídica
- **WHEN** a API retorna uma pessoa jurídica para uma requisição sem privilégios administrativos
- **THEN** a resposta contém apenas o documento mascarado no formato de CNPJ, sem o documento literal nem o hash

### Requirement: Autorização granular e integridade de recurso via PessoaPolicy
O sistema SHALL autorizar cada operação do módulo por meio da `PessoaPolicy`, combinando a checagem das permissões de RBAC (`cadastros.pessoas.view`, `cadastros.pessoas.create`, `cadastros.pessoas.update`, `cadastros.pessoas.delete`, `cadastros.pessoas.promote`, `cadastros.pessoas.import`) com regras de integridade do recurso, impedindo a exclusão de qualquer pessoa que possua vínculos ativos vigentes. As mesmas permissões SHALL ser aplicadas independentemente do tipo da pessoa (física ou jurídica), sem permissões específicas por tipo.

#### Scenario: Exclusão com vínculos ativos
- **WHEN** um usuário com permissão de exclusão tenta excluir uma pessoa que possui um ou mais vínculos com vigência ativa
- **THEN** o sistema nega a exclusão física e orienta o encerramento prévio dos vínculos ativos ou a aplicação de soft delete controlado

#### Scenario: Promoção restrita a usuários autorizados
- **WHEN** um usuário sem a permissão `cadastros.pessoas.promote` tenta acionar o endpoint de promoção a usuário
- **THEN** a `PessoaPolicy` nega a operação retornando código HTTP 403

### Requirement: Busca de pessoas por CPF com normalização de máscara
O sistema SHALL localizar pessoas por nome, razão social ou documento (CPF ou CNPJ) independentemente da presença de máscara, pontos, barra ou traços, sanitizando a entrada numérica e consultando o `documento_hash` calculado no escopo da requisição e do tipo compatível com a quantidade de dígitos informada, mantendo a busca textual aproximada por nome ou razão social quando a entrada não corresponder a um documento sanitizado.

#### Scenario: Busca com pontuação
- **WHEN** o usuário realiza uma busca informando um CPF formatado com pontuação (ex.: 000.000.000-00)
- **THEN** o sistema calcula o hash dos 11 dígitos no request e retorna com precisão a pessoa correspondente cadastrada no tenant

#### Scenario: Busca textual por nome
- **WHEN** o usuário realiza uma busca informando um texto alfabético
- **THEN** o sistema aplica filtro de aproximação sobre a coluna de nome da pessoa

#### Scenario: Busca por CNPJ
- **WHEN** o usuário realiza uma busca informando um CNPJ formatado (ex.: 00.000.000/0000-00) ou apenas os 14 dígitos
- **THEN** o sistema calcula o hash dos 14 dígitos no escopo do tipo `juridica` e retorna com precisão a pessoa jurídica correspondente cadastrada no tenant

#### Scenario: Busca textual por razão social
- **WHEN** o usuário realiza uma busca informando um texto que corresponde à razão social de uma pessoa jurídica
- **THEN** o sistema aplica filtro de aproximação sobre a coluna de razão social

### Requirement: Auditoria transacional sistemática de mutações
O sistema SHALL registrar na tabela `audit_logs`, por meio do `AuditLogger`, todas as operações de mutação do ciclo de vida de pessoas (criação, atualização, exclusão, adição e encerramento de vínculos, alteração e exclusão de sub-entidades, alteração do quadro societário, promoção a usuário e importações com ou sem deduplicação), registrando tenant_id, usuário executor, módulo, ação, identificador do recurso e estados anterior e posterior.

#### Scenario: Promoção auditada
- **WHEN** um administrador promove uma pessoa a usuário
- **THEN** a ação `pessoa.promovida` é registrada em `audit_logs` contendo o ID do usuário autor, o tenant e os dados resultantes do vínculo

#### Scenario: Exclusão de contato auditada com before e after
- **WHEN** um contato de uma pessoa é excluído
- **THEN** o registro de auditoria documenta o estado anterior do contato removido e a eventual promoção do contato sucessor

#### Scenario: Sócio auditado
- **WHEN** um sócio é adicionado ou removido do quadro societário de uma pessoa jurídica
- **THEN** a ação é registrada em `audit_logs` contendo tenant, ator e os estados anterior e posterior do quadro societário

### Requirement: Hub central de dados mestres de pessoas para consumo compartilhado entre módulos
O sistema SHALL disponibilizar no `@sysgov/ui` e no `web-client` componentes e hooks universais de integração de pessoas (`PessoaPicker`, `usePessoaPicker`, `PessoaCard`, `PessoaBadge`), permitindo que qualquer módulo satélite (Requerimentos, Cemitérios, RH, Protocolo, Financeiro, CAPD, Cursos) realize busca rápida por nome/razão social ou CPF/CNPJ com debounce, seleção fluida e cadastro rápido inline sem descontinuar a tarefa do operador, exibindo o identificador mascarado e o rótulo adequados ao tipo de pessoa selecionada.

#### Scenario: Seleção rápida e cadastro inline a partir de outro módulo
- **WHEN** um operador está em um formulário de outro módulo (ex.: Requerimento ou Concessão de Cemitério) e a pessoa ainda não existe
- **THEN** o componente permite abrir o modal de cadastro rápido de pessoa, salvar o registro e já selecioná-lo automaticamente no formulário de origem

#### Scenario: Busca unificada por física ou jurídica no picker
- **WHEN** um operador busca no `PessoaPicker` por um termo que corresponde a uma razão social ou a um CNPJ
- **THEN** o componente retorna e exibe a pessoa jurídica correspondente, com o documento mascarado no formato de CNPJ, mantendo o comportamento já existente para pessoa física inalterado
