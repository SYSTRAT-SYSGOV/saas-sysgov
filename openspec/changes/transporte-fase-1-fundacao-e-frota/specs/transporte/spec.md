## ADDED Requirements

### Requirement: Isolamento por tenant do módulo Transporte
Todas as tabelas `transporte_*` DEVEM ter `tenant_id` com índices compostos iniciando por ele, e todos os models DEVEM usar `TenantAware`. Dados de um tenant NUNCA devem aparecer para outro.

#### Scenario: Frota de outro tenant
- **GIVEN** o tenant A tem 3 veículos e o tenant B tem 2
- **WHEN** um usuário do tenant B lista os veículos
- **THEN** a resposta traz apenas os 2 veículos do tenant B

#### Scenario: Criação sem tenant resolvido
- **WHEN** um registro do módulo é criado sem tenant no contexto
- **THEN** o sistema lança `LogicException` e nada é gravado

### Requirement: Permissões e perfis do módulo Transporte
O módulo DEVE declarar as permissões `transporte.view`, `transporte.frota.manage`, `transporte.rotas.manage`, `transporte.alocacoes.manage`, `transporte.alocacoes.override_capacity`, `transporte.censo.export` e `transporte.audit`, e DEVE criar os perfis Coordenação de Transporte, Operador e Consulta por seeder idempotente. A autorização DEVE ser conferida no servidor, por objeto, por Policy.

#### Scenario: Usuário só com consulta
- **GIVEN** um usuário com o perfil Consulta
- **WHEN** ele tenta criar um veículo
- **THEN** o servidor responde 403 e nada é gravado

#### Scenario: Seeder repetido
- **WHEN** o seeder de RBAC roda duas vezes
- **THEN** as permissões e os perfis não são duplicados

### Requirement: Cadastro de empresas de transporte
O sistema DEVE permitir cadastrar uma empresa a partir de uma **pessoa jurídica** do Cadastro de Pessoas, com `tipo` `prestadora` (serviço terceirizado) ou `locadora` (aluguel de veículos). Toda empresa DEVE ter número do contrato e vigência (início e fim, com fim igual ou posterior ao início). Uma pessoa jurídica só pode ser empresa uma vez por tenant. A frota própria da prefeitura NÃO é uma empresa: é a origem `propria` do veículo.

#### Scenario: Empresa prestadora
- **WHEN** um usuário autorizado cadastra a pessoa jurídica "Viação Rio Claro" como `prestadora` com contrato 12/2026 de 01/02/2026 a 31/12/2026
- **THEN** a empresa é criada ativa e aparece com o CNPJ vindo do Cadastro de Pessoas

#### Scenario: Empresa sem contrato
- **WHEN** o cadastro de empresa `locadora` não informa a vigência
- **THEN** o sistema responde 422 e indica o campo

#### Scenario: Pessoa física informada
- **WHEN** o cadastro aponta uma pessoa física como empresa
- **THEN** o sistema responde 422

#### Scenario: Contrato vencido
- **GIVEN** uma empresa com vigência até ontem
- **WHEN** a empresa é consultada
- **THEN** ela é exibida como "contrato vencido" e entra nos alertas como crítica

### Requirement: Cadastro de motoristas e elegibilidade pelo CTB
O sistema DEVE permitir cadastrar um motorista a partir de uma **pessoa física** do Cadastro de Pessoas, guardando CNH (número único por tenant, categoria `D` ou `E`, primeira habilitação e validade), curso especializado (certificado e validade) e exame toxicológico (data e validade), com vínculo opcional a uma empresa. O sistema DEVE calcular a elegibilidade: CNH D/E com validade futura, idade acima de 21 anos, curso e toxicológico com validade futura, devolvendo os motivos de inelegibilidade. Ativar um motorista inelegível DEVE ser recusado.

#### Scenario: Motorista elegível
- **GIVEN** uma pessoa de 40 anos
- **WHEN** é cadastrada como motorista com CNH categoria D válida, curso e toxicológico válidos
- **THEN** o motorista é criado ativo e `elegivel` é verdadeiro

#### Scenario: CNH categoria B
- **WHEN** o cadastro informa CNH categoria B
- **THEN** o sistema responde 422 e não cria o motorista

#### Scenario: Toxicológico vencido
- **WHEN** um motorista ativo é consultado e o toxicológico venceu ontem
- **THEN** `elegivel` é falso, o motivo `toxicologico_vencido` é listado e o motorista entra nos alertas como crítico

#### Scenario: Menor de 21 anos
- **GIVEN** uma pessoa com 20 anos
- **WHEN** tenta-se ativá-la como motorista
- **THEN** o sistema responde 422 com o motivo `idade_minima`

#### Scenario: Mesma pessoa duas vezes
- **GIVEN** a pessoa já é motorista no tenant
- **WHEN** outro cadastro usa a mesma pessoa
- **THEN** o sistema responde 409

### Requirement: Cadastro de veículos
O sistema DEVE permitir cadastrar veículos com descrição, placa única por tenant, capacidade de passageiros maior que zero, tipologia Inep entre 1 e 11, tipo de rede (`rural`, `urbana` ou `mista`), indicadores de uso exclusivo e de acessibilidade, **origem** (`propria`, `locada` ou `terceirizada`) e motorista padrão opcional. Veículo `proprio` NÃO tem empresa; `locado` exige empresa `locadora` e `terceirizado` exige empresa `prestadora`. A placa DEVE ser normalizada (maiúsculas, sem hífen nem espaços) e aceitar o formato antigo e o Mercosul. A inativação DEVE exigir motivo.

