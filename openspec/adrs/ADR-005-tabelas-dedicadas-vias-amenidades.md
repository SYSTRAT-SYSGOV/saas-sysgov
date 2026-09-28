# ADR-005: Tabelas dedicadas para vias e equipamentos em vez de estender `cemetery_geometries`

- **Status**: Aceita
- **Data**: 2026-09-26
- **Mudança relacionada**: `openspec/changes/cemiterios-mapa-gis-avancado`

## Contexto

O módulo já tem uma tabela polimórfica `cemetery_geometries` (`geometriavel_type`/`geometriavel_id`) que
guarda o polígono de um parque, setor ou jazigo — sempre um **anel fechado**, sempre com um "dono" que já
existe como linha própria em outra tabela, e sempre manipulado pelas mesmas primitivas de `Geo.php`
(`anel()`, `contem()`, `sobrepoe()`, `area()`), todas pensadas para polígono. A evolução do mapa GIS precisa
agora de duas feições novas: vias/alamedas (LINESTRING, usadas como grafo de roteirização) e equipamentos
(POINT, como portaria/capela/sanitários) — nenhuma das duas tem um "dono" preexistente e nenhuma é um anel
fechado.

## Decisão

Criar duas tabelas novas, `cemetery_paths` (LINESTRING, SRID 4326) e `cemetery_amenities` (POINT, SRID
4326), com `tenant_id`, índice espacial no MySQL e bbox decimal (compatível com a suíte de testes em
SQLite), no mesmo padrão de schema de `cemetery_geometries`. `cemetery_paths` guarda também `via_codigo` e
a ordem dos vértices, usada para montar o grafo de roteirização (ADR-006); `cemetery_amenities` guarda
`tipo` (portaria, capela, sanitário, administração, água) e rótulo.

## Alternativas consideradas

- **Estender `cemetery_geometries`** com um `geometriavel_type` novo (`via`, `amenidade`) apontando para
  registros "soltos": exigiria uma segunda forma geométrica dentro da mesma tabela (hoje sempre polígono) e
  quebraria a suposição de "dono" que `GisService::salvar()` usa para validar contenção (setor dentro do
  parque, jazigo dentro do setor) — vias e equipamentos não têm essa relação de contenção.
- **Guardar vias como uma sequência de arestas já materializadas** (uma linha por trecho, sem uma via
  "pai"): simplificaria o Dijkstra, mas perderia o agrupamento por via (`via_codigo`) que a UI de desenho e
  a exportação precisam para editar/rotular um trajeto inteiro de uma vez.

## Consequências

- (+) Reaproveita integralmente o padrão de schema, cache por bbox e permissão já validado em produção.
- (+) Cada tabela cresce e evolui isolada (ex.: adicionar `largura_m` numa via não afeta jazigos).
- (−) Mais duas tabelas e dois models para manter (`Via`, `Amenidade`), em vez de reaproveitar um único
  ponto de gravação de geometria.
