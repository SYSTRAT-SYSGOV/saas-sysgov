# cemiterio/cadastro-operadores Specification

## Purpose

Gerencia o cadastro, credenciamento, sanções administrativas e vínculo operacional rastreável
de coveiros (servidores municipais) e pedreiros (prestadores credenciados) que executam
sepultamentos, exumações e obras funerárias nas necrópoles do tenant.

## Requirements

### Requirement: Proteção do Documento Pessoal do Profissional
O sistema SHALL armazenar o CPF/CNPJ do profissional de forma criptografada em repouso e SHALL
retornar apenas uma versão mascarada do documento nas respostas da API de listagem, detalhe e
edição — nunca o valor em texto puro.

#### Scenario: Listagem não expõe o documento em claro
- **WHEN** um usuário autorizado consulta a listagem ou o detalhe de um operador cadastrado
- **THEN** o sistema retorna o documento mascarado (ex.: `***.456.789-**`) e não retorna o valor original em nenhum campo da resposta

#### Scenario: Busca por documento continua funcionando
- **WHEN** um usuário autorizado busca um operador pelo CPF/CNPJ completo ou parcial
- **THEN** o sistema localiza o registro correspondente sem expor o documento em texto puro de outros operadores no resultado

### Requirement: Segmentação de Profissionais por Necrópole
O sistema SHALL permitir associar um coveiro ou pedreiro a uma necrópole específica do tenant
(`park_id`), ou deixá-lo sem necrópole associada para indicar atuação em todas as necrópoles do
tenant, e SHALL permitir filtrar a listagem por necrópole ativa.

#### Scenario: Filtro por necrópole ativa em tenant multi-cemitério
- **WHEN** um usuário com uma necrópole ativa selecionada consulta a listagem de operadores
- **THEN** o sistema retorna apenas os operadores associados àquela necrópole e os operadores sem necrópole associada (atuação municipal ampla)

#### Scenario: Cadastro sem necrópole específica
- **WHEN** um operador é cadastrado sem `park_id` informado
- **THEN** o sistema o considera apto a atuar em qualquer necrópole do tenant

### Requirement: Histórico de Credenciamento com Documento Anexado
O sistema SHALL manter um histórico de credenciamentos (alvarás) por profissional, cada um com
número, período de validade e o documento do alvará anexado com verificação de integridade por
hash SHA-256, e SHALL expor o credenciamento vigente (o de maior data de validade ainda não
vencida) como a credencial atual do profissional.

#### Scenario: Renovação de alvará preserva o histórico anterior
- **WHEN** um pedreiro credenciado tem seu alvará renovado com novo número e nova validade
- **THEN** o sistema registra o novo credenciamento sem apagar os credenciamentos anteriores, e passa a considerar o novo como vigente

#### Scenario: Upload de documento do alvará com verificação de integridade
- **WHEN** o documento do alvará é anexado a um credenciamento
- **THEN** o sistema calcula e armazena o hash SHA-256 do arquivo e permite verificar a integridade do documento a qualquer momento

### Requirement: Alerta de Vencimento de Credenciamento
O sistema SHALL classificar cada pedreiro credenciado conforme a validade do seu credenciamento
vigente em: válido, a vencer (até 30 dias), vencido ou sem credenciamento — e SHALL disponibilizar
essa classificação como filtro e como indicador consolidado no painel da aba.

#### Scenario: Indicador consolidado de vencimentos
- **WHEN** a aba de Coveiros e Pedreiros é carregada
- **THEN** o sistema exibe a quantidade de credenciamentos a vencer nos próximos 30 dias e a quantidade de credenciamentos já vencidos

### Requirement: Sanções Administrativas do Profissional
O sistema SHALL permitir registrar sanções administrativas (advertência, suspensão temporária ou
descredenciamento) para um coveiro ou pedreiro, com motivo obrigatório, período de vigência e
anexo opcional do processo administrativo, e SHALL manter o histórico de todas as sanções já
aplicadas ao profissional.

