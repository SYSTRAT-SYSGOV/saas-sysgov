# cemiterio/mapa-gis Specification

## Purpose
Fornece capacidades avançadas de visualização cartográfica, análise geoespacial e operação de campo para cemitérios municipais através de camadas base gratuitas, georreferenciamento mobile via GPS, medições métricas de recuos e roteirização interna de visitantes.

## Requirements

### Requirement: Alternância de Provedores de Mapa Base Gratuitos
O sistema DEVE permitir ao usuário alternar a camada de visualização cartográfica de fundo entre múltiplos provedores abertos e gratuitos sem cobrança por requisições de API de terceiros.

#### Scenario: Alternância entre Satélite Esri e Cartografia OpenStreetMap
- **WHEN** o operador abre o seletor de camadas base no mapa e seleciona a opção "OpenStreetMap" ou "Satélite Esri"
- **THEN** o mapa deve atualizar instantaneamente as imagens de fundo para o provedor selecionado mantendo todas as feições vetoriais de quadras e jazigos alinhadas na mesma posição geográfica

#### Scenario: Suporte a Ortofoto de Drone Municipal
- **WHEN** houver uma camada de ortofotocarta gerada por drone cadastrada para a necrópole
- **THEN** o sistema deve permitir sobrepor os tiles locais de alta resolução acima do mapa base

### Requirement: Estilização Semântica e Filtros Dinâmicos de Jazigos no Mapa
O sistema DEVE renderizar os polígonos de túmulos coloridos de acordo com seu estado de conservação física e situação de ocupação, com destaque especial para sepulturas com carência de exumação cumprida.

#### Scenario: Colorização dos polígonos por estado de ocupação
- **WHEN** a camada de jazigos estiver visível no nível de zoom apropriado
- **THEN** cada polígono deve exibir cores padronizadas: verde para disponível, azul para concedido, vermelho para capacidade máxima e amarelo/âmbar para manutenção

#### Scenario: Destaque de jazigos com prazo de exumação cumprido
- **WHEN** o filtro "Aptos para Exumação" for ativado no painel lateral
- **THEN** o mapa deve realçar apenas as sepulturas que possuem sepultamentos com mais de 3 anos (36 meses) decorridos, facilitando a identificação visual de vagas liberáveis pela administração

### Requirement: Georreferenciamento de Campo via GPS do Dispositivo
O sistema DEVE disponibilizar ferramenta para capturar as coordenadas geográficas atuais do operador em campo através da API de Geolocalização (HTML5) do navegador móvel.

#### Scenario: Captura de coordenadas GPS para o jazigo selecionado
- **WHEN** o fiscal ou coveiro seleciona um túmulo e aciona o botão "Capturar Minha Posição GPS"
- **THEN** o sistema deve obter latitude e longitude com margem de precisão estimada do dispositivo móvel e preencher o cadastro georreferenciado do jazigo

### Requirement: Ferramenta de Medição Métrica de Distância e Área
O sistema DEVE disponibilizar ferramenta interativa de régua e polígono para medir distâncias lineares e áreas no mapa do cemitério em metros.

#### Scenario: Medição de recuo sanitário entre sepulturas
- **WHEN** o operador clica no botão de medição linear e traça dois pontos entre sepulturas vizinhas
- **THEN** o sistema deve exibir a distância calculada em metros com precisão centimétrica em tipografia JetBrains Mono, permitindo validar o cumprimento do recuo regulamentar

#### Scenario: Medição de área de quadra ou talhão
- **WHEN** o operador delimita uma área fechada com a ferramenta de medição poligonal
- **THEN** o sistema deve exibir a área calculada em metros quadrados ($m^2$)

### Requirement: Roteirização Interna do Portão ao Túmulo e Compartilhamento Familiar
O sistema DEVE calcular trajeto de orientação pedestre do portão principal ou ponto de acesso do cemitério até a coordenada da sepultura selecionada e permitir o compartilhamento direto com familiares.

#### Scenario: Traçado de rota e compartilhamento via WhatsApp
- **WHEN** o usuário seleciona um túmulo e clica em "Como Chegar"
- **THEN** o mapa deve traçar uma linha visual indicativa entre o portão de entrada e o jazigo e gerar um link com coordenadas geográficas diretas (Google Maps / Waze) e QR Code para envio à família do sepultado

### Requirement: Exportação e Interoperabilidade Geoespacial Aberta
O sistema DEVE permitir exportar as feições vetoriais do cemitério em formatos abertos padrão (GeoJSON e KML/KMZ).

#### Scenario: Exportação para o QGIS da Prefeitura
- **WHEN** um usuário com permissão de gestão GIS solicita o download da necrópole ativa em GeoJSON ou KML
- **THEN** o sistema deve gerar arquivo contendo as geometrias de perímetro, arruamentos, quadras e jazigos com seus respectivos atributos para integração no software de geoprocessamento municipal
