# Spec Delta

## Purpose
Governa a extensão funcional dos servidores escolares sobre o cadastro de pessoas físicas (MDM Pessoas), a atribuição de papéis profissionais, controle de matrículas funcionais e dados acadêmicos para atendimento do Educacenso.

## ADDED Requirements

### Requirement: Extensão funcional de servidor vinculado a Pessoa
O sistema SHALL registrar o servidor escolar estendendo obrigatoriamente um registro prévio de pessoa física (`pessoa_id`), proibindo a criação de cadastros civis duplicados na base do tenant.

#### Scenario: Cadastro de servidor com pessoa existente
- **WHEN** o gestor cadastra um servidor informando um `pessoa_id` válido e a carga horária contratual global
- **THEN** o perfil funcional do servidor é criado e associado ao tenant com status ativo

### Requirement: Múltiplas funções profissionais e matrículas
O sistema SHALL permitir que o servidor possua uma ou mais funções profissionais atribuídas (Professor, Diretor, Coordenador, Apoio), cada qual com sua respectiva matrícula funcional independente.

#### Scenario: Atribuição de função docente e administrativa
- **WHEN** o gestor vincula ao servidor a função de "Professor" com matrícula "MAT-101" e a função de "Coordenador" com matrícula "MAT-102"
- **THEN** ambas as funções ficam ativas e discriminadas na ficha funcional do servidor

### Requirement: Formação acadêmica e código docente INEP
O sistema SHALL armazenar a escolaridade, cursos de graduação, pós-graduação e o código identificador único do docente no INEP para subsidiar o Educacenso.

#### Scenario: Atualização de formação com código INEP
- **WHEN** o usuário informa a graduação em Pedagogia e o código INEP do docente
- **THEN** os dados acadêmicos são salvos e vinculados ao registro funcional do servidor
