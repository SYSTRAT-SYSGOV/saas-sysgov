# Pessoas Specification

## Purpose

Mantém um cadastro único de pessoa física por tenant, separado da conta de acesso ao SYSGOV, servindo de base (master data) para servidores públicos e munícipes consumida por outros módulos do ecossistema.

## Requirements

### Requirement: Cadastro único de pessoa física por tenant
O sistema SHALL manter um cadastro de pessoas físicas por tenant, com o CPF como chave de negócio única dentro do tenant.

#### Scenario: Cadastro único por tenant
- **WHEN** uma pessoa é cadastrada com CPF já existente no tenant
- **THEN** o sistema rejeita a duplicação e retorna erro de unicidade

### Requirement: Separação entre identidade civil e conta de acesso
O sistema SHALL representar a identidade civil da pessoa (cadastro) e a conta de acesso ao SYSGOV (usuário) como entidades distintas, em que uma pessoa possui zero ou um usuário vinculado e todo usuário corresponde a exatamente uma pessoa.

#### Scenario: Pessoa sem usuário
- **WHEN** uma pessoa é importada do sistema da prefeitura
- **THEN** ela fica disponível no cadastro sem conta de acesso ao SYSGOV

### Requirement: Vínculos de papel modelados em tabela própria
O sistema SHALL modelar cada papel que uma pessoa exerce (servidor de carreira, estagiário, comissionado, CLT, munícipe, contribuinte, aluno, paciente) como um vínculo em tabela própria, associado à pessoa, e não como um atributo fixo do cadastro da pessoa. Cada vínculo SHALL admitir o registro opcional de uma matrícula funcional.

#### Scenario: Múltiplos vínculos
- **WHEN** uma pessoa é cadastrada como servidor de carreira e depois vinculada como munícipe
- **THEN** o sistema mantém um único cadastro de pessoa com dois vínculos, sem duplicar a pessoa

#### Scenario: Vínculo com vigência
- **WHEN** um vínculo é encerrado (ex.: exoneração de cargo comissionado)
- **THEN** o sistema registra a data de término do vínculo sem excluir o histórico nem a pessoa

#### Scenario: Matrícula funcional registrada no vínculo
- **WHEN** um vínculo de servidor de carreira é cadastrado com uma matrícula funcional
- **THEN** o sistema armazena a matrícula associada a esse vínculo específico, não ao cadastro da pessoa

### Requirement: Documentos, endereços e contatos multivalorados
O sistema SHALL permitir que uma pessoa tenha múltiplos documentos (RG, CNH, título de eleitor), múltiplos endereços e múltiplos contatos (celular, e-mail, telefone), cada um associado à pessoa; entre os contatos de um mesmo tipo, no máximo um SHALL ser marcado como principal. Cada documento SHALL admitir o registro opcional da UF e da data de emissão. Cada contato SHALL registrar se a pessoa autoriza o recebimento de notificações por aquele canal, com valor padrão de autorização concedida.

#### Scenario: Contato principal único por tipo
- **WHEN** um segundo e-mail é marcado como principal para uma pessoa que já tinha um e-mail principal
- **THEN** o sistema desmarca o e-mail principal anterior e mantém apenas o novo como principal

#### Scenario: UF e data de emissão do documento
- **WHEN** um RG é cadastrado informando UF e data de emissão
- **THEN** o sistema armazena esses dados junto ao documento

#### Scenario: Consentimento de notificação por contato
- **WHEN** um contato é cadastrado sem informar explicitamente a autorização de notificações
- **THEN** o sistema considera a autorização concedida por padrão

### Requirement: Exclusão lógica de pessoa
O sistema SHALL excluir uma pessoa de forma lógica (soft delete), nunca removendo fisicamente o registro nem o histórico relacionado (vínculos, documentos, endereços, contatos, promoção a usuário), preservando-os para fins de auditoria.

#### Scenario: Exclusão preserva o histórico
- **WHEN** um administrador exclui uma pessoa que possui vínculos, documentos e um usuário promovido
- **THEN** o sistema marca a pessoa como excluída, deixa de retorná-la em buscas e listagens padrão, e mantém intactos no banco de dados a própria pessoa e todo o seu histórico relacionado

