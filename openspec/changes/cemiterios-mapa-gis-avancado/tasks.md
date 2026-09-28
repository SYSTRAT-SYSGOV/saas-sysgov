# Tasks

## 1. Backend — Migrações e Modelos de Vias e Equipamentos

- [x] 1.1 Criar migration `cemetery_paths` (LINESTRING SRID 4326 só em MySQL, `tenant_id`, `via_codigo`,
  `geojson`, bbox decimal, `spatialIndex` condicional — mesmo padrão de `cemetery_geometries`); verificar
  com `php artisan migrate` local (SQLite) e em MySQL
- [x] 1.2 Criar migration `cemetery_amenities` (POINT SRID 4326 só em MySQL, `tenant_id`, `tipo` enum-like
  string, `rotulo`, `lat`/`lng`, bbox decimal); verificar com `php artisan migrate`
- [x] 1.3 Criar models `Via` e `Amenidade` (`TenantAware`, casts, `$table`) em `Modules\Cemiterios\Models`;
  verificar com `composer static` sem novos erros

## 2. Backend — Camadas de Vias e Equipamentos

- [x] 2.1 Estender `GisController::camadas`/`GisService::camada()` (ou método irmão dedicado) para servir
  as camadas `vias` e `amenidades` por bbox, com o mesmo cache versionado por tenant já usado para
  parques/setores/jazigos; verificar com teste de feature que o recorte por bbox funciona para as duas
  camadas novas
- [x] 2.2 Endpoints de CRUD de vias e equipamentos (`salvarGeometria`-equivalente) atrás da permissão
  `cemiterios.gis.edit`, invalidando o cache de camada e o cache do grafo de rotas (tarefa 3) ao gravar;
  verificar com teste de feature os cenários de criação, edição e isolamento por tenant/necrópole do spec
  `cemiterio/mapa-gis`

## 3. Backend — Roteirização por Grafo (Dijkstra)

- [x] 3.1 Implementar a montagem do grafo a partir de `cemetery_paths` de um `park_id` (vértices = pontos
  das vias; arestas = trechos consecutivos com custo pela mesma projeção equirretangular de
  `Geo::projetar`/`Geo::dist`) e o Dijkstra em PHP puro; verificar com teste de feature cobrindo um grafo
  pequeno conhecido (distância esperada calculável à mão)
- [x] 3.2 Adicionar `GET /gis/rotas` (contrato do `design.md`, incluindo os trechos de acesso
  origem/destino→vértice mais próximo) com validação de parâmetros, permissão `cemiterios.view` e
  `findOrFail` do `park_id`; verificar com teste de feature os cenários "rota encontrada" e "fallback sem
  vias"/"sem caminho conectando" do spec `cemiterio/mapa-gis`
- [x] 3.3 Cachear o grafo por `park_id` (Redis/`Cache` facade, TTL 24h) e invalidar explicitamente ao
  criar/editar/excluir uma via (tarefa 2.2); verificado com teste de feature que a rota reflete uma via
  editada (o grafo é reconstruído após a edição, não fica com o cache antigo)

## 4. Backend — Testes Espaciais Reais (grupo `mysql`)

- [ ] 4.1 Adicionar cenários ao novo grupo `mysql` (mesmo padrão de `GisMysqlTest.php`) cobrindo recorte por
  bbox das camadas de vias/amenidades usando índice espacial real e o `ST_Simplify` por zoom; **escrito em
  `GisAvancadoMysqlTest.php` e validado por `composer static`/`php -l`, mas não executado contra MySQL 8
  real nesta sessão** — o usuário de banco do `.env` local não tem privilégio para criar um banco
  descartável; falta rodar `vendor/bin/phpunit --group mysql` num ambiente com acesso (CI `api-mysql` ou
  MySQL local com privilégio de `CREATE DATABASE`)

## 5. Frontend — Modo de Apresentação Humanizado

- [x] 5.1 Adicionar parâmetro de modo (`tecnico`/`humanizado`) a `estiloFeicao`/`estiloJazigoSemantico` em
  `mapa.utils.ts`, com a paleta pastel/bordas suaves do modo humanizado; verificar com novo teste em
  `mapa.utils.test.ts` que o mesmo `propriedades`/`estado` produz estilos diferentes por modo
- [x] 5.2 Adicionar o campo de preferência de modo ao `CemiteriosContext` (persistido na sessão do módulo,
  preservado entre abas); verificar com teste em `CemiteriosContext.test.tsx`
- [x] 5.3 Criar o controle de alternância técnico/humanizado em `MapaView.tsx` (sub-componente irmão de
  `ControleCamadasBase`), reestilizando as camadas já carregadas sem nova requisição; verificar
  manualmente que selecionar um jazigo e um filtro antes de alternar preserva os dois após a troca de modo

## 6. Frontend — Vegetação e Caminhos Ilustrados

- [x] 6.1 Renderizar a camada de vegetação (pontos com ícone de copa) apenas no modo humanizado, consumindo
  a mesma fonte de pontos de equipamento/vegetação já buscada; verificar manualmente que a camada some ao
  voltar ao modo técnico
