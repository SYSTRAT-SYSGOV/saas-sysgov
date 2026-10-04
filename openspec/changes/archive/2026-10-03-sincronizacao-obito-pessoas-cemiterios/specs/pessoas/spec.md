# Spec Delta: Pessoas (Situação Vital e Óbito)

## ADDED Requirements

### Requirement: Registro e Manutenção de Situação Vital (Óbito)
O sistema SHALL permitir o registro e manutenção formal da situação vital da pessoa física no cadastro mestre (MDM), armazenando os campos `falecido` (booleano), `data_falecimento` (data), `certidao_obito_numero` (string opcional), `cartorio_obito` (string opcional) e `observacao_obito` (texto opcional).

#### Scenario: Atualizar pessoa para situação de falecida com sucesso
- **WHEN** um operador com permissão `cadastros.pessoas.update` envia os dados civis marcando `falecido: true`, informando uma data de falecimento válida e dados opcionais da certidão de óbito
- **THEN** o sistema SHALL persistir a situação vital, atualizar o status civil da pessoa para refletir o falecimento, registrar a alteração no `audit_logs` e retornar os dados atualizados com o indicador vital ativo.

#### Scenario: Validação de consistência cronológica do falecimento
- **WHEN** um operador tentar salvar uma pessoa marcando `falecido: true` com uma `data_falecimento` anterior à `data_nascimento` ou no futuro
- **THEN** o sistema SHALL rejeitar a requisição com código HTTP 422 Unprocessable Entity e mensagem de validação orientando a inconsistência temporal.

### Requirement: Exibição Visual da Situação Vital no MDM e Componentes Compartilhados
O sistema SHALL exibir identificação visual imediata de falecimento (badge destacado "Falecido(a)") em todas as listagens de pessoas, na Ficha Cadastral detalhada (`PessoaDetailView`), no card resumido (`PessoaCard`) e no seletor de pessoas (`PessoaPicker`), incluindo a data de óbito formatada em tipografia monoespaçada quando disponível.

#### Scenario: Visualização de munícipe falecido no seletor e na listagem
- **WHEN** um usuário consulta munícipes na listagem geral ou busca pessoas por meio do `PessoaPicker`
- **THEN** os munícipes com registro de falecimento SHALL apresentar uma badge visual distintiva de óbito e o ano ou data de falecimento, diferenciando-os claramente dos cidadãos ativos.

### Requirement: Sincronização Automática com Módulos Satélites de Cemitério
O sistema SHALL expor e permitir que módulos satélites, em especial o Módulo de Cemitérios, invoquem a atualização cadastral de situação vital quando um falecimento de titular ou inumação for registrado, atualizando atomicamente o registro de pessoa mestre correspondente (`pessoa_id`).

#### Scenario: Sincronização acionada por evento de falecimento em módulo satélite
- **WHEN** o módulo de Cemitérios registra formalmente o falecimento de um titular concessionário ou inumado vinculado a uma `Pessoa` existente
- **THEN** o sistema SHALL atualizar a `Pessoa` vinculada definindo `falecido: true` e a respectiva data de falecimento, mantendo a integridade cadastral sem exigir intervenção manual duplicada no MDM.
