# Design

## Context

Ver `proposal.md` - Why. Pontos técnicos que moldam a abordagem:

- `GisService::camada()` já resolve camadas por bounding box com cache (`Cache::remember`, chave versionada
  por tenant via `GisService::invalidar()`), lendo da tabela polimórfica `cemetery_geometries`
  (`geometriavel_type`/`geometriavel_id`, bbox decimal + coluna `geom` só em MySQL). `Geo.php` (suporte PHP)
  só sabe operar sobre **anéis fechados de polígono** (`anel()`, `area()`, `contem()`, `sobrepoe()`) — não
  há hoje nenhuma primitiva para linha (via) ou ponto (equipamento) além de `Geo::projetar()`/`Geo::dist()`,
  que já projetam pontos [lng, lat] num plano métrico local e medem distância — serão reaproveitadas
  integralmente como custo de aresta do grafo de rotas, em vez de uma fórmula de haversine nova.
- `mapa.utils.ts` concentra toda a estilização das camadas em duas funções puras
  (`estiloFeicao`/`estiloJazigoSemantico`), consumidas por `MapaView.tsx` via `GeoJSON` do `react-leaflet`.
  É o único ponto que precisa aprender um novo parâmetro de modo para cobrir o requisito 1 sem nova
  chamada de API.
- A rota "Como Chegar" hoje é 100% client-side: `MapaView.tsx` computa `rotaPortaria` a partir de
  `cemiterioAtivo.portaria_lat/lng` e do jazigo, desenha um `<Polyline>` e passa a distância (Haversine de
  `calcularDistanciaMetros`) para `ModalComoChegar`. Isso continua sendo o fallback exato exigido pela spec.
- A busca unificada (`GisController::buscar`) já devolve `{ tipo, rotulo, jazigo_id, jazigo_codigo,
  envelope }[]`; hoje é consumida por um `<form onSubmit>` interno a `MapaView.tsx` (sub-componente `Busca`),
  não pelo `SearchInput`/`useDebounce` já usados em outros módulos (`UsersModule`, `UsuarioPicker`).
- Não há nenhuma biblioteca de clusterização Leaflet nem de captura de mapa para imagem instalada em
  `apps/web-client/package.json` hoje — `jspdf`/`jspdf-autotable` existem e cobrem a montagem do PDF, mas
  não a rasterização do canvas do Leaflet.
- ADR-001 já estabeleceu MySQL espacial nativo (não PostGIS) e o padrão "SQLite nos testes padrão, grupo
  `mysql` dedicado para os cenários que dependem de função espacial real" (`GisMysqlTest.php`,
  `phpunit.xml` com `<groups><exclude><group>mysql</group></exclude></groups>`). As novas tabelas e o
  grafo de rotas seguem o mesmo padrão.

## Goals / Non-Goals

**Goals:**
- Planta humanizada como um modo de apresentação sobre a base geoespacial existente, não um segundo mapa.
- Vias e equipamentos como camadas GIS de primeira classe (CRUD, isolamento por tenant/necrópole,
  export), reaproveitando ao máximo o padrão já validado por `cemetery_geometries`/`GisService::camada()`.
- Roteirização que degrada com segurança: nunca pior que o comportamento atual (linha reta).
- Nenhuma peça de infraestrutura nova além do necessário: sem novo banco de dados, sem serviço de
  roteamento externo, sem fila de processamento.

**Non-Goals** (ver também "Fora de Escopo" na proposta):
- Não cobre a extração/importação de um levantamento vetorial oficial ou ortofoto de drone — esta mudança
  assume que as vias/equipamentos serão desenhados manualmente na própria ferramenta (mesma UX de desenho
  de polígono já existente para jazigos/setores), com uma pergunta aberta sobre a origem dos dados-fonte.
- Não introduz um motor de roteamento genérico multiuso (OSRM/GraphHopper); o grafo é local, pequeno
  (dezenas a poucas centenas de vértices por necrópole) e resolvido com Dijkstra simples em PHP.
- Não altera a exportação vetorial GeoJSON/KML já existente (`GisController::exportar`) — a exportação
  PNG/PDF da planta humanizada é um recurso adicional e paralelo, client-side.

## Decisions

- **Vegetação como mais um `tipo` de `cemetery_amenities` (`vegetacao`), em vez de uma terceira tabela.**
  A spec pede pontos de vegetação "cadastrados" (dado real, não decoração sintética) — a mesma tabela de
  equipamentos já cobre "ponto com tipo e rótulo, exibido conforme a camada ativa", sem nenhuma diferença
  estrutural que justifique uma tabela própria só para árvores.