#### Scenario: CPF de pessoa excluída continua bloqueado para reuso
- **WHEN** um administrador tenta cadastrar uma nova pessoa com o mesmo CPF de uma pessoa já excluída logicamente no mesmo tenant
- **THEN** o sistema rejeita a duplicação da mesma forma que rejeitaria para uma pessoa não excluída

### Requirement: Busca e listagem de pessoas
O sistema SHALL permitir localizar pessoas por nome ou CPF e filtrar a listagem por tipo de vínculo e por status da pessoa. A listagem SHALL incluir os vínculos de cada pessoa retornada, sem exigir uma consulta adicional por pessoa.

#### Scenario: Busca por CPF
- **WHEN** o usuário busca por um CPF válido cadastrado no tenant
- **THEN** o sistema retorna a pessoa correspondente, mesmo que o CPF tenha sido digitado com máscara ou pontuação

#### Scenario: Filtro por tipo de vínculo
- **WHEN** o usuário filtra a listagem pelo vínculo "municipe"
- **THEN** o sistema retorna apenas pessoas com um vínculo desse tipo, incluindo as que também têm outros vínculos

#### Scenario: Listagem traz os vínculos de cada pessoa
- **WHEN** a listagem de pessoas é consultada
- **THEN** cada pessoa retornada inclui seus vínculos, permitindo exibi-los na própria listagem sem uma requisição por pessoa

### Requirement: Promoção a usuário por ação explícita e auditada
O sistema SHALL promover uma pessoa a usuário apenas por ação explícita de um administrador com a permissão `cadastros.pessoas.promote`, nunca automaticamente a partir de cadastro ou importação. A ação de promover SHALL estar acessível tanto a partir do detalhe da pessoa quanto diretamente da listagem, para uma pessoa que ainda não possui usuário vinculado.

#### Scenario: Promoção a usuário
- **WHEN** um administrador promove uma pessoa existente a usuário
- **THEN** o sistema cria a conta de acesso vinculada à pessoa por CPF, registra a ação em audit_logs e não cria uma segunda pessoa

#### Scenario: Promoção sem permissão
- **WHEN** um usuário sem a permissão `cadastros.pessoas.promote` tenta promover uma pessoa a usuário
- **THEN** o sistema rejeita a ação com erro de autorização e nenhuma conta é criada

#### Scenario: Pessoa já promovida
- **WHEN** um administrador tenta promover a usuário uma pessoa que já possui conta de acesso vinculada
- **THEN** o sistema rejeita a ação informando que a pessoa já possui usuário

#### Scenario: Promoção acessível pela listagem
- **WHEN** um administrador com a permissão de promover visualiza a listagem de pessoas
- **THEN** o sistema oferece a ação de promover diretamente em cada linha cuja pessoa ainda não possui usuário vinculado, sem exigir abrir o detalhe da pessoa

### Requirement: Importação de pessoa com deduplicação por CPF
O sistema SHALL importar pessoas de sistemas de gestão da prefeitura de forma assíncrona, buscando por CPF no tenant: se a pessoa já existir, o sistema SHALL atualizar/vincular o registro existente; se não existir, o sistema SHALL criar um novo registro. A importação SHALL NOT promover a pessoa a usuário.

#### Scenario: Importação com deduplicação
- **WHEN** uma pessoa chega da integração com CPF já existente no tenant
- **THEN** o sistema atualiza/vincula o registro existente em vez de criar duplicado

#### Scenario: Importação de pessoa nova
- **WHEN** uma pessoa chega da integração com CPF não cadastrado no tenant
- **THEN** o sistema cria um novo registro de pessoa sem conta de acesso associada

### Requirement: Integração externa resiliente
O sistema SHALL isolar cada integração com sistema de gestão da prefeitura em um adapter próprio, consumido de forma assíncrona (fila), com timeout e fallback, de modo que uma integração externa indisponível ou lenta SHALL NOT impedir o uso do cadastro de pessoas nem de qualquer outra funcionalidade do sistema. A configuração de cada integração (URL, credenciais, mapeamento de campos) SHALL ser gerenciável por um administrador do tenant, e o token de acesso ao sistema externo SHALL ser armazenado cifrado, nunca em texto plano.

