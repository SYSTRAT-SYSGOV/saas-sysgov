# Spec Delta: cemiterio/inventario

## ADDED Requirements

### Requirement: Geração e Impressão de Plaqueta de Identificação com QR Code
O sistema SHALL disponibilizar a emissão e impressão de Plaqueta de Identificação com QR Code escaneável para qualquer unidade de sepultamento cadastrada. O QR Code gerado DEVE codificar o identificador único do jazigo e a URL de consulta do portal, permitindo visualização na tela e impressão imediata com dados da necrópole, código do jazigo em tipografia técnica JetBrains Mono (`font-mono`), setor e capacidade física.

#### Scenario: Visualização e impressão da plaqueta QR Code
- **WHEN** o usuário seleciona a ação "Plaqueta QR Code" na listagem ou no Drawer de Detalhes da unidade
- **THEN** o sistema exibe um modal contendo a pré-visualização da plaqueta com o QR Code vetorial renderizado, dados identificadores do jazigo e botão de acionamento para impressão

#### Scenario: Leitura do QR Code e consulta rápida
- **WHEN** o QR Code impresso ou na tela é escaneado por dispositivo móvel
- **THEN** o link direciona para a visualização dos dados cadastrais públicos ou autenticados da unidade de sepultamento

### Requirement: Emissão da Ficha Cadastral Oficial da Unidade de Sepultamento
O sistema SHALL permitir a geração e visualização em modal/impressão da Ficha Cadastral Completa da Unidade de Sepultamento (formato A4 para fé pública). A ficha DEVE apresentar de forma organizada o cabeçalho municipal oficial, dados técnicos e físicos (código, tipo, dimensões, georreferenciamento), situação da concessão ativa com nome do titular e vigência, listagem completa de inumações com data e número de ordem de serviço, e QR Code de autenticidade documental.

#### Scenario: Emissão da ficha cadastral a partir do Drawer de Detalhes
- **WHEN** o usuário clica na ação "Ficha Cadastral" no Drawer de Detalhes do Jazigo
- **THEN** o sistema abre a visualização da ficha cadastral formatada para impressão contendo todos os dados físicos, jurídicos e ocupacionais consolidados da unidade

#### Scenario: Ficha cadastral para unidade sem concessão ativa
- **WHEN** a ficha cadastral é emitida para um jazigo disponível ou sem concessão ativa
- **THEN** a seção de titularidade indica expressamente a situação de disponibilidade ou cova pública sem omitir os dados físicos e dimensões da sepultura
