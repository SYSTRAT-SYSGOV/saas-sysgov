# Spec Delta

## ADDED Requirements

### Requirement: Vinculação de operadores e empreiteiros ao cadastro único de pessoas (MDM)
O sistema SHALL permitir que novos cadastros de operadores de cemitério (coveiros e pedreiros) e empreiteiros referenciem a chave estrangeira `pessoa_id` associada ao cadastro central de pessoas físicas do tenant por meio do componente `PessoaPicker`, sem duplicar colunas de nome, CPF ou filiação nas tabelas do módulo de cemitérios para novos registros, mantendo compatibilidade com registros legados pré-existentes.

#### Scenario: Operador com pessoa central
- **WHEN** um operador de cemitério é cadastrado selecionando uma pessoa existente através do `PessoaPicker`
- **THEN** o sistema salva o registro gravando `pessoa_id` consistente com o tenant e exibe os dados civis e de contato a partir do cadastro central via `PessoaCard`

#### Scenario: Empreiteiro com pessoa central
- **WHEN** um novo empreiteiro prestador de serviço pessoa física é cadastrado na necrópole
- **THEN** o formulário utiliza o `PessoaPicker` para associar o `pessoa_id`, eliminando a necessidade de redigitar os dados civis e de contato da pessoa física

#### Scenario: Preservação de registros legados sem quebra
- **WHEN** a listagem ou detalhamento de operadores ou empreiteiros cadastrados anteriormente sem `pessoa_id` é visualizada
- **THEN** o sistema exibe os dados armazenados nas colunas legadas originais normalmente, sem erros de carregamento e sem forçar migração em tempo de execução
