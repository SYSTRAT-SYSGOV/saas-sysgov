# ADR-001: MySQL com funções espaciais nativas em vez de PostGIS

- **Status**: Aceita
- **Data**: 2026-09-22
- **Mudança relacionada**: `openspec/changes/cemiterio-fundacao`

## Contexto

O módulo de cemitérios precisa de GIS: polígonos de cemitérios, setores e jazigos, validação de
distanciamento (RN-07) e dimensão (RN-08) em metros e consultas por área visível abaixo de 1 s. O SYSGOV roda
em MySQL. A especificação técnica do SIGCM sugeria PostGIS.

## Decisão

Usar os tipos e funções espaciais nativos do MySQL 8 (`POLYGON` com SRID, `SPATIAL INDEX`, `MBRIntersects`,
`ST_Contains`, `ST_Intersects`, `ST_Distance`, `ST_Transform`, `ST_AsGeoJSON`). Armazenar em SRID 4326 (WGS 84)
em tabela própria de geometrias com coluna `NOT NULL`; fazer as validações métricas transformando para o SRID
SIRGAS 2000/UTM do município no caminho de escrita. Renderização no frontend com Leaflet.

## Alternativas consideradas

- **PostgreSQL + PostGIS**: funções mais ricas (`ST_Buffer` geográfico, `ST_OrientedEnvelope`), mas exigiria
  um segundo SGBD em produção, com backup, monitoramento e conexões duplicadas, só para um módulo.
- **Cálculo geométrico só em PHP**: sem índice espacial, não atende à meta de 1 s.

## Consequências

- (+) Uma única base de dados e stack operacional.
- (−) A suíte de testes padrão (sqlite) não executa funções espaciais: é preciso um grupo de testes em MySQL
  e um job de CI dedicado.
- (−) A ordem de eixos lat/long do MySQL em 4326 exige conversão centralizada.
- (−) Sem retângulo orientado nativo: dimensões calculadas pelas arestas do quadrilátero.
