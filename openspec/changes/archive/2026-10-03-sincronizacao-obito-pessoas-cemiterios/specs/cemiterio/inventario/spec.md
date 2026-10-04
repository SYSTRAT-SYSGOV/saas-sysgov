# Spec Delta: Inventário Cemiterial (Pré-preenchimento de Óbito ao Vincular Pessoa Falecida)

## ADDED Requirements

### Requirement: Pré-carregamento de Situação Vital ao Vincular Titular no Inventário
O sistema SHALL pré-carregar automaticamente o status e a data de falecimento no formulário de titular concessionário quando o operador selecionar uma pessoa que já possua registro prévio de óbito no MDM.

#### Scenario: Seleção de pessoa mestre falecida no formulário de titular
- **WHEN** o operador busca e seleciona uma pessoa física no `PessoaPicker` dentro do modal de edição ou cadastro de titular e essa pessoa já estiver marcada como `falecido: true` no MDM
- **THEN** o sistema SHALL marcar automaticamente a opção `titular_falecido` como verdadeira e preencher o campo de data de falecimento com o valor cadastrado na Ficha Cadastral da pessoa.
