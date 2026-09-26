# Tarefas de Implementação (Tasks)

## 1. Backend: Catálogo de Mapas Base Gratuitos e Exportação Geoespacial

- [x] 1.1 Expandir `GisService::sessaoMapaBase()` e `GisController` para expor o catálogo de provedores gratuitos abertos (Esri World Imagery, OpenStreetMap, CartoDB Positron/Voyager e Google XYZ aberto). Verificar resposta JSON com `php artisan test --filter=GisTest`.
- [x] 1.2 Implementar endpoint de exportação `GET /api/cemiterios/gis/exportar` suportando formatos GeoJSON e KML para a necrópole ativa, com propriedades de código, quadra, titular e situação. Verificar com teste de feature no backend.
- [x] 1.3 Adicionar suporte ao cadastro do ponto de acesso/portaria principal na tabela `cemetery_parks` (`portaria_lat`, `portaria_lng`) no `CemiterioController`. Verificar via requisição de atualização de parque.

## 2. Frontend: Seletor de Camadas Base e Estilização Semântica de Jazigos

- [x] 2.1 Criar componente `ControleCamadasBase.tsx` integrado ao Leaflet no `MapaView.tsx`, permitindo alternar visualmente entre Satélite Esri, OpenStreetMap, CartoDB Positron e Google Híbrido. Verificar alternância de tiles em tela.
- [x] 2.2 Aprimorar `mapa.utils.ts` com função `estiloJazigoSemantico` renderizando polígonos coloridos por status operacional (verde para disponível, azul para concedido, vermelho para capacidade máxima, âmbar para manutenção e destaque para aptos à exumação). Verificar renderização visual no mapa.
- [x] 2.3 Implementar filtros rápidos no painel lateral de `MapaView.tsx` (apenas disponíveis, apenas com exumação pendente, inadimplentes). Verificar filtragem reativa das feições na tela.

## 3. Frontend: Georreferenciamento de Campo (Mobile GPS) e Ferramentas de Medição

- [x] 3.1 Desenvolver botão e modal "Minha Posição GPS" utilizando `navigator.geolocation` com indicador de precisão em metros e preenchimento de coordenadas no jazigo selecionado. Verificar acionando o georreferenciamento em navegador com simulação de GPS.
- [x] 3.2 Implementar ferramenta de régua de medição no mapa para distâncias lineares em metros (com conferência de recuo mínimo sanitário de 0,60 m) e medição de área em metros quadrados ($m^2$). Verificar traçando pontos na interface.

## 4. Frontend: Roteirização Interna ("Como Chegar") e Interoperabilidade

- [x] 4.1 Implementar traçado de rota indicativa entre o portão de entrada do cemitério e a coordenada do túmulo selecionado, com cálculo de distância a pé em metros.
- [x] 4.2 Desenvolver modal de compartilhamento com a família contendo link externo direto (Google Maps / Waze) e QR Code para leitura no celular. Verificar geração do link e renderização do QR Code.
- [x] 4.3 Integrar botão de exportação da necrópole ativa (GeoJSON e KML) conectado ao endpoint do backend com download automático de arquivo para o QGIS da prefeitura.

## 5. Validação Integrada e Cobertura de Testes

- [x] 5.1 Atualizar testes unitários do frontend em `MapaView.test.tsx` cobrindo o seletor de camadas, medição, GPS e rota. Verificar com `npm --prefix apps/web-client run test`.
- [x] 5.2 Executar build completo de produção do frontend (`npm --prefix apps/web-client run build`) garantindo 0 erros de compilação TypeScript e Vite.
- [x] 5.3 Executar a suíte de testes de GIS e Cemitérios no backend (`php vendor/bin/phpunit Modules/Cemiterios/Tests`) garantindo 100% de aprovação.
