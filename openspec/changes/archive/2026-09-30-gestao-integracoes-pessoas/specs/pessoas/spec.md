# Spec Delta

## MODIFIED Requirements

### Requirement: Integração externa resiliente
O sistema SHALL isolar cada integração com sistema de gestão da prefeitura em um adapter próprio, consumido de forma assíncrona (fila), com timeout e fallback, de modo que uma integração externa indisponível ou lenta SHALL NOT impedir o uso do cadastro de pessoas nem de qualquer outra funcionalidade do sistema. A configuração de cada integração (URL, credenciais, mapeamento de campos) SHALL ser gerenciável por um administrador do tenant, e o token de acesso ao sistema externo SHALL ser armazenado cifrado, nunca em texto plano.

#### Scenario: Sistema externo indisponível
- **WHEN** o sistema de gestão da prefeitura está indisponível durante uma tentativa de importação
- **THEN** o sistema registra a falha para nova tentativa posterior e continua respondendo normalmente às demais operações do cadastro de pessoas

#### Scenario: Token de integração nunca exposto em texto plano
- **WHEN** um administrador consulta os dados de uma integração cadastrada
- **THEN** o sistema retorna o token mascarado ou omitido, nunca o valor em texto plano armazenado

## ADDED Requirements

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
