# Spec Delta

## ADDED Requirements

### Requirement: Equipe da campanha vinculada ao cadastro central de pessoas
O sistema SHALL vincular candidatos, coordenadores, cabos eleitorais, prefeitos e vereadores a uma pessoa do cadastro central e SHALL ler contatos e dados civis dessa pessoa, mantendo na Campanha apenas os dados do domínio eleitoral.

#### Scenario: Prefeito sem pessoa vinculada
- **WHEN** a conciliação processa um prefeito que só tinha e-mail e telefone próprios
- **THEN** o prefeito passa a referenciar uma pessoa do cadastro central e os contatos são completados nela sem sobrescrever dados existentes

### Requirement: Eleitores fora do cadastro central de pessoas
O sistema SHALL manter a base de eleitores separada do cadastro central de pessoas, preservando o consentimento LGPD e a anonimização após o encerramento da campanha, e SHALL impedir que o cadastro de eleitor crie ou altere pessoas no cadastro central.

#### Scenario: Cadastro público de eleitor
- **WHEN** um eleitor é cadastrado por um link de captação
- **THEN** nenhuma pessoa é criada ou alterada no cadastro central e o registro segue as regras de consentimento e anonimização da campanha
