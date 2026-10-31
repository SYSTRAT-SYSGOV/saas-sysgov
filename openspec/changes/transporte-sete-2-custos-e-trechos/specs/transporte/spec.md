## ADDED Requirements

### Requirement: Parâmetros de custo por órgão e ano
O sistema DEVE manter, por tenant e ano, os parâmetros do cálculo de custo (catálogo fixo de chaves com unidade, faixa válida e valor de referência editável). O órgão NÃO DEVE criar chave nova. Ao iniciar um novo ano, o sistema DEVE oferecer a cópia dos parâmetros do ano anterior. Exige `transporte.custos.parametros` para editar.

#### Scenario: Editar parâmetro
- **WHEN** o usuário altera o preço do combustível de 2026
- **THEN** o valor é salvo, a auditoria registra a alteração e os cálculos de 2026 passam a usá-lo

#### Scenario: Valor fora da faixa
- **WHEN** o usuário informa encargos sociais negativos
- **THEN** a API responde 422 indicando a faixa válida

#### Scenario: Copiar do ano anterior
- **GIVEN** parâmetros de 2026 e nenhum de 2027
- **WHEN** o usuário copia 2026 para 2027
- **THEN** os valores são copiados com origem do órgão e podem ser editados

### Requirement: Cálculo do custo da rota
O sistema DEVE calcular o custo da rota (mensal, anual, por km, por dia letivo e por aluno com alocação ativa), detalhando cada componente fixo e variável e os parâmetros usados. O modal DEVE ser derivado da tipologia do veículo da rota (7 a 10 aquaviário; demais rodoviário). Faltando parâmetro obrigatório, o sistema DEVE informar o resultado como incompleto e listar o que falta, sem assumir zero. Exige `transporte.custos.ver`.

#### Scenario: Rota rodoviária completa
- **GIVEN** uma rota com veículo, km definidos e todos os parâmetros do ano
- **WHEN** o usuário consulta o custo
- **THEN** recebe custo mensal, anual, por km e por aluno, com o detalhamento dos componentes

#### Scenario: Rota aquaviária
- **GIVEN** uma rota cujo veículo tem tipologia 8
- **WHEN** o usuário consulta o custo
- **THEN** o modal é aquaviário e o cálculo usa os componentes do modal aquaviário

#### Scenario: Parâmetro faltando
- **WHEN** falta o preço do veículo
- **THEN** o resultado é "incompleto" e lista "preço do veículo"

#### Scenario: Rota sem alunos
- **GIVEN** uma rota sem alocação ativa
- **WHEN** o usuário consulta o custo
- **THEN** o custo por aluno aparece como indefinido, e não como zero

#### Scenario: Simulação
- **WHEN** o usuário simula o combustível 10% mais caro
- **THEN** o resultado simulado é mostrado sem alterar os parâmetros salvos

### Requirement: Custo contratado e comparação
O sistema DEVE permitir informar o custo mensal contratado de uma rota atendida por frota locada ou terceirizada e DEVE comparar com o custo estimado, mostrando a diferença absoluta e percentual.

#### Scenario: Contrato acima do estimado
- **GIVEN** custo estimado de R$ 8.000 e contratado de R$ 10.000
- **WHEN** o usuário abre o comparativo
- **THEN** vê a diferença de R$ 2.000 (25%) sinalizada

#### Scenario: Frota própria
- **WHEN** a rota usa veículo próprio
- **THEN** o campo de custo contratado não é oferecido

### Requirement: Características do trecho da rota
O sistema DEVE permitir marcar, em cada rota, as características do trecho de um catálogo fixo (porteira, mata-burro, colchete, atoleiro, ponte rústica) e DEVE permitir filtrar rotas e relatórios por elas.

#### Scenario: Marcar obstáculos
- **WHEN** o usuário marca porteira e atoleiro em uma rota
- **THEN** a rota exibe as duas características e aparece no filtro correspondente

### Requirement: Relatório de custos
O sistema DEVE oferecer relatório de custos por rota, escola e empresa, com exportação em CSV que neutralize fórmulas. A exportação DEVE ser auditada.

#### Scenario: Exportar relatório
- **WHEN** o usuário exporta o relatório do ano
- **THEN** o CSV traz uma linha por rota e a auditoria registra a exportação
