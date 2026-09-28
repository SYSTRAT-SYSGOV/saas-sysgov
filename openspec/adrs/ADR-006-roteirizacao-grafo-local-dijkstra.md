# ADR-006: Roteirização por grafo local (Dijkstra em PHP) em vez de serviço de roteamento externo

- **Status**: Aceita
- **Data**: 2026-09-26
- **Mudança relacionada**: `openspec/changes/cemiterios-mapa-gis-avancado`

## Contexto

Hoje "Como Chegar" traça sempre uma linha reta entre a portaria e o jazigo. Com o cadastro de vias internas
(ADR-005), é possível calcular um trajeto que siga as alamedas reais. O grafo de cada necrópole é pequeno
(dezenas a poucas centenas de vértices, derivados dos extremos e interseções das vias cadastradas) e os
dados já residem no banco do próprio tenant.

## Decisão

Calcular a rota com um grafo montado em memória a partir de `cemetery_paths` (vértices = os pontos de cada
via; arestas = trechos consecutivos com custo em metros pela mesma projeção equirretangular local já usada
em `Geo::projetar`/`Geo::dist` para a validação topológica — equivalente a haversine na escala de um
cemitério) e resolvido com Dijkstra
implementado em PHP puro, servido por `GET /gis/rotas`. O grafo é cacheado por `park_id` (Redis, TTL 24h,
invalidado ao alterar `cemetery_paths`); a rota calculada em si não é cacheada (par origem/destino muda a
cada jazigo). Quando não houver vias cadastradas ou não existir caminho conectando os dois pontos, a API
responde `encontrada: false` e o frontend mantém o fallback de linha reta já existente.

## Alternativas consideradas

- **Serviço de roteamento externo (OSRM, GraphHopper, Google Directions)**: pensados para roteamento
  viário/pedestre em escala de cidade, não para um grafo interno de poucas dezenas de trechos dentro de um
  recinto murado; exigiriam hospedar e manter mais um componente de infraestrutura (ou pagar por chamada),
  e a maioria não aceita bem "ruas" que são, na prática, caminhos de pedestre sem nome oficial.
- **Manter só a linha reta e não investir em roteirização real**: mais simples, mas não atende ao objetivo
  central desta mudança (planta humanizada e experiência real de orientação para visitantes).
- **A* em vez de Dijkstra**: ganho de desempenho de A* é irrelevante para grafos desse tamanho (Dijkstra já
  resolve em microssegundos); adicionar uma heurística de distância só aumentaria a complexidade do código
  sem benefício percebido.

## Consequências

- (+) Nenhuma dependência de infraestrutura nova; roteirização funciona offline/sem custo por requisição.
- (+) Grafo cacheado por 24h evita reconstruir a estrutura a cada "Como Chegar".
- (−) A qualidade da rota depende inteiramente do operador ter desenhado as vias reais — sem isso, o
  sistema continua no fallback de linha reta (comportamento aceitável, nunca pior que o atual).
- (−) Se o grafo de uma necrópole crescer muito além do esperado (milhares de trechos), o Dijkstra em PHP
  por requisição pode precisar de otimização futura (fila de prioridade binária); não é uma preocupação para
  o volume atual de vias internas de um cemitério.
