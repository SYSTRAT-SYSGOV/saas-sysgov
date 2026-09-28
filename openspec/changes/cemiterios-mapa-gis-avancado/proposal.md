# Proposal: Evolução do Mapa GIS do módulo de Cemitérios (planta humanizada, vias, roteirização real e performance)

## Why

O Mapa GIS (`apps/web-client/.../views/MapaView.tsx` + `Modules/Cemiterios/Services/GisService.php`) já cobre
camadas vetoriais de parques/setores/jazigos, múltiplos provedores de base, medição métrica, GPS de campo,
busca unificada, desenho/edição de polígonos com geração de grade e exportação GeoJSON/KML — mas continua
sendo um mapa técnico de trabalho, sem nenhuma leitura acolhedora para quem visita um túmulo. O objetivo
central desta mudança é entregar uma **planta humanizada** para o Cemitério Municipal Jardim Independência
(e demais necrópoles do município), com vegetação, caminhos ilustrados e paleta acolhedora, mantida como um
modo de apresentação alternável sobre a mesma base geoespacial já existente — não um mapa paralelo.

Ao evoluir a planta, ficam expostas lacunas conexas que também precisam ser fechadas para o mapa ser
utilizável em escala municipal: não existe camada de vias/alamedas nem de equipamentos (só a portaria
aparece, e apenas dentro do fluxo "Como Chegar"); a rota até o jazigo é sempre uma linha reta, que ignora
os caminhos internos reais; a listagem de milhares de jazigos por necrópole degrada a renderização em zoom
baixo; a busca unificada (`GisController::buscar`) exige clique em "Buscar" a cada tentativa, sem debounce;
e não há como gerar uma imagem de alta resolução da planta para totens e sinalização física. Some-se a isso
a ausência de testes automatizados do componente orquestrador do mapa (`MapaView.tsx`) e de ponta a ponta —
hoje só sub-componentes isolados (`ControleCamadasBase`, `FerramentaMedicao`, `FiltrosRapidosMapa`) e as
funções puras de `mapa.utils.ts` têm cobertura.

## What Changes

- **Modo de apresentação "planta humanizada"**: alternável com o modo "técnico" já existente, reestilizando
  as mesmas camadas vetoriais (paleta pastel, bordas suaves, `fillOpacity` maior) sem nenhuma nova chamada de
  dados — reaproveita a função pura `estiloFeicao()`/`estiloJazigoSemantico()` de `mapa.utils.ts`, hoje o
  único ponto de estilização das camadas.
- **Vegetação** (pontos ilustrados) e **caminhos com aparência de piso**, exibidos somente no modo
  humanizado.
- **Novas camadas GIS de vias/alamedas e de equipamentos** (portaria, capela, banheiros, administração,
  pontos de água), com isolamento por necrópole ativa e SRID 4326, seguindo o mesmo padrão espacial já usado
  em `cemetery_geometries` (MySQL nativo, `SPATIAL INDEX`, bbox decimal para filtragem também em SQLite nos
  testes — ADR-001).
- **Roteirização real portaria→jazigo** por grafo derivado das vias cadastradas (Dijkstra em PHP), com
  fallback automático para a linha reta hoje existente quando não houver vias ou caminho conectando os dois
  pontos — o componente `ModalComoChegar` e o traçado de `Polyline` em `MapaView.tsx` continuam funcionando
  sem quebra quando a rota não for encontrada.
- **Clusterização da camada de jazigos** em zoom baixo (abaixo do limiar já usado hoje, `ZOOM_MINIMO_JAZIGOS`),
  preservando a semântica de cores por estado ao expandir o cluster.
- **Busca unificada com debounce (300 ms) e agrupamento por tipo**, substituindo o formulário de submissão
  manual hoje embutido em `MapaView.tsx` (sub-componente `Busca`) pelo `SearchInput`/`useDebounce` já
  existentes em `@/components/ui`/`@/hooks`.
