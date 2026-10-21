# Spec Delta

## ADDED Requirements

### Requirement: Responsáveis e contatos do Passeio vinculados ao cadastro central de pessoas
O sistema SHALL vincular os responsáveis e os contatos de veículos do módulo Passeio a pessoas do cadastro central, sem manter telefone ou nome próprios nos novos registros.

#### Scenario: Responsável sem CPF
- **WHEN** um responsável de passeio é cadastrado sem CPF
- **THEN** o sistema cria uma pessoa com documento pendente no cadastro central e vincula o responsável a ela
