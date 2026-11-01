## ADDED Requirements

### Requirement: Fornecedores da frota
O sistema DEVE cadastrar fornecedores de serviços da frota sobre o cadastro único de Pessoas (pessoa jurídica), com um ou mais ramos (mecânica, combustível, seguro, peças, outros), contato e situação. O sistema NÃO DEVE excluir fornecedor com ordem de serviço, apenas inativá-lo. Exige `transporte.manutencao.gerir`.

#### Scenario: Cadastrar fornecedor
- **WHEN** o usuário cadastra um fornecedor informando o CNPJ e o ramo mecânica
- **THEN** a Pessoa é resolvida pelo documento (criada ou reutilizada) e o fornecedor é salvo

#### Scenario: Fornecedor com ordem
- **GIVEN** um fornecedor com ordem de serviço
- **WHEN** o usuário tenta excluí-lo
- **THEN** a API responde 409 e oferece a inativação

#### Scenario: Mesma pessoa como empresa e fornecedor
- **GIVEN** uma Pessoa que já é empresa de transporte
- **WHEN** ela é cadastrada como fornecedor
- **THEN** o cadastro é aceito, sem duplicar a Pessoa

### Requirement: Ordens de serviço do veículo
O sistema DEVE registrar ordens de serviço por veículo (fornecedor opcional, tipo, descrição, abertura, conclusão, quilometragem, valor e situação aberta, concluída ou cancelada). Ao concluir, o sistema DEVE exigir conclusão não anterior à abertura e quilometragem não menor que a atual do veículo, e DEVE atualizar a quilometragem do veículo. Ordem concluída ou cancelada NÃO DEVE ser editada. Exige `transporte.manutencao.gerir`.

#### Scenario: Concluir ordem
- **GIVEN** uma ordem aberta e veículo com 40.000 km
- **WHEN** o usuário conclui informando 41.200 km
- **THEN** a ordem fica concluída e o veículo passa a 41.200 km

#### Scenario: Quilometragem menor
- **WHEN** o usuário conclui com 39.000 km
- **THEN** a API responde 422 informando a quilometragem atual do veículo

#### Scenario: Ordem concluída é imutável
- **WHEN** o usuário tenta editar uma ordem concluída
- **THEN** a API responde 409

#### Scenario: Veículo em manutenção
- **GIVEN** um veículo com ordem aberta
- **WHEN** o usuário o escolhe para uma nova rota
- **THEN** a API devolve o aviso de que o veículo está em manutenção, e as rotas já gravadas não são alteradas

### Requirement: Manutenção prevista e alertas
O sistema DEVE permitir registrar manutenção prevista por data, por quilometragem ou por ambas, exigindo ao menos uma. O sistema DEVE gerar alerta de atenção quando faltarem 30 dias ou 500 km e alerta crítico quando vencida, e DEVE permitir converter a previsão em ordem de serviço.

#### Scenario: Previsão sem critério
- **WHEN** o usuário cria uma previsão sem data nem quilometragem
- **THEN** a API responde 422

#### Scenario: Previsão próxima
- **GIVEN** uma previsão para daqui a 20 dias
- **WHEN** o painel é consultado
- **THEN** aparece um alerta de atenção para o veículo

#### Scenario: Previsão vencida
- **GIVEN** uma previsão com data passada e nenhuma ordem
- **WHEN** o painel é consultado
- **THEN** aparece um alerta crítico

#### Scenario: Converter em ordem
- **WHEN** o usuário converte a previsão
- **THEN** é criada uma ordem aberta com os dados da previsão e a previsão fica convertida

### Requirement: Quilometragem do veículo
O sistema DEVE manter a quilometragem atual do veículo e DEVE exigir confirmação explícita, com auditoria, para reduzi-la.

#### Scenario: Correção de hodômetro
- **WHEN** o usuário reduz a quilometragem e confirma a correção
- **THEN** o valor é alterado e a auditoria registra o valor anterior e o novo

#### Scenario: Redução sem confirmação
- **WHEN** o usuário reduz a quilometragem sem confirmar
- **THEN** a API responde 422

### Requirement: Relatório de gastos de manutenção
O sistema DEVE oferecer o gasto por veículo, fornecedor e tipo de serviço no ano e o histórico de manutenção por veículo, com exportação em CSV que neutralize fórmulas e seja auditada.

#### Scenario: Gasto no ano
- **GIVEN** três ordens concluídas no ano para o mesmo veículo
- **WHEN** o usuário abre o relatório
- **THEN** vê o total do veículo e o detalhamento por tipo

#### Scenario: Isolamento de tenant
- **GIVEN** ordens de outro tenant
- **WHEN** o usuário consulta o relatório
- **THEN** só vê as do seu tenant