- **Tabelas dedicadas `cemetery_paths` (LINESTRING) e `cemetery_amenities` (POINT), em vez de estender a
  tabela polimórfica `cemetery_geometries`.** Ver ADR-005. Resumo: `Geometria`/`Geo.php` são modelados em
  torno de **anéis de polígono fechados** com "dono" (parque/setor/jazigo) que já existe como linha própria;
  vias e equipamentos não têm essa relação 1:1 com uma entidade de negócio preexistente, têm atributos
  próprios (`via_codigo`, ordem de vértices para o grafo; `tipo_equipamento`, rótulo) e vias precisam ser
  decompostas em arestas com custo para o Dijkstra — forçar isso na tabela polimórfica exigiria uma segunda
  forma geométrica ali dentro só para dois casos de uso, mais complexidade que duas tabelas novas e
  pequenas, no mesmo padrão de schema já em produção.
- **Roteirização por grafo local (vértices = pontos de `cemetery_paths`; arestas = trechos consecutivos com
  custo em metros pela mesma projeção equirretangular já usada em `Geo::projetar`/`Geo::dist`; Dijkstra em
  PHP puro), não um serviço de roteamento externo.** Ver
  ADR-006. Resumo: o grafo por necrópole é pequeno, os dados já residem no banco do próprio tenant, e um
  serviço externo (OSRM/GraphHopper) exigiria hospedar e manter mais um componente de infraestrutura só
  para caminhos de pedestre dentro de um recinto murado.
- **Modo humanizado como reestilização client-side das mesmas camadas, não uma segunda camada de tiles
  ilustrada.** Ver ADR-007. Resumo: gerar/hospedar uma "planta ilustrada" como imagem/tile separada exigiria
  um pipeline de geração de arte fora da ferramenta e um segundo canal a manter sincronizado com a
  geometria real; reestilizar em runtime garante que a planta nunca desalinha do cadastro.
- **Endpoint único `GET /gis/rotas`** (contrato abaixo), não reaproveita `GisController::camadas` — a
  resposta é um trajeto calculado (com distância), não uma coleção de feições por bbox; misturar os dois
  contratos no mesmo endpoint reduziria a clareza de ambos.
- **Cache do grafo por `park_id`** via `Cache::remember` (mesma fachada/Redis já usados por `GisService`),
  TTL 24h, invalidado explicitamente ao criar/editar/excluir uma via — não reaproveita o contador de versão
  de `GisService::invalidar()` (que já serve `camada()`) para não acoplar dois conceitos de cache com
  tempos de vida diferentes (bbox: invalidação imediata por versão; grafo: TTL longo, tolera pequeno atraso).
- **Clusterização só na camada de jazigos**, usando uma biblioteca dedicada de clustering Leaflet (nova
  dependência — nenhuma está instalada hoje) em vez de agrupamento manual por hash de grade: reaproveita
  algoritmo testado (spiderfy, ícones de contagem) em vez de reimplementar.
- **Exportação PNG via rasterização do container Leaflet** (nova dependência de captura de DOM/canvas —
  nenhuma instalada hoje) **+ montagem do PDF com `jspdf`/`jspdf-autotable` já existentes**, replicando o
  padrão de `DataTable`/`BotaoExportacaoGis` de reaproveitar o que já existe sempre que possível.
- **Validação topológica em tempo real no cliente** reaproveita as ferramentas de desenho do
  `leaflet-geoman` já instalado (eventos de arraste/edição de vértice + opção de *snap* nativa), com um
  checador de sobreposição em JavaScript equivalente (mas independente) ao `Geo::sobrepoe()` do PHP — o
  backend continua sendo a autoridade final na gravação (`GisService::salvar`), o checador client-side é
  só feedback antecipado, não substitui a validação de servidor.
- **`ST_Simplify` aplicado apenas na resposta de `camada()` conforme o zoom recebido**, sem alterar a
  geometria armazenada — o dado gravado continua com a precisão original; a simplificação é só de
  apresentação para zooms distantes, no mesmo método que já teria bbox pequeno o bastante para não precisar
  simplificar em zooms próximos.

### Contrato de `GET /gis/rotas`

```
GET /gis/rotas?park_id={int}&origem_lat={float}&origem_lng={float}&destino_lat={float}&destino_lng={float}
```

Permissão: `cemiterios.view` (mesma leitura já exigida pelas demais consultas do mapa).

