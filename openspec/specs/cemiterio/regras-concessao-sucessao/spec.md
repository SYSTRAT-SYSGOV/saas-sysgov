# cemiterio/regras-concessao-sucessao Specification

## Purpose
Gerencia as regras de negócio municipais de concessão cemiterial, controle de processos administrativos, trava anti-sepultamento de terceiros para titulares falecidos e sucessão hereditária de titularidade.

## Requirements

### Requirement: Trava Anti-Sepultamento para Titular Falecido sem Regularização
O sistema SHALL bloquear a realização de novos sepultamentos (inumações) de terceiros em jazigos concedidos cujo titular concessionário esteja registrado com óbito (`titular_falecido`), exigindo a comprovação de regularização de sucessão hereditária através de processo administrativo municipal ou alvará judicial.

#### Scenario: Bloqueio de sepultamento de terceiro em lote com titular falecido
- **WHEN** um operador tenta cadastrar uma nova inumação de pessoa não autorizada em jazigo cujo concessionário titular possui flag de falecido sem partilha/sucessão formalizada
- **THEN** o sistema impede a confirmação do sepultamento com erro de regra de negócio indicando que a concessão possui sucessão hereditária pendente

#### Scenario: Liberação de sepultamento para o próprio titular falecido
- **WHEN** o sepultamento sendo realizado for do próprio titular concessionário da concessão
- **THEN** o sistema autoriza a inumação na gaveta livre do jazigo e registra o status de titular falecido para futuras movimentações

### Requirement: Gestão de Processo Administrativo e Modalidade da Concessão
O sistema SHALL vincular obrigatoriamente a toda concessão cemiterial o número do Processo Administrativo Municipal correspondente, distinguindo concessões de tipo comum/temporário (terra com prazo de vigência determinado) de concessões perpétuas (gaveta/concreto com direito perpétuo de aforamento).

#### Scenario: Cadastro de concessão com processo administrativo
- **WHEN** uma nova concessão é emitida pelo operador
- **THEN** o sistema armazena e valida o número do processo administrativo municipal e define o prazo de validade conforme a modalidade temporária ou perpétua

#### Scenario: Histórico de prorrogações e revalidações
- **WHEN** uma concessão temporária é renovada ou revalidada
- **THEN** o sistema registra o novo processo administrativo de renovação e atualiza a data limite de vigência da concessão

### Requirement: Integração Compulsória do Titular Concessionário com o Cadastro Mestre de Pessoas
O sistema SHALL vincular preferencialmente todo titular de concessão cemiterial (`Concessionario`) a um registro válido no módulo central de Pessoas (`pessoa_id`), garantindo a rastreabilidade LGPD, unicidade de CPF e propagação de atualizações cadastrais de contato e endereço entre o módulo de Pessoas e o módulo de Cemitérios.

#### Scenario: Gravação de concessão com titular originado do cadastro mestre
- **WHEN** uma nova concessão ou atualização de titularidade for submetida com um `pessoa_id` válido
- **THEN** o sistema persiste a chave estrangeira `pessoa_id` na tabela de concessionários, espelha o CPF/documento cifrado e o hash de documento da pessoa física mestre e disponibiliza o relacionamento na API

#### Scenario: Sucessão hereditária com herdeiro selecionado da base de pessoas
- **WHEN** for instaurado ou deferido um processo de sucessão de titularidade
- **THEN** o novo titular indicado deve ser vinculado a um registro existente em Pessoas ou cadastrado via fluxo centralizado antes de ser outorgado como novo titular da concessão

### Requirement: Propagação de Óbito do Titular Concessionário para o Cadastro de Pessoas
O sistema SHALL propagar automaticamente o evento de falecimento de um titular concessionário para o registro de pessoa mestre no MDM (`Pessoa`) sempre que o titular possuir vínculo ativo (`pessoa_id`).

#### Scenario: Atualização de titular falecido com propagação ao MDM
- **WHEN** um operador municipal salva a edição de um titular concessionário marcando `titular_falecido: true` com a respectiva `data_falecimento_titular` e o titular possui `pessoa_id` válido
- **THEN** o sistema SHALL persistir a alteração no domínio cemiterial e atualizar automaticamente a entidade `Pessoa` correspondente com `falecido: true` e a data de falecimento informada.

#### Scenario: Titular concessionário legado sem vínculo prévio
- **WHEN** um operador municipal registra o falecimento de um concessionário que ainda não possui `pessoa_id` vinculado
- **THEN** o sistema SHALL persistir os dados cemiteriais normalmente, mantendo o aviso visual para incentivar a vinculação futura ao MDM.
