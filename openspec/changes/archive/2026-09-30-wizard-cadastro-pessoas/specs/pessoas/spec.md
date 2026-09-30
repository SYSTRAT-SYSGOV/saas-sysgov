# Spec Delta

## MODIFIED Requirements

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
