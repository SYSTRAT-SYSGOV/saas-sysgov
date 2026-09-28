# Proposta: Evolução da Aba Mapa GIS com Recursos Gratuitos e Gestão Espacial Cemiterial

## Por que (Why)

A aba de Mapa GIS atualmente oferece renderização básica com Leaflet, exibição de satélite Esri e geração de grade preliminar, mas ainda é subutilizada na rotina diária das necrópoles municipais. Operadores e fiscais enfrentam dificuldades para localizar sepulturas em campo, conferir alinhamentos topográficos, identificar visualmente túmulos aptos à exumação e compartilhar trajetos de visitação com familiares. 

O uso de serviços comerciais pagos de mapas (como Google Maps Platform) gera custos desnecessários em escala para os municípios. A evolução para um ecossistema GIS baseado em ferramentas abertas e gratuitas (OpenStreetMap, Esri World Imagery, CartoDB, WebODM/QGIS compatível e APIs nativas de GPS HTML5) viabiliza modernização tecnológica de alto impacto para a administração pública com custo zero de licenciamento.

## O que muda (What Changes)

- **Seletor de Camadas Base Gratuitas (Layer Switcher)**:
  - Alternância rápida na interface do mapa entre:
    - *Satélite de Alta Resolução* (Esri World Imagery - gratuito);
    - *Satélite Híbrido* (com sobreposição de vias e referências urbanas);
    - *Cartografia Cadastral* (OpenStreetMap Standard / CartoDB Voyager);
    - *Modo Alto Contraste* (CartoDB Positron/Dark).
  - Suporte a sobreposição de ortofotos geradas por sobrevoo de drones municipais (formato Tile XYZ / TMS local).

- **Colorização Dinâmica e Indicadores Semânticos de Sepulturas**:
  - Renderização dos polígonos de túmulos coloridos pelo estado operacional:
    - 🟢 Verde: Disponível / Livre;
    - 🔵 Azul: Concedido (com concessão ativa);
    - 🔴 Vermelho: Capacidade Máxima / Lotado;
    - 🟡 Âmbar: Em Ruína / Manutenção Física;
    - 🟣 Roxo: Processo de Abandono em andamento.
  - Indicador visual destacado para túmulos com carência sanitária de 3 anos cumprida (aptos para exumação e liberação de gaveta familiar).
  - Painel de filtros espaciais rápidos: filtrar exibição no mapa por situação, disponibilidade e regularidade fiscal.

- **Georreferenciamento de Campo (Mobile GPS HTML5)**:
  - Ferramenta "Minha Posição Atual": captura em tempo real das coordenadas GPS do dispositivo (smartphone/tablet do coveiro ou fiscal) com precisão estimada em metros.
  - Ação rápida de 1 clique para atribuir a coordenada atual ao jazigo selecionado em campo.

- **Ferramentas de Medição Topográfica & Normas Sanitárias**:
  - Ferramenta de régua no mapa para conferência de distanciamento mínimo (ex: recuo legal de 0,60 m entre jazigos) e cálculo de área de quadras e talhões em metros quadrados ($m^2$).

- **Roteirização Interna e Compartilhamento Familiar ("Como Chegar")**:
  - Traçado de rota do portão principal da necrópole até o túmulo selecionado.
  - Geração de link e QR Code de geolocalização com coordenadas exatas para envio à família via WhatsApp, facilitando a localização de túmulos em sepultamentos e datas como o Dia de Finados.

- **Interoperabilidade com Setor de Engenharia da Prefeitura (QGIS / KML / GeoJSON)**:
  - Exportação e importação de camadas cemiteriais em formatos abertos padrão (GeoJSON e KML/KMZ para Google Earth e QGIS).

## Capacidades (Capabilities)

### Novas Capacidades
- `cemiterio/mapa-gis`: Cobre a evolução completa do módulo geoespacial de cemitérios, incluindo alternância de provedores de satélite/cartografia gratuitos, estilização semântica por status de ocupação/carência, georreferenciamento mobile via GPS, medições métricas de campo e roteirização interna de visitantes.

### Capacidades Modificadas
<!-- Nenhuma capacidade existente tem seus requisitos centrais alterados; a evolução expande o ecossistema GIS -->

## Impacto (Impact)

- **Frontend (`apps/web-client`)**:
  - Atualização do componente [`MapaView.tsx`](file:///c:/laragon/www/saas-sysgov/apps/web-client/src/modules/cemiterios/views/MapaView.tsx) com novo controle de camadas, barra de ferramentas GIS (medição, GPS e rota), legenda dinâmica e popups de hover aprimorados.
  - Integração com a API de Geolocation do navegador e utilitários de projeção cartográfica.
- **Backend (`apps/api`)**:
  - Expansão de [`GisController.php`](file:///c:/laragon/www/saas-sysgov/apps/api/Modules/Cemiterios/Http/Controllers/GisController.php) e [`GisService.php`](file:///c:/laragon/www/saas-sysgov/apps/api/Modules/Cemiterios/Services/GisService.php) para fornecer catálogo multi-provedor gratuito, endpoint de exportação GeoJSON/KML e roteirização simples a partir dos portões cadastrados.
- **Banco de Dados**:
  - Aproveitamento das tabelas já existentes `cemetery_plots`, `cemetery_geometries` e `cemetery_burials`, com adição de ponto de acesso principal/portaria na tabela de cemitérios (`cemetery_parks`).