#### Scenario: Registro de suspensão temporária
- **WHEN** um gestor registra uma suspensão de 15 dias para um pedreiro por descumprimento de norma de segurança
- **THEN** o sistema grava a sanção com o motivo, a data de início e de término, e a mantém visível no histórico do profissional após o fim da vigência

### Requirement: Profissional Sancionado Não Pode Ser Alocado a Nova Execução
O sistema SHALL impedir a vinculação de um coveiro ou pedreiro a uma nova inumação, exumação ou
obra enquanto ele estiver com uma suspensão em vigência ou com status de descredenciado.

#### Scenario: Bloqueio de vínculo com pedreiro suspenso
- **WHEN** um usuário tenta vincular um pedreiro com suspensão vigente a uma nova obra
- **THEN** o sistema rejeita a vinculação com uma mensagem de regra de negócio indicando a sanção ativa e o período de vigência

#### Scenario: Descredenciado não aparece nas opções de vinculação de novas execuções
- **WHEN** um usuário busca profissionais disponíveis para vincular a uma nova inumação
- **THEN** o sistema não lista profissionais com status de descredenciado entre as opções

### Requirement: Rastreamento de Saúde e Segurança Ocupacional
O sistema SHALL permitir registrar, por profissional, a validade do Atestado de Saúde
Ocupacional (ASO) e a data do último treinamento/entrega de Equipamento de Proteção Individual
(EPI), e SHALL alertar quando esses registros estiverem vencidos ou a vencer, usando a mesma
janela de alerta aplicada ao credenciamento (30 dias).

#### Scenario: Alerta de ASO vencido
- **WHEN** a validade do ASO de um coveiro já expirou
- **THEN** o sistema sinaliza o profissional com o indicador de saúde ocupacional vencida no cadastro e no painel consolidado

### Requirement: Vínculo Rastreável com Execuções Operacionais
O sistema SHALL vincular, por identificador único (e não apenas por nome), o coveiro e o
pedreiro responsáveis por cada nova inumação, exumação ou obra registrada a partir deste change,
e SHALL manter a compatibilidade com o histórico de registros legados que só possuem o nome do
profissional em texto livre.

#### Scenario: Histórico do profissional prioriza o vínculo por identificador
- **WHEN** o histórico operacional de um coveiro é consultado e existem tanto registros com
  vínculo por identificador quanto registros legados só com o nome em texto livre
- **THEN** o sistema retorna a união dos dois conjuntos, sem duplicar um mesmo atendimento e sem exigir correspondência exata de nome para os registros vinculados por identificador

### Requirement: Permissões Distintas de Leitura e Gestão do Cadastro
O sistema SHALL exigir uma permissão dedicada de leitura (`cemiterios.cadastros.view`) para
acessar a aba e consultar os profissionais cadastrados, distinta da permissão de gestão
(`cemiterios.cadastros.manage`) exigida para cadastrar, editar, credenciar ou sancionar um
profissional.

#### Scenario: Usuário apenas com permissão de leitura não pode cadastrar
- **WHEN** um usuário com apenas `cemiterios.cadastros.view` tenta cadastrar um novo profissional
- **THEN** o sistema rejeita a operação por falta de permissão, mas permite normalmente a consulta da listagem

### Requirement: Isolamento Multi-Tenant do Cadastro de Operadores
O sistema SHALL garantir que nenhum dado de coveiros, pedreiros, credenciamentos ou sanções de
um tenant seja visível, editável ou referenciável a partir de outro tenant.

#### Scenario: Tenant B não enxerga operadores do Tenant A
- **WHEN** um usuário do Tenant B lista ou tenta acessar diretamente um operador cadastrado pelo Tenant A
- **THEN** o sistema retorna lista vazia na listagem e 404 no acesso direto, sem indicar a existência do registro
