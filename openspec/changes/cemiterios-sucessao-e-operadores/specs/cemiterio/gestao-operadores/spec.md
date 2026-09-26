# Spec: Gestão de Coveiros e Pedreiros Credenciados

## ADDED Requirements

### Requirement: Cadastro Unificado de Profissionais Operacionais
O sistema DEVE permitir o cadastramento e manutenção de profissionais que executam serviços de sepultamento, exumação ou construção/reforma tumular nos cemitérios públicos municipais, classificando-os entre servidores municipais (`coveiro`) e prestadores particulares autônomos (`pedreiro`).

#### Scenario: Cadastro de coveiro servidor municipal
- **WHEN** o gestor cadastra um profissional do tipo `coveiro` informando nome completo, CPF e matrícula funcional
- **THEN** o sistema registra o coveiro como ativo no quadro funcional da necrópole, disponibilizando seu nome nas opções de inumação e exumação.

#### Scenario: Cadastro e credenciamento de pedreiro particular
- **WHEN** o gestor cadastra um profissional do tipo `pedreiro` informando número do alvará municipal de prestador de serviços e data de validade da licença
- **THEN** o sistema valida que o alvará não está vencido e marca a situação do credenciamento como `credenciado`.

### Requirement: Controle de Validade de Alvará de Pedreiros
O sistema DEVE sinalizar com alertas visuais os pedreiros cujo alvará ou credenciamento municipal esteja vencido ou a expirar em até 30 dias, bloqueando a autorização de novas obras tumulares para profissionais com pendência cadastral.

#### Scenario: Bloqueio de autorização de obra para pedreiro com alvará vencido
- **WHEN** um pedreiro com data de validade de alvará anterior à data atual é selecionado para uma nova ordem de serviço ou obra em jazigo
- **THEN** o sistema emite alerta impeditivo informando que o profissional possui credenciamento vencido e impede a vinculação da obra.

### Requirement: Extrato e Histórico de Produtividade Operacional
O sistema DEVE disponibilizar painel com o histórico consolidado de todas as atividades realizadas pelo operador (inumações, exumações e obras/reformas em jazigos), com filtros por período e necrópole.

#### Scenario: Visualização do histórico operacional
- **WHEN** o usuário abre os detalhes de um operador na listagem
- **THEN** o sistema exibe o histórico detalhado contendo código do jazigo, nome do falecido sepultado, data da operação e necrópole correspondente.
