# cemiterio/inventario Specification (Delta)

## ADDED Requirements

### Requirement: Navegação Cruzada Direta para o Mapa Cartográfico GIS
O sistema SHALL disponibilizar ação de navegação cruzada "Ver no Mapa" tanto nas linhas do DataTable de unidades de sepultamento quanto no painel lateral de detalhes (Drawer). Ao ser acionada, a aplicação DEVE alternar para a aba do mapa GIS, centralizar e aproximar a câmera (zoom com animação fluida) nos limites espaciais da unidade de sepultamento selecionada e abrir seu painel de detalhes sobreposto ao mapa.

#### Scenario: Acionamento da ação "Ver no Mapa" a partir da tabela do inventário
- **WHEN** o usuário clica no botão "Ver no Mapa" em uma linha da tabela de jazigos
- **THEN** o sistema comuta imediatamente para a aba "Mapa", realiza a animação de aproximação (`flyToBounds`) no envelope ou coordenadas da unidade e mantém o jazigo selecionado

#### Scenario: Visualização do status de georreferenciamento no Drawer
- **WHEN** o Drawer de detalhes do jazigo é exibido
- **THEN** o sistema apresenta a situação cartográfica da unidade (Georreferenciada com latitude e longitude em `JetBrains Mono` ou Pendente de Desenho Cartográfico) e botão de atalho para direcionar ao mapa