#### Scenario: Veículo próprio
- **WHEN** um veículo de origem `propria` é cadastrado sem empresa
- **THEN** ele é criado e não depende de contrato

#### Scenario: Veículo locado sem locadora
- **WHEN** um veículo de origem `locada` é cadastrado sem empresa, ou com uma empresa `prestadora`
- **THEN** o sistema responde 422

#### Scenario: Locadora com contrato vencido
- **GIVEN** um veículo `locado` cuja locadora tem o contrato vencido
- **WHEN** o veículo é consultado
- **THEN** ele é exibido como irregular pelo motivo `contrato_vencido`

#### Scenario: Placa normalizada
- **WHEN** um veículo é cadastrado com a placa "abc-1d23"
- **THEN** o sistema grava "ABC1D23"

#### Scenario: Placa duplicada
- **GIVEN** já existe o veículo "ABC1D23" no tenant
- **WHEN** outro veículo é cadastrado com "abc1d23"
- **THEN** o sistema responde 409

#### Scenario: Capacidade inválida
- **WHEN** a capacidade informada é zero
- **THEN** o sistema responde 422

#### Scenario: Inativação sem motivo
- **WHEN** um veículo é inativado sem motivo
- **THEN** o sistema responde 422 e o veículo continua ativo

### Requirement: Vistoria semestral do DETRAN
O sistema DEVE registrar cada vistoria com data, número do certificado e validade (igual ou posterior à data), mantendo todo o histórico. Um veículo DEVE ser considerado **regular** somente quando estiver ativo e a vistoria de maior validade não tiver vencido. Registrar uma vistoria nova NUNCA apaga as anteriores.

#### Scenario: Vistoria nova torna o veículo regular
- **GIVEN** um veículo com a última vistoria vencida
- **WHEN** o usuário registra uma vistoria com validade futura
- **THEN** o veículo passa a regular e a vistoria antiga continua no histórico

#### Scenario: Veículo sem vistoria
- **GIVEN** um veículo recém-cadastrado
- **WHEN** ele é consultado
- **THEN** a situação é "sem vistoria" e ele não é regular

#### Scenario: Validade anterior à data
- **WHEN** a vistoria informa validade anterior à data da vistoria
- **THEN** o sistema responde 422

### Requirement: Alertas de vencimento
O sistema DEVE listar alertas de CNH, curso especializado, exame toxicológico, vistoria e contrato **vencidos** (críticos) ou que vencem em até 30 dias (atenção), informando o tipo, o item (motorista, veículo ou empresa) e a data. Itens inativos NÃO geram alerta.

#### Scenario: CNH a vencer
- **GIVEN** um motorista ativo com a CNH vencendo em 12 dias
- **WHEN** os alertas são consultados
- **THEN** há um alerta de atenção `cnh` com a data de vencimento

#### Scenario: Vistoria vencida
- **GIVEN** um veículo ativo com vistoria vencida
- **WHEN** os alertas são consultados
- **THEN** há um alerta crítico `vistoria` com a placa e a data

#### Scenario: Item inativo
- **GIVEN** um veículo inativo com vistoria vencida
- **WHEN** os alertas são consultados
- **THEN** não há alerta para ele

#### Scenario: Sem pendências
- **WHEN** nenhum documento está vencido nem a vencer
- **THEN** a lista vem vazia

### Requirement: Exclusão lógica sem perda de histórico
Empresas, motoristas e veículos DEVEM ser excluídos de forma lógica. Registros usados por rotas ou alocações NÃO podem ser excluídos; devem ser inativados.

#### Scenario: Veículo excluído
- **WHEN** um veículo sem uso é excluído
- **THEN** ele some das listagens padrão e a placa pode ser reutilizada

### Requirement: Auditoria do módulo Transporte
Toda criação, edição, inativação e exclusão do módulo DEVE ser registrada no `audit_logs` com o estado antes e depois. A consulta da auditoria DEVE exigir `transporte.audit`.

#### Scenario: Edição auditada
- **WHEN** a capacidade de um veículo muda de 20 para 24
- **THEN** o `audit_logs` guarda o antes e o depois, o usuário e o IP

#### Scenario: Consulta sem permissão
- **WHEN** um usuário sem `transporte.audit` abre a auditoria
- **THEN** o servidor responde 403

### Requirement: Telas da frota no portal do Cliente
O portal do Cliente DEVE ter o módulo "Transporte Escolar" com visão geral (alertas), empresas, motoristas e veículos, usando somente componentes de `@sysgov/ui`, exibindo placa, CNH, CNPJ e datas em fonte técnica (`font-mono tabular-nums`) e escondendo as ações de escrita de quem não tem `transporte.frota.manage`.

#### Scenario: Placa em fonte técnica
- **WHEN** a lista de veículos é exibida
- **THEN** a placa aparece em caixa alta e fonte monoespaçada

#### Scenario: Botão sem permissão
- **WHEN** um usuário só com `transporte.view` abre os veículos
- **THEN** não há botões de criar, editar ou excluir