Resposta 200 (rota encontrada):
```json
{
  "encontrada": true,
  "distancia_metros": 184.7,
  "rota": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "properties": { "tipo": "trecho", "via_codigo": "AL-01", "trecho_ordem": 1 },
        "geometry": { "type": "LineString", "coordinates": [[-49.41773, -25.58041], [-49.41750, -25.58030]] }
      }
    ]
  }
}
```

Resposta 200 (sem grafo ou sem caminho — o frontend cai para a linha reta atual):
```json
{ "encontrada": false, "distancia_metros": 0, "rota": null }
```

Regras: `distancia_metros` é a soma dos custos das arestas do caminho (deve bater com o somatório dos
trechos retornados); `encontrada=false` quando não houver nenhuma via cadastrada no `park_id` ou não
existir caminho conectando origem e destino no grafo; 400 para parâmetros inválidos; 403 sem
`cemiterios.view`; 404 se `park_id` não existir (mesmo padrão de `findOrFail` já usado nos demais
endpoints do módulo). Quando a origem/destino reais não coincidem exatamente com um vértice do grafo, a
resposta inclui também os trechos de acesso (origem→vértice mais próximo e vértice mais próximo→destino)
como features com `properties.tipo = "acesso"` e `via_codigo: null`, para a rota conectar visualmente e na
distância os pontos realmente pedidos — não só os vértices internos das vias cadastradas.

## Risks / Trade-offs

- [O grafo de vias é tão bom quanto o desenho manual das vias — se o operador não desenhar as alamedas
  reais, a rota real nunca aparece] → Mitigação: fallback para linha reta já é parte da spec, então a
  ausência de vias nunca quebra o fluxo, só deixa de melhorá-lo; a UI de desenho de via reaproveita a mesma
  UX já aprendida para polígonos.
- [Duas novas dependências de frontend (clustering e captura de imagem) aumentam a superfície e o bundle]
  → Mitigação: ambas devem ser carregadas via `import()` dinâmico, no mesmo padrão de carregamento
  preguiçoso já usado por `DataTable` para `xlsx`/`jspdf` na exportação, e só quando o modo/recurso
  correspondente é ativado.
- [Checador de sobreposição em JavaScript duplica lógica que já existe em `Geo.php`] → Mitigação: o checador
  client-side é deliberadamente mais simples (só feedback visual antecipado); o backend continua sendo a
  única fonte de verdade que efetivamente bloqueia a gravação — divergência entre os dois só atrasa/adianta
  o alerta, nunca permite salvar uma sobreposição real.
- [`ST_Simplify` por zoom pode, em simplificações agressivas, alterar visualmente pequenas reentrâncias de
  um jazigo] → Mitigação: aplicar simplificação só a partir de um nível de zoom em que o jazigo individual
  já não é o foco (mesma faixa hoje coberta por clusterização), nunca no zoom em que o polígono é editado.

## Migration Plan

1. Migrations aditivas `cemetery_paths` e `cemetery_amenities` (schema no padrão de `cemetery_geometries`,
   ver ADR-005), sem tocar tabelas existentes.
2. Backend: CRUD de vias/equipamentos, extensão de `GisController::camadas`, endpoint `GET /gis/rotas` e
   testes (suíte padrão SQLite + novo grupo `mysql` para os cenários espaciais reais), todos cobertos por
   testes antes de expor no frontend.
3. Frontend: parâmetro de modo em `mapa.utils.ts`, novas camadas/controles em `MapaView.tsx`, debounce da
   busca, clusterização, exportação PNG/PDF e checador de sobreposição client-side — mudança confinada à
   aba "Mapa" já existente, sem alteração de rota do módulo.
4. Rollback: todas as migrations são aditivas (tabelas novas); reverter o frontend não deixa o backend em
   estado inconsistente, pois os novos endpoints são consumidos de forma opcional (o mapa continua
   funcional no modo técnico atual se o frontend for revertido isoladamente).

## Open Questions

- Existe um levantamento vetorial oficial (planta cadastral, drone) do Cemitério Municipal Jardim
  Independência disponível para importação, ou as vias/equipamentos serão desenhados manualmente na
  ferramenta a partir da imagem de satélite atual?
- Caso exista ortofoto de drone, qual a data de captura/validade, para decidir se ela deve substituir o
  provedor de satélite (Esri/Google) hoje usado como camada base durante o desenho?
- A planta humanizada é destinada apenas ao uso interno (painel do órgão, `apps/web-client`) ou também ao
  portal público do concessionário/cidadão (fora de escopo desta mudança, tratado em mudança própria) —
  isso afeta se o modo humanizado deve, no futuro, reaproveitar o mesmo código de estilização ou divergir
  por exigências de acessibilidade/anonimização do portal público?
