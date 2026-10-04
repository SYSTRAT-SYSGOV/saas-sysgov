# Delta de Especificação: cemiterio/regras-concessao-sucessao

## ADDED Requirements

### Requirement: Integração Compulsória do Titular Concessionário com o Cadastro Mestre de Pessoas
O sistema SHALL vincular preferencialmente todo titular de concessão cemiterial (`Concessionario`) a um registro válido no módulo central de Pessoas (`pessoa_id`), garantindo a rastreabilidade LGPD, unicidade de CPF e propagação de atualizações cadastrais de contato e endereço entre o módulo de Pessoas e o módulo de Cemitérios.

#### Scenario: Gravação de concessão com titular originado do cadastro mestre
- **WHEN** uma nova concessão ou atualização de titularidade for submetida com um `pessoa_id` válido
- **THEN** o sistema persiste a chave estrangeira `pessoa_id` na tabela de concessionários, espelha o CPF/documento cifrado e o hash de documento da pessoa física mestre e disponibiliza o relacionamento na API

#### Scenario: Sucessão hereditária com herdeiro selecionado da base de pessoas
- **WHEN** for instaurado ou deferido um processo de sucessão de titularidade
- **THEN** o novo titular indicado deve ser vinculado a um registro existente em Pessoas ou cadastrado via fluxo centralizado antes de ser outorgado como novo titular da concessão