#### Scenario: Sistema externo indisponível
- **WHEN** o sistema de gestão da prefeitura está indisponível durante uma tentativa de importação
- **THEN** o sistema registra a falha para nova tentativa posterior e continua respondendo normalmente às demais operações do cadastro de pessoas

#### Scenario: Token de integração nunca exposto em texto plano
- **WHEN** um administrador consulta os dados de uma integração cadastrada
- **THEN** o sistema retorna o token mascarado ou omitido, nunca o valor em texto plano armazenado

### Requirement: Gestão de integrações com sistemas de gestão da prefeitura
O sistema SHALL permitir que um administrador do tenant, com a permissão específica de gestão de integrações, cadastre, edite e ative/desative uma conexão com um sistema de gestão da prefeitura (nome, URL, token de API, mapeamento de campos), sem depender de acesso direto ao banco de dados.

#### Scenario: Cadastro de nova integração
- **WHEN** um administrador cadastra uma nova integração com nome, URL e token válidos
- **THEN** o sistema salva a configuração para o tenant e ela fica disponível para uso pela importação de pessoas

#### Scenario: Desativação de integração
- **WHEN** um administrador desativa uma integração ativa
- **THEN** o sistema deixa de aceitar novas importações através dela, sem afetar o histórico de sincronizações já realizado

#### Scenario: Gestão de integrações sem permissão
- **WHEN** um usuário sem a permissão de gestão de integrações tenta cadastrar ou editar uma integração
- **THEN** o sistema rejeita a ação com erro de autorização

### Requirement: Histórico de sincronização consultável
O sistema SHALL permitir consultar o histórico de tentativas de sincronização de pessoas (sucesso, falha ou não encontrado) por tenant e por integração, incluindo os detalhes do erro quando houver falha.

#### Scenario: Consulta do histórico de sincronização
- **WHEN** um administrador consulta o histórico de uma integração
- **THEN** o sistema retorna as tentativas de sincronização daquele tenant, com status, contadores e detalhes de cada uma

#### Scenario: Filtro por status de sincronização
- **WHEN** um administrador filtra o histórico apenas por tentativas com falha
- **THEN** o sistema retorna somente as tentativas cujo status é de falha

### Requirement: Reprocessamento manual de sincronização com falha
O sistema SHALL permitir que um administrador reprocesse manualmente uma tentativa de sincronização que falhou, disparando novamente a mesma importação (mesmo CPF, mesma integração) pelo fluxo assíncrono, sem criar um registro de pessoa duplicado.

#### Scenario: Reprocessamento de falha
- **WHEN** um administrador aciona o reprocessamento de um registro de histórico com status de falha
- **THEN** o sistema agenda uma nova tentativa de sincronização para o mesmo CPF e integração, registrando uma nova entrada no histórico

#### Scenario: Reprocessamento não duplica pessoa já existente
- **WHEN** o reprocessamento de uma falha encontra uma pessoa que já foi criada por uma tentativa concorrente
- **THEN** o sistema atualiza/vincula o registro existente em vez de criar uma pessoa duplicada

### Requirement: Controle de acesso por permissão específica
O sistema SHALL exigir, no backend, a permissão específica correspondente para cada ação sobre o cadastro de pessoas (`cadastros.pessoas.view` para consulta, `cadastros.pessoas.create` para criação, `cadastros.pessoas.update` para edição, `cadastros.pessoas.delete` para exclusão), independentemente do que a interface exibir.

#### Scenario: Edição sem permissão
- **WHEN** um usuário sem a permissão `cadastros.pessoas.update` tenta editar uma pessoa
- **THEN** o sistema rejeita a ação com erro de autorização, mesmo que a requisição chegue direto à API sem passar pela interface

### Requirement: Isolamento por tenant
O sistema SHALL isolar todos os dados do cadastro de pessoas por tenant, com a unicidade do CPF aplicada apenas dentro do mesmo tenant.

#### Scenario: Isolamento por tenant
- **WHEN** duas prefeituras cadastram a mesma pessoa física
- **THEN** cada tenant mantém seu registro independente sem conflito de unicidade