- **Exportação da planta em PNG (2×) e PDF (A3/A4 paisagem)** com título, legenda, rosa dos ventos e escala,
  disponível no modo humanizado, complementando (sem substituir) a exportação vetorial GeoJSON/KML já
  existente.
- **Validação topológica em tempo real** ao desenhar/editar (snap e alerta de sobreposição), reduzindo o
  atrito de hoje descobrir uma sobreposição só depois de tentar salvar (`RegraNegocioException` do backend).
- **Simplificação de geometria por zoom (`ST_Simplify`) e cache Redis das camadas**, refinando o cache por
  bounding box já existente em `GisService::camada()`.
- **Testes automatizados**: unitário para as novas funções de `mapa.utils.ts`, de componente para
  `MapaView.tsx` e para os novos controles, e um roteiro E2E cobrindo alternância de modo, busca com
  debounce e "Como Chegar" com rota real.

## Capabilities

### Modified Capabilities

- `cemiterio/mapa-gis`: adiciona os requisitos de modo de apresentação humanizado (com vegetação, caminhos
  ilustrados, persistência de preferência e exportação em PNG/PDF), camadas de vias e equipamentos,
  roteirização real por grafo com fallback para linha reta, clusterização de jazigos em zoom baixo, busca
  com debounce e agrupamento por tipo, e validação topológica em tempo real ao desenhar. Nenhum requisito
  existente é removido; o modo técnico atual permanece o padrão.

## Impact

- **Backend (`apps/api/Modules/Cemiterios`)**:
  - Novas migrations aditivas: `cemetery_paths` (LINESTRING, SRID 4326) e `cemetery_amenities` (POINT, SRID
    4326), ambas com `tenant_id`, índice espacial (MySQL) e bbox decimal (compatível com SQLite nos testes),
    no mesmo padrão de `cemetery_geometries` (ADR-001).
  - Novos models `Via` e `Amenidade` (`TenantAware`).
  - `GisController`/`GisService`: novos métodos para servir as camadas de vias/equipamentos (mesmo padrão
    de bbox + cache de `camada()`), novo endpoint `GET /gis/rotas` (grafo + Dijkstra, cache Redis do grafo
    por `park_id`, TTL 24h, invalidado ao alterar `cemetery_paths`), e endpoints de CRUD de vias/equipamentos
    atrás da permissão `cemiterios.gis.edit` já existente.
  - Novo grupo de testes `@group mysql` para os cenários que dependem de funções espaciais reais (mesmo
    padrão de `GisMysqlTest.php`), mantendo a suíte padrão em SQLite.
- **Frontend (`apps/web-client/src/modules/cemiterios`)**:
  - `mapa.utils.ts`: parâmetro de modo (`tecnico`/`humanizado`) nas funções de estilo já existentes; novas
    funções puras de composição de exportação (PNG/PDF) e de agrupamento de resultados de busca por tipo.
  - `MapaView.tsx` e novos sub-componentes-irmãos aos já existentes (`ControleModoPlanta`,
    `CamadaViasEquipamentos`, extensão de `ModalComoChegar` e de `BotaoExportacaoGis`).
  - `CemiteriosContext`: novo campo de preferência de modo de apresentação, persistido na sessão do módulo.
  - Novas dependências: biblioteca de clusterização Leaflet (não há nenhuma instalada hoje) e biblioteca de
    captura do mapa para PNG (não há nenhuma instalada hoje); `jspdf`/`jspdf-autotable` já existentes cobrem
    a montagem do PDF.
  - Novos testes: `mapa.utils.test.ts` (funções novas), `MapaView.test.tsx` (hoje inexistente) e um roteiro
    E2E do mapa.
- **ADRs novas** em `openspec/adrs/`: tabelas dedicadas de vias/equipamentos vs. reaproveitar
  `cemetery_geometries`; roteirização por grafo local (Dijkstra em PHP) vs. serviço externo de roteamento;
  modo humanizado como reestilização client-side vs. camada de tiles ilustrada separada.
