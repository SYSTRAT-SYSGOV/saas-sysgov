# Spec Delta

## ADDED Requirements

### Requirement: Entidades do Inservível vinculadas ao cadastro central de pessoas
O sistema SHALL vincular cada entidade do módulo Inservível a uma pessoa (jurídica ou física) do cadastro central e SHALL ler documento, contatos e endereço dessa pessoa.

#### Scenario: Entidade com CNPJ já cadastrado
- **WHEN** uma entidade é cadastrada com CNPJ que já existe no cadastro central
- **THEN** a entidade é vinculada à pessoa jurídica existente e nenhuma pessoa nova é criada
