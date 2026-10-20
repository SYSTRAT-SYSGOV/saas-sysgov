# Spec Delta

## ADDED Requirements

### Requirement: Operadores, concessionários e herdeiros vinculados obrigatoriamente ao cadastro central
O sistema SHALL exigir que todo operador, concessionário e herdeiro de cemitério referencie uma pessoa do cadastro central e SHALL ler documento, contatos e endereço dessa pessoa, sem manter cópia própria nos novos registros.

#### Scenario: Herdeiro sem pessoa vinculada
- **WHEN** um herdeiro é cadastrado em um processo de sucessão sem referenciar uma pessoa
- **THEN** o sistema resolve ou cria a pessoa no cadastro central e vincula o herdeiro a ela

#### Scenario: Registro antigo conciliado
- **WHEN** a conciliação processa um operador antigo que só tinha dados civis próprios
- **THEN** o operador passa a referenciar a pessoa correspondente e a situação vital já registrada permanece inalterada