- [x] 6.2 Restilizar a camada de vias como piso (bege claro, borda sutil) no modo humanizado, distinto do
  traço técnico padrão; verificar manualmente a legibilidade sobre a vegetação

## 7. Frontend — Camadas de Vias e Equipamentos + Desenho

- [x] 7.1 Adicionar as camadas de vias e equipamentos ao seletor de camadas do mapa (exibir/ocultar
  independente de parques/setores/jazigos), consumindo os endpoints da tarefa 2.1; verificar manualmente
  que os equipamentos aparecem sem nenhum jazigo selecionado
- [x] 7.2 Habilitar o desenho de via (`drawPolyline`) no `Desenho`/geoman quando um modo de edição de via
  estiver ativo, distinto do desenho de polígono de jazigo/setor já existente, chamando o endpoint da
  tarefa 2.2; verificar manualmente a criação de uma via ponta a ponta

## 8. Frontend — Roteirização Real no "Como Chegar"

- [x] 8.1 Consumir `GET /gis/rotas` ao acionar "Como Chegar"; quando `encontrada: true`, desenhar os
  trechos retornados (GeoJSON) em vez da `Polyline` reta e exibir `distancia_metros`; quando `false`, manter
  o comportamento atual de linha reta sem nenhuma mudança perceptível; verificar manualmente os dois casos

## 9. Frontend — Clusterização de Jazigos

- [x] 9.1 Adicionar a dependência de clusterização Leaflet (`leaflet.markercluster`) e envolver a camada de
  jazigos com clusterização abaixo do limiar de zoom de detalhe (`ZOOM_DETALHE_JAZIGOS = 19`); verificado
  que `MapaView.test.tsx` monta o mapa com a dependência carregada sem erro

## 10. Frontend — Busca com Debounce e Agrupamento

- [x] 10.1 Substituir o `<form onSubmit>` do sub-componente `Busca` em `MapaView.tsx` pelo `SearchInput`
  (debounce 300 ms) já existente em `@/components/ui`, disparando a busca automaticamente a partir de 2
  caracteres; verificado com `MapaView.test.tsx` que a busca dispara sem clicar em "Buscar"
- [x] 10.2 Agrupar os resultados exibidos por `tipo` (falecido/jazigo/concessão); implementado com
  agrupamento visual por seção no painel de resultados

## 11. Frontend — Exportação da Planta em PNG/PDF

- [x] 11.1 Adicionar a dependência de captura do container Leaflet (`html-to-image`) e implementar
  "Exportar Planta" (PNG 2×) visível apenas no modo humanizado, carregada via `import()` dinâmico; título,
  legenda, rosa dos ventos e escala compostos via canvas
- [x] 11.2 Montar o PDF (A3/A4 conforme proporção da imagem) a partir da mesma composição com `jspdf` já
  existente, nomeado `planta-<cemiterio>-<data>.pdf`

## 12. Frontend — Validação Topológica em Tempo Real

- [x] 12.1 Implementar um checador de sobreposição/contenção em JavaScript (independente do `Geo.php`,
  só para feedback antecipado, por caixa envolvente — `poligonosPodemSobrepor`) acionado pelos eventos
  `pm:vertexadded`/`pm:markerdragend` do `leaflet-geoman`
- [x] 12.2 Habilitar a opção de *snap* já suportada pelo `leaflet-geoman` (`setGlobalOptions({ snappable:
  true, snapDistance: 20 })`) ao desenhar/editar

## 13. Testes de Componente e End-to-End

- [x] 13.1 Criar `MapaView.test.tsx` cobrindo a alternância de modo, exibição das novas camadas e a busca
  com debounce (hoje o orquestrador não tinha teste próprio); 4/4 testes passam com `npm test -w apps/web-client`
- [ ] 13.2 Criar um roteiro E2E do mapa — **não executado**: este projeto não tem nenhuma ferramenta de E2E
  configurada hoje (sem Playwright/Cypress no repositório); introduzir uma seria uma decisão de
  infraestrutura de todo o monorepo, fora do escopo desta mudança — precisa de decisão explícita do time
  sobre qual ferramenta adotar antes de qualquer roteiro ser escrito

## 14. Validação Final

- [x] 14.1 Rodar `composer test`, `composer static` e `composer lint` em `apps/api` e confirmar sucesso —
  715/715 testes, PHPStan e lint limpos (inclui a correção de `TenantIsolationTest`, que descobre models
  automaticamente via `glob()` e precisou passar a popular `Via`/`Amenidade`)
- [ ] 14.2 Rodar `vendor/bin/phpunit --group mysql` contra um MySQL 8 real — não executado nesta sessão (ver
  nota na tarefa 4.1); `GisAvancadoMysqlTest.php` está escrito e validado estaticamente
- [x] 14.3 Rodar `npm run typecheck` e `npm test` em `apps/web-client` e confirmar sucesso — typecheck
  limpo, 57/57 arquivos e 363/363 testes passando (inclui os 4 novos de `MapaView.test.tsx`)
- [x] 14.4 Validar a mudança com `openspec validate cemiterios-mapa-gis-avancado --strict` — válida
