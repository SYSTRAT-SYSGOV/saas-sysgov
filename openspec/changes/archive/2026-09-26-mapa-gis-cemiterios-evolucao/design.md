# Design Técnico: Evolução da Aba Mapa GIS com Ferramentas Abertas e Gratuitas

## Contexto

A solução atual de mapas em [`MapaView.tsx`](file:///c:/laragon/www/saas-sysgov/apps/web-client/src/modules/cemiterios/views/MapaView.tsx) emprega Leaflet com `@geoman-io/leaflet-geoman-free` e um único provedor configurado no backend (Esri World Imagery). O backend já armazena geometrias na tabela `cemetery_geometries` e pontos na tabela `cemetery_plots` utilizando funções espaciais nativas do MySQL 8.4 (`ST_GeomFromGeoJSON`, `ST_Contains`, `ST_Intersects`). Para detalhes da motivação, consulte [proposal.md](file:///c:/laragon/www/saas-sysgov/openspec/changes/mapa-gis-cemiterios-evolucao/proposal.md).

## Objetivos / Não-Objetivos

**Objetivos:**
- Prover catálogo flexível de camadas base gratuitas e abertas sem cobrança de faturas por visualizações (Esri, OpenStreetMap, CartoDB e Google XYZ aberto).
- Colorir e filtrar túmulos em tempo real segundo seu estado físico e regras sanitárias (destacando unidades aptas à exumação após 3 anos).
- Permitir ao operador de campo capturar coordenadas georreferenciadas diretamente no túmulo usando o GPS do smartphone/tablet.
- Disponibilizar ferramentas de medição métrica (distância linear e área em $m^2$) para validar recuos sanitários de túmulos.
- Permitir roteirização interna e compartilhamento de link de localização ("Como Chegar") com familiares.
- Habilitar exportação de arquivos GeoJSON e KML para intercâmbio com o QGIS do setor de engenharia municipal.

**Não-Objetivos:**
- Desenvolver motor complexo de cálculo de rotas em malha topológica 3D ou dependência de servidores SIG pesados (como GeoServer/PostGIS). O cálculo de rota será vetorial direto a partir dos acessos/arruamentos.
- Processamento massivo de fotogrametria aérea na nuvem (o sistema receberá os tiles prontos de ortofoto gerados externamente por softwares como WebODM).

## Decisões Técnicas

### 1. Catálogo Multi-Provedor de Tiles Gratuitos
- **Decisão**: Configurar no frontend e no backend um catálogo de 4 provedores abertos de alta disponibilidade:
  1. *Satélite Esri World Imagery* (padrão satélite atual, alta nitidez sem limites restritivos);
  2. *OpenStreetMap Standard* (cartografia oficial de vias, bairros e nomes);
  3. *CartoDB Positron / Voyager* (cartografia minimalista de alto contraste ideal para sobrepor polígonos coloridos);
  4. *Google Híbrido XYZ* (satélite com rótulos de ruas sem necessidade de chave de faturamento pago).
- **Alternativas consideradas**: Mapbox (rejeitado por exigir cartão de crédito e cobrança após cota mínima); MapLibre com vetor tiles (rejeitado para evitar sobrecarga de migração do Leaflet já estável).

### 2. Georreferenciamento de Campo via Geolocation API (HTML5)
- **Decisão**: Utilizar `navigator.geolocation.watchPosition` e `getCurrentPosition` com a opção `{ enableHighAccuracy: true }` no navegador do celular/tablet.
- **Justificativa**: Permite que o operador no cemitério georreferencie túmulos sem necessidade de instalar aplicativos nativos nas lojas da Apple/Google. O sistema exibirá um círculo de precisão em metros (ex: `Precisão: ±3m`).
- **Alternativas consideradas**: App nativo em Flutter/React Native (rejeitado por adicionar complexidade de distribuição aos municípios).

### 3. Ferramentas de Medição Topográfica Integradas ao Leaflet
- **Decisão**: Implementar cálculo geodésico na esfera terrestre utilizando a fórmula de *Haversine* / Projeção Equirretangular já contida no módulo de utilitários [`mapa.utils.ts`](file:///c:/laragon/www/saas-sysgov/apps/web-client/src/modules/cemiterios/mapa.utils.ts) e projeção de anéis poligonais para cálculo de área em metros quadrados ($m^2$).
- **Justificativa**: Evita dependências externas pesadas e garante precisão milimétrica em escalas cemiteriais (< 1 km).

### 4. Roteirização e Compartilhamento ("Como Chegar")
- **Decisão**: Cada necrópole (`cemetery_parks`) possui coordenadas de portões/entradas principais (`portaria_lat`, `portaria_lng`). Ao selecionar um túmulo:
  1. O mapa traça uma linha guia pontilhada entre o portão e o túmulo;
  2. É disponibilizado um botão para abrir rota externa direta no Google Maps / Waze (`https://www.google.com/maps/dir/?api=1&destination=LAT,LNG`);
  3. Gera modal com QR Code para leitura rápida pelo celular do visitante.

### 5. Exportador GeoJSON e KML Nativo no Backend
- **Decisão**: Implementar gerador de KML e FeatureCollection GeoJSON em PHP no [`GisService.php`](file:///c:/laragon/www/saas-sysgov/apps/api/Modules/Cemiterios/Services/GisService.php).
- **Justificativa**: O formato GeoJSON é nativo do ecossistema Web e QGIS, enquanto o KML é imediatamente reconhecido pelo Google Earth Desktop/Web.

## Riscos e Mitigações

| Risco | Impacto | Mitigação |
| :--- | :--- | :--- |
| **Instabilidade de GPS em celulares simples** | Coordenadas imprecisas salvas no jazigo | Exibir indicador visual de precisão (verde quando $\le 5$m, amarelo entre $5$m e $15$m, vermelho se $> 15$m), exigindo confirmação do operador caso a precisão esteja baixa. |
| **Bloqueio de CORS ou taxa de requisição em tiles OSM** | Mapa base em branco | Utilizar múltiplos espelhos CDN de tiles abertos e manter o cache do navegador ativo. |
| **Quantidade elevada de túmulos em zoom aberto** | Lentidão de renderização no canvas/SVG | Preservar a trava de `ZOOM_MINIMO_JAZIGOS` ($\ge 18$) para carregamento vetorial apenas na aproximação da quadra. |
