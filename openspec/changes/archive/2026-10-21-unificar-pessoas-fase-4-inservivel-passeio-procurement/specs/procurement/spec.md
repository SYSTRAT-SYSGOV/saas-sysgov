# Spec Delta

## ADDED Requirements

### Requirement: Participantes de licitação vinculados à pessoa jurídica do cadastro central
O sistema SHALL vincular cada participante de licitação a uma pessoa jurídica do cadastro central, resolvida pelo CNPJ, e SHALL preservar sem alteração os participantes de licitações já homologadas.

#### Scenario: Licitação homologada preservada
- **WHEN** a conciliação processa participantes de uma licitação homologada
- **THEN** os dados registrados na homologação permanecem inalterados e apenas o vínculo com a pessoa é acrescentado

#### Scenario: CNPJ inválido
- **WHEN** a conciliação encontra um participante com CNPJ inválido
- **THEN** o participante não gera pessoa automaticamente e a ocorrência é registrada como divergência para revisão
