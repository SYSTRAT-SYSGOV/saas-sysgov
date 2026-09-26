# Spec Delta

## MODIFIED Requirements

### Requirement: Geração e Impressão de Plaqueta de Identificação com QR Code
O sistema SHALL disponibilizar a emissão e impressão de Plaqueta de Identificação com QR Code escaneável para qualquer unidade de sepultamento cadastrada. O QR Code gerado DEVE codificar o identificador único do jazigo e a URL de consulta do portal, permitindo visualização na tela e impressão imediata com dados da necrópole, código do jazigo em tipografia técnica JetBrains Mono (`font-mono`), setor e capacidade física. Quando houver inumação confirmada vinculada à unidade, a plaqueta DEVE (SHALL) exibir também o nome do(s) ocupante(s) atual(is) na pré-visualização e na impressão, sem incluir esse dado no conteúdo codificado pelo QR Code.

#### Scenario: Visualização e impressão da plaqueta QR Code
- **WHEN** o usuário seleciona a ação "Plaqueta QR Code" na listagem ou no Drawer de Detalhes da unidade
- **THEN** o sistema exibe um modal contendo a pré-visualização da plaqueta com o QR Code vetorial renderizado, dados identificadores do jazigo e botão de acionamento para impressão

#### Scenario: Leitura do QR Code e consulta rápida
- **WHEN** o QR Code impresso ou na tela é escaneado por dispositivo móvel
- **THEN** o link direciona para a visualização dos dados cadastrais públicos ou autenticados da unidade de sepultamento

#### Scenario: Plaqueta de unidade com ocupante confirmado
- **WHEN** a unidade de sepultamento possui ao menos uma inumação com situação confirmada
- **THEN** a plaqueta exibe o nome de cada ocupante atual abaixo dos dados físicos do jazigo, sem alterar o conteúdo do QR Code

#### Scenario: Plaqueta de unidade sem ocupante
- **WHEN** a unidade de sepultamento não possui inumação confirmada
- **THEN** a plaqueta é emitida normalmente com os dados físicos do jazigo, sem seção de ocupante
