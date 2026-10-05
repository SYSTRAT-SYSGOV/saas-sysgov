# Spec Delta

## MODIFIED Requirements

### Requirement: Busca e listagem de pessoas
O sistema SHALL permitir localizar pessoas por nome ou CPF e filtrar a listagem por tipo de vínculo, por status da pessoa, por situação vital (falecido ou vivo) e por faixa de data de nascimento e sexo, combinando os filtros entre si. A listagem SHALL incluir os vínculos de cada pessoa retornada, sem exigir uma consulta adicional por pessoa, SHALL permitir ordenação pelas colunas nome, CPF e status, e SHALL permitir a exportação, nos formatos CSV, XLSX e PDF, das linhas resultantes dos filtros aplicados.

#### Scenario: Busca por CPF
- **WHEN** o usuário busca por um CPF válido cadastrado no tenant
- **THEN** o sistema retorna a pessoa correspondente, mesmo que o CPF tenha sido digitado com máscara ou pontuação

#### Scenario: Filtro por tipo de vínculo
- **WHEN** o usuário filtra a listagem pelo vínculo "municipe"
- **THEN** o sistema retorna apenas pessoas com um vínculo desse tipo, incluindo as que também têm outros vínculos

#### Scenario: Listagem traz os vínculos de cada pessoa
- **WHEN** a listagem de pessoas é consultada
- **THEN** cada pessoa retornada inclui seus vínculos, permitindo exibi-los na própria listagem sem uma requisição por pessoa

#### Scenario: Filtro por situação vital
- **WHEN** o usuário filtra a listagem para exibir apenas pessoas falecidas
- **THEN** o sistema retorna somente pessoas com `falecido` igual a verdadeiro

#### Scenario: Filtro por faixa de data de nascimento
- **WHEN** o usuário informa uma data inicial e uma data final para filtrar por data de nascimento
- **THEN** o sistema retorna apenas pessoas cuja data de nascimento esteja dentro do intervalo informado, inclusive nos extremos

#### Scenario: Filtros combinados
- **WHEN** o usuário aplica simultaneamente busca textual, tipo de vínculo e situação vital
- **THEN** o sistema retorna apenas as pessoas que satisfazem todos os filtros aplicados ao mesmo tempo

#### Scenario: Ordenação por coluna
- **WHEN** o usuário clica no cabeçalho da coluna de nome, CPF ou status na listagem
- **THEN** o sistema reordena as linhas exibidas de acordo com a coluna e o sentido (ascendente/descendente) escolhidos

#### Scenario: Exportação das linhas filtradas
- **WHEN** o usuário aciona a exportação da listagem com filtros aplicados
- **THEN** o sistema gera o arquivo no formato escolhido (CSV, XLSX ou PDF) contendo apenas as linhas que atendem aos filtros vigentes no momento da exportação

## ADDED Requirements

### Requirement: Área de rolagem única por modal
O sistema SHALL apresentar, em cada modal (diálogo) do módulo de Cadastro de Pessoas, no máximo uma área de rolagem vertical para o conteúdo, sem aninhar uma segunda área de rolagem dentro da área de rolagem padrão do componente de diálogo do design system.

#### Scenario: Modal de novo cadastro sem rolagem duplicada
- **WHEN** o conteúdo do assistente de novo cadastro de pessoa excede a altura visível do modal
- **THEN** o sistema exibe apenas uma barra de rolagem vertical, controlada pelo próprio diálogo, sem uma segunda área de rolagem aninhada dentro do conteúdo

#### Scenario: Modal de detalhe sem rolagem duplicada
- **WHEN** o conteúdo da ficha detalhada de uma pessoa excede a altura visível do modal
- **THEN** o sistema exibe apenas uma barra de rolagem vertical, controlada pelo próprio diálogo, sem uma segunda área de rolagem aninhada dentro do conteúdo
