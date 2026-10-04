# Spec Delta: Regras de Concessão e Sucessão (Sincronização de Óbito de Titular com MDM)

## ADDED Requirements

### Requirement: Propagação de Óbito do Titular Concessionário para o Cadastro de Pessoas
O sistema SHALL propagar automaticamente o evento de falecimento de um titular concessionário para o registro de pessoa mestre no MDM (`Pessoa`) sempre que o titular possuir vínculo ativo (`pessoa_id`).

#### Scenario: Atualização de titular falecido com propagação ao MDM
- **WHEN** um operador municipal salva a edição de um titular concessionário marcando `titular_falecido: true` com a respectiva `data_falecimento_titular` e o titular possui `pessoa_id` válido
- **THEN** o sistema SHALL persistir a alteração no domínio cemiterial e atualizar automaticamente a entidade `Pessoa` correspondente com `falecido: true` e a data de falecimento informada.

#### Scenario: Titular concessionário legado sem vínculo prévio
- **WHEN** um operador municipal registra o falecimento de um concessionário que ainda não possui `pessoa_id` vinculado
- **THEN** o sistema SHALL persistir os dados cemiteriais normalmente, mantendo o aviso visual para incentivar a vinculação futura ao MDM.
