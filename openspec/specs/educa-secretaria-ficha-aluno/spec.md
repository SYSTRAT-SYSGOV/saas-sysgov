# Spec: Ficha do Aluno e Responsáveis (SYS-Educa Secretaria)

## Purpose
Mantém a ficha cadastral e complementar do aluno, dados civis de certidão de nascimento, programas sociais e o vínculo formal com os responsáveis legais cadastrados no MDM.

## Requirements

### Requirement: Integração cadastral com Pessoas MDM
O cadastro do aluno SHALL referenciar obrigatoriamente um registro existente em `Modules\Pessoas\Models\Pessoa` (`aluno_pessoa_id`). É PROIBIDO criar ou duplicar dados civis de nome, data de nascimento e CPF fora da tabela `pessoas`.

#### Scenario: Seleção de pessoa no MDM
- **WHEN** o gestor cadastra o aluno informando o `pessoa_id` válido no tenant
- **THEN** o perfil do aluno no SYS-Educa é criado e associado à pessoa

### Requirement: Ficha complementar e programas sociais
O sistema SHALL registrar informações educacionais complementares: dados de certidão de nascimento (termo, folha, livro, cartório), código NIS/PIS, cartão SUS, se é beneficiário do Bolsa Família, necessidades educacionais especiais (AEE/laudo) e opção de transporte escolar público.

#### Scenario: Atualização de ficha do aluno
- **WHEN** a secretaria insere os dados de certidão civil e número do NIS
- **THEN** os dados são salvos no perfil do estudante com trilha de auditoria

### Requirement: Vínculo de parentesco com responsáveis
O sistema SHALL vincular um ou mais responsáveis legais ao aluno, onde cada responsável é também uma pessoa cadastrada no módulo `Pessoas`, indicando o grau de parentesco (`mae`, `pai`, `responsavel_legal`, etc.) e flags de responsabilidade pedagógica e financeira.

#### Scenario: Vínculo de mãe e pai
- **WHEN** a secretaria associa os pais como responsáveis do aluno
- **THEN** os vínculos são registrados com histórico auditado
